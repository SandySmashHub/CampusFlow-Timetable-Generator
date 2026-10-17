import { queryAll } from './db.js';

export interface DBTeacher {
  id: string;
  name: string;
  department: string;
  max_weekly_hours: number;
}

export interface DBClassroom {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface DBBatch {
  id: string;
  name: string;
  student_count: number;
  semester?: string;
}

export interface DBSubject {
  id: string;
  name: string;
  code: string;
  weekly_lectures: number;
  batch_id: string;
  teacher_id: string;
  teacher_name?: string;
  batch_name?: string;
}

export interface DBTimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_index: number;
}

export interface DBLectureEntry {
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

export const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const HINDI_DAY_MAP: Record<string, string> = {
  somwar: 'Monday',
  somvaar: 'Monday',
  somvar: 'Monday',
  monday: 'Monday',
  mon: 'Monday',
  mangalwar: 'Tuesday',
  mangalvaar: 'Tuesday',
  mangalvar: 'Tuesday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  budhwar: 'Wednesday',
  budhvaar: 'Wednesday',
  budhvar: 'Wednesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  guruwar: 'Thursday',
  guruvaar: 'Thursday',
  guruvar: 'Thursday',
  veervaar: 'Thursday',
  veervar: 'Thursday',
  brihaspativar: 'Thursday',
  thursday: 'Thursday',
  thu: 'Thursday',
  shukrawar: 'Friday',
  shukravaar: 'Friday',
  shukravar: 'Friday',
  jumma: 'Friday',
  friday: 'Friday',
  fri: 'Friday',
  shaniwar: 'Saturday',
  shanivaar: 'Saturday',
  shanivar: 'Saturday',
  saturday: 'Saturday',
  sat: 'Saturday',
  ravivar: 'Sunday',
  ravivaar: 'Sunday',
  itwaar: 'Sunday',
  itwar: 'Sunday',
  sunday: 'Sunday',
  sun: 'Sunday',
};

// ----------------- ENTITY LOADERS -----------------
export function getAllTeachers(): DBTeacher[] {
  return queryAll<DBTeacher>('SELECT * FROM teachers ORDER BY name ASC');
}

export function getAllClassrooms(): DBClassroom[] {
  return queryAll<DBClassroom>('SELECT * FROM classrooms ORDER BY name ASC');
}

export function getAllBatches(): DBBatch[] {
  return queryAll<DBBatch>('SELECT * FROM batches ORDER BY name ASC');
}

export function getAllSubjects(): DBSubject[] {
  return queryAll<DBSubject>(`
    SELECT s.*, t.name as teacher_name, b.name as batch_name 
    FROM subjects s
    LEFT JOIN teachers t ON s.teacher_id = t.id
    LEFT JOIN batches b ON s.batch_id = b.id
    ORDER BY s.name ASC
  `);
}

export function getAllTimeslots(): DBTimeSlot[] {
  return queryAll<DBTimeSlot>('SELECT * FROM timeslots ORDER BY slot_index ASC');
}

export function getAllScheduledLectures(): DBLectureEntry[] {
  return queryAll<DBLectureEntry>(`
    SELECT 
      t.id,
      t.subject_id,
      s.name as subject_name,
      s.code as subject_code,
      t.batch_id,
      b.name as batch_name,
      b.student_count as batch_students,
      t.teacher_id,
      tea.name as teacher_name,
      tea.department as teacher_department,
      t.classroom_id,
      c.name as classroom_name,
      c.capacity as classroom_capacity,
      c.type as classroom_type,
      ts.id as timeslot_id,
      ts.day,
      ts.start_time,
      ts.end_time,
      ts.slot_index
    FROM timetable_entries t
    JOIN subjects s ON t.subject_id = s.id
    JOIN batches b ON t.batch_id = b.id
    JOIN teachers tea ON t.teacher_id = tea.id
    JOIN classrooms c ON t.classroom_id = c.id
    JOIN timeslots ts ON t.timeslot_id = ts.id
    ORDER BY ts.slot_index ASC, ts.start_time ASC
  `);
}

// ----------------- SMART ENTITY MATCHING -----------------

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identify a teacher from user text using name tokens, last names, prefixes
 */
export function findTeacherMatch(
  query: string,
  teachers: DBTeacher[]
): { teacher: DBTeacher | null; isAmbiguous: boolean; candidates: DBTeacher[] } {
  const normQuery = normalizeText(query);
  const words = normQuery.split(' ');

  // Exact or direct substring match
  for (const t of teachers) {
    const normName = normalizeText(t.name);
    if (normQuery.includes(normName)) {
      return { teacher: t, isAmbiguous: false, candidates: [t] };
    }
  }

  // Token matching (e.g. "sharma", "menon", "patil", "gupta", "radhika", "arvind", "sneha", "vikas")
  const candidates: DBTeacher[] = [];
  for (const t of teachers) {
    const nameParts = normalizeText(t.name)
      .split(' ')
      .filter(p => !['dr', 'prof', 'professor', 'mr', 'ms', 'mrs'].includes(p));

    const matchesPart = nameParts.some(part => part.length >= 3 && words.includes(part));
    if (matchesPart) {
      candidates.push(t);
    }
  }

  if (candidates.length === 1) {
    return { teacher: candidates[0], isAmbiguous: false, candidates };
  } else if (candidates.length > 1) {
    return { teacher: null, isAmbiguous: true, candidates };
  }

  // Check if query refers to generic "sir" / "teacher" / "faculty" / "professor" without naming one
  const genericTeacherTokens = ['sir', 'teacher', 'faculty', 'professor', 'maam', 'madam'];
  const hasGenericTeacher = words.some(w => genericTeacherTokens.includes(w));

  return {
    teacher: null,
    isAmbiguous: hasGenericTeacher && teachers.length > 1,
    candidates: hasGenericTeacher ? teachers : [],
  };
}

/**
 * Identify a student batch from query or fallback to user's active batch
 */
export function findBatchMatch(
  query: string,
  batches: DBBatch[],
  defaultBatchName?: string
): { batch: DBBatch | null; isAmbiguous: boolean; candidates: DBBatch[] } {
  const normQuery = normalizeText(query);
  const compactQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check specific batch names (e.g. "cs-a", "cs a", "cs-b", "it-a", "it a")
  for (const b of batches) {
    const rawLower = b.name.toLowerCase();
    const compactBatch = rawLower.replace(/[^a-z0-9]/g, '');
    const firstTwoWords = normalizeText(b.name).split(' ').slice(0, 2).join(' '); // e.g. "cs a", "it a"
    const dashCode = b.name.split(' ')[0].toLowerCase(); // e.g. "cs-a", "cs-b", "it-a"
    const compactCode = dashCode.replace(/[^a-z0-9]/g, ''); // e.g. "csa", "csb", "ita"

    if (
      query.toLowerCase().includes(dashCode) ||
      normQuery.includes(firstTwoWords) ||
      compactQuery.includes(compactCode) ||
      (compactBatch.length > 3 && compactQuery.includes(compactBatch))
    ) {
      return { batch: b, isAmbiguous: false, candidates: [b] };
    }
  }

  // If query specifically mentions "my batch", "mera batch", "my timetable", "mera timetable"
  if (defaultBatchName) {
    const def = batches.find(b => b.name.toLowerCase() === defaultBatchName.toLowerCase());
    if (def) {
      return { batch: def, isAmbiguous: false, candidates: [def] };
    }
  }

  return { batch: batches[0] || null, isAmbiguous: false, candidates: batches };
}

/**
 * Identify a classroom from user text (e.g. "room 204", "101", "green hall", "oak theater")
 */
export function findClassroomMatch(
  query: string,
  classrooms: DBClassroom[]
): { room: DBClassroom | null; isAmbiguous: boolean; candidates: DBClassroom[] } {
  const normQuery = normalizeText(query);
  const words = normQuery.split(' ');

  for (const r of classrooms) {
    const normRoom = normalizeText(r.name);
    if (normQuery.includes(normRoom)) {
      return { room: r, isAmbiguous: false, candidates: [r] };
    }
    // Check numbers in room name (e.g. 101, 102, 103, 204)
    const numbers = normRoom.match(/\d+/g);
    if (numbers) {
      for (const num of numbers) {
        if (words.includes(num) || normQuery.includes(`room ${num}`) || normQuery.includes(`lab ${num}`)) {
          return { room: r, isAmbiguous: false, candidates: [r] };
        }
      }
    }
    // Check keywords (e.g. "green hall", "oak theater", "lotus seminar")
    const keywords = normRoom.split(' ').filter(w => !['smart', 'lecture', 'hall', 'lab', 'room'].includes(w));
    if (keywords.length > 0 && keywords.some(k => k.length >= 4 && normQuery.includes(k))) {
      return { room: r, isAmbiguous: false, candidates: [r] };
    }
  }

  return { room: null, isAmbiguous: false, candidates: [] };
}

/**
 * Identify a subject from query (e.g. DBMS, Operating Systems, Java, CS301)
 */
export function findSubjectMatch(
  query: string,
  subjects: DBSubject[]
): { subject: DBSubject | null; candidates: DBSubject[] } {
  const normQuery = normalizeText(query);
  const words = normQuery.split(' ');

  for (const s of subjects) {
    const normSub = normalizeText(s.name);
    const normCode = normalizeText(s.code);

    if (normQuery.includes(normSub) || words.includes(normCode)) {
      return { subject: s, candidates: [s] };
    }

    // Common acronyms
    if (normSub.includes('database') && (normQuery.includes('dbms') || words.includes('database'))) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('operating') && (normQuery.includes('os') || words.includes('operating'))) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('network') && (normQuery.includes('cn') || normQuery.includes('networks'))) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('data structure') && (normQuery.includes('dsa') || normQuery.includes('structures'))) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('software') && normQuery.includes('software engineering')) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('discrete') && (normQuery.includes('math') || normQuery.includes('discrete'))) {
      return { subject: s, candidates: [s] };
    }
    if (normSub.includes('java') && normQuery.includes('java')) {
      return { subject: s, candidates: [s] };
    }
  }

  return { subject: null, candidates: [] };
}

