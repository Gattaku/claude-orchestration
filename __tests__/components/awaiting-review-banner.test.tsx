import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwaitingReviewBanner } from "@/components/awaiting-review-banner";
import type { Theme } from "@/lib/data/types";

function makeTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    theme_id: "T-001",
    title: "テストテーマ",
    current_phase: "technical-design",
    current_status: "awaiting-review",
    decisions: [],
    phases: [],
    discussion_logs: [],
    ...overrides,
  };
}

describe("AwaitingReviewBanner", () => {
  it("returns null when there are no themes", () => {
    const { container } = render(<AwaitingReviewBanner themes={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders banner when there is one awaiting theme", () => {
    render(<AwaitingReviewBanner themes={[makeTheme()]} />);
    expect(screen.getByText(/1 件のテーマが確認待ち/)).toBeDefined();
  });

  it("renders banner with count for multiple themes", () => {
    const themes = [
      makeTheme({ theme_id: "T-001", title: "テーマA" }),
      makeTheme({ theme_id: "T-002", title: "テーマB" }),
    ];
    render(<AwaitingReviewBanner themes={themes} />);
    expect(screen.getByText(/2 件のテーマが確認待ち/)).toBeDefined();
  });

  it("displays theme titles", () => {
    const themes = [
      makeTheme({ theme_id: "T-001", title: "テーマA" }),
      makeTheme({ theme_id: "T-002", title: "テーマB" }),
    ];
    render(<AwaitingReviewBanner themes={themes} />);
    expect(screen.getByText("テーマA")).toBeDefined();
    expect(screen.getByText("テーマB")).toBeDefined();
  });

  it("has amber left border styling", () => {
    const { container } = render(
      <AwaitingReviewBanner themes={[makeTheme()]} />,
    );
    const banner = container.firstElementChild;
    expect(banner?.className).toContain("border-l-4");
  });
});
