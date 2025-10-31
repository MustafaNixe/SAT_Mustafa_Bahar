import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  getCurrentScheme: () => NonNullable<ColorSchemeName>;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      getCurrentScheme: () => {
        const pref = get().preference;
        if (pref === 'system') return Appearance.getColorScheme() ?? 'light';
        return pref;
      },
    }),
    {
      name: 'theme-pref-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ preference: s.preference }),
    }
  )
);


