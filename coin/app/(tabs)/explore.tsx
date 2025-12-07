import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FlatList, ScrollView, View, Pressable, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetch24hTickersUSDT, fetchAllUSDTPrices, fetchKlines } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { CoinAvatar } from '@/components/coin-avatar';
import { Sparkline } from '@/components/sparkline';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTER_TABS = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB', 'TRY'] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

type TabType = 'all' | 'gainers' | 'losers' | 'favorites';
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
        paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
        backgroundColor: cardBg,
        borderRadius: 12,
        marginBottom: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.symbol);
            }}
            style={{ marginRight: IS_SMALL_SCREEN ? 6 : 8 }}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'star' : 'star-outline'}
              size={IS_SMALL_SCREEN ? 16 : 18}
              color={isFavorite ? '#FFD700' : text}
              style={{ opacity: isFavorite ? 1 : 0.5 }}
            />
          </TouchableOpacity>
          <CoinAvatar symbol={item.symbol} size={IS_SMALL_SCREEN ? 28 : 32} />
          <View style={{ marginLeft: IS_SMALL_SCREEN ? 6 : 8, flex: 1 }}>
            <ThemedText 
              numberOfLines={1}
              style={{ fontWeight: '600', fontSize: IS_SMALL_SCREEN ? 13 : 15 }}>
              {coinName || item.symbol}
            </ThemedText>
          </View>
        </View>

        <View style={{ 
          alignItems: 'flex-end', 
          marginRight: IS_SMALL_SCREEN ? 8 : 12, 
          width: IS_SMALL_SCREEN ? 75 : IS_MEDIUM_SCREEN ? 85 : 90,
          minWidth: IS_SMALL_SCREEN ? 75 : 85,
        }}>
          <ThemedText style={{ 
            fontWeight: '600', 
            fontSize: IS_SMALL_SCREEN ? 12 : 14, 
            marginBottom: IS_SMALL_SCREEN ? 1 : 2 
          }}>
            {price > 0 ? price.toFixed(price < 1 ? 6 : price < 10 ? 4 : 2) : '0.00'}
          </ThemedText>
          {sparklineData.length > 0 && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Sparkline
                data={sparklineData}
                width={IS_SMALL_SCREEN ? 60 : 70}
                height={IS_SMALL_SCREEN ? 16 : 18}
                autoColor={true}
                showGradient={true}
              />
            </View>
          )}
          {item.volumeQ && item.volumeQ > 0 && !IS_SMALL_SCREEN && (
            <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 9 : 10, opacity: 0.5 }}>
              Vol: {formatCurrency(item.volumeQ)}
            </ThemedText>
          )}
        </View>

        <View style={{ 
          alignItems: 'flex-end', 
          width: IS_SMALL_SCREEN ? 70 : 80,
          minWidth: IS_SMALL_SCREEN ? 70 : 80,
        }}>
          <ThemedText style={{
            fontSize: IS_SMALL_SCREEN ? 12 : 14,
            fontWeight: '600',
            color: isPositive ? success : danger,
          }}>
            {isPositive ? '+' : ''}{changePct.toFixed(2)}%
          </ThemedText>
        </View>
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
  const [activeTab, setActiveTab] = useState<TabType>('all');
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
        filtered = filtered.filter((c) => favorites.has(c.symbol));
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
        paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
        paddingTop: IS_SMALL_SCREEN ? 10 : 12, 
        paddingBottom: IS_SMALL_SCREEN ? 6 : 8 
      }}>
        <View style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: IS_SMALL_SCREEN ? 10 : 12 
          }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: IS_SMALL_SCREEN ? 6 : 8, flexWrap: 'wrap' }}>
                <ThemedText type="title" style={{ 
                  fontSize: IS_SMALL_SCREEN ? 20 : IS_MEDIUM_SCREEN ? 22 : 24, 
                  fontWeight: 'bold' 
                }}>
                  Piyasalar
                </ThemedText>
                {!loading && list.length > 0 && (
                  <View style={{ 
                    backgroundColor: cardBg as string, 
                    paddingHorizontal: IS_SMALL_SCREEN ? 6 : 8, 
                    paddingVertical: IS_SMALL_SCREEN ? 3 : 4, 
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: border as string,
                  }}>
                    <ThemedText style={{ 
                      fontSize: IS_SMALL_SCREEN ? 10 : 11, 
                      fontWeight: '600', 
                      color: tint as string 
                    }}>
                      {list.length}
                    </ThemedText>
                  </View>
                )}
              </View>
              {!loading && lastUpdateTime && !IS_SMALL_SCREEN && (
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 10 : 11, 
                  opacity: 0.5, 
                  marginTop: IS_SMALL_SCREEN ? 3 : 4 
                }}>
                  Son güncelleme: {lastUpdateTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
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
                paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                paddingVertical: IS_SMALL_SCREEN ? 5 : 6,
                borderRadius: 8,
                backgroundColor: sortType === 'volume' ? (cardBg as string) : 'transparent',
                borderWidth: 1,
                borderColor: border as string,
              }}
            >
              <MaterialCommunityIcons 
                name="sort" 
                size={IS_SMALL_SCREEN ? 14 : 16} 
                color={sortType === 'volume' ? (tint as string) : (text as string)} 
                style={{ marginRight: IS_SMALL_SCREEN ? 3 : 4 }}
              />
              {sortType === 'volume' && (
                <MaterialCommunityIcons 
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} 
                  size={IS_SMALL_SCREEN ? 12 : 14} 
                  color={tint as string} 
                />
              )}
            </Pressable>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg as string,
            borderWidth: 1,
            borderColor: border as string,
            borderRadius: 12,
            paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
            height: IS_SMALL_SCREEN ? 40 : 44,
          }}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={IS_SMALL_SCREEN ? 18 : 20} 
              color={muted as string} 
              style={{ marginRight: IS_SMALL_SCREEN ? 6 : 8 }} 
            />
            <TextInput
              placeholder="Coin ara (BTC, ETH, vb.)"
              placeholderTextColor={muted as string}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                color: text as string,
                fontSize: IS_SMALL_SCREEN ? 13 : 14,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{ marginLeft: IS_SMALL_SCREEN ? 6 : 8 }}
              >
                <MaterialCommunityIcons 
                  name="close-circle" 
                  size={IS_SMALL_SCREEN ? 18 : 20} 
                  color={muted as string} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            gap: IS_SMALL_SCREEN ? 6 : 8, 
            paddingRight: IS_SMALL_SCREEN ? 12 : 16,
            alignItems: 'flex-start',
          }}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={{
                paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16,
                paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
                borderRadius: 20,
                backgroundColor: activeFilter === tab ? (tint as string) : 'transparent',
                borderWidth: activeFilter === tab ? 0 : 1,
                borderColor: border as string,
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}
            >
              <ThemedText style={{
                fontSize: IS_SMALL_SCREEN ? 12 : 14,
                fontWeight: activeFilter === tab ? '600' : '400',
                color: activeFilter === tab ? '#ffffff' : (text as string),
                textAlign: 'left',
              }}>
                {tab}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ 
          flexDirection: 'row', 
          gap: IS_SMALL_SCREEN ? 4 : 6, 
          marginTop: IS_SMALL_SCREEN ? 12 : 16, 
          marginBottom: IS_SMALL_SCREEN ? 6 : 8 
        }}>
          {(['all', 'gainers', 'losers', 'favorites'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const favoritesCount = tab === 'favorites' ? favorites.size : 0;
            
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
                  paddingHorizontal: IS_SMALL_SCREEN ? 4 : 6,
                  borderRadius: 12,
                  backgroundColor: isActive ? (cardBg as string) : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: border as string,
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  minHeight: IS_SMALL_SCREEN ? 36 : 40,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
                  <ThemedText 
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={{
                      fontSize: IS_SMALL_SCREEN ? 11 : 12,
                      fontWeight: isActive ? '600' : '400',
                      textAlign: 'left',
                    }}>
                    {tab === 'all' ? 'Tümü' : tab === 'gainers' ? 'Yükselenler' : tab === 'losers' ? 'Düşenler' : 'Favoriler'}
                  </ThemedText>
                  {tab === 'favorites' && favoritesCount > 0 && (
                    <View style={{
                      marginLeft: IS_SMALL_SCREEN ? 3 : 4,
                      backgroundColor: isActive ? (tint as string) : (muted as string),
                      borderRadius: 8,
                      paddingHorizontal: IS_SMALL_SCREEN ? 3 : 4,
                      paddingVertical: 1,
                      minWidth: IS_SMALL_SCREEN ? 16 : 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ThemedText style={{
                        fontSize: IS_SMALL_SCREEN ? 8 : 9,
                        fontWeight: '600',
                        color: isActive ? '#ffffff' : (text as string),
                      }}>
                        {favoritesCount}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {list.length > 0 && !IS_SMALL_SCREEN && (
          <View style={{ 
            flexDirection: 'row', 
            gap: IS_SMALL_SCREEN ? 6 : 8,
            marginTop: IS_SMALL_SCREEN ? 10 : 12,
            marginBottom: IS_SMALL_SCREEN ? 6 : 8,
            paddingHorizontal: IS_SMALL_SCREEN ? 8 : 12,
          }}>
            <View style={{ 
              flex: 1, 
              backgroundColor: cardBg as string, 
              padding: IS_SMALL_SCREEN ? 8 : 10, 
              borderRadius: IS_SMALL_SCREEN ? 8 : 10, 
              borderWidth: 1, 
              borderColor: border as string 
            }}>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 9 : 10, 
                opacity: 0.6, 
                marginBottom: IS_SMALL_SCREEN ? 3 : 4 
              }}>
                Ort. Değişim
              </ThemedText>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 12 : 14, 
                fontWeight: '600',
                color: marketStats.avgChange >= 0 ? success as string : danger as string,
              }}>
                {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
              </ThemedText>
            </View>
            <View style={{ 
              flex: 1, 
              backgroundColor: cardBg as string, 
              padding: IS_SMALL_SCREEN ? 8 : 10, 
              borderRadius: IS_SMALL_SCREEN ? 8 : 10, 
              borderWidth: 1, 
              borderColor: border as string 
            }}>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 9 : 10, 
                opacity: 0.6, 
                marginBottom: IS_SMALL_SCREEN ? 3 : 4 
              }}>
                Yükselenler
              </ThemedText>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 12 : 14, 
                fontWeight: '600', 
                color: success as string 
              }}>
                {marketStats.gainers}
              </ThemedText>
            </View>
            <View style={{ 
              flex: 1, 
              backgroundColor: cardBg as string, 
              padding: IS_SMALL_SCREEN ? 8 : 10, 
              borderRadius: IS_SMALL_SCREEN ? 8 : 10, 
              borderWidth: 1, 
              borderColor: border as string 
            }}>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 9 : 10, 
                opacity: 0.6, 
                marginBottom: IS_SMALL_SCREEN ? 3 : 4 
              }}>
                Düşenler
              </ThemedText>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 12 : 14, 
                fontWeight: '600', 
                color: danger as string 
              }}>
                {marketStats.losers}
              </ThemedText>
            </View>
          </View>
        )}

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
          paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
          marginTop: IS_SMALL_SCREEN ? 6 : 8,
        }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: IS_SMALL_SCREEN ? 16 : 18, marginRight: IS_SMALL_SCREEN ? 6 : 8 }} />
            <View style={{ width: IS_SMALL_SCREEN ? 28 : 32, marginRight: IS_SMALL_SCREEN ? 6 : 8 }} />
            <ThemedText style={{ 
              fontSize: IS_SMALL_SCREEN ? 11 : 12, 
              opacity: 0.6,
              textAlign: 'left',
            }}>
              Coin
            </ThemedText>
          </View>
          <Pressable
            onPress={() => {
              if (sortType === 'price') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortType('price');
                setSortDirection('desc');
              }
            }}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              width: IS_SMALL_SCREEN ? 75 : IS_MEDIUM_SCREEN ? 85 : 90, 
              marginRight: IS_SMALL_SCREEN ? 8 : 12, 
              justifyContent: 'flex-start' 
            }}
          >
            <ThemedText style={{ 
              fontSize: IS_SMALL_SCREEN ? 11 : 12, 
              opacity: 0.6, 
              marginRight: IS_SMALL_SCREEN ? 3 : 4,
              textAlign: 'left',
            }}>
              Fiyat
            </ThemedText>
            {sortType === 'price' && (
              <MaterialCommunityIcons 
                name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={IS_SMALL_SCREEN ? 12 : 14} 
                color={tint as string} 
              />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              if (sortType === 'change') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortType('change');
                setSortDirection('desc');
              }
            }}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              width: IS_SMALL_SCREEN ? 70 : 80, 
              justifyContent: 'flex-start' 
            }}
          >
            <ThemedText style={{ 
              fontSize: IS_SMALL_SCREEN ? 11 : 12, 
              opacity: 0.6, 
              marginRight: IS_SMALL_SCREEN ? 3 : 4,
              textAlign: 'left',
            }}>
              Değişim
            </ThemedText>
            {sortType === 'change' && (
              <MaterialCommunityIcons 
                name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={IS_SMALL_SCREEN ? 12 : 14} 
                color={tint as string} 
              />
            )}
          </Pressable>
        </View>
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
          paddingBottom: IS_SMALL_SCREEN ? 12 : 16 
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

