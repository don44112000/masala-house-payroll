import axios from 'axios';
import type { UploadResponse, AttendanceSettings, DailyAttendance } from '@attendance/shared';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function uploadAttendanceFile(
  attendanceFile: File,
  userFile: File,
  settings?: AttendanceSettings,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('attendanceFile', attendanceFile);
  formData.append('userFile', userFile);
  
  if (settings) {
    formData.append('settings', JSON.stringify(settings));
  }

  const response = await api.post<UploadResponse>('/attendance/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function parseAttendanceText(
  data: string,
  settings?: AttendanceSettings,
): Promise<UploadResponse> {
  const response = await api.post<UploadResponse>('/attendance/parse-text', {
    data,
    settings,
  });

  return response.data;
}

export interface GenerateReportParams {
  userId: number;
  userName: string;
  dailyRecords: DailyAttendance[];
  dateRange: {
    from: string;
    to: string;
  };
  summary?: {
    totalHours?: string;
    avgHours?: string;
    presentDays?: number;
    absentDays?: number;
    incompleteDays?: number;
    totalDays?: number;
  };
}

export interface GenerateReportResponse {
  html: string;
  filename: string;
}

export async function generateHtmlReport(
  params: GenerateReportParams,
): Promise<GenerateReportResponse> {
  const response = await api.post<GenerateReportResponse>('/attendance/report/html', params);
  return response.data;
}

export async function generatePdfReport(
  params: GenerateReportParams,
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.post('/attendance/report/pdf', params, {
    responseType: 'blob',
    validateStatus: (status) => status < 500, // Handle 4xx errors manually
  });

  // Check if the response is actually JSON (error) despite requesting blob
  if (response.headers['content-type']?.includes('application/json')) {
    const text = await response.data.text();
    let error;
    try {
      error = JSON.parse(text);
    } catch {
      error = { message: text };
    }
    throw new Error(error.message || 'Failed to generate PDF');
  }
  
  // Extract filename from Content-Disposition header or generate one
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'attendance-report.pdf';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }
  
  return { blob: response.data, filename };
}
