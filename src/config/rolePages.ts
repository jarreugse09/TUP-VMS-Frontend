import { getEffectiveRole, getNormalizedSubRole, type RbacUserLike } from '../utils/rbac';

export type AppPageId =
  | 'dashboard'
  | 'attendance'
  | 'qr_requests'
  | 'qr_scanner'
  | 'my_qr'
  | 'manage_users'
  | 'analytics'
  | 'work_schedules'
  | 'special_schedules'
  | 'transaction_logs'
  | 'visit_logs'
  | 'action_logs'
  | 'alerts'
  | 'chat'
  | 'photo_requests'
  | 'backup'
  | 'csv_upload'
  | 'archive'
  | 'profile';

type RolePageKey =
  | 'superadmin'
  | 'top_management'
  | 'dean'
  | 'department_head'
  | 'non_academic'
  | 'hr_head'
  | 'hr_staff'
  | 'faculty'
  | 'security_head'
  | 'security_staff'
  | 'maintenance'
  | 'student'
  | 'visitor';

type PageDefinition = {
  id: AppPageId;
  label: string;
  matchers: string[];
};

const PAGE_DEFINITIONS: Record<AppPageId, PageDefinition> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    matchers: ['/dashboard', '/staff/dashboard', '/user/dashboard', '/security/dashboard'],
  },
  attendance: {
    id: 'attendance',
    label: 'Attendance',
    matchers: ['/attendance', '/staff/attendance', '/user/attendance', '/security/attendance'],
  },
  qr_requests: {
    id: 'qr_requests',
    label: 'QR Requests',
    matchers: ['/qr-requests'],
  },
  qr_scanner: {
    id: 'qr_scanner',
    label: 'QR Scanner',
    matchers: ['/scanner', '/security/scanner'],
  },
  my_qr: {
    id: 'my_qr',
    label: 'My QR Code',
    matchers: ['/my-qr'],
  },
  manage_users: {
    id: 'manage_users',
    label: 'Manage Users',
    matchers: ['/admin/manage-users'],
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    matchers: ['/admin/analytics'],
  },
  work_schedules: {
    id: 'work_schedules',
    label: 'Work Schedules',
    matchers: ['/admin/work-schedules'],
  },
  special_schedules: {
    id: 'special_schedules',
    label: 'Special Schedules',
    matchers: ['/admin/special-schedules'],
  },
  transaction_logs: {
    id: 'transaction_logs',
    label: 'Transaction Logs',
    matchers: ['/logs/transactions'],
  },
  visit_logs: {
    id: 'visit_logs',
    label: 'Visit Logs',
    matchers: ['/logs/visitors'],
  },
  action_logs: {
    id: 'action_logs',
    label: 'Action Logs',
    matchers: ['/logs/actions'],
  },
  alerts: {
    id: 'alerts',
    label: 'Alerts',
    matchers: ['/alerts'],
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    matchers: ['/chat'],
  },
  photo_requests: {
    id: 'photo_requests',
    label: 'Photo Requests',
    matchers: ['/admin/photo-requests'],
  },
  backup: {
    id: 'backup',
    label: 'Backup & Restore',
    matchers: ['/admin/backup'],
  },
  csv_upload: {
    id: 'csv_upload',
    label: 'CSV Data Upload',
    matchers: ['/admin/csv-upload'],
  },
  archive: {
    id: 'archive',
    label: 'Archive & Recovery',
    matchers: ['/admin/archive'],
  },
  profile: {
    id: 'profile',
    label: 'Profile',
    matchers: ['/profile'],
  },
};

const ROLE_PAGE_IDS: Record<RolePageKey, AppPageId[]> = {
  // Superadmin: unrestricted — all pages
  superadmin: [
    'dashboard', 'attendance', 'visit_logs', 'transaction_logs', 'action_logs', 
    'qr_requests', 'qr_scanner', 'my_qr', 'manage_users', 'analytics', 
    'work_schedules', 'special_schedules', 'alerts', 'chat',
    'photo_requests', 'backup', 'csv_upload', 'archive', 'profile',
  ],
  // Top management: read-only analytics + dashboards
  top_management: [
    'qr_scanner', 'dashboard', 'attendance', 'visit_logs', 'transaction_logs',
    'action_logs', 'my_qr', 'analytics', 'alerts', 'chat', 'profile',
  ],
  // Dean: scoped to their college
  dean: [
    'qr_scanner', 'dashboard', 'attendance', 'transaction_logs', 'action_logs',
    'my_qr', 'manage_users', 'analytics', 'profile',
  ],
  // Department Head: scoped to their department
  department_head: [
    'qr_scanner', 'dashboard', 'attendance', 'transaction_logs', 'action_logs', 
    'my_qr', 'manage_users', 'analytics', 'profile',
  ],
  // Faculty/Non-Academic/Maintenance: personal dashboard + transactions
  faculty: [
    'qr_scanner', 'dashboard', 'attendance', 'transaction_logs', 'action_logs', 
    'my_qr', 'analytics', 'profile',
  ],
  non_academic: [
    'qr_scanner', 'dashboard', 'attendance', 'transaction_logs', 'action_logs', 
    'qr_requests', 'my_qr', 'analytics', 'profile',
  ],
  maintenance: [
    'qr_scanner', 'dashboard', 'attendance', 'transaction_logs', 'action_logs', 
    'my_qr', 'analytics', 'profile',
  ],
  // HR Head: full workforce management + audit access
  hr_head: [
    'dashboard', 'attendance', 'transaction_logs', 'action_logs',
    'qr_requests', 'my_qr', 'manage_users', 'analytics', 
    'work_schedules', 'special_schedules', 'photo_requests', 'csv_upload', 'profile',
  ],
  // HR Staff: limited workforce management, no action logs or visit logs
  hr_staff: [
    'dashboard', 'qr_scanner', 'attendance', 'transaction_logs',
    'qr_requests', 'my_qr', 'manage_users', 'analytics', 'special_schedules', 'csv_upload', 'profile',
  ],
  // Security Head: full operational view + analytics
  security_head: [
    'dashboard', 'attendance', 'visit_logs', 'transaction_logs', 'action_logs',
    'qr_scanner', 'my_qr', 'qr_requests', 'manage_users', 'analytics', 'work_schedules',
    'alerts', 'chat', 'profile',
  ],
  // Security Staff: operational scan + alerts, manage_users for students/visitors
  security_staff: [
    'dashboard', 'attendance', 'visit_logs', 'transaction_logs', 'action_logs',
    'qr_scanner', 'my_qr', 'qr_requests', 'manage_users', 'analytics', 'alerts', 'chat', 'profile',
  ],
  // Students: personal logs + transactions. NO attendance admin page.
  student: ['dashboard', 'visit_logs', 'transaction_logs', 'action_logs', 'qr_requests', 'my_qr', 'profile'],
  // Visitors: same as student
  visitor: ['dashboard', 'visit_logs', 'transaction_logs', 'action_logs', 'qr_requests', 'my_qr', 'profile'],
};

