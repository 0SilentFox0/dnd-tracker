# Slice report (control run, 2026-11-20)

Every row below was appended by the slice run (no existing row touched, no .ts changed, no icons, no commit). Remove by deleting these slugs from the listed files, the `i18n/uk.json` keys with the same slugs, and reverting `manifest.json` counts (races 4, careers 16, feats 50, units 30, spells 30, artifacts 56).

## Added rows (slugs)

- races: `thornkin` (+ `race-profiles.json` row `thornkin`)
- careers: `emissary` (manifest #16), `quarry-taker` (#9)
- feats: `wildwalker` (#116, origin), `winning-ways` (#139), `easy-talker` (#65)
- spells: `leech-touch` (petty, #7), `flame-curtain` (arcane, School of Embers, #69)
- artifacts: `brass-fist` (melee #8), `travel-cloak` (clothing #95, slot cloak, category clothing), `mail-cowl` (#70, helmet)
- units: `twisted-wretch` (#43, knownSpells Leech Touch), `glade-warden` (#3)
- i18n: 61 uk keys appended (`i18n/uk.json`); no glossary change.

## Results

- `pnpm template validate grim-d100`: 0 errors, 13 warnings (all "no icon" = exactly the 13 slice rows; icon inventory `--missing` lists the same 13).
- `pnpm template i18n status grim-d100 uk`: ok 832, stale 0, missing 0, orphan 0. One collision found and fixed: uk "Кольчужний каптур" clashed with existing "Mail Hood" (error `Колізія назв (artifacts)`), renamed.
- `pnpm test:related` (validate.ts, feats/units json): 246 pass, 8 fail, all in `scripts/templates/grim-d100/__tests__/real-data.test.ts` (hard-coded roster/count tests: manifest counts 4/16/50..., unit/spell/feat rosters, "only the six casters know spells", lowlander career table must list every career, coverage warnings). Expected for any added row; roster tests must become count-agnostic before the wave.
- Coverage warning test also shows 25 real findings: `careers "Emissary"/"Quarry Taker": tier N skill "X" is outside the <Class> pool` (athletics, dodge, drive, endurance, haggle, bribery, cool, drink, intimidate, signs, charm, melee:basic, ranged:crossbow, ride, swim ... ). The code-defined per-class skill pools in coverage.ts reject canon skills: BLOCKER for canon careers.

## Blockers (exact)

1. Multi-list blessing (Keen Hand Boon, #147, 5 cult lists, buff): spellIssues returns `lists must be one of: Hearth Rites, Rites of the Tide, ...` (exactly one list allowed), `spell has neither an effect nor an attribute` (buff/utility/manual rows unsupported; only dealDamage/heal/condition), `targeting "ally" does not fit a harmful spell`. Row NOT added; 3rd spell skipped.
2. Armour rows at book prices: Leather Vest (#66) `price 600 p is outside 12–360 p for soft`; used Mail Cowl (price 1440, in band) instead, `partial` flaw dropped (unsupported).
3. Flame Curtain (CN 6) cannot be a known spell of a level-2 unit: `knownSpells "Flame Curtain" CN 6 is above the best SL 3 this unit can reach`; Twisted Wretch knows Leech Touch only. Glade Warden ranged +7 rejected (`damage 7 is outside 2–6 for level 2`), clamped to +6.
4. Career skill-pool test warnings (above).

## Column mapping assessment

- races: clean for mods/move/fate/fortune/extraWounds/skillPicks (`~` skills written without spec). Not expressible: fixed `#2:sight` (used Keen Sighting), choice-pair talents (omitted), random talents 0 (empty `randomTalents` accepted), languages masked (used original `language:glade-speech`), career table lists unresolved careers (22 of the book table; only 7 exist, absorbed unlisted ranges into the next listed career).
- careers: skills clean after mapping (`bribery`->`bribery`, `~` skills without spec, `any`/`all` specs replaced by a concrete pick: language:old-script, language:trade-cant, lore:law). Talents only resolve for names already in feats (Emissary 9/16 with the 3 new feats, Quarry Taker 6/16), so tiers hold 1-4 talents instead of 4. Income marker has no field (not stored). Trappings are counts only, originals invented.
- feats: talents map cleanly as description + maxRank; stat bonus talents (+5 Fel) can only be text (modifyStat allows attackBonus/maxHp/initiative).
- spells: petty/arcane damage and condition rows map cleanly; WP-yd ranges mapped to 60 ft, touch to 5 ft; duration/overcast text is lost; buff/utility/blessing rows do not map (blocker 1).
- equipment: weapon/armour/cloak columns map cleanly (category `clothing` is the first use of `category` in the pack); price/enc outside bands for most book armour.
- bestiary: stats map cleanly; level clamps needed (ranged damage), no spells in the book rows, so knownSpells is a template choice.
