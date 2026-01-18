import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Unit } from "@/lib/api/units";
import type { Race } from "@/lib/types/races";
import {
  getUnitImmunities,
  extractRaceImmunities,
} from "@/lib/utils/race-effects";

interface UnitImmunitiesProps {
  formData: Partial<Unit>;
  race?: Race | null;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitImmunities({
  formData,
  race,
  onChange,
}: UnitImmunitiesProps) {
  const unitImmunities = formData.immunities || [];
  const raceImmunities = extractRaceImmunities(race);
  const allImmunities = getUnitImmunities(
    formData as Unit,
    race
  );

  const handleAdd = () => {
    const newImmunity = prompt("Введіть назву імунітету:");
    if (newImmunity && newImmunity.trim()) {
      onChange({
        immunities: [...unitImmunities, newImmunity.trim()],
      });
    }
  };

  const handleRemove = (index: number) => {
    const updated = unitImmunities.filter((_, i) => i !== index);
    onChange({ immunities: updated });
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

      {unitImmunities.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Імунітети юніта:
          </Label>
          <div className="flex flex-wrap gap-2">
            {unitImmunities.map((immunity, index) => (
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
            Всі імунітети (раса + юніт):
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
