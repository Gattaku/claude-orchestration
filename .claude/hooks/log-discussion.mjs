/**
 * Claude Code PostToolUse Hook: Agent呼び出し後に議論ログをSupabaseに自動記録
 *
 * stdin から Claude Code が渡す JSON を読み取り、
 * Agent ツール使用時のリクエスト(AIPO->エージェント)とレスポンス(エージェント->AIPO)を
 * discussion_logs テーブルに INSERT する。
 *
 * 失敗しても exit 0 で返し、会話フローを止めない。
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

/** subagent_type -> agent_role_enum マッピング */
const AGENT_ROLE_MAP = {
  "ai-pm": "AI PM",
  "ai-pd": "AI PD",
  "ai-dev": "AI Dev",
};

/** メッセージの最大文字数（超過分は切り詰め） */
const MAX_MESSAGE_LENGTH = 3000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * .env.local を読み込んで key=value を返す（dotenv に依存しない）
 */
function loadEnvFile() {
  const envVars = {};
  for (const fileName of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, fileName), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!envVars[key]) {
          envVars[key] = value;
        }
      }
    } catch {
      // ファイルが無い場合はスキップ
    }
  }
  return envVars;
}

/**
 * プロンプトから TH-XXX パターンを抽出（最初にマッチしたもの）
 */
function extractThemeId(text) {
  if (!text) return null;
  const match = text.match(/TH-\d{3}/);
  return match ? match[0] : null;
}

/**
 * メッセージを最大長で切り詰める
 */
function truncate(text, maxLen = MAX_MESSAGE_LENGTH) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\n...(truncated)";
}

/**
 * stdin を全部読む
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
    // 5秒でタイムアウト
    setTimeout(() => resolve(chunks.join("")), 5000);
  });
}

/**
 * themes テーブルに該当 themeId が存在しなければ INSERT する。
 * 既に存在する場合は何もしない（ON CONFLICT DO NOTHING 相当）。
 *
 * Prefer: resolution=ignore-duplicates を使い、
 * 既存テーマの title や他カラムを上書きしない。
 */
async function ensureThemeExists(supabaseUrl, serviceRoleKey, themeId) {
  const url = `${supabaseUrl}/rest/v1/themes`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({
      theme_id: themeId,
      title: `Theme ${themeId}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase themes upsert failed (${response.status}): ${body}`
    );
  }
}

/**
 * Supabase REST API に直接 INSERT（supabase-js に依存しない）
 */
async function insertLog(supabaseUrl, serviceRoleKey, record) {
  const url = `${supabaseUrl}/rest/v1/discussion_logs`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase INSERT failed (${response.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. stdin を読む
  const raw = await readStdin();
  if (!raw) {
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(raw);
  } catch {
    console.error("[log-discussion] Failed to parse stdin JSON");
    process.exit(0);
  }

  // 2. Agent ツール以外は無視
  if (hookData.tool_name !== "Agent") {
    process.exit(0);
  }

  const toolInput = hookData.tool_input || {};
  const subagentType = toolInput.subagent_type;

  // AIPOから各AIエージェントへの呼び出しのみ対象
  const agentRole = AGENT_ROLE_MAP[subagentType];
  if (!agentRole) {
    // ai-pm, ai-pd, ai-dev 以外（general-purpose等）はスキップ
    process.exit(0);
  }

  // 3. Theme ID を抽出
  const themeId = extractThemeId(toolInput.prompt || "");
  if (!themeId) {
    console.error(
      "[log-discussion] No TH-XXX found in prompt, skipping log insertion"
    );
    process.exit(0);
  }

  // 4. 環境変数を読み込む
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[log-discussion] Supabase env vars not found, skipping");
    process.exit(0);
  }

  // 5. themes テーブルにテーマが存在することを保証（FK制約違反を防ぐ）
  try {
    await ensureThemeExists(supabaseUrl, serviceRoleKey, themeId);
    console.error(`[log-discussion] ensureThemeExists OK: ${themeId}`);
  } catch (err) {
    console.error(
      `[log-discussion] ensureThemeExists failed (best-effort): ${err.message}`
    );
    // ベストエフォート: 失敗してもログINSERTは試みる
  }

  // 6. request ログ（AIPO -> エージェント）
  const requestMessage = truncate(toolInput.prompt || "");
  try {
    await insertLog(supabaseUrl, serviceRoleKey, {
      theme_id: themeId,
      agent_role: "AIPO",
      direction: "request",
      message: `[To ${agentRole}] ${requestMessage}`,
    });
    console.error(`[log-discussion] Logged request: AIPO -> ${agentRole} (${themeId})`);
  } catch (err) {
    console.error(`[log-discussion] Failed to log request: ${err.message}`);
  }

  // 7. response ログ（エージェント -> AIPO）
  // tool_response はオブジェクトの場合も文字列の場合もある
  let responseText = "";
  const toolResponse = hookData.tool_response;
  if (typeof toolResponse === "string") {
    responseText = toolResponse;
  } else if (toolResponse && typeof toolResponse === "object") {
    // output フィールドがある場合はそれを使う
    responseText =
      toolResponse.output ||
      toolResponse.content ||
      toolResponse.text ||
      JSON.stringify(toolResponse);
  }

  if (responseText) {
    const responseMessage = truncate(responseText);
    try {
      await insertLog(supabaseUrl, serviceRoleKey, {
        theme_id: themeId,
        agent_role: agentRole,
        direction: "response",
        message: responseMessage,
      });
      console.error(
        `[log-discussion] Logged response: ${agentRole} -> AIPO (${themeId})`
      );
    } catch (err) {
      console.error(`[log-discussion] Failed to log response: ${err.message}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`[log-discussion] Unexpected error: ${err.message}`);
  process.exit(0); // 常に exit 0 で会話を止めない
});
