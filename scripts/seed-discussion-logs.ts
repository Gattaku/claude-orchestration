/**
 * シードデータ投入: discussion_logs テーブルにサンプル議論ログをINSERTする
 *
 * 使い方:
 *   npx tsx scripts/seed-discussion-logs.ts
 *   npx tsx scripts/seed-discussion-logs.ts --clean   # 既存データを削除してから投入
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定済み
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env
import {
  createServiceRoleClient,
  insertDiscussionLogBatch,
} from "../src/lib/data/themes";
import type { InsertDiscussionLogInput } from "../src/lib/data/themes";

const SEED_THEME_ID = "TH-003";

const seedData: InsertDiscussionLogInput[] = [
  // Phase 0: トリアージ
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-003の議論ログ保存機能について、影響範囲を調査してください。Supabaseテーブル設計、UI表示、データアクセス層の観点で報告をお願いします。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI Dev",
    direction: "response",
    message:
      "影響範囲を調査しました。新規テーブル discussion_logs の作成が必要です。カラム: id, theme_id, decision_id, agent_role, direction, message, created_at。RLSポリシーは読み取りのみ公開、書き込みはservice_roleキーで行います。UI側はテーマ詳細ページに「議論」タブを追加します。",
  },

  // Phase 3: Story策定
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message:
      "議論ログ保存機能のStoryを策定してください。ユーザーが議論の経緯を時系列で追跡できることが目的です。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI PM",
    direction: "response",
    message:
      "Story 1: discussion_logsテーブルのマイグレーション作成（S）。Story 2: テーマ詳細ページに議論タブを追加（M）。Story 3: データアクセス関数の実装とテスト（M）。優先度はすべてHigh。受け入れ条件として、議論ログが時系列で表示され、エージェントロール別にフィルタ可能であること。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message:
      "AI PDの観点から、議論タブのUX設計についてレビューをお願いします。特にチャット風UIかテーブル風UIかの判断が必要です。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI PD",
    direction: "response",
    message:
      "チャット風UIを推奨します。理由: 議論は対話形式であり、時系列の流れが直感的に理解できます。requestとresponseで左右に分けるレイアウトが適切です。ただしメッセージが長文になる場合は折りたたみを検討してください。テーブル風はデータ一覧には良いですが議論の「流れ」が見えにくくなります。",
  },

  // Phase 4: 技術設計
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message:
      "Supabaseマイグレーションの技術設計をお願いします。テーブル定義、インデックス、RLSポリシーを含めてください。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI Dev",
    direction: "response",
    message:
      "技術設計完了。テーブル: discussion_logs (id uuid PK, theme_id text NOT NULL, decision_id uuid FK nullable, agent_role text CHECK, direction text CHECK, message text NOT NULL, created_at timestamptz DEFAULT now())。インデックス: theme_id + created_at の複合インデックス。RLS: SELECT は anon/authenticated に許可、INSERT/UPDATE/DELETE は service_role のみ。",
  },

  // Phase 5: 実装
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message: "Story 1〜3の実装を開始してください。TDDサイクルで進めてください。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。マイグレーション 20250322000003_create_discussion_logs.sql を作成。src/lib/data/themes.ts に getDiscussionLogsByThemeId、toDiscussionLog を追加。UIコンポーネント DiscussionPanel.tsx を新規作成し、チャット風レイアウトで議論を表示。テスト8件すべてパス。",
  },

  // Phase 6: デリバリー
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AIPO",
    direction: "request",
    message:
      "受け入れ条件を検証します。議論ログの表示、時系列順、エージェントロール表示を確認してください。",
  },
  {
    theme_id: SEED_THEME_ID,
    agent_role: "AI Dev",
    direction: "response",
    message:
      "全受け入れ条件を検証完了。議論ログが時系列で正しく表示されること確認。agent_roleごとのアイコン・色分けが正しく動作。requestは左寄せ、responseは右寄せで表示。ローカル環境・Vercelプレビューともに動作確認済み。",
  },
];

async function main() {
  const isClean = process.argv.includes("--clean");

  if (isClean) {
    console.log(`--clean: ${SEED_THEME_ID} の既存議論ログを削除します...`);
    const supabase = createServiceRoleClient();
    if (!supabase) {
      console.error(
        "Supabase環境変数が未設定です (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
      );
      process.exit(1);
    }
    const { error } = await supabase
      .from("discussion_logs")
      .delete()
      .eq("theme_id", SEED_THEME_ID);
    if (error) {
      console.error("削除失敗:", error.message);
      process.exit(1);
    }
    console.log("既存データ削除完了");
  }

  console.log(`${seedData.length} 件の議論ログを投入します...`);

  try {
    const results = await insertDiscussionLogBatch(seedData);
    console.log(`INSERT 成功: ${results.length} 件`);
    for (const log of results) {
      console.log(
        `  [${log.agent_role}] ${log.direction}: ${log.message.slice(0, 60)}...`,
      );
    }
  } catch (err) {
    console.error(
      "INSERT 失敗:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }
}

main();
