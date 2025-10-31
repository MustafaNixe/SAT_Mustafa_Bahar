import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetchAllUSDTPrices } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { Card } from '@/components/ui/card';

type Draft = { symbol: string; amount: string; buy: string };

export default function PortfolioScreen() {
  const items = usePortfolioStore((s) => s.items);
  const addOrUpdate = usePortfolioStore((s) => s.addOrUpdate);
  const remove = usePortfolioStore((s) => s.remove);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Draft>({ symbol: '', amount: '', buy: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const map = await fetchAllUSDTPrices();
        if (!active) return;
        setPrices(map);
      } catch (e) {
        // basic error surface
      }
    })();
    const stop = startUSDTSpotMiniTicker((update) => {
      if (!active) return;
      setPrices((prev) => {
        const next = { ...prev } as Record<string, number>;
        for (const [sym, v] of Object.entries(update)) next[sym] = v.price;
        return next;
      });
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  const totals = useMemo(() => calculateTotals(items, prices), [items, prices]);

  const onAdd = () => {
    const symbol = draft.symbol.toUpperCase().replace(/\s+/g, '') + (draft.symbol.toUpperCase().endsWith('USDT') ? '' : 'USDT');
    const amount = Number(draft.amount);
    const buy = Number(draft.buy);
    if (!symbol.endsWith('USDT') || !amount || !buy) {
      Alert.alert('Hata', 'Lütfen sembol, miktar ve alış fiyatı girin. Örn: BTC, 0.5, 60000');
      return;
    }
    addOrUpdate({ symbol, amount, avgBuyPrice: buy });
    setDraft({ symbol: '', amount: '', buy: '' });
  };

  return (
    <ThemedView style={{ flex: 1, padding: 16, gap: 16 }}>
      <ThemedText type="title">Portföy</ThemedText>
      <Card style={{ gap: 8 }}>
        <ThemedText type="subtitle">Varlık Ekle/Güncelle</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Sembol (BTC)"
          value={draft.symbol}
          onChangeText={(t) => setDraft((d) => ({ ...d, symbol: t }))}
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 40 }}
        />
        <TextInput
          placeholder="Miktar"
          keyboardType="decimal-pad"
          value={draft.amount}
          onChangeText={(t) => setDraft((d) => ({ ...d, amount: t }))}
          style={{ width: 90, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 40 }}
        />
        <TextInput
          placeholder="Alış"
          keyboardType="decimal-pad"
          value={draft.buy}
          onChangeText={(t) => setDraft((d) => ({ ...d, buy: t }))}
          style={{ width: 90, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 40 }}
        />
        <Pressable onPress={onAdd} style={{ backgroundColor: '#0ea5e9', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }}>
          <ThemedText style={{ color: 'white' }}>Kaydet</ThemedText>
        </Pressable>
        </View>
      </Card>

      <Card>
        <ThemedText>Yatırım: ${totals.invested.toFixed(2)}</ThemedText>
        <ThemedText>Güncel: ${totals.current.toFixed(2)}</ThemedText>
        <ThemedText>
          Kar/Zarar: ${totals.pnl.toFixed(2)} ({totals.pnlPct.toFixed(2)}%)
        </ThemedText>
      </Card>

      <FlatList
        data={items}
        keyExtractor={(it) => it.symbol}
        renderItem={({ item }) => {
          const price = prices[item.symbol] ?? 0;
          const value = price * item.amount;
          const pnl = value - item.amount * item.avgBuyPrice;
          const coin = item.symbol.replace('USDT', '');
          return (
            <Card style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }}>
                  <ThemedText type="subtitle">{coin}</ThemedText>
                </Link>
                <Pressable onPress={() => remove(item.symbol)}>
                  <ThemedText style={{ color: '#ef4444' }}>Sil</ThemedText>
                </Pressable>
              </View>
              <ThemedText>Miktar: {item.amount}</ThemedText>
              <ThemedText>Fiyat: ${price.toFixed(4)}</ThemedText>
              <ThemedText>Değer: ${value.toFixed(2)}</ThemedText>
              <ThemedText style={{ color: pnl >= 0 ? '#16a34a' : '#ef4444' }}>
                PnL: ${pnl.toFixed(2)}
              </ThemedText>
            </Card>
          );
        }}
      />
    </ThemedView>
  );
}


