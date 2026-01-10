import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Users, Calendar } from 'lucide-react';
import type { AttendanceReport, AttendanceSettings } from '@attendance/shared';
import { uploadAttendanceFile } from '../services/api';
import { cn } from '../lib/utils';

interface FileUploaderProps {
  onUploadSuccess: (report: AttendanceReport) => void;
  settings: AttendanceSettings;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function FileUploader({ onUploadSuccess, settings }: FileUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);

  const handleProcessFiles = async () => {
    if (!attendanceFile || !userFile) {
      setError('Both files are required');
      return;
    }

    setUploadState('uploading');
    setError(null);

    try {
      const response = await uploadAttendanceFile(attendanceFile, userFile, settings);
      
      if (response.success && response.report) {
        setUploadState('success');
        setTimeout(() => {
          onUploadSuccess(response.report!);
        }, 500);
      } else {
        throw new Error(response.error || 'Failed to process files');
      }
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const onAttendanceDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.name.toUpperCase().startsWith('C')) {
        setError('Attendance file name must start with "C"');
        return;
      }
      setAttendanceFile(file);
      setError(null);
    }
  }, []);

  const onUserDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.name.toLowerCase().startsWith('user')) {
        setError('User file name must start with "user"');
        return;
      }
      setUserFile(file);
      setError(null);
    }
  }, []);

  const attendanceDropzone = useDropzone({
    onDrop: onAttendanceDrop,
    accept: {
      'application/octet-stream': ['.dat'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'success',
  });

  const userDropzone = useDropzone({
    onDrop: onUserDrop,
    accept: {
      'application/octet-stream': ['.dat'],
    },
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'success',
  });

  const resetUpload = () => {
    setUploadState('idle');
    setError(null);
    setAttendanceFile(null);
    setUserFile(null);
  };

  const isProcessEnabled = attendanceFile && userFile && uploadState === 'idle';

  return (
    <div className="max-w-4xl mx-auto mt-12">
      <AnimatePresence mode="wait">
        {uploadState === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center p-12 rounded-3xl border-2 border-accent-cyan/30 bg-midnight-900/50"
          >
            <div className="p-6 rounded-full bg-midnight-800 border border-accent-cyan/30 mb-6">
              <Loader2 className="w-12 h-12 text-accent-cyan animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-midnight-100 mb-2">
              Processing Files
            </h3>
            <p className="text-midnight-400">
              Analyzing attendance records and mapping user data...
            </p>
          </motion.div>
        )}

        {uploadState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center p-12 rounded-3xl border-2 border-accent-cyan/30 bg-midnight-900/50"
          >
            <div className="p-6 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 mb-6">
              <CheckCircle className="w-12 h-12 text-accent-cyan" />
            </div>
            <h3 className="text-xl font-semibold text-accent-cyan mb-2">
              Upload Successful!
            </h3>
            <p className="text-midnight-400">
              Loading your attendance report...
            </p>
          </motion.div>
        )}

        {(uploadState === 'idle' || uploadState === 'error') && (
          <motion.div
            key="uploader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Dual File Upload Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Attendance File Upload */}
              <div
                {...attendanceDropzone.getRootProps()}
                className={cn(
                  'relative p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group',
                  attendanceDropzone.isDragActive
                    ? 'border-accent-cyan bg-accent-cyan/5 scale-[1.02]'
                    : attendanceFile
                    ? 'border-accent-cyan/50 bg-accent-cyan/5'
                    : 'border-midnight-700 hover:border-midnight-500 bg-midnight-900/50',
                )}
              >
                <input {...attendanceDropzone.getInputProps()} />
                
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    'p-4 rounded-full mb-4 transition-colors',
                    attendanceFile
                      ? 'bg-accent-cyan/10 border border-accent-cyan/30'
                      : 'bg-midnight-800 border border-midnight-700 group-hover:border-accent-cyan/50'
                  )}>
                    <Calendar className={cn(
                      'w-8 h-8 transition-colors',
                      attendanceFile ? 'text-accent-cyan' : 'text-midnight-400 group-hover:text-accent-cyan'
                    )} />
                  </div>
                  
                  <h4 className="text-lg font-semibold text-midnight-100 mb-2">
                    Attendance Data
                  </h4>
                  
                  {attendanceFile ? (
                    <div className="space-y-1">
                      <p className="text-accent-cyan text-sm font-medium">
                        ✓ {attendanceFile.name}
                      </p>
                      <p className="text-midnight-500 text-xs">
                        {(attendanceFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-midnight-400 text-sm mb-3">
                        {attendanceDropzone.isDragActive ? 'Drop file here' : 'Click or drag to upload'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-midnight-500">
                        <FileText className="w-3 h-3" />
                        <span>.dat, .txt, .csv</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* User Data File Upload */}
              <div
                {...userDropzone.getRootProps()}
                className={cn(
                  'relative p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group',
                  userDropzone.isDragActive
                    ? 'border-accent-pink bg-accent-pink/5 scale-[1.02]'
                    : userFile
                    ? 'border-accent-pink/50 bg-accent-pink/5'
                    : 'border-midnight-700 hover:border-midnight-500 bg-midnight-900/50',
                )}
              >
                <input {...userDropzone.getInputProps()} />
                
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    'p-4 rounded-full mb-4 transition-colors',
                    userFile
                      ? 'bg-accent-pink/10 border border-accent-pink/30'
                      : 'bg-midnight-800 border border-midnight-700 group-hover:border-accent-pink/50'
                  )}>
                    <Users className={cn(
                      'w-8 h-8 transition-colors',
                      userFile ? 'text-accent-pink' : 'text-midnight-400 group-hover:text-accent-pink'
                    )} />
                  </div>
                  
                  <h4 className="text-lg font-semibold text-midnight-100 mb-2">
                    User Mapping Data
                  </h4>
                  
                  {userFile ? (
                    <div className="space-y-1">
                      <p className="text-accent-pink text-sm font-medium">
                        ✓ {userFile.name}
                      </p>
                      <p className="text-midnight-500 text-xs">
                        {(userFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-midnight-400 text-sm mb-3">
                        {userDropzone.isDragActive ? 'Drop file here' : 'Click or drag to upload'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-midnight-500">
                        <FileText className="w-3 h-3" />
                        <span>.dat only</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Process Button */}
            <div className="flex flex-col items-center gap-4">
              <motion.button
                onClick={handleProcessFiles}
                disabled={!isProcessEnabled}
                className={cn(
                  'px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300',
                  isProcessEnabled
                    ? 'bg-gradient-to-r from-accent-cyan to-accent-pink text-white hover:shadow-lg hover:shadow-accent-cyan/20 hover:scale-105'
                    : 'bg-midnight-800 text-midnight-500 cursor-not-allowed',
                )}
                whileHover={isProcessEnabled ? { scale: 1.05 } : {}}
                whileTap={isProcessEnabled ? { scale: 0.95 } : {}}
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5" />
                  <span>Process Files</span>
                </div>
              </motion.button>

              {!attendanceFile && !userFile && (
                <p className="text-midnight-500 text-sm">
                  Select both files to continue
                </p>
              )}
              {attendanceFile && !userFile && (
                <p className="text-midnight-400 text-sm">
                  👍 Attendance file selected • Need user mapping file
                </p>
              )}
              {!attendanceFile && userFile && (
                <p className="text-midnight-400 text-sm">
                  👍 User mapping file selected • Need attendance file
                </p>
              )}
            </div>

            {/* Error Display */}
            {uploadState === 'error' && error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-accent-pink/10 border border-accent-pink/30"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-pink flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-accent-pink font-semibold mb-1">Upload Failed</h4>
                    <p className="text-midnight-300 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="px-4 py-1.5 rounded-lg bg-midnight-800 border border-midnight-700 hover:border-accent-pink/50 text-midnight-200 text-sm transition-all"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info text */}
      <p className="text-center text-midnight-500 text-sm mt-6">
        Lokhande's Masala House Payroll @2026
      </p>
    </div>
  );
}
