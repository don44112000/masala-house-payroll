import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Clock, AlertTriangle } from 'lucide-react';
import type { AttendanceSettings } from '@attendance/shared';

interface SettingsPanelProps {
  settings: AttendanceSettings;
  onSave: (settings: AttendanceSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  settings,
  onSave,
  onClose,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const updateSetting = <K extends keyof AttendanceSettings>(
    key: K,
    value: AttendanceSettings[K],
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md glass border-l border-midnight-700 z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-midnight-950/90 backdrop-blur-sm border-b border-midnight-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-midnight-100">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-midnight-800 text-midnight-400 hover:text-midnight-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Work Hours */}
          <section>
            <h3 className="text-sm font-medium text-midnight-300 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Work Hours
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-midnight-400 mb-2">
                  Work Start Time
                </label>
                <input
                  type="time"
                  value={localSettings.workStartTime}
                  onChange={(e) => updateSetting('workStartTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-midnight-900 border border-midnight-700 text-midnight-100 focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-midnight-400 mb-2">
                  Work End Time
                </label>
                <input
                  type="time"
                  value={localSettings.workEndTime}
                  onChange={(e) => updateSetting('workEndTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-midnight-900 border border-midnight-700 text-midnight-100 focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h3 className="text-sm font-medium text-midnight-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Thresholds
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-midnight-400 mb-2">
                  Late Threshold (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={localSettings.lateThresholdMinutes}
                  onChange={(e) =>
                    updateSetting('lateThresholdMinutes', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-4 py-3 rounded-xl bg-midnight-900 border border-midnight-700 text-midnight-100 focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
                <p className="text-xs text-midnight-500 mt-1">
                  Grace period after work start time
                </p>
              </div>
              <div>
                <label className="block text-sm text-midnight-400 mb-2">
                  Early Out Threshold (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={localSettings.earlyOutThresholdMinutes}
                  onChange={(e) =>
                    updateSetting('earlyOutThresholdMinutes', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-4 py-3 rounded-xl bg-midnight-900 border border-midnight-700 text-midnight-100 focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
                <p className="text-xs text-midnight-500 mt-1">
                  Allowed time before work end time
                </p>
              </div>
            </div>
          </section>


        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-midnight-950/90 backdrop-blur-sm border-t border-midnight-800 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-midnight-700 text-midnight-300 hover:bg-midnight-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl bg-accent-cyan text-midnight-950 font-medium hover:bg-accent-cyan/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </>
  );
}
