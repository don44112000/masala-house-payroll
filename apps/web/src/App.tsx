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
import V2Dashboard from './components/V2Dashboard';
import ModeSelector from './components/ModeSelector';

type AppMode = 'landing' | 'memory' | 'database';

function App() {
  const [appMode, setAppMode] = useState<AppMode>('landing');
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

  const handleHome = () => {
    setAppMode('landing');
  };

  const handleToggleMode = () => {
    setAppMode(current => current === 'memory' ? 'database' : 'memory');
  };

  const handleReset = () => {
    setReport(null);
    setSelectedUserId(null);
  };

  const handleSelectMode = (mode: 'memory' | 'database') => {
    setAppMode(mode);
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
    <div className="min-h-screen bg-midnight-950 bg-grid-pattern overflow-x-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-midnight-600/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-pink/5 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <AnimatePresence mode="wait">
          {appMode === 'landing' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center gap-4 mb-16 justify-center pt-4 text-center">
                <img 
                  src="/logo.png" 
                  alt="Lokhande's Masala House" 
                  className="w-32 h-32 object-contain drop-shadow-2xl"
                />
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight mb-2">
                    Lokhande's Masala House
                  </h1>
                  <p className="text-midnight-300 text-sm font-medium tracking-wide">
                    Attendance & Payroll Management System
                  </p>
                </div>
              </div>
              <ModeSelector onSelectMode={handleSelectMode} />
            </motion.div>
          ) : appMode === 'database' ? (
            <motion.div
              key="database"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <V2Dashboard 
                onHome={handleHome}
                onSwitchMode={handleToggleMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="memory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Header
                onHome={handleHome}
                onSettingsClick={() => setShowSettings(true)}
                mode="memory"
                onSwitchMode={handleToggleMode}
              />
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
                    className="mb-6"
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
                  {/* Result Toolbar: Picker + New File */}
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
                    <div className="mt-4 md:mt-0 md:absolute md:right-0 md:top-0 md:h-full md:flex md:items-center pointer-events-none">
                      <div className="pointer-events-auto">
                         <motion.button
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           onClick={handleReset}
                           className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-midnight-900/60 border border-midnight-700/50 backdrop-blur-sm hover:border-accent-pink/50 hover:bg-accent-pink/5 hover:shadow-[0_0_15px_-3px_rgba(244,114,182,0.15)] text-midnight-300 transition-all duration-300 group"
                         >
                           <span className="text-sm font-medium group-hover:text-accent-pink transition-colors">
                             New File
                           </span>
                         </motion.button>
                      </div>
                    </div>
                  </div>

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

