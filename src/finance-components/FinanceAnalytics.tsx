import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureCTA } from './MarketingCTAModal';
import FinancePortfolioReport from './FinancePortfolioReport';
import FinancePerformanceReport from './FinancePerformanceReport';
import { useFinanceStore } from '../store/useFinanceStore';


interface FinanceAnalyticsProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceAnalytics: React.FC<FinanceAnalyticsProps> = ({ onShowCTA, onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'diversification' | 'sector'>('summary');
  const [hoveredCashFlowIndex, setHoveredCashFlowIndex] = useState<number | null>(null);

  // Fetch from useFinanceStore
  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const assets = useFinanceStore((state) => state.assets);
  const debts = useFinanceStore((state) => state.debts);
  const settings = useFinanceStore((state) => state.settings);
  const budgetCategories = useFinanceStore((state) => state.budgetCategories);

  // Calculate Net Worth
  const totalCash = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalAssets = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalDebts = debts.reduce((acc, curr) => acc + curr.balance, 0);
  const netWorth = totalCash + totalAssets - totalDebts;

  // Format Helper for Millions/Billions
  const formatJt = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)}M`;
    }
    return `Rp ${(val / 1e6).toFixed(1)}Jt`;
  };

  // Generate 12-Month Historical Net Worth
  const getHistoricalNetWorth = () => {
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${yyyy}-${mm}`);
    }

    const monthlyChanges: Record<string, number> = {};
    transactions.forEach(tx => {
      const key = tx.date.slice(0, 7);
      const change = tx.type === 'PEMASUKAN' ? tx.amount : tx.type === 'PENGELUARAN' ? -tx.amount : 0;
      monthlyChanges[key] = (monthlyChanges[key] || 0) + change;
    });

    const history: { monthKey: string; label: string; netWorth: number }[] = [];
    let currentNW = netWorth;

    for (let i = 11; i >= 0; i--) {
      const key = monthKeys[i];
      const dateObj = new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]) - 1, 1);
      const label = dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
      
      history.unshift({
        monthKey: key,
        label,
        netWorth: currentNW
      });

      const changeThisMonth = monthlyChanges[key] || 0;
      currentNW = currentNW - changeThisMonth;
    }
    return history;
  };

  const history = getHistoricalNetWorth();
  const nwValues = history.map(h => h.netWorth);
  const maxNW = Math.max(...nwValues, 1);
  const minNW = Math.min(...nwValues, 0);
  const nwRange = maxNW - minNW || 1;

  // Budget Health Score calculation
  const currentMonthKey = new Date().toISOString().slice(0, 7); // '2026-05'
  const allocatedBudget = budgetCategories
    .filter(c => c.type === 'Pengeluaran')
    .reduce((acc, curr) => acc + curr.allocated, 0);
  const currentMonthExpenses = transactions
    .filter(tx => tx.type === 'PENGELUARAN' && tx.date.startsWith(currentMonthKey))
    .reduce((acc, curr) => acc + curr.amount, 0);
  const budgetHealthScore = allocatedBudget > 0
    ? Math.max(0, Math.min(100, Math.round(((allocatedBudget - currentMonthExpenses) / allocatedBudget) * 100)))
    : 100;
  const remainingBudget = Math.max(0, allocatedBudget - currentMonthExpenses);

  // Dynamic Warning Category
  let warningCat = "Transportasi";
  let warningPct = 0;
  const exceededCategory = budgetCategories.find(cat => {
    if (cat.type !== 'Pengeluaran') return false;
    const catExpenses = transactions
      .filter(tx => tx.type === 'PENGELUARAN' && tx.category === cat.name && tx.date.startsWith(currentMonthKey))
      .reduce((acc, curr) => acc + curr.amount, 0);
    return catExpenses > cat.allocated;
  });
  if (exceededCategory) {
    const catExpenses = transactions
      .filter(tx => tx.type === 'PENGELUARAN' && tx.category === exceededCategory.name && tx.date.startsWith(currentMonthKey))
      .reduce((acc, curr) => acc + curr.amount, 0);
    warningCat = exceededCategory.name;
    warningPct = Math.round(((catExpenses - exceededCategory.allocated) / exceededCategory.allocated) * 100);
  }

  // Monthly Cash Flow for last 4 months
  const getCashFlowData = () => {
    const now = new Date();
    const last4Months: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      last4Months.push(`${yyyy}-${mm}`);
    }

    const flowGroup: Record<string, { rawIn: number; rawOut: number }> = {};
    last4Months.forEach(m => {
      flowGroup[m] = { rawIn: 0, rawOut: 0 };
    });

    transactions.forEach(tx => {
      const key = tx.date.slice(0, 7);
      if (flowGroup[key]) {
        if (tx.type === 'PEMASUKAN') flowGroup[key].rawIn += tx.amount;
        if (tx.type === 'PENGELUARAN') flowGroup[key].rawOut += tx.amount;
      }
    });

    const list = last4Months.map(m => {
      const dateObj = new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]) - 1, 1);
      const label = dateObj.toLocaleDateString('id-ID', { month: 'long' });
      const rawIn = flowGroup[m].rawIn;
      const rawOut = flowGroup[m].rawOut;
      return {
        label,
        rawIn,
        rawOut,
      };
    });

    const maxVal = Math.max(...list.map(l => Math.max(l.rawIn, l.rawOut)), 1);
    return list.map(l => ({
      ...l,
      in: Math.max(5, Math.round((l.rawIn / maxVal) * 90)),
      out: Math.max(5, Math.round((l.rawOut / maxVal) * 90)),
      val: formatJt(l.rawIn),
    })).reverse(); // reverse so most recent is first
  };

  const cashFlowData = getCashFlowData();

  // Expense Breakdown
  const getExpenseBreakdown = () => {
    const currentExpenses = transactions.filter(tx => tx.type === 'PENGELUARAN' && tx.date.startsWith(currentMonthKey));
    let totalInvestasi = 0;
    let totalPokok = 0;
    let totalLifestyle = 0;
    let totalUtang = 0;

    const targetExpenses = currentExpenses.length > 0 ? currentExpenses : transactions.filter(tx => tx.type === 'PENGELUARAN');
    targetExpenses.forEach(tx => {
      const cat = tx.category.toLowerCase();
      if (cat.includes('investasi') || cat.includes('saham') || cat.includes('reksadana') || cat.includes('tabungan') || cat.includes('pasar') || cat.includes('investment')) {
        totalInvestasi += tx.amount;
      } else if (cat.includes('cicilan') || cat.includes('utang') || cat.includes('kpr') || cat.includes('pinjaman') || cat.includes('debts') || cat.includes('debt')) {
        totalUtang += tx.amount;
      } else if (cat.includes('gaya hidup') || cat.includes('shop') || cat.includes('hobi') || cat.includes('hiburan') || cat.includes('nonton') || cat.includes('netflix') || cat.includes('elektronik') || cat.includes('langganan') || cat.includes('entertainment') || cat.includes('subscription') || cat.includes('gift') || cat.includes('travel') || cat.includes('personal care')) {
        totalLifestyle += tx.amount;
      } else {
        totalPokok += tx.amount;
      }
    });

    const grandTotal = totalInvestasi + totalPokok + totalLifestyle + totalUtang || 1;
    const pctInvest = Math.round((totalInvestasi / grandTotal) * 100);
    const pctPokok = Math.round((totalPokok / grandTotal) * 100);
    const pctLifestyle = Math.round((totalLifestyle / grandTotal) * 100);
    const pctUtang = Math.max(0, 100 - pctInvest - pctPokok - pctLifestyle);

    return {
      pctInvest,
      pctPokok,
      pctLifestyle,
      pctUtang,
      valLifestyle: totalLifestyle,
    };
  };

  const { pctInvest, pctPokok, pctLifestyle, pctUtang, valLifestyle } = getExpenseBreakdown();

  // Settings for Emergency Fund
  const getSetting = (key: string, defaultValue: string) => {
    const item = settings.find(s => s.key === key);
    return item ? item.value : defaultValue;
  };
  const targetRaw = getSetting('emergencyFundTarget', '750000000');
  const currentRaw = getSetting('emergencyFundCurrent', '637500000');
  const emergencyTarget = parseFloat(targetRaw) || 50000000;
  const emergencyCurrent = parseFloat(currentRaw) || 42500000;
  const emergencyProgress = Math.min(100, Math.max(0, Math.round((emergencyCurrent / emergencyTarget) * 100)));

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const transactions = useFinanceStore.getState().transactions;
    if (transactions.length === 0) {
      alert("Tidak ada transaksi untuk diekspor!");
      return;
    }

    // Build CSV Content
    const headers = ["Tanggal", "Deskripsi", "Lokasi", "Nominal (IDR)", "Kategori", "Akun", "Tipe"];
    const rows = transactions.map(tx => [
      tx.date,
      `"${tx.desc.replace(/"/g, '""')}"`,
      `"${tx.location ? tx.location.replace(/"/g, '""') : ''}"`,
      tx.amount,
      tx.category,
      tx.account,
      tx.type
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header & Filters Section */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-primary dark:text-[#a7c8ff] font-headline tracking-tight">Pusat Laporan & Analitik</h2>
          <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Wawasan komprehensif dari setiap pergerakan aset Anda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto no-print">
          <div 
            className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-on-surface dark:text-white flex-1 sm:flex-none justify-center text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>12 Bulan Terakhir</span>
          </div>
          {/* CSV Export Button */}
          <button 
            onClick={handleExportCSV}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-surface-container-lowest dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 px-4 py-2 rounded-xl font-bold text-xs hover:bg-surface-container-low transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">csv</span>
            Ekspor (CSV)
          </button>

          {/* PDF Print Button */}
          <button 
            onClick={handlePrint}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-white bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] dark:text-[#001b3c] px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Cetak (PDF)
          </button>
        </div>
      </section>

      {/* Sub-Tab Navigation */}
      <nav className="flex items-center gap-1 bg-surface-container-low dark:bg-white/5 p-1 rounded-2xl w-max border border-outline-variant/10 dark:border-white/5 shadow-inner">
        <button 
          onClick={() => setActiveSubTab('summary')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'summary' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Ringkasan
        </button>
        <button 
          onClick={() => setActiveSubTab('diversification')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'diversification' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Diversifikasi
        </button>
        <button 
          onClick={() => setActiveSubTab('sector')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'sector' ? 'bg-white dark:bg-primary-container text-primary dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-[#a7c8ff]'}`}
        >
          Sektoral
        </button>
      </nav>

      {/* Conditional Content Rendering */}
      {activeSubTab === 'summary' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          {/* Top Display Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Net Worth Trend Card */}
            <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 rounded-[24px] shadow-sm">
              <div className="flex justify-between items-start mb-8 flex-col sm:flex-row gap-4 sm:gap-0">
                <div>
                  <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold mb-1">Tren Kekayaan Bersih</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-headline text-2xl lg:text-3xl font-extrabold tabular-nums dark:text-white">Rp {netWorth.toLocaleString('id-ID')}</span>
                    <span className="text-tertiary-container dark:text-tertiary-fixed text-[10px] font-bold flex items-center bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[10px] mr-0.5">arrow_upward</span>
                      12.4%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-center bg-surface-container-low dark:bg-white/5 px-3 py-1.5 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-[#a7c8ff]"></span>
                  <span className="text-[10px] text-on-surface flex items-center gap-1 font-bold dark:text-slate-300">
                    Total Aset
                    <span className="material-symbols-outlined text-[12px] text-outline" title="Total akumulasi nilai wajar (market value) seluruh aset">info</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Line Chart */}
              <div className="h-64 w-full relative">
                <div className="absolute inset-0 flex items-end justify-between px-2 pb-6">
                  <div className="w-full h-full flex items-end gap-[4px] sm:gap-2">
                    {history.map((h, i) => {
                      const isCurrent = i === 11;
                      const heightPercent = Math.max(10, Math.round(((h.netWorth - minNW) / nwRange) * 80)) + 10;
                      if (!isCurrent) {
                        return (
                          <div key={i} className="flex-1 bg-primary/5 dark:bg-[#a7c8ff]/10 rounded-t-sm relative group transition-all duration-300 hover:bg-primary/20 dark:hover:bg-[#a7c8ff]/30" style={{ height: `${heightPercent}%` }}>
                            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary dark:bg-[#a7c8ff] rounded-full"></div>
                            <div className="absolute opacity-0 group-hover:opacity-100 -top-8 left-1/2 -translate-x-1/2 bg-surface-variant dark:bg-white text-on-surface dark:text-[#001b3c] text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition-opacity whitespace-nowrap z-10">
                              {formatJt(h.netWorth)}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={i} className="flex-1 bg-primary/20 dark:bg-[#a7c8ff]/30 rounded-t-sm relative ring-2 ring-primary dark:ring-[#a7c8ff]/50" style={{ height: `${heightPercent}%` }}>
                            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary dark:bg-[#a7c8ff]"></div>
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c] text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
                              {formatJt(h.netWorth)}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
                
                {/* X Axis */}
                <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-outline font-bold px-4">
                  {history.map((h, i) => (
                    <span key={i} className={i % 2 === 0 ? "hidden sm:inline" : ""}>{h.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Health Card */}
            <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 rounded-[24px] flex flex-col shadow-sm">
              <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold mb-6">Budget Health Score</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                
                <div className="relative flex items-center justify-center h-48 group">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle className="text-surface-container-high dark:text-white/10 transition-colors" cx="80" cy="80" fill="transparent" r="72" stroke="currentColor" strokeWidth="12"></circle>
                    <circle 
                      className="text-tertiary-fixed-dim dark:text-tertiary-fixed transition-all duration-1000 ease-out" 
                      cx="80" 
                      cy="80" 
                      fill="transparent" 
                      r="72" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      strokeLinecap="round"
                      strokeDasharray="452.4"
                      strokeDashoffset={452.4 - (452.4 * budgetHealthScore) / 100}
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold font-headline tabular-nums dark:text-white mb-1 tracking-tighter">{budgetHealthScore}<span className="text-2xl opacity-50">%</span></span>
                    <span className="text-[10px] font-bold text-tertiary-container dark:text-tertiary-fixed bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-full tracking-widest">{budgetHealthScore >= 70 ? 'AMAN' : budgetHealthScore >= 40 ? 'WASPADA' : 'BAHAYA'}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-on-surface-variant dark:text-slate-300">Sisa Anggaran Global</span>
                    <span className="font-bold tabular-nums dark:text-white">Rp {remainingBudget.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-full" style={{ width: `${budgetHealthScore}%` }}></div>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-outline leading-relaxed border-t border-outline-variant/10 dark:border-white/10 pt-4 mt-4">
                    Pengeluaran Anda bulan ini <strong className="text-primary dark:text-[#a7c8ff]">Rp {currentMonthExpenses.toLocaleString('id-ID')}</strong> dari total anggaran <strong className="text-primary dark:text-[#a7c8ff]">Rp {allocatedBudget.toLocaleString('id-ID')}</strong>. Pertahankan tren positif ini.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Cash Flow Table/Chart */}
            <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 flex-1 flex flex-col md:p-8">
                <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold mb-8">Arus Kas Bulanan</h3>
                <div className="space-y-6 flex-1 relative">
                  <AnimatePresence>
                    {hoveredCashFlowIndex !== null && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-0 z-20 bg-white dark:bg-[#191c1e] p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-48 pointer-events-none"
                        style={{ top: hoveredCashFlowIndex * 52 }}
                      >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{cashFlowData[hoveredCashFlowIndex].label}</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Masuk</span>
                            <span className="text-tertiary-fixed-dim dark:text-tertiary-fixed font-bold">{formatJt(cashFlowData[hoveredCashFlowIndex].rawIn)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Keluar</span>
                            <span className="text-error font-bold">{formatJt(cashFlowData[hoveredCashFlowIndex].rawOut)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">NETTO</span>
                            <span className={`text-xs font-bold ${cashFlowData[hoveredCashFlowIndex].rawIn > cashFlowData[hoveredCashFlowIndex].rawOut ? 'text-primary dark:text-[#a7c8ff]' : 'text-error'}`}>
                              {cashFlowData[hoveredCashFlowIndex].rawIn > cashFlowData[hoveredCashFlowIndex].rawOut ? '+' : ''}
                              {formatJt(cashFlowData[hoveredCashFlowIndex].rawIn - cashFlowData[hoveredCashFlowIndex].rawOut)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {cashFlowData.map((row, i) => (
                    <motion.div 
                      key={i} 
                      onHoverStart={() => setHoveredCashFlowIndex(i)}
                      onHoverEnd={() => setHoveredCashFlowIndex(null)}
                      className={`flex items-center gap-4 group transition-opacity duration-300 ${hoveredCashFlowIndex !== null && hoveredCashFlowIndex !== i ? 'opacity-40' : 'opacity-100'}`} 
                    >
                      <div className="w-16 text-[10px] font-bold text-outline uppercase group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{row.label}</div>
                      <div className="flex-1 flex flex-col gap-1.5 transition-transform origin-left group-hover:scale-x-[1.02]">
                        <motion.div 
                          animate={{ scaleY: hoveredCashFlowIndex === i ? 1.2 : 1 }}
                          className="h-3 md:h-4 bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-sm transition-all duration-1000 ease-out" 
                          style={{ width: `${row.in}%` }} 
                        />
                        <motion.div 
                          animate={{ scaleY: hoveredCashFlowIndex === i ? 1.2 : 1 }}
                          className="h-3 md:h-4 bg-error-container/60 dark:bg-error/80 rounded-sm transition-all duration-1000 ease-out delay-100" 
                          style={{ width: `${row.out}%` }} 
                        />
                      </div>
                      <div className="w-20 md:w-24 text-right text-xs font-bold tabular-nums dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{row.val}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex gap-6 border-t border-outline-variant/10 dark:border-white/10 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-tertiary-fixed-dim dark:bg-tertiary-fixed rounded-full"></div>
                    <span className="text-[10px] font-bold text-outline">PEMASUKAN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-error-container/60 dark:bg-error/80 rounded-full"></div>
                    <span className="text-[10px] font-bold text-outline">PENGELUARAN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Categories Breakdown */}
            <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-[24px] p-6 lg:p-8 flex flex-col shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-headline text-on-surface-variant dark:text-outline text-xs uppercase tracking-widest font-bold">Alokasi Pengeluaran</h3>
                <button onClick={() => onNavigate?.('transactions')} className="text-primary dark:text-[#a7c8ff] text-xs font-bold hover:underline cursor-pointer">Log Transaksi</button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-8 flex-1">
                <div className="relative w-48 h-48 shrink-0">
                  {/* Dynamic Donut SVG */}
                  <svg className="w-full h-full transform -rotate-90 hover:scale-105 transition-transform" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#002366" strokeWidth="4.2" strokeDasharray={`${pctInvest} 100`} />
                    <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#758dd5" strokeWidth="4.2" strokeDasharray={`${pctPokok} 100`} strokeDashoffset={-pctInvest} />
                    <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#95d4b3" strokeWidth="4.2" strokeDasharray={`${pctLifestyle} 100`} strokeDashoffset={-(pctInvest + pctPokok)} />
                    <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#ba1a1a" strokeWidth="4.2" strokeDasharray={`${pctUtang} 100`} strokeDashoffset={-(pctInvest + pctPokok + pctLifestyle)} />
                  </svg>
                </div>
                
                <div className="flex-1 space-y-3 w-full">
                  {[
                    { name: 'Investasi', val: pctInvest, color: 'bg-primary-container dark:bg-[#a7c8ff]' },
                    { name: 'Kebutuhan Pokok', val: pctPokok, color: 'bg-secondary-container dark:bg-slate-400' },
                    { name: 'Gaya Hidup', val: pctLifestyle, color: 'bg-tertiary-fixed-dim dark:bg-tertiary-fixed' },
                    { name: 'Cicilan/Utang', val: pctUtang, color: 'bg-error dark:bg-error-container' },
                  ]
                    .filter(item => item.val > 0)
                    .map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-surface dark:hover:bg-white/5 rounded-xl transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                        <span className="text-xs font-bold text-on-surface dark:text-slate-300 group-hover:text-primary dark:group-hover:text-white transition-colors">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums dark:text-white bg-surface-container-low dark:bg-white/10 px-2.5 py-1 rounded-md">{item.val}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insights Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Magic AI Insight */}
            <div 
              className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-6 rounded-[24px] relative overflow-hidden group shadow-md"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined text-tertiary-fixed-dim dark:text-tertiary-fixed text-3xl mb-4 group-hover:rotate-12 transition-transform">auto_awesome</span>
                <h4 className="font-headline font-bold mb-2">Smart Insight</h4>
                <p className="text-sm text-primary-fixed dark:text-slate-300 leading-relaxed font-medium">
                  {valLifestyle > 0 ? (
                    <>Membatasi pos "Gaya Hidup" sebesar 10% dari pengeluaran saat ini dapat menghemat hingga <strong className="text-white">Rp {(valLifestyle * 0.1).toLocaleString('id-ID')}</strong> untuk dialokasikan langsung ke Investasi.</>
                  ) : (
                    <>Pengeluaran Anda sangat efisien. Pertahankan alokasi dana berlebih ke <strong className="text-white">aset produktif dan investasi</strong>.</>
                  )}
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 blur-[2px] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-9xl">trending_down</span>
              </div>
            </div>

            {/* Goal Insight */}
            <div className="bg-surface-container-low dark:bg-white/5 dark:border dark:border-white/10 p-6 rounded-[24px] border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mb-4 text-2xl">savings</span>
                <h4 className="font-headline font-bold mb-2 text-on-surface dark:text-white">Target Dana Darurat</h4>
                <div className="mb-2 flex justify-between items-end mt-4">
                  <span className="text-[10px] text-outline font-bold tracking-widest">PROGRESS</span>
                  <span className="text-xl font-extrabold tabular-nums dark:text-white text-primary">{emergencyProgress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full shadow-inner" style={{ width: `${emergencyProgress}%` }}></div>
                </div>
              </div>
              <p className="text-[10px] mt-4 font-bold text-outline flex justify-between">
                <span>Rp {emergencyCurrent.toLocaleString('id-ID')}</span>
                <span>Rp {emergencyTarget.toLocaleString('id-ID')}</span>
              </p>
            </div>

            {/* Warning Insight */}
            <div className="bg-error-container/20 dark:bg-error-container/10 p-6 rounded-[24px] border border-error-container flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-error mb-4 text-2xl animate-pulse">warning</span>
                <h4 className="font-headline font-bold mb-2 text-on-surface dark:text-white">Peringatan Anggaran</h4>
                {exceededCategory ? (
                  <p className="text-sm text-on-surface-variant dark:text-slate-300 mb-4 leading-relaxed font-medium">
                    Kategori <strong className="text-error">"{warningCat}"</strong> telah melebihi limit bulanan sebesar {warningPct}%.
                  </p>
                ) : (
                  <p className="text-sm text-on-surface-variant dark:text-slate-300 mb-4 leading-relaxed font-medium">
                    Luar biasa! Pengeluaran Anda di semua pos anggaran bulan ini masih aman terkendali.
                  </p>
                )}
              </div>
              <button onClick={() => onNavigate?.('budget')} className="text-xs font-bold text-error md:text-on-surface hover:text-error dark:text-error-container dark:hover:text-[#ffb4ab] flex items-center gap-1 group w-max cursor-pointer">
                Sesuaikan Anggaran <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {activeSubTab === 'diversification' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
           <FinancePortfolioReport onShowCTA={onShowCTA} onNavigate={onNavigate} hideHeader />
        </div>
      )}

      {activeSubTab === 'sector' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <FinancePerformanceReport onShowCTA={onShowCTA} onNavigate={onNavigate} hideHeader />
        </div>
      )}
    </div>
  );
};

export default FinanceAnalytics;
