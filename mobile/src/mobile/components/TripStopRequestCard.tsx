import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../constants/theme';
import { AllocationStatus } from '../types';
import { type DriverAllocationRecord, reviewDriverAllocationStopRequest, reviewDriverAllocationRejection } from '../data/driver-allocation';
import { requestActionReason } from '../lib/actionReason';
import { getApiErrorMessage } from '../lib/api';

type Props = {
  allocation: DriverAllocationRecord;
  canReview?: boolean;
  onReviewed?: (allocation: DriverAllocationRecord) => void;
  requestType?: 'stop' | 'rejection';
  compact?: boolean;
};

export function DriverRequestReviewCard({ allocation, canReview = false, onReviewed, requestType = 'stop', compact = false }: Props) {
  const theme = useTheme();
  const reviewingRef = useRef(false);
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null);
  const rejection = requestType === 'rejection';
  const request = rejection ? allocation.rejectionRequest : allocation.stopRequest;
  if (!request || request.status === 'none') return null;
  const pending = request.status === 'pending';
  const reviewable = canReview && pending && (rejection
    ? [AllocationStatus.PENDING, AllocationStatus.ASSIGNED].includes(allocation.status)
    : allocation.status === AllocationStatus.IN_TRANSIT);
  const approveLabel = rejection ? 'Approve Rejection' : 'Approve Stop';
  const rejectLabel = rejection ? 'Deny Rejection' : 'Reject Stop';

  const review = async (action: 'approve' | 'reject') => {
    if (!reviewable || reviewingRef.current) return;
    reviewingRef.current = true;
    setReviewing(action);
    try {
      const approved = action === 'approve';
      const effect = approved
        ? 'Approving cancels the booking and notifies the driver.'
        : rejection ? 'Denying keeps the booking assigned to the driver.' : 'Rejecting keeps the trip in transit and notifies the driver to continue.';
      const reason = await requestActionReason(
        `${allocation.driverName}: ${request.reason}\n\n${effect} Enter your review reason.`,
        { title: rejection ? 'Review booking rejection' : approved ? 'Approve stop request' : 'Reject stop request', confirmLabel: approved ? approveLabel : rejectLabel, cancelLabel: 'Go back' }
      );
      if (!reason) return;
      const saved = await (rejection ? reviewDriverAllocationRejection : reviewDriverAllocationStopRequest)(allocation.id, action, reason);
      onReviewed?.(saved);
      Alert.alert(rejection ? approved ? 'Rejection Approved' : 'Rejection Denied' : approved ? 'Stop Approved' : 'Stop Rejected', approved
        ? 'The booking was cancelled and the driver was notified.'
        : rejection ? 'The booking stays active and the driver was notified.' : 'The driver was notified to continue the trip.');
    } catch (error) {
      Alert.alert(rejection ? 'Unable to review rejection' : 'Unable to review stop request', getApiErrorMessage(error, 'Refresh the allocation and try again.'));
    } finally {
      reviewingRef.current = false;
      setReviewing(null);
    }
  };

  return <View style={[styles.panel, compact && styles.compactPanel, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceMuted }]}>
    <Text style={[styles.title, { color: theme.colors.text }]}>
      {rejection
        ? pending ? 'Booking rejection pending approval' : request.status === 'approved' ? 'Booking rejection approved' : 'Booking rejection denied'
        : pending ? 'Stop trip request pending' : request.status === 'approved' ? 'Stop request approved' : 'Stop request rejected'}
    </Text>
    <Text numberOfLines={compact ? 2 : undefined} style={{ color: theme.colors.textMuted }}>{request.reason}</Text>
    {request.reviewNotes ? <Text numberOfLines={compact ? 2 : undefined} style={{ color: theme.colors.text }}>Review: {request.reviewNotes}</Text> : null}
    {reviewable ? <View style={styles.actions}>
      <Button title={approveLabel} variant="danger" size="small" loading={reviewing === 'approve'} disabled={Boolean(reviewing)} onPress={() => { void review('approve'); }} style={styles.button} />
      <Button title={rejectLabel} variant="outline" size="small" loading={reviewing === 'reject'} disabled={Boolean(reviewing)} onPress={() => { void review('reject'); }} style={styles.button} />
    </View> : null}
  </View>;
}

export const TripStopRequestCard = DriverRequestReviewCard;

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginBottom: 16 },
  compactPanel: { padding: 10, gap: 4, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { flexGrow: 1 },
});
