/**
 * データ移行スクリプト: Markdown → Supabase
 *
 * 既存の docs/decisions/TH-001-*.md ファイルをパースし、
 * Supabase の themes / theme_decisions テーブルに UPSERT する。
 *
 * 実行方法:
 *   npx tsx -r tsconfig-paths/register scripts/migrate-md-to-supabase.ts
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定済み
 *   - supabase/migrations が適用済み
 */

import "dotenv/config";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { parseMarkdownFiles } from "@/lib/data/parser";

// ---------------------------------------------------------------------------
// 環境変数チェック
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabaseクライアント（service_roleではなくanon keyで実行。RLSに注意）
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Markdown → Supabase 移行スクリプト ===\n");

  // 1. Markdownファイルのパース
  const decisionsDir = path.resolve(process.cwd(), "docs/decisions");
  console.log(`ソースディレクトリ: ${decisionsDir}`);

  const results = await parseMarkdownFiles(decisionsDir);

  // TH-001 のテーマだけをフィルタ
  const themes = results
    .filter((r) => r.type === "theme")
    .map((r) => {
      if (r.type !== "theme") throw new Error("unreachable");
      return r.data;
    })
    .filter((t) => t.theme_id.startsWith("TH-001"));

  const errors = results.filter((r) => r.type === "error");

  if (errors.length > 0) {
    console.warn(`\n[警告] パースエラー: ${errors.length} 件`);
    for (const e of errors) {
      if (e.type === "error") {
        console.warn(`  - ${e.error.file_path}: ${e.error.error_message}`);
      }
    }
  }

  if (themes.length === 0) {
    console.log("\n移行対象のテーマが見つかりませんでした。");
    return;
  }

  console.log(`\n移行対象: ${themes.length} テーマ`);

  // 2. themes テーブルへの UPSERT
  let themesUpserted = 0;
  let decisionsUpserted = 0;

  for (const theme of themes) {
    console.log(`\n--- テーマ: ${theme.theme_id} (${theme.title}) ---`);

    // themes テーブルに UPSERT
    const { error: themeError } = await supabase.from("themes").upsert(
      {
        theme_id: theme.theme_id,
        title: theme.title,
        current_phase: theme.current_phase,
        current_status: theme.current_status,
        source: theme.decisions[0]?.source ?? "",
        next_action:
          theme.decisions[theme.decisions.length - 1]?.next_action ?? "",
        awaiting_review:
          theme.decisions[theme.decisions.length - 1]?.awaiting_review ?? "",
      },
      { onConflict: "theme_id" },
    );

    if (themeError) {
      console.error(
        `  [エラー] themes UPSERT 失敗: ${themeError.message}`,
      );
      continue;
    }

    themesUpserted++;
    console.log(`  themes: UPSERT 成功`);

    // 3. theme_decisions テーブルへの UPSERT
    for (const decision of theme.decisions) {
      // 冪等性のため、theme_id + phase の組み合わせで既存レコードを検索
      const { data: existing } = await supabase
        .from("theme_decisions")
        .select("id")
        .eq("theme_id", decision.theme_id)
        .eq("phase", decision.phase)
        .limit(1)
        .single();

      const decisionData = {
        theme_id: decision.theme_id,
        title: decision.title,
        phase: decision.phase,
        status: decision.status,
        source: decision.source,
        next_action: decision.next_action,
        awaiting_review: decision.awaiting_review,
        participants: decision.participants,
        tags: decision.tags ?? [],
        body_html: decision.body_html,
      };

      let decisionError;

      if (existing?.id) {
        // 既存レコードを更新
        const result = await supabase
          .from("theme_decisions")
          .update(decisionData)
          .eq("id", existing.id);
        decisionError = result.error;
      } else {
        // 新規レコードを挿入
        const result = await supabase
          .from("theme_decisions")
          .insert(decisionData);
        decisionError = result.error;
      }

      if (decisionError) {
        console.error(
          `  [エラー] theme_decisions UPSERT 失敗 (${decision.phase}): ${decisionError.message}`,
        );
      } else {
        decisionsUpserted++;
        console.log(
          `  theme_decisions: ${existing?.id ? "UPDATE" : "INSERT"} 成功 (${decision.phase})`,
        );
      }
    }
  }

  // 4. サマリー出力
  console.log("\n=== 移行結果サマリー ===");
  console.log(`テーマ UPSERT: ${themesUpserted} 件`);
  console.log(`決定記録 UPSERT: ${decisionsUpserted} 件`);
  console.log(`パースエラー: ${errors.length} 件`);
  console.log("========================\n");
}

main().catch((err) => {
  console.error("移行スクリプトがエラーで終了しました:", err);
  process.exit(1);
});
