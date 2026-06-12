import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface Debt {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  minPayment: number;
  icon: string;
}

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Debt) => void;
  editingDebt?: Debt | null;
}

const DEBT_TYPES = [
  { label: 'Kartu Kredit', icon: 'credit_card' },
  { label: 'Pinjaman Pribadi', icon: 'person' },
  { label: 'Kredit Mobil', icon: 'directions_car' },
  { label: 'KPR/Rumah', icon: 'home' },
  { label: 'Pinjaman Pendidikan', icon: 'school' },
  { label: 'Lainnya', icon: 'payments' },
];

const DebtFormModal: React.FC<DebtFormModalProps> = ({ isOpen, onClose, onSave, editingDebt }) => {
  const [formData, setFormData] = useState<Omit<Debt, 'id'>>({
    name: '',
    type: DEBT_TYPES[0].label,
    balance: 0,
    interestRate: 0,
    minPayment: 0,
    icon: DEBT_TYPES[0].icon,
  });

  useEffect(() => {
    if (editingDebt) {
      setFormData({
        name: editingDebt.name,
        type: editingDebt.type,
        balance: editingDebt.balance,
        interestRate: editingDebt.interestRate,
        minPayment: editingDebt.minPayment,
        icon: editingDebt.icon,
      });
    } else {
      setFormData({
        name: '',
        type: DEBT_TYPES[0].label,
        balance: 0,
        interestRate: 0,
        minPayment: 0,
        icon: DEBT_TYPES[0].icon,
      });
    }
  }, [editingDebt, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editingDebt?.id || Math.random().toString(36).substr(2, 9),
      ...formData,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#191c1e] rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/10"
          >
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <div>
                <h3 className="text-xl font-bold text-blue-950 dark:text-white font-headline">
                  {editingDebt ? 'Edit Instrumen Utang' : 'Tambah Utang Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Masukkan detail liabilitas Anda untuk sinkronisasi strategi.
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Nama Liabilitas</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Kartu Kredit Mandiri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = DEBT_TYPES.find(t => t.label === e.target.value);
                      setFormData({ ...formData, type: e.target.value, icon: type?.icon || 'payments' });
                    }}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white appearance-none"
                  >
                    {DEBT_TYPES.map(t => (
                      <option key={t.label} value={t.label}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Bunga (APR %)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={formData.interestRate || ''}
                    onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Saldo Saat Ini (Rp)</label>
                <input
                  required
                  type="number"
                  placeholder="10000000"
                  value={formData.balance || ''}
                  onChange={(e) => setFormData({ ...formData, balance: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-primary dark:text-[#a7c8ff] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Cicilan Minimum (Rp)</label>
                <input
                  required
                  type="number"
                  placeholder="500000"
                  value={formData.minPayment || ''}
                  onChange={(e) => setFormData({ ...formData, minPayment: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-primary dark:bg-[#a7c8ff] text-white dark:text-[#003061] px-4 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">{editingDebt ? 'save' : 'add'}</span>
                  {editingDebt ? 'Simpan Perubahan' : 'Tambah Instrumen'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DebtFormModal;
