import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

interface AppScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function AppScreen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
}: AppScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dotConfigs = useMemo(
    () => [
      {
        size: 10,
        top: 96,
        right: 40,
        color: theme.colors.primary,
        duration: 3400,
        outputY: [-6, 10],
        outputOpacity: [0.12, 0.32],
        outputScale: [0.95, 1.1],
      },
      {
        size: 8,
        top: 138,
        right: 108,
        color: theme.colors.primaryLight,
        duration: 4200,
        outputY: [8, -10],
        outputOpacity: [0.1, 0.24],
        outputScale: [0.9, 1.08],
      },
      {
        size: 12,
        top: 220,
        right: 76,
        color: theme.colors.primarySurfaceStrong,
        duration: 4000,
        outputY: [-10, 8],
        outputOpacity: [0.08, 0.18],
        outputScale: [0.92, 1.06],
      },
      {
        size: 9,
        bottom: 180,
        left: 52,
        color: theme.colors.primary,
        duration: 3800,
        outputY: [10, -8],
        outputOpacity: [0.1, 0.28],
        outputScale: [0.9, 1.05],
      },
      {
        size: 7,
        bottom: 130,
        left: 118,
        color: theme.colors.primaryLight,
        duration: 4600,
        outputY: [-8, 12],
        outputOpacity: [0.08, 0.22],
        outputScale: [0.94, 1.12],
      },
      {
        size: 11,
        bottom: 220,
        left: 150,
        color: theme.colors.primarySurfaceStrong,
        duration: 3600,
        outputY: [8, -8],
        outputOpacity: [0.08, 0.16],
        outputScale: [0.92, 1.04],
      },
    ],
    [theme]
  );
  const dotAnimations = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const loops = dotAnimations.map((animation, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: dotConfigs[index].duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: dotConfigs[index].duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [dotAnimations, dotConfigs]);

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.orbTop} />
        <View style={styles.orbBottom} />

        {dotConfigs.map((dot, index) => {
          const progress = dotAnimations[index];
          const translateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: dot.outputY,
          });
          const opacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: dot.outputOpacity,
          });
          const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: dot.outputScale,
          });

          return (
            <Animated.View
              key={`${dot.size}-${index}`}
              style={[
                styles.dot,
                {
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                  top: dot.top,
                  right: dot.right,
                  bottom: dot.bottom,
                  left: dot.left,
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            />
          );
        })}
      </View>

      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentContainer, styles.fill, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    fill: {
      flex: 1,
    },
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing['3xl'],
    },
    orbTop: {
      position: 'absolute',
      top: -80,
      right: -20,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: theme.colors.primarySurfaceStrong,
      opacity: 0.62,
    },
    orbBottom: {
      position: 'absolute',
      bottom: -140,
      left: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: theme.colors.gray100,
      opacity: 0.72,
    },
    dot: {
      position: 'absolute',
    },
  });
