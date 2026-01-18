"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import {
  useRaces,
  useCreateRace,
  useUpdateRace,
  useDeleteRace,
} from "@/lib/hooks/useRaces";
import type { Race } from "@/lib/types/races";
import { RacesPageHeader } from "@/components/races/RacesPageHeader";
import { RaceCard } from "@/components/races/RaceCard";
import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";

interface DMRacesPageClientProps {
  campaignId: string;
  initialRaces: Race[];
}

export function DMRacesPageClient({
  campaignId,
  initialRaces,
}: DMRacesPageClientProps) {
  const [createRaceDialogOpen, setCreateRaceDialogOpen] = useState(false);

  // Запити для рас
  const { data: races = initialRaces, isLoading: racesLoading } = useRaces(
    campaignId,
    initialRaces
  );

  // Мутації
  const createRaceMutation = useCreateRace(campaignId);
  const updateRaceMutation = useUpdateRace(campaignId);
  const deleteRaceMutation = useDeleteRace(campaignId);

  const handleDeleteRace = (raceId: string) => {
    if (confirm("Ви впевнені, що хочете видалити цю расу?")) {
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

      {racesLoading && (
        <div className="text-center py-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Оновлення...
          </p>
        </div>
      )}

      {!racesLoading && races.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground">
            Раси ще не додані. Створіть першу расу.
          </p>
        </div>
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
