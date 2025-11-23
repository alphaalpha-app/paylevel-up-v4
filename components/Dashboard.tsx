
import React, { useState, useMemo } from 'react';
import { WorkLog, UserSettings, Job } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Sparkles, TrendingUp, CalendarRange, Activity, Filter, ArrowUpCircle, Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
  onUpdateJob: (updatedJob: Job) => void;
}

type TrendMode = 'recent' | 'week' | 'biweek' | 'month' | 'history';

export const Dashboard: React.FC<DashboardProps> = ({ logs, settings, jobs, onUpdateJob }) => {
  // UI States
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [trendMode, setTrendMode] = useState<TrendMode>('recent');
  const [trendDate, setTrendDate] = useState(new Date().toISOString().slice(0, 10)); 
  const [trendMonth, setTrendMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedMonthStr, setSelectedMonthStr] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedBiWeekEndStr, setSelectedBiWeekEndStr] = useState(new Date().toISOString().slice(0, 10)); 

  // Detect latest year for Wrapped
  const latestDataYear = useMemo(() => {
      if (logs.length === 0) return new Date().getFullYear();
      const years = logs.map(l => new Date(l.date).getFullYear());
      return Math.max(...years);
  }, [logs]);

  // Filter logs based on selected Job
  const filteredLogs = useMemo(() => {
      if (selectedJobId === 'all') return logs;
      return logs.filter(l => l.jobId === selectedJobId);
  }, [logs, selectedJobId]);

  // Helper: Get rate for a specific log (looks up its job)
  const getLogEarnings = (log: WorkLog) => {
    const job = jobs.find(j => j.id === log.jobId);
    if (!job) return 0;
    const d = new Date(log.date);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? job.weekendHourlyRate : job.hourlyRate;
    return log.duration * rate;
  };

  const getLogNextEarnings = (log: WorkLog) => {
    const job = jobs.find(j => j.id === log.jobId);
    if (!job) return 0;
    const d = new Date(log.date);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    const rate = isWeekend ? job.nextWeekendHourlyRate : job.nextHourlyRate;
    return log.duration * rate;
  };
  
  const calculateTotalEarnings = (logsToCalc: WorkLog[]) => {
      return logsToCalc.reduce((sum, log) => sum + getLogEarnings(log), 0);
  };

  const calculateAfterTax = (gross: number) => {
      const tax = gross * ((settings.taxRate || 0) / 100);
      return gross - tax;
  };

  // 1. Basic Progress Stats (Only if single job selected, or aggregate hours?)
  // For 'All', we sum hours. Target is tricky for 'All', maybe show N/A or sum targets.
  const totalHours = filteredLogs.reduce((acc, log) => acc + log.duration, 0);
  
  let targetHours = 0;
  let progressPercent = 0;
  let canLevelUp = false;
  let activeJobForLevelUp: Job | undefined = undefined;

  if (selectedJobId !== 'all') {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) {
          targetHours = job.targetHours;
          progressPercent = Math.min(100, Math.max(0, (totalHours / targetHours) * 100));
          canLevelUp = totalHours >= targetHours && (job.hourlyRate < job.nextHourlyRate);
          activeJobForLevelUp = job;
      }
  }

  const handleLevelUp = () => {
    if (activeJobForLevelUp && window.confirm(`Congratulations!\n\nUpdate rates for ${activeJobForLevelUp.name}?`)) {
        onUpdateJob({
            ...activeJobForLevelUp,
            hourlyRate: activeJobForLevelUp.nextHourlyRate,
            weekendHourlyRate: activeJobForLevelUp.nextWeekendHourlyRate,
        });
    }
  };

  const potentialNextEarnings = filteredLogs.reduce((sum, log) => sum + getLogNextEarnings(log), 0);

  // 2. Chart Data Generation
  const chartData = useMemo(() => {
    const data = [];
    
    // ... (Date Logic same as before) ...
    let startDate = new Date();
    let daysCount = 7;
    // ... (Trend Mode Logic setup) ...
    if (trendMode === 'history') {
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLogs = filteredLogs.filter(l => l.date.startsWith(monthKey));
        const monthTotal = monthLogs.reduce((sum, l) => sum + l.duration, 0);
        data.push({ name: `${d.getMonth() + 1}月`, hours: monthTotal, fullDate: monthKey, isWeekend: false });
      }
      return data;
    }
    
    // Daily Logic Setup
    if (trendMode === 'recent') { startDate = new Date(); startDate.setDate(startDate.getDate() - 6); } 
    else if (trendMode === 'week') { 
        const target = new Date(trendDate); const day = target.getDay(); 
        const diff = target.getDate() - day + (day === 0 ? -6 : 1); startDate = new Date(target.setDate(diff)); 
    }
    else if (trendMode === 'biweek') { const end = new Date(trendDate); startDate = new Date(end.getTime() - (13 * 24 * 60 * 60 * 1000)); daysCount = 14; }
    else if (trendMode === 'month') { const [y, m] = trendMonth.split('-').map(Number); startDate = new Date(y, m - 1, 1); daysCount = new Date(y, m, 0).getDate(); }

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayLogs = filteredLogs.filter(l => l.date === dateStr);
      const dayTotal = dayLogs.reduce((sum, l) => sum + l.duration, 0);
      
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let name = trendMode === 'month' ? `${d.getDate()}` : d.toLocaleDateString('zh-HK', { weekday: 'short' });
      if (trendMode === 'biweek' && i % 7 === 0) name = `${d.getDate()}/${d.getMonth()+1} ${name}`;

      data.push({ name, hours: dayTotal, fullDate: dateStr, isWeekend });
    }
    return data;
  }, [filteredLogs, trendMode, trendDate, trendMonth]);

  // 3. Stats Calculations
  const calculateMonthlyStats = () => {
    const selectedLogs = filteredLogs.filter(l => l.date.startsWith(selectedMonthStr));
    const selectedHours = selectedLogs.reduce((sum, l) => sum + l.duration, 0);
    const selectedEarnings = calculateTotalEarnings(selectedLogs);
    
    const [y, m] = selectedMonthStr.split('-').map(Number);
    const prevMonthDate = new Date(y, m - 2, 1); 
    const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
    const prevLogs = filteredLogs.filter(l => l.date.startsWith(prevMonthStr));
    const prevHours = prevLogs.reduce((sum, l) => sum + l.duration, 0);

    return { selectedHours, selectedEarnings, selectedNet: calculateAfterTax(selectedEarnings), prevHours, prevMonthStr };
  };

  const { selectedHours: monthHours, selectedEarnings: monthEarnings, selectedNet: monthNet, prevHours: prevMonthHours, prevMonthStr } = calculateMonthlyStats();

  const calculateBiWeeklyStats = () => {
    const endDate = new Date(selectedBiWeekEndStr);
    const msPerDay = 24 * 60 * 60 * 1000;
    const startDateTimestamp = endDate.getTime() - (13 * msPerDay);
    const startDateStr = new Date(startDateTimestamp).toISOString().slice(0, 10);
    const prevEndTimestamp = endDate.getTime() - (14 * msPerDay);
    const prevStartDateStr = new Date(prevEndTimestamp - (13 * msPerDay)).toISOString().slice(0, 10);
    const prevEndDateStr = new Date(prevEndTimestamp).toISOString().slice(0, 10);

    const currentLogs = filteredLogs.filter(l => l.date >= startDateStr && l.date <= selectedBiWeekEndStr);
    const prevLogs = filteredLogs.filter(l => l.date >= prevStartDateStr && l.date <= prevEndDateStr);
    
    const currentPeriodHours = currentLogs.reduce((sum, l) => sum + l.duration, 0);
    const prevPeriodHours = prevLogs.reduce((sum, l) => sum + l.duration, 0);
    const currentPeriodEarnings = calculateTotalEarnings(currentLogs);

    return { currentPeriodHours, currentPeriodEarnings, currentPeriodNet: calculateAfterTax(currentPeriodEarnings), prevPeriodHours };
  };

  const { currentPeriodHours: biWeekHours, currentPeriodEarnings: biWeekEarnings, currentPeriodNet: biWeekNet, prevPeriodHours: prevBiWeekHours } = calculateBiWeeklyStats();

  const isMonthlyPrimary = settings.payFrequency === 'monthly';
  const trendDiff = biWeekHours - prevBiWeekHours;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Yearly Wrapped Banner - ONLY if there is data */}
      {logs.length > 0 && (
          <Link to="/wrapped" className="block bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-900 dark:to-indigo-900 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden group">
              <div className="relative z-10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
                        <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Your {latestDataYear} Wrapped is Ready</h3>
                        <p className="text-white/80 text-xs">Tap to view your year in review story</p>
                    </div>
                 </div>
                 <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                     <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                 </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-300 to-pink-500 opacity-50"></div>
          </Link>
      )}

      {/* Job Filter Header */}
      <div className="flex justify-end mb-2">
         <select 
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 focus:ring-primary focus:border-primary shadow-sm"
         >
             <option value="all">All Jobs (合併數據)</option>
             {jobs.map(j => (
                 <option key={j.id} value={j.id}>{j.name}</option>
             ))}
         </select>
      </div>

      {/* Level Up Banner (Only if single job selected) */}
      {canLevelUp && (
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-amber-500"><Trophy className="w-6 h-6" /></div>
                <div>
                    <h3 className="font-bold text-amber-800">目標達成！</h3>
                    <p className="text-xs text-amber-700">準備好升級 {activeJobForLevelUp?.name} 的薪資了嗎？</p>
                </div>
            </div>
            <button onClick={handleLevelUp} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5" /> 立即升級
            </button>
        </div>
      )}

      {/* Progress Bar (Only specific job) */}
      {selectedJobId !== 'all' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-end mb-2">
            <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">加薪目標進度 ({activeJobForLevelUp?.name})</h2>
                <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-primary">{totalHours.toFixed(1)}</span>
                <span className="text-gray-400 text-lg">/ {targetHours} 小時</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-full">{progressPercent.toFixed(1)}%</span>
            </div>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden w-full">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
      )}

      {/* Salary Cards (Calculated based on filtered logs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Card */}
        <div className={`bg-white p-4 rounded-xl border relative overflow-hidden group transition-all ${isMonthlyPrimary ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100' : 'border-gray-100 shadow-sm opacity-80'}`}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2 text-gray-500"><CalendarRange className="w-4 h-4" /><span className="text-xs font-medium">月薪預估</span></div>
            <input type="month" value={selectedMonthStr} onChange={(e) => setSelectedMonthStr(e.target.value)} className="text-xs font-medium bg-transparent border-none text-gray-600 text-right cursor-pointer p-0" />
          </div>
          <p className="text-2xl font-bold text-gray-800 relative z-10">{settings.currency} {monthEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          {(settings.taxRate || 0) > 0 && <p className="text-xs text-gray-400 mt-1 relative z-10">稅後約: <span className="font-semibold text-gray-600">{settings.currency} {monthNet.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></p>}
          <div className="mt-2 text-xs text-gray-500 flex justify-between items-end relative z-10 pt-2 border-t border-dashed border-gray-100">
             <span>{monthHours.toFixed(1)} hrs</span>
             <span className={`${monthHours >= prevMonthHours ? 'text-green-600' : 'text-gray-500'}`}>{monthHours >= prevMonthHours ? '+' : ''}{(monthHours - prevMonthHours).toFixed(1)} vs Last</span>
          </div>
        </div>

        {/* Bi-Weekly Card */}
        <div className={`bg-white p-4 rounded-xl border relative overflow-hidden transition-all ${!isMonthlyPrimary ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100' : 'border-gray-100 shadow-sm opacity-80'}`}>
           <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2 text-gray-500"><Activity className="w-4 h-4" /><span className="text-xs font-medium">兩週收入</span></div>
            <input type="date" value={selectedBiWeekEndStr} onChange={(e) => setSelectedBiWeekEndStr(e.target.value)} className="text-xs font-medium bg-transparent border-none text-gray-600 text-right cursor-pointer p-0 max-w-[85px]" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{settings.currency} {biWeekEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          {(settings.taxRate || 0) > 0 && <p className="text-xs text-gray-400 mt-1 relative z-10">稅後約: <span className="font-semibold text-gray-600">{settings.currency} {biWeekNet.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></p>}
          <div className="mt-2 text-xs text-gray-500 flex justify-between items-end relative z-10 pt-2 border-t border-dashed border-gray-100">
             <span>{biWeekHours.toFixed(1)} hrs</span>
             <span className="font-mono">{trendDiff > 0 ? '+' : ''}{trendDiff.toFixed(1)} trend</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-700 font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> 工時趨勢</h3>
            <select value={trendMode} onChange={(e) => setTrendMode(e.target.value as TrendMode)} className="bg-gray-50 border-none text-xs rounded-md">
                <option value="recent">最近 7 天</option>
                <option value="week">指定單週</option>
                <option value="biweek">指定兩週</option>
                <option value="month">指定月份</option>
                <option value="history">半年趨勢</option>
            </select>
         </div>
         {/* ... Inputs for trendDate/Month ... */}
         {(trendMode === 'week' || trendMode === 'biweek') && <input type="date" value={trendDate} onChange={(e) => setTrendDate(e.target.value)} className="mb-4 text-xs border rounded p-1"/>}
         {trendMode === 'month' && <input type="month" value={trendMonth} onChange={(e) => setTrendMonth(e.target.value)} className="mb-4 text-xs border rounded p-1"/>}

         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} dy={10} minTickGap={5} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hours > 0 ? (entry.isWeekend ? '#10B981' : '#4F46E5') : '#E5E7EB'} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

       {/* Potential Earnings (Simplified for All Jobs, detailed for Single) */}
       <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-sm"><Sparkles className="w-5 h-5 text-emerald-500" /></div>
            <div>
               <p className="text-xs text-emerald-600 font-medium">升職後潛在價值 ({selectedJobId === 'all' ? '所有工作加總' : activeJobForLevelUp?.name})</p>
               <p className="text-lg font-bold text-emerald-700">{settings.currency} {potentialNextEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
         </div>
       </div>
    </div>
  );
};
