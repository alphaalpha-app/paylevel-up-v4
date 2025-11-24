
import React, { useState, useMemo, useEffect } from 'react';
import { WorkLog, UserSettings, Job } from '../types';
import { FileCheck, Calendar, Calculator, AlertTriangle, CheckCircle, PlusCircle, MinusCircle, Percent, Briefcase, Trash2, Plus, Save, Tag } from 'lucide-react';

interface PayslipVerifierProps {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
  onAddLog: (log: WorkLog) => void;
  activeJobId: string;
  onJobChange: (id: string) => void;
}

interface AdjustmentItem {
  id: string;
  category: string; // New: Type of adjustment
  name: string;
  hours: string;
  rate: string;
  amount: string;
}

const ADJUSTMENT_TYPES = [
    { label: '一般調整 (General)', value: 'General' },
    { label: '膳食津貼/補償 (Meal Break)', value: 'Meal Break' },
    { label: '加班 - 前段 (Overtime 1)', value: 'Overtime 1' },
    { label: '加班 - 後段 (Overtime 2)', value: 'Overtime 2' },
    { label: '獎金/津貼 (Allowance)', value: 'Allowance' },
    { label: '扣除 (Deduction)', value: 'Deduction' }
];

export const PayslipVerifier: React.FC<PayslipVerifierProps> = ({ logs, settings, jobs, onAddLog, activeJobId, onJobChange }) => {
  // Determine which job to use. If 'all' is selected, default to first job for calculation context or force selection.
  const effectiveJobId = activeJobId === 'all' ? (jobs[0]?.id || '') : activeJobId;
  const activeJob = jobs.find(j => j.id === effectiveJobId);

  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodLength, setPeriodLength] = useState<'14' | '30'>('14'); 
  const [slipWeekdayHours, setSlipWeekdayHours] = useState<string>('0');
  const [slipWeekendHours, setSlipWeekendHours] = useState<string>('0');
  const [slipAllowances, setSlipAllowances] = useState<string>('0');
  const [slipTaxRate, setSlipTaxRate] = useState<string>(settings.taxRate?.toString() || '0');

  // Dynamic Adjustments (Other Items)
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);

  const addAdjustment = (category = 'General', name = '') => {
      setAdjustments([...adjustments, { 
          id: crypto.randomUUID(), 
          category, 
          name: name || '', 
          hours: '', 
          rate: '', 
          amount: '' 
      }]);
  };
  
  const removeAdjustment = (id: string) => {
      setAdjustments(adjustments.filter(a => a.id !== id));
  };

  const updateAdjustment = (id: string, field: keyof AdjustmentItem, value: string) => {
      setAdjustments(prev => prev.map(a => {
          if (a.id !== id) return a;
          const updated = { ...a, [field]: value };
          
          // Auto-calculate Amount if Hours and Rate are present and changed
          if ((field === 'hours' || field === 'rate') && updated.hours && updated.rate) {
              const h = parseFloat(updated.hours);
              const r = parseFloat(updated.rate);
              if (!isNaN(h) && !isNaN(r)) {
                  updated.amount = (h * r).toFixed(2);
              }
          }
          return updated;
      }));
  };

  const handleAddToLog = (adj: AdjustmentItem) => {
    if (!adj.hours || parseFloat(adj.hours) <= 0) {
        alert("請輸入有效的時數 (Hours)");
        return;
    }
    // Construct a meaningful note
    const typeLabel = ADJUSTMENT_TYPES.find(t => t.value === adj.category)?.label.split('(')[0] || adj.category;
    const noteText = `[${typeLabel.trim()}] ${adj.name}`;

    if (window.confirm(`確定將 "${noteText}" 的 ${adj.hours} 小時加入工時紀錄嗎？\n這將累積到您的加薪進度中。`)) {
        onAddLog({
            id: crypto.randomUUID(),
            jobId: effectiveJobId,
            date: endDate, // Use period end date
            startTime: '-',
            endTime: '-',
            duration: parseFloat(adj.hours),
            notes: noteText,
            timestamp: Date.now()
        });
    }
  };

  const totalAdjustments = adjustments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

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
  }, [logs, endDate, periodLength, effectiveJobId, activeJob]);

  // Calculations
  const inputWeekday = parseFloat(slipWeekdayHours) || 0;
  const inputWeekend = parseFloat(slipWeekendHours) || 0;
  const inputAllowance = parseFloat(slipAllowances) || 0;
  const inputTaxRate = parseFloat(slipTaxRate) || 0;

  if (!appStats || !activeJob) return <div>Please add a job first.</div>;

  const appTotalGross = appStats.estimatedBasePay + inputAllowance; 
  const appNetPay = appTotalGross * (1 - inputTaxRate/100);

  const slipTotalGross = (inputWeekday * activeJob.hourlyRate) + (inputWeekend * activeJob.weekendHourlyRate) + inputAllowance + totalAdjustments;
  const slipNetPay = slipTotalGross * (1 - inputTaxRate/100);

  const diffWeekday = inputWeekday - appStats.weekdayHours;
  const diffWeekend = inputWeekend - appStats.weekendHours;
  const diffPay = slipTotalGross - appTotalGross;

  const handleAutoFill = (type: 'weekday' | 'weekend') => {
    const diff = type === 'weekday' ? diffWeekday : diffWeekend;
    if (Math.abs(diff) <= 0) return;

    const newLog: WorkLog = {
        id: crypto.randomUUID(),
        jobId: effectiveJobId,
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
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> 薪資單核對</h2>
        
        {/* Job Selector */}
        <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 mb-1">選擇核對的工作</label>
            <select value={effectiveJobId} onChange={(e) => onJobChange(e.target.value)} className="w-full bg-indigo-50 border-none text-indigo-900 rounded-lg p-2 font-bold focus:ring-2 focus:ring-indigo-500">
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
            {activeJobId === 'all' && <p className="text-[10px] text-gray-400 mt-1">* "所有工作"模式下默認顯示第一份工作</p>}
        </div>

        {/* Inputs */}
        <div className="bg-gray-50 p-4 rounded-xl mb-6 grid grid-cols-2 gap-4">
             <div><label className="text-xs text-gray-500 block">週期結束日</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-xs rounded border-gray-300"/></div>
             <div><label className="text-xs text-gray-500 block">週期長度</label><select value={periodLength} onChange={(e) => setPeriodLength(e.target.value as any)} className="w-full text-xs rounded border-gray-300"><option value="14">14 天</option><option value="30">30 天</option></select></div>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
             {/* Payslip Data Entry */}
            <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Calculator className="w-4 h-4" /> Payslip 數據輸入</h3>
                 <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 divide-x border-b bg-gray-50">
                        <div className="p-3">
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">平日時數 (Weekday)</label>
                            <input type="number" value={slipWeekdayHours} onChange={(e) => setSlipWeekdayHours(e.target.value)} className="w-full text-sm font-bold border-gray-200 rounded p-1 text-right"/>
                        </div>
                        <div className="p-3">
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">週末時數 (Weekend)</label>
                            <input type="number" value={slipWeekendHours} onChange={(e) => setSlipWeekendHours(e.target.value)} className="w-full text-sm font-bold border-gray-200 rounded p-1 text-right"/>
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-gray-600">基本津貼 (Allowances)</label>
                            <input type="number" placeholder="0" value={slipAllowances} onChange={(e) => setSlipAllowances(e.target.value)} className="w-24 text-xs border border-gray-300 rounded p-1 text-right"/>
                        </div>
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-gray-600">預扣稅率 (Tax %)</label>
                            <input type="number" placeholder="0" value={slipTaxRate} onChange={(e) => setSlipTaxRate(e.target.value)} className="w-24 text-xs border border-gray-300 rounded p-1 text-right"/>
                        </div>
                    </div>

                    {/* Dynamic Adjustments Section */}
                    <div className="border-t bg-gray-50/50">
                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-500">其他調整 / 加班 (Adjustments/OT)</label>
                                <button onClick={() => addAdjustment()} className="text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                    <Plus className="w-3 h-3"/> 自訂
                                </button>
                            </div>
                            
                            {/* Quick Add Buttons */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <button onClick={() => addAdjustment('Meal Break', 'Delayed Meal Brk')} className="flex-shrink-0 text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-1 rounded-lg hover:bg-orange-100">
                                    + 膳食補償 (Meal)
                                </button>
                                <button onClick={() => addAdjustment('Overtime 1', 'OT First 2 Hrs')} className="flex-shrink-0 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg hover:bg-blue-100">
                                    + 加班 (OT 1)
                                </button>
                                <button onClick={() => addAdjustment('Overtime 2', 'OT After 2 Hrs')} className="flex-shrink-0 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded-lg hover:bg-indigo-100">
                                    + 加班 (OT 2)
                                </button>
                            </div>
                        </div>
                        
                        {/* Adjustment Headers */}
                        {adjustments.length > 0 && (
                             <div className="grid grid-cols-[1fr_2fr_0.7fr_0.7fr_1fr_auto] gap-2 px-3 pb-1 text-[10px] text-gray-400 font-medium">
                                 <div>類別</div>
                                 <div>描述</div>
                                 <div className="text-center">時數</div>
                                 <div className="text-right">Rate</div>
                                 <div className="text-right">金額</div>
                                 <div></div>
                             </div>
                        )}

                        <div className="space-y-1 pb-3 px-3">
                            {adjustments.map((adj) => (
                                <div key={adj.id} className="grid grid-cols-[1fr_2fr_0.7fr_0.7fr_1fr_auto] gap-2 items-center animate-fade-in group">
                                    {/* Category */}
                                    <select 
                                        value={adj.category}
                                        onChange={(e) => updateAdjustment(adj.id, 'category', e.target.value)}
                                        className="w-full text-[10px] border border-gray-300 rounded p-1.5 bg-white truncate"
                                    >
                                        {ADJUSTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>

                                    {/* Name */}
                                    <input 
                                        type="text" 
                                        placeholder="Item Name" 
                                        value={adj.name}
                                        onChange={(e) => updateAdjustment(adj.id, 'name', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded p-1.5"
                                    />
                                    
                                    {/* Hours (Optional) */}
                                    <input 
                                        type="number" 
                                        placeholder="Hr" 
                                        value={adj.hours}
                                        onChange={(e) => updateAdjustment(adj.id, 'hours', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded p-1.5 text-center"
                                    />
                                    
                                    {/* Rate (Optional) */}
                                    <input 
                                        type="number" 
                                        placeholder="Rate" 
                                        value={adj.rate}
                                        onChange={(e) => updateAdjustment(adj.id, 'rate', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded p-1.5 text-right"
                                    />

                                    {/* Amount */}
                                    <input 
                                        type="number" 
                                        placeholder="$" 
                                        value={adj.amount}
                                        onChange={(e) => updateAdjustment(adj.id, 'amount', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded p-1.5 text-right font-bold text-gray-700"
                                    />
                                    
                                    <div className="flex items-center gap-1">
                                        {parseFloat(adj.hours) > 0 && (
                                            <button 
                                                onClick={() => handleAddToLog(adj)} 
                                                title="Save hours to progress"
                                                className="bg-indigo-100 text-indigo-600 hover:bg-indigo-200 p-1.5 rounded-md transition-colors shadow-sm"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button onClick={() => removeAdjustment(adj.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {adjustments.length === 0 && <div className="text-[10px] text-gray-400 text-center italic py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 mx-2">點擊上方按鈕新增額外項目 (如: 加班、膳食補償)</div>}
                        </div>
                        {adjustments.length > 0 && (
                            <div className="px-4 py-2 bg-gray-100 flex justify-between items-center text-xs font-bold text-gray-600 border-t border-gray-200">
                                <span>調整總額</span>
                                <span>{totalAdjustments > 0 ? '+' : ''}{totalAdjustments.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-indigo-50 p-4 flex justify-between items-center border-t border-indigo-100">
                         <span className="text-sm font-bold text-indigo-900">Payslip Net Pay</span>
                         <span className="text-xl font-black text-indigo-600">{settings.currency} {slipNetPay.toLocaleString()}</span>
                    </div>
                 </div>
            </div>

            {/* App Comparison */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> App 紀錄 ({activeJob.name})</h3>
                <div className="p-4 bg-white border rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span>平日時數</span><span className="font-bold">{appStats.weekdayHours.toFixed(2)}h</span></div>
                    <div className="flex justify-between"><span>週末時數</span><span className="font-bold">{appStats.weekendHours.toFixed(2)}h</span></div>
                    <div className="flex justify-between pt-2 text-gray-500 text-xs">
                        <span>基本薪資估算</span>
                        <span>{settings.currency} {appStats.estimatedBasePay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-gray-800"><span>App Net (含津貼/無調整)</span><span>{settings.currency} {appNetPay.toLocaleString()}</span></div>
                </div>
            </div>
        </div>

        <div className="mt-2 pt-4 border-t space-y-3">
             <DiffRow type="weekday" diff={diffWeekday} appVal={appStats.weekdayHours} slipVal={inputWeekday} />
             <DiffRow type="weekend" diff={diffWeekend} appVal={appStats.weekendHours} slipVal={inputWeekend} />
             
             {totalAdjustments !== 0 && (
                 <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 flex flex-col gap-1 text-xs text-blue-800">
                     <div className="flex justify-between items-center font-bold">
                        <span>額外調整項目差異</span>
                        <span>+{totalAdjustments.toFixed(2)}</span>
                     </div>
                     <p className="text-blue-600/80 text-[10px]">
                        * 若這些項目包含工時 (如加班)，請點擊項目旁的 <Save className="w-3 h-3 inline"/> 按鈕將其加入工時紀錄，以修正總加薪進度。
                     </p>
                 </div>
             )}

             <div className={`text-right font-bold text-lg mt-4 ${diffPay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                總差異: {settings.currency} {Math.abs(diffPay).toLocaleString()} ({diffPay > 0 ? '少算' : '多算'})
             </div>
        </div>
      </div>
    </div>
  );
};
