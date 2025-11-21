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
  pointerEvents,
  safe = false,
  edges = ['top', 'bottom'],
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const pointerEventsStyle = pointerEvents ? { pointerEvents } : null;

  if (safe) {
    return (
      <SafeAreaView 
        style={[{ backgroundColor }, pointerEventsStyle, style]} 
        edges={edges}
        {...otherProps} 
      />
    );
  }

  return <View style={[{ backgroundColor }, pointerEventsStyle, style]} {...otherProps} />;
}
