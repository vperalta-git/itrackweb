import { UserRole } from '../types';

export type AppModuleKey =
  | 'dashboard'
  | 'vehicleStocks'
  | 'vehiclePreparation'
  | 'unitAgentAllocation'
  | 'driverAllocation'
  | 'testDrive'
  | 'userManagement'
  | 'reports'
  | 'checklist'
  | 'dispatchHistory'
  | 'driverHistory';

export interface ModuleAccess {
  scopeLabel: string;
  scopeNote: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewDetails?: boolean;
  canSearch?: boolean;
  canFilter?: boolean;
  canPaginate?: boolean;
  canExportPdf?: boolean;
  canViewAuditTrail?: boolean;
  canViewReleaseHistory?: boolean;
  canTrackMap?: boolean;
  showAnalytics?: boolean;
  showFilters?: boolean;
  showPendings?: boolean;
  showCompleted?: boolean;
  canStartTrip?: boolean;
  canEndTrip?: boolean;
  oneActiveCarOnly?: boolean;
}

export interface SidebarMenuItem {
  key: AppModuleKey;
  label: string;
  badge: string;
  href: string;
  description: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

interface RoleAccessProfile {
  roleLabel: string;
  defaultHref: string;
  sections: SidebarSection[];
  hiddenRoutes: string[];
  moduleAccess: Partial<Record<AppModuleKey, ModuleAccess>>;
}

const PROFILE_ROUTE = '/(tabs)/profile';
const NOTIFICATIONS_ROUTE = '/(tabs)/notifications';
const ROLE_ROUTE_GROUPS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '(admin)',
  [UserRole.SUPERVISOR]: '(supervisor)',
  [UserRole.MANAGER]: '(manager)',
  [UserRole.SALES_AGENT]: '(sales-agent)',
  [UserRole.DISPATCHER]: '(dispatcher)',
  [UserRole.DRIVER]: '(driver)',
};
const ADMIN_AREA_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.MANAGER,
  UserRole.SALES_AGENT,
] as const;
const FULL_ADMIN_HIDDEN_SCREENS = [
  'add-stock',
  'unit-setup-form',
  'vehicle-detail',
  'preparation-form',
  'preparation-detail',
  'driver-allocation-form',
  'driver-detail',
  'test-drive-detail',
  'test-drive-form',
  'user-form',
  'user-detail',
  'release-history-detail',
];
const MANAGER_HIDDEN_SCREENS = [
  'unit-setup-form',
  'vehicle-detail',
  'preparation-detail',
  'driver-allocation-form',
  'driver-detail',
  'test-drive-detail',
  'test-drive-form',
  'release-history-detail',
];
const SALES_AGENT_HIDDEN_SCREENS = [
  'unit-setup-form',
  'driver-allocation-form',
  'driver-detail',
  'test-drive-detail',
  'test-drive-form',
  'release-history-detail',
];
const ADMIN_AREA_DETAIL_LABELS = [
  ['add-stock', 'Vehicle Stocks'],
  ['unit-setup-form', 'Vehicle Stocks'],
  ['vehicle-detail', 'Vehicle Stocks'],
  ['preparation-form', 'Vehicle Preparation'],
  ['preparation-detail', 'Vehicle Preparation'],
  ['driver-allocation-form', 'Driver Allocation'],
  ['driver-detail', 'Driver Allocation'],
  ['test-drive-detail', 'Test Drive'],
  ['test-drive-form', 'Test Drive'],
  ['user-form', 'User Management'],
  ['user-detail', 'User Management'],
  ['release-history-detail', 'Release History'],
] as const;

const sidebarItem = (
  key: AppModuleKey,
  label: string,
  badge: string,
  href: string,
  description: string
): SidebarMenuItem => ({
  key,
  label,
  badge,
  href,
  description,
});

export const getRoleRouteGroup = (role: UserRole): string =>
  ROLE_ROUTE_GROUPS[role];

export const getRoleRoute = (role: UserRole, screen: string): string =>
  `/(tabs)/${getRoleRouteGroup(role)}/${screen}`;

const buildHiddenRoutes = (role: UserRole, screens: readonly string[]) =>
  screens.map((screen) => getRoleRoute(role, screen));

