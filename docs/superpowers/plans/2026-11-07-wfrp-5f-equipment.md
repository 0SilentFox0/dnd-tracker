# WFRP 5f Equipment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Executors = Sonnet, no per-task reviews, 5 dispatches (D1 = T1+T2, D2 = T3, D3 = T4+T5, D4 = T6, D5 = T7+T8), one final Opus review of the branch (range from `a3b08f31a`) with fixes in one dispatch, then `/simplify` (1–2 agents). Steps are checkboxes; the plan gives signatures, cases and decisions, not full code — read the named neighbours and follow their style.

**Goal:** wfrp battles and sheets honour equipment: armour AP per location, shield, weapon qualities/flaws, reach, ammo/Reload, 12/20 money, carried weight.

**Architecture:** an item is an existing `Artifact` with a new `system_stats Json?` column; its schema and the derivation rules come from `RuleSystemDefinition.equipment?` / `.currency?` (core never mentions wfrp). Pure modules in `lib/utils/rules/systems/wfrp/equipment/`; battle effects through `from-character` (AP), `extractAttacksFromCharacter` (weapons), `mitigateDamage` (qualities) and `runBattleMutation` (ammo/reload in `battleData`).

**Tech Stack:** Next.js 16, React 19, Prisma 6/Postgres, Zod, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-wfrp-5f-design.md`

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, branch `feat/wfrp`. **No merge/push to main.** Local DB: container `dnd-tracker-wfrp-db-1` (port 54322, db `wfrp`); `.env.local` points at another DB, so override `DATABASE_URL`/`DIRECT_URL` inline to wfrp for prisma/dev server. Never touch prod URLs or `.env.production-db.local`. No prod migrations.
- Layers: components/`app/**` never import `@/lib/api/*` or `fetch`; logic in hooks. ESLint `SYSTEM_IMPORT_PATTERN` forbids importing `@/lib/utils/rules/systems/wfrp*`, `@/lib/hooks/systems/wfrp*`, `@/components/systems/wfrp*` outside system-owned dirs: reach wfrp via `ruleSystemOf(rules).equipment|currency`, `useRuleSystem`, `systemUiOf(key)`. Flags only through `RuleSystemDefinition`, never `key === "wfrp"`. zod schemas are imported through `lib/utils/rules/systems/schemas.ts`, never the main barrel.
- Hook folders have `index.ts` barrels; query keys are factories in `keys.ts`; `@/` alias only; `import/no-cycle` on.
- i18n: uk `scope-size` is 105.0/105 KB — all new uk text goes in the new namespace `wfrpEquipment` (add to `NAMESPACES`, `WFRP_DM_EXTRA`, `global.d.ts`, layout test scope string — like `wfrpCreation`); battle strings only `battleWfrp.damage.steps.*` / `battleWfrp.*` keys; `battleLog.json` gets no wfrp keys. en mirrors uk (parity test). Server errors → `lib/constants/api-errors.ts` + `messages/{uk,en}/errors.json`.
- Migrations expand-only (`ALTER TABLE "artifacts" ADD COLUMN "system_stats" JSONB`; no RLS statement needed, table exists).
- All numbers/prices/weights are stubs with `// verify against 5e book`. Minimal comments otherwise.
- Tests: `pnpm test:run <file>` / `pnpm test:related <files>`; `pnpm exec eslint --fix <touched files>` only; full `pnpm test:run` once at the end after `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. DOM tests start with `// @vitest-environment happy-dom`.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Decisions made here (deviations from spec): hit locations are the existing `HitLocation` keys `head|arm|body|leg` (not `arms/legs`); wfrp types are named `WfrpArmourStats`/`WfrpWeaponStats` (d20 `ArmorStats`/`WeaponStats` already exist in `lib/utils/artifacts`); the armour penalty `armourSl` already derives from AP (`magic/armour.ts`), so wiring AP makes it non-zero — Flexible is carried as `wfrp.flexible` on the participant and zeroes it.

## Review Focus

1. Artifact with `systemStats` on a d20/homm campaign → 400; wfrp artifact without stats or with stats of another kind (armour stats on a weapon slot) → 400/ignored, never a crash in battle (T2).
2. Hero with no equipment, a stats row that fails parse (legacy/edited JSON), or equipped ref to a deleted artifact → AP 0, default attacks, no throw (T2, T5).
3. AP layers over the cap, AP sum with shield on a location with 0 armour, two-handed weapon + shield equipped together (T1, T2, T5).
4. Ranged attack with 0 ammo / still reloading / weapon without `ammoCapacity` (unlimited) → 400 key vs normal attack; battle with no ammo data in old `battleData` → treated as full (T6).
5. Quality `value` missing/negative/huge, unknown quality key in stored stats → ignored with parse, not a crash; `implemented:false` qualities don't alter damage (T4).
6. Money: d20/homm purse math unchanged; wfrp breaking GC→ss→d with change; negative/zero amounts (T7).

---

### Task 1: schema, hook types, equipment pure modules

**Files:**
- Create: `lib/utils/rules/systems/wfrp/equipment/{stats.ts,armour.ts,qualities.ts,constants.ts,index.ts}`, tests in `equipment/__tests__/{stats,armour,qualities}.test.ts`
- Modify: `prisma/schema.prisma` (`systemStats Json? @map("system_stats")` on `Artifact`), migration `prisma/migrations/20261127000000_artifact_system_stats/migration.sql`, `lib/utils/rules/systems/types.ts` (`equipment?: RuleSystemEquipment`), `.../systems/wfrp/index.ts` (wire `equipment: WFRP_EQUIPMENT`), `.../systems/index.ts` (export types), `.../systems/schemas.ts` (export `WfrpArtifactStatsSchema`)

**Interfaces — Produces:**

```ts
// constants.ts  (// verify against 5e book)
export const AP_MAX_PER_LAYER = 8; export const AP_CAP = 12; export const ARMOUR_KINDS = ["soft","mail","plate"] as const;
export const WEAPON_GROUPS = [...] as const; // basic, cavalry, fencing, brawling, flail, parry, polearm, twohanded, bow, crossbow, blackpowder, engineering, entangling, sling, throwing, explosives
// qualities.ts
export const QUALITY_REGISTRY: Record<QualityKey, { kind: "quality"|"flaw"; hasValue: boolean; implemented: boolean }>;
//  implemented: Damaging Impale Penetrating Hack Pummel Precise Accurate Imprecise Undamaging Unreliable Dangerous Slow Fast Blast Pistol Shield Defensive Reload Flexible
//  stored-only (implemented:false): Distract Entangle Wrap Spread TrapBlade Unbreakable Inflict Repeater
export const QualityRefSchema: z.ZodType<{ key: QualityKey; value?: number }>; // value 1..20, required iff hasValue
// stats.ts
export const WfrpArmourStatsSchema; export type WfrpArmourStats = { type: "armour"; locations: Record<HitLocation, number>; kind: "soft"|"mail"|"plate"; qualities: QualityRef[]; weight: number; price: number };
export const WfrpWeaponStatsSchema; export type WfrpWeaponStats = { type: "weapon"; group: WeaponGroup; reach?: "personal"|"very-short"|"short"|"average"|"long"|"very-long"|"massive"; range?: number /*ft*/; damage: { addSb: boolean; flat: number }; qualities: QualityRef[]; flaws: QualityRef[]; twoHanded: boolean; ammoCapacity?: number; weight: number; price: number };
export const WfrpItemStatsSchema = z.discriminatedUnion("type", [Armour, Weapon, WfrpGearStats /* { type:"gear"; weight; price; qualities } */]); // strictObject, weight 0..1000, price 0..1e6, refine: weapon has reach xor range
// armour.ts
export const parseWfrpStats = (raw: unknown): WfrpItemStats | null; // safeParse, null on failure
export function armourAp(equipped: { slot: string; systemStats: unknown }[]): { ap: Record<HitLocation, number>; flexible: boolean };
//  sum of armour layers per location, each layer ≤ AP_MAX_PER_LAYER; plus shield: every equipped item with quality Shield(X) adds X to head/arm/body; clamp each location to AP_CAP; flexible = every armour layer with AP>0 has quality Flexible (and ≥1 layer)
// types.ts
export interface RuleSystemEquipment { statsSchema: typeof WfrpItemStatsSchema /* as ZodType<unknown> */; armourAp: typeof armourAp; parseStats: typeof parseWfrpStats; weaponProfile(stats: unknown): WeaponProfile | null; qualities: typeof QUALITY_REGISTRY }
export type WeaponProfile = { range: "melee"|"ranged"; cells?: number; /* melee reach in cells via cellFeetOf */ rangeFt?: number; damageFlat: number; addSb: boolean; qualities: QualityRef[]; flaws: QualityRef[]; ammoCapacity?: number; twoHanded: boolean }  // defined here, produced in T4
export const WFRP_EQUIPMENT: RuleSystemEquipment;
```

- [ ] **Step 1:** failing tests. `stats.test`: each variant parses; unknown key rejected (strict); AP 9 / negative / non-integer rejected; weapon with neither or both of reach/range rejected; quality needing a value without one rejected, `Shield` value 0 rejected; unknown quality key rejected; `parseWfrpStats(null|garbage)` → `null`. `armour.test`: no items → zeros, `flexible false`; two layers sum per location; cap at `AP_CAP`; shield adds X to head/arm/body only (leg unchanged) even without armour; item with unparsable stats skipped; only slots `armor|shield|weapon|offHand|mainHand` considered (read `ARTIFACT_SLOT_VALUES` in `lib/constants/artifacts.ts`; if a dedicated wfrp shield slot is missing, shield = any weapon-slot item with quality Shield); Flexible-only layers → `flexible true`, mixed → false. `qualities.test`: registry lists every key from the spec, `implemented` flags exactly as above.
- [ ] **Step 2:** run `pnpm test:run lib/utils/rules/systems/wfrp/equipment` → FAIL.
- [ ] **Step 3:** implement; write migration; `prisma generate` + `migrate dev --name artifact_system_stats` with inline wfrp DB URLs; add `equipment` to `RuleSystemDefinition`, d20/homm leave it undefined.
- [ ] **Step 4:** tests pass; add registry-test assertions (wfrp defined, homm/dnd5e undefined); `import/no-cycle` clean; eslint touched files.
- [ ] **Step 5:** commit `feat(wfrp): equipment stats schema, AP assembly, quality registry (5f-1)`.

### Task 2: artifact API accepts `systemStats`, AP + shield into battle

**Files:**
- Modify: `lib/schemas/artifacts.ts` (+ `systemStats: z.unknown().nullable().optional()` on create/patch), `app/api/campaigns/[id]/artifacts/route.ts` and `[artifactId]/route.ts` (or the helper they delegate to — follow the neighbour), `lib/utils/battle/participant/from-character.ts` (line ~276 area), `lib/utils/rules/systems/wfrp/combat/participant.ts`, `.../combat/index.ts`, `.../magic/armour.ts`, `lib/constants/api-errors.ts` + errors.json (`SYSTEM_STATS_UNSUPPORTED`, `SYSTEM_STATS_INVALID`), `types/artifacts.ts` (`systemStats?: unknown | null`), content layer/templates serialisers that enumerate artifact columns (grep `sourceHash`/artifact column lists in `lib/server/templates`, `lib/server/content`: `systemStats` must survive template sync and hash), tests next to each

**Interfaces:**
- Consumes: `ruleSystemOf(rules).equipment` (`statsSchema`, `armourAp`), `EquippedArtifactRow` (`toEquippedArtifacts`).
- Produces: `wfrpAbilitiesOf(characteristics, gear?: { ap: Record<HitLocation, number>; flexible?: boolean })` — **signature change** (2nd arg was the AP record; update all callers/tests); `WfrpParticipantStats.flexible?: true`; `armourSl(p)` returns 0 when `p.abilities.wfrp?.flexible`; `RuleSystemCombat.participantFields?(row, gear?)` with `gear = ruleSystemOf(rules).equipment?.armourAp(equippedRowsWithStats)`; shared `validateSystemStats(rules, stats): { ok: true; value: unknown | null } | { ok: false; key: ApiErrorKey }` in `lib/server/artifacts/system-stats.ts`.

Decisions: create/patch with `systemStats` non-null: `equipment` undefined → 400 `SYSTEM_STATS_UNSUPPORTED`; schema failure → 400 `SYSTEM_STATS_INVALID` with Zod issues; `null` clears; omitted keeps. Any change to `systemStats` on a PATCH goes through the same code path that today recomputes `sourceHash` for template-synced rows. Snapshot rule: `snapshotHash` is written wherever participant snapshots are built (existing code path — do not bypass).

- [ ] **Step 1:** failing tests: route create/patch — d20 campaign + `systemStats` → 400 `SYSTEM_STATS_UNSUPPORTED`; wfrp valid armour/weapon → 201/200 and stored; invalid → 400 `SYSTEM_STATS_INVALID`; `null` clears; omitted keeps; DM-only as before. `from-character` integration (mock style from `wfrp-battle-e2e.test.ts`): equipped mail + shield → participant `abilities.wfrp.ap` per location expected, `flexible` flag; hero with no gear / deleted ref / garbage stats → AP zeros, no throw; `armourSl` non-zero for AP head 3, zero when `flexible`; `wfrpAbilitiesOf` callers updated (`rg wfrpAbilitiesOf`), `combat.test` AP-from-gear case; damage e2e: `mitigateDamage` with the armoured target subtracts location AP (existing `computeWfrpDamage`) and shield value shows in the `ap` step; template-sync test: `systemStats` copied and changes `sourceHash`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (route stays thin: Zod → `validateSystemStats` → write). **Step 4:** pass; `pnpm test:related lib/schemas/artifacts.ts lib/utils/battle/participant lib/utils/rules/systems lib/server/templates lib/server/content`; eslint. **Step 5:** commit `feat(wfrp): artifact systemStats API and AP/shield in battle (5f-1)`.

---

### Task 3: DM stats editor, sheet AP, M11 (UI + i18n)

**Files:**
- Create: `components/systems/wfrp/equipment/{ArtifactStatsEditor.tsx,ArmourFields.tsx,WeaponFields.tsx,QualityListEditor.tsx,EquippedArmourSummary.tsx}`, `messages/{uk,en}/wfrpEquipment.json`, tests under `components/systems/wfrp/equipment/__tests__/`
- Modify: `components/systems/types.ts` (`SystemUi.ArtifactStatsEditor?: ComponentType<{ value: unknown; onChange(v: unknown): void; slot: string }>`; `SystemUi.EquippedSummary?: ComponentType<{ campaignId: string; characterId: string }>`), `components/systems/wfrp/index.ts` (both via `next/dynamic` — zod must not reach client entry chunks; `client-entry-imports` test stays green), artifact DM form (find with `rg "artifact" components/artifacts -l`) renders the slot when present and sends `systemStats`, the hero inventory/sheet panel renders `EquippedSummary` read-only (AP head/arm/body/leg + armour penalty + shield), `lib/hooks/systems/wfrp/useEquippedAp.ts` (computes through `armourAp` from the sheet's equipped artifacts), `lib/utils/rules/systems/types.ts` + wfrp index (`identity: { alignments: boolean }` flag; wfrp `false`, d20/homm `true`), `components/systems/wfrp/creation/IdentityStep.tsx` (hide alignment select when `!identity.alignments`; `cleanIdentity` in `useWfrpDraftForm.ts` drops it), `lib/i18n/{config,scopes}.ts`, `global.d.ts`, `app/campaigns/[id]/__tests__/layout.test.tsx`, `types/artifacts.ts` client type

**Interfaces:** components call only hooks (`useRuleSystem`, `useEquippedAp`, existing artifact mutation hooks); the editor emits `WfrpItemStats | null` validated client-side through `system.equipment.parseStats` (expose via hook, not an import).

- [ ] **Step 1:** failing tests: editor renders armour fields (4 location number inputs, kind select, quality list) for armour slot and weapon fields for weapon slot, emits parsed stats, blocks invalid (AP 9), quality row add/remove with value input only for `hasValue` qualities; summary shows AP per location and "armour penalty" text key; d20 campaign's artifact form renders no slot; IdentityStep without alignments flag has no alignment select and the submitted body has none; en/uk parity (`pnpm test:run lib/i18n`); `scope-size` ≤ 105 KB; `client-entry-imports` green; layout test updated.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (HUD form components per `.claude/rules/components.md`; 375 px single column, 44 px targets). **Step 4:** pass; `pnpm test:related` on touched files; eslint (Cyrillic rule applies to code, not messages). **Step 5:** commit `feat(wfrp): artifact stats editor, equipped AP summary, no alignments (5f-1)`.

---

### Task 4: weapon profile and quality effects (pure)

**Files:**
- Create: `lib/utils/rules/systems/wfrp/equipment/{weapon-profile.ts,quality-effects.ts}`, tests `equipment/__tests__/{weapon-profile,quality-effects}.test.ts`
- Modify: `.../combat/mitigate.ts`, `.../combat/resolve-attack.ts` (to-hit mods), `.../combat/damage.ts` (min-damage option), `lib/utils/rules/systems/types.ts` (`MitigateCtx` += `attackRoll?: number`, `weapon?: WeaponProfile`-derived `qualities?: QualityRef[]`, `flaws?: QualityRef[]`; `BattleAttack` in `types/battle.ts` += `wfrp?: { qualities: QualityRef[]; flaws: QualityRef[]; ammoCapacity?: number; reload?: number }`), `messages/{uk,en}/battleWfrp.json` (`damage.steps.<quality>` keys for each damage-affecting quality), tests in `combat/__tests__/mitigate-qualities.test.ts`

**Interfaces — Produces:**

```ts
export function weaponProfile(stats: unknown): WeaponProfile | null; // from WfrpWeaponStats; reach→cells via cellFeetOf (6 ft), ranged rangeFt→cells
export type QualityEffect = { toHit: number; damage: number; damageSl?: number; apIgnored?: number; minDamage?: number; fumbleFrom?: number };
export function qualityEffects(p: { qualities: QualityRef[]; flaws: QualityRef[] }, roll: { attackRoll: number; netSl: number; crit: boolean; sb: number; ap: number }): { effect: QualityEffect; steps: { key: string; value: number }[] };
```

Stub rules (all `// verify against 5e book`, pinned by tests, implemented only if `QUALITY_REGISTRY[k].implemented`):
- Damaging: damage SL = `max(netSl, units digit of attackRoll)`. Impale: on crit damage += `sb`. Penetrating: AP halved (round down). Hack: on crit target AP −1 on that hit (min 0). Pummel: on crit +2 damage. Precise: +1 damage SL on hit. Undamaging: minimum damage 0 instead of `MIN_DAMAGE`.
- Accurate: +10 to hit. Imprecise: −10 to hit. Unreliable: attack roll ≥ 96 is a fumble (miss). Dangerous: attack roll ≥ 91 is a fumble (miss). Slow: −10 to hit (heavy swing). Fast: +5 to hit. Blast X, Pistol, Defensive, Reload: **no damage/to-hit effect here** — Pistol: ranged attack allowed against adjacent targets without the point-blank refusal (T5); Blast X: `targetType: "aoe"`, radius X cells (T5); Defensive: +5 to defender's parry target when the defender wields it; Reload: T6.
- Every changed number appears as a step line (`battleWfrp.damage.steps.<key>`), `side` by `key` as in `mitigate.ts`.

