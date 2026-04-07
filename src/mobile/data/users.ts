import { theme } from '../constants/theme';
import { api, getApiErrorMessage, getResponseData } from '../lib/api';
import { User, UserRole } from '@/src/mobile/types';
import { toDate } from './shared';
import {
  areMobilePhoneNumbersEqual,
  normalizeMobilePhoneNumber,
} from '../utils/phone';

export type UserManagementRecord = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bio: string;
  avatar?: string | null;
  role: UserRole;
  managerId?: string | null;
  isActive: boolean;
  password?: string;
  createdAt: Date;
};

type SaveUserManagementRecordInput = {
  id?: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bio?: string;
  role: UserRole;
  isActive?: boolean;
  password?: string;
};

type UserApiRecord = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  managerId?:
    | {
        id: string;
      }
    | string
    | null;
};

export const USER_ROLE_OPTIONS = [
  { label: 'Admin', value: UserRole.ADMIN },
  { label: 'Supervisor', value: UserRole.SUPERVISOR },
  { label: 'Manager', value: UserRole.MANAGER },
  { label: 'Sales Agent', value: UserRole.SALES_AGENT },
  { label: 'Dispatcher', value: UserRole.DISPATCHER },
  { label: 'Driver', value: UserRole.DRIVER },
] as const;

let userManagementRecords: UserManagementRecord[] = [];

const sortUsersByCreatedDate = (
  left: UserManagementRecord,
  right: UserManagementRecord
) => right.createdAt.getTime() - left.createdAt.getTime();

const normalizeUserEmail = (value: string) => value.trim().toLowerCase();

const randomCharFrom = (charset: string) =>
  charset[Math.floor(Math.random() * charset.length)];

const shuffleCharacters = (value: string[]) => {
  const next = [...value];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];

    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
};

const mapUserRecord = (record: UserApiRecord): UserManagementRecord => ({
  id: record.id,
  email: record.email,
  phone: record.phone,
  firstName: record.firstName,
  lastName: record.lastName,
  bio: record.bio?.trim() || 'No bio added yet.',
  avatar: record.avatarUrl ?? null,
  role: record.role,
  managerId:
    typeof record.managerId === 'string'
      ? record.managerId
      : record.managerId?.id ?? null,
  isActive: record.isActive,
  createdAt: toDate(record.createdAt),
});

const upsertUserRecord = (record: UserManagementRecord) => {
  const existingIndex = userManagementRecords.findIndex(
    (item) => item.id === record.id
  );

  if (existingIndex === -1) {
    userManagementRecords = [record, ...userManagementRecords];
    return record;
  }

  userManagementRecords = userManagementRecords.map((item) =>
    item.id === record.id ? record : item
  );

  return record;
};

export const loadUserManagementRecords = async () => {
  const response = await api.get('/users');
  const records = (getResponseData<UserApiRecord[]>(response) ?? []).map(
    mapUserRecord
  );

  userManagementRecords = records;
  return getUserManagementRecords();
};

export const generateUserManagementPassword = () => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';
  const mixed = `${uppercase}${lowercase}${digits}${special}`;

  return shuffleCharacters([
    randomCharFrom(uppercase),
    randomCharFrom(lowercase),
    randomCharFrom(digits),
    randomCharFrom(special),
    randomCharFrom(mixed),
    randomCharFrom(mixed),
    randomCharFrom(mixed),
    randomCharFrom(mixed),
    randomCharFrom(mixed),
    randomCharFrom(mixed),
  ]).join('');
};

export const getUserManagementRecords = () =>
  [...userManagementRecords].sort(sortUsersByCreatedDate);

export const getUserManagementRecordById = (userId: string) =>
  userManagementRecords.find((record) => record.id === userId) ?? null;

export const isUserPhoneInUse = (
  phone: string,
  excludeUserId?: string | null
) => {
  const normalizedPhoneNumber = normalizeMobilePhoneNumber(phone);

  return userManagementRecords.some(
    (record) =>
      record.id !== excludeUserId &&
      areMobilePhoneNumbersEqual(record.phone, normalizedPhoneNumber)
  );
};

