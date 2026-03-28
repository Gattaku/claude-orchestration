/**
 * Claude Code PostToolUse Hook: Agent呼び出し後に議論ログをSupabaseに自動記録
 *
 * stdin から Claude Code が渡す JSON を読み取り、
 * Agent ツール使用時のリクエスト(AIPO->エージェント)とレスポンス(エージェント->AIPO)を
 * discussion_logs テーブルに INSERT する。
 *
 * 失敗しても exit 0 で返し、会話フローを止めない。
 */

import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
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

/** デバッグログファイルパス */
const DEBUG_LOG_PATH = resolve(PROJECT_ROOT, ".claude", "hooks", "hook-debug.log");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * デバッグログをファイルに追記する。
 * stderrだけだと消えるため、ファイルにも残す。
 */
function debugLog(message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}\n`;
  console.error(`[log-discussion] ${message}`);
  try {
    appendFileSync(DEBUG_LOG_PATH, line);
  } catch {
    // ログ書き込み失敗は無視
  }
}

/**
 * .env.local を読み込んで key=value を返す（dotenv に依存しない）
 * クォートで囲まれた値も正しく処理する。
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
        let value = trimmed.slice(eqIndex + 1).trim();
        // クォート除去: "value" or 'value' -> value
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
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
 * 環境変数を取得する。優先順位:
 * 1. process.env（シェル環境変数・CI/CD）
 * 2. .env.local / .env ファイル
 */
function getEnvVar(key, fileEnv) {
  return process.env[key] || fileEnv[key] || "";
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

/**
 * tool_response から応答テキストを抽出する。
 * Claude Code のバージョンにより形式が異なる可能性があるため、
 * 文字列、配列、オブジェクト（content配列含む）の全形式に対応する。
 */
function extractResponseText(toolResponse) {
  if (!toolResponse) return "";
  if (typeof toolResponse === "string") return toolResponse;

  if (Array.isArray(toolResponse)) {
    return toolResponse
      .map((item) =>
        typeof item === "string"
          ? item
          : item.text || item.output || JSON.stringify(item)
      )
      .join("\n");
  }

  if (typeof toolResponse === "object") {
    if (Array.isArray(toolResponse.content)) {
      return toolResponse.content
        .map((item) =>
          typeof item === "string"
            ? item
            : item.text || item.output || JSON.stringify(item)
        )
        .join("\n");
    }
    return (
      toolResponse.output ||
      toolResponse.content ||
      toolResponse.text ||
      toolResponse.result ||
      JSON.stringify(toolResponse)
    );
  }

  return String(toolResponse);
}

async function main() {
  debugLog("Hook invoked");

  // 1. stdin を読む
  const raw = await readStdin();
  if (!raw) {
    debugLog("No stdin data received");
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(raw);
  } catch {
    debugLog(`Failed to parse stdin JSON. Raw (first 500 chars): ${raw.slice(0, 500)}`);
    process.exit(0);
  }

  // stdin の全フィールドをデバッグログに記録（問題診断用）
  debugLog(
    `stdin keys: ${Object.keys(hookData).join(", ")} | ` +
      `tool_name=${hookData.tool_name || hookData.name || "(none)"}`
  );

  // 2. Agent ツール以外は無視
  // tool_name は "Agent" だが、将来のClaude Codeバージョンで変更される可能性に備える
  const toolName = hookData.tool_name || hookData.name || "";
  if (toolName !== "Agent") {
    debugLog(`Skipping non-Agent tool: ${toolName}`);
    process.exit(0);
  }

  // 3. tool_input を取得（フィールド名の揺れに対応）
  const toolInput = hookData.tool_input || hookData.input || hookData.tool_params || {};
  const subagentType = toolInput.subagent_type || toolInput.subagentType || "";
  const prompt = toolInput.prompt || toolInput.message || "";
  const description = toolInput.description || "";

  debugLog(
    `Agent call: subagent_type=${subagentType}, ` +
      `prompt_len=${prompt.length}, description=${description}`
  );

  // 4. agent_role を特定
  const agentRole = AGENT_ROLE_MAP[subagentType];
  if (!agentRole) {
    debugLog(
      `subagent_type "${subagentType}" not in AGENT_ROLE_MAP ` +
        `(expected: ${Object.keys(AGENT_ROLE_MAP).join(", ")}). ` +
        `prompt preview: ${prompt.slice(0, 100)}`
    );
    process.exit(0);
  }

  // 5. Theme ID を抽出
  const themeId = extractThemeId(prompt);
  if (!themeId) {
    debugLog(`No TH-XXX found in prompt. Preview: ${prompt.slice(0, 200)}`);
    process.exit(0);
  }

  debugLog(`Theme: ${themeId}, Role: ${agentRole}`);

  // 6. 環境変数を読み込む（process.env → .env.local → .env の優先順で取得）
  const fileEnv = loadEnvFile();
  const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", fileEnv);
  const serviceRoleKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", fileEnv);

  if (!supabaseUrl || !serviceRoleKey) {
    debugLog(
      `Supabase env vars MISSING. ` +
        `URL=${supabaseUrl ? "set" : "MISSING"}, KEY=${serviceRoleKey ? "set" : "MISSING"}. ` +
        `Checked: process.env, .env.local, .env. ` +
        `PROJECT_ROOT=${PROJECT_ROOT}`
    );
    process.exit(0);
  }

  debugLog(`Supabase URL: ${supabaseUrl.slice(0, 40)}...`);

  // 7. themes テーブルにテーマが存在することを保証（FK制約違反を防ぐ）
  try {
    await ensureThemeExists(supabaseUrl, serviceRoleKey, themeId);
    debugLog(`ensureThemeExists OK: ${themeId}`);
  } catch (err) {
    debugLog(`ensureThemeExists failed (best-effort): ${err.message}`);
  }

  // 8. request ログ（AIPO -> エージェント）
  const requestMessage = truncate(prompt);
  try {
    await insertLog(supabaseUrl, serviceRoleKey, {
      theme_id: themeId,
      agent_role: "AIPO",
      direction: "request",
      message: `[To ${agentRole}] ${requestMessage}`,
    });
    debugLog(`Logged request: AIPO -> ${agentRole} (${themeId})`);
  } catch (err) {
    debugLog(`Failed to log request: ${err.message}`);
  }

  // 9. response ログ（エージェント -> AIPO）
  const toolResponse = hookData.tool_response || hookData.response || hookData.output || "";
  const responseText = extractResponseText(toolResponse);

  debugLog(`Response text length: ${responseText.length}`);

  if (responseText) {
    const responseMessage = truncate(responseText);
    try {
      await insertLog(supabaseUrl, serviceRoleKey, {
        theme_id: themeId,
        agent_role: agentRole,
        direction: "response",
        message: responseMessage,
      });
      debugLog(`Logged response: ${agentRole} -> AIPO (${themeId})`);
    } catch (err) {
      debugLog(`Failed to log response: ${err.message}`);
    }
  } else {
    debugLog("No response text extracted from tool_response");
  }

  debugLog("Done successfully");
  process.exit(0);
}

main().catch((err) => {
  debugLog(`Unexpected error: ${err.message}\nStack: ${err.stack}`);
  process.exit(0); // 常に exit 0 で会話を止めない
});
