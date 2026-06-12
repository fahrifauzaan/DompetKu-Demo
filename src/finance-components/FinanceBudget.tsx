import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { FeatureCTA } from './MarketingCTAModal';

interface FinanceBudgetProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onNavigate?: (tab: string) => void;
}

const FinanceBudget: React.FC<FinanceBudgetProps> = ({ onShowCTA, onNavigate }) => {
  const { budgetCategories, transactions, monthlyBudgets, updateMonthlyBudget } = useFinanceStore();
  
  // State untuk tanggal aktif
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'INCOME' | 'SAVINGS' | 'INVESTMENT'>('EXPENSES');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNum = selectedDate.getMonth();
  const selectedMonthStr = selectedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const selectedMonthKey = String(selectedMonthNum + 1).padStart(2, '0');
  const yearMonth = `${selectedYear}-${selectedMonthKey}`;

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Klasifikasi kategori budget ke 4 kelompok utama
  const getCategoryGroup = (catName: string, type: 'Pengeluaran' | 'Pemasukan') => {
    if (type === 'Pemasukan') return 'INCOME';
    
    const norm = catName.toLowerCase();
    if (
      norm.includes('saving') || 
      norm.includes('tabungan') || 
      norm.includes('darurat') || 
      norm.includes('emergency') || 
      norm.includes('sinking')
    ) {
      return 'SAVINGS';
    }
    
    if (
      norm.includes('invest') || 
      norm.includes('saham') || 
      norm.includes('crypto') || 
      norm.includes('reksa') || 
      norm.includes('bond') || 
      norm.includes('emas') || 
      norm.includes('gold') || 
      norm.includes('kripto')
    ) {
      return 'INVESTMENT';
    }
    
    return 'EXPENSES';
  };

  // Helper untuk mendapatkan nominal budget bulanan
  const getBudgetAmount = (catId: string, catName: string): number => {
    if (monthlyBudgets[yearMonth] && monthlyBudgets[yearMonth][catName] !== undefined) {
      return monthlyBudgets[yearMonth][catName];
    }
    const cat = budgetCategories.find(c => c.id === catId);
    return cat ? cat.allocated : 0;
  };

  // Helper untuk mendapatkan nominal transaksi aktual bulanan
  const getActualAmount = (catName: string, type: 'PENGELUARAN' | 'PEMASUKAN'): number => {
    return Math.abs(
      transactions
        .filter(tx => {
          if (tx.category.toLowerCase() !== catName.toLowerCase()) return false;
          if (type === 'PEMASUKAN' && tx.type !== 'PEMASUKAN') return false;
          if (type === 'PENGELUARAN' && tx.type !== 'PENGELUARAN') return false;
          
          const txDate = new Date(tx.date);
          if (isNaN(txDate.getTime())) return false;
          return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonthNum;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    );
  };

  // PEMROSESAN DATA PER KELOMPOK UNTUK BULAN AKTIF
  const processGroupData = (group: 'INCOME' | 'EXPENSES' | 'SAVINGS' | 'INVESTMENT') => {
    const list = budgetCategories.filter(c => getCategoryGroup(c.name, c.type) === group);
    
    return list.map(cat => {
      const budget = getBudgetAmount(cat.id, cat.name);
      const actual = getActualAmount(cat.name, cat.type === 'Pemasukan' ? 'PEMASUKAN' : 'PENGELUARAN');
      const percent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
      
      let status = 'DI BAWAH';
      if (percent >= 100) {
        status = 'MELEBIHI';
      } else if (percent >= 90) {
        status = 'MENDEKATI LIMIT';
      }

      return {
        ...cat,
        budget,
        actual,
        percent,
        status,
      };
    });
  };

  const processedData = {
    INCOME: processGroupData('INCOME'),
    EXPENSES: processGroupData('EXPENSES'),
    SAVINGS: processGroupData('SAVINGS'),
    INVESTMENT: processGroupData('INVESTMENT'),
  };

  // Perhitungan total bulanan
  const getGroupTotals = (group: 'INCOME' | 'EXPENSES' | 'SAVINGS' | 'INVESTMENT') => {
    const list = processedData[group];
    const budgetTotal = list.reduce((sum, item) => sum + item.budget, 0);
    const actualTotal = list.reduce((sum, item) => sum + item.actual, 0);
    return { budgetTotal, actualTotal };
  };

  const totals = {
    INCOME: getGroupTotals('INCOME'),
    EXPENSES: getGroupTotals('EXPENSES'),
    SAVINGS: getGroupTotals('SAVINGS'),
    INVESTMENT: getGroupTotals('INVESTMENT'),
  };

  const totalBudgetOutflow = totals.EXPENSES.budgetTotal + totals.SAVINGS.budgetTotal + totals.INVESTMENT.budgetTotal;
  const totalActualOutflow = totals.EXPENSES.actualTotal + totals.SAVINGS.actualTotal + totals.INVESTMENT.actualTotal;
  
  const leftToAllocateBudget = totals.INCOME.budgetTotal - totalBudgetOutflow;
  const leftToAllocateActual = totals.INCOME.actualTotal - totalActualOutflow;

  const outflowPercent = totals.INCOME.budgetTotal > 0 ? Math.round((totalBudgetOutflow / totals.INCOME.budgetTotal) * 100) : 0;
  const outflowActualPercent = totals.INCOME.actualTotal > 0 ? Math.round((totalActualOutflow / totals.INCOME.actualTotal) * 100) : 0;

  // Edit cell handler
  const handleEditClick = (catId: string, currentVal: number) => {
    setEditingCatId(catId);
    setEditValue(currentVal.toString());
  };

  const handleSave = async (catName: string) => {
    if (!editingCatId) return;
    const amount = Number(editValue) || 0;
    await updateMonthlyBudget(yearMonth, catName, amount);
    setEditingCatId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, catName: string) => {
    if (e.key === 'Enter') {
      handleSave(catName);
    } else if (e.key === 'Escape') {
      setEditingCatId(null);
    }
  };

  // Render group list
  const activeItems = processedData[activeTab];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* HEADER UTAMA & MONTH PICKER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-on-surface dark:text-white">Budget vs Aktual</h1>
          <p className="text-on-surface-variant dark:text-outline mt-1 font-body text-sm">
            Bandingkan rencana anggaran (budgeting) vs realisasi pengeluaran aktual pada periode aktif.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector Premium */}
          <div className="flex items-center bg-surface-container-high dark:bg-white/5 p-1 rounded-full border border-outline-variant/10 dark:border-white/5 w-fit">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-bright dark:hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface dark:text-white">chevron_left</span>
            </button>
            <span className="px-4 lg:px-6 font-headline font-bold text-on-surface dark:text-white uppercase tracking-widest text-xs lg:text-sm">
              {selectedMonthStr}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-surface-bright dark:hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface dark:text-white">chevron_right</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('add-category')}
            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-transform h-10"
          >
            <span className="material-symbols-outlined text-[1.1rem]">add</span>
            Kategori
          </button>
        </div>
      </header>

      {/* OVERALL PERFORMANCE BENTO PANELS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TOTAL INCOME PANEL */}
        <div className="bg-surface-container-lowest dark:bg-white/5 p-6 rounded-2xl border border-outline-variant/10 dark:border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block mb-2">Total Pendapatan (Bulan Ini)</span>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-on-surface-variant dark:text-outline">
                Rencana: <span className="tabular-nums font-bold">Rp {totals.INCOME.budgetTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold font-headline text-green-700 dark:text-[#a3cfbb] tabular-nums">
                Aktual: Rp {totals.INCOME.actualTotal.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-green-600 h-full rounded-full" 
              style={{ width: `${totals.INCOME.budgetTotal > 0 ? Math.min((totals.INCOME.actualTotal / totals.INCOME.budgetTotal) * 100, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* TOTAL OUTFLOW PANEL (EXPENSES + SAVINGS + INVESTMENT) */}
        <div className="bg-surface-container-lowest dark:bg-white/5 p-6 rounded-2xl border border-outline-variant/10 dark:border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block mb-2">Total Pengeluaran & Alokasi</span>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-on-surface-variant dark:text-outline">
                Rencana: <span className="tabular-nums font-bold">Rp {totalBudgetOutflow.toLocaleString('id-ID')} ({outflowPercent}%)</span>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold font-headline text-red-600 dark:text-[#ffb4ab] tabular-nums">
                Aktual: Rp {totalActualOutflow.toLocaleString('id-ID')} ({outflowActualPercent}%)
              </div>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${totalActualOutflow > totalBudgetOutflow ? 'bg-red-600' : 'bg-primary'}`}
              style={{ width: `${totalBudgetOutflow > 0 ? Math.min((totalActualOutflow / totalBudgetOutflow) * 100, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* LEFT TO ALLOCATE / SISA DANA */}
        <div className="bg-surface-container-lowest dark:bg-white/5 p-6 rounded-2xl border border-outline-variant/10 dark:border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest block mb-2">Sisa Dana (Left to allocate)</span>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-on-surface-variant dark:text-outline">
                Rencana: <span className={`tabular-nums font-bold ${leftToAllocateBudget < 0 ? 'text-red-500' : ''}`}>Rp {leftToAllocateBudget.toLocaleString('id-ID')}</span>
              </div>
              <div className={`text-2xl lg:text-3xl font-extrabold font-headline tabular-nums ${leftToAllocateActual < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                Aktual: Rp {leftToAllocateActual.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          <div className="absolute right-4 bottom-4 opacity-5 dark:opacity-10">
            <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
          </div>
        </div>
      </section>

      {/* INTERACTIVE 4 TABS VIEW (EXCEL BYE-BYE!) */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/20 dark:border-white/10 pb-2">
          {/* Tabs header */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('EXPENSES')}
              className={`pb-3 text-sm font-headline font-extrabold transition-all relative ${activeTab === 'EXPENSES' ? 'text-primary dark:text-[#a7c8ff]' : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-white'}`}
            >
              🛒 Belanja & Operasional
              {activeTab === 'EXPENSES' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-[#a7c8ff] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('INCOME')}
              className={`pb-3 text-sm font-headline font-extrabold transition-all relative ${activeTab === 'INCOME' ? 'text-green-600 dark:text-[#a3cfbb]' : 'text-on-surface-variant dark:text-slate-400 hover:text-green-600 dark:hover:text-white'}`}
            >
              💵 Pendapatan
              {activeTab === 'INCOME' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-[#a3cfbb] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('SAVINGS')}
              className={`pb-3 text-sm font-headline font-extrabold transition-all relative ${activeTab === 'SAVINGS' ? 'text-amber-600 dark:text-[#ffe69c]' : 'text-on-surface-variant dark:text-slate-400 hover:text-amber-600 dark:hover:text-white'}`}
            >
              🐖 Tabungan & Sinking Fund
              {activeTab === 'SAVINGS' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-[#ffe69c] rounded-full"></span>}
            </button>
            <button
              onClick={() => setActiveTab('INVESTMENT')}
              className={`pb-3 text-sm font-headline font-extrabold transition-all relative ${activeTab === 'INVESTMENT' ? 'text-blue-600 dark:text-[#b6d4fe]' : 'text-on-surface-variant dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'}`}
            >
              📈 Investasi & Saham
              {activeTab === 'INVESTMENT' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-[#b6d4fe] rounded-full"></span>}
            </button>
          </div>
          
          <div className="text-xs font-bold text-on-surface-variant dark:text-outline bg-surface-container dark:bg-white/5 px-3 py-1.5 rounded-full">
            Total Rencana: <span className="text-primary dark:text-[#a7c8ff] font-extrabold">Rp {totals[activeTab].budgetTotal.toLocaleString('id-ID')}</span> • Aktual: <span className="font-extrabold">Rp {totals[activeTab].actualTotal.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* DETAILED CATEGORIES BENTO LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeItems.length > 0 ? (
            activeItems.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const isOver = cat.actual > cat.budget;
              const remaining = cat.budget - cat.actual;
              
              // Custom colors & styles based on budget health status
              let healthText = 'Aman';
              let healthBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300';
              let progressColor = 'bg-primary dark:bg-[#a7c8ff]';
              
              if (cat.status === 'MELEBIHI') {
                healthText = 'Overbudget';
                healthBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
                progressColor = 'bg-red-600';
              } else if (cat.status === 'MENDEKATI LIMIT') {
                healthText = 'Hampir Limit';
                healthBadgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
                progressColor = 'bg-amber-500';
              }

              // Custom styles if category type is Pemasukan
              if (cat.type === 'Pemasukan') {
                healthText = cat.actual >= cat.budget ? 'Target Tercapai' : 'Di Bawah Target';
                healthBadgeClass = cat.actual >= cat.budget ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                progressColor = 'bg-green-600';
              }

              return (
                <div 
                  key={cat.id} 
                  className="bg-surface-container-lowest dark:bg-white/5 p-6 rounded-2xl border border-outline-variant/10 dark:border-white/5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-white/5 flex items-center justify-center text-primary dark:text-white font-headline">
                        <span className="material-symbols-outlined">{cat.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold font-headline text-on-surface dark:text-white">{cat.name}</h4>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${healthBadgeClass}`}>
                          {healthText}
                        </span>
                      </div>
                    </div>

                    {/* Rencana Budget Field */}
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-on-surface-variant dark:text-outline uppercase tracking-wider block">Rencana (Budget)</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSave(cat.name)}
                            onKeyDown={(e) => handleKeyDown(e, cat.name)}
                            className="bg-surface-container dark:bg-slate-800 border border-primary px-2 py-1 rounded text-right text-xs outline-none focus:ring-1 focus:ring-primary font-bold dark:text-white w-24"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleEditClick(cat.id, cat.budget)}
                          className="text-base font-bold text-primary dark:text-[#a7c8ff] hover:underline cursor-pointer flex items-center gap-1 justify-end mt-1"
                        >
                          Rp {cat.budget.toLocaleString('id-ID')}
                          <span className="material-symbols-outlined text-xs opacity-50">edit</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* METRICS PROGRESS BAR */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-on-surface-variant dark:text-outline">Aktual Terpakai:</span>
                      <span className="font-extrabold tabular-nums dark:text-white">Rp {cat.actual.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold mt-1.5">
                      <span className="text-on-surface-variant dark:text-outline">{cat.percent}% Terpakai</span>
                      {cat.type === 'Pemasukan' ? (
                        <span className={cat.actual >= cat.budget ? 'text-green-600' : 'text-slate-500'}>
                          {cat.actual >= cat.budget ? 'Target Tercapai!' : `Kurang Rp ${Math.abs(remaining).toLocaleString('id-ID')}`}
                        </span>
                      ) : (
                        <span className={isOver ? 'text-red-600' : 'text-green-600'}>
                          {isOver ? `Kelebihan Rp ${Math.abs(remaining).toLocaleString('id-ID')}` : `Sisa Rp ${remaining.toLocaleString('id-ID')}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/10 dark:border-white/5 py-16 rounded-2xl flex flex-col items-center gap-3 text-on-surface-variant dark:text-outline opacity-60">
              <span className="material-symbols-outlined text-5xl">search_off</span>
              <p className="font-headline font-bold uppercase tracking-widest text-xs">Belum ada kategori di tab ini</p>
              <p className="text-[10px] text-center max-w-xs font-medium">Tambahkan kategori budget baru bertipe belanja, tabungan, investasi, atau pendapatan di tombol kanan atas.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FinanceBudget;
