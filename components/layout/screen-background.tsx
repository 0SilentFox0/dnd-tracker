"use client";

import { usePathname } from "next/navigation";

export const SCREEN_BACKGROUND = {
  artifacts: "artifacts",
  battle: "battle",
  character: "character",
  races: "races",
  skillTree: "skill-tree",
  skills: "skills",
  spells: "spells",
  units: "units",
} as const;

export type ScreenBackgroundName = (typeof SCREEN_BACKGROUND)[keyof typeof SCREEN_BACKGROUND];

const DM_SECTIONS: Record<string, ScreenBackgroundName> = {
  artifacts: SCREEN_BACKGROUND.artifacts,
  battles: SCREEN_BACKGROUND.battle,
  characters: SCREEN_BACKGROUND.character,
  "main-skills": SCREEN_BACKGROUND.skills,
  races: SCREEN_BACKGROUND.races,
  "skill-trees": SCREEN_BACKGROUND.skillTree,
  skills: SCREEN_BACKGROUND.skills,
  spells: SCREEN_BACKGROUND.spells,
  units: SCREEN_BACKGROUND.units,
};

export function screenBackgroundFor(pathname: string | null): ScreenBackgroundName | null {
  const [root, , section, sub, printed] = (pathname ?? "").split("/").filter(Boolean);

  if (root !== "campaigns") return null;

  if (section === "character") return SCREEN_BACKGROUND.character;

  if (section === "battles") return SCREEN_BACKGROUND.battle;

  if (section !== "dm") return null;

  if (sub === "print") return printed === "spells" || printed === "skills" ? DM_SECTIONS[printed] : null;

  return sub ? (DM_SECTIONS[sub] ?? null) : null;
}

// rendered first in <body>, outside every Suspense boundary; globals.css picks body::before with body:has([data-screen-bg])
export function ScreenBackground() {
  const name = screenBackgroundFor(usePathname());

  return name ? <span hidden data-screen-bg={name} /> : null;
}
