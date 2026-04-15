export interface RbacUserLike {
  role?: string | null;
  subRole?: string | null;
  staffType?: string | null;
}

const normalize = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const SECURITY_KEYS = new Set(["security", "security_head", "security_staff"]);
const HR_KEYS = new Set(["hr_head", "hr_staff"]);
// Superadmin requires explicit subRole, empty subRole is NOT superadmin
const SUPERADMIN_KEYS = new Set(["superadmin"]);
const SCOPED_ACCESS_KEYS = new Set([
  "dean",
  "department_head",
  "hr_head",
  "hr_staff",
  "security_head",
  "security_staff",
]);

export const isSecurityUser = (user?: RbacUserLike | null) => {
  if (!user) return false;

  const role = normalize(user.role);
  const subRole = normalize(user.subRole);
  const staffType = normalize(user.staffType);

  return (
    role === "security" ||
    (role === "staff" &&
      (SECURITY_KEYS.has(subRole) || SECURITY_KEYS.has(staffType)))
  );
};

export const isTupSuperAdmin = (user?: RbacUserLike | null) => {
  if (!user) return false;

  const role = normalize(user.role);
  const subRole = normalize(user.subRole);

  return role === "tup" && SUPERADMIN_KEYS.has(subRole);
};

export const getEffectiveRole = (user?: RbacUserLike | null) => {
  if (isSecurityUser(user)) return "Security";

  const role = normalize(user?.role);
  if (role === "tup") return "TUP";
  if (role === "staff") return "Staff";
  if (role === "student") return "Student";
  if (role === "visitor") return "Visitor";

  return String(user?.role || "Visitor");
};

export const isAlertAudience = (user?: RbacUserLike | null) => {
  // Bug 9 fix — mirror backend isAlertAudience which also includes top_management
  return isTupSuperAdmin(user) || isSecurityUser(user) ||
    getNormalizedSubRole(user) === 'top_management';
};

export const getNormalizedSubRole = (user?: RbacUserLike | null) =>
  normalize(user?.subRole);

export const canManageUsers = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);
  const subRole = getNormalizedSubRole(user);

  return (
    effectiveRole === "TUP" ||
    HR_KEYS.has(subRole) ||
    subRole === "security_head"
  );
};

export const canAccessScopedLogs = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);
  const subRole = getNormalizedSubRole(user);

  return (
    effectiveRole === "TUP" ||
    isSecurityUser(user) ||
    SCOPED_ACCESS_KEYS.has(subRole)
  );
};

export const canAccessScopedAttendance = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);
  const subRole = getNormalizedSubRole(user);

  return (
    effectiveRole === "TUP" ||
    isSecurityUser(user) ||
    SCOPED_ACCESS_KEYS.has(subRole)
  );
};

export const canAccessAnalytics = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);
  const subRole = getNormalizedSubRole(user);

  return (
    effectiveRole === "TUP" ||
    isSecurityUser(user) ||
    SCOPED_ACCESS_KEYS.has(subRole)
  );
};

export const getDashboardRouteForUser = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);

  if (effectiveRole === "TUP") return "/dashboard";
  if (effectiveRole === "Security") return "/security/dashboard";
  if (effectiveRole === "Staff") return "/staff/dashboard";

  return "/user/dashboard";
};

export const getLogsRouteForUser = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);

  if (canAccessScopedLogs(user)) return "/logs";
  if (effectiveRole === "Staff") return "/staff/logs";

  return "/user/logs";
};

export const getAttendanceRouteForUser = (user?: RbacUserLike | null) => {
  const effectiveRole = getEffectiveRole(user);

  if (canAccessScopedAttendance(user)) return "/attendance";
  if (effectiveRole === "Staff") return "/staff/attendance";

  return "/user/attendance";
};

export const getDefaultRouteForUser = (user?: RbacUserLike | null) => {
  return getDashboardRouteForUser(user);
};
