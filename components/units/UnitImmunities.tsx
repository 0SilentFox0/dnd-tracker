import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Unit } from "@/lib/api/units";

interface UnitImmunitiesProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitImmunities({
  formData,
  onChange,
}: UnitImmunitiesProps) {
  const immunities = formData.immunities || [];

  const handleAdd = () => {
    const newImmunity = prompt("Введіть назву імунітету:");
    if (newImmunity && newImmunity.trim()) {
      onChange({
        immunities: [...immunities, newImmunity.trim()],
      });
    }
  };

  const handleRemove = (index: number) => {
    const updated = immunities.filter((_, i) => i !== index);
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

      {immunities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {immunities.map((immunity, index) => (
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
      )}

      {immunities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Немає доданих імунітетів. Натисніть &quot;Додати імунітет&quot; щоб додати
          новий.
        </p>
      )}
    </div>
  );
}
