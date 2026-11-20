# Equipment manifest C5 (WFRP 5e consumer guide)

Source: `sections/12-consumer-guide.md` + `tables.json` (printed pages 296-317). Page numbers below are PRINTED book pages (melee table p301, ammunition p302, ranged table p303, qualities p304-306, armour p306-307; not the p303-305 range quoted in the brief). All names are proposals (`*proposed*`); no book names or prose are stored. Generic everyday items (bucket, hammer, rope) keep plain English nouns; distinctive items are renamed.

**Price rate (book p296): 1 GC = 20 shillings = 240 pence; 1 shilling = 12 pence.** Every `price p` below is in pence (brass pennies) using this rate; the template stores pence (e.g. arming sword 240 p).

Conventions: weight = book Enc; `–` = not applicable/none; range = yards as printed (see README); `BANDS:` in notes lists where the row falls outside the CURRENT working-tree validator bands (`WEAPON_GROUP_BANDS`, `ARMOUR_KIND_BANDS`, `SHIELD_BAND`, `GEAR_CATEGORY_BANDS`, `GEAR_BAND`) - these bands were written for the template's own 56 rows, so book-faithful prices/enc often need wider bands or a deliberate downscale. `in template` = mechanically equivalent row exists in `artifacts.json` (group/reach/damage/qualities/flaws/hands or kind/AP/qualities verified by script); price and enc differences are listed in notes (template prices are ~1/4 of book prices for weapons).

## Counts

| section | rows |
|---|---|
| Melee weapons | 29 |
| Ranged weapons | 23 |
| Ammunition | 8 |
| Armour and shields | 16 |
| Quick armour | 3 |
| Packs and containers | 13 |
| Clothing and accessories | 23 |
| Food, drink and lodging | 12 |
| Tools and kits | 41 |
| Trade tools and workshops | 2 |
| Books and documents | 13 |
| Animals and vehicles | 19 |
| Travel prices | 6 |
| Poisons | 10 |
| Herbs and remedies | 9 |
| Prosthetics | 6 |
| Magical items | 4 |
| Miscellaneous trappings | 32 |
| Hirelings | 6 |
| **total** | **275** |

Rows in the extract tables match this list exactly (checked table by table in `tables.json`: 29 melee, 23 ranged, 8 ammunition, 16 armour, 3 quick armour, 13 containers, 23 clothing, 12 food, 41 tools, 2 trade, 13 books, 19 animals/vehicles, 6 travel, 10 poisons, 9 herbs, 6 prosthetics, 4 magical, 32 misc, 6 hirelings). The brief estimated ~290; the book has ~275 distinct lines, the rest would be size/quality/trade variants (small/large tent, small musical instrument, per-trade tool kits ~25, jewellery tiers) that this manifest keeps as notes.

Not real items (rule profiles, services, non-purchasable): 19 rows flagged `RULE PROFILE`/`SERVICE`/`NOT purchasable`/`recommend skip` in notes; this includes the 12 travel/hireling service rows, so about 256 purchasable item rows remain.

In template: 29 of 56 existing rows have a mechanically equivalent book row; template rows with no book equivalent: `chain-flail`, `chain-hauberk`, `cudgel`, `duelling-blade`, `flanged-mace`, `greatsword`, `halberd`, `hatchet`, `hide-leggings`, `knuckle-iron`, `lance`, `leather-cap`, `mail-hood`, `maul`, `padded-jack`, `parrying-dagger`, `pitch-bomb`, `plate-harness`, `plate-sabatons`, `quilted-coat`, `sling-stones-20`, `spear`, `steel-breastplate`, `swordbreaker`, `trail-rations-week`, `visored-helm`, `wicker-shield`.


## Melee weapons (book p301; qualities p304-305)

Category: weapon (slot `weapon`). Table: groups as in the book; `hands` 2 = book "(2H)". `reach` uses engine ids. Damage `SB+n` = `{addSb:true, flat:n}`. Qualities and flaws are split by the engine registry (book prints them in one column).

| # | page | group | hands | reach | damage | qualities | flaws | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 301 | basic | 1 | very-short | SB+2 | – | – | 192 | 0 | Common | Long Knife *proposed* | yes:long-knife | price differs (template 30 p vs 192 p); name taken from template |
| 2 | 301 | basic | 1 | very-short | SB+1 | – | undamaging | 96 | 0 | Common | Paring Knife *proposed* | no | duplicates a Tools-table row (same price); keep one |
| 3 | 301 | basic | 1 | average | SB+4 | – | unbalanced | 480 | 1 | Common | Utility Axe *proposed* | no | generic class covering axes/hammers/maces; one profile; template hatchet/cudgel/mace differ (hack/pummel, different damage) |
| 4 | 301 | basic | 1 | average | SB+1 | – | unbalanced, undamaging | – | – | – | Improvised Weapon *proposed* | no | RULE PROFILE not an item (no price; enc and reach vary); skip as artifact; check engine default attack instead |
| 5 | 301 | basic | 1 | short | – | defensive | – | 72 | 1 | Common | Throw Net *proposed* | no | no damage (schema needs damage object; band flat 1-5 conflicts); inflicts entangled at strength 50 (entangle key has no strength; max quality value is 20); inflict(entangled) via condition field; same item also in ranged table; BANDS: no damage value |
| 6 | 301 | basic | 1 | average | SB+4 | – | – | 960 | 1 | Common | Arming Sword *proposed* | yes:arming-sword | price differs (template 240 p vs 960 p); BANDS: price 960 p outside 6-480 |
| 7 | 301 | brawling | 2 | personal | SB+2 | inflict:entangled | undamaging | 12 | 0 | Rare | Strangle Cord *proposed* | no | entangled strength = wielder Strength characteristic (not a fixed value); book marks it two-handed |
| 8 | 301 | brawling | 1 | personal | SB+2 | – | – | 30 | 0 | Common | Brass Fist *proposed* | no | template knuckle-iron has pummel, this has none |
| 9 | 301 | brawling | 1 | personal | SB+0 | – | undamaging | – | 0 | – | Unarmed Strike *proposed* | no | RULE PROFILE, not an item; skip |
| 10 | 301 | cavalry | 2 | long | SB+5 | pummel | – | 960 | 3 | Rare | Horseman's Maul *proposed* | no | book flags cavalry weapons as improvised when not charging (see lance row) |
| 11 | 301 | cavalry | 1 | very-long | SB+6 | damaging, impale | – | 240 | 3 | Rare | Charge Lance *proposed* | no | counts as improvised weapon when used on a turn without Charge (not expressible); template lance has slow, not damaging; BANDS: price 240 p outside 480-1440 |
| 12 | 301 | fencing | 1 | personal | SB+1 | parry | undamaging | 240 | 1 | Common | Parry Disc *proposed* | no | weapon-table twin of the shield-table small shield (different row); template buckler is the shield version; BANDS: damage +1 outside 3-5 |
| 13 | 301 | fencing | 1 | average | SB+3 | fast, impale, precise | undamaging | 1200 | 1 | Scarce | Needle Sword *proposed* | no | BANDS: price 1200 p outside 240-960 |
| 14 | 301 | fencing | 1 | short | SB+2 | defensive, impale, parry | – | 240 | 0 | Scarce | Guard Dagger *proposed* | no | BANDS: damage +2 outside 3-5 |
| 15 | 301 | fencing | 1 | long | SB+4 | fast, impale | – | 1200 | 1 | Scarce | Rapier *proposed* | yes:rapier | price differs (template 600 p vs 1200 p); BANDS: price 1200 p outside 240-960 |
| 16 | 301 | fencing | 1 | short | SB+1 | defensive, parry, trapBlade | – | 270 | 0 | Rare | Hook Parrier *proposed* | no | UNSUPPORTED quality trapBlade (registry implemented=false); template swordbreaker differs; BANDS: damage +1 outside 3-5 |
| 17 | 301 | flail | 1 | average | SB+4 | pummel, wrap | unbalanced | 480 | 1 | Scarce | Weighted Chain *proposed* | no | template chain-flail differs (dangerous/imprecise flaws, +5) |
| 18 | 301 | flail | 2 | long | SB+3 | pummel | imprecise | 60 | 2 | Common | Thresher *proposed* | no | BANDS: price 60 p outside 120-720 |
| 19 | 301 | flail | 2 | long | SB+5 | damaging, pummel, wrap | unbalanced | 720 | 3 | Rare | Heavy Chain Flail *proposed* | no |  |
| 20 | 301 | flail | 1 | very-long | SB+2 | wrap | unbalanced, undamaging | 60 | 1 | Common | Drover Lash *proposed* | no | BANDS: damage +2 outside 3-6; price 60 p outside 120-720 |
| 21 | 301 | polearm | 2 | long | SB+5 | defensive, hack, impale | – | 480 | 3 | Common | Guard Halberd *proposed* | no | near-miss of template halberd (lacks defensive) |
| 22 | 301 | polearm | 2 | massive | SB+4 | impale | – | 216 | 4 | Rare | Phalanx Pike *proposed* | no | enc 4 and reach massive: band weight max 3; BANDS: enc 4 outside 1-3 |
| 23 | 301 | polearm | 2 | long | SB+3 | defensive, pummel | undamaging | 36 | 2 | Common | Walking Staff *proposed* | no | BANDS: price 36 p outside 120-720 |
| 24 | 301 | polearm | 2 | very-long | SB+4 | fast, impale | – | 180 | 2 | Common | Boar Spear *proposed* | no | book allows one-handed use at -1 damage and without fast (second profile not expressible); template spear differs |
| 25 | 301 | twohanded | 2 | long | SB+5 | damaging, defensive | – | 2400 | 2 | Scarce | Hand-and-Half Blade *proposed* | no | one-handed variant (Melee Basic, loses damaging, gains unbalanced) not expressible; price 10 GC = 2400 p > band max 1440; BANDS: price 2400 p outside 480-1440 |
| 26 | 301 | twohanded | 2 | long | SB+6 | damaging, hack | unbalanced | 960 | 3 | Scarce | Headsman Axe *proposed* | no |  |
| 27 | 301 | twohanded | 2 | long | SB+5 | damaging, penetrating | unbalanced | 480 | 3 | Common | War Pick *proposed* | no |  |
| 28 | 301 | twohanded | 2 | long | SB+6 | damaging, pummel | unbalanced | 960 | 3 | Scarce | Great Hammer *proposed* | no | template maul is near (slow instead of unbalanced) |
| 29 | 301 | twohanded | 2 | long | SB+5 | damaging, hack | – | 3840 | 3 | Scarce | Battle Greatblade *proposed* | no | price 16 GC = 3840 p > band max 1440; template greatsword is +6; BANDS: price 3840 p outside 480-1440 |

