"use client";

import { useTranslations } from "next-intl";

import { OptionButton } from "@/components/hud/OptionButton";
import { ABILITY_KEYS, ABILITY_SCORE_CAP, type AbilityKey } from "@/lib/constants/abilities";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { useTranslator } from "@/lib/i18n/use-translator";
import { MULTICLASS_SKILLS_ID } from "@/lib/utils/characters/choices/class-choices";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { featPrerequisiteMet } from "@/lib/utils/characters/choices/validate";
import type { Choice, ChoicePick, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export interface PickerContext {
  level: number;
  totalLevel: number;
  columns?: readonly ClassColumn[];
  maxSlotLevel: number;
  feats: FeatData[];
  featsById: Readonly<Record<string, FeatData>>;
  spells: SpellRef[];
  proficient: ReadonlySet<DndSkill>;
  scores: Record<AbilityKey, number>;
  /** scores з урахуванням змін піків відносно збережених; без нього — scores + піки цього вибору */
  scoreAfter?: Record<AbilityKey, number>;
}

interface ChoicePickerProps {
  choice: Choice;
  value: ChoicePick[];
  onChange: (next: ChoicePick[]) => void;
  ctx: PickerContext;
  error?: string;
}

function Card({ role, checked, disabled, onClick, title, note }: { role: "checkbox" | "radio"; checked: boolean; disabled?: boolean; onClick: () => void; title: string; note?: string }) {
  return <OptionButton variant="form" role={role} checked={checked} disabled={disabled} onClick={onClick} title={title} note={note} />;
}

export function ChoicePicker({ choice, value, onChange, ctx, error }: ChoicePickerProps) {
  const t = useTranslations("choices");

  const tg = useTranslator("gameTerms");

  const target = resolveChoiceCount(choice, ctx.level, ctx.columns);

  const ids = value.map((p) => p.id);

  const toggle = (id: string, extra?: Partial<ChoicePick>) => {
    if (ids.includes(id)) return onChange(value.filter((p) => p.id !== id));

    if (target === 1) return onChange([{ id, ...extra }]);

    if (value.length < target) onChange([...value, { id, ...extra }]);
  };

  const header = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="hud-sc text-sm text-hud-ink">{choice.id === MULTICLASS_SKILLS_ID ? t("picker.multiclassSkills") : choice.label}</span>
      <span className="text-xs text-hud-muted">{`${value.length} / ${target}`}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {header}
      {choice.description && <ChoiceDescription text={choice.description} />}
      {choice.kind === "option" && <OptionCards choice={choice} ids={ids} level={ctx.level} onToggle={toggle} />}
      {choice.kind === "feat" && <FeatList choice={choice} value={value} ctx={ctx} actions={{ onToggle: toggle, onChange }} />}
      {(choice.kind === "skill" || choice.kind === "expertise") && (
        <div className="flex flex-wrap gap-2">
          {(choice.skills?.length ? choice.skills : DND_SKILLS).map((s) => (
            <Card key={s} role="checkbox" checked={ids.includes(s)} disabled={choice.kind === "expertise" && !ctx.proficient.has(s)} onClick={() => toggle(s)} title={tg(`dndSkills.${s}`)} />
          ))}
        </div>
      )}
      {choice.kind === "abilityScore" && <AbilityPoints choice={choice} value={value} onChange={onChange} scores={ctx.scores} after={ctx.scoreAfter} />}
      {choice.kind === "spell" && <SpellList choice={choice} ids={ids} ctx={ctx} onToggle={toggle} />}
      {value.some((p) => !isKnown(choice, p, ctx)) && <p className="text-xs text-hud-danger">{t("picker.notFound")}</p>}
      {error && (
        <p role="alert" className="text-xs text-hud-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const LEAD_MAX = 200;

function ChoiceDescription({ text }: { text: string }) {
  const t = useTranslations("choices");

  const body = text.trim();

  if (body.length <= LEAD_MAX) return <p className="whitespace-pre-line text-xs text-hud-muted">{body}</p>;

  const [lead, ...tail] = body.split(/\n\s*\n/);

  const cut = lead.length > LEAD_MAX;

  return (
    <div className="space-y-1 text-xs text-hud-muted">
      <p>{cut ? `${lead.slice(0, LEAD_MAX).trimEnd()}…` : lead}</p>
      <details>
        <summary className="cursor-pointer text-hud-gold">{t("picker.moreDetails")}</summary>
        <p className="mt-1 whitespace-pre-line">{cut || tail.length === 0 ? body : tail.join("\n\n")}</p>
      </details>
    </div>
  );
}

function isKnown(choice: Choice, p: ChoicePick, ctx: PickerContext) {
  if (choice.kind === "option") return !!choice.options?.some((o) => o.id === p.id);

  if (choice.kind === "feat") return !!ctx.featsById[p.id] || !!choice.options?.some((o) => o.id === p.id);

  if (choice.kind === "spell") return ctx.spells.some((s) => s.id === p.id);

  return true;
}

function OptionCards({ choice, ids, level, onToggle }: { choice: Choice; ids: string[]; level: number; onToggle: (id: string) => void }) {
  const t = useTranslations("choices");

  const names = new Map((choice.options ?? []).map((o) => [o.id, o.name]));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(choice.options ?? []).map((o) => {
        const missing = (o.requires ?? []).filter((r) => !ids.includes(r));

        const reason = o.minLevel && o.minLevel > level ? t("picker.fromLevel", { level: o.minLevel }) : missing.length > 0 ? t("picker.requires", { list: missing.map((r) => names.get(r) ?? r).join(", ") }) : undefined;

        return <Card key={o.id} role="checkbox" checked={ids.includes(o.id)} disabled={!!reason && !ids.includes(o.id)} onClick={() => onToggle(o.id)} title={o.name} note={reason ?? o.description?.slice(0, 160)} />;
      })}
    </div>
  );
}

function FeatList({ choice, value, ctx, actions }: { choice: Choice; value: ChoicePick[]; ctx: PickerContext; actions: { onToggle: (id: string) => void; onChange: (next: ChoicePick[]) => void } }) {
  const t = useTranslations("choices");

  const tf = useTranslator("feats");

  const feats = ctx.feats.filter((f) => (choice.featTypes ?? []).includes(f.type));

  const setNested = (id: string, picks: Picks) => actions.onChange(value.map((p) => (p.id === id ? { ...p, picks } : p)));

  return (
    <div className="space-y-2">
      {(choice.options ?? []).map((o) => (
        <Card key={o.id} role="radio" checked={value.some((p) => p.id === o.id)} onClick={() => actions.onToggle(o.id)} title={o.name} note={o.description?.slice(0, 160)} />
      ))}
      {feats.map((f) => {
        const met = featPrerequisiteMet(f, ctx);

        const picked = value.find((p) => p.id === f.id);

        return (
          <div key={f.id} className="space-y-2">
            <Card role="radio" checked={!!picked} disabled={!met && !picked} onClick={() => actions.onToggle(f.id)} title={f.name} note={[tf(`types.${f.type}`), f.prerequisite.level ? t("picker.featLevel", { level: f.prerequisite.level }) : "", met ? "" : t("picker.featUnmet")].filter(Boolean).join(" · ")} />
            {picked && f.choices.length > 0 && (
              <div className="ml-4 space-y-3 border-l border-hud-line/40 pl-3">
                {f.choices.map((c) => (
                  <ChoicePicker key={c.id} choice={c} value={picked.picks?.[c.id] ?? []} onChange={(list) => setNested(f.id, { ...(picked.picks ?? {}), [c.id]: list })} ctx={{ ...ctx, level: ctx.totalLevel, columns: [] }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AbilityPoints({ choice, value, onChange, scores, after: scoreAfter }: { choice: Choice; value: ChoicePick[]; onChange: (next: ChoicePick[]) => void; scores: Record<AbilityKey, number>; after?: Record<AbilityKey, number> }) {

  const tg = useTranslator("gameTerms");

  const points = choice.points ?? 1;

  const max = choice.max ?? ABILITY_SCORE_CAP;

  const allowed = choice.abilities?.length ? choice.abilities : ABILITY_KEYS;

  return (
    <div className="space-y-1">
      {allowed.map((a) => {
        const added = value.filter((p) => p.id === a).length;

        const after = scoreAfter?.[a] ?? scores[a] + added;

        return (
          <div key={a} className="flex items-center gap-2 text-sm">
            <span className="w-28">{tg(`abilities.${a}.label`)}</span>
            <button type="button" aria-label={`−1 ${tg(`abilities.${a}.label`)}`} disabled={added === 0} onClick={() => onChange(value.filter((p, i) => !(p.id === a && i === value.map((x) => x.id).lastIndexOf(a))))} className="rounded border border-hud-line/50 px-2 disabled:opacity-40">
              −
            </button>
            <button type="button" aria-label={`+1 ${tg(`abilities.${a}.label`)}`} disabled={value.length >= points || after + 1 > max || (choice.maxPerAbility !== undefined && added >= choice.maxPerAbility)} onClick={() => onChange([...value, { id: a }])} className="rounded border border-hud-line/50 px-2 disabled:opacity-40">
              +
            </button>
            {after !== scores[a] && <span className="text-xs text-hud-muted">{`${scores[a]} → ${after}`}</span>}
          </div>
        );
      })}
    </div>
  );
}

function SpellList({ choice, ids, ctx, onToggle }: { choice: Choice; ids: string[]; ctx: PickerContext; onToggle: (id: string) => void }) {
  const t = useTranslations("choices");

  const tg = useTranslator("gameTerms");

  const rule = choice.spells;

  if (!rule) return null;

  const max = rule.maxLevel === "slots" ? ctx.maxSlotLevel : rule.maxLevel;

  const shown = ctx.spells.filter((s) => s.level >= rule.minLevel && s.level <= max && (rule.lists.length === 0 || s.lists.some((l) => rule.lists.includes(l))));

  return (
    <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
      {shown.map((s) => (
        <Card key={s.id} role="checkbox" checked={ids.includes(s.id)} onClick={() => onToggle(s.id)} title={s.name} note={tg(`spellLevels.${s.level}`)} />
      ))}
      {shown.length === 0 && <p className="text-xs text-hud-muted">{t("picker.noSpells", { lists: rule.lists.join(", ") || "—" })}</p>}
    </div>
  );
}
