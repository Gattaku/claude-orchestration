import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "@/lib/utils/date";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '今' for times less than 1 minute ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-23T11:59:30Z")).toBe("今");
  });

  it("returns '1分前' for 1 minute ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-23T11:59:00Z")).toBe("1分前");
  });

  it("returns '30分前' for 30 minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-23T11:30:00Z")).toBe("30分前");
  });

  it("returns '1時間前' for 1 hour ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-23T11:00:00Z")).toBe("1時間前");
  });

  it("returns '23時間前' for 23 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-22T13:00:00Z")).toBe("23時間前");
  });

  it("returns '1日前' for 1 day ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-22T12:00:00Z")).toBe("1日前");
  });

  it("returns '3日前' for 3 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-20T12:00:00Z")).toBe("3日前");
  });

  it("returns '1週間前' for 7 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-16T12:00:00Z")).toBe("1週間前");
  });

  it("returns '1ヶ月前' for 30 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-02-21T12:00:00Z")).toBe("1ヶ月前");
  });

  it("handles date-only strings (YYYY-MM-DD)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
    expect(formatRelativeTime("2026-03-20")).toBe("3日前");
  });
});
