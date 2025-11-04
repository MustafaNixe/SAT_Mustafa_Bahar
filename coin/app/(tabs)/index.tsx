import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, View, Dimensions, Pressable, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetch24hTickersUSDT } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { Card } from '@/components/ui/card';
import { CoinRow } from '@/components/coin-row';
import { CoinAvatar } from '@/components/coin-avatar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width } = Dimensions.get('window');

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

type TabType = 'watchlist' | 'hot' | 'gainers' | 'losers';

export default function HomeScreen() {
  const items = usePortfolioStore((s) => s.items);
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [activeTab, setActiveTab] = useState<TabType>('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');

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

  const allCoins = useMemo(() => Object.entries(tickers)
    .map(([symbol, v]) => ({ symbol, ...v }))
    .filter((c) => c.symbol.endsWith('USDT')), [tickers]);

  const filteredCoins = useMemo(() => {
    let list = allCoins;
    
    // Tab filtresi
    if (activeTab === 'hot') {
      list = list.sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0)).slice(0, 20);
    } else if (activeTab === 'gainers') {
      list = list.filter((c) => c.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 20);
    } else if (activeTab === 'losers') {
      list = list.filter((c) => c.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 20);
    } else {
      // watchlist - portföydeki coinler + popülerler
      const holdingSymbols = new Set(items.map((it) => it.symbol));
      const holdings = list.filter((c) => holdingSymbols.has(c.symbol));
      const popular = list
        .filter((c) => !holdingSymbols.has(c.symbol))
        .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0))
        .slice(0, 10);
      list = [...holdings, ...popular];
    }
    
    // Search filtresi
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.symbol.toLowerCase().includes(q));
    }
    
    return list;
  }, [allCoins, activeTab, searchQuery, items]);

  const isSmallScreen = width < 360;

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Est Total Value Card */}
        <Card style={{ 
          margin: 16,
          marginBottom: 12,
          padding: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <ThemedText style={{ opacity: 0.7, fontSize: 13 }}>Est total value</ThemedText>
                <MaterialCommunityIcons name="information-outline" size={14} color={text as string} style={{ opacity: 0.5, marginLeft: 4 }} />
              </View>
              <ThemedText 
                type="title" 
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ 
                  fontSize: 32, 
                  fontWeight: 'bold',
                  marginBottom: 8,
                }}
              >
                {formatCurrency(totals.current)}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText 
                  style={{ 
                    fontSize: 16,
                    color: totals.pnl >= 0 ? success as string : danger as string,
                    fontWeight: '600',
                  }}
                >
                  {totals.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(totals.pnl))}
                </ThemedText>
                <ThemedText 
                  style={{ 
                    fontSize: 16,
                    color: totals.pnl >= 0 ? success as string : danger as string,
                    marginLeft: 8,
                  }}
                >
                  ({totals.pnl >= 0 ? '+' : ''}{totals.pnlPct.toFixed(2)}%) Today
                </ThemedText>
                <MaterialCommunityIcons name="information-outline" size={14} color={totals.pnl >= 0 ? success as string : danger as string} style={{ opacity: 0.7, marginLeft: 4 }} />
              </View>
            </View>
            <Pressable 
              style={{
                backgroundColor: success as string,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Deposit</ThemedText>
            </Pressable>
          </View>
        </Card>

        {/* Orders & Positions Cards */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16 }}>
          <Card style={{ flex: 1, padding: 14 }}>
            <ThemedText style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Orders</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>{formatCurrency(totals.invested)}</ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={20} color={text as string} style={{ opacity: 0.5 }} />
            </View>
          </Card>
          <Card style={{ flex: 1, padding: 14 }}>
            <ThemedText style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>Positions</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>{formatCurrency(totals.current)}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: totals.pnl >= 0 ? success as string : danger as string }}>
                  {totals.pnl >= 0 ? '+' : ''}{totals.pnlPct.toFixed(2)}%
                </ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={text as string} style={{ opacity: 0.5 }} />
            </View>
          </Card>
        </View>

        {/* Search Bar */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg as string,
            borderWidth: 1,
            borderColor: border as string,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}>
            <MaterialCommunityIcons name="magnify" size={20} color={text as string} style={{ opacity: 0.5, marginRight: 8 }} />
            <TextInput
              placeholder="Search"
              placeholderTextColor={text as string}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                color: text as string,
                fontSize: 14,
              }}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 }}>
          {(['watchlist', 'hot', 'gainers', 'losers'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeTab === tab ? (cardBg as string) : 'transparent',
                borderWidth: activeTab === tab ? 1 : 0,
                borderColor: border as string,
              }}
            >
              <ThemedText style={{
                fontSize: 14,
                fontWeight: activeTab === tab ? '600' : '400',
                textTransform: 'capitalize',
              }}>
                {tab === 'watchlist' ? 'Watchlist' : tab === 'hot' ? 'Hot' : tab === 'gainers' ? 'Gainers' : 'Losers'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Coin List */}
        <Card style={{ marginHorizontal: 16, padding: 0 }}>
          <FlatList
            data={filteredCoins.slice(0, 10)}
            scrollEnabled={false}
            keyExtractor={(item) => item.symbol}
            renderItem={({ item }) => {
              const coin = item.symbol.replace('USDT', '');
              const vol = item.volumeQ ? (item.volumeQ / 1_000).toFixed(2) + 'K' : '-';
              return (
                <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }} asChild>
                  <Pressable style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                  }}>
                    <CoinAvatar symbol={item.symbol} size={32} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>{coin} / USDT</ThemedText>
                      <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>Vol {vol}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>
                        {item.price.toFixed(item.price < 1 ? 4 : 2)}
                      </ThemedText>
                      <ThemedText style={{ 
                        fontSize: 12,
                        color: item.changePct >= 0 ? success as string : danger as string,
                      }}>
                        {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons 
                      name="star-outline" 
                      size={20} 
                      color={text as string} 
                      style={{ opacity: 0.5 }} 
                    />
                  </Pressable>
                </Link>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, opacity: 0.1, backgroundColor: '#9ca3af', marginHorizontal: 12 }} />}
          />
        </Card>

        {/* View All Button */}
        {filteredCoins.length > 10 && (
          <Pressable 
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: cardBg as string,
              borderWidth: 1,
              borderColor: border as string,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ fontWeight: '600' }}>View all</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}
