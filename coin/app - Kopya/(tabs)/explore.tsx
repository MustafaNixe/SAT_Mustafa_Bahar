import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View, Pressable, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CoinAvatar } from '@/components/coin-avatar';
import { Sparkline } from '@/components/sparkline';
import { fetch24hTickersUSDT, fetchKlines, fetchAllUSDTPrices } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

const FILTER_TABS = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'TRY'];

export default function MarketsScreen() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [sparklines, setSparklines] = useState<Record<string, { x: number; y: number }[]>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('USDT');
  const [loading, setLoading] = useState(true);
  
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const bg = useThemeColor({}, 'card');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

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
    let timer: ReturnType<typeof setTimeout> | null = null;

    const syncLatestPrices = async () => {
      try {
        const snapshot = await fetchAllUSDTPrices();
        if (!active) return;
        setTickers((prev) => {
          const next = { ...prev };
          for (const [symbol, price] of Object.entries(snapshot)) {
            const prevEntry = next[symbol];
            if (prevEntry) {
              next[symbol] = { ...prevEntry, price };
            } else {
              next[symbol] = { price, changePct: 0 };
            }
          }
          return next;
        });
      } catch (err) {
        console.warn('Failed to refresh spot price snapshot', err);
      }
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        await syncLatestPrices();
        if (active) schedule();
      }, 15_000);
    };

    syncLatestPrices();
    schedule();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Load sparklines for visible coins
  useEffect(() => {
    let active = true;
    const symbols = list.slice(0, 50).map((i) => i.symbol);
    (async () => {
      for (const symbol of symbols) {
        if (sparklines[symbol] || !active) continue;
        try {
          const klines = await fetchKlines(symbol, '1h', 24);
          if (!active) return;
          const points = klines.map((k, idx) => ({ x: idx, y: Number(k.close) || 0 })).filter(p => p.y > 0);
          if (points.length > 0) {
            setSparklines((prev) => ({ ...prev, [symbol]: points }));
          }
        } catch {}
      }
    })();
    return () => {
      active = false;
    };
  }, [tickers]);

  const list = useMemo(() => {
    return Object.entries(tickers)
      .map(([symbol, v]) => ({ symbol, ...v }))
      .filter((c) => {
        const base = c.symbol.replace(activeFilter, '');
        return c.symbol.endsWith(activeFilter) && base.length > 0;
      })
      .filter((c) => {
        if (!query.trim()) return true;
        const searchQuery = query.toLowerCase().trim();
        const coinName = c.symbol.replace(activeFilter, '').toLowerCase();
        const fullSymbol = c.symbol.toLowerCase();
        
        // Coin adında veya tam sembolde arama yap
        return coinName.includes(searchQuery) || fullSymbol.includes(searchQuery);
      })
      .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0));
  }, [tickers, activeFilter, query]);

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold' }}>
                Anlık İşlem
              </ThemedText>
              {!loading && (
                <ThemedText style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>
                  {list.length} coin
                </ThemedText>
              )}
            </View>
          </View>

          {/* Search Bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bg as string,
            borderWidth: 1,
            borderColor: border as string,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}>
            <MaterialCommunityIcons name="magnify" size={20} color={muted as string} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Coin ara (BTC, ETH, vb.)"
              placeholderTextColor={muted as string}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                color: text as string,
                fontSize: 14,
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                style={{ marginLeft: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={muted as string} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeFilter === tab ? (tint as string) : 'transparent',
                borderWidth: activeFilter === tab ? 0 : 1,
                borderColor: border as string,
              }}
            >
              <ThemedText style={{
                fontSize: 14,
                fontWeight: activeFilter === tab ? '600' : '400',
                color: activeFilter === tab ? '#ffffff' : (text as string),
              }}>
                {tab}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* List Headers */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginTop: 16,
        }}>
          <ThemedText style={{ fontSize: 12, opacity: 0.6, flex: 1 }}>Coin</ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.6, textAlign: 'right', width: 80 }}>Son Fiyat</ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.6, textAlign: 'right', width: 80 }}>24s Değişim</ThemedText>
        </View>
      </View>

      {/* Coin List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(it) => it.symbol}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
          renderItem={({ item }) => {
            const coinName = item.symbol.replace(activeFilter, '');
            const isFavorite = favorites.has(item.symbol);
            const sparklineData = sparklines[item.symbol] || [];
            const isPositive = item.changePct >= 0;
            const chartColor = isPositive ? success : danger;

            return (
              <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }} asChild>
                <Pressable style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: bg as string,
                  borderRadius: 12,
                  marginBottom: 8,
                }}>
                  {/* Left: Star, Avatar, Name */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.symbol);
                      }}
                      style={{ marginRight: 8 }}
                    >
                      <MaterialCommunityIcons
                        name={isFavorite ? 'star' : 'star-outline'}
                        size={18}
                        color={isFavorite ? '#FFD700' : (text as string)}
                        style={{ opacity: isFavorite ? 1 : 0.5 }}
                      />
                    </TouchableOpacity>
                    <CoinAvatar symbol={item.symbol} size={32} />
                    <View style={{ marginLeft: 8 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>
                        {coinName}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Middle: Price & Sparkline */}
                  <View style={{ alignItems: 'flex-end', marginRight: 12, width: 80 }}>
                    <ThemedText style={{ fontWeight: '600', fontSize: 14, marginBottom: 4 }}>
                      {item.price.toFixed(item.price < 1 ? 4 : 2)}
                    </ThemedText>
                    {sparklineData.length > 0 && (
                      <Sparkline
                        data={sparklineData}
                        width={60}
                        height={16}
                        color={chartColor as string}
                      />
                    )}
                  </View>

                  {/* Right: 24h Change */}
                  <View style={{ alignItems: 'flex-end', width: 80 }}>
                    <ThemedText style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isPositive ? success : danger,
                    }}>
                      {isPositive ? '+' : ''}{item.changePct.toFixed(2)}%
                    </ThemedText>
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </ThemedView>
  );
}
