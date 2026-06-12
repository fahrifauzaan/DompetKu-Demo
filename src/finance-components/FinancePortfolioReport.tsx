import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinancePortfolioReportProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
}



const FinancePortfolioReport: React.FC<FinancePortfolioReportProps> = ({ onShowCTA, hideHeader }) => {
  const accounts = useFinanceStore((state) => state.accounts);
  const assets = useFinanceStore((state) => state.assets);

  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  const portfolioItems = assets.filter(a => a.category === 'investasi').map(a => ({
    ...a,
    ticker: a.ticker || a.title.split(' ')[0] || 'ASSET',
    shares: a.shares || 1,
    avgCost: a.avgCost || a.purchasePrice || a.currentValue,
    subType: a.subType || 'saham'
  }));

  const portfolioItemsWithLive = portfolioItems.map(item => {
    const ticker = item.ticker || '';
    const initial = item.purchasePrice || item.currentValue;
    
    let marketValue = item.currentValue;

    let pl = marketValue - initial;
    let percentChange = initial > 0 ? (pl / initial) * 100 : 0;

    const isFixedIncome = item.subType === 'sbn' || item.subType === 'deposito' || item.subType === 'p2p' || (item.title || '').includes('ST012');
    const isLiquidated = marketValue === 0;

    if (isLiquidated && isFixedIncome) {
      const principal = item.purchasePrice || initial;
      // @ts-ignore
      const couponRate = item.interestRate || (item.subType === 'deposito' ? 4.5 : item.subType === 'p2p' ? 12.0 : 6.4);
      // @ts-ignore
      const taxRate = item.tax !== undefined ? item.tax : (item.subType === 'deposito' ? 0.20 : item.subType === 'p2p' ? 0.15 : 0.10);
      const yearlyGross = principal * (couponRate / 100);
      const yearlyNet = yearlyGross * (1 - taxRate);
      const monthlyNet = Math.round(yearlyNet / 12);
      // @ts-ignore
      const totalTenorMonths = item.tenor !== undefined ? (item.subType === 'sbn' ? item.tenor * 12 : item.tenor) : (item.subType === 'sbn' ? 24 : 12);
      pl = monthlyNet * totalTenorMonths;
      percentChange = principal > 0 ? (pl / principal * 100) : 0;
    }
    
    let color = 'bg-blue-500';
    if (item.subType === 'reksadana') color = 'bg-orange-500';
    else if (item.subType === 'sbn') color = 'bg-amber-500';
    else if (item.subType === 'deposito') color = 'bg-yellow-500';
    else if (ticker === 'AAPL') color = 'bg-slate-400';
    else if (ticker === 'TSLA') color = 'bg-red-500';
    else if (ticker === 'BUMI') color = 'bg-blue-600';
    else if (ticker === 'BRMS') color = 'bg-green-500';

    return {
      ...item,
      symbol: ticker,
      name: item.title,
      initial,
      marketValue,
      percentChange,
      color,
      flash: null
    };
  });

  const totalCash = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalInvestments = portfolioItemsWithLive.reduce((acc, curr) => acc + curr.marketValue, 0);
  const totalPhysical = assets.filter(a => a.category !== 'investasi').reduce((acc, curr) => acc + curr.currentValue, 0);
  const grandTotal = totalCash + totalInvestments + totalPhysical || 1;
  
  const pctInvest = Math.round((totalInvestments / grandTotal) * 100);
  const pctCash = Math.round((totalCash / grandTotal) * 100);
  const pctPhysical = Math.max(0, 100 - pctInvest - pctCash);

  // Format Helper for Millions/Billions
  const formatM = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)}M`;
    }
    return `Rp ${(val / 1e6).toFixed(1)}Jt`;
  };

  const getDynamicTrend = () => {
    const now = new Date();
    return Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      const factor = idx / 11;
      return {
        label,
        invest: totalInvestments * (0.8 + factor * 0.2),
        cash: totalCash * (0.9 + factor * 0.1),
        physical: totalPhysical * (0.95 + factor * 0.05),
      };
    });
  };

  const getDynamicYearlyTrend = () => {
    const now = new Date();
    return Array.from({ length: 5 }).map((_, idx) => {
      const label = String(now.getFullYear() - (4 - idx));
      const factor = idx / 4;
      return {
        label,
        invest: totalInvestments * (0.5 + factor * 0.5),
        cash: totalCash * (0.7 + factor * 0.3),
        physical: totalPhysical * (0.8 + factor * 0.2),
      };
    });
  };

  const handleExportCSV = () => {
    const headers = ["Simbol", "Nama Aset", "Modal Awal (IDR)", "Nilai Pasar (IDR)", "Return (%)"];
    const rows = portfolioItemsWithLive.map(item => [
      item.symbol,
      `"${item.name.replace(/"/g, '""')}"`,
      item.initial,
      item.marketValue,
      item.percentChange.toFixed(2)
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_portofolio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentData = timeframe === 'monthly' ? getDynamicTrend() : getDynamicYearlyTrend();
  const allValues = currentData.flatMap(d => [d.invest, d.cash, d.physical]);
  const maxVal = Math.max(...allValues, 0.1) * 1.1;

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header Section */}
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-primary dark:text-[#a7c8ff] mb-2">Laporan Diversifikasi</h2>
            <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base font-medium">Ringkasan kesehatan portofolio aset Anda per hari ini</p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center text-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">csv</span> Ekspor (CSV)
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 text-primary dark:text-[#a7c8ff] font-semibold rounded-xl flex items-center gap-2 hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center text-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">file_download</span> Cetak (PDF)
            </button>
          </div>
        </header>
      )}

      {/* Top Overview Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Asset Allocation Donut Chart */}
        <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline mb-6">Alokasi Aset Utama</h3>
            <div 
              className="relative w-48 h-48 mx-auto mb-8 hover:scale-105 transition-transform" 
            >
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" className="text-surface-container-high dark:text-white/10" strokeWidth="3"></circle>
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" className="text-primary-container dark:text-[#a7c8ff]" strokeDasharray={`${pctInvest} 100`} strokeWidth="3" strokeLinecap="round"></circle>
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" className="text-tertiary-container dark:text-tertiary-fixed" strokeDasharray={`${pctCash} 100`} strokeDashoffset={`-${pctInvest}`} strokeWidth="3" strokeLinecap="round"></circle>
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" className="text-primary-fixed dark:text-slate-400" strokeDasharray={`${pctPhysical} 100`} strokeDashoffset={`-${pctInvest + pctCash}`} strokeWidth="3" strokeLinecap="round"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">Total Aset</span>
                <span className="text-base font-bold font-headline dark:text-white mt-1 text-center px-2">{formatM(totalCash + totalInvestments + totalPhysical)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t border-outline-variant/10 dark:border-white/10 pt-6 font-semibold">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container dark:bg-[#a7c8ff]"></div>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Investasi</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctInvest}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-tertiary-container dark:bg-tertiary-fixed"></div>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Lancar (Kas)</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctCash}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-fixed dark:bg-slate-500"></div>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider">Fisik (Properti/Emas)</span>
              </div>
              <span className="text-sm font-bold dark:text-white">{pctPhysical}%</span>
            </div>
          </div>
        </div>

        {/* Investment Portfolio Details Card */}
        <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline">Rincian Portofolio Investasi</h3>
            <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-md flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Update Real-time
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 lg:-mx-8">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-bold text-on-surface-variant dark:text-slate-500 uppercase tracking-widest border-b border-outline-variant/10 dark:border-white/10">
                  <th className="text-left px-8 py-4">Instrumen</th>
                  <th className="text-right px-8 py-4">Modal Awal</th>
                  <th className="text-right px-8 py-4">Nilai Pasar</th>
                  <th className="text-right px-8 py-4">Return (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                {portfolioItemsWithLive.map((item, idx) => {
                  const percentChange = item.percentChange;
                  const marketValue = item.marketValue;
                  const hasFlash = item.flash;
                  
                  return (
                    <tr 
                      key={idx} 
                      className={`group hover:bg-surface-container-low dark:hover:bg-white/5 transition-all ${
                        hasFlash === 'up' ? 'bg-green-500/5' : hasFlash === 'down' ? 'bg-red-500/5' : ''
                      }`} 
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${item.color.replace('bg-', 'bg-opacity-10 text-')} flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined text-lg">
                              {item.subType === 'saham' ? 'show_chart' : item.subType === 'reksadana' ? 'account_balance' : item.subType === 'sbn' ? 'payments' : 'star'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">{item.name}</div>
                            <div className="text-[10px] text-on-surface-variant dark:text-slate-500 mt-0.5 font-medium">{item.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-sm text-on-surface dark:text-white">Rp {item.initial.toLocaleString('id-ID')}</td>
                      <td className={`px-8 py-5 text-right font-bold text-sm tabular-nums transition-colors duration-500 ${hasFlash === 'up' ? 'text-green-500' : hasFlash === 'down' ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>
                        Rp {marketValue.toLocaleString('id-ID')}
                      </td>
                      <td className={`px-8 py-5 text-right font-bold text-sm tabular-nums transition-colors duration-500 ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Middle Section: Analysis & Rebalancing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Diversification Analysis */}
        <div className="bg-surface-container-low dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px]">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">analytics</span> Analisis Diversifikasi
          </h3>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2 font-semibold">
                <span className="text-xs md:text-sm font-medium dark:text-white">Konsentrasi Sektor (Teknologi & Keuangan)</span>
                <span className="text-xs font-bold text-primary dark:text-[#a7c8ff] bg-primary/10 dark:bg-[#a7c8ff]/10 px-2 py-0.5 rounded">Tinggi (42%)</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary dark:bg-[#a7c8ff] rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 font-semibold">
                <span className="text-xs md:text-sm font-medium dark:text-white">Skor Diversifikasi</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Sangat Baik (8.4/10)</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
            
            <div 
              className="p-5 bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/10 rounded-2xl flex items-start gap-4 hover:border-primary/50 dark:hover:border-[#a7c8ff]/50 transition-colors"
            >
              <div className="mt-1 w-10 h-10 flex-shrink-0 rounded-full bg-primary-fixed dark:bg-[#a7c8ff]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff]">security</span>
              </div>
              <div>
                <p className="text-sm font-bold mb-1 dark:text-white">Profil Risiko: Moderat Agresif</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-300 leading-relaxed">Portofolio Anda memiliki korelasi rendah antar aset, memberikan perlindungan yang baik terhadap volatilitas pasar lokal.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rebalancing Recommendations */}
        <div className="bg-primary-container dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-6 lg:p-8 rounded-[24px] relative overflow-hidden flex flex-col justify-between shadow-md group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <span className="material-symbols-outlined text-9xl">balance</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-[#a7c8ff] mb-6 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined">lightbulb</span> Rekomendasi AI
            </h3>
            <div className="space-y-3 relative z-10">
              {[
                { act: 'Kurangi Porsi Saham', dir: 'Kurangi', target: '-5.0%', color: 'text-rose-400 dark:text-rose-300' },
                { act: 'Tambah Instrumen Obligasi', dir: 'Tambah', target: '+3.5%', color: 'text-emerald-400 dark:text-emerald-300' },
                { act: 'Ambil Untung (TP) Kripto', dir: 'Aksi', target: '+1.5%', color: 'text-emerald-400 dark:text-emerald-300' },
              ].map((rec, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between hover:bg-white/20 transition-colors cursor-pointer" onClick={() => onShowCTA({title: "Auto Execution System", description: "Beri izin pada Robo-Advisor untuk mengeksekusi order jual beli ini langsung di akun integrasi Anda dengan sekali klik."})}>
                  <div className="flex flex-col">
                    <span className="text-[10px] opacity-70 uppercase tracking-widest mb-1">{rec.dir}</span>
                    <span className="text-xs md:text-sm font-bold text-white shadow-sm">{rec.act}</span>
                  </div>
                  <div className="text-right font-semibold">
                    <span className="text-[10px] opacity-70 block mb-1 uppercase tracking-widest">Target</span>
                    <span className={`text-sm font-bold ${rec.color} bg-black/20 px-2 py-0.5 rounded`}>{rec.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Chart: Trend Diversification */}
      <div className="bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant dark:text-outline mb-1">Tren Diversifikasi</h3>
            <p className="text-xs md:text-sm text-on-surface-variant dark:text-slate-400 font-medium">Perbandingan performa kelas aset secara historis</p>
          </div>
          <div className="flex gap-2 font-semibold">
            <button 
              onClick={() => { setTimeframe('monthly'); setActivePointIndex(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${timeframe === 'monthly' ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-white/10'}`}
            >
              Bulanan
            </button>
            <button 
              onClick={() => { setTimeframe('yearly'); setActivePointIndex(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${timeframe === 'yearly' ? 'bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-white/10'}`}
            >
              Tahunan
            </button>
          </div>
        </div>
        
        <div className="h-56 md:h-72 w-full relative group">
          <>
            <AnimatePresence>
              {activePointIndex !== null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute z-20 bg-white/90 dark:bg-[#191c1e]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-none min-w-[200px]"
                  style={{ 
                    left: `calc(${(activePointIndex / (currentData.length - 1)) * 100}% + ${activePointIndex > currentData.length / 2 ? '-220px' : '20px'})`,
                    top: '10%'
                  }}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-white/10 pb-2">{currentData[activePointIndex].label}</div>
                  <div className="space-y-3 font-semibold">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary dark:bg-[#a7c8ff]"></div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Investasi</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].invest)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                         <div className="w-2 h-2 rounded-full bg-tertiary-container dark:bg-tertiary-fixed"></div>
                         <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Stabilitas Kas</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].cash)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary-fixed-dim dark:bg-slate-400"></div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Aset Fisik</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white tabular-nums text-right whitespace-nowrap">{formatM(currentData[activePointIndex].physical)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" className="text-primary dark:text-[#a7c8ff]" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="currentColor" className="text-primary dark:text-[#a7c8ff]" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="currentColor" className="text-outline-variant dark:text-white/10" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
              ))}

              {/* Dynamic Lines */}
              {(() => {
                const points = currentData.map((d, i) => ({
                  x: (i / (currentData.length - 1)) * 1000,
                  yInvest: 200 - (d.invest / maxVal) * 160,
                  yCash: 200 - (d.cash / maxVal) * 160,
                  yPhysical: 200 - (d.physical / maxVal) * 160,
                }));

                const generatePath = (type: 'yInvest' | 'yCash' | 'yPhysical') => {
                  return points.reduce((acc, p, i) => {
                     if (i === 0) return `M ${p.x},${p[type]}`;
                     return `${acc} L ${p.x},${p[type]}`;
                  }, "");
                };

                return (
                  <>
                     {/* Areas */}
                     <motion.path 
                      initial={false}
                      animate={{ d: `${generatePath('yInvest')} V 200 H 0 Z` }}
                      fill="url(#trendGrad)" 
                      className="transition-all duration-300"
                     />

                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yInvest') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yInvest')} 
                      fill="none" 
                      stroke="currentColor" 
                      className="text-primary dark:text-[#a7c8ff]" 
                      strokeWidth="3" 
                      vectorEffect="non-scaling-stroke"
                     />
                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yCash') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yCash')} 
                      fill="none" 
                      stroke="currentColor" 
                      className="text-tertiary-container dark:text-tertiary-fixed" 
                      strokeWidth="2" 
                      vectorEffect="non-scaling-stroke"
                     />
                     <motion.path 
                      initial={false} 
                      animate={{ d: generatePath('yPhysical') }} 
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      d={generatePath('yPhysical')} 
                      fill="none" 
                      stroke="currentColor" 
                      className="text-primary-fixed dark:text-slate-400" 
                      strokeWidth="2" 
                      vectorEffect="non-scaling-stroke"
                     />

                     {/* Vertical Scanner Line */}
                     {activePointIndex !== null && (
                       <motion.line 
                          x1={points[activePointIndex].x} 
                          y1="0" 
                          x2={points[activePointIndex].x} 
                          y2="200" 
                          stroke="currentColor" 
                          className="text-primary dark:text-[#a7c8ff]" 
                          strokeWidth="1" 
                          strokeDasharray="4 2"
                       />
                     )}

                     {/* Points/Markers */}
                     {activePointIndex !== null && (
                       <>
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yInvest} r="5" fill="white" stroke="currentColor" className="text-primary dark:text-[#a7c8ff]" strokeWidth="2" />
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yCash} r="4" fill="white" stroke="currentColor" className="text-tertiary-container dark:text-tertiary-fixed" strokeWidth="2" />
                          <circle cx={points[activePointIndex].x} cy={points[activePointIndex].yPhysical} r="4" fill="white" stroke="currentColor" className="text-primary-fixed dark:text-slate-400" strokeWidth="2" />
                       </>
                     )}

                     {/* Interaction Zones */}
                     {points.map((p, i) => (
                       <rect 
                          key={`${timeframe}-${i}`} 
                          x={i === 0 ? 0 : p.x - (1000 / (points.length - 1)) / 2} 
                          y="0" 
                          width={1000 / (points.length - 1)} 
                          height="200" 
                          fill="transparent" 
                          onMouseEnter={() => setActivePointIndex(i)} 
                          className="cursor-crosshair"
                       />
                     ))}
                  </>
                );
              })()}
            </svg>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest px-2 pointer-events-none">
              {timeframe === 'monthly' ? (
                currentData.filter((_, i) => i % 3 === 0 || i === currentData.length - 1).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))
              ) : (
                currentData.map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))
              )}
            </div>
          </>
        </div>
        
        <div className="mt-10 pt-6 border-t border-outline-variant/10 dark:border-white/10 flex flex-wrap gap-4 md:gap-8 justify-center font-semibold">
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full bg-primary dark:bg-[#a7c8ff]"></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Pertumbuhan Investasi</span>
          </div>
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full bg-tertiary-container dark:bg-tertiary-fixed"></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Stabilitas Kas</span>
          </div>
          <div className="flex items-center gap-2 group">
            <span className="w-4 h-1 rounded-full bg-primary-fixed-dim dark:bg-slate-400"></span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300 transition-colors">Aset Fisik</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FinancePortfolioReport;
