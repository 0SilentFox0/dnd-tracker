"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { ItemCastingFields } from "@/components/artifacts/ItemCastingFields";
import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwitchField } from "@/components/ui/switch-field";
import { ArtifactSlot, ITEM_LIMITS, ITEM_REST_VALUES, PROPERTY_SLOTS } from "@/lib/constants/artifacts";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { ARMOR_CATEGORIES } from "@/lib/utils/artifacts/armor-stats";
import { toggleItem } from "@/lib/utils/common/collections";
import { patchDefined } from "@/lib/utils/common/patch-defined";
import { composedName, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsRecords } from "@/lib/utils/items/item-row";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";

type Property = NonNullable<ItemStats["property"]>;

type AppliesTo = Property["appliesTo"];

const KIND_VALUES: ItemKind[] = ["weapon", "armor", "shield"];

const [MIN_CHARGES, MAX_CHARGES] = ITEM_LIMITS.charges;

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
  const t = useTranslations("artifacts.item");

  const tArmor = useTranslations("artifacts.armor");

  const kinds = KIND_VALUES.map((value) => ({ value, label: t(`kinds.${value}`) }));

  const categories = ARMOR_CATEGORIES.map((value) => ({ value, label: tArmor(`categories.${value}`) }));

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
        <span className="text-xs text-muted-foreground">{t("appliesTo")}</span>
        <ChipRow options={kinds} selected={applies.kinds} onToggle={(v) => setApplies({ kinds: toggleItem(applies.kinds, v as ItemKind) })} />
      </div>
      {applies.kinds.includes("weapon") && (
        <div className="space-y-1">
          <Label htmlFor="item-attack-type" className="text-xs text-muted-foreground">
            {t("attackType")}
          </Label>
          <select id="item-attack-type" className={`${HUD_SELECT_CLASS} w-full`} value={applies.attackType ?? ""} onChange={(e) => setApplies({ attackType: (e.target.value || undefined) as AppliesTo["attackType"] })}>
            <option value="">{t("attackAny")}</option>
            <option value="melee">{t("attackMelee")}</option>
            <option value="ranged">{t("attackRanged")}</option>
          </select>
        </div>
      )}
      {applies.kinds.includes("armor") && (
        <ChipRow options={categories} selected={applies.armorCategories} onToggle={(v) => setApplies({ armorCategories: toggleItem(applies.armorCategories, v as (typeof ARMOR_CATEGORIES)[number]) })} />
      )}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{t("bases")}</span>
        <ChipRow options={candidates.map((a) => ({ value: a.name, label: a.name }))} selected={applies.bases} onToggle={(v) => setApplies({ bases: toggleItem(applies.bases, v) })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="item-name-template" className="text-xs text-muted-foreground">
          {t("nameTemplate", { token: "{base}" })}
        </Label>
        <Input
          id="item-name-template"
          maxLength={100}
          placeholder="{name} ({base})"
          value={property.nameTemplate ?? ""}
          onChange={(e) => onChange({ ...property, nameTemplate: e.target.value.trim() ? e.target.value : undefined })}
        />
        {first && <p className="text-xs text-hud-muted">{t("preview", { name: composedName(first, { name }, property.nameTemplate) })}</p>}
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
  const t = useTranslations("artifacts.item");

  const stats: ItemStats = value ?? {};

  const set = (patch: Partial<ItemStats>) => {
    const next = patchDefined(stats, patch);

    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const charges = stats.charges;

  return (
    <HudSection title={t("title")} className="space-y-3">
      <SwitchField id="item-gear" label={t("gear")} checked={stats.unique === false} onCheckedChange={(v) => set({ unique: v ? false : undefined })} />
      {PROPERTY_SLOTS.has(slot) && (
        <SwitchField
          id="item-property"
          label={t("property")}
          checked={!!stats.property}
          onCheckedChange={(v) => set({ property: v ? { appliesTo: { kinds: [defaultKind(slot)] } } : undefined, ...(v && { consumable: undefined }) })}
        />
      )}
      {stats.property && <PropertyFields campaignId={campaignId} name={name} property={stats.property} onChange={(property) => set({ property })} />}
      {itemsEnabled && (
        <>
          <ItemCastingFields campaignId={campaignId} value={stats} onChange={set} />
          <SwitchField id="item-attunement" label={t("attunement")} checked={!!stats.attunement} onCheckedChange={(v) => set({ attunement: v || undefined })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-charges" className="text-xs text-muted-foreground">
                {t("charges")}
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
                {t("recharge")}
              </Label>
              <select
                id="item-charges-rest"
                className={`${HUD_SELECT_CLASS} w-full`}
                disabled={!charges || !!stats.consumable}
                value={charges ? (charges.rest ?? "none") : "long"}
                onChange={(e) => charges && set({ charges: { max: charges.max, rest: e.target.value === "none" ? null : (e.target.value as "short" | "long") } })}
              >
                {ITEM_REST_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`rest.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SwitchField
            id="item-consumable"
            label={t("consumable")}
            checked={!!stats.consumable}
            disabled={!!stats.property}
            onCheckedChange={(v) => set({ consumable: v || undefined, ...(v && charges && { charges: { max: charges.max, rest: null } }) })}
          />
        </>
      )}
    </HudSection>
  );
}
