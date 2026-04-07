import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';

import { AppSidebarShell } from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';

function LoadingShell() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.loadingShell}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingTitle}>Preparing workspace</Text>
        <Text style={styles.loadingText}>
          Loading your role menu and page access.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function SidebarLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingShell />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <AppSidebarShell mode="user">
      <Slot />
    </AppSidebarShell>
  );
}

const createStyles = (theme: AppTheme) => {
  const { colors, radius, spacing, typography, shadows } = theme;

  return StyleSheet.create({
    loadingShell: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.md,
    },
    loadingTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
      fontFamily: theme.fonts.family.sans,
    },
    loadingText: {
      fontSize: typography.fontSize.sm,
      color: colors.textMuted,
      lineHeight: 20,
      fontFamily: theme.fonts.family.sans,
    },
  });
};
