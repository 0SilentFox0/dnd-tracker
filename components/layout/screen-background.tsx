import type { ReactNode } from "react";

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

// globals.css picks the body::before image with body:has([data-screen-bg]); pages without a marker get the tavern
export function ScreenBackground({ name }: { name: ScreenBackgroundName }) {
  return <span hidden data-screen-bg={name} />;
}

export function screenBackgroundLayout(name: ScreenBackgroundName) {
  function ScreenBackgroundLayout({ children }: { children: ReactNode }) {
    return (
      <>
        <ScreenBackground name={name} />
        {children}
      </>
    );
  }

  return ScreenBackgroundLayout;
}
