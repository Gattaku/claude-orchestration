---
theme_id: "TH-002"
title: "Supabase統合（v1）"
phase: "technical-design"
status: "completed"
source: "owner-request"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Phase 5（実装）へ進む。Wave 1（S-101 → S-102 → S-103）から着手"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI Dev"
tags:
  - "v1"
  - "supabase"
---

# Phase 4: 技術設計 — Supabase統合（v1）

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI Dev

---

## 技術設計: Supabase統合（v1）

### 技術スタック

| カテゴリ | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| データベース | Supabase PostgreSQL | - | プロジェクト既存。認証・RLS・REST APIが統合済み |
| クライアントSDK | `@supabase/supabase-js` | v2 | 公式推奨。型安全なクエリビルダー |
| SSRヘルパー | `@supabase/ssr` | latest | Next.js App Router対応のcookieベースセッション管理 |
| 認証 | Supabase Auth + Google OIDC | - | PKCEフロー。オーナー1人運用に十分 |
| フレームワーク | Next.js 15 App Router | ^15.5 | 既存。ISR + Server Actions対応 |
| デプロイ | Vercel | - | 既存。ISRネイティブサポート |

### 追加パッケージ

```
npm install @supabase/supabase-js @supabase/ssr
```

Supabase CLIはローカルマイグレーション管理に使用（開発依存）:

```
npm install -D supabase
```

---

## 1. DBスキーマ設計

### 1.1 ER図（テキスト）

```
themes (1) ----< (N) theme_decisions
  |
  +----< (N) theme_reviews
                    |
                    +----> (0..1) theme_decisions (nullable FK)
```

### 1.2 型定義との対応マッピング

| TypeScript型 | DBテーブル | 備考 |
|---|---|---|
| `Theme` | `themes` | `decisions`, `phases` はJOINで構築 |
| `ThemeDecision` | `theme_decisions` | 1:1対応 |
| `PhaseInfo` | `theme_decisions` から導出 | `DISTINCT ON (theme_id, phase)` で最新を取得 |
| - | `theme_reviews` | 新規。Go/No-Go操作の履歴 |

### 1.3 CREATE TABLE文

```sql
-- ============================================================
-- Supabase統合 v1: DBスキーマ
-- ファイル: supabase/migrations/20260323000000_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- ENUM型
-- ------------------------------------------------------------
CREATE TYPE phase_enum AS ENUM (
  'triage',
  'insight-extraction',
  'value-definition',
  'story-definition',
  'technical-design',
  'implementation',
  'delivery'
);

CREATE TYPE status_enum AS ENUM (
  'in-progress',
  'awaiting-review',
  'completed',
  'on-hold'
);

CREATE TYPE review_action_enum AS ENUM (
  'approved',
  'rejected'
);

-- ------------------------------------------------------------
-- themes: テーママスター
-- TypeScript型: Theme
-- ------------------------------------------------------------
CREATE TABLE themes (
  theme_id     TEXT         PRIMARY KEY,
  title        TEXT         NOT NULL,
  current_phase  phase_enum   NOT NULL DEFAULT 'triage',
  current_status status_enum  NOT NULL DEFAULT 'in-progress',
  source       TEXT         NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  next_action  TEXT         NOT NULL DEFAULT '',
  awaiting_review TEXT      NOT NULL DEFAULT ''
);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- theme_decisions: 決定記録
-- TypeScript型: ThemeDecision
-- ------------------------------------------------------------
CREATE TABLE theme_decisions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id       TEXT         NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  title          TEXT         NOT NULL,
  phase          phase_enum   NOT NULL,
  status         status_enum  NOT NULL DEFAULT 'in-progress',
  source         TEXT         NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  next_action    TEXT         NOT NULL DEFAULT '',
  awaiting_review TEXT        NOT NULL DEFAULT '',
  participants   TEXT[]       NOT NULL DEFAULT '{}',
  tags           TEXT[]       DEFAULT '{}',
  body_html      TEXT         NOT NULL DEFAULT ''
);

CREATE INDEX idx_theme_decisions_theme_id ON theme_decisions(theme_id);
CREATE INDEX idx_theme_decisions_phase ON theme_decisions(theme_id, phase);

CREATE TRIGGER theme_decisions_updated_at
  BEFORE UPDATE ON theme_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- theme_reviews: Go/No-Go操作の履歴
-- 新規テーブル（TypeScript型に対応する型はv1実装時に追加）
-- ------------------------------------------------------------
CREATE TABLE theme_reviews (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id       TEXT            NOT NULL REFERENCES themes(theme_id) ON DELETE CASCADE,
  decision_id    UUID            REFERENCES theme_decisions(id) ON DELETE SET NULL,
  action         review_action_enum NOT NULL,
  reviewer_email TEXT            NOT NULL,
  comment        TEXT,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_theme_reviews_theme_id ON theme_reviews(theme_id);
CREATE INDEX idx_theme_reviews_created_at ON theme_reviews(created_at DESC);
```