- [ ] **Step 1:** failing tests: `weaponProfile` melee `average` reach → cells via `cellFeetOf`, ranged 60 ft → 10 cells, `null` for armour stats/garbage, two-handed flag; `qualityEffects` each quality above with exact numbers (units digit 7 vs netSl 2; crit vs non-crit; Penetrating with ap 5 → ignored 2; Undamaging with total ≤ 0 → 0); `implemented:false` qualities (e.g. Wrap) change nothing; value-less/unknown ignored; `mitigateWfrpDamage` with a quality-bearing attack → amount and steps order (weapon, sb, netSl, tb, ap, quality steps, minimum, crit); no qualities → output identical to current (regression, existing tests unchanged); `resolveWfrpAttack` Accurate/Imprecise/Unreliable cases and fumble → miss.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; thread `attack.wfrp` into `MitigateCtx` where `mitigateDamage` is called (`rg "mitigateDamage"` in `lib/utils/battle`). **Step 4:** pass; `pnpm test:related lib/utils/rules/systems/wfrp lib/utils/battle/attack`; eslint; i18n parity. **Step 5:** commit `feat(wfrp): weapon profiles and quality effects (5f-2)`.

### Task 5: wfrp attacks from equipped weapons

**Files:**
- Modify: `lib/utils/battle/participant/extract-attacks.ts` (+ new `extract-wfrp-attacks.ts` beside it), `lib/utils/battle/participant/from-character.ts` (pass `equipment` hook through `opts`), `lib/utils/battle/grid` reach check (`attackReachError` — Pistol, Blast), tests `lib/utils/battle/participant/__tests__/extract-attacks-wfrp.test.ts`

