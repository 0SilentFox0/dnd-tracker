"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { FieldRenderer } from "../fields/FieldRenderer";
import { FlatField } from "../fields/FlatField";
import { ScaleColumnSelect } from "../fields/ScaleColumnSelect";
import { SectionShell } from "./SectionShell";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { LocalizedFieldMeta } from "@/lib/utils/abilities/registry/fields";
import type { Limits } from "@/lib/utils/abilities/schema";
import { patchDefined } from "@/lib/utils/common/patch-defined";
import { ITEM_CHARGES_KEY } from "@/lib/utils/items/pools";

const LIMIT_FIELD_NAMES = ["perBattle", "perRound", "perTurn", "cooldownRounds", "chance"] as const;

export function LimitsSection({ ability, path, onChange, state }: AbilitySectionProps) {
  const t = useTranslations("abilities.limits");

  const { classColumns: columns, itemCharges } = useAbilityEditor();

  const limitFields: readonly LocalizedFieldMeta[] = LIMIT_FIELD_NAMES.map((name) => ({ name, label: t(name), input: "number", optional: true }));

  const restOptions = [
    { value: "short", label: t("restShort") },
    { value: "long", label: t("restLong") },
  ];

  if (ability.trigger.event === "passive") {
    return (
      <SectionShell path={path} part="limits" title={t("title")} {...state} className="space-y-1">
        <p className="text-xs text-muted-foreground">{t("passive")}</p>
      </SectionShell>
    );
  }

  const isButton = ability.trigger.event === "bonusAction" || ability.trigger.event === "action";

  const setTop = (name: "stackable" | "maxStacks" | "maxTargets", v: unknown) => {
    const next = patchDefined(ability, { [name]: v } as Partial<typeof ability>, (x) => x === undefined || x === false);

    if (name === "stackable" && v !== true) delete next.maxStacks;

    onChange(next);
  };

  const set = (name: keyof Limits, v: unknown) => {
    const next: Limits = patchDefined(ability.limits ?? {}, { [name]: v } as Partial<Limits>);

    if (name === "lair" && v) delete next.legendaryCost;

    if (name === "legendaryCost" && v) delete next.lair;

    const { limits: _l, ...rest } = ability;

    onChange(Object.keys(next).length ? { ...rest, limits: next } : rest);
  };

  const setRest = (patch: { rest?: string; uses?: NonNullable<Limits["perRest"]>["uses"] }) => {
    const current = ability.limits?.perRest;

    const rest = "rest" in patch ? patch.rest : (current?.rest ?? "long");

    const uses = "uses" in patch ? patch.uses : (current?.uses ?? 1);

    const clearing = "rest" in patch ? !patch.rest : "uses" in patch && patch.uses === undefined;

    set("perRest", clearing ? undefined : { rest, uses });
  };

  return (
    <SectionShell path={path} part="limits" title={t("title")} {...state}>
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        {limitFields.map((f) => (
          <FieldRenderer key={f.name} meta={f} path={`${path}.limits.${f.name}`} value={ability.limits?.[f.name as keyof Limits]} onChange={(v) => set(f.name as keyof Limits, v)} />
        ))}
        <FieldRenderer meta={{ name: "perRestKind", label: t("rest"), input: "select", options: restOptions, optional: true }} path={`${path}.limits.perRest.rest`} value={ability.limits?.perRest?.rest} onChange={(v) => setRest({ rest: v as string | undefined })} />
        {columns ? (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">{t("restUses")}</span>
            <FlatField id={`${path}.limits.perRest.uses`} meta={{ name: "perRestUses", label: t("uses"), input: "flat", optional: true }} value={ability.limits?.perRest?.uses as never} onChange={(v) => setRest({ uses: v as never })} />
          </div>
        ) : (
          <FieldRenderer meta={{ name: "perRestUses", label: t("uses"), input: "number", optional: true }} path={`${path}.limits.perRest.uses`} value={ability.limits?.perRest?.uses as number | undefined} onChange={(v) => setRest({ uses: v as number | undefined })} />
        )}
        {columns && isButton && (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">{t("pool")}</span>
            <div className="flex gap-1">
              <ScaleColumnSelect id={`${path}.limits.pool.key`} poolsOnly value={ability.limits?.pool?.key} onChange={(key) => set("pool", { key, cost: ability.limits?.pool?.cost ?? 1 })} />
              <Input aria-label={t("poolCost")} type="number" min={1} max={20} className="w-16" value={ability.limits?.pool?.cost ?? ""} onChange={(e) => set("pool", e.target.value === "" ? undefined : { key: ability.limits?.pool?.key ?? "", cost: Number(e.target.value) })} />
            </div>
          </div>
        )}
        {itemCharges && !columns && isButton && (
          <div className="col-span-3 space-y-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox aria-label={t("itemCharges")} checked={ability.limits?.pool?.key === ITEM_CHARGES_KEY} onCheckedChange={(on) => set("pool", on === true ? { key: ITEM_CHARGES_KEY, cost: ability.limits?.pool?.cost ?? 1 } : undefined)} />
              {t("itemCharges")}
            </label>
            {ability.limits?.pool?.key === ITEM_CHARGES_KEY && (
              <Input aria-label={t("chargesPerUse")} type="number" min={1} max={20} className="w-16" value={ability.limits.pool.cost} onChange={(e) => set("pool", { key: ITEM_CHARGES_KEY, cost: Math.max(1, Number(e.target.value) || 1) })} />
            )}
          </div>
        )}
      </div>
      {ability.trigger.event === "action" && <label className="flex items-center gap-2 text-xs text-muted-foreground"><Checkbox aria-label={t("lair")} checked={!!ability.limits?.lair} onCheckedChange={(on) => set("lair", on === true ? true : undefined)} />{t("lair")}</label>}
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        <FieldRenderer meta={{ name: "stackable", label: t("stackable"), input: "toggle", optional: true }} path={`${path}.stackable`} value={ability.stackable} onChange={(v) => setTop("stackable", v)} />
        {ability.stackable && (
          <FieldRenderer meta={{ name: "maxStacks", label: t("maxStacks"), input: "number", optional: true }} path={`${path}.maxStacks`} value={ability.maxStacks} onChange={(v) => setTop("maxStacks", v)} />
        )}
        {isButton && (
          <FieldRenderer meta={{ name: "maxTargets", label: t("maxTargets"), input: "number", optional: true }} path={`${path}.maxTargets`} value={ability.maxTargets} onChange={(v) => setTop("maxTargets", v)} />
        )}
        {ability.trigger.event === "action" && (
          <FieldRenderer meta={{ name: "legendaryCost", label: t("legendaryCost"), input: "number", optional: true }} path={`${path}.limits.legendaryCost`} value={ability.limits?.legendaryCost} onChange={(v) => set("legendaryCost", v)} />
        )}
      </div>
    </SectionShell>
  );
}
