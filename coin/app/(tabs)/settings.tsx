import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pressable, View, ScrollView, Switch, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
import { ThemedView } from '@/components/ui/themed-view';
import { Card } from '@/components/ui/card';
import { useThemeStore } from '@/store/theme';
import { useSettingsStore } from '@/store/settings';
import { useAuthStore } from '@/store/auth';
import { usePortfolioStore } from '@/store/portfolio';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CoinAvatar } from '@/components/ui/coin-avatar';
import { fetch24hTickersUSDT } from '@/services/binance';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

type ThemePreference = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const priceAlertsEnabled = useSettingsStore((s) => s.priceAlertsEnabled);
  const setPriceAlertsEnabled = useSettingsStore((s) => s.setPriceAlertsEnabled);
  const hapticFeedback = useSettingsStore((s) => s.hapticFeedback);
  const setHapticFeedback = useSettingsStore((s) => s.setHapticFeedback);
  const dataSaverMode = useSettingsStore((s) => s.dataSaverMode);
  const setDataSaverMode = useSettingsStore((s) => s.setDataSaverMode);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const [clearingCache, setClearingCache] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draft, setDraft] = useState({ symbol: '', amount: '', buy: '' });
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [availableCoins, setAvailableCoins] = useState<Record<string, { price: number; changePct: number; volumeQ?: number }>>({});
  const [loadingCoins, setLoadingCoins] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const items = usePortfolioStore((s) => s.items);
  const addOrUpdate = usePortfolioStore((s) => s.addOrUpdate);
  const remove = usePortfolioStore((s) => s.remove);
  const danger = useThemeColor({}, 'danger');

  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');

  const currencies: Array<{ value: 'USDT' | 'BTC' | 'ETH' | 'TRY'; label: string }> = [
    { value: 'USDT', label: 'USDT (Tether)' },
    { value: 'BTC', label: 'BTC (Bitcoin)' },
    { value: 'ETH', label: 'ETH (Ethereum)' },
    { value: 'TRY', label: 'TRY (Türk Lirası)' },
  ];

  const handleClearCache = async () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Tüm önbellek verileri temizlenecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              // Clear all AsyncStorage data except theme and settings
              const keys = await AsyncStorage.getAllKeys();
              const keysToRemove = keys.filter(
                key => !key.includes('theme-pref') && !key.includes('settings-store') && !key.includes('auth-store')
              );
              await AsyncStorage.multiRemove(keysToRemove);
              
              Alert.alert('Başarılı', 'Önbellek başarıyla temizlendi.');
            } catch (error) {
              Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleExportPortfolio = async () => {
    setExporting(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        items: items,
        version: '1.0.0',
      };
      const json = JSON.stringify(data, null, 2);
      console.log('Portföy Export:', json);
      Alert.alert(
        'Portföy Dışa Aktarıldı',
        `Portföy verileriniz konsola yazdırıldı. JSON formatında ${items.length} coin içeriyor.`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      Alert.alert('Hata', 'Portföy dışa aktarılırken bir hata oluştu.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportPortfolio = () => {
    Alert.alert(
      'Portföy İçe Aktar',
      'Bu özellik yakında eklenecek. Şimdilik portföyünüzü manuel olarak ekleyebilirsiniz.',
      [{ text: 'Tamam' }]
    );
  };


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
        .slice(0, 50);
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

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setTimeout(() => {
                router.replace('/login');
              }, 200);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: IS_SMALL_SCREEN ? 12 : 16, 
          paddingBottom: 100
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText 
          type="title" 
          style={{ 
            marginBottom: IS_SMALL_SCREEN ? 6 : 8,
            fontSize: IS_SMALL_SCREEN ? 22 : 24,
          }}
        >
          Ayarlar
        </ThemedText>
        <ThemedText style={{ 
          marginBottom: IS_SMALL_SCREEN ? 20 : 24, 
          opacity: 0.7, 
          fontSize: IS_SMALL_SCREEN ? 13 : 14 
        }}>
          Uygulama tercihlerinizi buradan yönetebilirsiniz
        </ThemedText>

        {user && (
          <Card style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: IS_SMALL_SCREEN ? 12 : 16 
            }}>
              <MaterialCommunityIcons 
                name="account-circle" 
                size={IS_SMALL_SCREEN ? 20 : 24} 
                color={tint as string} 
                style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12 }} 
              />
              <ThemedText 
                type="subtitle"
                style={{ fontSize: IS_SMALL_SCREEN ? 15 : 16 }}
              >
                Hesap
              </ThemedText>
            </View>
            <View style={{ gap: IS_SMALL_SCREEN ? 10 : 12 }}>
              <View>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                  opacity: 0.7, 
                  marginBottom: 4 
                }}>
                  Kullanıcı Adı
                </ThemedText>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 14 : 15, 
                  fontWeight: '600' 
                }}>
                  {user.username}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={{ 
                  fontSize: IS_SMALL_SCREEN ? 11 : 12, 
                  opacity: 0.7, 
                  marginBottom: 4 
                }}>
                  E-posta
                </ThemedText>
                <ThemedText 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={{ 
                    fontSize: IS_SMALL_SCREEN ? 14 : 15, 
                    fontWeight: '600' 
                  }}
                >
                  {user.email}
                </ThemedText>
              </View>
            </View>
          </Card>
        )}

        <Card style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: IS_SMALL_SCREEN ? 12 : 16 
          }}>
            <MaterialCommunityIcons 
              name="theme-light-dark" 
              size={IS_SMALL_SCREEN ? 20 : 24} 
              color={tint as string} 
              style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12 }} 
            />
            <ThemedText 
              type="subtitle"
              style={{ fontSize: IS_SMALL_SCREEN ? 15 : 16 }}
            >
              Tema
            </ThemedText>
          </View>
          <View style={{ gap: IS_SMALL_SCREEN ? 6 : 8 }}>
            {(['light', 'dark', 'system'] as ThemePreference[]).map((pref) => (
              <Pressable
                key={pref}
                onPress={() => setThemePreference(pref)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
                  paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                  borderRadius: 8,
                  backgroundColor: themePreference === pref ? cardBg as string : 'transparent',
                  borderWidth: themePreference === pref ? 1 : 0,
                  borderColor: tint as string,
                  opacity: themePreference === pref ? 1 : 0.8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons
                    name={
                      pref === 'light' ? 'weather-sunny' :
                      pref === 'dark' ? 'weather-night' :
                      'cellphone'
                    }
                    size={IS_SMALL_SCREEN ? 18 : 20}
                    color={text as string}
                    style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12, opacity: 0.7 }}
                  />
                  <ThemedText style={{ fontSize: 15 }}>
                    {pref === 'light' ? 'Açık Tema' :
                     pref === 'dark' ? 'Koyu Tema' :
                     'Sistem Ayarları'}
                  </ThemedText>
                </View>
                {themePreference === pref && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={tint as string} />
                )}
              </Pressable>
            ))}
          </View>

        </Card>
        <Card style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: IS_SMALL_SCREEN ? 12 : 16 
          }}>
            <MaterialCommunityIcons 
              name="wallet" 
              size={IS_SMALL_SCREEN ? 20 : 24} 
              color={tint as string} 
              style={{ marginRight: IS_SMALL_SCREEN ? 10 : 12 }} 
            />
            <ThemedText type="subtitle">Portföy Yönetimi</ThemedText>
          </View>
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: tint as string,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialCommunityIcons name="plus-circle" size={20} color="#ffffff" style={{ marginRight: 12 }} />
                <ThemedText style={{ fontSize: 15, color: '#ffffff', fontWeight: '600' }}>
                  Coin Ekle
                </ThemedText>
              </View>
            </Pressable>
            {items.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: border as string, opacity: 0.3 }} />
                {items.map((item) => {
                  const coinName = item.symbol.replace('USDT', '');
                  return (
                    <View key={item.symbol} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: cardBg as string,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <CoinAvatar symbol={item.symbol} size={32} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <ThemedText style={{ fontSize: 15, fontWeight: '600' }}>{coinName}</ThemedText>
                          <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                            {item.amount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {coinName}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => onRemove(item.symbol)}
                        style={{ padding: 8 }}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={20} color={danger as string} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
            <View style={{ height: 1, backgroundColor: border as string, opacity: 0.3 }} />
            <Pressable
              onPress={handleExportPortfolio}
              disabled={exporting || items.length === 0}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                opacity: (exporting || items.length === 0) ? 0.5 : 1,
              }}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 15, marginBottom: 4, color: items.length === 0 ? muted as string : tint as string }}>
                  Portföyü Dışa Aktar
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                  Portföyünüzü JSON dosyası olarak kaydedin
                </ThemedText>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color={tint as string} />
              ) : (
                <MaterialCommunityIcons name="download-outline" size={20} color={tint as string} />
              )}
            </Pressable>
            <View style={{ height: 1, backgroundColor: border as string, opacity: 0.3 }} />
            <Pressable
              onPress={handleImportPortfolio}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 15, marginBottom: 4, color: tint as string }}>
                  Portföyü İçe Aktar
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                  Kaydedilmiş portföy dosyasını yükleyin
                </ThemedText>
              </View>
              <MaterialCommunityIcons name="upload-outline" size={20} color={tint as string} />
            </Pressable>
          </View>
        </Card>

        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ThemedView style={{ flex: 1 }} safe edges={['top']}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: IS_SMALL_SCREEN ? 12 : 16, 
                borderBottomWidth: 1, 
                borderBottomColor: border as string 
              }}>
                <ThemedText 
                  type="title"
                  style={{ fontSize: IS_SMALL_SCREEN ? 20 : 24 }}
                >
                  Coin Ekle
                </ThemedText>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <MaterialCommunityIcons 
                    name="close" 
                    size={IS_SMALL_SCREEN ? 20 : 24} 
                    color={text as string} 
                  />
                </Pressable>
              </View>

              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ padding: IS_SMALL_SCREEN ? 12 : 16 }}
              >
                <View style={{ marginBottom: IS_SMALL_SCREEN ? 12 : 16 }}>
                  <ThemedText style={{ 
                    fontSize: IS_SMALL_SCREEN ? 13 : 14, 
                    marginBottom: IS_SMALL_SCREEN ? 6 : 8, 
                    opacity: 0.7 
                  }}>
                    Coin Ara
                  </ThemedText>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: cardBg as string,
                    borderWidth: 1,
                    borderColor: border as string,
                    borderRadius: 12,
                    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
                    height: IS_SMALL_SCREEN ? 40 : 44,
                    marginBottom: IS_SMALL_SCREEN ? 12 : 16,
                  }}>
                    <MaterialCommunityIcons 
                      name="magnify" 
                      size={IS_SMALL_SCREEN ? 18 : 20} 
                      color={muted as string} 
                      style={{ marginRight: IS_SMALL_SCREEN ? 6 : 8 }} 
                    />
                    <TextInput
                      placeholder="BTC, ETH, vb."
                      placeholderTextColor={muted as string}
                      value={coinSearchQuery}
                      onChangeText={setCoinSearchQuery}
                      style={{
                        flex: 1,
                        color: text as string,
                        fontSize: IS_SMALL_SCREEN ? 13 : 14,
                      }}
                    />
                  </View>

                  {loadingCoins ? (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                      <ActivityIndicator />
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 200 }}>
                      {filteredCoins.map((coin) => {
                        const coinName = coin.symbol.replace('USDT', '');
                        return (
                          <Pressable
                            key={coin.symbol}
                            onPress={() => onCoinSelect(coin.symbol, coin.price)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 12,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              marginBottom: 4,
                              backgroundColor: draft.symbol.toUpperCase() === coinName ? tint as string : cardBg as string,
                            }}
                          >
                            <CoinAvatar symbol={coin.symbol} size={32} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <ThemedText style={{ fontSize: 15, fontWeight: '600', color: draft.symbol.toUpperCase() === coinName ? '#ffffff' : text as string }}>
                                {coinName}
                              </ThemedText>
                              <ThemedText style={{ fontSize: 12, opacity: 0.7, color: draft.symbol.toUpperCase() === coinName ? '#ffffff' : text as string }}>
                                ${coin.price.toFixed(coin.price < 1 ? 4 : 2)}
                              </ThemedText>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <View style={{ marginBottom: 16 }}>
                  <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Coin Sembolü</ThemedText>
                  <TextInput
                    placeholder="BTC"
                    placeholderTextColor={muted as string}
                    value={draft.symbol}
                    onChangeText={(text) => setDraft({ ...draft, symbol: text })}
                    style={{
                      backgroundColor: cardBg as string,
                      borderWidth: 1,
                      borderColor: border as string,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      color: text as string,
                      fontSize: 15,
                    }}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Miktar</ThemedText>
                  <TextInput
                    placeholder="0.5"
                    placeholderTextColor={muted as string}
                    value={draft.amount}
                    onChangeText={(text) => setDraft({ ...draft, amount: text })}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: cardBg as string,
                      borderWidth: 1,
                      borderColor: border as string,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      color: text as string,
                      fontSize: 15,
                    }}
                  />
                </View>

                <View style={{ marginBottom: 24 }}>
                  <ThemedText style={{ fontSize: 14, marginBottom: 8, opacity: 0.7 }}>Alış Fiyatı (USDT)</ThemedText>
                  <TextInput
                    placeholder="60000"
                    placeholderTextColor={muted as string}
                    value={draft.buy}
                    onChangeText={(text) => setDraft({ ...draft, buy: text })}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: cardBg as string,
                      borderWidth: 1,
                      borderColor: border as string,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      color: text as string,
                      fontSize: 15,
                    }}
                  />
                </View>

                <Pressable
                  onPress={onAdd}
                  style={{
                    backgroundColor: tint as string,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                    Ekle
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </ThemedView>
          </KeyboardAvoidingView>
        </Modal>

        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="database-outline" size={24} color={tint as string} style={{ marginRight: 12 }} />
            <ThemedText type="subtitle">Veri Yönetimi</ThemedText>
          </View>
          <Pressable
            onPress={handleClearCache}
            disabled={clearingCache}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 8,
              opacity: clearingCache ? 0.5 : 1,
            }}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 15, marginBottom: 4, color: clearingCache ? muted as string : tint as string }}>
                Önbelleği Temizle
              </ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                Geçici verileri temizle (tema ve ayarlar korunur)
              </ThemedText>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color={tint as string} />
            ) : (
              <MaterialCommunityIcons name="delete-outline" size={20} color={tint as string} />
            )}
          </Pressable>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="information-outline" size={24} color={tint as string} style={{ marginRight: 12 }} />
            <ThemedText type="subtitle">Hakkında</ThemedText>
          </View>
          <View style={{ gap: 12 }}>
            <View>
              <ThemedText style={{ fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Coin Portföy Uygulaması</ThemedText>
              <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>
                Kripto para portföyünüzü takip edin ve yönetin
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: border as string, opacity: 0.3 }}>
              <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>Sürüm</ThemedText>
              <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>1.0.0</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>Build</ThemedText>
              <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>2024.01</ThemedText>
            </View>
          </View>
        </Card>
        <Card>
          <Pressable
            onPress={handleLogout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
            }}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 12 }} />
            <ThemedText style={{ fontSize: 15, color: '#ef4444', fontWeight: '600' }}>
              Çıkış Yap
            </ThemedText>
          </Pressable>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}
