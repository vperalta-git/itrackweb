// User Roles
export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager',
  SALES_AGENT = 'sales_agent',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
}

// Vehicle Status
export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_STOCKYARD = 'in_stockyard',
  IN_TRANSIT = 'in_transit',
  UNDER_PREPARATION = 'under_preparation',
  COMPLETED = 'completed',
  MAINTENANCE = 'maintenance',
}

// Allocation Status
export enum AllocationStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Preparation Status
export enum PreparationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Service Type
export enum ServiceType {
  CARWASH = 'carwash',
  TINTING = 'tinting',
  DETAILING = 'detailing',
  INSPECTION = 'inspection',
  MAINTENANCE = 'maintenance',
  PAINTING = 'painting',
}

// Test Drive Status
export enum TestDriveStatus {
  AVAILABLE = 'available',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Notification Types
export enum NotificationType {
  SYSTEM = 'system',
  VEHICLE = 'vehicle',
  DRIVER = 'driver',
  ALERT = 'alert',
  MESSAGE = 'message',
}

// User Type
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  managerId?: string;
  createdAt: Date;
  isActive: boolean;
}

// Vehicle Type
export interface Vehicle {
  id: string;
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  createdAt: Date;
  image?: string;
}

// Driver Type
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicle?: Vehicle;
  status: 'available' | 'on_trip' | 'on_break' | 'offline';
  location?: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  completedTrips: number;
  createdAt: Date;
}

// Allocation Type
export interface Allocation {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  driverId: string;
  driver?: Driver;
  agentId: string;
  agent?: User;
  status: AllocationStatus;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinationLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  createdAt: Date;
}

// Preparation Request Type
export interface PreparationRequest {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  services: ServiceType[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: PreparationStatus;
  notes?: string;
  estimatedCompletion: Date;
  actualCompletion?: Date;
  smsSent: boolean;
  emailSent: boolean;
  createdAt: Date;
  dispatcherId?: string;
}

// Test Drive Unit Type
export interface TestDriveUnit {
  id: string;
  unitName: string;
  variation: string;
  bodyColor: string;
  conductionNumber: string;
  status: TestDriveStatus;
  createdAt: Date;
}

// Test Drive Schedule Type
export interface TestDriveSchedule {
  id: string;
  unitId: string;
  unit?: TestDriveUnit;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: TestDriveStatus;
  notes?: string;
  createdAt: Date;
}

// Notification Type
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Audit Log Type
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

// Auth Response Type
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// API Response Type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Pagination Type
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated Response Type
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
