import { canonicalKey } from "./identity";
import { CompendiumError, type JsonRecord } from "./parse";
import type { DependencyChoice } from "./service";
import { type AdaptedEntry, type CompendiumRef, type Edition, issue, type TargetKind } from "./types";

import { isRecord } from "@/lib/utils/common/is-record";

export interface TemplateSnapshot { id: string; edition: Edition; rows: Array<{ id: string; kind: TargetKind; body: JsonRecord }> }

const kinds: Record<string, TargetKind> = { class: "classes", race: "races", feat: "feats", background: "backgrounds", spell: "spells", item: "artifacts", baseitem: "artifacts", monster: "units", spellSchool: "spell-groups" };

export function buildDependencyClosure(templates: TemplateSnapshot[], choices: DependencyChoice[], allowMixedEdition = false) {
  const entries = new Map<string, AdaptedEntry>();

  const aliases: Record<string, string> = Object.create(null);

  for (const choice of choices) {
    const template = templates.find((t) => t.id === choice.templateId);

    const target = template?.rows.find((r) => r.id === choice.localId && r.kind === choice.kind);

    if (!template || !target || choice.edition !== template.edition) throw new CompendiumError("DEPENDENCY_TARGET");

    let ref: unknown;

    try { ref = JSON.parse(choice.refKey); } catch { throw new CompendiumError("DEPENDENCY_REF"); }

    if (!Array.isArray(ref) || ref[0] !== 1 || kinds[ref[1]] !== choice.kind) throw new CompendiumError("DEPENDENCY_KIND");

    if (ref[3] !== template.edition && !allowMixedEdition) throw new CompendiumError("MIXED_EDITION_CONFIRMATION_REQUIRED");

    const source = `template:${template.id}`;

    const keyOf = (r: TemplateSnapshot["rows"][number]) => canonicalKey(`template:${r.kind}`, r.id, source, template.edition);

    function visit(row: TemplateSnapshot["rows"][number]): string {
      const key = keyOf(row);

      if (entries.has(key)) return key;

      const body = structuredClone(row.body);

      delete body.icon; delete body.avatar; delete body.fx;

      const refs: CompendiumRef[] = [];

      const entry: AdaptedEntry = { key, inputKind: `template:${row.kind}`, kind: row.kind, name: String(body.name), source, edition: template!.edition, body, refs, notes: "", issues: [issue("TEMPLATE_DEPENDENCY", key, "warning", "Додано базовий запис із явно обраного шаблону")] };

      entries.set(key, entry);

      const walk = (v: unknown, path: (string | number)[]) => {
        if (typeof v === "string") {
          const dependency = template!.rows.find((candidate) => candidate.id === v);

          if (dependency) {
            visit(dependency);
            refs.push({ path, kind: `template:${dependency.kind}`, name: dependency.id, source, edition: template!.edition });
          }
        } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
        else if (isRecord(v)) Object.entries(v).forEach(([k, x]) => walk(x, [...path, k]));
      };

      Object.entries(body).filter(([k]) => !["id", "name", "description", "appearanceDescription"].includes(k)).forEach(([k, v]) => walk(v, [k]));

      return key;
    }

    aliases[choice.refKey] = visit(target);
  }

  return { entries: [...entries.values()], aliases };
}
