import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FlatList, View, Pressable, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Dimensions, Platform } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetch24hTickersUSDT, fetchAllUSDTPrices, fetchKlines } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { Card } from '@/components/ui/card';
import { CoinAvatar } from '@/components/ui/coin-avatar';
import { Sparkline } from '@/components/charts/sparkline';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';


function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0.00';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

type TabType = 'favorites' | 'hot' | 'gainers' | 'losers';

type CoinItem = {
  symbol: string;
  price: number;
  changePct: number;
  volumeQ?: number;
};

type CoinRowProps = {
  item: CoinItem;
  activeFilter: string;
  favorites: Set<string>;
  sparklines: Record<string, { x: number; y: number }[]>;
  onToggleFavorite: (symbol: string) => void;
  success: string;
  danger: string;
  cardBg: string;
  text: string;
  muted: string;
};

const CoinRowItem = React.memo(({ 
  item, 
  activeFilter, 
  favorites, 
  sparklines, 
  onToggleFavorite,
  success,
  danger,
  cardBg,
  text,
  muted
}: CoinRowProps) => {
  const coinName = item.symbol.replace(activeFilter, '');
  const isFavorite = favorites.has(item.symbol);
  const sparklineData = sparklines[item.symbol] || [];
  const isPositive = item.changePct >= 0;
  const price = item.price || 0;
  const changePct = item.changePct || 0;

  return (
    <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }} asChild>
      <Pressable style={{
        marginBottom: IS_SMALL_SCREEN ? 10 : 12,
      }}>
        <Card style={{
          padding: IS_SMALL_SCREEN ? 14 : 16,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
            },
            android: {
              elevation: 2,
            },
          }),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.symbol);
              }}
              style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12 }}
            >
              <MaterialCommunityIcons
                name={isFavorite ? 'star' : 'star-outline'}
                size={IS_SMALL_SCREEN ? 18 : 20}
                color={isFavorite ? '#FFD700' : text}
                style={{ opacity: isFavorite ? 1 : 0.4 }}
              />
            </TouchableOpacity>
            <CoinAvatar symbol={item.symbol} size={IS_SMALL_SCREEN ? 36 : 40} />
            <View style={{ flex: 1, marginLeft: IS_SMALL_SCREEN ? 10 : 12 }}>
              <ThemedText 
                numberOfLines={1}
                style={{ 
                  fontWeight: '600', 
                  fontSize: IS_SMALL_SCREEN ? 15 : 16,
                  marginBottom: 4,
                }}>
                {coinName || item.symbol}
              </ThemedText>
              {sparklineData.length > 0 && (
                <View style={{ marginTop: 2 }}>
                  <Sparkline
                    data={sparklineData}
                    width={IS_SMALL_SCREEN ? 80 : 100}
                    height={IS_SMALL_SCREEN ? 20 : 24}
                    autoColor={true}
                    showGradient={true}
                  />
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText style={{ 
                fontWeight: '600', 
                fontSize: IS_SMALL_SCREEN ? 14 : 16,
                marginBottom: 4,
              }}>
                ${price > 0 ? price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2) : '0.00'}
              </ThemedText>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isPositive ? `${success}20` : `${danger}20`,
                paddingHorizontal: IS_SMALL_SCREEN ? 6 : 8,
                paddingVertical: IS_SMALL_SCREEN ? 3 : 4,
                borderRadius: 6,
              }}>
                <MaterialCommunityIcons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={IS_SMALL_SCREEN ? 12 : 14}
                  color={isPositive ? success : danger}
                  style={{ marginRight: 2 }}
                />
                <ThemedText style={{
                  fontSize: IS_SMALL_SCREEN ? 12 : 13,
                  fontWeight: '600',
                  color: isPositive ? success : danger,
                }}>
                  {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                </ThemedText>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
});

CoinRowItem.displayName = 'CoinRowItem';

