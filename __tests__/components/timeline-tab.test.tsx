import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineTab } from "@/components/timeline-tab";
import type { ThemeDecision, DiscussionLog } from "@/lib/data/types";

const mockDecisions: ThemeDecision[] = [
  {
    id: "test-tab-1",
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
    input_content: null,
    decisions_summary: "案Aを採用。理由はコストが低いため。",
  },
  {
    id: "test-tab-2",
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
    input_content: null,
    decisions_summary: null,
  },
];

const mockLogs: DiscussionLog[] = [
  {
    id: "log-1",
    theme_id: "TH-001",
    decision_id: null,
    agent_role: "AIPO",
    direction: "request",
    message: "インサイトを抽出してください",
    created_at: "2026-03-22T10:00:00+00:00",
  },
  {
    id: "log-2",
    theme_id: "TH-001",
    decision_id: null,
    agent_role: "AI PM",
    direction: "response",
    message: "3つのインサイトを特定しました",
    created_at: "2026-03-22T10:01:00+00:00",
  },
];

describe("TimelineTab", () => {
  it("renders timeline, discussion logs, and decisions tabs", () => {
    render(<TimelineTab decisions={mockDecisions} discussionLogs={mockLogs} />);
    expect(screen.getByRole("tab", { name: "タイムライン" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "議論ログ" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "決定事項" })).toBeDefined();
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
    expect(entries[0].textContent).toContain("最新の議事録");
    expect(entries[1].textContent).toContain("古い議事録");
  });

  it("shows discussion logs when switching to discussion logs tab", async () => {
    const user = userEvent.setup();
    render(<TimelineTab decisions={mockDecisions} discussionLogs={mockLogs} />);
    await user.click(screen.getByRole("tab", { name: "議論ログ" }));
    expect(screen.getByText("インサイトを抽出してください")).toBeDefined();
    expect(screen.getByText("3つのインサイトを特定しました")).toBeDefined();
  });

  it("shows empty state for discussion logs when none exist", async () => {
    const user = userEvent.setup();
    render(<TimelineTab decisions={mockDecisions} discussionLogs={[]} />);
    await user.click(screen.getByRole("tab", { name: "議論ログ" }));
    expect(screen.getByText("議論ログがありません。")).toBeDefined();
  });

  it("shows decisions summary in decisions tab", async () => {
    const user = userEvent.setup();
    render(<TimelineTab decisions={mockDecisions} discussionLogs={[]} />);
    await user.click(screen.getByRole("tab", { name: "決定事項" }));
    expect(screen.getByText("案Aを採用。理由はコストが低いため。")).toBeDefined();
  });

  it("shows empty state for decisions when no summaries exist", async () => {
    const user = userEvent.setup();
    const decisionsWithoutSummary = mockDecisions.map((d) => ({
      ...d,
      decisions_summary: null,
    }));
    render(
      <TimelineTab decisions={decisionsWithoutSummary} discussionLogs={[]} />,
    );
    await user.click(screen.getByRole("tab", { name: "決定事項" }));
    expect(
      screen.getByText("決定事項のサマリーがありません。"),
    ).toBeDefined();
  });

  it("defaults to empty discussion logs when prop is not provided", async () => {
    const user = userEvent.setup();
    render(<TimelineTab decisions={mockDecisions} />);
    await user.click(screen.getByRole("tab", { name: "議論ログ" }));
    expect(screen.getByText("議論ログがありません。")).toBeDefined();
  });
});
