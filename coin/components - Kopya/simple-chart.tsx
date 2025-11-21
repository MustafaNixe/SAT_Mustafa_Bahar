import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  height?: number;
  width?: number;
  color?: string;
  showGradient?: boolean;
  showDots?: boolean;
};

function SimpleChart({ 
  data, 
  height = 250, 
  width = 350,
  color = '#10b981',
  showGradient = false,
  showDots = false
}: Props) {
  if (!data || data.length === 0) {
    return <View style={{ height, width }} />;
  }

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate min/max for scaling
  const minY = Math.min(...data.map(p => p.y));
  const maxY = Math.max(...data.map(p => p.y));
  const rangeY = maxY - minY || 1;
  
  const minX = Math.min(...data.map(p => p.x));
  const maxX = Math.max(...data.map(p => p.x));
  const rangeX = maxX - minX || 1;

  // Convert data points to SVG coordinates
  const points = data.map((point, index) => {
    const x = padding + ((point.x - minX) / rangeX) * chartWidth;
    const y = padding + chartHeight - ((point.y - minY) / rangeY) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Create gradient polygon for fill (area under curve)
  const gradientPolygonPoints = [
    ...data.map((point) => {
      const x = padding + ((point.x - minX) / rangeX) * chartWidth;
      const y = padding + chartHeight - ((point.y - minY) / rangeY) * chartHeight;
      return `${x},${y}`;
    }),
    // Add bottom corners to close the polygon
    `${padding + ((data[data.length - 1].x - minX) / rangeX) * chartWidth},${padding + chartHeight}`,
    `${padding + ((data[0].x - minX) / rangeX) * chartWidth},${padding + chartHeight}`,
  ].join(' ');

  return (
    <View style={styles.container}>
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {showGradient && (
          <Polygon
            points={gradientPolygonPoints}
            fill="url(#gradient)"
            stroke="none"
          />
        )}
        
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {showDots && data.map((point, index) => {
          const x = padding + ((point.x - minX) / rangeX) * chartWidth;
          const y = padding + chartHeight - ((point.y - minY) / rangeY) * chartHeight;
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SimpleChart;
export { SimpleChart };

