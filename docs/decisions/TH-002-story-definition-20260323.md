---
theme_id: "TH-002"
title: "Supabase統合（v1）"
phase: "story-definition"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 4（技術設計）へ進む。Wave 1（S-101 → S-102 → S-103）から着手"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI PM"
tags:
  - "v1"
  - "supabase"
  - "auth"
---

# Phase 3: Story策定 — Supabase統合（v1）

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI PM

---

## 決定事項: v1 Story一覧（最終版）

### S-101: Supabaseクライアント設定と環境変数

**タイトル:** 人間オーナーとして、Supabaseプロジェクトとの接続が設定されていてほしい。なぜならv1の全機能がSupabaseに依存するからだ。

**スコープ:** `@supabase/supabase-js` と `@supabase/ssr` の導入。ブラウザ用・Server Component用・Server Action用の3クライアント初期化。環境変数テンプレート。

**受け入れ条件:**
- [ ] `@supabase/supabase-js` と `@supabase/ssr` がインストールされている
- [ ] ブラウザ用クライアント（`src/lib/supabase/client.ts`）が作成されている
- [ ] Server Component用クライアント（`src/lib/supabase/server.ts`）が作成され、`cookies()` を使用してセッションを管理する
- [ ] Server Action / Route Handler用クライアントが作成されている
- [ ] `.env.local.example` に以下の環境変数が記載されている:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 環境変数が未設定の場合、アプリ起動時にわかりやすいエラーメッセージが表示される
- [ ] 既存のテストが引き続きパスする

**優先度:** Must
**見積もり:** S
**依存関係:** なし

---

### S-102: DBスキーマとマイグレーションSQL

**タイトル:** 人間オーナーとして、テーマと決定記録のデータがPostgreSQLに格納されてほしい。なぜならmdファイルパースへの依存を脱却し、Go/No-Go操作結果を永続化する基盤が必要だからだ。

**スコープ:** Supabase PostgreSQLのテーブル設計。マイグレーションSQL。既存の `Theme`, `ThemeDecision` 型との整合。

**受け入れ条件:**
- [ ] 以下のテーブルがマイグレーションSQLで定義されている:
  - `themes`: theme_id (PK), title, current_phase, current_status, source, created_at, updated_at, next_action, awaiting_review
  - `theme_decisions`: id (PK), theme_id (FK), title, phase, status, source, created_at, updated_at, next_action, awaiting_review, participants (text[]), tags (text[]), body_html (text)
  - `theme_reviews`: id (PK), theme_id (FK), decision_id (FK nullable), action (enum: 'approved', 'rejected'), reviewer_email (text), comment (text nullable), created_at
- [ ] マイグレーションSQLファイルが `supabase/migrations/` ディレクトリに配置されている
- [ ] Phase enum と Status enum がPostgreSQLのCHECK制約またはenum型で定義されている
- [ ] `theme_reviews` テーブルのRLSポリシー: 認証済みユーザーのみINSERT可能、SELECTは全員可能
- [ ] `themes`, `theme_decisions` テーブルのRLSポリシー: SELECTは全員可能、UPDATE/INSERTは認証済みユーザーのみ
- [ ] 既存の `Theme`, `ThemeDecision` TypeScript型と1:1で対応する列構成になっている

**優先度:** Must
**見積もり:** M
**依存関係:** S-101

---

### S-103: データ移行スクリプト（md → PostgreSQL）

**タイトル:** 人間オーナーとして、v0で蓄積したmdファイルのデータがDBに移行されてほしい。なぜなら既存の判断経緯を失いたくないからだ。

**スコープ:** 既存のmdパーサーを使って `docs/decisions/` のデータを読み取り、Supabase PostgreSQLにINSERTするワンショットスクリプト。

