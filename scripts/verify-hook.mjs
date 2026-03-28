#!/usr/bin/env node
/**
 * verify-hook.mjs — log-discussion.mjs の動作を検証するスクリプト
 *
 * 使い方:
 *   node scripts/verify-hook.mjs            # 全チェック実行
 *   node scripts/verify-hook.mjs --dry-run  # Supabase INSERT は行わない
 *
 * チェック項目:
 *   1. 環境変数の取得（process.env / .env.local / .env）
 *   2. Supabase REST API への接続
 *   3. themes テーブルへの UPSERT
 *   4. discussion_logs テーブルへの INSERT
 *   5. hook の stdin パース（シミュレーション）
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const HOOK_PATH = resolve(PROJECT_ROOT, ".claude/hooks/log-discussion.mjs");

const dryRun = process.argv.includes("--dry-run");

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     ${detail}`);
}

// ---------------------------------------------------------------------------
// 1. env helpers (copied from hook to test independently)
// ---------------------------------------------------------------------------

function loadEnvFile() {
  const envVars = {};
  for (const fileName of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, fileName), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!envVars[key]) envVars[key] = value;
      }
    } catch {
      // skip
    }
  }
  return envVars;
}

function getEnvVar(key, fileEnv) {
  return process.env[key] || fileEnv[key] || "";
}

// ---------------------------------------------------------------------------
// Check 1: Environment variables
// ---------------------------------------------------------------------------

console.log("\n[1/5] 環境変数チェック");
const fileEnv = loadEnvFile();
const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", fileEnv);
const serviceRoleKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY", fileEnv);

if (supabaseUrl) {
  const source = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "process.env"
    : ".env file";
  ok(`NEXT_PUBLIC_SUPABASE_URL found (${source}): ${supabaseUrl.slice(0, 40)}...`);
} else {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL MISSING",
    "Set in process.env, .env.local, or .env"
  );
}

if (serviceRoleKey) {
  const source = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "process.env"
    : ".env file";
  ok(`SUPABASE_SERVICE_ROLE_KEY found (${source}): ${serviceRoleKey.slice(0, 10)}...`);
} else {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY MISSING",
    "Set in process.env, .env.local, or .env"
  );
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log(
    "\n⚠️  環境変数が不足しているため、Supabase接続テストをスキップします。"
  );
  console.log(
    "   .env.local を作成するか、環境変数を export してください。\n"
  );
  summary();
  process.exit(failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Check 2: Supabase connectivity
// ---------------------------------------------------------------------------

console.log("\n[2/5] Supabase接続チェック");
try {
  const res = await fetch(`${supabaseUrl}/rest/v1/themes?select=theme_id&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (res.ok) {
    const data = await res.json();
    ok(`REST API接続成功 (themes count sample: ${data.length} rows)`);
  } else {
    const body = await res.text();
    fail(`REST API接続失敗 (${res.status})`, body);
  }
} catch (err) {
  fail("REST API接続エラー", err.message);
}

// ---------------------------------------------------------------------------
// Check 3: themes UPSERT (ensureThemeExists)
// ---------------------------------------------------------------------------

console.log("\n[3/5] themes UPSERT チェック (TH-000 テスト用)");
const TEST_THEME_ID = "TH-000";
if (!dryRun) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/themes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        theme_id: TEST_THEME_ID,
        title: `Verify Hook Test ${new Date().toISOString()}`,
      }),
    });
    if (res.ok || res.status === 201) {
      ok("ensureThemeExists 成功 (TH-000 UPSERT OK)");
    } else {
      const body = await res.text();
      fail(`themes UPSERT失敗 (${res.status})`, body);
    }
  } catch (err) {
    fail("themes UPSERT エラー", err.message);
  }
} else {
  ok("(dry-run) themes UPSERT スキップ");
}

// ---------------------------------------------------------------------------
// Check 4: discussion_logs INSERT
// ---------------------------------------------------------------------------

console.log("\n[4/5] discussion_logs INSERT チェック");
if (!dryRun) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/discussion_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        theme_id: TEST_THEME_ID,
        agent_role: "AIPO",
        direction: "request",
        message: "[verify-hook] テスト投稿 " + new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      ok(`discussion_logs INSERT成功 (id: ${data[0]?.id})`);

      // クリーンアップ: テスト行を削除
      await fetch(
        `${supabaseUrl}/rest/v1/discussion_logs?id=eq.${data[0]?.id}`,
        {
          method: "DELETE",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      console.log("     (テスト行を削除済み)");
    } else {
      const body = await res.text();
      fail(`discussion_logs INSERT失敗 (${res.status})`, body);
    }
  } catch (err) {
    fail("discussion_logs INSERT エラー", err.message);
  }
} else {
  ok("(dry-run) discussion_logs INSERT スキップ");
}

// ---------------------------------------------------------------------------
// Check 5: Hook stdin simulation
// ---------------------------------------------------------------------------

console.log("\n[5/5] Hook stdinシミュレーション");
const simulatedInput = JSON.stringify({
  session_id: "verify-test",
  tool_name: "Agent",
  tool_input: {
    subagent_type: "ai-pm",
    prompt: `${TEST_THEME_ID}: verify-hook テスト呼び出し`,
    description: "テスト",
  },
  tool_response: "テストレスポンス: hookが正常に動作しています",
});

try {
  const result = await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("node", [HOOK_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      cwd: PROJECT_ROOT,
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolvePromise({ code, stderr });
    });

    child.on("error", (err) => {
      rejectPromise(err);
    });

    child.stdin.write(simulatedInput);
    child.stdin.end();
  });

  console.log("     Hook stderr output:");
  for (const line of result.stderr.split("\n").filter(Boolean)) {
    console.log(`       ${line}`);
  }

  if (result.code === 0) {
    // stderrの内容を分析して成功/失敗を判定
    if (result.stderr.includes("Logged request") && result.stderr.includes("Logged response")) {
      ok("Hook実行成功: request + response ログ記録確認");
    } else if (result.stderr.includes("env vars not found")) {
      fail("Hook実行: 環境変数が見つからない", "process.envに設定されているか確認");
    } else if (result.stderr.includes("Done successfully")) {
      ok("Hook実行成功 (exit 0)");
    } else {
      fail("Hook実行: exit 0 だが期待するログが出力されていない", result.stderr.trim());
    }
  } else {
    fail(`Hook実行失敗 (exit code: ${result.code})`, result.stderr.trim());
  }
} catch (err) {
  fail("Hook起動エラー", err.message);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function summary() {
  console.log("\n" + "=".repeat(50));
  console.log(`結果: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("🎉 全チェックOK — hookは正常に動作します");
  } else {
    console.log("⚠️  問題が見つかりました。上記のエラーを確認してください。");
  }
  console.log("=".repeat(50) + "\n");
}

summary();
process.exit(failed > 0 ? 1 : 0);
