'use client'

import { apiRequest } from '@/lib/api-client'
import {
  BackendDriverAllocation,
  BackendPreparation,
  BackendPopulatedUser,
  BackendTestDriveBooking,
  BackendUnitAgentAllocation,
  BackendVehicle,
  formatServiceLabel,
  getDisplayDate,
  getDisplayTime,
  getEntityId,
  getFullName,
  getRoleLabelFromBackendRole,
} from '@/lib/backend-helpers'

export type ReportSnapshot = {
  users: BackendPopulatedUser[]
  vehicles: BackendVehicle[]
  unitAllocations: BackendUnitAgentAllocation[]
  driverAllocations: BackendDriverAllocation[]
  preparations: BackendPreparation[]
  testDriveBookings: BackendTestDriveBooking[]
}

export type AuditAction = 'CREATE' | 'UPDATE'

export interface DerivedActivityRecord {
  id: string
  user: string
  action: AuditAction
  module: string
  description: string
  timestamp: string
  timestampIso: string
}

export type ReleaseHistoryStatus = 'in-preparation' | 'ready-for-pickup' | 'released'

export interface ReleaseHistoryPreparationStep {
  id: string
  task: string
  completedAt: string
  completedAtIso: string
}

export interface ReleaseHistoryEvent {
  id: string
  at: string
  atIso: string
  title: string
  detail: string
}

export interface ReleaseHistoryRecord {
  id: string
  vehicleAddedAt: string
  vehicleAddedAtIso: string
  unitName: string
  variation: string
  conductionNumber: string
  bodyColor: string
  deliveryPickupAt: string
  deliveryPickupAtIso: string
  preparationSteps: ReleaseHistoryPreparationStep[]
  agentAssigned: string
  agentAssignedAt: string
  agentAssignedAtIso: string
  customerName: string
  customerContact: string
  releasedAt: string
  releasedAtIso: string
  status: ReleaseHistoryStatus
  historyEvents: ReleaseHistoryEvent[]
}

export interface MonthlySalesPoint {
  month: string
  sales: number
  target: number
}

export interface InventoryModelPoint {
  model: string
  count: number
  percentage: number
}

export interface StatusDistributionPoint {
  name: string
  value: number
  color: string
}

export interface RecentReportRecord {
  id: string
  name: string
  type: string
  generatedBy: string
  date: string
}

export interface ReportsDashboardData {
  monthlySalesData: MonthlySalesPoint[]
  inventoryByModel: InventoryModelPoint[]
  statusDistribution: StatusDistributionPoint[]
  recentReports: RecentReportRecord[]
  unitsSold: number
  unitsSoldDelta: number
  currentInventory: number
  currentInventoryAvailable: number
  activeAgents: number
  averagePreparationTimeDays: number
  averagePreparationTimeDelta: number
  averageSalesPerAgent: number
  averageSalesPerAgentDelta: number
  testDriveConversionRate: number
  testDriveConversionDelta: number
}

const DEFAULT_MONTH_COUNT = 6
const STATUS_COLORS: Record<string, string> = {
  available: 'var(--chart-1)',
  'in-stockyard': 'var(--chart-4)',
  'in-transit': 'var(--chart-2)',
  pending: 'var(--chart-5)',
  'in-dispatch': 'var(--chart-3)',
  released: 'var(--muted)',
}

const vehicleStatusLabels: Record<string, string> = {
  available: 'Available',
  in_stockyard: 'In Stockyard',
  in_transit: 'In Transit',
  under_preparation: 'In Dispatch',
  completed: 'Released',
  maintenance: 'Pending',
}