**受け入れ条件:**
- [ ] `scripts/migrate-md-to-supabase.ts` が作成されている
- [ ] 既存の `parser.ts` を使用してmdファイルをパースし、`themes` と `theme_decisions` テーブルにINSERTする
- [ ] 移行前後のデータ件数を検証するチェックが含まれている（テーマ数、決定記録数の一致確認）
- [ ] `body_html` がMarkdownからHTMLに変換された状態で格納される
- [ ] 冪等性がある（再実行しても重複レコードが生まれない。UPSERT使用）
- [ ] 移行結果がコンソールにサマリー出力される（OK: N件, Skip: N件, Error: N件）
- [ ] `theme-registry.md` は移行対象から除外される

**優先度:** Must
**見積もり:** M
**依存関係:** S-101, S-102

---

### S-104: SSG → ISR移行

**タイトル:** 人間オーナーとして、データ更新がビルドなしでダッシュボードに反映されてほしい。なぜなら毎回ビルドを待つのでは「動いている証拠」の原則が損なわれるからだ。

**スコープ:** `next.config.ts` の `output: "export"` 削除。各ページの `revalidate` 設定。`themes.ts` ファサードの内部をSupabaseクエリに差し替え。

**受け入れ条件:**
- [ ] `next.config.ts` から `output: "export"` が削除されている
- [ ] `/` ページに `revalidate = 60`（60秒）が設定されている
- [ ] `/themes/[themeId]` ページに `revalidate = 60` が設定されている
- [ ] `themes.ts` の `getAllThemes`, `getThemeById`, `getAwaitingReviewThemes` がSupabaseクエリを使用するように書き換えられている
- [ ] ファサードの戻り値の型（`ThemeOrError[]`, `Theme | null`, `Theme[]`）が変更されていない
- [ ] 既存のUIコンポーネント（ThemeCard, ThemeList, PhaseProgressBar, PhaseProgressMap, TimelineEntry等）が無変更で動作する
- [ ] Vercelにデプロイしてページが正常に表示される
- [ ] `generateStaticParams` が `themes` テーブルからtheme_idを取得するように変更されている

**優先度:** Must
**見積もり:** M
**依存関係:** S-101, S-102, S-103

---

### S-105: 認証 — Supabase Auth + Google OIDC

**タイトル:** 人間オーナーとして、Googleアカウントでログインしてダッシュボードの操作権限を得たい。なぜならGo/No-Go操作を権限のない人に実行されたくないからだ。

**スコープ:** Supabase Auth設定。Google OIDCプロバイダー1つ。ログインページ。認証ミドルウェア。ログイン/ログアウトUI。

**受け入れ条件:**
- [ ] `.env.local.example` に以下が追記されている:
  - `NEXT_PUBLIC_SITE_URL`（OAuthコールバック用）
- [ ] `/login` ページが存在し、「Googleでログイン」ボタンが表示される
- [ ] Googleアカウントで認証が完了し、ダッシュボードにリダイレクトされる
- [ ] `/api/auth/callback` ルートが存在し、OAuthコールバックを処理する
- [ ] `src/middleware.ts` が存在し、セッションのリフレッシュを行う
- [ ] 未認証ユーザーも閲覧（`/` と `/themes/[themeId]`）は可能（閲覧は認証不要）
- [ ] AppHeaderにログイン状態が表示される（未認証: 「ログイン」リンク、認証済み: ユーザー名 + 「ログアウト」）
- [ ] ログアウト時にセッションが破棄され、ログインページにリダイレクトされる

**優先度:** Must
**見積もり:** M
**依存関係:** S-101

---

### S-106: Go/No-Go操作（承認/差し戻し）

**タイトル:** 人間オーナーとして、判断待ちテーマに対してダッシュボード上で承認または差し戻しを行いたい。なぜなら判断をダッシュボード外で伝える手間をなくしたいからだ。

**スコープ:** `awaiting-review` テーマに表示される承認/差し戻しボタン。Server Actions。`theme_reviews` テーブルへの記録。テーマステータスの更新。

