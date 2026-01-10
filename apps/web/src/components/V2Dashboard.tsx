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
import { Database, Loader2, RefreshCw, Home } from 'lucide-react';
import { getV2Report } from '../services/api';

interface V2DashboardProps {
  onBack: () => void;
}

export default function V2Dashboard({ onBack }: V2DashboardProps) {
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
    <div className="min-h-screen bg-midnight-950 bg-grid-pattern">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-midnight-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-pink/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-pink/20 border border-accent-cyan/30">
              <Database className="w-8 h-8 text-accent-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-midnight-100">V2 Dashboard</h1>
              <p className="text-sm text-midnight-400">Data from PostgreSQL Database</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight-800 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-200 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>

            <motion.button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 rounded-xl bg-midnight-800 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-200 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Settings
            </motion.button>

            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight-800 border border-midnight-700 hover:border-accent-pink/50 text-midnight-200 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-4 h-4" />
              Back to V1
            </motion.button>
          </div>
        </header>

        {/* Month/Year Picker */}
        <MonthYearPicker
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChange={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
          }}
        />

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
