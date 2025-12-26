import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  autoColor?: boolean; // Automatically color based on trend
};

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20,
  color,
  showGradient = false,
  autoColor = true
}: Props) {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate min/max for scaling
  const minY = Math.min(...data.map(p => p.y));
  const maxY = Math.max(...data.map(p => p.y));
  const rangeY = maxY - minY || 1;
  
  const minX = Math.min(...data.map(p => p.x));
  const maxX = Math.max(...data.map(p => p.x));
  const rangeX = maxX - minX || 1;

  // Determine color based on trend if autoColor is enabled
  const lineColor = useMemo(() => {
    if (color) return color;
    if (!autoColor) return '#10b981';
    
    const firstPrice = data[0]?.y || 0;
    const lastPrice = data[data.length - 1]?.y || 0;
    return lastPrice >= firstPrice ? '#10b981' : '#ef4444';
  }, [color, autoColor, data]);

  // Convert data points to SVG coordinates
  const svgPoints = useMemo(() => {
    return data.map((point) => {
      const x = padding + ((point.x - minX) / rangeX) * chartWidth;
      const y = padding + chartHeight - ((point.y - minY) / rangeY) * chartHeight;
      return { x, y };
    });
  }, [data, minX, maxX, minY, maxY, rangeX, rangeY, chartWidth, chartHeight, padding]);

  const points = svgPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Create gradient polygon for fill
  const gradientPolygonPoints = useMemo(() => {
    if (!showGradient || svgPoints.length === 0) return '';
    const points = svgPoints.map(p => `${p.x},${p.y}`).join(' ');
    const firstX = svgPoints[0].x;
    const lastX = svgPoints[svgPoints.length - 1].x;
    const bottomY = padding + chartHeight;
    return `${points} ${lastX},${bottomY} ${firstX},${bottomY}`;
  }, [svgPoints, showGradient, padding, chartHeight]);

  return (
    <View style={{ width, height }}>
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id={`sparkline-gradient-${lineColor}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {showGradient && gradientPolygonPoints && (
          <Polygon
            points={gradientPolygonPoints}
            fill={`url(#sparkline-gradient-${lineColor})`}
            stroke="none"
          />
        )}
        
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

