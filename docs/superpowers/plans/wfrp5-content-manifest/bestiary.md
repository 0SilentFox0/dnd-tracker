# Bestiary manifest (C6): units, creature templates, trait recipes

Source: `13-bestiary.md` (p318-363; profiles read from the stat blocks, size and wounds from the tables on p360-361). Only numbers and mechanic names are recorded; descriptions and quotes are not copied. All creature names are `proposed` originals checked against the forbidden-terms file; the book's own creature names are deliberately not stored (use the `page` to find the entry).

## Legend

- Profile order: WS BS S T I Ag Dex Int WP Fel; `move` = book M (template speed = move x 6). Book dashes (no value) are written as 5 (`CHARACTERISTIC_MIN`). `book W` = Wounds printed in the block; `tpl maxHp` = result of the template formula (`unitWounds`: average = SB + 2xTB + WPB; small = 2xTB + WPB; large x2, enormous x4, monstrous x8; swarm x5), which is what the validator requires. Where they differ the notes say so.
- `tpl level` = the level (1-4, `UNIT_LEVEL_BANDS`) with the fewest violations, preferring wounds fit over combat fit. Characteristics above the level cap (45/55/65/80) are clamped; max(WS, BS) below the level minimum (20/30/40/50) must be raised in the data pass (noted).
- `abilities` use only recipe ids that exist (`systems/wfrp/rules/traits/recipes.ts`): size, armour, ward, fear/terror, frenzy/hatred/animosity, regenerate, bite/claw/weapon/breath/ranged (the `+n` is the book damage; the data pass clamps it to the level attack band: 1-5, 2-7, 4-9, 6-12), nightVision, undead, flier. `not expressible` lists book traits with no recipe.
- creature type must be one of Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors; humanoid archetypes are filed under Raiders, fiends under Horrors, the construct-style bog creature under Constructs.
- `ex` rows: `yes:<slug>` where an existing row is the same creature concept (tier stats of the existing row differ and win); `similar:<slug>` is only a hint.

## Counts

| Group | Rows |
|---|---|
| Raiders (humanoids, marauder-type, beast-folk, ratfolk) | 17 |
| Beasts (animals, monsters) | 16 |
| Restless Dead | 9 |
| Cultists | 3 |
| Constructs | 1 |
| Horrors | 3 |
| Units total | 49 |
| Creature templates | 7 |
| Book traits listed in coverage table | 69 (recipe exists for 18) |

Template currently holds 30 units (tier archetypes with own numbers); 6 map by concept (Thornback Boar, Cinder Drake, Mire Skeleton, Barrow Shambler, Lantern Wraith, Ember Acolyte). The other 24 existing rows have no book counterpart and stay as template-only archetypes. The book also prints 4 named leader/skirmisher/shaman examples (p354-356) built from the templates below; they are not rows.

## Issues

1. Profile quality: several two-column blocks lost text (attack damage of the large flying beast, giant, troll fear rating, vampire and vomit effects, banshee attack). Those rows say "scan pXXX" in notes; their damage and psychology numbers are placeholders.
2. Wounds: 14 units print a book W that differs from the template formula (the formula wins for `maxHp`); most differences are small or come from skeleton/construct-style hardiness that the formula ignores.
3. Level bands: the template's tier bands do not match the book power scale: 9 units need max(WS, BS) raised to reach the level minimum, and big monsters (kraken, colossus, drake) hit the characteristic cap 80 / attack band 12. Attack damage of the book (+7 to +16) always exceeds the level 1-2 bands, so clamping applies to nearly every row.
4. Magical attacks and regeneration are only allowed from level 3 (2 for regeneration), and ward only at level 3-4, which conflicts with level-1/2 undead and the fiend-type rows (flagged).
5. Features the schema cannot hold: multiple free attacks (tentacles, tail), breath-type choice, vomit/chill/howl special attacks, constrict and web, skills and talents (units carry only characteristics, abilities and known spells). Optional armour in the book is not modelled.
6. Humanoid civilian archetypes (trader, scout-type, tinker) fit poorly into the six creature types; consider dropping about 3 of them to stay near the 45-unit target.

## Units

