import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { resolvedPickCount } from "@/lib/utils/characters/choices/pending";
import { summarize } from "@/lib/utils/characters/classes/summary";
import type { CharacterClassEntry, ClassFeature, ClassProgression, GameClassData, ProgressionItem, ProgressionPick, ProgressionRow } from "@/types/classes";

const itemsOf = (feature: ClassFeature): ProgressionItem[] =>
  feature.abilities.map((a) => ({ key: a.id ?? `${feature.level}:${a.name}`, name: a.name, summary: summarize(a.description), description: a.description, icon: a.icon ?? null }));

export function buildClassProgression(cls: GameClassData, entry?: CharacterClassEntry): ClassProgression {
  const columns = cls.columns ?? [];

  const rows: ProgressionRow[] = Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => {
    const level = i + 1;

    let state: ProgressionRow["state"] = "template";

    if (entry) state = level === entry.level ? "current" : level === entry.level + 1 ? "next" : level < entry.level ? "reached" : "future";

    return { level, state, base: [], bySubclass: Object.fromEntries(cls.subclasses.map((s) => [s.id, []])), picks: [] };
  });

  const rowAt = (level: number) => rows[Math.min(MAX_CLASS_LEVEL, Math.max(1, level)) - 1];

  const statusOf = (level: number, required: number, done: number): ProgressionPick["status"] => {
    if (!entry) return "template";

    if (level > entry.level) return "locked";

    return done >= required ? "done" : "open";
  };

  const addPicks = (features: ClassFeature[], prefix: string) => {
    for (const feature of features) {
      for (const choice of feature.choices ?? []) {
        const required = resolveChoiceCount(choice, entry ? Math.max(choice.level, entry.level) : choice.level, columns);

        if (required === 0) continue;

        const done = entry ? resolvedPickCount(choice, entry.choices?.[choice.id] ?? []) : null;

        const chosen = entry ? (entry.choices?.[choice.id] ?? []).map((p) => choice.options?.find((o) => o.id === p.id)?.name ?? p.id) : undefined;

        rowAt(choice.level).picks.push({ key: `${prefix}${choice.id}`, kind: choice.kind, label: choice.label, required, done, status: statusOf(choice.level, required, done ?? 0), chosen });
      }
    }
  };

  for (const feature of cls.features) {
    rowAt(feature.level).base.push(...itemsOf(feature));
  }

  addPicks(cls.features, "");

  for (const sub of cls.subclasses) {
    for (const feature of sub.features) rowAt(feature.level).bySubclass[sub.id].push(...itemsOf(feature));

    if (!entry) addPicks(sub.features, `${sub.id}:`);
    else if (entry.subclassId === sub.id) addPicks(sub.features, "");
  }

  if (cls.subclassLevel !== null && cls.subclasses.length > 0) {
    const done = entry?.subclassId && cls.subclasses.some((s) => s.id === entry.subclassId) ? 1 : 0;

    rowAt(cls.subclassLevel).picks.push({ key: "subclass", kind: "subclass", label: "classes.progression.subclass", required: 1, done: entry ? done : null, status: statusOf(cls.subclassLevel, 1, done) });
  }

  return {
    classId: cls.id,
    className: cls.name,
    icon: cls.icon,
    color: cls.color,
    subclasses: cls.subclasses.map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? null, chosen: entry?.subclassId === s.id })),
    subclassLevel: cls.subclassLevel,
    rows,
  };
}
