# Supabase セットアップ・運用ガイド

## 環境変数

| 変数名 | 公開範囲 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ブラウザ + サーバー | Supabase APIエンドポイント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ブラウザ + サーバー | 公開用キー（RLSで保護されるため安全） |
| `SUPABASE_SERVICE_ROLE_KEY` | **サーバーのみ** | RLSバイパス用。移行スクリプトで使用 |
| `NEXT_PUBLIC_SITE_URL` | ブラウザ + サーバー | OAuthコールバックURL |

- `NEXT_PUBLIC_` プレフィックス付き = ブラウザに露出OK（Supabase公式推奨）
- `SUPABASE_SERVICE_ROLE_KEY` は絶対に `NEXT_PUBLIC_` を付けない

## Supabase CLI セットアップ

### 初回のみ

```bash
# 1. ログイン（ブラウザが開き、アクセストークンを取得）
npx supabase login

# 2. プロジェクト初期化（config.toml を生成。既存の migrations/ はそのまま維持）
npx supabase init

# 3. リモートプロジェクトとリンク
npx supabase link --project-ref <project-ref>
```

`project-ref` は `NEXT_PUBLIC_SUPABASE_URL` のサブドメイン部分。
例: `https://imbvmibkcwqrsokfrebb.supabase.co` → `imbvmibkcwqrsokfrebb`

### マイグレーション実行

```bash
# ローカルの supabase/migrations/ をリモートDBに適用
npx supabase db push
```

### 新しいマイグレーションの作成

```bash
# 空のマイグレーションファイルを生成
npx supabase migration new <migration_name>
# → supabase/migrations/<timestamp>_<migration_name>.sql が作成される

# SQLを記述した後、リモートに適用
npx supabase db push
```

## データ移行（md → PostgreSQL）

既存の `docs/decisions/` のMarkdownファイルをSupabaseに移行するワンショットスクリプト。

### 前提

- `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が設定済み
- マイグレーションが適用済み（テーブルが存在する）

### 実行

```bash
npx tsx -r tsconfig-paths/register scripts/migrate-md-to-supabase.ts
```

- UPSERT方式のため再実行しても重複しない（冪等性あり）
- 実行結果のサマリーがコンソールに出力される

## Google OAuth 設定

### Supabase Dashboard 側

1. **Authentication > Providers > Google** を有効化
2. Google Cloud Console で取得した Client ID / Client Secret を入力
3. **Authentication > URL Configuration** で以下を設定:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs:
     - `https://your-domain.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`（開発用）

### Google Cloud Console 側

1. OAuth 2.0 クライアントIDを作成
2. 承認済みリダイレクト URI に以下を追加:
   - `https://<project-ref>.supabase.co/auth/v1/callback`

## RLSポリシー概要

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `themes` | 全員 | 認証済みのみ | 認証済みのみ | - |
| `theme_decisions` | 全員 | 認証済みのみ | 認証済みのみ | - |
| `theme_reviews` | 全員 | 認証済みのみ | - | - |

- 未認証（anon）でも閲覧は可能
- 書き込み操作はログイン済みユーザーのみ
- `theme_reviews` はINSERTのみ（監査ログとして追記専用）

## マイグレーションファイル一覧

| ファイル | 内容 |
|---|---|
| `20260323000000_initial_schema.sql` | テーブル・ENUM・トリガー定義 |
| `20260323000001_rls_policies.sql` | RLSポリシー・権限付与 |
