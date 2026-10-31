# SRD template overlay implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development. User-prescribed execution: three sequential Sol implementation tasks, controller checks, one final Astra review (no extra per-task reviewer agents).

**Goal:** One English official SRD template, with persistent clone language and consistent localized clone/sync content.
**Architecture:** Reuse hash-keyed translations in a shared pure translator with seed/DB adapters; prepare localized source bundles before existing import and sync hashes. Preserve the existing database schema and lineage.
**Tech Stack:** TypeScript, Next.js, Prisma, Vitest, React.
**Spec:** `docs/superpowers/specs/2026-10-31-srd-template-overlay-design.md` (approved).

## Global Constraints

- English is authoritative; missing translations fall back to English. A later translation is a normal source update.
- No schema changes, production writes, clone migration, or automatic deletion. Keep the English source ID and source row IDs.
- Work only in `/Users/silentfox/.codex/worktrees/c859/dnd-tracker`, branch `feat/srd-template-overlay`.
- Preserve mechanical values, IDs, icons, unknown JSON fields, rules, settings, credits and provenance. Only recognized text and name references change.
- Private sources and file imports retain behavior. Store content language separately from request/interface locale.
- Three sequential implementers on `gpt-6.1-sol` (high); one final reviewer on `gpt-6-astra` (high). No worker-spawned agents.
- Run focused RED/GREEN tests per task; controller runs relevant combined checks/build and a broader suite at the end. Do not access `.env.local` or remote services for tests.

## Review Focus

- Serialized artifact itemStats text and references versus raw DB columns (Task 1 parity test).
- Partial class/artifact-name synchronization leaves cross-row references consistent without overwriting conflicts (Task 2 effective graph tests).
- Prepared assistant source fingerprints bind resolved ID, content language and translated bundle (Task 2 preview/execute tests).
- Legacy uk IDs cannot bypass canonical normalization; direct owner tile queries cannot expose duplicate variant selection (Tasks 2/3).
- Private copy -> saved template -> clone retains immediate-parent lineage/language with no double translation (Task 2).

### Task 1: Shared text overlay and database bundle adapter

**Files:** Create `lib/srd/i18n/catalog.ts`, `lib/srd/i18n/overlay.ts`, `lib/server/templates/localize-srd-bundle.ts` and its `__tests__/localize-srd-bundle.test.ts`. Modify script `scripts/srd/i18n/catalog.ts` and `overlay.ts` to reuse shared code, retaining their public exports. Extend existing overlay/catalog/data-integrity tests.

**Interfaces:**
- Shared catalog retains `Translations = Record<string, string>`, `TextClass`, `hashText(cls, en): string`, `classOf(key, parent?): TextClass | null`, `isTranslatable(text): boolean`, `mapStrings(...)`, `extractCatalog(data)` with backward-compatible public signatures. Extend traversal context internally or via optional parameters for path-aware fields.
- Shared seed `applyOverlay(data: SrdData, tr: Translations): SrdData` retains its behavior plus missing prose/attack-reference support; avoid runtime imports from script-only filesystem modules.
- Produce `localizeSrdBundle(bundle: Bundle, translations: Translations): Bundle`. This pure DB-format adapter does not identify campaigns or load a language. Task 2 supplies the dictionary after source checks.

- [ ] Write focused regressions first. Example assertions: `out.classes[0].features[0].abilities[0].name === 'Лють'`; `out.units[0].abilities[0].perform.attack === out.units[0].attacks[0].name`; original data unchanged.
- [ ] Test text fallback and exact en/empty-dictionary identity; context-specific casting.trigger/proficiencies/tools/languages/alignment/properties; preserve casting.text, IDs, enums, formulas and placeholders. Same English text/hash remains compatible with all 4,522 existing translations.
- [ ] Use actual `itemStatsColumns`/`weaponStatsColumns` to construct DB artifact rows. Assert translated nameTemplate, parameter labels, base names and properties; serialized spell IDs survive overlay and existing remapIds. Malformed/unknown records and no-op serialization stay unchanged. Never rebuild JSON through lossy schema parsing.
- [ ] Test seed name references versus DB ID references, class/choice spell lists, artifact bases and case-insensitive unit attack collisions. DB adapter retains other bundle tables/sections verbatim. Translation collisions fail before any write.
- [ ] Run new tests and observe expected failures, then implement the shared walker/classifier plus seed and DB adapters. Do not retranslate already localized output or mutate inputs.
- [ ] GREEN: `pnpm exec vitest run scripts/srd/i18n/__tests__ scripts/srd/__tests__/data-integrity-i18n.test.ts lib/server/templates/__tests__/localize-srd-bundle.test.ts lib/server/templates/__tests__/remap-ids.test.ts`; run targeted eslint and `git diff --check`.
- [ ] Commit task changes; report exact exported interfaces, RED/GREEN results and any limitations.

