import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = { symbol: string; size?: number };

const MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'alpha-b',
  SOL: 'alpha-s',
  XRP: 'alpha-x',
  ADA: 'alpha-a',
  DOGE: 'dog',
  TRX: 'alpha-t',
  AVAX: 'alpha-a',
  MATIC: 'alpha-m',
  LINK: 'link-variant',
  LTC: 'litecoin',
  DOT: 'alpha-d',
  ETC: 'alpha-e',
};

export function CoinAvatar({ symbol, size = 28 }: Props) {
  const bg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const sym = symbol.replace('USDT', '').toUpperCase();
  const iconName = MAP[sym];

  return (
    <View
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {iconName ? (
        <MaterialCommunityIcons name={iconName} size={size} color={text as string} />
      ) : (
        <ThemedText type="defaultSemiBold">{sym.slice(0, 2)}</ThemedText>
      )}
    </View>
  );
}


