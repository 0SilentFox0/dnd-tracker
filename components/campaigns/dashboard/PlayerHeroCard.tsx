import Link from "next/link";
import { useTranslations } from "next-intl";

import { HeroHp } from "@/components/campaigns/dashboard/HeroHp";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HudPanel, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { CharacterStatus } from "@/lib/constants/characters";
import type { PlayerDashboardData } from "@/types/campaigns";

export function PlayerHeroCard({ campaignId, data }: { campaignId: string; data: PlayerDashboardData }) {
  const t = useTranslations("dashboard.hero");

  const base = `/campaigns/${campaignId}`;

  const { hero, activeBattle } = data;

  if (!hero) {
    return (
      <HudPanel>
        <p className="text-hud-ink">{t("none")}</p>
        <Button asChild className="mt-3">
          <Link href={`${base}/character`}>{t("create")}</Link>
        </Button>
      </HudPanel>
    );
  }

  const pending = hero.status === CharacterStatus.PENDING;

  const initial = (
    <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-hud-rule text-2xl text-hud-ink" aria-hidden>
      {hero.name.trim().charAt(0).toUpperCase()}
    </span>
  );

  return (
    <HudPanel>
      <div className="flex min-w-0 gap-3">
        {hero.avatar ? <OptimizedImage src={hero.avatar} alt={hero.name} width={72} height={72} className="size-[72px] shrink-0 rounded-full object-cover" fallback={initial} /> : initial}
        <div className="min-w-0 flex-1">
          <h2 className="hud-sc truncate text-lg text-hud-ink">{hero.name}</h2>
          <p className="truncate text-sm text-hud-muted">
            {hero.race} · {hero.class}
          </p>
          <p className="text-xs text-hud-muted">
            {t("stats", { level: hero.level, armorClass: hero.armorClass, speed: hero.speed })}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pending && !hero.reviewNote && <HudPill tone="muted">{t("pending")}</HudPill>}
        {pending && hero.reviewNote && <HudPill tone="accent">{t("returned")}</HudPill>}
        {hero.seenLevel != null && hero.seenLevel < hero.level && <HudPill tone="gold">{t("newLevel")}</HudPill>}
      </div>
      {pending && hero.reviewNote && <p className="mt-1 break-words text-sm text-hud-muted">{hero.reviewNote}</p>}
      {activeBattle && (
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <HeroHp hp={activeBattle.hp} />
          </div>
          <Button asChild>
            <Link href={`${base}/battles/${activeBattle.battleId}`}>{t("toBattle")}</Link>
          </Button>
        </div>
      )}
      <Button asChild variant="outline" className="mt-3">
        <Link href={`${base}/character`}>{t("open")}</Link>
      </Button>
    </HudPanel>
  );
}
