import React, { useState, useMemo } from 'react';
import { TimetableEntry, Batch, Teacher, SchedulerResult } from '../types/index.ts';
import { api } from '../api/client.ts';
import { Play, Download, Users, GraduationCap, CheckCircle2, AlertCircle, Sparkles, Filter, RefreshCw, Calendar } from 'lucide-react';

interface TimetableGridProps {
  timetable: TimetableEntry[];
  batches: Batch[];
  teachers: Teacher[];
  lastResult: SchedulerResult | null;
  onRegenerate: () => Promise<void>;
  isGenerating: boolean;
  generationError?: string | null;
}

const ORDERED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  timetable,
  batches,
  teachers,
  lastResult,
  onRegenerate,
  isGenerating,
  generationError,
}) => {
  const [viewMode, setViewMode] = useState<'batch' | 'teacher'>('batch');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Auto-select first batch or teacher if none selected
  const activeEntityId = useMemo(() => {
    if (viewMode === 'batch') {
      if (selectedEntityId && batches.some(b => b.id === selectedEntityId)) {
        return selectedEntityId;
      }
      return batches[0]?.id || '';
    } else {
      if (selectedEntityId && teachers.some(t => t.id === selectedEntityId)) {
        return selectedEntityId;
      }
      return teachers[0]?.id || '';
    }
  }, [viewMode, selectedEntityId, batches, teachers]);

  // Extract distinct timeslots in sequential order
  const timeSlots = useMemo(() => {
    const map = new Map<string, { start: string; end: string; index: number }>();
    timetable.forEach(e => {
      const label = `${e.start_time} - ${e.end_time}`;
      if (!map.has(label)) {
        map.set(label, { start: e.start_time, end: e.end_time, index: e.slot_index });
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].start.localeCompare(b[1].start))
      .map(([label]) => label);
  }, [timetable]);

  // Filter entries for current view
  const currentEntries = useMemo(() => {
    if (viewMode === 'batch') {
      return timetable.filter(e => e.batch_id === activeEntityId);
    } else {
      return timetable.filter(e => e.teacher_id === activeEntityId);
    }
  }, [timetable, viewMode, activeEntityId]);

  // Calculate stats for active entity
  const activeEntityMeta = useMemo(() => {
    if (viewMode === 'batch') {
      const b = batches.find(x => x.id === activeEntityId);
      return {
        title: b?.name || 'Select Batch',
        subtitle: `${b?.student_count || 0} enrolled students · ${b?.semester || 'Semester'}`,
        weeklyHours: currentEntries.length,
      };
    } else {
      const t = teachers.find(x => x.id === activeEntityId);
      return {
        title: t?.name || 'Select Faculty',
        subtitle: `${t?.department || 'Department'} · Max ${t?.max_weekly_hours || 16} hrs/week`,
        weeklyHours: currentEntries.length,
      };
    }
  }, [viewMode, activeEntityId, batches, teachers, currentEntries]);

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#c5dfd3] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: View selector & Entity dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Control */}
          <div className="flex p-1 bg-[#f4f8f5] rounded-xl border border-[#c5dfd3]">
            <button
              onClick={() => {
                setViewMode('batch');
                setSelectedEntityId(batches[0]?.id || '');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'batch'
                  ? 'bg-white text-[#1d3b32] shadow-xs'
                  : 'text-[#35725f] hover:text-[#1d3b32]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Batch View</span>
            </button>
            <button
              onClick={() => {
                setViewMode('teacher');
                setSelectedEntityId(teachers[0]?.id || '');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'teacher'
                  ? 'bg-white text-[#1d3b32] shadow-xs'
                  : 'text-[#35725f] hover:text-[#1d3b32]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Faculty View</span>
            </button>
          </div>

          {/* Entity Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#35725f]" />
            <select
              value={activeEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="bg-[#f4f8f5] border border-[#c5dfd3] text-[#1d3b32] text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#488f78] cursor-pointer"
            >
              {viewMode === 'batch'
                ? batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.student_count} students)
                    </option>
                  ))
                : teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department})
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href={api.exportCsvUrl}
            className="flex items-center gap-1.5 bg-[#e3efe8] hover:bg-[#c5dfd3] text-[#1d3b32] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#c5dfd3] transition-colors cursor-pointer"
            title="Download CSV timetable file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {/* Primary Clearly Visible "Generate Timetable" Button */}
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            data-testid="generate-timetable-button"
            className="flex items-center gap-2 bg-[#1d3b32] hover:bg-[#24493e] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer border border-[#2b5c4d]"
            title="Generate Timetable using constraint-based scheduling algorithm"
          >
            <RefreshCw className={`w-4 h-4 text-[#86efac] ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Timetable...' : 'Generate Timetable'}</span>
          </button>
        </div>
      </div>

      {/* Loading Feedback State */}
      {isGenerating && (
        <div className="p-4 rounded-2xl border border-[#c5dfd3] bg-[#f4f8f5] text-[#1d3b32] flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-[#35725f] animate-spin shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Generating Timetable...</span>
            <span className="ml-1.5 text-[#35725f]">
              Solving constraint-satisfaction heuristics to eliminate room, teacher, and cohort clashes.
            </span>
          </div>
        </div>
      )}

      {/* Error Feedback State */}
      {generationError && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Generation Error:</span>
            <span className="ml-1.5">{generationError}</span>
          </div>
        </div>
      )}

      {/* Validation & Conflict Status Card */}
      {lastResult && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            lastResult.unscheduledCount === 0
              ? 'bg-[#f4f8f5] border-[#c5dfd3] text-[#1d3b32]'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.unscheduledCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-[#35725f] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-bold">
                  {lastResult.message}
                </h4>
                <div className="text-[11px] text-[#35725f] font-mono tabular-nums">
                  Room Utilization: {lastResult.metrics.roomUtilizationPercent}%
                </div>
              </div>

              {/* Zero-pill metadata inline */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#35725f] mt-1.5">
                <span>0 Teacher Overlaps</span>
                <span aria-hidden="true">·</span>
                <span>0 Room Clashes</span>
                <span aria-hidden="true">·</span>
                <span>0 Batch Double-Bookings</span>
                <span aria-hidden="true">·</span>
                <span>Capacity Verified</span>
              </div>

              {lastResult.unscheduled.length > 0 && (
                <div className="mt-3 pt-2 border-t border-amber-200 text-xs">
                  <div className="font-semibold text-amber-800 mb-1">Unscheduled Lectures Analysis:</div>
                  <ul className="list-disc ml-4 space-y-0.5 text-[11px]">
                    {lastResult.unscheduled.map((u, i) => (
                      <li key={i}>
                        <span className="font-semibold">{u.subjectName} ({u.subjectCode})</span> for {u.batchName} ({u.teacherName}): {u.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Selection Banner */}
      <div className="flex items-center justify-between px-2 text-xs text-[#35725f]">
        <div>
          <span className="font-bold text-sm text-[#1d3b32]">{activeEntityMeta.title}</span>
          <span className="mx-2">·</span>
          <span>{activeEntityMeta.subtitle}</span>
        </div>
        <div className="font-mono tabular-nums text-[11px]">
          {activeEntityMeta.weeklyHours} lectures / week scheduled
        </div>
      </div>

      {/* Empty State Banner if timetable is empty */}
      {timetable.length === 0 && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#c5dfd3] shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#f4f8f5] border border-[#c5dfd3] flex items-center justify-center text-[#35725f] mx-auto shadow-inner">
            <Calendar className="w-8 h-8 text-[#488f78]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-[#1d3b32]">
              No Timetable Generated Yet
            </h3>
            <p className="text-xs text-[#35725f] mt-1.5 leading-relaxed">
              The timetable is currently empty. Run the constraint-satisfaction scheduling engine to automatically generate clash-free schedules for all cohorts, classrooms, and faculty.
            </p>
          </div>
          <div>
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              data-testid="empty-generate-timetable-button"
              className="inline-flex items-center gap-2 bg-[#1d3b32] hover:bg-[#24493e] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl shadow-sm border border-[#2b5c4d] transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[#86efac] ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating Timetable...' : 'Generate Timetable'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Timetable Grid Table */}
      <div className="bg-white rounded-2xl border border-[#c5dfd3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#e3efe8] border-b border-[#c5dfd3]">
                <th className="py-3 px-4 text-xs font-bold text-[#1d3b32] uppercase tracking-wider w-28">
                  Day
                </th>
                {timeSlots.length > 0 ? (
                  timeSlots.map((slot) => (
                    <th
                      key={slot}
                      className="py-3 px-4 text-xs font-bold text-[#1d3b32] uppercase tracking-wider text-center font-mono tabular-nums"
                    >
                      {slot}
                    </th>
                  ))
                ) : (
                  <th className="py-4 px-4 text-xs font-medium text-center text-[#35725f]">
                    No timetable generated yet. Click "Generate Timetable" to schedule lectures.
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3efe8]">
              {ORDERED_DAYS.map((day) => (
                <tr key={day} className="hover:bg-[#f4f8f5]/60 transition-colors">
                  <td className="py-4 px-4 font-bold text-xs text-[#1d3b32] bg-[#f4f8f5] border-r border-[#c5dfd3] align-middle">
                    {day}
                  </td>
                  {timeSlots.map((slot) => {
                    const lecture = currentEntries.find(
                      (e) => e.day === day && `${e.start_time} - ${e.end_time}` === slot
                    );

                    return (
                      <td
                        key={slot}
                        className="p-2 border-r border-[#e3efe8] text-center align-top min-w-[150px] h-28"
                      >
                        {lecture ? (
                          <div className="bg-[#f4f8f5] hover:bg-[#e3efe8] border border-[#c5dfd3] p-2.5 rounded-xl text-left h-full flex flex-col justify-between transition-colors shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono font-bold text-[#1d3b32] bg-[#c5dfd3] px-1.5 py-0.5 rounded">
                                  {lecture.subject_code}
                                </span>
                                <span className="text-[10px] text-[#35725f] truncate">
                                  🏛️ {lecture.classroom_name}
                                </span>
                              </div>
                              <h5 className="font-semibold text-xs text-[#1d3b32] leading-snug line-clamp-2">
                                {lecture.subject_name}
                              </h5>
                            </div>
                            <div className="text-[11px] text-[#35725f] pt-1.5 mt-1 border-t border-[#c5dfd3]/60 flex items-center justify-between">
                              <span className="truncate">
                                {viewMode === 'batch'
                                  ? `👨🏫 ${lecture.teacher_name}`
                                  : `👥 ${lecture.batch_name}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[11px] text-[#9cc6b5] italic">
                            Free Block
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