## Ranged weapons (p303)

Category: weapon (slot `range_weapon`). Range column = Medium range in yards as printed (e.g. bow 50 yd). `SB×n yd` ranges depend on the attacker and cannot be stored as a fixed `range`. Damage without `SB+` = flat only (`addSb:false`). Blackpowder, engineering and explosives groups get blackpowder + damaging from the engine (footnote p303), so those are not listed as qualities.

| # | page | group | hands | range yd | damage | qualities | flaws | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 30 | 303 | blackpowder | 2 | 20 | 8 | blast:3 | dangerous, reload:3 | 2400 | 2 | Scarce | Scattergun *proposed* | no | blackpowder+damaging implied by group (engine adds them); flat band max 10 ok |
| 31 | 303 | blackpowder | 2 | 40 | 10 | – | reload:3 | 3840 | 2 | Scarce | Long Musket *proposed* | yes:long-musket | price differs (template 2400 p vs 3840 p); template lists damaging explicitly (engine adds anyway); BANDS: price 3840 p outside 960-2880 |
| 32 | 303 | blackpowder | 1 | 20 | 9 | pistol | reload:2 | 4800 | 0 | Rare | Matchlock Pistol *proposed* | yes:matchlock-pistol | price differs (template 1920 p vs 4800 p); BANDS: price 4800 p outside 960-2880 |
| 33 | 303 | bow | 2 | 50 | SB+4 | – | – | 960 | 2 | Common | Hunting Bow *proposed* | yes:hunting-bow | price differs (template 240 p vs 960 p) |
| 34 | 303 | bow | 2 | 60 | SB+4 | damaging | – | 1920 | 3 | Scarce | Longbow *proposed* | yes:longbow | price differs (template 600 p vs 1920 p); BANDS: price 1920 p outside 120-960 |
| 35 | 303 | bow | 2 | 40 | SB+3 | – | – | 720 | 1 | Common | Short Bow *proposed* | no |  |
| 36 | 303 | crossbow | 2 | 50 | 9 | – | reload:1 | 1200 | 2 | Common | Light Crossbow *proposed* | yes:light-crossbow | price differs (template 600 p vs 1200 p) |
| 37 | 303 | crossbow | 1 | 20 | 7 | pistol | reload:1 | 1440 | 0 | Rare | Hand Crossbow *proposed* | no | price cell reads "6 G" in the extract (assumed 6 GC; scan p303); band: crossbow needs twoHanded but this is a one-handed pistol-type; BANDS: range 20 yd outside the band (band 120-360 ft = 40-120 yd); enc 0 outside 1-3; group needs twoHanded |
| 38 | 303 | crossbow | 2 | 60 | 10 | – | reload:2 | 1920 | 3 | Scarce | Heavy Crossbow *proposed* | yes:heavy-crossbow | price differs (template 1200 p vs 1920 p); BANDS: price 1920 p outside 360-1440 |
| 39 | 303 | engineering | 2 | 40 | 10 | repeater:4 | dangerous, reload:5 | 12000 | 3 | Rare | Magazine Longarm *proposed* | no | group engineering NOT in Grim weapon groups (validator rejects); repeater is registry implemented=false but ammoCapacity is read from it in canon; band price max 2880 (12000 p); BANDS: group "engineering" not in Grim weapon groups |
| 40 | 303 | engineering | 1 | 20 | 9 | pistol, repeater:4 | dangerous, reload:4 | 9600 | 1 | Rare | Multi-Shot Pistol *proposed* | no | same engineering/repeater gaps; price 9600 p; BANDS: group "engineering" not in Grim weapon groups |
| 41 | 303 | engineering | 2 | 100 | 10 | precise | reload:4 | 24000 | 3 | Exotic | Marksman Rifle *proposed* | no | group engineering not allowed; price 24000 p; range 100 yd within band 360 ft (120 yd); BANDS: group "engineering" not in Grim weapon groups |
| 42 | 303 | entangling | 1 | SB×3 yd | – | inflict:entangled:35, inflict:prone | undamaging | 120 | 0 | Rare | Leg Bolas *proposed* | no | damage +SB (flat 0, undamaging flaw); entangled strength 35 and prone apply only on a Leg hit (inflict has a location field, strength value capped at 20); group entangling not in Grim list; range depends on SB; BANDS: group "entangling" not in Grim weapon groups |
| 43 | 303 | entangling | 2 | SB×2 yd | – | inflict:entangled:45 | – | 72 | 1 | Common | Lariat *proposed* | no | no damage; no range bands, single listed range; range depends on SB; group not in Grim list; BANDS: group "entangling" not in Grim weapon groups |
| 44 | 303 | entangling | 1 | SB yd | – | inflict:entangled:50 | – | 72 | 1 | Common | Casting Net *proposed* | no | ranged twin of the melee net; no damage; range depends on SB; group not in Grim list; BANDS: group "entangling" not in Grim weapon groups |
| 45 | 303 | explosives | 1 | SB yd | 12 | blast:5, inflict:deafened | dangerous | 720 | 0 | Rare | Powder Bomb *proposed* | no | group explosives not in Grim list; blackpowder+damaging implied; range depends on SB; template pitch-bomb is throwing group; BANDS: group "explosives" not in Grim weapon groups |
| 46 | 303 | explosives | 1 | SB yd | 8 | blast:4, inflict:ablaze | dangerous | 240 | 0 | Scarce | Fire Flask *proposed* | no | same as above; BANDS: group "explosives" not in Grim weapon groups |
| 47 | 303 | sling | 1 | 40 | 6 | – | – | 12 | 0 | Common | Sling *proposed* | yes:sling | price equal (12 p) |
| 48 | 303 | sling | 2 | 50 | 7 | – | – | 48 | 2 | Common | Staff Sling *proposed* | no | enc 2 above sling band max 1; band twoHanded not enforced for sling; BANDS: enc 2 outside 0-1 |
| 49 | 303 | throwing | 1 | SB×3 yd | SB+3 | impale | – | 126 | 1 | Scarce | Light Javelin *proposed* | no | range depends on SB (schema has fixed range); enc 1 within throwing band |
| 50 | 303 | throwing | 1 | SB×3 yd | SB+1 | – | undamaging | – | 0 | – | Thrown Rock *proposed* | no | RULE PROFILE, not an item; skip |
| 51 | 303 | throwing | 1 | SB×2 yd | SB+3 | hack | – | 240 | 1 | Scarce | Throwing Hatchet *proposed* | no | range depends on SB |
| 52 | 303 | throwing | 1 | SB×2 yd | SB+2 | – | – | 216 | 0 | Scarce | Throwing Knife *proposed* | yes:throwing-knife | template range fixed 12 yd (approximation of SB-based range); price 216 p |

