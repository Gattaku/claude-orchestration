import type { ThemeDecision, PhaseInfo } from "@/lib/data/types";

/**
 * Derives the current phase from a list of decisions.
 * Returns the phase of the decision with the latest updated_at date.
 */
export function deriveCurrentPhase(
  decisions: ThemeDecision[],
): ThemeDecision["phase"] {
  if (decisions.length === 0) {
    throw new Error("Cannot derive current phase from empty decisions array");
  }

  let latest = decisions[0];
  for (let i = 1; i < decisions.length; i++) {
    if (decisions[i].updated_at > latest.updated_at) {
      latest = decisions[i];
    }
  }
  return latest.phase;
}

/**
 * Builds a list of PhaseInfo objects from decisions.
 * Groups by phase and picks the latest updated_at per phase.
 * The status comes from the decision with the latest updated_at for that phase.
 */
export function buildPhaseInfoList(decisions: ThemeDecision[]): PhaseInfo[] {
  if (decisions.length === 0) return [];

  const phaseMap = new Map<
    string,
    { phase: ThemeDecision["phase"]; status: ThemeDecision["status"]; updated_at: string }
  >();

  for (const d of decisions) {
    const existing = phaseMap.get(d.phase);
    if (!existing || d.updated_at > existing.updated_at) {
      phaseMap.set(d.phase, {
        phase: d.phase,
        status: d.status,
        updated_at: d.updated_at,
      });
    }
  }

  return Array.from(phaseMap.values());
}
