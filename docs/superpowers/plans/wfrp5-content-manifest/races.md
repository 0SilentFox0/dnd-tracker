# Races manifest (C3): 5 species of the book

Source: extract `02-character-building.md` (species table and random talent table p23; species sections p26-35; class/career table p36-37; characteristic table p38) and `tables.json` pages 23, 36, 37, 38. Only numbers, structure and mechanical meaning are recorded; no book prose and no book species names (look up by `#` and `page`: 1 human, 2 dwarf, 3 halfling, 4 high elf, 5 wood elf; table row order of the book is human, halfling, dwarf, high elf, wood elf). All original names are `proposed`.

Conventions: talents by `#` of `talents.md`; `#n:spec` = talent with specialisation; `TBD-masked` = a forbidden-term or setting proper noun (language, enemy-group or province name) that needs an original replacement; skills by catalog key as in `careers.md` (`seamanship`/`instrument` are the `skills.md` proposed keys for the book's Sail/Play); `~` = book skill is grouped but catalog `spec: none` (entertain, stealth, ride). `mods` = delta from the base 20 (profile `mods` field: base value = 20 + mod, so the book rolls 2d10 + base; base values below). The profile schema (`systems/wfrp/rules/creation/schema.ts`) limits mods to -20..20, move 1-12, fate 0-9, extraWounds 0-3, randomTalentCount 0-5, tables ascending by `max` ending at 100.

Summary: 5 species, existing in template: 4 (lowlander, delver, hearthkin, veyl), 1 new. Characteristic base per species is one table row (p38); no species has extra wounds in the extract (extra wounds come from the Hardy talent, #67, where the species picks it); fate and fortune read from the species text; move, fate and fortune were read from each species section and checked against the p38 table headers.

Extract gaps and schema gaps:
1. The six talent choice pairs (two each) ("A or B") of dwarf, high elf and wood elf cannot be expressed by `profile.talents` (flat list); the generator or schema needs a choice field. Listed below under "choice".
2. The species table on p23 names pages 28 (halfling) and 30 (dwarf); the extract places dwarf on p28-29 and halfling on p30-31 (page markers in the file). Check the book.
3. Human random-talent count is 4 in the extract (fixed talent plus 4 random); verify p27.
4. Each species has hair/eye/age/height/name tables (not recorded: flavour data, not in profile).

## Species

| # | page | species | mods (delta from 20) | base (WS BS S T I Ag Dex Int WP Fel) | move | fate | fortune | extraWounds | fixed talents | choice talents | random talents | skill picks (count) | languages | original name | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 26-27 | human | none | 20 20 20 20 20 20 20 20 20 20 | 4 | 4 | 3 | 0 | #43 | - | 4 | 5 of 12 | language:TBD-masked x1 at +30 (6 advances) | Lowlander (proposed) | yes:lowlander | extract says 4 random talents (existing lowlander uses 3 and a different fixed talent); species table range 01-90; existing mods differ: none; existing random table has fewer entries than the shared 40-entry table |
| 2 | 28-29 | dwarf | ws +10, t +10, i -10, ag -10, dex +10, wp +20, fel -10 | 30 20 20 30 10 10 30 20 40 10 | 3 | 2 | 2 | 0 | #83, #91, #138 | #113 or #104; #106 or #150 | 0 | 5 of 11 | language:TBD-masked x2 at +30 each | Delver (proposed) | yes:delver | no random talents; two fixed-pair choices; optional animosity talent toward elves mentioned (page 28, psychology trait, not a talent row); species table range 95-98; the table on p23 lists the page as 30 but the extract places the section on p28-29; existing mods differ: i +0 vs canon -10; existing random table has fewer entries than the shared 40-entry table |
| 3 | 30-31 | halfling | ws -10, bs +10, s -10, t -10, i +20, dex +10, wp +10, fel +10 | 10 30 10 10 40 20 30 20 30 30 | 3 | 2 | 3 | 0 | #2:taste, #91, #105:TBD-masked | - | 2 | 5 of 11 | language:TBD-masked x2 at +30 each | Hearthkin (proposed) | yes:hearthkin | species table range 91-94; the table on p23 lists the page as 28 but the extract places the section on p30-31; existing mods differ: t +0 vs canon -10, i +0 vs canon +20, ag +10 vs canon +0; existing random table has fewer entries than the shared 40-entry table |
| 4 | 32-33 | high-elf | ws +10, bs +10, i +20, ag +10, dex +10, int +10, wp +10 | 30 30 20 20 40 30 30 30 30 20 | 5 | 1 | 2 | 0 | #2:sight, #91, #113 | #34 or #118; #123 or #129 | 0 | 5 of 11 | language:TBD-masked x2 at +30 each | Veyl (proposed) | yes:veyl | species table range 99; existing veyl is the single template elf and is matched to this species (the wood elf is the new fifth species); no random talents; existing mods differ: ws +0 vs canon +10, bs +0 vs canon +10, s -10 vs canon +0, t -10 vs canon +0; existing random table has fewer entries than the shared 40-entry table |
| 5 | 34-35 | wood-elf | ws +10, bs +10, i +20, ag +10, dex +10, int +10, wp +10 | 30 30 20 20 40 30 30 30 30 20 | 5 | 1 | 2 | 0 | #2:sight, #91, #116 | #67 or #123; #113 or #160 | 0 | 5 of 11 | language:TBD-masked x2 at +30 each | Thornkin (proposed) | no | species table range 00; characteristic row identical to the high elf (p38 table); the sidebar on two kinds of the people (p34) states they share this skill and talent list, only roleplay differs; no random talents |

Existing-species deviations from canon (shape): lowlander fixed talent is a non-canon original (canon is the doom talent plus 4 random, existing 3 random); delver has extraWounds 1 and 1 random talent (canon 0 and 0); hearthkin 2 random talents (canon 2, matches); veyl 1 random talent (canon 0); every existing race has its own 4-12 entry random table, canon is one shared 40-entry table; existing skill options and languages are original lists of 10 (canon lists 11-12 per species plus fixed languages).

## Skill picks (5 of N, +5 advance each; options as catalog keys)

| species # | options |
|---|---|
| 1 | animal-care, charm, cool, evaluate, gossip, haggle, language:TBD-masked, language:TBD-masked, leadership, lore:TBD-masked, melee:basic, ranged:bow |
| 2 | drink, cool, endurance, entertain:storytelling~, evaluate, intimidate, lore:own-kin, lore:geology, lore:metallurgy, melee:basic, trade:any |
| 3 | charm, drink, dodge, gamble, haggle, intuition, lore:TBD-masked, perception, sleight-of-hand, stealth:any~, trade:cook |
| 4 | cool, entertain:singing~, evaluate, leadership, melee:basic, navigation, perception, instrument:any, ranged:bow, seamanship, swim |
| 5 | athletics, climb, endurance, entertain:singing~, intimidate, melee:basic, survival, perception, ranged:bow, stealth:rural~, track |

## Species-linked talents (candidate kind `origin`)

Talents that appear in the fixed or choice lists above; `talents.md` marks all rows `general` because the extract does not mark species talents.

| talent # | species # |
|---|---|
| #2 | 3, 4, 5 |
| #34 | 4 |
| #43 | 1 |
| #67 | 5 |
| #83 | 2 |
| #91 | 2, 3, 4, 5 |
| #104 | 2 |
| #105 | 3 |
| #106 | 2 |
| #113 | 2, 4, 5 |
| #116 | 5 |
| #118 | 4 |
| #123 | 4, 5 |
| #129 | 4 |
| #138 | 2 |
| #150 | 2 |
| #160 | 5 |

## Random talents (shared table p23, 40 entries, d100)

One table for all species (human 4 rolls, halfling 2). Re-roll if a talent is already owned. `max` = upper bound of the range (profile `randomTalents[].max`).

| roll | max | talent |
|---|---|---|
| 01-02 | 2 | #2:sight |
| 03-05 | 5 | #5 |
| 06-07 | 7 | #9 |
| 08-10 | 10 | #10 |
| 11-12 | 12 | #19 |
| 13-15 | 15 | #20 |
| 16-17 | 17 | #23 |
| 18-20 | 20 | #34 |
| 21-22 | 22 | #33 |
| 23-25 | 25 | #56 |
| 26-27 | 27 | #65 |
| 28-30 | 30 | #72 |
| 31-32 | 32 | #78 |
| 33-35 | 35 | #79 |
| 36-37 | 37 | #85 |
| 38-40 | 40 | #90 |
| 41-42 | 42 | #91 |
| 43-45 | 45 | #92 |
| 46-47 | 47 | #93 |
| 48-50 | 50 | #94 |
| 51-52 | 52 | #100 |
| 53-55 | 55 | #97 |
| 56-57 | 57 | #107 |
| 58-60 | 60 | #113 |
| 61-62 | 62 | #105:poison |
| 63-65 | 65 | #116 |
| 66-67 | 67 | #118 |
| 68-70 | 70 | #121 |
| 71-72 | 72 | #126 |
| 73-75 | 75 | #135 |
| 76-77 | 77 | #144 |
| 78-80 | 80 | #138 |
| 81-82 | 82 | #139 |
| 83-85 | 85 | #140 |
| 86-87 | 87 | #146 |
| 88-90 | 90 | #152 |
| 91-92 | 92 | #158 |
| 93-95 | 95 | #160 |
| 96-97 | 97 | #161 |
| 98-100 | 100 | #154 |

## Career tables (class and career table p36-37, d100 per species)

One column per species; ranges tile 01-100 with no gaps for every species (verified). Rows sorted by roll for direct use as `careerTable` (`max` = upper bound). Career `#` and proposed name refer to `careers.md`; 00 counts as 100.

### Species 1 (human)

| roll | max | career # | class | original career name |
|---|---|---|---|---|
| 01-01 | 1 | 3 | Academic | Compounder (proposed) |
| 02-02 | 2 | 14 | Academic | Mechanician (proposed) |
| 03-03 | 3 | 27 | Academic | Advocate (proposed) |
| 04-05 | 5 | 33 | Academic | Cloister Sister (proposed) |
| 06-06 | 6 | 36 | Academic | Bonesetter (proposed) |
| 07-11 | 11 | 39 | Academic | Shrine Minister (proposed) |
| 12-13 | 13 | 47 | Academic | Archivist (proposed) |
| 14-14 | 14 | 63 | Academic | Arcanist (proposed) |
| 15-15 | 15 | 2 | Burgher | Firebrand (proposed) |
| 16-17 | 17 | 4 | Burgher | Craftwright (proposed) |
| 18-19 | 19 | 7 | Burgher | Alms Seeker (proposed) |
| 20-20 | 20 | 24 | Burgher | Case Seeker (proposed) |
| 21-21 | 21 | 28 | Burgher | Trade Factor (proposed) |
| 22-23 | 23 | 42 | Burgher | Vermin Warden (proposed) |
| 24-26 | 26 | 56 | Burgher | Burgess (proposed) |
| 27-27 | 27 | 60 | Burgher | Lantern Guard (proposed) |
| 28-28 | 28 | 1 | Courtier | Court Confidant (proposed) |
| 29-29 | 29 | 5 | Courtier | Limner (proposed) |
| 30-30 | 30 | 13 | Courtier | Blade Adept (proposed) |
| 31-31 | 31 | 16 | Courtier | Emissary (proposed) |
| 32-32 | 32 | 32 | Courtier | Landed Heir (proposed) |
| 33-35 | 35 | 49 | Courtier | Household Hand (proposed) |
| 36-36 | 36 | 53 | Courtier | Shadow Agent (proposed) |
| 37-37 | 37 | 58 | Courtier | Castellan (proposed) |
| 38-38 | 38 | 6 | Peasant | Tithe Marshal (proposed) |
| 39-39 | 39 | 21 | Peasant | Village Charmer (proposed) |
| 40-40 | 40 | 22 | Peasant | Ashburner (proposed) |
| 41-42 | 42 | 23 | Peasant | Falconer (proposed) |
| 43-43 | 43 | 30 | Peasant | Shaft Digger (proposed) |
| 44-44 | 44 | 31 | Peasant | Omen Reader (proposed) |
| 45-45 | 45 | 48 | Peasant | Pathfinder (proposed) |
| 46-50 | 50 | 57 | Peasant | Shepherd (proposed) |
| 51-51 | 51 | 9 | Ranger | Quarry Taker (proposed) |
| 52-52 | 52 | 12 | Ranger | Stage Driver (proposed) |
| 53-54 | 54 | 15 | Ranger | Showman (proposed) |
| 55-56 | 56 | 18 | Ranger | Scourge Pilgrim (proposed) |
| 57-57 | 57 | 29 | Ranger | Courier (proposed) |
| 58-58 | 58 | 35 | Ranger | Pack Trader (proposed) |
| 59-59 | 59 | 45 | Ranger | Highway Marshal (proposed) |
| 60-60 | 60 | 62 | Ranger | Inquisitor (proposed) |
| 61-62 | 62 | 8 | Riverfolk | Ferry Keeper (proposed) |
| 63-63 | 63 | 37 | Riverfolk | Channel Pilot (proposed) |
| 64-65 | 65 | 43 | Riverfolk | Water Patrol (proposed) |
| 66-68 | 68 | 44 | Riverfolk | Waterway Hand (proposed) |
| 69-70 | 70 | 46 | Riverfolk | Deckhand (proposed) |
| 71-71 | 71 | 51 | Riverfolk | Contraband Runner (proposed) |
| 72-73 | 73 | 54 | Riverfolk | Dock Porter (proposed) |
| 74-74 | 74 | 64 | Riverfolk | Shore Scavenger (proposed) |
| 75-75 | 75 | 11 | Rogue | Dicer (proposed) |
| 76-76 | 76 | 17 | Rogue | Goods Broker (proposed) |
| 77-77 | 77 | 19 | Rogue | Barrow Delver (proposed) |
| 78-79 | 79 | 25 | Rogue | Street Schemer (proposed) |
| 80-83 | 83 | 34 | Rogue | Highwayman (proposed) |
| 84-84 | 84 | 41 | Rogue | Gang Enforcer (proposed) |
| 85-87 | 87 | 55 | Rogue | Lockbreaker (proposed) |
| 88-88 | 88 | 61 | Rogue | Hex Caster (proposed) |
| 89-90 | 90 | 10 | Warrior | Mounted Lancer (proposed) |
| 91-92 | 92 | 20 | Warrior | Gatekeeper (proposed) |
| 93-93 | 93 | 26 | Warrior | Sworn Rider (proposed) |
| 94-94 | 94 | 38 | Warrior | Cage Brawler (proposed) |
| 95-95 | 95 | 40 | Warrior | Hired Fist (proposed) |
| 96-99 | 99 | 52 | Warrior | Sellsword (proposed) |
| 100-100 | 100 | 59 | Warrior | Holy Blade (proposed) |

Careers listed: 63 of 64.

### Species 2 (dwarf)

| roll | max | career # | class | original career name |
|---|---|---|---|---|
| 01-01 | 1 | 3 | Academic | Compounder (proposed) |
| 02-04 | 4 | 14 | Academic | Mechanician (proposed) |
| 05-06 | 6 | 27 | Academic | Advocate (proposed) |
| 07-07 | 7 | 36 | Academic | Bonesetter (proposed) |
| 08-09 | 9 | 47 | Academic | Archivist (proposed) |
| 10-11 | 11 | 2 | Burgher | Firebrand (proposed) |
| 12-17 | 17 | 4 | Burgher | Craftwright (proposed) |
| 18-18 | 18 | 7 | Burgher | Alms Seeker (proposed) |
| 19-20 | 20 | 24 | Burgher | Case Seeker (proposed) |
| 21-24 | 24 | 28 | Burgher | Trade Factor (proposed) |
| 25-25 | 25 | 42 | Burgher | Vermin Warden (proposed) |
| 26-31 | 31 | 56 | Burgher | Burgess (proposed) |
| 32-34 | 34 | 60 | Burgher | Lantern Guard (proposed) |
| 35-36 | 36 | 1 | Courtier | Court Confidant (proposed) |
| 37-37 | 37 | 5 | Courtier | Limner (proposed) |
| 38-38 | 38 | 13 | Courtier | Blade Adept (proposed) |
| 39-40 | 40 | 16 | Courtier | Emissary (proposed) |
| 41-41 | 41 | 32 | Courtier | Landed Heir (proposed) |
| 42-42 | 42 | 49 | Courtier | Household Hand (proposed) |
| 43-43 | 43 | 53 | Courtier | Shadow Agent (proposed) |
| 44-45 | 45 | 58 | Courtier | Castellan (proposed) |
| 46-47 | 47 | 6 | Peasant | Tithe Marshal (proposed) |
| 48-49 | 49 | 23 | Peasant | Falconer (proposed) |
| 50-54 | 54 | 30 | Peasant | Shaft Digger (proposed) |
| 55-55 | 55 | 48 | Peasant | Pathfinder (proposed) |
| 56-56 | 56 | 57 | Peasant | Shepherd (proposed) |
| 57-60 | 60 | 9 | Ranger | Quarry Taker (proposed) |
| 61-61 | 61 | 12 | Ranger | Stage Driver (proposed) |
| 62-63 | 63 | 15 | Ranger | Showman (proposed) |
| 64-65 | 65 | 29 | Ranger | Courier (proposed) |
| 66-67 | 67 | 35 | Ranger | Pack Trader (proposed) |
| 68-69 | 69 | 8 | Riverfolk | Ferry Keeper (proposed) |
| 70-70 | 70 | 37 | Riverfolk | Channel Pilot (proposed) |
| 71-72 | 72 | 44 | Riverfolk | Waterway Hand (proposed) |
| 73-73 | 73 | 46 | Riverfolk | Deckhand (proposed) |
| 74-75 | 75 | 51 | Riverfolk | Contraband Runner (proposed) |
| 76-77 | 77 | 54 | Riverfolk | Dock Porter (proposed) |
| 78-78 | 78 | 64 | Riverfolk | Shore Scavenger (proposed) |
| 79-79 | 79 | 17 | Rogue | Goods Broker (proposed) |
| 80-82 | 82 | 34 | Rogue | Highwayman (proposed) |
| 83-83 | 83 | 41 | Rogue | Gang Enforcer (proposed) |
| 84-84 | 84 | 55 | Rogue | Lockbreaker (proposed) |
| 85-87 | 87 | 20 | Warrior | Gatekeeper (proposed) |
| 88-90 | 90 | 38 | Warrior | Cage Brawler (proposed) |
| 91-93 | 93 | 40 | Warrior | Hired Fist (proposed) |
| 94-96 | 96 | 52 | Warrior | Sellsword (proposed) |
| 97-100 | 100 | 50 | Warrior | Death Vower (proposed) |

Careers listed: 47 of 64.

### Species 3 (halfling)

| roll | max | career # | class | original career name |
|---|---|---|---|---|
| 01-01 | 1 | 3 | Academic | Compounder (proposed) |
| 02-02 | 2 | 14 | Academic | Mechanician (proposed) |
| 03-04 | 4 | 27 | Academic | Advocate (proposed) |
| 05-06 | 6 | 36 | Academic | Bonesetter (proposed) |
| 07-08 | 8 | 47 | Academic | Archivist (proposed) |
| 09-10 | 10 | 2 | Burgher | Firebrand (proposed) |
| 11-15 | 15 | 4 | Burgher | Craftwright (proposed) |
| 16-19 | 19 | 7 | Burgher | Alms Seeker (proposed) |
| 20-21 | 21 | 24 | Burgher | Case Seeker (proposed) |
| 22-25 | 25 | 28 | Burgher | Trade Factor (proposed) |
| 26-28 | 28 | 42 | Burgher | Vermin Warden (proposed) |
| 29-31 | 31 | 56 | Burgher | Burgess (proposed) |
| 32-33 | 33 | 60 | Burgher | Lantern Guard (proposed) |
| 34-34 | 34 | 1 | Courtier | Court Confidant (proposed) |
| 35-36 | 36 | 5 | Courtier | Limner (proposed) |
| 37-37 | 37 | 16 | Courtier | Emissary (proposed) |
| 38-43 | 43 | 49 | Courtier | Household Hand (proposed) |
| 44-44 | 44 | 53 | Courtier | Shadow Agent (proposed) |
| 45-46 | 46 | 58 | Courtier | Castellan (proposed) |
| 47-47 | 47 | 6 | Peasant | Tithe Marshal (proposed) |
| 48-50 | 50 | 22 | Peasant | Ashburner (proposed) |
| 51-52 | 52 | 23 | Peasant | Falconer (proposed) |
| 53-53 | 53 | 30 | Peasant | Shaft Digger (proposed) |
| 54-54 | 54 | 48 | Peasant | Pathfinder (proposed) |
| 55-57 | 57 | 57 | Peasant | Shepherd (proposed) |
| 58-58 | 58 | 9 | Ranger | Quarry Taker (proposed) |
| 59-60 | 60 | 12 | Ranger | Stage Driver (proposed) |
| 61-63 | 63 | 15 | Ranger | Showman (proposed) |
| 64-65 | 65 | 29 | Ranger | Courier (proposed) |
| 66-67 | 67 | 35 | Ranger | Pack Trader (proposed) |
| 68-68 | 68 | 45 | Ranger | Highway Marshal (proposed) |
| 69-69 | 69 | 8 | Riverfolk | Ferry Keeper (proposed) |
| 70-70 | 70 | 37 | Riverfolk | Channel Pilot (proposed) |
| 71-71 | 71 | 43 | Riverfolk | Water Patrol (proposed) |
| 72-74 | 74 | 44 | Riverfolk | Waterway Hand (proposed) |
| 75-75 | 75 | 46 | Riverfolk | Deckhand (proposed) |
| 76-79 | 79 | 51 | Riverfolk | Contraband Runner (proposed) |
| 80-82 | 82 | 54 | Riverfolk | Dock Porter (proposed) |
| 83-83 | 83 | 11 | Rogue | Dicer (proposed) |
| 84-84 | 84 | 17 | Rogue | Goods Broker (proposed) |
| 85-85 | 85 | 19 | Rogue | Barrow Delver (proposed) |
| 86-88 | 88 | 25 | Rogue | Street Schemer (proposed) |
| 89-89 | 89 | 34 | Rogue | Highwayman (proposed) |
| 90-90 | 90 | 41 | Rogue | Gang Enforcer (proposed) |
| 91-94 | 94 | 55 | Rogue | Lockbreaker (proposed) |
| 95-96 | 96 | 20 | Warrior | Gatekeeper (proposed) |
| 97-97 | 97 | 38 | Warrior | Cage Brawler (proposed) |
| 98-100 | 100 | 52 | Warrior | Sellsword (proposed) |

Careers listed: 48 of 64.

### Species 4 (high-elf)

| roll | max | career # | class | original career name |
|---|---|---|---|---|
| 01-02 | 2 | 3 | Academic | Compounder (proposed) |
| 03-06 | 6 | 27 | Academic | Advocate (proposed) |
| 07-08 | 8 | 36 | Academic | Bonesetter (proposed) |
| 09-12 | 12 | 47 | Academic | Archivist (proposed) |
| 13-16 | 16 | 63 | Academic | Arcanist (proposed) |
| 17-19 | 19 | 4 | Burgher | Craftwright (proposed) |
| 20-21 | 21 | 24 | Burgher | Case Seeker (proposed) |
| 22-26 | 26 | 28 | Burgher | Trade Factor (proposed) |
| 27-28 | 28 | 56 | Burgher | Burgess (proposed) |
| 29-29 | 29 | 60 | Burgher | Lantern Guard (proposed) |
| 30-31 | 31 | 1 | Courtier | Court Confidant (proposed) |
| 32-32 | 32 | 5 | Courtier | Limner (proposed) |
| 33-34 | 34 | 13 | Courtier | Blade Adept (proposed) |
| 35-37 | 37 | 16 | Courtier | Emissary (proposed) |
| 38-40 | 40 | 32 | Courtier | Landed Heir (proposed) |
| 41-43 | 43 | 53 | Courtier | Shadow Agent (proposed) |
| 44-45 | 45 | 58 | Courtier | Castellan (proposed) |
| 46-47 | 47 | 22 | Peasant | Ashburner (proposed) |
| 48-50 | 50 | 23 | Peasant | Falconer (proposed) |
| 51-51 | 51 | 31 | Peasant | Omen Reader (proposed) |
| 52-56 | 56 | 48 | Peasant | Pathfinder (proposed) |
| 57-59 | 59 | 9 | Ranger | Quarry Taker (proposed) |
| 60-62 | 62 | 15 | Ranger | Showman (proposed) |
| 63-63 | 63 | 29 | Ranger | Courier (proposed) |
| 64-64 | 64 | 8 | Riverfolk | Ferry Keeper (proposed) |
| 65-79 | 79 | 46 | Riverfolk | Deckhand (proposed) |
| 80-80 | 80 | 51 | Riverfolk | Contraband Runner (proposed) |
| 81-83 | 83 | 11 | Rogue | Dicer (proposed) |
| 84-85 | 85 | 25 | Rogue | Street Schemer (proposed) |
| 86-88 | 88 | 34 | Rogue | Highwayman (proposed) |
| 89-92 | 92 | 10 | Warrior | Mounted Lancer (proposed) |
| 93-94 | 94 | 20 | Warrior | Gatekeeper (proposed) |
| 95-95 | 95 | 26 | Warrior | Sworn Rider (proposed) |
| 96-97 | 97 | 38 | Warrior | Cage Brawler (proposed) |
| 98-98 | 98 | 40 | Warrior | Hired Fist (proposed) |
| 99-100 | 100 | 52 | Warrior | Sellsword (proposed) |

Careers listed: 36 of 64.

### Species 5 (wood-elf)

| roll | max | career # | class | original career name |
|---|---|---|---|---|
| 01-01 | 1 | 47 | Academic | Archivist (proposed) |
| 02-05 | 5 | 63 | Academic | Arcanist (proposed) |
| 06-10 | 10 | 4 | Burgher | Craftwright (proposed) |
| 11-14 | 14 | 1 | Courtier | Court Confidant (proposed) |
| 15-18 | 18 | 5 | Courtier | Limner (proposed) |
| 19-25 | 25 | 16 | Courtier | Emissary (proposed) |
| 26-31 | 31 | 32 | Courtier | Landed Heir (proposed) |
| 32-35 | 35 | 53 | Courtier | Shadow Agent (proposed) |
| 36-42 | 42 | 22 | Peasant | Ashburner (proposed) |
| 43-52 | 52 | 23 | Peasant | Falconer (proposed) |
| 53-57 | 57 | 31 | Peasant | Omen Reader (proposed) |
| 58-68 | 68 | 48 | Peasant | Pathfinder (proposed) |
| 69-70 | 70 | 9 | Ranger | Quarry Taker (proposed) |
| 71-75 | 75 | 15 | Ranger | Showman (proposed) |
| 76-78 | 78 | 29 | Ranger | Courier (proposed) |
| 79-79 | 79 | 64 | Riverfolk | Shore Scavenger (proposed) |
| 80-85 | 85 | 34 | Rogue | Highwayman (proposed) |
| 86-90 | 90 | 10 | Warrior | Mounted Lancer (proposed) |
| 91-92 | 92 | 20 | Warrior | Gatekeeper (proposed) |
| 93-94 | 94 | 26 | Warrior | Sworn Rider (proposed) |
| 95-96 | 96 | 38 | Warrior | Cage Brawler (proposed) |
| 97-100 | 100 | 52 | Warrior | Sellsword (proposed) |

Careers listed: 22 of 64.

