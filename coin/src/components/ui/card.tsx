import React from 'react';
import { View, ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = ViewProps & { padding?: number };

export function Card({ style, padding = 12, ...rest }: Props) {
  const bg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 12,
          padding,
        },
        style,
      ]}
      {...rest}
    />
  );
}


