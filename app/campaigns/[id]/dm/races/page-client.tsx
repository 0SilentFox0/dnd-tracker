"use client";

import { useState } from "react";
import { Dna } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { RaceCard } from "@/components/races/RaceCard";
import { RacesPageHeader } from "@/components/races/RacesPageHeader";
import { useConfirm } from "@/lib/hooks/common";
import {
  useCreateRace,
  useDeleteRace,
  useRaces,
} from "@/lib/hooks/races";
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

  // Запити для рас
  const { data: races = initialRaces, isLoading: racesLoading } = useRaces(
    campaignId,
    initialRaces
  );

  // Мутації
  const createRaceMutation = useCreateRace(campaignId);

  const deleteRaceMutation = useDeleteRace(campaignId);

  const handleDeleteRace = async (raceId: string) => {
    if ((await confirm({ title: "Ви впевнені, що хочете видалити цю расу?", confirmLabel: "Видалити", destructive: true }))) {
      deleteRaceMutation.mutate(raceId);
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full">
      <RacesPageHeader
        campaignId={campaignId}
        racesCount={races.length}
        onCreateRace={() => setCreateRaceDialogOpen(true)}
      />

      {racesLoading && races.length === 0 ? (
        <LoadingState rows={6} label="Завантаження рас…" />
      ) : races.length === 0 ? (
        <EmptyState icon={Dna} title="Ще немає рас" description="Створіть першу расу." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
