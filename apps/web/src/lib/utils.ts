import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; class: string; color: string }> = {
    PRESENT: { label: 'Present', class: 'status-present', color: '#00f5d4' },
    ABSENT: { label: 'Absent', class: 'status-absent', color: '#f72585' },
    INCOMPLETE: { label: 'Incomplete', class: 'status-incomplete', color: '#60a5fa' },
    COMP: { label: 'Comp Off', class: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20', color: '#fbbf24' },
  };
  return configs[status] || { label: status, class: '', color: '#888' };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
