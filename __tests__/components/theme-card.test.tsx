import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeCard } from "@/components/theme-card";
import type { Theme } from "@/lib/data/types";

function makeTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    theme_id: "T-001",
    title: "AI Dev Dashboard",
    current_phase: "technical-design",
    current_status: "in-progress",
    decisions: [
      {
        theme_id: "T-001",
        title: "AI Dev Dashboard",
        phase: "technical-design",
        status: "in-progress",
        source: "test",
        created_at: "2026-03-20",
        updated_at: "2026-03-20",
        next_action: "実装開始",
        awaiting_review: "",
        participants: ["AI Dev"],
        body_html: "<p>Test</p>",
      },
    ],
    phases: [
      { phase: "technical-design", status: "in-progress", updated_at: "2026-03-20" },
    ],
    discussion_logs: [],
    ...overrides,
  };
}

describe("ThemeCard", () => {
  it("renders theme title", () => {
    render(<ThemeCard theme={makeTheme()} />);
    expect(screen.getByText("AI Dev Dashboard")).toBeDefined();
  });

  it("renders theme_id", () => {
    render(<ThemeCard theme={makeTheme()} />);
    expect(screen.getByText("T-001")).toBeDefined();
  });

  it("renders next_action from latest decision", () => {
    render(<ThemeCard theme={makeTheme()} />);
    expect(screen.getByText("実装開始")).toBeDefined();
  });

  it("applies opacity-60 for on-hold status", () => {
    const { container } = render(
      <ThemeCard theme={makeTheme({ current_status: "on-hold" })} />,
    );
    const link = container.querySelector("a");
    expect(link?.className).toContain("opacity-60");
  });

  it("does not apply opacity-60 for non on-hold status", () => {
    const { container } = render(<ThemeCard theme={makeTheme()} />);
    const link = container.querySelector("a");
    expect(link?.className).not.toContain("opacity-60");
  });

  it("links to /themes/[themeId]", () => {
    const { container } = render(<ThemeCard theme={makeTheme()} />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/themes/T-001");
  });
});
