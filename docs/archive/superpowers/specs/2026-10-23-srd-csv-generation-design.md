# SRD 5.2 CSV and image generation

## Scope

Prepare three import CSV files, a Draw Things manifest, an omissions report, and an adapted copy of the supplied `generate.py`. No database writes, live imports, image generation, or commits. Only the explicitly supplied `tokens.csv` and `generate.py` may be read from Downloads. Existing unrelated repository changes must remain intact.

## Sources and accuracy

Use the licensed SRD 5.2 data already in `data/templates/srd-5.2`, retaining its pinned Open5e provenance and CC BY attribution. Audit converter assumptions against available original fixtures before treating values as authoritative. Report unsupported mechanics and engine representations explicitly; do not fill gaps with invented rules. The present bundle has 331 units, 331 artifacts (including mundane equipment), and 488 spell records. Separate actual spells from the `Monster Actions` adapter group without breaking monster references.

## Approach

Prefer a shared catalog manifest over changing the application's import format. Import CSV files use the existing field specifications and JSON cell encoding. Generation metadata stays in the same CSV only where it can safely remain unmapped; avoid `group` and `race` metadata headers that the importer would map to campaign references. Use explicit `record_type`, `record_id`, `generation_group`, `generation_race`, `creature_type`, and `spell_group` headers and verify automatic mapping. Repeat metadata in the Draw Things manifest.

An alternative is changing the importer to store generation metadata, but that expands the task into application/schema changes. Another alternative is a manifest containing all metadata with no metadata in import CSV files; use that fallback only if unknown headers cannot be safely ignored.

## Classification and references

Record types are `unit`, `spell`, `artefact`. Stable IDs derive from category plus existing source slug. Creature type is separate from race; missing race remains empty, with `_unclassified` used only as a filesystem folder. Spell group comes from existing school/group data; do not invent a school for monster actions. Artifact generation grouping uses the documented application slot, clearly identified as an application classification.

Reference cells use exact names, including nested spell references. Include spell-group prerequisite data/instructions: a fresh campaign needs the nine groups before the three main CSV files. Order: spell groups, spells, artifacts, units, with any further dependency cycles reported rather than silently omitted. Verify actual prerequisites after examining all nested references.

Reimport identity follows the application: trimmed case-insensitive name within a category and campaign, not manifest ID. Check source name uniqueness. Document `skip` for preserving existing records and `update` for updating by name; do not claim database-specific duplicate absence without inspecting that database.

## Generator behavior

Prepare the adapted script in the workspace before installing it at the supplied Downloads path. Accept CSV/root/API arguments, validate every row and destination before network calls, create category/group/race folders, use stable filenames and deterministic seeds, and resume complete outputs safely. Round tokens apply only to units; spells and artifacts retain square icons. Preserve the existing txt2img request contract unless verification shows an incompatibility. No generation starts during preparation.

Use temporary output files and atomic replacement. Reject duplicate IDs, output collisions, path traversal, invalid types, empty prompts, and unsupported aspect ratios. Return nonzero on failures and offer a validation-only mode that needs no image-generation service. Keep dependencies documented and avoid deleting test CSV data until its replacement is ready and validated.

## Verification

Offline checks cover CSV quoting/UTF-8 round trips, real field mapping/coercion and creation schemas, JSON columns, all supported cross-record references, name uniqueness and stable IDs, expected record counts, attribution, manifest coverage, output-path safety, retry/resume behavior, and mocked HTTP failures. Do not contact the database or image service.

## Execution and amendments

The user instructed immediate CSV generation into Downloads/fantasy-tokens/input and confirmed exactly three universal style prompts, selected automatically from record type. Implementation and verification are complete; see the accompanying plan for evidence. Pinned source verification revealed 760 original MagicItem variants, which were retained instead of the 331-row local template’s collapsed families and equipment. The original supplied files were backed up, installation was approved through the sandbox, and all outputs were rechecked. Unsupported mechanics are documented in the delivered omissions report and original JSON; they do not affect image generation.
