# Spells manifest (C4): petty, arcane, hedge, witchcraft, dark (kind chaos), blessings, miracles

Source: extract `09-magic.md` (p230-260; spell blocks p240-260) and `08-religion-and-belief.md` (blessings p220-221, miracles p222-229); `tables.json` p220 (Blessings by Cult). Only structure and numbers are recorded; effects are paraphrased in a few words in `notes`. Every `original name` is `proposed` and was checked against `scripts/templates/grim-d100/forbidden-terms.ts` (word match, no hits; all 225 names unique). Book names are not stored; use `page` to look up.

## Decisions applied (from `2026-11-20-wfrp5-generation-unblock-options.md`, option 1A)

- Dark lists (`Pact Rites`, `Grave Rites`) = kind `chaos` (core `SPELL_MAGIC_KINDS` already has it; `GRIM_SPELL_KINDS` does not yet, and its CN band is not defined: proposal 3-18 like witchcraft). The word "chaos" appears only in the kind key, never in a name.
- A blessing is one row with several cult lists (`list(s)` joined by `;`), per the Blessings-by-Cult table; 19 blessings x 60 cult slots. Miracles are one row per cult.
- CN 0 for petty, blessings and miracles (the book gives miracles no CN; they use a Pray test). Arcane/hedge/witchcraft/chaos keep the book CN; notes flag values outside the working-tree bands (arcane 3-14, hedge 3-12, witchcraft 3-18).
- Narrative rows are allowed as `executionMode: manual`; durations are text in the description (class and value below are for the generator, not a schema field).

## Legend

- `list(s)`: exact names from `GRIM_ARCANE_LISTS`, `GRIM_DARK_LISTS`, `GRIM_CULT_LISTS` plus `Cantrips`, `Fenlore`, `Thornwitchery`. Book wind/cult to list mapping: fire = School of Embers, shadows = School of Gloam, light = School of Radiance, metal = School of Alloy, life = School of Verdance, heavens = School of Firmament, death = School of Dusk, beasts = School of Wilds, general arcane = Common Arcana, fiend-binding lore = Pact Rites, grave lore = Grave Rites; cults: sea = Tide, death god = Still Hour, strategy = Banner, trickery = Gambler, fertility = Green Cradle, mercy = Mercy, empire patron = Forged Crown, wild = Deep Wood, wolves = Winter Wolf, justice = Scales. `Rites of the Forge-Fathers` and `Hearth Rites` have no book miracles/blessings of their own (template-only).
- `range` / `target`: book formulas. WP = Willpower, WPB = Willpower Bonus, IB = Initiative Bonus, IntB = Intelligence Bonus, FB = Fellowship Bonus, TB = Toughness Bonus, DexB = Dexterity Bonus, yd = yards, AoE = area. Template feet is a code decision (proposal: 1 yd = 5 ft, WP yd = 60 ft, WPB yd = 30 ft, petty 30 ft).
- `duration class`: instant | rounds | minutes | hours | days | special | unknown (line lost in extract). `duration value`: the book formula (`WPB`, `FB`, `6`, ...); `-` for instant/special.
- `overcast`: `dice` = damage dice grow with SL (arcane/hedge/witchcraft/chaos damage spells); `none` = the book lets extra SL buy range/area/duration/targets but the validator only supports `dice` (`targets` is rejected), so such rows get `null`; `none (n/a)` = petty and miracles cannot be overcast. Blessings: +6 yd range, +1 target, +6 rds duration per +2 SL (not expressible; narrative).
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
| spells | chaos | Pact Rites | 9 |
| spells | chaos | Grave Rites | 4 |
| blessings | blessing | 12 cult lists (10 with book rows) | 19 rows, 60 cult slots |
| miracles | miracle | 10 cult lists x 6 | 60 |

Spells 142 (petty 25, arcane 88, hedge 8, witchcraft 8, chaos 17 of which 9 are the optional dark-power set); blessings 19; miracles 60; all rows 225. Template holds 30 spells: 3 map by equivalence (Spark Flick, Dazzle, Hearth Mending); the other 27 are listed in the appendix.