/**
 * Resolve target day: "today", "tomorrow", "aaj", "kal", "Monday", etc.
 */
export function resolveTargetDay(
  query: string,
  now: Date = new Date()
): { day: string | null; isExplicit: boolean; isToday: boolean; isTomorrow: boolean } {
  const normQuery = normalizeText(query);
  const words = normQuery.split(' ');

  const dayOfWeekIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const todayDayName = DAYS_LIST[dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1]; // Map to Mon-Sun
  const tomorrowDayIndex = (dayOfWeekIndex + 1) % 7;
  const tomorrowDayName = DAYS_LIST[tomorrowDayIndex === 0 ? 6 : tomorrowDayIndex - 1];

  // Check today / aaj
  if (words.includes('aaj') || words.includes('today')) {
    return { day: todayDayName, isExplicit: true, isToday: true, isTomorrow: false };
  }

  // Check tomorrow / kal
  if (words.includes('kal') || words.includes('tomorrow')) {
    return { day: tomorrowDayName, isExplicit: true, isToday: false, isTomorrow: true };
  }

  // Check day after tomorrow / parso
  if (words.includes('parso') || normQuery.includes('day after tomorrow')) {
    const parsoIndex = (dayOfWeekIndex + 2) % 7;
    const parsoDayName = DAYS_LIST[parsoIndex === 0 ? 6 : parsoIndex - 1];
    return { day: parsoDayName, isExplicit: true, isToday: false, isTomorrow: false };
  }

  // Check explicit day names
  for (const [kw, standardDay] of Object.entries(HINDI_DAY_MAP)) {
    if (words.includes(kw) || normQuery.includes(kw)) {
      return { day: standardDay, isExplicit: true, isToday: standardDay === todayDayName, isTomorrow: standardDay === tomorrowDayName };
    }
  }

  return { day: null, isExplicit: false, isToday: false, isTomorrow: false };
}

/**
 * Parse requested hour from query, e.g. "11 am", "11:00", "at 10", "9:00"
 */
export function parseRequestedTime(query: string): string | null {
  const norm = normalizeText(query);
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const match = norm.match(timeRegex);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] || '00';
    const ampm = (match[3] || '').toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }
  return null;
}
