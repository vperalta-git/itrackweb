import { UserRole } from '@/src/mobile/types';
import { api, getResponseData } from '../lib/api';
import { toDate } from './shared';

export type UserAuditEventType = 'deleted';

export type UserAuditEventRecord = {
  id: string;
  deletedUserId: string;
  name: string;
  email: string;
  role: UserRole;
  eventType: UserAuditEventType;
  createdAt: Date;
};

export type UserAuditEventApiRecord = {
  id: string;
  deletedUserId: string;
  name: string;
  email: string;
  role: UserRole;
  eventType: UserAuditEventType;
  createdAt: string;
};

let userAuditEventRecords: UserAuditEventRecord[] = [];

const sortUserAuditEventsByDate = (
  left: UserAuditEventRecord,
  right: UserAuditEventRecord
) => right.createdAt.getTime() - left.createdAt.getTime();

export const mapUserAuditEventRecord = (
  record: UserAuditEventApiRecord
): UserAuditEventRecord => ({
  id: record.id,
  deletedUserId: record.deletedUserId,
  name: record.name,
  email: record.email,
  role: record.role,
  eventType: record.eventType,
  createdAt: toDate(record.createdAt),
});

export const upsertUserAuditEventRecord = (record: UserAuditEventRecord) => {
  const existingIndex = userAuditEventRecords.findIndex(
    (item) => item.id === record.id
  );

  if (existingIndex === -1) {
    userAuditEventRecords = [record, ...userAuditEventRecords];
  } else {
    userAuditEventRecords = userAuditEventRecords.map((item) =>
      item.id === record.id ? record : item
    );
  }

  return record;
};

export const loadUserAuditEventRecords = async () => {
  const response = await api.get('/users/audit-events');
  userAuditEventRecords = (
    getResponseData<UserAuditEventApiRecord[]>(response) ?? []
  ).map(mapUserAuditEventRecord);

  return getUserAuditEventRecords();
};

export const getUserAuditEventRecords = () =>
  [...userAuditEventRecords].sort(sortUserAuditEventsByDate);
