import axios from "axios";
import type {
  UploadResponse,
  AttendanceSettings,
  DailyAttendance,
} from "@attendance/shared";

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function uploadAttendanceFile(
  attendanceFile: File,
  userFile: File,
  settings?: AttendanceSettings
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("attendanceFile", attendanceFile);
  formData.append("userFile", userFile);

  if (settings) {
    formData.append("settings", JSON.stringify(settings));
  }

  const response = await api.post<UploadResponse>(
    "/attendance/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function parseAttendanceText(
  data: string,
  settings?: AttendanceSettings
): Promise<UploadResponse> {
  const response = await api.post<UploadResponse>("/attendance/parse-text", {
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
    compDays?: number;
    totalDays?: number;
  };
}

export interface GenerateReportResponse {
  html: string;
  filename: string;
}

export async function generateHtmlReport(
  params: GenerateReportParams
): Promise<GenerateReportResponse> {
  const response = await api.post<GenerateReportResponse>(
    "/attendance/report/html",
    params
  );
  return response.data;
}

export async function generatePdfReport(
  params: GenerateReportParams
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.post("/attendance/report/pdf", params, {
    responseType: "blob",
    validateStatus: (status) => status < 500, // Handle 4xx errors manually
  });

  // Check if the response is actually JSON (error) despite requesting blob
  if (response.headers["content-type"]?.includes("application/json")) {
    const text = await response.data.text();
    let error;
    try {
      error = JSON.parse(text);
    } catch {
      error = { message: text };
    }
    throw new Error(error.message || "Failed to generate PDF");
  }

  // Extract filename from Content-Disposition header or generate one
  const contentDisposition = response.headers["content-disposition"];
  let filename = "attendance-report.pdf";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }

  return { blob: response.data, filename };
}

// ============================================
// V2 APIs - Database Upload Functions
// ============================================

export interface V2UploadResponse {
  success: boolean;
  message: string;
  created?: number;
  updated?: number;
  inserted?: number;
  skipped?: number;
}

export async function uploadUsersToDb(file: File): Promise<V2UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<V2UploadResponse>(
    "/v2/attendance/upload-users",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
}

export async function uploadAttendanceToDb(
  file: File
): Promise<V2UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<V2UploadResponse>(
    "/v2/attendance/upload-attendance",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
}

export async function getV2Report(
  month: number,
  year: number,
  settings?: {
    workStartTime?: string;
    workEndTime?: string;
    lateThreshold?: number;
    earlyOutThreshold?: number;
  }
): Promise<UploadResponse> {
  const params = new URLSearchParams({
    month: month.toString(),
    year: year.toString(),
  });
  if (settings?.workStartTime)
    params.append("workStartTime", settings.workStartTime);
  if (settings?.workEndTime) params.append("workEndTime", settings.workEndTime);
  if (settings?.lateThreshold)
    params.append("lateThreshold", settings.lateThreshold.toString());
  if (settings?.earlyOutThreshold)
    params.append("earlyOutThreshold", settings.earlyOutThreshold.toString());

  const response = await api.get(`/v2/attendance/report?${params.toString()}`);

  return {
    success: true,
    message: "Report loaded from database",
    report: response.data,
  };
}

export async function markCompOff(
  userId: number,
  date: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.post("/v2/attendance/mark-comp-off", {
    userId,
    date,
  });
  return response.data;
}

export async function addPunch(
  userId: number,
  date: string,
  time: string,
  isManual: boolean = true
): Promise<{ success: boolean; message: string }> {
  const response = await api.post("/v2/attendance/add-punch", {
    userId,
    date,
    time,
    isManual,
  });
  return response.data;
}

export async function deletePunch(
  userId: number,
  punchTime: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.delete("/v2/attendance/delete-punch", {
    data: { userId, punchTime },
  });
  return response.data;
}
