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


  if (!user) {
    return <FinanceLogin />;
  }

  return (
    <FinanceDemo 
      isDark={isDark} 
      toggleDark={toggleDark} 
    />
  );
};

export default App;
