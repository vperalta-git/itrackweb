import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function UsersScreen() {
  const users = [
    {
      id: '1',
      name: 'Admin User',
      role: 'admin',
      email: 'admin@itrack.com',
      phone: '+1234567890',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      role: 'manager',
      email: 'sarah@itrack.com',
      phone: '+1234567891',
    },
    {
      id: '3',
      name: 'Mike Brown',
      role: 'sales_agent',
      email: 'mike@itrack.com',
      phone: '+1234567892',
    },
    {
      id: '4',
      name: 'John Smith',
      role: 'dispatcher',
      email: 'john@itrack.com',
      phone: '+1234567893',
    },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.primary;
      case 'manager':
        return colors.info;
      case 'sales_agent':
        return colors.warning;
      case 'dispatcher':
        return colors.success;
      default:
        return colors.gray400;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>User Management</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add User</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {users.map((user) => (
            <View key={user.id} style={styles.card}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(user.role) },
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.userFooter}>
                <Text style={styles.phoneText}>{user.phone}</Text>
                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
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
  header: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: typography.fontSize.sm,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  phoneText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray700,
  },
  editButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
