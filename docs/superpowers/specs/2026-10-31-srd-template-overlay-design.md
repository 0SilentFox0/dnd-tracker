# One SRD template with a language overlay

Status: revised after a second code review on 2026-10-31; awaiting design approval. Documentation only; no product code changes.

## Intent and agreed constraints

Keep one official English `5e SRD 5.2` campaign as the canonical source. Select content language when creating a campaign, then use the same localized source for cloning and synchronization. English is authoritative; missing translations fall back to English (confirmed by the user). A later translation is a normal source update.

Use the existing `campaigns.locale`, `templateKey`, `createdFromId`, row `sourceId`/`sourceHash`, and sync baseline. No schema changes or clone-data migration. The user reports zero clones of both production SRD templates as of 2026-10-31. Do not write to production or remove either production template without explicit authorization.

Work in `feat/srd-template-overlay`, in an isolated worktree. Do not mix in identity-icon work. User accepted Sol implementation and one final Astra review because Sonnet/Opus are unavailable here.

## Findings

- The existing overlay keys translations by a hash of English text and text class, not by slug. The importer discards source slugs.
- `uk.json` has 4,522 string entries, matching all 4,522 current catalog entries; no missing or stale keys. This verifies structure and catalog coverage, not every translation's semantic accuracy.
- Recursive mapping already covers class/subclass features, choices, abilities, labels, descriptions, and note text.
- The catalog omits some prose: spell casting triggers, class proficiency text, background tool proficiencies, creature languages/alignment, and attack/weapon properties. These require context-sensitive recognition so mechanical enums remain unchanged.
- There are 27 translated unit attack names with unchanged `perform.attack` references. Those references are looked up by name and must follow their corresponding translated attack.
- Database artifact rows encode `item` as JSON text in `modifiers[{ type: "itemStats" }].value`; weapon properties become `modifiers[{ type: "properties" }].value`. A generic object walker misses both formats. Existing `remapIds` already handles serialized itemStats IDs and should be reused.
- Cross-row mechanical references also use names: spell lists and choice lists refer to class names, and 16 artifact property entries use base-item names. The current sync dependency closure handles missing ID dependencies only; it does not protect partial name changes.
- `app/campaigns/page.tsx` queries templates directly; filtering `listTemplates` alone will not remove the legacy language tile. `template.save` uses a separate creation path and currently drops locale.
- `makeTemplateStore` is also used by the empty 5e template. Keep it and `templateLocaleWhere` compatible with that caller and compendium imports.
- Existing overlay/import tests allow partial translations. The 8 focused test files passed (32 tests) on the initial checkout.

## Approaches

Recommended: reuse the text-hash dictionary and recursive translator in a shared module, with adapters for seed data and database bundles. This keeps one translation source and operates on current database content without needing slugs.

Alternative: generate slug/path patches from the English and translated JSON snapshots. This would need another mapping from database rows to slugs, and could apply stale translations after database edits. It offers no benefit for the present schema.

Keeping separate language campaigns conflicts with the requested single source. The shared-overlay approach is the implementation proposal; fallback behavior is already agreed.

## Resulting behavior

