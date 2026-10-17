import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'greensched.db');
const LEGACY_DB_FILE = path.resolve(process.cwd(), 'data', 'greensched.sqlite');

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else if (fs.existsSync(LEGACY_DB_FILE)) {
    const fileBuffer = fs.readFileSync(LEGACY_DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
    saveDb();
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize relational tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      student_count INTEGER NOT NULL,
      semester TEXT DEFAULT 'Fall 2026'
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      type TEXT DEFAULT 'Smart Lecture Hall'
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      max_weekly_hours INTEGER DEFAULT 16
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      weekly_lectures INTEGER NOT NULL,
      batch_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timeslots (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      classroom_id TEXT NOT NULL,
      timeslot_id TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY(classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
      FOREIGN KEY(timeslot_id) REFERENCES timeslots(id) ON DELETE CASCADE
    );
  `);

  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const binaryData = dbInstance.export();
  const buffer = Buffer.from(binaryData);
  fs.writeFileSync(DB_FILE, buffer);
}

export function queryAll<T = Record<string, any>>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function runSql(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
}

export function getDbStats() {
  const stats = {
    exists: fs.existsSync(DB_FILE),
    path: DB_FILE,
    sizeBytes: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
    tableCounts: {
      batches: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM batches')[0]?.count || 0,
      teachers: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM teachers')[0]?.count || 0,
      classrooms: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM classrooms')[0]?.count || 0,
      subjects: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM subjects')[0]?.count || 0,
      timeslots: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM timeslots')[0]?.count || 0,
      timetable_entries: queryAll<{ count: number }>('SELECT COUNT(*) as count FROM timetable_entries')[0]?.count || 0,
    }
  };
  return stats;
}
