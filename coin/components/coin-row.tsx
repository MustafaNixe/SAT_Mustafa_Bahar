import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Link } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CoinAvatar } from '@/components/coin-avatar';

type Props = {
  symbol: string; // BTCUSDT
  price?: number;
  change24h?: number; // percent
  value?: number; // optional portfolio value display
  volumeQ?: number; // quote volume (USDT)
  weekChange?: number; // 7d percent
};

export function CoinRow({ symbol, price, change24h, value, volumeQ, weekChange }: Props) {
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const coin = symbol.replace('USDT', '');
  const changeColor = change24h === undefined ? undefined : change24h >= 0 ? success : danger;

  return (
    <Link href={{ pathname: '/coin/[symbol]', params: { symbol } }} asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CoinAvatar symbol={symbol} />
          <ThemedText type="defaultSemiBold">{coin}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {value !== undefined ? (
            <>
              <ThemedText>${value.toFixed(2)}</ThemedText>
              <ThemedText style={{ color: changeColor }}>{(change24h ?? 0).toFixed(2)}%</ThemedText>
            </>
          ) : (
            <>
              <ThemedText>${(price ?? 0).toFixed(4)}</ThemedText>
              <ThemedText style={{ color: changeColor }}>{(change24h ?? 0).toFixed(2)}%</ThemedText>
            </>
          )}
          <ThemedText style={{ opacity: 0.7 }}>Vol: {volumeQ ? `${(volumeQ/1_000_000).toFixed(2)}M` : '-'}</ThemedText>
          {weekChange !== undefined && (
            <ThemedText style={{ color: (weekChange ?? 0) >= 0 ? success : danger }}>
              7g: {(weekChange ?? 0).toFixed(2)}%
            </ThemedText>
          )}
        </View>
      </Pressable>
    </Link>
  );
}


