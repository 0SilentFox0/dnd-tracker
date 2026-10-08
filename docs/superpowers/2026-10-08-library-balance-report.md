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

## After (final fix wave; 12 fights each)
The earlier +15 % change is reverted: branch levels are not cumulative (the highest learned level replaces lower ones), so the values are now absolute: Напад/Стрільба damage +10/20/30 %, Захист resistance 10/20/30 %, Лідерство morale +1/+2/+3. Racial levels now form a level line too (engine fix), so only the highest racial level applies.
mixed | L3 | T1 | Дияволя×6 (hp/дмг 1.93/1.90) | 7.1 | 11/12 | 0.3 | 70.9% | 0 | casts 4
mixed | L6 | T4 | Суккуб×5 (hp/дмг 0.50/1.00) | 5.7 | 11/12 | 0.3 | 69.1% | 0 | casts 3
mixed | L10 | T7 | Диявол×5 (hp/дмг 0.52/1.15) | 5.6 | 12/12 | 0 | 84.9% | 0 | casts 4.9
martial | L3 | T1 | Дияволя×6 (hp/дмг 2.01/2.21) | 9 | 9/12 | 0.8 | 61.7% | 0 | casts 0
martial | L6 | T4 | Суккуб×4 (hp/дмг 0.67/1.00) | 5.3 | 12/12 | 0 | 81.7% | 0 | casts 0
martial | L10 | T7 | Диявол×3 (hp/дмг 0.91/2.64) | 6.2 | 12/12 | 0 | 84.6% | 0 | casts 0
caster | L3 | T1 | Дияволя×6 (hp/дмг 1.79/1.75) | 3.2 | 12/12 | 0 | 81.6% | 0 | casts 6.8
caster | L6 | T4 | Суккуб×4 (hp/дмг 0.58/1.00) | 2.4 | 12/12 | 0 | 89.2% | 0 | casts 5.4
caster | L10 | T7 | Диявол×4 (hp/дмг 0.59/1.17) | 2.8 | 12/12 | 0 | 82.9% | 0 | casts 6.8
leader | L3 | T1 | Дияволя×6 (hp/дмг 1.97/1.75) | 8.6 | 0/12 | 3 | 0% | 0 | casts 0
leader | L6 | T4 | Суккуб×3 (hp/дмг 0.85/1.00) | 9.9 | 2/12 | 2.5 | 13% | 0 | casts 0
leader | L10 | T7 | Диявол×3 (hp/дмг 0.89/1.56) | 11.3 | 11/12 | 0.3 | 74.7% | 0 | casts 0
Касти: Ланцюгова блискавка 241, Кам'яні шипи 122, Потойбічна стріла 8

## Numbers changed (data/library)
- Напад and Стрільба levels: 10/20/30 % per level (absolute); Захист 10/20/30 %; Лідерство morale +1/+2/+3; descriptions rewritten without cumulative sums. The earlier 15 % change is gone.
- Воскресіння (50 %) and Відродження лісу (30 %) use heal + revive instead of raiseDead.
- School spell-power skills described as damage of school spells.

## Findings and caveats
- Fair scaling absorbs passive damage buffs: heroPower counts them, so the picked roster scales up. Round counts therefore move little; a build-vs-estimator gap is what shows up, not absolute strength. After the revert the table is within noise of the original baseline (racial skills only matter from level 5, and the greedy plan takes few level nodes).
- Caster parties finish in 2.4-3.2 rounds with 80-90% HP left (chain lightning dominates casts; AoE hits all 3-6 enemies). Per hero-turn damage at L6: caster ~52, martial ~21, leader ~20 (caster sum over targets, about 17 per target). Not changed: spells are balanced against each other and the spec fixes their dice; options if a nerf is wanted: chain lightning / meteor dice 5 -> 4, or fewer high slots.
- Martial parties run 5.3-9 rounds (L3 vs T1: 6 enemies at x2 HP/x2.2 dmg, 9/12 wins). Leader parties are the weakest: 0/12 at L3, 4/12 at L6 (L10 ok 12/12). Their value is morale/initiative utility which the autoplay never exercises (no morale checks, no bonus actions) and they have no Захист; HP comes from STR (hero-scaling: 10 + 2 x STR mod per level), so ranged/caster builds with STR 12 have ~half the martial HP. This is partly a measurement limit, so I did not buff Лідерство numbers blindly.
- Mixed party (the realistic case): 4.9-7.1 rounds, 10-12/12 wins, 62-85% HP left: longer than 3.5 and easy; caster provides about 55% of party damage.
- Tier 1 vs 3 heroes needs 6+ bodies and x2 scaling (pickEnemyRoster cannot reach tolerance there): L3 rows are dominated by that artifact.
- Race spellSlotProgression is empty for seeded races; hero spell slots were set explicitly in the sim. Real characters of seeded races get no slots until the DM sets a progression (or characters get explicit spellSlots).

## Round 3: user decisions (trees, slots, leadership, mages)
Sim fixes first: heroes now act as their controller (SIM_PLAYER). Before this the sim acted as DM, and DM casts ignore spell slots, so every earlier caster row overstated casters (unlimited best spell). Autoplay also performs morale checks now (real morale-check mutation, extra turns counted in `extra`). Casters get slots from the race progression, not from an explicit table.

