import type { CompendiumReport, ImportInput } from "@/lib/server/compendium-import/service";
import type { ImportIssue, TargetKind } from "@/lib/server/compendium-import/types";

export type { CompendiumReport, ImportInput, ImportIssue, TargetKind };

export type CompendiumOptions = Omit<ImportInput, "json" | "categories">;

export type CompendiumGraphRow = { key: string; name: string; kind: TargetKind; inputPath?: string; refs: Array<{ key: string; kind: string; name: string; source: string; edition: string }>; summary?: unknown };

export type CompendiumPreview = { token: string; report: CompendiumReport; graph: CompendiumGraphRow[]; rulesDiff?: unknown };

export type CompendiumTarget = { kind: TargetKind; id: string; name: string };

export type CompendiumTargets = { local: CompendiumTarget[]; templates: Array<{ id: string; name: string; edition: "one"; rows: CompendiumTarget[] }> };

export type CompendiumRun = { id: string; report?: CompendiumReport };

export type CompendiumRunsPage = { runs: CompendiumRun[]; hasMore: boolean };

export type CompendiumSourceEntry = { canonicalKey: string; originalName: string; sourceJson: string; edition: string; attribution: unknown; notes: string; issues: unknown };

export type CompendiumEntriesPage = { entries: CompendiumSourceEntry[]; hasMore: boolean };

export type CompendiumConfirmBody = { input: ImportInput; token: string; idempotencyKey: string; rightsConfirmed: boolean };
