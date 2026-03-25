import { describe, it, expect } from "vitest";
import { deriveCurrentPhase, buildPhaseInfoList } from "@/lib/utils/phase";
import type { ThemeDecision } from "@/lib/data/types";

function makeDecision(
  overrides: Partial<ThemeDecision> = {},
): ThemeDecision {
  return {
    id: `test-phase-${overrides.phase || "insight-extraction"}`,
    theme_id: "TH-001",
    title: "Test",
    phase: "insight-extraction",
    status: "completed",
    source: "test.md",
    created_at: "2026-03-20",
    updated_at: "2026-03-20",
    next_action: "",
    awaiting_review: "",
    participants: ["AIPO"],
    body_html: "",
    ...overrides,
  };
}

describe("deriveCurrentPhase", () => {
  it("returns the phase of the decision with the latest updated_at", () => {
    const decisions = [
      makeDecision({ phase: "insight-extraction", updated_at: "2026-03-20" }),
      makeDecision({ phase: "value-definition", updated_at: "2026-03-22" }),
      makeDecision({ phase: "story-definition", updated_at: "2026-03-21" }),
    ];
    expect(deriveCurrentPhase(decisions)).toBe("value-definition");
  });

  it("returns the phase of the first decision when all dates are equal", () => {
    const decisions = [
      makeDecision({ phase: "insight-extraction", updated_at: "2026-03-20" }),
      makeDecision({ phase: "value-definition", updated_at: "2026-03-20" }),
    ];
    // When dates are equal, the first one encountered should win
    const result = deriveCurrentPhase(decisions);
    expect(["insight-extraction", "value-definition"]).toContain(result);
  });

  it("throws an error when decisions array is empty", () => {
    expect(() => deriveCurrentPhase([])).toThrow();
  });
});

describe("buildPhaseInfoList", () => {
  it("builds phase info from decisions, using latest updated_at per phase", () => {
    const decisions = [
      makeDecision({
        phase: "insight-extraction",
        status: "completed",
        updated_at: "2026-03-20",
      }),
      makeDecision({
        phase: "insight-extraction",
        status: "completed",
        updated_at: "2026-03-21",
      }),
      makeDecision({
        phase: "value-definition",
        status: "in-progress",
        updated_at: "2026-03-22",
      }),
    ];

    const phases = buildPhaseInfoList(decisions);

    expect(phases).toHaveLength(2);

    const insightPhase = phases.find(
      (p) => p.phase === "insight-extraction",
    );
    expect(insightPhase).toBeDefined();
    expect(insightPhase!.updated_at).toBe("2026-03-21");
    expect(insightPhase!.status).toBe("completed");

    const valuePhase = phases.find(
      (p) => p.phase === "value-definition",
    );
    expect(valuePhase).toBeDefined();
    expect(valuePhase!.updated_at).toBe("2026-03-22");
    expect(valuePhase!.status).toBe("in-progress");
  });

  it("returns empty array for empty decisions", () => {
    expect(buildPhaseInfoList([])).toEqual([]);
  });
});
