# WFRP 5e talents manifest (166)

Source: `sections/04-skills-and-talents.md`, pages 114-128 (alphabetical list; a few pages interleave skill text), spot-checked against `pages/pNNN.md`. Companion to package C1 (3 waves of about 40). "Book name" is a reference key only: never copy it, nor any book text, into data. The effect column is an original paraphrase (12 words or fewer).

**Max rank is not in the extract.** The book prints the maximum per talent (typically a characteristic bonus or a small number) but the extract dropped those lines for every talent. The column shows what the body states ("stated") or `?`; read p114-128 scans for the rest. Existing template rows keep their current `maxRank` in the last column. `xpCost` is always 100 (M-05).

"Tests" lists skills or characteristic tests the effect text mentions (automatic scan; `-` = none named). "Gate" talents unlock a system (magic, faith); generator note: the template schema holds only description + `maxRank`, so mechanics stay in system code. Talents with a specialisation in brackets (Craftsman, Savant, Etiquette, Fearless, Hatred, Resistant, Striding Gait, Impassioned Zeal, Acute Sense, Artistic, Bless, Invoke, Arcane Magic, Chaos Magic, Master Tradesman) are grouped: decide between one row per specialisation or one generic row with a text note.

| # | p. | book name (ref) | original name | max rank (extract) | tests | effect category | effect (paraphrase) | in template (existing max) |
|---|---|---|---|---|---|---|---|---|
| 1 | 114 | Accurate Shot | **Steady Aim** | ? | - | ranged combat | extra ranged damage, more when aiming | yes `steady-aim` (fuzzy; max 2) |
| 2 | 114 | Acute Sense (Sense) | **Keen Sense (Sense)** | >=2 (stated) | Perception | skill bonus | one sense sharpened for Perception detection | partial: Keen Sighting+Keen Ears cover 2 senses |
| 3 | 114 | Aethyric Attunement | **Steadied Weave** | >=2 (stated) | - | magic | roll twice on minor miscast table, pick better | no |
| 4 | 114 | Alley Cat | **Alley Prowler** | ? | Stealth | skill bonus | advantage on urban Stealth, knows quick city routes | no |
| 5 | 114 | Ambidextrous | **Both-Handed** | ? | - | melee combat | no off-hand penalty | no |
| 6 | 114 | Animal Affinity | **Way with Beasts** | ? | - | survival / utility | wild animals stay calm unless provoked | yes `way-with-beasts` (fuzzy; max 1) |
| 7 | 115 | Arcane Magic (Lore) | **Lore Casting (Lore)** | ? | - | magic | unlocks spells of one arcane lore, gate talent | no |
| 8 | 115 | Argumentative | **Quibbler** | ? | Cool | social | drag opponents into endless debate via opposed Charm | no |
| 9 | 115 | Artistic (Art) | **Artist's Gift (Art)** | ? | Art | crafting | may always advance Art, bonus to one art form | no |
| 10 | 115 | Attractive | **Striking Looks** | ? | - | social | Charm on attracted targets gains extra effect | no |
| 11 | 115 | Battle Rage | **Simmering Fury** | ? | - | melee combat | enter frenzy without a test, rage benefits | no |
| 12 | 115 | Beat Blade | **Blade Bind** | ? | Melee | melee combat | trade damage for opponent losing defence option | no |
| 13 | 115 | Beneath Notice | **Unremarked** | ? | - | social | blend in around social betters if dressed right | no |
| 14 | 115 | Berserk Charge | **Reckless Rush** | ? | - | melee combat | charging adds damage | no |
| 15 | 115 | Blather | **Fast Talker** | ? | Charm | social | opposed Charm to talk out of being caught | yes `fast-talker` (fuzzy; max 1) |
| 16 | 116 | Bless (Deity) | **Patron's Boon (Patron)** | ? | - | faith | grants all blessings of one patron, gate talent | no |
| 17 | 116 | Bookish | **Lamp-Lit Studies** | ? | Research | skill bonus | advantage on Research | yes `lamp-lit-studies` (fuzzy; max 3) |
| 18 | 116 | Break and Enter | **Lock Whisperer** | ? | Pick Lock, S test | skill bonus | spot best way in; advantage on Pick Lock/forcing | yes `lock-whisperer` (fuzzy; max 2) |
| 19 | 116 | Briber | **Palm Greaser** | ? | Bribery | social | read bribe price; advantage on Bribery | no |
| 20 | 116 | Cardsharp | **Stacked Deck** | ? | Gamble | social | reroll opposed Gamble on doubles, cheat edge | no |
| 21 | 116 | Careful Strike | **Measured Blow** | ? | - | melee combat | reduced called-shot penalty in melee | no |
| 22 | 116 | Carouser | **Seasoned Reveller** | ? | Consume Alcohol, Endurance | social | modest drinking has no effect | no |
| 23 | 116 | Catfall | **Feline Landing** | ? | Athletics | movement | falls count as deliberate, advantage on Athletics when falling | no |
| 24 | 116 | Cat-tongued | **Silver Tongue** | ? | Charm | social | advantage on Charm to lie convincingly | yes `silver-tongue` (fuzzy; max 2) |
| 25 | 116 | Chaos Magic (Lore) | **Dark Weave (Lore)** | ? | - | magic | corrupt lore spells at soul cost, gate talent | no |
| 26 | 116 | Combat Aware | **Battle Instinct** | ? | Perception | defence | Perception test to avoid Surprised | yes `battle-instinct` (fuzzy; max 1) |
| 27 | 116 | Combat Master | **Battle Press** | ? | - | melee combat | counts as two for outnumbering | no |
| 28 | 117 | Combat Reflexes | **Snap Reaction** | ? | - | melee combat | roll combat initiative twice, keep best | yes `snap-reaction` (fuzzy; max 3) |
| 29 | 117 | Commanding Presence | **Parade-Ground Voice** | ? | Leadership | social | natural leader in crises; advantage on Leadership | yes `parade-ground-voice` (fuzzy; max 1) |
| 30 | 117 | Concoct | **Roadside Brewer** | ? | - | crafting | free brewing endeavour each session without workshop | no |
| 31 | 117 | Craftsman (Trade) | **Gifted Craftsman (Trade)** | ? | - | crafting | advantage on one Trade, may advance freely | no |
| 32 | 117 | Criminal | **Lawless Earner** | ? | - | social | doubles income from criminal enterprise | no |
| 33 | 117 | Contortionist | **Supple Frame** | ? | Athletics | movement | squeeze through gaps; advantage on Athletics escapes | no |
| 34 | 117 | Coolheaded | **Steel Nerves** | ? | - | stat bonus | +5 Willpower | yes `steel-nerves` (fuzzy; max 1) |
| 35 | 117 | Crack the Whip | **Whip Hand** | ? | Drive | skill bonus | animals act and move; advantage on Drive | no |
| 36 | 117 | Deadeye Shot | **Pinpoint Shot** | ? | - | ranged combat | reduced called-shot penalty at range | no |
| 37 | 117 | Dealmaker | **Haggler's Instinct** | ? | Haggle | skill bonus | advantage on Haggle | yes `haggler-s-instinct` (fuzzy; max 2) |
| 38 | 117 | Detect Artefact | **Relic Sense** | ? | Intuition | magic | feel magic in an item by touch | no |
| 39 | 118 | Dicer | **Gaming Streak** | ? | Gamble | skill bonus | advantage on Gamble | no |
| 40 | 118 | Dirty Fighting | **Tavern Brawler** | ? | - | melee combat | unarmed called shot to body inflicts crit instead | yes `tavern-brawler` (fuzzy; max 1) |
| 41 | 118 | Disarm | **Weapon Wrest** | ? | - | melee combat | trade damage to disarm on high SL | no |
| 42 | 118 | Distract | **Diversion** | ? | Perception, Sleight of Hand | melee combat | use Move for opposed test to unsettle target | no |
| 43 | 118 | Doomed | **Marked Fate** | ? | - | species / origin | foretold death grants bonus; origin ritual | no |
| 44 | 119 | Drilled | **Formation Drill** | ? | - | melee combat | allies disengage freely, shoulder-to-shoulder bonus | no |
| 45 | 119 | Dual Wielder | **Twin Blades** | ? | - | melee combat | free off-hand attack without momentum cost | no |
| 46 | 119 | Embezzle | **Skim the Till** | ? | - | social | income using Bribery or Evaluate instead | no |
| 47 | 119 | Enclosed Fighter | **Tight-Quarters Fighter** | ? | Melee | melee combat | ignore confined-space melee penalties | no |
| 48 | 119 | Etiquette (Social Group) | **Court Manners (Group)** | ? | - | social | blend into one social group | yes `court-manners` (fuzzy; max 1) |
| 49 | 119 | Fast Hands | **Light Fingers** | ? | Melee, Sleight of Hand | skill bonus | advantage on Sleight of Hand and brawling tricks | yes `light-fingers` (fuzzy; max 2) |
| 50 | 119 | Fast Shot | **Quick Draw** | ? | - | ranged combat | pistol shot before initiative begins | no |
| 51 | 119 | Fearless (Enemy) | **Unafraid (Foe)** | ? | - | mental / psychology | immune to fear from chosen enemy group | no |
| 52 | 119 | Feint | **False Attack** | ? | - | melee combat | force defence by Intuition when you hold momentum | no |
| 53 | 119 | Field Dressing | **Field Bandager** | ? | Heal | skill bonus | advantage on Heal, improvised bandages | no |
| 54 | 119 | Fisherman | **Line and Net** | ? | - | survival / utility | feed party by fishing | no |
| 55 | 119 | Flagellant | **Penance Bearer** | ? | - | faith | ignore pain and critical penalties | no |
| 56 | 120 | Flee! | **Bolt for It** | ? | - | movement | extra move when disengaging or fleeing | no |
| 57 | 120 | Fleet-footed | **Swift Stride** | ? | - | stat bonus | +1 Movement | no |
| 58 | 120 | Frenzy | **Blood Fury** | ? | WP test | melee combat | Willpower test to frenzy: extra attacks, ignore psychology | no |
| 59 | 120 | Frightening | **Dread Aspect** | ? | Melee | melee combat | gain Fear trait forcing psychology tests | no |
| 60 | 120 | Hatred (Group) | **Bitter Grudge (Group)** | ? | Ranged | mental / psychology | hatred of a group, forced to attack it | no |
| 61 | 120 | Holy Hatred | **Wrathful Prayer** | ? | - | faith | miracle wounds deal extra damage | no |
| 62 | 120 | Holy Visions | **Sacred Sight** | ? | - | faith | sense holy ground and divine power | no |
| 63 | 120 | Hunter’s Eye | **Game Finder** | ? | Outdoor Survival (hunt) | survival / utility | find game to feed group (text partly lost in extract) | no |
| 64 | 120 | Furious Assault | **Flurry Strike** | ? | - | melee combat | once per round lose momentum for extra attack | no |
| 65 | 120 | Gregarious | **Easy Talker** | ? | Gossip | skill bonus | advantage on Gossip, find rumour spots | no |
| 66 | 120 | Gunner | **Powder Hand** | ? | - | ranged combat | ignore Dangerous flaw on powder weapons | no |
| 67 | 120 | Hardy | **Tough Hide** | ? | - | stat bonus | add Toughness Bonus again to Wounds | yes `tough-hide` (fuzzy; max 3) |
| 68 | 121 | Impassioned Zeal (Cause) | **Fervent Cause (Cause)** | ? | Charm | social | advantage on Charm when speaking for chosen cause | no |
| 69 | 121 | Implacable | **Slow to Bleed** | ? | - | condition / recovery | gain one fewer Bleeding condition | no |
| 70 | 121 | In-fighter | **Short-Blade Trick** | ? | Melee | melee combat | negate longer-weapon bonus, opposed trick action | no |
| 71 | 121 | Inspiring | **Rallying Voice** | ? | Leadership | skill bonus | advantage on Leadership in combat | no |
| 72 | 121 | Iron Jaw | **Hard Head** | ? | - | condition / recovery | first Stunned each encounter reduced by one | no |
| 73 | 121 | Iron Will | **Unbowed Will** | ? | Cool, Fel test | mental / psychology | advantage on Cool against others' influence | no |
| 74 | 121 | Jump Up | **Spring Back** | ? | Perform | movement | advantage on acrobatics; recover from Prone with test | no |
| 75 | 121 | Instinctive Diction | **Clean Incantation** | ? | - | magic | reduce minor miscast roll by 20 | no |
| 76 | 121 | Invoke (Deity) | **Rite Keeper (Patron)** | ? | - | faith | learn and memorise miracles of one patron, gate talent | no |
| 77 | 121 | Kingpin | **Respected Rogue** | ? | - | social | Criminal talent no longer draws suspicion | no |
| 78 | 121 | Lightning Reflexes | **Quick Feet** | ? | - | stat bonus | +5 Agility | no |
| 79 | 121 | Linguistics | **Tongue for Tongues** | ? | Language | skill bonus | advantage on Language, cheaper language advances | yes `tongue-for-tongues` (fuzzy; max 3) |
| 80 | 122 | Lip Reading | **Lip Reader** | ? | Intuition | skill bonus | read speech by sight via Intuition test | no |
| 81 | 122 | Luck | **Fortune's Favour** | 3 (stated) | - | fortune | +1 max Fortune, up to three times | no |
| 82 | 122 | Magnum Opus | **Masterwork Maker** | >=2 (stated) | Fel test | crafting | create one extraordinary work with an Art | no |
| 83 | 122 | Magic Resistance | **Spell Ward** | ? | - | magic | reduce SL of spells affecting you by 3, bars casting | no |
| 84 | 122 | Magical Sense | **Weave Sense** | ? | - | magic | notice spellcasting nearby without being a caster | no |
| 85 | 122 | Marksman | **Steady Shooter** | ? | - | stat bonus | +5 Ballistic Skill | no |
| 86 | 122 | Master of Disguise | **Face Changer** | ? | - | social | alter appearance with posture and clothing | no |
| 87 | 122 | Master Orator | **Spellbinding Speaker** | ? | Lore | social | sound convincing on any topic, bonus to speech tests | no |
| 88 | 122 | Master Tradesman (Trade) | **Seasoned Tradesman (Trade)** | ? | - | crafting | use rolled SL or unit die on a Trade | no |
| 89 | 122 | Menacing | **Looming Menace** | ? | Intimidate | skill bonus | advantage on Intimidate, deters thieves | no |
| 90 | 122 | Mimic | **Accent Mimic** | ? | Entertain, Perform | skill bonus | advantage on acting/comedy tests, copy accents | no |
| 91 | 123 | Night Vision | **Night Owl** | ? | - | species / origin | see in natural darkness | yes `night-owl` (fuzzy; max 1) |
| 92 | 123 | Nimble-fingered | **Deft Hands** | ? | - | stat bonus | +5 Dexterity | no |
| 93 | 123 | Noble Blood | **Gentle Birth** | ? | - | social | treated one Status tier higher when dressed well | no |
| 94 | 123 | Nose for Trouble | **Trouble Sniffer** | ? | Intuition | skill bonus | advantage on Intuition, find fights and gambles | no |
| 95 | 123 | Numismatics | **Coin Lore** | ? | Evaluate, Lore | skill bonus | advantage identifying coin and artefact origin | no |
| 96 | 123 | Panhandle | **Alms Charm** | ? | Charm | social | advantage on Charm while begging | no |
| 97 | 123 | Perfect Pitch | **True Ear** | ? | Entertain, Play | skill bonus | learn tunes by ear; advantage singing and playing | no |
| 98 | 123 | Petty Magic | **Minor Gift** | ? | - | magic | manifest three petty spells, gate talent | no |
| 99 | 123 | Old Salt | **Sea Dog** | ? | - | skill bonus | use rolled SL or unit die on Row/Sail at sea | no |
| 100 | 123 | Orientation | **Inner Compass** | ? | Navigation | skill bonus | advantage on Navigation, know north | no |
| 101 | 124 | Pharmacist | **Dose Maker** | ? | - | crafting | extra dose when creating remedies | no |
| 102 | 124 | Pilot | **Helm Craft** | ? | Row, Sail | skill bonus | advantage on Row and Sail through danger | no |
| 103 | 124 | Public Speaker | **Crowd Reader** | ? | Charm, Leadership | social | rouse crowds, gauge mood, bonus to speech | yes `crowd-reader` (fuzzy; max 1) |
| 104 | 124 | Relentless | **Dogged Pursuit** | ? | Ride | movement | test to keep up with disengaging opponent | no |
| 105 | 124 | Resistant (Threat) | **Hardened Against (Threat)** | ? | - | condition / recovery | once per session bonus resisting a chosen threat | no |
| 106 | 124 | Resolute | **Grim Resolve** | ? | Cool | condition / recovery | Cool test to keep momentum when gaining a condition | no |
| 107 | 124 | Pure Soul | **Untainted Soul** | ? | - | mental / psychology | double corruption points before mutation test | no |
| 108 | 124 | Rapid Reload | **Swift Reload** | ? | - | ranged combat | reduce Reload flaw rating by one | no |
| 109 | 124 | Reaction Strike | **Charge Stopper** | ? | I test | melee combat | Initiative test for free attack when charged | no |
| 110 | 124 | Reversal | **Turn the Tables** | ? | Melee | melee combat | keep momentum when struck but your test succeeded | no |
| 111 | 124 | Riposte | **Counterstrike** | ? | - | melee combat | win defence to deal damage back | no |
| 112 | 124 | River Guide | **River Reader** | ? | - | skill bonus | no test for safe rivers unless hard | yes `river-reader` (fuzzy; max 1) |
| 113 | 124 | Read/Write | **Lettered** | ? | - | skill bonus | read and write any spoken language | yes `lettered` (fuzzy; max 1) |
| 114 | 124 | Robust | **Fast Mender** | ? | - | condition / recovery | heal two additional Wounds on healing tests | no |
| 115 | 125 | Roughrider | **Saddle Hardened** | ? | Ride | skill bonus | mount handling in poor conditions, direct mount actions | no |
| 116 | 125 | Rover | **Wildwalker** | ? | Stealth | skill bonus | advantage on rural Stealth, find easy routes | no |
| 117 | 125 | Savant (Lore Specialisation) | **Deep Scholar (Lore)** | ? | - | skill bonus | bonus SL on one lore specialisation | no |
| 118 | 125 | Savvy | **Sharp Mind** | ? | - | stat bonus | +5 Intelligence | no |
| 119 | 125 | Scale Sheer Surface | **Wall Climber** | ? | Climb | skill bonus | advantage on Climb, sheer surfaces climbable | no |
| 120 | 125 | Schemer | **Plot Weaver** | ? | - | social | extra yield from Gossip or Lore (Politics) | no |
| 121 | 125 | Sea Legs | **Deck Steady** | ? | - | survival / utility | never seasick, advantage at sea | no |
| 122 | 125 | Seasoned Traveller | **Road-Worn** | ? | - | skill bonus | advance local lore freely where you are | yes `road-worn` (fuzzy; max 2) |
| 123 | 125 | Second Sight | **Weave Seer** | ? | - | magic | perceive magical currents | no |
| 124 | 125 | Secret Identity | **Double Life** | ? | - | social | adopt an alternate persona with another career | no |
| 125 | 125 | Shadow | **Tail Master** | ? | Perception | skill bonus | follow marks unseen, sense when to abandon tail | no |
| 126 | 125 | Sharp | **Sharp Senses** | ? | - | stat bonus | +5 Initiative | no |
| 127 | 125 | Sharpshooter | **Crack Marksman** | ? | Ranged | ranged combat | ignore prone and cover penalties at range | no |
| 128 | 125 | Shieldsman | **Shield Drill** | ? | Melee | melee combat | lose momentum to share shield AP with ally | yes `shield-drill` (fuzzy; max 1) |
| 129 | 126 | Sixth Sense | **Danger Sense** | ? | Intuition | survival / utility | test to avoid traps and ambushes | no |
| 130 | 126 | Sniper | **Long Shot** | ? | - | ranged combat | reduced penalties at long range | no |
| 131 | 126 | Speedreader | **Page Turner** | ? | - | skill bonus | read very fast (text partly lost in extract) | no |
| 132 | 126 | Slayer | **Giant's Bane** | ? | - | melee combat | gain momentum when charged by larger creature | no |
| 133 | 126 | Sprinter | **Fast Runner** | ? | Athletics | skill bonus | advantage on Athletics to run and jump | no |
| 134 | 126 | Step Aside | **Fencer's Footwork** | ? | - | melee combat | successful Dodge lets you move 2 yards and disengage | yes `fencer-s-footwork` (fuzzy; max 1) |
| 135 | 126 | Stone Soup | **Hearty Eater** | ? | - | survival / utility | party foraging always feeds you | yes `hearty-eater` (fuzzy; max 2) |
| 136 | 126 | Stout-hearted | **Stout Heart** | ? | - | condition / recovery | first Broken each encounter reduced by one | no |
| 137 | 127 | Striding Gait (Terrain) | **Terrain Strider (Terrain)** | ? | - | movement | ignore movement penalties in chosen terrain | no |
| 138 | 127 | Sturdy | **Pack Mule** | ? | - | stat bonus | Strength Bonus counts twice for encumbrance | yes `pack-mule` (fuzzy; max 1) |
| 139 | 127 | Suave | **Winning Ways** | ? | - | stat bonus | +5 Fellowship | no |
| 140 | 127 | Super Numerate | **Quick Reckoner** | ? | - | skill bonus | fast mental arithmetic (text lost in extract) | no |
| 141 | 127 | Strike Mighty Blow | **Heavy Hitter** | ? | - | melee combat | extra melee damage, more with advantage | no |
| 142 | 127 | Strike to Injure | **Vital Strike** | ? | - | melee combat | roll crit twice and choose, easier called shots | no |
| 143 | 127 | Strike to Stun | **Cudgel Work** | ? | - | melee combat | improvised weapons pummel; easier stun called shots | yes `cudgel-work` (fuzzy; max 1) |
| 144 | 127 | Strong Back | **Oarsman's Back** | >=2 (stated) | S test | stat bonus | +1 SL opposed Strength, +1 encumbrance | yes `oarsman-s-back` (fuzzy; max 1) |
| 145 | 127 | Strong Legs | **Spring Legs** | ? | Evaluate | skill bonus | use rolled SL or unit die on Athletics jumps | no |
| 146 | 127 | Supportive | **Dutiful Aide** | ? | Charm | social | ignore Status penalty with Charm to superiors | no |
| 147 | 127 | Sure Shot | **Telling Shot** | ? | - | ranged combat | extra ranged damage, more with advantage | no |
| 148 | 127 | Surgery | **Steady Hands** | ? | - | skill bonus | use rolled SL or unit die on Heal out of combat | yes `steady-hands` (fuzzy; max 2) |
| 149 | 127 | Tenacious | **Stubborn Grit** | ? | ? | condition / recovery | uncertain, text lost in extract; likely vigour/recovery | no (book body lost; uncertain) |
| 150 | 127 | Strong-minded | **Focused Mind** | ? | - | mental / psychology | once per session ignore negative modifiers on a test | no |
| 151 | 127 | Strong Swimmer | **Born Swimmer** | ? | Swim | skill bonus | advantage on Swim, bonus in swimming pursuits | yes `born-swimmer` (fuzzy; max 1) |
| 152 | 127 | Tinker | **Jack of Repairs** | ? | - | crafting | repair almost anything, Trades count as basic | no |
| 153 | 128 | Tower of Memories | **Memory Palace** | ? | - | skill bonus | perfect recall of large information | no |
| 154 | 128 | Warrior Born | **Blade Practice** | ? | - | stat bonus | +5 Weapon Skill | yes `blade-practice` (fuzzy; max 2) |
| 155 | 128 | War Wizard | **Battle Weaver** | ? | Channelling | magic | cast low-CN spell as free action in combat | no |
| 156 | 128 | Trapper | **Snare Wise** | ? | Set Trap | skill bonus | advantage on Set Trap, quick snares | no |
| 157 | 128 | Trick Rider | **Saddle Acrobat** | ? | - | skill bonus | use Perform skills and Dodge while mounted | no |
| 158 | 128 | Tunnel Fighter | **Tunnel Stalker** | ? | Stealth | skill bonus | advantage on underground Stealth, track depth | no |
| 159 | 128 | Unshakeable | **Veteran's Poise** | ? | - | condition / recovery | no Broken test from powder weapon fire | yes `veteran-s-poise` (fuzzy; max 1) |
| 160 | 128 | Very Resilient | **Oxen Constitution** | ? | - | stat bonus | +5 Toughness | yes `oxen-constitution` (fuzzy; max 2) |
| 161 | 128 | Very Strong | **Mighty Arm** | ? | - | stat bonus | +5 Strength | no |
| 162 | 128 | War Leader | **Field Commander** | ? | - | social | allies use your Leadership instead of Cool | no |
| 163 | 128 | Waterman | **Barge Hand** | ? | - | skill bonus | use rolled SL or unit die on Row/Sail on rivers | no |
| 164 | 128 | Wealthy | **Deep Pockets** | >=2 (stated) | - | social | extra gold from career income | no |
| 165 | 128 | Well-prepared | **Always Ready** | ? | - | survival / utility | once per session produce a small needed trapping | no |
| 166 | 128 | Witch! | **Wild Spark** | ? | - | magic | learn one spell from colour or witch lore without gate | no |

