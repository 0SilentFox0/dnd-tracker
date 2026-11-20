# Spells manifest (C4): petty, arcane, hedge, witchcraft, dark (kind dark), blessings, miracles

Source: extract `09-magic.md` (p230-260; spell blocks p240-260) and `08-religion-and-belief.md` (blessings p220-221, miracles p222-229); `tables.json` p220 (Blessings by Cult). Only structure and numbers are recorded; effects are paraphrased in a few words in `notes`. Every `original name` is `proposed` and was checked against `scripts/templates/grim-d100/forbidden-terms.ts` (word match, no hits; all 225 names unique). Book names are not stored; use `page` to look up.

## Decisions applied (from `2026-11-20-wfrp5-generation-unblock-options.md`, option 1A)

- Dark lists (`Pact Rites`, `Grave Rites`) = kind `dark` (core `SPELL_MAGIC_KINDS` already has it under its code key; `GRIM_SPELL_KINDS` does not yet, and its CN band is not defined: proposal 3-18 like witchcraft). The word "dark" appears only in the kind key, never in a name.
- A blessing is one row with several cult lists (`list(s)` joined by `;`), per the Blessings-by-Cult table; 19 blessings x 60 cult slots. Miracles are one row per cult.
- CN 0 for petty, blessings and miracles (the book gives miracles no CN; they use a Pray test). Arcane/hedge/witchcraft/dark keep the book CN; notes flag values outside the working-tree bands (arcane 3-14, hedge 3-12, witchcraft 3-18).
- Narrative rows are allowed as `executionMode: manual`; durations are text in the description (class and value below are for the generator, not a schema field).

## Legend

- `list(s)`: exact names from `GRIM_ARCANE_LISTS`, `GRIM_DARK_LISTS`, `GRIM_CULT_LISTS` plus `Cantrips`, `Fenlore`, `Thornwitchery`. Book wind/cult to list mapping: fire = School of Embers, shadows = School of Gloam, light = School of Radiance, metal = School of Alloy, life = School of Verdance, heavens = School of Firmament, death = School of Dusk, beasts = School of Wilds, general arcane = Common Arcana, fiend-binding lore = Pact Rites, grave lore = Grave Rites; cults: sea = Tide, death god = Still Hour, strategy = Banner, trickery = Gambler, fertility = Green Cradle, mercy = Mercy, crown patron = Forged Crown, wild = Deep Wood, wolves = Winter Wolf, justice = Scales. `Rites of the Forge-Fathers` and `Hearth Rites` have no book miracles/blessings of their own (template-only).
- `range` / `target`: book formulas. WP = Willpower, WPB = Willpower Bonus, IB = Initiative Bonus, IntB = Intelligence Bonus, FB = Fellowship Bonus, TB = Toughness Bonus, DexB = Dexterity Bonus, yd = yards, AoE = area. Distances stay in yards as printed (see README).
- `duration class`: instant | rounds | minutes | hours | days | special | unknown (line lost in extract). `duration value`: the book formula (`WPB`, `FB`, `6`, ...); `-` for instant/special.
- `overcast`: `dice` = damage dice grow with SL (arcane/hedge/witchcraft/dark damage spells); `none` = the book lets extra SL buy range/area/duration/targets but the validator only supports `dice` (`targets` is rejected), so such rows get `null`; `none (n/a)` = petty and miracles cannot be overcast. Blessings: +6 yd range, +1 target, +6 rds duration per +2 SL (not expressible; narrative).
- `effect class`: damage | heal | condition | buff | utility | manual. damage/heal/condition fit the current validator (one `dealDamage`/`heal` or an `attribute` wfrp condition other than `unconscious`/`surprised`); buff/utility/manual are authored as `manual` unless an engine hook exists; summons and fiend/undead handling are always `manual`.
- `ingr`: `y` = the lore offers an optional ingredient (one per cast, price = half CN in shillings = CN x 6 pence; CN 0 costs 10 pence; hedge/witchcraft ingredients only soften the Minor Miscast roll 01-40); `n` for petty, blessings, miracles. Ingredient text itself is per lore, not per spell.
- `in template`: `yes:<slug>` when an existing `data/templates/grim-d100/spells.json` row is mechanically the same (verified by reading the rows), else `no`.
- Page spot-checked against per-page files: p221, p223, p224, p226, p229, p240, p242, p245, p246, p249, p250, p252, p253, p255, p256, p257, p258, p259.

## Counts

| Group | kind | list | Rows |
|---|---|---|---|
| spells | petty | Cantrips | 25 |
| spells | arcane | Common Arcana | 24 |
| spells | arcane | School of Wilds | 8 |
| spells | arcane | School of Dusk | 8 |
| spells | arcane | School of Embers | 8 |
| spells | arcane | School of Firmament | 8 |
| spells | arcane | School of Verdance | 8 |
| spells | arcane | School of Radiance | 8 |
| spells | arcane | School of Alloy | 8 |
| spells | arcane | School of Gloam | 8 |
| spells | hedge | Fenlore | 8 |
| spells | witchcraft | Thornwitchery | 8 |
| spells | dark | Pact Rites | 9 |
| spells | dark | Grave Rites | 4 |
| blessings | blessing | 12 cult lists (10 with book rows) | 19 rows, 60 cult slots |
| miracles | miracle | 10 cult lists x 6 | 60 |

Spells 142 (petty 25, arcane 88, hedge 8, witchcraft 8, dark 17 of which 9 are the optional dark-power set); blessings 19; miracles 60; all rows 225. Template holds 30 spells: 3 map by equivalence (Spark Flick, Dazzle, Hearth Mending); the other 27 are listed in the appendix.

## Cross-cutting issues

1. Bands vs book CN: 8 hedge spells have book CN 0 (band 3-12); 7 arcane spells have CN 1-2 (floor 3); one arcane spell is CN 18 (ceiling 14); dark has no band yet. Notes flag each row; owner decides to widen bands or clamp.
2. Roughly 50 of the 146 spells fit the current validator (damage/heal/condition); the rest are buff/utility/summon and need `manual` rows (decision above) or engine hooks. Blessings: only the heal one fits; miracles: about a third fit.
3. A sleep-type spell would need the forbidden condition `unconscious`; `overcast: targets` is unsupported.
4. Not expressible by the schema: spell damage "SL bonus" scaling, WP/bonus-scaled range and duration (only fixed numbers or description text), ingredient effects, blessing SL options, miracle side-effects (holy water vs fiends etc.).
5. Extract quality (RESOLVED 2026-11-20 by page scan, PDF page number = printed page, offset 0): pages 241, 243, 247, 252, 254 and 222-229 were checked against the PDF text layer. Spells: only Distant Ear and Carried Whisper (p241) had wrong range/target/duration; CN pairings for Spanning Light (4), Elemental Exhale (6), Spirit Whirl (10), Soul Draw (6), the Radiance trio and the web-of-seeming spell are confirmed; Mercy Stroke and Fiend Sunder changed from dice damage to manual (no damage dice). Miracles: rows 166-225 were rewritten from the page scan; the cult filing was already right per cult but params, classes and durations inside several cults were garbled and are now corrected (changed rows are marked CHANGED). Nothing was invented; every row keeps its proposed name. Notes column: `scan-verified pN` plus an own-words effect summary.
   - Miracles have NO CN: none of the eight miracle pages has a CN line; they use a Pray test, and every 2 SL adds the initial range, targets or duration again (not for You/Instant). CN 0 is a template convention only.
   - Hedge spells (Fenlore, 8 rows) have book CN 0 on every spell (confirmed on p255-256); witchcraft CN is 14 for the first row (Barren Touch) and per the table below for the rest.
   - Notation: `FB` = Bonus of Fellowship, `Fel` = the full Fellowship value (miracle ranges and some areas use the full value, e.g. `Fel yd`). Earlier rows that wrote `FB yd` for a full-Fellowship range were corrected.
