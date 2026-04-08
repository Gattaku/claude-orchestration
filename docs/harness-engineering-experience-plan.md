# Harness Engineering 体験企画書

> 本企画書は、Codex が実践したハーネスエンジニアリング（参考: [`docs/harness-engineering.md`](./harness-engineering.md)）を「読んで理解する」段階から「**自分の手で 1 周回して体得する**」段階へ進むための実践プログラムである。

## 1. 背景と動機

Codex が公開した harness engineering の事例は、AI コーディングエージェントを「ガチャ的な道具」から「**信頼できる工員**」に変える方法論を示した。本プロジェクト（AIPO オーケストレーション）も harness engineering の実践であるが、現状は次の主要コンポーネントが欠けている:

- **Chrome DevTools MCP** — エージェントに「ブラウザの目」を与える
- **フルスタックトレース** を使った修正検証ループ
- **Trace grading / Eval** による harness 自体の品質測定

これらを **読むだけ** で済ませると、「何が嬉しいか」「何が罠か」が腹落ちしない。そこで、**最小規模の Web アプリにわざと欠陥を埋め込み、Claude Code に Chrome DevTools MCP を持たせて、自分が見守りながら fix → 評価のループを回す** という体験プログラムを設計する。

## 2. ゴール（学習目標）

体験を通じて、以下を腹落ちさせる:

| # | 学習目標 | 達成判定 |
|---|---|---|
| G1 | Chrome DevTools MCP の **何が嬉しい** か、自分の言葉で説明できる | 体験後に振り返りメモを書ける |
| G2 | フルスタックトレースが **どう修正検証に効くか** を、テストグリーンとの対比で説明できる | バグごとにスタックトレースを根拠に修正ができる |
| G3 | **エージェントの失敗パターン** を分類でき、harness 側の改善ポイントとして翻訳できる | 各失敗を「reasoning / instruction / verification / timeout」で分類できる |
| G4 | Eval（trace grading）の **最小実装** を自分で書ける | 50 行程度の grading スクリプトが動く |
| G5 | 本プロジェクト AIPO に **harness 改善 PR** を 1 本以上出せる | PR がマージ可能な品質 |

## 3. 非ゴール

- **本格的な observability stack（Loki/Prometheus）の導入は今回はやらない** — 次回以降のテーマに分割
- **他社製 SaaS（Datadog 等）への送信は今回しない** — ローカル完結
- **Codex CLI の検証はしない** — Claude Code でのみ実施（同じ harness 思想は適用可能）
- **マルチエージェントの分散実行はしない** — Claude Code 単一プロセス

## 4. スコープ

### 4.1 教材アプリ（"Buggy Cart"）

ハーネスエンジニアリングのための **トレーニングダミー**。以下を含む最小 Next.js アプリを `experiments/buggy-cart/` に新設する。

**機能（正常仕様）**:
- 商品リスト → カートに追加 → 合計表示 → チェックアウト
- LocalStorage で永続化

**仕込むバグ（5 種）**:

| ID | バグ種別 | 仕込み内容 | 期待する観測手段 |
|---|---|---|---|
| B1 | UI / 状態 | カート追加で qty が +1 ではなく +2 される | DOM スナップショット差分 |
| B2 | パフォーマンス | 商品リスト描画で N+1 の useEffect が走る | `performance_start_trace` |
| B3 | ネットワーク | チェックアウト POST が 2 回連続で投げられる | `network_get_requests` |
| B4 | 例外（フルスタックトレース対象） | 特定商品で `null.price` 参照、minify 済みコードで発生 | `console_get_messages`（ソースマップ付きトレース） |
| B5 | UX 退行 | input への type で IME 確定前イベントを拾って 2 重入力 | スクリーンショット連鎖 + DOM 差分 |

**重要**: バグの仕込みリストとソースマップ対応の build 設定は事前に固定し、`experiments/buggy-cart/BUGS.md` にネタばらしを書いておく（評価フェーズで使う）。

### 4.2 ハーネス側の整備

`experiments/buggy-cart/` 配下に以下を整備:

- **AGENTS.md** — Buggy Cart 専用のコンテキスト書き（「invariants として qty は 1 ずつ増える」など）
- **`.mcp.json`** または `.claude/settings.json` 追記 — chrome-devtools-mcp の起動設定
- **`scripts/grade-trace.mjs`** — Claude Code が出した trajectory（trace）に対して以下の項目を採点する最小 grading スクリプト
  - バグを再現したか（yes/no）
  - 修正前にスタックトレースを取得したか
  - 修正後に DevTools で再検証したか
  - tool call の総数
  - 直接 fix を書こうとして失敗した回数
- **`evals/`** — 上記 5 バグそれぞれに対する eval ケースの md ファイル