### 1.4 TypeScript型との整合性チェック

| TypeScript `Theme` フィールド | DB `themes` 列 | 型変換 |
|---|---|---|
| `theme_id: string` | `theme_id TEXT PK` | そのまま |
| `title: string` | `title TEXT` | そのまま |
| `current_phase: Phase` | `current_phase phase_enum` | enum文字列 → TypeScript union |
| `current_status: Status` | `current_status status_enum` | enum文字列 → TypeScript union |
| `decisions: ThemeDecision[]` | JOIN `theme_decisions` | クエリで構築 |
| `phases: PhaseInfo[]` | JOIN `theme_decisions` | `DISTINCT ON` で導出 |

| TypeScript `ThemeDecision` フィールド | DB `theme_decisions` 列 | 型変換 |
|---|---|---|
| `theme_id: string` | `theme_id TEXT FK` | そのまま |
| `title: string` | `title TEXT` | そのまま |
| `phase: Phase` | `phase phase_enum` | enum文字列 → TypeScript union |
| `status: Status` | `status status_enum` | enum文字列 → TypeScript union |
| `source: string` | `source TEXT` | そのまま |
| `created_at: string` | `created_at TIMESTAMPTZ` | `.toISOString()` → `string` |
| `updated_at: string` | `updated_at TIMESTAMPTZ` | `.toISOString()` → `string` |
| `next_action: string` | `next_action TEXT` | そのまま |
| `awaiting_review: string` | `awaiting_review TEXT` | そのまま |
| `participants: string[]` | `participants TEXT[]` | そのまま |
| `tags?: string[]` | `tags TEXT[]` | そのまま |
| `body_html: string` | `body_html TEXT` | そのまま |

**結論**: 既存の型定義とDBスキーマは1:1で対応する。`PhaseInfo` はクエリレベルで導出するため、専用テーブルは不要。

---

## 2. マイグレーションSQL（RLS含む）

```sql
-- ============================================================
-- RLSポリシー
-- ファイル: supabase/migrations/20260323000001_rls_policies.sql
-- ============================================================

-- RLSを有効化
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- themes: SELECTは全員、UPDATE/INSERTは認証済みユーザーのみ
-- ------------------------------------------------------------
CREATE POLICY "themes_select_all"
  ON themes FOR SELECT
  USING (true);

CREATE POLICY "themes_insert_authenticated"
  ON themes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "themes_update_authenticated"
  ON themes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- theme_decisions: SELECTは全員、UPDATE/INSERTは認証済みユーザーのみ
-- ------------------------------------------------------------
CREATE POLICY "theme_decisions_select_all"
  ON theme_decisions FOR SELECT
  USING (true);

CREATE POLICY "theme_decisions_insert_authenticated"
  ON theme_decisions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "theme_decisions_update_authenticated"
  ON theme_decisions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- theme_reviews: SELECTは全員、INSERTは認証済みユーザーのみ
-- （レビュー記録は追記のみ。UPDATE/DELETEは不可）
-- ------------------------------------------------------------
CREATE POLICY "theme_reviews_select_all"
  ON theme_reviews FOR SELECT
  USING (true);

CREATE POLICY "theme_reviews_insert_authenticated"
  ON theme_reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- anon ロールにSELECT権限を付与（RLS通過後に実行されるため安全）
-- ------------------------------------------------------------
GRANT SELECT ON themes TO anon;
GRANT SELECT ON theme_decisions TO anon;
GRANT SELECT ON theme_reviews TO anon;

GRANT SELECT, INSERT, UPDATE ON themes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON theme_decisions TO authenticated;
GRANT SELECT, INSERT ON theme_reviews TO authenticated;
```