6. Doubtful names: `Rend the Veil` (summon of a lesser fiend, sounds close to a book idiom but is generic), `Wild Shape` and `Eightfold Seal` (generic fantasy, ok), `Truth Bind` (near a book effect name, shorten if the owner finds it close). No forbidden-term hits.
7. Miracle count per cult is exactly 6 in the book (10 cults); the template has a Forge-Fathers list with no book source: leave template-only.


## petty / `Cantrips` (25)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 240 | petty | Cantrips | 0 | You | You | instant | - | none (n/a) | utility | n | True North Sense | no |  |
| 2 | 240 | petty | Cantrips | 0 | 1 yd | 1 | hours | 1 | none (n/a) | utility | n | Gentle Beast | no |  |
| 3 | 240 | petty | Cantrips | 0 | You | You | minutes | Agility | none (n/a) | utility | n | Leaf Light Tread | no | duration is Agility minutes |
| 4 | 240 | petty | Cantrips | 0 | 1 yd | Special | days | WPB | none (n/a) | utility | n | Larder Keeping | no |  |
| 5 | 240 | petty | Cantrips | 0 | WP yd | 1 | instant | - | none (n/a) | damage | n | Spark Flick | yes:spark-flick |  |
| 6 | 240 | petty | Cantrips | 0 | Touch | 1 | rounds | WPB | none (n/a) | condition | n | Dazzle | yes:dazzle | existing is ranged; book is touch; condition blinded |
| 7 | 240 | petty | Cantrips | 0 | Touch | 1 | instant | - | none (n/a) | damage | n | Leech Touch | no |  |
| 8 | 241 | petty | Cantrips | 0 | IB yd | 1 | minutes | WPB | none (n/a) | utility | n | Distant Ear | no | scan-verified; own words: hear one target as if adjacent |
| 9 | 241 | petty | Cantrips | 0 | WP yd | Special | rounds | WPB | none (n/a) | utility | n | Carried Whisper | no | scan-verified; own words: throw voice to a point in range, regardless of sight |
| 10 | 241 | petty | Cantrips | 0 | WP yd | Special | instant | - | none (n/a) | utility | n | Candle Gust | no |  |
| 11 | 241 | petty | Cantrips | 0 | You | You | minutes | WP | none (n/a) | utility | n | Lantern Glow | no |  |
| 12 | 241 | petty | Cantrips | 0 | Touch | 1 | instant | - | none (n/a) | utility | n | Tumbler Ease | no |  |
| 13 | 241 | petty | Cantrips | 0 | Touch | Special | instant | - | none (n/a) | manual | n | Hat Critter | no | summon: manual only |
| 14 | 241 | petty | Cantrips | 0 | You | You | rounds | WPB | none (n/a) | utility | n | Palm Flame | no | scan-verified; utility only: harmless flame, ignites flammables, no damage |
| 15 | 241 | petty | Cantrips | 0 | WP yd | Special | minutes | WP | none (n/a) | utility | n | Wisp Lanterns | no |  |
| 16 | 241 | petty | Cantrips | 0 | You | You | hours | WPB | none (n/a) | utility | n | Dry Cloak | no |  |
| 17 | 241 | petty | Cantrips | 0 | 1 yd | Special | instant | - | none (n/a) | utility | n | Clear Cup | no |  |
| 18 | 242 | petty | Cantrips | 0 | 1 yd | Special | instant | - | none (n/a) | utility | n | Quick Mould | no |  |
| 19 | 242 | petty | Cantrips | 0 | Touch | 1 | instant | - | none (n/a) | condition | n | Static Bite | no | condition stunned |
| 20 | 242 | petty | Cantrips | 0 | Touch | Special | rounds | WPB | none (n/a) | utility | n | Thumb Spring | no |  |
| 21 | 242 | petty | Cantrips | 0 | Half WP yd | 1 | instant | - | none (n/a) | utility | n | Nudge | no |  |
| 22 | 242 | petty | Cantrips | 0 | Touch | 1 | rounds | WPB | none (n/a) | condition | n | Drowse Touch | no | FORBIDDEN_CONDITIONS blocks unconscious: needs rewrite as Fatigued/Stunned or a narrative-only spell; condition fatigued(uncertain) |
| 23 | 242 | petty | Cantrips | 0 | You | You | instant | - | none (n/a) | utility | n | Palm Hop | no |  |
| 24 | 242 | petty | Cantrips | 0 | WP yd | Special | rounds | WPB | none (n/a) | utility | n | Phantom Murmurs | no |  |
| 25 | 242 | petty | Cantrips | 0 | 1 yd | 1 | instant | - | none (n/a) | utility | n | Tainted Sense | no | heading/CN pairing inferred from order, verify page |

