import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineEntry } from "@/components/timeline-entry";
import type { ThemeDecision } from "@/lib/data/types";

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const mockDecision: ThemeDecision = {
  id: "test-decision-1",
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
    // Sticky close bar should have a close button
    expect(screen.getAllByText("閉じる").length).toBeGreaterThanOrEqual(1);
  });

  it("collapses body_html on second click", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    // Expand
    await user.click(screen.getByText("詳細を見る"));
    expect(container.querySelector("[data-slot='timeline-body']")).not.toBeNull();
    // Collapse (click the close button in sticky bar)
    await user.click(screen.getAllByText("閉じる")[0]);
    expect(container.querySelector("[data-slot='timeline-body']")).toBeNull();
    // Button text should revert
    expect(screen.getByText("詳細を見る")).toBeDefined();
  });

  it("does not show body toggle button when body_html is absent", () => {
    const decisionNoBody: ThemeDecision = {
      ...mockDecision,
      body_html: "",
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

  // --- New UX tests ---

  it("shows a sticky close bar when body is expanded (no bottom close button)", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    await user.click(screen.getByText("詳細を見る"));
    // Sticky close bar should exist
    const closeBar = container.querySelector("[data-slot='close-bar']");
    expect(closeBar).not.toBeNull();
    // Only one close button (in sticky bar), plus the top toggle which now says "閉じる"
    const closeButtons = screen.getAllByText("閉じる");
    expect(closeButtons.length).toBe(2); // top toggle + sticky bar
  });

  it("wraps expanded content in a scrollable container with max-height", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    await user.click(screen.getByText("詳細を見る"));
    const expandedContent = container.querySelector("[data-slot='expanded-content']");
    expect(expandedContent).not.toBeNull();
    expect(expandedContent?.className).toContain("max-h-[60vh]");
    expect(expandedContent?.className).toContain("overflow-y-auto");
    expect(expandedContent?.className).toContain("overscroll-contain");
  });

  it("shows a fade gradient overlay at the bottom of expanded content", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    await user.click(screen.getByText("詳細を見る"));
    const fadeOverlay = container.querySelector("[data-slot='fade-gradient']");
    expect(fadeOverlay).not.toBeNull();
    expect(fadeOverlay?.className).toContain("pointer-events-none");
  });

  it("collapses body when sticky close bar button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    await user.click(screen.getByText("詳細を見る"));
    // Click the close button inside the sticky bar
    const closeBar = container.querySelector("[data-slot='close-bar']");
    const closeButton = closeBar?.querySelector("button");
    expect(closeButton).not.toBeNull();
    await user.click(closeButton!);
    expect(container.querySelector("[data-slot='timeline-body']")).toBeNull();
    expect(screen.getByText("詳細を見る")).toBeDefined();
  });

  it("does not show close bar or expanded content when body is collapsed", () => {
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    expect(container.querySelector("[data-slot='close-bar']")).toBeNull();
    expect(container.querySelector("[data-slot='expanded-content']")).toBeNull();
    expect(container.querySelector("[data-slot='fade-gradient']")).toBeNull();
  });

  it("calls scrollIntoView when closing expanded content", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const scrollIntoViewMock = vi.fn();
    const { container } = render(<TimelineEntry decision={mockDecision} />);
    // Mock scrollIntoView on the article element
    const article = container.querySelector("[data-slot='timeline-entry']");
    article!.scrollIntoView = scrollIntoViewMock;
    // Expand
    await user.click(screen.getByText("詳細を見る"));
    // Close via sticky bar
    const closeBar = container.querySelector("[data-slot='close-bar']");
    const closeButton = closeBar?.querySelector("button");
    await user.click(closeButton!);
    // Flush the setTimeout(0)
    vi.runAllTimers();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
    vi.useRealTimers();
  });
});
