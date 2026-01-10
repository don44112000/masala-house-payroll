/**
 * Raw attendance record from .dat file
 */
export interface RawAttendanceRecord {
  userId: number;
  timestamp: Date;
  verificationType: number;
  inOutStatus: number;
  workCode: number;
  reserved: number;
}

/**
 * Processed daily attendance for a user
 */
export interface DailyAttendance {
  userId: number;
  date: string; // YYYY-MM-DD
  firstIn: string | null; // HH:MM:SS
  lastOut: string | null; // HH:MM:SS
  totalHours: number;
  totalMinutes: number;
  punches: PunchRecord[];
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyOut: boolean;
  overtime: number; // minutes
}

/**
 * Individual punch record
 */
export interface PunchRecord {
  time: string; // HH:MM:SS
  type: 'IN' | 'OUT' | 'UNKNOWN';
  verificationType: string;
  isPaired: boolean; // Whether this punch has a matching pair
}

/**
 * Attendance status
 * PRESENT: Even number of punches (2, 4, 6...)
 * ABSENT: No punches (0)
 * INCOMPLETE: Odd number of punches (1, 3, 5...)
 */
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INCOMPLETE' | 'COMP';

/**
 * User attendance summary
 */
export interface UserAttendanceSummary {
  userId: number;
  userName?: string; // Optional user name from user data file
  totalDays: number;
  presentDays: number;
  absentDays: number;
  incompleteDays: number;
  compDays: number;
  totalWorkingHours: number;
  totalWorkingMinutes: number;
  averageHoursPerDay: number;
  lateDays: number;
  earlyOutDays: number;
  overtimeMinutes: number;
  dailyRecords: DailyAttendance[];
}

/**
 * Complete attendance report
 */
export interface AttendanceReport {
  fileName: string;
  processedAt: string;
  dateRange: {
    from: string;
    to: string;
  };
  totalRecords: number;
  uniqueUsers: number;
  users: UserAttendanceSummary[];
  settings: AttendanceSettings;
}

/**
 * Configurable settings for attendance calculation
 */
export interface AttendanceSettings {
  workStartTime: string; // HH:MM
  workEndTime: string; // HH:MM
  lateThresholdMinutes: number;
  earlyOutThresholdMinutes: number;
}

/**
 * Default attendance settings
 */
export const DEFAULT_SETTINGS: AttendanceSettings = {
  workStartTime: '09:30',
  workEndTime: '18:30',
  lateThresholdMinutes: 15,
  earlyOutThresholdMinutes: 15,
};

/**
 * File upload response
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  report?: AttendanceReport;
  error?: string;
}

/**
 * Processing progress event (for SSE)
 */
export interface ProcessingProgress {
  stage: 'uploading' | 'parsing' | 'calculating' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  recordsProcessed?: number;
  totalRecords?: number;
}
