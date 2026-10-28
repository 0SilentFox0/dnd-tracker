"use client";

import { useMemo } from "react";

import { ARMOR_CATEGORY_LABELS } from "@/components/artifacts/ArtifactArmorFields";
import { ItemCastingFields } from "@/components/artifacts/ItemCastingFields";
import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwitchField } from "@/components/ui/switch-field";
import { ArtifactSlot, ITEM_LIMITS, PROPERTY_SLOTS } from "@/lib/constants/artifacts";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { ARMOR_CATEGORIES } from "@/lib/utils/artifacts/armor-stats";
import { toggleItem } from "@/lib/utils/common/collections";
import { patchDefined } from "@/lib/utils/common/patch-defined";
import { composedName, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsRecords } from "@/lib/utils/items/item-row";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";

type Property = NonNullable<ItemStats["property"]>;

type AppliesTo = Property["appliesTo"];

const KINDS: Array<{ value: ItemKind; label: string }> = [
  { value: "weapon", label: "Зброя" },
  { value: "armor", label: "Броня" },
  { value: "shield", label: "Щит" },
];

const CATEGORIES = ARMOR_CATEGORIES.map((value) => ({ value, label: ARMOR_CATEGORY_LABELS[value] }));

const [MIN_CHARGES, MAX_CHARGES] = ITEM_LIMITS.charges;

const REST_OPTIONS = [
  { value: "long", label: "Довгий відпочинок" },
  { value: "short", label: "Короткий відпочинок" },
  { value: "none", label: "Не відновлюються" },
];

const defaultKind = (slot: string): ItemKind => (slot === ArtifactSlot.ARMOR ? "armor" : slot === ArtifactSlot.SHIELD ? "shield" : "weapon");

