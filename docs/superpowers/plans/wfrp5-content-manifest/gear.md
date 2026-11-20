# Equipment manifest (C5): weapons, armour, shields, trappings

Source: `12-consumer-guide.md` tables (p301-317, read from `tables.json`; page numbers are the printed page of the table and were checked against the page footers: hand weapons p301, ammunition p302, ranged p303, armour and shields p307, packs and clothing p308, food p309, tools p310, books p311, animals and trade tools p312, poisons p313, remedies p314, prosthetics and magical p315, miscellaneous p316). The book has one table row per item; only numbers, groups and quality/flaw names are recorded. `original name` is proposed; plain English trade names (Hammer, Bucket, Cloak) are kept generic on purpose, setting-specific names are replaced. All names were checked against `scripts/templates/grim-d100/forbidden-terms.ts`.

## Legend

- Price: book price converted to pence (1 gold crown = 240 p, 1 shilling = 12 p, 1 penny = 1 p). `a->b*` means the book value `a` is outside the validator band and was clamped to `b`. Weight = book encumbrance (armour: enc when worn) with the same notation. Bands: `WEAPON_GROUP_BANDS`, `ARMOUR_KIND_BANDS`, `SHIELD_BAND`, `GEAR_CATEGORY_BANDS` in `scripts/templates/systems/wfrp/equipment.ts`.
- Rarity: book Common -> `common`, Scarce -> `uncommon`; Rare and Exotic -> `uncommon*` (validator allows only common/uncommon).
- Weapon group: `book -> template`. Book groups `engineering`, `entangling`, `explosives` are not in `GRIM_WEAPON_GROUPS`; they are remapped (engineering -> blackpowder, entangling and explosives -> throwing), flagged per row. `addSb` follows the band (bow/melee SB true, crossbow/sling/blackpowder false, throwing free).
- Damage: `SB+n` or `+n` (flat); `->` shows clamping to the group band. Reach uses the schema values (`personal`..`massive`); range in yards from the book converted to feet (x3) and clamped to the group range band; thrown weapons (SB-based range) need a flat range chosen in the data pass.
- Qualities/flaws are schema keys. Not expressible and to be dropped or noted: repeater, trapBlade (registry flags `implemented: false`); armour qualities partial/impenetrable/weakpoints and weapon quality magical are not in `QUALITY_REGISTRY`. `reload N` needs `ammoCapacity`.
- Armour slots: leg-only -> `boots`, head-only -> `helmet`, anything else without head -> `armor`. Shields are `gear` with exactly one `shield X` quality, X 1-3.
- Gear slots: `item` (or `cloak` for the two cloaks) with `systemStats.category` from `GEAR_CATEGORIES`; gear takes no qualities (carrying capacity of containers is not expressible).
- Template ammo is a plain gear row (`trappings`); the book's ammo damage/range notes are recorded in the notes column only.

## Counts

| Section | Rows |
|---|---|
| Melee weapons | 27 |
| Ranged weapons | 22 |
| Armour pieces and sets | 16 |
| Shields | 3 |
| Containers, vehicles, ammunition and general trappings | 60 |
| Clothing and accessories | 23 |
| Food, drink | 8 |
| Tools and kits | 41 |
| Books and documents | 12 |
| Animals | 12 |
| Poisons | 10 |
| Herbs and remedies | 9 |
| Prosthetics | 6 |
| Magical items | 4 |
| Total rows | 253 |

Template holds 56 rows; 47 map by equivalence (`yes:<key>`). Template-only rows with no book counterpart: hatchet, cudgel, flanged-mace, duelling-blade, maul, wicker-shield, quilted-coat, plate-harness, plate-sabatons.

## Issues

1. Row count is 253 against the ~290 target: the book's item tables hold 253 usable rows once rules-only entries and services are dropped (list below). The remaining ~35 would have to come from quality variants (fine/poor craftsmanship) or splitting sets, which the book does not list as separate items.
2. About 65 individual values (price, encumbrance, damage, AP, range) are outside the validator bands and clamped (marked with `*`). The worst gaps: vehicles, warhorses and coaches (prices up to 144000 p against an animal ceiling of 14400 p), full plate (book AP 5, enc 10), repeating and long firearms (band 2880 p) and the two-handed sword class. Consider widening the animals/trappings price bands or dropping vehicles.
3. Group and quality gaps: groups engineering/entangling/explosives remapped; repeater and trap blade qualities are not implemented; armour qualities partial/weakpoints/impenetrable and the magical weapon quality have no registry entry, so plate and helmets lose their distinguishing rules.
4. Quick armour sets (light/medium/heavy) cover the head in the book but the `armor` slot must leave head at 0; they are low priority duplicates of the piece-wise rows.
5. Duplicates inside the book tables: Net appears in the basic and the entangling list; Buckler appears as a parry weapon and as a shield; Knife appears as weapon and tool (the tool row is dropped). Both Net and Buckler rows are kept under different proposed names.
6. Ranged weapon range is given in yards in the book, template is in feet; thrown weapons use Strength Bonus based range and need a fixed foot value (12-60 ft band).
7. Prices depend on the book's gold-crown scale; the existing template prices (e.g. arming sword 240 p against book 960 p) already deviate, so the owner should decide whether to keep the book scale (needs wider bands) or the template scale (keep clamping).

## Rows dropped from the book tables

| page | reason |
|---|---|
| 301 | rules entry, no price (improvised weapon) |
| 301 | rules entry (unarmed) |
| 303 | rules entry, no price (rock) |
| 309 | service, not an item (room) |
| 309 | service, not an item (room) |
| 309 | service, not an item (stables) |
| 309 | service/drink price, not an item |
| 310 | duplicate of Utility Knife (weapon table) |
| 311 | not an item (guild licence, n/a) |
| 312 | not an item (workshop premises, 80 GC) |

