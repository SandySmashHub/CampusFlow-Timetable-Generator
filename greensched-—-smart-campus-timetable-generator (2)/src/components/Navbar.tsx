import React from 'react';
import { Leaf, Calendar, Sliders, MessageSquare, Network, Database, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLoadSample: () => void;
  loadingSample: boolean;
  dbStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onLoadSample,
  loadingSample,
  dbStatus,
}) => {
  const tabs = [
    { id: 'timetable', label: 'Timetable Matrix', icon: Calendar },
    { id: 'resources', label: 'Resource Management', icon: Sliders },
    { id: 'assistant', label: 'Multilingual Assistant', icon: MessageSquare },
    { id: 'architecture', label: 'System Architecture', icon: Network },
    { id: 'database', label: 'Database & Engine', icon: Database },
  ];

  return (
    <header className="bg-[#1d3b32] text-white border-b border-[#2b5c4d] sticky top-0 z-40 shadow-xs">
      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Brand wordmark (single element with organic leaf mark) */}
        <button
          onClick={() => setActiveTab('timetable')}
          className="flex items-center gap-2.5 text-left text-white group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-[#35725f] flex items-center justify-center text-emerald-200 border border-[#488f78] shadow-inner transition-transform group-hover:scale-105">
            <Leaf className="w-5 h-5 text-[#86efac]" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white leading-none">
              GreenSched
            </div>
            <div className="text-[11px] text-[#9cc6b5] font-normal leading-tight mt-0.5">
              Smart Campus Timetable Engine
            </div>
          </div>
        </button>

        {/* Zone 2: Single-line clean text nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#2b5c4d] text-white font-semibold'
                    : 'text-[#c5dfd3] hover:text-white hover:bg-[#24493e]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#86efac]' : 'text-[#9cc6b5]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#c5dfd3] bg-[#24493e] px-2.5 py-1 rounded-md border border-[#2b5c4d]">
            <Database className="w-3 h-3 text-[#86efac]" />
            <span className="truncate max-w-[140px]">{dbStatus}</span>
          </div>
          <button
            onClick={onLoadSample}
            disabled={loadingSample}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0d201a] bg-[#86efac] hover:bg-[#4ade80] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSample ? 'animate-spin' : ''}`} />
            <span>Load College Dataset</span>
          </button>
        </div>
      </div>

      {/* Mobile horizontal tab bar */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-1.5 bg-[#173029] border-t border-[#24493e] gap-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#2b5c4d] text-white font-semibold'
                  : 'text-[#9cc6b5] hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
