import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../constants/theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: ViewStyle;
}

export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  editable = true,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  icon,
  rightIcon,
  onRightIconPress,
  style,
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle: ViewStyle = {
    marginBottom: error ? 8 : 16,
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    borderWidth: 1.5,
    borderColor: error
      ? theme.colors.danger
      : isFocused
      ? theme.colors.primary
      : theme.colors.gray300,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: multiline ? 12 : 0,
    backgroundColor: editable ? theme.colors.white : theme.colors.gray50,
    marginTop: label ? 6 : 0,
  };

  const inputTextStyle = {
    flex: 1,
    paddingVertical: multiline ? 0 : 12,
    fontSize: 16,
    color: theme.colors.gray900,
    fontFamily: theme.fonts.family.sans,
    minHeight: multiline ? 100 : 44,
  };

  return (
    <View style={[containerStyle, style]}>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.gray700,
            marginBottom: 4,
            fontFamily: theme.fonts.family.sans,
          }}
        >
          {label}
        </Text>
      )}
      <View style={inputContainerStyle}>
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
        <TextInput
          style={inputTextStyle}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray400}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ padding: 4 }}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.danger,
            marginTop: 4,
            fontFamily: theme.fonts.family.sans,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({});
