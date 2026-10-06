import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  UserAvatar,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  formatUserRoleLabel,
  getUserManagementRecords,
} from '@/src/mobile/data/users';

export default function OtherProfilesScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const otherProfiles = useMemo(
    () => getUserManagementRecords().filter((record) => record.id !== user?.id),
    [user?.id]
  );

  return (
    <AppScreen>
      <PageHeader
        leading={
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        }
        leadingPlacement="above"
        title="Other Profiles"
        subtitle="Browse other user profiles and open their account details."
      />

      {otherProfiles.length ? (
        <View style={styles.list}>
          {otherProfiles.map((record) => {
            const fullName = `${record.firstName} ${record.lastName}`;

            return (
              <Card
                key={record.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/profile/other-profile-detail',
                    params: {
                      userId: record.id,
                    },
                  })
                }
              >
                <View style={styles.cardTop}>
                  <UserAvatar
                    name={fullName}
                    avatarUri={record.avatar}
                    size={56}
                    radius={18}
                    textSize={18}
                  />

                  <View style={styles.copy}>
                    <Text style={styles.title}>{fullName}</Text>
                    <Text style={styles.subtitle}>{record.email}</Text>
                    <Text style={styles.roleText}>
                      {formatUserRoleLabel(record.role)}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color={theme.colors.textSubtle}
                  />
                </View>

                <Text style={styles.bioText} numberOfLines={2}>
                  {record.bio || 'No bio added yet.'}
                </Text>
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No other profiles found"
          description="Other user profiles will appear here once more accounts are available."
        />
      )}
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceOverlay,
    },
    list: {
      gap: theme.spacing.md,
    },
    card: {
      gap: theme.spacing.base,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
    },
    copy: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
      fontFamily: theme.fonts.family.sans,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      marginBottom: 4,
      fontFamily: theme.fonts.family.sans,
    },
    roleText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.family.sans,
    },
    bioText: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
  });
