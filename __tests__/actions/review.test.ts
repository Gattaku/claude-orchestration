import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("review server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { email: "reviewer@example.com" } },
      error: null,
    });
  });

  function setupThemeLookup(
    data: { theme_id: string; current_status: string } | null,
    error: { message: string } | null = null,
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "themes") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data, error }),
            }),
          }),
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      if (table === "theme_reviews") {
        return {
          insert: (...args: unknown[]) => {
            mockInsert(...args);
            return Promise.resolve({ error: null });
          },
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    });
  }

  describe("approveTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const { approveTheme } = await import("@/app/actions/review");
      const result = await approveTheme("TH-001");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("認証");
      }
    });

    it("returns error when theme does not exist", async () => {
      setupThemeLookup(null);

      const { approveTheme } = await import("@/app/actions/review");
      const result = await approveTheme("TH-999");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("テーマ");
      }
    });

    it("returns error when theme is not awaiting-review", async () => {
      setupThemeLookup({
        theme_id: "TH-001",
        current_status: "in-progress",
      });

      const { approveTheme } = await import("@/app/actions/review");
      const result = await approveTheme("TH-001");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("awaiting-review");
      }
    });

    it("approves a theme successfully", async () => {
      setupThemeLookup({
        theme_id: "TH-001",
        current_status: "awaiting-review",
      });

      const { approveTheme } = await import("@/app/actions/review");
      const result = await approveTheme("TH-001");

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          theme_id: "TH-001",
          action: "approved",
          reviewer_email: "reviewer@example.com",
        }),
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_status: "in-progress",
        }),
      );
    });
  });

  describe("rejectTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const { rejectTheme } = await import("@/app/actions/review");
      const result = await rejectTheme("TH-001");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("認証");
      }
    });

    it("rejects a theme with comment successfully", async () => {
      setupThemeLookup({
        theme_id: "TH-002",
        current_status: "awaiting-review",
      });

      const { rejectTheme } = await import("@/app/actions/review");
      const result = await rejectTheme("TH-002", "もう少し検討が必要です");

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          theme_id: "TH-002",
          action: "rejected",
          reviewer_email: "reviewer@example.com",
          comment: "もう少し検討が必要です",
        }),
      );
    });

    it("returns error when comment exceeds 1000 characters", async () => {
      setupThemeLookup({
        theme_id: "TH-001",
        current_status: "awaiting-review",
      });

      const { rejectTheme } = await import("@/app/actions/review");
      const longComment = "a".repeat(1001);
      const result = await rejectTheme("TH-001", longComment);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("1000");
      }
    });
  });
});
