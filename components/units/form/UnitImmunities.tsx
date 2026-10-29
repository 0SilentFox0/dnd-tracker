import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getUnitImmunities } from "@/lib/utils/races/race-effects";
import type { Unit } from "@/types/units";

interface UnitImmunitiesProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitImmunities({
  formData,
  onChange,
}: UnitImmunitiesProps) {
  const t = useTranslations("units.immunities");

  const unitImmunities = formData.immunities || [];

  const allImmunities = getUnitImmunities(formData as Unit);

  const handleAdd = () => {
    const newImmunity = prompt(t("prompt"));

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
    <HudSection
      title={t("title")}
      className="space-y-4"
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          {t("add")}
        </Button>
      }
    >
      {unitImmunities.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {t("own")}
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
            {t("all")}
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
          {t("empty")}
        </p>
      )}
    </HudSection>
  );
}