### マイグレーションファイル構成

```
supabase/
  migrations/
    20260323000000_initial_schema.sql    -- テーブル・ENUM・トリガー
    20260323000001_rls_policies.sql      -- RLSポリシー・権限付与
```

---

## 3. 認証フロー設計

### 3.1 全体フロー図

```
[ブラウザ]                [Next.js (Vercel)]              [Supabase Auth]
    |                           |                              |
    |  1. 「Googleでログイン」クリック                          |
    |  ───────────────────────> |                              |
    |                           |  2. signInWithOAuth           |
    |                           |     provider: 'google'       |
    |                           |     redirectTo: /auth/callback|
    |  3. Googleログイン画面へリダイレクト                       |
    |  <─────────────────────── |                              |
    |                           |                              |
    |  4. Google認証完了                                        |
    |  ────────────────────────────────────────────────────────>|
    |                           |                              |
    |  5. /auth/callback?code=xxx にリダイレクト                |
    |  ───────────────────────> |                              |
    |                           |  6. exchangeCodeForSession    |
    |                           |  ────────────────────────────>|
    |                           |  7. セッションcookieをセット   |
    |                           |  <────────────────────────────|
    |  8. / にリダイレクト（認証済み）                           |
    |  <─────────────────────── |                              |
    |                           |                              |
    |  9. 以降のリクエスト                                      |
    |  ───────────────────────> |                              |
    |                           |  10. middleware:              |
    |                           |      supabase.auth.getUser()  |
    |                           |      セッションリフレッシュ    |
    |                           |  ────────────────────────────>|
    |                           |  <────────────────────────────|
    |  11. レスポンス（更新cookie含む）                          |
    |  <─────────────────────── |                              |
```

### 3.2 Supabaseクライアント初期化パターン（3種類）

Next.js 15では `cookies()` が非同期（`async`）になった。`@supabase/ssr` の `createServerClient` は cookie の `getAll` / `setAll` ハンドラーを受け取る設計のため、以下のパターンで対応する。

#### (A) ブラウザ用クライアント: `src/lib/supabase/client.ts`

```typescript
// "use client" コンポーネントから使用
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- `createBrowserClient` は `document.cookie` を自動で使用
- シングルトンキャッシュされるため、複数回呼び出してもインスタンスは1つ

#### (B) Server Component / Server Action用: `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // Next.js 15: async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentから呼ばれた場合、setAllは実行できない。
            // middlewareでのセッションリフレッシュがあるため無視して安全。
          }
        },
      },
    }
  )
}
```

- `await cookies()` で Next.js 15 の async cookies に対応
- Server Component からは `setAll` が失敗するが、middleware でリフレッシュされるため問題なし
- Server Action / Route Handler からは `setAll` が正常に動作する

#### (C) Middleware用: `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションリフレッシュ（重要: getUser()を必ず呼ぶ）
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    // 静的ファイルとNext.js内部ルートを除外
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- middleware は全リクエストでセッションcookieをリフレッシュする
- `getUser()` の呼び出しがトークンリフレッシュのトリガー
- 認証チェックによるリダイレクトは行わない（閲覧は認証不要のため）

### 3.3 OAuth コールバック: `src/app/auth/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### 3.4 認証状態による表示制御

| 画面 | 未認証 | 認証済み |
|---|---|---|
| `/`（テーマ一覧） | 閲覧可。Go/No-Goボタン非表示 | 閲覧可。Go/No-Goボタン表示 |
| `/themes/[themeId]` | 閲覧可。承認/差し戻しボタン非表示 | 閲覧可。承認/差し戻しボタン表示 |
| `/login` | ログインフォーム表示 | `/` にリダイレクト |
| `/auth/callback` | OAuthコールバック処理 | OAuthコールバック処理 |

**方針**: middleware では認証リダイレクトを行わない。各ページの Server Component で `getUser()` を呼び、認証状態に応じてUIを出し分ける。これにより「閲覧は認証不要」を自然に実現する。

---

## 4. ISR設計

### 4.1 `output: "export"` 削除

`next.config.ts` から `output: "export"` を削除する。これにより:

