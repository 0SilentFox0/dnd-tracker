"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { CharacterType } from "@/lib/constants/characters";
import { useCharacterRoster } from "@/lib/hooks/characters";

interface AudiencePickerProps {
  campaignId: string;
  value: string[] | undefined;
  onChange(value: string[] | undefined): void;
}

export function AudiencePicker({ campaignId, value, onChange }: AudiencePickerProps) {
  const t = useTranslations("show");

  const { data } = useCharacterRoster(campaignId);

  const heroes = (data ?? []).filter((h) => h.type === CharacterType.PLAYER);

  const toggle = (id: string) => onChange(value?.includes(id) ? value.filter((x) => x !== id) : [...(value ?? []), id]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-hud-bone">{t("audience.label")}</legend>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={value ? "outline" : "default"} aria-pressed={!value} onClick={() => onChange(undefined)}>
          {t("audience.all")}
        </Button>
        <Button type="button" size="sm" variant={value ? "default" : "outline"} aria-pressed={!!value} onClick={() => onChange(value ?? [])}>
          {t("audience.chosen")}
        </Button>
      </div>
      {value && (
        <div className="space-y-1">
          {heroes.map((hero) => (
            <label key={hero.id} className="flex items-center gap-2 text-sm text-hud-bone">
              <input type="checkbox" checked={value.includes(hero.id)} onChange={() => toggle(hero.id)} />
              {hero.name}
            </label>
          ))}
          {value.length === 0 && <p className="text-xs text-hud-muted">{t("audience.pickOne")}</p>}
        </div>
      )}
    </fieldset>
  );
}
