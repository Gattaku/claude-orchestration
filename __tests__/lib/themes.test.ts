import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ThemeDecision } from "@/lib/data/types";

// Mock the Supabase server client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/static", () => ({
  createStaticSupabaseClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("themes facade (Supabase)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset mock chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  const mockDecisionRows: Omit<ThemeDecision, "created_at" | "updated_at"> &
    { created_at: string; updated_at: string }[] = [
    {
      theme_id: "TH-001",
      title: "Theme 1",
      phase: "insight-extraction",
      status: "completed",
      source: "source-1",
      created_at: "2026-03-18T10:00:00+00:00",
      updated_at: "2026-03-20T10:00:00+00:00",
      next_action: "Next step",
      awaiting_review: "",
      participants: ["AIPO"],
      body_html: "<p>content 1</p>",
    },
    {
      theme_id: "TH-001",
      title: "Theme 1",
      phase: "value-definition",
      status: "in-progress",
      source: "source-2",
      created_at: "2026-03-19T10:00:00+00:00",
      updated_at: "2026-03-22T10:00:00+00:00",
      next_action: "Next step 2",
      awaiting_review: "",
      participants: ["AIPO", "AI PM"],
      body_html: "<p>content 2</p>",
    },
    {
      theme_id: "TH-002",
      title: "Theme 2",
      phase: "insight-extraction",
      status: "awaiting-review",
      source: "source-3",
      created_at: "2026-03-20T10:00:00+00:00",
      updated_at: "2026-03-21T10:00:00+00:00",
      next_action: "Review",
      awaiting_review: "AI PM",
      participants: ["AIPO"],
      body_html: "<p>content 3</p>",
    },
  ];

  function setupThemesMock(
    themesData: { theme_id: string }[] | null,
    themesError: { message: string } | null,
    decisionsMap: Record<string, typeof mockDecisionRows>,
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "themes") {
        return {
          select: () => ({
            data: themesData,
            error: themesError,
          }),
        };
      }
      if (table === "theme_decisions") {
        return {
          select: () => ({
            eq: (_col: string, themeId: string) => ({
              data: decisionsMap[themeId] || [],
              error: null,
            }),
          }),
        };
      }
      return { select: () => ({ data: null, error: null }) };
    });
  }

  it("getAllThemes returns themes built from Supabase data", async () => {
    setupThemesMock(
      [{ theme_id: "TH-001" }, { theme_id: "TH-002" }],
      null,
      {
        "TH-001": [mockDecisionRows[0], mockDecisionRows[1]],
        "TH-002": [mockDecisionRows[2]],
      },
    );

    const { getAllThemes } = await import("@/lib/data/themes");
    const results = await getAllThemes();

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === "theme")).toBe(true);

    const theme1 = results.find(
      (r) => r.type === "theme" && r.data.theme_id === "TH-001",
    );
    expect(theme1).toBeDefined();
    if (theme1?.type === "theme") {
      expect(theme1.data.title).toBe("Theme 1");
      expect(theme1.data.current_phase).toBe("value-definition");
      expect(theme1.data.current_status).toBe("in-progress");
      expect(theme1.data.decisions).toHaveLength(2);
      expect(theme1.data.phases).toHaveLength(2);
      // Verify date conversion to YYYY-MM-DD
      expect(theme1.data.decisions[0].created_at).toBe("2026-03-18");
      expect(theme1.data.decisions[0].updated_at).toBe("2026-03-20");
    }

    const theme2 = results.find(
      (r) => r.type === "theme" && r.data.theme_id === "TH-002",
    );
    expect(theme2).toBeDefined();
    if (theme2?.type === "theme") {
      expect(theme2.data.current_phase).toBe("insight-extraction");
      expect(theme2.data.current_status).toBe("awaiting-review");
    }
  });

  it("getAllThemes returns error when Supabase query fails", async () => {
    setupThemesMock(null, { message: "Connection error" }, {});

    const { getAllThemes } = await import("@/lib/data/themes");
    const results = await getAllThemes();

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("error");
    if (results[0].type === "error") {
      expect(results[0].error.error_message).toContain("Connection error");
    }
  });

  it("getAllThemes skips themes with no decisions", async () => {
    setupThemesMock(
      [{ theme_id: "TH-001" }, { theme_id: "TH-EMPTY" }],
      null,
      {
        "TH-001": [mockDecisionRows[0]],
        "TH-EMPTY": [],
      },
    );

    const { getAllThemes } = await import("@/lib/data/themes");
    const results = await getAllThemes();

    // TH-EMPTY has no decisions, should be skipped (or handled gracefully)
    const themes = results.filter((r) => r.type === "theme");
    expect(themes).toHaveLength(1);
    if (themes[0].type === "theme") {
      expect(themes[0].data.theme_id).toBe("TH-001");
    }
  });

  it("getThemeById returns the correct theme", async () => {
    setupThemesMock(
      [{ theme_id: "TH-001" }, { theme_id: "TH-002" }],
      null,
      {
        "TH-001": [mockDecisionRows[0], mockDecisionRows[1]],
        "TH-002": [mockDecisionRows[2]],
      },
    );

    const { getThemeById } = await import("@/lib/data/themes");
    const theme = await getThemeById("TH-001");

    expect(theme).toBeDefined();
    expect(theme!.theme_id).toBe("TH-001");
    expect(theme!.current_phase).toBe("value-definition");
  });

  it("getThemeById returns null for non-existent theme", async () => {
    setupThemesMock(
      [{ theme_id: "TH-001" }],
      null,
      {
        "TH-001": [mockDecisionRows[0]],
      },
    );

    const { getThemeById } = await import("@/lib/data/themes");
    const theme = await getThemeById("TH-999");

    expect(theme).toBeNull();
  });

  it("getAwaitingReviewThemes returns only awaiting-review themes", async () => {
    setupThemesMock(
      [{ theme_id: "TH-001" }, { theme_id: "TH-002" }],
      null,
      {
        "TH-001": [mockDecisionRows[0], mockDecisionRows[1]],
        "TH-002": [mockDecisionRows[2]],
      },
    );

    const { getAwaitingReviewThemes } = await import("@/lib/data/themes");
    const themes = await getAwaitingReviewThemes();

    expect(themes).toHaveLength(1);
    expect(themes[0].theme_id).toBe("TH-002");
    expect(themes[0].current_status).toBe("awaiting-review");
  });
});
