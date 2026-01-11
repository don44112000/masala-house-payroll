import { motion } from 'framer-motion';
import { Settings, Zap, ArrowLeftRight, Database, Home } from 'lucide-react';

interface HeaderProps {
  onHome: () => void;
  onSettingsClick: () => void;
  mode?: 'memory' | 'database';
  onSwitchMode?: () => void;
}

export default function Header({ 
  onHome, 
  onSettingsClick, 
  mode = 'memory', 
  onSwitchMode,
}: HeaderProps) {
  const buttonClass = `flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 group font-medium text-sm`;
  
  const getThemeClass = (isHovered: boolean) => {
    if (mode === 'memory') {
      return isHovered 
        ? 'bg-midnight-800/50 border-accent-cyan/50 text-accent-cyan' 
        : 'bg-midnight-800/50 border-midnight-700 text-midnight-300 hover:text-accent-cyan';
    } else {
      return isHovered
        ? 'bg-midnight-800/50 border-emerald-500/50 text-emerald-400'
        : 'bg-midnight-800/50 border-midnight-700 text-midnight-300 hover:text-emerald-400';
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-8"
    >
      <div className="flex items-center gap-6">
        <img 
          src="/logo.png" 
          alt="Lokhande's Masala House" 
          className="w-24 h-24 object-contain drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform"
          onClick={onHome}
        /> 
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-4xl font-bold font-display text-white tracking-tight">
              Lokhande's Masala House
            </h1>
            {/* Mode Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                mode === 'memory'
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {mode === 'memory' ? <Zap className="w-4 h-4" /> : <Database className="w-4 h-4" />}
              {mode === 'memory' ? 'In-Memory' : 'Database'}
            </motion.span>
          </div>
          <p className="text-midnight-400 text-base font-medium tracking-wide">
            Attendance & Payroll Management System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Home Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onHome}
          className={`${buttonClass} ${getThemeClass(false)}`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </motion.button>

        {/* Switch Mode Button */}
        {onSwitchMode && (
          <motion.button
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
            onClick={onSwitchMode}
            className={`${buttonClass} ${getThemeClass(false)}`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Switch</span>
          </motion.button>
        )}
        
        {/* Settings Button */}
        <motion.button
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
          onClick={onSettingsClick}
          className={`${buttonClass} ${getThemeClass(false)}`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </motion.button>
      </div>
    </motion.header>
  );
}

