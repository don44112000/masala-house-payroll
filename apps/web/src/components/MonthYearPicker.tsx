import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface MonthYearPickerProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onChange: (month: number, year: number) => void;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthYearPicker({
  selectedMonth,
  selectedYear,
  onChange,
  className,
}: MonthYearPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onChange(11, selectedYear - 1);
    } else {
      onChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onChange(0, selectedYear + 1);
    } else {
      onChange(selectedMonth + 1, selectedYear);
    }
  };

  const getPrevMonth = () => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    return { month: MONTHS[prevMonth], year: prevYear };
  };

  const getNextMonth = () => {
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    return { month: MONTHS[nextMonth], year: nextYear };
  };

  const prev = getPrevMonth();
  const next = getNextMonth();

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Carousel View */}
      <motion.div
        className="glass rounded-2xl p-4 transition-all duration-300 ease-in-out"
        /* Removed 'layout' prop to prevent conflicts with height animation */
      >
        {!isExpanded ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-4"
          >
            {/* Previous Month */}
            <button
              onClick={handlePrevMonth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight-900/50 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-400 hover:text-midnight-200 transition-all group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm">{prev.month.slice(0, 3)}</span>
            </button>

            {/* Current Month (Center) */}
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-br from-accent-cyan/10 to-accent-pink/10 border border-accent-cyan/20">
                <Calendar className="w-5 h-5 text-accent-cyan" />
                <div className="text-center">
                  <p className="text-xl font-semibold text-midnight-100">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Month */}
            <button
              onClick={handleNextMonth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight-900/50 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-400 hover:text-midnight-200 transition-all group"
            >
              <span className="text-sm">{next.month.slice(0, 3)}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        ) : null}

        {/* Expand/Collapse Button */}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-midnight-400 hover:text-accent-cyan transition-colors group"
          >
            <span>{isExpanded ? 'Show Less' : 'More Options'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            )}
          </button>
        </div>

        {/* Expanded View */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-midnight-800">
                {/* Year Selector */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => onChange(selectedMonth, selectedYear - 1)}
                    className="p-2 rounded-lg bg-midnight-900 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-400 hover:text-midnight-200 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold text-midnight-100 min-w-[100px] text-center">
                    {selectedYear}
                  </span>
                  <button
                    onClick={() => onChange(selectedMonth, selectedYear + 1)}
                    className="p-2 rounded-lg bg-midnight-900 border border-midnight-700 hover:border-accent-cyan/50 text-midnight-400 hover:text-midnight-200 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => onChange(index, selectedYear)}
                      className={cn(
                        'px-4 py-3 rounded-xl text-sm font-medium transition-all',
                        index === selectedMonth
                          ? 'bg-accent-cyan text-midnight-950'
                          : 'bg-midnight-900 border border-midnight-700 text-midnight-300 hover:border-accent-cyan/50 hover:text-midnight-100'
                      )}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
