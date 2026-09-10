import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { age, cleanPhoneDigits, handlePhoneInput, handlePhonePaste, isFutureDate, todayDateStr } from "./clinic";

afterEach(() => {
  // Restore the real clock so a mocked time never leaks between test files.
  setSystemTime();
});

describe("cleanPhoneDigits", () => {
  it("keeps a clean 10-digit number unchanged", () => {
    expect(cleanPhoneDigits("9876543210")).toBe("9876543210");
  });

  it("does not strip a leading 91 from a valid 10-digit mobile", () => {
    // "9198765432" is a legitimate Indian mobile number — the 91 prefix is only
    // stripped when the input is longer than 10 digits.
    expect(cleanPhoneDigits("9198765432")).toBe("9198765432");
  });

  it("strips the +91 country code from pasted numbers", () => {
    expect(cleanPhoneDigits("+919876543210")).toBe("9876543210");
    expect(cleanPhoneDigits("+91 98765 43210")).toBe("9876543210");
    expect(cleanPhoneDigits("+91 98765-43210")).toBe("9876543210");
    expect(cleanPhoneDigits("919876543210")).toBe("9876543210");
  });

  it("does not strip 91 when typing an 11th digit on a number starting with 91", () => {
    expect(cleanPhoneDigits("91987654321")).toBe("9198765432");
  });

  it("strips a leading 0 STD prefix", () => {
    expect(cleanPhoneDigits("098765 43210")).toBe("9876543210");
    expect(cleanPhoneDigits("0 98765 43210")).toBe("9876543210");
  });

  it("strips both the +91 country code and a 0 STD prefix when chained", () => {
    expect(cleanPhoneDigits("+91 098765 43210")).toBe("9876543210");
  });

  it("removes spaces, dashes and brackets", () => {
    expect(cleanPhoneDigits("(98765) 432-10")).toBe("9876543210");
  });

  it("caps input at 10 digits", () => {
    expect(cleanPhoneDigits("98765432101234")).toBe("9876543210");
  });

  it("keeps shorter entries as-is so forms can validate the length", () => {
    expect(cleanPhoneDigits("98765")).toBe("98765");
  });

  it("drops stray letters mixed into the number", () => {
    expect(cleanPhoneDigits("abc 98765 43210")).toBe("9876543210");
  });

  it("returns an empty string for empty, null or undefined input", () => {
    expect(cleanPhoneDigits("")).toBe("");
    expect(cleanPhoneDigits(null)).toBe("");
    expect(cleanPhoneDigits(undefined)).toBe("");
  });
});

describe("handlePhonePaste", () => {
  it("strips +91 and formats to 10 digits on paste", () => {
    let prevented = false;
    const target = { value: "", selectionStart: 0, selectionEnd: 0 };
    handlePhonePaste({
      preventDefault: () => {
        prevented = true;
      },
      clipboardData: { getData: () => "+919876543210" },
      currentTarget: target,
    });
    expect(prevented).toBe(true);
    expect(target.value).toBe("9876543210");
  });

  it("handles pasting with spaces, dashes, and brackets", () => {
    let prevented = false;
    const target = { value: "", selectionStart: 0, selectionEnd: 0 };
    handlePhonePaste({
      preventDefault: () => {
        prevented = true;
      },
      clipboardData: { getData: () => "+91 (98765) 432-10" },
      currentTarget: target,
    });
    expect(prevented).toBe(true);
    expect(target.value).toBe("9876543210");
  });

  it("caps numbers exceeding 10 digits on paste", () => {
    let prevented = false;
    const target = { value: "", selectionStart: 0, selectionEnd: 0 };
    handlePhonePaste({
      preventDefault: () => {
        prevented = true;
      },
      clipboardData: { getData: () => "98765432109999" },
      currentTarget: target,
    });
    expect(prevented).toBe(true);
    expect(target.value).toBe("9876543210");
  });

  it("replaces highlighted/selected text when pasting", () => {
    let prevented = false;
    const target = { value: "0000000000", selectionStart: 0, selectionEnd: 10 };
    handlePhonePaste({
      preventDefault: () => {
        prevented = true;
      },
      clipboardData: { getData: () => "+919876543210" },
      currentTarget: target,
    });
    expect(prevented).toBe(true);
    expect(target.value).toBe("9876543210");
  });

  it("strips leading 0 STD code when pasted", () => {
    let prevented = false;
    const target = { value: "", selectionStart: 0, selectionEnd: 0 };
    handlePhonePaste({
      preventDefault: () => {
        prevented = true;
      },
      clipboardData: { getData: () => "098765 43210" },
      currentTarget: target,
    });
    expect(prevented).toBe(true);
    expect(target.value).toBe("9876543210");
  });
});

describe("handlePhoneInput", () => {
  it("caps input at 10 digits on typing", () => {
    const target = { value: "98765432101234" };
    handlePhoneInput({ currentTarget: target });
    expect(target.value).toBe("9876543210");
  });

  it("strips non-numeric characters typed into the field", () => {
    const target = { value: "98765abc!@#" };
    handlePhoneInput({ currentTarget: target });
    expect(target.value).toBe("98765");
  });

  it("leaves a valid 10-digit number intact", () => {
    const target = { value: "9876543210" };
    handlePhoneInput({ currentTarget: target });
    expect(target.value).toBe("9876543210");
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