Also not rows: hireling table (6 services, p317), transport fares (6 rows, p313), medicine-quality table (p314), range-band table (p302).

## Melee weapons (27)

| # | page | group (book -> tpl) | slot | price p (book->tpl) | enc (book->tpl) | rarity | reach / range | damage (SB+n) | qualities | flaws | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 301 | basic -> basic | weapon | 192 | 0 | common | reach very-short | SB+2 | - | - | Long Knife (proposed) | yes:long-knife |  |
| 2 | 301 | basic -> basic | weapon | 96 | 0 | common | reach very-short | SB+1 | - | undamaging | Utility Knife (proposed) | no |  |
| 3 | 301 | basic -> basic | weapon | 480 | 1 | common | reach average | SB+4 | - | unbalanced | Field Blade (proposed) | no |  |
| 4 | 301 | basic -> basic | weapon | 72 | 1 | common | reach short | +0->1* | defensive, inflict(Entangled 50) | - | Snare Net (proposed) | no |  |
| 5 | 301 | basic -> basic | weapon | 960->480* | 1 | common | reach average | SB+4 | - | - | Arming Sword (proposed) | yes:arming-sword |  |
| 6 | 301 | brawling -> brawling | weapon | 12 | 0 | uncommon* | reach personal | SB+2 | inflict(Entangled ) | undamaging | Cord Garrote (proposed) | no | book: two-handed |
| 7 | 301 | brawling -> brawling | weapon | 30 | 0 | common | reach personal | SB+2 | - | - | Knuckle Iron (proposed) | yes:knuckle-iron |  |
| 8 | 301 | cavalry -> cavalry | weapon | 960 | 3 | uncommon* | reach long | SB+5 | pummel | - | Mounted Maul (proposed) | no | book: two-handed |
| 9 | 301 | cavalry -> cavalry | weapon | 240->480* | 3 | uncommon* | reach very-long | SB+6 | damaging, impale | - | Lance (proposed) | yes:lance |  |
| 10 | 301 | fencing -> fencing | weapon | 240 | 1 | common | reach personal | SB+1->3* | parry | undamaging | Parry Disc (proposed) | no |  |
| 11 | 301 | fencing -> fencing | weapon | 1200->960* | 1 | uncommon | reach average | SB+3 | fast, impale, precise | undamaging | Needle Foil (proposed) | no |  |
| 12 | 301 | fencing -> fencing | weapon | 240 | 0 | uncommon | reach short | SB+2->3* | defensive, impale, parry | - | Parrying Dagger (proposed) | yes:parrying-dagger |  |
| 13 | 301 | fencing -> fencing | weapon | 1200->960* | 1 | uncommon | reach long | SB+4 | fast, impale | - | Rapier (proposed) | yes:rapier |  |
| 14 | 301 | fencing -> fencing | weapon | 270 | 0 | uncommon* | reach short | SB+1->3* | defensive, parry, trapBlade | - | Swordbreaker (proposed) | yes:swordbreaker | quality/flaw not expressible: trapBlade |
| 15 | 301 | flail -> flail | weapon | 480 | 1 | uncommon | reach average | SB+4 | pummel, wrap | unbalanced | Chain Flail (proposed) | yes:chain-flail |  |
| 16 | 301 | flail -> flail | weapon | 60->120* | 2 | common | reach long | SB+3 | pummel | imprecise | Threshing Flail (proposed) | no | book: two-handed |
| 17 | 301 | flail -> flail | weapon | 720 | 3 | uncommon* | reach long | SB+5 | damaging, pummel, wrap | unbalanced | Spiked Flail (proposed) | no | book: two-handed |
| 18 | 301 | flail -> flail | weapon | 60->120* | 1 | common | reach very-long | SB+2->3* | wrap | unbalanced, undamaging | Lash (proposed) | no |  |
| 19 | 301 | polearm -> polearm | weapon | 480 | 3 | common | reach long | SB+5 | defensive, hack, impale | - | Halberd (proposed) | yes:halberd | book: two-handed |
| 20 | 301 | polearm -> polearm | weapon | 216 | 4->3* | uncommon* | reach massive | SB+4 | impale | - | Phalanx Pike (proposed) | no | book: two-handed |
| 21 | 301 | polearm -> polearm | weapon | 36->120* | 2 | common | reach long | SB+3 | defensive, pummel | undamaging | Quarterstaff (proposed) | no | book: two-handed |
| 22 | 301 | polearm -> polearm | weapon | 180 | 2 | common | reach very-long | SB+4 | fast, impale | - | Spear (proposed) | yes:spear | book: two-handed |
| 23 | 301 | two handed -> twohanded | weapon | 2400->1440* | 2 | uncommon | reach long | SB+5 | damaging, defensive | - | Hand-and-a-Half Sword (proposed) | no | book: two-handed |
| 24 | 301 | two handed -> twohanded | weapon | 960 | 3 | uncommon | reach long | SB+6 | damaging, hack | unbalanced | Great Axe (proposed) | no | book: two-handed |
| 25 | 301 | two handed -> twohanded | weapon | 480 | 3 | common | reach long | SB+5 | damaging, penetrating | unbalanced | War Pick (proposed) | no | book: two-handed |
| 26 | 301 | two handed -> twohanded | weapon | 960 | 3 | uncommon | reach long | SB+6 | damaging, pummel | unbalanced | Great Hammer (proposed) | no | book: two-handed |
| 27 | 301 | two handed -> twohanded | weapon | 3840->1440* | 3 | uncommon | reach long | SB+5 | damaging, hack | - | Greatsword (proposed) | yes:greatsword | book: two-handed |

