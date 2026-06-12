import React from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { motion, AnimatePresence } from 'motion/react';

interface FinanceDashboardProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ onShowCTA, onNavigate }) => {
  const [chartPeriod, setChartPeriod] = React.useState<'6B' | '1T' | 'SEMUA'>('1T');
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  // Fetch all dynamic data from Zustand store
  const { transactions, accounts, assets, debts } = useFinanceStore();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate();
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 1. Calculate Real Cash, Investments, Physical Assets, and Debts
  const totalCash = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalInvestments = assets.filter(a => a.category === 'investasi').reduce((sum, a) => sum + a.currentValue, 0);
  const totalPhysical = assets.filter(a => a.category !== 'investasi').reduce((sum, a) => sum + a.currentValue, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.balance, 0);
  
  // Real Net Worth
  const netWorth = totalCash + totalInvestments + totalPhysical - totalDebts;

  // Helper to distinguish between consumption and asset allocation
  const isAssetAllocation = (catName: string): boolean => {
    const norm = (catName || '').toLowerCase();
    if (norm.includes('income') || norm.includes('dividend') || norm.includes('kupon') || norm.includes('bunga')) {
      return false;
    }
    return (
      norm.includes('saving') || 
      norm.includes('tabungan') || 
      norm.includes('darurat') || 
      norm.includes('emergency') || 
      norm.includes('sinking') ||
      norm.includes('invest') || 
      norm.includes('saham') || 
      norm.includes('crypto') || 
      norm.includes('reksa') || 
      norm.includes('bond') || 
      norm.includes('emas') || 
      norm.includes('gold') || 
      norm.includes('kripto') ||
      norm.includes('deposito') ||
      norm.includes('transfer')
    );
  };

