# Вибір ефектів крита/провалу ДМом — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Кроки з чекбоксами `- [ ]`. План лаконічний: сигнатури, рішення, тест-кейси; повний код лише там, де він неочевидний. Перед кожним завданням прочитай файли зі списку «Files».

**Goal:** опціональне налаштування кампанії «ДМ обирає ефекти крита/провалу»: на нат. 20/1 (атаки + рятівні кидки цілей заклинань) дія ставиться на паузу, ДМ обирає ефекти в модалці, дія повторюється з тим самим сідом; вимкнено — ефект випадковий.

**Architecture:** `battle_scenes.pendingCritChoice` (за зразком `pendingMoraleCheck`) зберігає вихідний запит + сід rng + тригери. `runWithCritChoice` обгортає мутації атаки/заклинання: перший прохід збирає тригери через `CritPicker`, при вимкненому/увімкненому прапорі й тригерах — відкидає результат і пише pending; роут `crit-choice` (лише DM) повторює збережений запит із сідом і вибором. Публічна проєкція pending без `request`/`seed`.

**Tech Stack:** Next.js 16, Prisma 6, Zod, Vitest, TanStack Query, Pusher (існуючий delta-пайплайн).

**Spec:** `docs/archive/superpowers/specs/2026-10-28-crit-choice-design.md`

## Global Constraints

- Усі тексти UI/помилок — українською; ідентифікатори — англійською. Мінімум коментарів (лише неочевидне «чому», один рядок).
- Міграції expand-only; нових таблиць немає (RLS-тест лишається зеленим).
- Шари: компоненти не імпортують `@/lib/api/*`; запити в `lib/api/battles.ts`, мутації через `useBattleAction` у `lib/hooks/battles/useBattles.ts`; query keys — фабрики.
- Діалоги тільки `ResponsiveDialog` (`hud`); submit-кнопка у `footer` з `form="<id>"`; ≤ ~7 props, callbacks — одним об'єктом.
- `import/no-cycle`, `simple-import-sort`, `padding-line-between-statements` (запускати `pnpm lint --fix`); `no-console` поза `scripts/`.
- Ядро не імпортує режими мапи: `mulberry32`/`seedFrom` переносяться з `modes/maze/rng.ts` у `lib/utils/common/rng.ts` (maze реекспортує).
- Все, що пише `battle_participants.snapshot`, пише `snapshotHash` (ця фіча його не чіпає).
- Тести: `pnpm test:related <files>` під час роботи; повний `pnpm test:run` один раз наприкінці (Task 8). Коміти — з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Працювати в окремому worktree/гілці `feat/crit-choice` (`superpowers:using-git-worktrees`).

## Review Focus

1. Гравець не може підсунути `critChoices`/`seed` у тіло `attack`/`spell` (вибір лише через `crit-choice`, DM) — Task 5.
2. Волей/cleave з кількома критами: ключі тригерів унікальні, усі тригери в одній модалці, неповний або з чужим id вибір відхиляється — Tasks 3, 6.
3. Під час pending усі інші дії відхиляються (`crit_pending`), але DM може `rollback`/`reset`/`complete`/`crit-choice` — Tasks 5, 6.
4. Гравці не отримують `request`/`seed`/кидки в delta, GET чи Pusher — Task 5.
5. Прапор вимкнено посеред pending: pending усе одно розв'язується; нові дії — випадкові ефекти без pending. Повтор із сідом дає ідентичний результат незалежно від того, вибрано ефект чи випадковий (кожен тригер споживає рівно один `rng()`) — Tasks 3, 6.

---

### Task 1: Схема, міграція, налаштування кампанії

**Files:**
- Modify: `prisma/schema.prisma` (`Campaign.critChoiceByDm Boolean @default(false)`; `BattleScene.pendingCritChoice Json?`) + нова міграція через `pnpm exec prisma migrate dev --name crit_choice` (перевір SQL: два `ADD COLUMN`, без `DROP`)
- Modify: `lib/schemas/campaigns.ts` (update-схема: `critChoiceByDm: z.boolean().optional()`; create — `default(false)`), `app/api/campaigns/[id]/route.ts` (PATCH пише поле, як `allowPlayerEdit` ~рядок 81), `lib/api/campaigns.ts`, `types/campaigns.ts` (обидва інтерфейси з `allowPlayerEdit`), GET кампанії — віддає поле
- Modify: `components/campaigns/settings/CampaignSettingsDialog.tsx`
- Test: сусідні `__tests__` схем/роуту кампанії (знайди тести `allowPlayerEdit`) та тест діалогу, якщо існує

