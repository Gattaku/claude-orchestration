import { describe, it, expect } from "vitest";
import { formatShortDate } from "@/lib/utils/date";

describe("formatShortDate", () => {
  it("formats ISO date string as YYYY/MM/DD", () => {
    expect(formatShortDate("2026-03-23T12:00:00Z")).toBe("2026/03/23");
  });

  it("formats date-only string as YYYY/MM/DD", () => {
    expect(formatShortDate("2026-01-05")).toBe("2026/01/05");
  });

  it("pads single-digit month and day with leading zeros", () => {
    expect(formatShortDate("2026-01-01")).toBe("2026/01/01");
  });
});
