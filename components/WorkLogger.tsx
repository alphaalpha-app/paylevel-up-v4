
import React, { useState, useEffect, useRef } from 'react';
import { WorkLog, Job, ShiftTemplate } from '../types';
import { Plus, Trash2, Calendar, Clock, FileText, Save, Timer, Tag, Briefcase, Bookmark, X, Check, ArrowRight } from 'lucide-react';

interface WorkLoggerProps {
  logs: WorkLog[];
  jobs: Job[];
  onAddLog: (log: WorkLog) => void;
  onDeleteLog: (id: string) => void;
  templates: ShiftTemplate[];
  onUpdateTemplates: (templates: ShiftTemplate[]) => void;
}

const PRESET_TAGS = [
  "Kindy", "Glides", "Torpedos", "Marlins", "Dolphins", "Sharks", 
  "100 Bronze", "200 Silver", "400 Gold", "Trainee Instructor", "Coach"
];

export const WorkLogger: React.FC<WorkLoggerProps> = ({ logs, jobs, onAddLog, onDeleteLog, templates, onUpdateTemplates }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'range' | 'manual'>('range');
  const [startTime, setStartTime] = useState('15:30');
  const [endTime, setEndTime] = useState('18:35');
  const [manualDuration, setManualDuration] = useState<string>('8');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template States
  const [isNamingTemplate, setIsNamingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
      if (jobs.length > 0 && !jobs.find(j => j.id === selectedJobId)) {
          setSelectedJobId(jobs[0].id);
      }
  }, [jobs]);

  const calculateDuration = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; 
    return parseFloat((diff / 60).toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      let duration = 0;
      let finalStart = '';
      let finalEnd = '';

      if (mode === 'range') {
        duration = calculateDuration(startTime, endTime);
        finalStart = startTime;
        finalEnd = endTime;
      } else {
        duration = parseFloat(manualDuration) || 0;
        finalStart = '-';
        finalEnd = '-';
      }
      
      if (duration <= 0) {
        alert("請輸入有效的工時。");
        setIsSubmitting(false);
        return;
      }

      const newLog: WorkLog = {
        id: crypto.randomUUID(),
        jobId: selectedJobId,
        date,
        startTime: finalStart,
        endTime: finalEnd,
        duration,
        notes,
        timestamp: Date.now()
      };
      
      onAddLog(newLog);
      setNotes('');
      setIsSubmitting(false);
    }, 300);
  };

  const startSaveTemplate = () => {
      setIsNamingTemplate(true);
      setNewTemplateName('');
  };

  const confirmSaveTemplate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTemplateName.trim()) return;
      
      const newTemplate: ShiftTemplate = {
          id: crypto.randomUUID(),
          name: newTemplateName,
          jobId: selectedJobId,
          startTime,
          endTime,
          notes
      };
      onUpdateTemplates([...templates, newTemplate]);
      setIsNamingTemplate(false);
  };

  const handleLoadTemplate = (t: ShiftTemplate) => {
      setSelectedJobId(t.jobId);
      setStartTime(t.startTime);
      setEndTime(t.endTime);
      setNotes(t.notes);
      setMode('range');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("刪除此模版?")) {
          onUpdateTemplates(templates.filter(t => t.id !== id));
      }
  };

  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Templates Section */}
      <div className="overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          <div className="flex gap-3">
              {templates.map(t => {
                  const tJob = jobs.find(j => j.id === t.jobId);
                  return (
                    <button 
                        key={t.id} 
                        onClick={() => handleLoadTemplate(t)}
                        className="flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm min-w-[140px] text-left group hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: tJob?.color || '#ccc' }}></div>
                        <div className="pl-2">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate pr-4">{t.name}</span>
                                <div onClick={(e) => handleDeleteTemplate(t.id, e)} className="text-gray-300 hover:text-red-500 absolute top-2 right-2 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-3 h-3"/></div>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 font-mono">{t.startTime} - {t.endTime}</div>
                            {tJob && <div className="text-[9px] px-1.5 py-0.5 rounded text-white inline-block opacity-80" style={{ backgroundColor: tJob.color }}>{tJob.name}</div>}
                        </div>
                    </button>
                  )
              })}
              {templates.length === 0 && (
                  <div className="text-xs text-gray-400 flex items-center p-3 border border-dashed rounded-xl border-gray-300">
                      尚未建立模版
                  </div>
              )}
          </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> 新增工時
          </h2>
          
          {mode === 'range' && (
              !isNamingTemplate ? (
                <button onClick={startSaveTemplate} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors">
                    <Bookmark className="w-3 h-3" /> 存為模版
                </button>
              ) : (
                <form onSubmit={confirmSaveTemplate} className="flex items-center gap-2 animate-fade-in bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-indigo-200 dark:border-indigo-600">
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="模版名稱..." 
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="text-xs bg-transparent border-none focus:ring-0 w-24 px-1 text-gray-800 dark:text-white"
                    />
                    <button type="submit" className="text-green-600 hover:text-green-700 p-1"><Check className="w-3 h-3" /></button>
                    <button type="button" onClick={() => setIsNamingTemplate(false)} className="text-red-500 hover:text-red-600 p-1"><X className="w-3 h-3" /></button>
                </form>
              )
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Job Selector */}
          <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3"/> 選擇工作</label>
              <div className="flex flex-wrap gap-2">
                  {jobs.map(job => (
                      <button
                        type="button"
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                            selectedJobId === job.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm transform scale-105' 
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }}></div>
                          {job.name}
                      </button>
                  ))}
              </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">日期</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-4 w-4 text-gray-400" /></div>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="pl-10 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5 focus:ring-primary focus:border-primary" />
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button type="button" onClick={() => setMode('range')} className={`flex-1 text-sm py-1.5 rounded-md flex justify-center gap-2 transition-all ${mode === 'range' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                <Clock className="w-3.5 h-3.5" /> 時間範圍
            </button>
            <button type="button" onClick={() => setMode('manual')} className={`flex-1 text-sm py-1.5 rounded-md flex justify-center gap-2 transition-all ${mode === 'manual' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                <Timer className="w-3.5 h-3.5" /> 直接時數
            </button>
          </div>

          {mode === 'range' ? (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">開始時間</label><input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5" /></div>
              <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">結束時間</label><input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5" /></div>
            </div>
          ) : (
            <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">工作時數</label>
               <input type="number" required min="0.1" step="0.1" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5" />
            </div>
          )}

          {/* Tags & Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> 快速選擇</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => setNotes(tag)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${notes === tag ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 border-indigo-200' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>{tag}</button>
              ))}
              <button type="button" onClick={() => setNotes('')} className="px-3 py-1 rounded-full text-xs font-medium border border-dashed text-gray-400 dark:text-gray-500 dark:border-gray-600 hover:text-gray-600 hover:border-gray-400">Clear</button>
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-4 w-4 text-gray-400" /></div>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註..." className="pl-10 w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-indigo-700 text-white font-medium rounded-lg text-sm px-5 py-3 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl active:scale-[0.99] transition-all">
            <Save className="w-4 h-4" /> 
            {isSubmitting ? '儲存中...' : '儲存紀錄'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="text-gray-700 dark:text-gray-300 font-semibold px-1">最近紀錄</h3>
        {sortedLogs.slice(0, 10).map((log) => {
            const logJob = jobs.find(j => j.id === log.jobId);
            return (
            <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group transition-colors hover:border-indigo-200 dark:hover:border-gray-600">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{log.date}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-mono">{log.duration.toFixed(2)} h</span>
                  {logJob && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: logJob.color }}>{logJob.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{log.startTime} - {log.endTime}</span>
                  {log.notes && <span className="text-gray-400 dark:text-gray-500">•</span>}
                  {log.notes && <span className="italic text-gray-600 dark:text-gray-300">{log.notes}</span>}
                </div>
              </div>
              <button onClick={() => onDeleteLog(log.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
            )
        })}
      </div>
    </div>
  );
};