- Vercel上で Serverless Functions が有効になる
- ISR（Incremental Static Regeneration）が使用可能になる
- Server Actions が使用可能になる
- `cookies()`, `headers()` など動的APIが使用可能になる

```typescript
// next.config.ts（変更後）
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export" を削除
};

export default nextConfig;
```

### 4.2 revalidate 戦略

| ページ | revalidate | 理由 |
|---|---|---|
| `/`（テーマ一覧） | `60`（60秒） | テーマ一覧は頻繁に変わらない。1分のキャッシュで十分 |
| `/themes/[themeId]` | `60`（60秒） | 詳細ページも同様。Go/No-Go操作後は `revalidatePath` で即時無効化 |

```typescript
// src/app/page.tsx
export const revalidate = 60;

// src/app/themes/[themeId]/page.tsx
export const revalidate = 60;
export const dynamicParams = true; // falseからtrueに変更（新テーマ追加に対応）
```

### 4.3 revalidatePath 設計

Go/No-Go操作（Server Action）の実行後に、関連するページのキャッシュを無効化する。

```typescript
// Server Action内で呼び出す
import { revalidatePath } from 'next/cache'

// テーマ詳細ページのキャッシュを無効化
revalidatePath(`/themes/${themeId}`)

// テーマ一覧ページのキャッシュも無効化（判断待ちバナーの更新のため）
revalidatePath('/')
```

### 4.4 generateStaticParams の変更

```typescript
// 変更前: mdファイルから取得
export async function generateStaticParams() {
  const results = await getAllThemes();
  // ...
}

// 変更後: Supabaseから取得（ファサード経由で透過的に切り替わる）
// getAllThemes() の内部実装がSupabaseクエリに変わるため、
// generateStaticParams のコード自体は変更不要。
```

---

## 5. Server Actions設計

### 5.1 ファイル構成

```
src/
  app/
    actions/
      review.ts         -- Go/No-Go操作のServer Actions
```

### 5.2 承認アクション（approveTheme）

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ReviewResult =
  | { success: true }
  | { success: false; error: string }

export async function approveTheme(themeId: string): Promise<ReviewResult> {
  // 1. 認証チェック
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: '認証が必要です' }
  }

  // 2. 入力バリデーション
  if (!themeId || typeof themeId !== 'string') {
    return { success: false, error: '無効なテーマIDです' }
  }

  // 3. テーマの存在確認 + awaiting-review ステータス確認
  const { data: theme, error: fetchError } = await supabase
    .from('themes')
    .select('theme_id, current_status')
    .eq('theme_id', themeId)
    .single()

  if (fetchError || !theme) {
    return { success: false, error: 'テーマが見つかりません' }
  }

  if (theme.current_status !== 'awaiting-review') {
    return { success: false, error: 'このテーマは確認待ち状態ではありません' }
  }

  // 4. レビュー記録をINSERT
  const { error: reviewError } = await supabase
    .from('theme_reviews')
    .insert({
      theme_id: themeId,
      action: 'approved',
      reviewer_email: user.email,
    })

  if (reviewError) {
    return { success: false, error: 'レビューの記録に失敗しました' }
  }

  // 5. テーマステータスを更新
  const { error: updateError } = await supabase
    .from('themes')
    .update({
      current_status: 'in-progress',
      awaiting_review: '',
    })
    .eq('theme_id', themeId)

  if (updateError) {
    return { success: false, error: 'テーマの更新に失敗しました' }
  }

  // 6. キャッシュ無効化
  revalidatePath(`/themes/${themeId}`)
  revalidatePath('/')

  return { success: true }
}
```

### 5.3 差し戻しアクション（rejectTheme）

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ReviewResult =
  | { success: true }
  | { success: false; error: string }

export async function rejectTheme(
  themeId: string,
  comment?: string
): Promise<ReviewResult> {
  // 1. 認証チェック
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: '認証が必要です' }
  }

  // 2. 入力バリデーション
  if (!themeId || typeof themeId !== 'string') {
    return { success: false, error: '無効なテーマIDです' }
  }

  // コメントのサニタイズ（最大1000文字）
  const sanitizedComment = comment
    ? comment.trim().slice(0, 1000) || null
    : null

  // 3. テーマの存在確認 + awaiting-review ステータス確認
  const { data: theme, error: fetchError } = await supabase
    .from('themes')
    .select('theme_id, current_status')
    .eq('theme_id', themeId)
    .single()

  if (fetchError || !theme) {
    return { success: false, error: 'テーマが見つかりません' }
  }

  if (theme.current_status !== 'awaiting-review') {
    return { success: false, error: 'このテーマは確認待ち状態ではありません' }
  }

  // 4. レビュー記録をINSERT
  const { error: reviewError } = await supabase
    .from('theme_reviews')
    .insert({
      theme_id: themeId,
      action: 'rejected',
      reviewer_email: user.email,
      comment: sanitizedComment,
    })

  if (reviewError) {
    return { success: false, error: 'レビューの記録に失敗しました' }
  }

  // 5. テーマステータスを更新（差し戻し後もin-progress: AIチームが再検討）
  const { error: updateError } = await supabase
    .from('themes')
    .update({
      current_status: 'in-progress',
      awaiting_review: '',
    })
    .eq('theme_id', themeId)

  if (updateError) {
    return { success: false, error: 'テーマの更新に失敗しました' }
  }

  // 6. キャッシュ無効化
  revalidatePath(`/themes/${themeId}`)
  revalidatePath('/')

  return { success: true }
}
```

