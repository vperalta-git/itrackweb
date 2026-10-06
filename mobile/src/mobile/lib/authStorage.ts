import * as FileSystem from 'expo-file-system';

import { User } from '../types';

type PersistedUser = Omit<User, 'createdAt'> & {
  createdAt: string;
};

type PersistedAuthSession = {
  token: string;
  user: PersistedUser;
};

const AUTH_SESSION_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}itrack-auth-session.json`
  : null;

const isPersistedUser = (value: unknown): value is PersistedUser => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.email === 'string' &&
    typeof record.phone === 'string' &&
    typeof record.role === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.isActive === 'boolean'
  );
};

const serializeUser = (user: User): PersistedUser => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
});

const deserializeUser = (user: PersistedUser): User => ({
  ...user,
  createdAt: new Date(user.createdAt),
});

export const loadPersistedAuthSession = async (): Promise<{
  token: string;
  user: User;
} | null> => {
  if (!AUTH_SESSION_FILE_URI) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(AUTH_SESSION_FILE_URI);

    if (!fileInfo.exists) {
      return null;
    }

    const rawValue = await FileSystem.readAsStringAsync(AUTH_SESSION_FILE_URI);

    if (!rawValue.trim()) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<PersistedAuthSession>;

    if (
      typeof parsed.token !== 'string' ||
      !parsed.token.trim() ||
      !isPersistedUser(parsed.user)
    ) {
      return null;
    }

    return {
      token: parsed.token.trim(),
      user: deserializeUser(parsed.user),
    };
  } catch {
    return null;
  }
};

export const persistAuthSession = async (payload: {
  token: string;
  user: User;
}) => {
  if (!AUTH_SESSION_FILE_URI) {
    return;
  }

  const serializedPayload: PersistedAuthSession = {
    token: payload.token.trim(),
    user: serializeUser(payload.user),
  };

  await FileSystem.writeAsStringAsync(
    AUTH_SESSION_FILE_URI,
    JSON.stringify(serializedPayload)
  );
};

export const clearPersistedAuthSession = async () => {
  if (!AUTH_SESSION_FILE_URI) {
    return;
  }

  await FileSystem.deleteAsync(AUTH_SESSION_FILE_URI, {
    idempotent: true,
  });
};