const createAdminAreaMenuCatalog = (role: UserRole) => ({
  vehicleStocks: sidebarItem(
    'vehicleStocks',
    'Vehicle Stocks',
    'VS',
    getRoleRoute(role, 'vehicles'),
    'Vehicle inventory, status, and stock visibility.'
  ),
  vehiclePreparation: sidebarItem(
    'vehiclePreparation',
    'Vehicle Preparation',
    'VP',
    getRoleRoute(role, 'preparation'),
    'Preparation requests and checklist progress.'
  ),
  driverAllocation: sidebarItem(
    'driverAllocation',
    'Driver Allocation',
    'DA',
    getRoleRoute(role, 'driver-allocation'),
    'Driver assignment, ETA monitoring, and map tracking.'
  ),
  testDrive: sidebarItem(
    'testDrive',
    'Test Drive',
    'TD',
    getRoleRoute(role, 'test-drive'),
    'Test drive units, schedules, and bookings.'
  ),
  userManagement: sidebarItem(
    'userManagement',
    'User Management',
    'UM',
    getRoleRoute(role, 'users'),
    'User accounts, roles, and account status.'
  ),
  reports: sidebarItem(
    'reports',
    'Reports',
    'RA',
    getRoleRoute(role, 'reports'),
    'Reports, audit trail, release history, and exports.'
  ),
});

const unitAgentAllocationMenuItem = sidebarItem(
  'unitAgentAllocation',
  'Agent Allocation',
  'UA',
  '/(tabs)/(allocations)',
  'Assign units to managers and sales agents.'
);
const adminMenuCatalog = createAdminAreaMenuCatalog(UserRole.ADMIN);
const supervisorMenuCatalog = createAdminAreaMenuCatalog(UserRole.SUPERVISOR);
const managerMenuCatalog = createAdminAreaMenuCatalog(UserRole.MANAGER);
const salesAgentMenuCatalog = createAdminAreaMenuCatalog(UserRole.SALES_AGENT);
const dispatchHistoryMenuItem = sidebarItem(
  'dispatchHistory',
  'Release History',
  'DH',
  getRoleRoute(UserRole.DISPATCHER, 'history'),
  'Completed dispatch records with filters and history.'
);
const driverHistoryMenuItem = sidebarItem(
  'driverHistory',
  'Trip History',
  'HI',
  getRoleRoute(UserRole.DRIVER, 'history'),
  'Completed trip history with search and review.'
);

const dashboardMenuItemsByRole: Record<UserRole, SidebarMenuItem> = {
  [UserRole.ADMIN]: sidebarItem(
    'dashboard',
    'Dashboard',
    'DB',
    getRoleRoute(UserRole.ADMIN, 'dashboard'),
    'Analytics, filters, and operating summaries.'
  ),
  [UserRole.SUPERVISOR]: sidebarItem(
    'dashboard',
    'Dashboard',
    'DB',
    getRoleRoute(UserRole.SUPERVISOR, 'dashboard'),
    'Analytics, filters, and operating summaries.'
  ),
  [UserRole.MANAGER]: sidebarItem(
    'dashboard',
    'Dashboard',
    'DB',
    getRoleRoute(UserRole.MANAGER, 'dashboard'),
    'Analytics, filters, and operating summaries.'
  ),
  [UserRole.SALES_AGENT]: sidebarItem(
    'dashboard',
    'Dashboard',
    'DB',
    getRoleRoute(UserRole.SALES_AGENT, 'dashboard'),
    'Analytics, filters, and operating summaries.'
  ),
  [UserRole.DISPATCHER]: sidebarItem(
    'dashboard',
    'Vehicle Preparation Monitoring',
    'DB',
    getRoleRoute(UserRole.DISPATCHER, 'dashboard'),
    'Pending dispatcher checklist queue, approvals, and dispatch readiness.'
  ),
  [UserRole.DRIVER]: sidebarItem(
    'dashboard',
    'Assigned Delivery',
    'DB',
    getRoleRoute(UserRole.DRIVER, 'dashboard'),
    'Live trip map, start and end controls, and active car status.'
  ),
};

