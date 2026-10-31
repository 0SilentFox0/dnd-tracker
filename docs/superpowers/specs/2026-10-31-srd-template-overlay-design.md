# One SRD template with a language overlay

Status: proposed design; awaiting design approval.

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
- Existing overlay/import tests allow partial translations. The 8 focused test files passed (32 tests) on the initial checkout.

## Approaches

Recommended: reuse the text-hash dictionary and recursive translator in a shared module, with adapters for seed data and database bundles. This keeps one translation source and operates on current database content without needing slugs.

Alternative: generate slug/path patches from the English and translated JSON snapshots. This would need another mapping from database rows to slugs, and could apply stale translations after database edits. It offers no benefit for the present schema.

Keeping separate language campaigns conflicts with the requested single source. The shared-overlay approach is the implementation proposal; fallback behavior is already agreed.

## Resulting behavior

1. The seeder creates/updates only the canonical English SRD template. Reject `--locale uk` before database writes, with an explanation that language is selected during cloning. Keep generic template-store behavior for other templates unless inspection proves it is SRD-only.
2. The template picker displays one SRD choice and a separate en/uk content-language selector. Default to a supported UI language, otherwise English; an explicit selection wins. Changing language keeps the same canonical template ID. Persist the selected language on the created campaign, independent of subsequent UI-language changes.
3. Recognize the canonical source by official/template metadata, SRD template key and English/null source locale; never by display name alone. Advertise supported locales through server-owned metadata. Existing private templates and file imports retain their behavior.
4. Localize the exported source bundle before import and baseline/hash calculation. Preserve database IDs, nested IDs, reference IDs, icons, mechanics, rules, settings, and credits. Translate name references only where their schema actually uses names; unit `perform.attack` follows the owning unit's attack-name map.
5. Synchronization reads the target campaign's persisted content language and localizes the source bundle before classification and apply. All sync paths consume this same localized view. Repeated sync without changes is empty; local edits remain local/conflicts under the existing classifier.
6. A change to English text without a matching translation exposes the new English text. A subsequent translation produces a normal update. Null language on pre-existing campaigns means source language/English, never the current request's UI language.
7. Apply the same source preparation to normal campaign creation and prepared-source action/assistant creation. For ordinary campaign clones, preserve the source campaign's content language without treating that campaign as an official SRD source. Source snapshots used for action confirmation must account for the localized content being imported.
8. While the legacy official uk SRD row still exists, omit it from official template listings and normalize attempts to create from its ID to the canonical English source (defaulting to uk when no language is explicit). Fail clearly if the canonical source is absent. Do not alter existing campaigns' lineage. The template browsing tile links to the canonical English template and need not preview translated content.

## Reused / changed

Reused: `uk.json`, glossary workflow, translation hashes and recursive walker, export/import bundles and ID remapping, sync hashes/baselines/classifier/apply, current picker layout and language labels, existing locale column.

Changed: shared field-aware translation boundary and name-reference handling; creation request/types and persisted locale; localized source preparation in clone/sync/action paths; SRD listing metadata and picker selection; canonical-only SRD seeding; focused tests and relevant architecture documentation.

No translation service, new database table, slug persistence, generalized localization framework, translated template preview, or automatic production cleanup. Extend recognition of omitted prose, but allow those strings to remain English until dictionary translations are supplied.

## Acceptance checks

- en clone is equivalent to the English source; uk clone translates nested prose, retains icons/mechanics/IDs, and resolves every translated attack reference.
- Missing text stays English; adding its translation produces one applicable sync update and then no remaining diff.
- Immediate and repeated sync are empty; English source changes, translation changes, local edits/conflicts, ignore behavior, and ID remapping remain correct.
- UI/API and prepared-source creation persist explicit content language; changing UI language cannot change sync behavior. Unsupported content languages are rejected.
- One SRD listing exposes both languages using one ID; legacy uk IDs normalize safely; unrelated templates and ordinary clones remain compatible.
- Reseeding does not create another language template; non-English seeding fails before writes.
- Run focused suites, relevant type/lint checks and production build; one final independent Astra review.

## Delivery and rollout

After design approval, write a lean plan with function signatures and tests, then implement in three tasks: shared overlay; clone/sync integration; picker/seeder/docs. Use Sol for implementation and one final Astra review. Preliminary estimate: 1–2 hours, subject to integration findings; monetary cost is unavailable in this environment.

Prepare rollout instructions only. Before any authorized deletion of the old production uk template, recheck that it has no clones and that canonical English source and new deployment are ready. No production writes are part of this implementation run.
