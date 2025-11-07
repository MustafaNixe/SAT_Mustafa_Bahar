import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { useThemeStore } from '@/store/theme';

export function useColorScheme() {
  const preference = useThemeStore((s) => s.preference);
  const [systemScheme, setSystemScheme] = useState<NonNullable<'light' | 'dark'>>(
    Appearance.getColorScheme() ?? 'light'
  );

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => subscription.remove();
  }, []);

  if (preference === 'system') {
    return systemScheme;
  }

  return preference;
}
