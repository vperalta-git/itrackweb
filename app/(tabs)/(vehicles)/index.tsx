import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppScreen,
  Button,
  EmptyState,
  PageHeader,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';

export default function VehiclesScreen() {
  return (
    <AppScreen contentContainerStyle={styles.contentContainer}>
      <PageHeader
        eyebrow="Vehicles"
        title="Vehicle Workspace"
        subtitle="This route is being consolidated into the new role-based vehicle modules."
      />

      <EmptyState
        icon={
          <View style={styles.iconWrap}>
            <Ionicons
              name="car-sport-outline"
              size={28}
              color={theme.colors.primary}
            />
          </View>
        }
        title="Vehicle views are moving into role workspaces"
        description="Use the role-aware navigation to manage stocks, preparation, and allocations with the updated UI system."
        action={<Button title="Browse Modules" onPress={() => {}} size="small" />}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
  },
});
