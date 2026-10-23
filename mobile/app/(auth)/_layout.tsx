import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/mobile/context/AuthContext';

import { AppSidebarShell } from '@/src/mobile/components';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  if (!isLoading && user) return <Redirect href={user.mustChangePassword ? '/(tabs)/profile/change-password' : '/(tabs)'} />;
  return (
    <AppSidebarShell mode="auth">
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="sign-in" />
        <Stack.Screen
          name="forgot-password"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </AppSidebarShell>
  );
}