**Interfaces:**
- Consumes: `RuleSystemEquipment.weaponProfile`, `parseStats`, `AttackType`, `cellFeetOf`.
- Produces: `extractWfrpAttacks(equippedRows, equipment, names): ExtractedAttack[]` — `damageDice` = `String(damage.flat)` plus `+SB` marker consumed by existing wfrp damage path (read `heroAttackDamageParts` to keep `weapon` = flat only; `sb` is added by `computeWfrpDamage` already, so `addSb:false` weapons must subtract nothing — implement `addSb:false` as `attack.wfrp.noSb: true` honoured in `mitigate.ts`); `range` string = reach/range in the unit the d20 path expects (feet → existing parser); `type` MELEE/RANGED from profile; `id` = artifact ref; `wfrp` payload from T4; `extractAttacksFromCharacter(..., opts.equipment?)` uses it when `opts.equipment` set instead of the d20 modifier path; no usable weapon → existing default attacks. Two-handed weapon + equipped shield: attack allowed, shield bonus dropped (`armourAp` ignores Shield when a `twoHanded` weapon is equipped — extend T1 `armourAp` signature input with `twoHanded` flag and test).

- [ ] **Step 1:** failing tests: sword (flat 4, addSb) → melee attack with range cells from reach; bow 60 ft → ranged; both → two attacks, defaults only for missing types; garbage stats → defaults; non-wfrp rules → d20 path untouched (existing tests green); Pistol adjacent ranged target allowed, plain bow adjacent refused (reuse the existing refusal rule if present, otherwise test only the Pistol exemption flag); Blast 2 → aoe radius 2; `addSb:false` weapon → damage steps lack `sb`; two-handed + shield → AP without shield.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** pass; `pnpm test:related lib/utils/battle/participant lib/utils/battle/grid`; eslint. **Step 5:** commit `feat(wfrp): attacks from equipped weapons (5f-2)`.

