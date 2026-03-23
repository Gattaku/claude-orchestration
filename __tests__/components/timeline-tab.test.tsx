import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineTab } from "@/components/timeline-tab";
import type { ThemeDecision } from "@/lib/data/types";

const mockDecisions: ThemeDecision[] = [
  {
    theme_id: "TH-001",
    title: "最新の議事録",
    phase: "value-definition",
    status: "in-progress",
    source: "meetings/2026-03-22.md",
    created_at: "2026-03-22",
    updated_at: "2026-03-22",
    next_action: "",
    awaiting_review: "",
    participants: ["AIPO"],
    body_html: "<p>最新の内容</p>",
  },
  {
    theme_id: "TH-001",
    title: "古い議事録",
    phase: "insight-extraction",
    status: "completed",
    source: "meetings/2026-03-18.md",
    created_at: "2026-03-18",
    updated_at: "2026-03-18",
    next_action: "",
    awaiting_review: "",
    participants: ["AIPO"],
    body_html: "<p>古い内容</p>",
  },
];

describe("TimelineTab", () => {
  it("renders timeline and decision point tabs", () => {
    render(<TimelineTab decisions={mockDecisions} />);
    expect(screen.getByRole("tab", { name: "タイムライン" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "判断ポイント" })).toBeDefined();
  });

  it("shows timeline entries by default", () => {
    const { container } = render(<TimelineTab decisions={mockDecisions} />);
    const entries = container.querySelectorAll("[data-slot='timeline-entry']");
    expect(entries.length).toBe(2);
    expect(entries[0].textContent).toContain("最新の議事録");
    expect(entries[1].textContent).toContain("古い議事録");
  });

  it("sorts decisions by updated_at descending", () => {
    const { container } = render(<TimelineTab decisions={mockDecisions} />);
    const entries = container.querySelectorAll("[data-slot='timeline-entry']");
    expect(entries.length).toBe(2);
    // First entry should be the newer one
    expect(entries[0].textContent).toContain("最新の議事録");
    expect(entries[1].textContent).toContain("古い議事録");
  });

  it("shows Coming Soon when switching to decision points tab", async () => {
    const user = userEvent.setup();
    render(<TimelineTab decisions={mockDecisions} />);
    await user.click(screen.getByRole("tab", { name: "判断ポイント" }));
    expect(screen.getByText("Coming Soon")).toBeDefined();
  });
});
