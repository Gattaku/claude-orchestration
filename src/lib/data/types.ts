export type Phase =
  | "triage"
  | "insight-extraction"
  | "value-definition"
  | "story-definition"
  | "technical-design"
  | "implementation"
  | "delivery";

export type Status =
  | "in-progress"
  | "awaiting-review"
  | "completed"
  | "on-hold";

export interface ThemeDecision {
  id: string;
  theme_id: string;
  title: string;
  phase: Phase;
  status: Status;
  source: string;
  created_at: string;
  updated_at: string;
  next_action: string;
  awaiting_review: string;
  participants: string[];
  tags?: string[];
  body_html: string;
  input_content?: string | null;
  decisions_summary?: string | null;
}

export type AgentRole = 'AIPO' | 'AI PM' | 'AI PD' | 'AI Dev';
export type MessageDirection = 'request' | 'response';

export interface DiscussionLog {
  id: string;
  theme_id: string;
  decision_id: string | null;
  agent_role: AgentRole;
  direction: MessageDirection;
  message: string;
  created_at: string;
}

export interface PhaseInfo {
  phase: Phase;
  status: Status;
  updated_at: string;
}

export interface Theme {
  theme_id: string;
  title: string;
  current_phase: Phase;
  current_status: Status;
  decisions: ThemeDecision[];
  phases: PhaseInfo[];
  discussion_logs: DiscussionLog[];
}

export interface ParseError {
  file_path: string;
  error_message: string;
}

export type ThemeOrError =
  | { type: "theme"; data: Theme }
  | { type: "error"; error: ParseError };

export type ReviewAction = 'approved' | 'rejected';

export interface ThemeReview {
  id: string;
  theme_id: string;
  decision_id: string | null;
  action: ReviewAction;
  reviewer_email: string;
  comment: string | null;
  created_at: string;
}
