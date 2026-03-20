import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactSetCardIcon } from "@/components/artifact-sets/ArtifactSetCardIcon";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { DeleteAllArtifactsButton } from "@/components/artifacts/DeleteAllArtifactsButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth";
import { ARTIFACT_SLOT_OPTIONS } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";

export default async function DMArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();

  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

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

  /** Групує артефакти по слотах у порядку ARTIFACT_SLOT_OPTIONS */
  const artifactsBySlot = ARTIFACT_SLOT_OPTIONS.reduce(
    (acc, { value }) => {
      acc[value] = ungroupedArtifacts.filter((a) => a.slot === value);

      return acc;
    },
    {} as Record<string, typeof ungroupedArtifacts>,
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Артефакти</h1>
          <p className="text-muted-foreground mt-1">
            Управління артефактами та сетами
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
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
        </div>
      </div>

      {/* Сети артефактів */}
      {artifactSets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Сети артефактів</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {artifactSets.map((set) => {
              return (
                <Card key={set.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex gap-3">
                      <ArtifactSetCardIcon url={set.icon} name={set.name} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="leading-tight">{set.name}</CardTitle>
                        <CardDescription>
                          {set.artifacts.length} артефактів в сеті
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {set.description && (
                      <p className="text-sm text-muted-foreground">
                        {set.description}
                      </p>
                    )}
                    <ArtifactSetBonusDisplay setBonus={set.setBonus} />
                    <div className="space-y-3">
                      {set.artifacts.map((artifact) => (
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
                            passiveAbility: artifact.passiveAbility,
                            artifactSet: { name: set.name },
                          }}
                          variant="compact"
                        />
                      ))}
                    </div>
                    <Link href={`/campaigns/${id}/dm/artifact-sets/${set.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Редагувати сет
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Артефакти без сету — згруповані по слотах в акордеоні */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Артефакти без сету</h2>
        <Accordion type="multiple" className="w-full">
          {ARTIFACT_SLOT_OPTIONS.map(({ value: slotValue, label: slotLabel }) => {
            const list = artifactsBySlot[slotValue] ?? [];

            if (list.length === 0) return null;

            return (
              <AccordionItem key={slotValue} value={slotValue}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="flex items-center gap-2">
                    {slotLabel}
                    <Badge variant="secondary" className="text-xs">
                      {list.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
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
                          passiveAbility: artifact.passiveAbility,
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
      </div>

      {artifacts.length === 0 && artifactSets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Поки немає артефактів</p>
            <Link href={`/campaigns/${id}/dm/artifacts/new`}>
              <Button>Створити перший артефакт</Button>
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