const roleProfiles: Record<UserRole, RoleAccessProfile> = {
  [UserRole.ADMIN]: {
    roleLabel: 'Admin',
    defaultHref: dashboardMenuItemsByRole[UserRole.ADMIN].href,
    sections: [
      {
        title: 'Overview',
        items: [dashboardMenuItemsByRole[UserRole.ADMIN]],
      },
      {
        title: 'Operations',
        items: [
          adminMenuCatalog.vehicleStocks,
          adminMenuCatalog.vehiclePreparation,
          unitAgentAllocationMenuItem,
          adminMenuCatalog.driverAllocation,
          adminMenuCatalog.testDrive,
        ],
      },
      {
        title: 'Administration',
        items: [adminMenuCatalog.userManagement, adminMenuCatalog.reports],
      },
    ],
    hiddenRoutes: [
      ...buildHiddenRoutes(UserRole.ADMIN, FULL_ADMIN_HIDDEN_SCREENS),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Full operational visibility',
        scopeNote:
          'Dashboard analytics and filters cover the full fleet, allocation activity, preparation requests, users, and reports.',
        showAnalytics: true,
        showFilters: true,
      },
      vehicleStocks: {
        scopeLabel: 'Full vehicle control',
        scopeNote:
          'You can add, edit, delete, view, search, filter, paginate, and export all vehicle stock records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      vehiclePreparation: {
        scopeLabel: 'Full preparation control',
        scopeNote:
          'You can manage all preparation requests, view progress, and export preparation records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      unitAgentAllocation: {
        scopeLabel: 'Full allocation control',
        scopeNote:
          'You can manage agent allocations, review assigned units, and export allocation records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      driverAllocation: {
        scopeLabel: 'Full driver dispatch control',
        scopeNote:
          'You can manage all driver allocations, open detail views, and monitor trips on the live map.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
        canTrackMap: true,
      },
      testDrive: {
        scopeLabel: 'Full test drive control',
        scopeNote:
          'You can manage test drive units, schedules, and customer bookings across the whole system.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      userManagement: {
        scopeLabel: 'Full user administration',
        scopeNote:
          'You can add, edit, activate, deactivate, view, delete, filter, paginate, and export user records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      reports: {
        scopeLabel: 'Full reporting access',
        scopeNote:
          'You can view reports, audit trail, release history, and export PDF documents.',
        canViewAuditTrail: true,
        canViewReleaseHistory: true,
        canPaginate: true,
        canExportPdf: true,
      },
    },
  },
  [UserRole.SUPERVISOR]: {
    roleLabel: 'Supervisor',
    defaultHref: dashboardMenuItemsByRole[UserRole.SUPERVISOR].href,
    sections: [
      {
        title: 'Overview',
        items: [dashboardMenuItemsByRole[UserRole.SUPERVISOR]],
      },
      {
        title: 'Operations',
        items: [
          supervisorMenuCatalog.vehicleStocks,
          supervisorMenuCatalog.vehiclePreparation,
          unitAgentAllocationMenuItem,
          supervisorMenuCatalog.driverAllocation,
          supervisorMenuCatalog.testDrive,
        ],
      },
      {
        title: 'Administration',
        items: [
          supervisorMenuCatalog.userManagement,
          supervisorMenuCatalog.reports,
        ],
      },
    ],
    hiddenRoutes: [
      ...buildHiddenRoutes(UserRole.SUPERVISOR, FULL_ADMIN_HIDDEN_SCREENS),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Full team visibility',
        scopeNote:
          'You can monitor analytics, apply filters, and oversee all operational modules with supervisor-level access.',
        showAnalytics: true,
        showFilters: true,
      },
      vehicleStocks: {
        scopeLabel: 'Full vehicle control',
        scopeNote:
          'You can add, edit, delete, view, search, filter, paginate, and export all vehicle stock records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      vehiclePreparation: {
        scopeLabel: 'Full preparation control',
        scopeNote:
          'You can manage all preparation requests, monitor progress, and export records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      unitAgentAllocation: {
        scopeLabel: 'Full allocation control',
        scopeNote:
          'You can create, edit, delete, review, and export agent allocation records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      driverAllocation: {
        scopeLabel: 'Full driver dispatch control',
        scopeNote:
          'You can manage all driver allocations, open detail views, and monitor trips on the live map.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
        canTrackMap: true,
      },
      testDrive: {
        scopeLabel: 'Full test drive control',
        scopeNote:
          'You can manage test drive units, schedules, search, pagination, and exports.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      userManagement: {
        scopeLabel: 'User management access',
        scopeNote:
          'You can review, activate, deactivate, and manage user accounts, roles, and account records.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      reports: {
        scopeLabel: 'Full reporting access',
        scopeNote:
          'You can view reports, audit trail, release history, and export PDF documents.',
        canViewAuditTrail: true,
        canViewReleaseHistory: true,
        canPaginate: true,
        canExportPdf: true,
      },
    },
  },
  [UserRole.MANAGER]: {
    roleLabel: 'Manager',
    defaultHref: dashboardMenuItemsByRole[UserRole.MANAGER].href,
    sections: [
      {
        title: 'Overview',
        items: [dashboardMenuItemsByRole[UserRole.MANAGER]],
      },
      {
        title: 'Team Operations',
        items: [
          managerMenuCatalog.vehicleStocks,
          managerMenuCatalog.vehiclePreparation,
          managerMenuCatalog.driverAllocation,
          managerMenuCatalog.testDrive,
          managerMenuCatalog.reports,
        ],
      },
    ],
    hiddenRoutes: [
      ...buildHiddenRoutes(UserRole.MANAGER, MANAGER_HIDDEN_SCREENS),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Team analytics',
        scopeNote:
          'Dashboard analytics and filters are limited to the agents assigned under your management.',
        showAnalytics: true,
        showFilters: true,
      },
      vehicleStocks: {
        scopeLabel: 'Read-only team stock view',
        scopeNote:
          'You can list, search, filter, paginate, open, and export vehicle records only for agents assigned to your team.',
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      vehiclePreparation: {
        scopeLabel: 'Read-only team preparation view',
        scopeNote:
          'You can review and export preparation requests only for agents under your team, with search, filters, and pagination.',
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      driverAllocation: {
        scopeLabel: 'Read-only team driver tracking',
        scopeNote:
          'You can monitor and export the live driver tracking view for your team, while allocation management stays with Admin or Supervisor.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canTrackMap: true,
        canExportPdf: true,
      },
      testDrive: {
        scopeLabel: 'Team test drive control',
        scopeNote:
          'You can add, edit, delete, review, and export test drive units and schedules for your team.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      reports: {
        scopeLabel: 'Team reports only',
        scopeNote:
          'Reports and release history are limited to agents assigned to your team. Audit trail is not part of manager access.',
        canViewReleaseHistory: true,
        canPaginate: true,
        canExportPdf: true,
      },
    },
  },
  [UserRole.SALES_AGENT]: {
    roleLabel: 'Sales Agent',
    defaultHref: dashboardMenuItemsByRole[UserRole.SALES_AGENT].href,
    sections: [
      {
        title: 'Overview',
        items: [dashboardMenuItemsByRole[UserRole.SALES_AGENT]],
      },
      {
        title: 'My Work',
        items: [
          salesAgentMenuCatalog.vehicleStocks,
          salesAgentMenuCatalog.vehiclePreparation,
          salesAgentMenuCatalog.driverAllocation,
          salesAgentMenuCatalog.testDrive,
          salesAgentMenuCatalog.reports,
        ],
      },
    ],
    hiddenRoutes: [
      ...buildHiddenRoutes(UserRole.SALES_AGENT, SALES_AGENT_HIDDEN_SCREENS),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Personal analytics',
        scopeNote:
          'Dashboard analytics and filters only reflect the records allocated to your account.',
        showAnalytics: true,
        showFilters: true,
      },
      vehicleStocks: {
        scopeLabel: 'My vehicle stock records',
        scopeNote:
          'You can list, search, filter, paginate, and export only the vehicle stock records assigned to you.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      vehiclePreparation: {
        scopeLabel: 'My preparation records',
        scopeNote:
          'You can list, search, filter, paginate, and export only the preparation requests assigned to you.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      driverAllocation: {
        scopeLabel: 'My driver tracking view',
        scopeNote:
          'You can monitor and export your live driver tracking view only, while allocation management stays with Admin or Supervisor.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canTrackMap: true,
        canExportPdf: true,
      },
      testDrive: {
        scopeLabel: 'Own test drive management',
        scopeNote:
          'You can add, export, and manage only the test drive records you own.',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewDetails: true,
        canSearch: true,
        canFilter: true,
        canPaginate: true,
        canExportPdf: true,
      },
      reports: {
        scopeLabel: 'My reports only',
        scopeNote:
          'Reports and release history are limited to your own allocated records. Audit trail is not part of sales access.',
        canViewReleaseHistory: true,
        canPaginate: true,
        canExportPdf: true,
      },
    },
  },
  [UserRole.DISPATCHER]: {
    roleLabel: 'Dispatcher',
    defaultHref: dashboardMenuItemsByRole[UserRole.DISPATCHER].href,
    sections: [
      {
        title: 'Dispatch',
        items: [
          dashboardMenuItemsByRole[UserRole.DISPATCHER],
          dispatchHistoryMenuItem,
        ],
      },
    ],
    hiddenRoutes: [
      getRoleRoute(UserRole.DISPATCHER, 'checklist'),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Dispatch control center',
        scopeNote:
          'Review approved vehicle preparation endorsements, pending dispatcher checklist workload, and completed dispatch clearances from one dashboard.',
        showAnalytics: true,
        showPendings: true,
        showCompleted: true,
      },
      checklist: {
        scopeLabel: 'Checklist processing',
        scopeNote:
          'You can process approved vehicle preparation checklist steps before dispatch release.',
        canViewDetails: true,
      },
      dispatchHistory: {
        scopeLabel: 'Dispatch history access',
        scopeNote:
          'You can review completed dispatcher checklist history records with search, filters, and pagination.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
      },
    },
  },
  [UserRole.DRIVER]: {
    roleLabel: 'Driver',
    defaultHref: dashboardMenuItemsByRole[UserRole.DRIVER].href,
    sections: [
      {
        title: 'Driving',
        items: [dashboardMenuItemsByRole[UserRole.DRIVER], driverHistoryMenuItem],
      },
    ],
    hiddenRoutes: [
      getRoleRoute(UserRole.DRIVER, 'trip-detail'),
      NOTIFICATIONS_ROUTE,
      PROFILE_ROUTE,
    ],
    moduleAccess: {
      dashboard: {
        scopeLabel: 'Single active trip workspace',
        scopeNote:
          'The driver dashboard tracks one active car at a time and provides the map tracker plus Start and End controls.',
        canTrackMap: true,
        canStartTrip: true,
        canEndTrip: true,
        oneActiveCarOnly: true,
      },
      driverHistory: {
        scopeLabel: 'Trip history access',
        scopeNote:
          'You can review completed trips with search, filters, and pagination.',
        canSearch: true,
        canFilter: true,
        canPaginate: true,
      },
    },
  },
};

