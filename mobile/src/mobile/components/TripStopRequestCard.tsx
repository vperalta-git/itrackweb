import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../constants/theme';
import { AllocationStatus } from '../types';
import { type DriverAllocationRecord, reviewDriverAllocationStopRequest } from '../data/driver-allocation';
import { requestActionReason } from '../lib/actionReason';
import { getApiErrorMessage } from '../lib/api';

type Props = {
  allocation: DriverAllocationRecord;
  canReview?: boolean;
  onReviewed?: (allocation: DriverAllocationRecord) => void;
};

export function TripStopRequestCard({ allocation, canReview = false, onReviewed }: Props) {
  const theme = useTheme();
  const reviewingRef = useRef(false);
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const request = allocation.stopRequest;
  if (!request || request.status === 'none') return null;
  const pending = request.status === 'pending';
  const reviewable = canReview && pending && allocation.status === AllocationStatus.IN_TRANSIT;

  const review = async (action: 'approve' | 'reject') => {
    if (!reviewable || reviewingRef.current) return;
    reviewingRef.current = true;
    setReviewing(action);
    try {
      const approved = action === 'approve';
      const reason = await requestActionReason(
        `${allocation.driverName}: ${request.reason}\n\n${approved ? 'Approving cancels the trip and notifies the driver.' : 'Rejecting keeps the trip in transit and notifies the driver to continue.'} Enter your review reason.`,
        { title: approved ? 'Approve stop request' : 'Reject stop request', confirmLabel: approved ? 'Approve Stop' : 'Reject Stop', cancelLabel: 'Go back' }
      );
      if (!reason) return;
      const saved = await reviewDriverAllocationStopRequest(allocation.id, action, reason);
      onReviewed?.(saved);
      Alert.alert(approved ? 'Stop Approved' : 'Stop Rejected', approved
        ? 'The trip was cancelled and the driver was notified.'
        : 'The driver was notified to continue the trip.');
    } catch (error) {
      Alert.alert('Unable to review stop request', getApiErrorMessage(error, 'Refresh the allocation and try again.'));
    } finally {
      reviewingRef.current = false;
      setReviewing(null);
    }
  };

  return <View style={[styles.panel, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceMuted }]}>
    <Text style={[styles.title, { color: theme.colors.text }]}>
      {pending ? 'Stop trip request pending' : request.status === 'approved' ? 'Stop request approved' : 'Stop request rejected'}
    </Text>
    <Text style={{ color: theme.colors.textMuted }}>{request.reason}</Text>
    {request.reviewNotes ? <Text style={{ color: theme.colors.text }}>Review: {request.reviewNotes}</Text> : null}
    {reviewable ? <View style={styles.actions}>
      <Button title="Approve Stop" variant="danger" size="small" loading={reviewing === 'approve'} disabled={Boolean(reviewing)} onPress={() => { void review('approve'); }} style={styles.button} />
      <Button title="Reject Stop" variant="outline" size="small" loading={reviewing === 'reject'} disabled={Boolean(reviewing)} onPress={() => { void review('reject'); }} style={styles.button} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { flexGrow: 1 },
});
