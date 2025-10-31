import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { CoinRow } from '@/components/coin-row';
import { fetch24hTickersUSDT, fetchSevenDayChangePercent } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function MarketsScreen() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [week, setWeek] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'card');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetch24hTickersUSDT();
        if (!active) return;
        setTickers(data);
      } catch {
        setTickers({});
      } finally {
        setLoading(false);
      }
    })();
    const stop = startUSDTSpotMiniTicker((update) => {
      if (!active) return;
      setTickers((prev) => ({ ...prev, ...update }));
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const symbols = list.slice(0, 30).map((i) => i.symbol); // ilk 30 için önbellekle
    (async () => {
      const toFetch = symbols.filter((s) => week[s] === undefined);
      for (const s of toFetch) {
        try {
          const pct = await fetchSevenDayChangePercent(s);
          if (!active) return;
          setWeek((prev) => ({ ...prev, [s]: pct }));
        } catch {}
      }
    })();
    return () => {
      active = false;
    };
  }, [list]);

  const list = useMemo(() => Object.entries(tickers)
    .map(([symbol, v]) => ({ symbol, ...v }))
    .filter((c) => c.symbol.includes('USDT'))
    .filter((c) => c.symbol.toLowerCase().includes(query.toLowerCase().replace('usdt','')))
    .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0)), [tickers, query]);

  return (
    <ThemedView style={{ flex: 1, padding: 16, gap: 16 }}>
      <ThemedText type="title">Piyasalar</ThemedText>
      <TextInput
        placeholder="Ara: BTC, ETH..."
        placeholderTextColor={text as string}
        value={query}
        onChangeText={setQuery}
        style={{
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 44,
          borderColor: border as string,
          color: text as string,
          backgroundColor: bg as string,
        }}
      />
      <Card>
        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(it) => it.symbol}
            renderItem={({ item }) => (
              <CoinRow
                symbol={item.symbol}
                price={item.price}
                change24h={item.changePct}
                volumeQ={item.volumeQ}
                weekChange={week[item.symbol]}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, opacity: 0.1, backgroundColor: '#9ca3af' }} />}
          />
        )}
      </Card>
    </ThemedView>
  );
}
