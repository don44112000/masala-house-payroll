import { User, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { UserAttendanceSummary } from '@attendance/shared';
import { cn, formatDuration } from '../lib/utils';

interface UserSelectorProps {
  users: UserAttendanceSummary[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
}

export default function UserSelector({
  users,
  selectedUserId,
  onSelectUser,
}: UserSelectorProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-midnight-100 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-accent-cyan" />
        Select Employee
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {users.map((user) => (
          <button
            key={user.userId}
            onClick={() => onSelectUser(user.userId)}
            className={cn(
              'relative p-4 rounded-xl border transition-all duration-200 text-left group',
              selectedUserId === user.userId
                ? 'bg-accent-cyan/10 border-accent-cyan/50 shadow-lg shadow-accent-cyan/10'
                : 'bg-midnight-900/50 border-midnight-700 hover:border-midnight-500 hover:bg-midnight-800/50',
            )}
          >
            {/* User Info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={cn(
                  'font-semibold text-base mb-1',
                  selectedUserId === user.userId ? 'text-accent-cyan' : 'text-midnight-100'
                )}>
                  {user.userName || `User ${user.userId}`}
                </h3>
                <div className={cn(
                  'inline-flex px-2 py-0.5 rounded text-xs font-mono',
                  selectedUserId === user.userId
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'bg-midnight-800 text-midnight-400'
                )}>
                  ID: {user.userId}
                </div>
              </div>
              {user.lateDays > 0 && (
                <div className="flex items-center gap-1 text-accent-orange text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  {user.lateDays}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-midnight-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hours
                </span>
                <span className="text-midnight-200 font-medium">
                  {formatDuration(user.totalWorkingHours, user.totalWorkingMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-midnight-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Avg/Day
                </span>
                <span className="text-midnight-200 font-medium">
                  {user.averageHoursPerDay.toFixed(1)}h
                </span>
              </div>
            </div>

            {/* Attendance bar */}
            <div className="mt-3 h-1.5 bg-midnight-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-cyan to-accent-pink rounded-full transition-all duration-300"
                style={{
                  width: `${(user.presentDays / user.totalDays) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-midnight-500 mt-1.5">
              {user.presentDays}/{user.totalDays} days present
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
