import { Prisma } from "@prisma/client";

import { buildDependencyClosure, type TemplateSnapshot } from "./dependencies";
import { domainSchemas } from "./domain-schemas";
import { digest } from "./identity";
import { digest as identityDigest } from "./identity";
import { CompendiumError, type JsonRecord, normalized } from "./parse";
import type { ExistingEntry, PlannedWrite } from "./plan";
import { ADAPTER_VERSION } from "./plan";
import type { CompendiumReport, ImportRepository } from "./service";
import type { TargetKind } from "./types";

import "server-only";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
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
import { isRecord } from "@/lib/utils/common/is-record";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import type { ScenarioContent } from "@/types/scenario";

export const kindTable = { "spell-groups": "spellGroups", spells: "spells", units: "units", artifacts: "artifacts", races: "races", classes: "classes", feats: "feats", backgrounds: "backgrounds" } as const;

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const object = (v: unknown): JsonRecord => isRecord(v) ? v : {};

export function nativeBody(kind: TargetKind, raw: JsonRecord): JsonRecord {
  const resource = kind !== "scenarioPages" ? CONTENT_RESOURCES[kind] as AnyContentResource : undefined;

  let body = kind === "scenarioPages" ? raw : object(resource?.toItem?.(raw) ?? raw);

  if (kind === "artifacts") body = { ...body, weapon: weaponStatsFromRow(raw), armor: armorStatsFromRow(raw), item: itemStatsFromRow(raw) };

  const parsed = domainSchemas[kind]?.safeParse(body);

  return parsed?.success ? parsed.data as JsonRecord : body;
}

async function loadDomain(campaignId: string) {
  const rows = new Map<TargetKind, Map<string, JsonRecord>>();

  for (const [kind, key] of Object.entries(kindTable)) {
    const table = BUNDLE_TABLES.find((t) => t.key === key)!;

    const values = await delegateOf(prisma, table).findMany({ where: { campaignId }, orderBy: { id: "asc" } });

    rows.set(kind as TargetKind, new Map(values.map((r) => [String(r.id), r])));
  }

  const pages = await prisma.scenarioPage.findMany({ where: { campaignId }, orderBy: { id: "asc" } });

  rows.set("scenarioPages", new Map(pages.map((r) => [r.id, r as unknown as JsonRecord])));

  return rows;
}

const sourceFields = new Set(["json", "abbreviation", "full", "authors", "convertedBy", "version", "dateReleased", "url", "color", "partnered"]);

