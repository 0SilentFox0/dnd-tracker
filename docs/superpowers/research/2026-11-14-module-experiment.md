# Module-addition control experiment (2026-11-14)

Goal under test (E3 Ch24): a new rule module should need **0 core files** and be doable from the docs alone.

## Setup

- Sonnet agent, throwaway branch (deleted), nothing committed. Read only `docs/architecture/rule-systems.md` and `ui-layers.md`.
- Task: two modules. `flanking` (d20 addon: +1 melee attack bonus when another ally stands next to the target; wraps a scalar hook) and `fatigue` (wfrp addon: per-fighter counter in the slot `ext`, +1 each finished turn, a UI badge, new i18n namespace).
- Raw log and patch: `~/.claude/jobs/0025a974/tmp/{experiment-log.md,experiment.patch}` (not committed).

## Metrics

| Metric | Result |
|---|---|
| Wall-clock | ~8 min |
| New folders | `systems/flanking`, `systems/fatigue` (meta, index, rules, ui, tests) |
| Generated root edits | 4 files via `pnpm systems:index` (meta, registry, UI registry, `install.ts`) |
| Messages | `gameTerms.json` uk+en (allowed), new `battleFatigue.json` uk+en |
| Core files edited by hand | **1** (`global.d.ts`: typed `IntlMessages` entry for the new namespace) |
| Ratchet files regenerated | 0 |
| New tests | 12, green |
| Green | system-contract, systems-index, system-install-entries, system-composition-matrix, system-literals, ui-layers, props-budget, module-toggle-d16, content-kinds-contract, stat-columns-contract, rules-presets-contract, cycles, tsc (35 s with the `global.d.ts` edit) |
| Not done | whats-new entry, help article, full suite, sweep |

`lib/__tests__/client-entry-imports.test.ts` fails 3 tests. Verified on clean HEAD of `feat/e3-ch24` (no experiment changes): it fails identically (`systems/retaliation/rules/ability-flags.ts` reaches the profile chunk importing zod). Pre-existing, unrelated to the experiment.

## What worked

- Folder layout, `systems:index` and the generated roots: no hand edits to any registry.
- Composition validation, claims, `defineAddon` + `prev`, slot `extend` and the ratchets caught nothing spurious and nothing was bypassed.
- Contract tests were a sufficient safety net; the agent never needed to read core code beyond type signatures and one existing module per pattern (`heroscaling`, `retaliation`, `morale`).

## Gaps found (all now documented in `rule-systems.md`, "Рецепти модуля")

1. Scalar hook change: no recipe; claim path format and the wrap-`prev` idiom had to be inferred.
2. Flat attack bonus: the `ResolveAttackCtx.modifiers` channel was undocumented; off-turn strikes (retaliation, opportunity) ignore it.
3. New i18n namespace needs `global.d.ts`; without it `tsc` dies with a misleading `RangeError: Map maximum size exceeded` (~100 s).
4. Per-namespace `label-keys-*` tests: not required by anything (answered: optional, only for dynamically built keys).
5. `meta.i18n` slot semantics and `budgetKb` (only read for bases, ignored for addons).
6. State module: `write(data, prev)` contract, missing-slot case, `PARTICIPANT_STATE` (wfrp) vs `D20_STATE` naming.
7. No map of which turn hook fits a per-turn counter (`resetState` vs `onTurnEnd` vs `onRoundStart`).
8. `systems:index` silently emits no line when a layer file does not export the exact name (`<ID>_MODULE`, `_UI`, ...).
9. whats-new rule requires a core file edit.
10. How to put a module into a composition in a test (`?? []` for absent hook lists).

## Verdict vs goal "0 core files"

Not met, honestly: **1 core file by hand (`global.d.ts`) plus 1 unavoidable-by-policy core file (`lib/onboarding/whats-new.ts` + `messages/*/whatsNew.json`) that the agent skipped**, so the real count for a user-facing module is 2 until fixed. Everything else (roots, registries, ratchets) was generated or untouched. The result is close: both leftovers are mechanical, not architectural.

Recommended follow-ups (not implemented):
- Generate the `IntlMessages` namespace block of `global.d.ts` from `meta.i18n` in `systems:index` (or add a `systems:index` generated block there), and make a missing entry fail with a clear test instead of a `tsc` crash.
- Make whats-new module-owned (a `whatsNew` field in the module, merged by a generated root) or explicitly exempt modules from the rule in CLAUDE.md.
- Optional: a warning from `systems:index` when a layer file exists but lacks the expected export name.
