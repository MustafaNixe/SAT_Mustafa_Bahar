import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Currency = 'USDT' | 'BTC' | 'ETH' | 'TRY';

type SettingsState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  priceAlertsEnabled: boolean;
  setPriceAlertsEnabled: (enabled: boolean) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  dataSaverMode: boolean;
  setDataSaverMode: (enabled: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USDT',
      setCurrency: (currency) => set({ currency }),
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      priceAlertsEnabled: false,
      setPriceAlertsEnabled: (enabled) => set({ priceAlertsEnabled: enabled }),
      hapticFeedback: true,
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      dataSaverMode: false,
      setDataSaverMode: (enabled) => set({ dataSaverMode: enabled }),
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: 'settings-store-v4',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        currency: s.currency,
        notificationsEnabled: s.notificationsEnabled,
        priceAlertsEnabled: s.priceAlertsEnabled,
        hapticFeedback: s.hapticFeedback,
        dataSaverMode: s.dataSaverMode,
        soundEnabled: s.soundEnabled,
      }),
    }
  )
);

