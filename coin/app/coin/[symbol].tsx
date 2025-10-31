import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchKlines, fetchSevenDayChangePercent, fetch24hTickersUSDT } from '@/services/binance';

export default function CoinDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [dayChange, setDayChange] = useState<number>(0);
  const [weekChange, setWeekChange] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [volumeQ, setVolumeQ] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchKlines(String(symbol), '1d', 120);
        const week = await fetchSevenDayChangePercent(String(symbol));
        const tickers = await fetch24hTickersUSDT();
        if (!active) return;
        setPoints(
          data.map((k) => ({ x: k.openTime, y: k.close }))
        );
        const t = tickers[String(symbol)];
        if (t) {
          setPrice(t.price);
          setDayChange(t.changePct);
          setVolumeQ(t.volumeQ);
        }
        setWeekChange(week);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [symbol]);

  const title = useMemo(() => String(symbol ?? '').replace('USDT', ''), [symbol]);

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={{ marginBottom: 12 }}>
            <ThemedText type="title">${price.toFixed(4)}</ThemedText>
            <ThemedText style={{ color: dayChange >= 0 ? '#16a34a' : '#ef4444' }}>24s: {dayChange.toFixed(2)}%</ThemedText>
            <ThemedText style={{ color: weekChange >= 0 ? '#16a34a' : '#ef4444' }}>7g: {weekChange.toFixed(2)}%</ThemedText>
            {volumeQ !== undefined && (
              <ThemedText style={{ opacity: 0.8 }}>Hacim (USDT): {(volumeQ/1_000_000).toFixed(2)}M</ThemedText>
            )}
          </View>
          <VictoryChart theme={VictoryTheme.material} domainPadding={{ y: 10 }}>
            <VictoryLine data={points} interpolation="monotoneX" />
          </VictoryChart>
        </>
      )}
    </ThemedView>
  );
}


