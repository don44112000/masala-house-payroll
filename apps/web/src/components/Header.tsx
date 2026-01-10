import { motion } from 'framer-motion';
import { Clock, Settings, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  onSettingsClick: () => void;
  hasReport: boolean;
}

export default function Header({ onReset, onSettingsClick, hasReport }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-8"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-midnight-600/20 border border-accent-cyan/30">
          <Clock className="w-8 h-8 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display gradient-text">
            Attendance Processor
          </h1>
          <p className="text-midnight-300 text-sm mt-1">
            Upload your .dat file and analyze attendance data
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {hasReport && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight-800/50 border border-midnight-700 hover:border-accent-pink/50 hover:bg-accent-pink/10 transition-all duration-200 group"
          >
            <RotateCcw className="w-4 h-4 text-midnight-400 group-hover:text-accent-pink transition-colors" />
            <span className="text-sm text-midnight-300 group-hover:text-accent-pink transition-colors">
              New File
            </span>
          </motion.button>
        )}
        
        <button
          onClick={onSettingsClick}
          className="p-3 rounded-xl bg-midnight-800/50 border border-midnight-700 hover:border-midnight-500 hover:bg-midnight-700/50 transition-all duration-200 group"
        >
          <Settings className="w-5 h-5 text-midnight-400 group-hover:text-midnight-200 transition-colors" />
        </button>
      </div>
    </motion.header>
  );
}
