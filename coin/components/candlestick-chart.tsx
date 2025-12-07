import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import Svg, { Line, Rect, Defs, LinearGradient, Stop, G, Circle } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type CandlestickData = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

type Props = {
  data: CandlestickData[];
  height?: number;
  width?: number;
  bullishColor?: string;
  bearishColor?: string;
  showGrid?: boolean;
  interactive?: boolean;
  onCandleSelect?: (candle: CandlestickData | null, index: number | null) => void;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

function CandlestickChart({ 
  data, 
  height = 300, 
  width = 350,
  bullishColor = '#10b981',
  bearishColor = '#ef4444',
  showGrid = true,
  interactive = true,
  onCandleSelect
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const opacity = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);

  if (!data || data.length === 0) {
    return <View style={{ height, width }} />;
  }

  const padding = { top: 0, bottom: 0, left: 0, right: 0 };
  const actualWidth = typeof width === 'number' ? width : Dimensions.get('window').width - 32;
  const chartWidth = actualWidth;
  const chartHeight = height;

  // Calculate price range with padding
  const allPrices = useMemo(() => {
    const prices: number[] = [];
    data.forEach(candle => {
      prices.push(candle.high, candle.low, candle.open, candle.close);
    });
    return prices;
  }, [data]);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const pricePadding = priceRange * 0.1; // 10% padding

  const minPriceScaled = minPrice - pricePadding;
  const maxPriceScaled = maxPrice + pricePadding;
  const scaledPriceRange = maxPriceScaled - minPriceScaled;

  // Calculate candle width
  const candleWidth = Math.max(2, (chartWidth / data.length) * 0.6);
  const candleSpacing = chartWidth / data.length;

  // Convert price to Y coordinate
  const priceToY = useCallback((price: number) => {
    return chartHeight - ((price - minPriceScaled) / scaledPriceRange) * chartHeight;
  }, [chartHeight, minPriceScaled, scaledPriceRange]);

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines = [];
    const gridCount = 4;
    
    // Horizontal lines (price levels)
    for (let i = 0; i <= gridCount; i++) {
      const price = minPriceScaled + (scaledPriceRange / gridCount) * i;
      const y = priceToY(price);
      lines.push(
        <Line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={actualWidth}
          y2={y}
          stroke="#9ca3af"
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="2,2"
        />
      );
    }
    
              // Vertical lines (time)
    const verticalCount = Math.min(5, data.length);
    for (let i = 0; i <= verticalCount; i++) {
      const index = Math.floor((data.length - 1) * (i / verticalCount));
      const x = (index * candleSpacing) + (candleSpacing / 2);
      lines.push(
        <Line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#9ca3af"
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="2,2"
        />
      );
    }
    
    return lines;
  }, [showGrid, padding, chartHeight, actualWidth, data.length, candleSpacing, minPriceScaled, scaledPriceRange, priceToY]);

  // Render candles - memoized for performance
  const candles = useMemo(() => {
    if (data.length === 0) return [];
    
    return data.map((candle, index) => {
      const x = (index * candleSpacing) + (candleSpacing / 2) - (candleWidth / 2);
      const isBullish = candle.close >= candle.open;
      const color = isBullish ? bullishColor : bearishColor;
      
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      
      const bodyTop = Math.min(openY, closeY);
      const bodyBottom = Math.max(openY, closeY);
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      return (
        <G key={index}>
          {/* Wick (shadow) */}
          <Line
            x1={x + candleWidth / 2}
            y1={highY}
            x2={x + candleWidth / 2}
            y2={lowY}
            stroke={color}
            strokeWidth="1.5"
            opacity={0.8}
          />
          {/* Body */}
          <Rect
            x={x}
            y={bodyTop}
            width={candleWidth}
            height={bodyHeight}
            fill={isBullish ? color : color}
            opacity={isBullish ? 0.9 : 0.9}
            stroke={color}
            strokeWidth="0.5"
          />
        </G>
      );
    });
  }, [data, candleSpacing, candleWidth, priceToY, bullishColor, bearishColor]);

  const handlePress = useCallback((event: any) => {
    if (!interactive) return;
    
    const { locationX } = event.nativeEvent;
    const relativeX = locationX;
    
    if (relativeX < 0 || relativeX > actualWidth) {
      setSelectedIndex(null);
      opacity.value = withSpring(0);
      onCandleSelect?.(null, null);
      return;
    }
    
    // Find closest candle
    const candleIndex = Math.round(relativeX / candleSpacing);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, candleIndex));
    
    if (clampedIndex >= 0 && clampedIndex < data.length) {
      const candle = data[clampedIndex];
      setSelectedIndex(clampedIndex);
      const x = (clampedIndex * candleSpacing) + (candleSpacing / 2);
      crosshairX.value = withSpring(x);
      crosshairY.value = withSpring(priceToY(candle.close));
      opacity.value = withSpring(1);
      onCandleSelect?.(candle, clampedIndex);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [interactive, data, candleSpacing, actualWidth, onCandleSelect, opacity, crosshairX, crosshairY, priceToY]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;
    setSelectedIndex(null);
    opacity.value = withSpring(0);
    onCandleSelect?.(null, null);
  }, [interactive, opacity, onCandleSelect]);

  const crosshairStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const selectedCandle = selectedIndex !== null && selectedIndex < data.length 
    ? data[selectedIndex] 
    : null;

  // Price labels - removed for better fit
  const priceLabels = useMemo(() => {
    return [];
  }, []);

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={handlePress}
        onPressOut={handlePressOut}
        style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}
      >
        <Svg height={height} width={actualWidth} style={{ margin: 0, padding: 0 }}>
          <Defs>
            <LinearGradient id="bullishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={bullishColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={bullishColor} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="bearishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={bearishColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={bearishColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {gridLines}
          
          {/* Candles */}
          {candles}
          
          {/* Selected candle indicator */}
          {selectedCandle && (
            <G style={crosshairStyle}>
              {/* Vertical crosshair */}
              <AnimatedLine
                x1={crosshairX}
                y1={0}
                x2={crosshairX}
                y2={height}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="4,4"
              />
              {/* Price indicator circle */}
              <AnimatedCircle
                cx={crosshairX}
                cy={crosshairY}
                r="4"
                fill={selectedCandle.close >= selectedCandle.open ? bullishColor : bearishColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </G>
          )}
        </Svg>
      </Pressable>
      
      {/* Price labels */}
      <View style={styles.priceLabelsContainer} pointerEvents="none">
        {priceLabels}
      </View>
      
      {/* Candle info tooltip */}
      {selectedCandle && interactive && (
        <Animated.View 
            style={[
            styles.tooltip,
            {
              left: Math.min(
                actualWidth - 140,
                Math.max(10, (selectedIndex! * candleSpacing) + (candleSpacing / 2) - 70)
              ),
              top: Math.min(
                height - 120,
                Math.max(10, priceToY(selectedCandle.close) - 60)
              ),
            },
            crosshairStyle
          ]}
        >
          <View style={[
            styles.tooltipContent,
            { backgroundColor: selectedCandle.close >= selectedCandle.open ? bullishColor : bearishColor }
          ]}>
            <Text style={styles.tooltipText}>
              O: ${selectedCandle.open.toFixed(selectedCandle.open < 1 ? 4 : 2)}
            </Text>
            <Text style={styles.tooltipText}>
              H: ${selectedCandle.high.toFixed(selectedCandle.high < 1 ? 4 : 2)}
            </Text>
            <Text style={styles.tooltipText}>
              L: ${selectedCandle.low.toFixed(selectedCandle.low < 1 ? 4 : 2)}
            </Text>
            <Text style={styles.tooltipText}>
              C: ${selectedCandle.close.toFixed(selectedCandle.close < 1 ? 4 : 2)}
            </Text>
            <Text style={[styles.tooltipText, { marginTop: 4, opacity: 0.9 }]}>
              Vol: {(selectedCandle.volume / 1_000_000).toFixed(2)}M
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
  },
  priceLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 80,
    height: '100%',
    pointerEvents: 'none',
  },
  priceLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
  },
  tooltipContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 1,
  },
});

// Memoize component for performance
export default memo(CandlestickChart);
export { CandlestickChart };