### Task 2: Canonical source preparation, creation and synchronization

**Files:** Create `lib/utils/campaigns/template-locales.ts`, `lib/server/templates/prepare-source.ts`, `lib/server/templates/srd-translations.ts`, `lib/server/templates/sync/name-references.ts` with focused tests. Modify `lib/server/campaigns/create-campaign.ts`, `action-service.ts`, `lib/server/assistant/actions/campaign.ts`, `lib/schemas/campaigns.ts`, clone schema in `lib/schemas/templates.ts`, `lib/server/templates/sync/context.ts`, `apply.ts`, `types.ts`, relevant API error constants/translations and tests. Do not change picker/listing/seeder yet.

**Consumes:** `localizeSrdBundle(bundle, translations)` from Task 1.
**Produces:**
- Client-safe metadata `SRD_CONTENT_LOCALES = ['en', 'uk'] as const`, `SrdContentLocale`, `TemplateIdentity = { kind?: string; visibility?: string; templateKey?: string | null; locale?: string | null }`, `isOfficialSrdTemplate(source): boolean`, `isCanonicalSrdTemplate(source): boolean`, `isLegacySrdTemplate(source): boolean`. Match `templateKey === SRD_TEMPLATE_NAME`, never a display name alone. English/null is canonical; uk is the legacy alias.
- Server `translationsFor(locale: SrdContentLocale): Translations` via static uk.json import; no runtime fs discovery/client dictionary.
- `PreparedCampaignSource = { id: string; bundle: Bundle; contentLocale: string | null; source: TemplateIdentity }`.
- `prepareCampaignSource(db: TemplateDb, sourceId: string, options: { userId: string; contentLocale?: SrdContentLocale; mode: 'create' | 'clone' | 'save' }): Promise<PreparedCampaignSource>`; resolve authorized canonical source for official alias create/clone, raw source for ordinary clones/save. Check authorization on actual source, duplicate/missing canonical candidates and unsupported language overrides. Callers can lock the resolved source before export in action flows; keep this explicit rather than re-exporting a prepared source later.
- Add optional `contentLocale: 'en' | 'uk'` to creation and clone input schemas; do not add locale changes to ordinary update settings or save schema. Persist prepared locale with campaign creation.
- Sync context identifies official canonical source and stored target locale; use the same translator before classifying. Add an optional `srdOverlay` boolean to SyncContext for a scoped graph guard.
- `assertSrdNameReferences(before: Array<{ table: BundleTable; row: Record<string, unknown> }>, after: Array<{ table: BundleTable; row: Record<string, unknown> }>, selectedLocalIds: ReadonlySet<string>): void` checks affected name references in the effective graph before writes; emits a translated/actionable ContentError with related row names. Can use a local helper module to keep apply.ts focused.