## arcane / `Common Arcana` (24)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 26 | 242 | arcane | Common Arcana | 2 | You | You | rounds | WPB | none | buff | y | Mantle Ward | no | book CN 2 below band floor 3 |
| 27 | 242 | arcane | Common Arcana | 3 | You | You | rounds | WPB | none | buff | y | Conjured Edge | no |  |
| 28 | 243 | arcane | Common Arcana | 3 | You | AoE WPB yd | rounds | WPB | none | buff | y | Shaft Turning | no |  |
| 29 | 243 | arcane | Common Arcana | 4 | WP yd | Special | rounds | WPB | none | utility | y | Spanning Light | no | scan-verified: CN 4 confirmed; own words: magic bridge, size WPB yd, +WPB per +2 SL |
| 30 | 243 | arcane | Common Arcana | 4 | WP yd | AoE WPB yd | instant | - | dice | damage | y | Burst Orb | no | area damage |
| 31 | 243 | arcane | Common Arcana | 4 | WP yd | 1 | instant | - | dice | damage | y | Lance Bolt | no |  |
| 32 | 243 | arcane | Common Arcana | 6 | Special | Special | instant | - | dice | damage | y | Elemental Exhale | no | scan-verified: CN 6 confirmed; own words: BS-test breath, damage WPB plus a per-lore rider (fire/cold/shock/poison/acid/smoke); area damage; lore-dependent: author per lore or manual |
| 33 | 243 | arcane | Common Arcana | 6 | WP yd | Special | instant | - | dice | damage | y | Arcing Strike | no |  |
| 34 | 243 | arcane | Common Arcana | 2 | You | You | rounds | TB or hours | none | buff | y | Acid Veins | no | book CN 2 below band floor 3 |
| 35 | 243 | arcane | Common Arcana | 1 | You | You | rounds | IB | none | buff | y | Gloom Sight | no | book CN 1 below band floor 3 |
| 36 | 244 | arcane | Common Arcana | 4 | You | You | rounds | WPB | none | buff | y | Flicker Wreath | no |  |
| 37 | 244 | arcane | Common Arcana | 7 | You | AoE WPB yd | rounds | WPB | none | buff | y | Overhead Bastion | no |  |
| 38 | 244 | arcane | Common Arcana | 1 | WP yd | 1 | instant | - | none | utility | y | Slip Grip | no | book CN 1 below band floor 3 |
| 39 | 244 | arcane | Common Arcana | 8 | You | You | rounds | WPB | none | utility | y | Sky Lift | no |  |
| 40 | 244 | arcane | Common Arcana | 4 | You | You | rounds | WPB | none | buff | y | Ribbon Guard | no |  |
| 41 | 244 | arcane | Common Arcana | 4 | WP yd | 1 | rounds | 1 | none | utility | y | Unseen Hand | no |  |
| 42 | 244 | arcane | Common Arcana | 4 | You | You | minutes | WP | none | utility | y | Plain Veil | no | CN 4 / WP min assigned from the line before the next spell; verify |
| 43 | 244 | arcane | Common Arcana | 3 | WPB yd | 1 | rounds | WPB | none | condition | y | Binding Wrap | no | condition entangled |
| 44 | 244 | arcane | Common Arcana | 3 | You | You | rounds | WPB | none | buff | y | Menace Mantle | no |  |
| 45 | 245 | arcane | Common Arcana | 6 | You | AoE WPB yd (max) | instant | - | dice | damage | y | Shove Wave | no | area damage |
| 46 | 245 | arcane | Common Arcana | 4 | You | AoE WPB yd | minutes | WPB | none | utility | y | Hush Field | no |  |
| 47 | 245 | arcane | Common Arcana | 3 | You | You | instant | - | none | utility | y | Short Step | no |  |
| 48 | 245 | arcane | Common Arcana | 6 | You | You | rounds | WPB | none | buff | y | Dread Mantle | no |  |
| 49 | 245 | arcane | Common Arcana | 6 | You | You | rounds | WPB | none | buff | y | Ward Shell | no |  |

## arcane / `School of Wilds` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 245 | arcane | School of Wilds | 3 | You | You | rounds | WPB | none | buff | y | Claw Bloom | no |  |
| 51 | 245 | arcane | School of Wilds | 5 | You | You | minutes | TB | none | buff | y | Wild Shape | no |  |
| 52 | 246 | arcane | School of Wilds | 10 | WPB yd | 1 | days | WPB | none | condition | y | Herd Command | no | condition type not fixed by the book summary: pick on authoring |
| 53 | 246 | arcane | School of Wilds | 3 | You | You | minutes | WP | none | utility | y | Fang and Feather Speech | no | extract CN line split from range |
| 54 | 246 | arcane | School of Wilds | 8 | WP yd | AoE WPB yd | rounds | WPB | dice | damage | y | Carrion Cloud | no | area damage |
| 55 | 246 | arcane | School of Wilds | 6 | You | You | rounds | WPB | none | buff | y | Stalker Pelt | no |  |
| 56 | 246 | arcane | School of Wilds | 10 | Strength yd | 1 (max) | instant | - | dice | damage | y | Gilded Javelin | no |  |
| 57 | 246 | arcane | School of Wilds | 8 | You | You | rounds | WPB | none | buff | y | Feral Surge | no |  |

## arcane / `School of Dusk` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 58 | 247 | arcane | School of Dusk | 10 | Touch | AoE WPB yd | minutes | WP | none | utility | y | Quiet Circle | no |  |
| 59 | 247 | arcane | School of Dusk | 6 | You | You | rounds | WPB | none | buff | y | Reaper Blade | no |  |
| 60 | 247 | arcane | School of Dusk | 10 | WP yd | AoE WPB yd | instant | - | dice | damage | y | Spirit Whirl | no | scan-verified: CN 10 pairing confirmed; own words: +1 broken to all in area, damage only vs undead, ignores TB and AP; area |
| 61 | 247 | arcane | School of Dusk | 6 | Touch | 1 (max) | instant | - | dice | damage | y | Soul Draw | no | scan-verified: CN 6 pairing confirmed; own words: touch damage ignoring TB and AP, drains max Wounds, feeds channelling pool |
| 62 | 247 | arcane | School of Dusk | 2 | Touch | 1 | rounds | WPB | none | utility | y | Last Whisper | no | book CN 2 below band floor 3 |
| 63 | 247 | arcane | School of Dusk | 9 | You | You | rounds | WPB | none | buff | y | Dusk Shroud | no |  |
| 64 | 247 | arcane | School of Dusk | 8 | WP yd | 1 | instant | - | dice | damage | y | Vital Siphon | no | damage plus matching heal for caster: second effect needs hook or manual |
| 65 | 247 | arcane | School of Dusk | 2 | Touch | Special | instant | - | none | manual | y | Mercy Stroke | no | scan-verified; CHANGED from dice damage: finisher on a 0-Wound target, no dice, cannot be raised as undead; book CN 2 below band floor 3 |

## arcane / `School of Embers` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 66 | 248 | arcane | School of Embers | 5 | You | You | rounds | WPB | none | buff | y | Cinder Mantle | no |  |
| 67 | 248 | arcane | School of Embers | 2 | Touch | 1 | instant | - | none | heal | y | Sear Seal | no | book CN 2 below band floor 3 |
| 68 | 248 | arcane | School of Embers | 8 | You | You | rounds | WPB | none | buff | y | Brow Blaze | no |  |
| 69 | 248 | arcane | School of Embers | 6 | WP yd | AoE special | rounds | WPB | none | condition | y | Flame Curtain | no | CN line sits next to Brow Blaze; pairing inferred; condition ablaze |
| 70 | 248 | arcane | School of Embers | 5 | You | AoE FB yd | instant | - | none | buff | y | Rallying Embers | no |  |
| 71 | 248 | arcane | School of Embers | 8 | WP yd | 1 sword | rounds | WPB | none | buff | y | Blaze Brand | no |  |
| 72 | 248 | arcane | School of Embers | 12 | WP yd | 1 + AoE WPB yd | rounds | WPB | dice | damage | y | Furnace Burst | no | area damage |
| 73 | 249 | arcane | School of Embers | 10 | WP yd | AoE WPB yd | rounds | WPB | dice | damage | y | Cleansing Burn | no | area damage |

