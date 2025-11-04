import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

type Point = { x: number; y: number };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20,
  color = '#10b981'
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

  // Convert data points to SVG coordinates
  const points = data.map((point) => {
    const x = padding + ((point.x - minX) / rangeX) * chartWidth;
    const y = padding + chartHeight - ((point.y - minY) / rangeY) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ width, height }}>
      <Svg height={height} width={width}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