export const prismaImportRepository: ImportRepository = {
  async authorize(actor) {
    if (!actor.isDM || actor.via !== "session") throw new CompendiumError("FORBIDDEN");

    const found = await prisma.campaign.findFirst({ where: { id: actor.campaignId, OR: [{ dmUserId: actor.userId }, { members: { some: { userId: actor.userId, role: "dm" } } }] }, select: { id: true } });

    if (!found) throw new CompendiumError("FORBIDDEN");
  },
  async loadContext(actor, input) {
    const settings = await prisma.campaign.findUniqueOrThrow({ where: { id: actor.campaignId }, select: { rules: true, credits: true } });

    const hasCharacters = (await prisma.character.count({ where: { campaignId: actor.campaignId } })) > 0;

    const provenance = await prisma.compendiumEntry.findMany({ where: { campaignId: actor.campaignId }, orderBy: { canonicalKey: "asc" } });

    const rows = await loadDomain(actor.campaignId);

    const existing: ExistingEntry[] = provenance.map((entry) => {
      const raw = rows.get(entry.kind as TargetKind)?.get(entry.localId);

      return { key: entry.canonicalKey, kind: entry.kind as TargetKind, edition: entry.edition as "classic" | "one" | "unknown", localId: entry.localId, baseline: object(entry.baseline), body: raw ? nativeBody(entry.kind as TargetKind, raw) : {}, missing: !raw };
    });

    const bindings: Record<string, ExistingEntry> = Object.create(null);

    for (const entry of provenance) for (const [key, rawBinding] of Object.entries(object(entry.bindings))) {
      const binding = object(rawBinding);

      if (typeof binding.kind !== "string" || typeof binding.id !== "string") continue;

      const kind = binding.kind as TargetKind;

      const raw = rows.get(kind)?.get(binding.id);

      if (!raw) continue;

      const body = nativeBody(kind, raw);

      bindings[key] = { ...existing.find((e) => e.kind === kind && e.localId === binding.id), key: existing.find((e) => e.kind === kind && e.localId === binding.id)?.key ?? key, kind, localId: binding.id, body, baseline: body };
    }
    for (const [key, binding] of Object.entries(input.bindings ?? {})) {
      const raw = rows.get(binding.kind)?.get(binding.id);

      if (!raw) throw new CompendiumError("BINDING_WRONG_CAMPAIGN", key);

      const body = nativeBody(binding.kind, raw);

      bindings[key] = { ...existing.find((e) => e.kind === binding.kind && e.localId === binding.id), key: existing.find((e) => e.kind === binding.kind && e.localId === binding.id)?.key ?? key, kind: binding.kind, localId: binding.id, body, baseline: body };
    }

    const templates: TemplateSnapshot[] = [];

    for (const templateId of new Set(input.dependencies?.map((d) => d.templateId))) {
      const template = await prisma.campaign.findFirst({ where: { id: templateId, kind: "template", visibility: "official", name: "5e SRD 5.2" }, select: { id: true } });

      if (!template) throw new CompendiumError("DEPENDENCY_TEMPLATE_UNAVAILABLE");

      const templateRows = await loadDomain(templateId);

      templates.push({ id: templateId, edition: "one", rows: [...templateRows].filter(([kind]) => kind !== "scenarioPages").flatMap(([kind, values]) => [...values.values()].map((r) => ({ id: String(r.id), kind, body: nativeBody(kind, r) }))) });
    }

    const dependencies = buildDependencyClosure(templates, input.dependencies ?? [], input.allowMixedEdition);

    for (const [refKey, key] of Object.entries(dependencies.aliases)) {
      const entry = dependencies.entries.find((e) => e.key === key)!;

      const localId = existing.find((e) => e.key === key && !e.missing)?.localId ?? `c${identityDigest([actor.campaignId, key]).slice(0, 24)}`;

      bindings[refKey] = { key, edition: entry.edition, kind: entry.kind, localId, body: entry.body, baseline: entry.body };
    }

    const occupiedNames = Object.fromEntries([...rows].map(([kind, values]) => [kind, [...values.values()].map((r) => ({ id: String(r.id), name: String(r.name ?? r.title) }))]));

    return { campaignId: actor.campaignId, existing, bindings, occupiedNames, extraEntries: dependencies.entries, settingsHash: digest(settings), hasCharacters };
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

    return String(object(result).id);
  },
  async saveEntry(actor, row) {
    const data = { kind: row.kind, localId: row.localId, locator: json(row.nested ? row.body : []), edition: row.edition, sourceJson: row.source, originalName: row.name, attribution: json(row.attribution ?? {}), inputHash: digest(row.baseline ?? row.body), adapterVersion: ADAPTER_VERSION, baseline: json(row.baseline ?? row.body), notes: row.notes, issues: json(row.issues), bindings: json(row.resolvedBindings ?? {}) };

    await prisma.compendiumEntry.upsert({ where: { campaignId_canonicalKey: { campaignId: actor.campaignId, canonicalKey: row.key } }, create: { campaignId: actor.campaignId, canonicalKey: row.key, ...data }, update: data });
  },
  async saveSources(actor, sources) {
    const credits: string[] = [];

    for (const source of sources) {
      const metadata = Object.fromEntries(Object.entries(source).filter(([k]) => sourceFields.has(k)));

      if (typeof source.json !== "string") continue;

      const sourceJson = normalized(source.json);

      await prisma.compendiumSource.upsert({ where: { campaignId_sourceJson: { campaignId: actor.campaignId, sourceJson } }, create: { campaignId: actor.campaignId, sourceJson, metadata: json(metadata) }, update: { metadata: json(metadata) } });
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
    await prisma.compendiumImportRun.create({ data: { id, campaignId: actor.campaignId, userId: actor.userId, idempotencyKey: key, planHash: requestHash, report: json(report) } });
    afterContentCommit(() => invalidateReference(Object.values(ReferenceKind), actor.campaignId));
  },
  applyRules: async (actor, patch) => { await updateCampaignRules(actor, patch); },
};