const detailRouteLabels: Record<string, string> = {
  ...Object.fromEntries(
    ADMIN_AREA_ROLES.flatMap((role) =>
      ADMIN_AREA_DETAIL_LABELS.map(([screen, label]) => [
        getRoleRoute(role, screen),
        label,
      ])
    )
  ),
  [getRoleRoute(UserRole.DISPATCHER, 'checklist')]: 'Checklist',
  [getRoleRoute(UserRole.DRIVER, 'trip-detail')]: 'Driver History',
  [NOTIFICATIONS_ROUTE]: 'Notifications',
  [PROFILE_ROUTE]: 'Profile',
};

export const getRoleLabel = (role: UserRole): string =>
  roleProfiles[role].roleLabel;

export const getDefaultRouteForRole = (role: UserRole): string =>
  roleProfiles[role].defaultHref;

export const getSidebarSectionsForRole = (role: UserRole): SidebarSection[] =>
  roleProfiles[role].sections;

export const getSidebarItemsForRole = (role: UserRole): SidebarMenuItem[] =>
  roleProfiles[role].sections.flatMap((section) => section.items);

export const getModuleAccess = (
  role: UserRole,
  moduleKey: AppModuleKey
): ModuleAccess => {
  return (
    roleProfiles[role].moduleAccess[moduleKey] ?? {
      scopeLabel: 'Restricted access',
      scopeNote: 'This area is not configured for your role.',
    }
  );
};