## Ammunition (p302)

Category: none (gear in slot `item`, `GEAR_BAND` weights/prices). Ammunition modifiers (range, damage, qualities) are not expressible on a gear item; template ammo rows only carry price/enc.

| # | page | type / slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|
| 53 | 302 | gear (no category), slot item | 39 | 0 | Common | Bullet and Powder (12) *proposed* | yes:powder-and-shot-12 | price differs (template 120 p vs 39 p); book: range as weapon, qualities impale and penetrating on the shot; not expressible on a gear item |
| 54 | 302 | gear (no category), slot item | 3 | 0 | Common | Scrap Shot and Powder *proposed* | no | half weapon range and -1 damage when used; no quantity given; not expressible |
| 55 | 302 | gear (no category), slot item | 39 | 0 | Common | Scatter Shot and Powder (12) *proposed* | no | gives the weapon blast +1; only used by the scattergun-type; not expressible |
| 56 | 302 | gear (no category), slot item | 60 | 0 | Common | Arrows (12) *proposed* | yes:arrows-12 | price equal (60 p); impale on arrows not expressible on gear |
| 57 | 302 | gear (no category), slot item | 72 | 0 | Exotic | Fine Long Arrow *proposed* | no | range +10 yd and impale; sold singly (price per arrow); not expressible |
| 58 | 302 | gear (no category), slot item | 60 | 0 | Common | Crossbow Bolts (12) *proposed* | yes:crossbow-bolts-12 | price equal (60 p); impale not expressible |
| 59 | 302 | gear (no category), slot item | 4 | 0 | Common | Lead Sling Shot (12) *proposed* | no | range -10, damage +1, pummel; not expressible |
| 60 | 302 | gear (no category), slot item | 1 | 0 | Common | Sling Pebbles (12) *proposed* | no | pummel; template sling-stones-20 is a 20 count at 6 p (near) |

## Armour and shields (p306-307)

Category: armour (slots `armor`/`helmet`/`boots`) and shields (gear, slot `shield`, exactly one `shield X` quality, X = AP). Book armour kinds: leather = soft, mail = mail, plate = plate. Slot rules: `armor` leaves head at 0, `helmet` only head, `boots` only leg.

| # | page | kind | slot | locations / AP | qualities (engine ids) | price p | enc | avail | worn penalty | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 61 | 307 | shield (gear) | shield | shield AP 1 | shield 1 | 240 | 1 | Common | – | Buckler Shield *proposed* | yes:buckler | AP 1 = shield rating; price differs (template 60 p vs 240 p), template enc 0 vs 1; shield is gear with one shield-X quality |
| 62 | 307 | shield (gear) | shield | shield AP 2 | shield 2 | 480 | 2 | Common | – | Round Shield *proposed* | yes:round-shield | price differs (120 p vs 480 p); enc 2 vs template 1 |
| 63 | 307 | shield (gear) | shield | shield AP 3 | shield 3 | 720 | 3 | Common | – | Kite Shield *proposed* | yes:kite-shield | price differs (360 p vs 720 p); BANDS: price 720 outside 12-480 |
| 64 | 307 | soft | helmet | head 1 / arm 0 / body 0 / leg 0 | – | 480 | 0 | Common | – | Leather Cowl *proposed* | no | UNSUPPORTED flaw partial (even hit-location rolls ignore this AP); leather worn without penalty under other armour; template leather-cap has flexible, no partial; BANDS: price 480 outside 12-360 |
| 65 | 307 | soft | armor | head 0 / arm 1 / body 1 / leg 0 | – | 720 | 1 | Common | – | Boiled Jacket *proposed* | no | book gives no flexible quality for leather; template padded-jack is near (flexible); BANDS: price 720 outside 12-360 |
| 66 | 307 | soft | armor | head 0 / arm 0 / body 1 / leg 0 | – | 600 | 1 | Common | – | Leather Vest *proposed* | no | BANDS: price 600 outside 12-360 |
| 67 | 307 | soft | boots | head 0 / arm 0 / body 0 / leg 1 | – | 720 | 1 | Common | – | Leather Chaps *proposed* | no | template hide-leggings near (flexible); BANDS: price 720 outside 12-360 |
| 68 | 307 | mail | boots | head 0 / arm 0 / body 0 / leg 2 | flexible | 2400 | 3 | Scarce | – | Mail Chausses *proposed* | yes:mail-chausses | price differs (480 p vs 2400 p); enc 3 vs template 1; BANDS: price 2400 outside 240-1440 |
| 69 | 307 | mail | armor | head 0 / arm 2 / body 2 / leg 0 | flexible | 4800 | 3 | Scarce | – | Mail Sleeved Coat *proposed* | no | arms+body AP2; template chain-hauberk also covers legs; BANDS: price 4800 outside 240-1440 |
| 70 | 307 | mail | helmet | head 2 / arm 0 / body 0 / leg 0 | flexible | 1440 | 1 | Scarce | – | Mail Cowl *proposed* | no | UNSUPPORTED flaw partial; template mail-hood lacks partial |
| 71 | 307 | mail | armor | head 0 / arm 0 / body 2 / leg 0 | flexible | 3840 | 2 | Common | – | Mail Shirt *proposed* | yes:ring-shirt | price differs (600 p vs 3840 p); BANDS: price 3840 outside 240-1440 |
| 72 | 307 | plate | armor | head 0 / arm 2 / body 0 / leg 0 | – | 2880 | 2 | Rare | – | Plate Vambraces *proposed* | no | UNSUPPORTED quality impenetrable (ignores odd-number crits) and flaw weakpoints; arms only: slot armor with body 0 |
| 73 | 307 | plate | armor | head 0 / arm 0 / body 2 / leg 0 | – | 3600 | 3 | Scarce | – | Cuirass *proposed* | no | UNSUPPORTED impenetrable, weakpoints; template steel-breastplate is AP 3 |
| 74 | 307 | plate | helmet | head 2 / arm 0 / body 0 / leg 0 | – | 1200 | 2 | Rare | -2 SL Perception | Closed Helm *proposed* | no | UNSUPPORTED impenetrable, weakpoints; worn penalty (Perception) not expressible |
| 75 | 307 | plate | helmet | head 2 / arm 0 / body 0 / leg 0 | – | 720 | 1 | Common | – | Open Sallet *proposed* | no | UNSUPPORTED partial; AP 2 on a plate kind |
| 76 | 307 | plate | boots | head 0 / arm 0 / body 0 / leg 2 | – | 2880 | 3 | Rare | – | Plate Greaves *proposed* | no | UNSUPPORTED impenetrable, weakpoints |

