import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PortfolioItem = {
  symbol: string; // e.g., BTCUSDT
  amount: number; // quantity owned
  avgBuyPrice: number; // average buy price in USDT
};

type PortfolioState = {
  items: PortfolioItem[];
  addOrUpdate: (item: PortfolioItem) => void;
  remove: (symbol: string) => void;
  clear: () => void;
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      items: [],
      addOrUpdate: (next) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.symbol === next.symbol);
          const items = [...state.items];
          if (idx >= 0) items[idx] = next; else items.push(next);
          return { items };
        }),
      remove: (symbol) =>
        set((state) => ({ items: state.items.filter((i) => i.symbol !== symbol) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'portfolio-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function calculateTotals(
  items: PortfolioItem[],
  priceMap: Record<string, number>
) {
  let invested = 0;
  let current = 0;
  
  for (const it of items) {
    // Validate inputs
    const amount = Number(it.amount) || 0;
    const avgBuyPrice = Number(it.avgBuyPrice) || 0;
    const price = Number(priceMap[it.symbol]) || 0;
    
    // Only calculate if values are valid
    if (amount > 0 && avgBuyPrice > 0) {
      const investedValue = amount * avgBuyPrice;
      invested += investedValue;
      
      if (price > 0) {
        const currentValue = amount * price;
        current += currentValue;
      }
    }
  }
  
  // Calculate PnL with proper validation
  const pnl = current - invested;
  const pnlPct = invested > 0 && isFinite(invested) ? (pnl / invested) * 100 : 0;
  
  return { 
    invested: isFinite(invested) ? invested : 0, 
    current: isFinite(current) ? current : 0, 
    pnl: isFinite(pnl) ? pnl : 0, 
    pnlPct: isFinite(pnlPct) ? pnlPct : 0 
  };
}


