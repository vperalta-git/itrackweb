import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import { DriverTrackingContext, useDriverLocationPublisher } from '../hooks/useDriverRealtimeLocation';
import { getDriverAllocationDashboardRecord, loadDriverAllocations, subscribeDriverAllocations,
  type DriverAllocationRecord } from '../data/driver-allocation';

export function DriverTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [allocation, setAllocation] = useState<DriverAllocationRecord | null>(null);
  useEffect(() => {
    if (!user || user.role !== UserRole.DRIVER || user.mustChangePassword) { setAllocation(null); return; }
    let active = true, loading = false;
    const read = () => { if (active) setAllocation(getDriverAllocationDashboardRecord(user.id)); };
    const refresh = async () => {
      if (loading || AppState.currentState !== 'active') return;
      loading = true;
      try { await loadDriverAllocations(); read(); }
      catch { /* Preserve the known assignment through temporary network outages. */ }
      finally { loading = false; }
    };
    const unsubscribe = subscribeDriverAllocations(read);
    void refresh();
    const timer = setInterval(() => void refresh(), 8000);
    const resume = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); resume.remove(); unsubscribe(); };
  }, [user?.id, user?.role, user?.mustChangePassword]);
  const activeAllocation = user?.role === UserRole.DRIVER && !user.mustChangePassword && allocation?.driverId === user.id ? allocation : null;
  const tracking = useDriverLocationPublisher(activeAllocation);
  return <DriverTrackingContext.Provider value={{ ...tracking, allocationId: activeAllocation?.id ?? null }}>{children}</DriverTrackingContext.Provider>;
}
