import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FlatList, ScrollView, View, Pressable, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Platform } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Card } from '@/components/ui/card';
import { fetch24hTickersUSDT, fetchAllUSDTPrices, fetchKlines } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { CoinAvatar } from '@/components/ui/coin-avatar';
import { Sparkline } from '@/components/charts/sparkline';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTER_TABS = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'TRY'] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

type TabType = 'all' | 'hot' | 'gainers' | 'losers' | 'favorites';
type SortType = 'volume' | 'price' | 'change';
type SortDirection = 'asc' | 'desc';

function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0.00';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

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
}, (prevProps, nextProps) => {
  if (prevProps.item.symbol !== nextProps.item.symbol) return false;
  if (prevProps.item.price !== nextProps.item.price) return false;
  if (prevProps.item.changePct !== nextProps.item.changePct) return false;
  if (prevProps.item.volumeQ !== nextProps.item.volumeQ) return false;
  if (prevProps.favorites.has(prevProps.item.symbol) !== nextProps.favorites.has(nextProps.item.symbol)) return false;
  if (prevProps.sparklines[prevProps.item.symbol] !== nextProps.sparklines[nextProps.item.symbol]) return false;
  if (prevProps.activeFilter !== nextProps.activeFilter) return false;
  if (prevProps.success !== nextProps.success) return false;
  if (prevProps.danger !== nextProps.danger) return false;
  if (prevProps.cardBg !== nextProps.cardBg) return false;
  if (prevProps.text !== nextProps.text) return false;
  if (prevProps.muted !== nextProps.muted) return false;
  return true;
});

CoinRowItem.displayName = 'CoinRowItem';

