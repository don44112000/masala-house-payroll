import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Calendar, Clock } from 'lucide-react';
import type { UserAttendanceSummary } from '@attendance/shared';
import { getStatusConfig } from '../lib/utils';

interface AttendanceChartProps {
  user: UserAttendanceSummary;
}

export default function AttendanceChart({ user }: AttendanceChartProps) {
  // Prepare chart data - show hours worked per day
  // For ABSENT days, show a small bar (0.5h) to make it visible
  const chartData = user.dailyRecords.map((record) => {
    // Parse day and date from data without Date object if possible
    const dayName = record.dayCode 
      ? record.dayCode.charAt(0) + record.dayCode.slice(1).toLowerCase() 
      : new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
      
    const dateNum = parseInt(record.date.split('-')[2], 10);
    const dayOfWeek = record.dayCode 
      ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(record.dayCode) 
      : new Date(record.date).getDay();

    return {
      // Short day for label: "Mon"
      dayName,
      // Date number
      dateNum,
      // Combined label for x-axis: "Mon\n01"
      label: `${dayName}\n${String(dateNum).padStart(2, '0')}`,
      // Full date with day for tooltip: "Monday, Jan 1" - computed lazily if needed or kept simple
      // We'll keep the full display for tooltip but optimize its creation via a simple formatter or keep it as is since tooltip is on hover
      fullDateDisplay: record.date, // Store raw date string, format in Tooltip
      hours: (record.status === 'ABSENT' || (record.status === 'INCOMPLETE' && (record.totalHours + record.totalMinutes / 60) === 0)) ? 0.5 : record.status === 'COMP' ? 12 : record.totalHours + record.totalMinutes / 60,
      actualHours: record.status === 'COMP' ? 0 : record.totalHours + record.totalMinutes / 60,
      status: record.status,
      fullDate: record.date,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    };
  });

  // Sort by date string directly (YYYY-MM-DD is lexicographically sortable)
  chartData.sort((a, b) => a.fullDate.localeCompare(b.fullDate));

  // Calculate dynamic width based on number of days (minimum 50px per bar)
  const minBarWidth = 42;
  const chartWidth = Math.max(chartData.length * minBarWidth, 800);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const statusConfig = getStatusConfig(data.status);
      
      return (
        <div className="bg-midnight-900/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-midnight-700/50">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-midnight-700/50">
            <Calendar className="w-4 h-4 text-accent-purple" />
            <p className="text-midnight-100 font-semibold">{data.fullDateDisplay}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-midnight-400 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Hours Worked
              </span>
              <span className="text-accent-cyan font-mono font-bold text-lg">
                {data.status === 'COMP' ? 'Full Day (Comp Off)' : `${data.actualHours.toFixed(1)}h`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-midnight-400 text-sm">Status</span>
              <span 
                className="font-medium px-2 py-0.5 rounded-full text-xs"
                style={{ 
                  color: statusConfig.color,
                  backgroundColor: `${statusConfig.color}20`
                }}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tick component for better date/day display
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const data = chartData.find(d => d.label === payload.value);
    if (!data) return null;
    
    const isWeekend = data.isWeekend;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill={isWeekend ? '#a78bfa' : '#9ca3af'}
        >
          {data.dayName}
        </text>
        <text
          x={0}
          y={0}
          dy={26}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill={isWeekend ? '#c4b5fd' : '#e5e7eb'}
        >
          {String(data.dateNum).padStart(2, '0')}
        </text>
      </g>
    );
  };

  return (
    <div className="glass rounded-2xl p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-midnight-100 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20">
            <BarChart3 className="w-5 h-5 text-accent-cyan" />
          </div>
          <span>Daily Working Hours</span>
          <span className="text-midnight-400">—</span>
          <span className="text-accent-purple">{user.userName || `User ${user.userId}`}</span>
          <span className="text-xs text-midnight-500 font-normal bg-midnight-800/50 px-2 py-1 rounded-full">
            ID: {user.userId}
          </span>
        </h2>
        
        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight-800/50">
            <span className="text-midnight-400">Days:</span>
            <span className="font-mono font-semibold text-midnight-100">{chartData.length}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Chart Container */}
      <div 
        className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-midnight-700 scrollbar-track-midnight-900 pb-2"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(99, 113, 241, 0.3) rgba(15, 23, 42, 0.5)'
        }}
      >
        <div style={{ width: chartWidth, minWidth: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
              barCategoryGap="15%"
            >
              <defs>
                {/* Gradient definitions for bars */}
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="incompleteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f72585" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f72585" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99, 113, 241, 0.08)"
                vertical={false}
              />
              
              {/* Reference line for 8-hour workday */}
              <ReferenceLine 
                y={8} 
                stroke="rgba(34, 197, 94, 0.4)" 
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ 
                  value: '8h target', 
                  position: 'right',
                  fill: '#22c55e',
                  fontSize: 11,
                  fontWeight: 500
                }}
              />
              
              <XAxis
                dataKey="label"
                stroke="#4b5563"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(75, 85, 99, 0.3)' }}
                interval={0}
                tick={<CustomXAxisTick />}
                height={50}
              />
              
              <YAxis
                stroke="#4b5563"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
                domain={[0, 'auto']}
                width={45}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ 
                  fill: 'rgba(99, 113, 241, 0.08)',
                  radius: 4
                }} 
              />
              
              <Bar 
                dataKey="hours" 
                radius={[6, 6, 0, 0]}
                maxBarSize={35}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === 'ABSENT'
                        ? 'url(#absentGradient)'
                        : entry.status === 'INCOMPLETE'
                        ? 'url(#incompleteGradient)'
                        : entry.status === 'COMP'
                        ? 'url(#compGradient)'
                        : 'url(#presentGradient)'
                    }
                    style={{
                      filter: entry.status !== 'ABSENT' ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-5 pt-4 border-t border-midnight-800/50">
        {['PRESENT', 'COMP', 'INCOMPLETE', 'ABSENT'].map((status) => {
          const config = getStatusConfig(status);
          const count = chartData.filter(d => d.status === status).length;
          return (
            <div key={status} className="flex items-center gap-2.5 text-sm group cursor-default">
              <div
                className="w-4 h-4 rounded-md shadow-sm transition-transform group-hover:scale-110"
                style={{ 
                  background: status === 'PRESENT' 
                    ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                    : status === 'INCOMPLETE'
                    ? 'linear-gradient(135deg, #60a5fa, #3b82f6)'
                    : status === 'COMP'
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(135deg, rgba(247, 37, 133, 0.4), rgba(247, 37, 133, 0.2))',
                }}
              />
              <span className="text-midnight-300 group-hover:text-midnight-100 transition-colors">
                {config.label}
              </span>
              <span className="text-midnight-500 font-mono text-xs bg-midnight-800/50 px-1.5 py-0.5 rounded">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
