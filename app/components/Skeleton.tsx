import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = theme.radius.md,
  style,
}: SkeletonProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.gray200,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonListProps {
  count?: number;
  style?: ViewStyle;
}

export const SkeletonList = ({ count = 3, style }: SkeletonListProps) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ marginBottom: 16 }}>
          <Skeleton height={24} style={{ marginBottom: 8 }} />
          <Skeleton height={16} width="80%" style={{ marginBottom: 4 }} />
          <Skeleton height={16} width="60%" />
        </View>
      ))}
    </View>
  );
};

interface SkeletonCardProps {
  count?: number;
  style?: ViewStyle;
}

export const SkeletonCard = ({ count = 1, style }: SkeletonCardProps) => {
  return (
    <View style={[{ gap: 12 }, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.gray200,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={60} height={60} borderRadius={theme.radius.lg} />
            <View style={{ flex: 1 }}>
              <Skeleton height={20} style={{ marginBottom: 8 }} />
              <Skeleton height={16} width="70%" />
            </View>
          </View>
          <Skeleton height={2} width="100%" />
          <View style={{ gap: 8 }}>
            <Skeleton height={14} width="100%" />
            <Skeleton height={14} width="85%" />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({});
