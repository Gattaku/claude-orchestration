/**
 * CLI: discussion_logs テーブルに議論ログを1件INSERTする
 *
 * 使い方:
 *   npx tsx scripts/insert-discussion-log.ts \
 *     --theme-id TH-001 \
 *     --agent-role "AI PM" \
 *     --direction request \
 *     --message "インサイトを分析してください"
 *
 * オプション:
 *   --decision-id <uuid>  紐づけるdecision ID（省略可）
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定済み
 *   - supabase/migrations が適用済み
 */

import "dotenv/config";
import { insertDiscussionLog } from "../src/lib/data/themes";
import type { AgentRole, MessageDirection } from "../src/lib/data/types";

// ---------------------------------------------------------------------------
// 引数パース
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].replace(/^--/, "");
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
      args[key] = value;
      if (value) i++;
    }
  }
  return args;
}

const USAGE = `
Usage:
  npx tsx scripts/insert-discussion-log.ts \\
    --theme-id TH-001 \\
    --agent-role "AI PM" \\
    --direction request \\
    --message "メッセージ内容"

Options:
  --theme-id     テーマID (必須, 例: TH-001)
  --agent-role   エージェントロール (必須, AIPO | AI PM | AI PD | AI Dev)
  --direction    メッセージ方向 (必須, request | response)
  --message      メッセージ本文 (必須)
  --decision-id  紐づけるdecision UUID (省略可)
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args["theme-id"] || !args["agent-role"] || !args["direction"] || !args["message"]) {
    console.error(USAGE);
    process.exit(1);
  }

  try {
    const result = await insertDiscussionLog({
      theme_id: args["theme-id"],
      agent_role: args["agent-role"] as AgentRole,
      direction: args["direction"] as MessageDirection,
      message: args["message"],
      decision_id: args["decision-id"] || null,
    });

    console.log("INSERT 成功:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("INSERT 失敗:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
