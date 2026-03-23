import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DiscussionLogEntry } from "@/components/discussion-log-entry";
import type { DiscussionLog } from "@/lib/data/types";

const mockRequestLog: DiscussionLog = {
  id: "log-1",
  theme_id: "TH-001",
  decision_id: null,
  agent_role: "AIPO",
  direction: "request",
  message: "インサイトを抽出してください",
  created_at: "2026-03-22T10:00:00+00:00",
};

const mockResponseLog: DiscussionLog = {
  id: "log-2",
  theme_id: "TH-001",
  decision_id: null,
  agent_role: "AI PM",
  direction: "response",
  message: "3つのインサイトを特定しました",
  created_at: "2026-03-22T10:01:00+00:00",
};

describe("DiscussionLogEntry", () => {
  it("renders agent role badge", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockRequestLog} />,
    );
    const entry = container.querySelector(
      "[data-slot='discussion-log-entry']",
    );
    expect(entry?.textContent).toContain("AIPO");
  });

  it("renders the message content", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockRequestLog} />,
    );
    expect(container.textContent).toContain(
      "インサイトを抽出してください",
    );
  });

  it("renders request direction indicator", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockRequestLog} />,
    );
    const entry = container.querySelector(
      "[data-slot='discussion-log-entry']",
    );
    expect(entry?.classList.toString()).not.toContain("items-end");
  });

  it("renders response direction with right alignment", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockResponseLog} />,
    );
    const entry = container.querySelector(
      "[data-slot='discussion-log-entry']",
    );
    expect(entry?.classList.toString()).toContain("items-end");
  });

  it("renders AI PM role with correct badge text", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockResponseLog} />,
    );
    expect(container.textContent).toContain("AI PM");
    expect(container.textContent).toContain(
      "3つのインサイトを特定しました",
    );
  });

  it("renders timestamp", () => {
    const { container } = render(
      <DiscussionLogEntry log={mockRequestLog} />,
    );
    // The timestamp should be formatted (month/day hours:minutes)
    const entry = container.querySelector(
      "[data-slot='discussion-log-entry']",
    );
    expect(entry?.textContent).toMatch(/\d{2}\/\d{2}\s\d{2}:\d{2}/);
  });
});
