"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { getSpells } from "@/lib/api/spells";
import type { Spell } from "@/types/spells";

const PICK_PLACEHOLDER_VALUE = "__immune_spell_add__";

export interface ImmuneSpellsLibraryPickerProps {
  campaignId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  idPrefix?: string;
}

export function ImmuneSpellsLibraryPicker({
  campaignId,
  selectedIds,
  onChange,
  idPrefix = "immune-spells",
}: ImmuneSpellsLibraryPickerProps) {
  const [spells, setSpells] = useState<Spell[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSpells(campaignId)
      .then((data) => {
        if (!cancelled) {
          setSpells(Array.isArray(data) ? data : []);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpells([]);
          setLoadError("Не вдалося завантажити заклинання");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const byId = useMemo(() => new Map(spells.map((s) => [s.id, s])), [spells]);

  const addOptions = useMemo(() => {
    const sel = new Set(selectedIds);

    return spells
      .filter((s) => !sel.has(s.id))
      .map((s) => ({
        value: s.id,
        label: `${s.name} (рів. ${s.level})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "uk"));
  }, [spells, selectedIds]);

  const handlePick = (id: string) => {
    if (!id || id === PICK_PLACEHOLDER_VALUE) return;

    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  const p = idPrefix;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${p}-add`}>Імунітет до заклинань</Label>
      <p className="text-xs text-muted-foreground">
        Оберіть заклинання з бібліотеки кампанії. У бою імунітет порівнюється з ID заклинання.
      </p>
      {loadError && (
        <p className="text-xs text-destructive">{loadError}</p>
      )}
      <SelectField
        id={`${p}-add`}
        allowNone
        noneLabel={
          addOptions.length === 0
            ? selectedIds.length === 0
              ? "Немає заклинань у кампанії"
              : "Усі доступні заклинання вже додані"
            : "Додати заклинання з бібліотеки…"
        }
        noneValue={PICK_PLACEHOLDER_VALUE}
        value=""
        onValueChange={handlePick}
        options={addOptions}
        disabled={addOptions.length === 0}
      />
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedIds.map((id) => {
            const sp = byId.get(id);

            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                <span className="max-w-[220px] truncate">
                  {sp ? `${sp.name} (${sp.level})` : id}
                </span>
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  onClick={() => remove(id)}
                  aria-label={`Прибрати ${sp?.name ?? id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