**Interfaces:**
- Produces: `CampaignSettings.critChoiceByDm: boolean` (types/campaigns.ts); поле в PATCH `/api/campaigns/[id]`.

- [ ] **Step 1:** Тест схеми: update-схема приймає `critChoiceByDm: true`, відкидає не-boolean; PATCH-роут зберігає значення (за зразком тесту `allowPlayerEdit`). Запусти — FAIL.
- [ ] **Step 2:** Додай поля в `schema.prisma`, `prisma migrate dev`, `prisma generate`; доплумб схема/роут/тип/API.
- [ ] **Step 3:** У діалозі після чекбокса `allow-player-edit` додай `<Checkbox id="crit-choice-by-dm" …>` + `<Label>` «ДМ обирає ефекти крита/провалу» і одним рядком `text-xs` під ним: «Вимкнено — ефект випадковий». Ключ у `set("critChoiceByDm", v === true)`.
- [ ] **Step 4:** `pnpm test:related <змінені файли>` — PASS; `pnpm exec prisma validate`.
- [ ] **Step 5:** Commit `feat(campaign): critChoiceByDm setting + pendingCritChoice column`.

---

### Task 2: Таблиці ефектів для спасків і нові типи ефектів

**Files:**
- Create: `lib/constants/save-critical-effects.ts` (`SAVE_SUCCESS_EFFECTS`, `SAVE_FAIL_EFFECTS`: `CriticalEffect[]`, id 1..6, `flavor` ≥ 2 рядки з `{attacker}`/`{target}`, укр.)
- Create: `lib/utils/battle/crit-choice/catalog.ts`
- Modify: `lib/constants/critical-effects.ts` (додати в `CriticalEffectType`: `negate_damage | ac_buff | negate_effects | extra_action`), `lib/utils/battle/attack/critical.ts` (`SPECS` + `applyCriticalEffect`)
- Test: `lib/constants/__tests__/save-critical-effects.test.ts`, `lib/utils/battle/attack/__tests__/critical.test.ts` (доповнити)

**Interfaces:**
- Produces (`catalog.ts`):
```ts
export type CritKind = "success" | "fail";
export type CritSource = "attack" | "save";
export const critEffectsFor = (source: CritSource, kind: CritKind): readonly CriticalEffect[];
export const getCritEffect = (source: CritSource, kind: CritKind, id: number): CriticalEffect | undefined;
export const randomCritEffect = (source: CritSource, kind: CritKind, rng: Rng): CriticalEffect; // рівно один rng()
```
(`attack` → існуючі `CRITICAL_*_EFFECTS`; `save` → нові.)

Вміст таблиць — за спекою, розділ 2 (успіх: 1 `negate_damage`, 2 `advantage_next_attack`, 3 `free_attack`, 4 `ac_buff` +2 до кінця раунду, 5 `negate_effects`, 6 `extra_action`; провал: 1 `double_damage`, 2 `prone`, 3 `disadvantage_next_attack`, 4 `ac_debuff` −2, 5 `lose_reaction`, 6 `block_bonus_action`). `negate_damage`/`negate_effects`/`double_damage` на спасках застосовуються в Task 4 (не через `applyCriticalEffect`): у `SPECS` вони `null`. `ac_buff` — `modifyStat armor +2` з `duration: 1` (як `ac_debuff` зі знаком +). `extra_action` — `grantExtraActions` (подивись `participant/helpers`); якщо семантика не підходить, заміни `free_attack` і онови опис.

