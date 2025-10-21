import React from 'react';
import { View, Text, Image, ViewStyle, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassContainer } from './GlassContainer';
import { Colors, Sizes } from '../constants';
import { Coin } from '../types';

interface CoinCardProps {
  coin: Coin;
  style?: ViewStyle;
  onPress?: () => void;
}

export const CoinCard: React.FC<CoinCardProps> = ({ coin, style, onPress }) => {
  const isPositive = coin.priceChangePercentage24h >= 0;

  const CardContent = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: Colors.glass.medium,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Sizes.md,
        }}
      >
        <Image
          source={{ uri: coin.image }}
          style={{ width: 30, height: 30 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Sizes.fontSize.lg,
            fontWeight: '600',
          }}
        >
          {coin.name}
        </Text>
        <Text
          style={{
            color: Colors.text.secondary,
            fontSize: Sizes.fontSize.sm,
            textTransform: 'uppercase',
          }}
        >
          {coin.symbol}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Sizes.fontSize.md,
            fontWeight: '600',
          }}
        >
          ${coin.price.toLocaleString()}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Sizes.xs,
          }}
        >
          <LinearGradient
            colors={(isPositive ? Colors.gradient.success : Colors.gradient.error) as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingHorizontal: Sizes.sm,
              paddingVertical: Sizes.xs,
              borderRadius: Sizes.radius.sm,
            }}
          >
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Sizes.fontSize.xs,
                fontWeight: '600',
              }}
            >
              {isPositive ? '+' : ''}
              {coin.priceChangePercentage24h.toFixed(2)}%
            </Text>
          </LinearGradient>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        <GlassContainer
          style={StyleSheet.flatten([
            {
              marginBottom: Sizes.md,
              backgroundColor: Colors.glass.light,
            },
            style,
          ])}
        >
          {CardContent}
        </GlassContainer>
      </TouchableOpacity>
    );
  }

  return (
    <GlassContainer
      style={StyleSheet.flatten([
        {
          marginBottom: Sizes.md,
          backgroundColor: Colors.glass.light,
        },
        style,
      ])}
    >
      {CardContent}
    </GlassContainer>
  );
};