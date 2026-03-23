import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineEntry } from "@/components/timeline-entry";
import type { ThemeDecision } from "@/lib/data/types";

const mockDecision: ThemeDecision = {
  theme_id: "TH-001",
  title: "テスト議事録",
  phase: "insight-extraction",
  status: "completed",
  source: "meetings/2026-03-20.md",
  created_at: "2026-03-20",
  updated_at: "2026-03-20",
  next_action: "次のアクション",
  awaiting_review: "レビュー待ち",
  participants: ["AIPO", "AI PM"],
  body_html: "<p>テスト本文</p>",
};

describe("TimelineEntry", () => {
  it("renders the decision title", () => {
    render(<TimelineEntry decision={mockDecision} />);
    expect(screen.getByText("テスト議事録")).toBeDefined();
  });

  it("renders the phase name badge in the entry", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const entry = container.querySelector("[data-slot='timeline-entry']");
    expect(entry?.textContent).toContain("インサイト抽出");
  });

  it("renders participants", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const entry = container.querySelector("[data-slot='timeline-entry']");
    expect(entry?.textContent).toContain("AIPO");
    expect(entry?.textContent).toContain("AI PM");
  });

  it("renders body_html content", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const bodyEl = container.querySelector("[data-slot='timeline-body']");
    expect(bodyEl?.innerHTML).toContain("<p>テスト本文</p>");
  });

  it("renders the date", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const entry = container.querySelector("[data-slot='timeline-entry']");
    expect(entry?.textContent).toContain("2026/03/20");
  });
});
