import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export function BaharLogo({ size = 200, color = '#16a34a' }: Props) {
  const centerX = size / 2;
  const circleRadius = size * 0.25;
  const circleY = size * 0.3;
  const svgHeight = size * 0.7;
  const leafSize = size * 0.06;

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={svgHeight}>
        <Circle
          cx={centerX}
          cy={circleY}
          r={circleRadius}
          fill="none"
          stroke="#000000"
          strokeWidth={size * 0.03}
        />

        <Path
          d={`M ${centerX} ${circleY + circleRadius * 0.25}
              L ${centerX - circleRadius * 0.15} ${circleY + circleRadius * 0.5}
              L ${centerX} ${circleY + circleRadius * 0.2}
              L ${centerX + circleRadius * 0.15} ${circleY + circleRadius * 0.5}
              Z`}
          fill={color}
          stroke="#000000"
          strokeWidth={size * 0.015}
        />

        <Path
          d={`M ${centerX - circleRadius * 0.2} ${circleY - circleRadius * 0.05}
              Q ${centerX - circleRadius * 0.35} ${circleY - circleRadius * 0.28}
              ${centerX - circleRadius * 0.25} ${circleY - circleRadius * 0.42}
              Q ${centerX - circleRadius * 0.1} ${circleY - circleRadius * 0.5}
              ${centerX} ${circleY - circleRadius * 0.45}
              Q ${centerX + circleRadius * 0.1} ${circleY - circleRadius * 0.5}
              ${centerX + circleRadius * 0.25} ${circleY - circleRadius * 0.42}
              Q ${centerX + circleRadius * 0.35} ${circleY - circleRadius * 0.28}
              ${centerX + circleRadius * 0.2} ${circleY - circleRadius * 0.05}
              Z`}
          fill={color}
          stroke="#000000"
          strokeWidth={size * 0.015}
        />

        <Path
          d={`M ${centerX} ${circleY - circleRadius * 0.52}
              L ${centerX - circleRadius * 0.08} ${circleY - circleRadius * 0.65}
              L ${centerX} ${circleY - circleRadius * 0.58}
              L ${centerX + circleRadius * 0.08} ${circleY - circleRadius * 0.65}
              Z`}
          fill={color}
          stroke="#000000"
          strokeWidth={size * 0.015}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.baharText, { color, fontSize: size * 0.24, letterSpacing: size * 0.01 }]}>
          BAHAR
        </Text>
        <View style={styles.coinContainer}>
          <Text style={[styles.coinText, { fontSize: size * 0.18, letterSpacing: size * 0.005 }]}>C</Text>
          <View style={[styles.leafO, { width: leafSize, height: leafSize }]}>
            <Svg width={leafSize} height={leafSize} viewBox="0 0 20 20">
              <Path
                d="M 10 5
                    Q 5 8 5 12
                    Q 5 16 10 15
                    Q 15 16 15 12
                    Q 15 8 10 5
                    Z"
                fill={color}
                stroke="#000000"
                strokeWidth={0.5}
              />
            </Svg>
          </View>
          <Text style={[styles.coinText, { fontSize: size * 0.18, letterSpacing: size * 0.005 }]}>IN</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  baharText: {
    fontWeight: '900',
    marginBottom: 6,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    color: '#1f2937',
    fontWeight: '800',
  },
  leafO: {
    marginHorizontal: 3,
  },
});

