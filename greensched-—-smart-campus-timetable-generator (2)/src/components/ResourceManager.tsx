import React, { useState } from 'react';
import { Batch, Classroom, Teacher, Subject } from '../types/index.ts';
import { api } from '../api/client.ts';
import { Users, School, GraduationCap, BookOpen, Trash2, Plus, AlertCircle } from 'lucide-react';

interface ResourceManagerProps {
  batches: Batch[];
  classrooms: Classroom[];
  teachers: Teacher[];
  subjects: Subject[];
  onRefresh: () => Promise<void>;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  batches,
  classrooms,
  teachers,
  subjects,
  onRefresh,
}) => {
  // Batch Form
  const [batchName, setBatchName] = useState('');
  const [batchCount, setBatchCount] = useState('');
  const [batchSemester, setBatchSemester] = useState('Fall 2026');

  // Classroom Form
  const [roomName, setRoomName] = useState('');
  const [roomCap, setRoomCap] = useState('');
  const [roomType, setRoomType] = useState('Smart Lecture Hall');

  // Teacher Form
  const [teacherName, setTeacherName] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [teacherHours, setTeacherHours] = useState('16');

  // Subject Form
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subLectures, setSubLectures] = useState('3');
  const [subBatchId, setSubBatchId] = useState('');
  const [subTeacherId, setSubTeacherId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Handlers
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim() || !batchCount) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createBatch({
        name: batchName.trim(),
        student_count: parseInt(batchCount, 10),
        semester: batchSemester,
      });
      setBatchName('');
      setBatchCount('');
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !roomCap) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createClassroom({
        name: roomName.trim(),
        capacity: parseInt(roomCap, 10),
        type: roomType,
      });
      setRoomName('');
      setRoomCap('');
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherDept.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createTeacher({
        name: teacherName.trim(),
        department: teacherDept.trim(),
        max_weekly_hours: parseInt(teacherHours, 10) || 16,
      });
      setTeacherName('');
      setTeacherDept('');
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const batchId = subBatchId || batches[0]?.id;
    const teacherId = subTeacherId || teachers[0]?.id;

    if (!subName.trim() || !subCode.trim() || !batchId || !teacherId) {
      setErrorMsg('Please select a batch and teacher for this course.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createSubject({
        name: subName.trim(),
        code: subCode.trim().toUpperCase(),
        weekly_lectures: parseInt(subLectures, 10) || 3,
        batch_id: batchId,
        teacher_id: teacherId,
      });
      setSubName('');
      setSubCode('');
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Batches Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#c5dfd3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-[#1d3b32]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Users className="w-4 h-4 text-[#35725f]" />
                <h3>Student Batches</h3>
              </div>
              <span className="text-xs text-[#35725f] font-mono tabular-nums">
                {batches.length} cohorts
              </span>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Batch Name (e.g. CS-C)"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#488f78]"
                  required
                />
                <input
                  type="number"
                  placeholder="Students"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  className="w-24 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-2 outline-none focus:ring-1 focus:ring-[#488f78] font-mono"
                  required
                  min="1"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#24493e] hover:bg-[#1d3b32] text-white px-3.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Batch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto divide-y divide-[#e3efe8] pr-1">
              {batches.map((b) => (
                <div key={b.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#1d3b32]">{b.name}</span>
                    <span className="text-[#35725f] text-[11px] ml-2 font-mono tabular-nums">
                      {b.student_count} students
                    </span>
                  </div>
                  <button
                    onClick={() => api.deleteBatch(b.id).then(onRefresh)}
                    className="text-[#9cc6b5] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Delete Batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {batches.length === 0 && (
                <p className="text-xs text-[#9cc6b5] py-3 text-center">No batches defined.</p>
              )}
            </div>
          </div>
        </div>

        {/* Classrooms Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#c5dfd3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-[#1d3b32]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <School className="w-4 h-4 text-[#35725f]" />
                <h3>Classrooms & Labs</h3>
              </div>
              <span className="text-xs text-[#35725f] font-mono tabular-nums">
                {classrooms.length} venues
              </span>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room (e.g. Pine Hall 204)"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#488f78]"
                  required
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  value={roomCap}
                  onChange={(e) => setRoomCap(e.target.value)}
                  className="w-24 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-2 outline-none focus:ring-1 focus:ring-[#488f78] font-mono"
                  required
                  min="5"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#24493e] hover:bg-[#1d3b32] text-white px-3.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Classroom"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto divide-y divide-[#e3efe8] pr-1">
              {classrooms.map((c) => (
                <div key={c.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#1d3b32]">{c.name}</span>
                    <span className="text-[#35725f] text-[11px] ml-2 font-mono tabular-nums">
                      Cap: {c.capacity} · {c.type}
                    </span>
                  </div>
                  <button
                    onClick={() => api.deleteClassroom(c.id).then(onRefresh)}
                    className="text-[#9cc6b5] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Delete Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {classrooms.length === 0 && (
                <p className="text-xs text-[#9cc6b5] py-3 text-center">No classrooms defined.</p>
              )}
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#c5dfd3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-[#1d3b32]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <GraduationCap className="w-4 h-4 text-[#35725f]" />
                <h3>Faculty Members</h3>
              </div>
              <span className="text-xs text-[#35725f] font-mono tabular-nums">
                {teachers.length} instructors
              </span>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Faculty Name (Dr. / Prof.)"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#488f78]"
                  required
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={teacherDept}
                  onChange={(e) => setTeacherDept(e.target.value)}
                  className="w-28 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-2 outline-none focus:ring-1 focus:ring-[#488f78]"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#24493e] hover:bg-[#1d3b32] text-white px-3.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Faculty"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto divide-y divide-[#e3efe8] pr-1">
              {teachers.map((t) => (
                <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#1d3b32]">{t.name}</span>
                    <span className="text-[#35725f] text-[11px] ml-2">
                      {t.department} (max {t.max_weekly_hours}h)
                    </span>
                  </div>
                  <button
                    onClick={() => api.deleteTeacher(t.id).then(onRefresh)}
                    className="text-[#9cc6b5] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Delete Faculty"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {teachers.length === 0 && (
                <p className="text-xs text-[#9cc6b5] py-3 text-center">No teachers defined.</p>
              )}
            </div>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#c5dfd3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-[#1d3b32]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-[#35725f]" />
                <h3>Subjects & Course Load</h3>
              </div>
              <span className="text-xs text-[#35725f] font-mono tabular-nums">
                {subjects.length} courses
              </span>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Subject Name (e.g. AI & ML)"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#488f78]"
                  required
                />
                <input
                  type="text"
                  placeholder="Code"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-20 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-2 outline-none uppercase font-mono"
                  required
                />
                <input
                  type="number"
                  placeholder="Lectures"
                  value={subLectures}
                  onChange={(e) => setSubLectures(e.target.value)}
                  className="w-18 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-2 outline-none font-mono"
                  title="Weekly lectures"
                  required
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={subBatchId || batches[0]?.id || ''}
                  onChange={(e) => setSubBatchId(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-1.5 outline-none cursor-pointer"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.name}
                    </option>
                  ))}
                </select>
                <select
                  value={subTeacherId || teachers[0]?.id || ''}
                  onChange={(e) => setSubTeacherId(e.target.value)}
                  className="flex-1 text-xs border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-2 py-1.5 outline-none cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      Faculty: {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#24493e] hover:bg-[#1d3b32] text-white px-3.5 py-1.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Add Course"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto divide-y divide-[#e3efe8] pr-1">
              {subjects.map((s) => (
                <div key={s.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#1d3b32]">
                      {s.name} <span className="font-mono text-[#35725f]">({s.code})</span>
                    </span>
                    <p className="text-[11px] text-[#35725f]">
                      {s.weekly_lectures} lectures/wk · {s.batch_name} · {s.teacher_name}
                    </p>
                  </div>
                  <button
                    onClick={() => api.deleteSubject(s.id).then(onRefresh)}
                    className="text-[#9cc6b5] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="text-xs text-[#9cc6b5] py-3 text-center">No subjects defined.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