- [ ] **Step 1:** Тести: id унікальні й 1..N; `flavor.length ≥ 2`; кожен `effect.type` з обох таблиць є ключем `SPECS` або в списку «обробляється в спеллі» (`negate_damage`, `negate_effects`, `double_damage`); `randomCritEffect` споживає рівно один `rng()` (лічильник-обгортка) для обох джерел; `applyCriticalEffect` з `ac_buff` додає модифікатор +2 і він зникає після раунду, `extra_action` дає +1 дію. FAIL.
- [ ] **Step 2:** Реалізуй таблиці, типи, `SPECS`, `catalog.ts`.
- [ ] **Step 3:** `pnpm test:related lib/constants/save-critical-effects.ts lib/utils/battle/attack/critical.ts` — PASS.
- [ ] **Step 4:** Commit `feat(crit): save-throw critical effect tables`.

---

### Task 3: Сідований rng, `CritPicker` і гейт

**Files:**
- Create: `lib/utils/common/rng.ts` (перенеси `Rng`, `mulberry32`, `seedFrom` з `modes/maze/rng.ts`; maze-файл реекспортує та лишає `randInt`/`pick`/`shuffled`)
- Create: `lib/utils/battle/crit-choice/types.ts`, `gate.ts`, `index.ts`
- Modify: `lib/utils/abilities/engine/core/types.ts` (`AbilityRunContext.crit?: CritPicker`), `lib/utils/battle/attack/roll.ts` (опція `crit?: CritPicker`), `lib/utils/battle/attack/process/run.ts` (передає `flow.ctx.crit` у обидва виклики), `lib/utils/battle/attack/retaliation.ts` (`crit: flow.ctx.crit`), `lib/utils/battle/attack-phase/run-attack-phase.ts` (приймає `crit?: CritPicker` у `AttackPhaseInput` і кладе в `flow.ctx` через `processAttack` params — простеж ланцюжок до `flow` у `run.ts:44`)
- Test: `lib/utils/battle/crit-choice/__tests__/gate.test.ts`, `lib/utils/battle/attack/__tests__/critical.test.ts` або `roll`-тест

**Interfaces:**
```ts
// types.ts
export interface CritTriggerInfo { source: CritSource; kind: CritKind; actorId: string; targetId: string }
export interface CritTrigger extends CritTriggerInfo { key: string }
export type CritPicker = (info: CritTriggerInfo) => CriticalEffect;
export interface PendingCritChoice { action: "attack" | "spell"; actorId: string; triggers: CritTrigger[] }
export interface StoredPendingCritChoice extends PendingCritChoice { request: unknown; seed: number }
export interface CritResume { seed: number; choices: Record<string, number> } // key → effect id
// gate.ts
export function createCritGate(opts: { rng: Rng; choices?: Record<string, number> }): { rng: Rng; pick: CritPicker; triggers: CritTrigger[] };
```
`calculateAttackRoll`: якщо `opts.crit` задано — `criticalEffect = opts.crit({ source: "attack", kind, actorId: attacker.basicInfo.id, targetId: opts.targetId ?? "" })` замість `getRandomCriticalEffect`; без `crit` — поведінка як зараз.

Неочевидне, у `gate.ts`:
```ts
const pick: CritPicker = (info) => {
  const random = randomCritEffect(info.source, info.kind, opts.rng); // завжди рівно один rng(), щоб потік кидків не залежав від вибору
  const base = `${info.source}:${info.actorId}:${info.targetId}`;
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  const key = `${base}:${n}`;
  triggers.push({ ...info, key });
  const chosen = opts.choices?.[key];
  return (chosen !== undefined && getCritEffect(info.source, info.kind, chosen)) || random;
};
```

- [ ] **Step 1:** Тести: (a) ключі `…:0`, `…:1` для двох тригерів одного actor/target; (b) із `choices` повертається обраний ефект, без — випадковий; (c) **інваріант потоку:** два гейти з одним сідом, один з `choices`, інший без → після N тригерів наступний `rng()` однаковий; (d) `calculateAttackRoll` з `crit` на d20=20 викликає picker із `kind:"success"`, на 1 — `"fail"`, на 10 — не викликає; (e) retaliation з нат. 1 передає picker.
- [ ] **Step 2:** Реалізуй; maze-тести (`modes/maze/__tests__`) мають лишитись зеленими.
- [ ] **Step 3:** `pnpm test:related lib/utils/common/rng.ts lib/utils/battle/crit-choice lib/utils/battle/attack lib/utils/battle/attack-phase lib/utils/battle/modes/maze` — PASS.
- [ ] **Step 4:** Commit `feat(crit): seeded crit gate and picker plumbing`.

