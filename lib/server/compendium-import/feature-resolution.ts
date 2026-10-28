import { array, effectiveEdition, object, str, unsupported } from "./adapters/shared";
import { renderEntries } from "./entries";
import { canonicalKey, nestedId } from "./identity";
import { type Compendium, type JsonRecord, normalized } from "./parse";
import { type AdapterContext, type ImportIssue, issue } from "./types";

export interface FeatureResolutionContext {
  root: Compendium;
  editionFallback: unknown;
  issues: ImportIssue[];
  embedded: Record<string, number>;
  usedOptionals: Set<string>;
}

// Explicit feature UIDs include parent identities. No guessing by first matching display name.
export function resolveCompendiumFeatures(
  raw: unknown,
  kind: "classFeature" | "subclassFeature",
  ownerPath: string,
  context: FeatureResolutionContext
): JsonRecord[] {
  const { root, editionFallback, issues, embedded, usedOptionals } = context;

  const out: JsonRecord[] = [];

  for (const [i, ref] of array(raw).entries()) {
    const uid = typeof ref === "string" ? ref : str(object(ref)[kind]);

    const parts = uid.split("|");

    const candidates = array(root[kind])
      .map(object)
      .filter(
        (r) =>
          normalized(str(r.name)) === normalized(parts[0] ?? "") &&
          normalized(str(r.className)) === normalized(parts[1] ?? "") &&
          normalized(str(r.classSource)) === normalized(parts[2] ?? "") &&
          (kind !== "subclassFeature" ||
            (normalized(str(r.subclassShortName)) ===
              normalized(parts[3] ?? "") &&
              normalized(str(r.subclassSource)) ===
                normalized(parts[4] ?? ""))) &&
          Number(r.level) ===
            Number(parts[kind === "classFeature" ? 3 : 5]) &&
          (!parts[kind === "classFeature" ? 4 : 6] ||
            normalized(str(r.source)) ===
              normalized(parts[kind === "classFeature" ? 4 : 6]))
      );

    if (candidates.length !== 1) {
      issues.push(
        issue(
          "FEATURE_REF_UNRESOLVED",
          `${ownerPath}[${i}]`,
          "error",
          "Додайте точне визначення feature або виключіть залежний клас/підклас"
        )
      );
      continue;
    }

    const row = candidates[0];

    embedded[kind] = (embedded[kind] ?? 0) + 1;
    issues.push(
      issue(
        "MANUAL_CLASS_FEATURE",
        ownerPath,
        "warning",
        "Особливість перенесено як опис; застосовуйте її правила вручну"
      )
    );

    const rendered = renderEntries(row.entries, `${kind}.${i}`);

    const featureContext: AdapterContext = {
      root,
      inputKind: kind,
      path: ownerPath,
      source: str(row.source),
      edition: effectiveEdition(row.edition, editionFallback),
      key: ownerPath,
      issues,
    };

    const featureNotes = unsupported(
      row,
      [
        "className",
        "classSource",
        "subclassShortName",
        "subclassSource",
        "level",
        "header",
      ],
      featureContext
    );

    issues.push(...rendered.issues);

    const choices: JsonRecord[] = [];

    const optional = (v: JsonRecord): JsonRecord | undefined => {
      const uid = str(v.optionalfeature);

      const [name, source] = uid.split("|");

      const candidates = array(root.optionalfeature)
        .map(object)
        .filter(
          (r) =>
            normalized(str(r.name)) === normalized(name) &&
            normalized(str(r.source)) === normalized(source ?? "")
        );

      if (candidates.length !== 1) {
        issues.push(
          issue(
            "OPTIONAL_FEATURE_REF",
            ownerPath,
            "error",
            "Додайте визначення опційної особливості"
          )
        );

        return;
      }

      usedOptionals.add(
        canonicalKey(
          "optionalfeature",
          name,
          source ?? "",
          effectiveEdition(candidates[0].edition, editionFallback)
        )
      );

      return {
        id: nestedId(uid),
        name,
        description: [
          renderEntries(candidates[0].entries).text,
          unsupported(
            candidates[0],
            ["prerequisite", "featureType"],
            featureContext
          ),
          candidates[0].prerequisite
            ? `Вимоги (ДМ перевіряє вручну): ${JSON.stringify(
                candidates[0].prerequisite
              )}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        abilities: [],
      };
    };

    const visit = (v: unknown) => {
      if (Array.isArray(v)) {
        v.forEach(visit);

        return;
      }

      const o = object(v);

      if (o.type === "options") {
        const children = array(o.entries).map(object);

        if (
          children.length &&
          children.every((child) => child.type === "refOptionalfeature") &&
          Number.isInteger(o.count) &&
          Number(o.count) > 0 &&
          Number(o.count) <= children.length
        ) {
          const options = children.flatMap((child) => optional(child) ?? []);

          if (options.length === children.length)
            choices.push({
              id: nestedId(`${ownerPath}:${JSON.stringify(parts)}:${choices.length}`),
              label: "Особливості на вибір",
              kind: "option",
              count: o.count,
              options,
            });
        } else
          issues.push(
            issue(
              "MANUAL_OPTIONAL_PROGRESSION",
              ownerPath,
              "warning",
              "Налаштуйте неоднозначний вибір особливостей вручну"
            )
          );

        return;
      }

      if (o.type === "refOptionalfeature") {
        const option = optional(o);

        if (option)
          choices.push({
            id: nestedId(`${ownerPath}:${JSON.stringify(parts)}:${choices.length}:${str(o.optionalfeature)}`),
            label: option.name,
            kind: "option",
            count: 1,
            options: [option],
          });

        return;
      }

      Object.values(o).forEach(visit);
    };

    visit(row.entries);
    out.push({
      level: row.level,
      description: [str(row.name), rendered.text, featureNotes].filter(Boolean).join("\n"),
      abilities: [],
      ...(choices.length && { choices }),
    });
  }

  return out;
}
