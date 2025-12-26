import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions, Platform } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Defs, LinearGradient, Stop, Line, G } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  height?: number;
  width?: number | string;
  color?: string;
  showGradient?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  interactive?: boolean;
  onPointSelect?: (point: Point | null) => void;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

function SimpleChart({ 
  data, 
  height = 250, 
  width = 350,
  color = '#10b981',
  showGradient = true,
  showDots = false,
  showGrid = true,
  interactive = true,
  onPointSelect
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const opacity = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);

  if (!data || data.length === 0) {
    return <View style={{ height, width }} />;
  }

  const padding = 0;
  const actualWidth = typeof width === 'number' ? width : Dimensions.get('window').width - 32;
  const chartWidth = actualWidth;
  const chartHeight = height;

  // Calculate min/max for scaling with padding
  const minY = Math.min(...data.map(p => p.y));
  const maxY = Math.max(...data.map(p => p.y));
  const rangeY = maxY - minY || 1;
  const yPadding = rangeY * 0.1; // 10% padding for better visualization
  
  const minX = Math.min(...data.map(p => p.x));
  const maxX = Math.max(...data.map(p => p.x));
  const rangeX = maxX - minX || 1;

  // Convert data points to SVG coordinates
  const svgPoints = useMemo(() => {
    return data.map((point) => {
      const x = ((point.x - minX) / rangeX) * chartWidth;
      const y = chartHeight - ((point.y - minY + yPadding) / (rangeY + yPadding * 2)) * chartHeight;
      return { x, y, original: point };
    });
  }, [data, minX, maxX, minY, maxY, rangeX, rangeY, chartWidth, chartHeight, yPadding]);

  const points = svgPoints.map(p => `${p.x},${p.y}`).join(' ');


  // Create gradient polygon for fill
  const gradientPolygonPoints = useMemo(() => {
    const points = svgPoints.map(p => `${p.x},${p.y}`).join(' ');
    const firstX = svgPoints[0].x;
    const lastX = svgPoints[svgPoints.length - 1].x;
    const bottomY = chartHeight;
    return `${points} ${lastX},${bottomY} ${firstX},${bottomY}`;
  }, [svgPoints, chartHeight]);

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines = [];
    const gridCount = 4;
    
              // Horizontal lines
    for (let i = 0; i <= gridCount; i++) {
      const y = padding + (chartHeight / gridCount) * i;
      lines.push(
        <Line
          key={`h-${i}`}
          x1={padding}
          y1={y}
          x2={actualWidth - padding}
          y2={y}
          stroke={color}
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="2,2"
        />
      );
    }
    
    // Vertical lines
    for (let i = 0; i <= gridCount; i++) {
      const x = padding + (chartWidth / gridCount) * i;
      lines.push(
        <Line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke={color}
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="2,2"
        />
      );
    }
    
    return lines;
  }, [showGrid, padding, chartWidth, chartHeight, actualWidth, color]);

  const handlePress = useCallback((event: any) => {
    if (!interactive) return;
    
    const { locationX } = event.nativeEvent;
    const relativeX = locationX;
    
    if (relativeX < 0 || relativeX > actualWidth) {
      setSelectedIndex(null);
      opacity.value = withSpring(0);
      onPointSelect?.(null);
      return;
    }
    
      // Find closest point
      const normalizedX = relativeX / actualWidth;
    const dataIndex = Math.round(normalizedX * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, dataIndex));
    
    if (clampedIndex >= 0 && clampedIndex < svgPoints.length) {
      const point = svgPoints[clampedIndex];
      setSelectedIndex(clampedIndex);
      crosshairX.value = withSpring(point.x);
      crosshairY.value = withSpring(point.y);
      opacity.value = withSpring(1);
      onPointSelect?.(data[clampedIndex]);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [interactive, data, svgPoints, actualWidth, onPointSelect, opacity, crosshairX, crosshairY]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;
    setSelectedIndex(null);
    opacity.value = withSpring(0);
    onPointSelect?.(null);
  }, [interactive, opacity, onPointSelect]);

  const crosshairStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const selectedPoint = selectedIndex !== null && selectedIndex < svgPoints.length 
    ? svgPoints[selectedIndex] 
    : null;

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={handlePress}
        onPressOut={handlePressOut}
        style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}
      >
        <Svg height={height} width={actualWidth} style={{ margin: 0, padding: 0 }}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="50%" stopColor={color} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={color} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {gridLines}
          
          {/* Gradient fill */}
          {showGradient && (
            <Polygon
              points={gradientPolygonPoints}
              fill="url(#gradient)"
              stroke="none"
            />
          )}
          
          {/* Main line - using smooth path */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="1"
          />
          
          {/* Selected point indicator */}
          {selectedPoint && (
            <G style={crosshairStyle}>
              {/* Vertical crosshair line */}
              <AnimatedLine
                x1={crosshairX}
                y1={0}
                x2={crosshairX}
                y2={chartHeight}
                stroke={color}
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="4,4"
              />
              {/* Point circle */}
              <AnimatedCircle
                cx={crosshairX}
                cy={crosshairY}
                r="5"
                fill={color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </G>
          )}
          
          {/* Dots on data points */}
          {showDots && svgPoints.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              opacity={selectedIndex === index ? 1 : 0.6}
            />
          ))}
        </Svg>
      </Pressable>
      
      {/* Price indicator */}
      {selectedPoint && interactive && (
        <Animated.View 
          style={[
            styles.priceIndicator,
            {
              left: Math.min(actualWidth - 80, Math.max(10, selectedPoint.x - 40)),
              top: selectedPoint.y - 35,
            },
            crosshairStyle
          ]}
        >
          <View style={[styles.priceBubble, { backgroundColor: color }]}>
            <Text style={styles.priceText}>
              ${selectedPoint.original.y.toFixed(selectedPoint.original.y < 1 ? 4 : 2)}
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
  priceIndicator: {
    position: 'absolute',
    zIndex: 10,
  },
  priceBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  priceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SimpleChart;
export { SimpleChart };