## arcane / `School of Firmament` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 74 | 249 | arcane | School of Firmament | 7 | You | You | rounds | WPB | none | buff | y | Static Cage | no |  |
| 75 | 249 | arcane | School of Firmament | 18 | IB yd | AoE 2xWPB yd | special | - | dice | damage | y | Falling Star | no | CN 18 exceeds arcane band? band is 3-14: needs band widening or CN cap; area damage; book CN 18 above band ceiling 14 |
| 76 | 249 | arcane | School of Firmament | 12 | WP yd | Special | instant | - | dice | damage | y | Forked Arc | no |  |
| 77 | 249 | arcane | School of Firmament | 6 | You | AoE IB yd | rounds | WPB | none | buff | y | Fickle Omen | no |  |
| 78 | 249 | arcane | School of Firmament | 7 | IB yd | 1 | rounds | IB | none | buff | y | Ill-Starred Mark | no |  |
| 79 | 249 | arcane | School of Firmament | 3 | You | You | rounds | IB | none | buff | y | Omen Glance | no |  |
| 80 | 250 | arcane | School of Firmament | 6 | You | You | rounds | IB | none | buff | y | Omen Reading | no |  |
| 81 | 250 | arcane | School of Firmament | 12 | You | You | rounds | IB | none | buff | y | Omen of Ruin | no | duration says Initiative rounds |

## arcane / `School of Verdance` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 82 | 250 | arcane | School of Verdance | 3 | Touch | 1 | rounds | WPB | none | buff | y | Bark Hide | no |  |
| 83 | 250 | arcane | School of Verdance | 6 | You | AoE WPB yd | rounds | WPB | none | heal | y | Soil Vigour | no |  |
| 84 | 250 | arcane | School of Verdance | 7 | WP yd | You | instant | - | none | utility | y | Burrow Pool | no |  |
| 85 | 250 | arcane | School of Verdance | 4 | Touch | 1 | days | WPB | none | utility | y | Loam Meal | no |  |
| 86 | 251 | arcane | School of Verdance | 6 | WP yd | AoE WPB yd | rounds | WPB | none | condition | y | Briar Thicket | no | condition entangled |
| 87 | 251 | arcane | School of Verdance | 5 | IB miles | You | special | - | none | utility | y | Root Survey | no |  |
| 88 | 251 | arcane | School of Verdance | 8 | WPB yd | Special | instant | - | none | utility | y | Wilt Mending | no |  |
| 89 | 251 | arcane | School of Verdance | 6 | Touch | 1 | rounds | WPB | none | heal | y | Mending Surge | no |  |

## arcane / `School of Radiance` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90 | 251 | arcane | School of Radiance | 12 | You | AoE WPB yd | instant | - | dice | damage | y | Purging Halo | no | CN line precedes Duration; ok; area damage |
| 91 | 251 | arcane | School of Radiance | 5 | You | You | instant | - | none | condition | y | Flare Flash | no | condition blinded |
| 92 | 251 | arcane | School of Radiance | 6 | Touch | 1 | minutes | Int | none | utility | y | Calm Mind | no |  |
| 93 | 252 | arcane | School of Radiance | 10 | WPB yd | 1 fiend | instant | - | none | manual | y | Fiend Sunder | no | scan-verified; CHANGED from dice damage: vs one fiend, halves max Wounds or banishes by Toughness vs Int, blinds onlookers; target is a fiend |
| 94 | 252 | arcane | School of Radiance | 8 | IntB yd | 1 | rounds | IntB | none | condition | y | Lattice Snare | no | scan-verified; condition stunned confirmed (also loses Move, recovery by Int test) |
| 95 | 252 | arcane | School of Radiance | 10 | You | AoE WPB yd | rounds | WPB | none | buff | y | Sanctum Glow | no | scan-verified: CN 10; own words: holy aura keeps fiends/undead/mutants out, blocks Corruption gain |
| 96 | 252 | arcane | School of Radiance | 8 | WPB yd | 1 | instant | - | none | heal | y | Mending Gleam | no | scan-verified; own words: heal IntB Wounds, cleanse poison; ingredient y |
| 97 | 252 | arcane | School of Radiance | 8 | You | You | rounds | WPB | none | buff | y | Quicksilver Mind | no | scan-verified; own words: +20 Int and Initiative |

## arcane / `School of Alloy` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 98 | 253 | arcane | School of Alloy | 7 | WPB yd | 1 object | instant | - | none | utility | y | Smelt Touch | no |  |
| 99 | 253 | arcane | School of Alloy | 6 | 1 yd | Special | rounds | WPB | none | buff | y | Temper Bands | no |  |
| 100 | 253 | arcane | School of Alloy | 9 | WPB yd | Special | minutes | WP | none | buff | y | Reforge Edge | no |  |
| 101 | 253 | arcane | School of Alloy | 6 | You | You | rounds | WPB | none | buff | y | Scale Mirage | no |  |
| 102 | 253 | arcane | School of Alloy | 5 | WP yd | AoE WPB yd | rounds | WPB | none | condition | y | Weight Shift | no | condition type not fixed by the book summary: pick on authoring |
| 103 | 253 | arcane | School of Alloy | 5 | Touch | 1 | rounds | WPB | none | utility | y | Soft Iron | no |  |
| 104 | 253 | arcane | School of Alloy | 4 | Touch | 1 | minutes | WP | none | utility | y | Gilt Illusion | no |  |
| 105 | 253 | arcane | School of Alloy | 12 | WP yd | AoE WPB yd | rounds | WPB | dice | damage | y | Ore Wrench | no | area damage |

## arcane / `School of Gloam` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 106 | 254 | arcane | School of Gloam | 8 | WP yd | AoE IntB yd | minutes | Int | none | utility | y | Web of Seeming | no | scan-verified: pairing confirmed; own words: illusory image over area, dispelled only by a seer-type ability test |
| 107 | 254 | arcane | School of Gloam | 6 | 1 yd | 1 | minutes | Int | none | utility | y | Thought Slip | no | scan-verified; own words: target forgets the caster, may become permanent |
| 108 | 254 | arcane | School of Gloam | 6 | WPB yd | 1 | rounds | WPB | none | condition | y | Throttling Dark | no | scan-verified; condition fatigued confirmed (plus mute and suffocation) |
| 109 | 254 | arcane | School of Gloam | 10 | You | You | minutes | IntB | none | utility | y | Borrowed Face | no | scan-verified; own words: caster takes the likeness of a known humanoid |
| 110 | 254 | arcane | School of Gloam | 6 | WP yd | AoE WPB yd | rounds | WPB | none | condition | y | Murk Bank | no | scan-verified; condition set blinded + deafened + fatigued (+ Prone risk on Move) for all in area |
| 111 | 255 | arcane | School of Gloam | 6 | WPB yd | 1 | special | Until dawn | none | manual | y | Night Mount | no | summon: manual only |
| 112 | 255 | arcane | School of Gloam | 8 | WP yd | You | instant | - | none | utility | y | Dark Door | no |  |
| 113 | 255 | arcane | School of Gloam | 8 | Touch | 1 | rounds | WPB | none | buff | y | Cloak of Nothing | no |  |

