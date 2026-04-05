import type { Role } from '@/lib/rbac'

export type ScopedRoleData = {
  roleTitle: string
  managerName?: string
  agentName?: string
  agentNames: string[]
}

const managerAgentMap: Record<string, string[]> = {
  'Carlos Garcia': ['Juan Dela Cruz', 'Anna Lim', 'Pedro Reyes'],
  'Maria Santos': ['Mike Santos', 'Liza Cruz', 'Robert Mendoza'],
}

export function getScopedRoleData(role: Role): ScopedRoleData {
  if (role === 'manager') {
    return {
      roleTitle: 'Manager',
      managerName: 'Carlos Garcia',
      agentNames: managerAgentMap['Carlos Garcia'],
    }
  }

  if (role === 'sales-agent') {
    return {
      roleTitle: 'Sales Agent',
      managerName: 'Carlos Garcia',
      agentName: 'Juan Dela Cruz',
      agentNames: ['Juan Dela Cruz'],
    }
  }

  return {
    roleTitle: role === 'supervisor' ? 'Supervisor' : 'Admin',
    agentNames: Object.values(managerAgentMap).flat(),
  }
}

export function matchesScopedAgent(role: Role, agentName?: string | null) {
  if (!agentName) return role === 'admin' || role === 'supervisor'

  const scope = getScopedRoleData(role)

  if (role === 'admin' || role === 'supervisor') return true

  return scope.agentNames.includes(agentName)
}

export function matchesScopedManager(role: Role, managerName?: string | null) {
  if (!managerName) return role === 'admin' || role === 'supervisor'

  const scope = getScopedRoleData(role)

  if (role === 'admin' || role === 'supervisor') return true

  if (role === 'manager') return scope.managerName === managerName

  return scope.managerName === managerName
}
