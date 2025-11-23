
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { DEFAULT_SETTINGS, DEFAULT_JOB, WorkLog, UserSettings, AppState, Job, ShiftTemplate } from './types';
import { Dashboard } from './components/Dashboard';
import { WorkLogger } from './components/WorkLogger';
import { Settings } from './components/Settings';
import { DataManagement } from './components/DataManagement';
import { PayslipVerifier } from './components/PayslipVerifier';
import { CalendarView } from './components/CalendarView';
import { YearlyWrapUp } from './components/YearlyWrapUp';
import { LayoutDashboard, Timer, Settings as SettingsIcon, Plus, FileCheck, Calendar, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'paylevel_up_data_v1';

const App: React.FC = () => {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AppState = JSON.parse(saved);
        
        // --- MIGRATION LOGIC ---
        let currentJobs = parsed.jobs || [];
        let currentLogs = parsed.logs || [];
        let currentSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        let currentTemplates = parsed.templates || [];

        // Migration: If no jobs exist, create Main Job from old settings
        if (currentJobs.length === 0) {
           const oldSettings = parsed.settings as UserSettings;
           const mainJob: Job = {
             ...DEFAULT_JOB,
             id: crypto.randomUUID(),
             name: 'Main Job',
             hourlyRate: oldSettings.hourlyRate || DEFAULT_JOB.hourlyRate,
             weekendHourlyRate: oldSettings.weekendHourlyRate || oldSettings.hourlyRate || DEFAULT_JOB.weekendHourlyRate,
             targetHours: oldSettings.targetHours || DEFAULT_JOB.targetHours,
             nextHourlyRate: oldSettings.nextHourlyRate || DEFAULT_JOB.nextHourlyRate,
             nextWeekendHourlyRate: oldSettings.nextWeekendHourlyRate || oldSettings.nextHourlyRate || DEFAULT_JOB.nextWeekendHourlyRate
           };
           currentJobs = [mainJob];

           // Assign existing logs to this new job
           currentLogs = currentLogs.map(log => ({
             ...log,
             jobId: log.jobId || mainJob.id
           }));
        }

        setLogs(currentLogs);
        setJobs(currentJobs);
        setSettings(currentSettings);
        setTemplates(currentTemplates);

      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    } else {
        // New user
        const initialJob = { ...DEFAULT_JOB, id: crypto.randomUUID() };
        setJobs([initialJob]);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      const stateToSave: AppState = { logs, settings, jobs, templates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [logs, settings, jobs, templates, isLoaded]);

  // Handle Dark Mode
  useEffect(() => {
      const root = window.document.documentElement;
      if (settings.theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
  }, [settings.theme]);

  const handleAddLog = (log: WorkLog) => {
    setLogs(prev => [log, ...prev]);
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm("確定要刪除此紀錄嗎？")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };
  
  const handleUpdateJob = (updatedJob: Job) => {
      setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };
  
  const handleAddJob = (newJob: Job) => {
      setJobs(prev => [...prev, newJob]);
  };

  const handleDeleteJob = (jobId: string) => {
      if (jobs.length <= 1) {
          alert("至少需要保留一份工作。");
          return;
      }
      if (window.confirm("確定刪除此工作？相關的工時紀錄也會被刪除且無法復原。")) {
          setJobs(prev => prev.filter(j => j.id !== jobId));
          setLogs(prev => prev.filter(l => l.jobId !== jobId));
      }
  };

  const handleImport = (data: AppState) => {
    if (window.confirm("匯入數據將覆蓋現有紀錄。確定繼續？")) {
      setLogs(data.logs);
      setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings
      });
      setTemplates(data.templates || []);

      if (!data.jobs || data.jobs.length === 0) {
           const oldSettings = data.settings as UserSettings;
           const mainJob: Job = {
             ...DEFAULT_JOB,
             id: crypto.randomUUID(),
             hourlyRate: oldSettings.hourlyRate || DEFAULT_JOB.hourlyRate,
             weekendHourlyRate: oldSettings.weekendHourlyRate || oldSettings.hourlyRate || DEFAULT_JOB.weekendHourlyRate,
           };
           setJobs([mainJob]);
           setLogs(data.logs.map(l => ({...l, jobId: mainJob.id})));
      } else {
          setJobs(data.jobs);
      }
    }
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-gray-50 text-primary dark:bg-gray-900">載入中...</div>;

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 md:pb-0 md:pl-24 transition-colors duration-200">
        
        {/* Desktop Side Nav / Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 w-full h-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:top-0 md:left-0 md:w-20 md:h-full md:border-t-0 md:border-r md:flex md:flex-col md:items-center md:justify-start md:pt-10 z-50 shadow-lg md:shadow-none transition-colors duration-200">
          <div className="flex justify-around items-center h-full w-full md:flex-col md:h-auto md:gap-8">
             <div className="hidden md:block font-black text-2xl text-primary mb-2">PL</div>
             <NavButton to="/" icon={<LayoutDashboard />} label="總覽" />
             <NavButton to="/calendar" icon={<Calendar />} label="日曆" />
             <NavButton to="/log" icon={<Timer />} label="記錄" />
             <NavButton to="/verify" icon={<FileCheck />} label="核對" />
             <NavButton to="/settings" icon={<SettingsIcon />} label="設定" />
          </div>
        </nav>

        {/* Floating Action Button for Quick Add */}
        <Link 
          to="/log"
          className="fixed bottom-24 right-6 md:bottom-10 md:right-10 bg-primary hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all z-40 flex items-center justify-center"
          aria-label="快速新增"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </Link>

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 sticky top-0 z-40 transition-colors duration-200">
           <div className="max-w-3xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                <Routes>
                  <Route path="/" element={`你好, ${settings.userName}`} />
                  <Route path="/calendar" element="收入日曆" />
                  <Route path="/log" element="工時記錄" />
                  <Route path="/verify" element="薪資單核對" />
                  <Route path="/settings" element="系統設定" />
                  <Route path="/wrapped" element={<span className="flex items-center gap-2"><Sparkles className="text-amber-400 fill-amber-400"/> 年度回顧</span>} />
                </Routes>
              </h1>
              <div className="flex flex-col items-end">
                <div className="text-xs font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                   {jobs.length > 1 ? `${jobs.length} 份工作` : (jobs[0] ? `${settings.currency} ${jobs[0].hourlyRate}/hr` : '')}
                </div>
              </div>
           </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-3xl mx-auto p-6">
          <Routes>
            <Route path="/" element={
              <Dashboard logs={logs} settings={settings} jobs={jobs} onUpdateJob={handleUpdateJob} />
            } />
            <Route path="/calendar" element={
              <CalendarView logs={logs} settings={settings} jobs={jobs} />
            } />
            <Route path="/log" element={
              <WorkLogger 
                logs={logs} 
                jobs={jobs} 
                onAddLog={handleAddLog} 
                onDeleteLog={handleDeleteLog} 
                templates={templates}
                onUpdateTemplates={setTemplates}
              />
            } />
            <Route path="/verify" element={
              <PayslipVerifier logs={logs} settings={settings} jobs={jobs} onAddLog={handleAddLog} />
            } />
            <Route path="/settings" element={
              <div className="space-y-6">
                <Settings 
                    settings={settings} 
                    onUpdateSettings={setSettings} 
                    jobs={jobs}
                    onAddJob={handleAddJob}
                    onUpdateJob={handleUpdateJob}
                    onDeleteJob={handleDeleteJob}
                />
                <DataManagement appState={{ logs, settings, jobs, templates }} onImport={handleImport} onUpdateSettings={setSettings} />
                <div className="text-center text-xs text-gray-400 pt-10 pb-4 dark:text-gray-600">
                  PayLevel Up v2.1 • Dark Mode & Templates
                </div>
              </div>
            } />
            <Route path="/wrapped" element={
                <YearlyWrapUp logs={logs} settings={settings} jobs={jobs} />
            } />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const NavButton = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 w-16 h-16 md:w-12 md:h-12 ${
        isActive 
        ? 'text-primary bg-indigo-50 dark:bg-indigo-900/30' 
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-100 dark:hover:border-gray-700'
      }`
    }
  >
    {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 })}
    <span className="text-[10px] font-medium md:hidden">{label}</span>
  </NavLink>
);

export default App;