## hedge / `Fenlore` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 114 | 255 | hedge | Fenlore | 0 | You | AoE FB yd | minutes | WPB | none | buff | y | Hearth Cheer | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 115 | 255 | hedge | Fenlore | 0 | Touch | 1 | hours | FB | none | utility | y | Fruitful Plea | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 116 | 256 | hedge | Fenlore | 0 | You | You | minutes | WPB | none | utility | y | Mire Stride | no | scan-verified: CN 0 confirmed; target You; hedge band floor is 3; book CN 0 below band floor 3 |
| 117 | 256 | hedge | Fenlore | 0 | Touch | Special | hours | WPB | none | utility | y | Dreamless Cup | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 118 | 256 | hedge | Fenlore | 0 | Touch | Special | hours | DexB | none | buff | y | Charged Draught | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 119 | 256 | hedge | Fenlore | 0 | You | You | minutes | Initiative | none | buff | y | Owl Eyes | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 120 | 256 | hedge | Fenlore | 0 | Touch | Special | days | WPB | none | buff | y | Warding Knot | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 121 | 256 | hedge | Fenlore | 0 | Special | Special | instant | - | none | utility | y | Lost Flock Sight | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |

## witchcraft / `Thornwitchery` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 122 | 256 | witchcraft | Thornwitchery | 14 | WPB yd | Special | instant | - | none | utility | y | Barren Touch | no |  |
| 123 | 257 | witchcraft | Thornwitchery | 6 | WP yd | 1 | rounds | WPB | dice | damage | y | Crawling Plague | no |  |
| 124 | 257 | witchcraft | Thornwitchery | 10 | WP yd | 1 | rounds | WPB | none | condition | y | Pinprick Doll | no | condition type not fixed by the book summary: pick on authoring |
| 125 | 257 | witchcraft | Thornwitchery | 4 | Touch | 1 adult | hours | WPB | none | utility | y | Age Mask | no |  |
| 126 | 257 | witchcraft | Thornwitchery | 8 | Touch | Special | days | WP | none | utility | y | Haunted Hearth | no |  |
| 127 | 257 | witchcraft | Thornwitchery | 4 | Touch | 1 | instant | - | none | heal | y | Pale Mending | no |  |
| 128 | 257 | witchcraft | Thornwitchery | 6 | 10 yd (max) | 1 (max) | instant | - | dice | damage | y | Ill Gaze | no |  |
| 129 | 257 | witchcraft | Thornwitchery | 8 | WP yd or WPB miles (ingredient) | 1 | unknown | WPB (unit lost in extract) | none | condition | y | Snapped Laces Hex | no | existing crow-knot-curse is similar, not equal; condition type not fixed by the book summary: pick on authoring |

## dark / `Pact Rites` (13) (first 4 rows book fiend-binding lore, last 9 the optional dark-power set)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 130 | 258 | dark | Pact Rites | 6 | WPB yd | 1 Average-or-smaller fiend | rounds | WPB | dice | damage | y | Unmake Minor Fiend | no |  |
| 131 | 258 | dark | Pact Rites | 10 | Touch | AoE IntB yd across (max) | unknown | WPB (unit lost in extract) | none | utility | y | Eightfold Seal | no | duration line cut |
| 132 | 258 | dark | Pact Rites | 4 | WP yd | Special | instant | - | none | utility | y | Fiend Scent | no |  |
| 133 | 258 | dark | Pact Rites | 8 | WPB yd | Special | rounds | WPB | none | manual | y | Rend the Veil | no | summon: manual only |
| 138 | 259 | dark | Pact Rites | 5 | WPB yd | 1 | instant | - | dice | damage | y | Septic Bloom | no | dark-power lore, folded under Pact Rites (owner may add own lists) |
| 139 | 259 | dark | Pact Rites | 6 | You | AoE WPB yd | rounds | WPB | none | condition | y | Plague Mist | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 140 | 259 | dark | Pact Rites | 9 | Special | Special | instant | - | dice | damage | y | Rotten Stream | no | dark-power lore, folded under Pact Rites (owner may add own lists); area damage |
| 141 | 260 | dark | Pact Rites | 5 | Touch | 1 | rounds | WPB | none | condition | y | Honeyed Surrender | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 142 | 260 | dark | Pact Rites | 6 | Touch | 1 | rounds | WPB | none | utility | y | Pain Turned Sweet | no | dark-power lore, folded under Pact Rites (owner may add own lists) |
| 143 | 260 | dark | Pact Rites | 9 | You | You | days | IntB | none | buff | y | Fickle Gift | no | pairing inferred from heading order; dark-power lore, folded under Pact Rites (owner may add own lists) |
| 144 | 260 | dark | Pact Rites | 12 | WPB yd | 1 | rounds | WPB | none | condition | y | Warping Coil | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 145 | 260 | dark | Pact Rites | 8 | You | AoE WPB yd | rounds | WPB | none | condition | y | Mirage Swirl | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 146 | 260 | dark | Pact Rites | 6 | WP yd | AoE IB yd | rounds | IntB | none | condition | y | Betrayal Whisper | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |

## dark / `Grave Rites` (4)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 134 | 258 | dark | Grave Rites | 7 | WP yd | AoE WPB yd | special | until sunrise | none | manual | y | Grave Rising | no | summon: manual only |
| 135 | 258 | dark | Grave Rites | 8 | WP yd | AoE WPB yd | special | until sunrise | none | manual | y | Bone Binding | no | summon: manual only |
| 136 | 259 | dark | Grave Rites | 8 | WP yd | Special | instant | - | dice | damage | y | Howling Skull | no |  |
| 137 | 259 | dark | Grave Rites | 6 | WP yd | Special | instant | - | none | buff | y | Vigour of the Dead | no |  |

## Blessings, kind `blessing` (19)

