import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetch24hTickersUSDT } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/stat';
import { CoinRow } from '@/components/coin-row';

export default function HomeScreen() {
  const items = usePortfolioStore((s) => s.items);
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number }>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetch24hTickersUSDT();
        if (!active) return;
        setTickers(data);
      } catch {}
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

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [sym, v] of Object.entries(tickers)) m[sym] = v.price;
    return m;
  }, [tickers]);

  const totals = useMemo(() => calculateTotals(items, priceMap), [items, priceMap]);

  const holdings = useMemo(() => items.map((it) => ({
    ...it,
    price: priceMap[it.symbol] ?? 0,
    change: tickers[it.symbol]?.changePct ?? 0,
    value: (priceMap[it.symbol] ?? 0) * it.amount,
  })), [items, priceMap, tickers]);

  const movers = useMemo(() => Object.entries(tickers)
    .sort((a, b) => Math.abs(b[1].changePct) - Math.abs(a[1].changePct))
    .slice(0, 8), [tickers]);

  return (
    <ThemedView style={{ flex: 1, padding: 16, gap: 16 }}>
      <ThemedText type="title">Özet</ThemedText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Güncel Değer" value={`$${totals.current.toFixed(2)}`} />
        <Stat label="Yatırım" value={`$${totals.invested.toFixed(2)}`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat
          label="PnL"
          value={`$${totals.pnl.toFixed(2)}`}
          sub={`${totals.pnlPct.toFixed(2)}%`}
          color={totals.pnl >= 0 ? '#16a34a' : '#ef4444'}
        />
      </View>

      <ThemedText type="title" style={{ marginTop: 8 }}>Varlıklarım</ThemedText>
      <Card>
        {holdings.length === 0 ? (
          <ThemedText>Portföyüne coin ekle, burada gözüksün.</ThemedText>
        ) : (
          <FlatList
            data={holdings}
            keyExtractor={(it) => it.symbol}
            ItemSeparatorComponent={() => <View style={{ height: 1, opacity: 0.1, backgroundColor: '#9ca3af' }} />}
            renderItem={({ item }) => (
              <CoinRow symbol={item.symbol} value={item.value} change24h={item.change} />
            )}
          />
        )}
      </Card>

      <ThemedText type="title" style={{ marginTop: 8 }}>Günün Hareketlileri</ThemedText>
      <Card>
        <FlatList
          data={movers}
          keyExtractor={([sym]) => sym}
          renderItem={({ item: [sym, v] }) => (
            <CoinRow symbol={sym} price={v.price} change24h={v.changePct} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, opacity: 0.1, backgroundColor: '#9ca3af' }} />}
        />
      </Card>
    </ThemedView>
  );
}