## Ranged weapons (22)

| # | page | group (book -> tpl) | slot | price p (book->tpl) | enc (book->tpl) | rarity | reach / range | damage (SB+n) | qualities | flaws | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 28 | 303 | blackpowder -> blackpowder | range_weapon | 2400 | 2 | uncommon | range 20 yd = 60 ft | +8 | blast(3) | dangerous, reload(3) | Scatter Gun (proposed) | no | book: two-handed; reload flaw needs ammoCapacity (book reload 3) |
| 29 | 303 | blackpowder -> blackpowder | range_weapon | 3840->2880* | 2 | uncommon | range 40 yd = 120 ft | +10 | - | reload(3) | Long Musket (proposed) | yes:long-musket | book: two-handed; reload flaw needs ammoCapacity (book reload 3) |
| 30 | 303 | blackpowder -> blackpowder | range_weapon | 4800->2880* | 0 | uncommon* | range 20 yd = 60 ft | +9 | pistol | reload(2) | Matchlock Pistol (proposed) | yes:matchlock-pistol | reload flaw needs ammoCapacity (book reload 2) |
| 31 | 303 | bow -> bow | range_weapon | 960 | 2 | common | range 50 yd = 150 ft | SB+4 | - | - | Hunting Bow (proposed) | yes:hunting-bow | book: two-handed |
| 32 | 303 | bow -> bow | range_weapon | 1920->960* | 3 | uncommon | range 60 yd = 180 ft | SB+4 | damaging | - | Longbow (proposed) | yes:longbow | book: two-handed |
| 33 | 303 | bow -> bow | range_weapon | 720 | 1 | common | range 40 yd = 120 ft | SB+3 | - | - | Short Bow (proposed) | no | book: two-handed |
| 34 | 303 | crossbow -> crossbow | range_weapon | 1200 | 2 | common | range 50 yd = 150 ft | +9 | - | reload(1) | Light Crossbow (proposed) | yes:light-crossbow | book: two-handed; reload flaw needs ammoCapacity (book reload 1) |
| 35 | 303 | crossbow -> crossbow | range_weapon | 1440 | 0->1* | uncommon* | range 20 yd = 60 ft->120* | +7 | pistol | reload(1) | Hand Crossbow (proposed) | no | reload flaw needs ammoCapacity (book reload 1) |
| 36 | 303 | crossbow -> crossbow | range_weapon | 1920->1440* | 3 | uncommon | range 60 yd = 180 ft | +10 | - | reload(2) | Heavy Crossbow (proposed) | yes:heavy-crossbow | book: two-handed; reload flaw needs ammoCapacity (book reload 2) |
| 37 | 303 | engineering -> blackpowder | range_weapon | 12000->2880* | 3 | uncommon* | range 40 yd = 120 ft | +10 | repeater(4) | dangerous, reload(5) | Revolving Musket (proposed) | no | book group "engineering" not allowed by validator, remapped to blackpowder; quality/flaw not expressible: repeater; book: two-handed; reload flaw needs ammoCapacity (book reload 5) |
| 38 | 303 | engineering -> blackpowder | range_weapon | 9600->2880* | 1 | uncommon* | range 20 yd = 60 ft | +9 | pistol, repeater(4) | dangerous, reload(4) | Revolving Pistol (proposed) | no | book group "engineering" not allowed by validator, remapped to blackpowder; quality/flaw not expressible: repeater; reload flaw needs ammoCapacity (book reload 4) |
| 39 | 303 | engineering -> blackpowder | range_weapon | 24000->2880* | 3 | uncommon* | range 100 yd = 300 ft | +10 | precise | reload(4) | Precision Rifle (proposed) | no | book group "engineering" not allowed by validator, remapped to blackpowder; book: two-handed; reload flaw needs ammoCapacity (book reload 4) |
| 40 | 303 | entangling -> throwing | range_weapon | 120 | 0 | uncommon* | range SB×3 (thrown, SB-based) | SB+0 | inflict(Entangled 35), inflict(Prone) | undamaging | Tangle Bolas (proposed) | no | book group "entangling" not allowed by validator, remapped to throwing; range from SB: propose 18-36 ft in band 12-60 |
| 41 | 303 | entangling -> throwing | range_weapon | 72 | 1 | common | range SBx2 (thrown, SB-based) | +0 | inflict(Entangled45) | - | Lasso (proposed) | no | book group "entangling" not allowed by validator, remapped to throwing; book: two-handed; range from SB: propose 18-36 ft in band 12-60 |
| 42 | 303 | entangling -> throwing | range_weapon | 72 | 1 | common | range SB (thrown, SB-based) | +0 | inflict(Entangled50) | - | Throwing Net (proposed) | no | book group "entangling" not allowed by validator, remapped to throwing; range from SB: propose 18-36 ft in band 12-60 |
| 43 | 303 | explosives -> throwing | range_weapon | 720->240* | 0 | uncommon* | range SB (thrown, SB-based) | +12->6* | blast(5), inflict(Deafened) | dangerous | Powder Bomb (proposed) | no | book group "explosives" not allowed by validator, remapped to throwing; range from SB: propose 18-36 ft in band 12-60 |
| 44 | 303 | explosives -> throwing | range_weapon | 240 | 0 | uncommon | range SB (thrown, SB-based) | +8->6* | blast(4), inflict(Ablaze) | dangerous | Pitch Bomb (proposed) | yes:pitch-bomb | book group "explosives" not allowed by validator, remapped to throwing; range from SB: propose 18-36 ft in band 12-60 |
| 45 | 303 | sling -> sling | range_weapon | 12 | 0 | common | range 40 yd = 120 ft | +6 | - | - | Sling (proposed) | yes:sling |  |
| 46 | 303 | sling -> sling | range_weapon | 48 | 2->1* | common | range 50 yd = 150 ft | +7 | - | - | Staff Sling (proposed) | no | book: two-handed |
| 47 | 303 | throwing -> throwing | range_weapon | 126 | 1 | uncommon | range SB×3 (thrown, SB-based) | SB+3 | impale | - | Javelin (proposed) | no | range from SB: propose 18-36 ft in band 12-60 |
| 48 | 303 | throwing -> throwing | range_weapon | 240 | 1 | uncommon | range SB×2 (thrown, SB-based) | SB+3 | hack | - | Throwing Axe (proposed) | no | range from SB: propose 18-36 ft in band 12-60 |
| 49 | 303 | throwing -> throwing | range_weapon | 216 | 0 | uncommon | range SB×2 (thrown, SB-based) | SB+2 | - | - | Throwing Knife (proposed) | yes:throwing-knife | range from SB: propose 18-36 ft in band 12-60 |