export default function HomeScreen() {
  const items = usePortfolioStore((s) => s.items);
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [activeTab, setActiveTab] = useState<TabType>('favorites');
  const [sparklines, setSparklines] = useState<Record<string, { x: number; y: number }[]>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const sparklineLoadingRef = useRef<Set<string>>(new Set());
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('favorites');
        if (stored && mounted) {
          const favs = JSON.parse(stored);
          if (Array.isArray(favs)) {
            setFavorites(new Set(favs));
          }
        }
      } catch (error) {
        console.warn('Failed to load favorites:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const stored = await AsyncStorage.getItem('favorites');
          if (stored && mounted) {
            const favs = JSON.parse(stored);
            if (Array.isArray(favs)) {
              setFavorites(new Set(favs));
            }
          }
        } catch (error) {
          console.warn('Failed to load favorites:', error);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const loadTickers = useCallback(async () => {
    try {
      const data = await fetch24hTickersUSDT();
      if (data && typeof data === 'object') {
        setTickers(data);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to load tickers:', error);
      setTickers({});
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await loadTickers();
      } catch (error) {
        console.warn('Initial load error:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    
    let stop: (() => void) | null = null;
    try {
      stop = startUSDTSpotMiniTicker((update) => {
        if (!active || !update) return;
        setTickers((prev) => {
          if (!prev) return update;
          return { ...prev, ...update };
        });
      });
    } catch (error) {
      console.warn('Failed to start realtime updates:', error);
    }
    
    return () => {
      active = false;
      if (stop) stop();
    };
  }, [loadTickers]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const syncLatestPrices = async () => {
      if (!active) return;
      try {
        const snapshot = await fetchAllUSDTPrices();
        if (!active || !snapshot) return;
        setTickers((prev) => {
          if (!prev) return {};
          const next = { ...prev };
          for (const [symbol, price] of Object.entries(snapshot)) {
            if (symbol && typeof price === 'number' && isFinite(price)) {
              const prevEntry = next[symbol];
              if (prevEntry) {
                next[symbol] = { ...prevEntry, price };
              } else {
                next[symbol] = { price, changePct: 0 };
              }
            }
          }
          return next;
        });
      } catch (error) {
        console.warn('Failed to refresh spot price snapshot:', error);
      }
    };

    const schedule = () => {
      if (!active) return;
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

  const priceMap = useMemo(() => {
    if (!tickers) return {};
    const m: Record<string, number> = {};
    for (const [sym, v] of Object.entries(tickers)) {
      if (sym && v && typeof v.price === 'number' && isFinite(v.price)) {
        m[sym] = v.price;
      }
    }
    return m;
  }, [tickers]);

  const totals = useMemo(() => {
    if (!items || !priceMap) {
      return { invested: 0, current: 0, pnl: 0, pnlPct: 0 };
    }
    return calculateTotals(items, priceMap);
  }, [items, priceMap]);

  const list = useMemo(() => {
    if (!tickers) return [];
    try {
      return Object.entries(tickers)
        .map(([symbol, v]) => {
          if (!symbol || !v) return null;
          return { symbol, ...v };
        })
        .filter((c): c is CoinItem => c !== null)
        .filter((c) => {
          if (!c.symbol) return false;
          return c.symbol.endsWith('USDT');
        })
        .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0));
    } catch (error) {
      console.warn('Error processing list:', error);
      return [];
    }
  }, [tickers]);

  useEffect(() => {
    let active = true;
    const symbols = list.slice(0, 30).map((i) => i.symbol).filter(Boolean);
    const symbolsToLoad = symbols.filter(s => !sparklines[s] && !sparklineLoadingRef.current.has(s));
    
    if (symbolsToLoad.length === 0) return;

    (async () => {
      for (const symbol of symbolsToLoad) {
        if (!active || sparklineLoadingRef.current.has(symbol)) continue;
        sparklineLoadingRef.current.add(symbol);
        try {
          const klines = await fetchKlines(symbol, '1h', 24);
          if (!active) return;
          if (klines && Array.isArray(klines) && klines.length > 0) {
            const points = klines
              .map((k, idx) => {
                const close = Number(k?.close);
                return { x: idx, y: isFinite(close) && close > 0 ? close : 0 };
              })
              .filter(p => p.y > 0);
            if (points.length > 0) {
              setSparklines((prev) => ({ ...prev, [symbol]: points }));
            }
          }
        } catch (error) {
          console.warn(`Failed to load sparkline for ${symbol}:`, error);
        } finally {
          sparklineLoadingRef.current.delete(symbol);
        }
      }
    })();
    
    return () => {
      active = false;
    };
  }, [list, sparklines]);

  const topGainers = useMemo(() => {
    if (!list || list.length === 0) return [];
    return [...list]
      .filter((c) => c.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 3);
  }, [list]);

  const topLosers = useMemo(() => {
    if (!list || list.length === 0) return [];
    return [...list]
      .filter((c) => c.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 3);
  }, [list]);

  const filteredCoins = useMemo(() => {
    if (!list || list.length === 0) return [];
    try {
      let listFiltered = [...list];
      
      if (activeTab === 'favorites') {
        listFiltered = listFiltered.filter((c) => favorites.has(c.symbol));
        if (listFiltered.length === 0) return [];
        const holdingSymbols = new Set(items?.map((it) => it.symbol).filter(Boolean) || []);
        const holdings = listFiltered.filter((c) => holdingSymbols.has(c.symbol));
        const others = listFiltered.filter((c) => !holdingSymbols.has(c.symbol));
        listFiltered = [...holdings, ...others];
      } else if (activeTab === 'hot') {
        listFiltered = listFiltered.sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0)).slice(0, 20);
      } else if (activeTab === 'gainers') {
        listFiltered = listFiltered.filter((c) => c.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 20);
      } else if (activeTab === 'losers') {
        listFiltered = listFiltered.filter((c) => c.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 20);
      }
      
      return listFiltered;
    } catch (error) {
      console.warn('Error filtering coins:', error);
      return [];
    }
  }, [list, activeTab, items, favorites]);

  const toggleFavorite = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      AsyncStorage.setItem('favorites', JSON.stringify(Array.from(next))).catch((error) => {
        console.warn('Failed to save favorites:', error);
      });
      return next;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTickers();
    } catch (error) {
      console.warn('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadTickers]);

  const renderCoinItem = useCallback(({ item }: { item: CoinItem }) => {
    return (
      <CoinRowItem
        item={item}
        activeFilter="USDT"
        favorites={favorites}
        sparklines={sparklines}
        onToggleFavorite={toggleFavorite}
        success={success as string}
        danger={danger as string}
        cardBg={cardBg as string}
        text={text as string}
        muted={muted as string}
      />
    );
  }, [favorites, sparklines, toggleFavorite, success, danger, cardBg, text, muted]);

  const keyExtractor = useCallback((item: CoinItem) => item.symbol, []);

  const router = useRouter();

  const ListHeaderComponent = useMemo(() => (
    <>
      <Card style={{ 
        margin: IS_SMALL_SCREEN ? 12 : 16,
        marginBottom: IS_SMALL_SCREEN ? 10 : 12,
        padding: IS_SMALL_SCREEN ? 16 : 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: IS_SMALL_SCREEN ? 10 : 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText style={{ opacity: 0.7, fontSize: IS_SMALL_SCREEN ? 12 : 13 }}>Est total value</ThemedText>
                <MaterialCommunityIcons name="information-outline" size={IS_SMALL_SCREEN ? 12 : 14} color={text as string} style={{ opacity: 0.5, marginLeft: 4 }} />
              </View>
              {items && items.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg as string, paddingHorizontal: IS_SMALL_SCREEN ? 6 : 8, paddingVertical: IS_SMALL_SCREEN ? 3 : 4, borderRadius: 12 }}>
                  <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 10 : 11, fontWeight: '600', color: tint as string, marginRight: 4 }}>
                    {items.length} coin
                  </ThemedText>
                  <MaterialCommunityIcons name="eye-outline" size={IS_SMALL_SCREEN ? 10 : 12} color={tint as string} />
                </View>
              )}
            </View>
            <ThemedText 
              type="title" 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ 
                fontSize: IS_SMALL_SCREEN ? 24 : IS_MEDIUM_SCREEN ? 28 : 32, 
                fontWeight: 'bold',
                marginBottom: IS_SMALL_SCREEN ? 6 : 8,
              }}
            >
              {formatCurrency(totals.current)}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <ThemedText 
                style={{ 
                  fontSize: IS_SMALL_SCREEN ? 14 : 16,
                  color: totals.pnl >= 0 ? success as string : danger as string,
                  fontWeight: '600',
                }}
              >
                {totals.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(totals.pnl))}
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: IS_SMALL_SCREEN ? 14 : 16,
                  color: totals.pnl >= 0 ? success as string : danger as string,
                  marginLeft: IS_SMALL_SCREEN ? 6 : 8,
                }}
              >
                ({totals.pnl >= 0 ? '+' : ''}{totals.pnlPct.toFixed(2)}%) Today
              </ThemedText>
              {!IS_SMALL_SCREEN && (
                <MaterialCommunityIcons name="information-outline" size={14} color={totals.pnl >= 0 ? success as string : danger as string} style={{ opacity: 0.7, marginLeft: 4 }} />
              )}
            </View>
          </View>
          <Pressable 
            onPress={() => router.push('/portfolio')}
            style={{
              backgroundColor: success as string,
              paddingHorizontal: IS_SMALL_SCREEN ? 16 : 20,
              paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: IS_SMALL_SCREEN ? 8 : 0,
            }}
          >
            <MaterialCommunityIcons name="plus-circle" size={IS_SMALL_SCREEN ? 14 : 16} color="#fff" style={{ marginRight: IS_SMALL_SCREEN ? 4 : 6 }} />
            <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: IS_SMALL_SCREEN ? 13 : 14 }}>Ekle</ThemedText>
          </Pressable>
        </View>
      </Card>

      <View style={{ 
        flexDirection: 'row', 
        gap: IS_SMALL_SCREEN ? 8 : 12, 
        marginHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
        marginBottom: IS_SMALL_SCREEN ? 10 : 12 
      }}>
        <Pressable 
          onPress={() => router.push('/portfolio')}
          style={{ flex: 1 }}
        >
          <Card style={{ padding: IS_SMALL_SCREEN ? 12 : 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
              <MaterialCommunityIcons name="wallet-outline" size={IS_SMALL_SCREEN ? 14 : 16} color={muted as string} style={{ marginRight: 4 }} />
              <ThemedText style={{ opacity: 0.7, fontSize: IS_SMALL_SCREEN ? 11 : 12 }}>Yatırım</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText 
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontSize: IS_SMALL_SCREEN ? 16 : 18, fontWeight: '600' }}
              >
                {formatCurrency(totals.invested)}
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={IS_SMALL_SCREEN ? 18 : 20} color={text as string} style={{ opacity: 0.5 }} />
            </View>
          </Card>
        </Pressable>
        <Pressable 
          onPress={() => router.push('/portfolio')}
          style={{ flex: 1 }}
        >
          <Card style={{ padding: IS_SMALL_SCREEN ? 12 : 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
              <MaterialCommunityIcons name="chart-line" size={IS_SMALL_SCREEN ? 14 : 16} color={muted as string} style={{ marginRight: 4 }} />
              <ThemedText style={{ opacity: 0.7, fontSize: IS_SMALL_SCREEN ? 11 : 12 }}>Pozisyon</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontSize: IS_SMALL_SCREEN ? 16 : 18, fontWeight: '600' }}
                >
                  {formatCurrency(totals.current)}
                </ThemedText>
                <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, color: totals.pnl >= 0 ? success as string : danger as string }}>
                  {totals.pnl >= 0 ? '+' : ''}{totals.pnlPct.toFixed(2)}%
                </ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={IS_SMALL_SCREEN ? 18 : 20} color={text as string} style={{ opacity: 0.5 }} />
            </View>
          </Card>
        </Pressable>
      </View>

      {(topGainers.length > 0 || topLosers.length > 0) && !IS_SMALL_SCREEN && (
        <View style={{ 
          flexDirection: 'row', 
          gap: IS_SMALL_SCREEN ? 8 : 12, 
          marginHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
          marginBottom: IS_SMALL_SCREEN ? 10 : 12 
        }}>
          {topGainers.length > 0 && (
            <Card style={{ flex: 1, padding: IS_SMALL_SCREEN ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 6 : 8 }}>
                <MaterialCommunityIcons name="trending-up" size={IS_SMALL_SCREEN ? 14 : 16} color={success as string} style={{ marginRight: IS_SMALL_SCREEN ? 4 : 6 }} />
                <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 12 : 13, fontWeight: '600', color: success as string }}>En Çok Kazandıran</ThemedText>
              </View>
              {topGainers.map((coin, idx) => (
                <View key={coin.symbol} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx < topGainers.length - 1 ? 6 : 0 }}>
                  <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, flex: 1 }} numberOfLines={1}>
                    {coin.symbol.replace('USDT', '')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, fontWeight: '600', color: success as string }}>
                    +{coin.changePct.toFixed(2)}%
                  </ThemedText>
                </View>
              ))}
            </Card>
          )}
          {topLosers.length > 0 && (
            <Card style={{ flex: 1, padding: IS_SMALL_SCREEN ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 6 : 8 }}>
                <MaterialCommunityIcons name="trending-down" size={IS_SMALL_SCREEN ? 14 : 16} color={danger as string} style={{ marginRight: IS_SMALL_SCREEN ? 4 : 6 }} />
                <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 12 : 13, fontWeight: '600', color: danger as string }}>En Çok Kaybettiren</ThemedText>
              </View>
              {topLosers.map((coin, idx) => (
                <View key={coin.symbol} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx < topLosers.length - 1 ? 6 : 0 }}>
                  <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, flex: 1 }} numberOfLines={1}>
                    {coin.symbol.replace('USDT', '')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, fontWeight: '600', color: danger as string }}>
                    {coin.changePct.toFixed(2)}%
                  </ThemedText>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          gap: IS_SMALL_SCREEN ? 6 : 8, 
          paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16,
          paddingRight: IS_SMALL_SCREEN ? 12 : 16,
        }}
        style={{ marginBottom: IS_SMALL_SCREEN ? 10 : 12 }}
      >
        {(['favorites', 'hot', 'gainers', 'losers'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const favoritesCount = tab === 'favorites' ? favorites.size : 0;
          
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16,
                paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
                borderRadius: 20,
                backgroundColor: isActive ? (tint as string) : 'transparent',
                borderWidth: isActive ? 0 : 1,
                borderColor: border as string,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ThemedText 
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={{
                  fontSize: IS_SMALL_SCREEN ? 12 : 14,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#ffffff' : (text as string),
                }}>
                {tab === 'favorites' ? 'Favoriler' : tab === 'hot' ? 'Popüler' : tab === 'gainers' ? 'Yükselenler' : 'Düşenler'}
              </ThemedText>
              {tab === 'favorites' && favoritesCount > 0 && (
                <View style={{
                  marginLeft: IS_SMALL_SCREEN ? 4 : 6,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : (muted as string),
                  borderRadius: 10,
                  paddingHorizontal: IS_SMALL_SCREEN ? 5 : 6,
                  paddingVertical: 2,
                  minWidth: IS_SMALL_SCREEN ? 18 : 20,
                  alignItems: 'center',
                }}>
                  <ThemedText style={{
                    fontSize: IS_SMALL_SCREEN ? 9 : 10,
                    fontWeight: '600',
                    color: isActive ? '#ffffff' : (text as string),
                  }}>
                    {favoritesCount}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  ), [totals, success, danger, text, cardBg, border, activeTab, favorites.size, tint, muted, topGainers, topLosers, router, items]);

  const ListEmptyComponent = useMemo(() => {
    let icon = 'magnify';
    let title = 'Coin bulunamadı';
    let message = 'Henüz coin yüklenmedi.';
    
    if (activeTab === 'favorites' && favorites.size === 0) {
      icon = 'star-outline';
      title = 'Favori coin yok';
      message = 'Favorilerinize coin eklemek için yıldız simgesine tıklayın.';
    } else if (activeTab === 'gainers') {
      icon = 'trending-up';
      title = 'Yükselen coin yok';
      message = 'Şu anda yükselen coin bulunmuyor.';
    } else if (activeTab === 'losers') {
      icon = 'trending-down';
      title = 'Düşen coin yok';
      message = 'Şu anda düşen coin bulunmuyor.';
    }
    
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200, paddingHorizontal: 32 }}>
        <MaterialCommunityIcons name={icon as any} size={64} color={muted as string} style={{ opacity: 0.3, marginBottom: 16 }} />
        <ThemedText style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
          {title}
        </ThemedText>
        <ThemedText style={{ fontSize: 14, opacity: 0.6, textAlign: 'center' }}>
          {message}
        </ThemedText>
      </View>
    );
  }, [muted, activeTab, favorites.size]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={{ flex: 1 }} safe edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={tint as string} />
          <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>Yükleniyor...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <FlatList
        data={filteredCoins}
        renderItem={renderCoinItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ 
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tint as string}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </ThemedView>
  );
}
