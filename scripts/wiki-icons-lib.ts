import { BRANCH_ICONS, SKILL_ICONS } from "../data/skill-icons";

export type IconDir = "skill-icons" | "main-skill-icons";

export interface PlannedIcon {
  key: string;
  file: string;
  dir: IconDir;
}

export function planMissing(existing: Set<string>): PlannedIcon[] {
  const all: PlannedIcon[] = [
    ...Object.entries(SKILL_ICONS).map(([key, file]) => ({ key, file, dir: "skill-icons" as const })),
    ...Object.entries(BRANCH_ICONS).map(([key, file]) => ({ key, file, dir: "main-skill-icons" as const })),
  ];

  return all.filter((d) => !existing.has(`${d.dir}/${d.key}.webp`));
}

export function decodeImageDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);

  if (!match) throw new Error("Not a base64 image data URL");

  return Buffer.from(match[1], "base64");
}

export function findMissingKeys(planned: PlannedIcon[], data: Record<string, string>): PlannedIcon[] {
  return planned.filter((d) => !data[d.file]);
}
