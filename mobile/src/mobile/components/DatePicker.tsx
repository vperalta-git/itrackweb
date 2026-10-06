import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';
import { format, parse } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  dateFormat?: string;
  style?: ViewStyle;
}

const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export const DatePicker = ({
  label,
  value,
  onValueChange,
  error,
  disabled = false,
  placeholder = 'Select date',
  dateFormat = 'MMM dd, yyyy',
  style,
}: DatePickerProps) => {
  const [visible, setVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(
    value ? parse(value, 'yyyy-MM-dd', new Date()) : new Date()
  );

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

  const handleSelectDate = (day: number) => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const formattedDate = `${newDate.getFullYear()}-${String(
      newDate.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onValueChange(formattedDate);
    setVisible(false);
  };

  const displayValue = value ? format(parse(value, 'yyyy-MM-dd', new Date()), dateFormat) : null;

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  };

  const weeks = renderCalendar();

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
              color: displayValue ? theme.colors.gray900 : theme.colors.gray400,
              fontFamily: theme.fonts.family.sans,
            }}
          >
            {displayValue || placeholder}
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
            }}
            onPress={() => {}}
          >
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
                  }
                >
                  <Text style={{ fontSize: 18, color: theme.colors.primary }}>{"<"}</Text>
                </TouchableOpacity>

                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.gray900,
                    fontFamily: theme.fonts.family.sans,
                  }}
                >
                  {format(currentDate, 'MMMM yyyy')}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
                  }
                >
                  <Text style={{ fontSize: 18, color: theme.colors.primary }}>{">"}</Text>
                </TouchableOpacity>
              </View>

              <View>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={{ width: 40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.gray600 }}>{day}</Text>
                  </View>
                ))}

                {weeks.map((week, weekIndex) => (
                  <View
                    key={weekIndex}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                      marginBottom: 8,
                    }}
                  >
                    {week.map((day, dayIndex) => (
                      <TouchableOpacity
                        key={dayIndex}
                        onPress={() => day && handleSelectDate(day)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor:
                            day &&
                            value ===
                              `${currentDate.getFullYear()}-${String(
                                currentDate.getMonth() + 1
                              ).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                              ? theme.colors.primary
                              : 'transparent',
                        }}
                        disabled={!day}
                      >
                        {day && (
                          <Text
                            style={{
                              color:
                                value ===
                                `${currentDate.getFullYear()}-${String(
                                  currentDate.getMonth() + 1
                                ).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                  ? theme.colors.white
                                  : theme.colors.gray900,
                              fontWeight: '500',
                            }}
                          >
                            {day}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({});
