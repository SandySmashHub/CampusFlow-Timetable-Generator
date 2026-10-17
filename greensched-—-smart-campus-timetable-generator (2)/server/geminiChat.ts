import { GoogleGenAI } from '@google/genai';
import { getDb } from './db.js';
import {
  getAllTeachers,
  getAllClassrooms,
  getAllBatches,
  getAllSubjects,
  getAllTimeslots,
  getAllScheduledLectures,
  findTeacherMatch,
  findBatchMatch,
  findClassroomMatch,
  findSubjectMatch,
  resolveTargetDay,
  parseRequestedTime,
  normalizeText,
  DBLectureEntry,
  DBTeacher,
  DBClassroom,
  DBBatch,
  DBSubject,
  DBTimeSlot,
  DAYS_LIST,
} from './timetableQueries.js';

export interface ChatResponse {
  answer: string;
  mode: string;
  model: string;
  matchedBatch?: string;
  calculatedTime?: string;
  details?: any;
}

export async function processChatbotQuery(
  query: string,
  userBatchName: string = 'CS-A (3rd Year)'
): Promise<ChatResponse> {
  await getDb();

  const teachers = getAllTeachers();
  const classrooms = getAllClassrooms();
  const batches = getAllBatches();
  const subjects = getAllSubjects();
  const timeslots = getAllTimeslots();
  const schedule = getAllScheduledLectures();

  // Calendar day & time calculation
  const now = new Date();
  const dayIdx = now.getDay(); // 0 is Sun, 1 is Mon...
  const currentDay = dayIdx === 0 ? 'Sunday' : DAYS_LIST[dayIdx - 1];
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 1. Check if database is empty
  if (schedule.length === 0) {
    return {
      answer:
        "Timetable abhi generate nahi hua hai. Kripya pehle Admin panel se 'Generate Timetable' par click karein.\n\n" +
        "(No timetable records found in the database. Please generate the timetable from the dashboard first.)",
      mode: 'Live Relational DB (Empty Schedule)',
      model: 'greensched.db',
    };
  }

  // Attempt server-side Gemini 3.8 Flash if GEMINI_API_KEY is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 5) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are GreenSched's intelligent, highly reliable campus timetable assistant for a college.
Current server day: ${currentDay}.
Current server time: ${currentTimeStr}.
Active student batch: "${userBatchName}".

RULES:
1. Ground your answers 100% strictly in the verified database timetable records provided below. Never invent lectures, teachers, rooms, or times.
2. If the user asks in Hindi or Hinglish, answer warmly in natural conversational Hinglish/Hindi with clear formatted details.
3. If the user asks in English, answer in clean English.
4. Support teacher schedule questions, student batch schedules, room schedules, next-lecture lookups, and room availability.
5. If the teacher's name or batch is missing or ambiguous, ask a polite, concise clarification listing the available options instead of guessing.
6. Format answers with clear numbers, timings, bold titles, and clean structure. When listing schedules (daily or weekly), always conclude with 'Total lectures: [count]' or 'Total weekly lectures: [count]'.

COLLEGE DATABASE CONTEXT:
- Teachers: ${JSON.stringify(teachers.map(t => ({ name: t.name, dept: t.department })))}
- Classrooms: ${JSON.stringify(classrooms.map(c => ({ name: c.name, cap: c.capacity, type: c.type })))}
- Batches: ${JSON.stringify(batches.map(b => b.name))}
- Subjects: ${JSON.stringify(subjects.map(s => ({ name: s.name, code: s.code, teacher: s.teacher_name, batch: s.batch_name })))}
- All Scheduled Lectures (${schedule.length} total):
${JSON.stringify(schedule.map(s => ({
  day: s.day,
  time: `${s.start_time}-${s.end_time}`,
  subject: `${s.subject_name} (${s.subject_code})`,
  teacher: s.teacher_name,
  batch: s.batch_name,
  room: s.classroom_name
})), null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (text && text.trim().length > 0) {
        return {
          answer: text.trim(),
          mode: 'Live Gemini 3.8 Flash (Server-Side AI)',
          model: 'gemini-3.8-flash',
          matchedBatch: userBatchName,
          calculatedTime: `${currentDay} ${currentTimeStr}`,
        };
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to deterministic parser:', err.message);
    }
  }

  // 2. Deterministic Multilingual Rule & Context Query Engine (Zero-API Fallback)
  return executeDeterministicTimetableQuery({
    query,
    userBatchName,
    teachers,
    classrooms,
    batches,
    subjects,
    timeslots,
    schedule,
    currentDay,
    currentTimeStr,
    now,
  });
}

interface QueryContext {
  query: string;
  userBatchName: string;
  teachers: DBTeacher[];
  classrooms: DBClassroom[];
  batches: DBBatch[];
  subjects: DBSubject[];
  timeslots: DBTimeSlot[];
  schedule: DBLectureEntry[];
  currentDay: string;
  currentTimeStr: string;
  now: Date;
}

export function executeDeterministicTimetableQuery(ctx: QueryContext): ChatResponse {
  const {
    query,
    userBatchName,
    teachers,
    classrooms,
    batches,
    subjects,
    timeslots,
    schedule,
    currentDay,
    currentTimeStr,
    now,
  } = ctx;

  const normQuery = normalizeText(query);
  const words = normQuery.split(' ');

  // Identify entities
  const teacherMatch = findTeacherMatch(query, teachers);
  const subjectMatch = findSubjectMatch(query, subjects);
  const roomMatch = findClassroomMatch(query, classrooms);
  const dayMatch = resolveTargetDay(query, now);
  const requestedTime = parseRequestedTime(query);

  const isAskingTeacherSchedule =
    normQuery.includes('sir') ||
    normQuery.includes('teacher') ||
    normQuery.includes('faculty') ||
    normQuery.includes('professor') ||
    Boolean(teacherMatch.teacher);

  // -------------------------------------------------------------
  // INTENT 1: TEACHER SCHEDULE & INQUIRIES
  // -------------------------------------------------------------
  if (isAskingTeacherSchedule) {
    // 1A. Ambiguous or missing teacher name
    if (teacherMatch.isAmbiguous || (!teacherMatch.teacher && teacherMatch.candidates.length > 1)) {
      const list = teachers.map(t => `• **${t.name}** (${t.department})`).join('\n');
      return {
        answer: `Kripya batayein aap kis teacher ka schedule dekhna chahte hain?\n\n(Which teacher would you like the schedule for? Available faculty):\n${list}`,
        mode: 'Deterministic Timetable Parser (Entity Disambiguation)',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }

    if (teacherMatch.teacher) {
      const teacher = teacherMatch.teacher;
      const teacherLectures = schedule.filter(e => e.teacher_id === teacher.id);

      // Check: "Which subjects does this teacher teach?"
      if (
        normQuery.includes('which subject') ||
        normQuery.includes('kya padhate') ||
        normQuery.includes('kaunsa subject') ||
        normQuery.includes('subjects does')
      ) {
        const taughtSubjects = subjects.filter(s => s.teacher_id === teacher.id);
        if (taughtSubjects.length === 0) {
          return {
            answer: `🌿 **${teacher.name}** is not currently assigned to any subjects in the database.`,
            mode: 'Deterministic Timetable Parser',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }
        const subList = taughtSubjects.map(s => `• **${s.name}** (${s.code}) — Batch: ${s.batch_name || 'All'} (${s.weekly_lectures} hrs/week)`).join('\n');
        return {
          answer: `🌿 **${teacher.name} (${teacher.department}) Teaches:**\n\n${subList}`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      // Check: "Sir free kab hain?" / When is this teacher free?
      if (normQuery.includes('free') || normQuery.includes('khali') || normQuery.includes('available')) {
        const targetDay = dayMatch.day || currentDay;
        const daySlots = timeslots.filter(s => s.day.toLowerCase() === targetDay.toLowerCase());
        const busySlotIds = new Set(teacherLectures.filter(e => e.day.toLowerCase() === targetDay.toLowerCase()).map(e => e.timeslot_id));
        const freeSlots = daySlots.filter(s => !busySlotIds.has(s.id));

        if (freeSlots.length === 0) {
          return {
            answer: `🌿 **${teacher.name}** has lectures in all time periods on **${targetDay}** (No free periods).`,
            mode: 'Deterministic Timetable Parser',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }

        const freeList = freeSlots.map(s => `• ⏰ ${s.start_time}–${s.end_time}`).join('\n');
        return {
          answer: `🌿 **${teacher.name} — Free Slots on ${targetDay}:**\n\n${freeList}\n\nTotal free slots: ${freeSlots.length}`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      // Check: "Teacher ka room number kya hai?" / "Which room is Sir in?"
      if (normQuery.includes('room number') || (normQuery.includes('room') && (normQuery.includes('kahan') || normQuery.includes('which room') || normQuery.includes('where')))) {
        // Find current or upcoming lecture
        const targetDay = dayMatch.day || currentDay;
        const dayLectures = teacherLectures.filter(e => e.day.toLowerCase() === targetDay.toLowerCase());
        const upcoming = dayLectures.find(e => e.start_time >= currentTimeStr) || dayLectures[0];

        if (upcoming) {
          return {
            answer: `🌿 **${teacher.name}**'s lecture on **${targetDay}** (${upcoming.start_time}–${upcoming.end_time}) is scheduled in:\n` +
                    `🏛️ **${upcoming.classroom_name}** (${upcoming.classroom_type})\n` +
                    `• Subject: ${upcoming.subject_name} (${upcoming.subject_code})\n` +
                    `• Batch: ${upcoming.batch_name}`,
            mode: 'Deterministic Timetable Parser',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }
      }

      // Check: Day-specific schedule for teacher (e.g. "Monday schedule", "aaj kitne lectures", "kal ka lecture")
      if (dayMatch.isExplicit) {
        const targetDay = dayMatch.day!;
        const dayLectures = teacherLectures.filter(e => e.day.toLowerCase() === targetDay.toLowerCase());

        if (dayLectures.length === 0) {
          return {
            answer: `🌿 **${teacher.name}** has no lectures scheduled on **${targetDay}**.\n\nTotal lectures: 0`,
            mode: 'Deterministic Timetable Parser',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }

        const list = dayLectures.map((l, i) =>
          `${i + 1}. ⏰ **${l.start_time}–${l.end_time}** — **${l.subject_name}** (${l.subject_code}) — 👥 ${l.batch_name} — 🏛️ ${l.classroom_name}`
        ).join('\n');

        return {
          answer: `🌿 **${teacher.name} — ${targetDay} Schedule**\n\n${list}\n\n**Total lectures:** ${dayLectures.length}`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      // Complete weekly timetable for teacher
      if (
        normQuery.includes('weekly') ||
        normQuery.includes('poora') ||
        normQuery.includes('pura') ||
        normQuery.includes('complete') ||
        normQuery.includes('all lectures') ||
        normQuery.includes('schedule')
      ) {
        if (teacherLectures.length === 0) {
          return {
            answer: `🌿 **${teacher.name}** has 0 scheduled lectures in the current weekly timetable.`,
            mode: 'Deterministic Timetable Parser',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }

        // Group by day
        const groupedByDay: Record<string, DBLectureEntry[]> = {};
        for (const l of teacherLectures) {
          if (!groupedByDay[l.day]) groupedByDay[l.day] = [];
          groupedByDay[l.day].push(l);
        }

        const sections = DAYS_LIST.filter(d => groupedByDay[d]?.length > 0).map(d => {
          const rows = groupedByDay[d].map((l, i) =>
            `   ${i + 1}. ${l.start_time}–${l.end_time} — ${l.subject_name} (${l.subject_code}) — ${l.batch_name} — Room: ${l.classroom_name}`
          ).join('\n');
          return `📅 **${d}** (${groupedByDay[d].length} lectures):\n${rows}`;
        }).join('\n\n');

        return {
          answer: `🌿 **${teacher.name} — Complete Weekly Timetable**\n\n${sections}\n\n**Total weekly lectures:** ${teacherLectures.length}`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      // Default for teacher with no day specified: return upcoming or full schedule
      const list = teacherLectures.map((l, i) =>
        `${i + 1}. **${l.day}** ${l.start_time}–${l.end_time} — **${l.subject_name}** — ${l.batch_name} — ${l.classroom_name}`
      ).join('\n');

      return {
        answer: `🌿 **${teacher.name} Schedule (${teacher.department})**\n\n${list}\n\n**Total lectures:** ${teacherLectures.length}`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }
  }

  // -------------------------------------------------------------
  // INTENT 2: ROOM QUERIES (Schedule, availability, free rooms)
  // -------------------------------------------------------------
  const isRoomQuery =
    normQuery.includes('room') ||
    normQuery.includes('classroom') ||
    normQuery.includes('lab') ||
    normQuery.includes('theater') ||
    normQuery.includes('hall') ||
    Boolean(roomMatch.room);

  if (isRoomQuery) {
    // 2A. "Which rooms are free at 11 AM?" / "Free rooms on Monday"
    if (normQuery.includes('free') || normQuery.includes('khali') || normQuery.includes('available')) {
      const targetDay = dayMatch.day || currentDay;

      if (requestedTime) {
        // Find timeslots matching this time
        const matchingSlots = timeslots.filter(s =>
          s.day.toLowerCase() === targetDay.toLowerCase() &&
          s.start_time <= requestedTime &&
          s.end_time > requestedTime
        );

        const targetSlot = matchingSlots[0] || timeslots.find(s => s.day.toLowerCase() === targetDay.toLowerCase() && s.start_time.startsWith(requestedTime.split(':')[0]));

        if (targetSlot) {
          const busyRoomIds = new Set(schedule.filter(e => e.timeslot_id === targetSlot.id).map(e => e.classroom_id));
          const freeRooms = classrooms.filter(r => !busyRoomIds.has(r.id));

          const freeList = freeRooms.length > 0
            ? freeRooms.map(r => `• 🏛️ **${r.name}** (${r.type}, Cap: ${r.capacity})`).join('\n')
            : 'Koi bhi room free nahi hai (All classrooms occupied).';

          return {
            answer: `🏛️ **Free Classrooms on ${targetDay} at ${targetSlot.start_time}–${targetSlot.end_time}:**\n\n${freeList}\n\nTotal free rooms: ${freeRooms.length}`,
            mode: 'Deterministic Timetable Parser (Calculated Availability)',
            model: 'greensched.db',
            matchedBatch: userBatchName,
          };
        }
      }

      // Room specific free periods (e.g. "When is Room 101 free?")
      if (roomMatch.room) {
        const room = roomMatch.room;
        const daySlots = timeslots.filter(s => s.day.toLowerCase() === targetDay.toLowerCase());
        const busySlotIds = new Set(schedule.filter(e => e.classroom_id === room.id && e.day.toLowerCase() === targetDay.toLowerCase()).map(e => e.timeslot_id));
        const freeSlots = daySlots.filter(s => !busySlotIds.has(s.id));

        const freeList = freeSlots.length > 0
          ? freeSlots.map(s => `• ⏰ ${s.start_time}–${s.end_time}`).join('\n')
          : 'Poore din lectures scheduled hain (Fully booked today).';

        return {
          answer: `🏛️ **${room.name} — Free Timeslots on ${targetDay}:**\n\n${freeList}\n\nTotal free slots: ${freeSlots.length}`,
          mode: 'Deterministic Timetable Parser (Calculated Availability)',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }
    }

    // 2B. "Which classes are scheduled in Room 204 today?"
    if (roomMatch.room) {
      const room = roomMatch.room;
      const targetDay = dayMatch.day || currentDay;
      const roomLectures = schedule.filter(e => e.classroom_id === room.id && e.day.toLowerCase() === targetDay.toLowerCase());

      if (roomLectures.length === 0) {
        return {
          answer: `🏛️ **${room.name}** (${room.type}, Capacity: ${room.capacity}) has no lectures scheduled on **${targetDay}** (Room is free).`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      const list = roomLectures.map((l, i) =>
        `${i + 1}. ⏰ **${l.start_time}–${l.end_time}** — **${l.subject_name}** (${l.subject_code}) — 👥 Batch: ${l.batch_name} — 👨🏫 ${l.teacher_name}`
      ).join('\n');

      return {
        answer: `🏛️ **${room.name} — ${targetDay} Schedule**\n\n${list}\n\n**Total classes in this room:** ${roomLectures.length}`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }
  }

  // -------------------------------------------------------------
  // INTENT 3: SUBJECT QUERIES ("Who teaches DBMS?", "When is next Java lecture?", "All lectures for DBMS")
  // -------------------------------------------------------------
  if (subjectMatch.subject) {
    const sub = subjectMatch.subject;

    // Check: "Who teaches DBMS?" / "DBMS kaun padhata hai?"
    if (
      normQuery.includes('who teaches') ||
      normQuery.includes('kaun padhata') ||
      normQuery.includes('kon padhata') ||
      normQuery.includes('teacher of') ||
      normQuery.includes('faculty')
    ) {
      return {
        answer: `🌿 **${sub.name} (${sub.code})**\n` +
                `• 👨🏫 **Faculty:** **${sub.teacher_name}**\n` +
                `• 👥 **Assigned Batch:** ${sub.batch_name || userBatchName}\n` +
                `• ⏰ **Weekly Hours:** ${sub.weekly_lectures} lectures / week`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }

    // Check: "When is the next [Subject] lecture?"
    if (normQuery.includes('next') || normQuery.includes('kab hai') || normQuery.includes('when')) {
      const subLectures = schedule.filter(e => e.subject_id === sub.id);
      if (subLectures.length === 0) {
        return {
          answer: `🌿 **${sub.name} (${sub.code})** has no scheduled lectures in the database right now.`,
          mode: 'Deterministic Timetable Parser',
          model: 'greensched.db',
          matchedBatch: userBatchName,
        };
      }

      // Look for upcoming lecture today
      const todayLectures = subLectures.filter(e => e.day.toLowerCase() === currentDay.toLowerCase() && e.start_time >= currentTimeStr);
      const nextLecture = todayLectures[0] || subLectures[0];

      return {
        answer: `🌱 **Next ${sub.name} (${sub.code}) Lecture:**\n` +
                `• 📅 **Day:** ${nextLecture.day}\n` +
                `• ⏰ **Time:** ${nextLecture.start_time}–${nextLecture.end_time}\n` +
                `• 🏛️ **Classroom:** **${nextLecture.classroom_name}** (${nextLecture.classroom_type})\n` +
                `• 👨🏫 **Faculty:** ${nextLecture.teacher_name}\n` +
                `• 👥 **Batch:** ${nextLecture.batch_name}`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }

    // Check: "Show all lectures for [Subject]"
    const subLectures = schedule.filter(e => e.subject_id === sub.id);
    if (subLectures.length > 0) {
      const list = subLectures.map((l, i) =>
        `${i + 1}. **${l.day}** ${l.start_time}–${l.end_time} — 👥 ${l.batch_name} — 🏛️ ${l.classroom_name} — 👨🏫 ${l.teacher_name}`
      ).join('\n');

      return {
        answer: `📖 **All Scheduled Lectures for ${sub.name} (${sub.code}):**\n\n${list}\n\n**Total scheduled slots:** ${subLectures.length}`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: userBatchName,
      };
    }
  }

  // -------------------------------------------------------------
  // INTENT 4: STUDENT / BATCH TIMETABLE QUERIES
  // -------------------------------------------------------------
  const batchMatch = findBatchMatch(query, batches, userBatchName);
  const targetBatch = batchMatch.batch || batches[0];
  const targetBatchName = targetBatch ? targetBatch.name : userBatchName;

  // 4A. "What is my next lecture?" / "Mera next lecture kab hai?" / "Which room is my next class in?"
  if (
    normQuery.includes('next lecture') ||
    normQuery.includes('next class') ||
    normQuery.includes('agla lecture') ||
    normQuery.includes('agla class') ||
    normQuery.includes('next period') ||
    normQuery.includes('which room is my next')
  ) {
    const batchLectures = schedule.filter(e => e.batch_id === targetBatch?.id);
    if (batchLectures.length === 0) {
      return {
        answer: `🌿 No lectures are scheduled for **${targetBatchName}** in the current timetable.`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: targetBatchName,
      };
    }

    // Look for lecture today after current time
    const todayLectures = batchLectures.filter(e => e.day.toLowerCase() === currentDay.toLowerCase() && e.start_time >= currentTimeStr);
    let upcoming = todayLectures[0];
    let note = '';

    if (!upcoming) {
      // Find lecture on upcoming working days
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayIdx = daysOrder.indexOf(currentDay);
      for (let offset = 1; offset <= 6; offset++) {
        const nextDayName = daysOrder[(currentDayIdx + offset) % daysOrder.length];
        const nextDayLectures = batchLectures.filter(e => e.day === nextDayName);
        if (nextDayLectures.length > 0) {
          upcoming = nextDayLectures[0];
          note = `(Aaj ${currentDay} ko ab aur classes nahi hain. Agla lecture ${nextDayName} ko hai.)\n\n`;
          break;
        }
      }
      if (!upcoming) upcoming = batchLectures[0];
    }

    return {
      answer: `🌱 **Next Lecture for ${targetBatchName}:**\n\n${note}` +
              `• 📖 **Subject:** **${upcoming.subject_name}** (${upcoming.subject_code})\n` +
              `• ⏰ **Time:** ${upcoming.start_time}–${upcoming.end_time} (${upcoming.day})\n` +
              `• 🏛️ **Classroom:** **${upcoming.classroom_name}** (${upcoming.classroom_type})\n` +
              `• 👨🏫 **Faculty:** ${upcoming.teacher_name} (${upcoming.teacher_department})`,
      mode: 'Deterministic Timetable Parser (Calculated from Real Clock)',
      model: 'greensched.db',
      matchedBatch: targetBatchName,
      calculatedTime: `${currentDay} ${currentTimeStr}`,
    };
  }

  // 4B. "My timetable today / tomorrow / Monday" or "CS-A timetable on Wednesday"
  if (dayMatch.isExplicit) {
    const targetDay = dayMatch.day!;
    const dayLectures = schedule.filter(e => e.batch_id === targetBatch?.id && e.day.toLowerCase() === targetDay.toLowerCase());

    if (dayLectures.length === 0) {
      return {
        answer: `🌿 **${targetDay}** ko **${targetBatchName}** ke liye koi lecture scheduled nahi hai (Free Day / Holiday).\n\nTotal classes: 0`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: targetBatchName,
      };
    }

    const list = dayLectures.map((l, i) =>
      `${i + 1}. ⏰ **${l.start_time}–${l.end_time}** — **${l.subject_name}** (${l.subject_code})\n   🏛️ Room: **${l.classroom_name}** — 👨🏫 Faculty: ${l.teacher_name}`
    ).join('\n\n');

    return {
      answer: `📅 **${targetDay} Timetable for ${targetBatchName}:**\n\n${list}\n\n**Total lectures:** ${dayLectures.length}`,
      mode: 'Deterministic Timetable Parser',
      model: 'greensched.db',
      matchedBatch: targetBatchName,
    };
  }

  // 4C. Complete weekly timetable for a batch ("Complete weekly timetable for CS-A", "CS-B ka poora timetable")
  if (
    normQuery.includes('weekly') ||
    normQuery.includes('poora') ||
    normQuery.includes('pura') ||
    normQuery.includes('complete') ||
    normQuery.includes('timetable') ||
    normQuery.includes('schedule')
  ) {
    const batchLectures = schedule.filter(e => e.batch_id === targetBatch?.id);
    if (batchLectures.length === 0) {
      return {
        answer: `🌿 **${targetBatchName}** has 0 lectures scheduled in the database.`,
        mode: 'Deterministic Timetable Parser',
        model: 'greensched.db',
        matchedBatch: targetBatchName,
      };
    }

    const groupedByDay: Record<string, DBLectureEntry[]> = {};
    for (const l of batchLectures) {
      if (!groupedByDay[l.day]) groupedByDay[l.day] = [];
      groupedByDay[l.day].push(l);
    }

    const sections = DAYS_LIST.filter(d => groupedByDay[d]?.length > 0).map(d => {
      const rows = groupedByDay[d].map((l, i) =>
        `   ${i + 1}. ${l.start_time}–${l.end_time} — ${l.subject_name} (${l.subject_code}) — Room: ${l.classroom_name} — Prof: ${l.teacher_name}`
      ).join('\n');
      return `📅 **${d}** (${groupedByDay[d].length} lectures):\n${rows}`;
    }).join('\n\n');

    return {
      answer: `📅 **Complete Weekly Timetable for ${targetBatchName}:**\n\n${sections}\n\n**Total weekly lectures:** ${batchLectures.length}`,
      mode: 'Deterministic Timetable Parser',
      model: 'greensched.db',
      matchedBatch: targetBatchName,
    };
  }

  // -------------------------------------------------------------
  // DEFAULT HELPFUL GUIDE
  // -------------------------------------------------------------
  const teacherExamples = teachers.slice(0, 2).map(t => t.name.split(' ').pop()).join(' or ');
  return {
    answer:
      `Namaste! Main GreenSched campus timetable assistant hoon 🌿.\n\nAap mujhse real-time timetable ke baare me pooch sakte hain:\n\n` +
      `👨🏫 **Teacher Schedules:**\n` +
      `• *"Sir ka Monday ko lecture kab hai?"*\n` +
      `• *"Show me Professor ${teacherExamples || 'Sharma'}'s complete schedule"*\n` +
      `• *"Sir free kab hain?"*\n\n` +
      `👥 **Student & Batch Timetables:**\n` +
      `• *"Mera Monday ka timetable kya hai?"*\n` +
      `• *"Show the complete weekly timetable for ${targetBatchName}"*\n` +
      `• *"Mera next lecture kab hai?"*\n\n` +
      `🏛️ **Rooms & Subjects:**\n` +
      `• *"Which classes are scheduled in Room 101 today?"*\n` +
      `• *"Which rooms are free at 11 AM?"*\n` +
      `• *"Who teaches Database Management Systems?"*\n\n` +
      `*Active batch: ${targetBatchName}*`,
    mode: 'Deterministic Timetable Parser (Zero-API Fallback)',
    model: 'greensched.db',
    matchedBatch: targetBatchName,
  };
}