| # | page | creature type | tpl level | size | move | WS BS S T I Ag Dex Int WP Fel (book) | book W | tpl maxHp | abilities (trait recipe ids) | not expressible (book traits) | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 319 | Raiders | 2 | average | 4 | 30 30 30 30 30 30 30 30 30 30 | 12 | 12 | Size (average), weapon +7, ranged +7 | - | Village Militiaman (proposed) | no | speed 24, initiative 30, gridSize 1; civilian archetype; optional bow (50 yd) |
| 2 | 319 | Raiders | 2 | average | 3 | 20 40 20 20 50 30 40 30 40 40 | 10 | 10 | Size (average), nightVision, weapon +6, ranged +6 | - | Burrow Slinger (proposed) | no | speed 18, initiative 50, gridSize 1; civilian archetype; optional sling (60 yd) |
| 3 | 320 | Raiders | 2 | average | 5 | 40 40 30 30 50 40 40 40 40 30 | 13 | 13 | Size (average), nightVision, weapon +7, ranged +7 | - | Glade Warden (proposed) | no | speed 30, initiative 50, gridSize 1; optional longbow (70 yd) |
| 4 | 320 | Raiders | 2 | average | 3 | 40 30 30 40 20 20 40 30 50 20 | 16 | 16 | Size (average), hatred (marauder-type foes), weapon +7, ranged +9 | - | Hold Delver (proposed) | no | speed 18, initiative 20, gridSize 1; optional crossbow (50 yd, reload 1) |
| 5 | 321 | Raiders | 2 | average | 4 | 45 30 40 30 40 35 30 30 30 30 | 13 | 13 | Size (average), armour 1, weapon +8, weapon +6 | - | Gate Watchman (proposed) | no | speed 24, initiative 40, gridSize 1; second attack is the dagger; armour = jack on arms and body |
| 6 | 321 | Raiders | 1 | average | 4 | 30 30 30 30 30 40 30 40 35 45 | 12 | 12 | Size (average), weapon +5 | - | Market Trader (proposed) | no | speed 24, initiative 30, gridSize 1; civilian archetype; likely drop |
| 7 | 322 | Raiders | 3 | average | 4 | 40 30 45 40 35 30 30 30 30 30 | 15 | 15 | Size (average), armour 1, weapon +8 | - | Alley Bruiser (proposed) | similar:ditch-cutthroat | speed 24, initiative 35, gridSize 1; knuckle and dagger options in the block |
| 8 | 322 | Raiders | 1 | average | 3 | 20 40 30 20 55 40 50 30 40 40 | 10 | 11 | Size (average), armour 1, weapon +5 | - | Pocket Prowler (proposed) | no | clamp: i 55->45, dex 50->45; formula maxHp 11 differs from book W 10; speed 18, initiative 45, gridSize 1; civilian archetype; block header cut in extract (identified by profile) |
| 9 | 323 | Raiders | 2 | average | 4 | 40 30 30 20 30 40 40 30 40 25 | 11 | 11 | Size (average), hatred (marauder-type foes), nightVision, weapon +7 | - | Burrow Tinker (proposed) | no | speed 24, initiative 30, gridSize 1; optional jerkin AP1, helmet AP2 |
| 10 | 324 | Raiders | 3 | large | 6 | 30 20 45 45 20 25 20 20 30 20 | 30 | 30 | Size (large), fear 1, weapon +12 | Hungry | Hill Glutton (proposed) | similar:scarred-brute | raise max(WS,BS) 30 to 40 for level 3; speed 36, initiative 20, gridSize 2; optional gut plate AP2 body, helmet AP2 head |
| 11 | 325 | Beasts | 2 | average | 7 | 35 5 35 40 35 35 5 10 10 5 | 12 | 12 | Size (average), armour 1, claw +6 | Bestial, Skittish | Thornback Boar (proposed) | yes:thornback-boar | speed 42, initiative 35, gridSize 1; tusk free attack +7 when charging; existing row uses tier stats |
| 12 | 325 | Beasts | 1 | small | 6 | 25 5 20 20 35 30 5 15 10 15 | 4 | 5 | Size (small), nightVision, claw +5, bite +5 | Bestial, Skittish, Tracker | Kennel Mastiff (proposed) | no | formula maxHp 5 differs from book W 4; speed 36, initiative 35, gridSize 1; claw/bite lose momentum for the free attack |
| 13 | 326 | Beasts | 1 | small | 6 | 20 5 20 20 35 35 10 15 15 5 | 4 | 5 | Size (small), nightVision, claw +4, bite +5 | Bestial, Infected (assumed) | Sewer Gnawer (proposed) | no | formula maxHp 5 differs from book W 4; speed 36, initiative 35, gridSize 1; traits block cut in extract; scan p326 |
| 14 | 326 | Beasts | 1 | small | 6 | 35 5 15 25 10 35 30 5 25 5 | 4 | 6 | Size (small), nightVision, bite +4 | Bestial, Infected, Skittish, Wallcrawler, Web, Venom | Cellar Weaver (proposed) | no | formula maxHp 6 differs from book W 4; speed 36, initiative 10, gridSize 1; fangs +3 and bite +4 listed; single bite kept |
| 15 | 327 | Beasts | 1 | average | 9 | 25 5 35 30 35 30 5 15 15 5 | 10 | 10 | Size (average), nightVision, claw +6, bite +6 | Bestial, Skittish (assumed) | Gaunt Wolf (proposed) | similar:ash-hound | speed 54, initiative 35, gridSize 1; traits not visible in extract; scan p327 |
| 16 | 327 | Beasts | 2 | large | 8 | 25 5 45 35 15 30 5 10 10 10 | 22 | 22 | Size (large), nightVision, claw +12 | Bestial, Skittish, Trained | Plough Mare (proposed) | no | raise max(WS,BS) 25 to 30 for level 2; speed 48, initiative 15, gridSize 2; hooves +12; optional armour AP1 |
| 17 | 328 | Beasts | 4 | large | 3 | 35 5 80 75 15 55 5 5 65 5 | 56 | 56 | Size (large), nightVision, claw +8 | Amphibious, Bestial, Constrictor (entangle on hit) | Marsh Kraken (proposed) | no | raise max(WS,BS) 35 to 50 for level 4; band: AP 0 vs 1-6; speed 18, initiative 15, gridSize 2; 8 free tentacle attacks, each can entangle; template has one attack row only |
| 18 | 329 | Beasts | 3 | large | 7 | 45 5 55 40 30 45 5 15 25 5 | 30 | 30 | Size (large), claw +12 | Bestial | Crag Charger (proposed) | no | speed 42, initiative 30, gridSize 2; attack damage lost in extract: +12 is a placeholder; scan p329 |
| 19 | 329 | Beasts | 1 | average | 4 | 40 5 50 30 10 50 5 5 15 5 | 12 | 11 | Size (average), nightVision, bite +9, claw +14 | Bestial, Bounce, Infected | Cave Hopper (proposed) | no | clamp: s 50->45, ag 50->45; formula maxHp 11 differs from book W 12; speed 24, initiative 10, gridSize 1; teeth +9; second line +14 may belong to another block (verify) |
| 20 | 330 | Beasts | 4 | enormous | 6 | 65 60 65 65 60 25 15 45 85 25 | 104 | 104 | Size (enormous), armour 3, terror 3, nightVision, flier, claw +16, bite +9, breath +9 | Champion? (none), Many attacks, breath type free choice | Cinder Drake (proposed) | yes:cinder-drake | clamp: wp 85->80; speed 36, initiative 60, gridSize 3; terror rating lost in extract (3 assumed); book size monstrous but W104 = x4 (enormous); fly 80 yd; tail +8 free attack dropped |
| 21 | 331 | Constructs | 3 | large | 5 | 35 5 50 55 10 15 10 10 5 5 | 40 | 30 | Size (large), regenerate, nightVision, claw +14 magical | Construct, Infected, Regeneration; attack magical | Bog Hulk (proposed) | no | raise max(WS,BS) 35 to 40 for level 3; formula maxHp 30 differs from book W 40; speed 30, initiative 10, gridSize 2; W40 does not match formula (32): scan p331; fists +14 magical |
| 22 | 332 | Beasts | 4 | enormous | 6 | 30 30 65 55 30 20 15 15 25 15 | 72 | 72 | Size (enormous), armour 1, fear 1, weapon +16 | - | Hill Colossus (proposed) | no | raise max(WS,BS) 30 to 50 for level 4; speed 36, initiative 30, gridSize 3; attack damage garbled in extract (+16 likely); traits cut; scan p332 |
| 23 | 332 | Beasts | 4 | enormous | 6 | 50 5 50 50 45 60 5 20 50 15 | 80 | 80 | Size (enormous), armour 1, nightVision, flier, claw +14, bite +8 | Bestial? (optional) | Storm Gryphon (proposed) | no | speed 36, initiative 45, gridSize 3; talons are fast; fly 80 yd |
| 24 | 333 | Beasts | 4 | enormous | 6 | 55 5 55 55 50 65 5 10 35 5 | 72 | 72 | Size (enormous), armour 1, flier, claw +14, bite +8 | Bestial; tail attack +7 knocks smaller foes prone | Thorn-Tail Prowler (proposed) | no | speed 36, initiative 50, gridSize 3; fly 80 yd |
| 25 | 334 | Beasts | 3 | large | 8 | 35 5 45 40 30 45 5 20 25 5 | 28 | 28 | Size (large), flier, claw +12 | - | Winged Courser (proposed) | no | raise max(WS,BS) 35 to 40 for level 3; speed 48, initiative 30, gridSize 2; hooves +12 pummel; fly 100 yd |
| 26 | 335 | Beasts | 3 | large | 6 | 30 15 55 45 10 15 15 10 20 5 | 30 | 30 | Size (large), armour 2, fear 2, regenerate, nightVision, weapon +14, bite +8 | Infected, Stupid, Vomit (area stun) | Moss Brute (proposed) | no | raise max(WS,BS) 30 to 40 for level 3; speed 36, initiative 10, gridSize 2; fear rating and traits partly cut; vomit attack not expressible |
| 27 | 336 | Raiders | 2 | average | 4 | 25 30 30 30 20 30 25 20 20 15 | 11 | 11 | Size (average), armour 1, animosity (own-kind rivals), nightVision, weapon +7, ranged +6 | Afraid (of one foe kind) | Scrap Raider (proposed) | no | speed 24, initiative 20, gridSize 1; shortbow 40 yd; night sight assumed |
| 28 | 337 | Raiders | 2 | average | 4 | 35 30 35 45 20 25 20 18 35 15 | 14 | 14 | Size (average), armour 1, animosity (own-kind rivals), weapon +7, ranged +7 | Belligerent | Tusked Warrior (proposed) | similar:ridge-reaver | speed 24, initiative 20, gridSize 1; optional bow 50 yd |
| 29 | 338 | Raiders | 1 | small | 4 | 20 20 20 20 30 20 10 20 15 5 | 4 | 5 | Size (small), weapon +3, ranged +2 | - | Grubby Scamp (proposed) | no | formula maxHp 5 differs from book W 4; speed 24, initiative 30, gridSize 1; block row has Fel lost; Fel 5 assumed; rocks 6 yd; many can use swarm rules |
| 30 | 338 | Restless Dead | 2 | average | 4 | 30 5 35 40 30 35 25 20 20 5 | 13 | 13 | Size (average), nightVision, claw +6, bite +6 | Bestial, Infected | Grave Gnawer (proposed) | no | speed 24, initiative 30, gridSize 1; size trait cut (small?); W13 fits average |
| 31 | 339 | Restless Dead | 1 | average | 4 | 25 25 30 30 20 20 25 5 5 5 | 12 | 9 | Size (average), fear 1, undead, weapon +7 magical | - | Mire Skeleton (proposed) | yes:mire-skeleton | band: magical attack n/a; formula maxHp 9 differs from book W 12; speed 24, initiative 20, gridSize 1; magical weapon attack; W12 above formula 9; Int/WP/Fel dashes -> 5 |
| 32 | 340 | Restless Dead | 2 | average | 4 | 15 5 30 30 5 10 10 5 5 5 | 12 | 9 | Size (average), fear 1, nightVision, undead, weapon +7 magical, bite +6 magical | Construct, Infected, Painless | Barrow Shambler (proposed) | yes:barrow-shambler | raise max(WS,BS) 15 to 30 for level 2; band: magical attack n/a; band: magical attack n/a; formula maxHp 9 differs from book W 12; speed 24, initiative 5, gridSize 1; both attacks magical |
| 33 | 341 | Restless Dead | 2 | average | 9 | 35 5 35 30 35 25 5 5 10 5 | 12 | 10 | Size (average), armour 1, fear 1, nightVision, undead, claw +7, bite +6 | Construct, Hungry | Bone Hound (proposed) | no | formula maxHp 10 differs from book W 12; speed 54, initiative 35, gridSize 1 |
| 34 | 341 | Restless Dead | 1 | average | 6 | 30 5 30 30 10 30 20 15 15 5 | 10 | 10 | Size (average), fear 1, nightVision, undead, claw +5 magical | Ethereal, Painless | Lantern Wraith (proposed) | yes:lantern-wraith | band: magical attack n/a; speed 36, initiative 10, gridSize 1; ghostly grasp magical; ethereal not expressible |
| 35 | 342 | Restless Dead | 2 | average | 6 | 35 5 35 30 25 30 25 25 25 15 | 11 | 11 | Size (average), fear 1, nightVision, undead, weapon +7 magical | Champion, Chill Grasp (drain 1d10+SL ignoring armour) | Barrow Reaper (proposed) | no | band: magical attack n/a; speed 36, initiative 25, gridSize 1; two profiles merged in extract (this and the next row); chill grasp not expressible |
| 36 | 342 | Restless Dead | 2 | average | 6 | 35 5 30 30 35 30 25 25 25 5 | 11 | 11 | Size (average), terror 1, nightVision, undead, claw +6 magical | Ghostly Howl, Ethereal | Wailing Shade (proposed) | no | band: magical attack n/a; speed 36, initiative 35, gridSize 1; profile from merged row; attack and howl effect lost; scan p342 |
| 37 | 343 | Restless Dead | 3 | average | 6 | 40 40 50 40 40 50 40 30 30 25 | 15 | 16 | Size (average), regenerate, nightVision, undead, weapon +9, bite +8 | Vampiric, Champion, many more | Blood Courtier (proposed) | no | formula maxHp 16 differs from book W 15; speed 36, initiative 40, gridSize 1; W15 off by one from formula 16; regenerate assumed; traits cut; scan p343 |
| 38 | 344 | Restless Dead | 3 | large | 8 | 55 5 55 55 20 50 5 10 25 5 | 32 | 34 | Size (large), armour 1, fear 1, hatred (living creatures), nightVision, claw +14, bite +8 | Bestial | Blood-Fed Brute (proposed) | no | formula maxHp 34 differs from book W 32; speed 48, initiative 20, gridSize 2; W32 vs formula 34; traits partly cut |
| 39 | 345 | Raiders | 2 | average | 5 | 35 30 35 40 30 35 20 20 30 10 | 14 | 14 | Size (average), nightVision, weapon +7, claw +7 | Striding Gait (woodland) | Horned Marauder (proposed) | no | speed 30, initiative 30, gridSize 1; horns +7 only when charging |
| 40 | 345 | Raiders | 2 | average | 5 | 30 30 30 35 30 35 30 20 25 10 | 11 | 11 | Size (average), nightVision, weapon +7, ranged +6 | Striding Gait (woodland) | Horned Skirmisher (proposed) | no | speed 30, initiative 30, gridSize 1; shortbow 40 yd |
| 41 | 346 | Horrors | 3 | large | 6 | 45 25 45 45 20 35 10 15 35 10 | 30 | 30 | Size (large), nightVision, weapon +12, claw +8 | Hungry | Maze Bull (proposed) | no | speed 36, initiative 20, gridSize 2; horns +8 only when charging |
| 42 | 347 | Cultists | 2 | average | 4 | 30 30 30 30 30 30 30 30 30 30 | 12 | 12 | Size (average), weapon +7, ranged +7 | - | Ember Acolyte (proposed) | yes:ember-acolyte | speed 24, initiative 30, gridSize 1; optional bow 50 yd; corruption traits optional |
| 43 | 347 | Cultists | 2 | average | 4 | 30 30 30 30 30 30 30 30 30 30 | 12 | 12 | Size (average), weapon +7 | Corruption (minor), Mutation (GM choice) | Twisted Wretch (proposed) | no | speed 24, initiative 30, gridSize 1; mutation unexpressible |
| 44 | 348 | Cultists | 3 | average | 4 | 50 30 45 45 45 40 30 30 55 30 | 17 | 17 | Size (average), armour 5, weapon +8 | Champion, Corruption (minor) | Black Iron Champion (proposed) | no | band: AP 5 vs 0-4; speed 24, initiative 45, gridSize 1; heavy armour AP5 (book) |
| 45 | 349 | Horrors | 3 | average | 5 | 55 55 45 35 45 45 30 25 70 15 | 17 | 16 | Size (average), armour 2, ward 8+, fear 1, weapon +9 magical, claw +8 magical | Champion, Corruption (moderate), Fiendish 8+ (ward-like) | Crimson Fiend (proposed) | no | clamp: wp 70->65; band: ward band; formula maxHp 16 differs from book W 17; speed 30, initiative 45, gridSize 1; fear/terror rating lost; magical attacks require level 3+ |
| 46 | 350 | Horrors | 3 | average | 5 | 50 45 35 35 55 60 30 30 70 45 | 16 | 15 | Size (average), ward 8+, fear 1, claw +9 magical | Champion, Corruption (moderate), Fiendish 8+ | Silken Fiend (proposed) | no | clamp: wp 70->65; band: ward band; formula maxHp 15 differs from book W 16; speed 30, initiative 55, gridSize 1; claw fast, penetrating, magical |
| 47 | 351 | Raiders | 2 | average | 5 | 30 30 30 30 40 35 30 20 20 15 | 11 | 11 | Size (average), nightVision, weapon +7 | Infected | Tunnel Ratfolk (proposed) | no | speed 30, initiative 40, gridSize 1; optional light/medium armour |
| 48 | 352 | Beasts | 3 | large | 5 | 35 10 55 45 35 45 25 10 25 10 | 30 | 30 | Size (large), armour 1, nightVision, claw +14 | Bestial, Infected, Stupid | Splice Brute (proposed) | no | raise max(WS,BS) 35 to 40 for level 3; speed 30, initiative 35, gridSize 2; hide +1 AP |
| 49 | 352 | Raiders | 3 | average | 5 | 45 30 45 45 55 45 30 20 35 15 | 15 | 15 | Size (average), armour 3, nightVision, weapon +8 | Infected | Ratfolk Guard (proposed) | no | speed 30, initiative 55, gridSize 1; elite version of the basic ratfolk; armour AP reading ambiguous in extract (3 used); halberd defensive |

