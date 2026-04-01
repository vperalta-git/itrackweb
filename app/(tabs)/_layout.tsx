import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { colors, spacing } from '../constants/theme';

export default function TabLayout() {
  const { user } = useAuth();

  // Define tabs based on user role
  const getTabsForRole = () => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.ADMIN:
      case UserRole.SUPERVISOR:
        return [
          {
            name: '(admin)',
            title: 'Dashboard',
            icon: '📊',
          },
          {
            name: '(vehicles)',
            title: 'Vehicles',
            icon: '🚗',
          },
          {
            name: '(allocations)',
            title: 'Allocations',
            icon: '📍',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: '🔔',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: '👤',
          },
        ];
      case UserRole.MANAGER:
        return [
          {
            name: '(admin)',
            title: 'Dashboard',
            icon: '📊',
          },
          {
            name: '(vehicles)',
            title: 'Vehicles',
            icon: '🚗',
          },
          {
            name: '(allocations)',
            title: 'Allocations',
            icon: '📍',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: '🔔',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: '👤',
          },
        ];
      case UserRole.SALES_AGENT:
        return [
          {
            name: '(admin)',
            title: 'Dashboard',
            icon: '📊',
          },
          {
            name: '(vehicles)',
            title: 'Vehicles',
            icon: '🚗',
          },
          {
            name: '(allocations)',
            title: 'Allocations',
            icon: '📍',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: '🔔',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: '👤',
          },
        ];
      case UserRole.DISPATCHER:
        return [
          {
            name: '(dispatcher)',
            title: 'Dashboard',
            icon: '📊',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: '🔔',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: '👤',
          },
        ];
      case UserRole.DRIVER:
        return [
          {
            name: '(driver)',
            title: 'Map',
            icon: '🗺️',
          },
          {
            name: 'notifications',
            title: 'Notifications',
            icon: '🔔',
          },
          {
            name: 'profile',
            title: 'Profile',
            icon: '👤',
          },
        ];
      default:
        return [];
    }
  };

  const tabs = getTabsForRole();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color }) => (
              <View style={{ fontSize: 24 }}>{tab.icon}</View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.gray200,
    borderTopWidth: 1,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    height: 60,
  },
  tabBarItem: {
    paddingVertical: spacing.sm,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBarIcon: {
    marginBottom: spacing.xs,
  },
});
