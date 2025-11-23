
import React, { useState, useEffect } from 'react';
import { UserSettings, Job, DEFAULT_JOB } from '../types';
import { Briefcase, Calculator, Edit3, Plus, Trash2, Palette, Moon, Sun, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
}

// Data from PDF: State Swim Casual Pay Rates 2025-26 (Same constant data)
const PAY_RATES: Record<string, any> = {
  'Instructor / Coach': {
    levels: ['Level 2', 'Level 3', 'Level 3A', 'Level 4', 'Level 4A'],
    rates: {
      'Level 2': { '17yrs': [20.88, 21.69], '18yrs': [23.99, 24.92], '19yrs': [27.11, 28.17], '20yrs +': [31.79, 33.04] },
      'Level 3': { '17yrs': [22.30, 23.17], '18yrs': [25.64, 26.64], '19yrs': [28.98, 30.11], '20yrs +': [33.98, 35.31] },
      'Level 3A': { '17yrs': [23.45, 24.36], '18yrs': [26.96, 28.02], '19yrs': [30.48, 31.67], '20yrs +': [35.75, 37.16] },
      'Level 4': { '17yrs': [24.39, 25.34], '18yrs': [28.04, 29.14], '19yrs': [31.70, 32.94], '20yrs +': [37.19, 38.65] },
      'Level 4A': { '17yrs': [25.53, 26.52], '18yrs': [29.36, 30.51], '19yrs': [33.20, 34.50], '20yrs +': [38.95, 40.48] },
    }
  },
  'Supervisor': {
    levels: ['Level 5'],
    rates: {
      'Level 5': { '17yrs': [26.88, 27.93], '18yrs': [30.93, 32.14], '19yrs': [34.96, 36.34], '20yrs +': [41.03, 42.64] }
    }
  },
  'Customer Service Officer': {
    levels: ['Level 3', 'Level 3A'],
    rates: {
      'Level 3': { '17yrs': [22.30, 23.17], '18yrs': [25.64, 26.64], '19yrs': [28.98, 30.11], '20yrs +': [33.98, 35.31] },
      'Level 3A': { '17yrs': [23.45, 24.36], '18yrs': [26.96, 28.02], '19yrs': [30.48, 31.67], '20yrs +': [35.75, 37.16] }
    }
  },
  'Cleaner': {
    levels: ['Level 3'],
    rates: {
      'Level 3': { '17yrs': [22.30, 23.17], '18yrs': [25.64, 26.64], '19yrs': [28.98, 30.11], '20yrs +': [33.98, 35.31] }
    }
  }
};

const LEVEL_TARGETS: Record<string, number> = {
  'Level 2': 350,
  'Level 3': 700,
  'Level 3A': 700, 
};

const ROLES = Object.keys(PAY_RATES);
const AGES = ['17yrs', '18yrs', '19yrs', '20yrs +'];

