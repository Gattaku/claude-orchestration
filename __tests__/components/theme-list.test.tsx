import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeList } from "@/components/theme-list";
import type { ThemeOrError } from "@/lib/data/types";

function makeThemeOrError(
  themeId: string,
  title: string,
  updatedAt: string,
): ThemeOrError {
  return {
    type: "theme",
    data: {
      theme_id: themeId,
      title,
      current_phase: "technical-design",
      current_status: "in-progress",
      decisions: [
        {
          id: `test-id-${themeId}`,
          theme_id: themeId,
          title,
          phase: "technical-design",
          status: "in-progress",
          source: "test",
          created_at: "2026-01-01",
          updated_at: updatedAt,
          next_action: "次のアクション",
          awaiting_review: "",
          participants: ["AI Dev"],
          body_html: "<p>Test</p>",
        },
      ],
      phases: [
        {
          phase: "technical-design",
          status: "in-progress",
          updated_at: updatedAt,
        },
      ],
      discussion_logs: [],
    },
  };
}

describe("ThemeList", () => {
  it("renders EmptyState when no themes", () => {
    render(<ThemeList items={[]} />);
    expect(screen.getByText("テーマがありません")).toBeDefined();
  });

  it("renders theme cards", () => {
    const items: ThemeOrError[] = [
      makeThemeOrError("T-001", "テーマA", "2026-03-20"),
      makeThemeOrError("T-002", "テーマB", "2026-03-21"),
    ];
    render(<ThemeList items={items} />);
    expect(screen.getByText("テーマA")).toBeDefined();
    expect(screen.getByText("テーマB")).toBeDefined();
  });

  it("sorts themes by updated_at descending (newest first)", () => {
    const items: ThemeOrError[] = [
      makeThemeOrError("T-001", "古いテーマ", "2026-03-10"),
      makeThemeOrError("T-002", "新しいテーマ", "2026-03-20"),
    ];
    const { container } = render(<ThemeList items={items} />);
    const links = container.querySelectorAll("a");
    expect(links[0]?.getAttribute("href")).toBe("/themes/T-002");
    expect(links[1]?.getAttribute("href")).toBe("/themes/T-001");
  });

  it("renders error cards for parse errors", () => {
    const items: ThemeOrError[] = [
      {
        type: "error",
        error: {
          file_path: "docs/decisions/broken.md",
          error_message: "Invalid frontmatter",
        },
      },
    ];
    render(<ThemeList items={items} />);
    expect(screen.getByText(/docs\/decisions\/broken\.md/)).toBeDefined();
    expect(screen.getByText(/Invalid frontmatter/)).toBeDefined();
  });
});
