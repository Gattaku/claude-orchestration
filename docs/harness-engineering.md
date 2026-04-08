# Harness Engineering — Codex流ハーネスエンジニアリングの解説

## このドキュメントの位置づけ

Codex（OpenAI）が公開した「Harness engineering: leveraging Codex in an agent-first world」を起点に、**Harness Engineering（ハーネスエンジニアリング）** というディシプリンを、本プロジェクト（AIオーケストレーション）の文脈に照らして整理する。

参考一次情報:

- OpenAI: [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)
- OpenAI: [Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/)
- OpenAI: [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)
- OpenAI Developers: [Model Context Protocol — Codex](https://developers.openai.com/codex/mcp)
- Chrome for Developers: [Chrome DevTools (MCP) for your AI agent](https://developer.chrome.com/blog/chrome-devtools-mcp)
- ChromeDevTools: [chrome-devtools-mcp (GitHub)](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- Datadog: [Closing the verification loop: Observability-driven harnesses for building with agents](https://www.datadoghq.com/blog/ai/harness-first-agents/)
- Martin Fowler: [Harness engineering for coding agent users](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)

---

## 1. ハーネスエンジニアリングとは何か

> **Harness Engineering**: AIエージェントを取り囲むシステム・制約・フィードバックループを設計するディシプリン。エージェントが本番環境で「信頼できる仕事」をするための環境設計の総称。

ハーネス（harness）は元来「馬具」の意。手綱・鞍・引き具をかけ、走らせる方向を与えるニュアンスがある。コーディングエージェントに対して、

- どこを走らせるか（**スコープと制約**）
- 何を見せるか（**コンテキストとツール**）
- 何をフィードバックするか（**評価とテレメトリ**）

を設計する作業がハーネスエンジニアリングである。

### 何が変わったのか

Codex の事例が示したのは「**規律の重心がコード作者からエンバイロンメント設計者へ移った**」という事実である。OpenAI 内部では 5 ヶ月で約 100 万行のプロダクトベータを「人間が 1 行も書かずに」リリースしたと公言されている。エンジニアの主な仕事は次のように再定義された:

> The primary job of the engineering team became **enabling the agents to do useful work**.

つまり「コードを書く」から「エージェントが有用な仕事をできるよう環境を整える」へ。これはアジャイル開発における役割分担の前提を覆す変化であり、本プロジェクト（AIPO によるオーケストレーション）の根底ともつながる。

---

## 2. Codex 流ハーネスエンジニアリングの中核原則

OpenAI が共有した実践知を整理する。

### 2.1 Depth-First に分解する

大きなゴールを **設計 → コード → レビュー → テスト** の小さな building block に分割し、まずブロック自体をエージェントに作らせる。そのブロックを使ってより複雑なタスクをアンロックしていく。

> Working depth-first: breaking down larger goals into smaller building blocks, prompting the agent to construct those blocks, and using them to unlock more complex tasks.

→ 本プロジェクトにおける Phase 0 〜 6 の段階的プロセスと相同。

### 2.2 コンテキストは「組織化して露出する」

エージェントに渡すコンテキストは、**新人を onboard するように** 整理して見せる。「ad-hoc な指示で押し潰す」のではなく、プロダクト原則・エンジニアリング規範・チーム文化として整理する。

→ `AGENTS.md` / `CLAUDE.md` / `.claude/agents/*.md` がこの役割を果たす。

### 2.3 **不変条件（invariants）を強制し、実装は micromanage しない**

ルール例:

- 「データ形状はバウンダリで必ず parse する」 → invariants
- 「Zod を使え」とまでは言わない → 実装はモデルに任せる

実際 Codex は自然と Zod に収束した。**ルールは「何が真でなければならないか」を定義し、実装手段はモデルに委ねる**。

### 2.4 **Golden Principles をリポジトリに encode する**

リポジトリ内に「黄金原則」を文書化し、

1. **Recurring Codex タスク** がそれを定期スキャン
2. 逸脱を検出
3. quality grade を更新
4. **ターゲットを絞ったリファクタリング PR を自動で開く**

これがエントロピー管理（コードベースの腐敗を防ぐ）の中核である。

→ 本プロジェクトでも、`.claude/agents/aipo.md` の「行動原則」セクションがこれに該当する。今後は **品質グレードの自動採点 + リファクタ PR 自動生成** を実装することが現実的な発展系。

### 2.5 統一ハーネスでサーフェスを横断する

Codex CLI、Codex Web、Codex IDE 拡張、Codex macOS App は **すべて同じ Codex Harness（agent loop + logic）** で動いている。違いは「フロントエンド」だけ。サーフェスごとに agent loop を再実装するのではなく、**1 つの harness を JSON-RPC（Codex App Server）で embedding する** という方針。

→ 本プロジェクトでも、AIPO の Phase プロセスは「harness」、各エージェント（AI PM/PD/Dev）は「subagent」として **1 つの統一プロセスで複数サーフェスを動かす** モデルに発展できる。

---

## 3. 観測可能性（Observability）こそハーネスの中核

### 3.1 「Closing the loop」という考え方

Datadog や Arize, Langchain らの言説で繰り返されるパターン:

```
agent generates code
    ↓
harness verifies (lint, type, test)
    ↓
production telemetry validates (metrics, logs, traces)
    ↓
if wrong → feedback updates harness
    ↓
agent retries
```

**「Production テレメトリが検証パイプラインに戻り、modeled behavior と real-world execution の差分を表面化する」** ことが、ハーネス改善の唯一のスケーラブルな手段。

### 3.2 Codex の観測可能性スタック

OpenAI 内部では:

- ローカル observability stack を Codex に露出
- エージェントが **LogQL でログクエリ** / **PromQL でメトリクスクエリ** を直接実行可能
- 失敗時に自分でログを見て自分で原因を特定する設計

→ 「人間が監視ダッシュボードを見て直す」から「**エージェントがダッシュボードのクエリ言語を操作して直す**」へ。

### 3.3 Trace が一次信号になる

> Traces become the primary signal for understanding failure modes at scale.

エージェントが失敗するパターンの典型:

1. **Reasoning errors** — 推論を間違えた
2. **Not following instructions** — 指示を読まなかった
3. **Missing testing/verification** — テストを書き忘れた
4. **Running out of time** — タイムアウト

これらは「結果のコード」を見ても分からない。**Trajectory（軌跡）= trace を見る** ことで初めて根本原因にたどり着ける。

---

## 4. Chrome DevTools MCP — エージェントに「ブラウザの目」を与える

### 4.1 何ができるか

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) は、コーディングエージェントから **生きた Chrome インスタンス** を制御・検査するための MCP サーバー。約 29 のツールを提供する。

| カテゴリ | 主なツール | 用途 |
|---|---|---|
| Performance | `performance_start_trace`, `performance_analyze` | パフォーマンストレース取得・解析、CrUX API 連携 |
| Network | `network_get_requests`, `network_get_response` | ネットワーク要求の検査・解析 |
| Console | `console_get_messages` | **ソースマップ付きスタックトレース** を含むコンソールログ取得 |
| Debugging | `evaluate_script`, `take_snapshot`, `take_screenshot` | JS 実行・DOM スナップショット・スクショ |
| Input | `click`, `fill`, `drag`, `upload_file` 等 9 種 | 入力自動化 |
| Navigation | `new_page`, `navigate`, `wait_for` 等 6 種 | ページ遷移制御 |
| Emulation | デバイスエミュレーション | モバイル検証 |

### 4.2 なぜハーネスにとって重要か

OpenAI が Chrome DevTools Protocol を agent runtime に統合した理由:

> The Chrome DevTools Protocol integration allowed Codex to **reproduce bugs by driving the UI directly**, **validate fixes by observing post-fix application state**, and **reason about UI behavior from runtime events**.

つまり、

1. **バグ再現を agent 自身ができる** — 「再現手順を教えてください」が不要に
2. **修正の検証を agent 自身ができる** — fix した後の状態を観測して「治った」ことを確認
3. **UI 挙動を runtime イベントから推論できる** — DOM スナップショットだけでなく、実際のイベントログから判断

これは「テキストで書かれたバグレポート」をパースする世界から、「**ブラウザを実際に操作して状態を観測する**」世界への移行である。

### 4.3 ソースマップ付きスタックトレースの威力

Chrome DevTools の console_get_messages は、minify/transpile 後のコードのスタックトレースを **ソースマップで元のソースに解決した形** で返す。

これがなぜ重要か:

- ビルド後の `chunk.abc123.js:1:5829` は人間にもエージェントにも解読不能
- ソースマップで `src/components/Cart.tsx:42:8` まで戻れば、エージェントは即座に該当ファイルを Read して原因を特定できる
- スタックトレース全段（**フルスタックトレース**）が取れるため、呼び出し元から呼び出し先まで一気通貫で因果を追える

→ 「フルスタックトレースで評価する」というのは、エージェントが提示した修正が **本当にそのコードパスを通るのか** を、実行時の trace で裏付けるという意味。テストグリーンだけでは弱く、実際の trace でカバレッジと因果を確認するのが harness としての強度の差になる。

---

## 5. 評価（Eval）—— harness の強度を測る

### 5.1 Eval は「コードのテスト」ではなく「harness のテスト」

伝統的な単体テストは「コードが正しいか」を測る。Eval は「**harness が機能した結果、エージェントが正しく振る舞ったか**」を測る。違うレイヤーの活動である。

### 5.2 評価ベンチマーク

代表的なもの:

- **SWE-bench** — 実際の GitHub issue を解けるか
- **WebArena / OSWorld** — ブラウザ・OS 上のタスクを完遂できるか
- **HumanEval / MBPP** — 関数レベルのコード生成

これらはハーネス改善のための「**測定機**」。改善 → 計測 → 改善のサイクルを回す。

### 5.3 Trace Grading

各 trace（agent の trajectory）に対してスコアを付け、

- どこで詰まったか
- どのツール呼び出しが冗長か
- どの推論が間違っていたか

を分類していく作業が trace grading。これが harness 改善のフィードバックループの入口になる。

### 5.4 Shadow Evaluation

本番と同じ workload を staging に流し、harness のバージョン違いで挙動を比較する。本番の failure を再現せずとも改善効果が測れる。

---

## 6. 本プロジェクトとの接続

本プロジェクト（AIPO オーケストレーション）の現状を harness engineering の観点で評価する。

| Codex のプラクティス | 本プロジェクトの現状 | ギャップ |
|---|---|---|
| Depth-first 分解 | Phase 0〜6 で実装済み | OK |
| コンテキストを onboarding 形式で組織化 | `.claude/agents/*.md` に実装 | OK |
| Invariants 強制 | AIPO 行動原則・コミット規約あり | 自動チェックがない |
| Golden Principles の自動 scan + リファクタ PR | なし | **未実装** |
| 統一 harness × 複数サーフェス | Claude Code 単一サーフェス | 未対応 |
| Observability → エージェントが直接クエリ | hooks で discussion log のみ | **テレメトリ不足** |
| Chrome DevTools MCP | 未導入 | **未導入** |
| Trace grading / Eval | 未導入 | **未導入** |
| Shadow evaluation | 未導入 | 未導入 |

→ 本プロジェクトでは **次に手を入れるべきは Observability（テレメトリ） + Chrome DevTools MCP + Eval** であることが明確になる。

---

## 7. 学びの要点

1. **エンジニアの仕事は「コードを書く」から「環境を設計する」へ移った**
2. **ハーネスは context, constraints, feedback loops の三位一体**
3. **Invariants を定義し、実装は委ねる** — 何が真であるべきかを書く、書き方は書かない
4. **Trace が一次信号** — 結果のコードではなく、そこに至る軌跡を読む
5. **Chrome DevTools MCP は「ブラウザの目」をエージェントに与える** — バグ再現・修正検証・UI 推論のループを閉じる
6. **Observability スタックをエージェントから直接叩けるようにする** — LogQL/PromQL を agent に握らせる
7. **Golden principles を encode して自動 scan する** — エントロピーは放置すると勝手に増える
8. **Eval は harness のテストである** — コードのテストとは別レイヤーで計測する

---

## 8. 次のアクション

ハーネスエンジニアリングを「読んで分かる」段階から「**手を動かして体得する**」段階へ進むための実践企画を `docs/harness-engineering-experience-plan.md` にまとめた。Chrome DevTools MCP の導入とフルスタックトレースを使った評価を中心に、自分の手でループを 1 周回す内容になっている。
