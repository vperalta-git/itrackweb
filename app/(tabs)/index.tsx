import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { getDefaultRouteForRole } from '@/src/mobile/navigation/access';

export default function TabsIndexScreen() {
  const theme = useTheme();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingShell,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text
          style={[
            styles.loadingText,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.fonts.family.sans,
            },
          ]}
        >
          Loading workspace...
        </Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href={getDefaultRouteForRole(user.role) as any} />;
}

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
