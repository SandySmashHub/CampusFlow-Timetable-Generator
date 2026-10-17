import { Batch, Classroom, Teacher, Subject, TimeSlot, TimetableEntry, SchedulerResult, DatabaseStats } from '../types/index.ts';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error || errData.message) {
        errorMsg = errData.error || errData.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<DatabaseStats>(`${API_BASE}/health`),
  getDbStats: () => fetchJson<any>(`${API_BASE}/db/stats`),
  loadSampleData: () => fetchJson<{ success: boolean; message: string; scheduling: SchedulerResult }>(`${API_BASE}/sample-data`, {
    method: 'POST',
  }),

  // Batches
  getBatches: () => fetchJson<Batch[]>(`${API_BASE}/batches`),
  createBatch: (data: Omit<Batch, 'id'>) => fetchJson<Batch>(`${API_BASE}/batches`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteBatch: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/batches/${id}`, {
    method: 'DELETE',
  }),

  // Classrooms
  getClassrooms: () => fetchJson<Classroom[]>(`${API_BASE}/classrooms`),
  createClassroom: (data: Omit<Classroom, 'id'>) => fetchJson<Classroom>(`${API_BASE}/classrooms`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteClassroom: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/classrooms/${id}`, {
    method: 'DELETE',
  }),

  // Teachers
  getTeachers: () => fetchJson<Teacher[]>(`${API_BASE}/teachers`),
  createTeacher: (data: Omit<Teacher, 'id'>) => fetchJson<Teacher>(`${API_BASE}/teachers`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteTeacher: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/teachers/${id}`, {
    method: 'DELETE',
  }),

  // Subjects
  getSubjects: () => fetchJson<Subject[]>(`${API_BASE}/subjects`),
  createSubject: (data: Omit<Subject, 'id'>) => fetchJson<Subject>(`${API_BASE}/subjects`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteSubject: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/subjects/${id}`, {
    method: 'DELETE',
  }),

  // Timeslots
  getTimeSlots: () => fetchJson<TimeSlot[]>(`${API_BASE}/timeslots`),

  // Timetable
  generateTimetable: () => fetchJson<SchedulerResult>(`${API_BASE}/generate`, {
    method: 'POST',
  }),
  getTimetable: () => fetchJson<TimetableEntry[]>(`${API_BASE}/timetable`),
  getBatchTimetable: (batchId: string) => fetchJson<TimetableEntry[]>(`${API_BASE}/timetable/batch/${batchId}`),
  getFacultyTimetable: (teacherId: string) => fetchJson<TimetableEntry[]>(`${API_BASE}/timetable/teacher/${teacherId}`),
  validateConflicts: () => fetchJson<any>(`${API_BASE}/timetable/validate`),
  exportCsvUrl: `${API_BASE}/timetable/export-csv`,
  exportCSVUrl: `${API_BASE}/timetable/export-csv`,

  // Chat
  askChatbot: (query: string, batch?: string) => fetchJson<{
    answer: string;
    mode: string;
    model: string;
    matchedBatch?: string;
    calculatedTime?: string;
  }>(`${API_BASE}/chat`, {
    method: 'POST',
    body: JSON.stringify({ query, batch }),
  }),
  askBot: (query: string, batch?: string) => fetchJson<{
    answer: string;
    mode: string;
    model: string;
    matchedBatch?: string;
    calculatedTime?: string;
  }>(`${API_BASE}/chat`, {
    method: 'POST',
    body: JSON.stringify({ query, batch }),
  }),
};

export default api;