const COLORS = ['#4F46E5', '#DB2777', '#059669', '#D97706', '#7C3AED', '#2563EB'];

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, jobs, onAddJob, onUpdateJob, onDeleteJob }) => {
  // UI State
  const [activeJobId, setActiveJobId] = useState<string>(jobs[0]?.id || '');
  
  // Pay Scale Assistant State
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('20yrs +');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  
  const [previewData, setPreviewData] = useState<{
    regular: number; 
    weekend: number; 
    target?: number;
    nextRegular?: number;
    nextWeekend?: number;
    nextLevelName?: string;
  } | null>(null);
  
  const [justApplied, setJustApplied] = useState(false);

  useEffect(() => {
    if (jobs.length > 0 && !jobs.find(j => j.id === activeJobId)) {
        setActiveJobId(jobs[0].id);
    }
  }, [jobs, activeJobId]);

  const activeJob = jobs.find(j => j.id === activeJobId) || jobs[0];

  // Auto-update levels when role changes
  useEffect(() => {
    if (selectedRole && PAY_RATES[selectedRole]) {
      setSelectedLevel(PAY_RATES[selectedRole].levels[0]);
    }
  }, [selectedRole]);

  // Calculate preview rates
  useEffect(() => {
    if (selectedRole && selectedAge && selectedLevel) {
      const roleData = PAY_RATES[selectedRole];
      const rateData = roleData.rates[selectedLevel]?.[selectedAge];
      
      if (rateData) {
        const regular = rateData[0];
        const weekend = rateData[1];
        let target = selectedRole === 'Instructor / Coach' ? LEVEL_TARGETS[selectedLevel] : undefined;
        let nextRegular = undefined;
        let nextWeekend = undefined;
        let nextLevelName = undefined;

        const levelList = roleData.levels;
        const currentIdx = levelList.indexOf(selectedLevel);
        
        if (currentIdx !== -1 && currentIdx < levelList.length - 1) {
            const nextLvl = levelList[currentIdx + 1];
            const nextRates = roleData.rates[nextLvl]?.[selectedAge];
            if (nextRates) {
                nextLevelName = nextLvl;
                nextRegular = nextRates[0];
                nextWeekend = nextRates[1];
            }
        }

        setPreviewData({ regular, weekend, target, nextRegular, nextWeekend, nextLevelName });
        setJustApplied(false);
      } else {
        setPreviewData(null);
      }
    }
  }, [selectedRole, selectedAge, selectedLevel]);

  const handleApplyRates = () => {
    if (previewData && activeJob) {
      const updatedJob = {
        ...activeJob,
        name: `${selectedRole} - ${selectedLevel}`, // Auto update name for convenience
        hourlyRate: previewData.regular,
        weekendHourlyRate: previewData.weekend,
        targetHours: previewData.target || activeJob.targetHours,
        nextHourlyRate: previewData.nextRegular || activeJob.nextHourlyRate,
        nextWeekendHourlyRate: previewData.nextWeekend || activeJob.nextWeekendHourlyRate
      };
      
      onUpdateJob(updatedJob);
      setJustApplied(true);
      setTimeout(() => setJustApplied(false), 3000);
    }
  };

  const handleJobChange = (field: keyof Job, value: any) => {
      if (!activeJob) return;
      onUpdateJob({ ...activeJob, [field]: value });
  };
  
  const handleAddNewJob = () => {
      const newJob: Job = {
          ...DEFAULT_JOB,
          id: crypto.randomUUID(),
          name: `Job ${jobs.length + 1}`,
          color: COLORS[jobs.length % COLORS.length]
      };
      onAddJob(newJob);
      setActiveJobId(newJob.id);
  };

  const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdateSettings({
      ...settings,
      [name]: name === 'currency' || name === 'userName' || name === 'payFrequency' ? value : Number(value)
    });
  };

  const toggleTheme = () => {
      onUpdateSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  if (!activeJob) return <div>Loading...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in transition-colors">
       
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              工作管理 & 系統設定
          </h2>
          <div className="flex gap-2">
            <Link to="/wrapped" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all text-xs font-bold" title="Yearly Wrap-up">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Yearly Wrapped</span>
            </Link>
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                {settings.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
       </div>

       {/* Job Selector / Tabs */}
       <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
           {jobs.map(job => (
               <button
                  key={job.id}
                  onClick={() => setActiveJobId(job.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                      activeJobId === job.id 
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
               >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }}></div>
                  {job.name}
               </button>
           ))}
           <button 
              onClick={handleAddNewJob}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
           >
              <Plus className="w-3 h-3" /> 新增工作
           </button>
       </div>
       
       {/* Section 1: Pay Scale Assistant */}
       <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 mb-8 border border-indigo-100 dark:border-indigo-800 relative overflow-hidden">
         <div className="relative z-10">
            <h3 className="text-indigo-900 dark:text-indigo-200 font-medium flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                薪資小幫手 (查詢官方標準)
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4 opacity-80">
                將標準費率套用到： <span className="font-bold underline">{activeJob.name}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Selectors */}
                <div>
                    <label className="block text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">職位 (Role)</label>
                    <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 border-0 ring-1 ring-indigo-200 dark:ring-indigo-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2"
                    >
                        <option value="">-- 選擇 --</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">年齡 (Age)</label>
                    <select 
                        value={selectedAge}
                        onChange={(e) => setSelectedAge(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 border-0 ring-1 ring-indigo-200 dark:ring-indigo-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2"
                    >
                        {AGES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">目前級別 (Level)</label>
                    <select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        disabled={!selectedRole}
                        className="w-full bg-white dark:bg-gray-700 border-0 ring-1 ring-indigo-200 dark:ring-indigo-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block p-2 disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-400"
                    >
                        {!selectedRole ? <option>-- 先選職位 --</option> : 
                            PAY_RATES[selectedRole].levels.map((l: string) => <option key={l} value={l}>{l}</option>)
                        }
                    </select>
                </div>
            </div>

            {/* Preview and Action */}
            {previewData && (
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800 pb-2">
                            <div className="text-xs text-indigo-800 dark:text-indigo-200">
                                <span className="font-bold text-indigo-600 dark:text-indigo-300">Level:</span>
                                <span className="mx-1">Wkdy ${previewData.regular}</span>
                                <span>Wknd ${previewData.weekend}</span>
                            </div>
                            <button 
                                onClick={handleApplyRates}
                                disabled={justApplied}
                                className={`flex items-center justify-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    justApplied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                {justApplied ? '已套用' : '套用設定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
         </div>
       </div>

       {/* Job Specific Settings */}
       <div className="space-y-6 border-b border-gray-100 dark:border-gray-700 pb-8 mb-8">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    工作詳情設定 ({activeJob.name})
                </h3>
            </div>
            {jobs.length > 1 && (
                <button 
                    onClick={() => onDeleteJob(activeJob.id)}
                    className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" /> 刪除此工作
                </button>
            )}
         </div>

         {/* Job Name & Color */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">工作名稱</label>
                <input 
                    type="text" 
                    value={activeJob.name}
                    onChange={(e) => handleJobChange('name', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary focus:border-primary block p-3"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Palette className="w-3 h-3" /> 代表顏色
                </label>
                <div className="flex gap-2">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => handleJobChange('color', c)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activeJob.color === c ? 'border-gray-600 dark:border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
         </div>
         
         {/* Rates */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">平日時薪 (Mon-Fri)</label>
                <input 
                    type="number" 
                    step="0.01"
                    value={activeJob.hourlyRate}
                    onChange={(e) => handleJobChange('hourlyRate', Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold rounded-lg p-2"
                />
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">週末時薪 (Sat-Sun)</label>
                <input 
                    type="number" 
                    step="0.01"
                    value={activeJob.weekendHourlyRate}
                    onChange={(e) => handleJobChange('weekendHourlyRate', Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold rounded-lg p-2"
                />
            </div>
         </div>
         
         {/* Target & Next Level */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">目標加薪時數</label>
                 <input 
                    type="number"
                    value={activeJob.targetHours}
                    onChange={(e) => handleJobChange('targetHours', Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white"
                 />
             </div>
             <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">下級平日時薪</label>
                 <input 
                    type="number"
                    step="0.01"
                    value={activeJob.nextHourlyRate}
                    onChange={(e) => handleJobChange('nextHourlyRate', Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white"
                 />
             </div>
             <div>
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">下級週末時薪</label>
                 <input 
                    type="number"
                    step="0.01"
                    value={activeJob.nextWeekendHourlyRate}
                    onChange={(e) => handleJobChange('nextWeekendHourlyRate', Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white"
                 />
             </div>
         </div>
       </div>
         
       {/* Global Settings */}
       <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">全域設定 (Global)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">用戶名稱</label>
                    <input 
                        type="text" 
                        name="userName"
                        value={settings.userName}
                        onChange={handleGlobalChange}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-3"
                    />
                </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">貨幣單位</label>
                    <select 
                        name="currency"
                        value={settings.currency}
                        onChange={handleGlobalChange}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-3"
                    >
                        <option value="HKD">HKD ($)</option>
                        <option value="USD">USD ($)</option>
                        <option value="AUD">AUD ($)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">發薪頻率</label>
                    <select 
                        name="payFrequency"
                        value={settings.payFrequency || 'biweekly'}
                        onChange={handleGlobalChange}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-3"
                    >
                        <option value="biweekly">每兩週 (Bi-Weekly)</option>
                        <option value="monthly">每月 (Monthly)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">預計稅率 (%)</label>
                    <input 
                        type="number" 
                        name="taxRate"
                        value={settings.taxRate}
                        onChange={handleGlobalChange}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-3"
                    />
                </div>
            </div>
       </div>
    </div>
  );
};
