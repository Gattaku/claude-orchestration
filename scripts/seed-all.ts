/**
 * 統合シードスクリプト: 全データを一括でSupabaseに投入する
 *
 * 処理順序:
 *   1. Markdownファイルから themes + theme_decisions を UPSERT
 *   2. discussion_logs のシードデータを INSERT
 *
 * 使い方:
 *   npx tsx -r tsconfig-paths/register scripts/seed-all.ts
 *   npx tsx -r tsconfig-paths/register scripts/seed-all.ts --clean   # 既存データを削除してから投入
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定済み
 *   - supabase/migrations が適用済み
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

import path from "path";
import { createClient } from "@supabase/supabase-js";
import { parseMarkdownFiles } from "@/lib/data/parser";
import type { InsertDiscussionLogInput } from "../src/lib/data/themes";

// ---------------------------------------------------------------------------
// 環境変数チェック
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local\n" +
      "Service Role Key is required to bypass RLS for data seeding.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Step 1: Markdown → themes + theme_decisions UPSERT
// ---------------------------------------------------------------------------
async function seedThemesAndDecisions() {
  console.log("\n=== Step 1: themes + theme_decisions UPSERT ===\n");

  const decisionsDir = path.resolve(process.cwd(), "docs/decisions");
  console.log(`ソースディレクトリ: ${decisionsDir}`);

  const results = await parseMarkdownFiles(decisionsDir);

  const themes = results
    .filter((r) => r.type === "theme")
    .map((r) => {
      if (r.type !== "theme") throw new Error("unreachable");
      return r.data;
    });

  const errors = results.filter((r) => r.type === "error");

  if (errors.length > 0) {
    console.warn(`[警告] パースエラー: ${errors.length} 件`);
    for (const e of errors) {
      if (e.type === "error") {
        console.warn(`  - ${e.error.file_path}: ${e.error.error_message}`);
      }
    }
  }

  if (themes.length === 0) {
    console.log("移行対象のテーマが見つかりませんでした。");
    return;
  }

  console.log(`移行対象: ${themes.length} テーマ`);

  let themesUpserted = 0;
  let decisionsUpserted = 0;

  for (const theme of themes) {
    console.log(`\n--- ${theme.theme_id}: ${theme.title} ---`);

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
      console.error(`  [エラー] themes UPSERT 失敗: ${themeError.message}`);
      continue;
    }

    themesUpserted++;
    console.log(`  themes: UPSERT 成功`);

    // theme_decisions テーブルへの UPSERT
    for (const decision of theme.decisions) {
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
        const result = await supabase
          .from("theme_decisions")
          .update(decisionData)
          .eq("id", existing.id);
        decisionError = result.error;
      } else {
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

  console.log(`\nStep 1 結果: themes=${themesUpserted}, decisions=${decisionsUpserted}`);
}

// ---------------------------------------------------------------------------
// Step 2: discussion_logs シードデータ INSERT
// ---------------------------------------------------------------------------

// TH-001: AIオーケストレーション可視化ダッシュボード
const th001Logs: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-001",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-001: AIオーケストレーション可視化ダッシュボードの要件を整理してください。現在のMarkdownベースの意思決定記録をWebダッシュボードで可視化したいです。",
  },
  {
    theme_id: "TH-001",
    agent_role: "AI PM",
    direction: "response",
    message:
      "要件を整理しました。主要機能: (1) テーマ一覧表示、(2) フェーズ進捗の可視化、(3) 意思決定記録の詳細表示。Next.js + Tailwind CSSで構築し、Markdownファイルからデータをパースする方式を提案します。",
  },
  {
    theme_id: "TH-001",
    agent_role: "AIPO",
    direction: "request",
    message:
      "UIデザインの方向性について、AI PDの見解をお願いします。ダッシュボードの情報設計が重要です。",
  },
  {
    theme_id: "TH-001",
    agent_role: "AI PD",
    direction: "response",
    message:
      "カード型UIを推奨します。各テーマをカードで表示し、フェーズ進捗をプログレスバーで可視化。ステータスはバッジで色分け。テーマ詳細ページではタブ切り替えでタイムライン・議論・決定事項を整理します。",
  },
  {
    theme_id: "TH-001",
    agent_role: "AIPO",
    direction: "request",
    message: "技術設計と実装をお願いします。Next.js 15 App Routerベースで進めてください。",
  },
  {
    theme_id: "TH-001",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。Next.js 15 + React 19 + Tailwind CSS + shadcn/ui。Markdownパーサー (gray-matter + remark) でfrontmatterを解析し、ThemeOrError[]型でデータを供給。コンポーネント: ThemeList, ThemeCard, PhaseProgressMap, TimelineEntry。テスト全件パス。",
  },
];

// TH-002: Supabase統合（v1）
const th002Logs: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-002",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-002: 現在のMarkdownファイルベースのデータストアをSupabaseに移行する計画を策定してください。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AI PM",
    direction: "response",
    message:
      "移行計画を策定しました。Phase 1: スキーマ設計（themes, theme_decisions, theme_reviews テーブル）。Phase 2: マイグレーションSQL。Phase 3: データアクセス層のリファクタリング。Phase 4: 既存データの一括移行スクリプト。RLSはSELECTをanon許可、INSERT/UPDATEはauthenticated限定。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AIPO",
    direction: "request",
    message: "テーブル設計のレビューをお願いします。正規化レベルとパフォーマンスのバランスが重要です。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "テーブル設計レビュー完了。themes → theme_decisions（1:N）→ theme_reviews（監査ログ）の3テーブル構成。ENUM型でphase/statusを制約。インデックスはtheme_id + phaseの複合インデックスを推奨。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AIPO",
    direction: "request",
    message: "Go/No-Go承認フローの設計も含めてください。オーナーレビュー機能が必要です。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "承認フロー実装完了。theme_reviewsテーブルにaction, reviewer_email, commentを記録。Server ActionsでGoNo-Go処理。AwaitingReviewBannerコンポーネントでレビュー待ち通知。Google OAuth認証。",
  },
];

// TH-003: 議論ログ・議事録のSupabase保存とUI表示
const th003Logs: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-003の議論ログ保存機能について、影響範囲を調査してください。Supabaseテーブル設計、UI表示、データアクセス層の観点で。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "新規テーブル discussion_logs が必要。カラム: id, theme_id, decision_id, agent_role, direction, message, created_at。RLSは読み取り公開、書き込みはservice_role。UIにはテーマ詳細ページに「議論」タブを追加。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message: "議論タブのUX設計について、チャット風UIかテーブル風UIかの判断をお願いします。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI PD",
    direction: "response",
    message:
      "チャット風UIを推奨。議論は対話形式であり、時系列の流れが直感的。requestとresponseで左右に分けるレイアウトが適切。長文は折りたたみ対応を推奨。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message: "実装を開始してください。TDDサイクルで進めてください。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。マイグレーション作成、データアクセス関数追加、DiscussionLogEntryコンポーネント作成。チャット風レイアウト、agent_role別色分け対応。テスト全件パス。",
  },
];

// TH-005: リアルタイム進捗Push基盤
const th005Logs: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-005",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-005: エージェントの処理進捗をリアルタイムでダッシュボードに反映する基盤を設計してください。Supabase Realtimeの活用を検討。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AI PM",
    direction: "response",
    message:
      "要件: (1) フェーズ進捗の即時反映、(2) Supabase Realtime Postgres Changes使用、(3) themes/theme_decisionsの変更サブスクライブ。ページリロード不要で最新状態確認が目的。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AIPO",
    direction: "request",
    message: "技術設計をお願いします。チャネル設計とフロントエンド統合の詳細を含めてください。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "設計完了。Supabase Realtimeでthemesテーブル変更をサブスクライブ。チャネル: 'theme-progress'。CLIスクリプト update-theme-progress.ts で進捗更新をサポート。バリデーション・テスト289件追加。",
  },
];

// TH-006: テーマ詳細ページUX改善
const th006Logs: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-006",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-006: テーマ詳細ページのUX改善について、ドッグフーディングのフィードバックを分析してください。body_htmlの長文問題とナビゲーションの不便さが報告されています。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AI PD",
    direction: "response",
    message:
      "フィードバック分析: (1) body_html長文 → 折りたたみUI（デフォルト閉じ）、(2) 戻り導線不足 → スティッキー戻るボタン追加。ユーザーは必要な情報だけ展開して確認でき、一覧遷移もワンクリックで可能に。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AIPO",
    direction: "request",
    message: "実装をお願いします。shadcn/uiのCollapsibleコンポーネントを使用してください。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。timeline-entry.tsxにCollapsible統合、body_htmlデフォルト折りたたみ。スティッキー戻るボタン追加。テスト71件追加・全パス。レスポンシブ対応確認済み。",
  },
];

const allDiscussionLogs: InsertDiscussionLogInput[] = [
  ...th001Logs,
  ...th002Logs,
  ...th003Logs,
  ...th005Logs,
  ...th006Logs,
];

async function seedDiscussionLogs(isClean: boolean) {
  console.log("\n=== Step 2: discussion_logs INSERT ===\n");

  if (isClean) {
    console.log("既存議論ログを削除...");
    const themeIds = [...new Set(allDiscussionLogs.map((d) => d.theme_id))];
    for (const themeId of themeIds) {
      const { error } = await supabase
        .from("discussion_logs")
        .delete()
        .eq("theme_id", themeId);
      if (error) {
        console.error(`  ${themeId} 削除失敗:`, error.message);
        process.exit(1);
      }
      console.log(`  ${themeId}: 削除完了`);
    }
  }

  // テーマごとにバッチINSERT
  const themeGroups = new Map<string, InsertDiscussionLogInput[]>();
  for (const item of allDiscussionLogs) {
    const existing = themeGroups.get(item.theme_id) || [];
    existing.push(item);
    themeGroups.set(item.theme_id, existing);
  }

  let totalInserted = 0;

  for (const [themeId, items] of themeGroups) {
    console.log(`${themeId}: ${items.length} 件の議論ログを投入...`);

    // バリデーション
    for (const item of items) {
      if (!item.theme_id || !item.agent_role || !item.direction || !item.message) {
        console.error(`  バリデーションエラー: ${JSON.stringify(item)}`);
        process.exit(1);
      }
    }

    const insertRows = items.map((item) => ({
      theme_id: item.theme_id,
      agent_role: item.agent_role,
      direction: item.direction,
      message: item.message,
      ...(item.decision_id ? { decision_id: item.decision_id } : {}),
    }));

    const { data, error } = await supabase
      .from("discussion_logs")
      .insert(insertRows)
      .select("id, theme_id, agent_role, direction");

    if (error) {
      console.error(`  INSERT 失敗:`, error.message);
      process.exit(1);
    }

    const count = data?.length ?? 0;
    totalInserted += count;
    console.log(`  INSERT 成功: ${count} 件`);
  }

  console.log(`\nStep 2 結果: discussion_logs=${totalInserted} 件`);
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
async function main() {
  const isClean = process.argv.includes("--clean");

  console.log("=== 統合シードスクリプト ===");
  console.log(`モード: ${isClean ? "クリーン（既存データ削除→再投入）" : "追加投入"}`);

  // Step 1: themes + theme_decisions
  await seedThemesAndDecisions();

  // Step 2: discussion_logs
  await seedDiscussionLogs(isClean);

  console.log("\n=== 全シードデータ投入完了 ===\n");
}

main().catch((err) => {
  console.error("シードスクリプトがエラーで終了しました:", err);
  process.exit(1);
});