---

### Task 4: Криті на рятівних кидках заклинань

**Files:**
- Modify: `lib/utils/battle/spell/cast/outcome.ts` (після `rollSavingThrow`), `lib/utils/battle/spell/cast/state.ts` (`SpellCastState`: доступ до `flow.ctx.crit`; `Outcome` отримує `negateEffects?: boolean`), `lib/utils/battle/spell/cast/index.ts` (`flow.ctx.crit = params.crit`), `lib/utils/battle/types/spell-process.ts` (`crit?: CritPicker` у параметрах), місця, що застосовують статус-ефекти заклинання (`spell/cast/*` — знайди, де читається `factor`/`Outcome`)
- Test: `lib/utils/battle/spell/__tests__/save-crit.test.ts`

**Рішення:** тригер лише коли `roll === 20` (kind `success`) або `roll === 1` (`fail`) і `crit` заданий; `actorId` = кастер, `targetId` = ціль. Ефект:
- `negate_damage` → `factor = 0`, `return SKIPPED` (повне уникнення, навіть при `onSuccess: "half"`);
- `negate_effects` → `outcome.negateEffects = true` (статуси/дебафи заклинання на ціль не накладаються; шкода за звичайним правилом);
- `double_damage` (провал) → `factor` ×2 на цю ціль;
- решта → `applyCriticalEffect(target, effect, round)` + `put(flow, …)`.
Додай рядок у `flow.messages`: `🎯 {ціль}: {назва ефекту}` (укр.), і `critFlavorFor` для `flavor`.
Без `crit` у параметрах (старі виклики/тести) — поведінка не змінюється.

- [ ] **Step 1:** Тести (з `crit`-picker, що повертає конкретний ефект): нат. 20 + `onSuccess:"half"` + `negate_damage` → шкоди 0; нат. 20 + `ac_buff` → у цілі +2 КЗ; нат. 1 + `double_damage` → шкода ×2 проти звичайного провалу; нат. 1 + `prone` → ціль лежить; `negate_effects` → статус не накладено; кидок 10 → picker не викликається; три цілі з нат. 1 → три тригери з унікальними ключами (гейт із Task 3). FAIL.
- [ ] **Step 2:** Реалізуй.
- [ ] **Step 3:** `pnpm test:related lib/utils/battle/spell lib/utils/battle/types/spell-process.ts` — PASS (існуючі spell-тести зелені).
- [ ] **Step 4:** Commit `feat(crit): critical effects on spell saving throws`.

---

### Task 5: Pending-стан, пайплайн і інтеграція в мутації

**Files:**
- Create: `lib/utils/battle/crit-choice/run-with-crit-choice.ts`, `public.ts` (`toPublicPendingCrit`)
- Modify: `lib/utils/battle/store/types.ts` (`BattleSceneState.pendingCritChoice: StoredPendingCritChoice | null`, `BattleMeta.critChoiceByDm: boolean`, `ScenePatch` + `pendingCritChoice`, `BattleDelta.scene`), `store/load-battle.ts` (select `pending_crit` у scene і `critChoiceByDm` у `campaign.select`), `store/save-battle.ts` (як `pendingMoraleCheck`, ~рядки 133/166), `store/snapshot-state.ts` (якщо `pendingMoraleCheck` там — додай pending crit за тим самим правилом), `store/errors.ts` (код `crit_pending` у `BattleRuleError`), `pipeline/run-battle-mutation.ts` (прапор `allowWhileCritPending` + гард), `pipeline/client-delta.ts`, `pipeline/battle-response.ts`, `lib/utils/battle/client/apply-delta.ts`, `types/api.ts` (`BattleScene.pendingCritChoice?: PendingCritChoice | null`, delta scene), `attack-mutation.ts`, `spell-mutation.ts`
- Test: `lib/utils/battle/crit-choice/__tests__/run-with-crit-choice.test.ts`, тести пайплайну/мутацій у `app/api/campaigns/[id]/battles/[battleId]/{attack,spell}/__tests__` (за зразком наявних), `lib/utils/battle/pipeline/__tests__`