### 5.4 Server Action設計方針

| 方針 | 詳細 |
|---|---|
| 認証チェック | 全Server Actionの先頭で `getUser()` を呼び、未認証なら即エラー返却 |
| 入力バリデーション | `themeId` の型チェック、`comment` の長さ制限（1000文字） |
| ステータス確認 | 操作対象が `awaiting-review` であることを確認（楽観的ロックの代替） |
| エラーハンドリング | 例外をthrowせず、`{ success: false, error: string }` を返却。UI側で表示 |
| キャッシュ無効化 | 操作完了後に `revalidatePath` で詳細ページと一覧ページの両方を無効化 |
| 楽観的更新 | v1では実装しない。`revalidatePath` による確実な更新を優先 |
| トランザクション | v1ではSupabase RPCによるトランザクションは使用しない。INSERT + UPDATE の2ステップで十分（オーナー1人運用のため競合リスクが極めて低い） |

### 5.5 ThemeReview 型定義（types.ts に追加）

```typescript
// src/lib/data/types.ts に追加
export type ReviewAction = 'approved' | 'rejected';

export interface ThemeReview {
  id: string;
  theme_id: string;
  decision_id: string | null;
  action: ReviewAction;
  reviewer_email: string;
  comment: string | null;
  created_at: string;
}
```

---

## 6. データ取得クエリ設計（ファサード差し替え）

### 6.1 getAllThemes() の Supabase版

```typescript
// ファサード内部のクエリイメージ
const { data: themes } = await supabase
  .from('themes')
  .select(`
    theme_id,
    title,
    current_phase,
    current_status,
    source,
    created_at,
    updated_at,
    next_action,
    awaiting_review,
    theme_decisions (
      id,
      theme_id,
      title,
      phase,
      status,
      source,
      created_at,
      updated_at,
      next_action,
      awaiting_review,
      participants,
      tags,
      body_html
    )
  `)
  .order('updated_at', { ascending: false })
```

### 6.2 PhaseInfo の導出

`PhaseInfo[]` は `theme_decisions` から導出する。各テーマ・各フェーズの最新 decision のステータスを使用:

```typescript
function derivePhases(decisions: ThemeDecision[]): PhaseInfo[] {
  const phaseMap = new Map<Phase, PhaseInfo>();
  for (const d of decisions) {
    const existing = phaseMap.get(d.phase);
    if (!existing || d.updated_at > existing.updated_at) {
      phaseMap.set(d.phase, {
        phase: d.phase,
        status: d.status,
        updated_at: d.updated_at,
      });
    }
  }
  return Array.from(phaseMap.values());
}
```

---

## 7. 環境変数一覧

### 7.1 `.env.local.example`

