import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TRANSACTIONS_DATA, DEBTS_DATA } from '../finance-components/FinanceData';
import { useAuthStore } from './useAuthStore';

// ===================== TYPES =====================

export type TransactionType = 'PENGELUARAN' | 'PEMASUKAN' | 'TRANSFER';

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  location: string;
  amount: number;
  category: string;
  icon: string;
  status: string;
  account: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'investment' | 'cash';
  balance: number;
  currency: string;
  icon: string;
  startDate: string;
  valuationReminder?: boolean;
  lastValuationUpdate?: string;
}

export interface Asset {
  id: string;
  title: string;
  category: 'real-estat' | 'kendaraan' | 'investasi' | 'koleksi';
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  location: string;
  icon: string;
  equity: number;
  notes: string;
  ticker?: string;
  shares?: number;
  avgCost?: number;
  currentPrice?: number;
  interestRate?: number;
  maturityDate?: string;
  subType?: string;
  usefulLife?: number;
  depreciationMethod?: 'Garis Lurus Tahunan' | 'Garis Lurus Bulanan' | 'Tidak Menyusut';
  landArea?: number;
  buildingArea?: number;
  mfgYear?: number;
  specification?: string;
  valuationReminder?: boolean;
  lastValuationUpdate?: string;
  currentNav?: number;
  documentLink?: string;
  // Fixed Income Fields
  fixedIncomeType?: string;
  bondType?: string;
  depositType?: string;
  type?: string;
  issuer?: string;
  tenor?: number;
  tenorUnit?: string;
  couponType?: string;
  tax?: number;
  paymentDate?: number;
  interestPaymentPeriod?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'Pengeluaran' | 'Pemasukan';
  allocated: number;
  includeInTotal: boolean;
  alertAt: number;
}

export interface Debt {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  minPayment: number;
  icon: string;
}

export interface Setting {
  key: string;
  value: string;
}

// ===================== STORE STATE =====================

interface FinanceState {
  // Data
  transactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
  budgetCategories: BudgetCategory[];
  debts: Debt[];
  settings: Setting[];
  googleSheetUrl: string;
  isSyncing: boolean;
  lastSyncAt: string | null;

  // Actions — Google Sheets URL
  setGoogleSheetUrl: (url: string) => void;

  // Actions — Generic CRUD
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addBudgetCategory: (cat: Omit<BudgetCategory, 'id'>) => Promise<void>;
  updateBudgetCategory: (cat: BudgetCategory) => Promise<void>;
  deleteBudgetCategory: (id: string) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  updateDebt: (debt: Debt) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  updateSettings: (settings: Setting[]) => Promise<void>;
  monthlyBudgets: Record<string, Record<string, number>>;
  updateMonthlyBudget: (yearMonth: string, categoryName: string, amount: number) => Promise<void>;

  // Print Settings
  reportPrintMonth: number;
  reportPrintYear: number;
  setReportPrintPeriod: (month: number, year: number) => void;
  printType: 'report' | 'ledger' | null;
  setPrintType: (type: 'report' | 'ledger' | null) => void;
  ledgerPrintTransactions: any[];
  setLedgerPrintTransactions: (txs: any[]) => void;

  // Actions — Full Sync
  syncFromGoogleSheets: () => Promise<void>;
}

// ===================== HELPERS =====================

export function formatDateString(dateStr: any): string {
  if (!dateStr) return '';
  let str = String(dateStr).trim();
  
  // If it contains T, split by T first to get the date part
  if (str.includes('T')) {
    const part = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
      return part;
    }
  }

  // If it's already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Ignore error
  }
  
  return str;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

async function postToSheet(url: string, sheet: string, action: string, data: Record<string, unknown>) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sheet, data })
    });
    console.log(`[FinanceStore] ✅ ${action} → ${sheet} synced`);
  } catch (error) {
    console.error(`[FinanceStore] ❌ Gagal sync ${sheet}:`, error);
  }
}

function getAssetSheetName(category?: string, subType?: string): string {
  if (subType === 'saham') return 'Saham';
  if (subType === 'kripto') return 'Crypto';
  if (subType === 'reksadana') return 'Reksadana';
  if (category === 'real-estat' || category === 'kendaraan' || category === 'koleksi') return 'AssetsNonLiquid';
  return 'Fixed Income Investment';
}