## Armour pieces and sets (16)

| # | page | kind | slot | price p (book->tpl) | enc worn (book->tpl) | rarity | AP by location | qualities | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 307 | soft | armor | 1920->360* | 0 | common | AP arm:1, body:1, leg:1 | - | Padded Set (proposed) | no | head dropped (armor slot must leave head 0); generic set, low priority |
| 51 | 307 | mail | armor | 10560->1440* | 4->3* | uncommon | AP arm:2, body:2, leg:2* (book 3) | flexible | Mail Set (proposed) | no | head dropped (armor slot must leave head 0); generic set, low priority; book penalty: –1 SL Stealth (not expressible) |
| 52 | 307 | plate | armor | 21120->4800* | 10->6* | uncommon* | AP arm:3, body:3, leg:3* (book 5) | - | Full Plate Set (proposed) | no | head dropped (armor slot must leave head 0); generic set, low priority; quality not expressible: (impenetrable), (weakpoints); book penalty: –2 SL Perception –2 SL Stealth (not expressible) |
| 53 | 307 | soft | helmet | 480->360* | 0 | common | AP head:1 | - | Leather Cap (proposed) | yes:leather-cap | quality not expressible: (partial) |
| 54 | 307 | soft | armor | 720->360* | 1 | common | AP arm:1, body:1 | - | Padded Jack (proposed) | yes:padded-jack |  |
| 55 | 307 | soft | armor | 600->360* | 1 | common | AP body:1 | - | Hide Jerkin (proposed) | no |  |
| 56 | 307 | soft | boots | 720->360* | 1 | common | AP leg:1 | - | Hide Leggings (proposed) | yes:hide-leggings |  |
| 57 | 307 | mail | boots | 2400->1440* | 3 | uncommon | AP leg:2 | flexible | Mail Chausses (proposed) | yes:mail-chausses |  |
| 58 | 307 | mail | armor | 4800->1440* | 3 | uncommon | AP arm:2, body:2 | flexible | Chain Hauberk (proposed) | yes:chain-hauberk |  |
| 59 | 307 | mail | helmet | 1440 | 1 | uncommon | AP head:2 | flexible | Mail Hood (proposed) | yes:mail-hood | quality not expressible: (partial) |
| 60 | 307 | mail | armor | 3840->1440* | 2 | common | AP body:2 | flexible | Ring Shirt (proposed) | yes:ring-shirt |  |
| 61 | 307 | plate | armor | 2880 | 2 | uncommon* | AP arm:2 | - | Plate Vambraces (proposed) | no | quality not expressible: (impenetrable), (weakpoints) |
| 62 | 307 | plate | armor | 3600 | 3 | uncommon | AP body:2 | - | Steel Breastplate (proposed) | yes:steel-breastplate | quality not expressible: (impenetrable), (weakpoints) |
| 63 | 307 | plate | helmet | 1200 | 2 | uncommon* | AP head:2 | - | Visored Helm (proposed) | yes:visored-helm | quality not expressible: (impenetrable), (weakpoints); book penalty: SLPerception (not expressible) |
| 64 | 307 | plate | helmet | 720 | 1 | common | AP head:2 | - | Open Helm (proposed) | no | quality not expressible: (partial) |
| 65 | 307 | plate | boots | 2880 | 3 | uncommon* | AP leg:2 | - | Plate Greaves (proposed) | no | quality not expressible: (impenetrable), (weakpoints) |

## Shields (3)

| # | page | kind | slot | price p (book->tpl) | enc (book->tpl) | rarity | shield X | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 66 | 307 | shield | shield | 240 | 1 | common | shield 1 |  Buckler (proposed) | yes:buckler |  |
| 67 | 307 | shield | shield | 480 | 2 | common | shield 2 |  Round Shield (proposed) | yes:round-shield |  |
| 68 | 307 | shield | shield | 720->480* | 3 | common | shield 3 |  Kite Shield (proposed) | yes:kite-shield |  |

