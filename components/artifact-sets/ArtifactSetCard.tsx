import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactSetCardIcon } from "@/components/artifact-sets/ArtifactSetCardIcon";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import type { ArtifactSetCardData } from "@/types/artifact-sets";
import type { ArtifactCardData } from "@/types/artifacts";
import type { IdName } from "@/types/common";

type ArtifactSetCardProps = { set: ArtifactSetCardData; campaignId: string } & (
  | { variant: "withArtifacts"; artifacts: ArtifactCardData[] }
  | { variant: "summary"; artifacts: IdName[] }
);

export function ArtifactSetCard(props: ArtifactSetCardProps) {
  const t = useTranslations("artifacts.sets.card");

  const tc = useTranslations("common.actions");

  const { set, campaignId } = props;

  const editHref = `/campaigns/${campaignId}/dm/artifact-sets/${set.id}`;

  const count = props.artifacts.length;

  return (
    <HudCard className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          <ArtifactSetCardIcon url={set.icon} name={set.name} size="lg" />
          <div className="min-w-0 space-y-1">
            <h3 className="hud-sc text-lg leading-tight text-hud-ink">{set.name}</h3>
            {props.variant === "withArtifacts" && (
              <p className="text-sm text-hud-muted">
                {t("inSet", { count })}
              </p>
            )}
            {props.variant === "summary" && set.description && <p className="text-sm text-hud-muted">{set.description}</p>}
          </div>
        </div>
        {props.variant === "summary" && (
          <Button size="sm" variant="outline" asChild>
            <Link href={editHref}>{tc("edit")}</Link>
          </Button>
        )}
      </div>

      {props.variant === "withArtifacts" ? (
        <>
          {set.description && <p className="text-sm text-hud-muted">{set.description}</p>}
          <ArtifactSetBonusDisplay setBonus={set.setBonus} abilitySummary={set.abilitySummary} />
          <div className="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {props.artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} campaignId={campaignId} artifact={artifact} variant="compact" />
            ))}
          </div>
          <Button variant="outline" size="sm" className="flex w-full sm:ml-auto sm:w-fit" asChild>
            <Link href={editHref}>{t("editSet")}</Link>
          </Button>
        </>
      ) : (
        <>
          <ArtifactSetBonusDisplay setBonus={set.setBonus} abilitySummary={set.abilitySummary} />
          <div>
            <p className="mb-1.5 text-xs text-hud-muted">{t("parts", { count })}</p>
            <div className="flex flex-wrap gap-1">
              {props.artifacts.map((a) => (
                <span key={a.id} className="rounded-full px-2 py-0.5 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </HudCard>
  );
}