function formatAssetForSheet(asset: Asset): Record<string, unknown> {
  const base: any = { ...asset };
  if (base.purchaseDate) {
    base.purchaseDate = formatDateString(base.purchaseDate);
  }
  if (asset.subType === 'kripto') {
    base.coins = asset.shares;
  }
  if (asset.subType === 'reksadana') {
    base.units = asset.shares;
    base.navPerUnit = asset.avgCost;
    // Save the total current value as Current_NAV in the Google Sheet (matching user sheet pattern)
    base.currentNav = asset.currentValue || (asset.shares * (asset.currentPrice || asset.currentNav || 0));
  }
  return base as Record<string, unknown>;
}

function calculateDepreciatedValue(purchasePrice: number, purchaseDateStr: string, usefulLife: number, method?: string): number {
  if (!method || method === 'Tidak Menyusut') return purchasePrice;
  
  try {
    const purchaseDate = new Date(purchaseDateStr);
    const now = new Date();
    
    const diffYears = now.getFullYear() - purchaseDate.getFullYear();
    const diffMonths = (now.getMonth() - purchaseDate.getMonth()) + (diffYears * 12);
    const elapsedMonths = Math.max(0, diffMonths);
    const elapsedYears = Math.floor(elapsedMonths / 12);
    
    if (method === 'Garis Lurus Tahunan') {
      const yearlyDep = purchasePrice / (usefulLife || 10);
      const accumulated = Math.min(purchasePrice, yearlyDep * elapsedYears);
      return Math.round(purchasePrice - accumulated);
    } else if (method === 'Garis Lurus Bulanan' || method === 'Garis Lurus') {
      const monthlyDep = purchasePrice / ((usefulLife || 10) * 12);
      const accumulated = Math.min(purchasePrice, monthlyDep * elapsedMonths);
      return Math.round(purchasePrice - accumulated);
    }
  } catch (e) {
    console.error('[FinanceStore] Error calculating depreciation:', e);
  }
  return purchasePrice;
}

// ===================== DEFAULT DATA =====================

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Tabungan Mandiri', type: 'bank', balance: 1263000000, currency: 'IDR', icon: 'account_balance_wallet', startDate: '2023-01-15' },
  { id: 'acc2', name: 'Tabungan BCA', type: 'bank', balance: 4431000000, currency: 'IDR', icon: 'savings', startDate: '2022-06-01' },
  { id: 'acc3', name: 'Dompet Kripto (BTC/ETH)', type: 'investment', balance: 486750000, currency: 'IDR', icon: 'currency_bitcoin', startDate: '2024-03-10' },
];

const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'bcat1', name: 'Housing', icon: 'home', color: '#1565c0', type: 'Pengeluaran', allocated: 46400000, includeInTotal: true, alertAt: 80 },
  { id: 'bcat2', name: 'Food', icon: 'restaurant', color: '#ba1a1a', type: 'Pengeluaran', allocated: 8700000, includeInTotal: true, alertAt: 80 },
  { id: 'bcat3', name: 'Healthcare', icon: 'medical_services', color: '#ef6c00', type: 'Pengeluaran', allocated: 58000000, includeInTotal: true, alertAt: 90 },
  { id: 'bcat4', name: 'Transportation', icon: 'directions_car', color: '#00695c', type: 'Pengeluaran', allocated: 6525000, includeInTotal: true, alertAt: 80 },
];

