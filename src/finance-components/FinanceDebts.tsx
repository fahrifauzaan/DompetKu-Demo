import React, { useState, useMemo } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { motion, AnimatePresence } from 'motion/react';
import DebtFormModal, { Debt } from './DebtFormModal';
import DebtSimulatorModal from './DebtSimulatorModal';

// interface Debt removed as it is imported from DebtFormModal

interface FinanceDebtsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceDebts: React.FC<FinanceDebtsProps> = ({ onShowCTA, onNavigate }) => {
  const { debts, addDebt, updateDebt, deleteDebt } = useFinanceStore();
  const [strategy, setStrategy] = useState<'minimum' | 'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState(5000000); // 5jt extra per month
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [showActionId, setShowActionId] = useState<string | null>(null);

  const handleSaveDebt = (debt: Debt) => {
    if (editingDebt) {
      updateDebt(debt);
    } else {
      const { id, ...debtWithoutId } = debt;
      addDebt(debtWithoutId);
    }
    setEditingDebt(null);
  };

  const handleDeleteDebt = (id: string) => {
    deleteDebt(id);
    setShowActionId(null);
  };

  const openAddModal = () => {
    setEditingDebt(null);
    setIsModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setIsModalOpen(true);
    setShowActionId(null);
  };

  // --- LOGIKA PERHITUNGAN PELUNASAN ---
  const payoffData = useMemo(() => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    const projection = [];
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360; // Max 30 years

    while (currentDebts.some(d => d.currentBalance > 0) && totalMonths < maxMonths) {
      totalMonths++;
      let monthlyExtra = extraPayment;
      
      // Sort debts based on strategy
      let sortedDebts = [...currentDebts];
      if (strategy === 'snowball') {
        sortedDebts.sort((a, b) => a.currentBalance - b.currentBalance);
      } else if (strategy === 'avalanche') {
        sortedDebts.sort((a, b) => b.interestRate - a.interestRate);
      }

      // 1. Bayar bunga dan cicilan minimum
      sortedDebts = sortedDebts.map(d => {
        if (d.currentBalance <= 0) return d;
        const interest = (d.currentBalance * (d.interestRate / 100)) / 12;
        totalInterestPaid += interest;
        d.currentBalance += interest;
        
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
        return d;
      });

      // 2. Bayar extra payment ke prioritas utama
      for (let i = 0; i < sortedDebts.length; i++) {
        if (sortedDebts[i].currentBalance > 0 && monthlyExtra > 0) {
          const payment = Math.min(sortedDebts[i].currentBalance, monthlyExtra);
          sortedDebts[i].currentBalance -= payment;
          monthlyExtra -= payment;
        }
      }

      currentDebts = sortedDebts;
      const totalBalance = currentDebts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
      projection.push(totalBalance);
    }

    return { projection, totalMonths, totalInterestPaid };
  }, [debts, strategy, extraPayment]);

  // --- LOGIKA PERHITUNGAN BASELINE (Min Payment Only) ---
  const minOnlyData = useMemo(() => {
    let currentDebts = debts.map(d => ({ ...d, currentBalance: d.balance }));
    let totalMonths = 0;
    let totalInterestPaid = 0;
    const maxMonths = 360;

    while (currentDebts.some(d => d.currentBalance > 0) && totalMonths < maxMonths) {
      totalMonths++;
      currentDebts = currentDebts.map(d => {
        if (d.currentBalance <= 0) return d;
        const interest = (d.currentBalance * (d.interestRate / 100)) / 12;
        totalInterestPaid += interest;
        d.currentBalance += interest;
        const payment = Math.min(d.currentBalance, d.minPayment);
        d.currentBalance -= payment;
        return d;
      });
    }
    return { totalMonths, totalInterestPaid };
  }, [debts]);

  const totalCurrentBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const avgInterest = debts.length > 0 ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length : 0;

  const generatePath = (data: number[]) => {
    if (data.length === 0) return "";
    const width = 800;
    const height = 200;
    const maxVal = Math.max(...data, totalCurrentBalance);
    
    let path = `M 0 ${height - (data[0] / maxVal) * height}`;
    const step = width / (data.length - 1);
    
    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = height - (data[i] / maxVal) * height;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  const currentPath = generatePath(payoffData.projection);
  const payoffYear = new Date().getFullYear() + Math.floor(payoffData.totalMonths / 12);
  const payoffMonth = new Date().toLocaleString('id-ID', { month: 'short' }) + " " + payoffYear;
  
  const minYear = new Date().getFullYear() + Math.floor(minOnlyData.totalMonths / 12);
  const minMonth = new Date().toLocaleString('id-ID', { month: 'short' }) + " " + minYear;
  
  const interestSaved = minOnlyData.totalInterestPaid - payoffData.totalInterestPaid;
  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500">
      {/* Page Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <span className="text-on-surface-variant dark:text-outline font-semibold tracking-widest text-[10px] sm:text-xs uppercase">Pusat Strategi</span>
          <h2 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface dark:text-white mt-1">Rencana Pelunasan Utang</h2>
          <p className="text-on-surface-variant dark:text-outline mt-2 max-w-lg text-sm lg:text-base font-medium">Optimalkan struktur pembayaran Anda untuk meminimalkan bunga dan mempercepat jalan menuju kebebasan finansial.</p>
        </div>
        <div className="flex gap-4 lg:gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-outline-variant/20 dark:border-white/10 pt-4 md:pt-0">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-on-surface-variant dark:text-outline text-[10px] lg:text-xs font-bold uppercase tracking-wider">Total Liabilitas</span>
            <span className="font-headline text-2xl lg:text-3xl font-extrabold text-on-surface dark:text-white tabular-nums">Rp {totalCurrentBalance.toLocaleString('id-ID')}</span>
          </div>
          <div className="w-px h-12 bg-outline-variant dark:bg-white/20 opacity-20 hidden md:block"></div>
          <div className="flex flex-col items-end">
            <span className="text-on-surface-variant dark:text-outline text-[10px] lg:text-xs font-bold uppercase tracking-wider">Rata-rata Bunga</span>
            <span className="font-headline text-2xl lg:text-3xl font-extrabold text-primary-container dark:text-[#a7c8ff] tabular-nums">{avgInterest.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Bento Grid / Celebratory State */}
      {debts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center border border-outline-variant/10 dark:border-white/10 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest dark:from-white/[0.03] dark:via-white/[0.01] dark:to-transparent shadow-xl flex flex-col items-center justify-center min-h-[450px]"
        >
          {/* Decorative Glowing Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-amber-500/10 blur-[80px] pointer-events-none" />
          
          {/* Animated Medal Badge Icon */}
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: [0.5, 1.1, 1], rotate: [0, 15, 0] }}
            transition={{ duration: 1.2, ease: "backOut" }}
            className="relative mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 dark:from-[#34d399] dark:to-[#059669] flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
              <span className="material-symbols-outlined text-[3.5rem] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            {/* Soft glowing ring behind icon */}
            <div className="absolute inset-[-10px] rounded-full bg-emerald-500/20 dark:bg-[#34d399]/20 blur-md animate-pulse pointer-events-none" />
          </motion.div>

          <h3 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-3">Selamat! Anda Bebas dari Utang 🎉</h3>
          <p className="text-on-surface-variant dark:text-outline max-w-xl text-sm md:text-base font-medium leading-relaxed mb-8">
            Luar biasa! Saat ini Anda tidak memiliki kewajiban utang aktif. Ini merupakan pencapaian finansial yang luar biasa dan fondasi kokoh untuk mempercepat kemerdekaan finansial Anda.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-10 relative z-10">
            <div className="bg-surface-container-high/50 dark:bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-outline-variant/10 dark:border-white/5 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider block mb-1">Rasio Utang / Aset</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-[#34d399] font-headline">0% (Sehat Walafiat)</span>
            </div>
            <div className="bg-surface-container-high/50 dark:bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-outline-variant/10 dark:border-white/5 text-center">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider block mb-1">Kekuatan Bersih</span>
              <span className="text-xl font-extrabold text-primary dark:text-[#a7c8ff] font-headline">100% Ekuitas Mandiri</span>
            </div>
          </div>

          {/* Call to action to add debt */}
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wider uppercase rounded-xl transition-all duration-300 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 bg-primary dark:bg-[#a7c8ff] text-on-primary dark:text-[#003060] hover:brightness-105 active:scale-95 relative z-10"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Catat Liabilitas / Utang Baru
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Strategy & Projection */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
            {/* Payoff Strategy Toggle */}
            <div className="bg-surface-container-lowest dark:bg-transparent p-6 rounded-2xl shadow-sm border border-outline-variant/10 dark:border-white/10">
              <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2 dark:text-white">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                Strategi Pembayaran
              </h3>
              <div className="space-y-3">
                <label onClick={() => setStrategy('minimum')} className={`flex items-center p-3 sm:p-4 rounded-xl border transition-colors cursor-pointer group ${strategy === 'minimum' ? 'bg-primary-container/5 dark:bg-[#a7c8ff]/10 border-primary-container/20 dark:border-[#a7c8ff]/30' : 'border-transparent hover:bg-surface-container-low dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'minimum'} className="w-4 h-4 text-primary focus:ring-primary border-outline dark:border-white/30 rounded-full" name="strategy" type="radio" value="minimum" />
                  <div className="ml-4">
                    <div className="font-bold text-sm dark:text-white">Cicilan Minimum</div>
                    <div className="text-[10px] sm:text-xs text-on-surface-variant dark:text-outline font-medium">Jadwal pembayaran standar</div>
                  </div>
                  {strategy === 'minimum' && <span className="ml-auto material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">check_circle</span>}
                </label>

                <label onClick={() => setStrategy('snowball')} className={`flex items-center p-3 sm:p-4 rounded-xl border transition-colors cursor-pointer group ${strategy === 'snowball' ? 'bg-primary-container/5 dark:bg-[#a7c8ff]/10 border-primary-container/20 dark:border-[#a7c8ff]/30' : 'border-transparent hover:bg-surface-container-low dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'snowball'} className="w-4 h-4 text-primary dark:text-[#a7c8ff] focus:ring-primary border-outline" name="strategy" type="radio" value="snowball" />
                  <div className="ml-4">
                    <div className="font-bold text-sm dark:text-white">Saldo Terkecil (Snowball)</div>
                    <div className="text-[10px] sm:text-xs text-on-surface-variant dark:text-outline font-medium">Fokus psikologis, lunas lebih cepat</div>
                  </div>
                  {strategy === 'snowball' && <span className="ml-auto material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">check_circle</span>}
                </label>

                <label onClick={() => setStrategy('avalanche')} className={`flex items-center p-3 sm:p-4 rounded-xl border transition-colors cursor-pointer group ${strategy === 'avalanche' ? 'bg-primary-container/5 dark:bg-[#a7c8ff]/10 border-primary-container/20 dark:border-[#a7c8ff]/30' : 'border-transparent hover:bg-surface-container-low dark:hover:bg-white/5'}`}>
                  <input readOnly checked={strategy === 'avalanche'} className="w-4 h-4 text-primary focus:ring-primary border-outline dark:border-white/30 rounded-full" name="strategy" type="radio" value="avalanche" />
                  <div className="ml-4">
                    <div className="font-bold text-sm dark:text-white">Bunga Tertinggi (Avalanche)</div>
                    <div className="text-[10px] sm:text-xs text-on-surface-variant dark:text-outline font-medium">Efisiensi maksimal, bunga lebih rendah</div>
                  </div>
                  {strategy === 'avalanche' && <span className="ml-auto material-symbols-outlined text-primary dark:text-[#a7c8ff] text-lg">check_circle</span>}
                </label>
              </div>
            </div>

            {/* Comparison View Card */}
            <div className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-6 lg:p-8 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="relative z-10">
                <h3 className="font-headline font-bold text-lg mb-6 opacity-90">Perbandingan Proyeksi</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] lg:text-xs font-bold opacity-70 tracking-wide">Minimal Saja</span>
                      <span className="font-headline font-bold text-sm lg:text-base">{minMonth}</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/30 w-full rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] lg:text-xs font-bold text-tertiary-fixed tracking-wide">Metode {strategy.charAt(0).toUpperCase() + strategy.slice(1)}</span>
                      <span className="font-headline font-bold text-tertiary-fixed text-sm lg:text-base">{payoffMonth}</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-tertiary-fixed-dim/20"></div>
                      <motion.div 
                        animate={{ width: `${(payoffData.totalMonths / minOnlyData.totalMonths) * 100}%` }}
                        className="h-full bg-tertiary-fixed-dim rounded-full relative z-10 shadow-[0_0_10px_rgba(149,212,179,0.5)]"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="text-[10px] lg:text-xs font-bold opacity-80 uppercase tracking-widest">Estimasi Penghematan Bunga</div>
                  <div className="text-3xl font-bold font-headline mt-2 text-tertiary-fixed tabular-nums drop-shadow-sm">
                    Rp {interestSaved > 0 ? interestSaved.toLocaleString('id-ID') : '0'}
                  </div>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-[150px]">trending_down</span>
              </div>
            </div>
          </div>

          {/* Right Column: Data Visualization & Debt List */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            
            {/* Debt Reduction Chart Area */}
            <div className="bg-surface-container-lowest dark:bg-transparent p-6 lg:p-8 rounded-2xl shadow-sm border border-outline-variant/10 dark:border-white/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <h3 className="font-headline font-bold text-xl dark:text-white">Proyeksi Pengurangan Utang</h3>
                <div className="flex items-center gap-4 text-xs font-bold text-on-surface-variant dark:text-outline">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary dark:bg-[#a7c8ff] shadow-sm"></span>
                    Total Utang
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-outline-variant dark:border-white/30 bg-transparent"></span>
                    Pokok Saja
                  </div>
                </div>
              </div>
              
              {/* Chart Representation */}
              <div className="relative h-64 w-full group">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 200">
                  {/* Grid Lines */}
                  {[40, 80, 120, 160].map(y => (
                    <line key={y} stroke="currentColor" className="text-outline-variant/20 dark:text-white/10" strokeWidth="1" x1="0" x2="800" y1={y} y2={y} />
                  ))}
                  
                  {/* Area Path */}
                  <AnimatePresence mode="wait">
                    <motion.path 
                      key={strategy}
                      initial={{ d: currentPath, opacity: 0 }}
                      animate={{ d: currentPath, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={currentPath + ` L 800 200 L 0 200 Z`} 
                      fill="url(#grad-debt)" 
                      fillOpacity="0.3"
                    />
                    {/* Line Path */}
                    <motion.path 
                      key={strategy + "-line"}
                      initial={{ d: currentPath, pathLength: 0 }}
                      animate={{ d: currentPath, pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      d={currentPath} 
                      fill="none" 
                      stroke="url(#line-grad-debt)" 
                      strokeLinecap="round" 
                      strokeWidth="4"
                    />
                  </AnimatePresence>
                  
                  <defs>
                    <linearGradient id="grad-debt" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#435b9f" stopOpacity="1"></stop>
                      <stop offset="100%" stopColor="#435b9f" stopOpacity="0"></stop>
                    </linearGradient>
                    <linearGradient id="line-grad-debt" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#00113a" className="dark:stop-color-[#a7c8ff]"></stop>
                      <stop offset="100%" stopColor="#435b9f" className="dark:stop-color-[#82b1ff]"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute bottom-[-16px] left-0 w-full flex justify-between px-2 pt-4 text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">
                  <span>Sekarang</span>
                  <span className="hidden sm:inline">2024</span>
                  <span>2025</span>
                  <span className="hidden sm:inline">2026</span>
                  <span>2027</span>
                </div>
                
                {/* Tooltip Overlay (Interaction Hook) */}
                <div onClick={() => setIsSimulatorOpen(true)} className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] rounded-xl z-10">
                   <button className="bg-white/90 dark:bg-[#191c1e]/90 text-primary dark:text-[#a7c8ff] px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg shadow-xl outline outline-1 outline-primary/10">Buka Simulator</button>
                </div>
              </div>
            </div>

            {/* Active Debts Table */}
            <div className="bg-surface-container-lowest dark:bg-transparent overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10 dark:border-white/10">
              <div className="p-5 lg:p-6 border-b border-outline-variant/15 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-white/5">
                <h3 className="font-headline font-bold text-lg dark:text-white">Kewajiban Aktif</h3>
                <button 
                  onClick={openAddModal}
                  className="text-primary dark:text-[#a7c8ff] font-bold text-xs hover:underline flex items-center gap-1 active:opacity-80 transition-opacity bg-primary/5 dark:bg-[#a7c8ff]/10 px-3 py-1.5 rounded-lg"
                >
                  <span className="material-symbols-outlined text-sm">add</span> 
                  <span className="hidden sm:inline">Tambah Utang</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap lg:whitespace-normal">
                  <thead className="bg-surface-container-low dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Instrumen</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline text-right">Sisa Pokok</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline text-center">Bunga</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline text-right">Cicilan/Bulan</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 dark:divide-white/5">
                    {debts.map((debt, index) => (
                      <motion.tr 
                        layout
                        key={debt.id}
                        className={`${index % 2 === 1 ? 'bg-surface-container-low/30 dark:bg-black/20' : ''} hover:bg-surface-bright dark:hover:bg-white/[0.02] transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-high dark:bg-white/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">{debt.icon}</span>
                            </div>
                            <div>
                              <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                                {debt.name} 
                                {debt.lender && <span className="text-[10px] font-medium bg-surface-container-high dark:bg-white/10 px-2 py-0.5 rounded-md text-on-surface-variant dark:text-slate-300">{debt.lender}</span>}
                              </div>
                              <div className="text-[10px] lg:text-xs text-on-surface-variant dark:text-outline font-medium">{debt.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                            debt.status === 'Lunas' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            debt.status === 'Macet' ? 'bg-error/10 text-error dark:bg-error/20 dark:text-[#ffb4ab]' :
                            'bg-primary/10 text-primary dark:bg-[#a7c8ff]/10 dark:text-[#a7c8ff]'
                          }`}>
                            {debt.status || 'Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-sm lg:text-base dark:text-white tabular-nums">Rp {debt.balance.toLocaleString('id-ID')}</div>
                          {(debt.originalAmount ?? 0) > 0 && (
                            <div className="w-full mt-1 flex flex-col items-end gap-1">
                              <div className="w-24 h-1.5 bg-surface-container-highest dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full" style={{ width: `${Math.min(100, Math.max(0, 100 - (debt.balance / (debt.originalAmount || 1)) * 100))}%` }}></div>
                              </div>
                              <div className="text-[9px] font-medium text-on-surface-variant dark:text-outline">
                                Lunas {Math.round(100 - (debt.balance / (debt.originalAmount || 1)) * 100)}% dari Rp {(debt.originalAmount ?? 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="tabular-nums text-sm lg:text-base font-bold text-error dark:text-[#ffb4ab]">{debt.interestRate}%</div>
                          <div className="text-[10px] font-medium text-on-surface-variant dark:text-outline">{debt.interestType || 'Fixed/Flat'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="tabular-nums text-sm lg:text-base text-on-surface-variant dark:text-slate-300">Rp {debt.minPayment.toLocaleString('id-ID')}</div>
                          {debt.dueDate && <div className="text-[10px] font-medium text-tertiary-fixed">Jatuh Tempo: Tgl {debt.dueDate}</div>}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button 
                            onClick={() => setShowActionId(showActionId === debt.id ? null : debt.id)} 
                            className="p-2 hover:bg-surface-container dark:hover:bg-white/10 rounded-full text-outline transition-colors"
                          >
                            <span className="material-symbols-outlined text-[1.2rem]">more_vert</span>
                          </button>
                          
                          <AnimatePresence>
                            {showActionId === debt.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowActionId(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-6 top-12 w-32 bg-white dark:bg-[#191c1e] shadow-xl rounded-xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden"
                                >
                                  <button onClick={() => openEditModal(debt)} className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 dark:text-white">
                                    <span className="material-symbols-outlined text-sm">edit</span> Edit
                                  </button>
                                  <button onClick={() => handleDeleteDebt(debt.id)} className="w-full px-4 py-2.5 text-xs font-bold text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-error flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">delete</span> Hapus
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      <DebtFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDebt}
        editingDebt={editingDebt}
      />
      <DebtSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        currentExtraPayment={extraPayment}
        onApply={setExtraPayment}
        baselineData={{ months: minOnlyData.totalMonths, interest: minOnlyData.totalInterestPaid }}
        simulatedData={{ months: payoffData.totalMonths, interest: payoffData.totalInterestPaid }}
      />
    </div>
  );
};

export default FinanceDebts;
