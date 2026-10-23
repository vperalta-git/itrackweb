import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
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
    <View style={styles.overlay}><View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{confirming ? 'Confirm action' : 'Reason required'}</Text>
      <Text style={{ color: theme.colors.textMuted }}>{request?.label}</Text>
      {confirming ? <Text style={{ color: theme.colors.text }}>{reason.trim()}</Text> :
        <TextInput autoFocus multiline value={reason} onChangeText={setReason} maxLength={1000}
          accessibilityLabel="Reason for this action" placeholder="Enter a reason (at least 5 characters)"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} />}
      <Button title="Keep record / Go back" variant="secondary" onPress={() => close(null)} />
      <Button title={confirming ? 'Confirm and submit' : 'Review action'} disabled={reason.trim().length < 5}
        onPress={() => confirming ? close(reason.trim()) : setConfirming(true)} />
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, padding: 22, borderRadius: 18, gap: 14 }, title: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, minHeight: 100, textAlignVertical: 'top' } });
