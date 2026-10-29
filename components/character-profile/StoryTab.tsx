"use client";

import { useTranslations } from "next-intl";

import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";
import { PlayerNotes } from "./PlayerNotes";
import { useProfile } from "./ProfileContext";
import { StoryChapters } from "./StoryChapters";
import { TokenList } from "./TokenList";

import { HudSection } from "@/components/hud/form";

export function StoryTab() {
  const { sheet, campaignId } = useProfile();

  const t = useTranslations("characterProfile.story");

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="lg:order-2">
        <GoalList />
        <TokenList />
        {sheet.viewer.isOwner && <PlayerNotes />}
      </div>
      <div className="lg:order-1">
        <HudSection title={t("biography")}>{sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-hud-muted">{t("noBiography")}</p>}</HudSection>
        <StoryChapters chapters={sheet.story.chapters} campaignId={campaignId} />
      </div>
    </div>
  );
}
