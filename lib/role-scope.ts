import { getSessionUser } from '@/lib/session'
import { loadUsers } from '@/lib/user-data'
import type { Role } from '@/lib/rbac'

export type ScopedRoleData = {
  roleTitle: string
  managerName?: string
  agentName?: string
  agentNames: string[]
}

const getUserName = (input: { firstName?: string; lastName?: string } | null | undefined) =>
  `${input?.firstName ?? ''} ${input?.lastName ?? ''}`.trim()

export function getScopedRoleData(role: Role): ScopedRoleData {
  const sessionUser = getSessionUser()
  const currentUserName = getUserName(sessionUser)
  const allUsers = loadUsers()

  if (role === 'manager') {
    const agentNames = allUsers
      .filter((user) => user.role === 'sales-agent' && user.managerId === sessionUser?.id)
      .map((user) => getUserName(user))
      .filter(Boolean)

    return {
      roleTitle: 'Manager',
      managerName: currentUserName,
      agentNames,
    }
  }

  if (role === 'sales-agent') {
    return {
      roleTitle: 'Sales Agent',
      managerName: sessionUser?.managerName ?? undefined,
      agentName: currentUserName,
      agentNames: currentUserName ? [currentUserName] : [],
    }
  }

  return {
    roleTitle: role === 'supervisor' ? 'Supervisor' : 'Admin',
    agentNames: allUsers
      .filter((user) => user.role === 'sales-agent')
      .map((user) => getUserName(user))
      .filter(Boolean),
  }
}

export function matchesScopedAgent(role: Role, agentName?: string | null) {
  if (!agentName) return role === 'admin' || role === 'supervisor'

  if (role === 'admin' || role === 'supervisor') return true

  const scope = getScopedRoleData(role)

  if (role === 'manager') {
    return scope.agentNames.length === 0 || scope.agentNames.includes(agentName)
  }

  return scope.agentName === agentName
}

export function matchesScopedManager(role: Role, managerName?: string | null) {
  if (!managerName) return role === 'admin' || role === 'supervisor'

  if (role === 'admin' || role === 'supervisor') return true

  const scope = getScopedRoleData(role)
  return scope.managerName === managerName
}
