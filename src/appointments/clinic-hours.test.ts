import { describe, it, expect, vi } from "vitest";
import {
  getDayOfWeek,
  getMinDateTimeLocal,
  validateAppointmentTime,
  getAvailableTimeSlots,
  checkAppointmentConflict,
  DEFAULT_WORKING_DAYS,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
} from "../lib/clinic-hours";
import { formatDateTime, formatTime, type Appointment } from "@/data/clinic";

describe("getDayOfWeek", () => {
  it("returns correct day name", () => {
    expect(getDayOfWeek(new Date(2026, 8, 7))).toBe("Monday");
    expect(getDayOfWeek(new Date(2026, 8, 8))).toBe("Tuesday");
    expect(getDayOfWeek(new Date(2026, 8, 13))).toBe("Sunday");
  });
});

describe("getMinDateTimeLocal", () => {
  it("returns open time for future days", () => {
    const future = new Date(2026, 8, 15);
    expect(getMinDateTimeLocal(future)).toBe("2026-09-15T09:00");
  });

  it("returns current time if today and past open time", () => {
    const today = new Date(2026, 8, 8, 14, 15);
    vi.useFakeTimers();
    vi.setSystemTime(today);
    expect(getMinDateTimeLocal(today)).toBe("2026-09-08T14:15");
    vi.useRealTimers();
  });
});

describe("validateAppointmentTime", () => {
  it("returns error on invalid date string", () => {
    expect(validateAppointmentTime("invalid-date")).toBe("Invalid date and time.");
  });

  it("returns error on past time unless allowed", () => {
    const past = "2020-01-01T10:00";
    expect(validateAppointmentTime(past)).toBe("Appointment time cannot be in the past.");
    expect(validateAppointmentTime(past, null, { allowPast: true })).toBeNull();
  });

  it("handles minMinutesInFuture option", () => {
    const now = new Date(2026, 8, 8, 10, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const in5m = new Date(2026, 8, 8, 10, 5);
    expect(validateAppointmentTime(in5m, null, { minMinutesInFuture: 10 })).toBe(
      "Appointment time must be at least 10 minutes in the future."
    );

    vi.useRealTimers();
  });

  it("rejects non-working days", () => {
    const sunday = new Date(2026, 8, 13, 10, 0); // Sunday
    expect(
      validateAppointmentTime(sunday, { working_days: ["Monday"] }, { allowPast: true }),
    ).toContain("clinic is closed on Sundays");
  });

  it("rejects times outside working hours", () => {
    const early = new Date(2099, 0, 10, 7, 0); // Jan 10, 2099 7:00 AM — always in the future
    expect(validateAppointmentTime(early)).toContain("within working hours");
  });
});

describe("getAvailableTimeSlots", () => {
  it("returns slots with availability based on past/working day", () => {
    const now = new Date(2026, 8, 8, 10, 0);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const slots = getAvailableTimeSlots(now, { open_time: "09:00", close_time: "11:00" }, 60);
    expect(slots).toEqual([
      { time: "09:00", label: "9:00 AM", available: false },
      { time: "10:00", label: "10:00 AM", available: false },
      { time: "11:00", label: "11:00 AM", available: true },
    ]);

    vi.useRealTimers();
  });
});

describe("checkAppointmentConflict", () => {
  const baseApp = {
    id: "app1",
    starts_at: "2026-09-08T10:00:00Z",
    duration_min: 60,
    provider_id: "doc1",
    room_id: "room1",
    patient_id: "p1",
    status: "Booked",
  } as unknown as Appointment;


  it("returns null if no appointments or matched exclusions", () => {
    expect(
      checkAppointmentConflict({
        appointments: [],
        startsAt: new Date("2026-09-08T10:00:00Z"),
        durationMin: 30,
      })
    ).toBeNull();

    expect(
      checkAppointmentConflict({
        appointments: [{ ...baseApp, status: "Cancelled" }],
        startsAt: new Date("2026-09-08T10:00:00Z"),
        durationMin: 30,
        providerId: "doc1",
      })
    ).toBeNull();

    expect(
      checkAppointmentConflict({
        appointments: [baseApp],
        startsAt: new Date("2026-09-08T10:00:00Z"),
        durationMin: 30,
        providerId: "doc1",
        excludeId: "app1",
      })
    ).toBeNull();
  });

  it("detects provider-only conflict", () => {
    const conflict = checkAppointmentConflict({
      appointments: [baseApp],
      startsAt: new Date("2026-09-08T10:30:00Z"),
      durationMin: 30,
      providerId: "doc1",
      roomId: "other-room",
    });
    expect(conflict?.conflictType).toBe("provider");
    expect(conflict?.message).toContain("Doctor Assigned doctor is already booked");
  });

  it("detects room-only conflict", () => {
    const conflict = checkAppointmentConflict({
      appointments: [baseApp],
      startsAt: new Date("2026-09-08T10:30:00Z"),
      durationMin: 30,
      providerId: "other-doc",
      roomId: "room1",
    });
    expect(conflict?.conflictType).toBe("room");
    expect(conflict?.message).toContain("Assigned room is already occupied");
  });

  it("detects both provider and room conflict", () => {
    const conflict = checkAppointmentConflict({
      appointments: [baseApp],
      startsAt: new Date("2026-09-08T10:30:00Z"),
      durationMin: 30,
      providerId: "doc1",
      roomId: "room1",
    });
    expect(conflict?.conflictType).toBe("both");
    expect(conflict?.message).toContain("are already booked");
  });
});
