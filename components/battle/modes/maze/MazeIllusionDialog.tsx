"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { useUnitPicker } from "@/lib/hooks/units";
import type { IllusionDisguise, IllusionPair } from "@/types/battle";

interface Hero {
  id: string;
  name: string;
}

interface Row {
  a: string;
  b: string;
  aSees: IllusionDisguise | null;
  bSees: IllusionDisguise | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  heroes: Hero[];
  pairs: IllusionPair[];
  onApply: (pairs: IllusionPair[]) => void;
  onClear: () => void;
}

const EMPTY_ROW: Row = { a: "", b: "", aSees: null, bSees: null };

const MAX_PAIRS = 8;

const isComplete = (r: Row): r is IllusionPair => !!r.a && !!r.b && r.a !== r.b && !!r.aSees && !!r.bSees;

function MaskPicker({ campaignId, label, value, onChange }: { campaignId: string; label: string; value: IllusionDisguise | null; onChange: (d: IllusionDisguise) => void }) {
  const tPick = useTranslations("battleDm.addParticipant");

  const picker = useUnitPicker(campaignId, true);

  const units = picker.tiers.flatMap((tier) => tier.units);

  const options = units.map((u) => ({ value: u.id, label: u.name }));

  if (value?.unitId && !units.some((u) => u.id === value.unitId)) options.push({ value: value.unitId, label: value.name });

  const pickUnit = (id: string) => {
    const unit = units.find((u) => u.id === id);

    if (unit) onChange({ name: unit.name, unitId: unit.id, ...(unit.avatar ? { avatar: unit.avatar } : {}) });
  };

  return (
    <div className="space-y-1">
      <div className="text-xs text-hud-muted">{label}</div>
      <div className="flex gap-2">
        <SelectField aria-label={tPick("race")} value={picker.raceKey} onValueChange={picker.selectRace} placeholder={tPick("pickRace")} options={picker.raceOptions.map((r) => ({ value: r.key, label: `${r.label} (${r.count})` }))} />
        <SelectField aria-label={label} value={value?.unitId ?? ""} onValueChange={pickUnit} placeholder={tPick("pickUnit")} options={options} disabled={!picker.raceKey && !value} />
      </div>
    </div>
  );
}

export function MazeIllusionDialog({ open, onOpenChange, campaignId, heroes, pairs, onApply, onClear }: Props) {
  const t = useTranslations("battleDm.maze.illusion");

  const tPick = useTranslations("battleDm.addParticipant");

  const tMaze = useTranslations("battleDm.maze");

  const tActions = useTranslations("common.actions");

  const [rows, setRows] = useState<Row[]>(pairs);

  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const takenElsewhere = (i: number) => new Set(rows.flatMap((r, j) => (j === i ? [] : [r.a, r.b])));

  const heroOptions = (i: number, other: string) => {
    const taken = takenElsewhere(i);

    return heroes.map((h) => ({ value: h.id, label: h.name, disabled: taken.has(h.id) || h.id === other }));
  };

  const ready = rows.every(isComplete);

  const close = () => onOpenChange(false);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      hud
      title={tMaze("toolbar.illusion")}
      footer={
        <>
          <Button variant="outline" onClick={() => { onClear(); close(); }}>
            {t("restore")}
          </Button>
          <Button disabled={!ready} onClick={() => { onApply(rows.filter(isComplete)); close(); }}>
            {t("apply")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {rows.map((r, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hud-rule p-2">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                {tActions("remove")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField aria-label={`${tPick("hero")} A`} value={r.a} onValueChange={(a) => patch(i, { a })} placeholder={tPick("pickHero")} options={heroOptions(i, r.b)} />
              <SelectField aria-label={`${tPick("hero")} B`} value={r.b} onValueChange={(b) => patch(i, { b })} placeholder={tPick("pickHero")} options={heroOptions(i, r.a)} />
            </div>
            <MaskPicker campaignId={campaignId} label={t("aSees")} value={r.aSees} onChange={(aSees) => patch(i, { aSees })} />
            <MaskPicker campaignId={campaignId} label={t("bSees")} value={r.bSees} onChange={(bSees) => patch(i, { bSees })} />
          </div>
        ))}
        <Button type="button" variant="outline" disabled={rows.length >= MAX_PAIRS} onClick={() => setRows((rs) => [...rs, EMPTY_ROW])}>
          {tActions("add")}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
