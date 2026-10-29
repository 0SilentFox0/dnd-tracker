import { matchCampaignRows, matchTemplateRows, pendingRefs } from "./auto-bind";
import { buildDependencyClosure, type TemplateSnapshot } from "./dependencies";
import { domainSchemas } from "./domain-schemas";
import { digest } from "./identity";
import { CompendiumError, type JsonRecord, normalized } from "./parse";
import type { ExistingEntry, PlannedWrite } from "./plan";
import { ADAPTER_VERSION } from "./plan";
import type { CompendiumReport, DependencyChoice, ImportRepository } from "./service";
import type { TargetKind } from "./types";

import "server-only";
import { invalidateAllReference } from "@/lib/cache/tags";
import { CampaignKind, CampaignVisibility, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { jsonContentInput } from "@/lib/server/assistant/json";
import { updateCampaignRules } from "@/lib/server/campaigns/rules";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { contentWrite } from "@/lib/server/scenario/content-write";
import { snapshotIfDue } from "@/lib/server/scenario/versions";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import { newContentId } from "@/lib/server/templates/ids";
import type { Actor } from "@/lib/utils/api/actor";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { asRecord } from "@/lib/utils/common/json";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { parseRules } from "@/lib/utils/rules/schema";
import type { ScenarioContent } from "@/types/scenario";

export const kindTable = { "spell-groups": "spellGroups", spells: "spells", units: "units", artifacts: "artifacts", races: "races", classes: "classes", feats: "feats", backgrounds: "backgrounds" } as const;

export function nativeBody(kind: TargetKind, raw: JsonRecord): JsonRecord {
  const resource = kind !== "scenarioPages" ? CONTENT_RESOURCES[kind] as AnyContentResource : undefined;

  let body = kind === "scenarioPages" ? raw : asRecord(resource?.toItem?.(raw) ?? raw);

  if (kind === "artifacts") body = { ...body, weapon: weaponStatsFromRow(raw), armor: armorStatsFromRow(raw), item: itemStatsFromRow(raw) };

  const parsed = domainSchemas[kind]?.safeParse(body);

  return parsed?.success ? parsed.data as JsonRecord : body;
}

const tableOf = (key: string) => BUNDLE_TABLES.find((t) => t.key === key)!;

type DomainRows = Map<TargetKind, Map<string, JsonRecord>>;

async function loadNames(campaignId: string) {
  const names: Record<string, Array<{ id: string; name: string }>> = {};

  for (const [kind, key] of Object.entries(kindTable)) {
    const values = await delegateOf(prisma, tableOf(key)).findMany({ where: { campaignId }, orderBy: { id: "asc" }, select: { id: true, name: true } });

    names[kind] = values.map((r) => ({ id: String(r.id), name: String(r.name) }));
  }

  const pages = await prisma.scenarioPage.findMany({ where: { campaignId }, orderBy: { id: "asc" }, select: { id: true, title: true } });

  names.scenarioPages = pages.map((r) => ({ id: r.id, name: String(r.title) }));

  return names;
}

async function loadRows(campaignId: string, refs: Iterable<{ kind: TargetKind; id: string }>) {
  const wanted = new Map<TargetKind, Set<string>>();

  for (const { kind, id } of refs) wanted.set(kind, (wanted.get(kind) ?? new Set()).add(id));

  const rows: DomainRows = new Map();

  for (const [kind, ids] of wanted) {
    if (kind !== "scenarioPages" && !(kind in kindTable)) continue;

    const where = { campaignId, id: { in: [...ids] } };

    const values = kind === "scenarioPages"
      ? await prisma.scenarioPage.findMany({ where }) as unknown as JsonRecord[]
      : await delegateOf(prisma, tableOf(kindTable[kind as keyof typeof kindTable])).findMany({ where });

    rows.set(kind, new Map(values.map((r) => [String(r.id), r])));
  }

  return rows;
}

async function loadTemplateRows(templateId: string) {
  const rows = await Promise.all(Object.entries(kindTable).map(async ([kind, key]) => {
    const values = await delegateOf(prisma, tableOf(key)).findMany({ where: { campaignId: templateId }, orderBy: { id: "asc" } });

    return values.map((r) => ({ id: String(r.id), kind: kind as TargetKind, body: nativeBody(kind as TargetKind, r) }));
  }));

  return rows.flat();
}

const entryRefKey = (kind: string, id: string) => `${kind}:${id}`;

const sourceFields = new Set(["json", "abbreviation", "full", "authors", "convertedBy", "version", "dateReleased", "url", "color", "partnered"]);

export const prismaImportRepository: ImportRepository = {
  async authorize(actor) {
    if (!actor.isDM || actor.via !== "session") throw new CompendiumError("FORBIDDEN");

    const found = await prisma.campaign.findFirst({ where: { id: actor.campaignId, OR: [{ dmUserId: actor.userId }, { members: { some: { userId: actor.userId, role: "dm" } } }] }, select: { id: true } });

    if (!found) throw new CompendiumError("FORBIDDEN");
  },
  async loadContext(actor, input, adaptedEntries = []) {
    const settings = await prisma.campaign.findUniqueOrThrow({ where: { id: actor.campaignId }, select: { rules: true, credits: true } });

    const hasCharacters = (await prisma.character.count({ where: { campaignId: actor.campaignId } })) > 0;

    const hasClasses = (await prisma.gameClass.count({ where: { campaignId: actor.campaignId } })) > 0;

    const provenance = await prisma.compendiumEntry.findMany({ where: { campaignId: actor.campaignId }, orderBy: { canonicalKey: "asc" }, select: { canonicalKey: true, kind: true, localId: true, edition: true, baseline: true, bindings: true } });

    const bindingRefs = (entry: (typeof provenance)[number]) => Object.values(asRecord(entry.bindings)).map(asRecord).filter((b) => typeof b.kind === "string" && typeof b.id === "string").map((b) => ({ kind: b.kind as TargetKind, id: b.id as string }));

    const rows = await loadRows(actor.campaignId, [
      ...provenance.map((entry) => ({ kind: entry.kind as TargetKind, id: entry.localId })),
      ...provenance.flatMap(bindingRefs),
      ...Object.values(input.bindings ?? {}),
    ]);

    const existing: ExistingEntry[] = provenance.map((entry) => {
      const raw = rows.get(entry.kind as TargetKind)?.get(entry.localId);

      return { key: entry.canonicalKey, kind: entry.kind as TargetKind, edition: entry.edition as "classic" | "one" | "unknown", localId: entry.localId, baseline: asRecord(entry.baseline), body: raw ? nativeBody(entry.kind as TargetKind, raw) : {}, missing: !raw };
    });

    const existingByRef = new Map(existing.map((e) => [entryRefKey(e.kind ?? "", e.localId), e] as const));

    const boundEntry = (key: string, kind: TargetKind, localId: string, raw: JsonRecord): ExistingEntry => {
      const body = nativeBody(kind, raw);

      const found = existingByRef.get(entryRefKey(kind, localId));

      return { ...found, key: found?.key ?? key, kind, localId, body, baseline: body };
    };

    const bindings: Record<string, ExistingEntry> = Object.create(null);

    for (const entry of provenance) for (const [key, rawBinding] of Object.entries(asRecord(entry.bindings))) {
      const binding = asRecord(rawBinding);

      if (typeof binding.kind !== "string" || typeof binding.id !== "string") continue;

      const kind = binding.kind as TargetKind;

      const raw = rows.get(kind)?.get(binding.id);

      if (!raw) continue;

      bindings[key] = boundEntry(key, kind, binding.id, raw);
    }
    for (const [key, binding] of Object.entries(input.bindings ?? {})) {
      const raw = rows.get(binding.kind)?.get(binding.id);

      if (!raw) throw new CompendiumError("BINDING_WRONG_CAMPAIGN", key);

      bindings[key] = boundEntry(key, binding.kind, binding.id, raw);
    }

    const occupiedNames = await loadNames(actor.campaignId);

    const explicit = new Set((input.dependencies ?? []).map((d) => d.refKey));

    const pending = pendingRefs(adaptedEntries.filter((e) => !input.excludedKeys?.includes(e.key)), (key) => key in bindings || explicit.has(key) || existing.some((e) => e.key === key));

    const imported = new Set(provenance.map((e) => `${e.kind}:${e.localId}`));

    const matched = matchCampaignRows(pending, occupiedNames, (kind, id) => imported.has(`${kind}:${id}`));

    const autoRows = await loadRows(actor.campaignId, matched.map((m) => ({ kind: m.kind, id: m.row.id })));

    for (const m of matched) {
      const raw = autoRows.get(m.kind)?.get(m.row.id);

      if (raw) bindings[m.key] = boundEntry(m.key, m.kind, m.row.id, raw);
    }

    const choices: DependencyChoice[] = [...(input.dependencies ?? [])];

    const stillPending = pending.filter((p) => !(p.key in bindings));

    if (stillPending.length) {
      const official = await prisma.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL, name: SRD_TEMPLATE_NAME }, select: { id: true } });

      for (const template of official) {
        const names = await loadNames(template.id);

        for (const p of matchTemplateRows(stillPending, names, input.allowMixedEdition)) {
          if (!choices.some((c) => c.refKey === p.key)) choices.push({ refKey: p.key, templateId: template.id, kind: p.kind, localId: p.row.id, edition: "one" });
        }
      }
    }

    const templates: TemplateSnapshot[] = [];

    for (const templateId of new Set(choices.map((d) => d.templateId))) {
      const template = await prisma.campaign.findFirst({ where: { id: templateId, kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL, name: SRD_TEMPLATE_NAME }, select: { id: true } });

      if (!template) throw new CompendiumError("DEPENDENCY_TEMPLATE_UNAVAILABLE");

      templates.push({ id: templateId, edition: "one", rows: await loadTemplateRows(templateId) });
    }

    const dependencies = buildDependencyClosure(templates, choices, input.allowMixedEdition);

    for (const [refKey, key] of Object.entries(dependencies.aliases)) {
      const entry = dependencies.entries.find((e) => e.key === key)!;

      const localId = existing.find((e) => e.key === key && !e.missing)?.localId ?? `c${digest([actor.campaignId, key]).slice(0, 24)}`;

      bindings[refKey] = { key, edition: entry.edition, kind: entry.kind, localId, body: entry.body, baseline: entry.body };
    }

    return { campaignId: actor.campaignId, existing, bindings, occupiedNames, extraEntries: dependencies.entries, settingsHash: digest(settings), hasCharacters, hasClasses, classesEnabled: parseRules(settings.rules).classes.enabled };
  },
  async findRun(actor, key) {
    const run = await prisma.compendiumImportRun.findUnique({ where: { campaignId_idempotencyKey: { campaignId: actor.campaignId, idempotencyKey: key } } });

    return run ? { requestHash: run.planHash, report: run.report as unknown as CompendiumReport } : undefined;
  },
  transaction: (actor, callback) => withCampaignContentWrite(actor.campaignId, () => callback(prismaImportRepository)),
  async write(actor, row) {
    if (row.kind === "scenarioPages") {
      const body = domainSchemas.scenarioPages!.parse(row.body) as { kind: string; title: string; content: ScenarioContent };

      if (row.operation === "update") {
        await snapshotIfDue(prisma, row.localId, actor.userId, { force: true });

        const current = await prisma.scenarioPage.findFirst({ where: { campaignId: actor.campaignId, id: row.localId } });

        if (!current) throw new CompendiumError("TARGET_MISSING");

        await prisma.scenarioPage.update({ where: { id: current.id }, data: { title: body.title, ...contentWrite(body.title, body.content), version: { increment: 1 } } });

        return current.id;
      }

      const page = await prisma.scenarioPage.create({ data: { campaignId: actor.campaignId, kind: "note", status: "draft", characterId: null, title: body.title, ...contentWrite(body.title, body.content) } });

      return page.id;
    }

    const resource = CONTENT_RESOURCES[row.kind] as AnyContentResource;

    const current = row.operation === "update" ? await resource.find(actor, row.localId, "write") : null;

    if (row.operation === "update" && !current) throw new CompendiumError("TARGET_MISSING");

    const result = current ? await resource.update(actor, current, resource.schemas.update.parse(row.body)) : await resource.create(actor, resource.schemas.create.parse(row.body));

    return String(asRecord(result).id);
  },
  async saveEntry(actor, row) {
    const data = { kind: row.kind, localId: row.localId, locator: jsonContentInput(row.nested ? row.body : []), edition: row.edition, sourceJson: row.source, originalName: row.name, attribution: jsonContentInput(row.attribution ?? {}), inputHash: digest(row.baseline ?? row.body), adapterVersion: ADAPTER_VERSION, baseline: jsonContentInput(row.baseline ?? row.body), notes: row.notes, issues: jsonContentInput(row.issues), bindings: jsonContentInput(row.resolvedBindings ?? {}) };

    await prisma.compendiumEntry.upsert({ where: { campaignId_canonicalKey: { campaignId: actor.campaignId, canonicalKey: row.key } }, create: { campaignId: actor.campaignId, canonicalKey: row.key, ...data }, update: data });
  },
  async saveSources(actor, sources) {
    const credits: string[] = [];

    for (const source of sources) {
      const metadata = Object.fromEntries(Object.entries(source).filter(([k]) => sourceFields.has(k)));

      if (typeof source.json !== "string") continue;

      const sourceJson = normalized(source.json);

      await prisma.compendiumSource.upsert({ where: { campaignId_sourceJson: { campaignId: actor.campaignId, sourceJson } }, create: { campaignId: actor.campaignId, sourceJson, metadata: jsonContentInput(metadata) }, update: { metadata: jsonContentInput(metadata) } });
      credits.push([source.full ?? source.json, Array.isArray(source.authors) ? source.authors.join(", ") : "", source.version ?? ""].filter(Boolean).join(" — "));
    }

    if (credits.length) {
      const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: actor.campaignId }, select: { credits: true } });

      const next = [campaign.credits ?? "", ...credits.filter((credit) => !(campaign.credits ?? "").split("\n").includes(credit))].filter(Boolean).join("\n");

      if (next.length > 10_000) throw new CompendiumError("CREDITS_SIZE");

      await prisma.campaign.update({ where: { id: actor.campaignId }, data: { credits: next } });
    }
  },
  async saveRun(actor, key, requestHash, report) {
    const id = newContentId();

    report.runId = id;
    await prisma.compendiumImportRun.create({ data: { id, campaignId: actor.campaignId, userId: actor.userId, idempotencyKey: key, planHash: requestHash, report: jsonContentInput(report) } });
    afterContentCommit(() => invalidateAllReference(actor.campaignId));
  },
  applyRules: async (actor, patch) => { await updateCampaignRules(actor, patch); },
};
