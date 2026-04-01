import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="preparation" />
      <Stack.Screen name="driver-allocation" />
      <Stack.Screen name="test-drive" />
      <Stack.Screen name="users" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
