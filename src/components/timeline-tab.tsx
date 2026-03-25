"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineEntry } from "@/components/timeline-entry";
import { DiscussionLogEntry } from "@/components/discussion-log-entry";
import type { ThemeDecision, DiscussionLog } from "@/lib/data/types";

interface TimelineTabProps {
  decisions: ThemeDecision[];
  discussionLogs?: DiscussionLog[];
  isAuthenticated?: boolean;
}

export function TimelineTab({ decisions, discussionLogs = [], isAuthenticated = false }: TimelineTabProps) {
  const sortedDecisions = [...decisions].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at),
  );

  // Extract decisions that have a decisions_summary
  const decisionsWithSummary = sortedDecisions.filter(
    (d) => d.decisions_summary && d.decisions_summary.trim() !== "",
  );

  return (
    <Tabs defaultValue="timeline">
      <TabsList>
        <TabsTrigger value="timeline">タイムライン</TabsTrigger>
        <TabsTrigger value="discussion-logs">議論ログ</TabsTrigger>
        <TabsTrigger value="decisions">決定事項</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-4">
        <div className="flex flex-col gap-4">
          {sortedDecisions.map((decision, index) => (
            <TimelineEntry key={`${decision.source}-${index}`} decision={decision} isAuthenticated={isAuthenticated} />
          ))}
          {sortedDecisions.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              タイムラインデータがありません。
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="discussion-logs" className="mt-4">
        <div className="flex flex-col gap-3">
          {discussionLogs.map((log) => (
            <DiscussionLogEntry key={log.id} log={log} />
          ))}
          {discussionLogs.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              議論ログがありません。
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="decisions" className="mt-4">
        <div className="flex flex-col gap-4">
          {decisionsWithSummary.map((decision, index) => (
            <article
              key={`summary-${decision.phase}-${index}`}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {decision.phase}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {decision.updated_at}
                </span>
              </div>
              <h3 className="text-base font-semibold mb-2">{decision.title}</h3>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                {decision.decisions_summary}
              </div>
            </article>
          ))}
          {decisionsWithSummary.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              決定事項のサマリーがありません。
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
