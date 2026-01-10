import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import type { UserAttendanceSummary } from '@attendance/shared';
import { generateHtmlReport, generatePdfReport } from '../services/api';

interface ReportPreviewProps {
  user: UserAttendanceSummary;
  dateRange: {
    from: string;
    to: string;
  };
  onClose: () => void;
}

export default function ReportPreview({ user, dateRange, onClose }: ReportPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate HTML report for preview on mount
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await generateHtmlReport({
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
        });
        setHtml(response.html);
        setFilename(response.filename);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to generate report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [user, dateRange]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, filename: pdfFilename } = await generatePdfReport({
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
      });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFilename;
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight-950/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
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
              <div className="p-2 rounded-lg bg-accent-cyan/10">
                <FileText className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-midnight-100">
                  Attendance Report Preview
                </h2>
                <p className="text-sm text-midnight-400">
                  {user.userName || `User ${user.userId}`} — {filename || 'Generating...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={loading || downloading || !!error}
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
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-midnight-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-72px)] overflow-hidden">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-midnight-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Generating report...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full text-accent-pink">
                <p className="text-lg mb-2">Failed to generate report</p>
                <p className="text-sm text-midnight-400">{error}</p>
              </div>
            )}

            {html && !loading && !error && (
              <iframe
                id="report-iframe"
                srcDoc={html}
                title="Attendance Report"
                className="w-full h-full bg-white"
                sandbox="allow-same-origin allow-scripts"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
