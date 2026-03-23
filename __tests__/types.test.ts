import { describe, it, expect } from "vitest";
import type { Phase, Status, Theme, ThemeDecision, PhaseInfo, AgentRole, MessageDirection, DiscussionLog } from "@/lib/data/types";

describe("Type definitions", () => {
  it("Phase type accepts valid values", () => {
    const phases: Phase[] = [
      "insight-extraction",
      "value-definition",
      "story-definition",
      "technical-design",
      "implementation",
      "delivery",
    ];
    expect(phases).toHaveLength(6);
  });

  it("Status type accepts valid values", () => {
    const statuses: Status[] = [
      "in-progress",
      "awaiting-review",
      "completed",
      "on-hold",
    ];
    expect(statuses).toHaveLength(4);
  });

  it("ThemeDecision interface has required fields", () => {
    const decision: ThemeDecision = {
      theme_id: "T-001",
      title: "Test Theme",
      phase: "insight-extraction",
      status: "in-progress",
      source: "test",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      next_action: "Review",
      awaiting_review: "AI PO",
      participants: ["AI Dev"],
      body_html: "<p>Test</p>",
    };
    expect(decision.theme_id).toBe("T-001");
  });

  it("PhaseInfo interface has required fields", () => {
    const phaseInfo: PhaseInfo = {
      phase: "technical-design",
      status: "completed",
      updated_at: "2026-01-01",
    };
    expect(phaseInfo.phase).toBe("technical-design");
  });

  it("Theme interface has required fields", () => {
    const theme: Theme = {
      theme_id: "T-001",
      title: "Test Theme",
      current_phase: "implementation",
      current_status: "in-progress",
      decisions: [],
      phases: [],
      discussion_logs: [],
    };
    expect(theme.theme_id).toBe("T-001");
    expect(theme.decisions).toEqual([]);
    expect(theme.discussion_logs).toEqual([]);
  });

  it("AgentRole type accepts valid values", () => {
    const roles: AgentRole[] = ["AIPO", "AI PM", "AI PD", "AI Dev"];
    expect(roles).toHaveLength(4);
  });

  it("MessageDirection type accepts valid values", () => {
    const directions: MessageDirection[] = ["request", "response"];
    expect(directions).toHaveLength(2);
  });

  it("DiscussionLog interface has required fields", () => {
    const log: DiscussionLog = {
      id: "log-1",
      theme_id: "T-001",
      decision_id: null,
      agent_role: "AIPO",
      direction: "request",
      message: "Test message",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(log.agent_role).toBe("AIPO");
    expect(log.direction).toBe("request");
  });
});
