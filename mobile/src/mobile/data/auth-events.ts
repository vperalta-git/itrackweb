import { UserRole } from '@/src/mobile/types';
import { api, getResponseData } from '../lib/api';
import { toDate } from './shared';

export type AuthEventType = 'login' | 'logout';

export type AuthEventRecord = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role?: UserRole | null;
  eventType: AuthEventType;
  createdAt: Date;
};

type AuthEventApiRecord = {
  id: string;
  userId?: string | { id: string } | null;
  name: string;
  email: string;
  role?: UserRole | null;
  eventType: AuthEventType;
  createdAt: string;
};

let authEventRecords: AuthEventRecord[] = [];

const sortAuthEventsByDate = (left: AuthEventRecord, right: AuthEventRecord) =>
  right.createdAt.getTime() - left.createdAt.getTime();

const mapAuthEventRecord = (record: AuthEventApiRecord): AuthEventRecord => ({
  id: record.id,
  userId:
    typeof record.userId === 'string' ? record.userId : record.userId?.id ?? null,
  name: record.name,
  email: record.email,
  role: record.role ?? null,
  eventType: record.eventType,
  createdAt: toDate(record.createdAt),
});

export const loadAuthEventRecords = async () => {
  const response = await api.get('/auth/events');
  authEventRecords = (getResponseData<AuthEventApiRecord[]>(response) ?? []).map(
    mapAuthEventRecord
  );

  return getAuthEventRecords();
};

export const getAuthEventRecords = () =>
  [...authEventRecords].sort(sortAuthEventsByDate);

export const recordLogoutAuthEvent = async ({
  userId,
  name,
  email,
  role,
}: {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  role?: UserRole | null;
}) => {
  await api.post('/auth/logout', {
    userId: userId ?? undefined,
    name: name ?? undefined,
    email: email ?? undefined,
    role: role ?? undefined,
  });
};
