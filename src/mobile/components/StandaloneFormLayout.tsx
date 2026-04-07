import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen } from './AppScreen';
import { PageHeader } from './PageHeader';
import { AppTheme, useTheme } from '../constants/theme';

interface StandaloneFormLayoutProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function StandaloneFormLayout({
  title,
  subtitle,
  onBackPress,
  children,
  style,
  contentContainerStyle,
}: StandaloneFormLayoutProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <AppScreen style={style} contentContainerStyle={contentContainerStyle}>
      <PageHeader
        leading={
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={onBackPress}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        }
        leadingPlacement="above"
        title={title}
        subtitle={subtitle}
        showSubtitle={Boolean(subtitle)}
      />

      {children}
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
    backgroundColor: theme.colors.white,
  },
  });
