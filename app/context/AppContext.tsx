import React, { createContext, useContext, useState } from 'react';
import { Notification } from '../types';

interface AppContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, read: true, readAt: new Date() }
          : n
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value: AppContextType = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    isDarkMode,
    setIsDarkMode,
    isLoading,
    setIsLoading,
  };

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
