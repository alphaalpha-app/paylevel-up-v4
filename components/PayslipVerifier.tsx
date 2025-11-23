
import React, { useState, useMemo, useEffect } from 'react';
import { WorkLog, UserSettings, Job } from '../types';
import { FileCheck, Calendar, Calculator, AlertTriangle, CheckCircle, PlusCircle, MinusCircle, Percent, Briefcase } from 'lucide-react';

interface PayslipVerifierProps {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
  onAddLog: (log: WorkLog) => void;
}

export const PayslipVerifier: React.FC<PayslipVerifierProps> = ({ logs, settings, jobs, onAddLog }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodLength, setPeriodLength] = useState<'14' | '30'>('14'); 
  const [slipWeekdayHours, setSlipWeekdayHours] = useState<string>('0');
  const [slipWeekendHours, setSlipWeekendHours] = useState<string>('0');
  const [slipAllowances, setSlipAllowances] = useState<string>('0');
  const [slipTaxRate, setSlipTaxRate] = useState<string>(settings.taxRate?.toString() || '0');

  useEffect(() => {
    if (jobs.length > 0 && !jobs.find(j => j.id === selectedJobId)) {
        setSelectedJobId(jobs[0].id);
    }
  }, [jobs]);

  const activeJob = jobs.find(j => j.id === selectedJobId);

  // Calculate App Data
  const appStats = useMemo(() => {
    if (!activeJob) return null;
    const end = new Date(endDate);
    const days = parseInt(periodLength);
    const startTimestamp = end.getTime() - ((days - 1) * 24 * 60 * 60 * 1000);
    const start = new Date(startTimestamp);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = endDate;

    const periodLogs = logs.filter(l => l.date >= startStr && l.date <= endStr && l.jobId === activeJob.id);

    let weekdayHours = 0;
    let weekendHours = 0;

    periodLogs.forEach(log => {
      const d = new Date(log.date);
      const day = d.getDay();
      if (day === 0 || day === 6) weekendHours += log.duration;
      else weekdayHours += log.duration;
    });

    return {
      startStr,
      endStr,
      weekdayHours,
      weekendHours,
      estimatedBasePay: (weekdayHours * activeJob.hourlyRate) + (weekendHours * activeJob.weekendHourlyRate)
    };
  }, [logs, endDate, periodLength, selectedJobId, activeJob]);

  // Calculations
  const inputWeekday = parseFloat(slipWeekdayHours) || 0;
  const inputWeekend = parseFloat(slipWeekendHours) || 0;
  const inputAllowance = parseFloat(slipAllowances) || 0;
  const inputTaxRate = parseFloat(slipTaxRate) || 0;

  if (!appStats || !activeJob) return <div>Please add a job first.</div>;

  const appTotalGross = appStats.estimatedBasePay + inputAllowance;
  const appNetPay = appTotalGross * (1 - inputTaxRate/100);

  const slipTotalGross = (inputWeekday * activeJob.hourlyRate) + (inputWeekend * activeJob.weekendHourlyRate) + inputAllowance;
  const slipNetPay = slipTotalGross * (1 - inputTaxRate/100);

  const diffWeekday = inputWeekday - appStats.weekdayHours;
  const diffWeekend = inputWeekend - appStats.weekendHours;
  const diffPay = slipTotalGross - appTotalGross;

  const handleAutoFill = (type: 'weekday' | 'weekend') => {
    const diff = type === 'weekday' ? diffWeekday : diffWeekend;
    if (Math.abs(diff) <= 0) return;

    const newLog: WorkLog = {
        id: crypto.randomUUID(),
        jobId: selectedJobId,
        date: endDate,
        startTime: '-',
        endTime: '-',
        duration: parseFloat(diff.toFixed(2)),
        notes: `Payslip ${diff > 0 ? 'Backfill' : 'Correction'} (${type})`,
        timestamp: Date.now()
    };
    onAddLog(newLog);
  };

  const DiffRow = ({ type, diff, appVal, slipVal }: any) => {
    const isOver = diff < -0.1; 
    const isUnder = diff > 0.1;
    const isOk = !isOver && !isUnder;
    return (
        <div className={`p-3 rounded-lg border flex items-center justify-between ${isOk ? 'bg-green-50 border-green-100' : (isUnder ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100')}`}>
            <div className="text-xs">
                <div className="font-bold text-gray-700">{type === 'weekday' ? '平日' : '週末'}差異</div>
                <div className="text-gray-500">App:{appVal.toFixed(2)} / Slip:{slipVal.toFixed(2)}</div>
            </div>
            <div className="flex gap-2 items-center">
                <span className="font-bold text-gray-700">{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                {isUnder && <button onClick={() => handleAutoFill(type)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"><PlusCircle className="w-3 h-3" /> 補錄</button>}
                {isOver && <button onClick={() => handleAutoFill(type)} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded"><MinusCircle className="w-3 h-3" /> 修正</button>}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> 薪資單核對</h2>
        
        {/* Job Selector */}
        <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 mb-1">選擇核對的工作</label>
            <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full bg-indigo-50 border-none text-indigo-900 rounded-lg p-2 font-bold">
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
        </div>

        {/* Inputs */}
        <div className="bg-gray-50 p-4 rounded-xl mb-6 grid grid-cols-2 gap-4">
             <div><label className="text-xs text-gray-500 block">週期結束日</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-xs rounded border-gray-300"/></div>
             <div><label className="text-xs text-gray-500 block">週期長度</label><select value={periodLength} onChange={(e) => setPeriodLength(e.target.value as any)} className="w-full text-xs rounded border-gray-300"><option value="14">14 天</option><option value="30">30 天</option></select></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> App 紀錄 ({activeJob.name})</h3>
                <div className="p-4 bg-indigo-50 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span>平日</span><span className="font-bold">{appStats.weekdayHours.toFixed(2)}h</span></div>
                    <div className="flex justify-between"><span>週末</span><span className="font-bold">{appStats.weekendHours.toFixed(2)}h</span></div>
                    <div className="flex justify-between border-t border-indigo-200 pt-2 font-bold text-indigo-700"><span>預估實領 (Net)</span><span>{settings.currency} {appNetPay.toLocaleString()}</span></div>
                </div>
            </div>

            <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Calculator className="w-4 h-4" /> Payslip 數據</h3>
                 <div className="p-4 bg-white border rounded-xl space-y-2">
                    <div className="flex justify-between items-center"><label className="text-xs">平日時數</label><input type="number" value={slipWeekdayHours} onChange={(e) => setSlipWeekdayHours(e.target.value)} className="w-20 text-xs border rounded p-1 text-right"/></div>
                    <div className="flex justify-between items-center"><label className="text-xs">週末時數</label><input type="number" value={slipWeekendHours} onChange={(e) => setSlipWeekendHours(e.target.value)} className="w-20 text-xs border rounded p-1 text-right"/></div>
                    <div className="flex justify-between items-center"><label className="text-xs">津貼 ($)</label><input type="number" value={slipAllowances} onChange={(e) => setSlipAllowances(e.target.value)} className="w-20 text-xs border rounded p-1 text-right"/></div>
                    <div className="flex justify-between items-center"><label className="text-xs">稅率 (%)</label><input type="number" value={slipTaxRate} onChange={(e) => setSlipTaxRate(e.target.value)} className="w-20 text-xs border rounded p-1 text-right"/></div>
                    <div className="flex justify-between border-t pt-2 font-bold text-gray-800 text-sm"><span>Payslip Net</span><span>{settings.currency} {slipNetPay.toLocaleString()}</span></div>
                 </div>
            </div>
        </div>

        <div className="mt-6 border-t pt-4 space-y-3">
             <DiffRow type="weekday" diff={diffWeekday} appVal={appStats.weekdayHours} slipVal={inputWeekday} />
             <DiffRow type="weekend" diff={diffWeekend} appVal={appStats.weekendHours} slipVal={inputWeekend} />
             <div className={`text-right font-bold text-lg ${diffPay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                差異: {settings.currency} {Math.abs(diffPay).toLocaleString()} ({diffPay > 0 ? '少算' : '多算'})
             </div>
        </div>
      </div>
    </div>
  );
};
