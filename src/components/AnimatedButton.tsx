import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Sizes } from '../constants';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: string[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  gradient = Colors.gradient.primary,
  disabled = false,
  size = 'md',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: Sizes.sm, paddingHorizontal: Sizes.md };
      case 'lg':
        return { paddingVertical: Sizes.lg, paddingHorizontal: Sizes.xl };
      default:
        return { paddingVertical: Sizes.md, paddingHorizontal: Sizes.lg };
    }
  };

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={(disabled ? [Colors.text.tertiary, Colors.text.tertiary] : gradient) as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: Sizes.radius.lg,
              ...getSizeStyles(),
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            style={[
              {
                color: Colors.text.primary,
                fontSize: Sizes.fontSize.md,
                fontWeight: '600',
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};
