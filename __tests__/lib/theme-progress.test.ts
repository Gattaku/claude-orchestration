import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Phase, Status } from "@/lib/data/types";
import {
  validateThemeProgressInput,
  type UpdateThemeProgressInput,
} from "@/lib/data/themes";

describe("validateThemeProgressInput", () => {
  const validInput: UpdateThemeProgressInput = {
    theme_id: "TH-001",
    phase: "implementation" as Phase,
    status: "in-progress" as Status,
  };

  it("returns null for valid input without next_action", () => {
    expect(validateThemeProgressInput(validInput)).toBeNull();
  });

  it("returns null for valid input with next_action", () => {
    expect(
      validateThemeProgressInput({
        ...validInput,
        next_action: "AI Devに実装を依頼",
      }),
    ).toBeNull();
  });

  it("returns error for empty theme_id", () => {
    const result = validateThemeProgressInput({ ...validInput, theme_id: "" });
    expect(result).toContain("theme_id");
  });

  it("returns error for invalid theme_id format", () => {
    const result = validateThemeProgressInput({
      ...validInput,
      theme_id: "INVALID",
    });
    expect(result).toContain("TH-NNN");
  });

  it("returns error for theme_id with wrong digit count", () => {
    const result = validateThemeProgressInput({
      ...validInput,
      theme_id: "TH-01",
    });
    expect(result).toContain("TH-NNN");
  });

  it("returns error for invalid phase", () => {
    const result = validateThemeProgressInput({
      ...validInput,
      phase: "invalid-phase" as Phase,
    });
    expect(result).toContain("phase");
  });

  it("accepts all valid phases", () => {
    const validPhases: Phase[] = [
      "triage",
      "insight-extraction",
      "value-definition",
      "story-definition",
      "technical-design",
      "implementation",
      "delivery",
    ];
    for (const phase of validPhases) {
      expect(
        validateThemeProgressInput({ ...validInput, phase }),
      ).toBeNull();
    }
  });

  it("returns error for invalid status", () => {
    const result = validateThemeProgressInput({
      ...validInput,
      status: "invalid-status" as Status,
    });
    expect(result).toContain("status");
  });

  it("accepts all valid statuses", () => {
    const validStatuses: Status[] = [
      "in-progress",
      "awaiting-review",
      "completed",
      "on-hold",
    ];
    for (const status of validStatuses) {
      expect(
        validateThemeProgressInput({ ...validInput, status }),
      ).toBeNull();
    }
  });

  it("returns error for empty next_action string", () => {
    const result = validateThemeProgressInput({
      ...validInput,
      next_action: "",
    });
    expect(result).toContain("next_action");
  });
});

// Use vi.hoisted so that mock fns are available inside vi.mock factory
const { mockFrom, mockUpdate, mockEq } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

vi.mock("@/lib/supabase/static", () => ({
  createStaticSupabaseClient: vi.fn().mockReturnValue(null),
}));

describe("updateThemeProgress", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws on invalid input", async () => {
    const { updateThemeProgress } = await import("@/lib/data/themes");

    await expect(
      updateThemeProgress({
        theme_id: "INVALID",
        phase: "implementation",
        status: "in-progress",
      }),
    ).rejects.toThrow("Validation failed");
  });

  it("updates themes table with phase and status", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "themes") {
        return {
          update: (data: Record<string, unknown>) => {
            mockUpdate(data);
            return {
              eq: (_col: string, _val: string) => {
                mockEq(_col, _val);
                return { error: null };
              },
            };
          },
        };
      }
      return {};
    });

    const { updateThemeProgress } = await import("@/lib/data/themes");

    await updateThemeProgress({
      theme_id: "TH-001",
      phase: "implementation",
      status: "in-progress",
    });

    expect(mockFrom).toHaveBeenCalledWith("themes");
    expect(mockUpdate).toHaveBeenCalledWith({
      current_phase: "implementation",
      current_status: "in-progress",
    });
    expect(mockEq).toHaveBeenCalledWith("theme_id", "TH-001");
  });

  it("updates theme_decisions next_action when provided", async () => {
    const updatedTables: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      updatedTables.push(table);
      if (table === "themes") {
        return {
          update: () => ({
            eq: () => ({ error: null }),
          }),
        };
      }
      if (table === "theme_decisions") {
        return {
          update: (data: Record<string, unknown>) => {
            mockUpdate(data);
            return {
              eq: (_col: string, _val: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  error: null,
                }),
              }),
            };
          },
        };
      }
      return {};
    });

    const { updateThemeProgress } = await import("@/lib/data/themes");

    await updateThemeProgress({
      theme_id: "TH-001",
      phase: "implementation",
      status: "in-progress",
      next_action: "AI Devに実装を依頼",
    });

    expect(updatedTables).toContain("themes");
    expect(updatedTables).toContain("theme_decisions");
    expect(mockUpdate).toHaveBeenCalledWith({
      next_action: "AI Devに実装を依頼",
    });
  });

  it("does not update theme_decisions when next_action is not provided", async () => {
    const updatedTables: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      updatedTables.push(table);
      if (table === "themes") {
        return {
          update: () => ({
            eq: () => ({ error: null }),
          }),
        };
      }
      return {};
    });

    const { updateThemeProgress } = await import("@/lib/data/themes");

    await updateThemeProgress({
      theme_id: "TH-001",
      phase: "implementation",
      status: "in-progress",
    });

    expect(updatedTables).not.toContain("theme_decisions");
  });

  it("throws when themes update fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "themes") {
        return {
          update: () => ({
            eq: () => ({ error: { message: "DB error" } }),
          }),
        };
      }
      return {};
    });

    const { updateThemeProgress } = await import("@/lib/data/themes");

    await expect(
      updateThemeProgress({
        theme_id: "TH-001",
        phase: "implementation",
        status: "in-progress",
      }),
    ).rejects.toThrow("Failed to update theme progress");
  });

  it("throws when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { updateThemeProgress } = await import("@/lib/data/themes");

    await expect(
      updateThemeProgress({
        theme_id: "TH-001",
        phase: "implementation",
        status: "in-progress",
      }),
    ).rejects.toThrow("Supabase environment variables are not configured");
  });
});
