import { mediaProgress } from "./media/queue";
import { adaptCompendium } from "./adapt";
import { canonicalKey } from "./identity";
import { parseCompendium } from "./parse";
import { kindTable, prismaImportRepository } from "./repository";
import type { CompendiumReport, ImportInput } from "./service";

import { CampaignKind, CampaignVisibility, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import { templateLocaleWhere } from "@/lib/server/templates/locale-filter";
import type { Actor } from "@/lib/utils/api/actor";

/** Presentation of the same Task19 adapter output; no alternate planner or writes. */
export function previewPresentation(input: ImportInput, issues: ReadonlyArray<{ code: string; path: string }> = []) {
  const adapted = adaptCompendium(parseCompendium(input.json), input);

  return { rulesDiff: input.rulesPatch ?? {}, graph: adapted.entries.map(entry => ({ key: entry.key, name: entry.name, kind: entry.kind, inputPath: entry.inputPath,
    refs: [...entry.refs, ...(entry.mergeParent ? [entry.mergeParent] : [])].map(ref => ({ key: canonicalKey(ref.kind, ref.name, ref.source, ref.edition, ref.parent), kind: ref.kind, name: ref.name, source: ref.source, edition: ref.edition, unresolved: issues.some(i => i.code === "UNRESOLVED_REF" && i.path === `${entry.key}.${ref.path.join(".")}`) })),
    summary: entry.kind === "backgrounds" ? { choices: entry.body.choices ?? [], skills: entry.body.skillProficiencies ?? [], tools: entry.body.toolProficiencies ?? [], originFeat: entry.refs.filter(ref => ref.kind === "feat").map(ref => ({ name: ref.name, source: ref.source })), equipment: "manual", currency: "manual" } : undefined,
  })) };
}

async function targets(campaignId: string) {
  return (await Promise.all(Object.entries(kindTable).map(async ([kind, key]) => {
    const table = BUNDLE_TABLES.find(t => t.key === key)!;

    const rows = await delegateOf(prisma, table).findMany({ where: { campaignId }, orderBy: { name: "asc" }, select: { id: true, name: true } });

    return rows.map(row => ({ kind, id: String(row.id), name: String(row.name) }));
  }))).flat();
}

/** Read-only pickers; the Task19 repository revalidates every selected target and edition. */
export async function importTargetOptions(actor: Actor) {
  await prismaImportRepository.authorize(actor);

  const templates = await prisma.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL, name: SRD_TEMPLATE_NAME, ...templateLocaleWhere() }, select: { id: true, name: true } });

  return { local: await targets(actor.campaignId), templates: await Promise.all(templates.map(async template => ({ ...template, edition: "one" as const, rows: await targets(template.id) }))) };
}

/** Replaces the stored queue (items with URLs) with counters for API responses. */
export function mediaPresentation<R extends Pick<CompendiumReport, "media" | "runId">>(report: R) {
  const { items } = report.media ?? {};

  if (!items || !report.runId) return report;

  return { ...report, media: mediaProgress(report.runId, { version: 1, items, skipped: report.media?.skipped ?? {} }) };
}
