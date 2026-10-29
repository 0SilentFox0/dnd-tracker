"use client";

import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { ScenarioBook } from "@/components/scenario/ScenarioBook";
import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import type { StoryChapter } from "@/types/scenario";

export function StoryChapters({ chapters, campaignId }: { chapters: StoryChapter[]; campaignId: string }) {
  const t = useTranslations("characterProfile.story");

  if (!chapters.length) return null;

  return (
    <HudSection title={t("chapters")}>
      <ScenarioBook variant="inline" theme="dark">
        {chapters.map((c) => (
          <section key={c.id} className="!mt-6 first:!mt-0">
            <h3>{c.title}</h3>
            <div className="story">
              {c.rows.map((doc, i) => (
                <ScenarioRichText key={i} doc={doc} campaignId={campaignId} />
              ))}
            </div>
          </section>
        ))}
      </ScenarioBook>
    </HudSection>
  );
}
