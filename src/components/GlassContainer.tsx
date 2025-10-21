import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors, Sizes } from '../constants';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
  padding?: number;
  margin?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  style,
  borderRadius = Sizes.radius.lg,
  padding = Sizes.md,
  margin = 0,
}) => {
  return (
    <View
      style={[
        {
          borderRadius,
          padding,
          margin,
          backgroundColor: Colors.glass.light,
          borderWidth: 1,
          borderColor: Colors.glass.medium,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
