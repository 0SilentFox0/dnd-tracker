"use client";

import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";
import { useProfile } from "./ProfileContext";
import { Section } from "./Section";
import { TokenList } from "./TokenList";

export function StoryTab() {
  const { sheet } = useProfile();

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="lg:order-2">
        <GoalList />
        <TokenList />
      </div>
      <div className="lg:order-1">
        <Section title="БІОГРАФІЯ">{sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-hud-muted">Біографію ще не написано</p>}</Section>
      </div>
    </div>
  );
}