## Cross-cutting issues

1. Bands vs book CN: 8 hedge spells have book CN 0 (band 3-12); 7 arcane spells have CN 1-2 (floor 3); one arcane spell is CN 18 (ceiling 14); chaos has no band yet. Notes flag each row; owner decides to widen bands or clamp.
2. Roughly 50 of the 146 spells fit the current validator (damage/heal/condition); the rest are buff/utility/summon and need `manual` rows (decision above) or engine hooks. Blessings: only the heal one fits; miracles: about a third fit.
3. A sleep-type spell would need the forbidden condition `unconscious`; `overcast: targets` is unsupported.
4. Not expressible by the schema: spell damage "SL bonus" scaling, WP/bonus-scaled range and duration (only fixed numbers or description text), ingredient effects, blessing SL options, miracle side-effects (holy water vs fiends etc.).
5. Extract quality: the two-column layout swaps headings, descriptions and CN lines. Rows with a verify note: Spanning Light/Elemental Exhale (CN 4 vs 6), Distant Ear/Carried Whisper (merged line), Spirit Whirl/Soul Draw, the Radiance trio around the mending spell, the web-of-seeming spell, and all miracle cult filing. The owner should scan pages 241, 243, 247, 252, 254 and 222-229. Miracle rows with `?` parameters lost their params entirely. Counting check: extract has 145 `Range:` lines in 09-magic against 146 spell rows (one heading's params merged/lost) and 81 in 08 against 79 prayer rows (two non-prayer lines); no row was invented.
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
| 8 | 241 | petty | Cantrips | 0 | WP yd (merged line) | 1 | minutes | WPB | none (n/a) | utility | n | Distant Ear | no | this row and the next share one merged CN line in the extract; range and duration of each need a page scan |
| 9 | 241 | petty | Cantrips | 0 | Initiative yd (merged line) | 1 | minutes | WPB | none (n/a) | utility | n | Carried Whisper | no | see Distant Ear note |
| 10 | 241 | petty | Cantrips | 0 | WP yd | Special | instant | - | none (n/a) | utility | n | Candle Gust | no |  |
| 11 | 241 | petty | Cantrips | 0 | You | You | minutes | WP | none (n/a) | utility | n | Lantern Glow | no |  |
| 12 | 241 | petty | Cantrips | 0 | Touch | 1 | instant | - | none (n/a) | utility | n | Tumbler Ease | no |  |
| 13 | 241 | petty | Cantrips | 0 | Touch | Special | instant | - | none (n/a) | manual | n | Hat Critter | no | summon: manual only |
| 14 | 241 | petty | Cantrips | 0 | You | You | rounds | WPB | none (n/a) | utility | n | Palm Flame | no | book effect text not verified; may carry minor damage |
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
| 29 | 243 | arcane | Common Arcana | 4 | WP yd | Special | rounds | WPB | none | utility | y | Spanning Light | no | CN 4 vs 6 uncertain: two CN lines sit next to this row and Elemental Exhale; description text interleaved |
| 30 | 243 | arcane | Common Arcana | 4 | WP yd | AoE WPB yd | instant | - | dice | damage | y | Burst Orb | no | area damage |
| 31 | 243 | arcane | Common Arcana | 4 | WP yd | 1 | instant | - | dice | damage | y | Lance Bolt | no |  |
| 32 | 243 | arcane | Common Arcana | 6 | Special | Special | instant | - | dice | damage | y | Elemental Exhale | no | CN 6 vs 4 uncertain, see Spanning Light; effect text partly lost; area damage |
| 33 | 243 | arcane | Common Arcana | 6 | WP yd | Special | instant | - | dice | damage | y | Arcing Strike | no |  |
| 34 | 243 | arcane | Common Arcana | 2 | You | You | rounds | TB or hours | none | buff | y | Acid Veins | no | book CN 2 below band floor 3 |
| 35 | 243 | arcane | Common Arcana | 1 | You | You | rounds | IB | none | buff | y | Gloom Sight | no | book CN 1 below band floor 3 |
| 36 | 244 | arcane | Common Arcana | 4 | You | You | rounds | WPB | none | buff | y | Flicker Wreath | no |  |
| 37 | 244 | arcane | Common Arcana | 7 | You | AoE WPB yd | rounds | WPB | none | buff | y | Overhead Bastion | no |  |
| 38 | 244 | arcane | Common Arcana | 1 | WP yd | 1 | instant | - | none | utility | y | Slip Grip | no | book CN 1 below band floor 3 |
| 39 | 244 | arcane | Common Arcana | 8 | You | You | rounds | WPB | none | utility | y | Sky Lift | no |  |
| 40 | 244 | arcane | Common Arcana | 4 | You | You | rounds | WPB | none | buff | y | Ribbon Guard | no |  |
| 41 | 244 | arcane | Common Arcana | 4 | WP yd | 1 | rounds | 1 | none | utility | y | Unseen Hand | no |  |
| 42 | 244 | arcane | Common Arcana | 4 | You | You | minutes | WP | none | utility | y | Plain Veil | no | CN 4 / WP min assigned from the line before Fearsome; verify |
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
| 60 | 247 | arcane | School of Dusk | 10 | WP yd | AoE WPB yd | instant | - | dice | damage | y | Spirit Whirl | no | name/CN pairing with Dusk Shroud uncertain; area damage |
| 61 | 247 | arcane | School of Dusk | 6 | Touch | 1 (max) | instant | - | dice | damage | y | Soul Draw | no | CN line sits under the neighbouring heading, pairing inferred |
| 62 | 247 | arcane | School of Dusk | 2 | Touch | 1 | rounds | WPB | none | utility | y | Last Whisper | no | book CN 2 below band floor 3 |
| 63 | 247 | arcane | School of Dusk | 9 | You | You | rounds | WPB | none | buff | y | Dusk Shroud | no |  |
| 64 | 247 | arcane | School of Dusk | 8 | WP yd | 1 | instant | - | dice | damage | y | Vital Siphon | no | damage plus matching heal for caster: second effect needs hook or manual |
| 65 | 247 | arcane | School of Dusk | 2 | Touch | Special | instant | - | dice | damage | y | Mercy Stroke | no | book CN 2 below band floor 3 |

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
| 93 | 252 | arcane | School of Radiance | 10 | WPB yd | 1 fiend | instant | - | dice | damage | y | Fiend Sunder | no |  |
| 94 | 252 | arcane | School of Radiance | 8 | IntB yd | 1 | rounds | IntB | none | condition | y | Lattice Snare | no | condition stunned(uncertain) |
| 95 | 252 | arcane | School of Radiance | 10 | You | AoE WPB yd | rounds | WPB | none | buff | y | Sanctum Glow | no | one heading covers three CN lines in the extract; split by CN lines |
| 96 | 252 | arcane | School of Radiance | 8 | WPB yd | 1 | instant | - | none | heal | y | Mending Gleam | no |  |
| 97 | 252 | arcane | School of Radiance | 8 | You | You | rounds | WPB | none | buff | y | Quicksilver Mind | no |  |

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
| 106 | 254 | arcane | School of Gloam | 8 | WP yd | AoE IntB yd | minutes | Int | none | utility | y | Web of Seeming | no | a stray heading sits before this list in the extract; pairing inferred |
| 107 | 254 | arcane | School of Gloam | 6 | 1 yd | 1 | minutes | Int | none | utility | y | Thought Slip | no |  |
| 108 | 254 | arcane | School of Gloam | 6 | WPB yd | 1 | rounds | WPB | none | condition | y | Throttling Dark | no | condition fatigued(uncertain) |
| 109 | 254 | arcane | School of Gloam | 10 | You | You | minutes | IntB | none | utility | y | Borrowed Face | no |  |
| 110 | 254 | arcane | School of Gloam | 6 | WP yd | AoE WPB yd | rounds | WPB | none | condition | y | Murk Bank | no | condition blinded |
| 111 | 255 | arcane | School of Gloam | 6 | WPB yd | 1 | special | Until dawn | none | manual | y | Night Mount | no | summon: manual only |
| 112 | 255 | arcane | School of Gloam | 8 | WP yd | You | instant | - | none | utility | y | Dark Door | no |  |
| 113 | 255 | arcane | School of Gloam | 8 | Touch | 1 | rounds | WPB | none | buff | y | Cloak of Nothing | no |  |

## hedge / `Fenlore` (8)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 114 | 255 | hedge | Fenlore | 0 | You | AoE FB yd | minutes | WPB | none | buff | y | Hearth Cheer | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 115 | 255 | hedge | Fenlore | 0 | Touch | 1 | hours | FB | none | utility | y | Fruitful Plea | no | book CN 0; hedge band floor is 3; book CN 0 below band floor 3 |
| 116 | 256 | hedge | Fenlore | 0 | You | You | minutes | WPB | none | utility | y | Mire Stride | no | book CN 0; hedge band floor is 3; extract lost target line; book CN 0 below band floor 3 |
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

## chaos / `Pact Rites` (13) (first 4 rows book fiend-binding lore, last 9 the optional dark-power set)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 130 | 258 | chaos | Pact Rites | 6 | WPB yd | 1 Average-or-smaller fiend | rounds | WPB | dice | damage | y | Unmake Minor Fiend | no |  |
| 131 | 258 | chaos | Pact Rites | 10 | Touch | AoE IntB yd across (max) | unknown | WPB (unit lost in extract) | none | utility | y | Eightfold Seal | no | duration line cut |
| 132 | 258 | chaos | Pact Rites | 4 | WP yd | Special | instant | - | none | utility | y | Fiend Scent | no |  |
| 133 | 258 | chaos | Pact Rites | 8 | WPB yd | Special | rounds | WPB | none | manual | y | Rend the Veil | no | summon: manual only |
| 138 | 259 | chaos | Pact Rites | 5 | WPB yd | 1 | instant | - | dice | damage | y | Septic Bloom | no | dark-power lore, folded under Pact Rites (owner may add own lists) |
| 139 | 259 | chaos | Pact Rites | 6 | You | AoE WPB yd | rounds | WPB | none | condition | y | Plague Mist | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 140 | 259 | chaos | Pact Rites | 9 | Special | Special | instant | - | dice | damage | y | Rotten Stream | no | dark-power lore, folded under Pact Rites (owner may add own lists); area damage |
| 141 | 260 | chaos | Pact Rites | 5 | Touch | 1 | rounds | WPB | none | condition | y | Honeyed Surrender | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 142 | 260 | chaos | Pact Rites | 6 | Touch | 1 | rounds | WPB | none | utility | y | Pain Turned Sweet | no | dark-power lore, folded under Pact Rites (owner may add own lists) |
| 143 | 260 | chaos | Pact Rites | 9 | You | You | days | IntB | none | buff | y | Fickle Gift | no | pairing inferred from heading order; dark-power lore, folded under Pact Rites (owner may add own lists) |
| 144 | 260 | chaos | Pact Rites | 12 | WPB yd | 1 | rounds | WPB | none | condition | y | Warping Coil | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 145 | 260 | chaos | Pact Rites | 8 | You | AoE WPB yd | rounds | WPB | none | condition | y | Mirage Swirl | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |
| 146 | 260 | chaos | Pact Rites | 6 | WP yd | AoE IB yd | rounds | IntB | none | condition | y | Betrayal Whisper | no | dark-power lore, folded under Pact Rites (owner may add own lists); condition type not fixed by the book summary: pick on authoring |

## chaos / `Grave Rites` (4)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 134 | 258 | chaos | Grave Rites | 7 | WP yd | AoE WPB yd | special | until sunrise | none | manual | y | Grave Rising | no | summon: manual only |
| 135 | 258 | chaos | Grave Rites | 8 | WP yd | AoE WPB yd | special | until sunrise | none | manual | y | Bone Binding | no | summon: manual only |
| 136 | 259 | chaos | Grave Rites | 8 | WP yd | Special | instant | - | dice | damage | y | Howling Skull | no |  |
| 137 | 259 | chaos | Grave Rites | 6 | WP yd | Special | instant | - | none | buff | y | Vigour of the Dead | no |  |

## Blessings, kind `blessing` (19)

One row per blessing; range 6 yd (touch for the heal and disease-ease pair), target 1, duration 6 rounds unless instant. `list(s)` come from the Blessings-by-Cult table (p220): each cult grants 6. Which cults grant a blessing was read from tables.json p220 and cross-checked against the p220 text.

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 147 | 221 | blessing | Rites of the Tide; Rites of the Banner; Rites of the Forged Crown; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Keen Hand Boon | no | book blessing "Battle"; effect: +10 WS; stat/reroll buff: manual or modifyStat hook |
| 148 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of the Green Cradle; Rites of Mercy; Rites of the Deep Wood | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Held Breath Boon | no | book blessing "Breath"; effect: no breathing needed, ignore suffocation; stat/reroll buff: manual or modifyStat hook |
| 149 | 221 | blessing | Rites of the Gambler | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Silver Tongue Boon | no | book blessing "Charisma"; effect: +10 Fel; stat/reroll buff: manual or modifyStat hook |
| 150 | 221 | blessing | Rites of the Banner; Rites of the Gambler; Rites of the Green Cradle; Rites of Mercy; Rites of the Deep Wood; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Honest Heart Boon | no | book blessing "Conscience"; effect: target must pass Cool to break strictures; stat/reroll buff: manual or modifyStat hook |
| 151 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of the Banner; Rites of the Forged Crown; Rites of the Winter Wolf; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Stout Heart Boon | no | book blessing "Courage"; effect: +10 WP; stat/reroll buff: manual or modifyStat hook |
| 152 | 221 | blessing | Rites of the Gambler | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Deft Fingers Boon | no | book blessing "Finesse"; effect: +10 Dex; stat/reroll buff: manual or modifyStat hook |
| 153 | 221 | blessing | Rites of the Still Hour; Rites of the Banner; Rites of the Gambler; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Second Chance Boon | no | book blessing "Fortune"; effect: reroll next failed test; stat/reroll buff: manual or modifyStat hook |
| 154 | 221 | blessing | Rites of the Green Cradle | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Light Foot Boon | no | book blessing "Grace"; effect: +10 Ag; stat/reroll buff: manual or modifyStat hook |
| 155 | 221 | blessing | Rites of the Tide; Rites of the Forged Crown; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Iron Hide Boon | no | book blessing "Hardiness"; effect: +10 T; stat/reroll buff: manual or modifyStat hook |
| 156 | 221 | blessing | Rites of the Green Cradle; Rites of Mercy | 0 | Touch | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | heal | n | Hearth Mending | yes:hearth-mending | book blessing "Healing"; effect: heal 1 Wound |
| 157 | 221 | blessing | Rites of the Deep Wood | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Sure Aim Boon | no | book blessing "Hunt"; effect: +10 BS; stat/reroll buff: manual or modifyStat hook |
| 158 | 221 | blessing | Rites of the Forged Crown; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Strong Arm Boon | no | book blessing "Might"; effect: +10 S; stat/reroll buff: manual or modifyStat hook |
| 159 | 221 | blessing | Rites of the Banner; Rites of the Gambler; Rites of the Green Cradle; Rites of Mercy; Rites of the Forged Crown | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Shame Ward Boon | no | book blessing "Protection"; effect: attackers must pass Cool to target the ward; stat/reroll buff: manual or modifyStat hook |
| 160 | 221 | blessing | Rites of the Green Cradle; Rites of Mercy | 0 | Touch | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | utility | n | Fever Ease Boon | no | book blessing "Recuperation"; effect: shorten one disease by 1 day; condition-removal/disease: manual |
| 161 | 221 | blessing | Rites of the Still Hour; Rites of the Banner; Rites of the Forged Crown; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Hallowed Edge Boon | no | book blessing "Righteousness"; effect: weapon counts as Magical; stat/reroll buff: manual or modifyStat hook |
| 162 | 221 | blessing | Rites of the Tide; Rites of the Deep Wood; Rites of the Winter Wolf | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Cruel Cut Boon | no | book blessing "Savagery"; effect: roll twice on next Critical, take best; stat/reroll buff: manual or modifyStat hook |
| 163 | 221 | blessing | Rites of the Tide; Rites of the Still Hour; Rites of Mercy; Rites of the Winter Wolf | 0 | 6 yd | 1 | instant | - | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | utility | n | Shrug It Off Boon | no | book blessing "Tenacity"; effect: remove 1 condition (not Besmirched); condition-removal/disease: manual |
| 164 | 221 | blessing | Rites of the Still Hour; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Clear Head Boon | no | book blessing "Wisdom"; effect: +10 Int; stat/reroll buff: manual or modifyStat hook |
| 165 | 221 | blessing | Rites of the Gambler; Rites of the Scales | 0 | 6 yd | 1 | rounds | 6 | n/a (SL: +6 yd, +1 target, +6 rds per +2 SL) | buff | n | Quick Wits Boon | no | book blessing "Wit"; effect: +10 I; stat/reroll buff: manual or modifyStat hook |

## Miracles / `Rites of the Tide` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 166 | 222 | miracle | Rites of the Tide | 0 | FB miles | 1 vessel | hours | 1 | none (n/a) | utility | n | Stilled Sails | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 167 | 222 | miracle | Rites of the Tide | 0 | FB yd | 1 | rounds | FB | none (n/a) | condition | n | Brine Lungs | no | extract order garbled: verify page; condition fatigued; book has no CN (Pray test): CN 0 |
| 168 | 222 | miracle | Rites of the Tide | 0 | IB miles | 1 vessel | hours | 1 | none (n/a) | buff | n | Favouring Gale | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 169 | 222 | miracle | Rites of the Tide | 0 | Special | Special | instant | - | none (n/a) | utility | n | Tide Larder | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 170 | 223 | miracle | Rites of the Tide | 0 | FB yd | 1 | rounds | FB | none (n/a) | condition | n | Deck Heave | no | extract order garbled: verify page; condition blinded; book has no CN (Pray test): CN 0 |
| 171 | 223 | miracle | Rites of the Tide | 0 | 1 yd | 1 | minutes | FB | none (n/a) | utility | n | Surface Stride | no | range/duration lines merged in extract; extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Still Hour` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 172 | 223 | miracle | Rites of the Still Hour | 0 | Touch | 1 | instant | - | none (n/a) | damage | n | Death Knell | no | effect text lost; verify; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 173 | 223 | miracle | Rites of the Still Hour | 0 | ? | ? | unknown | - | none (n/a) | utility | n | Parting Rite | no | only the heading survives in the extract; params lost; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 174 | 223 | miracle | Rites of the Still Hour | 0 | Touch | Special | special | until sunrise | none (n/a) | utility | n | Threshold Line | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 175 | 223 | miracle | Rites of the Still Hour | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Reprieve | no | params merged in extract; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 176 | 223 | miracle | Rites of the Still Hour | 0 | You | AoE FB yd | instant | - | none (n/a) | damage | n | Smiting Ash | no | extract order garbled: verify page; area damage; book has no CN (Pray test): CN 0 |
| 177 | 223 | miracle | Rites of the Still Hour | 0 | You | You | rounds | FB | none (n/a) | buff | n | Reaper Mien | no | heading missing in extract; name unknown; extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Banner` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 178 | 224 | miracle | Rites of the Banner | 0 | Special | Special | instant | - | none (n/a) | condition | n | Blinding Standard | no | extract order garbled: verify page; condition blinded; book has no CN (Pray test): CN 0 |
| 179 | 224 | miracle | Rites of the Banner | 0 | FB yd | You | rounds | FB | none (n/a) | utility | n | Scout Sight | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 180 | 224 | miracle | Rites of the Banner | 0 | FB yd | FB targets | rounds | FB | none (n/a) | buff | n | Shield Wall Glow | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 181 | 224 | miracle | Rites of the Banner | 0 | You | You | rounds | FB | none (n/a) | buff | n | Blessed Spear | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 182 | 224 | miracle | Rites of the Banner | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Battle Fury | no | extract files it under another cult; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 183 | 224 | miracle | Rites of the Banner | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Steadfast Ranks | no | extract files it under another cult; extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Gambler` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 184 | 224 | miracle | Rites of the Gambler | 0 | 1 yd | 1 | instant | - | none (n/a) | utility | n | Open Door Riddle | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 185 | 224 | miracle | Rites of the Gambler | 0 | FB yd | You | unknown | - | none (n/a) | buff | n | Prowler Sight | no | params lines merged; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 186 | 224 | miracle | Rites of the Gambler | 0 | You | You | special | - | none (n/a) | buff | n | Loaded Fate | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 187 | 225 | miracle | Rites of the Gambler | 0 | Touch | 1 | rounds | FB | none (n/a) | buff | n | Light Fingers Boon | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 188 | 225 | miracle | Rites of the Gambler | 0 | You | You | minutes | FB | none (n/a) | utility | n | Borrowed Mask | no | heading and effect text mismatched in extract; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 189 | 225 | miracle | Rites of the Gambler | 0 | FB yd | 1 | rounds | FB | none (n/a) | condition | n | Fading Memory | no | extract order garbled: verify page; condition type not fixed by the book summary: pick on authoring; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Green Cradle` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 190 | 225 | miracle | Rites of the Green Cradle | 0 | Touch | Special | rounds | 1 | none (n/a) | utility | n | Sudden Orchard | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 191 | 225 | miracle | Rites of the Green Cradle | 0 | 1 yd | 1 | minutes | FB | none (n/a) | buff | n | Green Canopy | no | params lines merged; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 192 | 225 | miracle | Rites of the Green Cradle | 0 | You | AoE FB yd | rounds | FB | none (n/a) | utility | n | Cradle Kin | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 193 | 225 | miracle | Rites of the Green Cradle | 0 | FB yd | FB targets | instant | - | none (n/a) | heal | n | Cradle Relief | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 194 | 225 | miracle | Rites of the Green Cradle | 0 | Touch | 1 | special | - | none (n/a) | heal | n | Gentle Hands | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 195 | 226 | miracle | Rites of the Green Cradle | 0 | Touch | Special | hours | FB | none (n/a) | buff | n | Bond Blessing | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of Mercy` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 196 | 226 | miracle | Rites of Mercy | 0 | FB yd | 1 | rounds | FB | none (n/a) | buff | n | Monk Fortitude | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 197 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | special | - | none (n/a) | heal | n | Soothing Hush | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 198 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | special | - | none (n/a) | heal | n | Merciful Tears | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 199 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | instant | - | none (n/a) | heal | n | Cleansed Slate | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 200 | 226 | miracle | Rites of Mercy | 0 | Touch | 1 | instant | - | none (n/a) | heal | n | Draw the Poison | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 201 | 226 | miracle | Rites of Mercy | 0 | FB yd | 1 | rounds | FB | none (n/a) | buff | n | Shouldered Pain | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Forged Crown` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 202 | 226 | miracle | Rites of the Forged Crown | 0 | You | You | rounds | FB | none (n/a) | buff | n | Radiant Zeal | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 203 | 226 | miracle | Rites of the Forged Crown | 0 | You | You + AoE FB yd | rounds | FB | none (n/a) | buff | n | Spellward Shout | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 204 | 227 | miracle | Rites of the Forged Crown | 0 | You | You | rounds | FB | none (n/a) | buff | n | Hallowed Hammer | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 205 | 227 | miracle | Rites of the Forged Crown | 0 | You | AoE FB yd | instant | - | none (n/a) | damage | n | Spirit Pyre | no | extract merges two Range lines; extract order garbled: verify page; area damage; book has no CN (Pray test): CN 0 |
| 206 | 227 | miracle | Rites of the Forged Crown | 0 | FB yd | AoE FB yd (max) | instant | - | none (n/a) | damage | n | Twin Star Fall | no | extract files it under another cult; extract order garbled: verify page; area damage; book has no CN (Pray test): CN 0 |
| 207 | 227 | miracle | Rites of the Forged Crown | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Hate the Wicked | no | extract files it under another cult; extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Deep Wood` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 208 | 227 | miracle | Rites of the Deep Wood | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Beastsense | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 209 | 227 | miracle | Rites of the Deep Wood | 0 | FB yd | 1 | minutes | FB | none (n/a) | manual | n | Wild Ally | no | extract order garbled: verify page; summon: manual only; book has no CN (Pray test): CN 0 |
| 210 | 227 | miracle | Rites of the Deep Wood | 0 | You | You | rounds | FB | none (n/a) | utility | n | Stag Leap | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 211 | 227 | miracle | Rites of the Deep Wood | 0 | You | You | hours | FB | none (n/a) | buff | n | Huntmaster Trail | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 212 | 228 | miracle | Rites of the Deep Wood | 0 | FB yd | AoE FB yd | instant | - | none (n/a) | condition | n | Snare Roots | no | extract order garbled: verify page; condition entangled; book has no CN (Pray test): CN 0 |
| 213 | 228 | miracle | Rites of the Deep Wood | 0 | You | You | rounds | FB | none (n/a) | buff | n | Fang Gift | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Winter Wolf` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 214 | 228 | miracle | Rites of the Winter Wolf | 0 | Touch | 1 | hours | FB | none (n/a) | buff | n | Frost Pelt | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 215 | 228 | miracle | Rites of the Winter Wolf | 0 | FB yd | 1 | instant | - | none (n/a) | damage | n | Cold Verdict | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 216 | 228 | miracle | Rites of the Winter Wolf | 0 | You | AoE FB yd | rounds | FB | none (n/a) | buff | n | Winter Glare | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 217 | 228 | miracle | Rites of the Winter Wolf | 0 | FB yd | 1 | rounds | FB | none (n/a) | buff | n | Pack Frenzy | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 218 | 228 | miracle | Rites of the Winter Wolf | 0 | ? | ? | unknown | - | none (n/a) | damage | n | Frostbite Bolt | no | heading only; params lost; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 219 | 228 | miracle | Rites of the Winter Wolf | 0 | FB yd | Special | rounds | FB | none (n/a) | manual | n | Pack Howl | no | extract order garbled: verify page; summon: manual only; book has no CN (Pray test): CN 0 |

## Miracles / `Rites of the Scales` (6)

| # | page | kind | list(s) | CN | range | target | duration class | duration value | overcast | effect class | ingr | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 220 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Even-Handed Blade | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 221 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Honest Tongue | no | verify separate from Witness Aura; extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 222 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Unswayed Judge | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 223 | 229 | miracle | Rites of the Scales | 0 | FB B yd | 1 | instant | - | none (n/a) | utility | n | Truth Bind | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 224 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Owl Counsel | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |
| 225 | 229 | miracle | Rites of the Scales | 0 | You | You | rounds | FB | none (n/a) | buff | n | Witness Aura | no | extract order garbled: verify page; book has no CN (Pray test): CN 0 |

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