### Task 6: ammo and Reload

**Files:**
- Create: `lib/utils/battle/ammo/{init.ts,spend.ts,reload.ts,index.ts}` (generic, system-neutral: reads `attack.wfrp.ammoCapacity`/`reload`), tests `lib/utils/battle/ammo/__tests__/`
- Modify: `types/battle.ts` (`BattleParticipantBattleData` += `ammo?: Record<string, number>; reload?: Record<string, number>`), participant builders (init ammo at participant creation — find where `battleData` is first built, `from-character.ts`), `lib/server/battles/mutations/attack/attack-mutation.ts` (reject + spend), turn-start path (`lib/utils/battle/turn/`, decrement `reload` via `advanceTurn` hooks only), client-delta + snapshot code (delta carries `battleData` changes, `snapshotHash` untouched because ammo is `battleData`, not `snapshot`), `lib/constants/api-errors.ts` + errors.json (`OUT_OF_AMMO`, `WEAPON_RELOADING`), attack UI: ammo badge + disabled state in the existing attack button component (find with `rg "attacks.map" components/battle`; strings under `battleWfrp.ammo.*`), tests next to each

**Interfaces — Produces:**

```ts
export function initAmmo(attacks: BattleAttack[]): Record<string, number> | undefined; // attack.id → ammoCapacity; undefined when no attack has capacity
export function ammoStatus(p: BattleParticipant, attack: BattleAttack): "ok" | "empty" | "reloading"; // missing battleData.ammo/reload → "ok" (old battles)
export function spendAmmo(p: BattleParticipant, attack: BattleAttack): BattleParticipant; // ammo −1; if ammo hits 0 and attack.wfrp.reload>0, reload[attack.id] = reload... 
export function tickReload(p: BattleParticipant): BattleParticipant; // each action of the owner (turn end) reload −1 (min 0); at 0 delete key and refill ammo to capacity
```

