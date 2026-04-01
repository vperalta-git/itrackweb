import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate checking for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, check AsyncStorage or make an API call
        // For now, we'll just set loading to false
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock authentication - in production, call your API
      // For demo, create a mock user based on email
      const mockUser: User = {
        id: '1',
        name: 'Demo Admin',
        email: email,
        phone: '+1234567890',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
      };

      setUser(mockUser);
      setToken('mock-jwt-token-' + Date.now());
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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

    // Define role-based permissions
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
