import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import {
  api,
  getApiErrorMessage,
  getResponseData,
  getResponseMessage,
  setApiAuthToken,
} from '../lib/api';
import { preloadMobileData } from '../data/bootstrap';
import { syncUserManagementRecordProfile } from '../data/users';
import {
  clearPersistedAuthSession,
  loadPersistedAuthSession,
  persistAuthSession,
} from '../lib/authStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateProfile: (profile: {
    name: string;
    email: string;
    phone: string;
    bio: string;
    avatar?: string | null;
  }) => Promise<User>;
  changePassword: (
    currentPassword: string,
    nextPassword: string
  ) => Promise<void>;
  requestPasswordResetOtp: (email: string) => Promise<string>;
  verifyPasswordResetOtp: (email: string, otpCode: string) => Promise<string>;
  resetPasswordWithOtp: (payload: {
    email: string;
    otpCode: string;
    nextPassword: string;
  }) => Promise<string>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUserRecord = (record: UserApiRecord): User => ({
  id: record.id,
  name: `${record.firstName} ${record.lastName}`.trim(),
  email: record.email,
  phone: record.phone,
  bio: record.bio?.trim() || '',
  avatar: record.avatarUrl ?? undefined,
  role: record.role,
  isActive: record.isActive,
  createdAt: new Date(record.createdAt),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const persistedSession = await loadPersistedAuthSession();

        if (!isMounted) {
          return;
        }

        if (persistedSession) {
          setApiAuthToken(persistedSession.token);
          setUser(persistedSession.user);
          setToken(persistedSession.token);
          syncUserManagementRecordProfile(persistedSession.user);
        } else {
          setApiAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      void preloadMobileData().catch(() => undefined);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      const data = getResponseData<{
        token: string;
        user: UserApiRecord;
      }>(response);
      const nextUser = mapUserRecord(data.user);

      setApiAuthToken(data.token);
      setUser(nextUser);
      setToken(data.token);
      await persistAuthSession({
        user: nextUser,
        token: data.token,
      }).catch(() => undefined);
      await preloadMobileData().catch(() => undefined);
      syncUserManagementRecordProfile(nextUser);

      return nextUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setApiAuthToken(null);
    setUser(null);
    setToken(null);
    void clearPersistedAuthSession().catch(() => undefined);
  };

  const updateProfile = async ({
    name,
    email,
    phone,
    bio,
    avatar,
  }: {
    name: string;
    email: string;
    phone: string;
    bio: string;
    avatar?: string | null;
  }) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }

    try {
      const [firstName = '', ...rest] = name
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ');
      const lastName = rest.join(' ');
      const response = await api.patch(`/users/${user.id}`, {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatarUrl: avatar ?? null,
      });
      const updatedUser = mapUserRecord(getResponseData<UserApiRecord>(response));

      setUser(updatedUser);
      if (token) {
        void persistAuthSession({
          user: updatedUser,
          token,
        }).catch(() => undefined);
      }
      syncUserManagementRecordProfile(updatedUser);

      return updatedUser;
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, 'The profile could not be updated right now.')
      );
    }
  };

  const changePassword = async (
    currentPassword: string,
    nextPassword: string
  ) => {
    if (!user) {
      throw new Error('You must be signed in to change your password.');
    }

    await api.post('/auth/change-password', {
      userId: user.id,
      currentPassword,
      nextPassword,
    });
  };

  const requestPasswordResetOtp = async (email: string) => {
    const response = await api.post('/auth/forgot-password/request-otp', {
      email: email.trim().toLowerCase(),
    });

    return (
      getResponseMessage(response) ||
      'If an active account exists for that email, we sent a 6-digit OTP code.'
    );
  };

  const verifyPasswordResetOtp = async (email: string, otpCode: string) => {
    const response = await api.post('/auth/forgot-password/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: otpCode.trim(),
    });

    return (
      getResponseMessage(response) ||
      'OTP verified. You can now create a new password.'
    );
  };

  const resetPasswordWithOtp = async ({
    email,
    otpCode,
    nextPassword,
  }: {
    email: string;
    otpCode: string;
    nextPassword: string;
  }) => {
    const response = await api.post('/auth/forgot-password/reset', {
      email: email.trim().toLowerCase(),
      otp: otpCode.trim(),
      nextPassword,
    });

    return (
      getResponseMessage(response) ||
      'Your password has been reset. You can sign in with the new password.'
    );
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: [
        'manage_vehicles',
        'manage_users',
        'manage_allocations',
        'manage_drivers',
        'view_reports',
        'manage_test_drives',
        'manage_preparation',
        'view_audit_trail',
      ],
      [UserRole.SUPERVISOR]: [
        'manage_vehicles',
        'manage_allocations',
        'manage_drivers',
        'view_reports',
        'manage_test_drives',
        'manage_preparation',
        'view_audit_trail',
      ],
      [UserRole.MANAGER]: [
        'view_vehicles',
        'manage_team_allocations',
        'manage_team_drivers',
        'view_team_reports',
        'manage_test_drives',
        'view_audit_trail',
      ],
      [UserRole.SALES_AGENT]: [
        'view_vehicles',
        'create_allocations',
        'view_personal_allocations',
        'manage_test_drives',
        'view_personal_reports',
      ],
      [UserRole.DISPATCHER]: [
        'view_vehicles',
        'manage_dispatch',
        'view_preparation',
        'view_dispatch_history',
      ],
      [UserRole.DRIVER]: [
        'view_assigned_vehicle',
        'update_location',
        'view_trip_details',
        'update_trip_status',
      ],
    };

    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    changePassword,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
