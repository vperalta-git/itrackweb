'use client'

export interface SystemUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'admin' | 'manager' | 'sales-agent' | 'dispatch' | 'driver' | 'supervisor'
  department: string
  status: 'active' | 'inactive'
  lastLogin: string
  createdAt: string
}

export const USERS_STORAGE_KEY = 'itrack.system.users'
export const USERS_UPDATED_EVENT = 'users-updated'

export const usersSeed: SystemUser[] = [
  {
    id: '1',
    employeeId: 'EMP-001',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@isuzupasig.com',
    phone: '+63 917 111 2222',
    role: 'admin',
    department: 'IT Department',
    status: 'active',
    lastLogin: '2024-02-05 09:30 AM',
    createdAt: '2023-06-15',
  },
  {
    id: '2',
    employeeId: 'EMP-002',
    firstName: 'Carlos',
    lastName: 'Garcia',
    email: 'carlos.garcia@isuzupasig.com',
    phone: '+63 918 222 3333',
    role: 'manager',
    department: 'Sales Department',
    status: 'active',
    lastLogin: '2024-02-05 08:45 AM',
    createdAt: '2023-07-20',
  },
  {
    id: '3',
    employeeId: 'EMP-003',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@isuzupasig.com',
    phone: '+63 919 333 4444',
    role: 'sales-agent',
    department: 'Sales Department',
    status: 'active',
    lastLogin: '2024-02-05 10:15 AM',
    createdAt: '2023-08-10',
  },
  {
    id: '4',
    employeeId: 'EMP-004',
    firstName: 'Anna',
    lastName: 'Lim',
    email: 'anna.lim@isuzupasig.com',
    phone: '+63 920 444 5555',
    role: 'sales-agent',
    department: 'Sales Department',
    status: 'active',
    lastLogin: '2024-02-04 04:30 PM',
    createdAt: '2023-09-01',
  },
  {
    id: '5',
    employeeId: 'EMP-005',
    firstName: 'Roberto',
    lastName: 'Cruz',
    email: 'roberto.cruz@isuzupasig.com',
    phone: '+63 921 555 6666',
    role: 'driver',
    department: 'Operations',
    status: 'active',
    lastLogin: '2024-02-05 07:00 AM',
    createdAt: '2023-10-15',
  },
  {
    id: '6',
    employeeId: 'EMP-006',
    firstName: 'Pedro',
    lastName: 'Reyes',
    email: 'pedro.reyes@isuzupasig.com',
    phone: '+63 922 666 7777',
    role: 'sales-agent',
    department: 'Sales Department',
    status: 'inactive',
    lastLogin: '2024-01-15 02:00 PM',
    createdAt: '2023-05-20',
  },
  {
    id: '7',
    employeeId: 'EMP-007',
    firstName: 'Liza',
    lastName: 'Mendoza',
    email: 'liza.mendoza@isuzupasig.com',
    phone: '+63 923 777 8888',
    role: 'dispatch',
    department: 'Operations',
    status: 'active',
    lastLogin: '2024-02-05 09:05 AM',
    createdAt: '2023-11-03',
  },
  {
    id: '8',
    employeeId: 'EMP-008',
    firstName: 'Ramon',
    lastName: 'Flores',
    email: 'ramon.flores@isuzupasig.com',
    phone: '+63 924 888 9999',
    role: 'supervisor',
    department: 'Operations',
    status: 'inactive',
    lastLogin: '2024-01-20 11:10 AM',
    createdAt: '2023-04-18',
  },
]

export function loadUsers(): SystemUser[] {
  if (typeof window === 'undefined') return usersSeed

  const stored = window.localStorage.getItem(USERS_STORAGE_KEY)
  if (!stored) return usersSeed

  try {
    return JSON.parse(stored) as SystemUser[]
  } catch {
    return usersSeed
  }
}

export function persistUsers(users: SystemUser[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  window.dispatchEvent(new Event(USERS_UPDATED_EVENT))
}
