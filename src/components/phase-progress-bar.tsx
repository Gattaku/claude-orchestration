import { DISPLAY_PHASES, PHASE_DISPLAY_NAMES } from "@/lib/data/constants";
import type { Phase, PhaseInfo } from "@/lib/data/types";

interface PhaseProgressBarProps {
  phases: PhaseInfo[];
  currentPhase: Phase;
}

function getDotClass(
  phase: Phase,
  currentPhase: Phase,
  phaseMap: Map<Phase, PhaseInfo>,
): string {
  const info = phaseMap.get(phase);
  const phaseIndex = DISPLAY_PHASES.indexOf(phase);
  const currentIndex = DISPLAY_PHASES.indexOf(currentPhase);

  // If this phase has info and is completed, it's green
  if (info && info.status === "completed") {
    return "bg-status-completed";
  }

  // If this is the current phase, it's blue
  if (phase === currentPhase) {
    return "bg-status-active";
  }

  // If this phase is before the current phase and has info, it's green
  // (in case it's not explicitly "completed" but is a past phase)
  if (phaseIndex < currentIndex && info) {
    return "bg-status-completed";
  }

  // Future or untouched phases are gray
  return "bg-status-on-hold";
}

export function PhaseProgressBar({ phases, currentPhase }: PhaseProgressBarProps) {
  const phaseMap = new Map<Phase, PhaseInfo>();
  for (const p of phases) {
    phaseMap.set(p.phase, p);
  }

  return (
    <div className="flex items-center gap-1.5">
      {DISPLAY_PHASES.map((phase) => (
        <div
          key={phase}
          data-testid="phase-dot"
          title={PHASE_DISPLAY_NAMES[phase]}
          className={`h-2 w-2 rounded-full ${getDotClass(phase, currentPhase, phaseMap)}`}
        />
      ))}
    </div>
  );
}
