import { EmptyState } from "@/components/empty-state";
import { ThemeCard } from "@/components/theme-card";
import { Card, CardContent } from "@/components/ui/card";
import type { Theme, ThemeOrError } from "@/lib/data/types";

interface ThemeListProps {
  items: ThemeOrError[];
}

function getLatestUpdatedAt(theme: Theme): string {
  if (theme.decisions.length === 0) return "";
  return theme.decisions.reduce((a, b) =>
    a.updated_at >= b.updated_at ? a : b,
  ).updated_at;
}

export function ThemeList({ items }: ThemeListProps) {
  const themes = items.filter(
    (item): item is { type: "theme"; data: Theme } => item.type === "theme",
  );
  const errors = items.filter(
    (item): item is { type: "error"; error: { file_path: string; error_message: string } } =>
      item.type === "error",
  );

  // Sort themes by updated_at descending
  const sortedThemes = [...themes].sort((a, b) => {
    const aDate = getLatestUpdatedAt(a.data);
    const bDate = getLatestUpdatedAt(b.data);
    return bDate.localeCompare(aDate);
  });

  if (sortedThemes.length === 0 && errors.length === 0) {
    return (
      <EmptyState
        title="テーマがありません"
        description="docs/decisions にマークダウンファイルを追加してください。"
      />
    );
  }

  return (
    <div className="space-y-4">
      {errors.map((err) => (
        <Card
          key={err.error.file_path}
          className="border-status-awaiting/50 bg-status-awaiting/5"
        >
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-status-awaiting">
              パースエラー
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {err.error.file_path}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {err.error.error_message}
            </p>
          </CardContent>
        </Card>
      ))}
      {sortedThemes.map((item) => (
        <ThemeCard key={item.data.theme_id} theme={item.data} />
      ))}
    </div>
  );
}