- [ ] RED creation tests: canonical en/uk, missing text fallback, stored locale independent of interface locale, unsupported/irrelevant override rejection, private same-name no overlay, alias defaults uk but explicit en wins, missing/duplicate canonical rejection. Assert `createdFromId` and `sourceId` point to canonical IDs.
- [ ] RED lifecycle tests: official direct clone uses selected language; ordinary clone and save-as-template preserve raw content/locale/null and immediate parent; private saved template cannot inherit official identity. Prepared creation imports exact bundle once.
- [ ] RED assistant tests: prepare and execute use identical resolved source/language/digest; translation or canonical source changes invalidate confirmation. Preserve the existing source lock and content-write transaction discipline, applying it to the resolved ID. Clone uses a dedicated schema so save-as-template does not accidentally gain language selection.
- [ ] RED sync tests with fake DB and injectable/mocked dictionary: immediate no diff; source change, translation addition/revision, ignored updates and local conflict; apply followed by no diff; stale translation hash rejected; legacy uk source unchanged; unrelated source untouched.
- [ ] RED graph tests: selecting only renamed class or only its translated list references rejects; all related rows succeeds; artifact base rename has same behavior, including serialized itemStats; unchanged unrelated unmatched references are tolerated; no automatic overwrite of ignored/conflicting rows. Assert errors occur before writes.
- [ ] Implement preparation plus metadata and static registry; wire create, clone, save, assistant and sync. Leave raw export unchanged. Effective source metadata is server-owned, not accepted from client input.
- [ ] GREEN: run affected suites under `lib/server/templates`, `lib/server/campaigns`, `lib/server/assistant/__tests__/campaign-actions.test.ts`, `app/api/__tests__/campaign-templates-api.test.ts`, plus new schema tests; targeted eslint, TypeScript check, `git diff --check`.
- [ ] Commit; report contracts for Task 3, RED/GREEN evidence and concerns.

### Task 3: Single-template selection, canonical seeding and documentation

**Files:** Modify `types/campaigns.ts`, `lib/server/templates/list-templates.ts`, `app/campaigns/page.tsx`, `components/campaigns/templates/TemplatePicker.tsx`, `TemplateTiles.tsx`, `NewCampaignForm.tsx`, `lib/hooks/campaigns/useTemplates.ts`, campaign API payload types, `scripts/srd/load-template.ts`, relevant tests and `docs/architecture/i18n.md` / `content-api.md`. Extract a pure seed-argument helper in `scripts/srd/lib/load-template.ts` if needed for testable validation. Keep shared store/filter callers compatible.

**Consumes:** Task 2 metadata predicates, `SRD_CONTENT_LOCALES`, optional request `contentLocale`.
**Produces:** `TemplateCard.availableLocales?: readonly string[]`; `TemplateSelection.contentLocale?: 'en' | 'uk'`. API exposes a single canonical SRD card with both locales; private/non-SRD legacy groups keep existing behavior. Add no dictionary imports to UI.

- [ ] RED picker test: switching en/uk emits the same `templateId` and selected `contentLocale`; supported UI language defaults once, explicit user selection persists. NewCampaignForm sends contentLocale. Switching source/file/none clears stale locale.
- [ ] RED listing tests: canonical card advertises en/uk, legacy uk is excluded from official picker and direct owner tiles, private same-name templates unaffected. TemplateTiles links canonical ID and does not pretend to show a translated preview. Preserve existing unrelated variant grouping.
- [ ] RED seeder tests: no args or `--locale en` load English, `--locale uk`/missing/unknown value fails before DB access, no translation template creation. Existing empty template store/filter behavior stays intact.
- [ ] Implement UI, payloads, canonical listing and seeder. Document English fallback, persisted content locale, same localized sync source, serialized text/name reference constraints, and deployment-based dictionary updates.
- [ ] Add rollout notes: code changes do not remove existing production uk row; explicit deletion approval and fresh zero-clone check are separate. No commands executed against production.
- [ ] GREEN: focused picker/form/hooks/list/API/seeder suites and targeted eslint. Run affected combined suites, `pnpm exec tsc --noEmit`, and `pnpm build` using isolated worktree and placeholder environment if needed. Controller handles broader suite and final review.
- [ ] Commit; report final tests and limitations.

## Final verification and review

Controller checks the three diffs, runs meaningful combined tests/build plus the default non-integration suite once, records any pre-existing failures, and dispatches one Astra whole-branch review against the approved design. Fix confirmed findings, rerun affected checks, and leave a committed reviewable branch; no merge, push, deployment or production cleanup unless authorized later.
