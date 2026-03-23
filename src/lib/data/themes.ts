import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { buildPhaseInfoList, deriveCurrentPhase } from "@/lib/utils/phase";
import type { Theme, ThemeDecision, ThemeOrError } from "@/lib/data/types";

/**
 * Convert ISO 8601 timestamp to YYYY-MM-DD date string.
 */
function toDateString(isoString: string): string {
  return new Date(isoString).toISOString().split("T")[0];
}

/**
 * Convert a raw Supabase row into a ThemeDecision with date strings.
 */
function toThemeDecision(row: Record<string, unknown>): ThemeDecision {
  return {
    theme_id: row.theme_id as string,
    title: row.title as string,
    phase: row.phase as ThemeDecision["phase"],
    status: row.status as ThemeDecision["status"],
    source: row.source as string,
    created_at: toDateString(row.created_at as string),
    updated_at: toDateString(row.updated_at as string),
    next_action: row.next_action as string,
    awaiting_review: row.awaiting_review as string,
    participants: row.participants as string[],
    tags: row.tags as string[] | undefined,
    body_html: row.body_html as string,
  };
}

/**
 * Build a Theme object from a theme_id and its decisions.
 * Returns null if there are no decisions (cannot derive phase).
 */
function buildTheme(themeId: string, decisions: ThemeDecision[]): Theme | null {
  if (decisions.length === 0) return null;

  const currentPhase = deriveCurrentPhase(decisions);
  const latestForPhase = decisions.find((d) => d.phase === currentPhase);
  const currentStatus = latestForPhase?.status ?? decisions[0].status;

  return {
    theme_id: themeId,
    title: decisions[0].title,
    current_phase: currentPhase,
    current_status: currentStatus,
    decisions,
    phases: buildPhaseInfoList(decisions),
  };
}

export async function getAllThemes(): Promise<ThemeOrError[]> {
  const supabase = createStaticSupabaseClient();

  if (!supabase) {
    return [
      {
        type: "error",
        error: {
          file_path: "supabase:config",
          error_message:
            "Supabase environment variables are not configured (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)",
        },
      },
    ];
  }

  const { data: themeRows, error: themesError } = await supabase
    .from("themes")
    .select("theme_id");

  if (themesError) {
    return [
      {
        type: "error",
        error: {
          file_path: "supabase:themes",
          error_message: themesError.message,
        },
      },
    ];
  }

  if (!themeRows || themeRows.length === 0) {
    return [];
  }

  const results: ThemeOrError[] = [];

  for (const row of themeRows) {
    const { data: decisionRows, error: decError } = await supabase
      .from("theme_decisions")
      .select("*")
      .eq("theme_id", row.theme_id);

    if (decError) {
      results.push({
        type: "error",
        error: {
          file_path: `supabase:theme_decisions:${row.theme_id}`,
          error_message: decError.message,
        },
      });
      continue;
    }

    const decisions = (decisionRows || []).map(toThemeDecision);
    const theme = buildTheme(row.theme_id, decisions);

    if (theme) {
      results.push({ type: "theme", data: theme });
    }
  }

  return results;
}

export async function getThemeById(themeId: string): Promise<Theme | null> {
  const results = await getAllThemes();
  const found = results.find(
    (r) => r.type === "theme" && r.data.theme_id === themeId,
  );
  if (found && found.type === "theme") {
    return found.data;
  }
  return null;
}

export async function getAwaitingReviewThemes(): Promise<Theme[]> {
  const results = await getAllThemes();
  return results
    .filter(
      (r): r is { type: "theme"; data: Theme } =>
        r.type === "theme" && r.data.current_status === "awaiting-review",
    )
    .map((r) => r.data);
}
