"use client";

import { useState } from "react";
import { Dna, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { RaceCard } from "@/components/races/RaceCard";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import {
  useCreateRace,
  useDeleteRace,
  useRaces,
} from "@/lib/hooks/races";
import { pluralUk } from "@/lib/utils/plural";
import type { Race } from "@/types/races";

interface DMRacesPageClientProps {
  campaignId: string;
  initialRaces: Race[];
}

export function DMRacesPageClient({
  campaignId,
  initialRaces,
}: DMRacesPageClientProps) {
  const confirm = useConfirm();

  const [createRaceDialogOpen, setCreateRaceDialogOpen] = useState(false);

  const { data: races = initialRaces, isLoading: racesLoading } = useRaces(
    campaignId,
    initialRaces
  );

  const createRaceMutation = useCreateRace(campaignId);

  const deleteRaceMutation = useDeleteRace(campaignId);

  const handleDeleteRace = async (raceId: string) => {
    if ((await confirm({ title: "Ви впевнені, що хочете видалити цю расу?", confirmLabel: "Видалити", destructive: true }))) {
      deleteRaceMutation.mutate(raceId);
    }
  };

  return (
    <HudPage>
      <HudPageHeader
        title="Ігрові Раси"
        subtitle={`${races.length} ${pluralUk(races.length, ["раса", "раси", "рас"])}`}
        actions={
          <Button onClick={() => setCreateRaceDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Створити расу
          </Button>
        }
      />

      {racesLoading && races.length === 0 ? (
        <LoadingState rows={6} label="Завантаження рас…" />
      ) : races.length === 0 ? (
        <EmptyState icon={Dna} title="Ще немає рас" description="Створіть першу расу." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              campaignId={campaignId}
              onDelete={handleDeleteRace}
            />
          ))}
        </div>
      )}

      <CreateRaceDialog
        open={createRaceDialogOpen}
        onOpenChange={setCreateRaceDialogOpen}
        campaignId={campaignId}
        onCreateRace={(data) => {
          createRaceMutation.mutate(data, {
            onSuccess: () => {
              setCreateRaceDialogOpen(false);
            },
          });
        }}
      />
    </HudPage>
  );
}