  // 2. Calculate Income, Expense, and Savings (Current Month vs. Historical fallback)
  const totalIncome = transactions
    .filter(t => t.type === 'PEMASUKAN' && !isAssetAllocation(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = Math.abs(
    transactions
      .filter(t => t.type === 'PENGELUARAN' && !isAssetAllocation(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const now = new Date();
  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    try {
      const txDate = new Date(t.date);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const currentMonthIncome = currentMonthTx
    .filter(t => t.type === 'PEMASUKAN' && !isAssetAllocation(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpense = Math.abs(
    currentMonthTx
      .filter(t => t.type === 'PENGELUARAN' && !isAssetAllocation(t.category))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Determine whether to display current month or total fallback
  const displayIncome = (currentMonthIncome > 0 || currentMonthExpense > 0) ? currentMonthIncome : totalIncome;
  const displayExpense = (currentMonthIncome > 0 || currentMonthExpense > 0) ? currentMonthExpense : totalExpense;
  const displaySavings = displayIncome - displayExpense;

  // 3. Dynamic Portfolio Allocation calculations
  const grandTotalAssets = totalCash + totalInvestments + totalPhysical;
  const realEstatPercent = grandTotalAssets > 0 ? Math.round((totalPhysical / grandTotalAssets) * 100) : 0;
  const ekuitasPercent = grandTotalAssets > 0 ? Math.round((totalInvestments / grandTotalAssets) * 150) : 0; // scaled for visibility
  const kasPercent = grandTotalAssets > 0 ? Math.round((totalCash / grandTotalAssets) * 100) : 0;
  const debtPercent = grandTotalAssets > 0 ? Math.round((totalDebts / grandTotalAssets) * 100) : 0;

  // 4. Generate Dynamic Trend Line Chart Data based on user transactions history
  const getDynamicChartData = (period: '6B' | '1T' | 'SEMUA') => {
    let numMonths = 12;
    if (period === '6B') numMonths = 6;
    else if (period === '1T') numMonths = 12;
    else numMonths = 12; // default 12 for SEMUA in this view

    const monthKeys: string[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${yyyy}-${mm}`);
    }

    // Calculate monthly changes
    const monthlyChanges: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.date) return;
      const key = tx.date.slice(0, 7); // assumes YYYY-MM-DD
      const change = tx.type === 'PEMASUKAN' ? tx.amount : tx.type === 'PENGELUARAN' ? -tx.amount : 0;
      // Exclude asset allocations so net worth is not distorted
      if (!isAssetAllocation(tx.category)) {
        monthlyChanges[key] = (monthlyChanges[key] || 0) + change;
      }
    });

    const history: { label: string; val: number; x: number; y: number }[] = [];
    let currentNW = netWorth;

    // Build history backwards
    for (let i = monthKeys.length - 1; i >= 0; i--) {
      const mKey = monthKeys[i];
      const d = new Date(mKey + '-02');
      const label = d.toLocaleDateString('id-ID', { month: 'short' });
      history.unshift({
        label,
        val: currentNW,
        x: 0,
        y: 0
      });
      const changeThisMonth = monthlyChanges[mKey] || 0;
      currentNW -= changeThisMonth;
    }

    // Normalize coordinates for SVG rendering (0-100 ViewBox)
    const vals = history.map(h => h.val);
    const maxNW = Math.max(...vals);
    const minNW = Math.min(...vals);
    const diff = maxNW - minNW;

    return history.map((h, index) => {
      const x = (index / (history.length - 1)) * 100;
      // y axis is inverted in SVG, y=10 is top, y=85 is bottom
      const y = diff > 0 ? 85 - ((h.val - minNW) / diff) * 70 : 50;
      return {
        label: h.label,
        val: h.val,
        x,
        y
      };
    });
  };

  const currentData = getDynamicChartData(chartPeriod);

  const generatePath = (data: typeof currentData) => {
    if (data.length < 2) return "";
    let path = `M${data[0].x},${data[0].y}`;
    for (let i = 0; i < data.length - 1; i++) {
      const xmid = (data[i].x + data[i+1].x) / 2;
      path += ` C${xmid},${data[i].y} ${xmid},${data[i+1].y} ${data[i+1].x},${data[i+1].y}`;
    }
    return path;
  };

  const generateHeroPath = (data: typeof currentData) => {
    if (data.length < 2) return "";
    const scaleX = 10;
    const scaleY = 2;
    const offsetY = 50; 

    let path = `M${data[0].x * scaleX},${data[0].y * scaleY + offsetY}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = data[i].x * scaleX;
      const y1 = data[i].y * scaleY + offsetY;
      const x2 = data[i+1].x * scaleX;
      const y2 = data[i+1].y * scaleY + offsetY;
      const xmid = (x1 + x2) / 2;
      path += ` C${xmid},${y1} ${xmid},${y2} ${x2},${y2}`;
    }
    return path;
  };

  const heroPath = generateHeroPath(currentData);
  const heroFillPath = `${heroPath} L1000,300 L0,300 Z`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section: Net Worth Overview & Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Net Worth Card */}
        <div className="relative overflow-hidden md:col-span-2 p-8 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-lg flex flex-col justify-between group transition-all duration-500">
          {/* Ambient Glowing Blobs */}
          <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[80%] rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-[80px] pointer-events-none -z-10" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-br from-cyan-400/5 via-blue-600/10 to-transparent blur-[70px] pointer-events-none -z-10" />
          
          <div className="relative z-10">
            <p className="font-label text-slate-500 dark:text-slate-400 font-bold tracking-widest mb-1.5 uppercase text-[10px]">
              Total Kekayaan Bersih
            </p>
            <h2 className="font-headline text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              Rp {netWorth.toLocaleString('id-ID')}
            </h2>
            <div className="mt-6 flex flex-wrap items-center gap-3 lg:gap-4">
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-extrabold font-label border border-emerald-500/15">
                <span className="material-symbols-outlined text-[1rem] mr-1 font-bold">trending_up</span>
                +12.5% YoY
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold font-label">vs Tahun Lalu</span>
            </div>
          </div>
          
          {/* Synchronized Hero Chart Background */}
          <div className="absolute bottom-0 left-0 right-0 h-44 opacity-30 dark:opacity-40 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hero-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-secondary, #00B4D8)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="hero-line-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--color-brand-primary, #004080)" />
                  <stop offset="50%" stopColor="var(--color-brand-secondary, #00B4D8)" />
                  <stop offset="100%" stopColor="#82B1FF" />
                </linearGradient>
              </defs>
              <AnimatePresence mode="wait">
                <motion.g key={chartPeriod}>
                  {/* Glow Line Underlay */}
                  <motion.path 
                    initial={{ d: heroPath, opacity: 0 }}
                    animate={{ d: heroPath, opacity: 0.35 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    fill="none"
                    stroke="#00B4D8"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="blur-[6px]"
                  />
                  {/* Main Glass Wave Line */}
                  <motion.path 
                    initial={{ d: heroPath, opacity: 0 }}
                    animate={{ d: heroPath, opacity: 0.8 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    fill="none"
                    stroke="url(#hero-line-grad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Filled Gradient Underlay */}
                  <motion.path 
                    initial={{ d: heroFillPath, opacity: 0 }}
                    animate={{ d: heroFillPath, opacity: 0.2 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    fill="url(#hero-grad)" 
                  />
                </motion.g>
              </AnimatePresence>
            </svg>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onNavigate?.('add-transaction')} 
            className="relative overflow-hidden liquid-glass flex flex-col items-center justify-center p-6 rounded-3xl group cursor-pointer border border-white/20 dark:border-white/10 active:scale-95 hover:scale-[1.04] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-rose-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="w-12 h-12 squircle flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[4deg]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.03) 100%)',
                   border: '1px solid rgba(244, 63, 94, 0.25)',
                   boxShadow: '0 4px 12px -2px rgba(244, 63, 94, 0.1)'
                 }}>
              <span className="material-symbols-outlined text-rose-500 dark:text-rose-400 font-bold">add_card</span>
            </div>
            <span className="font-label text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide text-center">Tambah Transaksi</span>
          </button>
          
          <button 
            onClick={() => onNavigate?.('add-asset')} 
            className="relative overflow-hidden liquid-glass flex flex-col items-center justify-center p-6 rounded-3xl group cursor-pointer border border-white/20 dark:border-white/10 active:scale-95 hover:scale-[1.04] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="w-12 h-12 squircle flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.03) 100%)',
                   border: '1px solid rgba(16, 185, 129, 0.25)',
                   boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.1)'
                 }}>
              <span className="material-symbols-outlined text-emerald-500 dark:text-emerald-400 font-bold">account_balance_wallet</span>
            </div>
            <span className="font-label text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide text-center">Tambah Aset</span>
          </button>
          
          <button 
            onClick={() => onNavigate?.('analytics')} 
            className="relative overflow-hidden liquid-glass flex flex-col items-center justify-center p-6 rounded-3xl group cursor-pointer border border-white/20 dark:border-white/10 active:scale-95 hover:scale-[1.04] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="w-12 h-12 squircle flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[4deg]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.03) 100%)',
                   border: '1px solid rgba(59, 130, 246, 0.25)',
                   boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.1)'
                 }}>
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 font-bold">assessment</span>
            </div>
            <span className="font-label text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide text-center">Laporan</span>
          </button>
          
          <button 
            onClick={() => onNavigate?.('notifications')} 
            className="relative overflow-hidden liquid-glass flex flex-col items-center justify-center p-6 rounded-3xl group cursor-pointer border border-white/20 dark:border-white/10 active:scale-95 hover:scale-[1.04] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="absolute inset-0 bg-purple-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="w-12 h-12 squircle flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.03) 100%)',
                   border: '1px solid rgba(139, 92, 246, 0.25)',
                   boxShadow: '0 4px 12px -2px rgba(139, 92, 246, 0.1)'
                 }}>
              <span className="material-symbols-outlined text-purple-500 dark:text-purple-400 font-bold">notifications_active</span>
            </div>
            <span className="font-label text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide text-center">Notifikasi</span>
          </button>
        </div>
      </section>

      {/* Secondary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Income */}
        <div className="relative overflow-hidden pl-7 py-6 pr-6 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-r-md" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined font-bold">payments</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-extrabold tracking-wide">
              +4%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-label text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Total Pendapatan
          </p>
          <h3 className="font-headline text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            Rp {displayIncome.toLocaleString('id-ID')}
          </h3>
        </div>

        {/* Total Expense */}
        <div className="relative overflow-hidden pl-7 py-6 pr-6 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 dark:bg-rose-400 rounded-r-md" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined font-bold">shopping_bag</span>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-extrabold tracking-wide">
              -2%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-label text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Total Pengeluaran
          </p>
          <h3 className="font-headline text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            Rp {displayExpense.toLocaleString('id-ID')}
          </h3>
        </div>

        {/* Monthly Savings */}
        <div className="relative overflow-hidden pl-7 py-6 pr-6 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 dark:bg-blue-400 rounded-r-md" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined font-bold">savings</span>
            </div>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-extrabold tracking-wide">
              +18%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-label text-[10px] uppercase font-bold tracking-widest mb-1.5">
            Tabungan Bulanan
          </p>
          <h3 className="font-headline text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            Rp {displaySavings.toLocaleString('id-ID')}
          </h3>
        </div>
      </section>

      {/* Line Chart & Portfolio Allocation Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Line Chart Card */}
        <div className="relative lg:col-span-2 p-6 lg:p-8 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <h4 className="font-headline text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Tren Kekayaan Bersih
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Pertumbuhan portofolio dalam 12 bulan terakhir
              </p>
            </div>
            
            {/* Apple Capsule Segmented Period Switcher */}
            <div className="relative flex bg-black/[0.04] dark:bg-white/[0.03] p-1 rounded-full text-xs font-semibold border border-black/[0.03] dark:border-white/[0.05] backdrop-blur-md">
              {(['6B', '1T', 'SEMUA'] as const).map(p => (
                <button 
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`relative px-3.5 py-1.5 rounded-full transition-all duration-300 text-xs font-bold tracking-wide cursor-pointer focus:outline-none ${
                    chartPeriod === p 
                      ? 'text-slate-900 dark:text-slate-950' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {chartPeriod === p && (
                    <motion.div 
                      layoutId="activePeriodIndicator"
                      className="absolute inset-0 bg-white dark:bg-white/[0.9] shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{p}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 relative w-full mt-4">
            {/* Tooltip Overlay */}
            <AnimatePresence>
              {hoveredPoint !== null && currentData[hoveredPoint] && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-20 pointer-events-none"
                  style={{ 
                    left: currentData[hoveredPoint].x > 85 ? 'auto' : currentData[hoveredPoint].x < 15 ? '0' : `${currentData[hoveredPoint].x}%`,
                    right: currentData[hoveredPoint].x > 85 ? '0' : 'auto',
                    top: `${currentData[hoveredPoint].y}%`,
                    transform: `translate(${
                      currentData[hoveredPoint].x > 85 ? '0%' : currentData[hoveredPoint].x < 15 ? '0%' : '-50%'
                    }, -120%)`
                  }}
                >
                  <div className="bg-slate-900/85 dark:bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-white/10 min-w-[150px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{currentData[hoveredPoint].label}</p>
                    <p className="text-sm font-black text-white">
                      Rp {currentData[hoveredPoint].val.toLocaleString('id-ID')}
                    </p>
                  </div>
                  {/* Tooltip Arrow */}
                  <div 
                    className="w-2.5 h-2.5 bg-slate-900/85 dark:bg-slate-950/85 border-r border-b border-white/10 absolute -translate-x-1/2 -bottom-1.2 rotate-45"
                    style={{
                      left: currentData[hoveredPoint].x > 85 ? 'auto' : currentData[hoveredPoint].x < 15 ? '20px' : '50%',
                      right: currentData[hoveredPoint].x > 85 ? '10px' : 'auto'
                    }}
                  ></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulated Chart Grid */}
            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 opacity-30">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="border-t border-slate-300/30 dark:border-white/5 w-full h-0"></div>
              ))}
            </div>
            
            {/* High-End Glowing SVG Area Chart */}
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#00B4D8" floodOpacity="0.25" />
                </filter>
                <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0, 180, 216, 0.25)" />
                  <stop offset="100%" stopColor="rgba(0, 180, 216, 0)" />
                </linearGradient>
                <linearGradient id="chart-stroke-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--color-brand-primary, #004080)" />
                  <stop offset="100%" stopColor="var(--color-brand-secondary, #00B4D8)" />
                </linearGradient>
              </defs>
              
              <AnimatePresence mode="wait">
                <motion.g key={chartPeriod}>
                  {/* Area Fill */}
                  <motion.path 
                    initial={{ d: generatePath(currentData) + " L100,100 L0,100 Z", opacity: 0 }}
                    animate={{ d: generatePath(currentData) + " L100,100 L0,100 Z", opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    fill="url(#chart-grad)" 
                  />
                  
                  {/* Hover vertical dash-line */}
                  {hoveredPoint !== null && currentData[hoveredPoint] && (
                    <line 
                      x1={currentData[hoveredPoint].x} y1="0" 
                      x2={currentData[hoveredPoint].x} y2="100" 
                      stroke="rgba(0, 180, 216, 0.4)" strokeWidth="0.5" strokeDasharray="4"
                    />
                  )}

                  {/* Main Line with Neon Glow */}
                  <motion.path 
                    initial={{ d: generatePath(currentData), pathLength: 0 }}
                    animate={{ d: generatePath(currentData), pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    fill="none" 
                    stroke="url(#chart-stroke-grad)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    filter="url(#line-glow)"
                    vectorEffect="non-scaling-stroke" 
                  />
                  
                  {/* Interactive Points */}
                  {currentData.map((p, i) => (
                    <g key={i}>
                      {hoveredPoint === i && (
                        <circle 
                          cx={p.x} cy={p.y} 
                          r={7} 
                          fill="rgba(0, 180, 216, 0.3)" 
                          vectorEffect="non-scaling-stroke" 
                        />
                      )}
                      <circle 
                        cx={p.x} cy={p.y} 
                        r={hoveredPoint === i ? 4.5 : 3.5} 
                        fill={hoveredPoint === i ? "#ffffff" : "#00B4D8"} 
                        stroke={hoveredPoint === i ? "#004080" : "none"}
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke" 
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="cursor-pointer transition-all duration-200"
                      />
                    </g>
                  ))}
                </motion.g>
              </AnimatePresence>
            </svg>
            
            {/* Dynamic Axis Labels */}
            <div className="absolute bottom-0 w-full flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
              {currentData.map((p, i) => (
                <span key={i} className="transition-all duration-300">
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Breakdown Panel */}
        <div className="relative overflow-hidden p-6 lg:p-8 rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <h4 className="font-headline text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
            Alokasi Portofolio
          </h4>
          <div className="space-y-5 flex-grow">
            
            {/* Real Estat progress bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Real Estat</span>
                <span className="font-body text-xs font-black text-slate-900 dark:text-white">Rp {totalPhysical.toLocaleString('id-ID')}</span>
              </div>
              <div className="h-1.5 w-full bg-black/[0.05] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${realEstatPercent}%` }}></div>
              </div>
            </div>
            
            {/* Ekuitas / Saham progress bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Ekuitas / Saham</span>
                <span className="font-body text-xs font-black text-slate-900 dark:text-white">Rp {totalInvestments.toLocaleString('id-ID')}</span>
              </div>
              <div className="h-1.5 w-full bg-black/[0.05] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${ekuitasPercent}%` }}></div>
              </div>
            </div>
            
            {/* Kas progress bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-label text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Kas & Setara Kas</span>
                <span className="font-body text-xs font-black text-slate-900 dark:text-white">Rp {totalCash.toLocaleString('id-ID')}</span>
              </div>
              <div className="h-1.5 w-full bg-black/[0.05] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500" style={{ width: `${kasPercent}%` }}></div>
              </div>
            </div>
            
            {/* Liabilitas progress bar */}
            <div className="pt-4 border-t border-slate-300/30 dark:border-white/10 mt-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-label text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">Liabilitas (Utang)</span>
                <span className="font-body text-xs font-black text-rose-500 dark:text-rose-400">Rp -{totalDebts.toLocaleString('id-ID')}</span>
              </div>
              <div className="h-1.5 w-full bg-rose-500/[0.05] dark:bg-rose-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${debtPercent}%` }}></div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigate && onNavigate('integration')} 
            className="w-full py-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-dashed border-black/10 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-bold text-xs hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[1.1rem]">add_link</span>
            Tambah Akun Integrasi
          </button>
          
          <button 
            onClick={() => onNavigate?.('assets')}
            className="mt-4 text-center text-primary dark:text-[#a7c8ff] font-extrabold text-xs tracking-wider uppercase hover:underline active:opacity-80 transition-opacity flex items-center justify-center gap-1.5 group cursor-pointer"
          >
            Akses Rincian Aset
            <span className="material-symbols-outlined text-[1rem] transition-transform duration-300 group-hover:translate-x-1">arrow_forward_ios</span>
          </button>
        </div>
      </section>

      {/* Recent Activity Table */}
      <section className="relative overflow-hidden rounded-3xl liquid-glass border border-white/20 dark:border-white/10 shadow-sm">
        <div className="px-6 lg:px-8 py-5 flex justify-between items-center border-b border-white/10 bg-white/40 dark:bg-white/5">
          <h4 className="font-headline text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Aktivitas Terkini
          </h4>
          <button 
            onClick={() => onNavigate?.('transactions')}
            className="text-xs font-black text-primary dark:text-[#a7c8ff] uppercase tracking-wider hover:underline cursor-pointer"
          >
            Lihat Semua
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-black/[0.02] dark:bg-white/5 text-slate-500 dark:text-slate-400 font-label text-[10px] uppercase tracking-widest hidden sm:table-header-group">
              <tr>
                <th className="px-6 lg:px-8 py-4 font-bold border-b border-white/5">Deskripsi Transaksi</th>
                <th className="px-6 lg:px-8 py-4 font-bold border-b border-white/5">Kategori</th>
                <th className="px-6 lg:px-8 py-4 font-bold border-b border-white/5">Status</th>
                <th className="px-6 lg:px-8 py-4 text-right font-bold border-b border-white/5">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/5">
              {transactions.slice(0, 5).map((t, idx) => {
                const isNegative = t.amount < 0;
                return (
                  <tr key={`${t.id}-${idx}`} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors flex flex-wrap sm:table-row p-4 sm:p-0">
                    <td className="w-full sm:w-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-5 order-1 sm:order-none">
                      <div className="flex items-center gap-3 lg:gap-4">
                        {/* Elegant custom squircle icon background based on transaction type */}
                        <div 
                          className="w-10 h-10 shrink-0 squircle flex items-center justify-center shadow-sm"
                          style={{
                            background: isNegative 
                              ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.02) 100%)' 
                              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.02) 100%)',
                            border: isNegative 
                              ? '1px solid rgba(244, 63, 94, 0.18)' 
                              : '1px solid rgba(16, 185, 129, 0.18)'
                          }}
                        >
                          <span 
                            className={`material-symbols-outlined text-lg font-bold ${
                              isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
                            }`}
                          >
                            {t.icon}
                          </span>
                        </div>
                        <div>
                          <span className="font-body font-bold text-slate-800 dark:text-slate-100 block text-sm lg:text-base tracking-tight">
                            {t.desc}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                            {formatDate(t.date)}
                            <span className="sm:hidden ml-1">• {t.category}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 lg:px-8 py-5">
                      <span className="px-2.5 py-1.5 bg-black/[0.04] dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-black/[0.03] dark:border-white/5">
                        {t.category}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-6 lg:px-8 py-5">
                      <span 
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                          t.status === 'Selesai' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Selesai' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500'}`} />
                        {t.status}
                      </span>
                    </td>
                    <td className={`w-full sm:w-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-5 text-left sm:text-right font-extrabold tabular-nums order-2 sm:order-none text-sm lg:text-base flex justify-between sm:block items-center ${
                      isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <span className="sm:hidden text-xs text-slate-400 font-semibold">{t.status}</span>
                      <span>
                        {isNegative ? '-' : '+'}Rp {Math.abs(t.amount).toLocaleString('id-ID')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
    </div>
  );
};

export default FinanceDashboard;
