import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { buildPhaseInfoList, deriveCurrentPhase } from "@/lib/utils/phase";
import type { Theme, ThemeDecision, ThemeOrError, DiscussionLog, AgentRole, MessageDirection } from "@/lib/data/types";

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
    input_content: (row.input_content as string | null) ?? null,
    decisions_summary: (row.decisions_summary as string | null) ?? null,
  };
}

/**
 * Convert a raw Supabase discussion_logs row into a DiscussionLog.
 */
function toDiscussionLog(row: Record<string, unknown>): DiscussionLog {
  return {
    id: row.id as string,
    theme_id: row.theme_id as string,
    decision_id: (row.decision_id as string | null) ?? null,
    agent_role: row.agent_role as DiscussionLog["agent_role"],
    direction: row.direction as DiscussionLog["direction"],
    message: row.message as string,
    created_at: row.created_at as string,
  };
}

/**
 * Build a Theme object from a theme_id and its decisions.
 * Returns null if there are no decisions (cannot derive phase).
 */
function buildTheme(
  themeId: string,
  decisions: ThemeDecision[],
  discussionLogs: DiscussionLog[] = [],
): Theme | null {
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
    discussion_logs: discussionLogs,
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

    // Fetch discussion logs for this theme (ordered by created_at ascending)
    const { data: logRows } = await supabase
      .from("discussion_logs")
      .select("*")
      .eq("theme_id", row.theme_id)
      .order("created_at", { ascending: true })
      .limit(100);

    const decisions = (decisionRows || []).map(toThemeDecision);
    const logs = (logRows || []).map(toDiscussionLog);
    const theme = buildTheme(row.theme_id, decisions, logs);

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

export async function getDiscussionLogsByThemeId(
  themeId: string,
): Promise<DiscussionLog[]> {
  const supabase = createStaticSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("discussion_logs")
    .select("*")
    .eq("theme_id", themeId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return [];
  return (data || []).map(toDiscussionLog);
}

// ---------------------------------------------------------------------------
// INSERT: 議論ログの書き込み
// ---------------------------------------------------------------------------

/**
 * Input for inserting a discussion log entry.
 * `id` and `created_at` are auto-generated by the database.
 */
export interface InsertDiscussionLogInput {
  theme_id: string;
  agent_role: AgentRole;
  direction: MessageDirection;
  message: string;
  decision_id?: string | null;
}

/**
 * Validate the input for insertDiscussionLog.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateDiscussionLogInput(
  input: InsertDiscussionLogInput,
): string | null {
  if (!input.theme_id || typeof input.theme_id !== "string") {
    return "theme_id is required and must be a non-empty string";
  }
  if (!/^TH-\d{3}$/.test(input.theme_id)) {
    return "theme_id must match pattern TH-NNN (e.g. TH-001)";
  }

  const validRoles: AgentRole[] = ["AIPO", "AI PM", "AI PD", "AI Dev"];
  if (!validRoles.includes(input.agent_role)) {
    return `agent_role must be one of: ${validRoles.join(", ")}`;
  }

  const validDirections: MessageDirection[] = ["request", "response"];
  if (!validDirections.includes(input.direction)) {
    return `direction must be one of: ${validDirections.join(", ")}`;
  }

  if (!input.message || typeof input.message !== "string") {
    return "message is required and must be a non-empty string";
  }

  return null;
}

/**
 * Create a Supabase client with service role key for server-side writes.
 * Returns null if environment variables are not configured.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

/**
 * Insert a discussion log entry into the discussion_logs table.
 *
 * Uses service role key to bypass RLS (agents run in CLI context).
 * Returns the inserted DiscussionLog on success, or throws an error.
 */
export async function insertDiscussionLog(
  input: InsertDiscussionLogInput,
): Promise<DiscussionLog> {
  // Validate input
  const validationError = validateDiscussionLogInput(input);
  if (validationError) {
    throw new Error(`Validation failed: ${validationError}`);
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are not configured " +
        "(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const insertData: Record<string, unknown> = {
    theme_id: input.theme_id,
    agent_role: input.agent_role,
    direction: input.direction,
    message: input.message,
  };

  if (input.decision_id) {
    insertData.decision_id = input.decision_id;
  }

  const { data, error } = await supabase
    .from("discussion_logs")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to insert discussion log: ${error.message}`);
  }

  return toDiscussionLog(data);
}

/**
 * Insert multiple discussion log entries in a single batch.
 * Returns the inserted DiscussionLog[] on success, or throws an error.
 */
export async function insertDiscussionLogBatch(
  inputs: InsertDiscussionLogInput[],
): Promise<DiscussionLog[]> {
  if (inputs.length === 0) {
    return [];
  }

  // Validate all inputs first
  for (let i = 0; i < inputs.length; i++) {
    const validationError = validateDiscussionLogInput(inputs[i]);
    if (validationError) {
      throw new Error(`Validation failed for entry ${i}: ${validationError}`);
    }
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are not configured " +
        "(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const insertRows = inputs.map((input) => {
    const row: Record<string, unknown> = {
      theme_id: input.theme_id,
      agent_role: input.agent_role,
      direction: input.direction,
      message: input.message,
    };
    if (input.decision_id) {
      row.decision_id = input.decision_id;
    }
    return row;
  });

  const { data, error } = await supabase
    .from("discussion_logs")
    .insert(insertRows)
    .select("*");

  if (error) {
    throw new Error(`Failed to insert discussion logs: ${error.message}`);
  }

  return (data || []).map(toDiscussionLog);
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