Decisions: Reload X means X owner turns to reload after the magazine empties (ruling; spec: «зменшується діями»); capacity-less attacks are unlimited; a thrown/ranged attack spends exactly 1; rejection happens before any dice/state change and surfaces as `BattleRuleError`/`ruleErrorOf("action_rejected", key)` → HTTP 400 with the Ukrainian text key; ammo is not persisted between battles (spec); all writes go through `runBattleMutation` (delta response, no full scene).

- [ ] **Step 1:** failing tests: `initAmmo` (bow cap 12 → `{id: 12}`, none → undefined); `ammoStatus` ok/empty/reloading/legacy; `spendAmmo` decrements and arms reload at 0 for Reload 1; `tickReload` countdown, refill at 0; attack mutation: attack at 0 ammo → 400 `OUT_OF_AMMO` with no state change, reloading → 400 `WEAPON_RELOADING`, success spends one and delta contains the participant's updated `battleData.ammo`, melee/unlimited untouched, turn end of the owner ticks reload, other participants' turn end does not; old participant without `battleData.ammo` attacks normally; component test: badge shows `ammo/capacity`, button disabled while empty/reloading; errors.json parity.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** pass; `pnpm test:related lib/utils/battle lib/server/battles`; `lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts` stays green; eslint. **Step 5:** commit `feat(wfrp): ammunition and Reload in battle (5f-2)`.

