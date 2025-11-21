import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';

type Props = { label: string; value: string; sub?: string; color?: string };

export function Stat({ label, value, sub, color }: Props) {
  return (
    <Card style={{ flex: 1 }}>
      <ThemedText style={{ opacity: 0.8 }}>{label}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <ThemedText type="title" style={{ color }}>{value}</ThemedText>
        {sub ? <ThemedText style={{ marginLeft: 8, opacity: 0.7 }}>{sub}</ThemedText> : null}
      </View>
    </Card>
  );
}


