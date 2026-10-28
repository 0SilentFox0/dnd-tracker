# SRD CSV Generation Implementation Plan

> Execute inline following superpowers:executing-plans. The user explicitly requested immediate generation; no further planning approval or commits.

**Goal:** Deliver validated SRD 5.2 import CSVs and a generation manifest to the user's specified input directory, with an adapted generator.

**Architecture:** Workspace staging bundle, using existing import specifications and schemas without application changes. Install only completed files into the specified Downloads paths after verification.

**Tech Stack:** TypeScript/tsx, existing Zod schemas and CSV utilities; Python generator with requests/Pillow.

**Spec:** docs/archive/superpowers/specs/2026-10-23-srd-csv-generation-design.md, amended by user: exactly three universal style prompts, automatically combined with record name/context, and immediate CSV delivery.

## Global Constraints

- No database access, live imports, image generation, or commits.
- Read only the two explicitly supplied Downloads files; preserve unrelated work.
- Stage in `.superpowers/srd-csv-export`; obtain sandbox permission for installation in Downloads.
- Use the existing licensed SRD 5.2 snapshot. Clearly distinguish engine conversions and derived monster actions from source rules.

## Review Focus

- Generation metadata must not map to raceId/groupId by accident.
- Nested spell and school references must resolve or be explicitly reported as unsupported.
- Missing race must remain empty, with folder-only `_unclassified`.
- Reimport relies on names, not generation IDs; empty update cells do not clear existing values.
- Generator must reject unsafe paths, preserve completed outputs, and fail visibly.

### Task 1: Export and validate

- [x] Build offline exporter in `.superpowers/srd-csv-export/export.ts`: use IMPORT_SPECS, actual mapping/coercion and create schemas; retain source JSON alongside CSV metadata; write units.csv, spells.csv, artifacts.csv, spell-groups.csv, tokens.csv, styles.json, report files, attribution, and README.
- [x] Check reference closure, name and ID uniqueness, metadata mappings, JSON roundtrip, row coverage, and report unavailable/unsupported fields per record. Record dataset fingerprints.
- [x] Run with `TSX_TSCONFIG_PATH=tsconfig.scripts.json node --import tsx .superpowers/srd-csv-export/export.ts`; require zero schema/CSV/reference errors, explicitly separate known engine limitations.

### Task 2: Adapt and install generator

- [x] Prepare `.superpowers/srd-csv-export/generate.py` with CSV-driven category styles, folders, deterministic names/seeds, validation-only, resume, atomic writes and failure exit codes. Preserve txt2img contract, round only units. Add focused stdlib tests with mocked I/O/HTTP.
- [x] Verify Python parsing and tests, validate complete tokens.csv offline; no service calls.
- [x] Copy bundle into `/Users/silentfox/Downloads/fantasy-tokens/input`, preserve original test CSV and generator backups in the delivered bundle, install adapted generate.py through sandbox-approved command.
- [x] Re-read installed file hashes and CSV row counts; report actual counts and limitations.

## Completion evidence

- Installed CSV counts: units 331, spells 488 (339 original spells + 149 monster action adapters), artifacts 760, prerequisite spell groups 9; generation manifest 1579.
- Offline real importer mapping/coercion and Zod create schemas: zero errors; CSV roundtrips checked; 1053 references checked; no duplicate names/IDs/output paths.
- Seven Python tests passed, including mocked HTTP, category output shapes, resume, unsafe paths and symlink rejection. Installed generator validation-only passed with all 1579 records and no API calls.
- Installation checksums verified; original supplied files backed up to input/backups.
- Ruling: all 760 original MagicItem variants retained rather than the local template’s collapsed families. Mundane equipment excluded. Source fixtures fetched from pinned, checksum-verified public Open5e snapshot.
- Ruling: exact descriptions/source JSON retained for unsupported automation; see delivered omissions.csv and README. This limits mechanical automation, not image generation.
- Self-review: checked source coverage, metadata aliases, nested-reference closure, filenames, and installer scope. No commits, database writes, live imports or image-generation calls.
