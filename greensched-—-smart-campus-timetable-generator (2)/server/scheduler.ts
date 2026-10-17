import { queryAll, runSql, saveDb, getDb } from './db.js';

export interface LectureTask {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  batchId: string;
  batchName: string;
  studentCount: number;
  teacherId: string;
  teacherName: string;
  lectureIndex: number;
}

export interface UnscheduledReport {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  batchName: string;
  teacherName: string;
  reason: string;
}

export interface SchedulerResult {
  success: boolean;
  scheduledCount: number;
  totalRequiredLectures: number;
  unscheduledCount: number;
  unscheduled: UnscheduledReport[];
  clashesPrevented: {
    teacherClashes: number;
    roomClashes: number;
    batchClashes: number;
    capacityViolations: number;
  };
  metrics: {
    totalBatches: number;
    totalTeachers: number;
    totalClassrooms: number;
    totalSlots: number;
    roomUtilizationPercent: number;
  };
  message: string;
  generatedAt: string;
}

export async function generateTimetable(): Promise<SchedulerResult> {
  await getDb();

  const batches = queryAll<any>('SELECT * FROM batches');
  const classrooms = queryAll<any>('SELECT * FROM classrooms');
  const teachers = queryAll<any>('SELECT * FROM teachers');
  const subjects = queryAll<any>('SELECT * FROM subjects');
  const slots = queryAll<any>('SELECT * FROM timeslots ORDER BY slot_index ASC');

  if (slots.length === 0) {
    throw new Error('No timeslots available. Please seed or add timeslots.');
  }
  if (classrooms.length === 0) {
    throw new Error('No classrooms available. Please add at least one classroom.');
  }
  if (subjects.length === 0) {
    throw new Error('No subjects available. Please add subjects to schedule.');
  }

  const batchMap = new Map<string, any>(batches.map(b => [b.id, b]));
  const teacherMap = new Map<string, any>(teachers.map(t => [t.id, t]));

  // Build lecture pool
  const lecturePool: LectureTask[] = [];
  let totalRequiredLectures = 0;

  for (const sub of subjects) {
    const batch = batchMap.get(sub.batch_id);
    const teacher = teacherMap.get(sub.teacher_id);
    const count = sub.weekly_lectures || 3;
    totalRequiredLectures += count;

    for (let i = 1; i <= count; i++) {
      lecturePool.push({
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        batchId: sub.batch_id,
        batchName: batch?.name || 'Unknown Batch',
        studentCount: batch?.student_count || 40,
        teacherId: sub.teacher_id,
        teacherName: teacher?.name || 'Unknown Faculty',
        lectureIndex: i,
      });
    }
  }

  // Sort degree heuristic:
  // 1. Prioritize subjects with largest student batches (hardest to fit into classrooms)
  // 2. Then by teacher workload
  lecturePool.sort((a, b) => b.studentCount - a.studentCount);

  const busyTeachers = new Set<string>(); // "teacherId@slotId"
  const busyRooms = new Set<string>();    // "roomId@slotId"
  const busyBatches = new Set<string>();  // "batchId@slotId"

  // To distribute subjects well across different days, track day assignment per subject
  const subjectDays = new Map<string, Set<string>>(); // subjectId -> Set<day>

  const scheduledEntries: Array<{
    subject_id: string;
    batch_id: string;
    teacher_id: string;
    classroom_id: string;
    timeslot_id: string;
  }> = [];

  const unscheduled: UnscheduledReport[] = [];
  let preventedTeacherClashes = 0;
  let preventedRoomClashes = 0;
  let preventedBatchClashes = 0;
  let preventedCapacityViolations = 0;

  for (const lecture of lecturePool) {
    // Filter rooms with capacity >= lecture.studentCount
    const eligibleRooms = classrooms
      .filter(r => r.capacity >= lecture.studentCount)
      .sort((a, b) => a.capacity - b.capacity); // Tightest fit first to conserve large lecture halls

    if (eligibleRooms.length === 0) {
      preventedCapacityViolations++;
      unscheduled.push({
        subjectId: lecture.subjectId,
        subjectName: lecture.subjectName,
        subjectCode: lecture.subjectCode,
        batchName: lecture.batchName,
        teacherName: lecture.teacherName,
        reason: `No classroom has capacity for ${lecture.studentCount} students. Max classroom capacity is ${Math.max(...classrooms.map(c => c.capacity), 0)}.`,
      });
      continue;
    }

    if (!subjectDays.has(lecture.subjectId)) {
      subjectDays.set(lecture.subjectId, new Set());
    }
    const daysUsed = subjectDays.get(lecture.subjectId)!;

    // Prefer slots on days not yet used for this subject (heuristic day spread)
    const sortedSlots = [...slots].sort((s1, s2) => {
      const s1Used = daysUsed.has(s1.day) ? 1 : 0;
      const s2Used = daysUsed.has(s2.day) ? 1 : 0;
      return s1Used - s2Used;
    });

    let assigned = false;

    for (const slot of sortedSlots) {
      const teacherKey = `${lecture.teacherId}@${slot.id}`;
      const batchKey = `${lecture.batchId}@${slot.id}`;

      if (busyTeachers.has(teacherKey)) {
        preventedTeacherClashes++;
        continue;
      }
      if (busyBatches.has(batchKey)) {
        preventedBatchClashes++;
        continue;
      }

      // Look for an available eligible classroom
      let selectedRoom = null;
      for (const room of eligibleRooms) {
        const roomKey = `${room.id}@${slot.id}`;
        if (!busyRooms.has(roomKey)) {
          selectedRoom = room;
          break;
        } else {
          preventedRoomClashes++;
        }
      }

      if (selectedRoom) {
        busyTeachers.add(teacherKey);
        busyBatches.add(batchKey);
        busyRooms.add(`${selectedRoom.id}@${slot.id}`);
        daysUsed.add(slot.day);

        scheduledEntries.push({
          subject_id: lecture.subjectId,
          batch_id: lecture.batchId,
          teacher_id: lecture.teacherId,
          classroom_id: selectedRoom.id,
          timeslot_id: slot.id,
        });

        assigned = true;
        break;
      }
    }

    if (!assigned) {
      unscheduled.push({
        subjectId: lecture.subjectId,
        subjectName: lecture.subjectName,
        subjectCode: lecture.subjectCode,
        batchName: lecture.batchName,
        teacherName: lecture.teacherName,
        reason: 'All available timeslots had teacher, batch, or room capacity conflicts.',
      });
    }
  }

  // Atomically wipe and insert into timetable_entries
  runSql('DELETE FROM timetable_entries;');

  for (const entry of scheduledEntries) {
    runSql(
      `INSERT INTO timetable_entries (subject_id, batch_id, teacher_id, classroom_id, timeslot_id)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.subject_id, entry.batch_id, entry.teacher_id, entry.classroom_id, entry.timeslot_id]
    );
  }

  saveDb();

  const totalPossibleRoomSlots = classrooms.length * slots.length;
  const roomUtilization = totalPossibleRoomSlots > 0
    ? Math.round((scheduledEntries.length / totalPossibleRoomSlots) * 100)
    : 0;

  return {
    success: unscheduled.length === 0,
    scheduledCount: scheduledEntries.length,
    totalRequiredLectures,
    unscheduledCount: unscheduled.length,
    unscheduled,
    clashesPrevented: {
      teacherClashes: preventedTeacherClashes,
      roomClashes: preventedRoomClashes,
      batchClashes: preventedBatchClashes,
      capacityViolations: preventedCapacityViolations,
    },
    metrics: {
      totalBatches: batches.length,
      totalTeachers: teachers.length,
      totalClassrooms: classrooms.length,
      totalSlots: slots.length,
      roomUtilizationPercent: roomUtilization,
    },
    message: unscheduled.length === 0
      ? `All ${scheduledEntries.length} lectures successfully scheduled with 0 clashes!`
      : `Scheduled ${scheduledEntries.length} of ${totalRequiredLectures} lectures. ${unscheduled.length} lectures could not be placed without clashes.`,
    generatedAt: new Date().toISOString(),
  };
}
