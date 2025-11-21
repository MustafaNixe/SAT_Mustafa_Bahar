import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { useThemeStore } from '@/store/theme';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const preference = useThemeStore((s) => s.preference);
  const getCurrentScheme = useThemeStore((s) => s.getCurrentScheme);
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => subscription.remove();
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  if (preference === 'system') {
    return systemScheme;
  }

  return getCurrentScheme();
}
