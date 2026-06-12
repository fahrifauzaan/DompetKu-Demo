import React, { useState, useEffect } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinancePerformanceReportProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
}

const SECTORS_META = {
  saham: {
    id: 'saham',
    name: 'Saham & Ekuitas',
    icon: 'bar_chart',
    iconBg: 'bg-primary-container dark:bg-primary/20 text-primary dark:text-[#a7c8ff]',
    divYield: '4.2%'
  },
  reksadana: {
    id: 'reksadana',
    name: 'Reksadana & Kolektif',
    icon: 'widgets',
    iconBg: 'bg-secondary-container dark:bg-white/10 text-primary dark:text-[#a7c8ff]',
    divYield: '3.5%'
  },
  sbn: {
    id: 'sbn',
    name: 'SBN & Pendapatan Tetap',
    icon: 'account_balance',
    iconBg: 'bg-amber-500/20 text-amber-500',
    divYield: '6.2%'
  }
};

const BASE_CHART_TREND = [
  { month: 'Jan', portfolio: 0, ihsg: 0 },
  { month: 'Feb', portfolio: 5, ihsg: 2 },
  { month: 'Mar', portfolio: 10, ihsg: -2 },
  { month: 'Apr', portfolio: 8, ihsg: 1 },
  { month: 'Mei', portfolio: 15, ihsg: 3 },
  { month: 'Jun', portfolio: 20, ihsg: 5 },
  { month: 'Jul', portfolio: 18, ihsg: 4 },
  { month: 'Ags', portfolio: 22, ihsg: 6 },
  { month: 'Sep', portfolio: 25, ihsg: 5 },
  { month: 'Okt', portfolio: 22, ihsg: 4 },
  { month: 'Nov', portfolio: 28, ihsg: 5 },
  { month: 'Des', portfolio: 32, ihsg: 6 },
];

