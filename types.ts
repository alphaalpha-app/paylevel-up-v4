
export interface Job {
  id: string;
  name: string; // e.g., "State Swim", "Private Tutoring"
  color: string; // Hex color for UI distinction
  hourlyRate: number;        // Mon-Fri
  weekendHourlyRate: number; // Sat-Sun & Pub Hol
  targetHours: number;
  nextHourlyRate: number;    // Next Level Mon-Fri
  nextWeekendHourlyRate: number; // Next Level Sat-Sun & Pub Hol
}

export interface WorkLog {
  id: string;
  jobId: string; // Link to specific Job
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // in hours
  notes: string;
  timestamp: number; // Creation timestamp
}

export interface ShiftTemplate {
  id: string;
  name: string; // e.g. "Monday Morning"
  jobId: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface UserSettings {
  // Global Settings
  currency: string;
  userName: string;
  payFrequency: 'biweekly' | 'monthly';
  taxRate: number; 
  theme: 'light' | 'dark'; // New Theme setting
  lastBackupTimestamp?: number; // New Backup tracking
  
  // Deprecated fields (kept for migration types, but moved to Job)
  targetHours?: number;
  hourlyRate?: number;
  weekendHourlyRate?: number;
  nextHourlyRate?: number;
  nextWeekendHourlyRate?: number;
}

export interface AppState {
  logs: WorkLog[];
  settings: UserSettings;
  jobs: Job[];
  templates: ShiftTemplate[]; // New Templates list
}

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'HKD',
  userName: 'Employee',
  payFrequency: 'biweekly',
  taxRate: 0,
  theme: 'light',
};

export const DEFAULT_JOB: Job = {
  id: 'default',
  name: 'Main Job',
  color: '#4F46E5', // Indigo
  hourlyRate: 60,
  weekendHourlyRate: 60,
  targetHours: 1000,
  nextHourlyRate: 70,
  nextWeekendHourlyRate: 70,
};