## Quick armour (p307, optional rules)

Optional abstract rule: one row covers the whole body. Recommend skipping for the template (kept for completeness).

| # | page | kind | slot | locations / AP | qualities | price p | enc | avail | worn penalty | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 77 | 307 | soft | armor (all four locations) | All 1 | – | 1920 | 0 | Common | – | Light Kit *proposed* | no | OPTIONAL abstract rule; recommend skip; fits soft band except price 1920 p > 360 |
| 78 | 307 | mail | armor (all four locations) | All 3 | flexible | 10560 | 4 | Scarce | -1 SL Stealth | Medium Kit *proposed* | no | OPTIONAL abstract rule (full-body one row); recommend skip; BANDS: AP/enc/price above the mail kind band |
| 79 | 307 | plate | armor (all four locations) | All 5 | impenetrable, weakpoints | 21120 | 10 | Rare | -2 SL Perception, -2 SL Stealth | Heavy Kit *proposed* | no | OPTIONAL abstract rule (full-body one row); recommend skip; BANDS: AP/enc/price above the plate kind band |

## Packs and containers (p308)

Category `trappings`, slot `item`. Container capacity ("carries") is not expressible.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 80 | 308 | gear | item | 60 | 2 | Common | Backpack *proposed* | yes:backpack | carries 4 enc (capacity not expressible); counts as worn on the back; price differs (24 p vs 60 p), enc 2 vs template 1 |
| 81 | 308 | gear | item | 96 | 6 | Common | Cooper Barrel *proposed* | no | carries 12; holds 32 gal liquid; BANDS: enc 6 outside 0-3 |
| 82 | 308 | gear | item | 36 | 2 | Common | Small Cask *proposed* | no | carries 4; holds 10 gal liquid |
| 83 | 308 | gear | item | 60 | 0 | Common | Pint Flask *proposed* | no | holds 1 pint |
| 84 | 308 | gear | item | 36 | 1 | Common | Clay Jug *proposed* | no | carries 1 |
| 85 | 308 | gear | item | 84 | 0 | Common | Tin Tankard *proposed* | no |  |
| 86 | 308 | gear | item | 4 | 0 | Common | Belt Pouch *proposed* | no | carries 1 |
| 87 | 308 | gear | item | 12 | 2 | Common | Grain Sack *proposed* | no | carries 4 |
| 88 | 308 | gear | item | 18 | 3 | Common | Large Grain Sack *proposed* | no | carries 6 |
| 89 | 308 | gear | item | 216 | 4 | Common | Pannier Pair *proposed* | no | carries 8; enc 4 above trappings band max 3; BANDS: enc 4 outside 0-3 |
| 90 | 308 | gear | item | 12 | 1 | Common | Shoulder Satchel *proposed* | no | carries 2 |
| 91 | 308 | gear | item | 192 | 0 | Scarce | Tube Case *proposed* | no | holds scrolls |
| 92 | 308 | gear | item | 12 | 1 | Common | Waterskin *proposed* | yes:waterskin | price equal (12 p); enc 1 vs template 0 |

## Clothing and accessories (p308)

Category `clothing`; slot `item`, cloaks use slot `cloak`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 93 | 308 | gear | item | 2 | 0 | Common | Brass Charm *proposed* | no |  |
| 94 | 308 | gear | item | 720 | 1 | Common | Walking Boots *proposed* | no | worn item but slot boots is armour-only in Grim: use slot item |
| 95 | 308 | gear | cloak | 480 | 1 | Common | Travel Cloak *proposed* | no | slot cloak |
| 96 | 308 | gear | item | 720 | 1 | Common | Everyday Clothes *proposed* | no |  |
| 97 | 308 | gear | item | 720 | 1 | Common | Winter Coat *proposed* | no | effect: removes cold-exposure penalty (not expressible) |
| 98 | 308 | gear | item | 240 | 1 | Scarce | Stage Costume *proposed* | no |  |
| 99 | 308 | gear | item | 3840 | 1 | Scarce | Court Finery *proposed* | no | social-status effect not expressible; BANDS: price 3840 outside 1-2400 |
| 100 | 308 | gear | item | 120 | 0 | Common | Cosmetic Powder *proposed* | no |  |
| 101 | 308 | gear | item | 96 | 0 | Common | Gloves *proposed* | no |  |
| 102 | 308 | gear | cloak | 2880 | 1 | Rare | Noble Mantle *proposed* | no | status/social effect not expressible; slot cloak; BANDS: price 2880 outside 1-2400 |
| 103 | 308 | gear | item | 126 | 0 | Common | Brimmed Hat *proposed* | no | quality-of-item (fine hat = status) not expressible |
| 104 | 308 | gear | item | 60 | 0 | Common | Hood and Mask *proposed* | no |  |
| 105 | 308 | gear | item | – | 0 | Common | Trinket Jewellery *proposed* | no | price varies by metal and gem: pick a sample price (book guideline: ring without gem costs 10 coins of its metal) |
| 106 | 308 | gear | item | 120 | 0 | Common | Perfume Vial *proposed* | no |  |
| 107 | 308 | gear | item | 120 | 0 | Scarce | Fine Pins (6) *proposed* | no | sold as 6 |
| 108 | 308 | gear | item | 80 | 0 | Common | Devotional Token *proposed* | no |  |
| 109 | 308 | gear | item | 720 | 1 | Common | Plain Robes *proposed* | no |  |
| 110 | 308 | gear | item | 1920 | 1 | Rare | Magistrate Rod *proposed* | no | status item |
| 111 | 308 | gear | item | 480 | 0 | Common | Town Shoes *proposed* | no |  |
| 112 | 308 | gear | item | 1200 | 0 | Rare | Seal Ring *proposed* | no | status item |
| 113 | 308 | gear | item | 48 | 0 | Scarce | Tattoo Session *proposed* | no | service not an item; recommend skip |
| 114 | 308 | gear | item | 480 | 1 | Scarce | Livery Uniform *proposed* | no |  |
| 115 | 308 | gear | item | 720 | 1 | Common | Capped Cane *proposed* | no | status item |

