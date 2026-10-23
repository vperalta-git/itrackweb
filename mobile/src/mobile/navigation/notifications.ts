import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import { api, getResponseData } from '../lib/api';
import { UserRole } from '../types';
import { getRoleRoute, canAccessInternalRoute, getDefaultRouteForRole } from './access';
import { loadDriverAllocations } from '../data/driver-allocation';
import { loadVehicleStocks } from '../data/vehicle-stocks';

type NotificationTarget = { entityType: string; entityId: string; available: boolean; message: string };
export function notificationRoute(target: NotificationTarget, role: UserRole): Href {
  const id = target.available ? target.entityId : '';
  let route = '';
  let params: Record<string, string> = {};
  switch (target.entityType) {
    case 'driver_allocation':
      route = getRoleRoute(role, role === UserRole.DRIVER ? id ? 'trip-detail' : 'dashboard' : id ? 'driver-detail' : 'driver-allocation');
      params = id ? { [role === UserRole.DRIVER ? 'tripId' : 'allocationId']: id } : {};
      break;
    case 'test_drive_booking': route = getRoleRoute(role, id ? 'test-drive-detail' : 'test-drive'); params = id ? { bookingId: id } : {}; break;
    case 'preparation': route = getRoleRoute(role, role === UserRole.DISPATCHER ? 'checklist' : id ? 'preparation-detail' : 'preparation'); params = id ? { preparationId: id } : {}; break;
    case 'vehicle': route = getRoleRoute(role, id ? 'vehicle-detail' : 'vehicles'); params = id ? { vehicleId: id } : {}; break;
    case 'unit_agent_allocation': route = id ? '/(tabs)/(allocations)/allocation-detail' : '/(tabs)/(allocations)'; params = id ? { allocationId: id } : {}; break;
    default: return '/(tabs)/notifications';
  }
  if (!canAccessInternalRoute(role, route)) return getDefaultRouteForRole(role) as Href;
  return { pathname: route, params } as Href;
}

export async function openMobileNotification(notificationId: string | null | undefined, role: UserRole) {
  if (!notificationId) { router.push('/(tabs)/notifications'); return; }
  try {
    const response = await api.get(`/notifications/${encodeURIComponent(notificationId)}/target`);
    const target = getResponseData<NotificationTarget>(response);
    // Driver trip details read the existing shared cache; hydrate it on a cold start.
    if (target.available && target.entityType === 'driver_allocation') await loadDriverAllocations();
    if (target.available && target.entityType === 'vehicle') await loadVehicleStocks();
    if (target.message) Alert.alert('Record unavailable', target.message);
    router.push(notificationRoute(target, role));
    void api.patch(`/notifications/${encodeURIComponent(notificationId)}/read`, {}).catch(() => undefined);
  } catch {
    Alert.alert('Notification unavailable', 'The record could not be opened. Refresh your notifications and try again.');
    router.push('/(tabs)/notifications');
  }
}
