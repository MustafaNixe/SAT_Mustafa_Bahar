import { View, type ViewProps, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  safe?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  pointerEvents,
  safe = false,
  edges = ['top'],
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const pointerEventsStyle = pointerEvents ? { pointerEvents } : undefined;

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
