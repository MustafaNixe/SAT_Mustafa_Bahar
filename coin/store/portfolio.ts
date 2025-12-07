import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type PortfolioItem = {
  symbol: string; // e.g., BTCUSDT
  amount: number; // quantity owned
  avgBuyPrice: number; // average buy price in USDT
};

type PortfolioState = {
  items: PortfolioItem[];
  userId: string | null; // Track which user owns this portfolio
  addOrUpdate: (item: PortfolioItem) => void;
  remove: (symbol: string) => void;
  clear: () => void;
  setUserId: (userId: string | null) => Promise<void>; // Set user ID and load/reset portfolio
};

// Get storage key based on user ID
const getStorageKey = (userId: string | null) => {
  return userId ? `portfolio-store-${userId}` : 'portfolio-store-guest';
};

export const usePortfolioStore = create<PortfolioState>()(
  (set, get) => ({
    items: [],
    userId: null,
    
    setUserId: async (newUserId: string | null) => {
      const currentUserId = get().userId;
      
      // If user changed, load their portfolio or reset to empty
      if (currentUserId !== newUserId) {
        // Clear current items first
        set({ items: [], userId: newUserId });
        
        // Load user-specific portfolio from storage
        if (newUserId) {
          try {
            const storageKey = getStorageKey(newUserId);
            const stored = await AsyncStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.items && Array.isArray(parsed.items)) {
                set({ items: parsed.items, userId: newUserId });
              }
            }
          } catch (error) {
            console.error('Error loading user portfolio:', error);
            set({ items: [], userId: newUserId });
          }
        } else {
          set({ items: [], userId: null });
        }
      }
    },
    
    addOrUpdate: (next) => {
      set((state) => {
        const idx = state.items.findIndex((i) => i.symbol === next.symbol);
        const items = [...state.items];
        if (idx >= 0) items[idx] = next; else items.push(next);
        
        // Save to user-specific storage
        const userId = state.userId;
        if (userId) {
          const storageKey = getStorageKey(userId);
          AsyncStorage.setItem(storageKey, JSON.stringify({ items, userId })).catch(() => {});
        }
        
        return { items };
      });
    },
    
    remove: (symbol) => {
      set((state) => {
        const items = state.items.filter((i) => i.symbol !== symbol);
        
        // Save to user-specific storage
        const userId = state.userId;
        if (userId) {
          const storageKey = getStorageKey(userId);
          AsyncStorage.setItem(storageKey, JSON.stringify({ items, userId })).catch(() => {});
        }
        
        return { items };
      });
    },
    
    clear: () => {
      set((state) => {
        const userId = state.userId;
        
        // Clear user-specific storage
        if (userId) {
          const storageKey = getStorageKey(userId);
          AsyncStorage.removeItem(storageKey).catch(() => {});
        }
        
        return { items: [] };
      });
    },
  })
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