One row per blessing; range 6 yd (touch for the heal and disease-ease pair), target 1, duration 6 rounds unless instant. `list(s)` come from the Blessings-by-Cult table (p220): each cult grants 6. Which cults grant a blessing was read from tables.json p220 and cross-checked against the p220 text.

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 147 | 221 | blessing | Rites of the Tide; Rites of the Banner; Rites of the Forged Crown; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Keen Hand Boon | no | effect: +10 WS; stat/reroll buff: manual or modifyStat hook |
| 148 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of the Green Cradle; Rites of Mercy; Rites of the Deep Wood | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Held Breath Boon | no | effect: no breathing needed, ignore suffocation; stat/reroll buff: manual or modifyStat hook |
| 149 | 221 | blessing | Rites of the Gambler | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Silver Tongue Boon | no | effect: +10 Fel; stat/reroll buff: manual or modifyStat hook |
| 150 | 221 | blessing | Rites of the Banner; Rites of the Gambler; Rites of the Green Cradle; Rites of Mercy; Rites of the Deep Wood; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Honest Heart Boon | no | effect: target must pass Cool to break strictures; stat/reroll buff: manual or modifyStat hook |
| 151 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of the Banner; Rites of the Forged Crown; Rites of the Winter Wolf; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Stout Heart Boon | no | effect: +10 WP; stat/reroll buff: manual or modifyStat hook |
| 152 | 221 | blessing | Rites of the Gambler | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Deft Fingers Boon | no | effect: +10 Dex; stat/reroll buff: manual or modifyStat hook |
| 153 | 221 | blessing | Rites of the Still Hour; Rites of the Banner; Rites of the Gambler; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Second Chance Boon | no | effect: reroll next failed test; stat/reroll buff: manual or modifyStat hook |
| 154 | 221 | blessing | Rites of the Green Cradle | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Light Foot Boon | no | effect: +10 Ag; stat/reroll buff: manual or modifyStat hook |
| 155 | 221 | blessing | Rites of the Tide; Rites of the Forged Crown; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Iron Hide Boon | no | effect: +10 T; stat/reroll buff: manual or modifyStat hook |
| 156 | 221 | blessing | Rites of the Green Cradle; Rites of Mercy | 0 | Touch | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | heal | n | Hearth Mending | yes:hearth-mending | effect: heal 1 Wound |
| 157 | 221 | blessing | Rites of the Deep Wood | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Sure Aim Boon | no | effect: +10 BS; stat/reroll buff: manual or modifyStat hook |
| 158 | 221 | blessing | Rites of the Forged Crown; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Strong Arm Boon | no | effect: +10 S; stat/reroll buff: manual or modifyStat hook |
| 159 | 221 | blessing | Rites of the Banner; Rites of the Gambler; Rites of the Green Cradle; Rites of Mercy; Rites of the Forged Crown | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Shame Ward Boon | no | effect: attackers must pass Cool to target the ward; stat/reroll buff: manual or modifyStat hook |
| 160 | 221 | blessing | Rites of the Green Cradle; Rites of Mercy | 0 | Touch | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | utility | n | Fever Ease Boon | no | effect: shorten one disease by 1 day; condition-removal/disease: manual |
| 161 | 221 | blessing | Rites of the Still Hour; Rites of the Banner; Rites of the Forged Crown; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Hallowed Edge Boon | no | effect: weapon counts as Magical; stat/reroll buff: manual or modifyStat hook |
| 162 | 221 | blessing | Rites of the Tide; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Cruel Cut Boon | no | effect: roll twice on next Critical, take best; stat/reroll buff: manual or modifyStat hook |
| 163 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of Mercy; Rites of the Winter Wolf | 0 | 6 yd | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | utility | n | Shrug It Off Boon | no | effect: remove 1 condition (not the social-stigma condition); condition-removal/disease: manual |
| 164 | 221 | blessing | Rites of the Still Hour; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Clear Head Boon | no | effect: +10 Int; stat/reroll buff: manual or modifyStat hook |
| 165 | 221 | blessing | Rites of the Gambler; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Quick Wits Boon | no | effect: +10 I; stat/reroll buff: manual or modifyStat hook |

## Miracles / `Rites of the Tide` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 166 | 222 | miracle | Rites of the Tide | 0 | FB miles | 1 vessel | hours | 1 | none (n/a) | utility | n | Stilled Sails | no | scan-verified p222; own words: calms wind and sea around a ship, area Fel yd |
| 167 | 222 | miracle | Rites of the Tide | 0 | Fel yd | 1 | rounds | FB | none (n/a) | condition | n | Brine Lungs | no | scan-verified p222; own words: target drowns, fatigued, stunned at end; works on fiends and undead; condition fatigued |
| 168 | 222 | miracle | Rites of the Tide | 0 | IB miles | 1 vessel | hours | 1 | none (n/a) | buff | n | Favouring Gale | no | scan-verified p222; own words: favourable wind, top speed, +1 SL to Sail tests |
| 169 | 222 | miracle | Rites of the Tide | 0 | Special | Special | instant | - | none (n/a) | utility | n | Tide Larder | no | scan-verified p222; own words: catch fish for 1 person (2 at sea), +1 person per 2 SL |
| 170 | 223 | miracle | Rites of the Tide | 0 | Fel yd | 1 | rounds | FB | none (n/a) | condition | n | Deck Heave | no | scan-verified p223; own words: target reels as on a storm deck: blinded, deafened, fatigued, may fall prone; condition set |
| 171 | 223 | miracle | Rites of the Tide | 0 | You | You | minutes | FB | none (n/a) | utility | n | Surface Stride | no | scan-verified p223; own words: walk on open water at least 10 yd wide |

## Miracles / `Rites of the Still Hour` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 172 | 223 | miracle | Rites of the Still Hour | 0 | Touch | 1 | instant | - | none (n/a) | utility | n | Death Knell | no | scan-verified p223; own words: vision of target doom; once per character; unlocks a talent purchase; manual |
| 173 | 223 | miracle | Rites of the Still Hour | 0 | 1 yd | 1 | instant | - | none (n/a) | utility | n | Parting Rite | no | scan-verified p223; own words: ensures soul passes on, bars necromancy on the corpse, destroys an undead construct |
| 174 | 223 | miracle | Rites of the Still Hour | 0 | Touch | Special | special | until sunrise | none (n/a) | utility | n | Threshold Line | no | scan-verified p223; own words: ground line up to 8 yd that undead must pass Cool to cross |
| 175 | 223 | miracle | Rites of the Still Hour | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Reprieve | no | scan-verified p223; own words: holds a 0-Wound willing target unconscious and stable; manual |
| 176 | 223 | miracle | Rites of the Still Hour | 0 | You | AoE FB yd | instant | - | none (n/a) | damage | n | Smiting Ash | no | scan-verified p223; own words: area burst, 1d10 Wounds only to undead ignoring TB and AP, +1 per SL; area damage |
| 177 | 223 | miracle | Rites of the Still Hour | 0 | You | You | rounds | FB | none (n/a) | buff | n | Reaper Mien | no | scan-verified p223; own words: cadaverous face, gain Fear that undead are not immune to |