**受け入れ条件:**
- [ ] `awaiting-review` ステータスのテーマ詳細画面に、「承認（Go）」と「差し戻し（No-Go）」の2つのボタンが表示される
- [ ] 未認証ユーザーにはボタンが表示されない
- [ ] 「承認」クリック時:
  - Server Actionが実行され、`theme_reviews` テーブルにaction='approved'のレコードがINSERTされる
  - テーマのstatusが `in-progress` に更新される
  - `revalidatePath` でページキャッシュが無効化される
  - 操作完了後、画面が最新状態に更新される
- [ ] 「差し戻し」クリック時:
  - 差し戻しコメント入力欄が表示される（任意入力）
  - Server Actionが実行され、`theme_reviews` テーブルにaction='rejected'のレコードがINSERTされる
  - テーマのstatusが `in-progress` に更新される（差し戻し後もAIチームが再検討するためin-progress）
  - `revalidatePath` でページキャッシュが無効化される
- [ ] 操作中はボタンが無効化され、ローディング状態が表示される
- [ ] 判断待ちバナー（オーバービュー画面）にもGo/No-Goボタンが表示される（認証済みの場合のみ）
- [ ] 操作後、判断待ちバナーからそのテーマが消える

**優先度:** Must
**見積もり:** L
**依存関係:** S-102, S-104, S-105

---

### S-107: 判断ポイントタブ（S-008のv1実装）

**タイトル:** 人間オーナーとして、テーマの中で「判断ポイント」だけを抽出して確認したい。なぜなら全文を読む時間がなくても重要な判断は見落としたくないからだ。

**スコープ:** テーマ詳細画面の判断ポイントタブ。`body_html` から決定事項・却下案・リスクを抽出。v0のS-008仕様を継承。

**受け入れ条件:**
- [ ] 「判断ポイント」タブ選択時、全フェーズ横断で以下を抽出・表示:
  - 決定事項（`## 決定事項` セクション）→ 採用バッジ（緑）
  - 却下した案（`## 却下した案とその理由` セクション）→ 却下バッジ（グレー）
  - リスク（`## リスク・不確実性` セクション）→ リスクバッジ（琥珀）
- [ ] 各項目にフェーズラベルが付与される
- [ ] `awaiting_review` が空でないファイルがある場合、レビュー依頼内容が最上部にハイライト
- [ ] セクション抽出に失敗した場合: EmptyState「この記録から判断ポイントを自動抽出できませんでした。タイムラインタブで全文をご確認ください。」を表示
- [ ] 抽出対象はDB内の `body_html` フィールド（HTMLパースによる抽出）

**優先度:** Should
**見積もり:** M
**依存関係:** S-104

---

## 実装順序

### Wave 1: Supabase基盤 + データ移行（目標: 3-4日）

```
S-101（Supabaseクライアント設定）
  │
  v
S-102（DBスキーマ + マイグレーションSQL）
  │
  v
S-103（データ移行スクリプト）
```

Wave 1完了時の状態: mdファイルのデータがPostgreSQLに格納されている。ただしUIはまだmdパーサーを参照。

### Wave 2: ISR移行 + ファサード差し替え（目標: 2-3日）

```
S-104（SSG → ISR移行 + ファサード差し替え）
```

Wave 2完了時の状態: ダッシュボードがSupabaseからデータを取得し、ISRで動作。既存UIは無変更で動作。**ここが最初のデモ可能ポイント。**

### Wave 3: 認証 + Go/No-Go操作（目標: 3-5日）

```
S-105（認証: Google OIDC）
  │
  v
S-106（Go/No-Go操作）
```

Wave 3完了時の状態: v1の中核価値が実現。オーナーがダッシュボード上で判断を完結できる。**Must Story全完了。**

### Wave 4: 判断ポイント抽出（時間が許せば）

```
S-107（判断ポイントタブ）
```

### クリティカルパス

