import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, View, Pressable, ScrollView, Dimensions, Modal, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchKlines, fetchTickerPrice, type KlinePoint } from '@/services/binance';
import { startUSDTSpotMiniTicker, startKlineStreamSubscription } from '@/services/realtime';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CoinAvatar } from '@/components/coin-avatar';
import { SimpleChart } from '@/components/simple-chart';
import { CandlestickChart, type CandlestickData } from '@/components/candlestick-chart';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TimePeriod = '1d' | '1w' | '1m' | '1y';
type ChartType = 'line' | 'candlestick';

export default function CoinDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const symStr = String(symbol ?? '').trim().toUpperCase();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1w');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [dayChange, setDayChange] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [volumeQ, setVolumeQ] = useState<number | undefined>(undefined);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedCandle, setSelectedCandle] = useState<CandlestickData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const candlesRef = useRef<CandlestickData[]>([]);
  
  const success = useThemeColor({}, 'success') || '#10b981';
  const danger = useThemeColor({}, 'danger') || '#ef4444';
  const cardBg = useThemeColor({}, 'card') || '#1a1a1a';
  const border = useThemeColor({}, 'border') || '#2a2a2a';
  const text = useThemeColor({}, 'text') || '#ffffff';

  const title = useMemo(() => symStr.replace('USDT', ''), [symStr]);
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
  const headerHeight = 60;
  const fullscreenChartHeight = screenHeight - statusBarHeight - headerHeight;
  const chartHeight = useMemo(() => {
    const availableHeight = screenHeight * 0.5;
    return Math.max(350, Math.min(450, availableHeight));
  }, [screenHeight]);

  if (!symStr || symStr.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Hata', headerShown: true }} />
        <ThemedView style={{ flex: 1 }} safe edges={['top']}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText>Geçersiz coin sembolü</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  const getKlineParams = (period: TimePeriod) => {
    switch (period) {
      case '1d': return { interval: '1h' as const, limit: 24, wsInterval: '1h' as const };
      case '1w': return { interval: '1d' as const, limit: 7, wsInterval: '1d' as const };
      case '1m': return { interval: '1d' as const, limit: 30, wsInterval: '1d' as const };
      case '1y': return { interval: '1w' as const, limit: 52, wsInterval: '1w' as const };
      default: return { interval: '1d' as const, limit: 7, wsInterval: '1d' as const };
    }
  };

  useEffect(() => {
    let active = true;
    setChartError(null);
    setIsLive(false);
    (async () => {
      try {
        setLoading(true);
        const params = getKlineParams(timePeriod);
        const [data, currentPrice] = await Promise.all([
          fetchKlines(symStr, params.interval, params.limit),
          fetchTickerPrice(symStr).catch(() => 0),
        ]);
        
        if (!active) return;
        
        if (!data || data.length === 0) {
          setChartError('Grafik verisi bulunamadı');
          setLoading(false);
          return;
        }
        
        const candlestickData: CandlestickData[] = data.map((k) => ({
          openTime: k.openTime,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
          closeTime: k.closeTime,
        }));
        
        setCandles(candlestickData);
        candlesRef.current = candlestickData;
        
        const chartPoints = data.map((k, idx) => ({ x: idx, y: Number(k.close) || 0 })).filter(p => p.y > 0);
        setPoints(chartPoints);
        
        if (currentPrice > 0) {
          setPrice(currentPrice);
        }
        
        if (data.length > 1) {
          const first = Number(data[0]?.close) || 0;
          const last = Number(data[data.length - 1]?.close) || 0;
          if (first > 0) {
            const change = ((last - first) / first) * 100;
            setDayChange(change);
          }
        }
        
        setIsLive(true);
      } catch (err) {
        console.error('Error loading coin data:', err);
        setChartError('Veri yüklenirken hata oluştu');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [symStr, timePeriod]);

  useEffect(() => {
    const stop = startUSDTSpotMiniTicker((update) => {
      const ticker = update[symStr];
      if (ticker) {
        setPrice(ticker.price);
        setVolumeQ(ticker.volumeQ);
      }
    });
    return stop;
  }, [symStr]);

  // Canlı kline stream - grafik güncellemeleri
  useEffect(() => {
    if (candlesRef.current.length === 0 || !isLive) return;
    
    const params = getKlineParams(timePeriod);
    const wsInterval = params.wsInterval;
    
    const stop = startKlineStreamSubscription(symStr, wsInterval, (klineUpdate) => {
      if (klineUpdate.symbol !== symStr) return;
      
      setCandles((prevCandles) => {
        const newCandles = [...prevCandles];
        
        if (klineUpdate.isFinal) {
          // Mum kapandı - son mumu güncelle veya yeni ekle
          if (newCandles.length > 0) {
            const lastIndex = newCandles.length - 1;
            newCandles[lastIndex] = {
              openTime: klineUpdate.openTime,
              open: klineUpdate.open,
              high: klineUpdate.high,
              low: klineUpdate.low,
              close: klineUpdate.close,
              volume: klineUpdate.volume,
              closeTime: klineUpdate.closeTime,
            };
            
            // Yeni mum ekle (isteğe bağlı - limit kontrolü ile)
            if (newCandles.length < params.limit) {
              newCandles.push({
                openTime: klineUpdate.closeTime,
                open: klineUpdate.close,
                high: klineUpdate.close,
                low: klineUpdate.close,
                close: klineUpdate.close,
                volume: 0,
                closeTime: klineUpdate.closeTime + (klineUpdate.closeTime - klineUpdate.openTime),
              });
            } else {
              // Limit aşıldıysa en eski mumu kaldır
              newCandles.shift();
              newCandles.push({
                openTime: klineUpdate.closeTime,
                open: klineUpdate.close,
                high: klineUpdate.close,
                low: klineUpdate.close,
                close: klineUpdate.close,
                volume: 0,
                closeTime: klineUpdate.closeTime + (klineUpdate.closeTime - klineUpdate.openTime),
              });
            }
          }
        } else {
          // Devam eden mum - son mumu güncelle
          if (newCandles.length > 0) {
            const lastIndex = newCandles.length - 1;
            const lastCandle = newCandles[lastIndex];
            newCandles[lastIndex] = {
              ...lastCandle,
              high: Math.max(lastCandle.high, klineUpdate.high),
              low: Math.min(lastCandle.low, klineUpdate.low),
              close: klineUpdate.close,
              volume: klineUpdate.volume,
            };
          }
        }
        
        candlesRef.current = newCandles;
        
        // Line chart için de güncelle - sadece gerektiğinde
        if (chartType === 'line') {
          const chartPoints = newCandles.map((k, idx) => ({ x: idx, y: k.close })).filter(p => p.y > 0);
          setPoints(chartPoints);
        }
        
        // Period değişimini güncelle - debounce ile
        if (newCandles.length > 1) {
          const first = newCandles[0]?.close || 0;
          const last = newCandles[newCandles.length - 1]?.close || 0;
          if (first > 0) {
            const change = ((last - first) / first) * 100;
            setDayChange(change);
          }
        }
        
        // Fiyatı güncelle
        if (klineUpdate.close > 0) {
          setPrice(klineUpdate.close);
        }
        
        return newCandles;
      });
    });
    
    return stop;
  }, [symStr, timePeriod, isLive, chartType]);

  const chartWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    return screenWidth - 32; // sadece dış padding (16*2)
  }, []);

  const minPrice = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.min(...points.map((p) => p.y));
  }, [points]);
  const maxPrice = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.max(...points.map((p) => p.y));
  }, [points]);

  return (
    <>
      <Stack.Screen options={{ title: title, headerShown: true }} />
      <ThemedView style={{ flex: 1 }} safe edges={['top']}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
          {/* Coin Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <CoinAvatar symbol={symStr} size={40} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold' }}>
                {title}
              </ThemedText>
              <ThemedText style={{ opacity: 0.7, fontSize: 14 }}>Account 01</ThemedText>
            </View>
          </View>

          {/* Price Display */}
          <View style={{ marginBottom: 12 }}>
            <ThemedText type="title" style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
              ${selectedCandle 
                ? selectedCandle.close.toFixed(selectedCandle.close < 1 ? 4 : 2)
                : selectedPoint 
                  ? selectedPoint.y.toFixed(selectedPoint.y < 1 ? 4 : 2)
                  : price.toFixed(price < 1 ? 4 : 2)
              }
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ 
                fontSize: 18,
                color: dayChange >= 0 ? success as string : danger as string,
                fontWeight: '600',
              }}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}% ({timePeriod === '1d' ? '1G' : timePeriod === '1w' ? '1H' : timePeriod === '1m' ? '1A' : '1Y'})
              </ThemedText>
              {selectedPoint && (
                <ThemedText style={{ 
                  fontSize: 12,
                  opacity: 0.6,
                  marginLeft: 8,
                }}>
                  (Dokunarak seçildi)
                </ThemedText>
              )}
            </View>
          </View>

          {/* Chart Type Selector */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Pressable
              onPress={() => setChartType('candlestick')}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: chartType === 'candlestick' ? (cardBg as string) : 'transparent',
                borderWidth: chartType === 'candlestick' ? 1 : 0,
                borderColor: border as string,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{
                fontSize: 13,
                fontWeight: chartType === 'candlestick' ? '600' : '400',
              }}>
                Mum
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setChartType('line')}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: chartType === 'line' ? (cardBg as string) : 'transparent',
                borderWidth: chartType === 'line' ? 1 : 0,
                borderColor: border as string,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{
                fontSize: 13,
                fontWeight: chartType === 'line' ? '600' : '400',
              }}>
                Çizgi
              </ThemedText>
            </Pressable>
          </View>

          {/* Chart */}
          {loading ? (
            <View style={{ height: 350, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ActivityIndicator />
            </View>
          ) : chartError ? (
            <View style={{ height: 350, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ThemedText style={{ opacity: 0.6 }}>{chartError}</ThemedText>
            </View>
          ) : (chartType === 'candlestick' ? candles.length > 0 : points.length > 0) ? (
            <View style={{ marginBottom: 20 }}>
              <View style={{ 
                height: chartHeight,
                width: '100%',
                backgroundColor: 'transparent',
                borderRadius: 0,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Fullscreen Button */}
                <TouchableOpacity
                  onPress={() => setIsFullscreen(true)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <MaterialCommunityIcons name="fullscreen" size={20} color="#ffffff" />
                </TouchableOpacity>
                
                {chartType === 'candlestick' ? (
                  <CandlestickChart
                    data={candles}
                    height={chartHeight}
                    width="100%"
                    bullishColor={success as string}
                    bearishColor={danger as string}
                    showGrid={true}
                    interactive={true}
                    onCandleSelect={(candle, index) => {
                      setSelectedCandle(candle);
                      if (candle) {
                        setSelectedPoint({ x: index || 0, y: candle.close });
                      } else {
                        setSelectedPoint(null);
                      }
                    }}
                  />
                ) : (
                  <SimpleChart
                    data={points}
                    height={chartHeight}
                    width="100%"
                    color={dayChange >= 0 ? success : danger}
                    showGradient={true}
                    showGrid={true}
                    interactive={true}
                    onPointSelect={(point) => {
                      setSelectedPoint(point);
                      setSelectedCandle(null);
                    }}
                  />
                )}
              </View>
              
              {/* Price Range */}
              {chartType === 'line' && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>${minPrice.toFixed(price < 1 ? 4 : 2)}</ThemedText>
                  <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>${maxPrice.toFixed(price < 1 ? 4 : 2)}</ThemedText>
                </View>
              )}
            </View>
          ) : !loading && (candles.length === 0 && points.length === 0) ? (
            <View style={{ height: 350, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ThemedText style={{ opacity: 0.6 }}>Grafik verisi yükleniyor...</ThemedText>
            </View>
          ) : null}
          
          {/* Time Period Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {(['1d', '1w', '1m', '1y'] as TimePeriod[]).map((period) => {
              const periodLabels: Record<TimePeriod, string> = {
                '1d': '1G',
                '1w': '1H',
                '1m': '1A',
                '1y': '1Y',
              };
              return (
                <Pressable
                  key={period}
                  onPress={() => setTimePeriod(period)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: timePeriod === period ? (cardBg as string) : 'transparent',
                    borderWidth: timePeriod === period ? 1 : 0,
                    borderColor: border as string,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText style={{
                    fontSize: 14,
                    fontWeight: timePeriod === period ? '600' : '400',
                  }}>
                    {periodLabels[period]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Additional Info */}
          {volumeQ !== undefined && (
            <View style={{
              backgroundColor: cardBg as string,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: border as string,
            }}>
              <ThemedText style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>Volume (USDT)</ThemedText>
              <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>
                ${(volumeQ / 1_000_000).toFixed(2)}M
              </ThemedText>
            </View>
          )}
          </View>
        </ScrollView>
        
        {/* Fullscreen Modal */}
        <Modal
          visible={isFullscreen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsFullscreen(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <StatusBar barStyle="light-content" />
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: statusBarHeight + 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: border as string,
              height: headerHeight + statusBarHeight,
            }}>
              <ThemedText type="title" style={{ fontSize: 20 }}>
                {title} - Grafik
              </ThemedText>
              <TouchableOpacity
                onPress={() => setIsFullscreen(false)}
                style={{
                  backgroundColor: cardBg as string,
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <MaterialCommunityIcons name="fullscreen-exit" size={24} color={text as string} />
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1, width: '100%' }}>
              {chartType === 'candlestick' ? (
                <CandlestickChart
                  data={candles}
                  height={fullscreenChartHeight}
                  width="100%"
                  bullishColor={success as string}
                  bearishColor={danger as string}
                  showGrid={true}
                  interactive={true}
                  onCandleSelect={(candle, index) => {
                    setSelectedCandle(candle);
                    if (candle) {
                      setSelectedPoint({ x: index || 0, y: candle.close });
                    } else {
                      setSelectedPoint(null);
                    }
                  }}
                />
              ) : (
                <SimpleChart
                  data={points}
                  height={fullscreenChartHeight}
                  width="100%"
                  color={dayChange >= 0 ? success : danger}
                  showGradient={true}
                  showGrid={true}
                  interactive={true}
                  onPointSelect={(point) => {
                    setSelectedPoint(point);
                    setSelectedCandle(null);
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      </ThemedView>
    </>
  );
}