export const saveUserManagementRecord = async ({
  id,
  email,
  phone,
  firstName,
  lastName,
  bio,
  role,
  isActive,
  password,
}: SaveUserManagementRecordInput) => {
  const normalizedEmail = normalizeUserEmail(email);
  const payload = {
    email: normalizedEmail,
    phone: normalizeMobilePhoneNumber(phone),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    bio: bio?.trim() ?? 'No bio added yet.',
    role,
    isActive: isActive ?? true,
    ...(password ? { password } : {}),
  };

  try {
    const response = id
      ? await api.patch(`/users/${id}`, payload)
      : await api.post('/users', payload);
    const savedRecord = mapUserRecord(getResponseData<UserApiRecord>(response));

    upsertUserRecord(savedRecord);

    return {
      ...savedRecord,
      password,
    };
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'The user record could not be saved right now.')
    );
  }
};

const splitDisplayName = (name: string) => {
  const normalized = name.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const [firstName, ...rest] = normalized.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
};

export const syncUserManagementRecordProfile = (
  user: Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'phone'
    | 'bio'
    | 'avatar'
    | 'role'
    | 'isActive'
    | 'createdAt'
  >
) => {
  const { firstName, lastName } = splitDisplayName(user.name);

  return upsertUserRecord({
    id: user.id,
    email: normalizeUserEmail(user.email),
    phone: user.phone.trim(),
    firstName,
    lastName,
    bio: user.bio?.trim() || 'No bio added yet.',
    avatar: user.avatar ?? null,
    role: user.role,
    managerId: null,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
};

export const deleteUserManagementRecord = async (userId: string) => {
  await api.delete(`/users/${userId}`);
  userManagementRecords = userManagementRecords.filter(
    (record) => record.id !== userId
  );
};

export const setUserManagementRecordActiveState = async (
  userId: string,
  isActive: boolean
) => {
  const response = await api.patch(`/users/${userId}`, {
    isActive,
  });
  const savedRecord = mapUserRecord(getResponseData<UserApiRecord>(response));

  upsertUserRecord(savedRecord);
  return savedRecord;
};

export const formatUserRoleLabel = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.SUPERVISOR:
      return 'Supervisor';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.SALES_AGENT:
      return 'Sales Agent';
    case UserRole.DISPATCHER:
      return 'Dispatcher';
    case UserRole.DRIVER:
      return 'Driver';
    default:
      return 'User';
  }
};

export const formatUserManagementReference = (userId: string) =>
  `User #${userId.replace(/\D/g, '').padStart(3, '0') || '000'}`;

export const formatUserCreatedDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatUserManagementStatusLabel = (isActive: boolean) =>
  isActive ? 'Active' : 'Deactivated';

export const getUserManagementStatusBadgeStatus = (isActive: boolean) =>
  isActive ? ('active' as const) : ('inactive' as const);

export const getUserManagementStatusAccentColor = (isActive: boolean) =>
  isActive ? theme.colors.success : theme.colors.textSubtle;

export const getUserRoleAccentColor = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return theme.colors.primary;
    case UserRole.SUPERVISOR:
      return theme.colors.info;
    case UserRole.MANAGER:
      return theme.colors.warning;
    case UserRole.SALES_AGENT:
      return theme.colors.success;
    case UserRole.DISPATCHER:
      return theme.colors.primaryDark;
    case UserRole.DRIVER:
      return theme.colors.textSubtle;
    default:
      return theme.colors.textSubtle;
  }
};

export const getUserRoleBadgePalette = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return {
        backgroundColor: theme.colors.primarySurface,
        borderColor: theme.colors.primarySurfaceStrong,
        textColor: theme.colors.primaryDark,
      };
    case UserRole.SUPERVISOR:
      return {
        backgroundColor: theme.colors.infoLight,
        borderColor: '#DCE8FF',
        textColor: theme.colors.info,
      };
    case UserRole.MANAGER:
      return {
        backgroundColor: theme.colors.warningLight,
        borderColor: '#FDE8B7',
        textColor: '#9A6200',
      };
    case UserRole.SALES_AGENT:
      return {
        backgroundColor: theme.colors.successLight,
        borderColor: '#D7F0E0',
        textColor: '#0E7A37',
      };
    case UserRole.DISPATCHER:
      return {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.borderStrong,
        textColor: theme.colors.text,
      };
    case UserRole.DRIVER:
      return {
        backgroundColor: theme.colors.backgroundAlt,
        borderColor: theme.colors.border,
        textColor: theme.colors.textMuted,
      };
    default:
      return {
        backgroundColor: theme.colors.surfaceMuted,
        borderColor: theme.colors.border,
        textColor: theme.colors.textMuted,
      };
  }
};