const toDate = (value?: string | null) => {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

export const formatDateTimeLabel = (value?: string | Date | null, empty = 'Pending') => {
  const date =
    value instanceof Date ? value : typeof value === 'string' ? toDate(value) : null

  if (!date) return empty

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

const formatDateLabel = (value?: string | Date | null, empty = 'Pending') => {
  const date =
    value instanceof Date ? value : typeof value === 'string' ? toDate(value) : null

  if (!date) return empty

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

const monthShortLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(
    new Date(year, month - 1, 1)
  )
}

const rangeMonthKeys = (months = DEFAULT_MONTH_COUNT) => {
  const keys: string[] = []
  const today = new Date()

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    keys.push(monthKey(date))
  }

  return keys
}

const sortNewestFirst = <T extends { timestampIso?: string; releasedAtIso?: string }>(
  left: T,
  right: T
) =>
  new Date(right.timestampIso ?? right.releasedAtIso ?? 0).getTime() -
  new Date(left.timestampIso ?? left.releasedAtIso ?? 0).getTime()

const getLatestAllocationByVehicleId = (allocations: BackendUnitAgentAllocation[]) => {
  const latestByVehicleId = new Map<string, BackendUnitAgentAllocation>()

  allocations.forEach((allocation) => {
    const vehicleId = getEntityId(allocation.vehicleId)
    if (!vehicleId) return

    const current = latestByVehicleId.get(vehicleId)
    const currentTime = new Date(current?.createdAt ?? 0).getTime()
    const nextTime = new Date(allocation.createdAt ?? 0).getTime()

    if (!current || nextTime >= currentTime) {
      latestByVehicleId.set(vehicleId, allocation)
    }
  })

  return latestByVehicleId
}

const getVehicleMap = (vehicles: BackendVehicle[]) =>
  new Map(vehicles.map((vehicle) => [getEntityId(vehicle), vehicle]))

const formatPreparationSteps = (
  preparation: BackendPreparation,
  completedAtIso: string
): ReleaseHistoryPreparationStep[] =>
  (preparation.dispatcherChecklist ?? [])
    .filter((step) => step.completed)
    .map((step, index) => ({
      id: `${getEntityId(preparation)}-prep-${index + 1}`,
      task: step.label,
      completedAt: formatDateTimeLabel(completedAtIso),
      completedAtIso,
    }))

const resolveReleaseStatus = (status?: string): ReleaseHistoryStatus => {
  if (status === 'completed') return 'ready-for-pickup'
  if (status === 'ready_for_release') return 'released'
  return 'in-preparation'
}

export async function fetchReportSnapshot(): Promise<ReportSnapshot> {
  const [users, vehicles, unitAllocations, driverAllocations, preparations, testDriveBookings] =
    await Promise.all([
      apiRequest<BackendPopulatedUser[]>('/users'),
      apiRequest<BackendVehicle[]>('/vehicles'),
      apiRequest<BackendUnitAgentAllocation[]>('/unit-agent-allocations'),
      apiRequest<BackendDriverAllocation[]>('/driver-allocations'),
      apiRequest<BackendPreparation[]>('/preparations'),
      apiRequest<BackendTestDriveBooking[]>('/test-drive-bookings'),
    ])

  return {
    users,
    vehicles,
    unitAllocations,
    driverAllocations,
    preparations,
    testDriveBookings,
  }
}

export function deriveReleaseHistoryRecords(snapshot: ReportSnapshot): ReleaseHistoryRecord[] {
  const vehicleById = getVehicleMap(snapshot.vehicles)
  const latestAllocationByVehicleId = getLatestAllocationByVehicleId(snapshot.unitAllocations)

  return snapshot.preparations
    .filter(
      (preparation) =>
        preparation.approvalStatus === 'approved' &&
        (preparation.status === 'completed' || preparation.status === 'ready_for_release')
    )
    .map((preparation) => {
      const id = getEntityId(preparation)
      const vehicleId = getEntityId(preparation.vehicleId)
      const vehicle =
        (preparation.vehicleId && typeof preparation.vehicleId === 'object'
          ? preparation.vehicleId
          : null) ?? vehicleById.get(vehicleId)
      const unitAllocation = latestAllocationByVehicleId.get(vehicleId)
      const vehicleAddedAtIso = vehicle?.createdAt ?? preparation.createdAt ?? new Date(0).toISOString()
      const deliveryPickupAtIso =
        preparation.approvedAt ?? preparation.createdAt ?? new Date(0).toISOString()
      const releasedAtIso =
        preparation.readyForReleaseAt ??
        preparation.completedAt ??
        preparation.updatedAt ??
        preparation.createdAt ??
        new Date(0).toISOString()
      const agentAssignedAtIso =
        unitAllocation?.createdAt ?? preparation.createdAt ?? new Date(0).toISOString()
      const assignedAgent = getFullName(unitAllocation?.salesAgentId) || preparation.requestedByName || 'Unassigned'
      const completedAtIso =
        preparation.completedAt ??
        preparation.readyForReleaseAt ??
        preparation.updatedAt ??
        preparation.createdAt ??
        new Date(0).toISOString()
      const status = resolveReleaseStatus(preparation.status)
      const historyEvents: ReleaseHistoryEvent[] = [
        {
          id: `${id}-timeline-1`,
          at: formatDateTimeLabel(preparation.createdAt),
          atIso: preparation.createdAt ?? new Date(0).toISOString(),
          title: 'Preparation requested',
          detail: `${vehicle?.unitName ?? ''} ${vehicle?.variation ?? ''}`
            .trim()
            .concat(' was endorsed for preparation.'),
        },
        {
          id: `${id}-timeline-2`,
          at: formatDateTimeLabel(agentAssignedAtIso),
          atIso: agentAssignedAtIso,
          title: 'Agent assigned',
          detail: `Assigned to sales agent ${assignedAgent}.`,
        },
        {
          id: `${id}-timeline-3`,
          at: formatDateTimeLabel(deliveryPickupAtIso),
          atIso: deliveryPickupAtIso,
          title: 'Preparation approved',
          detail: `Approved by ${preparation.approvedByName ?? 'the approver'} for dispatcher processing.`,
        },
        {
          id: `${id}-timeline-4`,
          at: formatDateTimeLabel(completedAtIso),
          atIso: completedAtIso,
          title: 'Preparation completed',
          detail: 'Dispatcher checklist and requested services were completed.',
        },
      ]

      if (status === 'released') {
        historyEvents.push({
          id: `${id}-timeline-5`,
          at: formatDateTimeLabel(releasedAtIso),
          atIso: releasedAtIso,
          title: 'Vehicle released',
          detail: `Vehicle released to ${preparation.customerName ?? 'the customer'}. Contact: ${preparation.customerContactNo ?? '-'}.`,
        })
      }

      return {
        id: `VH-${id}`,
        vehicleAddedAt: formatDateTimeLabel(vehicleAddedAtIso),
        vehicleAddedAtIso,
        unitName: vehicle?.unitName ?? '',
        variation: vehicle?.variation ?? '',
        conductionNumber: vehicle?.conductionNumber ?? '',
        bodyColor: vehicle?.bodyColor ?? '',
        deliveryPickupAt: formatDateTimeLabel(deliveryPickupAtIso),
        deliveryPickupAtIso,
        preparationSteps: formatPreparationSteps(preparation, completedAtIso),
        agentAssigned: assignedAgent,
        agentAssignedAt: formatDateTimeLabel(agentAssignedAtIso),
        agentAssignedAtIso,
        customerName: preparation.customerName ?? '',
        customerContact: preparation.customerContactNo ?? '',
        releasedAt: formatDateTimeLabel(releasedAtIso),
        releasedAtIso,
        status,
        historyEvents,
      }
    })
    .sort(sortNewestFirst)
}

export function deriveActivityRecords(snapshot: ReportSnapshot): DerivedActivityRecord[] {
  const vehicleById = getVehicleMap(snapshot.vehicles)
  const latestAllocationByVehicleId = getLatestAllocationByVehicleId(snapshot.unitAllocations)
  const releaseHistory = deriveReleaseHistoryRecords(snapshot)

  const userRecords = snapshot.users.map((user) => ({
    id: `user-${getEntityId(user)}`,
    user: getFullName(user) || user.email || 'Unknown user',
    action: 'CREATE' as const,
    module: 'Users',
    description: `User account created as ${getRoleLabelFromBackendRole(user.role)}.`,
    timestamp: formatDateTimeLabel(user.createdAt),
    timestampIso: user.createdAt ?? new Date(0).toISOString(),
  }))

  const vehicleRecords = snapshot.vehicles.map((vehicle) => ({
    id: `vehicle-${getEntityId(vehicle)}`,
    user: 'System',
    action: 'CREATE' as const,
    module: 'Inventory',
    description: `Added vehicle ${vehicle.conductionNumber ?? ''} (${vehicle.unitName ?? ''} ${vehicle.variation ?? ''}).`.trim(),
    timestamp: formatDateTimeLabel(vehicle.createdAt),
    timestampIso: vehicle.createdAt ?? new Date(0).toISOString(),
  }))

  const unitAllocationRecords = snapshot.unitAllocations.map((allocation) => ({
    id: `allocation-${getEntityId(allocation)}`,
    user: getFullName(allocation.managerId) || 'Manager',
    action: 'CREATE' as const,
    module: 'Allocation',
    description: `Assigned ${getEntityId(allocation.vehicleId) ? ((allocation.vehicleId as BackendVehicle)?.conductionNumber ?? '') : ''} to ${getFullName(allocation.salesAgentId) || 'an agent'}.`,
    timestamp: formatDateTimeLabel(allocation.createdAt),
    timestampIso: allocation.createdAt ?? new Date(0).toISOString(),
  }))

  const driverAllocationRecords = snapshot.driverAllocations.map((allocation) => {
    const vehicleId = getEntityId(allocation.vehicleId)
    const vehicle =
      (allocation.vehicleId && typeof allocation.vehicleId === 'object'
        ? allocation.vehicleId
        : null) ?? vehicleById.get(vehicleId)

    return {
      id: `driver-${getEntityId(allocation)}`,
      user: getFullName(allocation.driverId) || 'Driver',
      action: 'UPDATE' as const,
      module: 'Driver Allocation',
      description: `${vehicle?.conductionNumber ?? ''} route from ${allocation.pickupLocation?.name ?? allocation.pickupLocation?.address ?? '-'} to ${allocation.destinationLocation?.name ?? allocation.destinationLocation?.address ?? '-'}. Status: ${allocation.status ?? 'pending'}.`,
      timestamp: formatDateTimeLabel(allocation.updatedAt ?? allocation.createdAt),
      timestampIso: allocation.updatedAt ?? allocation.createdAt ?? new Date(0).toISOString(),
    }
  })

  const preparationRecords = snapshot.preparations.map((preparation) => {
    const vehicleId = getEntityId(preparation.vehicleId)
    const vehicle =
      (preparation.vehicleId && typeof preparation.vehicleId === 'object'
        ? preparation.vehicleId
        : null) ?? vehicleById.get(vehicleId)

    const services = [
      ...(preparation.requestedServices ?? []).map(formatServiceLabel),
      ...(preparation.customRequests ?? []),
    ]

    return {
      id: `preparation-${getEntityId(preparation)}`,
      user: preparation.requestedByName ?? 'Unknown user',
      action: 'UPDATE' as const,
      module: 'Preparation',
      description: `${vehicle?.conductionNumber ?? ''} requested for ${services.join(', ') || 'preparation work'}. Status: ${preparation.status ?? 'pending'}.`,
      timestamp: formatDateTimeLabel(
        preparation.readyForReleaseAt ??
          preparation.completedAt ??
          preparation.updatedAt ??
          preparation.createdAt
      ),
      timestampIso:
        preparation.readyForReleaseAt ??
        preparation.completedAt ??
        preparation.updatedAt ??
        preparation.createdAt ??
        new Date(0).toISOString(),
    }
  })

  const testDriveRecords = snapshot.testDriveBookings.map((booking) => {
    const vehicleId = getEntityId(booking.vehicleId)
    const vehicle =
      (booking.vehicleId && typeof booking.vehicleId === 'object'
        ? booking.vehicleId
        : null) ?? vehicleById.get(vehicleId)

    return {
      id: `test-drive-${getEntityId(booking)}`,
      user:
        getFullName(
          snapshot.users.find((user) => getEntityId(user) === getEntityId(booking.requestedByUserId))
        ) || 'Unknown user',
      action: 'CREATE' as const,
      module: 'Test Drive',
      description: `Scheduled ${vehicle?.conductionNumber ?? ''} for ${booking.customerName ?? 'a customer'} on ${getDisplayDate(booking.scheduledDate)} ${booking.scheduledTime ? getDisplayTime(booking.scheduledTime) : ''}`.trim(),
      timestamp: formatDateTimeLabel(booking.createdAt),
      timestampIso: booking.createdAt ?? new Date(0).toISOString(),
    }
  })

  const releaseHistoryRecords = releaseHistory.map((record) => {
    const relatedAllocation = latestAllocationByVehicleId.get(
      Array.from(vehicleById.entries()).find(([, vehicle]) => vehicle.conductionNumber === record.conductionNumber)?.[0] ?? ''
    )

    return {
      id: `release-${record.id}`,
      user: record.agentAssigned || getFullName(relatedAllocation?.managerId) || 'System',
      action: 'UPDATE' as const,
      module: 'Release History',
      description: `${record.conductionNumber} released to ${record.customerName}.`,
      timestamp: record.releasedAt,
      timestampIso: record.releasedAtIso,
    }
  })

  return [
    ...releaseHistoryRecords,
    ...preparationRecords,
    ...driverAllocationRecords,
    ...unitAllocationRecords,
    ...testDriveRecords,
    ...vehicleRecords,
    ...userRecords,
  ].sort(sortNewestFirst)
}

const getPreviousMonthKey = (currentKey: string) => {
  const [year, month] = currentKey.split('-').map(Number)
  const previous = new Date(year, month - 2, 1)
  return monthKey(previous)
}

const getMonthValue = (items: Map<string, number>, key: string) => items.get(key) ?? 0

const average = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0

export function deriveReportsDashboardData(snapshot: ReportSnapshot): ReportsDashboardData {
  const releaseHistory = deriveReleaseHistoryRecords(snapshot)
  const activityRecords = deriveActivityRecords(snapshot)
  const monthKeys = rangeMonthKeys()
  const releaseCountsByMonth = new Map<string, number>()
  const testDriveCountsByMonth = new Map<string, number>()

  releaseHistory.forEach((record) => {
    const date = toDate(record.releasedAtIso)
    if (!date) return
    const key = monthKey(date)
    releaseCountsByMonth.set(key, (releaseCountsByMonth.get(key) ?? 0) + 1)
  })

  snapshot.testDriveBookings.forEach((booking) => {
    const date = toDate(booking.createdAt)
    if (!date) return
    const key = monthKey(date)
    testDriveCountsByMonth.set(key, (testDriveCountsByMonth.get(key) ?? 0) + 1)
  })

  const monthlySalesData = monthKeys.map((key) => {
    const sales = getMonthValue(releaseCountsByMonth, key)
    const target = Math.max(getMonthValue(testDriveCountsByMonth, key), sales)

    return {
      month: monthShortLabel(key),
      sales,
      target,
    }
  })

  const inventoryByModelSource = snapshot.vehicles.reduce<Record<string, number>>((accumulator, vehicle) => {
    const model = vehicle.unitName ?? 'Unknown'
    accumulator[model] = (accumulator[model] ?? 0) + 1
    return accumulator
  }, {})
  const totalInventory = snapshot.vehicles.length
  const inventoryByModel = Object.entries(inventoryByModelSource)
    .map(([model, count]) => ({
      model,
      count,
      percentage: totalInventory > 0 ? Math.round((count / totalInventory) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count)

  const statusDistributionSource = snapshot.vehicles.reduce<Record<string, number>>((accumulator, vehicle) => {
    const status = vehicle.status ?? 'available'
    accumulator[status] = (accumulator[status] ?? 0) + 1
    return accumulator
  }, {})
  const statusDistribution = Object.entries(statusDistributionSource).map(([status, value]) => ({
    name: vehicleStatusLabels[status] ?? status,
    value,
    color: STATUS_COLORS[
      status === 'in_stockyard'
        ? 'in-stockyard'
        : status === 'in_transit'
        ? 'in-transit'
        : status === 'under_preparation'
        ? 'in-dispatch'
        : status === 'completed'
        ? 'released'
        : status
    ] ?? 'var(--chart-1)',
  }))

  const recentReports = activityRecords.slice(0, 4).map((record) => ({
    id: record.id,
    name: `${record.module} Snapshot`,
    type: record.module,
    generatedBy: record.user,
    date: formatDateLabel(record.timestampIso),
  }))

  const currentMonthKey = monthKeys[monthKeys.length - 1]
  const previousMonthKey = getPreviousMonthKey(currentMonthKey)
  const unitsSold = getMonthValue(releaseCountsByMonth, currentMonthKey)
  const previousUnitsSold = getMonthValue(releaseCountsByMonth, previousMonthKey)

  const activeAgents = snapshot.users.filter((user) => user.role === 'sales_agent' && user.isActive !== false).length
  const releasedAgentNames = releaseHistory
    .map((record) => record.agentAssigned)
    .filter(Boolean)
  const uniqueReleasedAgents = new Set(releasedAgentNames)

  const completedPreparations = snapshot.preparations.filter(
    (preparation) => preparation.status === 'completed' || preparation.status === 'ready_for_release'
  )
  const averagePreparationTimeDays = average(
    completedPreparations
      .map((preparation) => {
        const start = toDate(preparation.createdAt)
        const end = toDate(preparation.readyForReleaseAt ?? preparation.completedAt ?? preparation.updatedAt)
        if (!start || !end) return null
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      })
      .filter((value): value is number => value !== null)
  )
  const previousPreparationRecords = completedPreparations.filter((preparation) => {
    const completedAt = toDate(preparation.readyForReleaseAt ?? preparation.completedAt ?? preparation.updatedAt)
    return completedAt ? monthKey(completedAt) === previousMonthKey : false
  })
  const currentPreparationRecords = completedPreparations.filter((preparation) => {
    const completedAt = toDate(preparation.readyForReleaseAt ?? preparation.completedAt ?? preparation.updatedAt)
    return completedAt ? monthKey(completedAt) === currentMonthKey : false
  })
  const averagePreparationTimeFor = (records: BackendPreparation[]) =>
    average(
      records
        .map((preparation) => {
          const start = toDate(preparation.createdAt)
          const end = toDate(preparation.readyForReleaseAt ?? preparation.completedAt ?? preparation.updatedAt)
          if (!start || !end) return null
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        })
        .filter((value): value is number => value !== null)
    )

  const currentAveragePreparation = averagePreparationTimeFor(currentPreparationRecords)
  const previousAveragePreparation = averagePreparationTimeFor(previousPreparationRecords)

  const completedTestDrives = snapshot.testDriveBookings.filter((booking) => booking.status === 'completed').length
  const actionableTestDrives = snapshot.testDriveBookings.filter((booking) =>
    ['approved', 'completed', 'cancelled', 'no_show'].includes(booking.status ?? '')
  ).length
  const testDriveConversionRate =
    actionableTestDrives > 0 ? (completedTestDrives / actionableTestDrives) * 100 : 0

  const currentMonthCompletedTestDrives = snapshot.testDriveBookings.filter((booking) => {
    const date = toDate(booking.createdAt)
    return date ? monthKey(date) === currentMonthKey && booking.status === 'completed' : false
  }).length
  const currentMonthActionableTestDrives = snapshot.testDriveBookings.filter((booking) => {
    const date = toDate(booking.createdAt)
    return date ? monthKey(date) === currentMonthKey && ['approved', 'completed', 'cancelled', 'no_show'].includes(booking.status ?? '') : false
  }).length
  const previousMonthCompletedTestDrives = snapshot.testDriveBookings.filter((booking) => {
    const date = toDate(booking.createdAt)
    return date ? monthKey(date) === previousMonthKey && booking.status === 'completed' : false
  }).length
  const previousMonthActionableTestDrives = snapshot.testDriveBookings.filter((booking) => {
    const date = toDate(booking.createdAt)
    return date ? monthKey(date) === previousMonthKey && ['approved', 'completed', 'cancelled', 'no_show'].includes(booking.status ?? '') : false
  }).length

  const currentConversion =
    currentMonthActionableTestDrives > 0
      ? (currentMonthCompletedTestDrives / currentMonthActionableTestDrives) * 100
      : 0
  const previousConversion =
    previousMonthActionableTestDrives > 0
      ? (previousMonthCompletedTestDrives / previousMonthActionableTestDrives) * 100
      : 0

  return {
    monthlySalesData,
    inventoryByModel,
    statusDistribution,
    recentReports,
    unitsSold,
    unitsSoldDelta: unitsSold - previousUnitsSold,
    currentInventory: totalInventory,
    currentInventoryAvailable: snapshot.vehicles.filter((vehicle) => vehicle.status === 'available').length,
    activeAgents,
    averagePreparationTimeDays,
    averagePreparationTimeDelta: currentAveragePreparation - previousAveragePreparation,
    averageSalesPerAgent: uniqueReleasedAgents.size > 0 ? releaseHistory.length / uniqueReleasedAgents.size : 0,
    averageSalesPerAgentDelta:
      activeAgents > 0 ? unitsSold / Math.max(activeAgents, 1) - previousUnitsSold / Math.max(activeAgents, 1) : 0,
    testDriveConversionRate,
    testDriveConversionDelta: currentConversion - previousConversion,
  }
}
