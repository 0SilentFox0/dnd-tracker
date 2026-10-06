import Link from "next/link";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactSetCardIcon } from "@/components/artifact-sets/ArtifactSetCardIcon";
import { ArtifactCard, type ArtifactCardData } from "@/components/artifacts/ArtifactCard";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { pluralUk } from "@/lib/utils/plural";

export interface ArtifactSetCardData {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  setBonus: unknown;
  abilitySummary: string[];
}

type ArtifactSetCardProps = { set: ArtifactSetCardData; campaignId: string } & (
  | { variant: "withArtifacts"; artifacts: ArtifactCardData[] }
  | { variant: "summary"; artifacts: { id: string; name: string }[] }
);

export function ArtifactSetCard(props: ArtifactSetCardProps) {
  const { set, campaignId } = props;

  const editHref = `/campaigns/${campaignId}/dm/artifact-sets/${set.id}`;

  const count = props.artifacts.length;

  return (
    <HudCard className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          <ArtifactSetCardIcon url={set.icon} name={set.name} size={props.variant === "summary" ? "lg" : "md"} />
          <div className="min-w-0 space-y-1">
            <h3 className="hud-sc text-lg leading-tight text-[#efe5d2]">{set.name}</h3>
            {props.variant === "withArtifacts" && (
              <p className="text-sm text-[#8f8473]">
                {count} {pluralUk(count, ["артефакт", "артефакти", "артефактів"])} в сеті
              </p>
            )}
            {props.variant === "summary" && set.description && <p className="text-sm text-[#8f8473]">{set.description}</p>}
          </div>
        </div>
        {props.variant === "summary" && (
          <Button size="sm" variant="outline" asChild>
            <Link href={editHref}>Редагувати</Link>
          </Button>
        )}
      </div>

      {props.variant === "withArtifacts" && set.description && <p className="text-sm text-[#8f8473]">{set.description}</p>}

      <ArtifactSetBonusDisplay setBonus={set.setBonus} abilitySummary={set.abilitySummary} />

      {props.variant === "withArtifacts" ? (
        <>
          <div className="space-y-3">
            {props.artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} campaignId={campaignId} artifact={artifact} variant="compact" />
            ))}
          </div>
          <Link href={editHref} className="block">
            <Button variant="outline" size="sm" className="w-full">
              Редагувати сет
            </Button>
          </Link>
        </>
      ) : (
        <div>
          <p className="mb-1.5 text-xs text-[#8f8473]">Частин: {count}</p>
          <div className="flex flex-wrap gap-1">
            {props.artifacts.map((a) => (
              <span key={a.id} className="rounded-full px-2 py-0.5 text-xs text-[#e6dccb] shadow-[inset_0_0_0_1px_#4a3c2c]">
                {a.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </HudCard>
  );
}
