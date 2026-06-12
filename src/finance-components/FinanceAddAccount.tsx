import React, { useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceAddAccountProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
}

type AccountType = 'bank' | 'wallet' | 'investment' | 'cash';

const FinanceAddAccount: React.FC<FinanceAddAccountProps> = ({ onShowCTA, onBack }) => {
  const [accountName, setAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('IDR');
  const [isSaving, setIsSaving] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<{name: string, type: AccountType, defaultBalance: number, icon: string} | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const addAccount = useFinanceStore(state => state.addAccount);

  const handleConnectSubmit = () => {
    setIsConnecting(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      setConnectionSuccess(true);
    }, 2500);
  };

  const handleConnectionComplete = async () => {
    if (connectingProvider) {
      await addAccount({
        name: connectingProvider.name,
        type: connectingProvider.type,
        balance: connectingProvider.defaultBalance,
        currency: 'IDR',
        icon: connectingProvider.icon,
        startDate: new Date().toISOString().split('T')[0],
        valuationReminder: true,
        lastValuationUpdate: new Date().toISOString().split('T')[0]
      });
    }
    setConnectingProvider(null);
    setConnectionSuccess(false);
    onBack();
  };

  const formatCurrency = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) return '0';
    return parseInt(num, 10).toLocaleString('id-ID');
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInitialBalance(formatCurrency(e.target.value));
  };

  const handleSave = async () => {
    if (!accountName.trim()) {
      alert('Nama akun tidak boleh kosong!');
      return;
    }
    setIsSaving(true);
    const parsedBalance = parseInt(initialBalance.replace(/\D/g, ''), 10) || 0;
    
    // Choose appropriate icon for account type
    let typeIcon = 'account_balance';
    if (accountType === 'wallet') typeIcon = 'account_balance_wallet';
    else if (accountType === 'investment') typeIcon = 'trending_up';
    else if (accountType === 'cash') typeIcon = 'payments';

    await addAccount({
      name: accountName,
      type: accountType,
      balance: parsedBalance,
      currency,
      icon: typeIcon,
      startDate,
      valuationReminder: true,
      lastValuationUpdate: new Date().toISOString().split('T')[0]
    });

    setIsSaving(false);
    onBack();
  };

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl lg:text-4xl tracking-tight text-primary dark:text-[#a7c8ff]">Tambah Akun Baru</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-medium mt-1">Hubungkan institusi keuangan Anda untuk sinkronisasi otomatis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Section (Left/Main) */}
        <div className="lg:col-span-8 space-y-10">
          <section className="bg-surface-container-lowest dark:bg-white/5 p-8 rounded-2xl border border-outline-variant/10 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-primary dark:text-[#a7c8ff] mb-6 font-headline">Informasi Akun</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Nama Akun</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white placeholder:text-outline-variant/50 transition-all text-sm font-medium" 
                  placeholder="Contoh: Tabungan Utama" 
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Saldo Awal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-outline font-bold text-sm">Rp</span>
                  <input 
                    className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white font-bold tabular-nums text-sm transition-all" 
                    placeholder="0" 
                    type="text"
                    value={initialBalance}
                    onChange={handleBalanceChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Tanggal Mulai</label>
                <input 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white text-sm font-medium transition-all" 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant dark:text-outline uppercase tracking-widest">Mata Uang</label>
                <select 
                  className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white appearance-none text-sm font-medium transition-all"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="IDR">IDR - Rupiah Indonesia</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold text-primary dark:text-[#a7c8ff] font-headline">Pilih Jenis Akun</h3>
            {/* Bento Grid for Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Card */}
              <button 
                onClick={() => setAccountType('bank')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'bank' ? 'bg-surface-container-lowest dark:bg-white/10 border-primary dark:border-[#a7c8ff] shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-primary-container/10 dark:bg-[#a7c8ff]/10 p-3 rounded-xl text-primary-container dark:text-[#a7c8ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'bank' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Tabungan Bank</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">BCA, Mandiri, BNI, BRI, dll.</p>
                </div>
                {accountType === 'bank' && <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* E-Wallet Card */}
              <button 
                onClick={() => setAccountType('wallet')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'wallet' ? 'bg-surface-container-lowest dark:bg-white/10 border-tertiary-fixed-dim dark:border-tertiary-fixed shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-tertiary-fixed-dim/20 dark:bg-tertiary-fixed/20 p-3 rounded-xl text-on-tertiary-fixed-variant dark:text-tertiary-fixed group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'wallet' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance_wallet</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">E-Wallet</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">GoPay, OVO, Dana, LinkAja.</p>
                </div>
                {accountType === 'wallet' && <span className="material-symbols-outlined text-tertiary-fixed-dim dark:text-tertiary-fixed absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* Investment Card */}
              <button 
                onClick={() => setAccountType('investment')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'investment' ? 'bg-surface-container-lowest dark:bg-white/10 border-secondary-container dark:border-[#82b1ff] shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-secondary-container/30 dark:bg-[#82b1ff]/20 p-3 rounded-xl text-on-secondary-container dark:text-[#82b1ff] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'investment' ? { fontVariationSettings: "'FILL' 1" } : {}}>trending_up</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Investasi</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Ajaib, Bibit, Pluang, Saham.</p>
                </div>
                {accountType === 'investment' && <span className="material-symbols-outlined text-on-secondary-container dark:text-[#82b1ff] absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>

              {/* Cash Card */}
              <button 
                onClick={() => setAccountType('cash')}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all border-2 text-left relative overflow-hidden group ${accountType === 'cash' ? 'bg-surface-container-lowest dark:bg-white/10 border-on-surface dark:border-white shadow-md' : 'bg-surface-container-lowest dark:bg-white/5 border-transparent hover:bg-surface-container-low dark:hover:bg-white/10'}`}
              >
                <div className="bg-surface-container-high dark:bg-white/10 p-3 rounded-xl text-on-surface dark:text-white group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={accountType === 'cash' ? { fontVariationSettings: "'FILL' 1" } : {}}>payments</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-primary dark:text-white">Tunai</p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-1 font-medium">Uang fisik di dompet atau brankas.</p>
                </div>
                {accountType === 'cash' && <span className="material-symbols-outlined text-on-surface dark:text-white absolute top-4 right-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </button>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              onClick={onBack}
              disabled={isSaving}
              className="px-8 py-4 text-on-surface-variant dark:text-outline font-bold hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors rounded-xl active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] px-12 py-4 rounded-xl font-bold shadow-xl shadow-primary/10 dark:shadow-[#a7c8ff]/10 hover:opacity-95 active:scale-95 transition-all text-lg flex items-center gap-2 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-[#001b3c] border-t-transparent"></span>
                  Menyimpan...
                </>
              ) : 'Simpan Akun'}
            </button>
          </div>
        </div>

        {/* Sidebar Preview/Info (Right) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary dark:bg-gradient-to-br dark:from-[#001b3c] dark:to-[#002f5e] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-colors">
            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#a7c8ff]/10 rounded-full blur-2xl"></div>
            
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-12 relative z-10">Preview Akun Baru</p>
            <div className="space-y-8 relative z-10">
              <div className="w-14 h-9 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/40">contactless</span>
              </div>
              <h4 className="text-2xl font-bold tracking-tight h-8 truncate">{accountName || 'Nama Akun'}</h4>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/50 text-[10px] uppercase font-bold mb-1">Saldo Awal</p>
                  <p className="text-2xl font-headline font-bold tabular-nums">Rp {initialBalance || '0,00'}</p>
                </div>
                <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a7c8ff] text-[#001b3c] uppercase">{accountType}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low dark:bg-white/5 p-8 rounded-3xl border border-outline-variant/10 dark:border-white/10 space-y-4">
            <h4 className="font-bold text-on-surface dark:text-white text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] text-xl">info</span>
              Mengapa ini penting?
            </h4>
            <p className="text-xs text-on-surface-variant dark:text-outline leading-relaxed font-medium">
              Menambahkan semua akun keuangan Anda membantu <strong>Arsitek Keuangan</strong> memberikan gambaran kekayaan bersih (Net Worth) yang akurat secara real-time.
            </p>
            <div className="pt-2">
              <button onClick={() => setShowSecurityModal(true)} className="text-xs font-bold text-primary dark:text-[#a7c8ff] flex items-center gap-1 hover:underline underline-offset-4 transition-all group">
                Pelajari tentang keamanan data
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Integration Suggestion */}
          <div className="border border-outline-variant/10 dark:border-white/10 p-8 rounded-3xl bg-surface-container-lowest/40 dark:bg-white/[0.02] backdrop-blur-sm">
            <p className="text-[10px] font-extrabold text-on-surface-variant dark:text-outline uppercase tracking-widest mb-6">Integrasi Populer</p>
            <div className="grid grid-cols-4 gap-3">
              {/* BCA Box */}
              <div 
                onClick={() => setConnectingProvider({ name: "BCA", type: "bank", defaultBalance: 15450000, icon: "account_balance" })}
                className="aspect-square bg-white dark:bg-white/5 rounded-xl flex items-center justify-center p-2 group hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 dark:hover:border-[#a7c8ff]/30 hover:scale-[1.05] duration-300"
                title="Hubungkan Bank BCA"
              >
                <div className="w-full flex items-center justify-center grayscale opacity-45 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <svg viewBox="0 0 100 35" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 2 L18 2 L22 17 L18 32 L5 32 Z" fill="#0060af" />
                    <path d="M8 5 L16 5 L19 17 L16 29 L8 29 Z" fill="#ffffff" />
                    <text x="26" y="25" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="21" letterSpacing="-0.8" fill="#0060af" className="dark:fill-white">BCA</text>
                  </svg>
                </div>
              </div>

              {/* GoPay Box */}
              <div 
                onClick={() => setConnectingProvider({ name: "GoPay", type: "wallet", defaultBalance: 2450000, icon: "account_balance_wallet" })}
                className="aspect-square bg-white dark:bg-white/5 rounded-xl flex items-center justify-center p-2 group hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 dark:hover:border-[#a7c8ff]/30 hover:scale-[1.05] duration-300"
                title="Hubungkan GoPay"
              >
                <div className="w-full flex items-center justify-center grayscale opacity-45 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <svg viewBox="0 0 110 35" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="17" r="13" fill="#00aec6" />
                    <circle cx="16" cy="17" r="6" fill="#ffffff" />
                    <text x="36" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="19" letterSpacing="-0.5" fill="#00aec6">go</text>
                    <text x="56" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="19" letterSpacing="-0.5" fill="#00aec6" className="dark:fill-white">pay</text>
                  </svg>
                </div>
              </div>

              {/* Bibit Box */}
              <div 
                onClick={() => setConnectingProvider({ name: "Bibit", type: "investment", defaultBalance: 52000000, icon: "trending_up" })}
                className="aspect-square bg-white dark:bg-white/5 rounded-xl flex items-center justify-center p-2 group hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 dark:hover:border-[#a7c8ff]/30 hover:scale-[1.05] duration-300"
                title="Hubungkan Bibit"
              >
                <div className="w-full flex items-center justify-center grayscale opacity-45 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <svg viewBox="0 0 110 35" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="6" width="20" height="20" rx="6" fill="#00c853" />
                    <circle cx="15" cy="16" r="6" fill="#ffffff" />
                    <text x="32" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="19" letterSpacing="-0.5" fill="#00c853" className="dark:fill-white">bibit</text>
                  </svg>
                </div>
              </div>

              {/* Add Custom Connection */}
              <div 
                onClick={() => setConnectingProvider({ name: "Integrasi Kustom", type: "bank", defaultBalance: 0, icon: 'account_balance' })} 
                className="aspect-square bg-surface-container-low dark:bg-white/10 rounded-xl flex items-center justify-center p-2.5 group hover:bg-primary/5 dark:hover:bg-[#a7c8ff]/10 transition-all cursor-pointer border border-dashed border-outline-variant/50 dark:border-white/20 hover:scale-[1.05] duration-300"
                title="Tambah Integrasi Lainnya"
              >
                <span className="material-symbols-outlined text-on-surface-variant dark:text-[#a7c8ff] group-hover:scale-125 transition-transform" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Security Information Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 relative p-8">
            <button 
              onClick={() => setShowSecurityModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-outline"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <h3 className="text-2xl font-bold font-headline text-on-surface dark:text-white mb-4">Standar Keamanan Enkripsi Perbankan</h3>
              
              <div className="space-y-4 text-left w-full mb-8">
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">lock</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Enkripsi AES-256</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Seluruh data identitas, kata sandi, dan token tersimpan menggunakan standar enkripsi tingkat militer yang sama dengan standar bank global.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">vpn_key</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Sistem Tokenisasi</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Kredensial login Anda tidak pernah disimpan di server kami. Kami menggunakan sistem token API sekali pakai untuk melakukan sinkronisasi data (*read-only*).</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-surface-container-low dark:bg-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] mt-0.5">visibility_off</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface dark:text-white">Akses Hanya Baca (Read-Only)</h4>
                    <p className="text-xs text-on-surface-variant dark:text-outline mt-1">Sistem kami hanya memiliki akses untuk membaca riwayat transaksi dan saldo. Sistem sama sekali tidak bisa melakukan transfer atau mengubah data pada akun asli Anda.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSecurityModal(false)}
                className="w-full py-4 bg-primary text-white dark:bg-[#a7c8ff] dark:text-[#001b3c] rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Simulator Modal */}
      {connectingProvider && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-[#191c1e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 border border-outline-variant/10 dark:border-white/10 relative p-8">
            {isConnecting ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-primary/20 dark:border-[#a7c8ff]/20 rounded-full"></div>
                  <div className="w-20 h-20 border-4 border-primary dark:border-[#a7c8ff] rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-primary dark:text-[#a7c8ff]">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_sync</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white mb-2">Menghubungkan ke {connectingProvider.name}</h3>
                <p className="text-sm text-on-surface-variant dark:text-outline text-center">Menyinkronkan otentikasi token dan mengambil data saldo terakhir Anda...</p>
              </div>
            ) : connectionSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 text-white shadow-lg shadow-green-500/30">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <h3 className="text-2xl font-bold font-headline text-on-surface dark:text-white mb-2">Berhasil Terhubung!</h3>
                <p className="text-sm text-on-surface-variant dark:text-outline text-center mb-8">Data {connectingProvider.name} Anda berhasil disinkronisasi.</p>
                <button 
                  onClick={handleConnectionComplete}
                  className="w-full py-3.5 bg-primary text-white dark:bg-[#a7c8ff] dark:text-[#001b3c] rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold font-headline text-on-surface dark:text-white">Otorisasi {connectingProvider.name}</h3>
                  <button 
                    onClick={() => setConnectingProvider(null)}
                    className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-outline"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs rounded-xl mb-6 flex gap-3 items-start">
                  <span className="material-symbols-outlined text-base">lock</span>
                  <p>Akses diamankan dengan enkripsi AES-256. Kami hanya memiliki akses mode baca (*read-only*) dan tidak akan menyimpan kredensial Anda.</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant dark:text-outline">Username / User ID</label>
                    <input 
                      type="text" 
                      placeholder={`Masukkan User ID ${connectingProvider.name}`}
                      className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant dark:text-outline">Password / PIN</label>
                    <input 
                      type="password" 
                      placeholder="Masukkan Password atau PIN"
                      className="w-full bg-surface-container-low dark:bg-white/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 text-on-surface dark:text-white text-sm"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleConnectSubmit}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] rounded-xl font-bold shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">link</span>
                  Hubungkan Sekarang
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAddAccount;