## Containers, vehicles and general trappings (category `trappings`) (60)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 69 | 302 | ammo(blackpowderandengineering) | item | 39 | 0 | common | Powder and Shot (12) (proposed) | yes:powder-and-shot-12 | ammunition for blackpowderandengineering; book damage/range note: – / Asweapon; qualities: impale, penetrating; template ammo is a plain gear row |
| 70 | 302 | ammo(blackpowderandengineering) | item | 3 | 0 | common | Scrap Shot and Powder (proposed) | no | ammunition for blackpowderandengineering; book damage/range note: 1 – / Halfweapon; qualities: -; template ammo is a plain gear row |
| 71 | 302 | ammo(blackpowderandengineering) | item | 39 | 0 | common | Scatter Shot and Powder (12) (proposed) | no | ammunition for blackpowderandengineering; book damage/range note: – / Asweapon; qualities: blast(1); template ammo is a plain gear row |
| 72 | 302 | ammo(bow) | item | 60 | 0 | common | Arrows (12) (proposed) | yes:arrows-12 | ammunition for bow; book damage/range note: – / Asweapon; qualities: impale; template ammo is a plain gear row |
| 73 | 302 | ammo(bow) | item | 72 | 0 | uncommon* | Fine-Fletched Arrows (12) (proposed) | no | ammunition for bow; book damage/range note: – / +10; qualities: impale; template ammo is a plain gear row |
| 74 | 302 | ammo(crossbow) | item | 60 | 0 | common | Crossbow Bolts (12) (proposed) | yes:crossbow-bolts-12 | ammunition for crossbow; book damage/range note: – / Asweapon; qualities: impale; template ammo is a plain gear row |
| 75 | 302 | ammo(sling) | item | 4 | 0 | common | Lead Sling Bullets (12) (proposed) | no | ammunition for sling; book damage/range note: +1 / 10 -; qualities: pummel; template ammo is a plain gear row |
| 76 | 302 | ammo(sling) | item | 1 | 0 | common | Sling Stones (12) (proposed) | yes:sling-stones-20 | ammunition for sling; book damage/range note: – / Asweapon; qualities: pummel; template ammo is a plain gear row |
| 77 | 308 | trappings | item | 60 | 2 | common | Backpack (proposed) | yes:backpack | carries 4 enc (not expressible) |
| 78 | 308 | trappings | item | 96 | 6->3* | common | Barrel (proposed) | no | carries 12 enc (not expressible) |
| 79 | 308 | trappings | item | 36 | 2 | common | Cask (proposed) | no | carries 4 enc (not expressible) |
| 80 | 308 | trappings | item | 60 | 0 | common | Hip Flask (proposed) | no |  |
| 81 | 308 | trappings | item | 36 | 1 | common | Jug (proposed) | no | carries 1 enc (not expressible) |
| 82 | 308 | trappings | item | 84 | 0 | common | Tin Tankard (proposed) | no |  |
| 83 | 308 | trappings | item | 4 | 0 | common | Belt Pouch (proposed) | no | carries 1 enc (not expressible) |
| 84 | 308 | trappings | item | 12 | 2 | common | Sack (proposed) | no | carries 4 enc (not expressible) |
| 85 | 308 | trappings | item | 18 | 3 | common | Large Sack (proposed) | no | carries 6 enc (not expressible) |
| 86 | 308 | trappings | item | 216 | 4->3* | common | Saddlebags (proposed) | no | carries 8 enc (not expressible) |
| 87 | 308 | trappings | item | 12 | 1 | common | Shoulder Satchel (proposed) | no | carries 2 enc (not expressible) |
| 88 | 308 | trappings | item | 192 | 0 | uncommon | Map Tube (proposed) | no |  |
| 89 | 308 | trappings | item | 12 | 1 | common | Waterskin (proposed) | yes:waterskin | carries 1 enc (not expressible) |
| 90 | 312 | trappings | item | 4800 | – | common | Farm Cart (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 25 enc (not expressible) |
| 91 | 312 | trappings | item | 36000->4800* | – | uncommon* | Passenger Coach (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 80 enc (not expressible) |
| 92 | 312 | trappings | item | 480 | 6->3* | uncommon | Hide Coracle (proposed) | no | vehicle; carries 10 enc (not expressible) |
| 93 | 312 | trappings | item | 54000->4800* | – | uncommon* | River Barge (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 300 enc (not expressible) |
| 94 | 312 | trappings | item | 1440 | – | uncommon | Rowing Skiff (proposed) | no | book enc none (vehicle/animal/service): weight 0; vehicle; carries 60 enc (not expressible) |
| 95 | 312 | trappings | item | 1440 | 4->3* | common | Saddle and Tack (proposed) | no | saddle gear |
| 96 | 312 | trappings | item | 18000->4800* | – | common | Freight Wagon (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 30 enc (not expressible) |
| 97 | 316 | trappings | item | 5 | 0 | common | Ball (proposed) | no |  |
| 98 | 316 | trappings | item | 4 | 0 | common | Bandages (proposed) | yes:bandages |  |
| 99 | 316 | trappings | item | 12 | 0 | common | Baton (proposed) | no |  |
| 100 | 316 | trappings | item | 72 | 1 | common | Bedroll (proposed) | yes:bedroll |  |
| 101 | 316 | trappings | item | 8 | 0 | common | Blanket (proposed) | no |  |
| 102 | 316 | trappings | item | 12 | 0 | common | Candles (dozen) (proposed) | no |  |
| 103 | 316 | trappings | item | 96 | 1 | common | Canvas Tarp (proposed) | no |  |
| 104 | 316 | trappings | item | 10 | 0 | common | Chalk (proposed) | no |  |
| 105 | 316 | trappings | item | 10 | 0 | common | Charcoal Stick (proposed) | no |  |
| 106 | 316 | trappings | item | 42 | 0 | common | Cutlery (proposed) | no |  |
| 107 | 316 | trappings | item | 12 | 0 | common | Card Deck (proposed) | no |  |
| 108 | 316 | trappings | item | 96 | 1 | common | Cooking Pot (proposed) | no |  |
| 109 | 316 | trappings | item | 8 | 0 | common | Cup (proposed) | no |  |
| 110 | 316 | trappings | item | 10 | 0 | common | Bone Dice (proposed) | no |  |
| 111 | 316 | trappings | item | 24 | 0 | common | Doll (proposed) | no |  |
| 112 | 316 | trappings | item | 480 | 1 | uncommon* | Tinker's Lamp (proposed) | no |  |
| 113 | 316 | trappings | item | 480 | 1 | uncommon | Grappling Hook (proposed) | no |  |
| 114 | 316 | trappings | item | 480 | 1 | uncommon* | Travelling Instrument (proposed) | no |  |
| 115 | 316 | trappings | item | 24 | 0 | common | Lamp Oil (proposed) | yes:lamp-oil |  |
| 116 | 316 | trappings | item | 144 | 1 | common | Lantern (proposed) | yes:lantern |  |
| 117 | 316 | trappings | item | 240 | 1 | uncommon | Storm Lantern (proposed) | no |  |
| 118 | 316 | trappings | item | 1 | 0 | common | Match (proposed) | no |  |
| 119 | 316 | trappings | item | 90 | 1 | common | Frying Pan (proposed) | no |  |
| 120 | 316 | trappings | item | 40 | 0 | uncommon | Pipe and Tobacco (proposed) | no |  |
| 121 | 316 | trappings | item | 12 | 2 | common | Notice Board (proposed) | no |  |
| 122 | 316 | trappings | item | 12 | 0 | common | Plate (proposed) | no |  |
| 123 | 316 | trappings | item | 12 | 0 | common | Bowl (proposed) | no |  |
| 124 | 316 | trappings | item | 1 | 0 | common | Rags (proposed) | no |  |
| 125 | 316 | trappings | item | 100 | 1 | common | Rope (10 yards) (proposed) | yes:rope-10-yards |  |
| 126 | 316 | trappings | item | 720 | 2 | uncommon | Tent (proposed) | no |  |
| 127 | 316 | trappings | item | 50 | 0 | common | Tinderbox (proposed) | yes:tinderbox |  |
| 128 | 316 | trappings | item | 2 | 1 | common | Torch (proposed) | no |  |

## Clothing and accessories (category `clothing`) (23)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 129 | 308 | clothing | item | 2 | 0 | common | Charm Amulet (proposed) | no |  |
| 130 | 308 | clothing | item | 720 | 1 | common | Walking Boots (proposed) | no |  |
| 131 | 308 | clothing | cloak | 480 | 1 | common | Travel Cloak (proposed) | no |  |
| 132 | 308 | clothing | item | 720 | 1 | common | Common Clothes (proposed) | no |  |
| 133 | 308 | clothing | item | 720 | 1 | common | Winter Coat (proposed) | no |  |
| 134 | 308 | clothing | item | 240 | 1 | uncommon | Stage Costume (proposed) | no |  |
| 135 | 308 | clothing | item | 3840->2400* | 1 | uncommon | Court Finery (proposed) | no |  |
| 136 | 308 | clothing | item | 120 | 0 | common | Pale Powder (proposed) | no |  |
| 137 | 308 | clothing | item | 96 | 0 | common | Gloves (proposed) | no |  |
| 138 | 308 | clothing | cloak | 2880->2400* | 1 | uncommon* | Velvet Mantle (proposed) | no |  |
| 139 | 308 | clothing | item | 126 | 0 | common | Hat (proposed) | no |  |
| 140 | 308 | clothing | item | 60 | 0 | common | Hood or Mask (proposed) | no |  |
| 141 | 308 | clothing | item | var | 0 | common | Trinket Jewellery (proposed) | no | book price "varies": placeholder 240 p |
| 142 | 308 | clothing | item | 120 | 0 | common | Perfume (proposed) | no |  |
| 143 | 308 | clothing | item | 120 | 0 | uncommon | Brooch Pins (6) (proposed) | no |  |
| 144 | 308 | clothing | item | 80 | 0 | common | Holy Token (proposed) | no |  |
| 145 | 308 | clothing | item | 720 | 1 | common | Plain Robes (proposed) | no |  |
| 146 | 308 | clothing | item | 1920 | 1 | uncommon* | Ornate Rod (proposed) | no |  |
| 147 | 308 | clothing | item | 480 | 0 | common | Shoes (proposed) | no |  |
| 148 | 308 | clothing | item | 1200 | 0 | uncommon* | Seal Ring (proposed) | no |  |
| 149 | 308 | clothing | item | 48 | 0 | uncommon | Tattoo Session (proposed) | no |  |
| 150 | 308 | clothing | item | 480 | 1 | uncommon | Livery (proposed) | no |  |
| 151 | 308 | clothing | item | 720 | 1 | common | Walking Cane (proposed) | no |  |

## Food, drink (category `food`) (8)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 152 | 309 | food | item | 3 | 0 | common | Ale (pint) (proposed) | no |  |
| 153 | 309 | food | item | 36 | 2 | common | Ale Keg (proposed) | no |  |
| 154 | 309 | food | item | 9 | 0 | uncommon* | Deep-Forge Ale (pint) (proposed) | no |  |
| 155 | 309 | food | item | 10 | 1 | common | Groceries (day) (proposed) | no |  |
| 156 | 309 | food | item | 12 | 0 | common | Tavern Meal (proposed) | no |  |
| 157 | 309 | food | item | 24 | 0 | common | Rations (day) (proposed) | yes:trail-rations-week |  |
| 158 | 309 | food | item | 24 | 0 | common | Spirits (pint) (proposed) | no |  |
| 159 | 309 | food | item | 10 | 0 | common | Wine (bottle) (proposed) | no |  |

## Tools and kits (category `tools`) (41)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 160 | 310 | tools | item | 40 | 0 | uncommon | Abacus (proposed) | no |  |
| 161 | 310 | tools | item | 30 | 1 | common | Snare Trap (proposed) | no |  |
| 162 | 310 | tools | item | 720 | 0 | uncommon | Antitoxin Kit (proposed) | no |  |
| 163 | 310 | tools | item | 60 | 1 | common | Boat Hook (proposed) | no |  |
| 164 | 310 | tools | item | 10 | 2 | common | Broom (proposed) | no |  |
| 165 | 310 | tools | item | 30 | 1 | common | Bucket (proposed) | no |  |
| 166 | 310 | tools | item | 50 | 0 | common | Chisel (proposed) | no |  |
| 167 | 310 | tools | item | 10 | 0 | common | Comb (proposed) | no |  |
| 168 | 310 | tools | item | 30 | 1 | common | Crowbar (proposed) | yes:crowbar |  |
| 169 | 310 | tools | item | 36 | 2 | common | Crutch (proposed) | no |  |
| 170 | 310 | tools | item | 78 | 0 | uncommon | Disguise Kit (proposed) | no |  |
| 171 | 310 | tools | item | 24 | 0 | uncommon | Ear Pick (proposed) | no |  |
| 172 | 310 | tools | item | 12 | 0 | common | Fish Hooks (12) (proposed) | no |  |
| 173 | 310 | tools | item | 18 | 0 | common | Scrub Brush (proposed) | no |  |
| 174 | 310 | tools | item | 240 | 0 | uncommon | Gavel (proposed) | no |  |
| 175 | 310 | tools | item | 36 | 0 | common | Hammer (proposed) | no |  |
| 176 | 310 | tools | item | 258 | 0 | uncommon* | Hand Mirror (proposed) | no |  |
| 177 | 310 | tools | item | 48 | 2 | common | Hoe (proposed) | no |  |
| 178 | 310 | tools | item | 240 | 0 | common | Door Key (proposed) | no |  |
| 179 | 310 | tools | item | 480 | 0 | uncommon | Lockpicks (proposed) | yes:lockpicks |  |
| 180 | 310 | tools | item | 480 | 0 | uncommon | Manacles (proposed) | no |  |
| 181 | 310 | tools | item | 480 | 2 | uncommon | Jaw Trap (proposed) | no |  |
| 182 | 310 | tools | item | 12 | 2 | common | Mop (proposed) | no |  |
| 183 | 310 | tools | item | 2 | 0 | common | Nails (12) (proposed) | no |  |
| 184 | 310 | tools | item | 48 | 0 | common | Paint Brush (proposed) | no |  |
| 185 | 310 | tools | item | 168 | 0 | common | Mortar and Pestle (proposed) | no |  |
| 186 | 310 | tools | item | 480 | 1 | uncommon | Mining Pick (proposed) | no |  |
| 187 | 310 | tools | item | 60 | 3 | common | Ten-Foot Pole (proposed) | no |  |
| 188 | 310 | tools | item | 36 | 0 | common | Quill Pen (proposed) | no |  |
| 189 | 310 | tools | item | 54 | 2 | common | Rake (proposed) | no |  |
| 190 | 310 | tools | item | 720 | 0 | uncommon* | Magnifying Lens (proposed) | no |  |
| 191 | 310 | tools | item | 72 | 1 | common | Saw (proposed) | no |  |
| 192 | 310 | tools | item | 240 | 1 | common | Sickle (proposed) | no |  |
| 193 | 310 | tools | item | 96 | 2 | common | Spade (proposed) | no |  |
| 194 | 310 | tools | item | 12 | 0 | common | Iron Spike (proposed) | no |  |
| 195 | 310 | tools | item | 1200 | 0 | uncommon | Engraved Seal Stamp (proposed) | no |  |
| 196 | 310 | tools | item | 192 | 0 | common | Steel Tongs (proposed) | no |  |
| 197 | 310 | tools | item | 1200 | 0 | uncommon* | Spyglass (proposed) | no |  |
| 198 | 310 | tools | item | 12 | 0 | uncommon | Tweezers (proposed) | no |  |
| 199 | 310 | tools | item | 960 | 0 | uncommon | Scribe Kit (proposed) | no |  |
| 200 | 312 | tools | item | 720 | 1 | uncommon | Trade Tool Set (proposed) | no |  |

## Books and documents (category `books`) (12)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 201 | 311 | books | item | 1920 | 1 | uncommon | Herbalist Tome (proposed) | no |  |
| 202 | 311 | books | item | 1200 | 1 | uncommon | Painter Manual (proposed) | no |  |
| 203 | 311 | books | item | 1920 | 1 | uncommon* | Cipher Primer (proposed) | no |  |
| 204 | 311 | books | item | 720 | 1 | uncommon | Sapper Handbook (proposed) | no |  |
| 205 | 311 | books | item | 3600 | 1 | uncommon* | Statute Volume (proposed) | no |  |
| 206 | 311 | books | item | 4800 | 1 | uncommon* | Arcane Primer (proposed) | no |  |
| 207 | 311 | books | item | 3600 | 1 | uncommon* | Physician Codex (proposed) | no |  |
| 208 | 311 | books | item | 240 | 1 | common | Prayer Book (proposed) | no |  |
| 209 | 311 | books | item | 12 | 0 | common | Handbill (proposed) | no |  |
| 210 | 311 | books | item | 36 | 0 | common | Legal Deed (proposed) | no |  |
| 211 | 311 | books | item | 720 | 0 | uncommon | Regional Map (proposed) | no |  |
| 212 | 311 | books | item | 12 | 0 | common | Parchment Sheet (proposed) | no |  |

## Animals (category `animals`) (12)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 213 | 312 | animals | item | 5->60* | 1 | common | Hen (proposed) | no |  |
| 214 | 312 | animals | item | 144000->14400* | – | uncommon | Charger (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 20 enc (not expressible) |
| 215 | 312 | animals | item | 19->60* | 0 | common | Dog Collar (proposed) | no |  |
| 216 | 312 | animals | item | 4800 | – | common | Plough Horse (proposed) | no | book enc none (vehicle/animal/service): weight 0; carries 20 enc (not expressible) |
| 217 | 312 | animals | item | 12->60* | 1 | uncommon | Courier Pigeon (proposed) | no |  |
| 218 | 312 | animals | item | 480 | – | uncommon* | Hound (proposed) | no | book enc none (vehicle/animal/service): weight 0 |
| 219 | 312 | animals | item | 36000->14400* | – | common | Light Warhorse (proposed) | no | book enc none (vehicle/animal/service): weight 0; price/band mismatch: vehicle or warhorse, consider dropping; carries 18 enc (not expressible) |
| 220 | 312 | animals | item | 2400 | 2->1* | uncommon* | Trained Monkey (proposed) | no | carries 1 enc (not expressible) |
| 221 | 312 | animals | item | 2400 | – | common | Mule (proposed) | no | book enc none (vehicle/animal/service): weight 0; carries 14 enc (not expressible) |
| 222 | 312 | animals | item | 9600 | – | common | Pony (proposed) | no | book enc none (vehicle/animal/service): weight 0; carries 14 enc (not expressible) |
| 223 | 312 | animals | item | 14400 | – | common | Riding Horse (proposed) | no | book enc none (vehicle/animal/service): weight 0; carries 16 enc (not expressible) |
| 224 | 312 | animals | item | 1->60* | 0 | common | Bait Worms (6) (proposed) | no |  |

## Poisons (category `poisons`) (10)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 225 | 313 | poisons | item | 5->6* | 0 | uncommon | Viper Root (proposed) | no |  |
| 226 | 313 | poisons | item | 72 | 0 | uncommon* | Night Lotus Leaves (proposed) | no |  |
| 227 | 313 | poisons | item | 4800 | 0 | uncommon* | Night Lotus Sap (proposed) | no |  |
| 228 | 313 | poisons | item | 5->6* | 0 | uncommon | Hex Hand Fungus (proposed) | no |  |
| 229 | 313 | poisons | item | 48 | 0 | uncommon* | Deep Bile (proposed) | no |  |
| 230 | 313 | poisons | item | 12 | 0 | uncommon* | Gutter Resin (proposed) | no |  |
| 231 | 313 | poisons | item | 4->6* | 0 | common | Vermin Bane (proposed) | no |  |
| 232 | 313 | poisons | item | 12 | 0 | uncommon* | Slumber Herb (proposed) | no |  |
| 233 | 313 | poisons | item | 36 | 0 | uncommon* | Weaver Venom (proposed) | no |  |
| 234 | 313 | poisons | item | 48 | 0 | uncommon* | Mad Root (proposed) | no |  |

## Herbs and remedies (category `herbs`) (9)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 235 | 314 | herbs | item | 36 | 0 | common | Gut Tonic (proposed) | no |  |
| 236 | 314 | herbs | item | 180 | 0 | uncommon* | Pale Salve (proposed) | no |  |
| 237 | 314 | herbs | item | 144 | 0 | common | Healing Poultice (proposed) | no |  |
| 238 | 314 | herbs | item | 720->480* | 0 | uncommon* | Nightshade Extract (proposed) | no |  |
| 239 | 314 | herbs | item | 24 | 0 | common | Common Remedy (minor ailments) (proposed) | no |  |
| 240 | 314 | herbs | item | 36 | 0 | common | Common Remedy (cough and fever) (proposed) | no |  |
| 241 | 314 | herbs | item | 48 | 0 | common | Strong Remedy (buboes and gangrene) (proposed) | no |  |
| 242 | 314 | herbs | item | 144 | 0 | common | Bitter Salt-Herb (proposed) | no |  |
| 243 | 314 | herbs | item | 216 | 0 | uncommon | Vigour Draught (proposed) | no |  |

## Prosthetics (category `prosthetics`) (6)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 244 | 315 | prosthetics | item | 6->60* | 0 | common | Eyepatch (proposed) | no |  |
| 245 | 315 | prosthetics | item | 240 | 0 | uncommon* | Glass Eye (proposed) | no |  |
| 246 | 315 | prosthetics | item | 192 | 2 | uncommon | Wooden Leg (proposed) | no |  |
| 247 | 315 | prosthetics | item | 216 | 0 | uncommon | Gilded Nose Plate (proposed) | no |  |
| 248 | 315 | prosthetics | item | 40->60* | 1 | common | Iron Hook (proposed) | no |  |
| 249 | 315 | prosthetics | item | 120 | 0 | uncommon* | Wooden Teeth (proposed) | no |  |

## Magical items (category `magical`) (4)

| # | page | category | slot | price p (book->tpl) | enc (book->tpl) | rarity | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|
| 250 | 315 | magical | item | 3600 | 0 | uncommon* | Charged Staff (proposed) | no |  |
| 251 | 315 | magical | item | 720 | 1 | uncommon* | Practical Spellrobe (proposed) | no |  |
| 252 | 315 | magical | item | 2160 | 2 | uncommon* | Standard Spellrobe (proposed) | no |  |
| 253 | 315 | magical | item | 6480 | 3->2* | uncommon* | Grand Spellrobe (proposed) | no |  |
