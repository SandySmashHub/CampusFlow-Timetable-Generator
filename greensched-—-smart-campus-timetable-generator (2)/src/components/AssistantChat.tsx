import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client.ts';
import { Batch, ChatMessage } from '../types/index.ts';
import { Send, Bot, Sparkles, User, RefreshCw, Cpu } from 'lucide-react';

interface AssistantChatProps {
  batches: Batch[];
}

export const AssistantChat: React.FC<AssistantChatProps> = ({ batches }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! Main GreenSched multilingual timetable assistant hoon 🌿.\n\nAap mujhse Hindi, Hinglish ya English me apne schedule, next lectures, room numbers aur subject faculty ke baare me pooch sakte hain.',
      mode: 'Live Context Connected to Relational Timetable',
      model: 'GreenSched Engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [activeBatch, setActiveBatch] = useState('CS-A (3rd Year)');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sampleQuestions = [
    'Mera Monday ka timetable kya hai?',
    "Show me Professor Sharma's complete schedule",
    'Sir ka Monday ko lecture kab hai?',
    'Sir free kab hain?',
    'Which classes are scheduled in Room 101 today?',
    'Which rooms are free at 11 AM?',
    'Mera next lecture kab hai?',
    'Who teaches Database Management Systems?',
    'When is the next DBMS lecture?',
  ];

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await api.askChatbot(textToSend.trim(), activeBatch);
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        mode: res.mode,
        model: res.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to backend: ${err.message}. Please check if the server is running.`,
        mode: 'Connection Failure',
        model: 'Offline',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#c5dfd3] shadow-xs overflow-hidden flex flex-col h-[640px]">
      {/* Chat Header */}
      <div className="bg-[#1d3b32] text-white p-4 flex items-center justify-between border-b border-[#2b5c4d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#35725f] flex items-center justify-center text-[#86efac] border border-[#488f78] shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Campus Schedule Assistant
              <span className="text-[10px] text-[#c5dfd3] font-normal font-mono bg-[#24493e] px-2 py-0.5 rounded">
                Hindi / Hinglish / English
              </span>
            </h3>
            <p className="text-[11px] text-[#9cc6b5]">
              Real-time calculations from SQLite database records
            </p>
          </div>
        </div>

        {/* Batch Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9cc6b5] hidden sm:inline">Active Batch:</span>
          <select
            value={activeBatch}
            onChange={(e) => setActiveBatch(e.target.value)}
            className="bg-[#24493e] border border-[#2b5c4d] text-white text-xs rounded-xl px-2.5 py-1 outline-none cursor-pointer"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="p-2.5 bg-[#f4f8f5] border-b border-[#e3efe8] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        <Sparkles className="w-3.5 h-3.5 text-[#35725f] shrink-0" />
        <span className="text-[11px] font-semibold text-[#1d3b32] shrink-0">Try asking:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="bg-white hover:bg-[#e3efe8] text-[#1d3b32] border border-[#c5dfd3] px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbfdfb]">
        {messages.map((m) => {
          const isBot = m.sender === 'assistant';
          return (
            <div key={m.id} className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
              {isBot && (
                <div className="w-7 h-7 rounded-lg bg-[#24493e] text-[#86efac] flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-2xs ${
                  isBot
                    ? 'bg-white border border-[#c5dfd3] text-[#1d3b32]'
                    : 'bg-[#24493e] text-white'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed font-sans">{m.text}</div>

                {/* Subtitle & Engine Disclosure */}
                <div
                  className={`mt-2 pt-1.5 border-t text-[10px] flex items-center justify-between gap-2 ${
                    isBot ? 'border-[#e3efe8] text-[#35725f]' : 'border-[#35725f] text-[#c5dfd3]'
                  }`}
                >
                  {isBot && m.mode ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Cpu className="w-3 h-3 text-[#35725f]" />
                      Engine: {m.mode}
                    </span>
                  ) : (
                    <span>User Inquirer</span>
                  )}
                  <span className="tabular-nums font-mono opacity-80">{m.timestamp}</span>
                </div>
              </div>
              {!isBot && (
                <div className="w-7 h-7 rounded-lg bg-[#35725f] text-white flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-[#35725f] py-2 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#35725f]" />
            <span>Scanning timetable records and calculating upcoming lectures...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-[#e3efe8] flex gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Mera Monday ka timetable kya hai? / Which room is my next class in?..."
          disabled={isLoading}
          className="flex-1 border border-[#c5dfd3] bg-[#f4f8f5] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1d3b32] outline-none focus:ring-1 focus:ring-[#488f78]"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="bg-[#24493e] hover:bg-[#1d3b32] text-white px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          title="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
