import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Currency = 'USDT' | 'BTC' | 'ETH' | 'TRY';

type SettingsState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  language: string;
  setLanguage: (language: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  priceAlertsEnabled: boolean;
  setPriceAlertsEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USDT',
      setCurrency: (currency) => set({ currency }),
      language: 'tr',
      setLanguage: (language) => set({ language }),
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      priceAlertsEnabled: false,
      setPriceAlertsEnabled: (enabled) => set({ priceAlertsEnabled: enabled }),
    }),
    {
      name: 'settings-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        currency: s.currency,
        language: s.language,
        notificationsEnabled: s.notificationsEnabled,
        priceAlertsEnabled: s.priceAlertsEnabled,
      }),
    }
  )
);

