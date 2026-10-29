import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const IMPORT_RE = /(?:from|import)\s*\(?\s*["']@\/([^"']+)["']/g;

const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export function walkSources(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);

  if (!existsSync(abs)) return out;

  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;

    if (name === "__tests__" || name === "node_modules") continue;

    if (statSync(join(ROOT, rel)).isDirectory()) walkSources(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }

  return out;
}

export const readSource = (file: string) => readFileSync(join(ROOT, file), "utf8");

const resolveImport = (spec: string) => EXTS.map((ext) => `${spec}${ext}`).concat(spec).find((p) => /\.tsx?$/.test(p) && existsSync(join(ROOT, p)));

export function reachableSources(roots: readonly string[], skip: (file: string, text: string) => boolean): Map<string, string> {
  const seen = new Map<string, string>();

  const queue = [...roots];

  while (queue.length) {
    const file = queue.pop() as string;

    if (seen.has(file)) continue;

    const text = readSource(file);

    if (skip(file, text)) continue;

    seen.set(file, text);

    for (const [, spec] of text.matchAll(IMPORT_RE)) {
      const next = resolveImport(spec);

      if (next) queue.push(next);
    }
  }

  return seen;
}
