import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const LoadingSpinner = ({
  size = 'medium',
  color = theme.colors.primary,
  style,
}: LoadingSpinnerProps) => {
  const rotationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotationValue]);

  const spin = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const containerSize = sizeMap[size];

  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      <Animated.View
        style={{
          width: containerSize,
          height: containerSize,
          borderWidth: size === 'small' ? 2 : 3,
          borderColor: `${color}30`,
          borderTopColor: color,
          borderRadius: containerSize / 2,
          transform: [{ rotate: spin }],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({});