## Miracles / `Rites of the Banner` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 178 | 224 | miracle | Rites of the Banner | 0 | Special | Special | instant | - | none (n/a) | condition | n | Blinding Standard | no | scan-verified p224; own words: flash blinds all non-cult who look your way, +1 per 2 SL; condition blinded |
| 179 | 224 | miracle | Rites of the Banner | 0 | Fel yd | You | rounds | FB | none (n/a) | utility | n | Scout Sight | no | scan-verified p224; own words: see through a spectral eagle you steer; you are blind meanwhile |
| 180 | 224 | miracle | Rites of the Banner | 0 | Fel yd | FB targets | rounds | FB | none (n/a) | buff | n | Shield Wall Glow | no | scan-verified p224; own words: +1 AP on all locations for allies |
| 181 | 224 | miracle | Rites of the Banner | 0 | You | You | rounds | FB | none (n/a) | buff | n | Blessed Spear | no | scan-verified p224; own words: your spear gains Damaging and counts as magical |
| 182 | 224 | miracle | Rites of the Banner | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Battle Fury | no | scan-verified p224; own words: allies gain Frenzy |
| 183 | 224 | miracle | Rites of the Banner | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Steadfast Ranks | no | scan-verified p224; own words: allies gain a drill talent |

## Miracles / `Rites of the Gambler` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 184 | 224 | miracle | Rites of the Gambler | 0 | 1 yd | 1 | instant | - | none (n/a) | utility | n | Open Door Riddle | no | scan-verified p224; own words: undo one lock/latch/knot on a door, window or hatch, +1 method per 2 SL |
| 185 | 224 | miracle | Rites of the Gambler | 0 | Fel yd | You | rounds | FB | none (n/a) | utility | n | Prowler Sight | no | scan-verified p224; own words: see through a spectral cat you steer; you are blind meanwhile |
| 186 | 224 | miracle | Rites of the Gambler | 0 | You | You | special | until session end | none (n/a) | buff | n | Loaded Fate | no | scan-verified p224; own words: +1 Fortune point, +1 per 2 SL; not again until 0 Fortune |
| 187 | 225 | miracle | Rites of the Gambler | 0 | Touch | 1 | rounds | FB | none (n/a) | buff | n | Light Fingers Boon | no | scan-verified p225; own words: +10 Agility, +10 Stealth, +1 fall-damage reduction |
| 188 | 225 | miracle | Rites of the Gambler | 0 | 1 yd | 1 | minutes | FB | none (n/a) | utility | n | Borrowed Mask | no | scan-verified p225; own words: illusions of purse and attire, an item hidden; +1 effect per 2 SL |
| 189 | 225 | miracle | Rites of the Gambler | 0 | Fel yd | 1 | rounds | FB | none (n/a) | utility | n | Fading Memory | no | scan-verified p225; own words: target passes unnoticed while acting quietly; not a condition |

## Miracles / `Rites of the Green Cradle` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 190 | 225 | miracle | Rites of the Green Cradle | 0 | Touch | Special | rounds | 1 | none (n/a) | utility | n | Sudden Orchard | no | scan-verified p225; own words: edible plants grow, food for 1 person per round |
| 191 | 225 | miracle | Rites of the Green Cradle | 0 | You | You | special | while camped | none (n/a) | utility | n | Green Canopy | no | scan-verified p225; own words: finds a natural shelter for 1 person, +1 per 2 SL; outdoors only |
| 192 | 225 | miracle | Rites of the Green Cradle | 0 | You | AoE Fel yd | rounds | FB | none (n/a) | utility | n | Cradle Kin | no | scan-verified p225; own words: sense all living creatures in area; outdoors only |
| 193 | 225 | miracle | Rites of the Green Cradle | 0 | Fel yd | FB targets | instant | - | none (n/a) | utility | n | Cradle Relief | no | scan-verified p225; own words: each target removes 1 condition; fully clean gives +1 SL next turn; CHANGED from heal; manual |
| 194 | 225 | miracle | Rites of the Green Cradle | 0 | Touch | 1 | special | 10 min cast | none (n/a) | heal | n | Gentle Hands | no | scan-verified p225; own words: heal FB Wounds or cure a disease, repeat per 2 SL |
| 195 | 226 | miracle | Rites of the Green Cradle | 0 | Touch | Special | hours | FB | none (n/a) | utility | n | Bond Blessing | no | scan-verified p226; own words: blessed union, conception if possible; narrative |

## Miracles / `Rites of Mercy` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 196 | 226 | miracle | Rites of Mercy | 0 | Fel yd | 1 | rounds | FB | none (n/a) | buff | n | Monk Fortitude | no | scan-verified p226; own words: no pain, no condition penalties |
| 197 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | minutes | FB | none (n/a) | utility | n | Soothing Hush | no | scan-verified p226; own words: removes psychology traits, then deep sleep; CHANGED from special/heal |
| 198 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | special | 10 minus FB rounds | none (n/a) | manual | n | Merciful Tears | no | scan-verified p226; own words: heal one critical wound after a prayer; cannot regrow limbs; manual |
| 199 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | instant | - | none (n/a) | utility | n | Cleansed Slate | no | scan-verified p226; own words: remove 1 recently gained Corruption point, +1 per 2 SL; fumble backfires; manual |
| 200 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | instant | - | none (n/a) | utility | n | Draw the Poison | no | scan-verified p226; own words: purge a poison or disease, caster takes 1d10 minus FB Wounds per item; manual |
| 201 | 226 | miracle | Rites of Mercy | 0 | Fel yd | 1 | rounds | FB | none (n/a) | buff | n | Shouldered Pain | no | scan-verified p226; own words: caster takes the target damage, adding FB to TB |

## Miracles / `Rites of the Forged Crown` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 202 | 226 | miracle | Rites of the Forged Crown | 0 | You | You | rounds | FB | none (n/a) | buff | n | Radiant Zeal | no | scan-verified p226; own words: allies who see you lose Broken, gain fearless; foes of one kind fear you |
| 203 | 226 | miracle | Rites of the Forged Crown | 0 | You | You + AoE FB yd | rounds | FB | none (n/a) | buff | n | Spellward Shout | no | scan-verified p226; own words: spells aimed into the area take -2 SL |
| 204 | 227 | miracle | Rites of the Forged Crown | 0 | You | You | rounds | FB | none (n/a) | buff | n | Hallowed Hammer | no | scan-verified p227; own words: your war hammer is magical, +FB damage, sets target ablaze |
| 205 | 227 | miracle | Rites of the Forged Crown | 0 | You | AoE FB yd | instant | - | none (n/a) | damage | n | Spirit Pyre | no | scan-verified p227; own words: 1d10 Wounds ignoring TB and AP to all in area, extra vs fiends and undead; area damage |
| 206 | 227 | miracle | Rites of the Forged Crown | 0 | Fel yd | AoE FB yd (max) | instant | - | none (n/a) | damage | n | Twin Star Fall | no | scan-verified p227; own words: comet strike, 1d10 + SL Wounds ignoring TB and AP, ablaze; outdoors only; area damage |
| 207 | 227 | miracle | Rites of the Forged Crown | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Hate the Wicked | no | scan-verified p227; own words: allies gain hatred towards listed enemy groups, +2 SL after a kill |

