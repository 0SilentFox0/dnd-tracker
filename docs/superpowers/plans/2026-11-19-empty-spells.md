# Empty SRD spells (canon audit 2, lane D1)

160 SRD spells had empty `spellEffects` and no zone (darkness, fog-cloud, spike-growth are lane A zone spells and
count as done). Goal: none left. Status per group: todo / done. Overrides live in
`scripts/srd/overrides/spells.ts` (+ `spells-utility.ts`). `scripts/srd/__tests__/fixtures/dm-resolved-spells.json`
is the explicit list of still-bare spells (target: empty).

| Group | Engine concept | Spells | Status |
| --- | --- | --- | --- |
| Teleport | `teleportSelf` (spell-only, uses the aimed cell) | misty-step, dimension-door | todo |
| Teleport-narrative | duration marker + log | teleport, teleportation-circle, word-of-recall, plane-shift, gate, transport-via-plants, tree-stride, wind-walk, etherealness, astral-projection, project-image, instant-summons | todo |
| Max HP | `maxHpBoost` base effect | aid | todo |
| Revive | existing `raiseDead` + `allyDead` targeting | raise-dead, resurrection, true-resurrection, reincarnate, clone, create-food-and-water (heal) | todo |
| Counter | enemy Con save, `disable_spell_casting` for the round (cast cannot be paused) | counterspell | todo |
| Dispel | `cleanse.includeBuffs` | dispel-magic, remove-curse, dispel-evil-and-good | todo |
| Summon | `summonInline` statblocks | animate-dead, animate-objects, arcane-hand, conjure-minor-elementals, create-undead, find-familiar, find-steed, giant-insect, phantom-steed, planar-ally, summon-dragon, unseen-servant, floating-disk, guardian-of-faith, simulacrum, mage-hand, awaken, planar-binding | todo |
| Transform | `transform` unit refs | polymorph, true-polymorph, shapechange, alter-self, animal-shapes, gaseous-form | todo |
| Buff / debuff | modifyStat, flag, conditions | darkvision, see-invisibility, true-seeing, spider-climb, levitate, jump, feather-fall, water-walk, water-breathing, death-ward, nondetection, glibness, true-strike, shillelagh, goodberry, heroes-feast, enthrall, calm-emotions, sanctuary, globe-of-invulnerability, antilife-shell, magic-circle, forbiddance, hallow, seeming, dragons-breath, confusion, time-stop, true-strike | todo |
| Control / terrain | zone, createTerrain, conditions | forcecage, resilient-sphere, reverse-gravity, silence, wall-of-stone, move-earth, stone-shape, plant-growth, control-water, control-weather, daylight, light, dancing-lights, continual-flame, create-or-destroy-water, creation, fabricate | todo |
| Narrative | duration marker + log note | all remaining (identify, detect-*, divination, scrying, commune*, speak-with-*, tongues, message, sending, ...) | todo |
