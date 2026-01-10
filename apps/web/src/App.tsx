import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AttendanceReport, AttendanceSettings } from '@attendance/shared';
import { DEFAULT_SETTINGS } from '@attendance/shared';
import FileUploader from './components/FileUploader';
import SummaryCards from './components/SummaryCards';
import UserSelector from './components/UserSelector';
import AttendanceTable from './components/AttendanceTable';
import AttendanceChart from './components/AttendanceChart';
import SettingsPanel from './components/SettingsPanel';
import MonthYearPicker from './components/MonthYearPicker';
import Header from './components/Header';

function App() {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleUploadSuccess = (newReport: AttendanceReport) => {
    setReport(newReport);
    if (newReport.users.length > 0) {
      setSelectedUserId(newReport.users[0].userId);
    }
  };

  const handleReset = () => {
    setReport(null);
    setSelectedUserId(null);
  };

  // Filter report data by selected month/year
  const filteredReport = useMemo(() => {
    if (!report) return null;
    
    const filteredUsers = report.users.map(user => {
      const filteredRecords = user.dailyRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
      });

      // Recalculate statistics for filtered records
      let presentDays = 0;
      let absentDays = 0;
      let incompleteDays = 0;
      let totalWorkingMinutes = 0;
      let lateDays = 0;
      let earlyOutDays = 0;
      let overtimeMinutes = 0;

      filteredRecords.forEach(daily => {
        if (daily.status === 'PRESENT') {
          presentDays++;
          totalWorkingMinutes += daily.totalHours * 60 + daily.totalMinutes;
          if (daily.isLate) lateDays++;
          if (daily.isEarlyOut) earlyOutDays++;
          if (daily.overtime > 0) overtimeMinutes += daily.overtime;
        } else if (daily.status === 'ABSENT') {
          absentDays++;
        } else if (daily.status === 'INCOMPLETE') {
          incompleteDays++;
        }
      });

      const totalWorkingHours = Math.floor(totalWorkingMinutes / 60);
      const remainingMinutes = Math.round(totalWorkingMinutes % 60);
      const averageHoursPerDay = presentDays > 0 ? totalWorkingMinutes / 60 / presentDays : 0;

      return {
        ...user,
        dailyRecords: filteredRecords,
        totalDays: filteredRecords.length,
        presentDays,
        absentDays,
        incompleteDays,
        totalWorkingHours,
        totalWorkingMinutes: remainingMinutes,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
        lateDays,
        earlyOutDays,
        overtimeMinutes,
      };
    });

    return {
      ...report,
      users: filteredUsers,
    };
  }, [report, selectedMonth, selectedYear]);

  const selectedUser = filteredReport?.users.find((u) => u.userId === selectedUserId);

  return (
    <div className="min-h-screen bg-midnight-950 bg-grid-pattern">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-midnight-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-pink/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <Header
          onReset={handleReset}
          onSettingsClick={() => setShowSettings(true)}
          hasReport={!!report}
        />

        <AnimatePresence mode="wait">
          {!report ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MonthYearPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onChange={(month, year) => {
                  setSelectedMonth(month);
                  setSelectedYear(year);
                }}
              />
              <FileUploader
                onUploadSuccess={handleUploadSuccess}
                settings={settings}
              />
            </motion.div>
          ) : (
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
                <SummaryCards report={filteredReport!} />
              </motion.div>

              {/* User Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <UserSelector
                  users={filteredReport!.users}
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
                    <AttendanceTable user={selectedUser} settings={settings} />
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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

export default App;
