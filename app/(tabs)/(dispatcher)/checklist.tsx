import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../constants/theme';

export default function ChecklistScreen() {
  const [checklist, setChecklist] = useState([
    { id: '1', label: 'Exterior Wash', completed: true },
    { id: '2', label: 'Interior Cleaning', completed: true },
    { id: '3', label: 'Tire Inspection', completed: false },
    { id: '4', label: 'Fluid Check', completed: false },
    { id: '5', label: 'Brake Test', completed: false },
    { id: '6', label: 'Final Inspection', completed: false },
  ]);

  const toggleTask = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Header */}
        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleTitle}>Tesla Model S - TS001</Text>
          <Text style={styles.vehicleSubtitle}>Exterior Preparation</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of {checklist.length} Complete
          </Text>
        </View>

        {/* Checklist */}
        <View style={styles.checklistContainer}>
          <Text style={styles.checklistTitle}>Preparation Steps</Text>
          {checklist.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.checklistItem}
              onPress={() => toggleTask(task.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  task.completed && styles.checkboxChecked,
                ]}
              >
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.checklistLabel,
                  task.completed && styles.checklistLabelCompleted,
                ]}
              >
                {task.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {completedCount === checklist.length ? (
            <TouchableOpacity style={styles.completeButton}>
              <Text style={styles.completeButtonText}>
                ✓ Mark as Complete
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>
                Complete all steps to finish
              </Text>
            </TouchableOpacity>
          )}
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
  vehicleHeader: {
    marginBottom: spacing['2xl'],
  },
  vehicleTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  vehicleSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  progressSection: {
    marginBottom: spacing['2xl'],
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.gray200,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray700,
  },
  checklistContainer: {
    marginBottom: spacing['2xl'],
  },
  checklistTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.lg,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.gray400,
    borderRadius: radius.sm,
    marginRight: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  checklistLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  checklistLabelCompleted: {
    color: colors.gray400,
    textDecorationLine: 'line-through',
  },
  buttonContainer: {
    marginTop: spacing['2xl'],
  },
  button: {
    backgroundColor: colors.gray300,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray700,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
});
