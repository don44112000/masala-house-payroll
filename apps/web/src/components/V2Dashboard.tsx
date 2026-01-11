import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AttendanceReport, AttendanceSettings } from '@attendance/shared';
import { DEFAULT_SETTINGS } from '@attendance/shared';
import SummaryCards from './SummaryCards';
import UserSelector from './UserSelector';
import AttendanceTable from './AttendanceTable';
import AttendanceChart from './AttendanceChart';
import SettingsPanel from './SettingsPanel';
import MonthYearPicker from './MonthYearPicker';
import Header from './Header';
import { Database, Loader2, RefreshCw, Users, FileText } from 'lucide-react';
import { getV2Report, uploadUsersToDb, uploadAttendanceToDb } from '../services/api';

interface V2DashboardProps {
  onHome: () => void;
  onSwitchMode: () => void;
}

export default function V2Dashboard({ onHome, onSwitchMode }: V2DashboardProps) {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getV2Report(selectedMonth, selectedYear, {
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        lateThreshold: settings.lateThresholdMinutes,
        earlyOutThreshold: settings.earlyOutThresholdMinutes,
      });
      if (response.success && response.report) {
        setReport(response.report);
        if (response.report.users.length > 0 && !selectedUserId) {
          setSelectedUserId(response.report.users[0].userId);
        }
      } else {
        setError(response.error || 'Failed to load report');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  const selectedUser = report?.users.find((u) => u.userId === selectedUserId);

  return (
    <div className="w-full">
      {/* Header - Shared Component */}
      <Header
        onHome={onHome}
        onSettingsClick={() => setShowSettings(true)}
        mode="database"
        onSwitchMode={onSwitchMode}
      />

      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        {/* Toolbar */}
        <div className="flex flex-col md:block relative mb-6">
          <div className="flex justify-center w-full">
            <MonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChange={(month, year) => {
                setSelectedMonth(month);
                setSelectedYear(year);
              }}
            />
          </div>

          <div className="mt-4 md:mt-0 md:absolute md:left-0 md:top-0 md:h-full md:flex md:items-center pointer-events-none">
            <div className="pointer-events-auto flex gap-3">
               {/* Upload Users */}
               <label className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-midnight-900/60 border border-midnight-700/50 backdrop-blur-sm hover:border-accent-cyan/50 hover:bg-accent-cyan/5 hover:shadow-[0_0_15px_-3px_rgba(34,211,238,0.15)] transition-all duration-300 cursor-pointer group">
                  <Users className="w-4 h-4 text-midnight-400 group-hover:text-accent-cyan transition-colors" />
                  <span className="text-sm font-medium text-midnight-300 group-hover:text-accent-cyan transition-colors">Users</span>
                  <input 
                    type="file" 
                    hidden 
                    accept=".dat" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const result = await uploadUsersToDb(file);
                        alert(result.message);
                      } catch (err: unknown) {
                        const error = err as { message?: string };
                        alert('Error: ' + (error.message || 'Upload failed'));
                      }
                      e.target.value = '';
                    }} 
                  />
               </label>
               {/* Upload Attendance */}
               <label className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-midnight-900/60 border border-midnight-700/50 backdrop-blur-sm hover:border-accent-pink/50 hover:bg-accent-pink/5 hover:shadow-[0_0_15px_-3px_rgba(244,114,182,0.15)] transition-all duration-300 cursor-pointer group">
                  <FileText className="w-4 h-4 text-midnight-400 group-hover:text-accent-pink transition-colors" />
                  <span className="text-sm font-medium text-midnight-300 group-hover:text-accent-pink transition-colors">Data</span>
                  <input 
                    type="file" 
                    hidden 
                    accept=".dat,.txt,.csv" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const result = await uploadAttendanceToDb(file);
                        alert(result.message);
                        loadReport(); // Auto refresh after upload
                      } catch (err: unknown) {
                        const error = err as { message?: string };
                        alert('Error: ' + (error.message || 'Upload failed'));
                      }
                      e.target.value = '';
                    }} 
                  />
               </label>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 md:absolute md:right-0 md:top-0 md:h-full md:flex md:items-center pointer-events-none">
            <div className="pointer-events-auto">
              <motion.button
                onClick={loadReport}
                disabled={loading}
                className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-midnight-900/60 border border-midnight-700/50 backdrop-blur-sm hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)] text-midnight-300 transition-all duration-300 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className={`w-4 h-4 group-hover:text-emerald-400 transition-colors ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium group-hover:text-emerald-400 transition-colors">Refresh</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-accent-cyan animate-spin mb-4" />
            <p className="text-midnight-400">Loading data from database...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-accent-pink/10 border border-accent-pink/30 text-center">
            <p className="text-accent-pink mb-4">{error}</p>
            <button
              onClick={loadReport}
              className="px-4 py-2 rounded-lg bg-accent-pink/20 text-accent-pink hover:bg-accent-pink/30"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        {report && !loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SummaryCards report={report} />
              </motion.div>

              {/* User Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <UserSelector
                  users={report.users}
                  selectedUserId={selectedUserId}
                  onSelectUser={setSelectedUserId}
                />
              </motion.div>

              {/* User Details */}
              {selectedUser && (
                <>
                  {/* Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <AttendanceChart user={selectedUser} />
                  </motion.div>

                  {/* Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <AttendanceTable 
                      user={selectedUser} 
                      settings={settings} 
                      onRefresh={loadReport}
                    />
                  </motion.div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Empty State */}
        {!report && !loading && !error && (
          <div className="text-center py-20">
            <Database className="w-16 h-16 text-midnight-600 mx-auto mb-4" />
            <h3 className="text-xl text-midnight-300 mb-2">No Data Available</h3>
            <p className="text-midnight-500">
              Upload attendance data using the V2 upload APIs first.
            </p>
          </div>
        )}

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              settings={settings}
              onSave={setSettings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
