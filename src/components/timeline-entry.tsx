import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PHASE_DISPLAY_NAMES } from "@/lib/data/constants";
import type { ThemeDecision } from "@/lib/data/types";
import { formatShortDate } from "@/lib/utils/date";

interface TimelineEntryProps {
  decision: ThemeDecision;
}

export function TimelineEntry({ decision }: TimelineEntryProps) {
  return (
    <article
      data-slot="timeline-entry"
      className="rounded-lg border bg-card p-4 shadow-sm"
    >
      {/* Header row: phase badge + status badge + date */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {PHASE_DISPLAY_NAMES[decision.phase]}
        </Badge>
        <StatusBadge status={decision.status} />
        <span className="ml-auto text-xs text-muted-foreground">
          {formatShortDate(decision.updated_at)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold mb-1">{decision.title}</h3>

      {/* Participants */}
      <div className="flex flex-wrap gap-1 mb-3">
        {decision.participants.map((p) => (
          <Badge key={p} variant="outline" className="text-[11px] px-1.5 py-0">
            {p}
          </Badge>
        ))}
      </div>

      {/* Body HTML */}
      {decision.body_html && (
        <div
          data-slot="timeline-body"
          className="prose prose-sm max-w-none text-sm text-foreground/90"
          dangerouslySetInnerHTML={{ __html: decision.body_html }}
        />
      )}

      {/* Source reference */}
      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
        ソース: {decision.source}
      </div>
    </article>
  );
}
