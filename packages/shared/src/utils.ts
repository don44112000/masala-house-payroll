/**
 * IST Timezone Configuration (Asia/Kolkata, UTC+5:30)
 */
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format minutes to hours and minutes string
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Parse time string to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format date to YYYY-MM-DD (hardcoded to IST timezone)
 */
export function formatDate(date: Date): string {
  // Convert to IST (Asia/Kolkata) timezone
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:MM:SS (hardcoded to IST timezone)
 */
export function formatTime(date: Date): string {
  // Convert to IST (Asia/Kolkata) timezone
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate difference in minutes between two time strings
 */
export function timeDifferenceMinutes(start: string, end: string): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return endMinutes - startMinutes;
}

/**
 * Get verification type label
 */
export function getVerificationLabel(type: number): string {
  const labels: Record<number, string> = {
    0: 'Password',
    1: 'Fingerprint',
    2: 'Card',
    3: 'Password + Fingerprint',
    4: 'Card + Fingerprint',
    15: 'Face',
  };
  return labels[type] || `Type ${type}`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PRESENT: 'green',
    ABSENT: 'red',
    HALF_DAY: 'yellow',
    INCOMPLETE: 'orange',
  };
  return colors[status] || 'gray';
}
