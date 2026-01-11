import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager, Between } from "typeorm";
import {
  Employee,
  Punch,
  DailyAttendance,
  AttendanceStatusEnum,
} from "./entities";
import { Readable } from "stream";
import * as readline from "readline";
import { time } from "console";
import { async } from "rxjs";

@Injectable()
export class V2AttendanceService {
  private readonly logger = new Logger(V2AttendanceService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Punch)
    private readonly punchRepo: Repository<Punch>,
    @InjectRepository(DailyAttendance)
    private readonly dailyAttendanceRepo: Repository<DailyAttendance>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Upload user data file and upsert employees
   * Format: Fixed-size binary records (64/66/72 bytes) from ZKTeco devices
   */
  async uploadUsers(
    buffer: Buffer
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    // Auto-detect record size based on file length alignment
    let recordSize = 64;
    if (buffer.length % 72 === 0) {
      this.logger.log(
        `Detected 72-byte record alignment (${buffer.length} bytes)`
      );
      recordSize = 72;
    } else if (buffer.length % 64 !== 0 && buffer.length % 66 === 0) {
      this.logger.log(
        `Detected 66-byte record alignment (${buffer.length} bytes)`
      );
      recordSize = 66;
    }

    const recordCount = Math.floor(buffer.length / recordSize);
    this.logger.log(
      `Processing ${recordCount} user records (${recordSize}-byte each)`
    );

    // Optimization: Fetch all existing employees once to avoid N+1 queries
    const allEmployees = await this.employeeRepo.find();
    const employeeMap = new Map<number, Employee>();
    for (const emp of allEmployees) {
      employeeMap.set(emp.biometric_id, emp);
    }

    // Process records
    for (let i = 0; i < recordCount; i++) {
      const offset = i * recordSize;
      const record = buffer.slice(offset, offset + recordSize);

      const parsed = this.parseUserRecord(record, i);
      if (!parsed) continue;

      const existing = employeeMap.get(parsed.userId);

      if (existing) {
        if (existing.name !== parsed.userName) {
          existing.name = parsed.userName;
          await this.employeeRepo.save(existing);
          updated++;
        }
      } else {
        const employee = this.employeeRepo.create({
          biometric_id: parsed.userId,
          name: parsed.userName,
        });
        await this.employeeRepo.save(employee);
        // Add to map for subsequent records in same file
        employeeMap.set(parsed.userId, employee);
        created++;
      }
    }

    this.logger.log(`Users uploaded: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  /**
   * Parse a single binary user record (matching UserDataParser logic)
   */
  private parseUserRecord(
    record: Buffer,
    index: number
  ): { userId: number; userName: string } | null {
    try {
      // Extract user name - scan for printable ASCII starting around byte 10
      let userName = "";
      let nameStartIndex = -1;

      for (let i = 10; i < 50; i++) {
        const byte = record[i];
        if (byte >= 0x20 && byte <= 0x7e) {
          nameStartIndex = i;
          break;
        }
      }

      if (nameStartIndex === -1) return null;

      // Extract name until null or non-printable
      for (let i = nameStartIndex; i < record.length; i++) {
        const byte = record[i];
        if (byte === 0x00) break;
        if (byte < 0x20 || byte > 0x7e) break;
        userName += String.fromCharCode(byte);
      }

      userName = userName.trim();
      if (!userName) return null;

      // Extract user ID - scan for digit sequences after name
      let userId: number | null = null;
      let currentNumber = "";

      for (let i = nameStartIndex + userName.length; i < record.length; i++) {
        const byte = record[i];
        if (byte >= 0x30 && byte <= 0x39) {
          currentNumber += String.fromCharCode(byte);
        } else if (currentNumber.length > 0) {
          const num = parseInt(currentNumber, 10);
          if (!isNaN(num) && num > 0) {
            userId = num;
            break;
          }
          currentNumber = "";
        }
      }

      // Fallback to index-based ID
      if (userId === null) {
        userId = index + 1;
        this.logger.warn(
          `User ID not found in record ${index}, using index: ${userId}`
        );
      }

      return { userId, userName };
    } catch {
      return null;
    }
  }

  /**
   * Upload attendance .dat file and insert punches
   * Format: USER_ID \t TIMESTAMP \t VERIFY_TYPE \t IN_OUT \t WORK_CODE \t RESERVED
   */
  async uploadAttendance(
    buffer: Buffer
  ): Promise<{ inserted: number; skipped: number }> {
    try {
      return this.dataSource.transaction(async (manager) => {
        let inserted = 0;
        let skipped = 0;

        const employeeRepo = manager.getRepository(Employee);
        const punchRepo = manager.getRepository(Punch);

        // Optimization: Fetch all employees once
        const allEmployees = await employeeRepo.find();
        const employeeMap = new Map<number, Employee>();
        for (const emp of allEmployees) {
          employeeMap.set(emp.biometric_id, emp);
        }

        // Track affected dates per employee for targeted recalculation
        // Map<EmployeeID, Set<DateString>>
        const affectedUserDates = new Map<number, Set<string>>();

        const stream = Readable.from(buffer);
        const rl = readline.createInterface({
          input: stream,
          crlfDelay: Infinity,
        });

        console.log("step 1 completed", rl);

        for await (const line of rl) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = this.parseAttendanceLine(trimmed);
          if (!parsed) {
            skipped++;
            continue;
          }

          // Find or create employee using Map
          let employee = employeeMap.get(parsed.biometric_id);

          if (!employee) {
            const newEmployee = employeeRepo.create({
              biometric_id: parsed.biometric_id,
              name: null,
            });
            employee = await employeeRepo.save(newEmployee);
            employeeMap.set(parsed.biometric_id, employee);
          }

          // Track this date for this user
          if (!affectedUserDates.has(employee.id)) {
            affectedUserDates.set(employee.id, new Set());
          }
          const dateStr = parsed.punch_time.toISOString().split("T")[0];
          affectedUserDates.get(employee.id)!.add(dateStr);

          // Try insert - skip if duplicate (unique constraint)
          // Use createQueryBuilder to safely handle duplicates without aborting transaction
          const result = await punchRepo
            .createQueryBuilder()
            .insert()
            .into(Punch)
            .values({
              employee_id: employee.id,
              punch_time: parsed.punch_time,
              verification_type: parsed.verification_type,
              punch_type: null,
              is_paired: false,
              is_edited: false,
            })
            .orIgnore() // ON CONFLICT DO NOTHING
            .execute();

          // Check if row was actually inserted
          // Postgres returns identifiers for inserted rows
          if (result.identifiers && result.identifiers.length > 0) {
            inserted++;
          } else {
            skipped++;
          }
        }
        // After inserting, compute punch_type and is_paired only for the affected records
        if (affectedUserDates.size > 0) {
          try {
            // EXPANSION: Recalculate for the ENTIRE month for affected users
            // This ensures days with no punches are correctly marked as ABSENT
            for (const [userId, dates] of affectedUserDates.entries()) {
              const months = new Set<string>(); // "YYYY-MM"
              for (const dateStr of dates) {
                months.add(dateStr.substring(0, 7));
              }

              for (const monthStr of months) {
                const [year, month] = monthStr.split("-").map(Number);
                const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed here? No, Date constructor: year, monthIndex (0-11), 0 (last day of prev month).
                // Wait, split "2024-01" -> year=2024, month=1.
                // new Date(2024, 1, 0) -> Last day of Jan (because month 1 is Feb). Correct.

                for (let d = 1; d <= daysInMonth; d++) {
                  const dayStr = `${year}-${String(month).padStart(
                    2,
                    "0"
                  )}-${String(d).padStart(2, "0")}`;
                  dates.add(dayStr);
                }
              }
            }

            await this.computePunchTypes(affectedUserDates, manager);
            await this.computeDailyAttendance(affectedUserDates, manager);
          } catch (error: any) {
            this.logger.error(
              `Error during recalculation phase: ${error.message}`,
              error.stack
            );
            // Re-throw to ensure transaction rollback if recalculation fails critically
            throw error;
          }

          // Calculate total impacted days for logging
          let totalDays = 0;
          for (const dates of affectedUserDates.values()) {
            totalDays += dates.size;
          }

          this.logger.log(
            `Recalculated attendance for ${affectedUserDates.size} users across ${totalDays} total user-days (Full Month).`
          );
        }

        this.logger.log(
          `Attendance uploaded: ${inserted} inserted, ${skipped} skipped (duplicates)`
        );
        return { inserted, skipped };
      });
    } catch (error: any) {
      this.logger.error(`Failed to upload attendance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse a single line from .dat file
   */
  private parseAttendanceLine(line: string): {
    biometric_id: number;
    punch_time: Date;
    verification_type: string;
  } | null {
    try {
      const parts = line.split(/\t+|\s{2,}/).filter(Boolean);
      if (parts.length < 2) return null;

      const biometric_id = parseInt(parts[0], 10);
      if (isNaN(biometric_id)) return null;

      // Parse timestamp
      let timestampStr: string;
      let nextIndex: number;

      if (parts[1].includes(":")) {
        timestampStr = parts[1];
        nextIndex = 2;
      } else {
        timestampStr = `${parts[1]} ${parts[2]}`;
        nextIndex = 3;
      }

      // Parse as IST
      const punch_time = new Date(timestampStr + "+05:30");
      if (isNaN(punch_time.getTime())) return null;

      // Map verification type: 1 = Fingerprint, 2 = Card
      const verifyCode = parseInt(parts[nextIndex] || "1", 10) || 1;
      const verification_type = verifyCode === 2 ? "Card" : "Fingerprint";

      return { biometric_id, punch_time, verification_type };
    } catch (error) {
      this.logger.error(`Failed to parse attendance line: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compute punch_type (IN/OUT) and is_paired for all punches
   * Logic: Sort by time, odd positions = IN, even = OUT
   */
  private async computePunchTypes(
    affectedUserDates?: Map<number, Set<string>>,
    manager?: EntityManager
  ): Promise<void> {
    try {
      const punchRepo = manager ? manager.getRepository(Punch) : this.punchRepo;
      const employeeRepo = manager
        ? manager.getRepository(Employee)
        : this.employeeRepo;

      // If no map provided, process all employees (fallback/legacy)
      if (!affectedUserDates) {
        const allEmployees = await employeeRepo.find();
        affectedUserDates = new Map();
        for (const emp of allEmployees) {
          affectedUserDates.set(emp.id, new Set());
        }

        const employees = await employeeRepo.find();
        for (const employee of employees) {
          const punches = await punchRepo.find({
            where: { employee_id: employee.id },
            order: { punch_time: "ASC" },
          });
          // Process all dates found
          const byDate = new Map<string, Punch[]>();
          for (const punch of punches) {
            const date = punch.punch_time.toISOString().split("T")[0];
            if (!byDate.has(date)) byDate.set(date, []);
            byDate.get(date)!.push(punch);
          }
          for (const [, dayPunches] of byDate) {
            this.assignPunchTypes(dayPunches);
            await punchRepo.save(dayPunches);
          }
        }
        return;
      }

      // Optimized path: Process only affected users and dates
      const employeeIds = Array.from(affectedUserDates.keys());
      if (employeeIds.length === 0) return;

      for (const employeeId of employeeIds) {
        const dates = affectedUserDates.get(employeeId);
        if (!dates || dates.size === 0) continue;

        for (const dateStr of dates) {
          try {
            const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
            const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

            const dayPunches = await punchRepo.find({
              where: {
                employee_id: employeeId,
                punch_time: Between(startOfDay, endOfDay),
              },
              order: { punch_time: "ASC" },
            });

            if (dayPunches.length > 0) {
              this.assignPunchTypes(dayPunches);
              await punchRepo.save(dayPunches);
            }
          } catch (error: any) {
            this.logger.error(
              `Failed to compute punch types for user ${employeeId} on ${dateStr}: ${error.message}`
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to compute daily attendance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Sort punches by time and assign IN/OUT types
   * Logic: Odd positions = IN, Even positions = OUT
   */
  private assignPunchTypes(punches: Punch[]): void {
    // Explicitly sort by time to ensure correctness regardless of DB order
    punches.sort((a, b) => a.punch_time.getTime() - b.punch_time.getTime());

    const isEven = punches.length % 2 === 0;
    for (let i = 0; i < punches.length; i++) {
      const p = punches[i];
      p.punch_type = i % 2 === 0 ? "IN" : "OUT";
      p.is_paired = isEven || i < punches.length - 1;
    }
  }

  /**
   * Compute and upsert daily attendance records for all employees
   * Creates entries for the complete month(s) detected from punch data
   */
  private async computeDailyAttendance(
    affectedUserDates?: Map<number, Set<string>>,
    manager?: EntityManager
  ): Promise<void> {
    try {
      const employeeRepo = manager
        ? manager.getRepository(Employee)
        : this.employeeRepo;
      const punchRepo = manager ? manager.getRepository(Punch) : this.punchRepo;

      // Helper: convert time string to minutes
      const timeToMinutes = (time: string): number => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      // Helper: format time from Date
      const formatTime = (date: Date): string => {
        const h = date.getHours().toString().padStart(2, "0");
        const m = date.getMinutes().toString().padStart(2, "0");
        const s = date.getSeconds().toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
      };

      // Helper: get day code (MON, TUE, WED, THU, FRI, SAT, SUN)
      const getDayCode = (dateStr: string): string => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const date = new Date(dateStr + "T00:00:00");
        return days[date.getDay()];
      };

      // Legacy/Fallback path: Process all
      if (!affectedUserDates) {
        const employees = await employeeRepo.find();
        for (const employee of employees) {
          const punches = await punchRepo.find({
            where: { employee_id: employee.id },
            order: { punch_time: "ASC" },
          });
          const dates = new Set<string>(
            punches.map((p) => p.punch_time.toISOString().split("T")[0])
          );

          for (const dateStr of dates) {
            await this.computeDailyAttendanceForDay(
              employee.id,
              dateStr,
              timeToMinutes,
              formatTime,
              getDayCode,
              manager
            );
          }
        }
        return;
      }

      // Optimized path
      const employeeIds = Array.from(affectedUserDates.keys());
      for (const employeeId of employeeIds) {
        const dates = affectedUserDates.get(employeeId);
        if (!dates) continue;

        for (const dateStr of dates) {
          try {
            await this.computeDailyAttendanceForDay(
              employeeId,
              dateStr,
              timeToMinutes,
              formatTime,
              getDayCode,
              manager
            );
          } catch (error: any) {
            this.logger.error(
              `Failed to compute daily attendance for user ${employeeId} on ${dateStr}: ${error.message}`
            );
          }
        }
      }
      this.logger.log("Daily attendance records computed for affected users.");
    } catch (error: any) {
      this.logger.error("Failed to compute daily attendance", error.message);
      throw error;
    }
  }

  // Refactored helper to process a single day
  private async computeDailyAttendanceForDay(
    employeeId: number,
    dateStr: string,
    timeToMinutes: (t: string) => number,
    formatTime: (d: Date) => string,
    getDayCode: (d: string) => string,
    manager?: EntityManager
  ) {
    const punchRepo = manager ? manager.getRepository(Punch) : this.punchRepo;
    const dailyAttendanceRepo = manager
      ? manager.getRepository(DailyAttendance)
      : this.dailyAttendanceRepo;

    const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

    const dayPunches = await punchRepo.find({
      where: {
        employee_id: employeeId,
        punch_time: Between(startOfDay, endOfDay),
      },
      order: { punch_time: "ASC" },
    });

    const punchCount = dayPunches.length;

    // Calculate status
    let status: AttendanceStatusEnum;
    if (punchCount === 0) {
      status = AttendanceStatusEnum.ABSENT;
    } else if (punchCount % 2 === 0) {
      status = AttendanceStatusEnum.PRESENT;
    } else {
      status = AttendanceStatusEnum.INCOMPLETE;
    }

    // Calculate first in / last out
    const firstIn =
      punchCount > 0 ? formatTime(dayPunches[0].punch_time) : null;
    const lastOut =
      punchCount > 1 ? formatTime(dayPunches[punchCount - 1].punch_time) : null;

    // Calculate total minutes using pair logic
    let totalMinutes = 0;
    for (let i = 0; i < dayPunches.length - 1; i += 2) {
      const inTime = formatTime(dayPunches[i].punch_time);
      const outTime = formatTime(dayPunches[i + 1].punch_time);
      const inMin = timeToMinutes(inTime);
      const outMin = timeToMinutes(outTime);
      totalMinutes += Math.max(0, outMin - inMin);
    }

    // Upsert daily attendance record
    const existing = await dailyAttendanceRepo.findOne({
      where: { employee_id: employeeId, date: dateStr },
    });

    if (existing) {
      existing.status = status;
      existing.first_in = firstIn;
      existing.last_out = lastOut;
      existing.total_minutes = totalMinutes;
      existing.punch_count = punchCount;
      existing.day_code = getDayCode(dateStr);
      await dailyAttendanceRepo.save(existing);
    } else {
      const record = dailyAttendanceRepo.create({
        employee_id: employeeId,
        date: dateStr,
        day_code: getDayCode(dateStr),
        status,
        first_in: firstIn,
        last_out: lastOut,
        total_minutes: totalMinutes,
        punch_count: punchCount,
      });
      await dailyAttendanceRepo.save(record);
    }
  }

  /**
   * Get all employees
   */
  async getEmployees(): Promise<Employee[]> {
    return this.employeeRepo.find({ order: { biometric_id: "ASC" } });
  }

  /**
   * Get attendance report for a specific month/year using optimized raw SQL
   * Single query returns complete report data with JSON aggregation
   */
  async getAttendanceReport(
    month: number,
    year: number,
    settings: {
      workStartTime: string;
      workEndTime: string;
      lateThresholdMinutes: number;
      earlyOutThresholdMinutes: number;
    }
  ): Promise<any> {
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(
      year,
      month + 1,
      0
    ).getDate()}`;

    // Parse settings for SQL calculations
    const [startH, startM] = settings.workStartTime.split(":").map(Number);
    const [endH, endM] = settings.workEndTime.split(":").map(Number);
    const workStartMinutes = startH * 60 + startM;
    const workEndMinutes = endH * 60 + endM;

    // Load and execute single optimized SQL query
    // SQL files are copied to dist via nest-cli.json assets config
    const fs = await import("fs");
    const path = await import("path");
    const sqlPath = path.join(__dirname, "queries", "get-full-report.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute single query with all parameters
    // $1=startDate, $2=endDate, $3=workStartMinutes, $4=workEndMinutes, $5=lateThreshold, $6=earlyOutThreshold
    const result = await this.employeeRepo.query(sql, [
      startDate,
      endDate,
      workStartMinutes,
      workEndMinutes,
      settings.lateThresholdMinutes,
      settings.earlyOutThresholdMinutes,
    ]);

    // SQL returns single row with users JSON array, total_records, unique_users
    const row = result[0] || { users: [], total_records: 0, unique_users: 0 };

    return {
      fileName: "database",
      processedAt: new Date().toISOString(),
      dateRange: { from: startDate, to: endDate },
      totalRecords: parseInt(row.total_records) || 0,
      uniqueUsers: parseInt(row.unique_users) || 0,
      users: row.users || [],
      settings,
    };
  }

  /**
   * Mark a specific day as COMP off for a user
   * Only allowed if current status is ABSENT
   */
  async markCompOff(userId: number, date: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { biometric_id: userId },
    });

    if (!employee) {
      throw new Error(`Employee with ID ${userId} not found`);
    }

    const record = await this.dailyAttendanceRepo.findOne({
      where: { employee_id: employee.id, date },
    });

    // Helper: get day code (MON, TUE, WED, THU, FRI, SAT, SUN)
    const getDayCode = (dateStr: string): string => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const d = new Date(dateStr + "T00:00:00");
      return days[d.getDay()];
    };

    if (record) {
      if (record.status !== AttendanceStatusEnum.ABSENT) {
        throw new Error(
          `Cannot mark as COMP off: Current status is ${record.status}`
        );
      }

      record.status = AttendanceStatusEnum.COMP;
      record.day_code = getDayCode(date);
      // Ensure other values are default/null
      record.first_in = null;
      record.last_out = null;
      record.total_minutes = 0;
      record.punch_count = 0;

      await this.dailyAttendanceRepo.save(record);
    } else {
      // Create new record if not exists (though computeDailyAttendance should have created it)
      const newRecord = this.dailyAttendanceRepo.create({
        employee_id: employee.id,
        date,
        day_code: getDayCode(date),
        status: AttendanceStatusEnum.COMP,
        first_in: null,
        last_out: null,
        total_minutes: 0,
        punch_count: 0,
      });
      await this.dailyAttendanceRepo.save(newRecord);
    }

    this.logger.log(`Marked COMP off for user ${userId} on ${date}`);
  }

  /**
   * Add a manual punch and recalculate daily attendance for that specific day
   */
  async addPunch(
    userId: number,
    date: string,
    time: string,
    isManual: boolean = true
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const employee = await manager.findOne(Employee, {
        where: { biometric_id: userId },
      });

      if (!employee) {
        throw new Error(`Employee with ID ${userId} not found`);
      }

      // Parse date and time to create timestamp
      const timestampStr = `${date}T${time}:00+05:30`;
      const punchTime = new Date(timestampStr);

      if (isNaN(punchTime.getTime())) {
        throw new Error("Invalid date or time format");
      }

      // Logic for verification type and edited flag
      const verificationType = isManual ? "Manual" : "Fingerprint";
      const isEdited = isManual;

      // Insert new punch
      const punch = manager.create(Punch, {
        employee_id: employee.id,
        punch_time: punchTime,
        verification_type: verificationType,
        punch_type: null,
        is_paired: false,
        is_edited: isEdited,
      });
      await manager.save(Punch, punch);

      // Now recalculate for this day using the transaction manager
      await this.recalculateDay(manager, employee.id, date);

      this.logger.log(
        `Added manual punch for user ${userId} at ${time} on ${date} (Manual=${isManual})`
      );
    });
  }
  /**
   * Delete a punch and recalculate
   */
  async deletePunch(userId: number, punchTimeStr: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // First, find the employee by biometric_id (userId is the biometric_id from frontend)
      const employee = await manager.findOne(Employee, {
        where: { biometric_id: userId },
      });

      if (!employee) {
        throw new Error(`Employee with ID ${userId} not found`);
      }

      // Create date object from string (ISO format expected from frontend)
      const punchTime = new Date(punchTimeStr);
      if (isNaN(punchTime.getTime())) {
        throw new Error("Invalid punch time format");
      }

      const punch = await manager.findOne(Punch, {
        where: {
          employee_id: employee.id,
          punch_time: punchTime,
        },
      });

      if (!punch) {
        throw new Error("Punch not found");
      }

      await manager.remove(Punch, punch);

      const dateStr = punchTime.toISOString().split("T")[0];
      await this.recalculateDay(manager, employee.id, dateStr);

      this.logger.log(`Deleted punch for user ${userId} at ${punchTimeStr}`);
    });
  }

  /**
   * Recalculate punch types and daily attendance for a specific employee and day
   */
  private async recalculateDay(
    manager: EntityManager,
    employeeId: number,
    dateStr: string
  ): Promise<void> {
    // Calculate day bounds in IST
    const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

    // Optimized fetch: Only get punches for this specific day
    const dayPunches = await manager.find(Punch, {
      where: {
        employee_id: employeeId,
        punch_time: Between(startOfDay, endOfDay),
      },
      order: { punch_time: "ASC" },
    });

    // 2. Re-compute punch types (IN/OUT)
    this.assignPunchTypes(dayPunches);

    // Save updated punch types
    await manager.save(Punch, dayPunches);

    // 3. Re-compute DailyAttendance
    const punchCount = dayPunches.length;
    let status: AttendanceStatusEnum;
    if (punchCount === 0) {
      status = AttendanceStatusEnum.ABSENT;
    } else if (punchCount % 2 === 0) {
      status = AttendanceStatusEnum.PRESENT;
    } else {
      status = AttendanceStatusEnum.INCOMPLETE;
    }

    // Helpers
    const formatTime = (d: Date) => {
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      const s = d.getSeconds().toString().padStart(2, "0");
      return `${h}:${m}:${s}`;
    };
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const getDayCode = (d: string) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const date = new Date(d + "T00:00:00");
      return days[date.getDay()];
    };

    const firstIn =
      punchCount > 0 ? formatTime(dayPunches[0].punch_time) : null;
    const lastOut =
      punchCount > 1 ? formatTime(dayPunches[punchCount - 1].punch_time) : null;

    let totalMinutes = 0;
    for (let i = 0; i < dayPunches.length - 1; i += 2) {
      const inTime = formatTime(dayPunches[i].punch_time);
      const outTime = formatTime(dayPunches[i + 1].punch_time);
      const inMin = timeToMinutes(inTime);
      const outMin = timeToMinutes(outTime);
      totalMinutes += Math.max(0, outMin - inMin);
    }

    const existing = await manager.findOne(DailyAttendance, {
      where: { employee_id: employeeId, date: dateStr },
    });

    if (existing) {
      // Logic handles overwriting COMP/ABSENT with calculated status
      existing.status = status;
      existing.first_in = firstIn;
      existing.last_out = lastOut;
      existing.total_minutes = totalMinutes;
      existing.punch_count = punchCount;
      existing.day_code = getDayCode(dateStr);
      await manager.save(DailyAttendance, existing);
    } else {
      const record = manager.create(DailyAttendance, {
        employee_id: employeeId,
        date: dateStr,
        day_code: getDayCode(dateStr),
        status,
        first_in: firstIn,
        last_out: lastOut,
        total_minutes: totalMinutes,
        punch_count: punchCount,
      });
      await manager.save(DailyAttendance, record);
    }
  }
}