1. The SRD seeder creates/updates only the canonical English SRD template. Reject non-English `--locale` values before database access/writes, with an explanation that language is selected during cloning. Keep the shared template store and locale filter compatible with the empty 5e template and compendium import. Preserve the existing English campaign ID and seeded row IDs.
2. The template picker displays one SRD choice and a separate en/uk content-language selector. The UI proposes a supported UI language, otherwise English, and sends the resolved content language explicitly. Direct create/clone requests that omit it use English for the canonical template; a legacy uk-template ID defaults to uk. An explicit selection wins. Changing language keeps the same canonical template ID. Persist the selected language on the created campaign, independent of subsequent UI-language changes. Keep request content language separate from the existing request `locale` used for interface messages/default attacks. Do not offer language switching after creation in this change.
3. Recognize the canonical source by official/template metadata, SRD template key and English/null source locale; never by display name alone. Advertise supported locales through server-owned metadata. Private templates retain their own content and stored language; file imports retain their existing format and behavior. Do not allow arbitrary language overrides on sources without an overlay.
4. Localize the exported source bundle before import and baseline/hash calculation. The overlay preserves source database IDs, nested IDs, ID references, icons, mechanical values, rules, settings, credits, and compendium provenance. Existing import/sync code still remaps source IDs to local IDs afterwards. Only the eight SRD content tables receive the overlay; other bundle sections pass through. Translate name references only where their schema actually uses names: spell/choice lists and class spellList, artifact base names, and unit `perform.attack` via the owning unit's attack-name map. DB spell/group/feat IDs must never pass through seed-data name-reference rewriting.
5. Synchronization reads the target campaign's persisted content language and localizes the source bundle before classification and apply. Diff, assistant preview, and apply all consume this same localized view through `loadSyncContext`. A changed translation between diff/preview and apply must be rejected by the existing stale-source/fingerprint checks; never accept an obsolete hash. Repeated sync without changes is empty; local edits remain local/conflicts under the existing classifier.
6. A change to English text without a matching translation exposes the new English text. A subsequent translation produces a normal update. Null language on pre-existing campaigns means source language/English, never the current request's UI language.
7. Apply the same source preparation to normal campaign creation and prepared-source action/assistant creation. Prepared sources carry the resolved source ID, source metadata, resolved content language, and the exact prepared bundle; creation does not export or localize them again. For ordinary campaign clones and `template.save`, preserve the source campaign's stored content language (including null) without treating it as an official SRD source. Saving an official template as a private template copies the stored source content/language; it does not inherit official templateKey identity. Confirmation fingerprints include resolved source ID, content locale, and localized bundle digest, with identical preparation rules in preview and execute. Lock/check the resolved canonical source, not only a legacy alias.
8. While the legacy official uk SRD row still exists, omit it from both official picker/API listings and the direct `/campaigns` template-tile query (including the official owner's list) and normalize attempts to create from its ID to the canonical English source (defaulting to uk when no language is explicit). Fail clearly if the canonical source is absent. Do not alter existing campaigns' lineage. The template browsing tile links to the canonical English template and need not preview translated content. If multiple English/null candidates match the key, fail visibly rather than selecting an arbitrary source. Existing clones of the legacy uk source, if any appear before rollout, continue to sync against that source without the new overlay or automatic retargeting.

## Implementation boundaries exposed by the second review

- Share the pure text classifier/hash/walker between the seed adapter and the server bundle adapter. Preserve hashes of all existing recognized strings. Classify added prose by full field context, not by broad keys such as `tools`, `properties`, or `trigger` which can also contain mechanics. Preserve template placeholders (`{base}`, `{name}`, `{param}`), formula strings, IDs, and enum tokens.
- The DB adapter explicitly opens only artifact `type=itemStats` JSON records, translates their recognized fields/name references, and serializes them deterministically without dropping unknown fields or other modifiers. Recognize `type=properties` as weapon prose. Preserve malformed legacy records unchanged, consistent with existing remapping. English/no-op localization must not reserialize content. Add a parity check using actual import-converted artifact rows, not fixtures with a nonexistent DB `item` column.
- Load `uk.json` through a server-only static import/allowlisted module registry so the deployed server includes it. Do not reuse the CLI's `process.cwd()` filesystem discovery or send the dictionary to client bundles. Translation updates ship with deployments; stale previews across a translation deployment must be refreshed when their effective content changes. No extra translation-version column is needed: localized row hashes identify changed effective content.
- Validate translated-name collisions in scopes where names are references, including case-insensitive unit attack lookup. Fail before clone/sync writes; do not silently create ambiguous links. Existing untranslated content remains valid under fallback.
- Partial sync must not break previously valid name-based links due to a source/translation rename. Reuse the effective-result graph built before sync writes and check affected class-list and artifact-base references against the selected result. Reject an incomplete selection with an actionable error identifying related rows; require the user to select those updates together. Do not silently apply conflicting/ignored rows or overwrite customized references. Tolerate pre-existing unrelated unmatched names. Validate new references introduced by the selected source rows against the effective result. Limit this guard to SRD overlay source synchronization; other source types retain their existing behavior. It does not introduce a new merge algorithm or an ID migration.
- `exportCampaign` remains a raw export of stored content. Do not localize global exports or traverse through private clone ancestry. Localization belongs at source preparation boundaries. Private uk copy -> private template -> campaign keeps the stored uk content/locale and syncs against its immediate parent.

## Reused / changed

Reused: `uk.json`, glossary workflow, translation hashes and recursive walker, export/import bundles and ID remapping, sync hashes/baselines/classifier and write pipeline (with the targeted name-reference guard), current picker layout and language labels, existing locale column.

Changed: shared field-aware translation boundary and name-reference handling; creation request/types and persisted locale; localized source preparation in clone/sync/action paths; SRD listing metadata and picker selection; canonical-only SRD seeding; focused tests and relevant architecture documentation.

No translation service, new database table, slug persistence, generalized localization framework, translated template preview, or automatic production cleanup. Extend recognition of omitted prose, but allow those strings to remain English until dictionary translations are supplied.

## Acceptance checks

- en clone is equivalent to the English source; uk clone translates nested prose, retains icons/mechanics/IDs, and resolves every translated attack reference.
- Missing text stays English; adding its translation produces updates for affected rows only, followed by no remaining diff once those updates are applied.
- Immediate and repeated sync are empty; English source changes, translation changes, local edits/conflicts, ignore behavior, and ID remapping remain correct.
- UI/API and prepared-source creation persist explicit content language; changing UI language cannot change sync behavior. Unsupported content languages are rejected.
- Artifact DB-format localization covers nameTemplate, parameter labels, base-name references and weapon properties; nested serialized spell IDs still remap. No-op/en preserves original serialization and unknown fields.
- Partial class/base-item name changes cannot leave invalid links; complete linked selections succeed, while local conflicts/ignored rows are never silently overwritten. Collision and stale-translation cases fail before writes.
- Save-as-template and a subsequent clone preserve locale and immediate-parent lineage without double localization. Private same-name templates cannot activate the official overlay.
- One SRD listing exposes both languages using one ID; legacy uk IDs normalize safely in normal and prepared-source creation; the owner's direct tile list also hides the legacy row. Missing/ambiguous canonical sources fail explicitly. Unrelated templates, empty-5e seeding and compendium imports remain compatible.
- Reseeding does not create another language template; non-English seeding fails before writes.
- Run focused suites, relevant type/lint checks and production build; one final independent Astra review.

## Delivery and rollout

After design approval, write a lean plan with function signatures and tests, then implement in three tasks: shared overlay; clone/sync integration; picker/seeder/docs. Use Sol for implementation and one final Astra review. Revised preliminary estimate after the second review: 2–3 hours, primarily because serialized artifact content, prepared-source fingerprints and partial name-reference synchronization need explicit coverage. Monetary cost is unavailable in this environment. Keep three implementation tasks and one final review; no extra agent review round has been started.

Prepare rollout instructions only. Before any authorized deletion of the old production uk template, recheck that it has no clones and that canonical English source and new deployment are ready. No production writes are part of this implementation run.
