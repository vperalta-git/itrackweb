import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { theme } from '../constants/theme';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value: string | number | null;
  options: SelectOption[];
  onValueChange: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Select = ({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onValueChange,
  error,
  disabled = false,
  style,
}: SelectProps) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const containerStyle: ViewStyle = {
    marginBottom: error ? 8 : 16,
  };

  const selectContainerStyle: ViewStyle = {
    borderWidth: 1.5,
    borderColor: error ? theme.colors.danger : theme.colors.gray300,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: disabled ? theme.colors.gray50 : theme.colors.white,
    marginTop: label ? 6 : 0,
    justifyContent: 'center',
    minHeight: 44,
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

      <TouchableOpacity
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={selectContainerStyle}>
          <Text
            style={{
              fontSize: 16,
              color: selectedOption ? theme.colors.gray900 : theme.colors.gray400,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {selectedOption?.label || placeholder}
          </Text>
        </View>
      </TouchableOpacity>

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

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: theme.colors.white,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              maxHeight: '80%',
            }}
            onPress={() => {}}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.colors.gray900,
                  fontFamily: theme.fonts.family.sans,
                }}
              >
                Select an option
              </Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.gray200,
                    backgroundColor:
                      value === item.value ? theme.colors.gray50 : theme.colors.white,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: theme.colors.gray900,
                      fontWeight: value === item.value ? '600' : '400',
                      fontFamily: theme.fonts.family.sans,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({});
