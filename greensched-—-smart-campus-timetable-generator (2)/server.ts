import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDb, queryAll, runSql, saveDb, getDbStats } from './server/db.js';
import { generateTimetable } from './server/scheduler.js';
import { processChatbotQuery } from './server/geminiChat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// ------------------- INITIALIZE DATABASE -------------------
await getDb();

// ------------------- HEALTH & DIAGNOSTICS -------------------
app.get('/api/health', (req: Request, res: Response) => {
  try {
    const stats = getDbStats();
    res.json({
      status: 'online',
      service: 'GreenSched Smart Campus Timetable Engine',
      database: 'SQLite (Persistent Wasm with File-System Sync)',
      databaseFile: stats.path,
      sizeBytes: stats.sizeBytes,
      tableCounts: stats.tableCounts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/db/stats', (req: Request, res: Response) => {
  try {
    res.json(getDbStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- SAMPLE DATA SEEDING -------------------
app.post('/api/sample-data', async (req: Request, res: Response) => {
  try {
    // Clear old records
    runSql('DELETE FROM timetable_entries;');
    runSql('DELETE FROM subjects;');
    runSql('DELETE FROM teachers;');
    runSql('DELETE FROM classrooms;');
    runSql('DELETE FROM batches;');
    runSql('DELETE FROM timeslots;');

    // 1. Batches
    const batches = [
      { id: 'b-1', name: 'CS-A (3rd Year)', student_count: 55, semester: 'Semester 5' },
      { id: 'b-2', name: 'CS-B (3rd Year)', student_count: 50, semester: 'Semester 5' },
      { id: 'b-3', name: 'IT-A (2nd Year)', student_count: 45, semester: 'Semester 3' },
    ];
    for (const b of batches) {
      runSql('INSERT INTO batches (id, name, student_count, semester) VALUES (?, ?, ?, ?);', [
        b.id, b.name, b.student_count, b.semester
      ]);
    }

    // 2. Classrooms
    const rooms = [
      { id: 'room-101', name: 'Green Hall 101', capacity: 60, type: 'Smart Lecture Hall' },
      { id: 'room-102', name: 'Oak Theater 102', capacity: 65, type: 'Auditorium Hall' },
      { id: 'room-103', name: 'Lotus Seminar Lab', capacity: 50, type: 'Interactive Computing Lab' },
    ];
    for (const r of rooms) {
      runSql('INSERT INTO classrooms (id, name, capacity, type) VALUES (?, ?, ?, ?);', [
        r.id, r.name, r.capacity, r.type
      ]);
    }

    // 3. Teachers
    const teachers = [
      { id: 't-1', name: 'Dr. Radhika Sharma', department: 'Computer Science', max_weekly_hours: 16 },
      { id: 't-2', name: 'Prof. Arvind Menon', department: 'Information Technology', max_weekly_hours: 16 },
      { id: 't-3', name: 'Dr. Sneha Patil', department: 'Computer Science', max_weekly_hours: 14 },
      { id: 't-4', name: 'Prof. Vikas Gupta', department: 'Mathematics & AI', max_weekly_hours: 14 },
    ];
    for (const t of teachers) {
      runSql('INSERT INTO teachers (id, name, department, max_weekly_hours) VALUES (?, ?, ?, ?);', [
        t.id, t.name, t.department, t.max_weekly_hours
      ]);
    }

    // 4. Subjects
    const subjects = [
      { id: 'sub-1', name: 'Database Management Systems', code: 'CS301', weekly_lectures: 3, batch_id: 'b-1', teacher_id: 't-1' },
      { id: 'sub-2', name: 'Operating Systems', code: 'CS302', weekly_lectures: 3, batch_id: 'b-1', teacher_id: 't-3' },
      { id: 'sub-3', name: 'Computer Networks', code: 'CS303', weekly_lectures: 3, batch_id: 'b-2', teacher_id: 't-2' },
      { id: 'sub-4', name: 'Discrete Mathematics', code: 'MA201', weekly_lectures: 3, batch_id: 'b-2', teacher_id: 't-4' },
      { id: 'sub-5', name: 'Data Structures & Algorithms', code: 'IT201', weekly_lectures: 3, batch_id: 'b-3', teacher_id: 't-1' },
      { id: 'sub-6', name: 'Software Engineering', code: 'IT202', weekly_lectures: 3, batch_id: 'b-3', teacher_id: 't-2' },
    ];
    for (const s of subjects) {
      runSql(
        'INSERT INTO subjects (id, name, code, weekly_lectures, batch_id, teacher_id) VALUES (?, ?, ?, ?, ?, ?);',
        [s.id, s.name, s.code, s.weekly_lectures, s.batch_id, s.teacher_id]
      );
    }

    // 5. Timeslots (Mon to Fri, 4 periods per day)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { start: '09:00', end: '10:00' },
      { start: '10:15', end: '11:15' },
      { start: '11:30', end: '12:30' },
      { start: '13:30', end: '14:30' },
    ];

    let slotCounter = 1;
    for (const day of days) {
      for (const p of periods) {
        const slotId = `slot-${day.substring(0, 3).toLowerCase()}-${slotCounter}`;
        runSql(
          'INSERT INTO timeslots (id, day, start_time, end_time, slot_index) VALUES (?, ?, ?, ?, ?);',
          [slotId, day, p.start, p.end, slotCounter++]
        );
      }
    }

    // Generate initial timetable
    const schedResult = await generateTimetable();

    res.json({
      success: true,
      message: 'Realistic engineering college dataset loaded and scheduled!',
      scheduling: schedResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------- BATCHES CRUD -------------------
app.get('/api/batches', (req: Request, res: Response) => {
  res.json(queryAll('SELECT * FROM batches ORDER BY name ASC'));
});

app.post('/api/batches', (req: Request, res: Response) => {
  const { name, student_count, semester } = req.body;
  if (!name || !student_count) {
    return res.status(400).json({ error: 'Name and student count are required.' });
  }
  const id = `b-${Date.now()}`;
  runSql(
    'INSERT INTO batches (id, name, student_count, semester) VALUES (?, ?, ?, ?);',
    [id, name, Number(student_count), semester || 'Fall 2026']
  );
  res.json({ id, name, student_count: Number(student_count), semester: semester || 'Fall 2026' });
});

app.delete('/api/batches/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM batches WHERE id = ?;', [req.params.id]);
  res.json({ success: true });
});

// ------------------- TEACHERS CRUD -------------------
app.get('/api/teachers', (req: Request, res: Response) => {
  res.json(queryAll('SELECT * FROM teachers ORDER BY name ASC'));
});

app.post('/api/teachers', (req: Request, res: Response) => {
  const { name, department, max_weekly_hours } = req.body;
  if (!name || !department) {
    return res.status(400).json({ error: 'Name and department are required.' });
  }
  const id = `t-${Date.now()}`;
  runSql(
    'INSERT INTO teachers (id, name, department, max_weekly_hours) VALUES (?, ?, ?, ?);',
    [id, name, department, Number(max_weekly_hours || 16)]
  );
  res.json({ id, name, department, max_weekly_hours: Number(max_weekly_hours || 16) });
});

app.delete('/api/teachers/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM teachers WHERE id = ?;', [req.params.id]);
  res.json({ success: true });
});

// ------------------- CLASSROOMS CRUD -------------------
app.get('/api/classrooms', (req: Request, res: Response) => {
  res.json(queryAll('SELECT * FROM classrooms ORDER BY capacity DESC'));
});

app.post('/api/classrooms', (req: Request, res: Response) => {
  const { name, capacity, type } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ error: 'Name and capacity are required.' });
  }
  const id = `room-${Date.now()}`;
  runSql(
    'INSERT INTO classrooms (id, name, capacity, type) VALUES (?, ?, ?, ?);',
    [id, name, Number(capacity), type || 'Smart Lecture Hall']
  );
  res.json({ id, name, capacity: Number(capacity), type: type || 'Smart Lecture Hall' });
});

app.delete('/api/classrooms/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM classrooms WHERE id = ?;', [req.params.id]);
  res.json({ success: true });
});

// ------------------- SUBJECTS CRUD -------------------
app.get('/api/subjects', (req: Request, res: Response) => {
  const subjects = queryAll(`
    SELECT s.*, b.name as batch_name, t.name as teacher_name, t.department as teacher_department
    FROM subjects s
    LEFT JOIN batches b ON s.batch_id = b.id
    LEFT JOIN teachers t ON s.teacher_id = t.id
    ORDER BY s.name ASC
  `);
  res.json(subjects);
});

app.post('/api/subjects', (req: Request, res: Response) => {
  const { name, code, weekly_lectures, batch_id, teacher_id } = req.body;
  if (!name || !code || !batch_id || !teacher_id) {
    return res.status(400).json({ error: 'All subject fields are required.' });
  }
  const id = `sub-${Date.now()}`;
  runSql(
    'INSERT INTO subjects (id, name, code, weekly_lectures, batch_id, teacher_id) VALUES (?, ?, ?, ?, ?, ?);',
    [id, name, code, Number(weekly_lectures || 3), batch_id, teacher_id]
  );
  res.json({ id, name, code, weekly_lectures: Number(weekly_lectures || 3), batch_id, teacher_id });
});

app.delete('/api/subjects/:id', (req: Request, res: Response) => {
  runSql('DELETE FROM subjects WHERE id = ?;', [req.params.id]);
  res.json({ success: true });
});

// ------------------- TIMESLOTS -------------------
app.get('/api/timeslots', (req: Request, res: Response) => {
  res.json(queryAll('SELECT * FROM timeslots ORDER BY slot_index ASC'));
});

// ------------------- TIMETABLE & GENERATION -------------------
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const result = await generateTimetable();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/timetable', (req: Request, res: Response) => {
  try {
    const entries = queryAll(`
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
      ORDER BY ts.slot_index ASC
    `);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch-wise timetable
app.get('/api/timetable/batch/:batchId', (req: Request, res: Response) => {
  try {
    const entries = queryAll(`
      SELECT 
        t.id, t.subject_id, s.name as subject_name, s.code as subject_code,
        t.batch_id, b.name as batch_name, b.student_count as batch_students,
        t.teacher_id, tea.name as teacher_name, tea.department as teacher_department,
        t.classroom_id, c.name as classroom_name, c.capacity as classroom_capacity, c.type as classroom_type,
        ts.id as timeslot_id, ts.day, ts.start_time, ts.end_time, ts.slot_index
      FROM timetable_entries t
      JOIN subjects s ON t.subject_id = s.id
      JOIN batches b ON t.batch_id = b.id
      JOIN teachers tea ON t.teacher_id = tea.id
      JOIN classrooms c ON t.classroom_id = c.id
      JOIN timeslots ts ON t.timeslot_id = ts.id
      WHERE t.batch_id = ?
      ORDER BY ts.slot_index ASC
    `, [req.params.batchId]);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty-wise / Teacher-wise timetable
app.get(['/api/timetable/teacher/:teacherId', '/api/timetable/faculty/:teacherId'], (req: Request, res: Response) => {
  try {
    const entries = queryAll(`
      SELECT 
        t.id, t.subject_id, s.name as subject_name, s.code as subject_code,
        t.batch_id, b.name as batch_name, b.student_count as batch_students,
        t.teacher_id, tea.name as teacher_name, tea.department as teacher_department,
        t.classroom_id, c.name as classroom_name, c.capacity as classroom_capacity, c.type as classroom_type,
        ts.id as timeslot_id, ts.day, ts.start_time, ts.end_time, ts.slot_index
      FROM timetable_entries t
      JOIN subjects s ON t.subject_id = s.id
      JOIN batches b ON t.batch_id = b.id
      JOIN teachers tea ON t.teacher_id = tea.id
      JOIN classrooms c ON t.classroom_id = c.id
      JOIN timeslots ts ON t.timeslot_id = ts.id
      WHERE t.teacher_id = ?
      ORDER BY ts.slot_index ASC
    `, [req.params.teacherId]);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Conflict validation audit
app.get('/api/timetable/validate', (req: Request, res: Response) => {
  try {
    const entries = queryAll<any>(`
      SELECT 
        t.id, t.subject_id, t.batch_id, t.teacher_id, t.classroom_id, t.timeslot_id,
        b.name as batch_name, b.student_count,
        c.name as classroom_name, c.capacity,
        tea.name as teacher_name,
        s.name as subject_name,
        ts.day, ts.start_time, ts.end_time
      FROM timetable_entries t
      JOIN subjects s ON t.subject_id = s.id
      JOIN batches b ON t.batch_id = b.id
      JOIN teachers tea ON t.teacher_id = tea.id
      JOIN classrooms c ON t.classroom_id = c.id
      JOIN timeslots ts ON t.timeslot_id = ts.id
    `);

    const teacherSlots = new Map<string, any[]>();
    const roomSlots = new Map<string, any[]>();
    const batchSlots = new Map<string, any[]>();
    const capacityViolations: any[] = [];

    for (const e of entries) {
      const tKey = `${e.teacher_id}@${e.timeslot_id}`;
      const rKey = `${e.classroom_id}@${e.timeslot_id}`;
      const bKey = `${e.batch_id}@${e.timeslot_id}`;

      if (!teacherSlots.has(tKey)) teacherSlots.set(tKey, []);
      teacherSlots.get(tKey)!.push(e);

      if (!roomSlots.has(rKey)) roomSlots.set(rKey, []);
      roomSlots.get(rKey)!.push(e);

      if (!batchSlots.has(bKey)) batchSlots.set(bKey, []);
      batchSlots.get(bKey)!.push(e);

      if (e.capacity < e.student_count) {
        capacityViolations.push({
          lecture: e.subject_name,
          classroom: e.classroom_name,
          capacity: e.capacity,
          students: e.student_count,
        });
      }
    }

    const teacherClashes = Array.from(teacherSlots.entries()).filter(([_, list]) => list.length > 1);
    const roomClashes = Array.from(roomSlots.entries()).filter(([_, list]) => list.length > 1);
    const batchClashes = Array.from(batchSlots.entries()).filter(([_, list]) => list.length > 1);

    const isClashFree = teacherClashes.length === 0 && roomClashes.length === 0 && batchClashes.length === 0 && capacityViolations.length === 0;

    res.json({
      valid: isClashFree,
      totalScheduled: entries.length,
      teacherClashes: teacherClashes.length,
      roomClashes: roomClashes.length,
      batchClashes: batchClashes.length,
      capacityViolations: capacityViolations.length,
      details: {
        teacherClashes: teacherClashes.map(([k, list]) => ({ key: k, lectures: list })),
        roomClashes: roomClashes.map(([k, list]) => ({ key: k, lectures: list })),
        batchClashes: batchClashes.map(([k, list]) => ({ key: k, lectures: list })),
        capacityViolations,
      },
      message: isClashFree
        ? 'Verified: Zero teacher clashes, zero classroom overlaps, and zero batch double-bookings.'
        : 'Conflict detected in current schedule.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// JSON and CSV Export
app.get(['/api/timetable/export', '/api/timetable/export-csv'], (req: Request, res: Response) => {
  try {
    const entries = queryAll<any>(`
      SELECT 
        ts.day,
        ts.start_time || ' - ' || ts.end_time as slot,
        b.name as batch,
        s.name as subject,
        s.code as subject_code,
        tea.name as teacher,
        c.name as classroom,
        c.type as room_type
      FROM timetable_entries t
      JOIN subjects s ON t.subject_id = s.id
      JOIN batches b ON t.batch_id = b.id
      JOIN teachers tea ON t.teacher_id = tea.id
      JOIN classrooms c ON t.classroom_id = c.id
      JOIN timeslots ts ON t.timeslot_id = ts.id
      ORDER BY ts.slot_index ASC
    `);

    let csv = 'Day,Time Slot,Student Batch,Subject,Code,Faculty Member,Classroom,Room Type\n';
    entries.forEach(r => {
      csv += `"${r.day}","${r.slot}","${r.batch}","${r.subject}","${r.subject_code}","${r.teacher}","${r.classroom}","${r.room_type}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="GreenSched_Timetable.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).send(`Error generating CSV: ${err.message}`);
  }
});

// ------------------- CHATBOT -------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { query, batch } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query text is required.' });
    }
    const result = await processChatbotQuery(query, batch || 'CS-A (3rd Year)');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- VITE / STATIC SERVING -------------------
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

// ------------------- SERVER LISTEN -------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 GreenSched Server running on http://0.0.0.0:${PORT}`);
});
