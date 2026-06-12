import React, { useState } from 'react';
import { FeatureCTA } from './MarketingCTAModal';
import { useFinanceStore } from '../store/useFinanceStore';

interface FinanceAddCategoryProps {
  onShowCTA: (feature?: FeatureCTA) => void;
  onBack: () => void;
}

const ICONS = [
  'local_cafe', 'restaurant', 'directions_car', 'shopping_bag', 
  'home', 'payments', 'medical_services', 'flight', 
  'sports_esports', 'fitness_center', 'school', 'more_horiz'
];

const COLORS = [
  '#00113a', '#ba1a1a', '#5f9b7d', '#758dd5', 
  '#fbc02d', '#6a1b9a', '#ef6c00', '#455a64'
];

const SUGGESTIONS = [
  { name: 'Belanja Mingguan', type: 'Pengeluaran', icon: 'shopping_cart' },
  { name: 'Langganan Digital', type: 'Pengeluaran', icon: 'movie' },
  { name: 'Dana Darurat', type: 'Simpanan', icon: 'savings' },
];

const FinanceAddCategory: React.FC<FinanceAddCategoryProps> = ({ onShowCTA, onBack }) => {
  const [categoryName, setCategoryName] = useState('Kopi & Hiburan');
  const [type, setType] = useState<'Pengeluaran' | 'Pemasukan'>('Pengeluaran');
  const [selectedIcon, setSelectedIcon] = useState('local_cafe');
  const [selectedColor, setSelectedColor] = useState('#00113a');
  const [limit, setLimit] = useState('2.500.000');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [alertAt80, setAlertAt80] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const addBudgetCategory = useFinanceStore(state => state.addBudgetCategory);

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setLimit('0');
      return;
    }
    setLimit(parseInt(val, 10).toLocaleString('id-ID'));
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      alert('Nama kategori tidak boleh kosong!');
      return;
    }
    setIsSaving(true);
    const parsedLimit = parseInt(limit.replace(/\D/g, ''), 10) || 0;

    await addBudgetCategory({
      name: categoryName,
      icon: selectedIcon,
      color: selectedColor,
      type,
      allocated: parsedLimit,
      includeInTotal,
      alertAt: alertAt80 ? 80 : 100
    });

    setIsSaving(false);
    onBack();
  };

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-full hover:bg-surface-container-high dark:hover:bg-white/10 transition-colors flex items-center justify-center bg-surface-container-low dark:bg-white/5 active:scale-95 text-on-surface dark:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="font-headline font-extrabold text-2xl lg:text-3xl tracking-tight text-primary dark:text-white">Tambah Kategori Baru</h2>
          <p className="text-on-surface-variant dark:text-outline text-xs lg:text-sm font-medium">Buat partisi anggaran yang dinamis dan terpersonalisasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Basic Information Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-6 bg-primary dark:bg-[#a7c8ff] rounded-full"></span>
              <h3 className="text-lg font-headline font-bold text-on-surface dark:text-white">Informasi Dasar</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline opacity-70">Nama Kategori</label>
                <input 
                  className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 text-on-surface dark:text-white shadow-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-[#a7c8ff] font-medium transition-colors" 
                  placeholder="Contoh: Kopi &amp; Hiburan" 
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline opacity-70">Tipe Transaksi</label>
                <div className="flex bg-surface-container-low dark:bg-white/5 p-1 rounded-xl h-[56px]">
                  <button 
                    onClick={() => setType('Pengeluaran')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-bold transition-all ${type === 'Pengeluaran' ? 'bg-white dark:bg-[#a7c8ff] shadow-sm text-primary dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-lg">trending_down</span>
                    Pengeluaran
                  </button>
                  <button 
                    onClick={() => setType('Pemasukan')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-bold transition-all ${type === 'Pemasukan' ? 'bg-white dark:bg-[#a7c8ff] shadow-sm text-primary dark:text-[#001b3c]' : 'text-on-surface-variant dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                    Pemasukan
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Icon & Color Picker */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-6 bg-primary dark:bg-[#a7c8ff] rounded-full"></span>
              <h3 className="text-lg font-headline font-bold text-on-surface dark:text-white">Identitas Visual</h3>
            </div>
            
            <div className="bg-surface-container-low dark:bg-transparent border border-outline-variant/10 dark:border-white/10 rounded-3xl p-8 space-y-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline opacity-70 mb-4 block">Pilih Ikon</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-4">
                  {ICONS.map(icon => (
                    <button 
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${selectedIcon === icon ? 'bg-white dark:bg-surface-container-low text-primary dark:text-[#a7c8ff] shadow-sm scale-110 ring-2 ring-primary dark:ring-[#a7c8ff]' : 'bg-white/50 dark:bg-white/5 text-on-surface-variant dark:text-slate-400 hover:bg-white dark:hover:bg-white/10'}`}
                    >
                      <span className="material-symbols-outlined">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline opacity-70 mb-4 block">Warna Tema</label>
                <div className="flex flex-wrap gap-4">
                  {COLORS.map(color => (
                    <button 
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${selectedColor === color ? 'ring-offset-2 dark:ring-offset-[#111c2c] ring-2 ring-outline-variant scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Budget Settings */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-6 bg-primary dark:bg-[#a7c8ff] rounded-full"></span>
              <h3 className="text-lg font-headline font-bold text-on-surface dark:text-white">Anggaran &amp; Limit</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-outline opacity-70 block">Limit Bulanan (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant dark:text-slate-400">Rp</span>
                  <input 
                    className="w-full bg-surface-container-lowest dark:bg-white/5 border-none rounded-xl p-4 pl-12 text-on-surface dark:text-[#a7c8ff] shadow-sm focus:ring-2 focus:ring-primary-container dark:focus:ring-white/20 font-headline font-extrabold text-xl tabular-nums transition-colors" 
                    type="text" 
                    value={limit}
                    onChange={handleLimitChange}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface dark:text-white">Masuk Anggaran Total</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline">Hitung kategori ini dalam limit bulanan global</p>
                  </div>
                  <button 
                    onClick={() => setIncludeInTotal(!includeInTotal)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${includeInTotal ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-outline-variant/30 dark:bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-surface rounded-full transition-all duration-300 ${includeInTotal ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface dark:text-white">Peringatan Limit 80%</p>
                    <p className="text-xs text-on-surface-variant dark:text-outline">Kirim notifikasi saat pengeluaran mendekati batas</p>
                  </div>
                  <button 
                    onClick={() => setAlertAt80(!alertAt80)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${alertAt80 ? 'bg-primary dark:bg-[#a7c8ff]' : 'bg-outline-variant/30 dark:bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-surface rounded-full transition-all duration-300 ${alertAt80 ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Preview & Suggestions */}
        <div className="lg:col-span-5 space-y-10">
          
          {/* Real-time Preview Card */}
          <div className="lg:sticky lg:top-32 space-y-10">
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline opacity-60">Pratinjau Kartu</h3>
              <div 
                className="p-8 rounded-[32px] text-white relative overflow-hidden shadow-2xl transition-colors duration-500"
                style={{ backgroundColor: selectedColor }}
              >
                {/* Abstract decorative background */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute left-20 bottom-0 w-32 h-32 bg-black/20 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex justify-between items-start mb-12">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{selectedIcon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 mb-1">Status Limit</p>
                    <span className="px-3 py-1 bg-white/20 text-white font-bold text-[10px] rounded-full uppercase tracking-wider backdrop-blur-md">Aman</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-1">
                  <h4 className="text-2xl font-headline font-extrabold tracking-tight">{categoryName || 'Nama Kategori'}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-headline font-black tabular-nums tracking-tighter">Rp 0</span>
                    <span className="text-xs font-medium opacity-50 tabular-nums">/ {limit || '0'}</span>
                  </div>
                </div>

                <div className="relative z-10 mt-8 space-y-3">
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full w-[0%]"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold tracking-wider opacity-60">
                    <span>0% DIGUNAKAN</span>
                    <span>SISA RP {limit || '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested Categories */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-outline opacity-60">Saran Kategori</h3>
              <div className="grid grid-cols-1 gap-3">
                {SUGGESTIONS.map((sug, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      setCategoryName(sug.name);
                      setSelectedIcon(sug.icon);
                    }}
                    className="group bg-surface-container-low dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all cursor-pointer border-l-4 border-transparent hover:border-primary dark:hover:border-[#a7c8ff]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-primary dark:text-[#a7c8ff] group-hover:bg-primary-fixed dark:group-hover:bg-[#a7c8ff] dark:group-hover:text-[#001b3c] transition-colors">
                        <span className="material-symbols-outlined">{sug.icon}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface dark:text-white">{sug.name}</p>
                        <p className="text-[10px] text-on-surface-variant dark:text-outline font-medium">{sug.type}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary dark:text-[#a7c8ff] opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-6">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-primary to-primary-container dark:from-[#a7c8ff] dark:to-[#82b1ff] text-white dark:text-[#001b3c] font-headline font-bold py-5 rounded-2xl shadow-lg shadow-primary-container/20 dark:shadow-[#a7c8ff]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-75"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-[#001b3c] border-t-transparent"></span>
                    Menyimpan Kategori...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">check_circle</span>
                    Simpan Kategori Baru
                  </>
                )}
              </button>
              <button 
                onClick={onBack}
                disabled={isSaving}
                className="w-full text-on-surface-variant dark:text-slate-300 font-bold py-4 rounded-2xl hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-sm active:scale-[0.98] disabled:opacity-50"
              >
                Batalkan dan Kembali
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinanceAddCategory;
