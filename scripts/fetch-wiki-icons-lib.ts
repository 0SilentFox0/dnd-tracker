import { BRANCH_ICONS, SKILL_ICONS } from "../data/skill-icons";

export type IconDir = "skill-icons" | "main-skill-icons";

export interface PlannedDownload {
  key: string;
  file: string;
  dir: IconDir;
}

export function planDownloads(existing: Set<string>): PlannedDownload[] {
  const all: PlannedDownload[] = [
    ...Object.entries(SKILL_ICONS).map(([key, file]) => ({ key, file, dir: "skill-icons" as const })),
    ...Object.entries(BRANCH_ICONS).map(([key, file]) => ({ key, file, dir: "main-skill-icons" as const })),
  ];

  return all.filter((d) => !existing.has(`${d.dir}/${d.key}.png`));
}

export function parseImageInfo(json: unknown): Record<string, string> {
  const pages = (json as { query?: { pages?: Record<string, { title: string; imageinfo?: { url: string }[] }> } }).query?.pages ?? {};

  const out: Record<string, string> = {};

  for (const page of Object.values(pages)) {
    const url = page.imageinfo?.[0]?.url;

    if (url) out[page.title.replace(/^File:/, "")] = url;
  }

  return out;
}

export function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];

  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));

  return out;
}
