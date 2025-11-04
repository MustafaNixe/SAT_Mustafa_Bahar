import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  safe?: boolean; // SafeArea kullanılsın mı?
  edges?: ('top' | 'bottom' | 'left' | 'right')[]; // Hangi kenarlarda safe area
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  safe = false,
  edges = ['top', 'bottom'],
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  if (safe) {
    return (
      <SafeAreaView 
        style={[{ backgroundColor }, style]} 
        edges={edges}
        {...otherProps} 
      />
    );
  }

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
