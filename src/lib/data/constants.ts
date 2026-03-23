import type { Phase, Status } from "./types";

export const VALID_PHASES: readonly Phase[] = [
  "insight-extraction",
  "value-definition",
  "story-definition",
  "technical-design",
  "implementation",
  "delivery",
] as const;

export const VALID_STATUSES: readonly Status[] = [
  "in-progress",
  "awaiting-review",
  "completed",
  "on-hold",
] as const;

export const PHASE_DISPLAY_NAMES: Record<Phase, string> = {
  "insight-extraction": "インサイト抽出",
  "value-definition": "価値定義",
  "story-definition": "Story策定",
  "technical-design": "技術設計",
  implementation: "実装",
  delivery: "デリバリー",
};

export const STATUS_DISPLAY_NAMES: Record<Status, string> = {
  "in-progress": "進行中",
  "awaiting-review": "確認待ち",
  completed: "完了",
  "on-hold": "保留",
};

export const DECISIONS_DIR = "docs/decisions";
export const THEME_REGISTRY_FILE = "theme-registry.md";

export const REQUIRED_FRONTMATTER_FIELDS = [
  "theme_id",
  "title",
  "phase",
  "status",
  "source",
  "created_at",
  "updated_at",
  "next_action",
  "awaiting_review",
  "participants",
] as const;