export const normalizeSegmentsToRoute = (
  segments: readonly string[]
): string => {
  const parts = [...segments].filter(Boolean);

  if (parts[parts.length - 1] === 'index') {
    parts.pop();
  }

  return parts.length > 0 ? `/${parts.join('/')}` : '/';
};

const matchesRoutePrefix = (routeKey: string, prefix: string): boolean =>
  routeKey === prefix || routeKey.startsWith(`${prefix}/`);

export const isMenuItemActive = (
  routeKey: string,
  item: SidebarMenuItem
): boolean => matchesRoutePrefix(routeKey, item.href);

export const canAccessInternalRoute = (
  role: UserRole,
  routeKey: string
): boolean => {
  if (routeKey === '/(tabs)' || routeKey === '/(tabs)/index') {
    return false;
  }

  const profile = roleProfiles[role];
  const allowedPrefixes = [
    ...getSidebarItemsForRole(role).map((item) => item.href),
    ...profile.hiddenRoutes,
  ];

  return allowedPrefixes.some((prefix) => matchesRoutePrefix(routeKey, prefix));
};

export const getPageLabelForRoute = (
  role: UserRole,
  routeKey: string
): string => {
  const matchingMenuItem = getSidebarItemsForRole(role)
    .filter((item) => matchesRoutePrefix(routeKey, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];

  if (matchingMenuItem) {
    return matchingMenuItem.label;
  }

  const matchingDetailEntry = Object.entries(detailRouteLabels)
    .filter(([prefix]) => matchesRoutePrefix(routeKey, prefix))
    .sort(([left], [right]) => right.length - left.length)[0];

  if (matchingDetailEntry) {
    return matchingDetailEntry[1];
  }

  return roleProfiles[role].roleLabel;
};