## Food, drink and lodging (p309)

Category `food`; consumables without a use counter (decision 2B). Lodging/stables are services, shown with enc "–".

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 116 | 309 | gear | item | 3 | 0 | Common | Pint of Ale *proposed* | no | consumable without counter (decision 2B) |
| 117 | 309 | gear | item | 36 | 2 | Common | Ale Keg *proposed* | no | holds 3 gal; empty keg refill 18 p |
| 118 | 309 | gear | item | 9 | 0 | Exotic | Mountain Stout (pint) *proposed* | no | strong drink: requires a hard drink-skill test (effect not expressible) |
| 119 | 309 | gear | item | 10 | 1 | Common | Day Groceries *proposed* | no | per day |
| 120 | 309 | gear | item | 12 | 0 | Common | Tavern Meal *proposed* | no |  |
| 121 | 309 | gear | item | 24 | 0 | Common | Travel Rations (day) *proposed* | no | template trail-rations-week is a 7-day pack (30 p) - near, not equal |
| 122 | 309 | gear | item | 10 | – | Common | Common Room Bed (night) *proposed* | no | SERVICE (lodging) not an item; enc "–" |
| 123 | 309 | gear | item | 120 | – | Common | Private Room (night) *proposed* | no | SERVICE; sleeps 2 (large rooms double price for 4) |
| 124 | 309 | gear | item | 24 | 0 | Common | Pint of Spirits *proposed* | no |  |
| 125 | 309 | gear | item | 10 | – | Common | Stable Stall (night) *proposed* | no | SERVICE |
| 126 | 309 | gear | item | 10 | 0 | Common | Wine Bottle *proposed* | no |  |
| 127 | 309 | gear | item | 4 | 0 | Common | Single Drink *proposed* | no | wine/spirits by the glass |

## Tools and kits (p310)

Category `tools`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 128 | 310 | gear | item | 40 | 0 | Scarce | Abacus *proposed* | no |  |
| 129 | 310 | gear | item | 30 | 1 | Common | Animal Trap *proposed* | no | used by foraging/trap rules |
| 130 | 310 | gear | item | 720 | 0 | Scarce | Venom Cure Kit *proposed* | no | Heal test removes all poisoned conditions (not expressible) |
| 131 | 310 | gear | item | 60 | 1 | Common | Boat Hook *proposed* | no |  |
| 132 | 310 | gear | item | 10 | 2 | Common | Broom *proposed* | no |  |
| 133 | 310 | gear | item | 30 | 1 | Common | Bucket *proposed* | no |  |
| 134 | 310 | gear | item | 50 | 0 | Common | Chisel *proposed* | no |  |
| 135 | 310 | gear | item | 10 | 0 | Common | Comb *proposed* | no |  |
| 136 | 310 | gear | item | 30 | 1 | Common | Crowbar *proposed* | yes:crowbar | price differs (template 36 p vs 30 p) |
| 137 | 310 | gear | item | 36 | 2 | Common | Crutch *proposed* | no |  |
| 138 | 310 | gear | item | 78 | 0 | Scarce | Disguise Kit *proposed* | no | enough for 4 disguises |
| 139 | 310 | gear | item | 24 | 0 | Scarce | Ear Pick *proposed* | no |  |
| 140 | 310 | gear | item | 12 | 0 | Common | Fish Hooks (12) *proposed* | no | foraging |
| 141 | 310 | gear | item | 18 | 0 | Common | Floor Brush *proposed* | no |  |
| 142 | 310 | gear | item | 240 | 0 | Scarce | Gavel *proposed* | no |  |
| 143 | 310 | gear | item | 36 | 0 | Common | Hammer *proposed* | no |  |
| 144 | 310 | gear | item | 258 | 0 | Rare | Hand Mirror *proposed* | no |  |
| 145 | 310 | gear | item | 48 | 2 | Common | Hoe *proposed* | no |  |
| 146 | 310 | gear | item | 240 | 0 | Common | Key *proposed* | no |  |
| 147 | 310 | gear | item | 96 | 0 | Common | Knife (tool) *proposed* | no | duplicate of the melee-table knife (same price): keep one |
| 148 | 310 | gear | item | 480 | 0 | Scarce | Lockpicks *proposed* | yes:lockpicks | price differs (template 120 p vs 480 p) |
| 149 | 310 | gear | item | 480 | 0 | Scarce | Manacles *proposed* | no | imposes entangled strength 65; one escape attempt per hour (not expressible) |
| 150 | 310 | gear | item | 480 | 2 | Scarce | Mantrap *proposed* | no |  |
| 151 | 310 | gear | item | 12 | 2 | Common | Mop *proposed* | no |  |
| 152 | 310 | gear | item | 2 | 0 | Common | Nails (12) *proposed* | no |  |
| 153 | 310 | gear | item | 48 | 0 | Common | Paint Brush *proposed* | no |  |
| 154 | 310 | gear | item | 168 | 0 | Common | Pestle and Mortar *proposed* | no |  |
| 155 | 310 | gear | item | 480 | 1 | Scarce | Digging Pick *proposed* | no | tool row; the war pick weapon is a separate row |
| 156 | 310 | gear | item | 60 | 3 | Common | Pole (3 yd) *proposed* | no | counts as an improvised weapon |
| 157 | 310 | gear | item | 36 | 0 | Common | Quill Pen *proposed* | no |  |
| 158 | 310 | gear | item | 54 | 2 | Common | Garden Rake *proposed* | no |  |
| 159 | 310 | gear | item | 720 | 0 | Rare | Reading Lens *proposed* | no | +2 SL to read tiny text (not expressible) |
| 160 | 310 | gear | item | 72 | 1 | Common | Hand Saw *proposed* | no |  |
| 161 | 310 | gear | item | 240 | 1 | Common | Sickle *proposed* | no | may rule as a hand weapon |
| 162 | 310 | gear | item | 96 | 2 | Common | Spade *proposed* | no |  |
| 163 | 310 | gear | item | 12 | 0 | Common | Iron Spike *proposed* | no |  |
| 164 | 310 | gear | item | 1200 | 0 | Scarce | Engraved Stamp *proposed* | no |  |
| 165 | 310 | gear | item | 192 | 0 | Common | Steel Tongs *proposed* | no |  |
| 166 | 310 | gear | item | 1200 | 0 | Rare | Telescope *proposed* | no |  |
| 167 | 310 | gear | item | 12 | 0 | Scarce | Tweezers *proposed* | no |  |
| 168 | 310 | gear | item | 960 | 0 | Scarce | Writing Kit *proposed* | no | quill, ink, blotter |

## Trade tools and workshops (p312)

