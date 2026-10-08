import Link from "next/link";
import { Gem } from "lucide-react";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { DeleteAllArtifactsButton } from "@/components/artifacts/DeleteAllArtifactsButton";
import { EmptyState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { ARTIFACT_SLOT_OPTIONS } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";

export default async function DMArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const artifacts = await prisma.artifact.findMany({
    where: {
      campaignId: id,
    },
    include: {
      artifactSet: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const artifactSets = await prisma.artifactSet.findMany({
    where: {
      campaignId: id,
    },
    include: {
      artifacts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const ungroupedArtifacts = artifacts.filter((artifact) => !artifact.setId);

  const artifactsBySlot = ARTIFACT_SLOT_OPTIONS.reduce(
    (acc, { value }) => {
      acc[value] = ungroupedArtifacts.filter((a) => a.slot === value);

      return acc;
    },
    {} as Record<string, typeof ungroupedArtifacts>,
  );

  return (
    <HudPage>
      <HudPageHeader
        title="Артефакти"
        subtitle="Управління артефактами та сетами"
        actions={
          <>
            <DeleteAllArtifactsButton
              campaignId={id}
              artifactsCount={artifacts.length}
            />
            <Link href={`/campaigns/${id}/dm/artifact-sets`}>
              <Button variant="outline" className="whitespace-nowrap">
                Сети артефактів
              </Button>
            </Link>
            <Link href={`/campaigns/${id}/dm/artifacts/new`}>
              <Button className="whitespace-nowrap">+ Створити артефакт</Button>
            </Link>
          </>
        }
      />

      {artifactSets.length > 0 && (
        <HudPanel>
          <HudSection title="Сети артефактів">
            <div className="space-y-4">
              {artifactSets.map((set) => (
                <ArtifactSetCard
                  key={set.id}
                  variant="withArtifacts"
                  campaignId={id}
                  set={{ ...set, abilitySummary: abilitySummary("artifactSet", set) }}
                  artifacts={set.artifacts.map((artifact) => ({
                    id: artifact.id,
                    name: artifact.name,
                    slot: artifact.slot,
                    rarity: artifact.rarity,
                    icon: artifact.icon,
                    description: artifact.description,
                    abilitySummary: abilitySummary("artifact", artifact),
                    artifactSet: { name: set.name },
                  }))}
                />
              ))}
            </div>
          </HudSection>
        </HudPanel>
      )}

      <HudPanel>
        <HudSection title="Артефакти без сету">
          <Accordion type="multiple" className="w-full space-y-2">
            {ARTIFACT_SLOT_OPTIONS.map(({ value: slotValue, label: slotLabel }) => {
              const list = artifactsBySlot[slotValue] ?? [];

              if (list.length === 0) return null;

              return (
                <AccordionItem key={slotValue} value={slotValue} className="rounded-lg border last:border-b">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      {slotLabel}
                      <Badge variant="secondary" className="text-xs">
                        {list.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-2">
                      {list.map((artifact) => (
                        <ArtifactCard
                          key={artifact.id}
                          campaignId={id}
                          artifact={{
                            id: artifact.id,
                            name: artifact.name,
                            slot: artifact.slot,
                            rarity: artifact.rarity,
                            icon: artifact.icon,
                            description: artifact.description,
                            abilitySummary: abilitySummary("artifact", artifact),
                            artifactSet: artifact.artifactSet,
                          }}
                          variant="full"
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </HudSection>
      </HudPanel>

      {artifacts.length === 0 && artifactSets.length === 0 && (
        <EmptyState
          className="bg-hud-panel"
          icon={Gem}
          title="Ще немає артефактів"
          action={
            <Link href={`/campaigns/${id}/dm/artifacts/new`}>
              <Button>Створити перший артефакт</Button>
            </Link>
          }
        />
      )}
    </HudPage>
  );
}
