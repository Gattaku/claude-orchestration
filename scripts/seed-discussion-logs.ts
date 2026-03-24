/**
 * シードデータ投入: discussion_logs テーブルに全テーマの議論ログをINSERTする
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

// ---------------------------------------------------------------------------
// TH-001: AIオーケストレーション可視化ダッシュボード
// ---------------------------------------------------------------------------
const th001Data: InsertDiscussionLogInput[] = [
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
      "カード型UIを推奨します。各テーマをカードで表示し、フェーズ進捗をプログレスバーで可視化。ステータスはバッジで色分け（in-progress: 青、completed: 緑、awaiting-review: 黄）。テーマ詳細ページではタブ切り替えでタイムライン・議論・決定事項を整理します。",
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

// ---------------------------------------------------------------------------
// TH-002: Supabase統合（v1）
// ---------------------------------------------------------------------------
const th002Data: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-002",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-002: 現在のMarkdownファイルベースのデータストアをSupabaseに移行する計画を策定してください。RLSポリシーやマイグレーション戦略も含めてください。",
  },
  {
    theme_id: "TH-002",
    agent_role: "AI PM",
    direction: "response",
    message:
      "移行計画を策定しました。Phase 1: スキーマ設計（themes, theme_decisions, theme_reviews テーブル）。Phase 2: マイグレーションSQL作成。Phase 3: データアクセス層のリファクタリング（parser.ts → Supabase Client）。Phase 4: 既存Markdownデータの一括移行スクリプト作成。RLSはSELECTをanon許可、INSERT/UPDATEはauthenticated限定。",
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
      "テーブル設計レビュー完了。themes（マスター）→ theme_decisions（1:N）→ theme_reviews（監査ログ）の3テーブル構成。ENUM型でphase/statusを制約。theme_decisionsにはbody_htmlカラムを持たせ、Markdown→HTML変換済みデータを格納。インデックスはtheme_id + phaseの複合インデックスを推奨。",
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
      "Go/No-Go承認フロー実装完了。theme_reviewsテーブルにaction (approved/rejected), reviewer_email, commentを記録。Server Actionsでapprove/rejectを処理。AwaitingReviewBannerコンポーネントでレビュー待ちテーマを通知。Google OAuthでレビュアー認証。",
  },
];

// ---------------------------------------------------------------------------
// TH-003: 議論ログ・議事録のSupabase保存とUI表示
// ---------------------------------------------------------------------------
const th003Data: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-003の議論ログ保存機能について、影響範囲を調査してください。Supabaseテーブル設計、UI表示、データアクセス層の観点で報告をお願いします。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "影響範囲を調査しました。新規テーブル discussion_logs の作成が必要です。カラム: id, theme_id, decision_id, agent_role, direction, message, created_at。RLSポリシーは読み取りのみ公開、書き込みはservice_roleキーで行います。UI側はテーマ詳細ページに「議論」タブを追加します。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "議論ログ保存機能のStoryを策定してください。ユーザーが議論の経緯を時系列で追跡できることが目的です。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI PM",
    direction: "response",
    message:
      "Story 1: discussion_logsテーブルのマイグレーション作成（S）。Story 2: テーマ詳細ページに議論タブを追加（M）。Story 3: データアクセス関数の実装とテスト（M）。優先度はすべてHigh。受け入れ条件として、議論ログが時系列で表示され、エージェントロール別にフィルタ可能であること。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "AI PDの観点から、議論タブのUX設計についてレビューをお願いします。特にチャット風UIかテーブル風UIかの判断が必要です。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI PD",
    direction: "response",
    message:
      "チャット風UIを推奨します。理由: 議論は対話形式であり、時系列の流れが直感的に理解できます。requestとresponseで左右に分けるレイアウトが適切です。ただしメッセージが長文になる場合は折りたたみを検討してください。テーブル風はデータ一覧には良いですが議論の「流れ」が見えにくくなります。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "Supabaseマイグレーションの技術設計をお願いします。テーブル定義、インデックス、RLSポリシーを含めてください。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "技術設計完了。テーブル: discussion_logs (id uuid PK, theme_id text NOT NULL, decision_id uuid FK nullable, agent_role text CHECK, direction text CHECK, message text NOT NULL, created_at timestamptz DEFAULT now())。インデックス: theme_id + created_at の複合インデックス。RLS: SELECT は anon/authenticated に許可、INSERT/UPDATE/DELETE は service_role のみ。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message: "Story 1〜3の実装を開始してください。TDDサイクルで進めてください。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。マイグレーション 20260323000002_discussion_logs.sql を作成。src/lib/data/themes.ts に getDiscussionLogsByThemeId、toDiscussionLog を追加。UIコンポーネント DiscussionLogEntry を新規作成し、チャット風レイアウトで議論を表示。テスト全件パス。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AIPO",
    direction: "request",
    message:
      "受け入れ条件を検証します。議論ログの表示、時系列順、エージェントロール表示を確認してください。",
  },
  {
    theme_id: "TH-003",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "全受け入れ条件を検証完了。議論ログが時系列で正しく表示されること確認。agent_roleごとのアイコン・色分けが正しく動作。requestは左寄せ、responseは右寄せで表示。ローカル環境・Vercelプレビューともに動作確認済み。",
  },
];

// ---------------------------------------------------------------------------
// TH-005: リアルタイム進捗Push基盤
// ---------------------------------------------------------------------------
const th005Data: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-005",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-005: エージェントの処理進捗をリアルタイムでダッシュボードに反映する基盤を設計してください。Supabase Realtimeの活用を検討してください。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AI PM",
    direction: "response",
    message:
      "リアルタイム進捗Push基盤の要件: (1) エージェントがフェーズ進捗を更新するとダッシュボードに即座に反映、(2) Supabase RealtimeのPostgres Changes機能を使用、(3) themes/theme_decisionsテーブルの変更をサブスクライブ。ユーザーがページをリロードせずに最新状態を確認できることが目的。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AIPO",
    direction: "request",
    message: "技術設計をお願いします。Supabase Realtimeのチャネル設計とフロントエンド統合の詳細を含めてください。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "技術設計: Supabase Realtimeでthemesテーブルの変更をサブスクライブ。チャネル: 'theme-progress'。イベント: UPDATE on themes (current_phase, current_status変更時)。フロントエンド: useEffectでサブスクリプション管理、stateを更新して再レンダリング。scripts/update-theme-progress.ts でCLIからの進捗更新をサポート。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AIPO",
    direction: "request",
    message: "実装とデリバリーを進めてください。CLIスクリプトからの動作確認も含めてください。",
  },
  {
    theme_id: "TH-005",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装・デリバリー完了。update-theme-progress.ts スクリプトを作成し、CLIからテーマのphase/statusを更新可能に。バリデーション付き（TH-NNN形式、有効なphase/status値のチェック）。テスト289件追加、全パス。Supabase Realtime経由でダッシュボードへの即座反映を確認。",
  },
];

// ---------------------------------------------------------------------------
// TH-006: テーマ詳細ページUX改善（折りたたみ+戻るボタン）
// ---------------------------------------------------------------------------
const th006Data: InsertDiscussionLogInput[] = [
  {
    theme_id: "TH-006",
    agent_role: "AIPO",
    direction: "request",
    message:
      "TH-006: テーマ詳細ページのUX改善について、ドッグフーディングのフィードバックを分析してください。body_htmlが長すぎる問題と、ページ間のナビゲーションの不便さが報告されています。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AI PD",
    direction: "response",
    message:
      "フィードバック分析結果: (1) body_htmlの長文コンテンツがページを圧迫 → 折りたたみUI（デフォルト閉じ）を提案、(2) テーマ詳細からテーマ一覧への戻り導線がブラウザバックのみ → スティッキーな「戻る」ボタンを追加。これにより、ユーザーは必要な情報だけを展開して確認でき、一覧への遷移もワンクリックで可能になります。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AIPO",
    direction: "request",
    message: "実装をお願いします。折りたたみにはshadcn/uiのCollapsibleコンポーネントを使用してください。",
  },
  {
    theme_id: "TH-006",
    agent_role: "AI Dev",
    direction: "response",
    message:
      "実装完了。timeline-entry.tsxにCollapsibleコンポーネントを統合し、body_htmlをデフォルト折りたたみに。「詳細を表示/非表示」トグルボタンを追加。テーマ詳細ページにスティッキー戻るボタン（← テーマ一覧）を追加。テスト71件追加・全パス。レスポンシブ対応も確認済み。",
  },
];

// ---------------------------------------------------------------------------
// 全テーマの統合データ
// ---------------------------------------------------------------------------
const allSeedData: InsertDiscussionLogInput[] = [
  ...th001Data,
  ...th002Data,
  ...th003Data,
  ...th005Data,
  ...th006Data,
];

async function main() {
  const isClean = process.argv.includes("--clean");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    console.error(
      "Supabase環境変数が未設定です (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    );
    process.exit(1);
  }

  if (isClean) {
    console.log("--clean: 全テーマの既存議論ログを削除します...");
    const themeIds = [...new Set(allSeedData.map((d) => d.theme_id))];
    for (const themeId of themeIds) {
      const { error } = await supabase
        .from("discussion_logs")
        .delete()
        .eq("theme_id", themeId);
      if (error) {
        console.error(`  ${themeId} 削除失敗:`, error.message);
        process.exit(1);
      }
      console.log(`  ${themeId}: 既存データ削除完了`);
    }
  }

  // テーマごとにバッチINSERT
  const themeGroups = new Map<string, InsertDiscussionLogInput[]>();
  for (const item of allSeedData) {
    const existing = themeGroups.get(item.theme_id) || [];
    existing.push(item);
    themeGroups.set(item.theme_id, existing);
  }

  let totalInserted = 0;

  for (const [themeId, items] of themeGroups) {
    console.log(`\n${themeId}: ${items.length} 件の議論ログを投入...`);
    try {
      const results = await insertDiscussionLogBatch(items);
      totalInserted += results.length;
      console.log(`  INSERT 成功: ${results.length} 件`);
      for (const log of results) {
        console.log(
          `  [${log.agent_role}] ${log.direction}: ${log.message.slice(0, 50)}...`,
        );
      }
    } catch (err) {
      console.error(
        `  INSERT 失敗:`,
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }
  }

  console.log(`\n=== 完了: 全 ${totalInserted} 件の議論ログを投入しました ===`);
}

main();
