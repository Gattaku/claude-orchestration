import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PhaseProgressBar } from "@/components/phase-progress-bar";
import { formatRelativeTime } from "@/lib/utils/date";
import type { Theme } from "@/lib/data/types";

interface ThemeCardProps {
  theme: Theme;
}

function getLatestDecision(theme: Theme) {
  return theme.decisions.reduce((a, b) =>
    a.updated_at >= b.updated_at ? a : b,
  );
}

export function ThemeCard({ theme }: ThemeCardProps) {
  const latestDecision = theme.decisions.length > 0
    ? getLatestDecision(theme)
    : null;
  const isOnHold = theme.current_status === "on-hold";

  return (
    <Link
      href={`/themes/${theme.theme_id}`}
      className={`block transition-shadow hover:shadow-md rounded-xl ${isOnHold ? "opacity-60" : ""}`}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">{theme.title}</CardTitle>
              <CardDescription className="mt-1">{theme.theme_id}</CardDescription>
            </div>
            <StatusBadge status={theme.current_status} />
          </div>
        </CardHeader>
        <CardContent>
          <PhaseProgressBar
            phases={theme.phases}
            currentPhase={theme.current_phase}
          />
          {latestDecision && (
            <p className="mt-3 text-sm text-muted-foreground">
              {latestDecision.next_action}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {latestDecision
              ? formatRelativeTime(latestDecision.updated_at)
              : "---"}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
