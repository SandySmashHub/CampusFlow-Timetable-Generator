import React, { useState } from 'react';
import { ArrowRight, ArrowDown, Monitor, Server, Cpu, Database, Bot, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('csp');

  const nodes = [
    {
      id: 'client',
      title: '1. React 19 Frontend',
      role: 'User Experience & Client State',
      icon: Monitor,
      tech: 'React 19 · Vite 8 · Tailwind CSS v4',
      desc: 'Provides class-wise & faculty-wise timetable matrices, full CRUD management for batches/rooms/teachers/courses, CSV export, and multilingual inquiry interface.',
      inputs: 'User clicks, filters, form submissions, natural language queries',
      outputs: 'REST JSON requests to /api/*',
      file: 'src/components/*',
    },
    {
      id: 'backend',
      title: '2. Express REST API',
      role: 'Backend Orchestrator & Proxy',
      icon: Server,
      tech: 'Node.js · Express 4 · tsx runtime',
      desc: 'Receives HTTP endpoints, handles request validation, executes database queries, coordinates schedule generation, and proxies Gemini AI requests securely without leaking API keys to the browser.',
      inputs: 'JSON payloads from React frontend',
      outputs: 'Validated relational writes, CSV streams, computed timetable responses',
      file: 'server.ts',
    },
    {
      id: 'csp',
      title: '3. CSP Scheduling Engine',
      role: 'Constraint Satisfaction & Conflict Prevention',
      icon: Cpu,
      tech: 'Heuristic Backtracking & Collision Matrix',
      desc: 'Orders lectures using degree heuristic (largest cohort first, tightest classroom fitting). Ensures 0 teacher overlaps, 0 room overlaps, and 0 batch double-bookings.',
      inputs: 'Batches, Classrooms, Faculty, Course weekly hours, Timeslots',
      outputs: 'Clash-free timetable entries, detailed conflict validation report',
      file: 'server/scheduler.ts',
    },
    {
      id: 'db',
      title: '4. Persistent SQLite Database',
      role: 'ACID Relational Storage',
      icon: Database,
      tech: 'SQLite (sql.js Wasm) + greensched.sqlite on disk',
      desc: 'Stores 6 relational tables with foreign keys and cascade rules. Changes are written directly to disk (data/greensched.sqlite), surviving server reboots and browser refreshes.',
      inputs: 'SQL DDL, INSERTs, UPDATEs, DELETEs, parameter bindings',
      outputs: 'Normalized timetable entries with multi-table JOINs',
      file: 'server/db.ts',
    },
    {
      id: 'ai',
      title: '5. Multilingual NLP Engine',
      role: 'Hindi & English Query Resolver',
      icon: Bot,
      tech: 'Gemini 3.8 Flash (@google/genai) + Deterministic Fallback',
      desc: 'Connects securely server-side to Gemini 3.8 Flash with live relational timetable context. If credentials are unavailable, seamlessly falls back to the deterministic multilingual parser.',
      inputs: 'Hindi, Hinglish, or English student query + Active Batch context',
      outputs: 'Upcoming lecture details, room assignments, faculty contacts',
      file: 'server/geminiChat.ts',
    },
  ];

  const activeNodeInfo = nodes.find((n) => n.id === selectedNode) || nodes[2];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#c5dfd3] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e3efe8]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1d3b32] flex items-center gap-2">
              <Server className="w-5 h-5 text-[#35725f]" />
              System Architecture & Data Flow
            </h2>
            <p className="text-xs text-[#35725f] mt-0.5">
              End-to-end data pipeline from client interactions to heuristic constraint satisfaction and persistent SQLite database.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#1d3b32] bg-[#f4f8f5] px-3 py-1.5 rounded-xl border border-[#c5dfd3]">
            <Lock className="w-3.5 h-3.5 text-[#35725f]" />
            <span>Server-Side Credential Isolation</span>
          </div>
        </div>

        {/* Visual Architecture Flowchart */}
        <div className="mt-6 p-6 bg-[#f4f8f5] rounded-2xl border border-[#c5dfd3] overflow-x-auto">
          <div className="min-w-[800px] flex flex-col gap-6">
            {/* Primary Pipeline */}
            <div className="flex items-center justify-between gap-3">
              {/* Node 1: Client */}
              <div
                onClick={() => setSelectedNode('client')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                  selectedNode === 'client'
                    ? 'bg-white border-[#24493e] shadow-sm scale-102'
                    : 'bg-white/80 border-[#c5dfd3] hover:border-[#488f78]'
                }`}
              >
                <Monitor className="w-6 h-6 text-[#35725f] mx-auto mb-1.5" />
                <h4 className="font-bold text-xs text-[#1d3b32]">React Frontend</h4>
                <p className="text-[10px] text-[#35725f] mt-0.5">Admin & Student SPA</p>
              </div>

              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] text-[#35725f] font-mono mb-0.5">HTTP REST</span>
                <ArrowRight className="w-5 h-5 text-[#35725f]" />
              </div>

              {/* Node 2: Backend */}
              <div
                onClick={() => setSelectedNode('backend')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                  selectedNode === 'backend'
                    ? 'bg-white border-[#24493e] shadow-sm scale-102'
                    : 'bg-white/80 border-[#c5dfd3] hover:border-[#488f78]'
                }`}
              >
                <Server className="w-6 h-6 text-[#24493e] mx-auto mb-1.5" />
                <h4 className="font-bold text-xs text-[#1d3b32]">Express API</h4>
                <p className="text-[10px] text-[#35725f] mt-0.5">Route Controllers</p>
              </div>

              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] text-[#35725f] font-mono mb-0.5">Internal Call</span>
                <ArrowRight className="w-5 h-5 text-[#35725f]" />
              </div>

              {/* Node 3: Engine */}
              <div
                onClick={() => setSelectedNode('csp')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                  selectedNode === 'csp'
                    ? 'bg-white border-[#24493e] shadow-sm scale-102'
                    : 'bg-white/80 border-[#c5dfd3] hover:border-[#488f78]'
                }`}
              >
                <Cpu className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <h4 className="font-bold text-xs text-[#1d3b32]">CSP Engine</h4>
                <p className="text-[10px] text-[#35725f] mt-0.5">Zero-Clash Solver</p>
              </div>

              <div className="flex flex-col items-center px-1">
                <span className="text-[10px] text-[#35725f] font-mono mb-0.5">SQL I/O</span>
                <ArrowRight className="w-5 h-5 text-[#35725f]" />
              </div>

              {/* Node 4: Database */}
              <div
                onClick={() => setSelectedNode('db')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                  selectedNode === 'db'
                    ? 'bg-white border-[#24493e] shadow-sm scale-102'
                    : 'bg-white/80 border-[#c5dfd3] hover:border-[#488f78]'
                }`}
              >
                <Database className="w-6 h-6 text-[#1d3b32] mx-auto mb-1.5" />
                <h4 className="font-bold text-xs text-[#1d3b32]">Persistent SQLite</h4>
                <p className="text-[10px] text-[#35725f] mt-0.5">6 Relational Tables</p>
              </div>
            </div>

            {/* Chatbot Branch */}
            <div className="pt-4 border-t border-[#c5dfd3]/60 flex items-center justify-center gap-6">
              <div className="text-center text-xs text-[#35725f]">
                <span>Student Query (Hindi / English)</span>
                <ArrowDown className="w-4 h-4 mx-auto text-[#35725f] my-1" />
              </div>

              <div
                onClick={() => setSelectedNode('ai')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-center min-w-[280px] ${
                  selectedNode === 'ai'
                    ? 'bg-white border-[#24493e] shadow-sm scale-102'
                    : 'bg-white/80 border-[#c5dfd3] hover:border-[#488f78]'
                }`}
              >
                <Bot className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <h4 className="font-bold text-xs text-[#1d3b32]">Multilingual NLP Engine</h4>
                <p className="text-[10px] text-[#35725f] mt-0.5">
                  Gemini 3.8 Flash (Server-Side) + Deterministic Fallback
                </p>
              </div>

              <div className="text-xs text-[#35725f] max-w-xs">
                ← Secure server-side synthesis injecting current clock & live timetable entries
              </div>
            </div>
          </div>
        </div>

        {/* Selected Component Details */}
        <div className="mt-6 bg-[#fbfdfb] p-5 rounded-2xl border border-[#c5dfd3]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#35725f] bg-[#e3efe8] px-2 py-0.5 rounded">
                Component Specification
              </span>
              <h3 className="text-sm font-bold text-[#1d3b32] mt-1">
                {activeNodeInfo.title} — {activeNodeInfo.role}
              </h3>
            </div>
            <div className="text-xs font-mono text-[#35725f]">
              Source: <span className="text-[#1d3b32] font-semibold">{activeNodeInfo.file}</span>
            </div>
          </div>

          <p className="text-xs text-[#1d3b32] leading-relaxed mb-4">
            {activeNodeInfo.desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-[#e3efe8]">
            <div className="p-2.5 bg-white rounded-xl border border-[#c5dfd3]">
              <span className="text-[10px] font-bold text-[#35725f] uppercase tracking-wider">
                Technology Stack
              </span>
              <p className="font-mono text-[11px] text-[#1d3b32] mt-0.5">
                {activeNodeInfo.tech}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-[#c5dfd3]">
              <span className="text-[10px] font-bold text-[#35725f] uppercase tracking-wider">
                Inputs Received
              </span>
              <p className="text-[11px] text-[#1d3b32] mt-0.5">
                {activeNodeInfo.inputs}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-[#c5dfd3]">
              <span className="text-[10px] font-bold text-[#35725f] uppercase tracking-wider">
                Outputs Produced
              </span>
              <p className="text-[11px] text-[#1d3b32] mt-0.5">
                {activeNodeInfo.outputs}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Prevention Guarantees Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-[#c5dfd3] shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-[#1d3b32] font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-[#35725f]" />
          <h3>Algorithmic Constraint Satisfaction Invariants</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#c5dfd3]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1d3b32] mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#35725f]" />
              <span>Teacher Overlap</span>
            </div>
            <p className="text-[11px] text-[#35725f] leading-relaxed">
              Maintains <code className="font-mono text-[10px]">teacherId@slotId</code> busy set. A teacher cannot be scheduled in two venues simultaneously.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#c5dfd3]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1d3b32] mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#35725f]" />
              <span>Room Clash</span>
            </div>
            <p className="text-[11px] text-[#35725f] leading-relaxed">
              Maintains <code className="font-mono text-[10px]">roomId@slotId</code> reservation. A classroom is allocated to exactly one cohort per time period.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#c5dfd3]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1d3b32] mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#35725f]" />
              <span>Cohort Double-Booking</span>
            </div>
            <p className="text-[11px] text-[#35725f] leading-relaxed">
              Maintains <code className="font-mono text-[10px]">batchId@slotId</code> lock. A student batch cannot be scheduled for two concurrent courses.
            </p>
          </div>

          <div className="p-4 bg-[#f4f8f5] rounded-2xl border border-[#c5dfd3]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#1d3b32] mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#35725f]" />
              <span>Capacity Compliance</span>
            </div>
            <p className="text-[11px] text-[#35725f] leading-relaxed">
              Strictly enforces <code className="font-mono text-[10px]">room.capacity &ge; batch.students</code>. Tightest fit heuristics preserve large lecture halls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
