"use client";

import { useTranslations } from "next-intl";

import { skillLabel } from "../skill-label";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { CHARACTERISTIC_KEYS, SPEC_RE } from "@/systems/wfrp/rules/characteristics/keys";
import type { Endeavour, EndeavourKind } from "@/systems/wfrp/rules/downtime/types";
import { skillAdvanceKey } from "@/systems/wfrp/rules/skills/catalog";

const KINDS: EndeavourKind[] = ["earn", "train", "tend", "rest", "custom"];

const TEXT_MAX = 200;

export interface PickerSkill {
  key: string;
  spec?: string;
}

interface Props {
  value: Endeavour | undefined;
  onChange: (value: Endeavour) => void;
  patients: { id: string; name: string }[];
  skills: PickerSkill[];
}

const DEFAULTS: Record<EndeavourKind, Endeavour> = {
  earn: { kind: "earn", params: { skill: "charm" } },
  train: { kind: "train", params: { kind: "characteristic", key: CHARACTERISTIC_KEYS[0] } },
  tend: { kind: "tend", params: { patientId: "" } },
  rest: { kind: "rest", params: {} },
  custom: { kind: "custom", params: { text: "" } },
};

export function isEndeavourValid(e: Endeavour | undefined): boolean {
  if (!e) return false;

  switch (e.kind) {
    case "earn":
      return e.params.skill === "charm" || SPEC_RE.test(e.params.spec);
    case "train":
      return e.params.key !== "";
    case "tend":
      return e.params.patientId !== "";
    case "custom":
      return e.params.text.trim() !== "" && e.params.text.length <= TEXT_MAX;
    default:
      return true;
  }
}

export function EndeavourPicker({ value, onChange, patients, skills }: Props) {
  const t = useTranslations("wfrpDowntime");

  const tg = useTranslations("gameTerms");

  const tc = useTranslations("gameTerms.characteristics");

  const skillOptions = skills.map((s) => ({ value: skillAdvanceKey(s.key, s.spec), label: skillLabel(tg, s.key, s.spec) }));

  return (
    <div className="space-y-2">
      <SelectField aria-label={t("tab.endeavourTitle")} value={value?.kind ?? ""} onValueChange={(k) => onChange(DEFAULTS[k as EndeavourKind])} options={KINDS.map((k) => ({ value: k, label: t(`endeavours.${k}`) }))} placeholder={t("tab.noEndeavour")} triggerClassName="min-h-11 w-full" />
      {value && <p className="text-xs text-hud-muted">{t(`endeavourHints.${value.kind}`)}</p>}
      {value?.kind === "earn" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField aria-label={t("params.skill")} value={value.params.skill} onValueChange={(s) => onChange({ kind: "earn", params: s === "trade" ? { skill: "trade", spec: "" } : { skill: "charm" } })} options={[{ value: "trade", label: t("params.trade") }, { value: "charm", label: t("params.charm") }]} triggerClassName="min-h-11 w-full" />
          {value.params.skill === "trade" && <Input className="min-h-11" aria-label={t("params.spec")} placeholder={t("params.spec")} value={value.params.spec} aria-invalid={!SPEC_RE.test(value.params.spec)} onChange={(e) => onChange({ kind: "earn", params: { skill: "trade", spec: e.target.value.toLowerCase() } })} />}
        </div>
      )}
      {value?.kind === "train" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SelectField aria-label={t("params.trainKind")} value={value.params.kind} onValueChange={(k) => onChange({ kind: "train", params: k === "skill" ? { kind: "skill", key: skillOptions[0]?.value ?? "" } : { kind: "characteristic", key: CHARACTERISTIC_KEYS[0] } })} options={[{ value: "characteristic", label: t("params.characteristic") }, { value: "skill", label: t("params.skillKind") }]} triggerClassName="min-h-11 w-full" />
          <SelectField aria-label={t("params.trainKey")} value={value.params.key} onValueChange={(key) => onChange({ kind: "train", params: { kind: value.params.kind, key } })} options={value.params.kind === "skill" ? skillOptions : CHARACTERISTIC_KEYS.map((k) => ({ value: k, label: tc(`${k}.short`) }))} triggerClassName="min-h-11 w-full" />
        </div>
      )}
      {value?.kind === "tend" && <SelectField aria-label={t("params.patient")} value={value.params.patientId} onValueChange={(patientId) => onChange({ kind: "tend", params: { patientId } })} options={patients.map((p) => ({ value: p.id, label: p.name }))} placeholder={t("params.patient")} triggerClassName="min-h-11 w-full" />}
      {value?.kind === "custom" && <Input className="min-h-11" aria-label={t("params.text")} placeholder={t("params.text")} maxLength={TEXT_MAX} value={value.params.text} onChange={(e) => onChange({ kind: "custom", params: { text: e.target.value } })} />}
    </div>
  );
}
