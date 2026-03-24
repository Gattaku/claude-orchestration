import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  input_content: null,
  decisions_summary: null,
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

  it("does not render body_html by default (collapsed)", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const bodyEl = container.querySelector("[data-slot='timeline-body']");
    expect(bodyEl).toBeNull();
  });

  it("shows body toggle button when body_html is present", () => {
    render(<TimelineEntry decision={mockDecision} />);
    expect(screen.getByText("詳細を見る")).toBeDefined();
  });

  it("expands body_html on click", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    await user.click(screen.getByText("詳細を見る"));
    const bodyEl = container.querySelector("[data-slot='timeline-body']");
    expect(bodyEl).not.toBeNull();
    expect(bodyEl?.innerHTML).toContain("<p>テスト本文</p>");
    // Button text should change to "閉じる"
    expect(screen.getByText("閉じる")).toBeDefined();
  });

  it("collapses body_html on second click", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    // Expand
    await user.click(screen.getByText("詳細を見る"));
    expect(container.querySelector("[data-slot='timeline-body']")).not.toBeNull();
    // Collapse
    await user.click(screen.getByText("閉じる"));
    expect(container.querySelector("[data-slot='timeline-body']")).toBeNull();
    // Button text should revert
    expect(screen.getByText("詳細を見る")).toBeDefined();
  });

  it("does not show body toggle button when body_html is absent", () => {
    const decisionNoBody: ThemeDecision = {
      ...mockDecision,
      body_html: null,
    };
    render(<TimelineEntry decision={decisionNoBody} />);
    expect(screen.queryByText("詳細を見る")).toBeNull();
  });

  it("shows input_content toggle inside expanded body", async () => {
    const user = userEvent.setup();
    const decisionWithInput: ThemeDecision = {
      ...mockDecision,
      input_content: "議事録の内容がここに入る",
    };
    const { container } = render(
      <TimelineEntry decision={decisionWithInput} />,
    );
    // input_content toggle should not be visible when body is collapsed
    expect(screen.queryByText("Input内容を表示")).toBeNull();
    // Expand body
    await user.click(screen.getByText("詳細を見る"));
    // Now input_content toggle should be visible
    expect(screen.getByText("Input内容を表示")).toBeDefined();
  });

  it("renders the date", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const entry = container.querySelector("[data-slot='timeline-entry']");
    expect(entry?.textContent).toContain("2026/03/20");
  });

  it("shows decisions summary when present", () => {
    const decisionWithSummary: ThemeDecision = {
      ...mockDecision,
      decisions_summary: "案Bを採用した",
    };
    const { container } = render(
      <TimelineEntry decision={decisionWithSummary} />,
    );
    const summary = container.querySelector(
      "[data-slot='decisions-summary']",
    );
    expect(summary).toBeDefined();
    expect(summary?.textContent).toContain("案Bを採用した");
  });

  it("does not show decisions summary when not present", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const summary = container.querySelector(
      "[data-slot='decisions-summary']",
    );
    expect(summary).toBeNull();
  });

  it("expands input content on click inside body", async () => {
    const user = userEvent.setup();
    const decisionWithInput: ThemeDecision = {
      ...mockDecision,
      input_content: "議事録の内容がここに入る",
    };
    render(<TimelineEntry decision={decisionWithInput} />);
    // First expand body
    await user.click(screen.getByText("詳細を見る"));
    // Then expand input content
    await user.click(screen.getByText("Input内容を表示"));
    expect(screen.getByText("議事録の内容がここに入る")).toBeDefined();
  });

  it("does not show input content toggle when input_content is null", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    const inputSection = container.querySelector(
      "[data-slot='input-content']",
    );
    expect(inputSection).toBeNull();
  });
});
