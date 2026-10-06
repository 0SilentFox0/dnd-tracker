"use client";

import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { pluralUk } from "@/lib/utils/plural";

interface RacesPageHeaderProps {
  campaignId: string;
  racesCount: number;
  onCreateRace: () => void;
}

export function RacesPageHeader({
  racesCount,
  onCreateRace,
}: RacesPageHeaderProps) {
  return (
    <PageHeader
      title="Ігрові Раси"
      description={`${racesCount} ${pluralUk(racesCount, ["раса", "раси", "рас"])}`}
      actions={
        <Button onClick={onCreateRace} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Створити расу
        </Button>
      }
    />
  );
}
