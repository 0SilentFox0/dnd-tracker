# Careers manifest (C2): 64 careers of the book, 8 classes x 8

Source: extract `03-class-and-careers.md` pages 43-108 (one career per page, pages 45-108 in the book's alphabetical order; career `#` = page - 44) and `tables.json` pages 36-37 (class and career list). Only structure, numbers and mechanical meaning are recorded; no book prose, and book names are not stored (look up by `#` and `page`). All original names are `proposed`.

Conventions:
- skills: catalog key from `skills.md` (= `systems/wfrp/rules/skills/catalog.ts`; all 256 tier rows verified against it). `key:spec`; `spec:any` = player's choice at creation; `a/b` = choice between specs; `x or y` = choice between skills; trailing `*` on a skill = Income skill (bold-italic in the book; tier 1 only, exactly one per career); trailing `!` = spec not in the catalog fixed list (melee/ranged); trailing `~` = book skill is grouped but the catalog has `spec: none` (entertain, stealth, ride; the `careerSkillIssue` validator rejects these until the catalog is fixed); `TBD-masked` = spec is a forbidden-term or setting proper noun (language, wind, deity or group name); an original replacement is needed (owner/language manifest).
- talents: `#` of `talents.md` (rows are in the book heading order, verified by heading list: 166 headings); `#n:spec` = talent with a specialisation; spec rules as for skills.
- trappings: only the number of listed trapping entries (an `or` alternative counts once).
- status: tier status as `Brass|Silver|Gold N`.
- characteristics: the book prints an advance scheme (3 marked for tier 1, then 1 more for each of tiers 2, 3, 4). The extract keeps only the three tier-1 marks, and only where the table has ten clean columns; the tier 2-4 marks are not in the extract at all.

## Summary

Summary: 64 careers, 256 tiers (4 each), 8 classes with 8 careers each; tier shape in the extract is 10/6/4/2 skills and 4 talents per tier for every tier except Scout tier 2 (7 skills). Exactly one Income skill per career (tier 1). Existing careers in the template: 16 (all original, 2 per class), 10 flagged as approximate equivalents below, 6 unmatched (chandler, lamplighter, crier, masquer, eel-fisher, shieldbearer: keep as extras or retire).

Extract gaps (owner must scan):
1. Characteristics: RESOLVED 2026-11-20 from the PDF scan (`scan-careers-*.md`, pages 45-108); the table column lists the 3 tier-1 marks and the new mark per tier 2-4.
2. Tier 1 skills of #20 (page 64) come from garbled table-cell fragments and #28 (page 72) tier 1 header was inside a table; check both pages.
3. Per-tier `Trappings` are only counted; the owner picks the template trappings.
4. Income marker for #60 (page 104) sat on its own heading line in the extract; read from there.

Existing-career equivalence: `yes:<slug>` where at least 4 of the 5 tier-1 skills of the existing career occur in the canon tier 1 of the career with the same theme (checked in the table below); statuses, characteristic picks and talent counts deviate for all of them.

| # | page | class | status tiers (t1/t2/t3/t4) | characteristics | skills (t1/t2/t3/t4) | talents (t1..t4) | trappings (t1..t4) | income | original name | tier names | in template | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 45 | Courtier | Silver 1/Silver 3/Silver 5/Gold 3 | t1 Dex, Int, Fel; t2 I; t3 WP; t4 Ag | 10/6/4/2 | 4/4/4/4 | 1/1/2/3 | lore:politics* | Court Confidant (proposed) | Attache > Confidant > Privy Voice > Keeper of the Seal | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 2 | 46 | Burgher | Brass 1/Brass 2/Brass 3/Brass 5 | t1 Ag, Int, Fel; t2 I; t3 WS; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/2/2/4 | charm* | Firebrand (proposed) | Handbill Runner > Firebrand > Crowd Stirrer > Voice of the Cause | no | spec on skill with catalog spec none |
| 3 | 47 | Academic | Brass 3/Silver 1/Silver 3/Gold 1 | t1 I, Dex, Int; t2 Fel; t3 T; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/2/3/2 | trade:apothecary* | Compounder (proposed) | Mortar Boy > Compounder > Master Compounder > Dean of Remedies | no | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none |
| 4 | 48 | Burgher | Brass 2/Silver 1/Silver 3/Gold 1 | t1 S, T, Dex; t2 Fel; t3 Int; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/2/2/2 | trade:any* | Craftwright (proposed) | Bench Apprentice > Craftwright > Master Wright > Guild Warden | no | masked spec (forbidden/setting term): original name needed; masked talent spec |
| 5 | 49 | Courtier | Brass 2/Silver 1/Silver 4/Gold 2 | t1 S, I, Dex; t2 Fel; t3 Int; t4 WP | 10/6/4/2 | 4/4/4/4 | 1/1/3/3 | art:any* | Limner (proposed) | Sketch Pupil > Limner > Master Limner > Laureate | no | spec on skill with catalog spec none |
| 6 | 50 | Peasant | Silver 1/Silver 5/Gold 1/Gold 2 | t1 WS, S, I; t2 Fel; t3 WP; t4 Int | 10/6/4/2 | 4/4/4/4 | 2/2/3/3 | intimidate* | Tithe Marshal (proposed) | Dues Clerk > Tithe Marshal > Shire Arbiter > High Arbiter | no | spec on skill with catalog spec none |
| 7 | 51 | Burgher | Brass 0/Brass 1/Brass 4/Silver 2 | t1 T, Ag, Fel; t2 I; t3 WP; t4 WS | 10/6/4/2 | 4/4/4/4 | 2/2/3/2 | charm* | Alms Seeker (proposed) | Gutter Waif > Alms Seeker > Doorstep Veteran > Lord of the Lane | no | spec on skill with catalog spec none; Brass 0 status as read from extract |
| 8 | 52 | Riverfolk | Brass 3/Silver 1/Silver 2/Silver 5 | t1 S, T, Ag; t2 I; t3 Dex; t4 Int | 10/6/4/2 | 4/4/4/4 | 3/2/3/2 | sail* | Ferry Keeper (proposed) | Rope Hand > Ferry Keeper > Crossing Master > Lord of the Ford | yes:ferry-keeper | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 9 | 53 | Ranger | Silver 1/Silver 3/Silver 5/Gold 1 | t1 WS, S, Ag; t2 BS; t3 T; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/5/2/2 | melee:basic* | Quarry Taker (proposed) | Warrant Runner > Quarry Taker > Master Taker > Warrant Marshal | no | spec on skill with catalog spec none |
| 10 | 54 | Warrior | Silver 3/Silver 4/Gold 1/Gold 2 | t1 WS, BS, Ag; t2 S; t3 I; t4 Fel | 10/6/4/2 | 4/4/4/4 | 3/2/1/2 | ride:horse* | Mounted Lancer (proposed) | Troop Rider > Lancer > Banner Rider > Squadron Captain | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 11 | 55 | Rogue | Brass 3/Brass 5/Silver 2/Silver 4 | t1 I, Dex, Fel; t2 Int; t3 Ag; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/4/2/2 | charm* | Dicer (proposed) | Dice Runner > Dicer > Table Fox > Lord of Chances | yes:dicer | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 12 | 56 | Ranger | Silver 1/Silver 2/Silver 3/Gold 2 | t1 T, Ag, WP; t2 BS; t3 I; t4 Fel | 10/6/4/2 | 4/4/4/4 | 4/2/2/2 | drive* | Stage Driver (proposed) | Wheel Boy > Stage Driver > Road Master > Line Superintendent | no | spec on skill with catalog spec none |
| 13 | 57 | Courtier | Silver 3/Silver 4/Gold 1/Gold 2 | t1 WS, I, Ag; t2 BS; t3 S; t4 WP | 10/6/4/2 | 4/4/4/4 | 2/2/4/1 | melee:any* | Blade Adept (proposed) | Salle Novice > Rapier Adept > Blade Master > Arena Champion | no | spec on skill with catalog spec none |
| 14 | 58 | Academic | Brass 4/Silver 3/Silver 5/Gold 2 | t1 S, Dex, Int; t2 BS; t3 I; t4 WP | 10/6/4/2 | 4/4/4/4 | 2/2/1/3 | trade:engineer* | Mechanician (proposed) | Workshop Pupil > Mechanician > Master Mechanician > Chief of Works | no | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none |
| 15 | 59 | Ranger | Brass 3/Brass 5/Silver 3/Gold 1 | t1 Ag, Dex, Fel; t2 WS; t3 BS; t4 T | 10/6/4/2 | 4/4/4/4 | 2/3/2/3 | entertain:any* | Showman (proposed) | Street Act > Showman > Headliner > Company Master | no | spec on skill with catalog spec none |
| 16 | 60 | Courtier | Silver 2/Silver 4/Gold 2/Gold 5 | t1 T, Int, Fel; t2 I; t3 WP; t4 Dex | 10/6/4/2 | 4/4/4/4 | 3/2/3/3 | charm* | Emissary (proposed) | Dispatch Bearer > Emissary > Plenipotentiary > Grand Legate | no | spec on skill with catalog spec none |
| 17 | 61 | Rogue | Brass 5/Silver 1/Silver 3/Gold 1 | t1 I, Int, Fel; t2 Dex; t3 WP; t4 WS | 10/6/4/2 | 4/4/4/4 | 2/3/2/3 | evaluate* | Goods Broker (proposed) | Hawker of Odds > Goods Broker > Cache Master > Shadow Merchant | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 18 | 62 | Ranger | Brass 0/Brass 0/Brass 0/Brass 0 | t1 WS, T, WP; t2 S; t3 Ag; t4 Fel | 10/6/4/2 | 4/4/4/4 | 2/2/1/2 | melee:flail* | Scourge Pilgrim (proposed) | Humbled Walker > Scourge Pilgrim > Fervent Voice > Herald of the End | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none; Brass 0 status as read from extract |
| 19 | 63 | Rogue | Brass 2/Brass 4/Silver 3/Silver 5 | t1 S, I, Ag; t2 Dex; t3 WP; t4 WS | 10/6/4/2 | 4/4/4/4 | 4/6/4/5 | stealth:any* | Barrow Delver (proposed) | Petty Digger > Barrow Delver > Crypt Raider > Relic Seeker | no | spec on skill with catalog spec none |
| 20 | 64 | Warrior | Brass 5/Silver 2/Silver 4/Gold 1 | t1 WS, S, I; t2 T; t3 WP; t4 Ag | 10/6/4/2 | 4/4/4/4 | 3/4/3/2 | perception* | Gatekeeper (proposed) | Post Sentry > Gatekeeper > Household Guard > Guard Commandant | no | t1 skills reconstructed from table-cell fragments (10 skills found, income = last), verify against page; masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 21 | 65 | Peasant | Brass 1/Brass 4/Brass 5/Silver 2 | t1 I, Dex, Int; t2 WP; t3 Fel; t4 Ag | 10/6/4/2 | 4/4/4/4 | 3/2/2/2 | lore:folklore* | Village Charmer (proposed) | Charm Apprentice > Village Charmer > Lore Mother > Circle Elder | no | masked spec (forbidden/setting term): original name needed |
| 22 | 66 | Peasant | Brass 1/Brass 4/Brass 5/Silver 2 | t1 Ag, Dex, Int; t2 T; t3 I; t4 Fel | 10/6/4/2 | 4/4/4/4 | 4/1/3/2 | trade:herbalist* | Ashburner (proposed) | Kiln Hand > Ashburner > Forest Collier > Master Collier | yes:ashburner | approx equivalence: 5/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 23 | 67 | Peasant | Brass 2/Brass 4/Silver 1/Silver 4 | t1 I, Ag, Int; t2 BS; t3 T; t4 WP | 10/6/4/2 | 4/4/4/4 | 3/3/3/2 | survival* | Falconer (proposed) | Mews Hand > Falconer > Austringer > Master of Hawks | yes:falconer | spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1; existing class Ranger, canon Peasant |
| 24 | 68 | Burgher | Silver 1/Silver 2/Silver 3/Silver 5 | t1 I, Ag, Fel; t2 Int; t3 WP; t4 Dex | 10/6/4/2 | 4/4/4/4 | 4/4/2/2 | perception* | Case Seeker (proposed) | Tip Gatherer > Case Seeker > Inquest Agent > Chief Inquirer | no | spec on skill with catalog spec none |
| 25 | 69 | Rogue | Brass 2/Brass 3/Silver 1/Silver 3 | t1 I, Int, Fel; t2 Ag; t3 WS; t4 WP | 10/6/4/2 | 4/4/4/4 | 1/2/1/2 | charm* | Street Schemer (proposed) | Hanger-On > Street Schemer > Procurement Agent > Syndicate Head | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 26 | 70 | Warrior | Silver 3/Silver 5/Gold 2/Gold 4 | t1 WS, S, Ag; t2 T; t3 WP; t4 Fel | 10/6/4/2 | 4/4/4/4 | 5/5/2/3 | melee:cavalry* | Sworn Rider (proposed) | Page Squire > Sworn Knight > Banner Knight > Order Marshal | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 27 | 71 | Academic | Brass 4/Silver 3/Gold 1/Gold 2 | t1 I, Int, Fel; t2 WP; t3 Dex; t4 T | 10/6/4/2 | 4/4/4/4 | 2/3/2/2 | lore:law* | Advocate (proposed) | Law Clerk > Advocate > Senior Counsel > Presiding Magistrate | no | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none |
| 28 | 72 | Burgher | Silver 2/Silver 5/Gold 1/Gold 3 | t1 Ag, Int, Fel; t2 WP; t3 I; t4 WS | 10/6/4/2 | 4/4/4/4 | 4/3/3/5 | haggle* | Trade Factor (proposed) | Stall Hand > Trade Factor > Master Factor > House Magnate | no | t1 header lost in a table cell in the extract; skills/talents/trappings read from the lines below it; masked spec (forbidden/setting term): original name needed; masked talent spec |
| 29 | 73 | Ranger | Brass 3/Silver 2/Silver 3/Silver 5 | t1 T, I, Ag; t2 WP; t3 S; t4 WS | 10/6/4/2 | 4/4/4/4 | 1/3/3/3 | endurance* | Courier (proposed) | Errand Runner > Courier > Post Rider > Chief Postmaster | no | spec on skill with catalog spec none |
| 30 | 74 | Peasant | Brass 2/Brass 3/Brass 5/Silver 3 | t1 S, T, I; t2 WP; t3 Dex; t4 Fel | 10/6/4/2 | 4/4/4/4 | 6/4/1/2 | endurance* | Shaft Digger (proposed) | Pick Hand > Shaft Digger > Face Boss > Pit Overseer | no | spec on skill with catalog spec none |
| 31 | 75 | Peasant | Brass 1/Brass 3/Silver 1/Silver 2 | t1 I, Dex, Fel; t2 Int; t3 WP; t4 BS | 10/6/4/2 | 4/4/4/4 | 2/1/1/1 | intuition* | Omen Reader (proposed) | Palm Reader > Omen Reader > Dream Warden > Far-Gazer | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 32 | 76 | Courtier | Gold 1/Gold 2/Gold 5/Gold 7 | t1 WS, Ag, Fel; t2 Int; t3 WP; t4 I | 10/6/4/2 | 4/4/4/4 | 5/5/5/3 | leadership* | Landed Heir (proposed) | Young Heir > Landholder > Peer of the Realm > Great House Head | no | spec on skill with catalog spec none |
| 33 | 77 | Academic | Brass 1/Silver 1/Gold 1/Gold 4 | t1 dex, int, fel; t2 wp; t3 t; t4 i | 10/6/4/2 | 4/4/4/4 | 2/2/2/1 | lore:theology* | Cloister Sister (proposed) | Postulant > Cloister Sister > Mother of the House > Chapter Prelate | no | spec on skill with catalog spec none |
| 34 | 78 | Rogue | Brass 3/Brass 5/Silver 3/Gold 1 | t1 ws, s, ag; t2 bs; t3 t; t4 fel | 10/6/4/2 | 4/4/4/4 | 4/2/3/2 | intimidate* | Highwayman (proposed) | Lurker > Highwayman > Band Chief > Lord of the Wilds | no | masked talent spec; spec on skill with catalog spec none |
| 35 | 79 | Ranger | Brass 1/Brass 4/Silver 2/Silver 3 | t1 t, ag, fel; t2 dex; t3 i; t4 int | 10/6/4/2 | 4/4/4/4 | 4/5/3/3 | haggle* | Pack Trader (proposed) | Roadside Seller > Pack Trader > Cart Trader > Caravan Master | no | spec on skill with catalog spec none |
| 36 | 80 | Academic | Brass 4/Silver 3/Silver 5/Gold 1 | t1 dex, int, fel; t2 t; t3 i; t4 wp | 10/6/4/2 | 4/4/4/4 | 2/3/2/2 | heal* | Bonesetter (proposed) | Orderly > Bonesetter > Surgeon > Master Surgeon | yes:bonesetter | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 37 | 81 | Riverfolk | Brass 4/Silver 1/Silver 3/Silver 5 | t1 s, i, int; t2 ag; t3 fel; t4 wp | 10/6/4/2 | 4/4/4/4 | 1/3/2/2 | lore:riverways* | Channel Pilot (proposed) | Sounding Hand > Channel Pilot > Reach Navigator > Warden of Waters | no | masked talent spec; spec on skill with catalog spec none |
| 38 | 82 | Warrior | Brass 4/Silver 2/Silver 5/Gold 2 | t1 ws, s, t; t2 i; t3 ag; t4 fel | 10/6/4/2 | 4/4/4/4 | 3/3/2/1 | melee:any* | Cage Brawler (proposed) | Ring Novice > Cage Brawler > Ring Veteran > Arena Legend | no | spec on skill with catalog spec none |
| 39 | 83 | Academic | Brass 2/Silver 2/Gold 1/Gold 4 | t1 int, wp, fel; t2 ag; t3 t; t4 i | 10/6/4/2 | 4/4/4/4 | 2/2/4/2 | pray* | Shrine Minister (proposed) | Acolyte > Shrine Minister > High Celebrant > Temple Prelate | no | spec on skill with catalog spec none |
| 40 | 84 | Warrior | Brass 3/Brass 5/Silver 4/Gold 1 | t1 ws, s, t; t2 ag; t3 bs; t4 fel | 10/6/4/2 | 4/4/4/4 | 3/3/4/1 | melee:basic* | Hired Fist (proposed) | Boaster > Hired Fist > Silent Blade > Shadow Master | no | spec on skill with catalog spec none |
| 41 | 85 | Rogue | Brass 3/Brass 5/Silver 3/Gold 1 | t1 ws, s, t; t2 i; t3 wp; t4 int | 10/6/4/2 | 4/4/4/4 | 3/2/3/3 | intimidate* | Gang Enforcer (proposed) | Tough > Enforcer > Gang Lieutenant > Syndicate Chief | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 42 | 86 | Burgher | Brass 3/Brass 5/Silver 2/Silver 3 | t1 ws, t, dex; t2 i; t3 wp; t4 s | 10/6/4/2 | 4/4/4/4 | 4/2/3/2 | traps* | Vermin Warden (proposed) | Pest Chaser > Vermin Warden > Drain Walker > Pest Contractor | no | masked spec (forbidden/setting term): original name needed; masked talent spec; spec on skill with catalog spec none |
| 43 | 87 | Riverfolk | Brass 4/Silver 2/Silver 3/Gold 1 | t1 ws, s, fel; t2 bs; t3 i; t4 int | 10/6/4/2 | 4/4/4/4 | 3/3/3/2 | melee:basic* | Water Patrol (proposed) | Dock Cadet > Water Patrolman > Patrol Mate > Patrol Master | no | spec on skill with catalog spec none |
| 44 | 88 | Riverfolk | Brass 2/Brass 3/Brass 5/Silver 2 | t1 t, ag, dex; t2 fel; t3 s; t4 int | 10/6/4/2 | 4/4/4/4 | 3/4/2/1 | endurance* | Waterway Hand (proposed) | Reed Cutter > Waterway Hand > Stream Sage > Reach Elder | no | spec on skill with catalog spec none |
| 45 | 89 | Ranger | Brass 5/Silver 3/Silver 5/Gold 1 | t1 ws, t, i; t2 bs; t3 fel; t4 ag | 10/6/4/2 | 4/4/4/4 | 3/4/2/2 | perception* | Highway Marshal (proposed) | Milepost Guard > Highway Marshal > Marches Captain > Road Commander | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 46 | 90 | Riverfolk | Brass 4/Silver 2/Silver 3/Gold 2 | t1 s, ag, dex; t2 ws; t3 i; t4 int | 10/6/4/2 | 4/4/4/4 | 3/2/2/4 | sail* | Deckhand (proposed) | Ship Boy > Able Seaman > Mate > Skipper | no | spec on skill with catalog spec none |
| 47 | 91 | Academic | Brass 3/Silver 1/Silver 5/Gold 1 | t1 dex, int, wp; t2 fel; t3 i; t4 t | 10/6/4/2 | 4/4/4/4 | 5/2/2/1 | lore:any* | Archivist (proposed) | Copyist > Archivist > Keeper of Records > Master Archivist | yes:archivist | spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 48 | 92 | Peasant | Brass 3/Brass 5/Silver 1/Silver 5 | t1 t, i, ag; t2 bs; t3 int; t4 dex | 10/7/4/2 | 4/4/4/4 | 4/2/4/2 | navigation* | Pathfinder (proposed) | Guide > Pathfinder > Trailblazer > Wayfinder | yes:pathfinder | t2 lists 7 skills (canon shape 6); spec on skill with catalog spec none; approx equivalence: 4/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1; existing class Ranger, canon Peasant |
| 49 | 93 | Courtier | Brass 3/Brass 4/Silver 3/Gold 1 | t1 S, T, Ag; t2 Fel; t3 I; t4 Int | 10/6/4/2 | 4/4/4/4 | 1/1/4/5 | endurance* | Household Hand (proposed) | Scullion > Household Hand > Valet > Head of Household | no | spec on skill with catalog spec none |
| 50 | 94 | Warrior | Brass 2/Brass 2/Brass 2/Brass 2 | t1 WS, S, WP; t2 T; t3 Ag; t4 I | 10/6/4/2 | 4/4/4/4 | 3/1/1/1 | melee:basic* | Death Vower (proposed) | Grudge Bearer > Beast Breaker > Giant Breaker > Wyrm Breaker | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none; all four tiers are alternative slayer types read as Brass 2 each; confirm statuses on page |
| 51 | 95 | Riverfolk | Brass 4/Silver 1/Silver 5/Gold 3 | t1 S, I, Ag; t2 WP; t3 Fel; t4 Int | 10/6/4/2 | 4/4/4/4 | 4/3/3/2 | stealth:rural/urban* | Contraband Runner (proposed) | Bundle Carrier > Contraband Runner > Master Runner > Contraband King | no | masked talent spec; spec on skill with catalog spec none |
| 52 | 96 | Warrior | Brass 5/Silver 2/Silver 3/Gold 1 | t1 WS, BS, S; t2 WP; t3 T; t4 I | 10/6/4/2 | 4/4/4/4 | 3/3/2/7 | melee:any* | Sellsword (proposed) | Hireling > Sellsword > Free Lance > Mercenary Captain | yes:sellsword | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none; approx equivalence: 5/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 53 | 97 | Courtier | Brass 4/Silver 3/Gold 1/Gold 3 | t1 I, Ag, Fel; t2 Dex; t3 WP; t4 Int | 10/6/4/2 | 4/4/4/4 | 2/3/4/1 | gossip* | Shadow Agent (proposed) | Eavesdropper > Shadow Agent > Handler > Master of Whispers | no | spec on skill with catalog spec none |
| 54 | 98 | Riverfolk | Brass 3/Brass 5/Silver 3/Silver 5 | t1 S, T, Ag; t2 WS; t3 Fel; t4 WP | 10/6/4/2 | 4/4/4/4 | 2/4/2/2 | endurance* | Dock Porter (proposed) | Quay Hand > Dock Porter > Tally Boss > Wharf Master | no | masked spec (forbidden/setting term): original name needed; masked talent spec |
| 55 | 99 | Rogue | Brass 3/Brass 4/Brass 5/Silver 3 | t1 S, Ag, Dex; t2 I; t3 Int; t4 Fel | 10/6/4/2 | 4/4/4/4 | 3/3/3/2 | stealth:urban* | Lockbreaker (proposed) | Latch Lifter > Lockbreaker > Vault Cracker > Master of Keys | yes:lockbreaker | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none; approx equivalence: 5/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 56 | 100 | Burgher | Brass 5/Silver 1/Silver 3/Gold 3 | t1 S, Int, Fel; t2 I; t3 WP; t4 Dex | 10/6/4/2 | 4/4/4/4 | 1/1/3/4 | haggle* | Burgess (proposed) | Counting Clerk > Burgess > Guild Proprietor > Civic Head | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 57 | 101 | Peasant | Brass 2/Brass 3/Brass 5/Silver 2 | t1 S, T, Ag; t2 Dex; t3 Fel; t4 Int | 10/6/4/2 | 4/4/4/4 | 1/4/3/1 | endurance* | Shepherd (proposed) | Herd Hand > Shepherd > Drover > Flockmaster | yes:shepherd | spec on skill with catalog spec none; approx equivalence: 5/5 existing tier-1 skills appear in canon tier 1; existing shape 5/3/3-4/3 skills, 2/2/2/3 talents, 3/2/2/2 characteristics vs canon 10/6/4/2, 4x4, 3/1/1/1 |
| 58 | 102 | Courtier | Brass 4/Silver 3/Gold 1/Gold 4 | t1 T, I, Int; t2 WS; t3 Fel; t4 WP | 10/6/4/2 | 4/4/4/4 | 4/3/3/3 | evaluate* | Castellan (proposed) | Key Bearer > Castellan > Lord Marshal of Holdings > Provincial Overseer | no | spec on skill with catalog spec none |
| 59 | 103 | Warrior | Brass 2/Silver 3/Silver 5/Gold 1 | t1 WS, WP, Fel; t2 S; t3 T; t4 I | 10/6/4/2 | 4/4/4/4 | 5/2/1/1 | leadership* | Holy Blade (proposed) | Sworn Novice > Holy Blade > Shrine Captain > Crusade Commander | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 60 | 104 | Burgher | Brass 3/Silver 1/Silver 3/Gold 1 | t1 WS, S, I; t2 Ag; t3 WP; t4 Fel | 10/6/4/2 | 4/4/4/4 | 3/3/3/4 | perception* | Lantern Guard (proposed) | Watch Cadet > Lantern Guard > Beat Sergeant > Watch Commandant | no | spec on skill with catalog spec none |
| 61 | 105 | Rogue | Brass 3/Silver 1/Silver 4/Gold 1 | t1 I, Int, WP; t2 Fel; t3 WS; t4 T | 10/6/4/2 | 4/4/4/4 | 2/2/3/3 | language:TBD-masked* | Hex Caster (proposed) | Curious Dabbler > Hex Caster > Binder > Coven Head | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 62 | 106 | Ranger | Silver 1/Silver 3/Gold 1/Gold 2 | t1 WS, I, WP; t2 BS; t3 T; t4 Int | 10/6/4/2 | 4/4/4/4 | 2/6/2/2 | intimidate* | Inquisitor (proposed) | Questioner > Inquisitor > Chief Inquisitor > Grand Prosecutor | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 63 | 107 | Academic | Brass 3/Silver 3/Gold 1/Gold 2 | t1 I, Int, WP; t2 WS; t3 Ag; t4 Dex | 10/6/4/2 | 4/4/4/4 | 2/3/3/2 | language:TBD-masked* | Arcanist (proposed) | Arcane Pupil > Arcanist > Master Arcanist > Grand Arcanist | no | masked spec (forbidden/setting term): original name needed; spec on skill with catalog spec none |
| 64 | 108 | Riverfolk | Brass 2/Brass 3/Brass 5/Silver 5 | t1 WS, S, Ag; t2 BS; t3 WP; t4 Fel | 10/6/4/2 | 4/4/4/4 | 3/3/2/3 | melee:basic* | Shore Scavenger (proposed) | Flotsam Gatherer > Shore Scavenger > Reef Raider > Wreck Captain | no | spec on skill with catalog spec none |

## Per-tier detail

| career # | tier | page | status | characteristics | skills | talents | trappings | original tier name |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 45 | Silver 1 | gap | bribery, charm, evaluate, gossip, haggle, intuition, lore:local, lore:politics*, research, signs:any | #13, #48:all, #65, #113 | 1 | Attache (proposed) |
| 1 | 2 | 45 | Silver 3 | gap | drink, cool, gamble, intimidate, language:classical/TBD-masked/TBD-masked, lore:heraldry | #32, #46, #120, #146 | 1 | Confidant (proposed) |
| 1 | 3 | 45 | Silver 5 | gap | entertain:storytelling~, language:any, leadership, lore:any | #8, #19, #24, #77 | 2 | Privy Voice (proposed) |
| 1 | 4 | 45 | Gold 3 | gap | performance:dancing, ride:horse~ | #22, #29, #93, #139 | 3 | Keeper of the Seal (proposed) |
| 2 | 1 | 46 | Brass 1 | gap | art:writing, charm*, drink, entertain:storytelling~, gossip, haggle, lore:local, lore:politics, trade:printing, stealth:urban~ | #15, #65, #96, #113 | 3 | Handbill Runner (proposed) |
| 2 | 2 | 46 | Brass 2 | gap | cool, dodge, gamble, intuition, leadership, melee:brawling | #4, #8, #68, #103 | 2 | Firebrand (proposed) |
| 2 | 3 | 46 | Brass 3 | gap | athletics, intimidate, perception, ranged:throwing | #24, #40, #56, #134 | 2 | Crowd Stirrer (proposed) |
| 2 | 4 | 46 | Brass 5 | gap | bribery, lore:heraldry | #48:all, #87, #120, #139 | 4 | Voice of the Cause (proposed) |
| 3 | 1 | 47 | Brass 3 | gap | drink, endurance, haggle, heal, language:classical, lore:chemistry, lore:medicine, perception, trade:apothecary*, trade:poisoner | #2:taste, #30, #31:apothecary, #113 | 3 | Mortar Boy (proposed) |
| 3 | 2 | 47 | Silver 1 | gap | charm, evaluate, gossip, language:TBD-masked, signs:TBD-masked, stealth:urban~ | #32, #37, #48:TBD-masked, #101 | 2 | Compounder (proposed) |
| 3 | 3 | 47 | Silver 3 | gap | intuition, leadership, lore:science, research | #17, #48:criminals/scholars, #88:apothecary, #105:poison | 3 | Master Compounder (proposed) |
| 3 | 4 | 47 | Gold 1 | gap | bribery, intimidate | #34, #77, #117:chemistry, #118 | 2 | Dean of Remedies (proposed) |
| 4 | 1 | 48 | Brass 2 | gap | art:any, athletics, drink, cool, dodge, haggle, endurance, evaluate, lockpicking, trade:any* | #31:as-trade, #144, #149, #161 | 3 | Bench Apprentice (proposed) |
| 4 | 2 | 48 | Silver 1 | gap | charm, drive, lore:local, gossip, language:TBD-masked, perception | #37, #48:TBD-masked, #92, #138 | 2 | Craftwright (proposed) |
| 4 | 3 | 48 | Silver 3 | gap | intuition, leadership, research, signs:TBD-masked | #2:taste/touch, #88:as-trade, #113, #152 | 2 | Master Wright (proposed) |
| 4 | 4 | 48 | Gold 1 | gap | bribery, intimidate | #19, #82, #103, #120 | 2 | Guild Warden (proposed) |
| 5 | 1 | 49 | Brass 2 | gap | art:any*, charm, climb, drink, evaluate, gossip, intuition, lore:art, perception, trade:art-supplies | #9, #113, #126, #144 | 1 | Sketch Pupil (proposed) |
| 5 | 2 | 49 | Silver 1 | gap | endurance, entertain:storytelling~, gamble, haggle, lore:heraldry, melee:fencing | #10, #22, #65, #92 | 1 | Limner (proposed) |
| 5 | 3 | 49 | Silver 4 | gap | leadership, lore:any, research, sleight-of-hand | #2:sight/touch, #37, #48:any, #149 | 3 | Master Limner (proposed) |
| 5 | 4 | 49 | Gold 2 | gap | cool, signs:any | #5, #82, #117:art, #164 | 3 | Laureate (proposed) |
| 6 | 1 | 50 | Silver 1 | gap | athletics, cool, dodge, endurance, evaluate, gossip, intimidate*, melee:basic, perception, lockpicking | #18, #46, #95, #144 | 2 | Dues Clerk (proposed) |
| 6 | 2 | 50 | Silver 5 | gap | bribery, charm, haggle, intuition, leadership, lore:local | #32, #89, #103, #143 | 2 | Tithe Marshal (proposed) |
| 6 | 3 | 50 | Gold 1 | gap | animal-care, lore:heraldry, navigation, ride:horse~ | #8, #77, #94, #113 | 3 | Shire Arbiter (proposed) |
| 6 | 4 | 50 | Gold 2 | gap | language:classical, lore:law | #29, #73, #118, #120 | 3 | High Arbiter (proposed) |
| 7 | 1 | 51 | Brass 0 | gap | charm*, drink, dodge, endurance, gossip, intuition, survival, perception, signs:vagabond, stealth:rural/urban~ | #13, #96, #105:disease, #135 | 2 | Gutter Waif (proposed) |
| 7 | 2 | 51 | Brass 1 | gap | athletics, cool, entertain:acting~, entertain:any~, lore:local, sleight-of-hand | #4, #15, #32, #48:criminals | 2 | Alms Seeker (proposed) |
| 7 | 3 | 51 | Brass 4 | gap | charm-animal, haggle, leadership, melee:brawling | #40, #67, #134, #160 | 3 | Doorstep Veteran (proposed) |
| 7 | 4 | 51 | Silver 2 | gap | bribery, intimidate | #24, #37, #51:watchmen, #139 | 2 | Lord of the Lane (proposed) |
| 8 | 1 | 52 | Brass 3 | gap | athletics, charm, drink, dodge, endurance, gossip, melee:brawling, row, sail*, swim | #54, #144, #151, #163 | 3 | Rope Hand (proposed) |
| 8 | 2 | 52 | Silver 1 | gap | entertain:storytelling~, haggle, navigation, lore:riverways, perception, signs:TBD-masked | #40, #48:TBD-masked, #122, #161 | 2 | Ferry Keeper (proposed) |
| 8 | 3 | 52 | Silver 2 | gap | climb, heal, intuition, trade:boatbuilder | #31:boatbuilder, #37, #46, #94 | 3 | Crossing Master (proposed) |
| 8 | 4 | 52 | Silver 5 | gap | cool, leadership | #100, #102, #103, #117:riverways | 2 | Lord of the Ford (proposed) |
| 9 | 1 | 53 | Silver 1 | gap | athletics, charm, cool, gossip, haggle, intuition, melee:basic*, perception, lockpicking, stealth:any~ | #18, #125, #143, #139 | 3 | Warrant Runner (proposed) |
| 9 | 2 | 53 | Silver 3 | gap | bribery, endurance, intimidate, survival, ranged:crossbow/entangling/throwing, track | #85, #104, #122, #144 | 5 | Quarry Taker (proposed) |
| 9 | 3 | 53 | Silver 5 | gap | animal-care, climb, ride:horse~, swim | #1, #21, #45, #133 | 2 | Master Taker (proposed) |
| 9 | 4 | 53 | Gold 1 | gap | drive, lore:law | #36, #51:bounties, #67, #147 | 2 | Warrant Marshal (proposed) |
| 10 | 1 | 54 | Silver 3 | gap | animal-care, charm-animal, drink, cool, language:TBD-masked, melee:cavalry, survival, perception, ranged:blackpowder/bow, ride:horse~* | #26, #45, #78, #115 | 3 | Troop Rider (proposed) |
| 10 | 2 | 54 | Silver 4 | gap | charm, endurance, gamble, gossip, melee:basic, play:horn | #48:soldiers, #66, #122, #157 | 2 | Lancer (proposed) |
| 10 | 3 | 54 | Gold 1 | gap | intimidate, leadership, lore:warfare, ranged:engineering | #28, #50, #60:any, #162 | 1 | Banner Rider (proposed) |
| 10 | 4 | 54 | Gold 2 | gap | intuition, lore:heraldry | #1, #71, #113, #114 | 2 | Squadron Captain (proposed) |
| 11 | 1 | 55 | Brass 3 | i,dex,fel | charm*, drink, cool, entertain:acting~, entertain:storytelling~, gamble, gossip, haggle, intuition, sleight-of-hand | #20, #32, #39, #49 | 3 | Dice Runner (proposed) |
| 11 | 2 | 55 | Brass 5 | gap | bribery, dodge, evaluate, language:TBD-masked, perception, signs:thief | #15, #48:criminals, #90, #124 | 4 | Dicer (proposed) |
| 11 | 3 | 55 | Silver 2 | gap | language:any, lore:art, lore:heraldry, lockpicking | #10, #24, #37, #113 | 2 | Table Fox (proposed) |
| 11 | 4 | 55 | Silver 4 | gap | lore:genealogy, research | #65, #86, #94, #139 | 2 | Lord of Chances (proposed) |
| 12 | 1 | 56 | Silver 1 | gap | animal-care, charm-animal, climb, drive*, endurance, gossip, melee:basic, perception, play:horn, ride:horse~ | #6, #26, #122, #149 | 4 | Wheel Boy (proposed) |
| 12 | 2 | 56 | Silver 2 | gap | drink, intuition, lore:local, melee:flail, navigation, ranged:blackpowder | #35, #32, #66, #150 | 2 | Stage Driver (proposed) |
| 12 | 3 | 56 | Silver 3 | gap | animal-training:horse, intimidate, language:any, lore:routes | #1, #51:outlaws, #85, #94 | 2 | Road Master (proposed) |
| 12 | 4 | 56 | Gold 2 | gap | haggle, leadership | #37, #48:any, #100, #113 | 2 | Line Superintendent (proposed) |
| 13 | 1 | 57 | Silver 3 | ws,i,ag | athletics, charm, cool, dodge, gamble, heal, intuition, language:classical, melee:any*, perception | #12, #42, #52, #134 | 2 | Salle Novice (proposed) |
| 13 | 2 | 57 | Silver 4 | gap | entertain:storytelling~, endurance, intimidate, melee:any, ranged:blackpowder, trade:gunsmith | #28, #45, #48:any, #50 | 2 | Rapier Adept (proposed) |
| 13 | 3 | 57 | Gold 1 | gap | leadership, lore:warfare, melee:any, performance:acrobatics | #5, #41, #110, #111 | 4 | Blade Master (proposed) |
| 13 | 4 | 57 | Gold 2 | gap | lore:law, melee:any | #27, #89, #109, #142 | 1 | Arena Champion (proposed) |
| 14 | 1 | 58 | Brass 4 | gap | art:drawing, drink, cool, endurance, evaluate, language:classical, lore:engineering, ranged:engineering, research, trade:engineer* | #31:engineer, #113, #152, #159 | 2 | Workshop Pupil (proposed) |
| 14 | 2 | 58 | Silver 3 | gap | drive, language:TBD-masked, lore:science, navigation, ride:horse~, signs:TBD-masked | #48:TBD-masked, #48:scholars, #66, #85 | 2 | Mechanician (proposed) |
| 14 | 3 | 58 | Silver 5 | gap | animal-training:pigeon, dodge, language:TBD-masked, leadership | #88:engineer, #100, #130, #140 | 1 | Master Mechanician (proposed) |
| 14 | 4 | 58 | Gold 2 | gap | language:any, perception | #46, #82, #108, #117:engineering | 3 | Chief of Works (proposed) |
| 15 | 1 | 59 | Brass 3 | gap | athletics, charm, drink, dodge, entertain:any~*, gossip, haggle, performance:any, play:any, sleight-of-hand | #10, #90, #97, #139 | 2 | Street Act (proposed) |
| 15 | 2 | 59 | Brass 5 | gap | entertain:any~, melee:basic, performance:any, play:any, ranged:throwing, ride:any~ | #33, #74, #127, #157 | 3 | Showman (proposed) |
| 15 | 3 | 59 | Silver 3 | gap | animal-care, animal-training:any, art:writing, language:any | #15, #86, #103, #113 | 2 | Headliner (proposed) |
| 15 | 4 | 59 | Gold 1 | gap | drive, leadership | #37, #48:any, #122, #126 | 3 | Company Master (proposed) |
| 16 | 1 | 60 | Silver 2 | gap | art:writing, athletics, charm*, dodge, drive, endurance, haggle, lore:heraldry, lore:politics, ride:horse~ | #15, #48:nobles, #113, #139 | 3 | Dispatch Bearer (proposed) |
| 16 | 2 | 60 | Silver 4 | gap | bribery, cool, entertain:storytelling~, gossip, intuition, language:any | #48:any, #65, #79, #122 | 2 | Emissary (proposed) |
| 16 | 3 | 60 | Gold 2 | gap | drink, intimidate, language:any, leadership | #22, #24, #37, #120 | 3 | Plenipotentiary (proposed) |
| 16 | 4 | 60 | Gold 5 | gap | lore:all, signs:any | #19, #29, #93, #117:politics | 3 | Grand Legate (proposed) |
| 17 | 1 | 61 | Brass 5 | i,int,fel | bribery, charm, drink, evaluate*, gamble, gossip, haggle, lore:local, melee:basic, stealth:urban~ | #20, #32, #65, #95 | 2 | Hawker of Odds (proposed) |
| 17 | 2 | 61 | Silver 1 | gap | cool, intuition, language:TBD-masked, lore:heraldry, signs:thief, trade:engraver | #19, #37, #48:criminals, #113 | 3 | Goods Broker (proposed) |
| 17 | 3 | 61 | Silver 3 | gap | drive, entertain:storytelling~, lore:art, research | #24, #48:any, #77, #139 | 2 | Cache Master (proposed) |
| 17 | 4 | 61 | Gold 1 | gap | intimidate, leadership | #73, #89, #118, #140 | 3 | Shadow Merchant (proposed) |
| 18 | 1 | 62 | Brass 0 | gap | athletics, cool, dodge, endurance, heal, intimidate, intuition, lore:TBD-masked, melee:flail*, survival | #14, #55, #58, #135 | 2 | Humbled Walker (proposed) |
| 18 | 2 | 62 | Brass 0 | gap | art:icons, language:classical, lore:TBD-masked, melee:basic, melee:two-handed, ranged:sling | #45, #51:everything, #67, #60:heretics | 2 | Scourge Pilgrim (proposed) |
| 18 | 3 | 62 | Brass 0 | gap | charm, language:any, lore:theology, perception | #64, #69, #89, #122 | 1 | Fervent Voice (proposed) |
| 18 | 4 | 62 | Brass 0 | gap | entertain:speeches~, leadership | #11, #59, #68, #74 | 2 | Herald of the End (proposed) |
| 19 | 1 | 63 | Brass 2 | s,i,ag | athletics, climb, drink, cool, dodge, endurance, gossip, melee:basic, perception, stealth:any~* | #4, #32, #56, #144 | 4 | Petty Digger (proposed) |
| 19 | 2 | 63 | Brass 4 | gap | bribery, drive, evaluate, haggle, lockpicking, traps | #18, #48:criminals, #91, #105:disease | 6 | Barrow Delver (proposed) |
| 19 | 3 | 63 | Silver 3 | gap | animal-care, lore:history, survival, research | #113, #141, #156, #149 | 4 | Crypt Raider (proposed) |
| 19 | 4 | 63 | Silver 5 | gap | navigation, trade:engineer | #51:undead, #129, #150, #164 | 5 | Relic Seeker (proposed) |
| 20 | 1 | 64 | Brass 5 | gap | drink, cool, entertain:storytelling~, gamble, gossip, intimidate, intuition, melee:basic, melee:brawling, perception* | #39, #48:servants, #114, #143 | 3 | Post Sentry (proposed) |
| 20 | 2 | 64 | Silver 2 | gap | athletics, dodge, endurance, heal, melee:polearm, ranged:bow | #44, #110, #128, #136 | 4 | Gatekeeper (proposed) |
| 20 | 3 | 64 | Silver 4 | gap | language:TBD-masked, lore:heraldry, melee:two-handed, ride:horse~ | #48:any, #51:intruders, #109, #159 | 3 | Household Guard (proposed) |
| 20 | 4 | 64 | Gold 1 | gap | leadership, lore:warfare | #27, #64, #73, #94 | 2 | Guard Commandant (proposed) |
| 21 | 1 | 65 | Brass 1 | gap | channelling:TBD-masked, charm, cool, intuition, language:TBD-masked, lore:folklore*, lore:herbs, lore:theology, survival, trade:herbalist | #31:herbalist, #98, #113, #123 | 3 | Charm Apprentice (proposed) |
| 21 | 2 | 65 | Brass 4 | gap | heal, lore:local, lore:magic, lore:spirits, pray, signs:hedgefolk | #3, #7:hedgecraft, #129, #137:any | 2 | Village Charmer (proposed) |
| 21 | 3 | 65 | Brass 5 | gap | animal-care, gossip, leadership, perception | #75, #84, #88:herbalist, #117:folklore | 2 | Lore Mother (proposed) |
| 21 | 4 | 65 | Silver 2 | gap | endurance, lore:genealogy | #2:any, #107, #105:disease, #150 | 2 | Circle Elder (proposed) |
| 22 | 1 | 66 | Brass 1 | gap | athletics, climb, endurance, heal, lore:herbs, survival, perception, swim, trade:herbalist*, trade:poisoner | #31:herbalist, #67, #100, #137:any | 4 | Kiln Hand (proposed) |
| 22 | 2 | 66 | Brass 4 | gap | charm, evaluate, gossip, haggle, lore:local, navigation | #2:taste, #53, #92, #126 | 1 | Ashburner (proposed) |
| 22 | 3 | 66 | Brass 5 | gap | animal-care, cool, leadership, lore:medicine | #30, #37, #88:herbalist, #118 | 3 | Forest Collier (proposed) |
| 22 | 4 | 66 | Silver 2 | gap | charm-animal, drive | #48:scholars, #113, #105:poison, #117:herbs | 2 | Master Collier (proposed) |
| 23 | 1 | 67 | Brass 2 | i,ag,int | animal-care, athletics, charm-animal, climb, endurance, survival*, perception, traps, stealth:rural~, track | #67, #116, #137:all, #156 | 3 | Mews Hand (proposed) |
| 23 | 2 | 67 | Brass 4 | gap | animal-training:dog, cool, lore:beasts, melee:polearm, ranged:blackpowder/bow/crossbow/sling/throwing, signs:ranger | #1, #63, #85, #127 | 3 | Falconer (proposed) |
| 23 | 3 | 67 | Silver 1 | gap | entertain:storytelling~, haggle, navigation, swim | #2:any, #36, #51:beasts, #147 | 3 | Austringer (proposed) |
| 23 | 4 | 67 | Silver 4 | gap | animal-training:hawk, ride:horse~ | #48:servants, #50, #114, #130 | 2 | Master of Hawks (proposed) |
| 24 | 1 | 68 | Silver 1 | gap | charm, climb, cool, dodge, gossip, intuition, melee:brawling, perception*, stealth:urban~, track | #4, #13, #113, #126 | 4 | Tip Gatherer (proposed) |
| 24 | 2 | 68 | Silver 2 | gap | bribery, drink, evaluate, intimidate, lockpicking, sleight-of-hand | #48:any, #94, #118, #125 | 4 | Case Seeker (proposed) |
| 24 | 3 | 68 | Silver 3 | gap | leadership, lore:any, lore:law, research | #17, #18, #129, #139 | 2 | Inquest Agent (proposed) |
| 24 | 4 | 68 | Silver 5 | gap | lore:any, signs:any | #2:any, #117:any, #131, #153 | 2 | Chief Inquirer (proposed) |
| 25 | 1 | 69 | Brass 2 | i,int,fel | bribery, charm*, drink, entertain:any~, gamble, gossip, haggle, intuition, lore:local, stealth:urban~ | #10, #15, #32, #65 | 1 | Hanger-On (proposed) |
| 25 | 2 | 69 | Brass 3 | gap | endurance, language:TBD-masked, lore:any, melee:basic, perception, signs:thief | #22, #48:any, #105:disease/poison, #139 | 2 | Street Schemer (proposed) |
| 25 | 3 | 69 | Silver 1 | gap | cool, dodge, evaluate, leadership | #19, #37, #46, #95 | 1 | Procurement Agent (proposed) |
| 25 | 4 | 69 | Silver 3 | gap | intimidate, lore:law | #77, #113, #117:local, #120 | 2 | Syndicate Head (proposed) |
| 26 | 1 | 70 | Silver 3 | gap | animal-care, athletics, charm-animal, cool, heal, lore:heraldry, melee:basic, melee:cavalry*, ride:horse~, trade:farrier | #48:nobles/soldiers, #93, #141, #154 | 5 | Page Squire (proposed) |
| 26 | 2 | 70 | Silver 5 | gap | dodge, endurance, intimidate, language:TBD-masked, melee:any, play:horn | #34, #115, #122, #138 | 5 | Sworn Knight (proposed) |
| 26 | 3 | 70 | Gold 2 | gap | charm, leadership, lore:warfare, ranged:blackpowder | #51:any, #136, #159, #162 | 2 | Banner Knight (proposed) |
| 26 | 4 | 70 | Gold 4 | gap | lore:any, signs:knightly-order | #71, #73, #113, #142 | 3 | Order Marshal (proposed) |
| 27 | 1 | 71 | Brass 4 | gap | bribery, charm, drink, entertain:storytelling~, gossip, intuition, language:classical, lore:law*, lore:theology, research | #15, #48:scholars, #113, #131 | 2 | Law Clerk (proposed) |
| 27 | 2 | 71 | Silver 3 | gap | cool, haggle, intimidate, language:TBD-masked, lore:local, signs:TBD-masked | #8, #19, #48:criminals, #48:TBD-masked | 3 | Advocate (proposed) |
| 27 | 3 | 71 | Gold 1 | gap | art:writing, entertain:speeches~, lore:politics, perception | #24, #68, #89, #117:law | 2 | Senior Counsel (proposed) |
| 27 | 4 | 71 | Gold 2 | gap | leadership, lore:any | #17, #29, #87, #118 | 2 | Presiding Magistrate (proposed) |
| 28 | 1 | 72 | Silver 2 | gap | animal-care, bribery, charm-animal, drink, drive, evaluate, gossip, haggle*, intuition, navigation | #15, #37, #113, #139 | 4 | Stall Hand (proposed) |
| 28 | 2 | 72 | Silver 5 | gap | charm, gamble, language:any, language:TBD-masked, lore:local, signs:TBD-masked | #19, #46, #48:TBD-masked, #118 | 3 | Trade Factor (proposed) |
| 28 | 3 | 72 | Gold 1 | gap | cool, language:any, language:classical, leadership | #24, #48:any, #95, #140 | 3 | Master Factor (proposed) |
| 28 | 4 | 72 | Gold 3 | gap | lore:any, intimidate | #73, #81, #120, #164 | 5 | House Magnate (proposed) |
| 29 | 1 | 73 | Brass 3 | t,i,ag | athletics, climb, cool, dodge, endurance*, haggle, melee:basic, navigation, perception, signs:ranger/thief | #32, #56, #57, #133 | 1 | Errand Runner (proposed) |
| 29 | 2 | 73 | Silver 2 | gap | animal-care, charm-animal, lore:local, survival, ride:horse~, swim | #73, #113, #122, #137:all | 3 | Courier (proposed) |
| 29 | 3 | 73 | Silver 3 | gap | charm, drink, gossip, lore:geography | #94, #134, #149, #157 | 3 | Post Rider (proposed) |
| 29 | 4 | 73 | Silver 5 | gap | leadership, research | #37, #60:outlaws, #100, #120 | 3 | Chief Postmaster (proposed) |
| 30 | 1 | 74 | Brass 2 | gap | climb, cool, endurance*, gossip, lore:local, melee:basic, melee:two-handed, survival, perception, signs:vagabond | #114, #137:rocky, #144, #149 | 6 | Pick Hand (proposed) |
| 30 | 2 | 74 | Brass 3 | gap | drink, evaluate, haggle, signs:miner, stealth:underground~, trade:explosives | #91, #141, #138, #161 | 4 | Shaft Digger (proposed) |
| 30 | 3 | 74 | Brass 5 | gap | intuition, lore:geology, navigation, trade:engineer | #21, #31:explosives, #152, #158 | 1 | Face Boss (proposed) |
| 30 | 4 | 74 | Silver 3 | gap | charm, leadership | #8, #46, #113, #150 | 2 | Pit Overseer (proposed) |
| 31 | 1 | 75 | Brass 1 | gap | bribery, charm, dodge, entertain:fortunetelling~, gossip, intuition*, lore:astrology, lore:theology, perception, sleight-of-hand | #62, #81, #123, #139 | 2 | Palm Reader (proposed) |
| 31 | 2 | 75 | Brass 3 | gap | cool, entertain:storytelling~, evaluate, haggle, intimidate, signs:vagabond | #38, #129, #146, #165 | 1 | Omen Reader (proposed) |
| 31 | 3 | 75 | Silver 1 | gap | art:writing, channelling:TBD-masked, language:TBD-masked, lore:magic | #84, #94, #98, #113 | 1 | Dream Warden (proposed) |
| 31 | 4 | 75 | Silver 2 | gap | charm-animal, lore:prophecy | #7:heavens, #89, #150, #166 | 1 | Far-Gazer (proposed) |
| 32 | 1 | 76 | Gold 1 | gap | drink, gamble, gossip, intimidate, language:classical, leadership*, lore:heraldry, melee:fencing, performance:dancing, ride:horse~ | #48:nobles, #81, #93, #113 | 5 | Young Heir (proposed) |
| 32 | 2 | 76 | Gold 2 | gap | bribery, charm, language:any, lore:politics, melee:cavalry or ranged:blackpowder, play:any | #19, #22, #89, #139 | 5 | Landholder (proposed) |
| 32 | 3 | 76 | Gold 5 | gap | cool, lore:genealogy, lore:local, lore:warfare | #29, #51:paupers, #103, #120 | 5 | Peer of the Realm (proposed) |
| 32 | 4 | 76 | Gold 7 | gap | charm-animal, intuition | #34, #73, #162, #164 | 3 | Great House Head (proposed) |
| 33 | 1 | 77 | Brass 1 | gap | art:calligraphy, charm, cool, endurance, heal, language:classical, lore:theology*, survival, pray, trade:brewer | #16:any, #62, #96, #113 | 2 | Postulant (proposed) |
| 33 | 2 | 77 | Silver 1 | gap | entertain:storytelling~, gossip, intuition, language:any, lore:local, melee:any | #48:cultists, #53, #76:any, #122 | 2 | Cloister Sister (proposed) |
| 33 | 3 | 77 | Gold 1 | gap | intimidate, leadership, lore:politics, perception | #71, #105:any, #117:theology, #136 | 2 | Mother of the House (proposed) |
| 33 | 4 | 77 | Gold 4 | gap | lore:any, research | #29, #73, #107, #150 | 1 | Chapter Prelate (proposed) |
| 34 | 1 | 78 | Brass 3 | gap | athletics, cool, dodge, endurance, gamble, intimidate*, melee:basic, survival, perception, stealth:rural~ | #32, #89, #116, #160 | 4 | Lurker (proposed) |
| 34 | 2 | 78 | Brass 5 | gap | drink, gossip, lore:local, ranged:bow/crossbow, signs:scout, traps | #85, #114, #137:any, #156 | 2 | Highwayman (proposed) |
| 34 | 3 | 78 | Silver 3 | gap | bribery, leadership, navigation, ranged:blackpowder | #36, #45, #51:TBD-masked, #122 | 3 | Band Chief (proposed) |
| 34 | 4 | 78 | Gold 1 | gap | charm, ride:horse~ | #59, #71, #73, #159 | 2 | Lord of the Wilds (proposed) |
| 35 | 1 | 79 | Brass 1 | gap | athletics, charm, endurance, entertain:storytelling~, gossip, haggle*, navigation, survival, signs:vagabond, stealth:rural~ | #56, #65, #135, #137:any | 4 | Roadside Seller (proposed) |
| 35 | 2 | 79 | Brass 4 | gap | drink, drive, evaluate, lore:local, perception, trade:tinker | #122, #138, #152, #165 | 5 | Pack Trader (proposed) |
| 35 | 3 | 79 | Silver 2 | gap | animal-care, charm-animal, intuition, ranged:sling | #37, #100, #129, #149 | 3 | Cart Trader (proposed) |
| 35 | 4 | 79 | Silver 3 | gap | language:any, lore:geography | #48:any, #95, #150, #139 | 3 | Caravan Master (proposed) |
| 36 | 1 | 80 | Brass 4 | dex,int,fel | charm, drink, cool, endurance, gossip, heal*, language:classical, lore:medicine, research, trade:barber | #17, #31:barber, #53, #113 | 2 | Orderly (proposed) |
| 36 | 2 | 80 | Silver 3 | gap | bribery, haggle, language:TBD-masked, lore:science, signs:TBD-masked, sleight-of-hand | #48:TBD-masked, #48:scholars, #92, #148 | 3 | Bonesetter (proposed) |
| 36 | 3 | 80 | Silver 5 | gap | entertain:storytelling~, gamble, intuition, leadership | #5, #105:disease, #118, #142 | 2 | Surgeon (proposed) |
| 36 | 4 | 80 | Gold 1 | gap | lore:genealogy, performance:dancing | #22, #48:nobles, #117:medicine, #150 | 2 | Master Surgeon (proposed) |
| 37 | 1 | 81 | Brass 4 | gap | drink, gossip, intuition, lore:local, lore:riverways*, navigation, survival, perception, row, swim | #54, #100, #112, #163 | 1 | Sounding Hand (proposed) |
| 37 | 2 | 81 | Silver 1 | gap | athletics, charm, cool, entertain:storytelling~, haggle, language:any | #48:TBD-masked, #91, #94, #102 | 3 | Channel Pilot (proposed) |
| 37 | 3 | 81 | Silver 3 | gap | endurance, intimidate, lore:local, lore:wrecks | #2:sight, #37, #117:riverways, #151 | 2 | Reach Navigator (proposed) |
| 37 | 4 | 81 | Silver 5 | gap | leadership, sail | #122, #126, #129, #149 | 2 | Warden of Waters (proposed) |
| 38 | 1 | 82 | Brass 4 | gap | athletics, drink, cool, dodge, endurance, entertain:taunt~, gamble, intimidate, melee:any*, melee:brawling | #40, #47, #70, #72 | 3 | Ring Novice (proposed) |
| 38 | 2 | 82 | Silver 2 | gap | haggle, melee:basic, melee:flail/two-handed, perception, performance:fight, ranged:entangling | #28, #45, #89, #128 | 3 | Cage Brawler (proposed) |
| 38 | 3 | 82 | Silver 5 | gap | gossip, heal, intuition, performance:acrobatics | #5, #27, #41, #114 | 2 | Ring Veteran (proposed) |
| 38 | 4 | 82 | Gold 2 | gap | charm, ranged:any | #59, #64, #69, #109 | 1 | Arena Legend (proposed) |
| 39 | 1 | 83 | Brass 2 | gap | charm, cool, endurance, entertain:storytelling~, heal, intuition, language:classical, lore:theology, pray*, research | #16:any, #62, #113, #139 | 2 | Acolyte (proposed) |
| 39 | 2 | 83 | Silver 2 | gap | gossip, intimidate, leadership, lore:any, melee:basic, survival | #15, #17, #48:cultists, #76:any | 2 | Shrine Minister (proposed) |
| 39 | 3 | 83 | Gold 1 | gap | art:writing, entertain:speeches~, lore:politics, perception | #2:any, #60:any, #68, #150 | 4 | High Celebrant (proposed) |
| 39 | 4 | 83 | Gold 4 | gap | language:any, lore:heraldry | #87, #107, #105:any, #117:theology | 2 | Temple Prelate (proposed) |
| 40 | 1 | 84 | Brass 3 | gap | athletics, drink, cool, dodge, endurance, entertain:taunt~, gossip, intimidate, melee:basic*, melee:brawling | #32, #40, #70, #89 | 3 | Boaster (proposed) |
| 40 | 2 | 84 | Brass 5 | gap | bribery, intuition, perception, lockpicking, ride:horse~, stealth:any~ | #28, #48:criminals, #143, #154 | 3 | Hired Fist (proposed) |
| 40 | 3 | 84 | Silver 4 | gap | climb, entertain:acting~, ranged:blackpowder/crossbow/throwing, trade:poisoner | #4, #21, #125, #142 | 4 | Silent Blade (proposed) |
| 40 | 4 | 84 | Gold 1 | gap | animal-care, charm | #45, #64, #90, #124 | 1 | Shadow Master (proposed) |
| 41 | 1 | 85 | Brass 3 | gap | drink, cool, dodge, endurance, gamble, intimidate*, lore:local, melee:basic, melee:brawling, stealth:urban~ | #18, #32, #40, #89 | 3 | Tough (proposed) |
| 41 | 2 | 85 | Brass 5 | gap | bribery, climb, gossip, language:TBD-masked, perception, signs:thief | #4, #46, #48:criminals, #143 | 2 | Enforcer (proposed) |
| 41 | 3 | 85 | Silver 3 | gap | charm, intuition, leadership, ranged:crossbow | #51:watchmen, #94, #95, #114 | 3 | Gang Lieutenant (proposed) |
| 41 | 4 | 85 | Gold 1 | gap | lore:law, lore:politics | #29, #59, #73, #77 | 3 | Syndicate Chief (proposed) |
| 42 | 1 | 86 | Brass 3 | gap | animal-care, animal-training:dog, charm-animal, endurance, haggle, melee:basic, perception, traps*, stealth:underground~, stealth:urban~ | #47, #91, #105:disease, #156 | 4 | Pest Chaser (proposed) |
| 42 | 2 | 86 | Brass 5 | gap | drive, gossip, language:TBD-masked, lore:rats, track, trade:poisoner | #2:hearing, #48:TBD-masked, #51:rats, #158 | 2 | Vermin Warden (proposed) |
| 42 | 3 | 86 | Silver 2 | gap | cool, dodge, intimidate, ranged:crossbow | #67, #136, #142, #160 | 3 | Drain Walker (proposed) |
| 42 | 4 | 86 | Silver 3 | gap | leadership, navigation | #89, #105:poison, #114, #150 | 2 | Pest Contractor (proposed) |
| 43 | 1 | 87 | Brass 4 | gap | athletics, drink, cool, dodge, endurance, melee:basic*, perception, row, sail, swim | #144, #151, #161, #163 | 3 | Dock Cadet (proposed) |
| 43 | 2 | 87 | Silver 2 | gap | charm, climb, gossip, intimidate, intuition, ranged:blackpowder | #32, #66, #91, #122 | 3 | Water Patrolman (proposed) |
| 43 | 3 | 87 | Silver 3 | gap | entertain:storytelling~, evaluate, leadership, lore:riverways | #51:wreckers, #60:any, #94, #145 | 3 | Patrol Mate (proposed) |
| 43 | 4 | 87 | Gold 1 | gap | lore:law, navigation | #29, #77, #89, #100 | 2 | Patrol Master (proposed) |
| 44 | 1 | 88 | Brass 2 | gap | athletics, drink, dodge, endurance*, gossip, lore:local, survival, row, stealth:rural~, swim | #54, #65, #137:wetland, #151 | 3 | Reed Cutter (proposed) |
| 44 | 2 | 88 | Brass 3 | gap | charm, entertain:storytelling~, lore:riverways, melee:polearm, traps, trade:boatbuilder | #31:boatbuilder, #116, #144, #149 | 4 | Waterway Hand (proposed) |
| 44 | 3 | 88 | Brass 5 | gap | haggle, intuition, leadership, perception | #37, #126, #136, #150 | 2 | Stream Sage (proposed) |
| 44 | 4 | 88 | Silver 2 | gap | lore:folklore, sail | #88:boatbuilder, #103, #117:riverways, #163 | 1 | Reach Elder (proposed) |
| 45 | 1 | 89 | Brass 5 | ws,t,i | drink, cool, evaluate, gamble, gossip, intimidate, intuition, melee:basic, perception*, ranged:crossbow | #34, #46, #85, #95 | 3 | Milepost Guard (proposed) |
| 45 | 2 | 89 | Silver 3 | gap | animal-care, charm, charm-animal, entertain:storytelling~, ranged:blackpowder, ride:horse~ | #32, #108, #115, #122 | 4 | Highway Marshal (proposed) |
| 45 | 3 | 89 | Silver 5 | gap | dodge, endurance, leadership, track | #48:soldiers, #51:outlaws, #60:any, #94 | 2 | Marches Captain (proposed) |
| 45 | 4 | 89 | Gold 1 | gap | lore:TBD-masked, navigation | #26, #29, #77, #162 | 2 | Road Commander (proposed) |
| 46 | 1 | 90 | Brass 4 | gap | athletics, climb, drink, cool, endurance, gamble, melee:brawling, row, sail*, swim | #121, #137:coastal, #144, #151 | 3 | Ship Boy (proposed) |
| 46 | 2 | 90 | Silver 2 | gap | dodge, entertain:singing~, gossip, language:any, melee:basic, play:pennywhistle | #23, #122, #145, #149 | 2 | Able Seaman (proposed) |
| 46 | 3 | 90 | Silver 3 | gap | heal, leadership, lore:oceans, trade:boatbuilder | #31:boatbuilder, #99, #141, #148 | 2 | Mate (proposed) |
| 46 | 4 | 90 | Gold 2 | gap | charm, navigation | #100, #102, #103, #118 | 4 | Skipper (proposed) |
| 47 | 1 | 91 | Brass 3 | gap | art:writing, drink, cool, entertain:storytelling~, evaluate, gamble, gossip, language:classical, lore:any*, research | #17, #48:scholars, #113, #118 | 5 | Copyist (proposed) |
| 47 | 2 | 91 | Silver 1 | gap | charm, intuition, language:any, lore:any, melee:brawling, navigation | #79, #95, #131, #140 | 2 | Archivist (proposed) |
| 47 | 3 | 91 | Silver 5 | gap | entertain:lecture~, intimidate, language:any, lore:any | #15, #103, #117:any, #153 | 2 | Keeper of Records (proposed) |
| 47 | 4 | 91 | Gold 1 | gap | entertain:rhetoric~, language:any or lore:any | #8, #82, #87, #117:any | 1 | Master Archivist (proposed) |
| 48 | 1 | 92 | Brass 3 | gap | athletics, climb, endurance, gossip, lore:local, melee:basic, navigation*, survival, perception, stealth:rural~ | #100, #91, #116, #137:all | 4 | Guide (proposed) |
| 48 | 2 | 92 | Brass 5 | gap | charm-animal, cool, ranged:bow/crossbow/sling, signs:scout, stealth:underground~, swim, track | #2:sight, #56, #122, #129 | 2 | Pathfinder (proposed) |
| 48 | 3 | 92 | Silver 1 | gap | animal-care, haggle, lore:geography, ride:horse~ | #26, #67, #125, #126 | 4 | Trailblazer (proposed) |
| 48 | 4 | 92 | Silver 5 | gap | language:any, trade:cartographer | #31:cartographer, #79, #113, #165 | 2 | Wayfinder (proposed) |
| 49 | 1 | 93 | Brass 3 | gap | animal-care, athletics, climb, drink, dodge, endurance*, gossip, haggle, intuition, stealth:any~ | #13, #48:servants, #144, #149 | 1 | Scullion (proposed) |
| 49 | 2 | 93 | Brass 4 | gap | animal-training:dog/horse, charm, charm-animal, drive, gamble, lore:local | #48:any, #65, #125, #165 | 1 | Household Hand (proposed) |
| 49 | 3 | 93 | Silver 3 | gap | cool, evaluate, intimidate, lore:politics | #113, #105:poison, #139, #146 | 4 | Valet (proposed) |
| 49 | 4 | 93 | Gold 1 | gap | leadership, melee:basic | #29, #46, #118, #120 | 5 | Head of Household (proposed) |
| 50 | 1 | 94 | Brass 2 | gap | athletics, drink, cool, dodge, endurance, heal, language:TBD-masked, lore:trolls, melee:basic*, play:horn | #45, #51:everything, #58, #132 | 3 | Grudge Bearer (proposed) |
| 50 | 2 | 94 | Brass 2 | gap | climb, entertain:storytelling~, intimidate, lore:giants, melee:two-handed, survival | #67, #69, #89, #110 | 1 | Beast Breaker (proposed) |
| 50 | 3 | 94 | Brass 2 | gap | evaluate, lore:dragons, perception, ranged:throwing | #5, #64, #104, #114 | 1 | Giant Breaker (proposed) |
| 50 | 4 | 94 | Brass 2 | gap | lore:TBD-masked, navigation | #27, #59, #141, #161 | 1 | Wyrm Breaker (proposed) |
| 51 | 1 | 95 | Brass 4 | s,i,ag | athletics, drink, cool, endurance, lore:local, perception, row, sail, stealth:rural/urban~*, swim | #32, #54, #137:wetland, #144 | 4 | Bundle Carrier (proposed) |
| 51 | 2 | 95 | Silver 1 | gap | bribery, evaluate, haggle, gossip, melee:basic, signs:smuggler | #19, #48:criminals, #91, #163 | 3 | Contraband Runner (proposed) |
| 51 | 3 | 95 | Silver 5 | gap | intuition, leadership, lore:riverways, ranged:blackpowder | #37, #50, #102, #122 | 3 | Master Runner (proposed) |
| 51 | 4 | 95 | Gold 3 | gap | language:any, intimidate | #51:TBD-masked, #77, #118, #164 | 2 | Contraband King (proposed) |
| 52 | 1 | 96 | Brass 5 | gap | athletics, climb, cool, dodge, endurance, gamble, language:TBD-masked, melee:any*, melee:basic, ranged:any | #44, #48:soldiers, #144, #154 | 3 | Hireling (proposed) |
| 52 | 2 | 96 | Silver 2 | gap | drink, entertain:storytelling~, intimidate, survival, perception, play:drum/flute/horn/trumpet | #39, #85, #108, #128 | 3 | Sellsword (proposed) |
| 52 | 3 | 96 | Silver 3 | gap | heal, leadership, lore:warfare, navigation | #26, #47, #159, #162 | 2 | Free Lance (proposed) |
| 52 | 4 | 96 | Gold 1 | gap | lore:heraldry, ride:horse~ | #71, #103, #113, #136 | 7 | Mercenary Captain (proposed) |
| 53 | 1 | 97 | Brass 4 | i,ag,fel | bribery, charm, drink, cool, gamble, gossip*, intuition, melee:basic, perception, stealth:any~ | #13, #48:any, #65, #113 | 2 | Eavesdropper (proposed) |
| 53 | 2 | 97 | Silver 3 | gap | climb, entertain:acting~, language:any, lockpicking, signs:any, sleight-of-hand | #10, #90, #124, #125 | 3 | Shadow Agent (proposed) |
| 53 | 3 | 97 | Gold 1 | gap | animal-care, animal-training:pigeon, leadership, research | #22, #24, #80, #86 | 4 | Handler (proposed) |
| 53 | 4 | 97 | Gold 3 | gap | haggle, lore:any | #19, #120, #139, #153 | 1 | Master of Whispers (proposed) |
| 54 | 1 | 98 | Brass 3 | gap | athletics, climb, drink, dodge, endurance*, gossip, intimidate, melee:basic, melee:brawling, swim | #40, #144, #138, #149 | 2 | Quay Hand (proposed) |
| 54 | 2 | 98 | Brass 5 | gap | bribery, cool, gamble, haggle, lore:local, signs:TBD-masked | #32, #48:criminals, #48:TBD-masked, #161 | 4 | Dock Porter (proposed) |
| 54 | 3 | 98 | Silver 3 | gap | charm, evaluate, intuition, leadership | #37, #46, #89, #103 | 2 | Tally Boss (proposed) |
| 54 | 4 | 98 | Silver 5 | gap | intuition, lore:taxes | #51:merchants, #77, #95, #113 | 2 | Wharf Master (proposed) |
| 55 | 1 | 99 | Brass 3 | gap | athletics, climb, cool, dodge, intimidate, melee:basic, perception, lockpicking, sleight-of-hand, stealth:urban~* | #4, #32, #49, #56 | 3 | Latch Lifter (proposed) |
| 55 | 2 | 99 | Brass 4 | gap | evaluate, gossip, language:TBD-masked, lore:local, signs:thief, traps | #18, #48:criminals, #91, #125 | 3 | Lockbreaker (proposed) |
| 55 | 3 | 99 | Brass 5 | gap | bribery, entertain:acting~, intuition, ranged:crossbow | #80, #124, #134, #156 | 3 | Vault Cracker (proposed) |
| 55 | 4 | 99 | Silver 3 | gap | endurance, gamble | #23, #45, #119, #145 | 2 | Master of Keys (proposed) |
| 56 | 1 | 100 | Brass 5 | gap | charm, drink, evaluate, gamble, gossip, haggle*, intuition, lore:local, research, signs:TBD-masked | #37, #46, #113, #131 | 1 | Counting Clerk (proposed) |
| 56 | 2 | 100 | Silver 1 | gap | bribery, cool, entertain:any~, language:any, melee:brawling, trade:any | #15, #48:any, #65, #118 | 1 | Burgess (proposed) |
| 56 | 3 | 100 | Silver 3 | gap | intimidate, leadership, perception, ranged:blackpowder | #48:any, #80, #94, #139 | 3 | Guild Proprietor (proposed) |
| 56 | 4 | 100 | Gold 3 | gap | entertain:speeches~, lore:politics | #19, #103, #120, #164 | 4 | Civic Head (proposed) |
| 57 | 1 | 101 | Brass 2 | gap | animal-care, athletics, charm-animal, drink, dodge, endurance*, gossip, lore:local, melee:brawling, survival | #67, #135, #144, #149 | 1 | Herd Hand (proposed) |
| 57 | 2 | 101 | Brass 3 | gap | animal-training:any, drive, entertain:storytelling~, melee:basic/polearm/two-handed, ranged:entangling/sling, trade:any | #6, #31:as-trade, #137:any, #138 | 4 | Shepherd (proposed) |
| 57 | 3 | 101 | Brass 5 | gap | bribery, charm, intimidate, leadership | #136, #150, #146, #160 | 3 | Drover (proposed) |
| 57 | 4 | 101 | Silver 2 | gap | intuition, lore:folklore | #88:as-trade, #92, #103, #117:local | 1 | Flockmaster (proposed) |
| 58 | 1 | 102 | Brass 4 | gap | animal-care, athletics, charm-animal, drink, cool, endurance, evaluate*, intuition, lore:local, perception | #6, #48:servants, #91, #126 | 4 | Key Bearer (proposed) |
| 58 | 2 | 102 | Silver 3 | gap | intimidate, melee:basic, survival, ranged:bow, ride:horse~, stealth:rural~ | #89, #116, #137:any, #143 | 3 | Castellan (proposed) |
| 58 | 3 | 102 | Gold 1 | gap | bribery, charm, gossip, leadership | #46, #48:any, #103, #113 | 3 | Lord Marshal of Holdings (proposed) |
| 58 | 4 | 102 | Gold 4 | gap | language:classical, lore:politics | #22, #29, #117:local, #164 | 3 | Provincial Overseer (proposed) |
| 59 | 1 | 103 | Brass 2 | gap | athletics, cool, dodge, endurance, heal, language:classical, leadership*, lore:theology, melee:any, pray | #16:any, #48:cultists, #62, #113 | 5 | Sworn Novice (proposed) |
| 59 | 2 | 103 | Silver 3 | gap | charm, entertain:speeches~, intimidate, language:TBD-masked, melee:any, ranged:any | #45, #71, #76:any, #138 | 2 | Holy Blade (proposed) |
| 59 | 3 | 103 | Silver 5 | gap | animal-care, intuition, perception, ride:horse~ | #26, #107, #122, #136 | 1 | Shrine Captain (proposed) |
| 59 | 4 | 103 | Gold 1 | gap | drive, lore:warfare | #51:any, #64, #61, #162 | 1 | Crusade Commander (proposed) |
| 60 | 1 | 104 | Brass 3 | gap | athletics, drink, cool, dodge, endurance, gamble, gossip, intimidate, melee:basic, perception* | #32, #44, #133, #143 | 3 | Watch Cadet (proposed) |
| 60 | 2 | 104 | Silver 1 | gap | charm, climb, intuition, lore:local, melee:polearm, lockpicking | #18, #47, #89, #91 | 3 | Lantern Guard (proposed) |
| 60 | 3 | 104 | Silver 3 | gap | entertain:storytelling~, haggle, leadership, lore:law | #41, #48:soldiers, #51:criminals, #94 | 3 | Beat Sergeant (proposed) |
| 60 | 4 | 104 | Gold 1 | gap | lore:politics, ride:horse~ | #77, #103, #114, #120 | 4 | Watch Commandant (proposed) |
| 61 | 1 | 105 | Brass 3 | gap | channelling:TBD-masked, charm, cool, gossip, heal, language:TBD-masked*, perception, research, stealth:rural/urban~, trade:herbalist | #75, #98, #113, #123 | 2 | Curious Dabbler (proposed) |
| 61 | 2 | 105 | Silver 1 | gap | channelling:TBD-masked, endurance, evaluate, intimidate, melee:basic/polearm, signs:any | #7:witchcraft, #32, #124, #166 | 2 | Hex Caster (proposed) |
| 61 | 3 | 105 | Silver 4 | gap | leadership, lore:any, lore:magic, ride:horse~ | #3, #30, #84, #89 | 3 | Binder (proposed) |
| 61 | 4 | 105 | Gold 1 | gap | dodge, entertain:speeches~ | #19, #59, #73, #77 | 3 | Coven Head (proposed) |
| 62 | 1 | 106 | Silver 1 | gap | athletics, cool, dodge, gossip, heal, intimidate*, intuition, lore:witches, melee:brawling, perception | #34, #89, #113, #143 | 2 | Questioner (proposed) |
| 62 | 2 | 106 | Silver 3 | gap | entertain:speeches~, melee:basic/fencing, ranged:blackpowder/crossbow, ride:horse~, signs:any, stealth:urban~ | #28, #45, #94, #125 | 6 | Inquisitor (proposed) |
| 62 | 3 | 106 | Gold 1 | gap | charm, endurance, leadership, lore:law | #51:witches, #104, #122, #150 | 2 | Chief Inquisitor (proposed) |
| 62 | 4 | 106 | Gold 2 | gap | lore:TBD-masked, lore:politics | #59, #73, #83, #107 | 2 | Grand Prosecutor (proposed) |
| 63 | 1 | 107 | Brass 3 | gap | channelling:any, cool, gossip, language:classical, language:TBD-masked*, lore:any, lore:magic, melee:polearm, perception, research | #3, #98, #113, #123 | 2 | Arcane Pupil (proposed) |
| 63 | 2 | 107 | Silver 3 | gap | charm, endurance, evaluate, intimidate, intuition, language:TBD-masked | #7:any, #48:scholars, #122, #129 | 3 | Arcanist (proposed) |
| 63 | 3 | 107 | Gold 1 | gap | animal-care, drive or ride:any~, leadership, lore:warfare | #31:any, #75, #84, #89 | 3 | Master Arcanist (proposed) |
| 63 | 4 | 107 | Gold 2 | gap | language:any, lore:any | #38, #59, #73, #155 | 2 | Grand Arcanist (proposed) |
| 64 | 1 | 108 | Brass 2 | gap | climb, drink, dodge, endurance, melee:basic*, survival, lockpicking, row, stealth:rural~, swim | #18, #32, #56, #116 | 3 | Flotsam Gatherer (proposed) |
| 64 | 2 | 108 | Brass 3 | gap | bribery, cool, intuition, navigation, perception, traps | #48:criminals, #91, #151, #156 | 3 | Shore Scavenger (proposed) |
| 64 | 3 | 108 | Brass 5 | gap | gossip, intimidate, melee:brawling, ranged:crossbow/throwing | #70, #89, #145, #163 | 2 | Reef Raider (proposed) |
| 64 | 4 | 108 | Silver 5 | gap | leadership, lore:riverways | #59, #64, #102, #154 | 3 | Wreck Captain (proposed) |
