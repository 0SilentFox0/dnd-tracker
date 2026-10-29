"use client";

import { useTranslations } from "next-intl";

import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import { SpellGrantEditor } from "./SpellGrantEditor";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { CommaListInput } from "@/components/ui/comma-list-input";
import { Input } from "@/components/ui/input";
import { ABILITY_KEYS, ABILITY_SCORE_CAP } from "@/lib/constants/abilities";
import { CHOICE_LIMITS, FEAT_TYPES } from "@/lib/constants/choices";
import { DND_SKILLS } from "@/lib/constants/skills";
import { MAX_SPELL_LEVEL } from "@/lib/constants/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import { toggleItem } from "@/lib/utils/common/collections";
import type { Choice, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

interface KindFieldsProps {
  choice: Choice;
  onPatch: (patch: Partial<Choice>) => void;
}

const CIRCLES = Array.from({ length: MAX_SPELL_LEVEL + 1 }, (_, i) => i);

export function SkillChoiceFields({ choice, onPatch }: KindFieldsProps) {
  const t = useTranslations();

  return (
    <div className="space-y-1">
      <p className="text-xs text-hud-muted">{t(choice.kind === "expertise" ? "choices.fields.skillsAnyExpertise" : "choices.fields.skillsAny")}</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {DND_SKILLS.map((s) => (
          <label key={s} className="flex items-center gap-1">
            <Checkbox checked={choice.skills?.includes(s) ?? false} onCheckedChange={() => onPatch({ skills: toggleItem(choice.skills, s) })} />
            {t(`common.dndSkills.${s}`)}
          </label>
        ))}
      </div>
    </div>
  );
}

export function AbilityScoreChoiceFields({ choice, onPatch }: KindFieldsProps) {
  const t = useTranslations("choices");

  const tc = useTranslator("common");

  return (
    <>
      <label className="block text-sm">
        {t("fields.maxPerAbility")}
        <Input type="number" min={1} max={CHOICE_LIMITS.points} aria-label={t("fields.maxPerAbilityAria")} value={choice.maxPerAbility ?? ""} onChange={(e) => onPatch({ maxPerAbility: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        {ABILITY_KEYS.map((a) => (
          <label key={a} className="flex items-center gap-1">
            <Checkbox checked={choice.abilities?.includes(a) ?? false} onCheckedChange={() => onPatch({ abilities: toggleItem(choice.abilities, a) })} />
            {tc(`abilities.${a}.label`)}
          </label>
        ))}
        <label className="flex items-center gap-2">
          {t("fields.points")}
          <Input type="number" min={1} max={CHOICE_LIMITS.points} className="w-20" aria-label={t("fields.pointsAria")} value={choice.points ?? 1} onChange={(e) => onPatch({ points: Number(e.target.value) || 1 })} />
        </label>
        <label className="flex items-center gap-2">
          {t("fields.cap")}
          <Input type="number" min={1} max={CHOICE_LIMITS.max} className="w-20" aria-label={t("fields.capAria")} value={choice.max ?? ABILITY_SCORE_CAP} onChange={(e) => onPatch({ max: Number(e.target.value) || ABILITY_SCORE_CAP })} />
        </label>
      </div>
    </>
  );
}

export function SpellChoiceFields({ choice, owner, onPatch }: KindFieldsProps & { owner: ChoiceOwner }) {
  const t = useTranslations("choices");

  const rule = choice.spells;

  return (
    <>
      <SpellGrantEditor value={choice.grant} onChange={(grant) => onPatch({ grant })} />
      {rule && (
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-1 items-center gap-2">
            {t("fields.lists")}
            <CommaListInput aria-label={t("fields.listsAria")} placeholder="Wizard, Cleric" value={rule.lists} onChange={(lists) => onPatch({ spells: { ...rule, lists } })} />
          </label>
          <label className="flex items-center gap-2">
            {t("fields.minCircle")}
            <select aria-label={t("fields.minCircleAria")} className={HUD_SELECT_CLASS} value={rule.minLevel} onChange={(e) => onPatch({ spells: { ...rule, minLevel: Number(e.target.value) } })}>
              {CIRCLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            {t("fields.maxCircle")}
            <select aria-label={t("fields.maxCircleAria")} className={HUD_SELECT_CLASS} value={String(rule.maxLevel)} onChange={(e) => onPatch({ spells: { ...rule, maxLevel: e.target.value === "slots" ? "slots" : Number(e.target.value) } })}>
              {CIRCLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {owner === "class" && <option value="slots">{t("fields.slotsMax")}</option>}
            </select>
          </label>
        </div>
      )}
    </>
  );
}

interface OptionChoiceFieldsProps extends KindFieldsProps {
  campaignId: string;
  owner: ChoiceOwner;
  classColumns: readonly ClassColumn[];
  errors: { report: (key: string, count: number) => void; drop: (key: string) => void; prefix: string };
}

export function OptionChoiceFields({ choice, onPatch, campaignId, owner, classColumns, errors }: OptionChoiceFieldsProps) {
  const t = useTranslations();

  return (
    <>
      {choice.kind === "feat" && (
        <div className="flex flex-wrap gap-3 text-sm">
          {FEAT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-1">
              <Checkbox checked={choice.featTypes?.includes(type) ?? false} onCheckedChange={() => onPatch({ featTypes: toggleItem(choice.featTypes, type) })} />
              {t(`feats.types.${type}`)}
            </label>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {choice.kind === "feat" && <p className="text-xs text-hud-muted">{t("choices.fields.embeddedOptions")}</p>}
        <ChoiceOptionsEditor campaignId={campaignId} owner={owner} value={choice.options ?? []} onChange={(options) => onPatch({ options })} classColumns={classColumns} errors={errors} />
      </div>
    </>
  );
}
