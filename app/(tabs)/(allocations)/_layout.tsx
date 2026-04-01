import React from 'react';
import { Stack } from 'expo-router';

export default function AllocationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
