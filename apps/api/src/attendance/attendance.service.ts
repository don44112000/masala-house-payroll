import { Injectable } from "@nestjs/common";
import { DatFileParser } from "./parsers/dat-file.parser";
import { UserDataParser } from "./parsers/user-data.parser";
import { AttendanceSettingsDto } from "./dto/attendance-settings.dto";
import {
  RawAttendanceRecord,
  DailyAttendance,
  UserAttendanceSummary,
  AttendanceReport,
  AttendanceSettings,
  PunchRecord,
  AttendanceStatus,
  DEFAULT_SETTINGS,
  formatDate,
  formatTime,
  timeToMinutes,
  getVerificationLabel,
} from "@attendance/shared";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly datParser: DatFileParser,
    private readonly userDataParser: UserDataParser,
  ) {}

  /**
   * Process uploaded file and generate attendance report
   */
  async processFile(
    buffer: Buffer,
    fileName: string,
    settingsDto?: AttendanceSettingsDto,
    userFileBuffer?: Buffer,
  ): Promise<AttendanceReport> {
    // Merge settings with defaults
    const settings: AttendanceSettings = {
      ...DEFAULT_SETTINGS,
      ...settingsDto,
    };

    // Parse user mapping if provided
    let userMapping: Map<number, string> | undefined;
    if (userFileBuffer) {
      try {
        userMapping = await this.userDataParser.parse(userFileBuffer);
        console.log(`Loaded ${userMapping.size} user mappings`);
      } catch (error) {
        console.warn('Failed to parse user data file:', error.message);
        // Continue without user mapping
      }
    }

    // Parse raw records from file
    const rawRecords = await this.datParser.parse(buffer);

    if (rawRecords.length === 0) {
      throw new Error("No valid attendance records found in file");
    }

    // Group records by user
    const userRecords = this.groupByUser(rawRecords);

    // Calculate attendance for each user
    const users: UserAttendanceSummary[] = [];
    for (const [userId, records] of userRecords) {
      const summary = this.calculateUserAttendance(userId, records, settings);
      
      // Enrich with user name if available
      if (userMapping && userMapping.has(userId)) {
        summary.userName = userMapping.get(userId);
      }
      
      users.push(summary);
    }

    // Sort users by ID
    users.sort((a, b) => a.userId - b.userId);

    // Calculate date range
    const allDates = rawRecords.map((r) => r.timestamp);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    return {
      fileName,
      processedAt: new Date().toISOString(),
      dateRange: {
        from: formatDate(minDate),
        to: formatDate(maxDate),
      },
      totalRecords: rawRecords.length,
      uniqueUsers: users.length,
      users,
      settings,
    };
  }

  /**
   * Group raw records by user ID
   */
  private groupByUser(
    records: RawAttendanceRecord[]
  ): Map<number, RawAttendanceRecord[]> {
    const map = new Map<number, RawAttendanceRecord[]>();

    for (const record of records) {
      const existing = map.get(record.userId) || [];
      existing.push(record);
      map.set(record.userId, existing);
    }

    return map;
  }

  /**
   * Calculate attendance summary for a single user
   * Generates a complete calendar for all days in the month range
   */
  private calculateUserAttendance(
    userId: number,
    records: RawAttendanceRecord[],
    settings: AttendanceSettings
  ): UserAttendanceSummary {
    // Group by date
    const dateRecords = this.groupByDate(records);

    // Find month boundaries from the records
    const dates = Array.from(dateRecords.keys()).map((d) => new Date(d + 'T00:00:00'));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Get start of first month and end of last month
    const monthStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const monthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    // Generate all dates in the month range
    const allDates: string[] = [];
    const currentDate = new Date(monthStart);
    // Use date comparison to avoid time component issues
    while (currentDate.getTime() <= monthEnd.getTime()) {
      allDates.push(formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate daily attendance for all dates
    const dailyRecords: DailyAttendance[] = [];
    let totalWorkingMinutes = 0;
    let lateDays = 0;
    let earlyOutDays = 0;
    let overtimeMinutes = 0;
    let presentDays = 0;
    let absentDays = 0;
    let incompleteDays = 0;

    for (const date of allDates) {
      const dayRecords = dateRecords.get(date);

      let daily: DailyAttendance;
      if (dayRecords && dayRecords.length > 0) {
        // Has punch records - calculate normally
        daily = this.calculateDailyAttendance(date, dayRecords, settings);
      } else {
        // No punch records - mark as ABSENT
        daily = {
          userId,
          date,
          firstIn: null,
          lastOut: null,
          totalHours: 0,
          totalMinutes: 0,
          punches: [],
          status: "ABSENT",
          isLate: false,
          isEarlyOut: false,
          overtime: 0,
        };
      }

      dailyRecords.push(daily);

      // Update statistics
      if (daily.status === "PRESENT") {
        totalWorkingMinutes += daily.totalHours * 60 + daily.totalMinutes;

        if (daily.isLate) lateDays++;
        if (daily.isEarlyOut) earlyOutDays++;
        if (daily.overtime > 0) overtimeMinutes += daily.overtime;

        presentDays++;
      } else if (daily.status === "ABSENT") {
        absentDays++;
      } else if (daily.status === "INCOMPLETE") {
        incompleteDays++;
      }
    }

    const totalDays = dailyRecords.length;
    const totalWorkingHours = Math.floor(totalWorkingMinutes / 60);
    const remainingMinutes = Math.round(totalWorkingMinutes % 60);
    // Calculate average only from complete days (present days)
    const averageHoursPerDay =
      presentDays > 0 ? totalWorkingMinutes / 60 / presentDays : 0;

    return {
      userId,
      totalDays,
      presentDays,
      absentDays,
      incompleteDays,
      totalWorkingHours,
      totalWorkingMinutes: remainingMinutes,
      averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
      lateDays,
      earlyOutDays,
      overtimeMinutes,
      dailyRecords,
    };
  }

  /**
   * Group records by date
   */
  private groupByDate(
    records: RawAttendanceRecord[]
  ): Map<string, RawAttendanceRecord[]> {
    const map = new Map<string, RawAttendanceRecord[]>();

    for (const record of records) {
      const date = formatDate(record.timestamp);
      const existing = map.get(date) || [];
      existing.push(record);
      map.set(date, existing);
    }

    return map;
  }

  /**
   * Calculate attendance for a single day
   */
  private calculateDailyAttendance(
    date: string,
    records: RawAttendanceRecord[],
    settings: AttendanceSettings
  ): DailyAttendance {
    // Sort records by time
    const sortedRecords = [...records].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const punchCount = sortedRecords.length;

    // Extract punches with pair information
    const punches: PunchRecord[] = sortedRecords.map((r, index) => {
      const isEvenIndex = index % 2 === 0;
      const isPaired = isEvenIndex ? index + 1 < punchCount : true;

      return {
        time: formatTime(r.timestamp),
        type: isEvenIndex ? "IN" : "OUT",
        verificationType: getVerificationLabel(r.verificationType),
        isPaired,
      };
    });

    // Get first in and last out
    const firstIn = punches.length > 0 ? punches[0].time : null;
    const lastOut =
      punches.length > 1 ? punches[punches.length - 1].time : null;

    // Calculate working hours using pair-based logic
    // Sum of (punch1-punch2) + (punch3-punch4) + ...
    let totalMinutes = 0;

    for (let i = 0; i < sortedRecords.length - 1; i += 2) {
      const inTime = formatTime(sortedRecords[i].timestamp);
      const outTime = formatTime(sortedRecords[i + 1].timestamp);

      const inMinutes = timeToMinutes(inTime);
      const outMinutes = timeToMinutes(outTime);
      const duration = Math.max(0, outMinutes - inMinutes);

      totalMinutes += duration;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);

    // Determine status based on punch count
    let status: AttendanceStatus;
    if (punchCount === 0) {
      status = "ABSENT";
    } else if (punchCount % 2 === 0) {
      status = "PRESENT";
    } else {
      status = "INCOMPLETE";
    }

    // Check if late (only for complete days)
    const workStartMinutes = timeToMinutes(settings.workStartTime);
    const firstInMinutes = firstIn ? timeToMinutes(firstIn) : 0;
    const isLate =
      status === "PRESENT" &&
      firstIn !== null &&
      firstInMinutes > workStartMinutes + settings.lateThresholdMinutes;

    // Check if early out (only for complete days)
    const workEndMinutes = timeToMinutes(settings.workEndTime);
    const lastOutMinutes = lastOut ? timeToMinutes(lastOut) : 0;
    const isEarlyOut =
      status === "PRESENT" &&
      lastOut !== null &&
      lastOutMinutes < workEndMinutes - settings.earlyOutThresholdMinutes;

    // Calculate overtime (only for complete days)
    const expectedMinutes = workEndMinutes - workStartMinutes;
    const overtime =
      status === "PRESENT" ? Math.max(0, totalMinutes - expectedMinutes) : 0;

    return {
      userId: records[0].userId,
      date,
      firstIn,
      lastOut,
      totalHours,
      totalMinutes: remainingMinutes,
      punches,
      status,
      isLate,
      isEarlyOut,
      overtime,
    };
  }
}
