"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";
import { HudSection } from "@/components/hud/form";
import { HudCard, HudPanel, HudPill } from "@/components/hud/page";
import { useCharacters } from "@/lib/hooks/characters";

export function PendingDraftsPanel({ campaignId }: { campaignId: string }) {
  const t = useTranslations("characters.review");

  const tCard = useTranslations("characters.card");

  const { data } = useCharacters(campaignId, { status: "pending" });

  if (!data?.length) return null;

  return (
    <HudPanel>
      <HudSection title={t("pendingTitle")}>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Link key={c.id} href={`/campaigns/${campaignId}/dm/characters/${c.id}`} className="block">
              <HudCard className="flex items-center gap-3 p-2">
                <HeroPortrait src={c.avatar} name={c.name} className="size-14 shrink-0" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="hud-sc truncate text-hud-ink">{c.name}</p>
                  <p className="truncate text-xs text-hud-muted">
                    {c.race} · {c.class}
                  </p>
                  <p className="truncate text-xs text-hud-muted">{c.user?.displayName || tCard("unassigned")}</p>
                  {c.reviewNote && <HudPill tone="silver">{t("returnedWithNote")}</HudPill>}
                </div>
              </HudCard>
            </Link>
          ))}
        </div>
      </HudSection>
    </HudPanel>
  );
}
