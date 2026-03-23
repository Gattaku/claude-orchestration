---
theme_id: "TH-002"
title: "Supabase統合（v1）"
phase: "implementation"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-24"
next_action: "Phase 6（デリバリー）へ進む。受け入れ条件の検証とマージ提案"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
tags:
  - "v1"
  - "supabase"
  - "auth"
---

# Phase 5: 実装 — Supabase統合（v1）

## 日付
2026-03-24

## 議論の参加者
- AIPO, AI Dev

---

## 実装サマリー

### Wave 1: Supabase基盤（S-101 → S-102 → S-103）

#### S-101: Supabaseクライアント設定 ✅
- `@supabase/supabase-js` v2 + `@supabase/ssr` v0.9 をインストール
- 3種類のクライアント初期化パターンを実装:
  - `src/lib/supabase/client.ts` — ブラウザ用（`createBrowserClient`）
  - `src/lib/supabase/server.ts` — Server Component/Action用（`createServerClient` + `await cookies()`）
  - `src/lib/supabase/static.ts` — ビルド時用（`createClient`、env未設定時はnull返却）
- `src/lib/supabase/middleware.ts` — セッションリフレッシュヘルパー
- `.env.local.example` に環境変数テンプレート作成

#### S-102: DBスキーマ + マイグレーションSQL ✅
- `supabase/migrations/20260323000000_initial_schema.sql` — テーブル・ENUM・トリガー
- `supabase/migrations/20260323000001_rls_policies.sql` — RLSポリシー・権限付与
- PostgreSQL ENUM型使用（phase_enum, status_enum, review_action_enum）
- theme_reviews テーブル追加（Go/No-Go操作履歴）

#### S-103: データ移行スクリプト ✅
- `scripts/migrate-md-to-supabase.ts` — UPSERT方式で冪等性確保
- 既存のparserを使用してmdファイルをパース → Supabaseに格納
- サマリー出力（OK/Skip/Error件数）

### Wave 2: ISR移行（S-104）

#### S-104: SSG → ISR移行 ✅
- `next.config.ts` から `output: "export"` 削除
- `revalidate = 60` を `/` と `/themes/[themeId]` に設定
- `src/lib/data/themes.ts` ファサード内部をSupabaseクエリに差し替え
- `generateStaticParams` を `createStaticSupabaseClient` 経由に変更
- `dynamicParams = true` に設定
- 既存UIコンポーネント無変更で動作

### Wave 3: 認証 + Go/No-Go操作（S-105 → S-106）

#### S-105: 認証（Supabase Auth + Google OIDC）✅
- `src/app/login/page.tsx` — ログインページ（認証済みなら `/` リダイレクト）
- `src/components/login-form.tsx` — Googleログインボタン（Client Component）
- `src/app/auth/callback/route.ts` — OAuthコールバック（PKCE）
- `src/components/logout-button.tsx` — ログアウト + リダイレクト
- `src/components/app-header.tsx` — async Server Componentに変更、認証状態表示（email + ログアウト or ログインリンク）
- `src/middleware.ts` — セッションリフレッシュ（全リクエスト）

#### S-106: Go/No-Go操作 ✅
- `src/app/actions/review.ts` — Server Actions
  - `approveTheme`: 認証チェック → ステータス検証 → theme_reviews INSERT → themes UPDATE → revalidatePath
  - `rejectTheme`: 同上 + optional comment（max 1000文字）
  - Result型パターン（例外throwしない）
- `src/components/review-actions.tsx` — Client Component
  - 「承認（Go）」ボタン（緑）+ 「差し戻し（No-Go）」ボタン（赤系）
  - 差し戻し時: textarea展開（コメント任意入力）
  - 操作中: ボタン無効化 + ローディング表示
  - 成功後: `router.refresh()` でページ再取得
  - 未認証ユーザーには非表示（`isAuthenticated` prop）
- `src/app/themes/[themeId]/page.tsx` — ReviewActions統合（awaiting-review + 認証済み時のみ表示）
- `src/app/page.tsx` — 認証状態を取得しAwaitingReviewBannerに渡す
- `src/components/awaiting-review-banner.tsx` — 認証済み時にテーマ詳細リンク追加
- `src/lib/data/types.ts` — `ReviewAction`, `ThemeReview` 型追加

---

## テスト結果

- **合計: 98テスト 全パス（0失敗）**
- 既存テスト: 89件（破壊なし）
- 新規テスト: 9件
  - `__tests__/actions/review.test.ts`: 7件（approveTheme/rejectTheme）
  - `__tests__/components/app-header.test.tsx`: 2件追加（認証状態表示）

---

## 技術的判断

### 判断1: AppHeaderをasync Server Componentに変更
- **決定**: 認証状態をサーバーサイドで取得し、SSR時点でログイン/ログアウト表示を切り替え
- **理由**: Client Componentでの状態管理よりシンプル。SEO・パフォーマンスにも有利

### 判断2: ReviewActionsの認証制御方式
- **決定**: 親のServer Componentで `getUser()` → `isAuthenticated` propとして渡す
- **理由**: Client Componentから直接Supabase Auth呼ぶより安全。サーバーサイドで確実に検証

### 判断3: 楽観的更新の不採用（設計どおり）
- **決定**: `revalidatePath` + `router.refresh()` による確実な更新
- **理由**: v1はオーナー1人運用。UX改善はv2で検討

---

## S-107（判断ポイントタブ）について

- **判定**: v1ではスキップ
- **理由**: Must Story（S-101〜S-106）全完了。S-107はShould優先度であり、ドッグフーディング結果を見てv2で判断する

---

## 受け入れ条件チェック（概要）

### S-101 ✅
- [x] `@supabase/supabase-js` と `@supabase/ssr` がインストール
- [x] ブラウザ用・Server用・ビルド時用クライアント作成
- [x] `.env.local.example` に環境変数記載
- [x] 既存テストパス

### S-102 ✅
- [x] themes, theme_decisions, theme_reviews テーブル定義
- [x] Phase/Status ENUM定義
- [x] RLSポリシー設定

### S-103 ✅
- [x] `scripts/migrate-md-to-supabase.ts` 作成
- [x] UPSERT使用で冪等性確保
- [x] サマリー出力

### S-104 ✅
- [x] `output: "export"` 削除
- [x] `revalidate = 60` 設定
- [x] ファサード内部をSupabaseクエリに差し替え
- [x] 既存UIコンポーネント無変更

### S-105 ✅
- [x] `/login` ページ作成
- [x] `/auth/callback` ルート作成
- [x] `middleware.ts` でセッションリフレッシュ
- [x] AppHeaderにログイン状態表示
- [x] 未認証ユーザーも閲覧可能

### S-106 ✅
- [x] 「承認（Go）」「差し戻し（No-Go）」ボタン表示
- [x] 未認証ユーザーにはボタン非表示
- [x] Server Action実行後にrevalidatePath
- [x] 操作中ローディング状態

---

## 次のアクション

Phase 6（デリバリー）へ進む:
1. 全受け入れ条件の最終検証
2. デプロイ可否判定
3. mainへのマージ提案