```bash
# ============================================================
# Supabase
# ============================================================
# Supabaseプロジェクトの URL（ダッシュボード > Settings > API で確認）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabaseプロジェクトの anon (public) キー
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ============================================================
# サイトURL（OAuth コールバック用）
# ============================================================
# ローカル開発: http://localhost:3000
# 本番: https://your-domain.vercel.app
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 7.2 環境変数の詳細

| 変数名 | 公開 | 必須 | 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase APIエンドポイント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase anon key（RLSで保護されるため公開可） |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | OAuthコールバックのリダイレクト先。Vercelでは `VERCEL_URL` からも取得可能だが、明示的に設定する |

### 7.3 Supabase側の設定（ダッシュボードで手動設定）

| 設定項目 | 値 | 設定場所 |
|---|---|---|
| Google OAuth プロバイダー | 有効化 | Authentication > Providers > Google |
| Google Client ID | Google Cloud Consoleで取得 | Authentication > Providers > Google |
| Google Client Secret | Google Cloud Consoleで取得 | Authentication > Providers > Google |
| Site URL | `https://your-domain.vercel.app` | Authentication > URL Configuration |
| Redirect URLs | `https://your-domain.vercel.app/auth/callback`, `http://localhost:3000/auth/callback` | Authentication > URL Configuration |

### 7.4 環境変数の未設定検知

アプリ起動時に環境変数の存在を検証するユーティリティ:

```typescript
// src/lib/supabase/env.ts
export function validateSupabaseEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ] as const;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.local.example to .env.local and fill in the values.'
    );
  }
}
```

---

## 8. ファイル構成（v1完成時の想定）

```
src/
  app/
    actions/
      review.ts                 -- Server Actions（Go/No-Go）
    auth/
      callback/
        route.ts                -- OAuthコールバック
    login/
      page.tsx                  -- ログインページ
    themes/
      [themeId]/
        page.tsx                -- テーマ詳細（ISR）
    layout.tsx                  -- ルートレイアウト
    page.tsx                    -- テーマ一覧（ISR）
  components/
    review-actions.tsx          -- Go/No-Goボタン（Client Component）
  lib/
    data/
      themes.ts                 -- ファサード（内部をSupabaseクエリに差し替え）
      types.ts                  -- 型定義（ThemeReview追加）
      constants.ts
    supabase/
      client.ts                 -- ブラウザ用クライアント
      server.ts                 -- Server Component / Action用クライアント
      env.ts                    -- 環境変数バリデーション
  middleware.ts                 -- セッションリフレッシュ

supabase/
  migrations/
    20260323000000_initial_schema.sql
    20260323000001_rls_policies.sql

scripts/
  migrate-md-to-supabase.ts    -- データ移行スクリプト

.env.local.example
```

---

## 9. 技術的リスクと対策

### R10: SSG → ISR移行のVercelランタイム変更

| 項目 | 内容 |
|---|---|
| 影響度 | 高 |
| 確率 | 中 |
| 詳細 | `output: "export"` 削除で Serverless Functions に移行。ビルド設定、デプロイ時間、コールドスタートの特性が変わる |
| 対策 | Wave 2（S-104）で早期に移行を完了し、Vercel上で動作検証。ISR移行が最優先のデモポイント |
| 検証方法 | `vercel build` のローカル実行 + Vercelプレビューデプロイで確認 |

### R11: Next.js 15 async cookies と @supabase/ssr の互換性

| 項目 | 内容 |
|---|---|
| 影響度 | 高 |
| 確率 | 低 |
| 詳細 | Next.js 15 で `cookies()` が async になった。`@supabase/ssr` の最新版は対応済みだが、middleware・Server Component・Server Action でそれぞれ初期化パターンが異なる |
| 対策 | 本設計書の3.2節に記載した3パターンに厳密に従う。`@supabase/ssr` 公式ドキュメント（2026年3月時点）で `await cookies()` パターンが推奨されていることを確認済み |
| 検証方法 | S-101の受け入れテストで全3パターンの動作を確認 |

### R12: mdファイル → DB移行の完全性

| 項目 | 内容 |
|---|---|
| 影響度 | 中 |
| 確率 | 低 |
| 詳細 | 既存のmdファイルデータをPostgreSQLに正確に移行できるか。frontmatterの型変換、body_htmlの変換精度 |
| 対策 | S-103の移行スクリプトにUPSERT使用（冪等性確保）。移行前後でテーマ数・決定記録数の一致を検証するチェックを組み込む |
| 検証方法 | 移行スクリプト実行後に件数比較 + ダッシュボード表示の目視確認 |

### R13: Go/No-Go操作後のUI更新タイミング

