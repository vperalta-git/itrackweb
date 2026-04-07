import React from 'react';
import { Stack } from 'expo-router';

import { AppSidebarShell } from '@/src/mobile/components';

export default function AuthLayout() {
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