export default function MarketsScreen() {
  const [tickers, setTickers] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sparklines, setSparklines] = useState<Record<string, { x: number; y: number }[]>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('USDT');
  const [activeTab, setActiveTab] = useState<TabType>('hot');
  const [sortType, setSortType] = useState<SortType>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTickers = useCallback(async () => {
    try {
      const data = await fetch24hTickersUSDT();
      if (data && typeof data === 'object') {
        setTickers(data);
        setLastUpdateTime(new Date());
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

  const list = useMemo(() => {
    if (!tickers) return [];
    try {
      let filtered = Object.entries(tickers)
        .map(([symbol, v]) => {
          if (!symbol || !v) return null;
          return { symbol, ...v };
        })
        .filter((c): c is CoinItem => c !== null)
        .filter((c) => {
          if (!c.symbol || !activeFilter) return false;
          const base = c.symbol.replace(activeFilter, '');
          return c.symbol.endsWith(activeFilter) && base.length > 0;
        })
        .filter((c) => {
          if (!debouncedSearchQuery.trim()) return true;
          const searchQueryLower = debouncedSearchQuery.toLowerCase().trim();
          const coinName = c.symbol.replace(activeFilter, '').toLowerCase();
          const fullSymbol = c.symbol.toLowerCase();
          return coinName.includes(searchQueryLower) || fullSymbol.includes(searchQueryLower);
        });

      if (activeTab === 'gainers') {
        filtered = filtered.filter((c) => c.changePct > 0);
      } else if (activeTab === 'losers') {
        filtered = filtered.filter((c) => c.changePct < 0);
      } else if (activeTab === 'favorites') {
        const favOnly = filtered.filter((c) => favorites.has(c.symbol));
        filtered = favOnly.length > 0 ? favOnly : filtered;
      }

      const sorted = [...filtered].sort((a, b) => {
        let aVal = 0;
        let bVal = 0;
        
        if (sortType === 'volume') {
          aVal = a.volumeQ ?? 0;
          bVal = b.volumeQ ?? 0;
        } else if (sortType === 'price') {
          aVal = a.price ?? 0;
          bVal = b.price ?? 0;
        } else if (sortType === 'change') {
          aVal = a.changePct ?? 0;
          bVal = b.changePct ?? 0;
        }
        
        if (sortDirection === 'asc') {
          return aVal - bVal;
        }
        return bVal - aVal;
      });

      return sorted;
    } catch (error) {
      console.warn('Error processing list:', error);
      return [];
    }
  }, [tickers, activeFilter, debouncedSearchQuery, activeTab, sortType, sortDirection, favorites]);

  const marketStats = useMemo(() => {
    if (!list || list.length === 0) {
      return { totalVolume: 0, avgChange: 0, gainers: 0, losers: 0 };
    }
    const totalVolume = list.reduce((sum, c) => sum + (c.volumeQ ?? 0), 0);
    const avgChange = list.reduce((sum, c) => sum + (c.changePct ?? 0), 0) / list.length;
    const gainers = list.filter((c) => c.changePct > 0).length;
    const losers = list.filter((c) => c.changePct < 0).length;
    return {
      totalVolume,
      avgChange,
      gainers,
      losers,
    };
  }, [list]);

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
        activeFilter={activeFilter}
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
  }, [activeFilter, favorites, sparklines, toggleFavorite, success, danger, cardBg, text, muted]);

  const keyExtractor = useCallback((item: CoinItem) => item.symbol, []);

  const ListHeaderComponent = useMemo(() => (
    <>
      <View style={{ 
        paddingHorizontal: 0, 
        paddingTop: IS_SMALL_SCREEN ? 12 : 16, 
        paddingBottom: IS_SMALL_SCREEN ? 8 : 10 
      }}>
        <View style={{ marginBottom: IS_SMALL_SCREEN ? 16 : 20 }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: IS_SMALL_SCREEN ? 14 : 16 
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: IS_SMALL_SCREEN ? 8 : 10, marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
                <ThemedText type="title" style={{ 
                  fontSize: IS_SMALL_SCREEN ? 24 : IS_MEDIUM_SCREEN ? 26 : 28, 
                  fontWeight: 'bold' 
                }}>
                  Piyasalar
                </ThemedText>
                {!loading && list.length > 0 && (
                  <View style={{ 
                    backgroundColor: tint as string, 
                    paddingHorizontal: IS_SMALL_SCREEN ? 8 : 10, 
                    paddingVertical: IS_SMALL_SCREEN ? 4 : 5, 
                    borderRadius: 12,
                  }}>
                    <ThemedText style={{ 
                      fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                      fontWeight: '600', 
                      color: '#ffffff'
                    }}>
                      {list.length}
                    </ThemedText>
                  </View>
                )}
              </View>
              {!loading && lastUpdateTime && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons 
                    name="clock-outline" 
                    size={IS_SMALL_SCREEN ? 12 : 13} 
                    color={muted as string} 
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText style={{ 
                    fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                    opacity: 0.6,
                  }}>
                    {lastUpdateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                if (sortType === 'volume') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortType('volume');
                  setSortDirection('desc');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: IS_SMALL_SCREEN ? 12 : 14,
                paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
                borderRadius: 12,
                backgroundColor: sortType === 'volume' ? (tint as string) : (cardBg as string),
                borderWidth: sortType === 'volume' ? 0 : 1,
                borderColor: border as string,
              }}
            >
              <MaterialCommunityIcons 
                name="sort" 
                size={IS_SMALL_SCREEN ? 16 : 18} 
                color={sortType === 'volume' ? '#ffffff' : (text as string)} 
                style={{ marginRight: IS_SMALL_SCREEN ? 4 : 6 }}
              />
              {sortType === 'volume' && (
                <MaterialCommunityIcons 
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} 
                  size={IS_SMALL_SCREEN ? 14 : 16} 
                  color="#ffffff" 
                />
              )}
            </Pressable>
          </View>

          <Card style={{
            paddingHorizontal: IS_SMALL_SCREEN ? 12 : 14,
            paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <MaterialCommunityIcons 
                name="magnify" 
                size={IS_SMALL_SCREEN ? 20 : 22} 
                color={muted as string} 
                style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12 }} 
              />
              <TextInput
                placeholder="Coin ara..."
                placeholderTextColor={muted as string}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  color: text as string,
                  fontSize: IS_SMALL_SCREEN ? 14 : 15,
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={{ marginLeft: IS_SMALL_SCREEN ? 8 : 10 }}
                >
                  <MaterialCommunityIcons 
                    name="close-circle" 
                    size={IS_SMALL_SCREEN ? 20 : 22} 
                    color={muted as string} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </View>

        <View style={{ marginBottom: IS_SMALL_SCREEN ? 14 : 16 }}>
          <ThemedText style={{ 
            fontSize: IS_SMALL_SCREEN ? 12 : 13, 
            opacity: 0.7, 
            marginBottom: IS_SMALL_SCREEN ? 8 : 10,
            fontWeight: '600',
          }}>
            Çift Para Birimi
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              gap: IS_SMALL_SCREEN ? 8 : 10,
              paddingHorizontal: 0,
            }}
          >
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={{
                  paddingHorizontal: IS_SMALL_SCREEN ? 14 : 18,
                  paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
                  borderRadius: 12,
                  backgroundColor: activeFilter === tab ? (tint as string) : (cardBg as string),
                  borderWidth: activeFilter === tab ? 0 : 1,
                  borderColor: border as string,
                }}
              >
                <ThemedText style={{
                  fontSize: IS_SMALL_SCREEN ? 13 : 14,
                  fontWeight: activeFilter === tab ? '600' : '500',
                  color: activeFilter === tab ? '#ffffff' : (text as string),
                }}>
                  {tab}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
          <ThemedText style={{ 
            fontSize: IS_SMALL_SCREEN ? 12 : 13, 
            opacity: 0.7, 
            marginBottom: IS_SMALL_SCREEN ? 8 : 10,
            fontWeight: '600',
          }}>
            Kategoriler
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              gap: IS_SMALL_SCREEN ? 8 : 10,
              paddingHorizontal: 0,
            }}
          >
            {(['hot', 'favorites', 'gainers', 'losers'] as TabType[]).map((tab) => {
              const isActive = activeTab === tab;
              const favoritesCount = tab === 'favorites' ? favorites.size : 0;
              
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingHorizontal: IS_SMALL_SCREEN ? 14 : 18,
                    paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
                    borderRadius: 12,
                    backgroundColor: isActive ? (tint as string) : (cardBg as string),
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
                      fontSize: IS_SMALL_SCREEN ? 13 : 14,
                      fontWeight: isActive ? '600' : '500',
                      color: isActive ? '#ffffff' : (text as string),
                    }}>
                    {tab === 'hot'
                      ? 'Popüler'
                      : tab === 'favorites'
                      ? 'Favoriler'
                      : tab === 'gainers'
                      ? 'Yükselenler'
                      : 'Düşenler'}
                  </ThemedText>
                  {tab === 'favorites' && favoritesCount > 0 && (
                    <View style={{
                      marginLeft: IS_SMALL_SCREEN ? 6 : 8,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : (muted as string),
                      borderRadius: 10,
                      paddingHorizontal: IS_SMALL_SCREEN ? 6 : 7,
                      paddingVertical: 2,
                      minWidth: IS_SMALL_SCREEN ? 20 : 22,
                      alignItems: 'center',
                    }}>
                      <ThemedText style={{
                        fontSize: IS_SMALL_SCREEN ? 10 : 11,
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
        </View>

        {list.length > 0 && (
          <View style={{ 
            flexDirection: 'row', 
            gap: IS_SMALL_SCREEN ? 8 : 10,
            marginTop: IS_SMALL_SCREEN ? 12 : 16,
            marginBottom: IS_SMALL_SCREEN ? 12 : 16,
          }}>
            <Card style={{ flex: 1, padding: IS_SMALL_SCREEN ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
                <MaterialCommunityIcons 
                  name="chart-line" 
                  size={IS_SMALL_SCREEN ? 14 : 16} 
                  color={muted as string} 
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 10 : 11, 
                  opacity: 0.6,
                }}>
                  Ort. Değişim
                </ThemedText>
              </View>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 14 : 16, 
                fontWeight: '600',
                color: marketStats.avgChange >= 0 ? success as string : danger as string,
              }}>
                {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
              </ThemedText>
            </Card>
            <Card style={{ flex: 1, padding: IS_SMALL_SCREEN ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
                <MaterialCommunityIcons 
                  name="trending-up" 
                  size={IS_SMALL_SCREEN ? 14 : 16} 
                  color={success as string} 
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 10 : 11, 
                  opacity: 0.6,
                }}>
                  Yükselenler
                </ThemedText>
              </View>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 14 : 16, 
                fontWeight: '600', 
                color: success as string 
              }}>
                {marketStats.gainers}
              </ThemedText>
            </Card>
            <Card style={{ flex: 1, padding: IS_SMALL_SCREEN ? 12 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 4 : 6 }}>
                <MaterialCommunityIcons 
                  name="trending-down" 
                  size={IS_SMALL_SCREEN ? 14 : 16} 
                  color={danger as string} 
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 10 : 11, 
                  opacity: 0.6,
                }}>
                  Düşenler
                </ThemedText>
              </View>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 14 : 16, 
                fontWeight: '600', 
                color: danger as string 
              }}>
                {marketStats.losers}
              </ThemedText>
            </Card>
          </View>
        )}
                  </View>
    </>
  ), [loading, list.length, cardBg, border, muted, text, tint, activeFilter, activeTab, sortType, sortDirection, searchQuery, lastUpdateTime, marketStats, success, danger]);

  const ListEmptyComponent = useMemo(() => {
    let icon = 'magnify';
    let title = 'Coin bulunamadı';
    let message = searchQuery ? 'Arama kriterlerinize uygun coin bulunamadı.' : 'Henüz coin yüklenmedi.';
    
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
      <View style={{ 
        flex: 1, 
        alignItems: 'flex-start', 
        justifyContent: 'center', 
        minHeight: IS_SMALL_SCREEN ? 150 : 200, 
        paddingHorizontal: IS_SMALL_SCREEN ? 24 : 32 
      }}>
        <MaterialCommunityIcons 
          name={icon as any} 
          size={IS_SMALL_SCREEN ? 48 : 64} 
          color={muted as string} 
          style={{ opacity: 0.3, marginBottom: IS_SMALL_SCREEN ? 12 : 16, alignSelf: 'flex-start' }} 
        />
        <ThemedText style={{ 
          fontSize: IS_SMALL_SCREEN ? 16 : 18, 
          fontWeight: '600', 
          marginBottom: IS_SMALL_SCREEN ? 6 : 8, 
          textAlign: 'left' 
        }}>
          {title}
        </ThemedText>
        <ThemedText style={{ 
          fontSize: IS_SMALL_SCREEN ? 13 : 14, 
          opacity: 0.6, 
          textAlign: 'left' 
        }}>
          {message}
        </ThemedText>
      </View>
    );
  }, [searchQuery, muted, activeTab, favorites.size]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={{ flex: 1 }} safe edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={tint as string} />
          <ThemedText style={{ 
            marginTop: IS_SMALL_SCREEN ? 10 : 12, 
            opacity: 0.6,
            fontSize: IS_SMALL_SCREEN ? 13 : 14,
          }}>
            Yükleniyor...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <FlatList
        data={list}
        renderItem={renderCoinItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ 
          paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
          paddingBottom: 100
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
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={100}
        initialNumToRender={10}
        windowSize={5}
      />
    </ThemedView>
  );
}