const PAGE_MAP: Record<RolePageKey, AppPageId[]> = ROLE_PAGE_IDS;

const getRolePageKey = (user?: RbacUserLike | null): RolePageKey => {
  const subRole = getNormalizedSubRole(user)?.toLowerCase();

  if (subRole && subRole in PAGE_MAP) {
    return subRole as RolePageKey;
  }

  const effectiveRole = getEffectiveRole(user).toLowerCase();
  if (effectiveRole === 'student') return 'student';
  if (effectiveRole === 'visitor') return 'visitor';

  return 'visitor';
};

export const getAllowedPageIdsForUser = (user?: RbacUserLike | null) =>
  PAGE_MAP[getRolePageKey(user)] || PAGE_MAP.visitor;

export const canAccessPage = (
  user: RbacUserLike | null | undefined,
  pageId: AppPageId,
) => getAllowedPageIdsForUser(user).includes(pageId);

export const getPagePathForUser = (
  user: RbacUserLike | null | undefined,
  pageId: AppPageId,
) => {
  const effectiveRole = getEffectiveRole(user);

  switch (pageId) {
    case 'dashboard':
      if (effectiveRole === 'Security') return '/security/dashboard';
      if (effectiveRole === 'Staff') return '/staff/dashboard';
      if (effectiveRole === 'Student' || effectiveRole === 'Visitor') {
        return '/user/dashboard';
      }
      return '/dashboard';
    case 'attendance':
      if (effectiveRole === 'Staff') return '/staff/attendance';
      if (effectiveRole === 'Student' || effectiveRole === 'Visitor') {
        return '/user/attendance';
      }
      return '/attendance';
    case 'qr_requests':
      return '/qr-requests';
    case 'qr_scanner':
      return '/scanner';
    case 'my_qr':
      return '/my-qr';
    case 'manage_users':
      return '/admin/manage-users';
    case 'analytics':
      return '/admin/analytics';
    case 'work_schedules':
      return '/admin/work-schedules';
    case 'special_schedules':
      return '/admin/special-schedules';
    case 'transaction_logs':
      return '/logs/transactions';
    case 'visit_logs':
      return '/logs/visitors';
    case 'action_logs':
      return '/logs/actions';
    case 'alerts':
      return '/alerts';
    case 'chat':
      return '/chat';
    case 'photo_requests':
      return '/admin/photo-requests';
    case 'backup':
      return '/admin/backup';
    case 'csv_upload':
      return '/admin/csv-upload';
    case 'archive':
      return '/admin/archive';
    case 'profile':
      return '/profile';
    default:
      return '/profile';
  }
};

export const getAllowedPagesForUser = (user?: RbacUserLike | null) =>
  getAllowedPageIdsForUser(user).map((pageId) => ({
    ...PAGE_DEFINITIONS[pageId],
    path: getPagePathForUser(user, pageId),
  }));

export const getDefaultRouteForUser = (user?: RbacUserLike | null) => {
  const [firstPage = 'profile'] = getAllowedPageIdsForUser(user);
  return getPagePathForUser(user, firstPage);
};

export const getSelectedPageId = (
  pathname: string,
): AppPageId | null => {
  // Try exact match first
  let page = Object.values(PAGE_DEFINITIONS).find(({ matchers }) =>
    matchers.some((matcher) => pathname === matcher),
  );

  // Then try prefix match
  if (!page) {
    page = Object.values(PAGE_DEFINITIONS).find(({ matchers }) =>
      matchers.some((matcher) => pathname.startsWith(`${matcher}/`)),
    );
  }

  return page?.id || null;
};