## 5. 体験ステップ

5 つのフェーズで構成。各フェーズで **動かす + 観察する + 言語化する** を必ず行う。

### Phase 0: 環境セットアップ（半日）

1. `experiments/buggy-cart/` に最小 Next.js アプリを scaffold（人間が手動 or AI にセットアップを任せて OK）
2. 上記 5 バグを実装し、`BUGS.md` に正解を記録
3. **chrome-devtools-mcp を Claude Code から呼べるように設定**:
   ```json
   {
     "mcpServers": {
       "chrome-devtools": {
         "command": "npx",
         "args": ["-y", "chrome-devtools-mcp@latest"]
       }
     }
   }
   ```
4. 動作確認: Claude Code から `take_screenshot` が成功すること

**完了基準**: Claude Code が Buggy Cart のトップ画面のスクショを撮れる

### Phase 1: ナイーブモード（バグ 1 つ・harness 最小）

1. **harness を意図的に弱くする**:
   - AGENTS.md なし
   - chrome-devtools-mcp **なし**
   - 「B4 のバグを直して」とだけ指示
2. Claude Code に修正させる
3. **trajectory を保存**（`.claude/logs/` を都度退避するか、画面記録）
4. 観察ポイント:
   - エージェントは何を根拠に修正したか
   - 推測修正 / grep ベース修正 / テスト追加 のどれか
   - 修正後の検証はどう行ったか
   - 何回 retry したか

**完了基準**: B4 が修正されたか／されなかったかにかかわらず、trajectory を保存し「**根拠なき修正**」がどこに現れるかを書き留める

### Phase 2: DevTools MCP 投入モード（同じバグ B4）

1. chrome-devtools-mcp を有効化
2. AGENTS.md に「**修正前にスタックトレースを取得すること** / **修正後に再現手順で再検証すること**」を invariants として追記
3. **同じ B4 バグ** を Claude Code に修正させる
4. trajectory を保存
5. Phase 1 との **差分** を以下の観点で書き出す:
   - スタックトレース取得 → 該当ファイル特定 → 修正の流れになるか
   - ソースマップ越しに minify 済みエラーが意味のあるパスに解決されるか
   - 修正後に navigate + interact + console_get_messages で **再検証ループ** が回るか
   - tool call の総数が減るか／増えるか
   - 推測修正の頻度が減るか

**完了基準**: 「**スタックトレースがあるとエージェントの動きが具体的にどう変わるか**」を 200 字以内で書ける

### Phase 3: パフォーマンスバグでの体験（B2）

1. `performance_start_trace` を使う流れを試す
2. Claude Code に「Buggy Cart の商品リスト描画が遅い、原因を特定して直して」と依頼
3. 観察ポイント:
   - エージェントがトレースの **どの metric を見たか**（LCP / TBT / scripting time など）
   - "useEffect が N 回走っている" を **トレースから** 突き止められるか、ソース読みに頼るか
   - 修正後に再度トレースを取って **改善を数値で示せたか**

**完了基準**: ビフォーアフターのパフォーマンストレースと、改善内容を 1 つの md に貼った状態（"perf-bug-report.md"）

### Phase 4: ネットワーク・UI バグの掃討（B1, B3, B5）

各バグを Claude Code に独立に直させる。

- **B1 (UI 状態)**: DOM スナップショット差分を根拠に修正できるか
- **B3 (二重 POST)**: network_get_requests のログを根拠に修正できるか
- **B5 (IME 二重入力)**: スクショ連鎖 + DOM 差分 で原因を切り分けられるか

ここでは **道具を渡してもなお詰まるパターン** を集めることが目的。詰まり方が harness 改善のネタになる。

**完了基準**: 各バグについて修正 PR と、trajectory に対する `grade-trace.mjs` の出力結果が揃う

### Phase 5: Trace Grading と振り返り（半日）

1. `scripts/grade-trace.mjs` を完成させる
2. Phase 1〜4 の trajectory 全てに対して grading を回し、表にする
3. 失敗を以下 4 分類で集計:
   - reasoning errors
   - instruction following
   - missing verification
   - timeout / loop
4. **harness 改善案** を 3 つ以上書き出す（例: AGENTS.md にこの一文を足す、tool 呼び出しテンプレを追加する、invariants を増やす、など）
5. うち 1 つを実際に適用し、Phase 2 の B4 ケースを **再走** して差分を測る（**A/B 評価の最小版**）

**完了基準**:
- grading 表の md 1 枚
- 改善 1 つを適用した後の re-run 結果
- 「**harness を 1 行変えるとエージェントがどう変わるか**」の体感メモ

## 6. 成果物

