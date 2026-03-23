import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getThemeById } from "@/lib/data/themes";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PhaseProgressMap } from "@/components/phase-progress-map";
import { TimelineTab } from "@/components/timeline-tab";
import { ReviewActions } from "@/components/review-actions";

interface ThemeDetailPageProps {
  params: Promise<{ themeId: string }>;
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createStaticSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase.from("themes").select("theme_id");
  return (data || []).map((t) => ({ themeId: t.theme_id }));
}

export default async function ThemeDetailPage({
  params,
}: ThemeDetailPageProps) {
  const { themeId } = await params;
  const theme = await getThemeById(themeId);

  if (!theme) {
    notFound();
  }

  // Check authentication for review actions
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the source from the latest decision
  const latestDecision = theme.decisions.length > 0
    ? theme.decisions.reduce((latest, d) =>
        d.updated_at > latest.updated_at ? d : latest,
      )
    : null;

  const isAwaitingReview = theme.current_status === "awaiting-review";

  return (
    <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        テーマ一覧へ
      </Link>

      {/* Theme Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs font-mono">
            {theme.theme_id}
          </Badge>
          <StatusBadge status={theme.current_status} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{theme.title}</h1>
        {latestDecision && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>ソース: {latestDecision.source}</span>
          </div>
        )}
      </div>

      {/* Review Actions (only for awaiting-review themes with authenticated users) */}
      {isAwaitingReview && (
        <div className="mb-8">
          <ReviewActions themeId={theme.theme_id} isAuthenticated={!!user} />
        </div>
      )}

      {/* Phase Progress Map */}
      <div className="mb-8 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          フェーズ進行状況
        </h2>
        <PhaseProgressMap
          phases={theme.phases}
          currentPhase={theme.current_phase}
        />
      </div>

      {/* Timeline / Discussion Logs / Decision Tabs */}
      <TimelineTab
        decisions={theme.decisions}
        discussionLogs={theme.discussion_logs}
      />
    </main>
  );
}
