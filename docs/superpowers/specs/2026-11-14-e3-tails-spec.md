# E3 tails — spec

Goal: a new module touches 0 core files (see `docs/superpowers/research/2026-11-14-module-experiment.md`).

## A. IntlMessages block generated from `meta.i18n`
`global.d.ts` lists module-owned i18n namespaces (`battleMorale`, `battleWfrp`, `wfrp*`) by hand. `systems:index` (`scripts/shared/systems-index.ts`, `ROOT_SPECS`) already rewrites marked blocks per system id. Extend it: namespaces collected from every `systems/*/meta.ts` `i18n` (battle/campaign/member/dm/pages values, deduped, sorted) are emitted as generated `import type` lines and `Messages` entries between `// <systems:generated>` markers in `global.d.ts`; non-module namespaces stay manual. Tests: root-spec output for a fixture, `--check` is clean after write.

## B. What's-new owned by modules
`SystemMeta` gets optional `whatsNew?: WhatsNewEntry[]`. `WHATS_NEW` = core entries + all modules' entries via the meta root (`SYSTEM_META`), sorted by date desc (stable). Move the existing `*-wfrp-*` entries into `systems/wfrp/meta.ts`; remove `lib/onboarding/whats-new.ts` from the wfrp-leak allowlist in `lib/__tests__/system-literals.test.ts` if it no longer mentions wfrp. Message keys stay in `messages/*/whatsNew.json`. Keep `WHATS_NEW_BUNDLED`/`WHATS_NEW_SHOWN` semantics and the `flags.ts` consumer unchanged. Tests: merge order, module entry appears, ids unique.

## C. Wizard chunk load failure
`useModuleDraft` preview loads the composition lazily (`preloadSystem`); on rejection `ModuleWizard` shows `LoadingState` forever. Expose `error`/`retry` from the hook, render a translated message + retry button (keys in `messages/{uk,en}/rules.json`, reuse an existing common error/retry component from `components/common/states` if present). Tests: rejected load → message → retry succeeds.

## D. Ч23 minors
1. Raincloud badge «−N morale»: move the label out of core `badge-labels.ts` into the morale system's UI.
2. `SystemDiceEvent.scene.pendingMoraleCheck`: generalize the contract field to a neutral `pending` / slot-based shape (no morale name in core contract).
3. `useBattleFxQueue`: register `onDone` only for dice that have a callback / cleanup of the map on unmount.
4. `props-budget` (`scripts/shared/props-budget.ts`): resolve prop types imported from other files and `Pick`/`Omit`.
Each: reuse check first, tests written (not run), no behavior change.