## Flags and issues

- Count check: 166 talent headings in the extract (target about 166). Category tally: melee combat 27, ranged combat 8, condition / recovery 8, crafting 7, defence 1, faith 5, fortune 1, magic 11, mental / psychology 5, movement 6, skill bonus 40, social 24, species / origin 2, stat bonus 14, survival / utility 7.
- Text of a few entries is lost or mixed in the extract: Accurate Shot (no body), Hunter's Eye (body migrated into the Hardy entry), Speedreader (body migrated into the Slayer entry), Super Numerate (no body), Tenacious (body partly migrated into Strong Swimmer; effect uncertain, treat as unknown until scan). Their effect lines above are inferred from names and neighbouring text and flagged where inferred.
- Characteristic-bonus talents (Coolheaded, Lightning Reflexes, Marksman, Nimble-fingered, Savvy, Sharp, Suave, Very Resilient, Very Strong, Warrior Born) give +5 to one characteristic without counting as an advance; Swift Stride gives +1 Movement; Fortune's Favour gives +1 max Fortune. Only two kinds of engine modifier exist in the template schema today (`attackBonus|maxHp|initiative`), so most rows are description + `maxRank`.
- Gate talents (system hooks): Lore Casting, Dark Weave (lore casting), Minor Gift (petty magic), Patron's Boon and Rite Keeper (blessings, miracles), Weave Seer, Weave Sense, Spell Ward, Battle Weaver, Wild Spark. Hand these to the magic/religion work (C4), rows only need description + maxRank here.
- Fuzzy matches to existing rows (name kept, max rank and text may need revisiting): Steady Aim, Way with Beasts, Fast Talker, Lamp-Lit Studies, Lock Whisperer, Silver Tongue, Battle Instinct, Snap Reaction, Parade-Ground Voice, Steel Nerves, Haggler's Instinct, Tavern Brawler, Court Manners (Group), Light Fingers, Tough Hide, Tongue for Tongues, Night Owl, Crowd Reader, River Reader, Lettered, Road-Worn, Shield Drill, Fencer's Footwork, Hearty Eater, Pack Mule, Cudgel Work, Oarsman's Back, Steady Hands, Born Swimmer, Blade Practice, Veteran's Poise, Oxen Constitution.
- Existing feats NOT matched to a book talent (keep, rename into the book scheme, or retire): Keen Sighting (general, max 1); Watchful (general, max 1); Last Stand Grit (general, max 1); Ambusher (general, max 1); Knife Thrower (general, max 1); Alert Sleeper (general, max 2); Trail Sense (general, max 2); Weather Eye (general, max 1); Green Thumb (general, max 1); Iron Stomach (general, max 1); Keen Ears (general, max 1); Quick Study (origin, max 1); Stone Sense (origin, max 1); Deep Sight (origin, max 1); Light Step (origin, max 1); Underfoot (origin, max 1); Twilight Eyes (origin, max 1); Long Memory (origin, max 1). The seven origin talents are homebrew species perks and have no book counterpart (the book species talents are ordinary talents from this list, see `races.md`).
- Existing rows with a many-to-one fit: Keen Sighting and Keen Ears each cover one Acute Sense specialisation; Iron Stomach covers one Resistant (Threat) specialisation; Tavern Brawler is matched to Dirty Fighting only loosely.
- Original names were checked against `scripts/templates/grim-d100/forbidden-terms.ts` (see report); the generator must re-run `pnpm template validate grim-d100`, which includes the forbidden-terms test.
