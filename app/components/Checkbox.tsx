import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

interface CheckboxProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Checkbox = ({
  value,
  onValueChange,
  label,
  disabled = false,
  style,
}: CheckboxProps) => {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      activeOpacity={0.7}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderWidth: 2,
          borderColor: value ? theme.colors.primary : theme.colors.gray300,
          borderRadius: 4,
          backgroundColor: value ? theme.colors.primary : theme.colors.white,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {value && (
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.white,
              fontWeight: 'bold',
            }}
          >
            ✓
          </Text>
        )}
      </View>

      {label && (
        <Text
          style={{
            fontSize: 16,
            color: disabled ? theme.colors.gray400 : theme.colors.gray900,
            fontFamily: theme.fonts.family.sans,
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});