---

### Task 7: currency hook (12/20 money)

**Files:**
- Modify: `lib/constants/inventory.ts` (keep `COIN_VALUE` as the default table, export `DEFAULT_CURRENCY`), `lib/utils/inventory/money.ts`, `lib/utils/rules/systems/types.ts` (`currency?: RuleSystemCurrency`), wfrp index, `lib/utils/rules/systems/index.ts`, UI that prints/edits coins (`rg "COIN_VALUE|COINS" components lib/hooks -l`), `lib/hooks/inventory` or wherever the purse is formatted, `messages/{uk,en}/wfrpEquipment.json` (`money.gc|ss|d`), tests `lib/utils/inventory/__tests__/money.test.ts`

**Interfaces — Produces:** `RuleSystemCurrency = { coins: readonly Coin[]; value: Record<Coin, number>; labelKeys: Record<Coin, string> }`; wfrp: coins `gp|sp|cp` (columns `gold|silver|copper` unchanged) with `value {gp: 240, sp: 12, cp: 1}`, labels `wfrpEquipment.money.*`; `toCopper(p, value = COIN_VALUE)`, `spendCoins(purse, amount, coin, value = COIN_VALUE)`, `gainCoins` unchanged, `formatCoins(delta, label)` unchanged; callers pass `ruleSystemOf(rules).currency?.value`; a hook `useCurrency(campaignId)` returns `{ value, label(coin) }`.

