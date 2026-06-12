import { useState, useEffect, useRef } from 'react';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  lastUpdate: Date;
  flash?: 'up' | 'down' | null;
}

export const INITIAL_DATA: Record<string, Omit<StockData, 'lastUpdate' | 'flash'>> = {
  'BBCA.JK': { symbol: 'BBCA.JK', name: 'Bank Central Asia', price: 9850, change: 100, percentChange: 1.02 },
  'BBRI.JK': { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia', price: 5400, change: 50, percentChange: 0.93 },
  'BMRI.JK': { symbol: 'BMRI.JK', name: 'Bank Mandiri', price: 6200, change: 80, percentChange: 1.31 },
  'BBNI.JK': { symbol: 'BBNI.JK', name: 'Bank Negara Indonesia', price: 5125, change: 25, percentChange: 0.49 },
  'BRIS.JK': { symbol: 'BRIS.JK', name: 'Bank Syariah Indonesia', price: 2450, change: 30, percentChange: 1.24 },
  'TLKM.JK': { symbol: 'TLKM.JK', name: 'Telkom Indonesia', price: 3820, change: -40, percentChange: -1.04 },
  'UNVR.JK': { symbol: 'UNVR.JK', name: 'Unilever Indonesia', price: 2650, change: -20, percentChange: -0.75 },
  'ICBP.JK': { symbol: 'ICBP.JK', name: 'Indofood CBP', price: 11200, change: 150, percentChange: 1.36 },
  'ASII.JK': { symbol: 'ASII.JK', name: 'Astra International', price: 5125, change: 75, percentChange: 1.48 },
  'IHSG': { symbol: 'IHSG', name: 'Composite Index', price: 7320, change: 15, percentChange: 0.21 },
  'GOTO.JK': { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia', price: 68, change: -2, percentChange: -2.86 },
  'BUKA.JK': { symbol: 'BUKA.JK', name: 'Bukalapak', price: 142, change: -3, percentChange: -2.07 },
  'MDKA.JK': { symbol: 'MDKA.JK', name: 'Merdeka Copper Gold', price: 2450, change: 50, percentChange: 2.08 },
};

export const useStockData = (symbols: string[]) => {
  const [data, setData] = useState<Record<string, StockData>>(() => {
    const initial: Record<string, StockData> = {};
    symbols.forEach((s) => {
      const base = INITIAL_DATA[s] || { symbol: s, name: s, price: 1000, change: 0, percentChange: 0 };
      initial[s] = { ...base, lastUpdate: new Date(), flash: null };
    });
    return initial;
  });

  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setData((current) => {
        const next = { ...current };
        symbols.forEach((s) => {
          if (!next[s]) return;
          
          const volatility = 0.002; // 0.2% max change per tick
          const drift = 0.0001; // Slight upward bias
          const changePercent = (Math.random() - 0.5 + drift) * volatility;
          const oldPrice = next[s].price;
          const newPrice = oldPrice * (1 + changePercent);
          
          const diff = newPrice - oldPrice;
          const flash = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : null;

          next[s] = {
            ...next[s],
            price: newPrice,
            change: next[s].change + diff,
            percentChange: ((newPrice - (INITIAL_DATA[s]?.price || oldPrice)) / (INITIAL_DATA[s]?.price || oldPrice)) * 100,
            lastUpdate: new Date(),
            flash,
          };
        });
        return next;
      });

      // Clear flash after 1 second
      setTimeout(() => {
        setData((current) => {
          const next = { ...current };
          symbols.forEach((s) => {
            if (next[s]) next[s] = { ...next[s], flash: null };
          });
          return next;
        });
      }, 1000);

    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [symbols]);

  return data;
};
