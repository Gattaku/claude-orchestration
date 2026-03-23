import Link from "next/link";
import type { Theme } from "@/lib/data/types";

interface AwaitingReviewBannerProps {
  themes: Theme[];
  isAuthenticated?: boolean;
}

export function AwaitingReviewBanner({
  themes,
  isAuthenticated = false,
}: AwaitingReviewBannerProps) {
  if (themes.length === 0) {
    return null;
  }

  return (
    <div
      className="border-l-4 rounded-r-md px-4 py-3"
      style={{
        borderColor: "var(--status-awaiting)",
        backgroundColor:
          "color-mix(in srgb, var(--status-awaiting) 10%, transparent)",
      }}
    >
      <p className="text-sm font-medium text-foreground">
        {themes.length} 件のテーマが確認待ちです
      </p>
      <ul className="mt-1 space-y-0.5">
        {themes.map((theme) => (
          <li key={theme.theme_id} className="text-sm text-muted-foreground">
            {isAuthenticated ? (
              <Link
                href={`/themes/${theme.theme_id}`}
                className="hover:text-foreground underline transition-colors"
              >
                {theme.title}
              </Link>
            ) : (
              theme.title
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
