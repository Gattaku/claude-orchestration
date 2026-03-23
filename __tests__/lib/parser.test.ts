import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import {
  parseFrontmatter,
  validateFrontmatter,
  parseMarkdownFiles,
} from "@/lib/data/parser";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

describe("parseFrontmatter", () => {
  it("parses valid frontmatter and returns data + content", () => {
    const result = parseFrontmatter(
      path.join(FIXTURES_DIR, "valid-phase1.md"),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.theme_id).toBe("TH-TEST");
    expect(result.data.title).toBe("テスト用テーマ");
    expect(result.data.phase).toBe("insight-extraction");
    expect(result.data.status).toBe("completed");
    expect(result.data.participants).toEqual(["AIPO", "AI PM"]);
    expect(result.content).toContain("# Phase 1: テスト");
  });

  it("returns error for invalid YAML frontmatter", () => {
    const result = parseFrontmatter(
      path.join(FIXTURES_DIR, "invalid-frontmatter.md"),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBeDefined();
    expect(result.filePath).toContain("invalid-frontmatter.md");
  });
});

describe("validateFrontmatter", () => {
  it("returns success for valid frontmatter data", () => {
    const data = {
      theme_id: "TH-001",
      title: "Test",
      phase: "insight-extraction",
      status: "in-progress",
      source: "test.md",
      created_at: "2026-03-20",
      updated_at: "2026-03-20",
      next_action: "Next",
      awaiting_review: "",
      participants: ["AIPO"],
    };
    const result = validateFrontmatter(data, "test.md");
    expect(result.valid).toBe(true);
  });

  it("returns error for missing required fields", () => {
    const data = {
      theme_id: "TH-001",
      title: "Test",
      phase: "insight-extraction",
    };
    const result = validateFrontmatter(data, "test.md");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("returns error for invalid phase value", () => {
    const data = {
      theme_id: "TH-001",
      title: "Test",
      phase: "nonexistent-phase",
      status: "in-progress",
      source: "test.md",
      created_at: "2026-03-20",
      updated_at: "2026-03-20",
      next_action: "Next",
      awaiting_review: "",
      participants: ["AIPO"],
    };
    const result = validateFrontmatter(data, "test.md");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.includes("phase"))).toBe(true);
  });

  it("returns error for invalid status value", () => {
    const data = {
      theme_id: "TH-001",
      title: "Test",
      phase: "insight-extraction",
      status: "invalid-status",
      source: "test.md",
      created_at: "2026-03-20",
      updated_at: "2026-03-20",
      next_action: "Next",
      awaiting_review: "",
      participants: ["AIPO"],
    };
    const result = validateFrontmatter(data, "test.md");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("accepts awaiting_review as empty string", () => {
    const data = {
      theme_id: "TH-001",
      title: "Test",
      phase: "insight-extraction",
      status: "in-progress",
      source: "test.md",
      created_at: "2026-03-20",
      updated_at: "2026-03-20",
      next_action: "Next",
      awaiting_review: "",
      participants: ["AIPO"],
    };
    const result = validateFrontmatter(data, "test.md");
    expect(result.valid).toBe(true);
  });
});

describe("parseMarkdownFiles", () => {
  it("parses all valid fixture files and groups by theme_id", async () => {
    const results = await parseMarkdownFiles(FIXTURES_DIR);

    // Should have valid themes and possibly errors
    const themes = results.filter((r) => r.type === "theme");
    const errors = results.filter((r) => r.type === "error");

    // TH-TEST should be grouped (valid-phase1.md + valid-phase2.md)
    const testTheme = themes.find(
      (t) => t.type === "theme" && t.data.theme_id === "TH-TEST",
    );
    expect(testTheme).toBeDefined();
    if (testTheme?.type !== "theme") return;
    expect(testTheme.data.decisions).toHaveLength(2);
    // Current phase should be value-definition (latest updated_at: 2026-03-22)
    expect(testTheme.data.current_phase).toBe("value-definition");
    expect(testTheme.data.current_status).toBe("in-progress");
  });

  it("includes parse errors for invalid frontmatter files", async () => {
    const results = await parseMarkdownFiles(FIXTURES_DIR);
    const errors = results.filter((r) => r.type === "error");

    // invalid-frontmatter.md should produce an error
    const invalidFmError = errors.find(
      (e) =>
        e.type === "error" &&
        e.error.file_path.includes("invalid-frontmatter.md"),
    );
    expect(invalidFmError).toBeDefined();
  });

  it("includes validation errors for missing fields", async () => {
    const results = await parseMarkdownFiles(FIXTURES_DIR);
    const errors = results.filter((r) => r.type === "error");

    const missingFieldsError = errors.find(
      (e) =>
        e.type === "error" &&
        e.error.file_path.includes("missing-fields.md"),
    );
    expect(missingFieldsError).toBeDefined();
  });

  it("includes validation errors for invalid phase", async () => {
    const results = await parseMarkdownFiles(FIXTURES_DIR);
    const errors = results.filter((r) => r.type === "error");

    const invalidPhaseError = errors.find(
      (e) =>
        e.type === "error" &&
        e.error.file_path.includes("invalid-phase.md"),
    );
    expect(invalidPhaseError).toBeDefined();
  });

  it("converts markdown body to HTML", async () => {
    const results = await parseMarkdownFiles(FIXTURES_DIR);
    const testTheme = results.find(
      (r) => r.type === "theme" && r.data.theme_id === "TH-TEST",
    );
    expect(testTheme).toBeDefined();
    if (testTheme?.type !== "theme") return;

    const phase2Decision = testTheme.data.decisions.find(
      (d) => d.phase === "value-definition",
    );
    expect(phase2Decision).toBeDefined();
    expect(phase2Decision!.body_html).toContain("<strong>");
    expect(phase2Decision!.body_html).toContain("<code>");
    expect(phase2Decision!.body_html).toContain("<li>");
  });

  it("excludes theme-registry.md", async () => {
    // Create a temporary theme-registry.md in fixtures
    const fs = await import("fs");
    const registryPath = path.join(FIXTURES_DIR, "theme-registry.md");
    fs.writeFileSync(
      registryPath,
      "---\ntheme_id: \"REGISTRY\"\ntitle: \"Registry\"\n---\n# Registry\n",
    );

    try {
      const results = await parseMarkdownFiles(FIXTURES_DIR);
      const hasRegistry = results.some(
        (r) =>
          (r.type === "theme" && r.data.theme_id === "REGISTRY") ||
          (r.type === "error" &&
            r.error.file_path.includes("theme-registry.md")),
      );
      expect(hasRegistry).toBe(false);
    } finally {
      fs.unlinkSync(registryPath);
    }
  });

  it("outputs validation summary to console", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await parseMarkdownFiles(FIXTURES_DIR);

    const summaryCall = consoleSpy.mock.calls.find(
      (call) =>
        typeof call[0] === "string" &&
        (call[0].includes("OK:") || call[0].includes("Warning:")),
    );
    expect(summaryCall).toBeDefined();

    consoleSpy.mockRestore();
  });
});
