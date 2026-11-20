# WFRP 5e skills manifest (45)

Source: `sections/04-skills-and-talents.md`, pages 110-113 (list and definitions), spot-checked against `pages/pNNN.md`. Target file: `systems/wfrp/rules/skills/catalog.ts` (`SKILL_CATALOG`, 40 rows today); skills are code, not template rows. Skill names are generic mechanic names (no IP risk), so the "original key" column is the proposed catalog key; i18n lives in `messages`. Specialisation names are listed only as counts/lists of generic words; IP-flavoured specialisations (colour winds, orders) must be replaced by the template own names.

Notation: characteristic keys follow `characteristics/keys` (ws bs s t i ag dex int wp fel). "kind" is basic/advanced; "grouped" means the book defines specialisations (catalog `spec`: none/fixed/open).

| # | p. | book name (ref) | char | kind (book) | grouped (book) | specialisations (book) | proposed catalog key | in catalog | catalog now (kind / spec / char) | delta to apply |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 111 | Animal Care | int | advanced | no | - | `animal-care` | yes | advanced / none / int | none |
| 2 | 111 | Climb | s | basic | no | - | `climb` | yes | basic / none / s | none |
| 3 | 111 | Consume Alcohol | t | basic | no | - | `drink` | yes | basic / none / t | none |
| 4 | 111 | Animal Training | int | advanced | yes | demigryph, dog, hawk, horse, pigeon (5) | `animal-training` | yes (added to working tree by C0, uncommitted) | advanced / none / int | add specialisations |
| 5 | 111 | Cool | wp | basic | no | - | `cool` | yes | basic / none / wp | none |
| 6 | 111 | Art | dex | basic | yes | drawing, engraving, mosaics, painting, sculpture, tattooing, weaving, writing (8) | `art` | yes | advanced / open / dex | kind advanced -> basic |
| 7 | 111 | Athletics | ag | basic | no | - | `athletics` | yes | basic / none / ag | none |
| 8 | 111 | Bribery | fel | basic | no | - | `bribery` | yes (added to working tree by C0, uncommitted) | basic / none / fel | none |
| 9 | 111 | Dodge | ag | basic | no | - | `dodge` | yes | basic / none / ag | none |
| 10 | 111 | Drive | ag | basic | no | - | `drive` | yes | basic / none / ag | none |
| 11 | 111 | Endurance | t | basic | no | - | `endurance` | yes | basic / none / t | none |
| 12 | 111 | Channelling | wp | advanced | yes | 10: eight colour winds + 2 generic (use the template own names) | `channelling` | yes | advanced / none / wp | add specialisations |
| 13 | 111 | Entertain | fel | basic | yes | acting, comedy, singing, storytelling (4) | `entertain` | yes | basic / none / fel | add specialisations |
| 14 | 111 | Charm | fel | basic | no | - | `charm` | yes | basic / none / fel | none |
| 15 | 111 | Evaluate | int | advanced | no | - | `evaluate` | yes | advanced / none / int | none |
| 16 | 111 | Charm Animal | wp | basic | no | - | `charm-animal` | yes (added to working tree by C0, uncommitted) | basic / none / wp | book basic (WP) |
| 17 | 112 | Gamble | int | basic | no | - | `gamble` | yes | basic / none / int | none |
| 18 | 112 | Gossip | fel | basic | no | - | `gossip` | yes | basic / none / fel | none |
| 19 | 112 | Haggle | fel | basic | no | - | `haggle` | yes | basic / none / fel | none |
| 20 | 112 | Intuition | i | basic | no | - | `intuition` | yes | basic / none / i | none |
| 21 | 112 | Language | int | advanced | yes | open (any language; per region) | `language` | yes | advanced / open / int | none |
| 22 | 112 | Leadership | fel | basic | no | - | `leadership` | yes | basic / none / fel | none |
| 23 | 112 | Heal | int | advanced | no | - | `heal` | yes | advanced / none / int | none |
| 24 | 112 | Lore | int | advanced | yes | engineering, geology, heraldry, history, law, local*, magic, metallurgy, science, theology (10, open) | `lore` | yes | advanced / open / int | none |
| 25 | 112 | Intimidate | s | basic | no | - | `intimidate` | yes | basic / none / s | none |
| 26 | 112 | Melee | ws | basic | yes | basic, brawling, cavalry, fencing, flail, polearm, two-handed (7) | `melee` | yes | advanced / fixed / ws | kind advanced -> basic; catalog has extra spec `parry` (book: 7 specs, no parry) |
| 27 | 112 | Navigation | i | basic | no | - | `navigation` | yes | basic / none / i | none |
| 28 | 112 | Outdoor Survival | int | basic | no | - | `survival` | yes | basic / none / int | none |
| 29 | 113 | Perception | i | basic | no | - | `perception` | yes | basic / none / i | none |
| 30 | 113 | Perform | ag | advanced | yes | acrobatics, clowning, dancing, firebreathing, juggling, miming, rope-walking (7) | `performance` | yes | advanced / open / ag | none |
| 31 | 113 | Pick Lock | dex | advanced | no | - | `lockpicking` | yes | advanced / none / dex | none |
| 32 | 113 | Play | dex | advanced | yes | bagpipe, lute, harpsichord, horn, violin (5) | `play` | yes (added to working tree by C0, uncommitted) | advanced / open / dex | none |
| 33 | 113 | Pray | fel | advanced | no | - | `pray` | yes | advanced / none / fel | none |
| 34 | 113 | Ranged | bs | advanced | yes | blackpowder, bow, crossbow, engineering, entangling, explosives, sling, throwing (8) | `ranged` | yes | advanced / fixed / bs | none |
| 35 | 113 | Research | int | advanced | no | - | `research` | yes | advanced / none / int | none |
| 36 | 113 | Ride | ag | basic | yes | demigryph, griffon, horse, pegasus (4) | `ride` | yes | basic / none / ag | add specialisations |
| 37 | 113 | Row | s | basic | no | - | `row` | yes | basic / none / s | none |
| 38 | 113 | Sail | ag | advanced | no | - | `sail` | yes (added to working tree by C0, uncommitted) | advanced / none / ag | none |
| 39 | 114 | Secret Signs | int | advanced | yes | order, guild (any one), ranger, scout, thief, vagabond (6) | `signs` | yes | advanced / none / i | char i -> int; add specialisations |
| 40 | 114 | Set Trap | dex | advanced | no | - | `traps` | yes | advanced / none / dex | none |
| 41 | 114 | Sleight of Hand | dex | advanced | no | - | `sleight-of-hand` | yes | advanced / none / dex | none |
| 42 | 114 | Stealth | ag | basic | yes | rural, underground, urban (3) | `stealth` | yes | basic / none / ag | add specialisations |
| 43 | 114 | Swim | s | advanced | no | - | `swim` | yes | basic / none / s | kind basic -> advanced |
| 44 | 114 | Track | i | advanced | no | - | `track` | yes | advanced / none / i | none |
| 45 | 114 | Trade | dex | advanced | yes | apothecary, calligrapher, chandler, carpenter, cook, embalmer, engineer, herbalist, shipwright, smith, tanner (11, open) | `trade` | yes | advanced / open / dex | none |

## Summary

- Present in the committed catalog (40 rows): 40; new relative to the committed catalog: 5 (animal-training, bribery, charm-animal, play, sail). Catalog rows with no book counterpart: none. NOTE: while this manifest was written, another session started package C0 and added the five new keys to `catalog.ts` in the working tree (uncommitted); rows below that say "added by C0" reflect that file, deltas are computed against it.
- Deltas worth deciding: Swim is advanced in the book (catalog basic); Art is basic grouped in the book (catalog advanced open); Secret Signs uses Int (catalog uses i); Entertain, Ride and Stealth are grouped (catalog none) and need specialisations if careers use `entertain:storytelling`, `ride:horse`, `stealth:rural|urban|underground`; Channelling is grouped by lore (catalog none).
- Careers in `careers.md` already reference these specialisations, for example entertain:storytelling, ride:horse, stealth:*, signs:*, lore:*, trade:*.
- The book lists Dodge, Drive, Endurance and the rest with plain definitions only; no per-skill tables other than the first characteristic table (p110) survive in the extract.
- Counts check: 45 skill headings found in the extract (basic and advanced, grouped flags as shown); matches the target of 45.