const FinancePerformanceReport: React.FC<FinancePerformanceReportProps> = ({ onShowCTA, hideHeader }) => {
  const assets = useFinanceStore((state) => state.assets);

  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const settings = useFinanceStore((state) => state.settings);
  
  const getSettingNum = (key: string, def: number) => {
    const val = settings.find(s => s.key.toLowerCase() === key.toLowerCase())?.value;
    return val && !isNaN(parseFloat(val)) ? parseFloat(val) : def;
  };

  const ihsgPrice = getSettingNum('IHSG_PRICE', 7320);
  const ihsgInitial = getSettingNum('IHSG_INITIAL', 6890);

  const portfolioItems = assets.filter(a => a.category === 'investasi').map(a => ({
    ...a,
    ticker: a.ticker || a.title.split(' ')[0] || 'ASSET',
    shares: a.shares || 1,
    avgCost: a.avgCost || a.purchasePrice || a.currentValue,
    subType: a.subType || 'saham'
  }));



  // Group into 3 sectors
  const sectorAssets: Record<string, any[]> = {
    saham: [],
    reksadana: [],
    sbn: []
  };

  portfolioItems.forEach(item => {
    const subType = item.subType || 'saham';
    if (subType === 'saham') {
      sectorAssets.saham.push(item);
    } else if (subType === 'reksadana') {
      sectorAssets.reksadana.push(item);
    } else {
      sectorAssets.sbn.push(item);
    }
  });

  // Calculate sector metrics in real-time
  const sectorPerformance = Object.keys(SECTORS_META).reduce((acc, sectorKey) => {
    const items = sectorAssets[sectorKey] || [];
    let totalInitial = 0;
    let totalMarketValue = 0;

    items.forEach(item => {
      const initial = item.purchasePrice || item.currentValue;
      let marketValue = item.currentValue;

      // Exclude liquidated/cair assets (currentValue === 0) from active metrics to prevent -100% distortions
      if (marketValue > 0) {
        totalInitial += initial;
        totalMarketValue += marketValue;
      }
    });

    const pl = totalMarketValue - totalInitial;
    const percentChange = totalInitial > 0 ? (pl / totalInitial) * 100 : 0;

    acc[sectorKey] = {
      totalInitial,
      totalMarketValue,
      pl,
      percentChange,
      itemCount: items.length
    };
    return acc;
  }, {} as Record<string, { totalInitial: number; totalMarketValue: number; pl: number; percentChange: number; itemCount: number }>);

  const totalMarketValueAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalInitialAll = Object.values(sectorPerformance).reduce((sum, item) => sum + item.totalInitial, 0);
  const portfolioReturnAll = totalInitialAll > 0 ? ((totalMarketValueAll - totalInitialAll) / totalInitialAll) * 100 : 0;

  const pctSaham = totalMarketValueAll > 0 ? Math.round((sectorPerformance.saham?.totalMarketValue || 0) / totalMarketValueAll * 100) : 0;
  const pctReksadana = totalMarketValueAll > 0 ? Math.round((sectorPerformance.reksadana?.totalMarketValue || 0) / totalMarketValueAll * 100) : 0;
  const pctSbn = totalMarketValueAll > 0 ? Math.max(0, 100 - pctSaham - pctReksadana) : 0;

  // IHSG baseline return
  const ihsgReturn = ihsgInitial > 0 ? ((ihsgPrice - ihsgInitial) / ihsgInitial) * 100 : 6.2;
  const liveAlpha = portfolioReturnAll - ihsgReturn;

  // Scale chart data to end exactly at live calculated values
  const chartData = BASE_CHART_TREND.map((d, i) => {
    const factor = i / (BASE_CHART_TREND.length - 1);
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const dynamicMonth = date.toLocaleDateString('id-ID', { month: 'short' });
    return {
      month: dynamicMonth,
      portfolio: portfolioReturnAll * factor * (d.portfolio / 32 || 1),
      ihsg: ihsgReturn * factor * (d.ihsg / 6 || 1),
    };
  });

  const handleExportCSV = () => {
    const headers = ["Sektor", "Simbol / Aset", "Lembar / Unit", "Modal Awal (IDR)", "Nilai Pasar (IDR)", "Return (%)"];
    const rows: (string | number)[][] = [];

    Object.entries(sectorAssets).forEach(([sectorKey, items]) => {
      const secName = SECTORS_META[sectorKey as keyof typeof SECTORS_META]?.name || sectorKey;
      items.forEach(item => {
        const ticker = item.ticker || item.title;
        const shares = item.shares || 1;
        const initial = item.purchasePrice || item.currentValue;
        let marketValue = item.currentValue;
        const pl = marketValue - initial;
        const ret = initial > 0 ? (pl / initial) * 100 : 0;

        rows.push([
          secName,
          ticker,
          shares,
          initial,
          marketValue,
          ret.toFixed(2)
        ]);
      });
    });

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(import.meta.env.VITE_APP_NAME || 'dompetku').toLowerCase()}_sektoral_performa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSector = (sector: string) => {
    if (expandedSector === sector) {
      setExpandedSector(null);
    } else {
      setExpandedSector(sector);
    }
  };

  // Helper to calculate SVG Y coordinate (Inverse: 0 is top, 200 is bottom)
  const getY = (val: number) => {
    const min = Math.min(-10, portfolioReturnAll - 10, ihsgReturn - 10);
    const max = Math.max(40, portfolioReturnAll + 10, ihsgReturn + 10);
    const range = max - min;
    return 180 - ((val - min) / range) * 160;
  };

  // Generate paths
  const portfolioPoints = chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${getY(d.portfolio)}`).join(' ');
  const ihsgPoints = chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${getY(d.ihsg)}`).join(' ');

  const formatM = (val: number) => {
    if (val >= 1e9) {
      return `Rp ${(val / 1e9).toFixed(2)}M`;
    }
    return `Rp ${(val / 1e6).toFixed(1)}Jt`;
  };

  // Identify underperforming sector
  const sortedSectors = Object.entries(sectorPerformance).sort((a, b) => a[1].percentChange - b[1].percentChange);
  const worstSectorKey = sortedSectors[0]?.[0] || 'saham';
  const worstSectorName = SECTORS_META[worstSectorKey as keyof typeof SECTORS_META]?.name || worstSectorKey;
  const worstSectorRet = sortedSectors[0]?.[1]?.percentChange || 0;

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl lg:text-3xl font-extrabold tracking-tighter text-primary dark:text-[#a7c8ff]">Analisis Sektor Saham & Investasi</h2>
            <p className="text-on-surface-variant dark:text-outline text-sm lg:text-base mt-2 max-w-xl">Evaluasi mendalam distribusi modal dan performa sektoral dalam portofolio institusi Anda.</p>
          </div>
          <div className="flex flex-wrap gap-3 no-print">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-surface-container-low dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 font-semibold text-sm rounded-xl hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">csv</span> Ekspor (CSV)
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-surface-container-low dark:bg-white/5 text-primary dark:text-[#a7c8ff] border border-outline-variant/20 dark:border-white/10 font-semibold text-sm rounded-xl hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex-1 md:flex-none justify-center flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">file_download</span> Cetak (PDF)
            </button>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Performance Benchmark vs IHSG */}
        <section className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Benchmark IHSG</h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 font-medium">Perbandingan performa kumulatif 12 bulan terakhir</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold bg-surface-container-low dark:bg-white/5 py-1.5 px-3 rounded-xl border border-outline-variant/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-[#a7c8ff]"></span>
                <span className="text-on-surface dark:text-white">Portofolio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-outline-variant dark:bg-slate-500"></span>
                <span className="text-on-surface-variant dark:text-slate-400">IHSG</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Line Chart */}
          <div className="h-56 relative flex items-end justify-between gap-1 px-2 border-b border-outline-variant/20 dark:border-white/10 mb-4 cursor-crosshair group">
            <svg className="absolute inset-0 w-full h-full preserve-3d" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 200">
              {/* Grid Lines */}
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="currentColor" className="text-outline-variant dark:text-white/10" strokeWidth="1" strokeDasharray="4" opacity="0.3" />
              ))}
              
              {/* IHSG Path */}
              <polyline points={ihsgPoints} stroke="currentColor" className="text-outline-variant dark:text-slate-500" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              
              {/* Portfolio Path */}
              <polyline points={portfolioPoints} stroke="currentColor" className="text-primary dark:text-[#a7c8ff]" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              
              {/* Hover Indicator Line */}
              {hoveredIndex !== null && (
                <line 
                  x1={(hoveredIndex / (chartData.length - 1)) * 1000} 
                  y1="0" 
                  x2={(hoveredIndex / (chartData.length - 1)) * 1000} 
                  y2="200" 
                  stroke="currentColor" 
                  className="text-primary dark:text-[#a7c8ff] opacity-30" 
                  strokeWidth="1" 
                  strokeDasharray="4" 
                />
              )}

              {/* Hover Points */}
              {hoveredIndex !== null && chartData[hoveredIndex] && (
                <>
                  <circle 
                    cx={(hoveredIndex / (chartData.length - 1)) * 1000} 
                    cy={getY(chartData[hoveredIndex].ihsg)} 
                    r="4" 
                    fill="white" 
                    className="stroke-slate-500" 
                    strokeWidth="2" 
                  />
                  <circle 
                    cx={(hoveredIndex / (chartData.length - 1)) * 1000} 
                    cy={getY(chartData[hoveredIndex].portfolio)} 
                    r="6" 
                    fill="white" 
                    className="stroke-primary dark:stroke-[#a7c8ff]" 
                    strokeWidth="3" 
                  />
                </>
              )}

              {/* Interaction Zones */}
              {chartData.map((_, i) => (
                <rect
                  key={i}
                  x={(i / (chartData.length - 1)) * 1000 - 500 / (chartData.length - 1)}
                  y="0"
                  width={1000 / (chartData.length - 1)}
                  height="200"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>
            
            {/* Dynamic Tooltip */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <div 
                className="absolute bg-surface dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-outline-variant/20 dark:border-white/10 text-xs pointer-events-none transition-all duration-200 z-10"
                style={{ 
                  left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                  bottom: '60%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="font-bold dark:text-white mb-2 border-b border-outline-variant/10 pb-1">{chartData[hoveredIndex].month} 2026</div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-primary dark:text-[#a7c8ff] flex justify-between gap-6 items-center">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-[#a7c8ff]"></span> Portofolio:</span> 
                    <span className="font-bold">{chartData[hoveredIndex].portfolio >= 0 ? '+' : ''}{chartData[hoveredIndex].portfolio.toFixed(1)}%</span>
                  </div>
                  <div className="text-outline-variant dark:text-slate-400 flex justify-between gap-6 items-center">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> IHSG:</span> 
                    <span className="font-bold">{chartData[hoveredIndex].ihsg >= 0 ? '+' : ''}{chartData[hoveredIndex].ihsg.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Month Labels */}
            <div className="absolute -bottom-6 w-full flex justify-between text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-wider">
              {chartData.filter((_, i) => i % 2 === 0 || i === 11).map((d, i) => (
                <span key={i}>{d.month}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-12">
            <div className="bg-surface-container-low/50 dark:bg-white/5 p-3 md:p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors duration-500">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Return Portofolio</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-bold text-primary dark:text-[#a7c8ff]">{portfolioReturnAll >= 0 ? '+' : ''}{portfolioReturnAll.toFixed(1)}%</span>
                <span className="text-[10px] text-tertiary-container dark:text-tertiary-fixed font-bold">YTD</span>
              </div>
            </div>
            <div className="bg-surface-container-low/50 dark:bg-white/5 p-3 md:p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors duration-500">
              <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Return IHSG</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-bold text-on-surface-variant dark:text-slate-300">{ihsgReturn >= 0 ? '+' : ''}{ihsgReturn.toFixed(1)}%</span>
                <span className="text-[10px] text-on-surface-variant dark:text-slate-500 font-bold">YTD</span>
              </div>
            </div>
            <div className="bg-primary/5 dark:bg-[#a7c8ff]/10 p-3 md:p-4 rounded-xl border border-primary/10 dark:border-[#a7c8ff]/20">
              <span className="text-[10px] font-bold text-primary dark:text-[#a7c8ff] uppercase tracking-widest block mb-1 truncate">Alpha (Outperform)</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-base md:text-lg font-bold ${liveAlpha >= 0 ? 'text-primary dark:text-[#a7c8ff]' : 'text-error'}`}>
                  {liveAlpha >= 0 ? '+' : ''}{liveAlpha.toFixed(1)}%
                </span>
                <span className="material-symbols-outlined text-sm text-primary dark:text-[#a7c8ff]">trending_up</span>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Metrics Summary & Heatmap */}
        <section className="lg:col-span-4 space-y-6 lg:space-y-8 flex flex-col justify-between">
          <div className="bg-surface-container-lowest dark:bg-transparent p-6 lg:p-8 rounded-[24px] shadow-sm border border-outline-variant/10 dark:border-white/10 flex-1">
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white mb-6">Metrik Risiko & Alpha</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-surface-container-low/50 dark:bg-white/5 border border-outline-variant/5 dark:border-white/5">
                <div className="pr-4">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block uppercase tracking-wider">Alpha Sektoral</span>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-400 leading-tight mt-1">Kemampuan menghasilkan return di atas benchmark</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-headline font-extrabold text-primary dark:text-[#a7c8ff]">{liveAlpha.toFixed(2)}</span>
                  <span className="text-[10px] block font-bold text-tertiary-container dark:text-tertiary-fixed bg-tertiary-fixed/30 dark:bg-tertiary-fixed/20 px-2 py-0.5 rounded-md mt-1">
                    {liveAlpha > 5 ? 'Sangat Tinggi' : liveAlpha > 0 ? 'Positif' : 'Netral'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-surface-container-low/50 dark:bg-white/5 border border-outline-variant/5 dark:border-white/5">
                <div className="pr-4">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block uppercase tracking-wider">Beta Portofolio</span>
                  <p className="text-[10px] text-on-surface-variant/70 dark:text-slate-400 leading-tight mt-1">Sensitivitas terhadap pergerakan IHSG</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-headline font-extrabold text-on-surface dark:text-white">1.08</span>
                  <span className="text-[10px] block font-bold text-on-surface-variant dark:text-slate-300 bg-surface-variant dark:bg-slate-700 px-2 py-0.5 rounded-md mt-1">Moderat</span>
                </div>
              </div>
              
              <div className="pt-4 mt-2 border-t border-outline-variant/10 dark:border-white/10 flex gap-4">
                <div className="flex-1 bg-surface-container-low/30 dark:bg-white/5 p-3 rounded-lg flex justify-between items-center transition-colors">
                  <span className="text-xs text-on-surface-variant dark:text-slate-400">Sharpe Ratio</span>
                  <span className="font-bold text-sm dark:text-white">2.28</span>
                </div>
                <div className="flex-1 bg-surface-container-low/30 dark:bg-white/5 p-3 rounded-lg flex justify-between items-center transition-colors">
                  <span className="text-xs text-on-surface-variant dark:text-slate-400">Std. Dev</span>
                  <span className="font-bold text-sm dark:text-white">11.8%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Heatmap preview */}
          <div 
            className="bg-surface-container-low dark:bg-transparent dark:border dark:border-white/10 p-6 rounded-[24px] hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-xs uppercase tracking-widest font-bold text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors">Peta Panas Sektor</h3>
              <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-error dark:from-error-container via-surface-container-high dark:via-slate-600 to-tertiary-fixed-dim dark:to-tertiary-fixed"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 h-24">
              <div className={`rounded-lg p-3 flex flex-col justify-between transition-colors duration-500 bg-tertiary-container/90 dark:bg-tertiary-fixed/30`}>
                <span className="text-[10px] text-tertiary-fixed dark:text-tertiary-fixed font-bold uppercase">Saham</span>
                <span className="text-sm font-bold text-white">+{sectorPerformance.saham?.percentChange.toFixed(1)}%</span>
              </div>
              <div className={`rounded-lg p-3 flex flex-col justify-between transition-colors duration-500 bg-primary-container dark:bg-primary/50`}>
                <span className="text-[10px] text-on-primary-container dark:text-[#a7c8ff] font-bold uppercase">Kolektif</span>
                <span className="text-sm font-bold text-white">+{sectorPerformance.reksadana?.percentChange.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Visualisasi Alokasi Modal (Treemap Mockup) */}
        <section className="lg:col-span-8 bg-surface-container-lowest dark:bg-transparent border border-outline-variant/10 dark:border-white/10 p-6 lg:p-8 rounded-[24px] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-2">
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Visualisasi Alokasi Modal Sektoral</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-white/5 py-1 px-2.5 rounded shadow-sm">
              <span className="material-symbols-outlined text-sm">pie_chart</span> Porsi Portofolio
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 md:grid-rows-2 gap-3 h-auto md:h-72">
            {/* Saham & Ekuitas */}
            <div 
              className={`md:col-span-3 md:row-span-2 rounded-[20px] p-6 lg:p-8 flex flex-col justify-between group cursor-pointer hover:border-tertiary-fixed border-2 border-transparent transition-all shadow-md relative overflow-hidden bg-tertiary-container/90 dark:bg-[#002f1e]/80`} 
              onClick={() => toggleSector('saham')}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                <span className="material-symbols-outlined text-9xl">bar_chart</span>
              </div>
              <div className="relative z-10">
                <span className="text-tertiary-fixed dark:text-tertiary-fixed text-xs font-bold uppercase tracking-widest bg-tertiary-fixed/10 px-2 py-1 rounded">{pctSaham}% Portofolio</span>
                <h4 className="text-white text-3xl md:text-4xl font-headline font-bold mt-3">Saham & Ekuitas</h4>
              </div>
              <div className="flex justify-between items-end relative z-10 mt-6 md:mt-0">
                <span className="text-tertiary-fixed-dim dark:text-tertiary-fixed text-2xl md:text-3xl font-bold tabular-nums">
                  {sectorPerformance.saham?.percentChange >= 0 ? '+' : ''}{sectorPerformance.saham?.percentChange.toFixed(1)}%
                </span>
                <span className="material-symbols-outlined text-white opacity-20 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 text-3xl">trending_up</span>
              </div>
            </div>
            
            {/* Reksadana & Kolektif */}
            <div 
              className={`md:col-span-2 rounded-[20px] p-5 flex flex-col justify-between cursor-pointer hover:border-[#a7c8ff] border-2 border-transparent transition-all shadow-md bg-primary-container dark:bg-[#002f5e]`}
              onClick={() => toggleSector('reksadana')}
            >
              <div>
                <span className="text-on-primary-container dark:text-[#a7c8ff] text-[10px] md:text-xs font-bold uppercase tracking-widest">{pctReksadana}% Portofolio</span>
                <h4 className="text-white text-xl md:text-2xl font-headline font-bold mt-1">Reksadana & Kolektif</h4>
              </div>
              <div className="flex justify-between items-end mt-4 md:mt-0">
                <span className="text-on-primary-container dark:text-[#a7c8ff] text-lg font-bold tabular-nums">
                  {sectorPerformance.reksadana?.percentChange >= 0 ? '+' : ''}{sectorPerformance.reksadana?.percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* SBN & Pendapatan Tetap */}
            <div 
              className="md:col-span-2 rounded-[20px] p-5 flex flex-col justify-between cursor-pointer hover:border-amber-500 border-2 border-transparent transition-all shadow-md bg-surface-container-highest dark:bg-surface-variant/20" 
              onClick={() => toggleSector('sbn')}
            >
              <div>
                <span className="text-on-surface-variant dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">{pctSbn}% Portofolio</span>
                <h4 className="text-on-surface dark:text-white text-xl md:text-2xl font-headline font-bold mt-1">SBN & Pendapatan Tetap</h4>
              </div>
              <div className="flex justify-between items-end mt-4 md:mt-0">
                <span className="text-on-surface-variant dark:text-slate-300 text-lg font-bold tabular-nums">
                  {sectorPerformance.sbn?.percentChange >= 0 ? '+' : ''}{sectorPerformance.sbn?.percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Insight Box */}
        <section className="lg:col-span-4 flex flex-col">
          <div className="bg-primary dark:bg-gradient-to-br dark:from-[#00174a] dark:to-[#002366] p-6 lg:p-8 rounded-[24px] text-white relative overflow-hidden h-full flex flex-col justify-center shadow-lg group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <span className="material-symbols-outlined text-9xl text-white">lightbulb</span>
            </div>
            <h3 className="font-headline text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2 relative z-10 text-tertiary-fixed-dim dark:text-tertiary-fixed">
              <span className="material-symbols-outlined">auto_awesome</span> Wawasan Arsitek
            </h3>
            <div className="space-y-4 relative z-10">
              <div 
                className="bg-white/10 dark:bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                <p className="text-[10px] text-primary-fixed dark:text-[#a7c8ff] font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">flag</span> Strategi Benchmark</p>
                <p className="text-sm md:text-xs lg:text-sm leading-relaxed text-blue-50">Portofolio Anda mempertahankan <strong className="text-white">Alpha Positif</strong> sebesar {liveAlpha.toFixed(1)}% vs IHSG. Kelebihan return didominasi kuat oleh efek pemilihan aset saham ekuitas Anda.</p>
              </div>
              <div 
                className="bg-white/10 dark:bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                <p className="text-[10px] text-tertiary-fixed dark:text-tertiary-fixed font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">my_location</span> Peluang Strategis</p>
                <p className="text-sm md:text-xs lg:text-sm leading-relaxed text-blue-50">Sektor <strong className="text-white">{worstSectorName}</strong> ({worstSectorRet.toFixed(1)}%) adalah alokasi dengan performa terendah Anda. Evaluasi diversifikasi berkala disarankan.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Breakdown Performa Sektor Table */}
        <section className="col-span-1 lg:col-span-12">
          <div className="bg-surface-container-lowest dark:bg-transparent rounded-[24px] shadow-sm overflow-hidden border border-outline-variant/10 dark:border-white/10">
            <div className="p-6 lg:p-8 border-b border-outline-variant/10 dark:border-white/10">
              <h3 className="font-headline text-sm uppercase tracking-widest font-bold text-on-surface dark:text-white">Rincian Performa Sektoral</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50 dark:bg-white/5 text-on-surface-variant dark:text-outline text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 lg:px-8 py-5">Sektor & Emiten</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Total Investasi (IDR)</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Capital Gain/Loss</th>
                    <th className="px-6 lg:px-8 py-5 text-right">Yield Dividen (Est)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5 dark:divide-white/5">
                  {Object.entries(SECTORS_META).map(([sectorKey, meta]) => {
                    const perf = sectorPerformance[sectorKey] || { totalInitial: 0, totalMarketValue: 0, pl: 0, percentChange: 0, itemCount: 0 };
                    const items = sectorAssets[sectorKey] || [];
                    const isExpanded = expandedSector === sectorKey;

                    return (
                      <React.Fragment key={sectorKey}>
                        <tr 
                          className="group hover:bg-surface-bright/50 dark:hover:bg-white/5 transition-all cursor-pointer" 
                          onClick={() => toggleSector(sectorKey)}
                        >
                          <td className="px-6 lg:px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{meta.icon}</span>
                              </div>
                              <div>
                                <span className="font-headline font-bold text-on-surface dark:text-white block group-hover:text-primary dark:group-hover:text-[#a7c8ff] transition-colors flex items-center gap-2">
                                  {meta.name}
                                  <span className={`material-symbols-outlined text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </span>
                                <span className="text-xs text-on-surface-variant dark:text-slate-400">{perf.itemCount} Aset Aktif</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-6 text-right tabular-nums font-semibold text-sm dark:text-slate-300">
                            Rp {perf.totalMarketValue.toLocaleString('id-ID')}
                          </td>
                          <td className={`px-6 lg:px-8 py-6 text-right tabular-nums font-bold text-sm transition-colors duration-500 ${perf.percentChange >= 0 ? 'text-green-500' : 'text-error'}`}>
                            {perf.percentChange >= 0 ? '+' : ''}{perf.percentChange.toFixed(2)}%
                          </td>
                          <td className="px-6 lg:px-8 py-6 text-right tabular-nums text-on-surface-variant dark:text-slate-400 text-sm">
                            {meta.divYield}
                          </td>
                        </tr>

                        {/* Accordion detail */}
                        {isExpanded && (
                          <tr className="bg-surface-container-low/30 dark:bg-white/5">
                            <td colSpan={4} className="px-6 lg:px-12 py-6 border-b-2 border-primary/20 dark:border-[#a7c8ff]/20">
                              {items.length === 0 ? (
                                <p className="text-xs text-on-surface-variant dark:text-slate-400 italic">Tidak ada instrumen aktif di sektor ini.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
                                  {items.map((item) => {
                                    const ticker = item.ticker || item.title;
                                    const initial = item.purchasePrice || item.currentValue;
                                    let marketValue = item.currentValue;
                                    
                                    const isLiquidated = marketValue === 0;
                                    const itemPl = isLiquidated ? 0 : (marketValue - initial);
                                    const itemReturn = isLiquidated ? 0 : (initial > 0 ? (itemPl / initial) * 100 : 0);

                                    return (
                                      <div 
                                        key={item.id}
                                        className="bg-surface-container-lowest dark:bg-black/20 p-4 rounded-xl border border-outline-variant/10 dark:border-white/10 transition-colors"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-xs font-bold font-headline text-primary dark:text-[#a7c8ff] truncate max-w-[120px]">{ticker}</span>
                                          {isLiquidated ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                              TELAH CAIR
                                            </span>
                                          ) : (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest transition-colors duration-500 ${itemReturn >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                              {itemReturn >= 0 ? '+' : ''}{itemReturn.toFixed(1)}%
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-semibold text-on-surface dark:text-white">Rp {marketValue.toLocaleString('id-ID')}</span>
                                          <span className="text-[9px] text-on-surface-variant dark:text-slate-400">Modal: Rp {initial.toLocaleString('id-ID')}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>

      {/* Metric Footer Summary */}
      <footer className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-primary/5 dark:bg-white/5 p-6 rounded-[20px] border-l-4 border-primary dark:border-[#a7c8ff] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-2">Total Nilai Sektoral</span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-primary dark:text-white truncate">
            {formatM(totalMarketValueAll)}
          </span>
        </div>
        <div className="bg-tertiary-fixed-dim/20 dark:bg-tertiary-fixed/10 p-6 rounded-[20px] border-l-4 border-tertiary-container dark:border-tertiary-fixed flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-1">Alpha Portofolio</span>
          <span className="text-sm font-bold text-tertiary-container dark:text-tertiary-fixed mb-1 flex items-center gap-1 transition-colors duration-500">
            {liveAlpha >= 0 ? '+' : ''}{liveAlpha.toFixed(2)}% vs IHSG
          </span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-tertiary-container dark:text-tertiary-fixed truncate">Live Analysis</span>
        </div>
        <div className="bg-error-container/20 dark:bg-error/10 p-6 rounded-[20px] border-l-4 border-error dark:border-[#ffb4ab] flex flex-col justify-center">
          <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest block mb-2">Sektor Underperform</span>
          <span className="text-xl md:text-2xl font-headline font-extrabold text-error dark:text-[#ffb4ab] truncate">
            {worstSectorName} ({worstSectorRet.toFixed(1)}%)
          </span>
        </div>
      </footer>

    </div>
  );
};

export default FinancePerformanceReport;
