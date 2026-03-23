---
theme_id: "TH-001"
title: "AIオーケストレーション可視化ダッシュボード"
phase: "value-definition"
status: "completed"
source: "docs/meeting/dummy.md"
created_at: "2026-03-23"
updated_at: "2026-03-23"
next_action: "Story策定（Phase 3）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI PM"
  - "AI PD"
tags:
  - "mvp"
  - "dashboard"
---

# Phase 2: 価値定義・ロードマップ整合 — 決定記録

## 日付
2026-03-23

## 議論の参加者
- AIPO, AI PM, AI PD

---

## 議論の経緯

### 論点1: プロダクトの価値定義

- **AI PMの意見**: このプロダクトの最初のユーザーは自分自身（ドッグフーディング）。AIオーケストレーションが生成する `docs/decisions/` のmdファイルをパースして表示するダッシュボード。「閲覧のみMVPで安心感が得られるか」が最大のリスクであり、完璧な設計より動くものを最速で作ることが優先。
- **AI PDの意見**: 「安心感」をUIで実現するための4原則（動いている証拠、悪いニュースの透明性、予測可能性、視覚的静けさ）を定義。認知コスト最小化の5原則（ナビなし、即価値、スキャン最適化、操作不要、URL共有）も提示。
- **議論のポイント**: 両者とも「最速で動くものを作る」方向で一致。AI PDの原則定義がUI実装の判断基準として有効。

### 論点2: frontmatter規約とデータモデル

- **AI PMの意見**: Theme IDは `TH-001`（連番）形式。frontmatterに構造化情報を集約し、本文は「人間が読む散文」として自由度を残す。Phase enum は5値、Status enum は当初6値を提案。
- **AI PDの意見**: 当初 slug 形式のTheme IDを提案したが、AI PM案の `TH-001` の方が管理しやすいと同意。Status は4値（in-progress, awaiting-decision, done, on-hold）で十分と主張。`phase_history` は frontmatter に入れず、複数ファイルの `updated_at` から導出すべきと提案。
- **AIPOの裁定依頼に対する回答**: 5つの差異すべてについて、AI PM・AI PD間で合意形成に成功。
- **議論のポイント**: 「frontmatterに何を持つか」の設計方針で収束。構造化情報はfrontmatter、本文は自由記述。`phase_history` は持たず導出する（データ正規化の原則）。

### 論点3: ファイル命名規則

- **AI PMの意見**: `TH-001-insight-extraction-20260323.md`（簡潔で、ファイルシステム上でテーマごとにソート可能）
- **AI PDの意見**: 当初は長い命名を提案したが、AI PM案に同意。「ファイル名は索引、詳細はfrontmatter」の原則を支持。
- **議論のポイント**: 全員一致でAI PM案を採用。

### 論点4: MVPロードマップ（v0→v1→v2）

- **AI PMの意見**: v0（SSG・閲覧のみ・1-2週間）→ v1（Supabase・Go/No-Go操作・2-4週間）→ v2（GitHub連携・通知・4-6週間）の3段階。v0の最大リスクはR4（閲覧のみで安心感が得られるか）。
- **AI PDの意見**: v0は Desktop-first。Mobile は閲覧可能だが最適化はv1以降。判断待ちバナーはv0では操作ボタンなしの静的表示にする。
- **議論のポイント**: ロードマップの段階分けについて両者一致。v0のスコープを最小限にし、ドッグフーディングで検証するアプローチに合意。

### 論点5: Phase/Status enum値の命名

- **AI PMの意見**: Phase 5値に同意。`ui-design` を `ux-design` に変更すべき（UXはUIだけでなくフロー設計も含む）。Status は `awaiting-decision` より `awaiting-review` のほうが明確。
- **AI PDの意見**: Phase については AI PM の修正を受け入れ。Status の `awaiting-review` への変更は妥当と判断。
- **AIPOの判断**: Phase 名は AIPOプロセスの5フェーズに完全整合させる。`ux-design` ではなく `design-and-implementation`（Phase 4 = 設計・実装）とし、Phase 5 = `delivery` を追加。Status は `awaiting-review` を採用。ただし `done` は `completed` に統一（完了をより明確に表現）。

---

## 検討した選択肢

### 案A: Theme ID — 連番形式 `TH-001`
- 内容: 3桁連番で一意識別
- メリット: 簡潔、ソート可能、管理容易
- デメリット: 人間が読んだとき内容が分からない

### 案B: Theme ID — スラッグ形式 `theme-ai-dev-dashboard`
- 内容: テーマ内容を反映した英語スラッグ
- メリット: 可読性が高い
- デメリット: 命名のブレ、長い、ソート不安定

### 案C: Phase enum — 8値（review, released, archived 含む）
- 内容: フェーズとステータスを混合した8値
- メリット: 1つのフィールドで状態を詳細に表現
- デメリット: Phase（工程）とStatus（状態）の概念混同

### 案D: Phase enum — 5値（AIPOプロセス準拠）
- 内容: AIPOの5フェーズに完全整合
- メリット: プロセス定義との一貫性、シンプル
- デメリット: 将来のフェーズ追加時に拡張が必要

---

## 決定事項

### 1. プロダクトの価値定義

| 項目 | 定義 |
|---|---|
| 誰のために | AIチームを統括する人間オーナー |
| どんな課題を解くか | AIチームの自律的な判断プロセスが見えず、介入タイミングが分からない |
| どう解決するか | `docs/decisions/` のmdファイルをパースし、テーマ単位でフェーズ進行・判断経緯をダッシュボード表示 |
| なぜ今必要か | AIオーケストレーション自体が稼働中であり、ドッグフーディングで最速のフィードバックが得られる |
| 成功指標 | 人間オーナーが30秒以内に全テーマの現在地を把握でき、mdファイルを直接読まずに判断経緯を理解できる |

