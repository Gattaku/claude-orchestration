import { Badge } from "@/components/ui/badge";
import { STATUS_DISPLAY_NAMES } from "@/lib/data/constants";
import type { Status } from "@/lib/data/types";

const STATUS_COLOR_CLASSES: Record<Status, string> = {
  "in-progress": "bg-status-active text-white",
  "awaiting-review": "bg-status-awaiting text-white",
  completed: "bg-status-completed text-white",
  "on-hold": "bg-status-on-hold text-white",
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={STATUS_COLOR_CLASSES[status]}>
      {STATUS_DISPLAY_NAMES[status]}
    </Badge>
  );
}
