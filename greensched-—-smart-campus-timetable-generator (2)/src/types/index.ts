export interface Batch {
  id: string;
  name: string;
  student_count: number;
  semester?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  max_weekly_hours: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  weekly_lectures: number;
  batch_id: string;
  teacher_id: string;
  batch_name?: string;
  teacher_name?: string;
  teacher_department?: string;
}

export interface TimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_index: number;
}

export interface TimetableEntry {
  id: number;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  batch_id: string;
  batch_name: string;
  batch_students: number;
  teacher_id: string;
  teacher_name: string;
  teacher_department: string;
  classroom_id: string;
  classroom_name: string;
  classroom_capacity: number;
  classroom_type: string;
  timeslot_id: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_index: number;
}

export interface SchedulerResult {
  success: boolean;
  scheduledCount: number;
  totalRequiredLectures: number;
  unscheduledCount: number;
  unscheduled: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    batchName: string;
    teacherName: string;
    reason: string;
  }>;
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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  mode?: string;
  model?: string;
  timestamp: string;
}

export interface DatabaseStats {
  status: string;
  database: string;
  databaseFile: string;
  sizeBytes: number;
  tableCounts: Record<string, number>;
  timestamp: string;
}
