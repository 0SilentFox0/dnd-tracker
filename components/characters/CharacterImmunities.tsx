"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CharacterFormData } from "@/types/characters";
import type { Race } from "@/types/races";
import { getCharacterImmunities } from "@/lib/utils/character-race-effects";
import { extractRaceImmunities } from "@/lib/utils/race-effects";

interface CharacterImmunitiesProps {
  formData: CharacterFormData;
  race?: Race | null;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
}

export function CharacterImmunities({
  formData,
  race,
  onUpdate,
}: CharacterImmunitiesProps) {
  const characterImmunities = formData.immunities || [];
  const raceImmunities = extractRaceImmunities(race);
  const allImmunities = getCharacterImmunities(
    formData as any,
    race
  );

  const handleAdd = () => {
    const newImmunity = prompt("Введіть назву імунітету:");
    if (newImmunity && newImmunity.trim()) {
      onUpdate("immunities", [...characterImmunities, newImmunity.trim()]);
    }
  };

  const handleRemove = (index: number) => {
    const updated = characterImmunities.filter((_, i) => i !== index);
    onUpdate("immunities", updated);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Імунітети</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          + Додати імунітет
        </Button>
      </div>

      {raceImmunities.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Імунітети з раси ({race?.name}):
          </Label>
          <div className="flex flex-wrap gap-2">
            {raceImmunities.map((immunity, index) => (
              <Badge key={`race-${index}`} variant="secondary" className="text-sm">
                {immunity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {characterImmunities.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Імунітети персонажа:
          </Label>
          <div className="flex flex-wrap gap-2">
            {characterImmunities.map((immunity, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md"
              >
                <span className="text-sm">{immunity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => handleRemove(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allImmunities.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <Label className="text-sm font-semibold">
            Всі імунітети (раса + персонаж):
          </Label>
          <div className="flex flex-wrap gap-2">
            {allImmunities.map((immunity, index) => (
              <Badge key={`all-${index}`} variant="outline" className="text-sm">
                {immunity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {allImmunities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Немає доданих імунітетів. Натисніть &quot;Додати імунітет&quot; щоб додати
          новий.
        </p>
      )}
    </div>
  );
}