Category `tools`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 169 | 312 | gear | item | 720 | 1 | Scarce | Trade Tools *proposed* | no | ONE row for all trades (apothecary, artisan variants, artist, engineer, herbalist, navigator, physician, smith and ~25 other trades share the price); a Trade test needs the matching kit: schema has no trade key, so either split into per-trade rows (~15) or keep generic |
| 170 | 312 | gear | item | 19200 | – | Rare | Workshop *proposed* | no | enc n/a (not carried); price 19200 p > tools band max 2400; BANDS: price 19200 outside 1-2400 |

## Books and documents (p311)

Category `books`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 171 | 311 | gear | item | 1920 | 1 | Scarce | Herbal Formulary *proposed* | no | contains recipes for three remedies (not expressible) |
| 172 | 311 | gear | item | 1200 | 1 | Scarce | Anthology of Verse *proposed* | no |  |
| 173 | 311 | gear | item | 1920 | 1 | Exotic | Cipher Codex *proposed* | no |  |
| 174 | 311 | gear | item | 720 | 1 | Scarce | Engineering Manual *proposed* | no |  |
| 175 | 311 | gear | item | 3600 | 1 | Rare | Statute Volume *proposed* | no |  |
| 176 | 311 | gear | item | 4800 | 1 | Exotic | Grimoire *proposed* | no | spell contents are not item data; carrying one may be a crime |
| 177 | 311 | gear | item | 3600 | 1 | Rare | Medical Treatise *proposed* | no |  |
| 178 | 311 | gear | item | 240 | 1 | Common | Devotional Book *proposed* | no |  |
| 179 | 311 | gear | item | – | 0 | n/a | Guild Licence *proposed* | no | NOT purchasable (granted); no price; recommend skip |
| 180 | 311 | gear | item | 12 | 0 | Common | Printed Leaflet *proposed* | no |  |
| 181 | 311 | gear | item | 36 | 0 | Common | Legal Document *proposed* | no |  |
| 182 | 311 | gear | item | 720 | 0 | Scarce | Map *proposed* | no |  |
| 183 | 311 | gear | item | 12 | 0 | Common | Parchment Sheet *proposed* | no |  |

## Animals and vehicles (p312)

Category `animals` for animals/vehicles (items, per decision 2B); tack, collar and bait use `trappings`. Capacity (carries) and combat profiles are not expressible (profiles belong to bestiary manifest C6).

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 184 | 312 | gear | item | 4800 | – | Common | Two-Wheel Cart *proposed* | no | VEHICLE; carries 25 enc; needs one driver and one draught animal |
| 185 | 312 | gear | item | 5 | 1 | Common | Hen *proposed* | no | animal as item: no profile; price 5 p < animals band min 60; BANDS: price 5 outside 60-14400 |
| 186 | 312 | gear | item | 36000 | – | Rare | Passenger Coach *proposed* | no | VEHICLE; carries 80; two drivers and four horses; price 36000 p > animals band max 14400; BANDS: price 36000 outside 60-14400 |
| 187 | 312 | gear | item | 480 | 6 | Scarce | Hide Coracle *proposed* | no | VEHICLE; carries 10; enc 6 > animals band max 1; BANDS: enc 6 outside 0-1 |
| 188 | 312 | gear | item | 144000 | – | Scarce | Heavy War Charger *proposed* | no | carries 20; price 144000 p > band 14400; combat statline belongs to bestiary (C6); BANDS: price 144000 outside 60-14400 |
| 189 | 312 | gear | item | 19 | 0 | Common | Dog Collar *proposed* | no | trappings (tack), not an animal; BANDS: price 19 outside 60-14400 |
| 190 | 312 | gear | item | 4800 | – | Common | Plough Horse *proposed* | no | carries 20 |
| 191 | 312 | gear | item | 12 | 1 | Scarce | Message Pigeon *proposed* | no | BANDS: price 12 outside 60-14400 |
| 192 | 312 | gear | item | 480 | – | Rare | Hound *proposed* | no | statline in bestiary |
| 193 | 312 | gear | item | 36000 | – | Common | Light Charger *proposed* | no | carries 18; price 36000 p > band max; BANDS: price 36000 outside 60-14400 |
| 194 | 312 | gear | item | 2400 | 2 | Rare | Pet Monkey *proposed* | no | carries 1; BANDS: enc 2 outside 0-1 |
| 195 | 312 | gear | item | 2400 | – | Common | Mule *proposed* | no | carries 14 |
| 196 | 312 | gear | item | 9600 | – | Common | Pony *proposed* | no | carries 14 |
| 197 | 312 | gear | item | 14400 | – | Common | Saddle Horse *proposed* | no | carries 16; price 14400 p = band max |
| 198 | 312 | gear | item | 54000 | – | Rare | Freight Barge *proposed* | no | VEHICLE; carries 300; price 54000 p > band max; BANDS: price 54000 outside 60-14400 |
| 199 | 312 | gear | item | 1440 | – | Scarce | Rowing Skiff *proposed* | no | VEHICLE; carries 60 |
| 200 | 312 | gear | item | 1440 | 4 | Common | Saddle and Tack *proposed* | no | trappings; enc 4 > trappings band max 3; BANDS: enc 4 outside 0-1 |
| 201 | 312 | gear | item | 18000 | – | Common | Four-Wheel Wagon *proposed* | no | VEHICLE; carries 30; price 18000 p > band max; BANDS: price 18000 outside 60-14400 |
| 202 | 312 | gear | item | 1 | 0 | Common | Bait Worms (6) *proposed* | no | trappings; sold as 6; BANDS: price 1 outside 60-14400 |

## Travel prices (p313)

SERVICES priced per mile/district/crossing; not goods. No category fits; recommend skip or `trappings` placeholders.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 203 | 313 | gear | item | 2 | – | – | Coach Seat Inside *proposed* | no | SERVICE, per mile; movement 6 |
| 204 | 313 | gear | item | 1 | – | – | Coach Seat Outside *proposed* | no | SERVICE, per mile; movement 6 |
| 205 | 313 | gear | item | 5 | – | – | Barge Cabin *proposed* | no | SERVICE, per mile; movement 8 |
| 206 | 313 | gear | item | 2 | – | – | Barge Deck *proposed* | no | SERVICE, per mile; movement 8 |
| 207 | 313 | gear | item | 3 | – | – | Cab Ride *proposed* | no | SERVICE, per district; movement 6 |
| 208 | 313 | gear | item | 6 | – | – | Ferry Crossing *proposed* | no | SERVICE, per crossing; movement 4 |

## Poisons (p313)

Category `poisons`. Poison effects live in the rules chapter (p155), not in this section.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 209 | 313 | gear | item | 5 | 0 | Scarce | Serpent Tuber *proposed* | no | poison effect lives in the rules chapter p155 (not in this section); BANDS: price 5 outside 6-4800 |
| 210 | 313 | gear | item | 72 | 0 | Exotic | Dusk Bloom Leaves *proposed* | no | leaf form of the two-form plant poison (sap row below); effect p155 |
| 211 | 313 | gear | item | 4800 | 0 | Exotic | Dusk Bloom Sap *proposed* | no | price 4800 p = band max |
| 212 | 313 | gear | item | 5 | 0 | Scarce | Fang Dust *proposed* | no | book name unreadable in the extract (OCR garble); verify on p313; BANDS: price 5 outside 6-4800 |
| 213 | 313 | gear | item | 48 | 0 | Exotic | Mine Gall *proposed* | no |  |
| 214 | 313 | gear | item | 12 | 0 | Rare | Pale Resin *proposed* | no | book name unreadable in the extract; verify on p313 |
| 215 | 313 | gear | item | 4 | 0 | Common | Vermin Bait *proposed* | no | price 4 p < band min 6; BANDS: price 4 outside 6-4800 |
| 216 | 313 | gear | item | 12 | 0 | Rare | Slumber Weed *proposed* | no |  |
| 217 | 313 | gear | item | 36 | 0 | Rare | Spider Venom Vial *proposed* | no |  |
| 218 | 313 | gear | item | 48 | 0 | Rare | Dreamroot *proposed* | no |  |

