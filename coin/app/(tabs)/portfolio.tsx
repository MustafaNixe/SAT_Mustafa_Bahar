import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Link } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetchAllUSDTPrices, fetchKlines, fetch24hTickersUSDT } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { CoinAvatar } from '@/components/ui/coin-avatar';
import { SimpleChart } from '@/components/charts/simple-chart';
import { PortfolioChart } from '@/components/charts/portfolio-chart';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type TimePeriod = '24H' | '1W' | '1M' | '1Y' | 'MAX';

export default function PortfolioScreen() {
  const items = usePortfolioStore((s) => s.items);
  const addOrUpdate = usePortfolioStore((s) => s.addOrUpdate);
  const remove = usePortfolioStore((s) => s.remove);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [draft, setDraft] = useState({ symbol: '', amount: '', buy: '' });
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1W');
  const [chartData, setChartData] = useState<{ x: number; y: number; date?: string; isInvestment?: boolean }[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [selectedCoinSymbol, setSelectedCoinSymbol] = useState<string | null>(null);
  const [availableCoins, setAvailableCoins] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [loadingCoins, setLoadingCoins] = useState(false);

  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const cardBg = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const map = await fetchAllUSDTPrices();
        if (!active) return;
        setPrices(map);
      } catch (e) {
        console.error('Error fetching prices:', e);
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

  // Load portfolio chart data - Optimized algorithm (only recalculate when items or timePeriod changes)
  useEffect(() => {
    if (items.length === 0) {
      setChartData([]);
      return;
    }
    let active = true;
    setLoadingChart(true);
    (async () => {
      try {
        const intervalMap: Record<TimePeriod, { interval: '1h' | '4h' | '1d' | '1w'; limit: number }> = {
          '24H': { interval: '1h', limit: 24 },
          '1W': { interval: '1d', limit: 7 },
          '1M': { interval: '1d', limit: 30 },
          '1Y': { interval: '1w', limit: 52 },
          'MAX': { interval: '1w', limit: 104 },
        };
        const params = intervalMap[timePeriod];
        const points: { x: number; y: number; date?: string; isInvestment?: boolean }[] = [];
        
        // Get unique symbols to fetch klines in parallel
        const uniqueSymbols = Array.from(new Set(items.map(item => item.symbol)));
        
        // Fetch all klines in parallel for better performance
        const klinesMap: Record<string, any[]> = {};
        await Promise.all(
          uniqueSymbols.map(async (symbol) => {
            try {
              const klines = await fetchKlines(symbol, params.interval, params.limit);
              if (active) {
                klinesMap[symbol] = klines;
              }
            } catch (err) {
              console.warn(`Failed to fetch klines for ${symbol}:`, err);
              klinesMap[symbol] = [];
            }
          })
        );
        
        if (!active) return;
        
        // Calculate portfolio value for each historical point
        // This shows how portfolio value changes over time
        // When money is added, portfolio value increases, graph goes up
        // When in profit (current > invested), graph is green
        // When in loss (current < invested), graph is red
        for (let i = 0; i < params.limit; i++) {
          let totalValue = 0;
          
          // For each coin in portfolio, calculate value at this time point
          for (const item of items) {
            const klines = klinesMap[item.symbol];
            if (klines && klines.length > 0) {
              // Get price at this historical point
              // i=0 is most recent, i=limit-1 is oldest
              const historicalIndex = klines.length - 1 - i;
              if (historicalIndex >= 0 && historicalIndex < klines.length) {
                const historicalPrice = Number(klines[historicalIndex]?.close) || 0;
                if (historicalPrice > 0) {
                  // Portfolio value = amount * price at that time
                  // This naturally increases when coins are added
                  totalValue += item.amount * historicalPrice;
                }
              }
            }
          }
          
          // If we have a valid value, add it to points
          // Portfolio value includes all investments, so adding money increases the graph
          if (totalValue > 0) {
            // Format date for display (optional)
            const date = new Date();
            date.setDate(date.getDate() - (params.limit - 1 - i));
            const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            
            points.push({ 
              x: i, 
              y: totalValue,
              date: dateStr,
              isInvestment: false // Will be set based on portfolio changes
            });
          }
        }
        
        // Sort points by x (time) - oldest to newest
        points.sort((a, b) => a.x - b.x);
        
        if (!active) return;
        setChartData(points);
      } catch (err) {
        console.error('Error loading chart:', err);
        if (active) {
          setChartData([]);
        }
      } finally {
        if (active) {
          setLoadingChart(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [items, timePeriod]); // Removed 'prices' from dependencies to prevent constant recalculation

  // Track last portfolio value to prevent unnecessary updates
  const lastPortfolioValueRef = useRef<number>(0);
  // Track previous items count to detect when money is added
  const previousItemsCountRef = useRef<number>(0);
  
  // Update only the last point with current portfolio value (separate effect for real-time updates)
  useEffect(() => {
    if (chartData.length === 0 || items.length === 0) return;
    
    // Calculate current portfolio value (always includes all investments)
    const currentPortfolioValue = items.reduce((sum, item) => {
      const currentPrice = prices[item.symbol] || 0;
      // Use current price if available, otherwise use invested value
      if (currentPrice > 0) {
        return sum + (item.amount * currentPrice);
      } else {
        // If price not available, use invested value so graph shows investment
        return sum + (item.amount * item.avgBuyPrice);
      }
    }, 0);
    
    // Check if new coin was added (investment event)
    const isNewInvestment = items.length > previousItemsCountRef.current;
    if (isNewInvestment) {
      previousItemsCountRef.current = items.length;
    }
    
    // Only update if value changed significantly (more than 0.01 to prevent micro-updates)
    if (currentPortfolioValue > 0 && Math.abs(lastPortfolioValueRef.current - currentPortfolioValue) > 0.01) {
      lastPortfolioValueRef.current = currentPortfolioValue;
      
      setChartData((prevData) => {
        if (prevData.length === 0) return prevData;
        
        // Create new array to avoid mutation
        const newData = [...prevData];
        const lastIndex = newData.length - 1;
        
        if (lastIndex >= 0) {
          newData[lastIndex] = { 
            ...newData[lastIndex], 
            y: currentPortfolioValue,
            isInvestment: isNewInvestment // Mark as investment if new coin added
          };
          return newData;
        }
        
        return prevData;
      });
    } else if (isNewInvestment) {
      // Even if value didn't change much, update investment flag
      previousItemsCountRef.current = items.length;
    }
  }, [prices, items]); // Removed chartData.length to prevent loop

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    
    for (const item of items) {
      const investedValue = item.amount * item.avgBuyPrice;
      invested += investedValue;
      
      const currentPrice = prices[item.symbol] ?? 0;
      const currentValue = item.amount * currentPrice;
      current += currentValue;
    }
    
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    
    return { 
      invested: isFinite(invested) ? invested : 0, 
      current: isFinite(current) ? current : 0, 
      pnl: isFinite(pnl) ? pnl : 0, 
      pnlPct: isFinite(pnlPct) ? pnlPct : 0 
    };
  }, [items, prices]);

  const holdings = useMemo(() => {
    return items.map((item) => {
      const currentPrice = prices[item.symbol] ?? 0;
      const investedValue = item.amount * item.avgBuyPrice;
      const currentValue = item.amount * currentPrice;
      const pnl = currentValue - investedValue;
      const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      
      return {
        ...item,
        currentPrice,
        investedValue: isFinite(investedValue) ? investedValue : 0,
        currentValue: isFinite(currentValue) ? currentValue : 0,
        pnl: isFinite(pnl) ? pnl : 0,
        pnlPct: isFinite(pnlPct) ? pnlPct : 0,
      };
    }).sort((a, b) => b.currentValue - a.currentValue);
  }, [items, prices]);

  const getColorForSymbol = useCallback((symbol: string) => {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 68%, 55%)`;
  }, []);

  const distribution = useMemo(() => {
    if (!holdings.length || totals.current <= 0) return [];
    return holdings
      .map((h) => ({
        symbol: h.symbol,
        name: h.symbol.replace('USDT', ''),
        value: h.currentValue,
        percent: (h.currentValue / totals.current) * 100,
        color: getColorForSymbol(h.symbol),
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totals.current, getColorForSymbol]);

  const periodSummary = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const first = chartData[0]?.y ?? 0;
    const last = chartData[chartData.length - 1]?.y ?? 0;
    if (first <= 0 || last <= 0) return null;
    const change = last - first;
    const changePct = (change / first) * 100;
    return { change, changePct };
  }, [chartData]);

  // Load available coins when modal opens
  useEffect(() => {
    if (!showAddModal) return;
    let active = true;
    setLoadingCoins(true);
    (async () => {
      try {
        const data = await fetch24hTickersUSDT();
        if (!active) return;
        setAvailableCoins(data);
      } catch (err) {
        console.error('Error loading coins:', err);
        setAvailableCoins({});
      } finally {
        if (active) {
          setLoadingCoins(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [showAddModal]);

  const filteredCoins = useMemo(() => {
    if (!coinSearchQuery.trim()) {
      return Object.entries(availableCoins)
        .map(([symbol, v]) => ({ symbol, ...v }))
        .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0))
        .slice(0, 50); // İlk 50 coin
    }
    const query = coinSearchQuery.toLowerCase().trim();
    return Object.entries(availableCoins)
      .map(([symbol, v]) => ({ symbol, ...v }))
      .filter((coin) => {
        const coinName = coin.symbol.replace('USDT', '').toLowerCase();
        return coinName.includes(query) || coin.symbol.toLowerCase().includes(query);
      })
      .sort((a, b) => (b.volumeQ ?? 0) - (a.volumeQ ?? 0));
  }, [availableCoins, coinSearchQuery]);

  const onCoinSelect = useCallback((symbol: string, currentPrice: number) => {
    setDraft({
      symbol: symbol.replace('USDT', ''),
      amount: '',
      buy: currentPrice.toFixed(4),
    });
    setCoinSearchQuery('');
    setSelectedCoinSymbol(symbol);
  }, []);

  const onAdd = () => {
    const symbolInput = draft.symbol.toUpperCase().trim();
    const symbol = symbolInput.endsWith('USDT') ? symbolInput : symbolInput + 'USDT';
    const amount = parseFloat(draft.amount);
    const buy = parseFloat(draft.buy);

    if (!symbol || !symbol.endsWith('USDT') || symbol.length < 5) {
      Alert.alert('Hata', 'Geçerli bir coin sembolü girin (örn: BTC, ETH)');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir miktar girin (örn: 0.5)');
      return;
    }

    if (isNaN(buy) || buy <= 0) {
      Alert.alert('Hata', 'Geçerli bir alış fiyatı girin (örn: 60000)');
      return;
    }

    addOrUpdate({ symbol, amount, avgBuyPrice: buy });
    setDraft({ symbol: '', amount: '', buy: '' });
    setCoinSearchQuery('');
    setShowAddModal(false);
    Alert.alert('Başarılı', `${symbol} portföye eklendi`);
  };

  const onRemove = useCallback((symbol: string) => {
    Alert.alert(
      'Coin Sil',
      `${symbol} portföyden silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => remove(symbol),
        },
      ]
    );
  }, [remove]);

  const renderHoldingItem = useCallback(({ item }: { item: (typeof holdings)[0] }) => {
    const coinName = item.symbol.replace('USDT', '');
    const isPositive = item.pnl >= 0;
    
    return (
      <Pressable
        style={{
          backgroundColor: cardBg as string,
          borderRadius: 12,
          padding: IS_SMALL_SCREEN ? 12 : 16,
          marginBottom: IS_SMALL_SCREEN ? 10 : 12,
        }}
      >
        <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }} asChild>
          <Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 10 : 12 }}>
              <CoinAvatar symbol={item.symbol} size={IS_SMALL_SCREEN ? 36 : 40} />
              <View style={{ flex: 1, marginLeft: IS_SMALL_SCREEN ? 10 : 12 }}>
                <ThemedText 
                  numberOfLines={1}
                  style={{ fontSize: IS_SMALL_SCREEN ? 14 : 16, fontWeight: '600', marginBottom: 4 }}>
                  {coinName}
                </ThemedText>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, opacity: 0.6 }}>
                  ${item.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove(item.symbol);
                }}
                style={{ padding: IS_SMALL_SCREEN ? 6 : 8 }}
              >
                <MaterialCommunityIcons name="delete-outline" size={IS_SMALL_SCREEN ? 18 : 20} color={danger as string} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: IS_SMALL_SCREEN ? 6 : 8 }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, opacity: 0.6, marginBottom: 4 }}>Değer</ThemedText>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ fontSize: IS_SMALL_SCREEN ? 14 : 16, fontWeight: '600' }}>
                  ${item.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, opacity: 0.6, marginBottom: 4 }}>Miktar</ThemedText>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={{ fontSize: IS_SMALL_SCREEN ? 12 : 14, fontWeight: '600', textAlign: 'right' }}>
                  {item.amount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {coinName}
                </ThemedText>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: IS_SMALL_SCREEN ? 6 : 8,
              paddingTop: IS_SMALL_SCREEN ? 6 : 8,
              borderTopWidth: 1,
              borderTopColor: border as string,
            }}>
              <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 11 : 12, opacity: 0.6 }}>Kar/Zarar</ThemedText>
              <View style={{
                backgroundColor: isPositive ? (success as string) : (danger as string),
                paddingHorizontal: IS_SMALL_SCREEN ? 6 : 8,
                paddingVertical: IS_SMALL_SCREEN ? 3 : 4,
                borderRadius: 6,
              }}>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ color: '#ffffff', fontSize: IS_SMALL_SCREEN ? 11 : 12, fontWeight: '600' }}>
                  {isPositive ? '▲' : '▼'} ${Math.abs(item.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </Link>
      </Pressable>
    );
  }, [cardBg, border, success, danger, onRemove]);

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Portfolio Value Card */}
        <View style={{ 
          paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
          paddingTop: IS_SMALL_SCREEN ? 12 : 16, 
          paddingBottom: IS_SMALL_SCREEN ? 10 : 12 
        }}>
          <View style={[
            {
              backgroundColor: cardBg as string,
              borderRadius: 16,
              padding: IS_SMALL_SCREEN ? 16 : 20,
              marginBottom: IS_SMALL_SCREEN ? 12 : 16,
            },
            Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 3,
              },
              web: {
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
              },
            }),
          ]}>
            <ThemedText style={{ 
              fontSize: IS_SMALL_SCREEN ? 12 : 13, 
              opacity: 0.7, 
              marginBottom: IS_SMALL_SCREEN ? 6 : 8, 
              textAlign: 'center' 
            }}>
              Toplam Portföy Değeri
            </ThemedText>
            <ThemedText 
              type="title" 
              style={{ 
                fontSize: IS_SMALL_SCREEN ? 24 : IS_MEDIUM_SCREEN ? 28 : 32, 
                fontWeight: 'bold', 
                marginBottom: IS_SMALL_SCREEN ? 10 : 12,
                textAlign: 'center',
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              ${totals.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </ThemedText>
            <View style={{
              backgroundColor: totals.pnl >= 0 ? (success as string) : (danger as string),
              paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16,
              paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
              borderRadius: 10,
              alignSelf: 'center',
            }}>
              <ThemedText style={{ 
                color: '#ffffff', 
                fontSize: IS_SMALL_SCREEN ? 12 : 14, 
                fontWeight: '600' 
              }}>
                {totals.pnl >= 0 ? '▲' : '▼'} ${Math.abs(totals.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        <View style={{ 
          paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
          marginBottom: IS_SMALL_SCREEN ? 12 : 16 
        }}>
          <View style={[
            {
              height: IS_SMALL_SCREEN ? 240 : 280,
              backgroundColor: cardBg as string,
              borderRadius: 16,
              padding: IS_SMALL_SCREEN ? 12 : 16,
              overflow: 'hidden',
              position: 'relative',
            },
            Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 3,
              },
              web: {
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
              },
            }),
          ]}>
            {loadingChart ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ opacity: 0.6, fontSize: IS_SMALL_SCREEN ? 12 : 14 }}>Grafik yükleniyor...</ThemedText>
              </View>
            ) : chartData.length > 0 ? (
              <PortfolioChart
                data={chartData}
                height={IS_SMALL_SCREEN ? 216 : 248}
                width="100%"
                bullishColor={success as string}
                bearishColor={danger as string}
                showGrid={true}
                interactive={true}
                investedValue={totals.invested}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ opacity: 0.6, fontSize: IS_SMALL_SCREEN ? 12 : 14 }}>Grafik verisi yok</ThemedText>
              </View>
            )}

            {periodSummary && (
              <View style={{
                position: 'absolute',
                top: IS_SMALL_SCREEN ? 10 : 12,
                right: IS_SMALL_SCREEN ? 10 : 12,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                paddingVertical: IS_SMALL_SCREEN ? 6 : 7,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: periodSummary.change >= 0 ? (success as string) : (danger as string),
                borderColorOpacity: 0.3,
              }}>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                  opacity: 0.8,
                  marginBottom: 2
                }}>
                  {timePeriod} Değişim
                </ThemedText>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 12 : 13, 
                  fontWeight: '700',
                  color: periodSummary.change >= 0 ? success as string : danger as string
                }}>
                  {periodSummary.change >= 0 ? '+' : ''}${periodSummary.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ThemedText>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                  color: periodSummary.change >= 0 ? success as string : danger as string,
                  opacity: 0.9
                }}>
                  ({periodSummary.change >= 0 ? '+' : ''}{periodSummary.changePct.toFixed(2)}%)
                </ThemedText>
              </View>
            )}
            {totals.invested > 0 && (
              <View style={{
                position: 'absolute',
                bottom: IS_SMALL_SCREEN ? 10 : 12,
                left: IS_SMALL_SCREEN ? 10 : 12,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: IS_SMALL_SCREEN ? 8 : 10,
                paddingVertical: IS_SMALL_SCREEN ? 5 : 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(156, 163, 175, 0.3)',
              }}>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 9 : 10, 
                  opacity: 0.7,
                  marginBottom: 2
                }}>
                  Toplam Yatırım
                </ThemedText>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                  fontWeight: '600',
                  color: '#9ca3af'
                }}>
                  ${totals.invested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={{ 
          paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, 
          marginBottom: IS_SMALL_SCREEN ? 16 : 20 
        }}>
          <View style={{ flexDirection: 'row', gap: IS_SMALL_SCREEN ? 6 : 8 }}>
            {(['24H', '1W', '1M', '1Y', 'MAX'] as TimePeriod[]).map((period) => {
              const periodLabels: Record<TimePeriod, string> = {
                '24H': '24S',
                '1W': '1H',
                '1M': '1A',
                '1Y': '1Y',
                'MAX': 'MAKS',
              };
              return (
                <Pressable
                  key={period}
                  onPress={() => setTimePeriod(period)}
                  style={{
                    flex: 1,
                    paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
                    paddingHorizontal: IS_SMALL_SCREEN ? 8 : 12,
                    borderRadius: 8,
                    backgroundColor: timePeriod === period ? (tint as string) : 'transparent',
                    borderWidth: timePeriod === period ? 0 : 1,
                    borderColor: border as string,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText 
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      fontSize: IS_SMALL_SCREEN ? 11 : 12,
                      fontWeight: timePeriod === period ? '600' : '400',
                      color: timePeriod === period ? '#ffffff' : (text as string),
                    }}>
                    {periodLabels[period]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>


        {/* Add Coin Button */}
        <View style={{ paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, marginBottom: IS_SMALL_SCREEN ? 12 : 14 }}>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: tint as string,
              paddingVertical: IS_SMALL_SCREEN ? 14 : 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              + Coin Ekle
            </ThemedText>
          </Pressable>
        </View>

        {distribution.length > 0 && (
          <View style={{ paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16, marginBottom: IS_SMALL_SCREEN ? 14 : 16 }}>
            <View style={{
              backgroundColor: cardBg as string,
              borderRadius: 12,
              padding: IS_SMALL_SCREEN ? 12 : 14,
              borderWidth: 1,
              borderColor: border as string,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: IS_SMALL_SCREEN ? 8 : 10, justifyContent: 'space-between' }}>
                <ThemedText style={{ fontWeight: '700', fontSize: IS_SMALL_SCREEN ? 13 : 14 }}>Portföy Dağılımı</ThemedText>
                <ThemedText style={{ opacity: 0.6, fontSize: IS_SMALL_SCREEN ? 11 : 12 }}>
                  {distribution.length} varlık
                </ThemedText>
              </View>

              {/* Stacked bar */}
              <View style={{
                height: IS_SMALL_SCREEN ? 16 : 18,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.16)',
                marginBottom: IS_SMALL_SCREEN ? 10 : 12
              }}>
                <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
                  {distribution.map((item) => (
                    <View
                      key={item.symbol}
                      style={{
                        width: `${Math.min(100, Math.max(0, item.percent))}%`,
                        backgroundColor: item.color,
                        height: '100%',
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Legend (ilk 5) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: IS_SMALL_SCREEN ? 8 : 10 }}>
                {distribution.slice(0, 5).map((item) => (
                  <View key={item.symbol} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: IS_SMALL_SCREEN ? 8 : 10,
                    paddingVertical: IS_SMALL_SCREEN ? 6 : 7,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border as string,
                    backgroundColor: `hsla(${item.color.replace('hsl(', '').replace(')', '')}, 0.15)`,
                  }}>
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 6,
                      backgroundColor: item.color,
                      marginRight: 6,
                    }} />
                    <ThemedText style={{ fontSize: IS_SMALL_SCREEN ? 12 : 13, fontWeight: '600' }}>
                      {item.name} {item.percent.toFixed(1)}%
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: IS_SMALL_SCREEN ? 12 : 16 }}>
          {holdings.length === 0 ? (
            <View style={{
              backgroundColor: cardBg as string,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
            }}>
              <ThemedText style={{ opacity: 0.6 }}>Henüz coin eklenmedi</ThemedText>
            </View>
          ) : (
            <View>
              {holdings.map((item) => (
                <View key={item.symbol}>
                  {renderHoldingItem({ item })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Coin Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setCoinSearchQuery('');
          setDraft({ symbol: '', amount: '', buy: '' });
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: cardBg as string }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <ThemedText type="title" style={{ fontSize: 20, fontWeight: 'bold' }}>Coin Ekle</ThemedText>
                <TouchableOpacity onPress={() => {
                  setShowAddModal(false);
                  setCoinSearchQuery('');
                  setDraft({ symbol: '', amount: '', buy: '' });
                }}>
                  <MaterialCommunityIcons name="close" size={24} color={text as string} />
                </TouchableOpacity>
              </View>

            {/* Coin Search */}
            <View style={{ marginBottom: 16 }}>
              <TextInput
                placeholder="Coin ara (BTC, ETH, vb.)"
                placeholderTextColor={muted as string}
                value={coinSearchQuery}
                onChangeText={setCoinSearchQuery}
                style={{
                  borderWidth: 1,
                  borderColor: border as string,
                  borderRadius: 8,
                  padding: 12,
                  color: text as string,
                  backgroundColor: cardBg as string,
                  fontSize: 16,
                }}
              />
            </View>

            {/* Coin List - Scrollable Container */}
            {loadingCoins ? (
              <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <ThemedText style={{ opacity: 0.6 }}>Coinler yükleniyor...</ThemedText>
              </View>
            ) : filteredCoins.length > 0 ? (
              <View style={{ 
                marginBottom: 16,
                borderWidth: 1,
                borderColor: border as string,
                borderRadius: 12,
                backgroundColor: cardBg as string,
                maxHeight: 250,
                overflow: 'hidden',
              }}>
                <ScrollView 
                  style={{ flexGrow: 0 }}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredCoins.map((item, index) => {
                    const coinName = item.symbol.replace('USDT', '');
                const isSelected = selectedCoinSymbol === item.symbol;
                    return (
                      <View key={item.symbol}>
                        <Pressable
                          onPress={() => onCoinSelect(item.symbol, item.price)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                        backgroundColor: isSelected ? `${tint}22` : 'transparent',
                        borderWidth: 1,
                        borderColor: isSelected ? tint as string : border as string,
                          }}
                        >
                          <CoinAvatar symbol={item.symbol} size={32} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <ThemedText style={{ fontSize: 15, fontWeight: '600' }}>
                              {coinName}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
                              ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </ThemedText>
                          </View>
                      <View style={{ alignItems: 'flex-end' }}>
                            <ThemedText style={{ 
                              fontSize: 12, 
                              color: item.changePct >= 0 ? (success as string) : (danger as string),
                              fontWeight: '600',
                            }}>
                              {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                            </ThemedText>
                          </View>
                        </Pressable>
                        {index < filteredCoins.length - 1 && (
                          <View style={{ 
                            height: 1, 
                            backgroundColor: border as string, 
                            marginHorizontal: 16,
                            opacity: 0.2,
                          }} />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : coinSearchQuery ? (
              <View style={{ height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <ThemedText style={{ opacity: 0.6 }}>Sonuç bulunamadı</ThemedText>
              </View>
            ) : null}

            {/* Input Fields */}
            <View style={{ gap: 16 }}>
              <View>
                <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Coin Sembolü</ThemedText>
                <TextInput
                  placeholder="BTC, ETH, vb."
                  placeholderTextColor={muted as string}
                  value={draft.symbol}
                  onChangeText={(t) => setDraft((d) => ({ ...d, symbol: t }))}
                  style={{
                    borderWidth: 1,
                    borderColor: border as string,
                    borderRadius: 8,
                    padding: 12,
                    color: text as string,
                    backgroundColor: cardBg as string,
                  }}
                />
              </View>

              <View>
                <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Miktar</ThemedText>
                <TextInput
                  placeholder="0.5"
                  placeholderTextColor={muted as string}
                  keyboardType="decimal-pad"
                  value={draft.amount}
                  onChangeText={(t) => setDraft((d) => ({ ...d, amount: t }))}
                  style={{
                    borderWidth: 1,
                    borderColor: border as string,
                    borderRadius: 8,
                    padding: 12,
                    color: text as string,
                    backgroundColor: cardBg as string,
                  }}
                />
              </View>

              <View>
                <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Alış Fiyatı (USDT)</ThemedText>
                <TextInput
                  placeholder="60000"
                  placeholderTextColor={muted as string}
                  keyboardType="decimal-pad"
                  value={draft.buy}
                  onChangeText={(t) => setDraft((d) => ({ ...d, buy: t }))}
                  style={{
                    borderWidth: 1,
                    borderColor: border as string,
                    borderRadius: 8,
                    padding: 12,
                    color: text as string,
                    backgroundColor: cardBg as string,
                  }}
                />
              </View>

              <Pressable
                onPress={onAdd}
                style={{
                  backgroundColor: tint as string,
                  paddingVertical: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                  Ekle
                </ThemedText>
              </Pressable>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </ThemedView>
  );
}
