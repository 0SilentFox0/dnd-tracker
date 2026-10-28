# Рішення, ухвалені під час реалізації (2026-10-08)

Зібрано з журналів виконання; формат: рішення — чому — ціна помилки.

## 2026-10-08-races-engine-wave-2
- Ruling: per-task reviews sonnet, final opus — user memory light economy — cost if wrong: weaker per-task gate
- Task 1/2: minor (deferred): racial icon test doesn't pin skill per race; ownMinMorale requires target self vs ownHasFlag; maxStacks refresh keeps old dotDamage/source; no tests for resistance-all immunity/combination; no editor UI for stackable/maxStacks
- Task 3: Ruling: reset-then-add overwrites leftover pendingExtraActions only for participants with actionsPerTurn — extra actions are turn-scoped — cost if wrong: a Нагорода action carried to next turn is lost
- Task 3: minor (deferred): attack/critical.ts:62 sets hasUsedAction directly, bypassing applyMainActionUsed (pre-existing, also affects wave-1 grantAction) — candidate for final fix wave; no test for pool spend / passive flat
- Task 4: Ruling: no own-turn check on ability-action (MEMBER access) — matches bonus-action/attack/spell project precedent — cost if wrong: out-of-turn use, same as existing actions
- Task 5: minor (deferred): server doesn't validate target side (pre-existing); no multi-select UI test; picked/aiming reset duplication
- Task 6: Ruling: summon group = unit race name, tier = unit.level (units-import CSV Tier→level, Група→race) — cost if wrong: wrong pool
- Task 6: Ruling: summon pool via unstable_cache (300 s staleness after unit edits unless tag invalidated) acceptable — reference-data pattern
- Task 6: Ruling: raiseDead accepts any non-active unit (dead or unconscious) — user said «повалених», consistent with targetDead (!isActive) — cost if wrong: unconscious enemies can be raised
- Task 7: Ruling: Семгрун 'per round' = mark on attacker expires at the attacker's own turn start (engine duration semantics) — cost if wrong: window is attacker-turn based, not round based
- Task 7: minor (deferred): no direct tests for not-in-all/any, requiresDeadTarget with not, hasMark null event/subjects; long hasMark line; duplicated fixture
- Task 6 follow-up af1f0f0: Ruling: not separately reviewed (minor-fix commit), covered by final review; residual: auras baked from old side stay on raised units
- Ruling: server auto-rolls the missing 2nd d20 when exactly one of adv/disadv applies; wizard pre-selects mode from predicted flags
- Ruling: raiseDead targets = non-hero units only; revive-heal abilities = ally side only; validator rejects before use is recorded; raiseDead implies dead targets
- Ruling: Кха-Белех — attack wizard «Усі вороги» quick-select when maxTargets ≥ living enemies
- Ruling: one extra targeted fix beyond the single final fix wave — real correctness bug introduced by the wave, small and local — cost if wrong: one more review cycle
- Ruling: Кха-Белех = new flag attackHitsAllEnemies (any attack kind, auto-targets all living enemies, full damage each) instead of maxTargets — maxTargets multi-target is ranged-only and widening it would also widen Постріл по 2 цілям to melee — cost if wrong: one more flag

## 2026-10-08-spell-model
- Ruling: fresh implementer (spell-impl, sonnet) for this plan — engine-impl context is long — cost if wrong: slightly more ramp-up
- Ruling: per-task reviews sonnet, final opus — light economy memory
- Task 1: Ruling: types/spells.ts Spell interface kept loose (raw rows), new types re-exported + SpellWithDefinition; bounds maxTargets 1–20, dice 0–20 accepted
- Task 2: Ruling: assertSpellDice returns boolean; mutation (Task 5) throws 422 — cost if wrong: none
- Ruling (user, 2026-10-08): no per-task reviews — only the final whole-branch review; Task 3 not separately reviewed
- Incident: controller docs commit 6e8b4fa swept spell-impl's staged deletions of old spell pipeline (intentional Task 5 deletions). Ruling: no rewrite; Task 5 commit restores a compiling tree; controller commits only with --only in the shared tree
- Ruling: one fix wave = Important 1-3 + minors 4,5,6,7,10 (cheap, correctness); 8,9,11,12 deferred

## 2026-10-08-skills-spells-library
- Ruling: content writing tasks (2-4) on opus for prose quality (user asked for vivid fantasy descriptions); T1/T5 sonnet
- Ruling: per user, no per-task reviews; final review only
- Ruling: set isEnableInSkillTree=false for all seeded main skills (legacy flag, historically inverted; only the print page shows it) — pending small fix
- Ruling: branch levels absolute per level 10/20/30 % (spec, user-approved; revert the +15 change which rested on the cumulative misreading), Захист 10/20/30, Лідерство morale 1/2/3
- Ruling: engine — racial levels become a level line (highest learned only), data stays absolute per spec
- Ruling: Воскресіння/Відродження лісу → heal {percentOf maxHp, revive:true} (ally-side rule already enforced)
- Ruling: school power skills stay damage-only; reword to «шкода заклять»
- Ruling: seed keeps DM-edited spellEffects of summon-placeholder spells (skip effects update when existing row already has a summon effect)