const DEFAULT_ASSETS: Asset[] = [
  { id: 'ast1', title: 'Highland Park Residence', category: 'real-estat', purchasePrice: 12750000000, currentValue: 16800000000, purchaseDate: '2020-08-15', location: 'Jakarta Selatan', icon: 'home', equity: 75, notes: 'KPR sisa Rp 4,25M' },
  { id: 'ast2', title: 'Porsche 911 Carrera S', category: 'kendaraan', purchasePrice: 1725000000, currentValue: 2137500000, purchaseDate: '2021-11-22', location: 'Jakarta', icon: 'directions_car', equity: 100, notes: 'Lunas' },
  { id: 'ast3', title: 'Senayan Office Suite', category: 'real-estat', purchasePrice: 4500000000, currentValue: 5200000000, purchaseDate: '2019-04-01', location: 'Jakarta Pusat', icon: 'domain', equity: 100, notes: 'Lunas, disewakan' },
  { id: 'ast4', title: 'Reksadana Indeks Saham (VTI)', category: 'investasi', purchasePrice: 7203600000, currentValue: 9186000000, purchaseDate: '2021-03-10', location: 'Bibit', icon: 'trending_up', equity: 100, notes: 'ETF • 2.400 Lembar' },
  { id: 'ast5', title: 'Saham Apple (AAPL)', category: 'investasi', purchasePrice: 1807500000, currentValue: 2463300000, purchaseDate: '2022-07-15', location: 'Ajaib Sekuritas', icon: 'trending_up', equity: 100, notes: 'Saham • 850 Lembar' },
  { id: 'ast6', title: 'Saham Tesla (TSLA)', category: 'investasi', purchasePrice: 1380000000, currentValue: 1175100000, purchaseDate: '2023-01-20', location: 'Ajaib Sekuritas', icon: 'trending_up', equity: 100, notes: 'Saham • 320 Lembar' },
  { id: 'ast7', title: 'Patek Philippe Nautilus', category: 'koleksi', purchasePrice: 1650000000, currentValue: 1850000000, purchaseDate: '2022-05-10', location: 'Jakarta', icon: 'watch', equity: 100, notes: 'Ref. 5711/1A-010 • Full Set' },
  { id: 'ast8', title: 'Affandi: Borobudur Pagi', category: 'koleksi', purchasePrice: 12500000000, currentValue: 12500000000, purchaseDate: '2018-09-20', location: 'Jakarta', icon: 'palette', equity: 100, notes: 'Oil on Canvas • 1983 • Certified' }
];

const DEFAULT_SETTINGS: Setting[] = [
  { key: 'userName', value: 'Chaerobby Fakhri Fauzaan P.' },
  { key: 'email', value: '' },
  { key: 'phone', value: '' },
  { key: 'currency', value: 'IDR' },
  { key: 'language', value: 'Bahasa Indonesia' },
  { key: 'emergencyFundTarget', value: '750000000' },
  { key: 'emergencyFundCurrent', value: '637500000' },
  { key: 'monthlyIncome', value: '28100000' },
];

