import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import * as readline from 'readline';
import type { RawAttendanceRecord } from '@attendance/shared';

@Injectable()
export class DatFileParser {
  /**
   * Parse .dat file buffer using streaming
   * Format: USER_ID\tTIMESTAMP\tVERIFY_TYPE\tIN_OUT\tWORK_CODE\tRESERVED
   */
  async parse(buffer: Buffer): Promise<RawAttendanceRecord[]> {
    const records: RawAttendanceRecord[] = [];
    const stream = Readable.from(buffer);
    
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const record = this.parseLine(trimmedLine);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Parse a single line from the .dat file
   */
  private parseLine(line: string): RawAttendanceRecord | null {
    try {
      // Split by tab or multiple spaces
      const parts = line.split(/\t+|\s{2,}/).filter(Boolean);
      
      if (parts.length < 2) {
        return null;
      }

      // Handle format: "userId timestamp type1 type2 type3 type4"
      // Example: "5	2025-12-01 09:47:09	1	0	1	0"
      
      const userId = parseInt(parts[0].trim(), 10);
      if (isNaN(userId)) {
        return null;
      }

      // Parse timestamp - might be split across parts[1] and parts[2]
      let timestampStr: string;
      let nextIndex: number;

      // Check if parts[1] contains both date and time
      if (parts[1].includes(' ') || (parts[1].includes('-') && parts[2]?.includes(':'))) {
        // Date might be in parts[1] and time in parts[2]
        if (parts[1].includes(':')) {
          // Both date and time in parts[1]
          timestampStr = parts[1];
          nextIndex = 2;
        } else {
          // Date in parts[1], time in parts[2]
          timestampStr = `${parts[1]} ${parts[2]}`;
          nextIndex = 3;
        }
      } else {
        timestampStr = parts[1];
        nextIndex = 2;
      }

      // Parse timestamp as IST (Asia/Kolkata)
      // Data is already in IST, so we append +05:30 to ensure correct timezone
      const timestamp = new Date(timestampStr + '+05:30');
      if (isNaN(timestamp.getTime())) {
        return null;
      }

      // Parse remaining fields with defaults
      const verificationType = parseInt(parts[nextIndex] || '1', 10) || 1;
      const inOutStatus = parseInt(parts[nextIndex + 1] || '0', 10) || 0;
      const workCode = parseInt(parts[nextIndex + 2] || '1', 10) || 1;
      const reserved = parseInt(parts[nextIndex + 3] || '0', 10) || 0;

      return {
        userId,
        timestamp,
        verificationType,
        inOutStatus,
        workCode,
        reserved,
      };
    } catch (error) {
      console.warn(`Failed to parse line: ${line}`, error);
      return null;
    }
  }
}
