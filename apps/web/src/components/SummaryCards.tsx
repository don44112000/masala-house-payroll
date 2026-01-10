import { Users, Calendar, FileText, Clock } from 'lucide-react';
import type { AttendanceReport } from '@attendance/shared';
import { cn } from '../lib/utils';

interface SummaryCardsProps {
  report: AttendanceReport;
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'cyan' | 'pink' | 'yellow' | 'orange';
  delay: number;
}

function Card({ icon, label, value, subtext, color, delay }: CardProps) {
  const colorClasses = {
    cyan: 'from-accent-cyan/20 to-accent-cyan/5 border-accent-cyan/30 text-accent-cyan',
    pink: 'from-accent-pink/20 to-accent-pink/5 border-accent-pink/30 text-accent-pink',
    yellow: 'from-accent-yellow/20 to-accent-yellow/5 border-accent-yellow/30 text-accent-yellow',
    orange: 'from-accent-orange/20 to-accent-orange/5 border-accent-orange/30 text-accent-orange',
  };

  return (
    <div
      className={cn(
        'relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-sm animate-slide-up',
        colorClasses[color],
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-midnight-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-midnight-100 font-display">{value}</p>
          {subtext && (
            <p className="text-midnight-500 text-sm mt-1">{subtext}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl bg-midnight-900/50', colorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SummaryCards({ report }: SummaryCardsProps) {
  const totalWorkHours = report.users.reduce(
    (acc, u) => acc + u.totalWorkingHours + u.totalWorkingMinutes / 60,
    0,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={<Users className="w-6 h-6" />}
        label="Total Users"
        value={report.uniqueUsers}
        subtext="Unique employees"
        color="cyan"
        delay={0}
      />
      <Card
        icon={<FileText className="w-6 h-6" />}
        label="Total Records"
        value={report.totalRecords.toLocaleString()}
        subtext="Punch entries"
        color="pink"
        delay={100}
      />
      <Card
        icon={<Calendar className="w-6 h-6" />}
        label="Date Range"
        value={`${new Date(report.dateRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(report.dateRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        subtext={`${Math.ceil((new Date(report.dateRange.to).getTime() - new Date(report.dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1} days`}
        color="yellow"
        delay={200}
      />
      <Card
        icon={<Clock className="w-6 h-6" />}
        label="Total Work Hours"
        value={Math.round(totalWorkHours).toLocaleString()}
        subtext="Across all users"
        color="orange"
        delay={300}
      />
    </div>
  );
}
