import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme, useTheme } from '../constants/theme';

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
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
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
  onBlur,
  style,
}: InputProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => {
          if (editable) {
            inputRef.current?.focus();
          }
        }}
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
        ]}
      >
        {icon ? <View style={styles.leftIcon}>{icon}</View> : null}

        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray500}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          selectionColor={theme.colors.primary}
          cursorColor={theme.colors.primary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />

        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  container: {
    marginBottom: theme.spacing.base,
  },
  label: {
    marginBottom: theme.spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceOverlay,
    paddingHorizontal: theme.spacing.base,
    ...theme.shadows.sm,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.base,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 58,
    fontSize: 15.5,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.error,
    fontFamily: theme.fonts.family.sans,
  },
  });