- [ ] **Step 1:** failing tests: with default table existing money tests pass untouched; wfrp table: `toCopper({gp:1,sp:1,cp:1}) = 253`, `spendCoins` 1 ss from 1 gp → change 11 d via 12-table, purse `{gp:1,sp:0,cp:0}` paying 5 sp → `{gp:0,sp:7,cp:0}`, insufficient → `null`, zero/negative amount behaves as today; stash/permissions code using money (`lib/utils/inventory/stash-actions.ts`) with the wfrp table; d20/homm UI renders old labels.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; thread the table through every caller found by grep. **Step 4:** pass; `pnpm test:related lib/utils/inventory lib/constants/inventory.ts`; eslint; i18n parity. **Step 5:** commit `feat(wfrp): 12/20 currency system hook (5f-3)`.

### Task 8: carried weight advisor

**Files:**
- Create: `lib/utils/rules/systems/wfrp/equipment/encumbrance.ts` (+ test), `components/systems/wfrp/equipment/EncumbranceBar.tsx` (+ test)
- Modify: `lib/utils/rules/systems/types.ts` (`RuleSystemEquipment.encumbrance(items: {systemStats: unknown}[], characteristics: Characteristics): { carried: number; limit: number; over: boolean }`), `EquippedArtifactSummary` from T3 renders the bar, messages `wfrpEquipment.encumbrance.*`

