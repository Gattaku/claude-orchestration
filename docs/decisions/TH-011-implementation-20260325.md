---
theme_id: "TH-011"
title: "展開コンテンツの閉じるUX改善"
phase: "implementation"
status: "completed"
source: "dogfooding-feedback"
created_at: "2026-03-25"
updated_at: "2026-03-25"
next_action: "Phase 6（デリバリー）へ進む"
awaiting_review: ""
participants:
  - "AIPO"
  - "AI PD"
  - "AI Dev"
tags:
  - "ux"
---

# Phase 5: 実装 — 展開コンテンツの閉じるUX改善

## 日付
2026-03-25

## 議論の参加者
- AIPO, AI PD, AI Dev

## 議論の経緯

### 論点1: UX改善方針の選定
- **案A**: max-height + 内部スクロール
- **案B**: fixed/stickyの閉じるバー（画面下部）
- **案C**: 案A + 案Bのハイブリッド
- **案D**: max-heightなし + scrollIntoView
- **案E（AI PD推奨）**: 案Aの改良版 — max-height内部スクロール + sticky内部閉じるバー + フェードグラデーション + overscroll-contain + scrollIntoView

- **AI PDの意見**: 案Bの画面下部fixedバーは「どのエントリに対する操作か」が曖昧になるため非推奨。案Eが最もバランスが良い
- **AIPOの判断**: AI PDの推奨案Eを採用

### 論点2: フェードグラデーションの必要性
- **AI PDの意見**: スクロール可能であることの視覚的ヒントとして必須。pointer-events-noneでクリックを妨げない
- **AIPOの判断**: 採用

## 実装内容
| ファイル | 変更内容 |
|---------|---------|
| `src/components/timeline-entry.tsx` | 展開エリアにmax-height+内部スクロール、sticky閉じるバー、フェードグラデーション、scrollIntoView追加 |
| `__tests__/components/timeline-entry.test.tsx` | 新UXに対応する6テスト追加 |

## テスト結果
| テストケース | 結果 |
|-------------|------|
| sticky閉じるバーの存在確認 | pass |
| スクロール可能コンテナ(max-h-[60vh])の確認 | pass |
| フェードグラデーションオーバーレイの確認 | pass |
| sticky閉じるバーのボタンでの折りたたみ動作 | pass |
| 折りたたみ時にUI要素が非表示になること | pass |
| scrollIntoViewの呼び出し確認 | pass |
| 全テストスイート（19ファイル / 151テスト） | all pass |

## 技術的判断とその理由
- `overscroll-contain`: モバイルでのネストスクロール問題を防止
- `setTimeout(0)` for scrollIntoView: DOM更新後に確実に実行するため
- `resolution=ignore-duplicates` for sticky bar: sticky + z-10でスクロール領域内に固定

## 次のアクション
- Phase 6（デリバリー）へ進む