## Miracles / `Rites of the Deep Wood` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 208 | 227 | miracle | Rites of the Deep Wood | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Beastsense | no | scan-verified p227; own words: +1 heightened sense, wake when threat approaches |
| 209 | 227 | miracle | Rites of the Deep Wood | 0 | Fel yd | 1 | minutes | FB | none (n/a) | manual | n | Wild Ally | no | scan-verified p227; own words: a local wild animal obeys you; summon: manual only |
| 210 | 227 | miracle | Rites of the Deep Wood | 0 | You | You | rounds | FB | none (n/a) | buff | n | Stag Leap | no | scan-verified p227; own words: +1 Movement, +1 leap talent, auto-pass leaps; CHANGED from utility |
| 211 | 227 | miracle | Rites of the Deep Wood | 0 | You | You | hours | FB | none (n/a) | buff | n | Huntmaster Trail | no | scan-verified p227; own words: cannot lose a chosen quarry trail, +1 SL vs it |
| 212 | 228 | miracle | Rites of the Deep Wood | 0 | Fel yd | AoE FB yd | instant | - | none (n/a) | condition | n | Snare Roots | no | scan-verified p228; own words: all in area gain an entangled condition, strength = Fellowship; condition entangled |
| 213 | 228 | miracle | Rites of the Deep Wood | 0 | You | You | rounds | FB | none (n/a) | buff | n | Fang Gift | no | scan-verified p228; own words: gain Bite and Weapon traits, magical |

## Miracles / `Rites of the Winter Wolf` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 214 | 228 | miracle | Rites of the Winter Wolf | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Frost Pelt | no | scan-verified p228; own words: cold gives no mechanical penalty |
| 215 | 228 | miracle | Rites of the Winter Wolf | 0 | Fel yd | 1 | instant | - | none (n/a) | damage | n | Cold Verdict | no | scan-verified p228; own words: 1d10 Wounds ignoring TB and AP, +1 per SL; backfires on a target that is not weak or cowardly |
| 216 | 228 | miracle | Rites of the Winter Wolf | 0 | You | AoE Fel yd | rounds | FB | none (n/a) | buff | n | Winter Glare | no | scan-verified p228; own words: you cause Fear, all others in area lose Advantage each round; aura (target is Fellowship yards, not bonus) |
| 217 | 228 | miracle | Rites of the Winter Wolf | 0 | Fel yd | 1 | rounds | FB | none (n/a) | buff | n | Pack Frenzy | no | scan-verified p228; own words: ally gets a free frenzy test, +1d10 damage on first melee hit, exploding |
| 218 | 228 | miracle | Rites of the Winter Wolf | 0 | You | You | rounds | FB | none (n/a) | buff | n | Frostbite Bolt | no | scan-verified p228; own words: your axe is magical, +SL damage, fatigues the target, stops bleeding; CHANGED from damage with lost params; name suggests a bolt, effect is a weapon enchant: owner may rename |
| 219 | 228 | miracle | Rites of the Winter Wolf | 0 | Fel yd | Special | rounds | FB | none (n/a) | manual | n | Pack Howl | no | scan-verified p228; own words: a white beast fights for you; summon: manual only |

## Miracles / `Rites of the Scales` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 220 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Even-Handed Blade | no | scan-verified p229; own words: your sword ignores AP and is magical, criminals risk unconsciousness |
| 221 | 229 | miracle | Rites of the Scales | 0 | FB yd | 1 | instant | - | none (n/a) | utility | n | Honest Tongue | no | scan-verified p229; own words: ask one question, answered truthfully unless target wins a Cool test (this row is the interrogation spell) |
| 222 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Unswayed Judge | no | scan-verified p229; own words: Perception test to see through illusions, Intuition to detect lies |
| 223 | 229 | miracle | Rites of the Scales | 0 | FB yd | 1 | rounds | FB | none (n/a) | condition | n | Truth Bind | no | scan-verified p229; own words: a lying suspect becomes entangled for the duration; condition entangled; wrong accusation costs the caster |
| 224 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Owl Counsel | no | scan-verified p229; own words: +20 Intelligence, gain talents (sight, menacing, night vision) |
| 225 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Witness Aura | no | scan-verified p229; own words: listeners believe your true words |

## Icon palette families per list

Existing palettes in `scripts/assets/icon-subjects/grim-spells.json`: `neutral gold`, `fire`, `necrotic`, `nature`, `radiant`. Proposal (one palette per list, subject stays one line per spell); new families marked (new).

| list | palette family |
|---|---|
| Cantrips | neutral gold |
| Common Arcana | neutral gold (arcane violet accent, optional new `arcane`) |
| School of Embers | fire |
| School of Gloam | necrotic (shadow, desaturated) |
| School of Dusk | necrotic (bone-white and violet variant) |
| School of Radiance | radiant |
| School of Alloy | steel (new: grey-bronze) |
| School of Verdance | nature |
| School of Firmament | sky (new: deep blue and silver) |
| School of Wilds | amber (new: ochre and brown) |
| Fenlore | nature (marsh variant) |
| Thornwitchery | nature (thorn, dark green and bruise purple) |
| Pact Rites | infernal (new: crimson and black) |
| Grave Rites | necrotic |
| Hearth Rites (blessings) | radiant |
| Rites of the Tide | tide (new: teal) |
| Rites of the Still Hour | necrotic (pale, silver) |
| Rites of the Banner | steel / gold |
| Rites of the Gambler | neutral gold (coin) |
| Rites of the Green Cradle | nature |
| Rites of Mercy | radiant (soft white) |
| Rites of the Forged Crown | radiant (gold and ember) |
| Rites of the Deep Wood | nature (forest) |
| Rites of the Winter Wolf | frost (new: ice blue) |
| Rites of the Scales | neutral gold (balance) |

New families to add: steel, sky, amber, infernal, tide, frost (6). Blessings carry several cult lists: icon palette follows the first list or a neutral `radiant`.

## Appendix: template spells with no book counterpart (keep, template-only)

Cantrips: soothing-touch, chill-breath, muffle, tripwire-hex. School of Embers: ember-dart, searing-brand, smoke-veil, cinder-cloud, pyre-lance. School of Gloam: shade-bolt, grasping-shadows, gloam-daze, pall-of-dread, hollow-scream. Fenlore: mending-moss, fen-fog, bramble-snare. Thornwitchery: sour-blood, withering-glance, crow-knot-curse. Hearth Rites blessings: hearth-spark, hearthward-rebuke, hush-of-the-hearth. Hearth Rites miracles: mercy-of-the-hearth, hearthfire-smite, stilling-word, last-light. Existing rows with cn above 0 in petty/miracle (and the blessing band) need cn 0 per the decision (not touched here). Closest book analogues (mechanical reference only): ember-dart ~ Lance Bolt, cinder-cloud ~ Burst Orb, crow-knot-curse ~ Snapped Laces Hex, withering-glance ~ Ill Gaze, mercy-of-the-hearth ~ Cradle Relief.

