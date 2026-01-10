import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimePickerModalProps {
  onClose: () => void;
  onSave: (time: string, isManual: boolean) => void;
  initialTime?: string;
}

const ITEM_HEIGHT = 40; // Height of each wheel item in pixels
const LOOPS = 50; // Number of times to repeat the list for "infinite" feel

export default function TimePickerModal({ onClose, onSave, initialTime = '' }: TimePickerModalProps) {
  // Parse initial time
  const parseInitialTime = () => {
    if (!initialTime) {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes();
      const p = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return { 
        h: h.toString().padStart(2, '0'), 
        m: m.toString().padStart(2, '0'), 
        p 
      };
    }
    const [hh, mm] = initialTime.split(':').map(Number);
    let h = hh % 12;
    h = h ? h : 12;
    return {
      h: h.toString().padStart(2, '0'),
      m: mm.toString().padStart(2, '0'),
      p: hh >= 12 ? 'PM' : 'AM'
    };
  };

  const defaults = parseInitialTime();
  const [selectedHour, setSelectedHour] = useState(defaults.h);
  const [selectedMinute, setSelectedMinute] = useState(defaults.m);
  const [selectedPeriod, setSelectedPeriod] = useState(defaults.p);
  const [isManual, setIsManual] = useState(true);

  // Arrays
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const handleSave = () => {
    let hour = parseInt(selectedHour);
    const minute = selectedMinute;
    
    if (selectedPeriod === 'PM' && hour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
    onSave(timeStr, isManual);
    onClose();
  };

  // Wheel Column Component
  const WheelColumn = ({ items, selected, onSelect, infinite = false }: { items: string[], selected: string, onSelect: (v: string) => void, infinite?: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Create the display list. If infinite, repeat LOOPS times.
    const displayItems = infinite ? Array.from({ length: LOOPS }, () => items).flat() : items;
    
    // Calculate initial scroll position
    useEffect(() => {
      if (containerRef.current) {
        // Find the index of the selected item nearest to the center (for infinite)
        let targetIndex = items.indexOf(selected);
        if (infinite) {
           // Offset targetIndex to be in the middle loop set
           targetIndex += Math.floor(LOOPS / 2) * items.length;
        }
        
        containerRef.current.scrollTop = targetIndex * ITEM_HEIGHT;
      }
    }, []); // Run once on mount

    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      
      // Infinite Scroll Logic: Jump when near edges
      if (infinite) {
        const totalHeight = containerRef.current.scrollHeight;
        const singleSetHeight = items.length * ITEM_HEIGHT;
        
        // If we've scrolled too far up (first 10 sets), jump forward
        if (scrollTop < singleSetHeight * 5) {
          containerRef.current.scrollTop = scrollTop + (singleSetHeight * 20); // Jump 20 sets
        }
        // If we've scrolled too far down (last 10 sets), jump backward
        else if (scrollTop > totalHeight - (singleSetHeight * 5)) {
           containerRef.current.scrollTop = scrollTop - (singleSetHeight * 20);
        }
      }
      
      // Determine Selected Item
      const safeIndex = Math.max(0, Math.min(index, displayItems.length - 1));
      const val = displayItems[safeIndex];
      // Only update state if different
      if (val !== selected) {
         onSelect(val);
      }
    };

    return (
       <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[200px] w-full overflow-y-auto scrollbar-hide snap-y snap-mandatory relative z-10"
       >
         <div className="h-[80px]" /> {/* Top Spacer (2 items * 40px) */}
         {displayItems.map((item, i) => (
           <div 
             key={i} 
             className={cn(
               "h-[40px] flex items-center justify-center snap-center text-lg transition-all duration-200 cursor-pointer select-none",
               item === selected ? "font-bold text-white scale-110" : "text-midnight-500 font-medium"
             )}
             onClick={() => {
                // Click to center functionality
                if(containerRef.current) {
                   containerRef.current.scrollTo({
                      top: i * ITEM_HEIGHT,
                      behavior: 'smooth'
                   });
                }
             }}
           >
             {item}
           </div>
         ))}
         <div className="h-[80px]" /> {/* Bottom Spacer */}
       </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 shrink-0">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Select Time
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-midnight-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wheel Picker Area */}
        <div className="relative h-[240px] w-full bg-midnight-950/30 flex justify-center items-center overflow-hidden">
             {/* Center Pointer Indicator */}
             <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[40px] bg-accent-cyan/10 border-y border-accent-cyan/30 pointer-events-none z-0 flex items-center justify-between px-4">
                <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_#00f5d4]"></div>
                <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_#00f5d4]"></div>
             </div>
             
             {/* Gradient Overlays for depth */}
             <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-midnight-900 to-transparent pointer-events-none z-20" />
             <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-midnight-900 to-transparent pointer-events-none z-20" />

             <div className="flex w-full px-8 gap-4 z-10 relative">
                 <div className="flex-1 text-center relative">
                    <WheelColumn items={hours} selected={selectedHour} onSelect={setSelectedHour} infinite={true} />
                 </div>
                 <div className="text-white text-2xl font-bold self-center pb-2">:</div>
                 <div className="flex-1 text-center relative">
                    <WheelColumn items={minutes} selected={selectedMinute} onSelect={setSelectedMinute} infinite={true} />
                 </div>
                 <div className="flex-1 text-center relative">
                    <WheelColumn items={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} infinite={false} />
                 </div>
             </div>
        </div>
        
        {/* Preview and Options */}
        <div className="py-4 px-6 bg-midnight-900/50 flex flex-col gap-4">
           {/* Time Display */}
           <div className="text-center">
             <span className="text-sm text-midnight-400 font-medium">Selected Time</span>
             <div className="text-3xl font-mono font-bold text-accent-cyan mt-1 drop-shadow-[0_0_10px_rgba(0,245,212,0.3)]">
               {selectedHour}:{selectedMinute} <span className="text-sm align-top ml-1">{selectedPeriod}</span>
             </div>
           </div>

           {/* Manual Checkbox */}
           <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <input 
                  type="checkbox" 
                  checked={isManual} 
                  onChange={(e) => setIsManual(e.target.checked)}
                  className="w-4 h-4 rounded border-midnight-400 bg-midnight-950/50 text-accent-cyan focus:ring-accent-cyan/50 cursor-pointer accent-accent-cyan"
                />
                <span className={cn("text-sm font-medium transition-colors", isManual ? "text-accent-cyan" : "text-midnight-400 group-hover:text-midnight-200")}>
                  Mark as Manual Entry
                </span>
              </label>
              <p className="text-[10px] text-midnight-500 text-center leading-tight max-w-[200px]">
                {isManual 
                  ? "Flagged as manually edited punch" 
                  : "Recorded as verified biometric punch"}
              </p>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/5 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-midnight-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-cyan text-midnight-950 hover:bg-accent-cyan/90 transition-colors shadow-[0_0_20px_rgba(0,245,212,0.2)] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save Punch
          </button>
        </div>
      </div>
    </div>
  );
}
