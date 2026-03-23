import { Badge } from "@/components/ui/badge";
import type { DiscussionLog } from "@/lib/data/types";

interface DiscussionLogEntryProps {
  log: DiscussionLog;
}

const AGENT_COLORS: Record<string, string> = {
  AIPO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "AI PM": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "AI PD": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "AI Dev": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

export function DiscussionLogEntry({ log }: DiscussionLogEntryProps) {
  const isResponse = log.direction === "response";
  const colorClass = AGENT_COLORS[log.agent_role] ?? "bg-gray-100 text-gray-800";

  return (
    <div
      data-slot="discussion-log-entry"
      className={`flex flex-col gap-1 ${isResponse ? "items-end" : "items-start"}`}
    >
      <div className="flex items-center gap-2">
        <Badge className={`text-[11px] px-1.5 py-0 ${colorClass}`}>
          {log.agent_role}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {log.direction === "request" ? "→" : "←"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatTimestamp(log.created_at)}
        </span>
      </div>
      <div
        className={`rounded-lg border px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
          isResponse
            ? "bg-muted/50 border-muted"
            : "bg-card border-border"
        }`}
      >
        {log.message}
      </div>
    </div>
  );
}
