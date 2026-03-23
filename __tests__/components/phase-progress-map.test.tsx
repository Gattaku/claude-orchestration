import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseProgressMap } from "@/components/phase-progress-map";
import type { PhaseInfo } from "@/lib/data/types";

describe("PhaseProgressMap", () => {
  const phases: PhaseInfo[] = [
    { phase: "insight-extraction", status: "completed", updated_at: "2026-03-18" },
    { phase: "value-definition", status: "completed", updated_at: "2026-03-19" },
    { phase: "story-definition", status: "in-progress", updated_at: "2026-03-20" },
  ];

  it("renders all 6 phases", () => {
    render(<PhaseProgressMap phases={phases} currentPhase="story-definition" />);
    expect(screen.getByText("インサイト抽出")).toBeDefined();
    expect(screen.getByText("価値定義")).toBeDefined();
    expect(screen.getByText("Story策定")).toBeDefined();
    expect(screen.getByText("技術設計")).toBeDefined();
    expect(screen.getByText("実装")).toBeDefined();
    expect(screen.getByText("デリバリー")).toBeDefined();
  });

  it("marks completed phases with a check icon", () => {
    const { container } = render(
      <PhaseProgressMap phases={phases} currentPhase="story-definition" />,
    );
    const completedNodes = container.querySelectorAll('[data-status="completed"]');
    expect(completedNodes.length).toBe(2);
  });

  it("marks the current phase as in-progress", () => {
    const { container } = render(
      <PhaseProgressMap phases={phases} currentPhase="story-definition" />,
    );
    const inProgressNodes = container.querySelectorAll('[data-status="in-progress"]');
    expect(inProgressNodes.length).toBe(1);
  });

  it("marks phases without data as pending", () => {
    const { container } = render(
      <PhaseProgressMap phases={phases} currentPhase="story-definition" />,
    );
    const pendingNodes = container.querySelectorAll('[data-status="pending"]');
    expect(pendingNodes.length).toBe(3);
  });

  it("displays updated_at for completed phases", () => {
    render(<PhaseProgressMap phases={phases} currentPhase="story-definition" />);
    // Use getAllByText since formatShortDate may produce the same date for UTC boundary
    const date18 = screen.getAllByText("2026/03/18");
    const date19 = screen.getAllByText("2026/03/19");
    expect(date18.length).toBeGreaterThanOrEqual(1);
    expect(date19.length).toBeGreaterThanOrEqual(1);
  });
});
