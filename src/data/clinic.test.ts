import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { age, isFutureDate, phoneDigits, phoneError, todayDateStr } from "./clinic";

afterEach(() => {
  // Restore the real clock so a mocked time never leaks between test files.
  setSystemTime();
});

describe("phoneDigits", () => {
  it("extracts digits from a plain number", () => {
    expect(phoneDigits("9876543210")).toBe("9876543210");
  });

  it("leaves formatting (spaces, dashes, plus) out", () => {
    expect(phoneDigits("+91 98765-43210")).toBe("919876543210");
  });

  it("drops non-digit characters entirely", () => {
    expect(phoneDigits("abc123-xyz")).toBe("123");
  });

  it("returns an empty string for empty, null or undefined input", () => {
    expect(phoneDigits("")).toBe("");
    expect(phoneDigits(null)).toBe("");
    expect(phoneDigits(undefined)).toBe("");
  });
});

describe("phoneError", () => {
  it("returns null for empty, null or undefined input", () => {
    expect(phoneError("")).toBe(null);
    expect(phoneError(null)).toBe(null);
    expect(phoneError(undefined)).toBe(null);
  });

  it("returns null for a valid 10-digit number", () => {
    expect(phoneError("9876543210")).toBe(null);
  });

  it("rejects letters pasted or typed into the field", () => {
    expect(phoneError("abc 98765 43210")).toBe("Only numbers allowed");
    expect(phoneError("98765abc")).toBe("Only numbers allowed");
  });

  it("rejects numbers longer than 10 digits", () => {
    expect(phoneError("9876543210")).toBe(null);
    expect(phoneError("98765432109")).toBe("Phone number must be 10 digits");
    expect(phoneError("+91 98765 43210")).toBe("Phone number must be 10 digits");
  });

  it("rejects numbers shorter than 10 digits", () => {
    expect(phoneError("98765")).toBe("Phone number must be 10 digits");
  });
});

describe("todayDateStr", () => {
  it("returns today's date in local time as YYYY-MM-DD", () => {
    setSystemTime(new Date(2026, 8, 10, 15, 30)); // Sep 10 2026, 3:30pm local
    expect(todayDateStr()).toBe("2026-09-10");
  });

  it("stays on the local date late at night, before UTC rolls over", () => {
    setSystemTime(new Date(2026, 8, 10, 23, 59, 59)); // local 23:59:59
    expect(todayDateStr()).toBe("2026-09-10");
  });

  it("zero-pads month and day", () => {
    setSystemTime(new Date(2026, 0, 5, 9, 0)); // Jan 5 2026
    expect(todayDateStr()).toBe("2026-01-05");
  });
});

describe("isFutureDate", () => {
  it("returns false for empty, null or undefined values", () => {
    expect(isFutureDate("")).toBe(false);
    expect(isFutureDate(null)).toBe(false);
    expect(isFutureDate(undefined)).toBe(false);
  });

  it("accepts today's date — today is not in the future", () => {
    setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(isFutureDate("2026-09-10")).toBe(false);
  });

  it("rejects tomorrow's date", () => {
    setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(isFutureDate("2026-09-11")).toBe(true);
  });

  it("accepts past dates", () => {
    setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(isFutureDate("2026-09-09")).toBe(false);
    expect(isFutureDate("1995-06-15")).toBe(false);
  });

  it("compares in local time, not UTC", () => {
    // Local 1am on Sep 11 is still Sep 10 in UTC — the local date must win,
    // otherwise DOBs entered late at night would be rejected as "future".
    setSystemTime(new Date(2026, 8, 11, 1, 0));
    expect(isFutureDate("2026-09-11")).toBe(false);
  });
});

describe("age", () => {
  it("returns null when no birth date is set", () => {
    expect(age(null)).toBe(null);
  });

  it("returns 0 for someone born today", () => {
    setSystemTime(new Date("2026-09-10T12:00:00Z"));
    expect(age("2026-09-10")).toBe(0);
  });

  it("returns whole years for an adult", () => {
    setSystemTime(new Date("2026-09-10T12:00:00Z"));
    expect(age("1995-06-15")).toBe(31);
  });

  it("does not count an unfinished year", () => {
    // Turns 31 on Oct 1 2026 — still 30 on Sep 10.
    setSystemTime(new Date("2026-09-10T12:00:00Z"));
    expect(age("1995-10-01")).toBe(30);
  });
});
