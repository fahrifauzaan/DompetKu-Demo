import React, { useState, useEffect } from 'react';
import FinanceDemo from './FinanceDemo';
import FinanceLogin from './finance-components/FinanceLogin';
import { useAuthStore } from './store/useAuthStore';

const App: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('nam_wealth_dark_mode');
    if (saved) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('nam_wealth_dark_mode', String(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(prev => !prev);

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mengatur ulang semua data demo? Semua data transaksi, aset, dan anggaran yang Anda tambahkan akan dikembalikan ke kondisi awal.')) {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('nam_wealth') || key.includes('finance') || key.includes('asset') || key.includes('budget') || key.includes('debt')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  if (!user) {
    return <FinanceLogin />;
  }

  return (
    <FinanceDemo 
      isDark={isDark} 
      toggleDark={toggleDark} 
      onBack={handleReset} 
    />
  );
};

export default App;
