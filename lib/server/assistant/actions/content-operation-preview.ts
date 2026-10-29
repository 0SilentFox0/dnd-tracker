import type { FieldChange, TargetRef } from "../types";
import { contentDeleteCascades } from "./content-dependencies";
import { jsonContent } from "./content-snapshot";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { Translator } from "@/lib/i18n/translator";
import { ContentError } from "@/lib/server/content/errors";
import type { ContentOperationId } from "@/lib/server/content/operation-service";
import { asRecord } from "@/lib/utils/common/json";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

type Row = Record<string, unknown>;

/** Read-only projections over the same uncached, locked rows used by the guard. */
export function operationPreview(id: ContentOperationId, input: Row, t: Translator, state: unknown): { changes: FieldChange[]; targets: TargetRef[] } | null {
  const root = asRecord(state), tables = asRecord(root.tables), body = asRecord(input.body);

  const rows = (key: string): Row[] => Array.isArray(tables[key]) ? tables[key] as Row[] : [];

  const target = (domain: string, row: Row): TargetRef => ({ domain, id: String(row.id), name: String(row.name ?? row.title ?? row.race ?? row.id) });

  const changes: FieldChange[] = [];

  const field = (domain: string, row: Row, path: string, after: unknown) => changes.push({ target: target(domain, row), path, before: jsonContent(path === "$record" ? row : row[path]), after: jsonContent(after) });

  const owned = (domain: string, key: string) => {
    const row = rows(domain).find((row) => row.id === input[key]);

    if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    return row;
  };

  switch (id) {
    case "skills.duplicate": { const row = owned("skills", "skillId");

 field("skills", row, "name", String(row.name).trim() ? t("defaults.copyOf", { name: String(row.name) }) : t("defaults.skillCopy")); break; }
    case "spells.remove-from-group": field("spells", owned("spells", "spellId"), "groupId", null); break;
    case "spell-groups.remove-all-spells": {
      owned("spellGroups", "groupId");
      for (const row of rows("spells").filter((row) => row.groupId === input.groupId)) field("spells", row, "groupId", null);
      break;
    }
    case "spells.delete-by-level": {
      const selected = rows("spells").filter((row) => row.level === body.level);

      for (const row of selected) field("spells", row, "$record", null);
      changes.push(...contentDeleteCascades(state, "spells", selected.map((row) => String(row.id))));
      break;
    }
    case "tracks.reorder": {
      const ids = body.ids as string[];

      const known = rows("tracks");

      if (ids.length !== known.length || new Set(ids).size !== ids.length || !ids.every((id) => known.some((row) => row.id === id))) throw new ContentError(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

      for (const [index, id] of ids.entries()) field("tracks", known.find((row) => row.id === id)!, "sortOrder", index);
      break;
    }
    case "rules.update": {
      const before = parseRules(asRecord(root.campaign).rules);

      const merged = mergeRules(before, RulesetPatchSchema.parse(body));

      if (!merged.ok) throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

      const row = { ...before, id: "rules", name: t("results.rules") };

      for (const key of Object.keys(body)) field("rules", row, key, merged.rules[key as keyof typeof merged.rules]);
      break;
    }
    case "skill-trees.save": {
      const row = rows("skillTrees").find((row) => row.id === input.treeId) ?? rows("skillTrees").find((row) => row.race === body.race);

      field("skillTrees", row ?? { id: "new", race: body.race }, "skills", body.skills);
      break;
    }
    default: return null;
  }

  return { changes, targets: [...new Map(changes.map((change) => [`${change.target.domain}:${change.target.id}`, change.target])).values()] };
}