## Herbs and remedies (p314)

Category `herbs`. Quality-of-remedy table (quack / mild poison / medicine, p314) and doses are not expressible.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 219 | 314 | gear | item | 36 | 0 | Common | Gut Tonic *proposed* | no | +2 SL to recovery from stomach ailments (not expressible) |
| 220 | 314 | gear | item | 180 | 0 | Rare | Clotting Salve *proposed* | no | removes all bleeding; dose 1 per critical wound |
| 221 | 314 | gear | item | 144 | 0 | Common | Wound Poultice *proposed* | no | prevents infection effects |
| 222 | 314 | gear | item | 720 | 0 | Rare | Sleep Berry *proposed* | no | price 720 p > herbs band max 480; sleep effect on failed Endurance test; BANDS: price 720 outside 1-480 |
| 223 | 314 | gear | item | 24 | 0 | Common | Remedy (mild ailments) *proposed* | no | one row per symptom group (3 price tiers: 24/36/48 p); alleviates symptom 24 h |
| 224 | 314 | gear | item | 36 | 0 | Common | Remedy (common ailments) *proposed* | no | price tier 2 |
| 225 | 314 | gear | item | 48 | 0 | Common | Remedy (severe ailments) *proposed* | no | price tier 3 |
| 226 | 314 | gear | item | 144 | 0 | Common | Smelling Herb *proposed* | no | removes 1 stunned; dose 1 per encounter |
| 227 | 314 | gear | item | 216 | 0 | Scarce | Vigour Draught *proposed* | no | removes all fatigued |

## Prosthetics (p315)

Category `prosthetics`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 228 | 315 | gear | item | 6 | 0 | Common | Eyepatch *proposed* | no | price 6 p < prosthetics band min 60; BANDS: price 6 outside 60-4800 |
| 229 | 315 | gear | item | 240 | 0 | Rare | Glass Eye *proposed* | no |  |
| 230 | 315 | gear | item | 192 | 2 | Scarce | Peg Leg *proposed* | no | ignores 1 point of Move loss; XP option to buy back more (not expressible) |
| 231 | 315 | gear | item | 216 | 0 | Scarce | Prosthetic Nose *proposed* | no | ignores Fellowship loss from missing nose |
| 232 | 315 | gear | item | 40 | 1 | Common | Hand Hook *proposed* | no | price 40 p < band min 60; XP option for two-hand penalty; BANDS: price 40 outside 60-4800 |
| 233 | 315 | gear | item | 120 | 0 | Rare | Carved Dentures *proposed* | no | ignores tooth-loss penalties |

## Magical items (p315)

Category `magical`. All four are school-bound caster aids; their bonuses are not expressible.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 234 | 315 | gear | item | 3600 | 0 | Exotic | Attuned Staff *proposed* | no | bonus applies only to one magic school ("wind"-bound: template has no winds); effect not expressible |
| 235 | 315 | gear | item | 720 | 1 | Exotic | Practical Casting Robes *proposed* | no | school-bound bonus; effect not expressible; robes carry no AP so slot item (armour needs AP above 0) |
| 236 | 315 | gear | item | 2160 | 2 | Exotic | Standard Casting Robes *proposed* | no | school-bound bonus |
| 237 | 315 | gear | item | 6480 | 3 | Exotic | Elaborate Casting Robes *proposed* | no | school-bound bonus; enc 3 > magical band max 2; BANDS: enc 3 outside 0-2 |

## Miscellaneous trappings (p316)

Category `trappings`.

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 238 | 316 | gear | item | 5 | 0 | Common | Play Ball *proposed* | no |  |
| 239 | 316 | gear | item | 4 | 0 | Common | Bandage *proposed* | yes:bandages | price differs (12 p vs 4 p); removes 1 bleeding then consumed |
| 240 | 316 | gear | item | 12 | 0 | Common | Baton *proposed* | no |  |
| 241 | 316 | gear | item | 72 | 1 | Common | Bedroll *proposed* | yes:bedroll | price differs (12 p vs 72 p); +2 SL vs cold exposure when resting (not expressible) |
| 242 | 316 | gear | item | 8 | 0 | Common | Blanket *proposed* | no |  |
| 243 | 316 | gear | item | 12 | 0 | Common | Candle Dozen *proposed* | no | light radius 2 yd |
| 244 | 316 | gear | item | 96 | 1 | Common | Canvas Tarp *proposed* | no |  |
| 245 | 316 | gear | item | 10 | 0 | Common | Chalk *proposed* | no |  |
| 246 | 316 | gear | item | 10 | 0 | Common | Charcoal Stick *proposed* | no |  |
| 247 | 316 | gear | item | 42 | 0 | Common | Cutlery Set *proposed* | no |  |
| 248 | 316 | gear | item | 12 | 0 | Common | Card Deck *proposed* | no |  |
| 249 | 316 | gear | item | 96 | 1 | Common | Cooking Pot *proposed* | no |  |
| 250 | 316 | gear | item | 8 | 0 | Common | Cup *proposed* | no |  |
| 251 | 316 | gear | item | 10 | 0 | Common | Dice Set *proposed* | no |  |
| 252 | 316 | gear | item | 24 | 0 | Common | Doll *proposed* | no |  |
| 253 | 316 | gear | item | 480 | 1 | Rare | Mine Safety Lamp *proposed* | no | flares in explosive gas; setting-specific name replaced by a generic one |
| 254 | 316 | gear | item | 250 | 1 | Scarce | Grappling Hook *proposed* | no | price cell "1 GC -/10" read as 250 p |
| 255 | 316 | gear | item | 480 | 1 | Rare | Musical Instrument *proposed* | no | size variants (small half price) not expressible |
| 256 | 316 | gear | item | 24 | 0 | Common | Lamp Oil *proposed* | yes:lamp-oil | price differs (6 p vs 24 p); fuel durations not expressible |
| 257 | 316 | gear | item | 144 | 1 | Common | Lantern *proposed* | yes:lantern | price differs (60 p vs 144 p); light radius 10 yd |
| 258 | 316 | gear | item | 240 | 1 | Scarce | Shuttered Lantern *proposed* | no | directed 90-degree beam, 20 yd focused |
| 259 | 316 | gear | item | 1 | 0 | Common | Match *proposed* | no |  |
| 260 | 316 | gear | item | 90 | 1 | Common | Frying Pan *proposed* | no |  |
| 261 | 316 | gear | item | 40 | 0 | Scarce | Pipe and Tobacco *proposed* | no |  |
| 262 | 316 | gear | item | 12 | 2 | Common | Placard *proposed* | no |  |
| 263 | 316 | gear | item | 12 | 0 | Common | Plate *proposed* | no |  |
| 264 | 316 | gear | item | 12 | 0 | Common | Bowl *proposed* | no |  |
| 265 | 316 | gear | item | 1 | 0 | Common | Rags *proposed* | no |  |
| 266 | 316 | gear | item | 100 | 1 | Common | Rope (10 yards) *proposed* | yes:rope-10-yards | price differs (24 p vs 100 p) |
| 267 | 316 | gear | item | 720 | 2 | Scarce | Four-Person Tent *proposed* | no | small (2 people, half price, enc 1) and large (8 people, double price) variants not expressible |
| 268 | 316 | gear | item | 50 | 0 | Common | Tinderbox *proposed* | yes:tinderbox | price differs (12 p vs 50 p) |
| 269 | 316 | gear | item | 2 | 1 | Common | Rag Torch *proposed* | no | improvised weapon that ignites on a critical hit (not expressible) |

