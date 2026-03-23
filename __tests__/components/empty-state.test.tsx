import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="テーマがありません" />);
    expect(screen.getByText("テーマがありません")).toBeDefined();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState
        title="テーマがありません"
        description="docs/decisions にマークダウンファイルを追加してください。"
      />,
    );
    expect(
      screen.getByText(
        "docs/decisions にマークダウンファイルを追加してください。",
      ),
    ).toBeDefined();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="テーマがありません" />);
    const descEl = container.querySelector("[data-testid='empty-state-description']");
    expect(descEl).toBeNull();
  });
});
