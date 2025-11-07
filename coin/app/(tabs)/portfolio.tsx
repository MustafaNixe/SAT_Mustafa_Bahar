import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePortfolioStore, calculateTotals } from '@/store/portfolio';
import { fetchAllUSDTPrices, fetchKlines, fetch24hTickersUSDT } from '@/services/binance';
import { startUSDTSpotMiniTicker } from '@/services/realtime';
import { CoinAvatar } from '@/components/coin-avatar';
import { SimpleChart } from '@/components/simple-chart';
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
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
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

  // Load portfolio chart data
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
        const points: { x: number; y: number }[] = [];
        
        // Calculate portfolio value for each point in time
        for (let i = 0; i < params.limit; i++) {
          let totalValue = 0;
          for (const item of items) {
            try {
              const klines = await fetchKlines(item.symbol, params.interval, params.limit);
              if (klines.length > i) {
                const historicalPrice = Number(klines[klines.length - 1 - i]?.close) || 0;
                totalValue += item.amount * historicalPrice;
              }
            } catch {}
          }
          if (totalValue > 0) {
            points.push({ x: i, y: totalValue });
          }
        }
        
        if (!active) return;
        setChartData(points.reverse());
      } catch (err) {
        console.error('Error loading chart:', err);
      } finally {
        if (active) {
          setLoadingChart(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [items, timePeriod, prices]);

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
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Link href={{ pathname: '/coin/[symbol]', params: { symbol: item.symbol } }} asChild>
          <Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <CoinAvatar symbol={item.symbol} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                  {coinName}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
                  ${item.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove(item.symbol);
                }}
                style={{ padding: 8 }}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color={danger as string} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View>
                <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Değer</ThemedText>
                <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                  ${item.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Miktar</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                  {item.amount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {coinName}
                </ThemedText>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: border as string,
            }}>
              <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>Kar/Zarar</ThemedText>
              <View style={{
                backgroundColor: isPositive ? (success as string) : (danger as string),
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}>
                <ThemedText style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
          {/* Portfolio Value */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <ThemedText style={{ fontSize: 14, opacity: 0.6, marginBottom: 8 }}>Toplam Portföy Değeri</ThemedText>
            <ThemedText type="title" style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 12 }}>
              ${totals.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </ThemedText>
            <View style={{
              backgroundColor: totals.pnl >= 0 ? (success as string) : (danger as string),
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <ThemedText style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                {totals.pnl >= 0 ? '▲' : '▼'} ${Math.abs(totals.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </ThemedText>
            </View>
          </View>

          {/* Chart */}
          <View style={{
            height: 200,
            backgroundColor: cardBg as string,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}>
            {loadingChart ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ opacity: 0.6 }}>Grafik yükleniyor...</ThemedText>
              </View>
            ) : chartData.length > 0 ? (
              <SimpleChart
                data={chartData}
                height={176}
                width={300}
                color={totals.pnl >= 0 ? success : danger}
                showGradient={true}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText style={{ opacity: 0.6 }}>Grafik verisi yok</ThemedText>
              </View>
            )}
          </View>

          {/* Time Period Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['24H', '1W', '1M', '1Y', 'MAX'] as TimePeriod[]).map((period) => (
              <Pressable
                key={period}
                onPress={() => setTimePeriod(period)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: timePeriod === period ? (tint as string) : 'transparent',
                  borderWidth: timePeriod === period ? 0 : 1,
                  borderColor: border as string,
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{
                  fontSize: 12,
                  fontWeight: timePeriod === period ? '600' : '400',
                  color: timePeriod === period ? '#ffffff' : (text as string),
                }}>
                  {period}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Holdings List */}
        <View style={{ paddingHorizontal: 16 }}>
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

        {/* Add Coin Button */}
        <View style={{ padding: 16, paddingBottom: 32 }}>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: tint as string,
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              + Coin Ekle
            </ThemedText>
          </Pressable>
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
                    return (
                      <View key={item.symbol}>
                        <Pressable
                          onPress={() => onCoinSelect(item.symbol, item.price)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
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
