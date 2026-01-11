import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Clock, Calendar, Calculator, IndianRupee, Minus, Plus, Equal, CheckCircle, XCircle, AlertCircle, FileText, Download, Loader2 } from 'lucide-react';
import type { UserAttendanceSummary } from '@attendance/shared';
import { generatePayoutReport } from '../services/api';
import axios from 'axios';

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:3001";

interface PayoutModalProps {
  user: UserAttendanceSummary;
  dateRange: {
    from: string;
    to: string;
  };
  onClose: () => void;
}

export default function PayoutModal({ user, dateRange, onClose }: PayoutModalProps) {
  const [hourlySalary, setHourlySalary] = useState<string>('');
  const [compDaySalary, setCompDaySalary] = useState<string>('');
  const [bonus, setBonus] = useState<string>('');
  const [dues, setDues] = useState<string>('');
  
  // Report preview state
  const [showReport, setShowReport] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportFilename, setReportFilename] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total hours as decimal
  const totalHoursDecimal = useMemo(() => {
    return user.totalWorkingHours + (user.totalWorkingMinutes / 60);
  }, [user.totalWorkingHours, user.totalWorkingMinutes]);

  // Get comp day dates formatted
  const compDayDates = useMemo(() => {
    return user.dailyRecords
      .filter(record => record.status === 'COMP')
      .map(record => {
        const date = new Date(record.date);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        return `${day} ${dayNum}`;
      });
  }, [user.dailyRecords]);

  // Calculate payout
  const calculation = useMemo(() => {
    const hourlyRate = parseFloat(hourlySalary) || 0;
    const compRate = parseFloat(compDaySalary) || 0;
    const bonusAmount = parseFloat(bonus) || 0;
    const deductions = parseFloat(dues) || 0;

    const hoursEarning = totalHoursDecimal * hourlyRate;
    const compEarning = user.compDays * compRate;
    const totalPayout = hoursEarning + compEarning + bonusAmount - deductions;

    return {
      hoursEarning,
      compEarning,
      bonusAmount,
      deductions,
      totalPayout,
    };
  }, [hourlySalary, compDaySalary, bonus, dues, totalHoursDecimal, user.compDays]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateRange = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPayoutReportParams = () => ({
    userId: user.userId,
    userName: user.userName || `User ${user.userId}`,
    dailyRecords: user.dailyRecords,
    dateRange,
    summary: {
      totalHours: `${user.totalWorkingHours}h ${String(user.totalWorkingMinutes).padStart(2, '0')}m`,
      avgHours: String(user.averageHoursPerDay),
      presentDays: user.presentDays,
      absentDays: user.absentDays,
      incompleteDays: user.incompleteDays,
      totalDays: user.totalDays,
      compDays: user.compDays,
    },
    payout: {
      hourlySalary: parseFloat(hourlySalary) || 0,
      compDaySalary: parseFloat(compDaySalary) || 0,
      bonus: parseFloat(bonus) || 0,
      dues: parseFloat(dues) || 0,
      totalHoursDecimal,
      hoursEarning: calculation.hoursEarning,
      compEarning: calculation.compEarning,
      totalPayout: calculation.totalPayout,
      compDayDates,
    },
  });

  const handleDone = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await generatePayoutReport(getPayoutReportParams());
      
      setReportHtml(response.html);
      setReportFilename(response.filename);
      setShowReport(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const params = getPayoutReportParams();
      
      const response = await axios.post(`${API_BASE}/attendance/report/payout-pdf`, params, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = reportFilename.replace(/\.html$/i, '.pdf');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Show report preview
  if (showReport && reportHtml) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowReport(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl h-[85vh] bg-midnight-900 rounded-2xl shadow-2xl overflow-hidden border border-midnight-700/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-midnight-800/50 border-b border-midnight-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-midnight-100">
                    Payout Report Preview
                  </h2>
                  <p className="text-sm text-midnight-400">
                    {user.userName || `User ${user.userId}`} — {reportFilename}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloading ? 'Generating PDF...' : 'Download'}
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-midnight-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100%-72px)] overflow-hidden">
              <iframe
                srcDoc={reportHtml}
                title="Payout Report"
                className="w-full h-full bg-white"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10">
                <Wallet className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Payout Calculator
                </h2>
                <p className="text-xs text-midnight-400 mt-0.5">
                  {formatDateRange(dateRange.from)} — {formatDateRange(dateRange.to)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-midnight-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            
            {/* Employee Info Card */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-midnight-600 to-midnight-800 flex items-center justify-center text-white font-semibold text-base border border-white/10">
                  {(user.userName || `U${user.userId}`).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">
                    {user.userName || `User ${user.userId}`}
                  </h3>
                  <p className="text-xs text-midnight-400">ID: {user.userId}</p>
                </div>
              </div>

              {/* Stats Grid - Muted colors */}
              <div className="grid grid-cols-5 gap-2">
                {/* Total Hours */}
                <div className="bg-midnight-900/50 rounded-lg p-2.5 text-center border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-midnight-400 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-white">{user.totalWorkingHours} h {String(user.totalWorkingMinutes).padStart(2, '0')} m</p>
                  <p className="text-[10px] text-midnight-400 mt-0.5">{totalHoursDecimal.toFixed(1)} hrs</p>
                </div>
                
                {/* Present */}
                <div className="bg-midnight-900/50 rounded-lg p-2.5 text-center border border-white/5">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-500/70 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-teal-400/80">{user.presentDays}</p>
                  <p className="text-[10px] text-midnight-500 mt-0.5">Present</p>
                </div>
                
                {/* Absent */}
                <div className="bg-midnight-900/50 rounded-lg p-2.5 text-center border border-white/5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500/60 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-rose-400/70">{user.absentDays}</p>
                  <p className="text-[10px] text-midnight-500 mt-0.5">Absent</p>
                </div>
                
                {/* Comp Off */}
                <div className="bg-midnight-900/50 rounded-lg p-2.5 text-center border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500/60 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-amber-400/70">{user.compDays}</p>
                  <p className="text-[10px] text-midnight-500 mt-0.5">Comp</p>
                </div>
                
                {/* Incomplete */}
                <div className="bg-midnight-900/50 rounded-lg p-2.5 text-center border border-white/5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500/60 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-orange-400/70">{user.incompleteDays}</p>
                  <p className="text-[10px] text-midnight-500 mt-0.5">Incomplete</p>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-midnight-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5" />
                Salary Configuration
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Hourly Salary */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <label className="block text-[10px] font-medium text-midnight-400 mb-1.5 uppercase tracking-wide">Hourly Salary</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-midnight-500">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hourlySalary}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setHourlySalary(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-midnight-950/50 border border-white/10 rounded-lg text-white placeholder-midnight-600 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30 focus:border-accent-cyan/30 transition-all text-base font-medium"
                    />
                  </div>
                </div>

                {/* Comp Day Salary */}
                <div className="bg-white/5 rounded-xl p-3 border border-amber-500/10">
                  <label className="block text-[10px] font-medium text-amber-400/60 mb-1.5 uppercase tracking-wide">Comp Day Salary</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/50">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={compDaySalary}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setCompDaySalary(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-midnight-950/50 border border-amber-500/20 rounded-lg text-white placeholder-midnight-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all text-base font-medium"
                    />
                  </div>
                </div>

                {/* Bonus */}
                <div className="bg-white/5 rounded-xl p-3 border border-teal-500/10">
                  <label className="block text-[10px] font-medium text-teal-400/60 mb-1.5 uppercase tracking-wide">Bonus / Additions</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500/50">
                      <Plus className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bonus}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setBonus(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-midnight-950/50 border border-teal-500/20 rounded-lg text-white placeholder-midnight-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 focus:border-teal-500/30 transition-all text-base font-medium"
                    />
                  </div>
                </div>

                {/* Dues */}
                <div className="bg-white/5 rounded-xl p-3 border border-rose-500/10">
                  <label className="block text-[10px] font-medium text-rose-400/60 mb-1.5 uppercase tracking-wide">Dues / Deductions</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50">
                      <Minus className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dues}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setDues(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-midnight-950/50 border border-rose-500/20 rounded-lg text-white placeholder-midnight-600 focus:outline-none focus:ring-1 focus:ring-rose-500/30 focus:border-rose-500/30 transition-all text-base font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="bg-midnight-900/50 rounded-xl p-4 border border-white/5">
              <h3 className="text-xs font-medium text-midnight-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Equal className="w-3.5 h-3.5" />
                Payout Breakdown
              </h3>
              
              <div className="space-y-2 text-sm">
                {/* Hours Earning */}
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-midnight-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5 text-midnight-400" />
                    </span>
                    <span className="text-midnight-400 text-xs">({totalHoursDecimal.toFixed(1)} hrs × ₹{parseFloat(hourlySalary) || 0})</span>
                  </span>
                  <span className="font-mono font-medium text-white">{formatCurrency(calculation.hoursEarning)}</span>
                </div>
                
                {/* Comp Days - Only show if comp days exist */}
                {user.compDays > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-midnight-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-amber-400/70" />
                      </span>
                      <span className="text-amber-400/60 text-xs">
                        ({user.compDays} comp × ₹{parseFloat(compDaySalary) || 0})
                      </span>
                    </span>
                    <span className="font-mono font-medium text-amber-400/80">{formatCurrency(calculation.compEarning)}</span>
                  </div>
                )}
                
                {/* Bonus */}
                {calculation.bonusAmount > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-midnight-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-teal-500/10 flex items-center justify-center">
                        <Plus className="w-2.5 h-2.5 text-teal-400/70" />
                      </span>
                      Bonus / Additions
                    </span>
                    <span className="font-mono font-medium text-teal-400/80">+{formatCurrency(calculation.bonusAmount)}</span>
                  </div>
                )}
                
                {/* Deductions */}
                {calculation.deductions > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-midnight-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center">
                        <Minus className="w-2.5 h-2.5 text-rose-400/70" />
                      </span>
                      Dues / Deductions
                    </span>
                    <span className="font-mono font-medium text-rose-400/70">-{formatCurrency(calculation.deductions)}</span>
                  </div>
                )}
                
                {/* Total */}
                <div className="pt-3 mt-2">
                  <div className="flex items-center justify-between bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg p-3">
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-accent-cyan" />
                      Total Payout
                    </span>
                    <span className={`text-xl font-bold font-mono ${calculation.totalPayout >= 0 ? 'text-accent-cyan' : 'text-rose-400'}`}>
                      {formatCurrency(calculation.totalPayout)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-white/5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-midnight-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-cyan text-midnight-950 hover:bg-accent-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Done'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
