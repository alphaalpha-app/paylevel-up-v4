
import React, { useRef, useState, useMemo } from 'react';
import { AppState, UserSettings } from '../types';
import { Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface DataManagementProps {
  appState: AppState;
  onImport: (data: AppState) => void;
  onUpdateSettings: (settings: UserSettings) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ appState, onImport, onUpdateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const backupNeeded = useMemo(() => {
      const lastBackup = appState.settings.lastBackupTimestamp || 0;
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return (now - lastBackup) > sevenDays;
  }, [appState.settings.lastBackupTimestamp]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `work_logs_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    // Update backup timestamp
    onUpdateSettings({ ...appState.settings, lastBackupTimestamp: Date.now() });
    
    setStatus({ type: 'success', msg: 'JSON Exported & Backup Time Updated!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleExportCSV = () => {
    const logs = appState.logs;
    const jobs = appState.jobs;
    const header = ['Date', 'Job Name', 'Start Time', 'End Time', 'Duration (Hours)', 'Hourly Rate', 'Earnings', 'Notes'];
    
    const rows = logs.map(log => {
        const job = jobs.find(j => j.id === log.jobId);
        const isWeekend = new Date(log.date).getDay() % 6 === 0;
        const rate = job ? (isWeekend ? job.weekendHourlyRate : job.hourlyRate) : 0;
        const earnings = log.duration * rate;
        
        return [
            log.date,
            job?.name || 'Unknown',
            log.startTime,
            log.endTime,
            log.duration.toString(),
            rate.toString(),
            earnings.toFixed(2),
            `"${log.notes.replace(/"/g, '""')}"` // Escape quotes
        ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paylevel_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    setStatus({ type: 'success', msg: 'CSV Exported successfully!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];

    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const parsedData = JSON.parse(result) as AppState;
          
          if (!parsedData.logs || !parsedData.settings) {
            throw new Error("Invalid file format");
          }
          
          onImport(parsedData);
          setStatus({ type: 'success', msg: 'Data imported successfully!' });
        }
      } catch (error) {
        setStatus({ type: 'error', msg: 'Failed to import: Invalid JSON file.' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setStatus(null), 3000);
      }
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-700 dark:text-gray-200 font-semibold">Data Management</h3>
          {backupNeeded && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Backup overdue!
              </span>
          )}
      </div>

      <div className="flex gap-4 mb-4">
        <button 
          onClick={handleExportJSON}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all group"
        >
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-white dark:group-hover:bg-gray-600 group-hover:text-primary transition-colors">
             <Download className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-primary" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-primary">Export JSON</span>
        </button>

        <button 
          onClick={handleExportCSV}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all group"
        >
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-white dark:group-hover:bg-gray-600 group-hover:text-green-600 transition-colors">
             <FileSpreadsheet className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-green-600">Export CSV</span>
        </button>

        <button 
          onClick={handleImportClick}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-secondary hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all group"
        >
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-white dark:group-hover:bg-gray-600 group-hover:text-secondary transition-colors">
            <Upload className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-secondary" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-secondary">Import JSON</span>
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
      </div>

      {status && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          status.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          {status.msg}
        </div>
      )}
    </div>
  );
};
