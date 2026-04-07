import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { brandLogo } from '../constants/assets';
import { theme } from '../constants/theme';

interface StartupLoadingScreenProps {
  durationMs?: number;
}

export function StartupLoadingScreen({
  durationMs = 5000,
}: StartupLoadingScreenProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnimation = Animated.timing(entrance, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: Math.max(1400, Math.floor(durationMs / 3)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: Math.max(1400, Math.floor(durationMs / 3)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: Math.max(2200, Math.floor(durationMs / 2)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: Math.max(2200, Math.floor(durationMs / 2)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start();
    pulseLoop.start();
    floatLoop.start();
    driftLoop.start();

    return () => {
      pulse.stopAnimation();
      float.stopAnimation();
      drift.stopAnimation();
    };
  }, [drift, durationMs, entrance, float, pulse]);

  const contentOpacity = entrance;
  const contentTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  const floatTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const titleOpacity = entrance.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
  });
  const titleTranslateY = entrance.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [16, 16, 0],
  });
  const titleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });
  const topGlowTranslateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 16],
  });
  const topGlowTranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 10],
  });
  const topGlowScale = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const bottomGlowTranslateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -18],
  });
  const bottomGlowTranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -12],
  });
  const bottomGlowScale = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  const accentLeftTranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });
  const accentLeftRotate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '4deg'],
  });
  const accentRightTranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const accentRightRotate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: ['6deg', '-3deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.backgroundGlowTop,
          {
            transform: [
              { translateX: topGlowTranslateX },
              { translateY: topGlowTranslateY },
              { scale: topGlowScale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundGlowBottom,
          {
            transform: [
              { translateX: bottomGlowTranslateX },
              { translateY: bottomGlowTranslateY },
              { scale: bottomGlowScale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundAccentLeft,
          {
            transform: [
              { translateY: accentLeftTranslateY },
              { rotate: accentLeftRotate },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundAccentRight,
          {
            transform: [
              { translateY: accentRightTranslateY },
              { rotate: accentRightRotate },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.logoHalo,
              {
                transform: [{ scale: haloScale }],
                opacity: haloOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoWrap,
              {
                transform: [{ translateY: floatTranslateY }, { scale: logoScale }],
              },
            ]}
          >
            <Image
              source={brandLogo}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [
                { translateY: titleTranslateY },
                { scale: titleScale },
              ],
            },
          ]}
        >
          I-TRACK
        </Animated.Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -90,
    right: -30,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.26,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: theme.colors.primaryDark,
    opacity: 0.32,
  },
  backgroundAccentLeft: {
    position: 'absolute',
    top: 148,
    left: 42,
    width: 88,
    height: 88,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(182, 31, 36, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...theme.shadows.sm,
  },
  backgroundAccentRight: {
    position: 'absolute',
    right: 36,
    bottom: 164,
    width: 108,
    height: 108,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(243, 107, 110, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    alignItems: 'center',
  },
  logoStage: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHalo: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoWrap: {
    width: 102,
    height: 102,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    ...theme.shadows.lg,
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    marginTop: theme.spacing.lg,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: theme.colors.white,
    fontFamily: theme.fonts.family.sans,
  },
});
