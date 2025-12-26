import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, View, Pressable, ScrollView, Dimensions, Modal, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { fetchKlines, fetchTickerPrice, type KlinePoint } from '@/services/binance';
import { startUSDTSpotMiniTicker, startKlineStreamSubscription } from '@/services/realtime';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CoinAvatar } from '@/components/ui/coin-avatar';
import { SimpleChart } from '@/components/charts/simple-chart';
import { CandlestickChart, type CandlestickData } from '@/components/charts/candlestick-chart';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TimePeriod = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1mo' | '1y';
type ChartType = 'line' | 'candlestick';

export default function CoinDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const symStr = String(symbol ?? '').trim().toUpperCase();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1h');
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const success = useThemeColor({}, 'success') || '#10b981';
  const danger = useThemeColor({}, 'danger') || '#ef4444';
  const cardBg = useThemeColor({}, 'card') || '#1a1a1a';
  const border = useThemeColor({}, 'border') || '#2a2a2a';
  const text = useThemeColor({}, 'text') || '#ffffff';

  const title = useMemo(() => symStr.replace('USDT', ''), [symStr]);
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const IS_SMALL_SCREEN = screenWidth < 375;
  const IS_MEDIUM_SCREEN = screenWidth >= 375 && screenWidth < 414;
  const IS_LARGE_SCREEN = screenWidth >= 414;
  const H_PADDING = IS_SMALL_SCREEN ? 10 : IS_MEDIUM_SCREEN ? 14 : 16;
  const statusBarHeight = Platform.OS === 'ios' ? (IS_SMALL_SCREEN ? 40 : 44) : StatusBar.currentHeight || 0;
  const headerHeight = IS_SMALL_SCREEN ? 50 : IS_MEDIUM_SCREEN ? 56 : 60;
  const fullscreenChartHeight = screenHeight - statusBarHeight - headerHeight;
  const chartHeight = useMemo(() => {
    if (IS_SMALL_SCREEN) {
      return Math.max(220, Math.min(280, screenHeight * 0.32));
    } else if (IS_MEDIUM_SCREEN) {
      return Math.max(280, Math.min(350, screenHeight * 0.38));
    } else {
      return Math.max(350, Math.min(450, screenHeight * 0.45));
    }
  }, [screenHeight, IS_SMALL_SCREEN, IS_MEDIUM_SCREEN]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

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
      case '1m': return { interval: '1m' as const, limit: 60, wsInterval: '1m' as const };
      case '5m': return { interval: '5m' as const, limit: 60, wsInterval: '5m' as const };
      case '15m': return { interval: '15m' as const, limit: 60, wsInterval: '15m' as const };
      case '30m': return { interval: '30m' as const, limit: 60, wsInterval: '30m' as const };
      case '1h': return { interval: '1h' as const, limit: 48, wsInterval: '1h' as const };
      case '4h': return { interval: '4h' as const, limit: 30, wsInterval: '4h' as const };
      case '1d': return { interval: '1d' as const, limit: 30, wsInterval: '1d' as const };
      case '1w': return { interval: '1d' as const, limit: 7, wsInterval: '1d' as const };
      case '1mo': return { interval: '1d' as const, limit: 30, wsInterval: '1d' as const };
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
    return screenWidth - H_PADDING * 2;
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
      <Stack.Screen 
        options={{ 
          title: title, 
          headerShown: true,
          headerStyle: {
            height: Platform.OS === 'ios' 
              ? (IS_SMALL_SCREEN ? 44 : IS_MEDIUM_SCREEN ? 50 : 56)
              : (IS_SMALL_SCREEN ? 56 : IS_MEDIUM_SCREEN ? 60 : 64),
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontSize: IS_SMALL_SCREEN ? 16 : IS_MEDIUM_SCREEN ? 18 : 20,
          },
          headerBackTitleVisible: false,
          headerTransparent: false,
          contentStyle: {
            paddingTop: 0,
          },
        }} 
      />
      <ThemedView style={{ flex: 1 }}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ 
            paddingBottom: IS_SMALL_SCREEN ? 16 : 20, 
            paddingHorizontal: H_PADDING,
            paddingTop: IS_SMALL_SCREEN ? 8 : IS_MEDIUM_SCREEN ? 10 : 12
          }}
          showsVerticalScrollIndicator={false}
        >
          <View>
          {/* Coin Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: IS_SMALL_SCREEN ? 12 : IS_MEDIUM_SCREEN ? 16 : 20 
          }}>
            <CoinAvatar symbol={symStr} size={IS_SMALL_SCREEN ? 32 : IS_MEDIUM_SCREEN ? 38 : 44} />
            <View style={{ marginLeft: IS_SMALL_SCREEN ? 8 : IS_MEDIUM_SCREEN ? 10 : 12, flex: 1 }}>
              <ThemedText type="title" style={{ 
                fontSize: IS_SMALL_SCREEN ? 18 : IS_MEDIUM_SCREEN ? 21 : 24, 
                fontWeight: 'bold',
                lineHeight: IS_SMALL_SCREEN ? 22 : IS_MEDIUM_SCREEN ? 25 : 28
              }}>
                {title}
              </ThemedText>
              {volumeQ !== undefined && (
                <ThemedText style={{ 
                  opacity: 0.7, 
                  fontSize: IS_SMALL_SCREEN ? 10 : IS_MEDIUM_SCREEN ? 11 : 13,
                  marginTop: IS_SMALL_SCREEN ? 2 : 4
                }}>
                  Vol: {(volumeQ / 1_000_000).toFixed(2)}M
                </ThemedText>
              )}
            </View>
          </View>

          {/* Price Display */}
          <View style={{ marginBottom: IS_SMALL_SCREEN ? 8 : IS_MEDIUM_SCREEN ? 10 : 12 }}>
            <ThemedText type="title" style={{ 
              fontSize: IS_SMALL_SCREEN ? 24 : IS_MEDIUM_SCREEN ? 28 : 36, 
              fontWeight: 'bold', 
              marginBottom: IS_SMALL_SCREEN ? 4 : IS_MEDIUM_SCREEN ? 6 : 8,
              lineHeight: IS_SMALL_SCREEN ? 28 : IS_MEDIUM_SCREEN ? 32 : 40
            }}>
              ${selectedCandle 
                ? selectedCandle.close.toFixed(selectedCandle.close < 1 ? 4 : 2)
                : selectedPoint 
                  ? selectedPoint.y.toFixed(selectedPoint.y < 1 ? 4 : 2)
                  : price.toFixed(price < 1 ? 4 : 2)
              }
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 13 : IS_MEDIUM_SCREEN ? 15 : 18,
                color: dayChange >= 0 ? success as string : danger as string,
                fontWeight: '600',
              }}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
              </ThemedText>
              {selectedPoint && (
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 9 : IS_MEDIUM_SCREEN ? 10 : 12,
                  opacity: 0.6,
                  marginLeft: IS_SMALL_SCREEN ? 4 : IS_MEDIUM_SCREEN ? 6 : 8,
                }}>
                  (Dokunarak seçildi)
                </ThemedText>
              )}
            </View>
          </View>

          {/* Chart Type Selector */}
          <View style={{ 
            flexDirection: 'row', 
            gap: IS_SMALL_SCREEN ? 6 : 8, 
            marginBottom: IS_SMALL_SCREEN ? 10 : 12 
          }}>
            <Pressable
              onPress={() => setChartType('candlestick')}
              style={{
                flex: 1,
                paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
                paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                backgroundColor: chartType === 'candlestick' ? (cardBg as string) : 'transparent',
                borderWidth: chartType === 'candlestick' ? 1 : 0,
                borderColor: border as string,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{
                fontSize: IS_SMALL_SCREEN ? 12 : 13,
                fontWeight: chartType === 'candlestick' ? '600' : '400',
              }}>
                Mum
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setChartType('line')}
              style={{
                flex: 1,
                paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
                paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                backgroundColor: chartType === 'line' ? (cardBg as string) : 'transparent',
                borderWidth: chartType === 'line' ? 1 : 0,
                borderColor: border as string,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{
                fontSize: IS_SMALL_SCREEN ? 12 : 13,
                fontWeight: chartType === 'line' ? '600' : '400',
              }}>
                Çizgi
              </ThemedText>
            </Pressable>
          </View>

          {/* Chart */}
          {loading ? (
            <View style={{ 
              height: chartHeight, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: IS_SMALL_SCREEN ? 16 : 20 
            }}>
              <ActivityIndicator />
            </View>
          ) : chartError ? (
            <View style={{ 
              height: chartHeight, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: IS_SMALL_SCREEN ? 16 : 20 
            }}>
              <ThemedText style={{ 
                opacity: 0.6, 
                fontSize: IS_SMALL_SCREEN ? 12 : 14 
              }}>
                {chartError}
              </ThemedText>
            </View>
          ) : (chartType === 'candlestick' ? candles.length > 0 : points.length > 0) ? (
            <View style={{ marginBottom: IS_SMALL_SCREEN ? 16 : IS_MEDIUM_SCREEN ? 18 : 20 }}>
              <View style={{ 
                height: chartHeight,
                width: '100%',
                backgroundColor: 'transparent',
                borderRadius: IS_SMALL_SCREEN ? 10 : 12,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Zoom Controls */}
                <View style={{
                  position: 'absolute',
                  top: IS_SMALL_SCREEN ? 8 : 12,
                  left: IS_SMALL_SCREEN ? 8 : 12,
                  zIndex: 10,
                  flexDirection: 'row',
                  gap: IS_SMALL_SCREEN ? 4 : 8,
                }}>
                  <TouchableOpacity
                    onPress={() => {
                      const newZoom = Math.max(1, zoomLevel - 0.3);
                      setZoomLevel(newZoom);
                      scale.value = withSpring(newZoom);
                      if (newZoom <= 1) {
                        translateX.value = withSpring(0);
                        translateY.value = withSpring(0);
                        setPanX(0);
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                      padding: IS_SMALL_SCREEN ? 6 : 8,
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="minus" 
                      size={IS_SMALL_SCREEN ? 16 : 18} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setZoomLevel(1);
                      scale.value = withSpring(1);
                      translateX.value = withSpring(0);
                      translateY.value = withSpring(0);
                      setPanX(0);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                      padding: IS_SMALL_SCREEN ? 6 : 8,
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="refresh" 
                      size={IS_SMALL_SCREEN ? 16 : 18} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const newZoom = Math.min(2.5, zoomLevel + 0.3);
                      setZoomLevel(newZoom);
                      scale.value = withSpring(newZoom);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                      padding: IS_SMALL_SCREEN ? 6 : 8,
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="plus" 
                      size={IS_SMALL_SCREEN ? 16 : 18} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Fullscreen Button */}
                <TouchableOpacity
                  onPress={() => setIsFullscreen(true)}
                  style={{
                    position: 'absolute',
                    top: IS_SMALL_SCREEN ? 8 : 12,
                    right: IS_SMALL_SCREEN ? 8 : 12,
                    zIndex: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                    padding: IS_SMALL_SCREEN ? 6 : 8,
                  }}
                >
                  <MaterialCommunityIcons 
                    name="fullscreen" 
                    size={IS_SMALL_SCREEN ? 18 : 20} 
                    color="#ffffff" 
                  />
                </TouchableOpacity>
                
                <GestureDetector
                  gesture={Gesture.Simultaneous(
                    Gesture.Pinch()
                      .onUpdate((e) => {
                        const newScale = Math.max(1, Math.min(2.5, e.scale));
                        scale.value = newScale;
                        runOnJS(setZoomLevel)(newScale);
                      })
                      .onEnd(() => {
                        if (scale.value < 1.15) {
                          scale.value = withSpring(1);
                          translateX.value = withSpring(0);
                          translateY.value = withSpring(0);
                          runOnJS(setZoomLevel)(1);
                          runOnJS(setPanX)(0);
                        } else {
                          scale.value = withSpring(Math.min(2.5, scale.value));
                        }
                      }),
                    Gesture.Pan()
                      .enabled(zoomLevel > 1.1)
                      .onUpdate((e) => {
                        if (zoomLevel > 1.1) {
                          const maxTranslate = (chartWidth * (zoomLevel - 1)) / 2;
                          translateX.value = Math.max(-maxTranslate, Math.min(maxTranslate, e.translationX));
                          translateY.value = Math.max(-50, Math.min(50, e.translationY));
                          runOnJS(setPanX)(translateX.value);
                        }
                      })
                      .onEnd(() => {
                        if (zoomLevel <= 1.1) {
                          translateX.value = withSpring(0);
                          translateY.value = withSpring(0);
                        }
                      })
                  )}
                >
                  <Animated.View
                    style={[
                      {
                        width: chartWidth,
                        height: '100%',
                        overflow: 'hidden',
                      },
                      animatedStyle,
                    ]}
                  >
                  {chartType === 'candlestick' ? (
                    <CandlestickChart
                      data={candles}
                      height={chartHeight}
                      width={chartWidth}
                      bullishColor={success as string}
                      bearishColor={danger as string}
                      showGrid={true}
                      interactive={zoomLevel <= 1.1}
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
                      width={chartWidth}
                      color={dayChange >= 0 ? success : danger}
                      showGradient={true}
                      showGrid={true}
                      interactive={zoomLevel <= 1.1}
                      onPointSelect={(point) => {
                        setSelectedPoint(point);
                        setSelectedCandle(null);
                      }}
                    />
                  )}
                  </Animated.View>
                </GestureDetector>
              </View>
              
              {/* Price Range */}
              {chartType === 'line' && (
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  marginTop: IS_SMALL_SCREEN ? 6 : 8 
                }}>
                  <ThemedText style={{ 
                    fontSize: IS_SMALL_SCREEN ? 10 : 12, 
                    opacity: 0.6 
                  }}>
                    ${minPrice.toFixed(price < 1 ? 4 : 2)}
                  </ThemedText>
                  <ThemedText style={{ 
                    fontSize: IS_SMALL_SCREEN ? 10 : 12, 
                    opacity: 0.6 
                  }}>
                    ${maxPrice.toFixed(price < 1 ? 4 : 2)}
                  </ThemedText>
                </View>
              )}
            </View>
          ) : !loading && (candles.length === 0 && points.length === 0) ? (
            <View style={{ 
              height: chartHeight, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: IS_SMALL_SCREEN ? 16 : 20 
            }}>
              <ThemedText style={{ 
                opacity: 0.6, 
                fontSize: IS_SMALL_SCREEN ? 12 : 14 
              }}>
                Grafik verisi yükleniyor...
              </ThemedText>
            </View>
          ) : null}
          
          {/* Time Period Buttons */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: IS_SMALL_SCREEN ? 18 : IS_MEDIUM_SCREEN ? 22 : 24 }}
            contentContainerStyle={{ 
              gap: IS_SMALL_SCREEN ? 5 : IS_MEDIUM_SCREEN ? 6 : 8, 
              paddingRight: H_PADDING 
            }}
          >
            {(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo', '1y'] as TimePeriod[]).map((period, index) => {
              const periodLabels: Record<TimePeriod, string> = {
                '1m': '1D',
                '5m': '5D',
                '15m': '15D',
                '30m': '30D',
                '1h': '1S',
                '4h': '4S',
                '1d': '1G',
                '1w': '1H',
                '1mo': '1A',
                '1y': '1Y',
              };
              return (
                <Pressable
                  key={`time-period-${period}-${index}`}
                  onPress={() => setTimePeriod(period)}
                  style={{
                    paddingVertical: IS_SMALL_SCREEN ? 5 : IS_MEDIUM_SCREEN ? 7 : 10,
                    paddingHorizontal: IS_SMALL_SCREEN ? 8 : IS_MEDIUM_SCREEN ? 12 : 16,
                    borderRadius: IS_SMALL_SCREEN ? 6 : 8,
                    backgroundColor: timePeriod === period ? (cardBg as string) : 'transparent',
                    borderWidth: timePeriod === period ? 1 : 0,
                    borderColor: border as string,
                    minWidth: IS_SMALL_SCREEN ? 40 : IS_MEDIUM_SCREEN ? 50 : 60,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText style={{
                    fontSize: IS_SMALL_SCREEN ? 10 : IS_MEDIUM_SCREEN ? 11 : 13,
                    fontWeight: timePeriod === period ? '600' : '400',
                  }}>
                    {periodLabels[period]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Additional Info */}
          {volumeQ !== undefined && (
            <View style={{
              backgroundColor: cardBg as string,
              borderRadius: IS_SMALL_SCREEN ? 10 : 12,
              padding: IS_SMALL_SCREEN ? 12 : 16,
              borderWidth: 1,
              borderColor: border as string,
            }}>
              <ThemedText style={{ 
                opacity: 0.7, 
                fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                marginBottom: IS_SMALL_SCREEN ? 3 : 4 
              }}>
                Volume (USDT)
              </ThemedText>
              <ThemedText style={{ 
                fontSize: IS_SMALL_SCREEN ? 16 : IS_MEDIUM_SCREEN ? 17 : 18, 
                fontWeight: '600' 
              }}>
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
