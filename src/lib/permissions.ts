export type ClinicRole = "admin" | "provider" | "front_desk";

export type Permission =
  | "appointments"
  | "patients"
  | "clinical"
  | "leads"
  | "inbox"
  | "billing"
  | "reports"
  | "settings";

const ACCESS: Record<ClinicRole, readonly Permission[]> = {
  admin: ["appointments", "patients", "clinical", "leads", "inbox", "billing", "reports", "settings"],
  provider: ["appointments", "patients", "clinical", "inbox"],
  front_desk: ["appointments", "patients", "leads", "inbox", "billing"],
};

export function can(role: ClinicRole, permission: Permission) {
  return ACCESS[role].includes(permission);
}

export const PATH_PERMISSION: Record<string, Permission> = {
  "/app/dashboard": "appointments",
  "/app/appointments": "appointments",
  "/app/recalls": "appointments",
  "/app/patients": "patients",
  "/app/leads": "leads",
  "/app/inbox": "inbox",
  "/app/billing": "billing",
  "/app/reports": "reports",
  "/app/automations": "settings",
  "/app/settings": "settings",
  "/app/activity": "settings",
};