import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions, Platform } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Line, G, Circle, Polyline, Polygon } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Point = { x: number; y: number; date?: string; isInvestment?: boolean };

type Props = {
  data: Point[];
  height?: number;
  width?: number | string;
  bullishColor?: string;
  bearishColor?: string;
  showGrid?: boolean;
  interactive?: boolean;
  onPointSelect?: (point: Point | null) => void;
  investedValue?: number; // Total invested to determine profit/loss
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function PortfolioChart({ 
  data, 
  height = 300, 
  width = 350,
  bullishColor = '#10b981',
  bearishColor = '#ef4444',
  showGrid = true,
  interactive = true,
  onPointSelect,
  investedValue = 0
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const opacity = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(0);

  if (!data || data.length === 0) {
    return <View style={{ height, width }} />;
  }

  const labelAreaWidth = 70; // Space reserved for Y-axis labels on the left
  const padding = { top: 10, bottom: 30, left: labelAreaWidth, right: 12 }; // Left padding for label area, right padding for spacing
  // Calculate actual width - container has 16px padding on each side (32px total)
  // When width is "100%", we need to account for container padding
  const containerPadding = 32; // 16px padding on each side of the chart container
  const actualWidth = typeof width === 'number' 
    ? width - containerPadding // Subtract container padding if width is a number
    : Dimensions.get('window').width - 32 - containerPadding; // Screen width - screen padding (32) - container padding (32)
  const chartWidth = actualWidth - padding.left - padding.right; // Chart width excluding label area and right padding
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate value range with padding
  const allValues = data.map(p => p.y);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue || 1;
  const valuePadding = valueRange * 0.1; // 10% padding

  const minValueScaled = minValue - valuePadding;
  const maxValueScaled = maxValue + valuePadding;
  const scaledValueRange = maxValueScaled - minValueScaled;

  // Convert value to Y coordinate
  const valueToY = useCallback((value: number) => {
    return padding.top + chartHeight - ((value - minValueScaled) / scaledValueRange) * chartHeight;
  }, [padding.top, chartHeight, minValueScaled, scaledValueRange]);

  // Calculate bar width
  const barWidth = Math.max(4, (chartWidth / data.length) * 0.7);
  const barSpacing = chartWidth / data.length;

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines = [];
    const gridCount = 4;
    
    // Horizontal lines (value levels) - start from padding.left (label area)
    for (let i = 0; i <= gridCount; i++) {
      const value = minValueScaled + (scaledValueRange / gridCount) * i;
      const y = valueToY(value);
      lines.push(
        <Line
          key={`h-${i}`}
          x1={padding.left}
          y1={y}
          x2={actualWidth - padding.right}
          y2={y}
          stroke="#9ca3af"
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="2,2"
        />
      );
    }
    
    return lines;
  }, [showGrid, actualWidth, minValueScaled, scaledValueRange, valueToY, padding.left, padding.right]);

  // Render bars (daily chart style)
  const bars = useMemo(() => {
    if (data.length === 0) return [];
    
    return data.map((point, index) => {
      // X position starts from padding.left (label area)
      const x = padding.left + (index * barSpacing) + (barSpacing / 2) - (barWidth / 2);
      const barHeight = chartHeight - (valueToY(point.y) - padding.top);
      const barY = valueToY(point.y);
      
      // Determine color based on profit/loss
      const isProfit = investedValue > 0 ? point.y >= investedValue : true;
      const color = isProfit ? bullishColor : bearishColor;
      
      // Check if this is an investment point (when money was added)
      const isInvestment = point.isInvestment || false;
      
      return (
        <G key={index}>
          {/* Bar */}
          <Rect
            x={x}
            y={barY}
            width={barWidth}
            height={Math.max(2, barHeight)}
            fill={color}
            opacity={selectedIndex === index ? 1 : 0.7}
            rx={2}
            ry={2}
          />
          
          {/* Investment indicator (small dot on top) */}
          {isInvestment && (
            <Circle
              cx={x + barWidth / 2}
              cy={barY - 3}
              r="3"
              fill={bullishColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          )}
        </G>
      );
    });
  }, [data, barSpacing, barWidth, chartHeight, padding.top, padding.left, valueToY, bullishColor, bearishColor, investedValue, selectedIndex]);

  // Connect bars with line for smoother visualization
  const linePoints = useMemo(() => {
    if (data.length < 2) return '';
    
    const points: string[] = [];
    for (let i = 0; i < data.length; i++) {
      // X position starts from padding.left (label area)
      const x = padding.left + (i * barSpacing) + (barSpacing / 2);
      const y = valueToY(data[i].y);
      points.push(`${x},${y}`);
    }
    
    return points.join(' ');
  }, [data, barSpacing, valueToY, padding.left]);

  // Gradient fill polygon points
  const gradientPolygonPoints = useMemo(() => {
    if (data.length < 2) return '';
    const points: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (i * barSpacing) + (barSpacing / 2);
      const y = valueToY(data[i].y);
      points.push(`${x},${y}`);
    }
    const firstX = padding.left + (0 * barSpacing) + (barSpacing / 2);
    const lastX = padding.left + ((data.length - 1) * barSpacing) + (barSpacing / 2);
    const bottomY = padding.top + chartHeight;
    return `${points.join(' ')} ${lastX},${bottomY} ${firstX},${bottomY}`;
  }, [data, barSpacing, valueToY, padding.left, padding.top, chartHeight]);

  // Investment line (horizontal line showing invested value)
  const investmentLineY = useMemo(() => {
    if (investedValue <= 0) return null;
    if (investedValue < minValueScaled || investedValue > maxValueScaled) return null;
    return valueToY(investedValue);
  }, [investedValue, minValueScaled, maxValueScaled, valueToY]);

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
    
    // Adjust for label area (padding.left)
    const adjustedX = relativeX - padding.left;
    if (adjustedX < 0 || adjustedX > chartWidth) {
      setSelectedIndex(null);
      opacity.value = withSpring(0);
      onPointSelect?.(null);
      return;
    }
    
    // Find closest bar
    const barIndex = Math.round(adjustedX / barSpacing);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, barIndex));
    
    if (clampedIndex >= 0 && clampedIndex < data.length) {
      const point = data[clampedIndex];
      setSelectedIndex(clampedIndex);
      const x = padding.left + (clampedIndex * barSpacing) + (barSpacing / 2);
      crosshairX.value = withSpring(x);
      crosshairY.value = withSpring(valueToY(point.y));
      opacity.value = withSpring(1);
      onPointSelect?.(point);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [interactive, data, barSpacing, chartWidth, padding.left, onPointSelect, opacity, crosshairX, crosshairY, valueToY]);

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

  const selectedPoint = selectedIndex !== null && selectedIndex < data.length 
    ? data[selectedIndex] 
    : null;

  // Value labels on Y axis - positioned outside chart area
  const valueLabels = useMemo(() => {
    const labels = [];
    const labelCount = 4;
    for (let i = 0; i <= labelCount; i++) {
      const value = minValueScaled + (scaledValueRange / labelCount) * i;
      const y = valueToY(value);
      // Format value nicely
      let formattedValue = '';
      if (value >= 1000000) {
        formattedValue = `$${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        formattedValue = `$${(value / 1000).toFixed(value < 10000 ? 2 : 0)}K`;
      } else {
        formattedValue = `$${value.toFixed(2)}`;
      }
      
      labels.push(
        <Text
          key={i}
          style={[
            styles.valueLabel,
            { 
              top: y - 8, 
              left: 4, // Position at the very left, with small padding
              fontSize: 10,
              textAlign: 'left',
              width: labelAreaWidth - 8, // Use full label area width minus padding
            }
          ]}
        >
          {formattedValue}
        </Text>
      );
    }
    return labels;
  }, [minValueScaled, scaledValueRange, valueToY, labelAreaWidth]);

  // Total SVG width includes label area and chart area
  const svgWidth = actualWidth; // SVG width matches container width
  
  return (
    <View style={styles.container}>
      <Pressable 
        onPress={handlePress}
        onPressOut={handlePressOut}
        style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}
      >
        <Svg height={height} width={svgWidth} style={{ margin: 0, padding: 0 }}>
          <Defs>
            <LinearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={bullishColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={bullishColor} stopOpacity="0.1" />
            </LinearGradient>
            <LinearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={bearishColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={bearishColor} stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {gridLines}
          
          {/* Gradient fill under line */}
          {gradientPolygonPoints && (
            <Polygon
              points={gradientPolygonPoints}
              fill={investedValue > 0 && data[data.length - 1]?.y >= investedValue 
                ? "url(#profitGradient)" 
                : "url(#lossGradient)"}
              stroke="none"
            />
          )}
          
          {/* Investment line (horizontal line showing break-even point) */}
          {investmentLineY !== null && (
            <Line
              x1={padding.left}
              y1={investmentLineY}
              x2={actualWidth - padding.right}
              y2={investmentLineY}
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              strokeOpacity="0.5"
            />
          )}
          
          {/* Connecting line */}
          {linePoints && (
            <Polyline
              points={linePoints}
              fill="none"
              stroke={investedValue > 0 && data[data.length - 1]?.y >= investedValue ? bullishColor : bearishColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}
          
          {/* Bars */}
          {bars}
          
          {/* Selected bar indicator */}
          {selectedPoint && (
            <G style={crosshairStyle}>
              {/* Vertical crosshair */}
              <AnimatedRect
                x={crosshairX}
                y={padding.top}
                width="2"
                height={chartHeight}
                fill="#9ca3af"
                opacity="0.3"
              />
              {/* Value indicator circle */}
              <AnimatedRect
                x={crosshairX}
                y={crosshairY}
                width="6"
                height="6"
                fill={investedValue > 0 && selectedPoint.y >= investedValue ? bullishColor : bearishColor}
                stroke="#ffffff"
                strokeWidth="2"
                rx="3"
                ry="3"
              />
            </G>
          )}
        </Svg>
      </Pressable>
      
      {/* Value labels */}
      <View style={styles.valueLabelsContainer}>
        {valueLabels}
      </View>
      
      {/* Point info tooltip */}
      {selectedPoint && interactive && (
        <Animated.View 
          style={[
            styles.tooltip,
            {
              left: Math.min(
                svgWidth - 140,
                Math.max(padding.left + 10, padding.left + (selectedIndex! * barSpacing) + (barSpacing / 2) - 70)
              ),
              top: Math.min(
                height - 100,
                Math.max(10, valueToY(selectedPoint.y) - 50)
              ),
            },
            crosshairStyle
          ]}
        >
          <View style={[
            styles.tooltipContent,
            { 
              backgroundColor: investedValue > 0 && selectedPoint.y >= investedValue 
                ? bullishColor 
                : bearishColor 
            }
          ]}>
            <Text style={styles.tooltipText}>
              ${selectedPoint.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {selectedPoint.date && (
              <Text style={[styles.tooltipText, { marginTop: 4, opacity: 0.9, fontSize: 10 }]}>
                {selectedPoint.date}
              </Text>
            )}
            {selectedPoint.isInvestment && (
              <Text style={[styles.tooltipText, { marginTop: 2, opacity: 0.9, fontSize: 10 }]}>
                💰 Para Eklendi
              </Text>
            )}
            {investedValue > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.tooltipText, { opacity: 0.9, fontSize: 10 }]}>
                  {selectedPoint.y >= investedValue ? '✅ Kar' : '❌ Zarar'}
                </Text>
                <Text style={[styles.tooltipText, { marginTop: 2, opacity: 0.8, fontSize: 9 }]}>
                  Yatırım: ${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.tooltipText, { marginTop: 2, opacity: 0.8, fontSize: 9 }]}>
                  Fark: ${(selectedPoint.y - investedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
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
  valueLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 70,
    height: '100%',
    pointerEvents: 'none',
  },
  valueLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
    width: 65,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
  },
  tooltipContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  tooltipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default PortfolioChart;
export { PortfolioChart };

