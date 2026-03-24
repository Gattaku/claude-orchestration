"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PHASE_DISPLAY_NAMES } from "@/lib/data/constants";
import type { ThemeDecision } from "@/lib/data/types";
import { formatShortDate } from "@/lib/utils/date";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TimelineEntryProps {
  decision: ThemeDecision;
}

export function TimelineEntry({ decision }: TimelineEntryProps) {
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);

  const hasBodyHtml =
    decision.body_html && decision.body_html.trim() !== "";
  const hasInputContent =
    decision.input_content && decision.input_content.trim() !== "";
  const hasDecisionsSummary =
    decision.decisions_summary && decision.decisions_summary.trim() !== "";

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

      {/* Decisions Summary (highlighted) */}
      {hasDecisionsSummary && (
        <div
          data-slot="decisions-summary"
          className="mb-3 rounded-md border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 px-3 py-2"
        >
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            決定事項
          </p>
          <div className="text-sm text-foreground/90 whitespace-pre-wrap">
            {decision.decisions_summary}
          </div>
        </div>
      )}

      {/* Body HTML (collapsible) */}
      {hasBodyHtml && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setBodyExpanded(!bodyExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {bodyExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {bodyExpanded ? "閉じる" : "詳細を見る"}
          </button>
          {bodyExpanded && (
            <>
              <div
                data-slot="timeline-body"
                className="mt-2 prose prose-sm max-w-none text-sm text-foreground/90"
                dangerouslySetInnerHTML={{ __html: decision.body_html }}
              />

              {/* Input Content (collapsible, inside body) */}
              {hasInputContent && (
                <div data-slot="input-content" className="mt-3">
                  <button
                    type="button"
                    onClick={() => setInputExpanded(!inputExpanded)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {inputExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    Input内容を表示
                  </button>
                  {inputExpanded && (
                    <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground/80 whitespace-pre-wrap">
                      {decision.input_content}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom close button */}
              <button
                type="button"
                onClick={() => setBodyExpanded(!bodyExpanded)}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-3 w-3" />
                閉じる
              </button>
            </>
          )}
        </div>
      )}

      {/* Source reference */}
      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
        ソース: {decision.source}
      </div>
    </article>
  );
}
