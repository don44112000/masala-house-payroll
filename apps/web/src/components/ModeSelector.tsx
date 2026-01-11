import { motion } from 'framer-motion';
import { Zap, Database, ArrowRight, Cloud, HardDrive } from 'lucide-react';

interface ModeSelectorProps {
  onSelectMode: (mode: 'memory' | 'database') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center">


      {/* Mode Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full px-4">
        {/* In-Memory Mode Card */}
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onSelectMode('memory')}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-midnight-900/80 to-midnight-950/80 border border-accent-cyan/20 hover:border-accent-cyan/50 transition-all duration-300 text-left overflow-hidden"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent-cyan/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5 border border-accent-cyan/30 group-hover:border-accent-cyan/50 transition-colors">
                <Zap className="w-6 h-6 text-accent-cyan" />
              </div>
              <div className="p-2.5 rounded-xl bg-midnight-800/50 border border-midnight-700">
                <Cloud className="w-4 h-4 text-midnight-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-cyan transition-colors">
              In-Memory Mode
            </h3>
            
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 mb-3">
              <Zap className="w-3 h-3" />
              Quick Processing
            </span>

            {/* Description */}
            <p className="text-sm text-midnight-300 mb-4 leading-relaxed line-clamp-2">
              Process attendance files instantly without database storage. Perfect for quick analysis.
            </p>

            {/* Features */}
            <ul className="space-y-1.5 mb-5">
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-accent-cyan" />
                Instant file processing
              </li>
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-accent-cyan" />
                No database setup needed
              </li>
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-accent-cyan" />
                Upload and analyze immediately
              </li>
            </ul>

            {/* CTA */}
            <div className="flex items-center gap-2 text-sm text-accent-cyan font-medium group-hover:gap-3 transition-all">
              <span>Start Processing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.button>

        {/* Database Mode Card */}
        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onSelectMode('database')}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-midnight-900/80 to-midnight-950/80 border border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 text-left overflow-hidden"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 group-hover:border-emerald-500/50 transition-colors">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="p-2.5 rounded-xl bg-midnight-800/50 border border-midnight-700">
                <HardDrive className="w-4 h-4 text-midnight-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              Database Mode
            </h3>
            
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Database className="w-3 h-3" />
              Persistent Storage
            </span>

            {/* Description */}
            <p className="text-sm text-midnight-300 mb-4 leading-relaxed line-clamp-2">
              Store attendance data in PostgreSQL for long-term tracking and data integrity.
            </p>

            {/* Features */}
            <ul className="space-y-1.5 mb-5">
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Persistent data storage
              </li>
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Track changes over time
              </li>
              <li className="flex items-center gap-2 text-xs text-midnight-400">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Edit and manage records
              </li>
            </ul>

            {/* CTA */}
            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium group-hover:gap-3 transition-all">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Footer Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-sm text-midnight-500 text-center"
      >
        You can switch between modes at any time from the dashboard header
      </motion.p>
    </div>
  );
}
