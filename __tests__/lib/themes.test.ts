import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Theme, ThemeOrError } from "@/lib/data/types";

// Mock the parser module
vi.mock("@/lib/data/parser", () => ({
  parseMarkdownFiles: vi.fn(),
}));

describe("themes facade", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const mockTheme1: Theme = {
    theme_id: "TH-001",
    title: "Theme 1",
    current_phase: "value-definition",
    current_status: "in-progress",
    decisions: [],
    phases: [
      {
        phase: "insight-extraction",
        status: "completed",
        updated_at: "2026-03-20",
      },
      {
        phase: "value-definition",
        status: "in-progress",
        updated_at: "2026-03-22",
      },
    ],
  };

  const mockTheme2: Theme = {
    theme_id: "TH-002",
    title: "Theme 2",
    current_phase: "insight-extraction",
    current_status: "awaiting-review",
    decisions: [],
    phases: [
      {
        phase: "insight-extraction",
        status: "awaiting-review",
        updated_at: "2026-03-21",
      },
    ],
  };

  const mockResults: ThemeOrError[] = [
    { type: "theme", data: mockTheme1 },
    { type: "theme", data: mockTheme2 },
    {
      type: "error",
      error: { file_path: "broken.md", error_message: "Parse error" },
    },
  ];

  async function setupMock() {
    const { parseMarkdownFiles } = await import("@/lib/data/parser");
    vi.mocked(parseMarkdownFiles).mockResolvedValue(mockResults);
    return import("@/lib/data/themes");
  }

  it("getAllThemes returns all themes and errors", async () => {
    const { getAllThemes } = await setupMock();
    const results = await getAllThemes();
    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.type === "theme")).toHaveLength(2);
    expect(results.filter((r) => r.type === "error")).toHaveLength(1);
  });

  it("getThemeById returns the correct theme", async () => {
    const { getThemeById } = await setupMock();
    const theme = await getThemeById("TH-001");
    expect(theme).toBeDefined();
    expect(theme!.theme_id).toBe("TH-001");
  });

  it("getThemeById returns null for non-existent theme", async () => {
    const { getThemeById } = await setupMock();
    const theme = await getThemeById("TH-999");
    expect(theme).toBeNull();
  });

  it("getAwaitingReviewThemes returns only awaiting-review themes", async () => {
    const { getAwaitingReviewThemes } = await setupMock();
    const themes = await getAwaitingReviewThemes();
    expect(themes).toHaveLength(1);
    expect(themes[0].theme_id).toBe("TH-002");
  });
});