function ChipRow({ options, selected, onToggle }: { options: Array<{ value: string; label: string }>; selected: readonly string[] | undefined; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = !!selected?.includes(o.value);

        return (
          <Button key={o.value} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => onToggle(o.value)}>
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

function PropertyFields({ campaignId, name, property, onChange }: { campaignId: string; name: string; property: Property; onChange: (next: Property) => void }) {
  const artifacts = useArtifactsList(campaignId).data;

  const applies = property.appliesTo;

  const { candidates, first } = useMemo(() => {
    const library = (artifacts ?? []) as ItemRowLike[];

    const probe = (appliesTo: AppliesTo): ItemRowLike => ({ id: "probe", name, slot: ArtifactSlot.WEAPON, modifiers: itemStatsRecords({ property: { ...property, appliesTo } }) });

    const withoutBases: AppliesTo = { ...applies, bases: undefined };

    return {
      candidates: library.filter((a) => matchesAppliesTo(a, probe(withoutBases))),
      first: library.find((a) => matchesAppliesTo(a, probe(applies))),
    };
  }, [artifacts, property, applies, name]);

  const setApplies = (patch: Partial<AppliesTo>) => {
    const next = patchDefined(applies, patch, (v) => v === undefined || (Array.isArray(v) && v.length === 0));

    if (next.kinds.length === 0) next.kinds = applies.kinds;

    onChange({ ...property, appliesTo: next });
  };

  return (
    <div className="space-y-3 rounded-md border border-hud-line p-3">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Застосовується до</span>
        <ChipRow options={KINDS} selected={applies.kinds} onToggle={(v) => setApplies({ kinds: toggleItem(applies.kinds, v as ItemKind) })} />
      </div>
      {applies.kinds.includes("weapon") && (
        <div className="space-y-1">
          <Label htmlFor="item-attack-type" className="text-xs text-muted-foreground">
            Тип атаки
          </Label>
          <select id="item-attack-type" className={`${HUD_SELECT_CLASS} w-full`} value={applies.attackType ?? ""} onChange={(e) => setApplies({ attackType: (e.target.value || undefined) as AppliesTo["attackType"] })}>
            <option value="">будь-яка</option>
            <option value="melee">ближня</option>
            <option value="ranged">дальня</option>
          </select>
        </div>
      )}
      {applies.kinds.includes("armor") && (
        <ChipRow options={[...CATEGORIES]} selected={applies.armorCategories} onToggle={(v) => setApplies({ armorCategories: toggleItem(applies.armorCategories, v as (typeof CATEGORIES)[number]["value"]) })} />
      )}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Лише бази (порожньо — усі підхожі)</span>
        <ChipRow options={candidates.map((a) => ({ value: a.name, label: a.name }))} selected={applies.bases} onToggle={(v) => setApplies({ bases: toggleItem(applies.bases, v) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="item-name-template" className="text-xs text-muted-foreground">
          Шаблон назви ({"{base}"} — назва бази)
        </Label>
        <Input
          id="item-name-template"
          maxLength={100}
          placeholder="{name} ({base})"
          value={property.nameTemplate ?? ""}
          onChange={(e) => onChange({ ...property, nameTemplate: e.target.value.trim() ? e.target.value : undefined })}
        />
        {first && <p className="text-xs text-hud-muted">Прев&apos;ю: {composedName(first, { name }, property.nameTemplate)}</p>}
      </div>
    </div>
  );
}

interface ArtifactItemFieldsProps {
  campaignId: string;
  name: string;
  slot: string;
  value: ItemStats | null | undefined;
  onChange: (next: ItemStats | null) => void;
  itemsEnabled: boolean;
}

export function ArtifactItemFields({ campaignId, name, slot, value, onChange, itemsEnabled }: ArtifactItemFieldsProps) {
  const stats: ItemStats = value ?? {};

  const set = (patch: Partial<ItemStats>) => {
    const next = patchDefined(stats, patch);

    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const charges = stats.charges;

  return (
    <HudSection title="Предмет" className="space-y-3">
      <SwitchField id="item-gear" label="Звичайне спорядження (неунікальне)" checked={stats.unique === false} onCheckedChange={(v) => set({ unique: v ? false : undefined })} />
      {PROPERTY_SLOTS.has(slot) && (
        <SwitchField
          id="item-property"
          label="Властивість (видається разом із базою)"
          checked={!!stats.property}
          onCheckedChange={(v) => set({ property: v ? { appliesTo: { kinds: [defaultKind(slot)] } } : undefined, ...(v && { consumable: undefined }) })}
        />
      )}
      {stats.property && <PropertyFields campaignId={campaignId} name={name} property={stats.property} onChange={(property) => set({ property })} />}
      {itemsEnabled && (
        <>
          <ItemCastingFields campaignId={campaignId} value={stats} onChange={set} />
          <SwitchField id="item-attunement" label="Потребує налаштування" checked={!!stats.attunement} onCheckedChange={(v) => set({ attunement: v || undefined })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-charges" className="text-xs text-muted-foreground">
                Заряди
              </Label>
              <Input
                id="item-charges"
                type="number"
                min={MIN_CHARGES}
                max={MAX_CHARGES}
                value={charges?.max ?? ""}
                onChange={(e) => {
                  const n = e.target.value === "" ? undefined : Math.min(MAX_CHARGES, Math.max(MIN_CHARGES, Math.trunc(Number(e.target.value))));

                  set({ charges: n ? { max: n, rest: charges ? charges.rest : stats.consumable ? null : "long" } : undefined });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-charges-rest" className="text-xs text-muted-foreground">
                Відновлення
              </Label>
              <select
                id="item-charges-rest"
                className={`${HUD_SELECT_CLASS} w-full`}
                disabled={!charges || !!stats.consumable}
                value={charges ? (charges.rest ?? "none") : "long"}
                onChange={(e) => charges && set({ charges: { max: charges.max, rest: e.target.value === "none" ? null : (e.target.value as "short" | "long") } })}
              >
                {REST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SwitchField
            id="item-consumable"
            label="Витратний (видається кількістю)"
            checked={!!stats.consumable}
            disabled={!!stats.property}
            onCheckedChange={(v) => set({ consumable: v || undefined, ...(v && charges && { charges: { max: charges.max, rest: null } }) })}
          />
        </>
      )}
    </HudSection>
  );
}
