"use client";

import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";
import { useProfile } from "./ProfileContext";
import { Section } from "./Section";
import { TokenList } from "./TokenList";

export function StoryTab() {
  const { sheet } = useProfile();

  return (
    <>
      <GoalList />
      <TokenList />
      <Section title="БІОГРАФІЯ">{sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-hud-muted">Біографію ще не написано</p>}</Section>
    </>
  );
}
