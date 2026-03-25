"use client";

import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { DecisionApproveButton } from "@/components/decision-approve-button";
import { PHASE_DISPLAY_NAMES } from "@/lib/data/constants";
import type { ThemeDecision } from "@/lib/data/types";
import { formatShortDate } from "@/lib/utils/date";
import { ChevronDown, ChevronRight, X } from "lucide-react";

interface TimelineEntryProps {
  decision: ThemeDecision;
  isAuthenticated?: boolean;
}

export function TimelineEntry({ decision, isAuthenticated = false }: TimelineEntryProps) {
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  const hasBodyHtml =
    decision.body_html && decision.body_html.trim() !== "";
  const hasInputContent =
    decision.input_content && decision.input_content.trim() !== "";
  const hasDecisionsSummary =
    decision.decisions_summary && decision.decisions_summary.trim() !== "";

  const handleClose = useCallback(() => {
    setBodyExpanded(false);
    // setTimeout ensures scrollIntoView fires after the DOM update from state change
    setTimeout(() => {
      articleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }, []);

  return (
    <article
      ref={articleRef}
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
            onClick={() => bodyExpanded ? handleClose() : setBodyExpanded(true)}
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
            <div className="relative mt-2">
              {/* Scrollable expanded content area */}
              <div
                data-slot="expanded-content"
                className="max-h-[60vh] overflow-y-auto overscroll-contain"
              >
                {/* Sticky close bar */}
                <div
                  data-slot="close-bar"
                  className="sticky top-0 z-10 flex items-center justify-between bg-card/95 backdrop-blur-sm border-b px-2 py-1.5"
                >
                  <span className="text-xs text-muted-foreground">展開中</span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    閉じる
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Body content */}
                <div
                  data-slot="timeline-body"
                  className="prose prose-sm max-w-none text-sm text-foreground/90 px-2 py-2"
                  dangerouslySetInnerHTML={{ __html: decision.body_html }}
                />

                {/* Input Content (collapsible, inside body) */}
                {hasInputContent && (
                  <div data-slot="input-content" className="px-2 pb-2">
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
              </div>

              {/* Fade gradient overlay */}
              <div
                data-slot="fade-gradient"
                className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none rounded-b-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Approve button for awaiting-review decisions */}
      {isAuthenticated && decision.status === "awaiting-review" && (
        <div className="mt-3 pt-2 border-t">
          <DecisionApproveButton decisionId={decision.id} />
        </div>
      )}

      {/* Source reference */}
      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
        ソース: {decision.source}
      </div>
    </article>
  );
}
