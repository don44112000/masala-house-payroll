import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, LogIn, LogOut, AlertTriangle, FileText, Plus, Trash2, Wallet } from 'lucide-react';
import type { UserAttendanceSummary, AttendanceSettings, DailyAttendance } from '@attendance/shared';
import { cn, formatDate, formatTime, formatDuration, getStatusConfig } from '../lib/utils';
import ReportPreview from './ReportPreview';
import TimePickerModal from './TimePickerModal';
import PayoutModal from './PayoutModal';

interface AttendanceTableProps {
  user: UserAttendanceSummary;
  settings: AttendanceSettings;
  onRefresh?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={cn(
        'px-2.5 py-1 rounded-lg text-xs font-medium',
        config.class,
      )}
    >
      {config.label}
    </span>
  );
}

function PunchDetails({ record, onDelete }: { record: DailyAttendance; onDelete: (punchTime: string) => void }) {
  const [confirmDeleteTime, setConfirmDeleteTime] = useState<string | null>(null);

  if (record.punches.length === 0) {
    return <span className="text-midnight-500">No punches recorded</span>;
  }

  return (
    <div className="space-y-2">
      {record.punches.map((punch, idx) => {
         const punchId = punch.time; // Use time as ID for UI state
         return (
        <div
          key={idx}
          className={cn(
            'flex items-center gap-3 text-sm group',
            !punch.isPaired && 'bg-accent-orange/10 border border-accent-orange/30 rounded-lg px-3 py-2',
          )}
        >
          <div
            className={cn(
              'p-1.5 rounded-lg',
              punch.type === 'IN'
                ? 'bg-accent-cyan/10 text-accent-cyan'
                : punch.type === 'OUT'
                ? 'bg-accent-pink/10 text-accent-pink'
                : 'bg-midnight-700 text-midnight-400',
            )}
          >
            {punch.type === 'IN' ? (
              <LogIn className="w-3.5 h-3.5" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="font-mono text-midnight-200">{formatTime(punch.time)}</span>
          <span className="text-midnight-500 text-xs">({punch.verificationType})</span>
          {!punch.isPaired && (
            <span className="ml-auto text-accent-orange text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unpaired
            </span>
          )}
          
          {/* Delete Action */}
          <div className="ml-auto flex items-center relative">
             {confirmDeleteTime === punchId ? (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-2 bg-white border border-midnight-200 shadow-lg rounded-lg px-3 py-1.5 z-10 animate-in fade-in zoom-in-95">
                   <span className="text-xs font-medium text-midnight-600 whitespace-nowrap">Delete?</span>
                   <div className="flex items-center gap-1">
                     <button 
                        onClick={() => onDelete(`${record.date}T${punch.time}+05:30`)}
                        className="px-2 py-0.5 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                     >
                        Yes
                     </button>
                     <button 
                        onClick={() => setConfirmDeleteTime(null)}
                        className="px-2 py-0.5 text-xs font-medium text-midnight-400 hover:text-midnight-600 hover:bg-midnight-50 rounded transition-colors"
                     >
                        No
                     </button>
                   </div>
                </div>
             ) : (
               <button 
                 onClick={() => setConfirmDeleteTime(punchId)}
                 className="p-1.5 bg-white/20 text-red-500 hover:bg-white/40 hover:text-red-600 transition-all rounded shadow-sm border border-midnight-200/10"
                 title="Delete this punch"
               >
                  <Trash2 className="w-3.5 h-3.5" />
               </button>
             )}
          </div>
        </div>
      )})}
    </div>
  );
}

export default function AttendanceTable({ user, settings, onRefresh }: AttendanceTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [confirmCompDate, setConfirmCompDate] = useState<string | null>(null);
  
  // State for adding manual punch
  const [handlingDate, setHandlingDate] = useState<string | null>(null);

  const sortedRecords = [...user.dailyRecords].sort((a, b) => {
    return sortOrder === 'asc' 
      ? a.date.localeCompare(b.date) 
      : b.date.localeCompare(a.date);
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Calculate date range from records
  const dateRange = {
    from: sortedRecords.length > 0 
      ? sortedRecords.reduce((min, r) => r.date < min ? r.date : min, sortedRecords[0].date)
      : new Date().toISOString().split('T')[0],
    to: sortedRecords.length > 0
      ? sortedRecords.reduce((max, r) => r.date > max ? r.date : max, sortedRecords[0].date)
      : new Date().toISOString().split('T')[0],
  };

  const handleMarkCompOff = async (date: string) => {
    try {
      const { markCompOff } = await import('../services/api');
      const response = await markCompOff(user.userId, date);
      if (response.success) {
        setConfirmCompDate(null);
        if (onRefresh) {
          onRefresh();
        } else {
           window.location.reload();
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to mark as Comp Off');
    }
  };

  const handleAddPunch = async (date: string, timeStr: string, isManual: boolean) => {
    try {
      const { addPunch } = await import('../services/api');
      const response = await addPunch(user.userId, date, timeStr, isManual);
      if (response.success) {
        setHandlingDate(null);
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add punch');
    }
  };

  const handleDeletePunch = async (punchTime: string) => {
    try {
      const { deletePunch } = await import('../services/api');
      const response = await deletePunch(user.userId, punchTime);
      if (response.success) {
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete punch');
    }
  };

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden relative">
        <div className="p-6 border-b border-midnight-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-midnight-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent-cyan" />
              Daily Attendance - {user.userName || `User ${user.userId}`}
              <span className="text-sm text-midnight-500 font-normal">(ID: {user.userId})</span>
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowReportPreview(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple transition-colors text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan transition-colors text-sm font-medium"
              >
                <Wallet className="w-4 h-4" />
                Payout Calculator
              </button>
              <span className="text-sm text-midnight-400">
                Work Hours: <span className="text-midnight-200">{settings.workStartTime}</span> -{' '}
                <span className="text-midnight-200">{settings.workEndTime}</span>
              </span>
            </div>
          </div>
        </div>


      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-midnight-900/50">
              <th className="px-6 py-4 text-left">
                <button
                  onClick={toggleSort}
                  className="flex items-center gap-2 text-midnight-400 hover:text-midnight-200 transition-colors font-medium text-sm"
                >
                  Date
                  {sortOrder === 'asc' ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-left text-midnight-400 font-medium text-sm">First In</th>
              <th className="px-6 py-4 text-left text-midnight-400 font-medium text-sm">Last Out</th>
              <th className="px-6 py-4 text-left text-midnight-400 font-medium text-sm">Duration</th>
              <th className="px-6 py-4 text-left text-midnight-400 font-medium text-sm">Status</th>
              <th className="px-6 py-4 text-left text-midnight-400 font-medium text-sm">Flags</th>
              <th className="px-6 py-4 text-right text-midnight-400 font-medium text-sm">Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <>
                <tr
                  key={record.date}
                  className={cn(
                    'border-t border-midnight-800/50 table-row-hover transition-colors',
                    expandedRow === record.date && 'bg-midnight-800/30',
                  )}
                >
                  <td className="px-6 py-4">
                    <span className="text-midnight-100 font-medium">
                      {formatDate(record.date)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-accent-cyan">
                      {formatTime(record.firstIn)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-accent-pink">
                      {formatTime(record.lastOut)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-midnight-200">
                      {formatDuration(record.totalHours, record.totalMinutes)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {record.isLate && (
                        <span className="flex items-center gap-1 text-accent-orange text-xs bg-accent-orange/10 px-2 py-1 rounded-lg">
                          <AlertTriangle className="w-3 h-3" />
                          Late
                        </span>
                      )}
                      {record.isEarlyOut && (
                        <span className="flex items-center gap-1 text-accent-yellow text-xs bg-accent-yellow/10 px-2 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          Early
                        </span>
                      )}
                      {record.overtime > 0 && (
                        <span className="text-accent-cyan text-xs bg-accent-cyan/10 px-2 py-1 rounded-lg">
                          +{Math.round(record.overtime)}m OT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        setExpandedRow(expandedRow === record.date ? null : record.date)
                      }
                      className="p-2 rounded-lg bg-midnight-800 hover:bg-midnight-700 text-midnight-400 hover:text-midnight-200 transition-all"
                    >
                      {expandedRow === record.date ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRow === record.date && (
                  <tr key={`${record.date}-details`} className="bg-midnight-900/30">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-8">
                        <div>
                          <h4 className="text-sm font-medium text-midnight-300 mb-3 flex items-center gap-2">
                            All Punches
                          </h4>
                          <PunchDetails 
                            record={record} 
                            onDelete={(time) => handleDeletePunch(time)}
                          />
                          
                          {/* Add Punch UI */}
                          <div className="mt-4 pt-3 border-t border-midnight-700/50">
                            <button
                              onClick={() => setHandlingDate(record.date)}
                              className="flex items-center gap-1.5 text-xs font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Punch
                            </button>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        {record.status === 'ABSENT' && (
                          <div className="flex items-center gap-4">
                            {confirmCompDate === record.date ? (
                              <div className="flex items-center gap-3 bg-midnight-800 p-1.5 rounded-lg border border-accent-yellow/20 animate-in fade-in slide-in-from-right-4 duration-200">
                                <span className="text-sm text-midnight-300 pl-2">Are you sure?</span>
                                <button
                                  onClick={() => handleMarkCompOff(record.date)}
                                  className="px-3 py-1.5 rounded-md bg-accent-yellow text-midnight-900 text-xs font-bold hover:bg-accent-yellow/90 transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmCompDate(null)}
                                  className="px-3 py-1.5 rounded-md bg-midnight-700 text-midnight-300 text-xs font-medium hover:bg-midnight-600 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmCompDate(record.date)}
                                className="px-4 py-2 rounded-lg bg-accent-yellow/10 hover:bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/20 transition-all text-sm font-medium"
                              >
                                Mark as Comp Off
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="p-6 border-t border-midnight-800 bg-midnight-900/30">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-cyan" />
            <span className="text-midnight-400">Present:</span>
            <span className="text-midnight-100 font-medium">{user.presentDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-cyan" />
            <span className="text-midnight-400">Comp Off:</span>
            <span className="text-midnight-100 font-medium">{user.compDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-orange" />
            <span className="text-midnight-400">Incomplete:</span>
            <span className="text-midnight-100 font-medium">{user.incompleteDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-pink" />
            <span className="text-midnight-400">Late Arrivals:</span>
            <span className="text-midnight-100 font-medium">{user.lateDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-midnight-500" />
            <span className="text-midnight-400">Early Exits:</span>
            <span className="text-midnight-100 font-medium">{user.earlyOutDays}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Time Picker Modal */}
    {handlingDate && (
      <TimePickerModal
        onClose={() => setHandlingDate(null)}
        onSave={(time, isManual) => handleAddPunch(handlingDate, time, isManual)}
      />
    )}

    {/* Report Preview Modal */}
    {showReportPreview && (
      <ReportPreview
        user={user}
        dateRange={dateRange}
        onClose={() => setShowReportPreview(false)}
      />
    )}

    {/* Payout Modal */}
    {showPayoutModal && (
      <PayoutModal
        user={user}
        dateRange={dateRange}
        onClose={() => setShowPayoutModal(false)}
      />
    )}
  </>
  );
}