## Hirelings (p317)

SERVICES, not goods; prices in pence for three durations (quick/daily/weekly). Recommend skip (no artifact category).

| # | page | type | slot | price p | enc | avail | original name (proposed) | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 270 | 317 | gear | item | 5 | – | – | Local Scout (hire) *proposed* | no | SERVICE: quick job 5 p, daily 15 p, weekly 120 p |
| 271 | 317 | gear | item | 36 | – | – | Seasoned Mercenary (hire) *proposed* | no | SERVICE: quick 36 p, daily 108 p, weekly 864 p |
| 272 | 317 | gear | item | 36 | – | – | Lawyer (hire) *proposed* | no | SERVICE: quick 36 p, daily 108 p, weekly 864 p |
| 273 | 317 | gear | item | 12 | – | – | Porter (hire) *proposed* | no | SERVICE: quick 12 p, daily 36 p, weekly 288 p; carries 10 enc |
| 274 | 317 | gear | item | 24 | – | – | Scribe (hire) *proposed* | no | SERVICE: quick 24 p, daily 72 p, weekly 576 p |
| 275 | 317 | gear | item | 60 | – | – | Physician (hire) *proposed* | no | SERVICE: quick 60 p, daily 180 p, weekly 1200 p |

## Qualities and flaws

Engine = `systems/wfrp/rules/equipment/qualities.ts` registry (`implemented` flag) plus the code paths found by grep in `systems/wfrp/rules`. Class: `to-hit` (modifies attack/defence SL), `damage`, `crit`, `condition`, `ammo`, `encumbrance`, `area`, `armour`.

### Weapon qualities (p304-305)

| book quality | engine id | class | supported |
|---|---|---|---|
| Blackpowder | `blackpowder` | morale/psychology test on target + implied by group | yes (implied by groups blackpowder/engineering/explosives) |
| Blast (rating) | `blast` + value | area | yes |
| Damaging | `damaging` | damage (better of units die / SL) | yes (also implied by gunpowder groups) |
| Defensive | `defensive` | to-hit (defence +1 SL) | yes (canon) |
| Impale | `impale` | crit (crit on doubles/tens) | yes |
| Inflict (condition) | `inflict` + `condition` (+ `location`) | condition | yes; strength value (e.g. entangled 35/45/50) is not storable (value max 20, no strength field) |
| Magical | none on items (a `magical` flag exists only on unit/ability attack effects) | damage vs immune | NO as item quality; no book weapon in the consumer guide uses it (only generic text) |
| Parry | `parry` | to-hit (dual wield) | yes |
| Fast | `fast` | initiative +2 | yes |
| Hack | `hack` | armour damage | yes |
| Penetrating | `penetrating` | ignore 2 AP | yes |
| Pistol | `pistol` | melee-capable ranged | yes |
| Precise | `precise` | to-hit +1 SL | yes (listed under flaws in the extract; it is a quality) |
| Pummel | `pummel` | crit/stun on head hit | yes |
| Repeater (rating) | `repeater` + value | ammo | PARTIAL: registry implemented=false, but canon `extract-attacks.ts` reads it as ammo capacity |
| Trap Blade | `trapBlade` | to-hit/crit option (trap or break blade) | NO (implemented=false; no engine path) |
| Unbreakable | `unbreakable` | durability | NO (implemented=false); no consumer-guide row uses it |
| Wrap | `wrap` | to-hit (opposed -1 SL) | yes |
| Entangle (engine-side pseudo quality) | `entangle` | condition (entangled on hit) | yes, but no strength |

### Weapon flaws

| book flaw | engine id | class | supported |
|---|---|---|---|
| Dangerous | `dangerous` | fumble range | yes |
| Imprecise | `imprecise` | to-hit -1 SL | yes |
| Reload (rating) | `reload` + value + `ammoCapacity` | ammo/actions | yes |
| Unbalanced | `unbalanced` | to-hit (defence -1 SL) | yes |
| Undamaging | `undamaging` | damage (AP doubled, no minimum wound) | yes |

### Armour qualities and flaws (p306)

| book | engine id | class | supported |
|---|---|---|---|
| Flexible | `flexible` | armour layering | yes |
| Shield (rating) | `shield` + value | armour/defence | yes |
| Impenetrable | none | crit (odd crits ignored) | NO (not in registry; needed by 5 plate rows + heavy kit) |
| Partial | none | armour (even hit-location rolls ignore AP) | NO (needed by leather cowl, mail cowl, open sallet) |
| Weakpoints | none | crit (impale crits bypass AP) | NO (needed by 5 plate rows + heavy kit) |

### Item qualities and flaws (p297 region, craftsmanship)

| book | engine id | class | supported |
|---|---|---|---|
| Lightweight | `lightweight` | encumbrance -1 | yes |
| Bulky | `bulky` | encumbrance +1 | yes |
| Unreliable | `unreliable` | fumble range (96+) | yes |
| Practical | `practical` | item function | NO (implemented=false) |
| Durable, Fine | none | durability / price | NO (not in registry) |
| Shoddy, Ugly | none | price / social | NO (not in registry) |

Item quality rows (e.g. a fine/poor version of one item) are not in the consumer-guide tables; they are price/quality modifiers (fine = double price, poor = half, lodging p309), not separate rows.

## Gaps and open points for the owner

- Weapon groups `engineering`, `entangling`, `explosives` exist in the engine (`WEAPON_GROUPS`) but not in `GRIM_WEAPON_GROUPS`: 3 + 3 + 2 = 8 book rows need the validator to allow them.
- Price bands: book prices are ~4x template prices for weapons and 10-100x for exotic gear; either widen bands or scale (owner decision). Rows outside the bands are marked `BANDS:` per row.
- Ranges that depend on Strength Bonus (bolas, lasso, net, bomb, incendiary, javelin, rock, throwing hatchet/knife) cannot be a fixed `range`.
- Gear schema has no quantity/uses, effect, capacity, trade or availability fields; availability is not stored at all (all rows lose it unless added to `description`).
- Page-extract problems: `Crossbow Pistol` price reads "6 G" (assumed 6 GC); two poison names are garbled in the extract (rows marked). Rule text for poison effects is on p155 (outside this chapter file), weapon table row for `Grappling Hook` price read as 1 GC + 10 d.
- The extract merges the Unbalanced flaw text out of order and prints the Precise quality under flaws; this manifest uses the mechanical meaning.
- Setting-derived names were replaced by generic ones; proposals that still echo a book item type are the ones the owner should review first: Hand-and-Half Blade, Battle Greatblade, Marksman Rifle, Magazine Longarm, Multi-Shot Pistol, Mine Safety Lamp, Casting Robes, Dusk Bloom Leaves/Sap, Fang Dust.