Changes:
- Race trees use per-race branch sets (races.ts `branchKeys`, tested, seed builds trees from them).
- Race `spellSlotProgression` = 4/3/3/2/1 for all seven races. The old engine ignored per-level numbers and only used their sum; `calculateSpellSlotsForLevel` now treats each entry as the cap for that spell level and unlocks slots by the 5e full-caster curve (hero L1: 2/0/0/0/0, L5: 4/3/2, L9 and above: 4/3/3/2/1). Level-up gain tests adjusted accordingly. Всезнання is unchanged (+N to levels 4 and 5), so an L6 Маг has 4/3/3/1/1.
- Лідерство: new flag `moraleChance` with a percent field (engine: `checkMorale` adds it to the extra-turn chance, a second server-side roll among failed d10 rolls so total = morale x 10 % + bonus; negative morale unaffected). Level skills give allies (allAllies aura) +5/+10/+15 % plus morale +1/+2/+3. Відплата 3 to 5 % per morale point, Успіх 5 to 8 % per success.
- Mages: Ланцюгова блискавка 5 to 2 dice with falloff 100/40/20/10 (was 100/50/25/13); Кам'яні шипи 3 to 2 targets; Метеоритний дощ, Вогняна куля, Коло зими 3 to 2 dice; Слово світла 4 to 3 dice; Крижаний болт and Блискавка 3 to 2 dice; Вогняна куля and Коло зими 4 to 3 targets. Mastery dice-faces rule untouched.

Results (12 fights each):
mixed | L3 | T1 | Дияволя×6 (hp/дмг 1.93/1.90) | 8.2 | 7/12 | 1.3 | 42% | 0 | casts 4 | extra 0.1 | leader 9.8/хід martial 11.4/хід caster 20.8/хід
mixed | L6 | T4 | Суккуб×5 (hp/дмг 0.50/1.00) | 6.8 | 8/12 | 1 | 47.5% | 0 | casts 2.3 | extra 0.3 | leader 18.1/хід martial 16.6/хід caster 53.8/хід
mixed | L10 | T7 | Диявол×5 (hp/дмг 0.52/1.15) | 6.3 | 12/12 | 0 | 86.8% | 0 | casts 5.5 | extra 1.8 | leader 17.2/хід martial 24.0/хід caster 49.1/хід
martial | L3 | T1 | Дияволя×6 (hp/дмг 2.01/2.21) | 9 | 9/12 | 0.8 | 61.7% | 0 | casts 0 | extra 0 | martial 10.9/хід
martial | L6 | T4 | Суккуб×4 (hp/дмг 0.67/1.00) | 5.3 | 12/12 | 0 | 81.7% | 0 | casts 0 | extra 0 | martial 21.5/хід
martial | L10 | T7 | Диявол×3 (hp/дмг 0.91/2.64) | 6.2 | 12/12 | 0 | 84.6% | 0 | casts 0 | extra 0 | martial 24.7/хід
caster | L3 | T1 | Дияволя×6 (hp/дмг 1.79/1.75) | 4.8 | 11/12 | 0.3 | 73% | 0 | casts 9.3 | extra 0 | caster 21.2/хід
caster | L6 | T4 | Суккуб×4 (hp/дмг 0.58/1.00) | 2.9 | 12/12 | 0 | 81.8% | 0 | casts 6.3 | extra 0 | caster 46.2/хід
caster | L10 | T7 | Диявол×4 (hp/дмг 0.59/1.17) | 3.5 | 12/12 | 0 | 78.6% | 0 | casts 9.1 | extra 0 | caster 45.4/хід
leader | L3 | T1 | Дияволя×6 (hp/дмг 1.97/1.75) | 9.2 | 4/12 | 2 | 26.1% | 0 | casts 0 | extra 4.5 | leader 9.7/хід
leader | L6 | T4 | Суккуб×3 (hp/дмг 0.85/1.00) | 5.7 | 11/12 | 0.3 | 75.3% | 0 | casts 0 | extra 8.6 | leader 17.9/хід
leader | L10 | T7 | Диявол×3 (hp/дмг 0.89/1.56) | 4.4 | 12/12 | 0 | 79.2% | 0 | casts 0 | extra 12.7 | leader 22.3/хід
Касти: Ланцюгова блискавка 181, Кам'яні шипи 158, Крижаний болт 63, Вогняна куля 36

Reading: leader parties went from 2/12 to 11/12 wins at L6 (8.6 morale extra turns per fight, rounds 9.9 to 5.7) and L10 now ends in 4.4 rounds. Caster parties end in 2.9-3.5 rounds at L6/L10 (4.8 at L3) and still do about 2.1x martial damage per hero-turn at L6/L10 (46 vs 21). The remaining gap is structural: every damaging spell adds hero level + casting modifier per target on top of its dice (about +10 at L6), so cheap AoE spells (Кам'яні шипи 1 die) stay strong; getting to 1.5x would need either that flat part reduced (engine rule) or AoE spells limited to 1-2 targets. Mixed parties run 6.3-8.2 rounds and lose some fights at L3/L6 now that casters respect slots (7/12 and 8/12 wins), so the realistic party is currently on the hard side at low level.
