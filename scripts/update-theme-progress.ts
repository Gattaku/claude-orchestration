/**
 * CLI: themes テーブルのPhase進捗を更新する
 *
 * 使い方:
 *   npx tsx scripts/update-theme-progress.ts \
 *     --theme-id TH-001 \
 *     --phase "implementation" \
 *     --status "in-progress" \
 *     --next-action "AI Devに実装を依頼"
 *
 * オプション:
 *   --next-action <string>  次のアクション（省略可。指定時はtheme_decisionsも更新）
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定済み
 *   - supabase/migrations が適用済み
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env
import { updateThemeProgress } from "../src/lib/data/themes";
import type { Phase, Status } from "../src/lib/data/types";

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
  npx tsx scripts/update-theme-progress.ts \\
    --theme-id TH-001 \\
    --phase "implementation" \\
    --status "in-progress" \\
    --next-action "AI Devに実装を依頼"

Options:
  --theme-id      テーマID (必須, 例: TH-001)
  --phase         Phase (必須, triage | insight-extraction | value-definition | story-definition | technical-design | implementation | delivery)
  --status        Status (必須, in-progress | awaiting-review | completed | on-hold)
  --next-action   次のアクション (省略可)
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args["theme-id"] || !args["phase"] || !args["status"]) {
    console.error(USAGE);
    process.exit(1);
  }

  try {
    await updateThemeProgress({
      theme_id: args["theme-id"],
      phase: args["phase"] as Phase,
      status: args["status"] as Status,
      next_action: args["next-action"] || undefined,
    });

    console.log("UPDATE 成功:");
    console.log(JSON.stringify({
      theme_id: args["theme-id"],
      phase: args["phase"],
      status: args["status"],
      next_action: args["next-action"] || "(未指定)",
    }, null, 2));
  } catch (err) {
    console.error("UPDATE 失敗:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