```
S-101 → S-102 → S-103 → S-104 → S-105 → S-106
```

**Must完了までの見積もり: 約8-12日**（2-4週間の想定期間内）

---

## スコープライン

### v1に含める（Must 6件）

| ID | 内容 | 見積もり | 理由 |
|---|---|---|---|
| S-101 | Supabaseクライアント設定 | S | 全機能の基盤 |
| S-102 | DBスキーマ + マイグレーションSQL | M | データモデルの永続化 |
| S-103 | データ移行スクリプト | M | 既存データの保全 |
| S-104 | SSG → ISR移行 | M | 動的データ取得の実現 |
| S-105 | 認証（Google OIDC） | M | Go/No-Go操作のアクセス制御 |
| S-106 | Go/No-Go操作 | L | v1の中核価値 |

### v1に条件付きで含める（Should 1件）

| ID | 内容 | 見積もり | 条件 |
|---|---|---|---|
| S-107 | 判断ポイントタブ | M | Must完了後に時間があれば。ドッグフーディングで「全文が辛い」なら優先度を上げる |

### v2以降に回す

| 機能 | 理由 |
|---|---|
| Realtime（WebSocket購読） | ISR + revalidateで十分 |
| フィルタ/ソート | テーマ数が少ない |
| 操作履歴の詳細UI | DB記録はv1で行うが、表示UIはv2 |
| 複数ユーザーのロール管理 | オーナー1人の運用 |
| Slack通知 | v2スコープ |
| GitHub連携 | v2スコープ |

---

## 依存関係図

```
S-101 (Supabaseクライアント)
  ├── S-102 (DBスキーマ)
  │     └── S-103 (データ移行)
  │           └── S-104 (ISR移行 + ファサード差し替え)
  │                 └── S-106 (Go/No-Go操作)
  │                 └── S-107 (判断ポイントタブ) [Should]
  └── S-105 (認証)
        └── S-106 (Go/No-Go操作)
```

S-106がS-104とS-105の両方に依存する合流点。Wave 2とWave 3前半を並行実施できれば、全体期間を短縮可能。

---

## スコープクリープ防止チェック（v1版）

1. Go/No-Go判断がダッシュボード上で完結するために必要か？ → Noならv2
2. オーナー1人の運用で本当に必要か？ → Noならv2
3. mdファイル → DB移行の最小構成に含まれるか？ → Noなら後回し
4. ISRで十分か、Realtimeが必要か？ → Realtimeが必要ならv2

---

## リスク・不確実性

1. **SSG→ISR移行でVercelのランタイム変更**: `output: "export"` 削除でServerless Functionsに移行。ビルド・デプロイフローが変わる。対策: Wave 2で早期に移行を完了し検証。
2. **Next.js 15 async cookiesとSupabase Auth SSR**: `cookies()` がasyncになったことで、`@supabase/ssr` のクライアント初期化に注意が必要。対策: 公式ドキュメントの最新サンプルに従う。
3. **ファサード差し替えの型整合性**: `themes.ts` の内部実装をSupabaseクエリに差し替える際、戻り値の型が微妙に変わるリスク。対策: 既存のテストを先に通してからUI確認。
4. **Go/No-Go操作後のUI更新**: Server Action実行後に `revalidatePath` で即座に反映されるか。対策: 楽観的更新は v1 では実装せず、`revalidatePath` による確実な更新を優先。
5. **データ移行の完全性**: mdパーサーの出力とDB格納データの一致。対策: 移行スクリプトに件数検証チェックを組み込む。

---

## 次のアクション

### Phase 4: 技術設計
1. AI Devに技術設計を依頼（Supabase DBスキーマ詳細、認証フロー、ISR設計、Server Actions設計）
2. Wave 1から実装着手（S-101 → S-102 → S-103）
3. Wave 2完了時点でデモ（Supabaseからのデータ取得確認）
4. Wave 3でMust完了（認証 + Go/No-Go操作）
