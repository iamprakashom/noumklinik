import type { Appointment, Provider, Room } from "@/data/clinic";

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface ClinicHoursSettings {
  working_days?: string[] | null;
  open_time?: string | null;
  close_time?: string | null;
}

export const DEFAULT_WORKING_DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DEFAULT_OPEN_TIME = "09:00";
export const DEFAULT_CLOSE_TIME = "19:00";

export const DAY_NAMES: readonly DayOfWeek[] = [
  DAYS_OF_WEEK[6],
  ...DAYS_OF_WEEK.slice(0, 6),
];

export function getDayOfWeek(date: Date): DayOfWeek {
  const dayIndex = (date.getDay() + 6) % 7;
  return DAYS_OF_WEEK[dayIndex]!;
}

/**
 * Calculates the dynamic min attribute string (YYYY-MM-DDTHH:mm)
 * for a datetime-local input based on clinic open time and current time.
 */
export function getMinDateTimeLocal(
  date: Date = new Date(),
  clinic?: ClinicHoursSettings | null,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const openTime = clinic?.open_time || DEFAULT_OPEN_TIME;
  const [openH = 9, openM = 0] = openTime.split(":").map(Number);

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  let targetHour = openH;
  let targetMin = openM;

  if (isToday) {
    const currentMinTotal = now.getHours() * 60 + now.getMinutes();
    const openMinTotal = openH * 60 + openM;
    if (currentMinTotal > openMinTotal) {
      targetHour = now.getHours();
      targetMin = now.getMinutes();
    }
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(targetHour)}:${pad(targetMin)}`;
}

/**
 * Checks if a date/time is within working days/hours and not in the past.
 * Returns null if valid, or an error string if invalid.
 */
export function validateAppointmentTime(
  date: Date | string,
  clinic?: ClinicHoursSettings | null,
  options?: { allowPast?: boolean; minMinutesInFuture?: number },
): string | null {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "Invalid date and time.";
  }

  const now = new Date();
  const minMinutes = options?.minMinutesInFuture ?? 0;
  const earliestTime = now.getTime() + minMinutes * 60_000;
  if (!options?.allowPast && d.getTime() < earliestTime) {
    return minMinutes > 0
      ? `Appointment time must be at least ${minMinutes} minutes in the future.`
      : "Appointment time cannot be in the past.";
  }

  const workingDays = clinic?.working_days ?? DEFAULT_WORKING_DAYS;
  const dayName = getDayOfWeek(d);

  if (!workingDays.includes(dayName)) {
    return `The clinic is closed on ${dayName}s. Please choose an open day (${workingDays.join(", ")}).`;
  }

  const openTime = clinic?.open_time || DEFAULT_OPEN_TIME;
  const closeTime = clinic?.close_time || DEFAULT_CLOSE_TIME;

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  if (timeStr < openTime || timeStr > closeTime) {
    return `Appointment must be within working hours (${openTime} – ${closeTime}).`;
  }

  return null;
}

/**
 * Returns available time slots for a given date based on clinic hours.
 * Filters out past times if date is today, and excludes times outside open/close hours.
 */
export function getAvailableTimeSlots(
  date: Date,
  clinic?: ClinicHoursSettings | null,
  stepMinutes = 30,
): { time: string; label: string; available: boolean }[] {
  const workingDays = clinic?.working_days ?? DEFAULT_WORKING_DAYS;
  const dayName = getDayOfWeek(date);

  const isWorkingDay = workingDays.includes(dayName);
  const openTime = clinic?.open_time || DEFAULT_OPEN_TIME;
  const closeTime = clinic?.close_time || DEFAULT_CLOSE_TIME;

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const startTotalMin = (openH ?? 9) * 60 + (openM ?? 0);
  const endTotalMin = (closeH ?? 19) * 60 + (closeM ?? 0);

  const slots: { time: string; label: string; available: boolean }[] = [];
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  for (let min = startTotalMin; min <= endTotalMin; min += stepMinutes) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);

    const isPast = isToday && slotDate.getTime() <= now.getTime();
    const available = isWorkingDay && !isPast;

    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;

    slots.push({ time: timeStr, label, available });
  }

  return slots;
}

export interface AppointmentConflictParams {
  appointments: Appointment[];
  providers?: Provider[];
  rooms?: Room[];
  startsAt: Date;
  durationMin: number;
  providerId?: string | null | undefined;
  roomId?: string | null | undefined;
  excludeId?: string | undefined;
}

/**
 * Checks if a requested appointment conflicts with existing appointments.
 * Returns a warning message string if a conflict is found, or null if clear.
 */
export function checkAppointmentConflict({
  appointments,
  providers,
  rooms,
  startsAt,
  durationMin,
  providerId,
  roomId,
  excludeId,
}: AppointmentConflictParams): string | null {
  if (!appointments.length) return null;
  const reqStart = startsAt.getTime();
  const reqEnd = reqStart + durationMin * 60_000;

  for (const app of appointments) {
    if (app.status === "Cancelled" || (excludeId && app.id === excludeId)) continue;
    const appStart = new Date(app.starts_at).getTime();
    const appEnd = appStart + (app.duration_min ?? 30) * 60_000;

    if (appStart < reqEnd && appEnd > reqStart) {
      if (providerId && app.provider_id === providerId) {
        const docName = providers?.find((p) => p.id === providerId)?.name ?? "Selected doctor";
        return `Warning: ${docName} is already booked at this time.`;
      }
      if (roomId && app.room_id === roomId) {
        const roomName = rooms?.find((r) => r.id === roomId)?.name ?? "Selected room";
        return `Warning: ${roomName} is already occupied at this time.`;
      }
    }
  }
  return null;
}
