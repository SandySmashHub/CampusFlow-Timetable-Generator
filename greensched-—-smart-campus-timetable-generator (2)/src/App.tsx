import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client.ts';
import { Batch, Classroom, Teacher, Subject, TimetableEntry, SchedulerResult } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { TimetableGrid } from './components/TimetableGrid.tsx';
import { ResourceManager } from './components/ResourceManager.tsx';
import { AssistantChat } from './components/AssistantChat.tsx';
import { ArchitectureDiagram } from './components/ArchitectureDiagram.tsx';
import { DatabaseDiagnostics } from './components/DatabaseDiagnostics.tsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('timetable');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lastResult, setLastResult] = useState<SchedulerResult | null>(null);

  const [loadingSample, setLoadingSample] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState('Checking DB...');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [tRes, bRes, cRes, teaRes, sRes, hRes] = await Promise.all([
        api.getTimetable(),
        api.getBatches(),
        api.getClassrooms(),
        api.getTeachers(),
        api.getSubjects(),
        api.getHealth(),
      ]);

      setTimetable(tRes);
      setBatches(bRes);
      setClassrooms(cRes);
      setTeachers(teaRes);
      setSubjects(sRes);
      setDbStatus(`SQLite Persistent (${hRes.tableCounts?.timetable_entries || 0} scheduled)`);

      // If database is completely fresh and empty on first visit, prompt user or auto-seed
      if (bRes.length === 0 && tRes.length === 0) {
        // Automatically seed sample data so user immediately has a functional demo!
        await handleLoadSampleData(true);
      }
    } catch (err: any) {
      setDbStatus('Backend Offline');
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleLoadSampleData = async (silent: boolean = false) => {
    setLoadingSample(true);
    setGenerationError(null);
    try {
      const res = await api.loadSampleData();
      setLastResult(res.scheduling);
      if (!silent) {
        showAlert(res.message, 'success');
      }
      // Reload refreshed entities
      const [tRes, bRes, cRes, teaRes, sRes, hRes] = await Promise.all([
        api.getTimetable(),
        api.getBatches(),
        api.getClassrooms(),
        api.getTeachers(),
        api.getSubjects(),
        api.getHealth(),
      ]);
      setTimetable(tRes);
      setBatches(bRes);
      setClassrooms(cRes);
      setTeachers(teaRes);
      setSubjects(sRes);
      setDbStatus(`SQLite Persistent (${hRes.tableCounts?.timetable_entries || 0} scheduled)`);
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await api.generateTimetable();
      setLastResult(res);
      const updatedTimetable = await api.getTimetable();
      setTimetable(updatedTimetable);
      const hRes = await api.getHealth();
      setDbStatus(`SQLite Persistent (${hRes.tableCounts?.timetable_entries || 0} scheduled)`);
      showAlert(res.message, res.unscheduledCount === 0 ? 'success' : 'error');
    } catch (err: any) {
      const msg = err.message || 'Failed to generate timetable. Please check backend connection.';
      setGenerationError(msg);
      showAlert(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8f5] text-[#1d3b32] flex flex-col font-sans">
      {/* 3-Zone Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLoadSample={() => handleLoadSampleData(false)}
        loadingSample={loadingSample}
        dbStatus={dbStatus}
      />

      {/* Alert Notification Banner */}
      {alert && (
        <div
          className={`px-4 py-2.5 text-xs text-center font-medium border-b flex items-center justify-center gap-2 transition-all ${
            alert.type === 'success'
              ? 'bg-[#e3efe8] text-[#1d3b32] border-[#c5dfd3]'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#35725f] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'timetable' && (
          <TimetableGrid
            timetable={timetable}
            batches={batches}
            teachers={teachers}
            lastResult={lastResult}
            onRegenerate={handleRegenerate}
            isGenerating={isGenerating}
            generationError={generationError}
          />
        )}

        {activeTab === 'resources' && (
          <ResourceManager
            batches={batches}
            classrooms={classrooms}
            teachers={teachers}
            subjects={subjects}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === 'assistant' && <AssistantChat batches={batches} />}

        {activeTab === 'architecture' && <ArchitectureDiagram />}

        {activeTab === 'database' && <DatabaseDiagnostics />}
      </main>

      {/* Nature-Themed Quiet Footer */}
      <footer className="bg-[#1d3b32] border-t border-[#2b5c4d] text-[#c5dfd3] py-4 px-6 text-center text-xs">
        <p>GreenSched — Constraint-Based Smart Campus Timetable Engine & Multilingual Assistant</p>
      </footer>
    </div>
  );
}
