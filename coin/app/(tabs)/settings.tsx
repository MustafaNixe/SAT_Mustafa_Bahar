import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';

export default function SettingsScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16, gap: 16 }}>
      <ThemedText type="title">Ayarlar</ThemedText>

      <Card>
        <ThemedText type="subtitle">Tema</ThemedText>
        <ThemedText style={{ marginTop: 4 }}>Uygulama koyu tema ile çalışır.</ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">Para Birimi</ThemedText>
        <ThemedText style={{ marginTop: 4 }}>USDT (varsayılan)</ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">Hakkında</ThemedText>
        <ThemedText style={{ marginTop: 4 }}>Coin Portföy Uygulaması</ThemedText>
        <ThemedText>Sürüm 1.0.0</ThemedText>
      </Card>

      <Card>
        <Pressable onPress={() => alert('Önbellek temizlendi') }>
          <ThemedText style={{ color: '#93c5fd' }}>Önbelleği Temizle</ThemedText>
        </Pressable>
      </Card>
    </ThemedView>
  );
}


