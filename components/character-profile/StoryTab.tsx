"use client";

import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";
import { useProfile } from "./ProfileContext";
import { Section } from "./Section";

export function StoryTab() {
  const { sheet } = useProfile();

  return (
    <>
      <GoalList />
      <Section title="БІОГРАФІЯ">{sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-[#8f8473]">Біографію ще не написано</p>}</Section>
    </>
  );
}