**Interfaces:**
```ts
// run-with-crit-choice.ts
export function runWithCritChoice(
  ctx: BattleMutationContext,
  opts: {
    action: "attack" | "spell";
    actorId: string;
    request: unknown;
    enabled: boolean;                 // ctx.meta.critChoiceByDm && !preview
    resume?: CritResume;
    run(env: { rng: Rng; crit: CritPicker }): MutationResult | Promise<MutationResult>;
  },
): Promise<MutationResult>;
// public.ts
export const toPublicPendingCrit = (p: StoredPendingCritChoice | null): PendingCritChoice | null; // без request/seed
// мутації
createAttackMutation(deps) → (ctx, body: AttackBody, resume?: CritResume) => Promise<MutationResult>
createSpellMutation(deps)  → (ctx, data: SpellRequestData, resume?: CritResume) => Promise<MutationResult>
```
Логіка `runWithCritChoice`:
```ts
const seed = opts.resume?.seed ?? Math.floor(Math.random() * 2 ** 32);
const gate = createCritGate({ rng: ctx.rng ?? mulberry32(seed), choices: opts.resume?.choices });
const result = await opts.run({ rng: gate.rng, crit: gate.pick });
if (opts.resume) return { ...result, scene: { ...result.scene, pendingCritChoice: null } };
if (!opts.enabled || gate.triggers.length === 0) return result;
return {
  participants: ctx.participants, pending: ctx.pending, events: [],
  scene: { pendingCritChoice: { action: opts.action, actorId: opts.actorId, triggers: gate.triggers, request: opts.request, seed } },
  response: { pendingCritChoice: true },
};
```
Гард у пайплайні (після перевірки `awaiting_dm`):
```ts
if (loaded.scene.pendingCritChoice && !options.allowWhileCritPending && !options.dryRun?.(parsed.body)) {
  throw new BattleRuleError("crit_pending", "ДМ обирає ефект крита — зачекайте");
}
```
У мутаціях: `run` отримує `rng`/`crit`; attack — `runAttackPhase({ …, rng, crit })`, а також той самий `rng` у `applyAbilitySummons` і `advanceTurn` (замість `ctx.rng ?? Math.random`); spell — `castSpell({ …, rng, crit })`, `enabled` = `ctx.meta.critChoiceByDm && !data.preview`. Ззовні (HTTP) мутація викликається з 2 аргументами — `resume` недосяжний для клієнта; не додавати `critChoices`/`seed` у Zod-схеми. Публічна проєкція: `battle-response.ts` і `client-delta.ts` віддають `toPublicPendingCrit(scene.pendingCritChoice)`; `apply-delta.ts` кладе в кеш.

