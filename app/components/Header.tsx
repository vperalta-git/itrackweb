import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export const Header = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style,
}: HeaderProps) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.colors.white,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.gray200,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onLeftPress}
        disabled={!onLeftPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={{ width: 40, height: 40, justifyContent: 'center' }}>
          {leftIcon}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.gray900,
            fontFamily: theme.fonts.family.sans,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.gray600,
              marginTop: 2,
              fontFamily: theme.fonts.family.sans,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={onRightPress}
        disabled={!onRightPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={{ width: 40, height: 40, justifyContent: 'center' }}>
          {rightIcon}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({});
