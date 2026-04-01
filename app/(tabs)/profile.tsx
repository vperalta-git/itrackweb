import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/sign-in');
  };

  const menuItems = [
    {
      label: 'Edit Profile',
      icon: '✏️',
      action: () => console.log('Edit Profile'),
    },
    {
      label: 'Change Password',
      icon: '🔐',
      action: () => console.log('Change Password'),
    },
    {
      label: 'Notification Settings',
      icon: '🔔',
      action: () => console.log('Notification Settings'),
    },
    {
      label: 'Help & Support',
      icon: '❓',
      action: () => console.log('Help & Support'),
    },
    {
      label: 'About App',
      icon: 'ℹ️',
      action: () => console.log('About App'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info Header */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>👤</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>
              {user?.role.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{user?.phone}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.action}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.section}>
          <Text style={styles.versionText}>I-TRACK v1.0.0</Text>
          <Text style={styles.copyrightText}>
            © 2024 I-TRACK. All rights reserved.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.white,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatar: {
    fontSize: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray100,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.gray100,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.lg,
  },
  detailItem: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  menuItem: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.lg,
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
  },
  menuArrow: {
    fontSize: typography.fontSize.lg,
    color: colors.gray400,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
});
