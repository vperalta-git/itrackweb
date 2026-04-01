import React from 'react';
import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
