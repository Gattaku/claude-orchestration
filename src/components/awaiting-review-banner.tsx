import type { Theme } from "@/lib/data/types";

interface AwaitingReviewBannerProps {
  themes: Theme[];
}

export function AwaitingReviewBanner({ themes }: AwaitingReviewBannerProps) {
  if (themes.length === 0) {
    return null;
  }

  return (
    <div
      className="border-l-4 rounded-r-md px-4 py-3"
      style={{
        borderColor: "var(--status-awaiting)",
        backgroundColor: "color-mix(in srgb, var(--status-awaiting) 10%, transparent)",
      }}
    >
      <p className="text-sm font-medium text-foreground">
        {themes.length} 件のテーマが確認待ちです
      </p>
      <ul className="mt-1 space-y-0.5">
        {themes.map((theme) => (
          <li key={theme.theme_id} className="text-sm text-muted-foreground">
            {theme.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
