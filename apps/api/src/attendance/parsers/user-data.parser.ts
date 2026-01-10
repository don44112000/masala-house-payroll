import { Injectable } from '@nestjs/common';

export interface UserMapping {
  userId: number;
  userName: string;
}

@Injectable()
export class UserDataParser {
  /**
   * Parse binary user data file
   * Format: Fixed 64-byte records containing user ID and name mappings
   * 
   * Based on hexdump analysis:
   * - Byte 0: Record sequential number (01, 02, 03...)
   * - Bytes 2-3: Field separator (00 0e or similar patterns)
   * - Bytes 11-43: User name (ASCII, null-padded, max ~32 chars)
   * - User ID: ASCII string embedded in record
   */
  async parse(buffer: Buffer): Promise<Map<number, string>> {
    const userMapping = new Map<number, string>();
    let recordSize = 64; // Default fixed record size
    
    // Auto-detect record size based on file length alignment
    // ZKTeco devices often use 72 bytes or 66 bytes
    if (buffer.length % 72 === 0) {
      console.log(`Detected 72-byte record alignment for user data file (${buffer.length} bytes)`);
      recordSize = 72;
    } else if (buffer.length % 64 !== 0 && buffer.length % 66 === 0) {
      console.log(`Detected 66-byte record alignment for user data file (${buffer.length} bytes)`);
      recordSize = 66;
    }

    if (buffer.length % recordSize !== 0) {
      console.warn(`User data file size (${buffer.length}) is not a multiple of ${recordSize} (aligned to default 64 or detected 66)`);
    }

    const recordCount = Math.floor(buffer.length / recordSize);

    for (let i = 0; i < recordCount; i++) {
      const offset = i * recordSize;
      const record = buffer.slice(offset, offset + recordSize);
      
      const parsedRecord = this.parseRecord(record, i);
      if (parsedRecord) {
        userMapping.set(parsedRecord.userId, parsedRecord.userName);
      }
    }

    if (userMapping.size === 0) {
      throw new Error('No valid user records found in user data file');
    }

    return userMapping;
  }

  /**
   * Parse a single 64-byte user record
   */
  private parseRecord(record: Buffer, index: number): UserMapping | null {
    try {
      // Extract user name from bytes 11-43 (approximate based on hexdump)
      // User names appear to start around byte 11
      let userName = '';
      let nameStartIndex = -1;
      
      // Scan for the start of ASCII text (user name)
      for (let i = 10; i < 50; i++) {
        const byte = record[i];
        // Check if this is a printable ASCII character (A-Z, a-z, space, etc.)
        if (byte >= 0x20 && byte <= 0x7E) {
          nameStartIndex = i;
          break;
        }
      }

      if (nameStartIndex === -1) {
        return null;
      }

      // Extract name until we hit null bytes or non-ASCII
      for (let i = nameStartIndex; i < record.length; i++) {
        const byte = record[i];
        if (byte === 0x00) break; // Null terminator
        if (byte < 0x20 || byte > 0x7E) break; // Non-printable
        userName += String.fromCharCode(byte);
      }

      userName = userName.trim();
      if (!userName) {
        return null;
      }

      // Extract user ID - it appears to be stored as ASCII digits later in the record
      // Scan through the rest of the record for digit sequences
      let userId: number | null = null;
      let currentNumber = '';
      
      for (let i = nameStartIndex + userName.length; i < record.length; i++) {
        const byte = record[i];
        const char = String.fromCharCode(byte);
        
        if (byte >= 0x30 && byte <= 0x39) { // ASCII digits 0-9
          currentNumber += char;
        } else if (currentNumber.length > 0) {
          // We found a complete number
          const num = parseInt(currentNumber, 10);
          if (!isNaN(num) && num > 0) {
            userId = num;
            break;
          }
          currentNumber = '';
        }
      }

      // If we didn't find a user ID in the record, try using the record index + 1
      if (userId === null) {
        userId = index + 1;
        console.warn(`User ID not found in record ${index}, using index-based ID: ${userId}`);
      }

      return {
        userId,
        userName,
      };
    } catch (error) {
      console.warn(`Failed to parse user record at index ${index}:`, error);
      return null;
    }
  }

  /**
   * Debug helper to dump record contents
   */
  private debugRecord(record: Buffer, index: number): void {
    console.log(`\n=== Record ${index} ===`);
    console.log('Hex:', record.toString('hex').match(/.{1,2}/g)?.join(' '));
    console.log('ASCII:', record.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
  }
}
