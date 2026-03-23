import { Check } from "lucide-react";
import { VALID_PHASES, PHASE_DISPLAY_NAMES } from "@/lib/data/constants";
import type { Phase, PhaseInfo } from "@/lib/data/types";
import { formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface PhaseProgressMapProps {
  phases: PhaseInfo[];
  currentPhase: Phase;
}

type PhaseNodeStatus = "completed" | "in-progress" | "pending";

function getPhaseNodeStatus(
  phase: Phase,
  phaseInfoMap: Map<Phase, PhaseInfo>,
  currentPhase: Phase,
): PhaseNodeStatus {
  const info = phaseInfoMap.get(phase);
  if (!info) return "pending";
  if (info.status === "completed") return "completed";
  if (phase === currentPhase) return "in-progress";
  // If the phase has data but is not completed and not current, treat based on status
  if (info.status === "in-progress" || info.status === "awaiting-review") return "in-progress";
  return "pending";
}

export function PhaseProgressMap({ phases, currentPhase }: PhaseProgressMapProps) {
  const phaseInfoMap = new Map<Phase, PhaseInfo>();
  for (const p of phases) {
    phaseInfoMap.set(p.phase, p);
  }

  return (
    <div className="flex items-start gap-0 overflow-x-auto" data-slot="phase-progress-map">
      {VALID_PHASES.map((phase, index) => {
        const nodeStatus = getPhaseNodeStatus(phase, phaseInfoMap, currentPhase);
        const info = phaseInfoMap.get(phase);
        const isLast = index === VALID_PHASES.length - 1;

        return (
          <div key={phase} className="flex items-start" data-status={nodeStatus}>
            <div className="flex flex-col items-center min-w-[100px]">
              {/* Circle indicator */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                  nodeStatus === "completed" &&
                    "border-status-completed bg-status-completed text-white",
                  nodeStatus === "in-progress" &&
                    "border-status-active bg-status-active text-white animate-pulse",
                  nodeStatus === "pending" &&
                    "border-muted-foreground/30 bg-background text-muted-foreground/50",
                )}
              >
                {nodeStatus === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>

              {/* Phase name */}
              <span
                className={cn(
                  "mt-1.5 text-xs text-center leading-tight",
                  nodeStatus === "completed" && "text-foreground font-medium",
                  nodeStatus === "in-progress" && "text-status-active font-medium",
                  nodeStatus === "pending" && "text-muted-foreground",
                )}
              >
                {PHASE_DISPLAY_NAMES[phase]}
              </span>

              {/* Date for completed phases */}
              {nodeStatus === "completed" && info && (
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatShortDate(info.updated_at)}
                </span>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "mt-[14px] h-0.5 w-6 flex-shrink-0",
                  nodeStatus === "completed" ? "bg-status-completed" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
