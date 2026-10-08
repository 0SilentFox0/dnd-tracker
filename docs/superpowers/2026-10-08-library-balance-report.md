# Task 7 report: balance pass

Tool: `pnpm balance-library [--runs=N] [--levels=3,6,10] [--parties=mixed,martial,caster,leader] [--reuse] [--dump]` (scripts/balance-library.ts, LOCAL DB only; creates campaign «SIM: баланс бібліотеки», seeds library + imports imports/units-import.csv, builds heroes with a greedy skill progression, autoplays through the real mutation pipeline).
Setup: 3 heroes per party. Builds: martial = Люди Напад+Захист (STR 16/18/20, sword), caster = Маги Хаос+Світло (INT 16/18/20, STR 12, dagger, slots from calculateCharacterSpellSlots), leader = Ельфи Лідерство+Стрільба (DEX 16/18/20, STR 12, bow). Parties: mixed (one of each) and three mono-build parties. Level to tier: 3->T1, 6->T4, 10->T7. Roster = pickEnemyRoster restricted to that tier; the start mutation applies fair scaling. Autoplay: casters cast the highest expected-damage spell (damage only), everyone else attacks the weakest foe; no bonus actions, abilities, healing or control. 12 seeded fights per row.
Columns: party | level | tier | roster (hpMult/dmgMult) | mean rounds | hero wins | mean hero deaths | mean HP left | unfinished | casts per fight. Target: rounds near 3.5, heroes usually win.

## Before (12 fights each)
mixed | L3 | T1 | Дияволя×6 (hp/дмг 1.93/1.90) | 7.1 | 11/12 | 0.3 | 70.9% | 0 | casts 4
mixed | L6 | T4 | Суккуб×3 (hp/дмг 0.83/1.00) | 4.9 | 12/12 | 0 | 77.9% | 0 | casts 4.3
mixed | L10 | T7 | Диявол×3 (hp/дмг 0.84/1.92) | 5.5 | 12/12 | 0 | 85.2% | 0 | casts 4.8
martial | L3 | T1 | Дияволя×6 (hp/дмг 2.01/2.21) | 9 | 9/12 | 0.8 | 61.7% | 0 | casts 0
martial | L6 | T4 | Суккуб×3 (hp/дмг 0.87/1.00) | 5.5 | 12/12 | 0 | 88.6% | 0 | casts 0
martial | L10 | T7 | Диявол×3 (hp/дмг 0.87/2.64) | 6.3 | 12/12 | 0 | 84.3% | 0 | casts 0
caster | L3 | T1 | Дияволя×6 (hp/дмг 1.79/1.75) | 3.2 | 12/12 | 0 | 81.6% | 0 | casts 6.8
caster | L6 | T4 | Суккуб×4 (hp/дмг 0.58/1.00) | 2.4 | 12/12 | 0 | 89.2% | 0 | casts 5.4
caster | L10 | T7 | Диявол×4 (hp/дмг 0.59/1.17) | 2.8 | 12/12 | 0 | 82.9% | 0 | casts 6.8
leader | L3 | T1 | Дияволя×6 (hp/дмг 1.97/1.75) | 8.6 | 0/12 | 3 | 0% | 0 | casts 0
leader | L6 | T4 | Суккуб×3 (hp/дмг 0.85/1.00) | 9.9 | 2/12 | 2.5 | 13% | 0 | casts 0
leader | L10 | T7 | Диявол×3 (hp/дмг 0.86/1.56) | 11.9 | 10/12 | 0.5 | 65.3% | 0 | casts 0

