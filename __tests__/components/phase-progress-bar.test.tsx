import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PhaseProgressBar } from "@/components/phase-progress-bar";
import type { PhaseInfo } from "@/lib/data/types";

describe("PhaseProgressBar", () => {
  it("renders 6 dots for 6 phases", () => {
    const { container } = render(
      <PhaseProgressBar
        phases={[]}
        currentPhase="insight-extraction"
      />,
    );
    const dots = container.querySelectorAll("[data-testid='phase-dot']");
    expect(dots).toHaveLength(6);
  });

  it("marks completed phases with green styling", () => {
    const phases: PhaseInfo[] = [
      { phase: "insight-extraction", status: "completed", updated_at: "2026-01-01" },
      { phase: "value-definition", status: "completed", updated_at: "2026-01-02" },
    ];
    const { container } = render(
      <PhaseProgressBar phases={phases} currentPhase="story-definition" />,
    );
    const dots = container.querySelectorAll("[data-testid='phase-dot']");
    expect(dots[0].className).toContain("bg-status-completed");
    expect(dots[1].className).toContain("bg-status-completed");
  });

  it("marks current phase with blue styling", () => {
    const phases: PhaseInfo[] = [
      { phase: "insight-extraction", status: "completed", updated_at: "2026-01-01" },
      { phase: "value-definition", status: "in-progress", updated_at: "2026-01-02" },
    ];
    const { container } = render(
      <PhaseProgressBar phases={phases} currentPhase="value-definition" />,
    );
    const dots = container.querySelectorAll("[data-testid='phase-dot']");
    expect(dots[1].className).toContain("bg-status-active");
  });

  it("marks future phases with gray styling", () => {
    const phases: PhaseInfo[] = [
      { phase: "insight-extraction", status: "in-progress", updated_at: "2026-01-01" },
    ];
    const { container } = render(
      <PhaseProgressBar phases={phases} currentPhase="insight-extraction" />,
    );
    const dots = container.querySelectorAll("[data-testid='phase-dot']");
    expect(dots[5].className).toContain("bg-status-on-hold");
  });
});
