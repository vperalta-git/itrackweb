import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../constants/theme';
import { setReasonRequestListener, type ReasonRequest } from '../lib/actionReason';

export function ActionReasonDialog() {
  const theme = useTheme();
  const [request, setRequest] = useState<ReasonRequest | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    setReasonRequestListener((next) => { setReason(''); setConfirming(false); setRequest(next); });
    return () => setReasonRequestListener(null);
  }, []);
  const close = (value: string | null) => { request?.resolve(value); setRequest(null); };
  return <Modal visible={Boolean(request)} transparent animationType="fade" onRequestClose={() => close(null)}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.overlay} keyboardShouldPersistTaps="handled">
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{confirming ? 'Confirm action' : request?.title ?? 'Reason required'}</Text>
      <Text style={{ color: theme.colors.textMuted }}>{request?.label}</Text>
      {confirming ? <Text style={{ color: theme.colors.text }}>{reason.trim()}</Text> :
        <TextInput autoFocus multiline value={reason} onChangeText={setReason} maxLength={1000}
          accessibilityLabel="Reason for this action" placeholder="Enter a reason (at least 5 characters)"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} />}
      <Button title={request?.cancelLabel ?? 'Keep record / Go back'} variant="secondary" onPress={() => close(null)} />
      <Button title={request?.confirmLabel ?? (confirming ? 'Confirm and submit' : 'Review action')} disabled={reason.trim().length < 5 || reason.trim().length > 1000}
        onPress={() => request?.confirmLabel || confirming ? close(reason.trim()) : setConfirming(true)} />
    </View></ScrollView></KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flexGrow: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, padding: 22, borderRadius: 18, gap: 14 }, title: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, minHeight: 100, textAlignVertical: 'top' } });
