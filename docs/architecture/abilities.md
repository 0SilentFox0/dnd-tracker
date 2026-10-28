# Abilities

Skills, races, artifacts, sets and units share one model in `lib/utils/abilities/` (schema, registry, `runAbilities`, `collectModifiers`, `read.ts`).

- Engine code fires typed events into `runAbilities` (limits, chance, `lethalDamage` → `kill`) and reads every stat/damage/resistance/flag bonus via `collectModifiers` — never from raw skill JSON.
- Owners have an `abilities JSONB` column (`NOT NULL DEFAULT '[]'`). Read it only with `lib/utils/abilities/read.ts`.
- Edit forms write `abilities` directly through `AbilityListEditor` (`components/abilities`).
- Old-format converters live only in `scripts/import/legacy-convert/` (for `import-skills-library`).
- Етап 4a (5e): прапорці `saveAdvantage` (`abilities | "all"`, `vsSpells`), `saveDisadvantage`, `autoFailSave`, `saveProficiency`, `autoCritAdjacent` (влучання з 5 фт — крит), `proneDefense` (з 5 фт перевага, здалеку — перешкода); стат `savingThrow` у `DYNAMIC_STATS`/`TIMED_STATS` (`modifyStat`, flat). `applyCondition` приймає ключі 5e (`CONDITION_5E_KEYS`) і додаткові `saveEnds: { ability }` (повторний кидок наприкінці ходу цілі проти СК накладача) та `levels` (1–6, лише `exhaustion`); `conditionImmunity` приймає й ключі 5e. Стани 5e розгортаються в наявні маркери + `abilityEffects` — рушій читає їх через `collectModifiers`, як будь-які прапорці. Деталі рушія — [battle.md](battle.md).
- Етап 4b (5e): прапорці `checkAdvantage`/`checkDisadvantage` (`skills | "all"`) і `skillProficiency { skills }` — читає `rollCheck` (`checks/roll-check.ts`); майстерність також береться з `Character.skills`. Додаткове з 4b: маркери ефектів `disengaged`, `hidden`. Деталі — [battle.md](battle.md).
- Етап 4c-1 (класи): джерело `AbilitySource.type: "class"` (`id` класу або підкласу). `collectCharacterAbilities` додає вміння класу з `feature.level ≤ рівень у цьому класі` і вибраного підкласу поруч із расою (лише в режимі класів). `LimitsSchema.perRest { rest: "short" | "long"; uses }` до 4d рушій трактує як `perBattle = uses` (лічильник `abilityUsage` у бою); заряди між боями — з відпочинками в 4d. Деталі — [battle.md](battle.md).
