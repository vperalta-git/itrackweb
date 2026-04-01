import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, radius } from '../constants/theme';

export default function NotificationsScreen() {
  const notifications = [
    {
      id: '1',
      title: 'Vehicle Ready',
      message: 'Tesla Model S is ready for dispatch',
      category: 'vehicle',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      title: 'Driver Allocated',
      message: 'John Smith has been assigned to Trip #4521',
      category: 'driver',
      time: '4 hours ago',
      read: false,
    },
    {
      id: '3',
      title: 'Preparation Complete',
      message: 'BMW 3 Series preparation is complete',
      category: 'vehicle',
      time: '1 day ago',
      read: true,
    },
    {
      id: '4',
      title: 'System Alert',
      message: 'Scheduled maintenance reminder',
      category: 'alert',
      time: '2 days ago',
      read: true,
    },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'vehicle':
        return colors.info;
      case 'driver':
        return colors.primary;
      case 'alert':
        return colors.warning;
      default:
        return colors.gray500;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vehicle':
        return '🚗';
      case 'driver':
        return '👤';
      case 'alert':
        return '⚠️';
      default:
        return '📢';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.card,
                !notification.read && styles.cardUnread,
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconBadge}>
                  <Text style={styles.icon}>
                    {getCategoryIcon(notification.category)}
                  </Text>
                </View>
                <View style={styles.notificationInfo}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>{notification.time}</Text>
                </View>
              </View>
              {!notification.read && (
                <View
                  style={[
                    styles.unreadDot,
                    {
                      backgroundColor: getCategoryColor(
                        notification.category
                      ),
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
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
  clearButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
  },
  clearButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardUnread: {
    backgroundColor: '#FEF3C7',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBadge: {
    fontSize: 24,
    marginRight: spacing.lg,
    marginTop: spacing.xs,
  },
  icon: {
    fontSize: 24,
  },
  notificationInfo: {
    flex: 1,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
    marginTop: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.lg,
  },
});
