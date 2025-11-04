import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Pressable, ScrollView, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchKlines, fetchTickerPrice } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CoinAvatar } from '@/components/coin-avatar';
import { SimpleChart } from '@/components/simple-chart';

type TimePeriod = '1d' | '1w' | '1m' | '1y';

export default function CoinDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const symStr = String(symbol ?? '').trim().toUpperCase();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1w');
  const [dayChange, setDayChange] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [volumeQ, setVolumeQ] = useState<number | undefined>(undefined);
  const [chartError, setChartError] = useState<string | null>(null);
  
  const success = useThemeColor({}, 'success') || '#10b981';
  const danger = useThemeColor({}, 'danger') || '#ef4444';
  const cardBg = useThemeColor({}, 'card') || '#1a1a1a';
  const border = useThemeColor({}, 'border') || '#2a2a2a';
  const text = useThemeColor({}, 'text') || '#ffffff';

  const title = useMemo(() => symStr.replace('USDT', ''), [symStr]);

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
      case '1d': return { interval: '1h' as const, limit: 24 };
      case '1w': return { interval: '1d' as const, limit: 7 };
      case '1m': return { interval: '1d' as const, limit: 30 };
      case '1y': return { interval: '1w' as const, limit: 52 };
      default: return { interval: '1d' as const, limit: 7 };
    }
  };

  useEffect(() => {
    let active = true;
    setChartError(null);
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
        
        const chartPoints = data.map((k, idx) => ({ x: idx, y: Number(k.close) || 0 })).filter(p => p.y > 0);
        setPoints(chartPoints);
        
        if (currentPrice > 0) {
          setPrice(currentPrice);
        }
        
        // Period değişimini hesapla
        if (data.length > 1) {
          const first = Number(data[0]?.close) || 0;
          const last = Number(data[data.length - 1]?.close) || 0;
          if (first > 0) {
            const change = ((last - first) / first) * 100;
            setDayChange(change);
          }
        }
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

  const chartWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    return screenWidth - 32 - 24; // padding + card padding
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
              ${price.toFixed(price < 1 ? 4 : 2)}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ 
                fontSize: 18,
                color: dayChange >= 0 ? success as string : danger as string,
                fontWeight: '600',
              }}>
                {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}% ({timePeriod.toUpperCase()})
              </ThemedText>
            </View>
          </View>

          {/* Chart */}
          {loading ? (
            <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ActivityIndicator />
            </View>
          ) : chartError ? (
            <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ThemedText style={{ opacity: 0.6 }}>{chartError}</ThemedText>
            </View>
          ) : points.length > 0 && minPrice > 0 && maxPrice > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <View style={{ 
                height: 250, 
                backgroundColor: cardBg as string,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <SimpleChart
                  data={points}
                  height={226}
                  width={chartWidth}
                  color={dayChange >= 0 ? success : danger}
                  showGradient={true}
                />
              </View>
              
              {/* Price Range */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>${minPrice.toFixed(2)}</ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>${maxPrice.toFixed(2)}</ThemedText>
              </View>
            </View>
          ) : !loading && points.length === 0 ? (
            <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ThemedText style={{ opacity: 0.6 }}>Grafik verisi yüklenemedi</ThemedText>
            </View>
          ) : null}

          {/* Time Period Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {(['1d', '1w', '1m', '1y'] as TimePeriod[]).map((period) => (
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
                  textTransform: 'uppercase',
                }}>
                  {period}
                </ThemedText>
              </Pressable>
            ))}
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
      </ThemedView>
    </>
  );
}
