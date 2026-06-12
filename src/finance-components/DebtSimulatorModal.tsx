import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DebtSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExtraPayment: number;
  onApply: (newExtraPayment: number) => void;
  baselineData: { months: number; interest: number };
  simulatedData: { months: number; interest: number };
}

const DebtSimulatorModal: React.FC<DebtSimulatorModalProps> = ({ 
  isOpen, 
  onClose, 
  currentExtraPayment, 
  onApply,
  baselineData,
  simulatedData
}) => {
  const [sliderValue, setSliderValue] = useState(currentExtraPayment);

  useEffect(() => {
    if (isOpen) {
      setSliderValue(currentExtraPayment);
    }
  }, [isOpen, currentExtraPayment]);

  const handleApply = () => {
    onApply(sliderValue);
    onClose();
  };

  const monthsSaved = Math.max(0, baselineData.months - simulatedData.months);
  const interestSaved = Math.max(0, baselineData.interest - simulatedData.interest);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-xl bg-white dark:bg-[#191c1e] rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <div>
                <h3 className="text-xl font-bold text-blue-950 dark:text-white font-headline flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">speed</span>
                  Simulator Kebebasan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Lihat seberapa cepat Anda bisa bebas utang dengan dana tambahan.
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 lg:p-8 space-y-8">
              {/* Impact Highlights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 dark:bg-[#a7c8ff]/10 p-4 rounded-2xl border border-primary/10 dark:border-[#a7c8ff]/20">
                  <div className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] tracking-widest uppercase mb-1">Lebih Cepat</div>
                  <div className="font-headline text-3xl font-extrabold text-blue-950 dark:text-white">
                    {monthsSaved} <span className="text-base font-semibold text-slate-500 dark:text-slate-400">Bln</span>
                  </div>
                </div>
                <div className="bg-tertiary-container/20 dark:bg-[#95d4b3]/10 p-4 rounded-2xl border border-tertiary-container dark:border-[#95d4b3]/20">
                  <div className="text-[10px] font-bold text-tertiary-fixed-dim dark:text-[#95d4b3] tracking-widest uppercase mb-1">Bunga Terselamatkan</div>
                  <div className="font-headline text-2xl lg:text-3xl font-extrabold text-blue-950 dark:text-white tabular-nums drop-shadow-sm">
                    Rp {interestSaved >= 1000000 ? (interestSaved / 1000000).toFixed(1) + ' Jt' : interestSaved.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Slider Control */}
              <div className="space-y-6 pt-4">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tambahan Cicilan (Per Bulan)</label>
                  <div className="font-headline text-2xl font-bold text-primary dark:text-[#a7c8ff] tabular-nums bg-slate-50 dark:bg-white/5 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                    Rp {sliderValue.toLocaleString('id-ID')}
                  </div>
                </div>
                
                <div className="relative pt-6 pb-2">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary dark:bg-[#a7c8ff] rounded-full transition-all duration-100 ease-out" 
                    style={{ width: `${(sliderValue / 20000000) * 100}%` }} 
                  />
                  <input
                    type="range"
                    min="0"
                    max="20000000"
                    step="100000"
                    value={sliderValue}
                    onChange={(e) => {
                      setSliderValue(parseInt(e.target.value));
                      onApply(parseInt(e.target.value)); // Real-time feedback
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-primary dark:border-[#a7c8ff] rounded-full shadow-md pointer-events-none transition-all duration-100 ease-out"
                    style={{ left: `calc(${(sliderValue / 20000000) * 100}% - 12px)` }}
                  >
                    <div className="absolute inset-1.5 bg-primary dark:bg-[#a7c8ff] rounded-full" />
                  </div>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Rp 0</span>
                  <span>Maksimal Efektif (Rp 20 Jt)</span>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-[#191c1e] border-t border-slate-100 dark:border-white/5 flex gap-3">
               <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleApply}
                  className="flex-[2] bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#003061] px-4 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Terapkan Tambahan Rp {sliderValue.toLocaleString('id-ID')}
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DebtSimulatorModal;