### 2. MVPロードマップ

| 段階 | スコープ | 技術 | 想定期間 |
|---|---|---|---|
| **v0** | 閲覧のみ。テーマ一覧+詳細。SSG | Next.js + SSG + Vercel | 1-2週間 |
| **v1** | Go/No-Go操作、フィルタ、認証 | + Supabase | 2-4週間 |
| **v2** | GitHub連携、通知 | + GitHub API + Slack | 4-6週間 |

### 3. frontmatter規約

```yaml
---
theme_id: "TH-001"                    # 必須。連番形式
title: "テーマタイトル"                 # 必須。表示用
phase: "insight-extraction"            # 必須。下記5値
status: "in-progress"                  # 必須。下記4値
source: "docs/meeting/dummy.md"        # 必須。元の議事録
created_at: "2026-03-23"              # 必須
updated_at: "2026-03-23"              # 必須
next_action: "次のアクションの説明"     # 必須
awaiting_review: ""                    # 必須。空=確認不要
participants:                          # 必須
  - "AIPO"
  - "AI PM"
tags:                                  # 任意
  - "mvp"
---
```

### 4. Phase enum（5値）

| 値 | 対応するAIPOプロセス |
|---|---|
| `insight-extraction` | Phase 1: インサイト抽出 |
| `value-definition` | Phase 2: 価値定義・ロードマップ整合 |
| `story-definition` | Phase 3: Story策定 |
| `design-and-implementation` | Phase 4: 設計・実装 |
| `delivery` | Phase 5: デリバリー |

### 5. Status enum（4値）

| 値 | 意味 |
|---|---|
| `in-progress` | 進行中 |
| `awaiting-review` | オーナー確認待ち |
| `completed` | 完了 |
| `on-hold` | 保留 |

### 6. ファイル命名規則

```
docs/decisions/{theme_id}-{phase略称}-{YYYYMMDD}.md
```

例: `TH-001-insight-extraction-20260323.md`

### 7. Theme Registry

`docs/decisions/theme-registry.md` にテーマ一覧を管理。AIPOが自動更新。

### 8. UI画面構成（MVP v0）

- **画面1（オーバービュー）**: 判断待ちバナー（静的表示）+ テーマ一覧（フェーズ進行インジケーター付き）
- **画面2（テーマ詳細）**: フェーズ進行マップ + タイムラインタブ + 判断ポイントタブ

### 9. デザイン方針

- 4原則: 動いている証拠、悪いニュースの透明性、予測可能性、視覚的静けさ
- カラー: status-active(青), status-awaiting(琥珀), status-done(緑), status-on-hold(グレー)
- Desktop-first、Mobile閲覧可能

---

## 判断理由

- **Theme ID `TH-001` を採用**: 簡潔さとソート可能性を優先。可読性は `title` フィールドで補完する。AI PMの案を採用し、AI PDも同意。
- **Phase 5値に整合**: AIPOプロセスとの1:1マッピングを最優先。AI PMの当初案（8値）はPhaseとStatusの概念混同があり、5値に整理。AI PMも設計ミスを認め同意。
- **Status 4値**: MVP v0は閲覧のみであり、操作結果（approved/rejected）のステータスは不要。AI PDの主張を採用し、AI PMも同意。
- **`phase_history` を持たない**: データ正規化の原則に従い、同一テーマの複数ファイルの `updated_at` から導出する。AI PDの撤回提案を支持。
- **`awaiting-review` を採用**: `awaiting-decision` より行動が明確（AI PMの提案）。AI PDも妥当と判断。

---

## 却下した案とその理由

### スラッグ形式のTheme ID
- 却下理由: 命名のブレリスク、ファイル名が長くなる。`title` フィールドで可読性は確保できる。

### Phase 8値
- 却下理由: `review`, `released`, `archived` はPhase（工程）ではなくStatus（状態）。概念を混同すると、UIのフィルタリングやフェーズ進行マップの表現が複雑になる。

### frontmatterに `phase_history` を持つ案
- 却下理由: 複数ファイルの `updated_at` から導出可能な情報を重複して持つと、更新漏れによる不整合リスクが生じる。

### v0でGo/No-Go操作を含める案
- 却下理由: 操作結果の永続化（mdファイルへの書き戻し or 別ストア）が複雑性を大幅に増す。v0は閲覧に徹し、操作はv1でSupabase導入時に実装する。

---

## リスク・不確実性

1. **R1: frontmatter規約の遵守崩壊（影響度: 高, 確率: 中）**: AIPOの出力フォーマットが揺れるとパースが壊れる。対策: AIPOプロンプトに規約をハードコードし、ビルド時にバリデーション。
2. **R4: 閲覧のみMVPの価値不足（影響度: 高, 確率: 中）**: Go/No-Go操作なしで安心感が得られるか。対策: ドッグフーディングで1週間以内に検証。不足なら v1 を前倒し。
3. **R5: テーマ粒度の不適切さ（影響度: 中, 確率: 中）**: 対策: TH-001（自分自身）でドッグフーディング。
4. **R6: フェーズ遷移モデルの乖離（影響度: 中, 確率: 中）**: 5フェーズが実態に合わない可能性。対策: Phase enum はUIマッピングテーブルで管理し、ハードコードしない。
5. **R9: 既存ファイルの移行（影響度: 低, 確率: 確定）**: 対策: Phase 2完了時に移行実施。

---

## 次のアクション

### Phase 3: Story策定
1. MVP v0に必要なStoryの洗い出し（AI PMに依頼）
2. 各StoryのUI要件の具体化（AI PDに依頼）
3. 技術設計の方針確認（AI Devに依頼）
4. Storyの優先順位決定