// ===================== STORE =====================

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      // Initial State
      transactions: TRANSACTIONS_DATA as Transaction[],
      accounts: DEFAULT_ACCOUNTS,
      assets: DEFAULT_ASSETS,
      budgetCategories: DEFAULT_BUDGET_CATEGORIES,
      debts: DEBTS_DATA as Debt[],
      settings: DEFAULT_SETTINGS,
      googleSheetUrl: 'https://script.google.com/macros/s/AKfycbzhD4TrmhBhb1484U7thVyEJDvZAFYtAbiG0bRK_jcWCiLKwy1EtBFCOQKikaj9l6yL2Q/exec',
      isSyncing: false,
      lastSyncAt: null,
      monthlyBudgets: {},
      reportPrintMonth: new Date().getMonth(),
      reportPrintYear: new Date().getFullYear(),
      printType: null,
      ledgerPrintTransactions: [],

      // ---- URL Management ----
      setGoogleSheetUrl: (url) => set({ googleSheetUrl: url }),

      // ---- TRANSACTIONS ----
      addTransaction: async (transaction) => {
        const newTx = { ...transaction, id: generateId() } as Transaction;
        set((state) => ({ transactions: [newTx, ...state.transactions] }));
        await postToSheet(get().googleSheetUrl, 'Transactions', 'add', newTx as unknown as Record<string, unknown>);
      },

      updateTransaction: async (transaction) => {
        set((state) => ({
          transactions: state.transactions.map(t => t.id === transaction.id ? transaction : t)
        }));
        await postToSheet(get().googleSheetUrl, 'Transactions', 'update', transaction as unknown as Record<string, unknown>);
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, 'Transactions', 'delete', { id });
      },

      // ---- ACCOUNTS ----
      addAccount: async (account) => {
        const newAcc = { ...account, id: generateId() } as Account;
        set((state) => ({ accounts: [...state.accounts, newAcc] }));
        await postToSheet(get().googleSheetUrl, 'Accounts', 'add', newAcc as unknown as Record<string, unknown>);
      },

      updateAccount: async (account) => {
        set((state) => ({
          accounts: state.accounts.map(a => a.id === account.id ? account : a)
        }));
        await postToSheet(get().googleSheetUrl, 'Accounts', 'update', account as unknown as Record<string, unknown>);
      },

      deleteAccount: async (id) => {
        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, 'Accounts', 'delete', { id });
      },

      // ---- ASSETS ----
      addAsset: async (asset) => {
        const newAsset = { ...asset, id: generateId() } as Asset;
        set((state) => ({ assets: [...state.assets, newAsset] }));
        const sheet = getAssetSheetName(newAsset.category, newAsset.subType);
        await postToSheet(get().googleSheetUrl, sheet, 'add', formatAssetForSheet(newAsset));
      },

      updateAsset: async (asset) => {
        set((state) => ({
          assets: state.assets.map(a => a.id === asset.id ? asset : a)
        }));
        const sheet = getAssetSheetName(asset.category, asset.subType);
        await postToSheet(get().googleSheetUrl, sheet, 'update', formatAssetForSheet(asset));
      },

      deleteAsset: async (id) => {
        const asset = get().assets.find(a => a.id === id);
        if (!asset) return;
        set((state) => ({
          assets: state.assets.filter(a => a.id !== id)
        }));
        const sheet = getAssetSheetName(asset.category, asset.subType);
        await postToSheet(get().googleSheetUrl, sheet, 'delete', { id });
      },

      // ---- BUDGET CATEGORIES ----
      addBudgetCategory: async (cat) => {
        const newCat = { ...cat, id: generateId() } as BudgetCategory;
        set((state) => ({ budgetCategories: [...state.budgetCategories, newCat] }));
        await postToSheet(get().googleSheetUrl, 'BudgetCategories', 'add', newCat as unknown as Record<string, unknown>);
      },

      updateBudgetCategory: async (cat) => {
        set((state) => ({
          budgetCategories: state.budgetCategories.map(c => c.id === cat.id ? cat : c)
        }));
        await postToSheet(get().googleSheetUrl, 'BudgetCategories', 'update', cat as unknown as Record<string, unknown>);
      },

      deleteBudgetCategory: async (id) => {
        set((state) => ({
          budgetCategories: state.budgetCategories.filter(c => c.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, 'BudgetCategories', 'delete', { id });
      },

      // ---- DEBTS ----
      addDebt: async (debt) => {
        const newDebt = { ...debt, id: generateId() } as Debt;
        set((state) => ({ debts: [...state.debts, newDebt] }));
        await postToSheet(get().googleSheetUrl, 'Debts', 'add', newDebt as unknown as Record<string, unknown>);
      },

      updateDebt: async (debt) => {
        set((state) => ({
          debts: state.debts.map(d => d.id === debt.id ? debt : d)
        }));
        await postToSheet(get().googleSheetUrl, 'Debts', 'update', debt as unknown as Record<string, unknown>);
      },

      deleteDebt: async (id) => {
        set((state) => ({
          debts: state.debts.filter(d => d.id !== id)
        }));
        await postToSheet(get().googleSheetUrl, 'Debts', 'delete', { id });
      },

      // ---- SETTINGS ----
      updateSettings: async (newSettings) => {
        set({ settings: newSettings });
        // Sync each setting individually
        for (const setting of newSettings) {
          await postToSheet(get().googleSheetUrl, 'Settings', 'update', setting as unknown as Record<string, unknown>);
        }
      },

      setReportPrintPeriod: (month, year) => set({ reportPrintMonth: month, reportPrintYear: year }),
      setPrintType: (type) => set({ printType: type }),
      setLedgerPrintTransactions: (txs) => set({ ledgerPrintTransactions: txs }),

      updateMonthlyBudget: async (yearMonth, categoryName, amount) => {
        const currentBudgets = { ...get().monthlyBudgets };
        if (!currentBudgets[yearMonth]) {
          currentBudgets[yearMonth] = {};
        }
        currentBudgets[yearMonth][categoryName] = amount;
        
        set({ monthlyBudgets: currentBudgets });
        
        // Save to Settings
        const stringified = JSON.stringify(currentBudgets);
        
        const currentSettings = get().settings;
        const index = currentSettings.findIndex(s => s.key === 'monthlyBudgets');
        
        let newSettings = [...currentSettings];
        let action: 'add' | 'update' = 'add';
        
        if (index !== -1) {
          newSettings[index] = { key: 'monthlyBudgets', value: stringified };
          action = 'update';
        } else {
          newSettings.push({ key: 'monthlyBudgets', value: stringified });
          action = 'add';
        }
        
        set({ settings: newSettings });
        await postToSheet(get().googleSheetUrl, 'Settings', action, { key: 'monthlyBudgets', value: stringified });
      },

      // ---- FULL SYNC (Pull dari Google Sheets) ----
      syncFromGoogleSheets: async () => {
        const { googleSheetUrl } = get();
        if (!googleSheetUrl) return;

        set({ isSyncing: true });
        try {
          const response = await fetch(`${googleSheetUrl}?sheet=all`);
          const result = await response.json();

          if (result && result.success && result.data) {
            const updates: Partial<FinanceState> = {};

            const getVal = (obj: any, keys: string[]) => {
              if (!obj) return undefined;
              for (const k of keys) {
                if (obj[k] !== undefined && obj[k] !== '') return obj[k];
              }
              const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
              for (const key of Object.keys(obj)) {
                const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanKeys.includes(cleanKey)) return obj[key];
              }
              return undefined;
            };

            if (result.data.Transactions) {
              updates.transactions = result.data.Transactions.map((t: Record<string, unknown>) => ({
                ...t,
                amount: Number(t.amount) || 0,
              })).reverse();
            }
            if (result.data.Accounts) {
              updates.accounts = result.data.Accounts.map((a: Record<string, unknown>) => ({
                ...a,
                balance: Number(a.balance) || 0,
                valuationReminder: a.valuationReminder === true || a.valuationReminder === 'TRUE' || a.valuationReminder === 'true',
                lastValuationUpdate: a.lastValuationUpdate ? String(a.lastValuationUpdate) : undefined
              }));
            }
            
            const parsedAssets: Asset[] = [];
            const fixedIncomeData = result.data['Fixed Income Investment'] || result.data.Assets;
            if (fixedIncomeData) {
              parsedAssets.push(...fixedIncomeData
                .filter((a: any) => {
                  const idVal = String(a.id || a.ID || '').trim().toLowerCase();
                  return idVal && idVal !== 'id' && idVal !== 'deposit type' && idVal !== 'product name' && idVal !== 'bond type';
                })
                .map((a: Record<string, unknown>) => {
                  const id = String(a.id || a.ID || '');
                  const title = String(a.title || getVal(a, ['title', 'Title', 'seri', 'Seri', 'Bond Type', 'bondType', 'Product Name', 'productName', 'Bank']) || 'Aset Pendapatan Tetap');
                  
                  let interestRate = a.interestRate !== undefined && a.interestRate !== '' ? Number(a.interestRate) : undefined;
                  if (interestRate === undefined || isNaN(interestRate)) {
                    const rawRate = getVal(a, ['Interest Rate (%)', 'interestRate', 'Coupon Type']);
                    if (rawRate !== undefined && rawRate !== '') {
                      interestRate = Number(String(rawRate).replace('%', '').trim());
                    }
                  }
                  // If rate is less than 1 (decimal), convert to percentage (e.g. 0.064 -> 6.4)
                  if (interestRate !== undefined && interestRate > 0 && interestRate < 1) {
                    interestRate = interestRate * 100;
                  }
                  
                  return {
                    ...a,
                    id,
                    title,
                    purchasePrice: Number(a.purchasePrice || getVal(a, ['Principal', 'purchasePrice'])) || 0,
                    currentValue: Number(a.currentValue !== undefined ? a.currentValue : getVal(a, ['Principal', 'purchasePrice'])) || 0,
                    equity: Number(a.equity) || 100,
                    purchaseDate: a.purchaseDate ? formatDateString(a.purchaseDate) : (getVal(a, ['Issue Date', 'purchaseDate']) ? formatDateString(getVal(a, ['Issue Date', 'purchaseDate'])) : undefined),
                    shares: a.shares !== undefined && a.shares !== '' ? Number(a.shares) : undefined,
                    avgCost: a.avgCost !== undefined && a.avgCost !== '' ? Number(a.avgCost) : undefined,
                    currentPrice: a.currentPrice !== undefined && a.currentPrice !== '' ? Number(a.currentPrice) : undefined,
                    interestRate: interestRate || 6.4,
                    ticker: a.ticker !== undefined && a.ticker !== '' ? String(a.ticker) : String(getVal(a, ['Seri', 'Ticker', 'ticker']) || ''),
                    subType: a.subType !== undefined && a.subType !== '' ? String(a.subType) : 'sbn',
                    maturityDate: a.maturityDate !== undefined && a.maturityDate !== '' ? String(a.maturityDate) : (getVal(a, ['Maturity Date']) ? String(getVal(a, ['Maturity Date'])) : undefined),
                  } as Asset;
                }));
            }
            if (result.data.AssetsNonLiquid) {
              parsedAssets.push(...result.data.AssetsNonLiquid.map((a: Record<string, unknown>) => {
                const purchasePrice = Number(a.purchasePrice) || 0;
                const usefulLife = Number(a.usefulLife) || 10;
                const method = String(a.depreciationMethod || 'Tidak Menyusut');
                const purchaseDate = formatDateString(a.purchaseDate || new Date().toISOString());

                // Properties appreciate, Vehicles/Personal Assets deprecate
                let currentValue = Number(a.currentValue) || purchasePrice;
                if (a.category === 'kendaraan' || a.category === 'koleksi') {
                  currentValue = calculateDepreciatedValue(purchasePrice, purchaseDate, usefulLife, method);
                }

                return {
                  ...a,
                  purchasePrice,
                  currentValue,
                  purchaseDate,
                  equity: Number(a.equity) || 100,
                  usefulLife,
                  landArea: a.landArea !== undefined && a.landArea !== '' ? Number(a.landArea) : undefined,
                  buildingArea: a.buildingArea !== undefined && a.buildingArea !== '' ? Number(a.buildingArea) : undefined,
                  mfgYear: a.mfgYear !== undefined && a.mfgYear !== '' ? Number(a.mfgYear) : undefined,
                  subType: a.subType !== undefined && a.subType !== '' ? String(a.subType) : undefined,
                  depreciationMethod: method as any,
                  valuationReminder: a.valuationReminder === true || a.valuationReminder === 'TRUE' || a.valuationReminder === 'true',
                  lastValuationUpdate: a.lastValuationUpdate ? String(a.lastValuationUpdate) : undefined
                } as Asset;
              }));
            }
            // getVal definition moved to top of syncFromGoogleSheets block

            if (result.data.Saham) {
              parsedAssets.push(...result.data.Saham.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = Number(getVal(a, ['shares', 'Shares'])) || 0;
                const avgCost = Number(getVal(a, ['avgCost', 'Avg. Cost', 'avg_cost'])) || 0;
                const currentPrice = Number(getVal(a, ['currentPrice', 'Current Price', 'current_price'])) || 0;
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'show_chart');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'saham',
                  shares,
                  avgCost,
                  currentPrice,
                  currentValue: shares * currentPrice,
                  purchasePrice: shares * avgCost,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            const cryptoData = result.data.Kripto || result.data.Crypto;
            if (cryptoData) {
              parsedAssets.push(...cryptoData.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = Number(getVal(a, ['coins', 'Coins', 'shares', 'Shares'])) || 0;
                const avgCost = Number(getVal(a, ['avgCost', 'Avg. Cost', 'avg_cost'])) || 0;
                const currentPrice = Number(getVal(a, ['currentPrice', 'Current Price', 'current_price'])) || 0;
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'currency_bitcoin');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'kripto',
                  shares,
                  avgCost,
                  currentPrice,
                  currentValue: shares * currentPrice,
                  purchasePrice: shares * avgCost,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            if (result.data.Reksadana) {
              parsedAssets.push(...result.data.Reksadana.map((a: any) => {
                const id = String(getVal(a, ['id', 'ID']) || generateId());
                const title = String(getVal(a, ['title', 'Title']) || '');
                const ticker = String(getVal(a, ['ticker', 'Ticker']) || '');
                const shares = Number(getVal(a, ['units', 'Units', 'shares', 'Shares'])) || 0;
                const avgCost = Number(getVal(a, ['navPerUnit', 'nav_per_unit', 'avgCost', 'Avg. Cost'])) || 0;
                const rawCurrentNav = Number(getVal(a, ['currentNav', 'Current_NAV', 'current_nav', 'currentPrice', 'Current Price'])) || 0;
                const purchaseDate = formatDateString(getVal(a, ['purchaseDate', 'Purchase Date', 'date']) || '');
                const location = String(getVal(a, ['location', 'Location']) || '');
                const icon = String(getVal(a, ['icon', 'Icon']) || 'account_balance');
                const notes = String(getVal(a, ['notes', 'Notes']) || '');

                const isTotalValue = rawCurrentNav > 100000 && rawCurrentNav > avgCost * 2;
                const currentValue = isTotalValue ? rawCurrentNav : (shares * rawCurrentNav);
                const currentPrice = isTotalValue ? (shares > 0 ? rawCurrentNav / shares : 0) : rawCurrentNav;
                const purchasePrice = shares * avgCost;

                return {
                  id,
                  title,
                  ticker,
                  category: 'investasi',
                  subType: 'reksadana',
                  shares,
                  avgCost,
                  currentPrice,
                  currentNav: currentPrice,
                  currentValue,
                  purchasePrice,
                  purchaseDate,
                  location,
                  icon,
                  notes,
                  equity: 100
                } as Asset;
              }));
            }
            updates.assets = parsedAssets;

            if (result.data.BudgetCategories) {
              updates.budgetCategories = result.data.BudgetCategories.map((c: Record<string, unknown>) => ({
                ...c,
                allocated: Number(c.allocated) || 0,
                alertAt: Number(c.alertAt) || 80,
                includeInTotal: c.includeInTotal === true || c.includeInTotal === 'TRUE',
              }));
            }
            if (result.data.Debts) {
              updates.debts = result.data.Debts.map((d: Record<string, unknown>) => ({
                ...d,
                balance: Number(d.balance) || 0,
                interestRate: Number(d.interestRate) || 0,
                minPayment: Number(d.minPayment) || 0,
              }));
            }
            if (result.data.Settings) {
              const settingsList = result.data.Settings as Setting[];
              updates.settings = settingsList;

              // Sync last_password to auth store registeredUsers
              const lastPwdSetting = settingsList.find(s => s.key === 'last_password');
              if (lastPwdSetting && lastPwdSetting.value) {
                const emailSetting = settingsList.find(s => s.key === 'email')?.value;
                const nameSetting = settingsList.find(s => s.key === 'userName')?.value || 'User';
                if (emailSetting) {
                  useAuthStore.getState().signup(emailSetting, lastPwdSetting.value, nameSetting);
                }
              }

              const monthlyBudgetsSetting = settingsList.find(s => s.key === 'monthlyBudgets');
              if (monthlyBudgetsSetting && monthlyBudgetsSetting.value) {
                try {
                  updates.monthlyBudgets = JSON.parse(monthlyBudgetsSetting.value);
                } catch (e) {
                  console.error('[App] Error parsing monthlyBudgets:', e);
                  updates.monthlyBudgets = {};
                }
              } else {
                updates.monthlyBudgets = {};
              }
            }

            updates.lastSyncAt = new Date().toISOString();
            set(updates as FinanceState);
            console.log('[FinanceStore] ✅ Full sync dari Google Sheets berhasil');
          }
        } catch (error) {
          console.error('[FinanceStore] ❌ Gagal sync dari Google Sheets:', error);
        } finally {
          set({ isSyncing: false });
        }
      }
    }),
    {
      name: `${import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME.toLowerCase().replace(/\s+/g, '-') : 'dompetku'}-storage`,
      version: 1, // Bump version to force fresh fetch from the new URL
    }
  )
);