| 項目 | 内容 |
|---|---|
| 影響度 | 中 |
| 確率 | 中 |
| 詳細 | Server Action実行後に `revalidatePath` を呼んでも、ユーザーが見ているページが即座に更新されるか |
| 対策 | v1では楽観的更新を実装しない。Server Action完了後に `revalidatePath` で確実にキャッシュを無効化し、Next.js のRouter Refresh（`router.refresh()` またはフォームのリダイレクト）でページを再取得する |
| 検証方法 | S-106の受け入れテストで操作後の画面更新を確認 |

### R15: RLSポリシーの漏れ

| 項目 | 内容 |
|---|---|
| 影響度 | 高 |
| 確率 | 低 |
| 詳細 | RLSが正しく設定されていないと、anon keyで認証不要のINSERT/UPDATEが可能になる |
| 対策 | マイグレーションSQLでRLSを明示的に有効化。`GRANT` で最小権限を付与。S-102の受け入れテストでanon roleからのINSERTが拒否されることを確認 |
| 検証方法 | Supabase SQL Editorで `SET ROLE anon; INSERT INTO theme_reviews ...` がエラーになることを手動確認 |

---

## 10. 決定事項まとめ

| # | 決定事項 | 理由 |
|---|---|---|
| D1 | PostgreSQL ENUM型を使用（CHECK制約ではなく） | TypeScriptのunion型と1:1対応させやすい。値の追加時はマイグレーションが必要だが、フェーズ・ステータスの変更頻度は極めて低い |
| D2 | `PhaseInfo` 専用テーブルは作らない | `theme_decisions` から導出可能。テーブル数を最小限に保つ |
| D3 | `theme_reviews` はINSERTのみ（UPDATE/DELETE不可） | 監査ログとしての性質。操作の取り消しは新しいレビュー記録で対応 |
| D4 | middleware では認証リダイレクトしない | 「閲覧は認証不要」の要件に対応。各ページで認証状態を確認してUIを出し分ける |
| D5 | Server Action のエラーは例外ではなくResult型で返す | UIでの表示制御が容易。try/catchの煩雑さを回避 |
| D6 | 楽観的更新はv1では実装しない | `revalidatePath` による確実な更新を優先。UXの改善はv2で検討 |
| D7 | トランザクション（RPC）はv1では使用しない | オーナー1人運用で競合リスクが極めて低い。INSERT + UPDATE の2ステップで十分 |
| D8 | Supabase Realtime は使用しない | ISR + `revalidatePath` で要件を満たす。リアルタイム性の追加はv2 |
| D9 | `NEXT_PUBLIC_SITE_URL` を明示的に環境変数として設定 | `VERCEL_URL` は `https://` プレフィックスが付かないなど挙動が不安定。OAuthコールバックURLは明示的に管理する |

---

## 却下した案とその理由

| 案 | 却下理由 |
|---|---|
| Prismaの導入 | Supabase JSクライアントで直接クエリを書く方がシンプル。型生成は `supabase gen types` で対応可能。ORMのオーバーヘッドは不要 |
| Service Roleキーの使用 | RLSを活用すれば anon key + 認証で十分。Service Roleキーをサーバー側で使うパターンはセキュリティリスクが高く、v1の要件には過剰 |
| API Routes（Route Handlers）での操作実装 | Server Actions の方がフォーム操作との親和性が高く、Next.js 15 の推奨パターン。別途 `fetch` を書く必要がない |
| Zodによるバリデーション | v1のServer Actionは入力が極めてシンプル（themeId + optional comment）。Zodの導入は過剰。v2で入力が複雑化したら検討 |
| `next-auth` (Auth.js) の使用 | Supabase Auth + `@supabase/ssr` で認証とRLSが統合的に動作する。Auth.jsを入れると認証レイヤーが二重になり、RLSとの連携が複雑化する |

---

## 次のアクション

Phase 5（実装）へ進む。Wave 1（S-101 → S-102 → S-103）から着手。

1. **S-101**: `@supabase/supabase-js` と `@supabase/ssr` のインストール。3種類のクライアント初期化。環境変数テンプレート作成
2. **S-102**: マイグレーションSQL実行（Supabaseダッシュボード or CLI）。RLSポリシー適用
3. **S-103**: データ移行スクリプトの作成と実行
