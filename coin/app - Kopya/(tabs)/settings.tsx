import React, { useState } from 'react';
import { Pressable, View, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { useThemeStore } from '@/store/theme';
import { useSettingsStore } from '@/store/settings';
import { useThemeColor } from '@/hooks/use-theme-color';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [clearingCache, setClearingCache] = useState(false);

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
                key => !key.includes('theme-pref') && !key.includes('settings-store')
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

  return (
    <ThemedView style={{ flex: 1 }} safe edges={['top']}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={{ marginBottom: 8 }}>Ayarlar</ThemedText>
        <ThemedText style={{ marginBottom: 24, opacity: 0.7, fontSize: 14 }}>
          Uygulama tercihlerinizi buradan yönetebilirsiniz
        </ThemedText>

        {/* Tema Ayarları */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="theme-light-dark" size={24} color={tint as string} style={{ marginRight: 12 }} />
            <ThemedText type="subtitle">Tema</ThemedText>
          </View>
          <View style={{ gap: 8 }}>
            {(['light', 'dark', 'system'] as ThemePreference[]).map((pref) => (
              <Pressable
                key={pref}
                onPress={() => setThemePreference(pref)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
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
                    size={20}
                    color={text as string}
                    style={{ marginRight: 12, opacity: 0.7 }}
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

        {/* Para Birimi Ayarları */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="currency-usd" size={24} color={tint as string} style={{ marginRight: 12 }} />
            <ThemedText type="subtitle">Para Birimi</ThemedText>
          </View>
          <View style={{ gap: 8 }}>
            {currencies.map((curr) => (
              <Pressable
                key={curr.value}
                onPress={() => setCurrency(curr.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: currency === curr.value ? cardBg as string : 'transparent',
                  borderWidth: currency === curr.value ? 1 : 0,
                  borderColor: tint as string,
                  opacity: currency === curr.value ? 1 : 0.8,
                }}
              >
                <ThemedText style={{ fontSize: 15 }}>{curr.label}</ThemedText>
                {currency === curr.value && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={tint as string} />
                )}
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Bildirimler */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={tint as string} style={{ marginRight: 12 }} />
            <ThemedText type="subtitle">Bildirimler</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 15, marginBottom: 4 }}>Bildirimleri Etkinleştir</ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                Fiyat değişiklikleri ve güncellemeler hakkında bildirim alın
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: muted as string, true: tint as string }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ height: 1, backgroundColor: border as string, marginVertical: 12, opacity: 0.3 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 15, marginBottom: 4 }}>Fiyat Uyarıları</ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                Belirlediğiniz fiyat seviyelerine ulaşıldığında bildirim alın
              </ThemedText>
            </View>
            <Switch
              value={priceAlertsEnabled}
              onValueChange={setPriceAlertsEnabled}
              trackColor={{ false: muted as string, true: tint as string }}
              thumbColor="#fff"
              disabled={!notificationsEnabled}
            />
          </View>
        </Card>

        {/* Önbellek ve Veriler */}
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

        {/* Hakkında */}
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

        {/* Yasal ve Destek */}
        <Card>
          <View style={{ gap: 12 }}>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={text as string} style={{ marginRight: 12, opacity: 0.7 }} />
                <ThemedText style={{ fontSize: 15 }}>Gizlilik Politikası</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={text as string} style={{ opacity: 0.5 }} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: border as string, opacity: 0.3 }} />
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialCommunityIcons name="file-document-outline" size={20} color={text as string} style={{ marginRight: 12, opacity: 0.7 }} />
                <ThemedText style={{ fontSize: 15 }}>Kullanım Koşulları</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={text as string} style={{ opacity: 0.5 }} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: border as string, opacity: 0.3 }} />
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialCommunityIcons name="help-circle-outline" size={20} color={text as string} style={{ marginRight: 12, opacity: 0.7 }} />
                <ThemedText style={{ fontSize: 15 }}>Yardım & Destek</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={text as string} style={{ opacity: 0.5 }} />
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}
