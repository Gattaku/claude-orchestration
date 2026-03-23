import path from "path";
import { parseMarkdownFiles } from "@/lib/data/parser";
import { DECISIONS_DIR } from "@/lib/data/constants";
import type { Theme, ThemeOrError } from "@/lib/data/types";

function getDecisionsDir(): string {
  return path.resolve(process.cwd(), DECISIONS_DIR);
}

export async function getAllThemes(): Promise<ThemeOrError[]> {
  const dir = getDecisionsDir();
  return parseMarkdownFiles(dir);
}

export async function getThemeById(themeId: string): Promise<Theme | null> {
  const results = await getAllThemes();
  const found = results.find(
    (r) => r.type === "theme" && r.data.theme_id === themeId,
  );
  if (found && found.type === "theme") {
    return found.data;
  }
  return null;
}

export async function getAwaitingReviewThemes(): Promise<Theme[]> {
  const results = await getAllThemes();
  return results
    .filter(
      (r): r is { type: "theme"; data: Theme } =>
        r.type === "theme" && r.data.current_status === "awaiting-review",
    )
    .map((r) => r.data);
}
