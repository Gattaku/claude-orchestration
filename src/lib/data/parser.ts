import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import {
  VALID_PHASES,
  VALID_STATUSES,
  REQUIRED_FRONTMATTER_FIELDS,
  THEME_REGISTRY_FILE,
} from "@/lib/data/constants";
import type {
  ThemeDecision,
  Theme,
  ThemeOrError,
  Phase,
  Status,
} from "@/lib/data/types";
import { deriveCurrentPhase, buildPhaseInfoList } from "@/lib/utils/phase";

// --- parseFrontmatter ---

export type ParseFrontmatterResult =
  | { success: true; data: Record<string, unknown>; content: string }
  | { success: false; error: string; filePath: string };

export function parseFrontmatter(filePath: string): ParseFrontmatterResult {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return { success: true, data, content };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, filePath };
  }
}

// --- validateFrontmatter ---

export type ValidateResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export function validateFrontmatter(
  data: Record<string, unknown>,
  filePath: string,
): ValidateResult {
  const errors: string[] = [];

  // Check required fields
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${field} in ${filePath}`);
    }
  }

  // Validate phase value
  if (
    data.phase !== undefined &&
    data.phase !== null &&
    !VALID_PHASES.includes(data.phase as Phase)
  ) {
    errors.push(
      `Invalid phase value: "${data.phase}" in ${filePath}. Valid values: ${VALID_PHASES.join(", ")}`,
    );
  }

  // Validate status value
  if (
    data.status !== undefined &&
    data.status !== null &&
    !VALID_STATUSES.includes(data.status as Status)
  ) {
    errors.push(
      `Invalid status value: "${data.status}" in ${filePath}. Valid values: ${VALID_STATUSES.join(", ")}`,
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

// --- Markdown to HTML ---

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

// --- parseMarkdownFiles ---

export async function parseMarkdownFiles(
  dirPath: string,
): Promise<ThemeOrError[]> {
  const files = fs
    .readdirSync(dirPath)
    .filter(
      (f) =>
        f.endsWith(".md") &&
        f !== THEME_REGISTRY_FILE,
    );

  const themeMap = new Map<string, ThemeDecision[]>();
  const errors: ThemeOrError[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const parsed = parseFrontmatter(filePath);

    if (!parsed.success) {
      errors.push({
        type: "error",
        error: { file_path: filePath, error_message: parsed.error },
      });
      continue;
    }

    const validation = validateFrontmatter(parsed.data, filePath);
    if (!validation.valid) {
      errors.push({
        type: "error",
        error: {
          file_path: filePath,
          error_message: validation.errors.join("; "),
        },
      });
      continue;
    }

    const bodyHtml = await markdownToHtml(parsed.content);

    const decision: ThemeDecision = {
      id: `md-${parsed.data.theme_id}-${parsed.data.phase}`,
      theme_id: parsed.data.theme_id as string,
      title: parsed.data.title as string,
      phase: parsed.data.phase as Phase,
      status: parsed.data.status as Status,
      source: parsed.data.source as string,
      created_at: parsed.data.created_at as string,
      updated_at: parsed.data.updated_at as string,
      next_action: parsed.data.next_action as string,
      awaiting_review: parsed.data.awaiting_review as string,
      participants: parsed.data.participants as string[],
      tags: parsed.data.tags as string[] | undefined,
      body_html: bodyHtml,
    };

    const existing = themeMap.get(decision.theme_id);
    if (existing) {
      existing.push(decision);
    } else {
      themeMap.set(decision.theme_id, [decision]);
    }
  }

  // Build Theme objects
  const themes: ThemeOrError[] = [];
  for (const [themeId, decisions] of themeMap) {
    const currentPhase = deriveCurrentPhase(decisions);
    const latestDecision = decisions.reduce((a, b) =>
      a.updated_at >= b.updated_at ? a : b,
    );
    const phases = buildPhaseInfoList(decisions);

    const theme: Theme = {
      theme_id: themeId,
      title: decisions[0].title,
      current_phase: currentPhase,
      current_status: latestDecision.status,
      decisions,
      phases,
      discussion_logs: [],
    };

    themes.push({ type: "theme", data: theme });
  }

  // Log validation summary
  const okCount = themes.length;
  const errorCount = errors.length;
  if (errorCount > 0) {
    console.log(
      `Warning: ${errorCount} file(s) had errors. OK: ${okCount} theme(s) parsed successfully.`,
    );
  } else {
    console.log(`OK: ${okCount} theme(s) parsed successfully.`);
  }

  return [...themes, ...errors];
}
