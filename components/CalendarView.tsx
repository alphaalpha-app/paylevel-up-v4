
import React, { useState, useMemo } from 'react';
import { WorkLog, UserSettings, Job } from '../types';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Briefcase } from 'lucide-react';

interface CalendarViewProps {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ logs, settings, jobs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  
  // Selection State
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: Get hourly rate for a specific log's job and date
  const getLogValue = (log: WorkLog) => {
    const job = jobs.find(j => j.id === log.jobId);
    if (!job) return 0;
    const d = new Date(log.date);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    return log.duration * (isWeekend ? job.weekendHourlyRate : job.hourlyRate);
  };

  // Filter logs first
  const filteredLogs = useMemo(() => {
      if (selectedJobId === 'all') return logs;
      return logs.filter(l => l.jobId === selectedJobId);
  }, [logs, selectedJobId]);

  // 1. Generate Calendar Grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; 

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push({ day: null, fullDate: '' });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, fullDate: dateStr });
    }
    return days;
  }, [year, month]);

  // 2. Aggregate Log Data per Date
  const dailyStats = useMemo(() => {
    const stats: Record<string, { hours: number; earnings: number; count: number }> = {};
    
    filteredLogs.forEach(log => {
      if (!stats[log.date]) {
        stats[log.date] = { hours: 0, earnings: 0, count: 0 };
      }
      stats[log.date].hours += log.duration;
      stats[log.date].earnings += getLogValue(log);
      stats[log.date].count += 1;
    });

    return stats;
  }, [filteredLogs, jobs]);

  // 3. Selection Logic
  const handleDateClick = (dateStr: string) => {
    if (!selectStart || (selectStart && selectEnd)) {
      setSelectStart(dateStr);
      setSelectEnd(null);
    } else {
      if (dateStr < selectStart) {
        setSelectEnd(selectStart);
        setSelectStart(dateStr);
      } else {
        setSelectEnd(dateStr);
      }
    }
  };

  const isSelected = (dateStr: string) => {
    if (!selectStart) return false;
    if (selectStart && !selectEnd) return dateStr === selectStart;
    return dateStr >= selectStart && dateStr <= selectEnd!;
  };

  // 4. Calculate Selected Range Stats
  const selectedStats = useMemo(() => {
    if (!selectStart) return null;
    const rangeStart = selectStart;
    const rangeEnd = selectEnd || selectStart;
    const rangeLogs = filteredLogs.filter(l => l.date >= rangeStart && l.date <= rangeEnd);
    
    let totalHours = 0;
    let totalEarnings = 0;

    rangeLogs.forEach(l => {
        totalHours += l.duration;
        totalEarnings += getLogValue(l);
    });

    return { totalHours, totalEarnings };
  }, [selectStart, selectEnd, filteredLogs, jobs]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => setCurrentDate(new Date(parseInt(e.target.value), month, 1));

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div className="animate-fade-in relative pb-20">
      
      {/* Header with Filters */}
      <div className="bg-white p-4 rounded-t-2xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-1">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-bold text-gray-800">{currentDate.toLocaleDateString('en-US', { month: 'short' })}</h2>
                    <select 
                        value={year} 
                        onChange={handleYearChange} 
                        className="bg-transparent text-sm font-medium text-gray-600 border-none p-0 focus:ring-0 cursor-pointer hover:text-indigo-600"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="relative">
                <select 
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="appearance-none bg-indigo-50 border-none text-indigo-700 text-xs font-bold rounded-lg py-1.5 pl-3 pr-8"
                >
                    <option value="all">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
                <Briefcase className="w-3 h-3 text-indigo-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 p-2">
        <div className="grid grid-cols-7 mb-2 border-b border-gray-100 pb-2">
            {weekDays.map((day, idx) => (
                <div key={day} className={`text-center text-[10px] font-bold ${idx >= 5 ? 'text-red-400' : 'text-gray-400'}`}>{day}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[minmax(60px,auto)]">
            {calendarDays.map((item, idx) => {
                if (!item.day) return <div key={`empty-${idx}`} className="bg-gray-50/30"></div>;
                
                const stats = dailyStats[item.fullDate];
                const selected = isSelected(item.fullDate);
                const isToday = item.fullDate === new Date().toISOString().slice(0, 10);
                const isWeekend = new Date(item.fullDate).getDay() % 6 === 0;

                return (
                    <div 
                        key={item.fullDate}
                        onClick={() => handleDateClick(item.fullDate)}
                        className={`relative border border-gray-50 p-1 cursor-pointer select-none flex flex-col justify-between ${selected ? 'bg-indigo-100/50' : 'hover:bg-gray-50'}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-xs font-medium ${isToday ? 'bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full' : (isWeekend ? 'text-red-400' : 'text-gray-700')}`}>
                                {item.day}
                            </span>
                        </div>
                        {stats && (
                            <div className="text-right mt-1">
                                <div className="text-[10px] font-bold text-red-500/80">{stats.earnings.toFixed(0)}</div>
                                <div className="text-[9px] text-gray-400 hidden sm:block">{stats.hours}h</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
      
      {/* Floating Summary */}
      {selectedStats && selectStart && (
        <div className="fixed bottom-24 left-6 right-6 md:left-auto md:right-10 md:w-80 bg-white/95 backdrop-blur-sm border border-indigo-100 shadow-xl rounded-2xl p-4 z-30 animate-slide-up">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> 範圍</span>
                <button onClick={() => { setSelectStart(null); setSelectEnd(null); }}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="text-xs text-indigo-600 mb-3 font-medium text-center">{selectStart} 至 {selectEnd || selectStart}</div>
            <div className="flex items-center justify-between gap-4">
                 <div className="bg-gray-50 p-2 rounded-lg flex-1 text-center"><div className="text-[10px] text-gray-500">總工時</div><div className="font-bold text-gray-800">{selectedStats.totalHours.toFixed(2)}</div></div>
                 <div className="bg-indigo-50 p-2 rounded-lg flex-1 text-center"><div className="text-[10px] text-indigo-500">總收入</div><div className="font-bold text-indigo-700">{settings.currency} {selectedStats.totalEarnings.toLocaleString()}</div></div>
            </div>
        </div>
      )}
    </div>
  );
};
