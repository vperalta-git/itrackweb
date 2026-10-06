import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import {
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useApp } from '@/src/mobile/context/AppContext';
import { NotificationType } from '@/src/mobile/types';

const getCategoryPresentation = (theme: AppTheme, type: NotificationType) => {
  switch (type) {
    case NotificationType.VEHICLE:
      return {
        icon: 'car-sport-outline' as const,
        tint: theme.colors.infoLight,
        color: theme.colors.info,
        label: 'Vehicle',
      };
    case NotificationType.DRIVER:
      return {
        icon: 'person-outline' as const,
        tint: theme.colors.primarySurface,
        color: theme.colors.primary,
        label: 'Driver',
      };
    case NotificationType.ALERT:
      return {
        icon: 'alert-circle-outline' as const,
        tint: theme.colors.warningLight,
        color: theme.colors.warning,
        label: 'Alert',
      };
    case NotificationType.SYSTEM:
      return {
        icon: 'settings-outline' as const,
        tint: theme.colors.surfaceMuted,
        color: theme.colors.textSubtle,
        label: 'System',
      };
    default:
      return {
        icon: 'notifications-outline' as const,
        tint: theme.colors.surfaceMuted,
        color: theme.colors.textSubtle,
        label: 'Message',
      };
  }
};

const formatNotificationTime = (date: Date) =>
  formatDistanceToNowStrict(date, { addSuffix: true });

export default function NotificationsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
      ),
    [notifications]
  );

  const animateNext = () => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  const handleRefresh = async () => {
    animateNext();
    setRefreshing(true);

    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    animateNext();
    await removeNotification(notificationId);
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    animateNext();
    await markAsRead(notificationId);
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) {
      return;
    }

    animateNext();
    await markAllAsRead();
  };

  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <Ionicons
        name="trash-outline"
        size={18}
        color={theme.colors.white}
      />
      <Text style={styles.deleteActionText}>Delete</Text>
    </View>
  );

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <PageHeader
        title="Notifications"
        action={
          <TouchableOpacity
            style={[
              styles.markAllLink,
              !unreadCount ? styles.markAllLinkDisabled : null,
            ]}
            activeOpacity={0.85}
            disabled={!unreadCount}
            onPress={() => {
              void handleMarkAllRead();
            }}
          >
            <Text
              style={[
                styles.markAllLinkText,
                !unreadCount ? styles.markAllLinkTextDisabled : null,
              ]}
            >
              Mark All Read
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.list}>
        {sortedNotifications.length ? (
          sortedNotifications.map((notification) => {
            const category = getCategoryPresentation(theme, notification.type);

            return (
              <Swipeable
                key={notification.id}
                friction={2}
                overshootRight={false}
                rightThreshold={56}
                renderRightActions={renderRightActions}
                onSwipeableOpen={(direction) => {
                  if (direction === 'right') {
                    void handleRemoveNotification(notification.id);
                  }
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => {
                    if (!notification.read) {
                      void handleMarkNotificationRead(notification.id);
                    }
                  }}
                >
                  <Card
                    style={[
                      styles.card,
                      !notification.read ? styles.cardUnread : null,
                    ]}
                    variant="elevated"
                    padding="large"
                  >
                    <View style={styles.cardShell}>
                      <View
                        style={[
                          styles.accentBar,
                          {
                            backgroundColor: notification.read
                              ? theme.colors.borderStrong
                              : category.color,
                          },
                        ]}
                      />

                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <View
                            style={[
                              styles.iconBadge,
                              { backgroundColor: category.tint },
                            ]}
                          >
                            <Ionicons
                              name={category.icon}
                              size={20}
                              color={category.color}
                            />
                          </View>

                          <View style={styles.copy}>
                            <View style={styles.titleRow}>
                              <Text style={styles.cardTitle}>
                                {notification.title}
                              </Text>
                              {!notification.read ? (
                                <View style={styles.newBadge}>
                                  <View style={styles.newBadgeDot} />
                                  <Text style={styles.newBadgeText}>New</Text>
                                </View>
                              ) : null}
                            </View>

                            <Text style={styles.message}>
                              {notification.message}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.footerRow}>
                          <View style={styles.metaChip}>
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color={theme.colors.primaryDark}
                            />
                            <Text style={styles.metaChipText}>
                              {category.label}
                            </Text>
                          </View>

                          <View style={styles.metaChip}>
                            <Ionicons
                              name="time-outline"
                              size={14}
                              color={theme.colors.primaryDark}
                            />
                            <Text style={styles.metaChipText}>
                              {formatNotificationTime(notification.createdAt)}
                            </Text>
                          </View>

                          {!notification.read ? (
                            <View style={styles.tapHint}>
                              <Text style={styles.tapHintText}>
                                Tap to mark as read
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Swipeable>
            );
          })
        ) : (
          <EmptyState
            title="No notifications left"
            description={
              notificationsLoading
                ? 'Checking for the latest alerts and activity updates.'
                : 'New alerts and activity updates will appear here as they come in.'
            }
          />
        )}
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    markAllLink: {
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
    },
    markAllLinkDisabled: {
      opacity: 0.45,
    },
    markAllLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.family.sans,
    },
    markAllLinkTextDisabled: {
      color: theme.colors.textSubtle,
    },
    list: {
      gap: theme.spacing.sm,
    },
    card: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    cardUnread: {
      borderColor: theme.colors.primarySurfaceStrong,
      backgroundColor: theme.colors.primarySurface,
    },
    cardShell: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.base,
    },
    accentBar: {
      width: 5,
      borderRadius: theme.radius.full,
    },
    cardContent: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    message: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    newBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    newBadgeDot: {
      width: 7,
      height: 7,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    newBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    footerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    tapHint: {
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    tapHintText: {
      fontSize: 12,
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
    deleteAction: {
      width: 108,
      marginBottom: theme.spacing.md,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.error,
    },
    deleteActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
      fontFamily: theme.fonts.family.sans,
    },
  });