| 成果物 | 形式 | 場所 |
|---|---|---|
| Buggy Cart アプリ | Next.js プロジェクト | `experiments/buggy-cart/` |
| バグ仕込み台帳 | md | `experiments/buggy-cart/BUGS.md` |
| AGENTS.md（実験用） | md | `experiments/buggy-cart/AGENTS.md` |
| chrome-devtools-mcp 設定 | json | `.mcp.json` または settings 追記 |
| 各 Phase の trajectory | log | `experiments/buggy-cart/trajectories/phase{N}-{bugid}.json` |
| Trace grading スクリプト | mjs | `experiments/buggy-cart/scripts/grade-trace.mjs` |
| eval ケース集 | md | `experiments/buggy-cart/evals/B*.md` |
| 最終振り返り | md | `experiments/buggy-cart/RETROSPECTIVE.md` |
| 本体プロジェクトへの harness 改善 PR | PR | AIPO に対して 1 本以上 |

## 7. 評価基準（自分自身の理解度の測り方）

### 7.1 定量

| 指標 | ベースライン (Phase 1) | 目標 (Phase 2 以降) |
|---|---|---|
| B4 修正成功率 | N/A | 100% |
| 修正までの tool call 数 | 計測 | -30% |
| 推測修正（根拠なきパッチ）回数 | 計測 | 0 |
| 修正後の再検証実施率 | 計測 | 100% |

### 7.2 定性

- 「Chrome DevTools MCP が嬉しい瞬間」を 1 つ以上具体例で語れる
- 「フルスタックトレースがテストより強い瞬間」を 1 つ以上具体例で語れる
- 「自分の harness のここが弱い」を 3 つ以上指摘できる

## 8. リスクと回避策

| リスク | 影響 | 回避策 |
|---|---|---|
| chrome-devtools-mcp が起動しない / 落ちる（[issue #13138](https://github.com/openai/codex/issues/13138) 等で報告あり） | Phase 進行不能 | 起動失敗時の手動 kill 手順を `BUGS.md` に併記 / `playwright` フォールバックを用意 |
| ソースマップが効かず stack trace が minify 表示のまま | B4 評価が成立しない | next.config に `productionBrowserSourceMaps: true` を強制 |
| バグが簡単すぎて Phase 1 と Phase 2 で差が出ない | 学習効果が薄い | バグ難易度を 2 段階用意する（Easy/Hard）。Hard 側で Phase 比較する |
| Claude Code がそもそも DevTools MCP を呼んでくれない | 評価の前提が崩れる | AGENTS.md に「使うべきツール」を明示 + Phase 0 で疎通確認 |
| 自分の主観で grading してしまい客観性がない | 改善判断がブレる | grading は **チェックリスト方式** に落とし、自由記述を排除 |

## 9. 進め方の原則

1. **必ず手を動かす**。読んで終わりにしない
2. **Phase 1 のナイーブモードを必ず通る**。harness のありがたみは比較でしか分からない
3. **trajectory を捨てない**。失敗 trajectory ほど学びが多い
4. **一気に全部やらない**。Phase ごとに 1 セッション完結を目安にする
5. **改善は 1 つずつ**。harness を 2 箇所同時に変えると因果が消える

## 10. 完了の定義

以下が揃ったら本企画は完了とする:

- [ ] Phase 0〜5 をすべて通過した
- [ ] `experiments/buggy-cart/RETROSPECTIVE.md` に振り返りが書かれている
- [ ] `docs/harness-engineering.md` に **「自分が体験して新たに分かったこと」** セクションが追記されている
- [ ] AIPO 本体への harness 改善 PR が 1 本以上出ている
- [ ] 学習目標 G1〜G5 のうち **4 つ以上** が自己評価で「達成」と言える

## 11. 次に繋がるテーマ（aftermath）

本企画完了後に検討する次のテーマ:

1. **Observability スタック導入** — Loki/Prometheus または OTel コレクタ + LogQL/PromQL を AIPO サブエージェントから叩けるようにする
2. **Golden Principles 自動 scan** — 定期 Codex 風タスクで invariants 違反を検出 → 自動リファクタ PR
3. **Eval 自動化** — `experiments/buggy-cart/` を CI で回し、harness 変更のリグレッションを検知
4. **Codex App Server 相当の harness 統一** — Claude Code 以外のサーフェス（CLI / Web / IDE）への展開検討

---

## 参考

- [`docs/harness-engineering.md`](./harness-engineering.md) — 本企画の前提となる解説ドキュメント
- [`.claude/agents/aipo.md`](../.claude/agents/aipo.md) — 本プロジェクトの harness 中核
- [Chrome DevTools MCP（GitHub）](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [OpenAI: Harness engineering blog](https://openai.com/index/harness-engineering/)
