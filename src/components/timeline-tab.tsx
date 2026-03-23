"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineEntry } from "@/components/timeline-entry";
import type { ThemeDecision } from "@/lib/data/types";

interface TimelineTabProps {
  decisions: ThemeDecision[];
}

export function TimelineTab({ decisions }: TimelineTabProps) {
  const sortedDecisions = [...decisions].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at),
  );

  return (
    <Tabs defaultValue="timeline">
      <TabsList>
        <TabsTrigger value="timeline">タイムライン</TabsTrigger>
        <TabsTrigger value="decisions">判断ポイント</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-4">
        <div className="flex flex-col gap-4">
          {sortedDecisions.map((decision, index) => (
            <TimelineEntry key={`${decision.source}-${index}`} decision={decision} />
          ))}
          {sortedDecisions.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              タイムラインデータがありません。
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="decisions" className="mt-4">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Coming Soon</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
