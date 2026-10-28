# Fair battles (balance)

There is no difficulty setting. `lib/utils/battle/balance` (`computeFairScaling`, `pickEnemyRoster`; constants in `lib/constants/battle-balance.ts`) scales enemy units to the party power. The battle setup UI (via `useFairBalance`) and the battle start (`start-fair-scaling.ts`) call the same function. In the XP mode (`rules.encounters.balance: "xp"`) neither of them scales — see below.

## Applying the scale

Start writes `hpMultiplier`/`damageMultiplier` into the enemy unit's `battleData` (snapshot, no migration), and the engine applies `damageMultiplier` after modifiers, before resistances (`lib/utils/battle/damage/balance-multiplier.ts`). It scales weapon and spell damage, crit and counterattack bonuses, additional-damage lists and miss `guaranteedDamage`; flat ability damage (`dealDamage`, `applyDot`, `damagePerRound`) is intentionally not scaled.

## High-level parties

Parties above L6 (average hero level, `heroLevel` in `PartyPower`) get a higher enemy target — `HIGH_LEVEL_DPR_BOOST`/`HIGH_LEVEL_HP_BOOST`, 0 up to L6, then linear: ×1 at L10, ×2 (cap) from L14 — because high-level abilities are not in the hero power formula.

## Unit power

Unit power is weighed by defenses: the formula accounts for unit AC vs the party's weapon to-hit, the unit's resistances (read from the participant the battle builds, `balance/resist.ts`) to the party's weapon damage types/kinds and spell share, and unit to-hit vs the party's average AC (`hit-chance.ts`, `REF_HERO_HIT`/`REF_UNIT_HIT`).

A unit whose spell beats its weapon counts spell damage against this party (`unitSpellDpr`): the failed-save share (party average save mod vs DC 8 + prof), the party's spell resist to the damage type, and only `UNIT_SPELL_SLOTS` casts over `TARGET_ROUNDS` (the weapon covers the rest).

## Summons

Summon targets (units a spell or ability summons by `unitId`, `summonedUnitIds` in `unit-library.ts`, flagged `summon`) are left out of the per-tier scaling ceiling (`weakestPerTier`, lower quantile `TIER_CEILING_QUANTILE` of the units a DM fields) and are never offered by `pickEnemyRoster`.

## XP mode (5e)

`rules.encounters { balance: "fair" | "xp", edition: "2014" | "2024" }`. In `xp` the setup shows `XpBalanceSummary` (`setupXpBudget` → `computeXpBudget` in `balance/xp-budget.ts`: DMG 2014 per-hero thresholds × the monster-count multiplier with the party-size step, or DMG 2024 per-hero budget without a multiplier; units without CR go to `missingCr`, NPC enemies are ignored); the battle start skips `scaleEnemiesForFairBattle`; autopick (`balance-post`, `xpDifficulty`) uses `pickXpRoster` (one unit kind, the band from the chosen threshold up to the next one). Unit XP comes from `unitXp` (manual `xp`, else the CR table); `UnitStats` carries `cr`/`xp`, a CR unit's spell DC adds its best Int/Wis/Cha modifier and its weapon DPR is multiplied by `multiattack`.