## Creature templates (p353-354)

Five combat templates (leader, commander, soldier, skirmisher, elite) on p353 and two caster templates on p354, applied by adding the listed modifiers to a base profile. Modifiers and skill lines are numbers only.

| # | page | characteristic modifiers (book) | skill modifiers (summary) | talents / spells | original name | notes |
|---|---|---|---|---|---|---|
| 1 | 353 | WS+15 BS+15 S+15 T+15 I+15 Ag+15 WP+15 Fel+5 | Cool, Dodge, Intimidate, Leadership +15; Warfare lore +10; Perception +15; melee (two) +15 | 6 talents (combat, inspiring, war leader) | Veteran Leader (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 2 | 353 | WS+20 BS+20 S+20 T+10 I+20 Ag+10 WP+20 Fel+15 | Cool, Dodge, Intimidate +20; Leadership +30; Warfare lore +20; Perception +20; melee (two) +20 | 8 talents (adds Luck, Unshakeable) | Warlord Commander (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 3 | 353 | WS+10 S+10 T+10 WP+10 | Cool +10, Dodge +10, Melee (Basic or Polearm) +10 | none | Drilled Soldier (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 4 | 353 | BS+10 I+10 Ag+10 WP+10 | Dodge +10, Ranged (bow, sling or throwing) +10, Stealth +10 | none | Field Skirmisher (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 5 | 353 | WS+15 S+15 T+15 I+15 WP+15 | Cool +15, Dodge +15, Intimidate +10, Leadership +5, Melee (two) +15, Perception +15 | 3 talents | Shock Veteran (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 6 | 354 | I+10 Int+10 WP+10 | Channelling +10, Cool, Dodge, Intuition, Perception, melee +10; Magick language +15 | magic talents; choose up to 3 petty + 3 lore spells | Hedge Caster (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |
| 7 | 354 | WS+10 I+20 Ag+15 Int+20 WP+20 Fel+10 | Channelling, Cool, Dodge, Intuition, Perception +20; Magick +20; Leadership +10; melee +10 | 10 talents; up to 6 petty + 9 lore spells | Master Caster (proposed) | wounds must be recomputed from the modified S/T/WP; template has no template-application mechanism (a recipe row per tier is needed); skills and talents are not unit fields |

## Trait coverage (recipes)

Book traits p356-359; `yes` means a recipe id exists in `TRAIT_RECIPES`, which the unit validator requires for every ability.

| book trait (mechanic name) | page | template recipe | notes |
|---|---|---|---|
| Afraid (target) | 356 | no | Afraid (target) / flagged on 1 unit |
| Amphibious | 356 | no |  |
| Animosity (target) | 356 | yes: animosity |  |
| Belligerent | 356 | no |  |
| Bestial | 356 | no | most animals |
| Bite | 356 | yes: bite |  |
| Blessed (deity) | 356 | no |  |
| Bounce | 356 | no |  |
| Breath | 357 | yes: breath |  |
| Champion | 357 | no | wraith, fiends, champions |
| Chill Grasp | 357 | no |  |
| Cold-blooded | 357 | no |  |
| Constrictor | 357 | no |  |
| Construct | 357 | no (Constructs creature type only) |  |
| Acid-blood trait | 357 | no |  |
| Corruption (strength) | 357 | no |  |
| Dark Vision | 357 | yes: nightVision (approx) |  |
| Fiendish (rating) | 357 | partly: ward | ward roll equivalent |
| Disease (type) | 357 | no |  |
| Distracting | 357 | no |  |
| Ethereal | 357 | no |  |
| Fear (rating) | 357 | yes: fear |  |
| Ghostly Howl | 357 | no |  |
| Grim | 357 | no |  |
| Hatred (target) | 357 | yes: hatred |  |
| Horns | 357 | attack: claw/weapon row |  |
| Fly (rating) | 358 | yes: flier (note) |  |
| Hungry | 358 | no |  |
| Immune to Psychology | 358 | no |  |
| Frenzy | 358 | yes: frenzy |  |
| Immunity (type) | 358 | no |  |
| Infected | 358 | no | many animals, ratfolk |
| Infestation | 358 | no |  |
| Many Heads (number) | 358 | no |  |
| Dark-power mark (deity) | 358 | no |  |
| Magical (attack) | 358 | yes: magical flag on attack |  |
| Magic Resistance | 358 | no |  |
| Mental Corruption | 358 | no |  |
| Miracles (deity) | 358 | no |  |
| Mutation | 358 | no |  |
| Night Vision | 358 | yes: nightVision |  |
| Painless | 359 | no |  |
| Petrifying Gaze | 359 | no |  |
| Regeneration | 359 | yes: regenerate |  |
| Size (various) | 359 | yes: size (tiny..monstrous) | p360-361 size and wounds tables |
| Spellcaster (various) | 359 | partly: knownSpells + caster template |  |
| Skittish | 359 | no |  |
| Sprinter | 359 | no |  |
| Stealthy | 359 | no |  |
| Striding Gait (terrain) | 359 | no |  |
| Stupid | 359 | no |  |
| Swarm | 359 | yes: swarm (x5 wounds) |  |
| Tongue | 359 | no |  |
| Tail | 359 | attack: claw row (free attack only) |  |
| Tentacles (#) | 359 | attack: claw row (one only) |  |
| Territorial | 359 | no |  |
| Terror (rating) | 359 | yes: terror |  |
| Tracker | 359 | no |  |
| Trained (skills) | 359 | no |  |
| Undead | 359 | yes: undead (note) |  |
| Unstable | 359 | no |  |
| Vampiric | 359 | no |  |
| Venom (difficulty) | 359 | no |  |
| Vomit | 359 | no |  |
| Ward (rating) | 359 | yes: ward |  |
| Wallcrawler | 359 | no |  |
| Web (rating) | 359 | no |  |
| Armour (points) | 359 | yes: armour |  |
| Weapon / hand attacks | 356 | yes: weapon, ranged |  |
