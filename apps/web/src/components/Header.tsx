import { motion } from 'framer-motion';
import { Settings, RotateCcw } from 'lucide-react';

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
      <div className="flex items-center gap-5">
        <img 
          src="/logo.png" 
          alt="Lokhande's Masala House" 
          className="w-40 h-40 object-contain drop-shadow-2xl"
        /> 
        <div>
          <h1 className="text-4xl font-bold font-display text-white tracking-tight">
            Lokhande's Masala House
          </h1>
          <p className="text-midnight-300 text-sm mt-1 font-medium tracking-wide">
            Attendance & Payroll Management System
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