- [ ] **Step 1:** Тести: (a) прапор off + нат. 20 → дія застосована, pending немає; (b) прапор on + тригер → `participants` без змін, `events: []`, `scene.pendingCritChoice` має `seed`/`request`, `response.pendingCritChoice: true`, версія піднята, Pusher-delta містить публічний pending **без** `request`/`seed` (Review Focus 4); (c) прапор on без тригерів → звичайний результат; (d) `resume` повторює результат: прогін «pending → resume з усіма `"random"`» дає ті самі HP/події, що й прогін off з тим самим сідом (ін'єктуй сід через відповідний вхід тесту); (e) тіло `attack` із зайвим `critChoices`/`seed` — ігнорується/400 і pending не обходиться (Review Focus 1); (f) будь-яка інша дія при pending → 422 `crit_pending`, `dryRun`/`preview` проходять; (g) `preview` заклинання не створює pending. FAIL.
- [ ] **Step 2:** Реалізуй store/types/load/save, пайплайн, проєкцію, мутації. Перевір, що `saveBattle` піднімає `version` і шле delta і для «порожнього» результату з лише `scene`-патчем; якщо ні — виправ.
- [ ] **Step 3:** `pnpm exec tsc --noEmit` (типи `BattleSceneState` по всьому репо) і `pnpm test:related lib/utils/battle app/api/campaigns` — PASS.
- [ ] **Step 4:** Commit `feat(crit): pending crit choice state and gated attack/spell mutations`.

---

### Task 6: Роут `crit-choice` і очищення pending

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/crit-choice/route.ts`, `crit-choice-mutation.ts`
- Modify: `lib/schemas` (Zod `critChoiceSchema`, поруч із `moraleCheckSchema`), `rollback/rollback-mutation.ts`, `reset/reset-mutation.ts`, `start/start-mutation.ts` (pending → `null`), роути `rollback`, `reset`, `complete` (+ `allowWhileCritPending: true`)
- Test: `crit-choice/__tests__/crit-choice-mutation.test.ts`, доповнення тестів rollback/reset

**Interfaces:**
```ts
export const critChoiceSchema = z.object({ choices: z.record(z.string(), z.union([z.number().int(), z.literal("random")])) });
export const critChoiceMutation: (ctx: BattleMutationContext, body: CritChoiceBody) => Promise<MutationResult>;
```
Роут: `BattleAccess.DM`, `requireStatus: ACTIVE`, `allowWhileCritPending: true`, `allowWhileAwaitingDm: true`, `respond: "wrapped"`. Мутація: немає pending → `BattleRuleError("action_rejected", "Немає вибору крита")`; ключі `choices` мусять збігатися з ключами тригерів (відсутній/зайвий → помилка); числовий id мусить існувати в `getCritEffect(source, kind, id)` (інакше помилка); `"random"` → ключ пропускається (випадковий за сідом). Далі `resume = { seed, choices }` і виклик `attackMutation`/`spellMutation` (експортовані, що приймають `resume`) зі збереженим `request`; результат уже містить `pendingCritChoice: null`.

- [ ] **Step 1:** Тести: не-DM → 403; повний вибір → ефект застосований, pending `null`, події опубліковані; частковий/чужий ключ/неіснуючий id → помилка і pending лишається; `"random"` для всіх = результат без вибору; `resume` для атаки з `endTurn: true` завершує хід; прапор кампанії вимкнено до розв'язання — усе одно працює (Review Focus 5); rollback/reset/start очищають pending; `complete` дозволений при pending. FAIL.
- [ ] **Step 2:** Реалізуй.
- [ ] **Step 3:** `pnpm test:related "app/api/campaigns/[id]/battles/[battleId]"` — PASS.
- [ ] **Step 4:** Commit `feat(crit): crit-choice route for DM`.

---

### Task 7: Клієнт — API, хуки, модалка, банер, візарди

**Files:**
- Modify: `lib/api/battles.ts` (`critChoice(campaignId, battleId, data: WithVersion<CritChoiceData>)` за зразком `moraleCheck`), `lib/hooks/battles/useBattles.ts` (`useCritChoice` через `useBattleAction`), `types/battle.ts` або `lib/utils/battle/crit-choice` для `CritChoiceData`
- Create: `lib/hooks/battle/useCritChoiceDialog.ts` (+ експорт у `index.ts`), `components/battle/crit-choice/CritChoiceDialog.tsx`, `CritChoiceWaitingBanner.tsx`, `__tests__/CritChoiceDialog.test.tsx`
- Modify: `components/battle/scene/*` (змонтувати діалог для ДМ і банер для решти — знайди `BattleScreen` та місце, де монтується діалог моралі/результату), `lib/hooks/battle/useAttackWizard.ts`, `lib/utils/battle/flows/spell-flow.ts` + його хук

**Interfaces:**
- `useCritChoiceDialog(): { pending: PendingCritChoice | null; isDM: boolean; rows: Array<{ trigger: CritTrigger; actorName: string; targetName: string; options: readonly CriticalEffect[] }>; submit(choices: Record<string, number | "random">): void; isSubmitting: boolean }` — читає `useBattleScene()`, імена з учасників сцени, `options = critEffectsFor(trigger.source, trigger.kind)`.
- `CritChoiceDialog` props: `{ dialog: ReturnType<typeof useCritChoiceDialog> }` (один об'єкт).

**Рішення UI:**
- ДМ (`isDM && pending`): `ResponsiveDialog hud open` без закриття (`onOpenChange` ігнорує закриття). По рядку на тригер: заголовок «{актор} → {ціль}: Критична удача/Критичний провал» (для `save` — «Рятівний кидок: {ціль}»), список ефектів (радіо: назва + опис), кнопка рядка «Випадково». Footer: «Випадково для всіх» і «Підтвердити» (`form="crit-choice-form"`); підтвердження неактивне, доки в кожному рядку не обрано ефект або «Випадково». Тексти укр.
- Інші: банер `CritChoiceWaitingBanner` «ДМ обирає ефект…», без дій.
- Візарди (атака/заклинання): відповідь із `response.pendingCritChoice === true` не вважати завершенням дії — перейти в стан очікування; коли `scene.pendingCritChoice` стає `null` і в журналі з'явились нові записи актора — показати результат тим самим шляхом, що й зараз (`critOutcome`/`seen`). Прочитай `useAttackWizard.ts` і `spell-flow.ts` перед змінами; редюсер покрити тестом «pending → waiting → result».

- [ ] **Step 1:** Тести: хук (рядки/опції/імена; `submit` викликає мутацію з `choices`); компонент (рендер у `ConfirmProvider` із `render-with-confirm`: кілька тригерів, «Підтвердити» вимкнено до повного вибору, «Випадково для всіх» відправляє `"random"` для кожного ключа, не-ДМ бачить банер без кнопок); редюсер візарда. FAIL.
- [ ] **Step 2:** Реалізуй API, хук, компоненти, монтування.
- [ ] **Step 3:** `pnpm test:related <змінені файли>` + `pnpm lint --fix` — PASS.
- [ ] **Step 4:** Commit `feat(crit): DM crit-choice dialog and player waiting state`.

---

### Task 8: Доки, онбординг, фінальна перевірка

**Files:**
- Modify: `docs/architecture/battle.md` (розділ «Crit choice»: pending, сід, проєкція, гард, спаск-криті), `docs/STATUS.md`, `lib/onboarding/whats-new.ts` (запис про налаштування й спаск-криті; тест-фікстури whats-new, якщо є), довідкова стаття про налаштування кампанії, якщо існує (`lib/onboarding/*`)
- Move: `git mv` спеки й плану в `docs/archive/superpowers/` — лише в merge-коміті (не тут)

- [ ] **Step 1:** Онови доки та whats-new.
- [ ] **Step 2:** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:run` (повний, один раз) — усе зелене.
- [ ] **Step 3:** Прогін `/simplify` на diff гілки (1–2 агенти), потім один фінальний рев'ю (Opus), виправлення.
- [ ] **Step 4:** Commit `docs(crit): architecture, status, whats-new`.
- [ ] **Step 5 (за запитом користувача):** браузерна перевірка у Sonnet-субагента на prodcopy: атака гравця з нат. 20 → модалка ДМа → вибір → результат; налаштування вимкнено → випадковий ефект; спаск нат. 1.

## Self-review

- **Покриття спеки:** §1 налаштування → T1; §2 тригери/таблиці → T2, T3 (атаки), T4 (спаски); §3 потік/сід/стан → T3, T5, T6; §4 UI → T7; §5 діалог налаштувань → T1; §6 тести — у кожному завданні; §7 доки/онбординг → T8.
- **Узгодженість типів:** `CritPicker`, `CritTrigger`, `PendingCritChoice`/`StoredPendingCritChoice`, `CritResume`, `runWithCritChoice`, `critEffectsFor`/`getCritEffect`/`randomCritEffect` — однакові в T2–T7.
- **Відомі відхилення від спеки:** (1) ДМ-атаки теж ідуть через pending (як у спеці); (2) `mulberry32` переноситься з maze у `lib/utils/common`, бо ядро не може імпортувати режим; (3) `request`/`seed` не потрапляють до клієнтів (публічна проєкція).