Decisions: `carried` = sum of `weight` of equipped + backpack artifacts with parsable stats (count/quantity from the backpack entry if present — read `lib/utils/inventory/backpack.ts`); `limit = SB + TB` (`// verify against 5e book`); advisor only: no battle effect, no state.

- [ ] **Step 1:** failing tests: sum of equipped + backpack, quantity multiplication, unparsable items count 0, limit from characteristics (S 40 / T 30 → 7), `over` boundary equal → false; component shows text key and over styling.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** pass; eslint; parity. **Step 5:** commit `feat(wfrp): carried weight advisor (5f-3)`.

---

### Task 9 (controller, after D5): docs and verification

- [ ] Check `ps` then full `pnpm test:run` once; `pnpm exec tsc --noEmit` if the script exists; eslint only on the branch's touched files (`git diff --name-only a3b08f31a`).
- [ ] Live-run by a Sonnet subagent on the wfrp dev server (inline DB override), 375 px via iframe: DM creates armour (mail with Flexible and plate), shield, sword with Damaging, bow with Reload 1 and ammo 3, tests the stats editor (invalid AP rejected); player equips; sheet shows AP/penalty/weight; battle: AP reduces damage with steps in the log, shield adds AP, quality steps appear, bow spends ammo, reloads, rejects at empty; money in GC/ss/d on the stash; regression: a dnd5e campaign — artifacts form without wfrp slot, attacks and purse unchanged (PASS/FAIL list). Screenshots scale 0.5, prefer JS/text checks; delete test data afterwards.
- [ ] Final Opus review of `a3b08f31a..HEAD`; fixes in one dispatch; `/simplify` (1–2 agents).
- [ ] Update `docs/architecture/rule-systems.md` («Межі 5f»: column, hooks, stubs, shield-without-reactions, unimplemented qualities, no wear/repair, trappings not linked, `arm|leg` naming), `docs/architecture/battle.md` (ammo/reload in `battleData`), `docs/STATUS.md`, memory `project-wfrp`. Pre-deploy migration list of the epic += `artifact_system_stats`.

## Self-review (spec coverage)

Data/migration/schema validation → T1, T2; `RuleSystemEquipment` + AP layering/cap + armourSl + Flexible + shield → T1, T2; DM editor slot, sheet AP, M11 → T3; qualities subset and `implemented:false` → T1 registry, T4 effects; weapon profile, reach→cells, attacks → T4, T5; ammo/Reload + errors + deltas → T6; money 12/20 → T7; weight advisor → T8; tests, live-run, docs → each task + T9. Deviations listed in Global Constraints.