## After: +15% instead of +10% per level for Напад (melee) and Стрільба (ranged)
mixed | L3 | T1 | Дияволя×6 (hp/дмг 1.95/1.90) | 7.1 | 10/12 | 0.5 | 66.4% | 0 | casts 4
mixed | L6 | T4 | Суккуб×5 (hp/дмг 0.50/1.00) | 5.8 | 10/12 | 0.5 | 62.2% | 0 | casts 2.9
mixed | L10 | T7 | Диявол×5 (hp/дмг 0.51/1.15) | 5.6 | 12/12 | 0 | 83.8% | 0 | casts 4.9
martial | L3 | T1 | Дияволя×6 (hp/дмг 2.05/2.21) | 9 | 9/12 | 0.8 | 60.9% | 0 | casts 0
martial | L6 | T4 | Суккуб×3 (hp/дмг 0.88/1.00) | 5.3 | 12/12 | 0 | 88.3% | 0 | casts 0
martial | L10 | T7 | Диявол×3 (hp/дмг 0.89/2.64) | 6.3 | 12/12 | 0 | 84.6% | 0 | casts 0
caster | L3 | T1 | Дияволя×6 (hp/дмг 1.79/1.75) | 3.2 | 12/12 | 0 | 81.6% | 0 | casts 6.8
caster | L6 | T4 | Суккуб×4 (hp/дмг 0.58/1.00) | 2.4 | 12/12 | 0 | 89.2% | 0 | casts 5.4
caster | L10 | T7 | Диявол×4 (hp/дмг 0.59/1.17) | 2.8 | 12/12 | 0 | 82.9% | 0 | casts 6.8
leader | L3 | T1 | Дияволя×6 (hp/дмг 2.01/1.75) | 8.6 | 0/12 | 3 | 0% | 0 | casts 0
leader | L6 | T4 | Суккуб×3 (hp/дмг 0.87/1.00) | 9.7 | 4/12 | 2 | 24.6% | 0 | casts 0
leader | L10 | T7 | Диявол×4 (hp/дмг 0.66/1.17) | 9.7 | 12/12 | 0 | 86.3% | 0 | casts 0

## Numbers changed (data/library/branches.ts)
- Напад levels Базовий/Просунутий/Експертний: damageBonus melee 10% -> 15% per level (cumulative 15/30/45%); descriptions updated.
- Стрільба levels: damageBonus ranged 10% -> 15% per level (15/30/45%); descriptions updated.
Nothing else changed.

## Findings and caveats
- Fair scaling absorbs passive damage buffs: heroPower counts the +15%, so the picked roster scales up (e.g. mixed L6 became Суккуб x5 at 0.5 HP mult). Round counts therefore move little and mixed L6 got noisier; a build-vs-estimator gap is what shows up, not absolute strength.
- Caster parties finish in 2.4-3.2 rounds with 80-90% HP left (chain lightning dominates casts; AoE hits all 3-6 enemies). Per hero-turn damage at L6: caster ~52, martial ~21, leader ~20 (caster sum over targets, about 17 per target). Not changed: spells are balanced against each other and the spec fixes their dice; options if a nerf is wanted: chain lightning / meteor dice 5 -> 4, or fewer high slots.
- Martial parties run 5.3-9 rounds (L3 vs T1: 6 enemies at x2 HP/x2.2 dmg, 9/12 wins). Leader parties are the weakest: 0/12 at L3, 4/12 at L6 (L10 ok 12/12). Their value is morale/initiative utility which the autoplay never exercises (no morale checks, no bonus actions) and they have no Захист; HP comes from STR (hero-scaling: 10 + 2 x STR mod per level), so ranged/caster builds with STR 12 have ~half the martial HP. This is partly a measurement limit, so I did not buff Лідерство numbers blindly.
- Mixed party (the realistic case): 4.9-7.1 rounds, 10-12/12 wins, 62-85% HP left: longer than 3.5 and easy; caster provides about 55% of party damage.
- Tier 1 vs 3 heroes needs 6+ bodies and x2 scaling (pickEnemyRoster cannot reach tolerance there): L3 rows are dominated by that artifact.
- Race spellSlotProgression is empty for seeded races; hero spell slots were set explicitly in the sim. Real characters of seeded races get no slots until the DM sets a progression (or characters get explicit spellSlots).
