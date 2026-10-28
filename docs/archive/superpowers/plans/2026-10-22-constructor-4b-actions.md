# Етап 4b: дії 5e в бою — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** гравець і ДМ виконують базові дії 5e (Ривок, Відхід, Ухилення, Допомога, Сховатися, Підготувати, Встати, Схоплення, Штовхання, Вирватися), рух провокує атаки при відході; HOMM5 без змін.

**Architecture:** нова секція `rules.actions` (default вимкнено). Каталог дій у коді (`lib/utils/battle/actions/`) + один маршрут `core-action`. Перевірки навичок — `rollCheck` (`lib/utils/battle/checks/`). Серверна атака без ходу (атака при відході, підготовлена атака) — спільний хелпер, винесений з HOMM-відплати без зміни її поведінки. Шлях руху будує сервер (`pathTo`).

**Tech Stack:** TypeScript strict, Zod 4, Vitest, Next.js route handlers (`runBattleMutation`), TanStack Query, React 19.

**Spec:** `docs/archive/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4b. Дизайн: дії 5e в бою»; загальні правила етапу 4 і 4a — контекст).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку не чіпати; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`.
- **Нульова зміна поведінки HOMM5:** `rules = {}` → рух, атаки, відплата, лог, споживання rng ідентичні. Наявні тести (до коміту `3bddb351`) не редагувати; падіння наявного тесту — баг нового коду.
- Міграцій немає (усе в JSON: `rules`, snapshot/state).
- Бонуси й прапорці — лише через `collectModifiers`/`runAbilities`. Новий маршрут — Zod + `runBattleMutation` + сусідній `*-mutation.ts`; логіка — у `lib/utils/battle/*`, маршрут тонкий.
- Компоненти не імпортують `@/lib/api/*`; клієнт — `lib/api/battles.ts` → хук `lib/hooks/battles` → компонент. Діалоги — `ResponsiveDialog hud`, кнопки в `footer` (`form="<id>"` для submit). Клієнтські модулі не тягнуть zod (`lib/__tests__/client-entry-imports.test.ts`): значення імпортувати з `@/lib/utils/abilities/schema/kinds`, не з барела схем.
- UI/лог українською, ідентифікатори англійською; мінімум коментарів. ESLint: padding lines, `simple-import-sort`, `import/no-cycle`.
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>` під час роботи; повний `pnpm test:run` — лише в задачі 9.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **HOMM-відплата після виносу спільного хелпера** (задача 4): ті самі кидки rng у тому самому порядку, той самий лог і `battleAction` — тест-якір на `resolveRetaliation` з фіксованим rng.
2. **Рух без 5e** (`actions.enabled: false`): `move-mutation` не будує шлях і не викликає rng; `movementBudget` без `extraMovement` дає те саме число.
3. **Атака при відході, що збиває мувера:** рух зупиняється на клітинці виходу, `movementUsed` = вартість до цієї клітинки, позиція записана, наступні атаки при відході не відбуваються.
4. **Схоплений + тягнення:** клітинка для цілі має бути вільною; якщо ні — схоплення розривається (не «телепорт» у зайняту клітинку); ціль, що стала несуміжною будь-яким шляхом, перестає бути схопленою.
5. **Підготовлена атака поза ходом:** дозволена лише власнику учасника (або ДМ), лише з `readied` і невитраченою реакцією; зникає на початку наступного ходу власника; не дозволяє обійти «заклятого» (`charmed`) чи вимкнені атаки.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/schema.ts`, `defaults.ts`, `registry.ts`, `components/rules/sections/ActionsSection.tsx`, `RulesForm.tsx` | секція `actions` |
| `lib/utils/battle/checks/roll-check.ts` (+`index.ts`) | `rollCheck`, `passivePerception` |
| `lib/utils/abilities/schema/effects.ts`, `registry/labels.ts`, `participant/from-character.ts`, `types/battle.ts` | прапорці `checkAdvantage`/`checkDisadvantage`/`skillProficiency`, `skillProficiencies` |
| `lib/utils/battle/actions/registry.ts`, `run.ts`, `effects.ts`, `grapple.ts` | каталог базових дій і їхні ефекти |
| `app/api/campaigns/[id]/battles/[battleId]/core-action/{route,core-action-mutation}.ts` | маршрут |
| `lib/utils/battle/attack/server-attack.ts` | серверна атака без ходу (з відплати) |
| `lib/utils/battle/grid/path.ts` (`pathTo`), `lib/utils/battle/actions/opportunity.ts` | шлях і атаки при відході |
| `app/api/.../move/move-mutation.ts` | атаки при відході, тягнення схопленого |
| `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/*`, `components/battle/turn/ActionGrid.tsx`, `components/battle/turn/CoreActionsDialog.tsx`, `view/turn-exhausted.ts` | UI |

---

### Task 1: Секція правил `actions`

**Files:** `lib/utils/rules/schema.ts`, `defaults.ts`, `registry.ts`; create `components/rules/sections/ActionsSection.tsx`; modify `components/rules/RulesForm.tsx`; extend `lib/utils/rules/__tests__/schema.test.ts` (додати секцію в очікуваний `DEFAULT_RULES` — це адитивна зміна форми, дозволена) і create `lib/utils/rules/__tests__/schema-4b.test.ts`.

**Interfaces — Produces:** `Ruleset["actions"] = { enabled: boolean; opportunityAttacks: boolean; variant: "2014" | "2024" }`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";

import { mergeRules, parseRules } from "@/lib/utils/rules/schema";

describe("rules actions section", () => {
  it("defaults off", () => {
    expect(parseRules({}).actions).toEqual({ enabled: false, opportunityAttacks: true, variant: "2014" });
  });

  it("invalid variant falls back", () => {
    expect(parseRules({ actions: { variant: "1999" } }).actions.variant).toBe("2014");
  });

  it("patch merges", () => {
    const r = mergeRules(parseRules({}), { actions: { enabled: true, variant: "2024" } });

    expect(r.ok && r.rules.actions).toEqual({ enabled: true, opportunityAttacks: true, variant: "2024" });
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3:** у `sections` додати
`actions: z.strictObject({ enabled: z.boolean().default(false), opportunityAttacks: z.boolean().default(true), variant: z.enum(["2014", "2024"]).default("2014") })`,
ключ у `RulesetSchema` (`.prefault({})`), `RulesetPatchSchema`, `DEFAULT_RULES`, `MECHANIC_REGISTRY.actions = { label: "Дії 5e", description: "Ривок, Відхід, Ухилення, Допомога, Сховатися, Підготувати, Встати, Схоплення, Штовхання; атаки при відході. Варіант 2014/2024 — формула Схоплення і Штовхання." }`. Секція UI — за зразком `DeathSavesSection.tsx` (перемикачі «Увімкнено», «Атаки при відході» (лише коли увімкнено), «Правила 2024» для `variant`), вертикальний відступ як у виправленій `DeathSavesSection` (`space-y-3`).
- [ ] **Step 4:** PASS + `pnpm test:related lib/utils/rules/schema.ts`. **Step 5: Commit** `feat(constructor): 4b rules section actions`.

---

### Task 2: `rollCheck` і майстерність у навичках

**Files:** create `lib/utils/battle/checks/roll-check.ts`, `index.ts`, test `lib/utils/battle/checks/__tests__/roll-check.test.ts`; modify `lib/utils/abilities/schema/effects.ts` (прапорці), `lib/utils/abilities/registry/labels.ts`, редактор прапорців (там, де 4a додав `saveAdvantage`), `lib/utils/battle/participant/from-character.ts:143` (поряд із `saveProficiencies`), `types/battle.ts:169` (`skillProficiencies?: DndSkill[]`).

**Interfaces — Produces:**

```ts
export type CheckSubject = { skill: DndSkill } | { ability: AbilityKey };

export function rollCheck(input: {
  actor: BattleParticipant; subject: CheckSubject; participants: BattleParticipant[];
  rules?: Ruleset; rng: () => number; presetRoll?: number;
}): { roll: number; rolls: number[]; bonus: number; total: number; mode: "advantage" | "disadvantage" | "normal" };

export function passivePerception(p: BattleParticipant, participants: BattleParticipant[]): number; // 10 + мод. Мудр + майстерність (perception) + checkAdvantage→+5 / checkDisadvantage→−5
```

Прапорці: `checkAdvantage { skills: DndSkill[] | "all" }`, `checkDisadvantage { skills: DndSkill[] | "all" }`, `skillProficiency { skills: DndSkill[] }`. `DND_SKILLS`, `DND_SKILL_META` — з `lib/constants/skills.ts`.

- [ ] **Step 1: Failing tests:** навичка → характеристика з `DND_SKILL_META` (stealth → мод. Спр); майстерність з `skillProficiencies` і з прапорця `skillProficiency`; характеристика (`{ ability: "strength" }`) без майстерності; `checkAdvantage "all"` — два кубики, більший; `checkDisadvantage ["stealth"]` — менший; обидва → `normal`; виснаження 2014 рівня 1 → перешкода; 2024 рівня 2 → `bonus` −4 (використати `exhaustionLevel` і варіант з ефекту/`rules.conditions.exhaustion`, як `rollSave`); `presetRoll` — перший кубик; `passivePerception` (10 + мод + майстерність; перевага +5). Герой з `Character.skills: { stealth: true, foo: true }` → `skillProficiencies: ["stealth"]`; без навичок — поле відсутнє (знімки героїв не змінюються).
- [ ] **Step 2:** FAIL. **Step 3:** реалізація за зразком `lib/utils/battle/saves/roll-save.ts` (той самий підхід до режиму кидка й підписів джерел; спільне можна винести в маленький хелпер `rollD20WithMode(mode, rng, presetRoll)` у `lib/utils/battle/saves` і використати в обох). У `from-character.ts` змінна `dndSkillProficiencies` (не `skills` — ця назва зайнята деревом скілів).
- [ ] **Step 4:** PASS + `pnpm test:related` змінених файлів (зокрема `saves`, `from-character`, schema/OpenAPI-розмір — ліміт 110000; якщо перевищено, зареєструвати `DndSkill` як спільну схему в `lib/server/content/json-schema.ts`, як 4a зробила для `AbilityKey`). **Step 5: Commit** `feat(constructor): 5e ability checks (rollCheck, skill proficiencies)`.

---

### Task 3: Каталог базових дій, маршрут `core-action`, прості дії

**Files:** create `lib/utils/battle/actions/registry.ts`, `run.ts`, `effects.ts`, `index.ts`; create `app/api/campaigns/[id]/battles/[battleId]/core-action/route.ts`, `core-action-mutation.ts`; tests `lib/utils/battle/actions/__tests__/core-actions.test.ts`, `app/api/__tests__/battles/core-action-mutation.test.ts`; modify `lib/utils/battle/grid/path.ts` (`movementBudget` + `extraMovement`), `lib/utils/battle/turn/turn-state.ts` (`resetTurnState` скидає `extraMovement`, `readied`), `types/battle.ts` (`battleData.extraMovement?: number`, `battleData.readied?: { kind: "attack"; round: number }`).

**Interfaces — Produces:**

```ts
export const CORE_ACTION_KEYS = ["dash", "disengage", "dodge", "help", "hide", "ready", "standUp", "grapple", "shove", "escape"] as const;
export type CoreActionKey = (typeof CORE_ACTION_KEYS)[number];
export type CoreActionDef = { label: string; description: string; cost: "action" | "bonusAction" | "movement"; target: "none" | "allyAdjacent" | "enemyAdjacent" };
export const CORE_ACTION_REGISTRY: Record<CoreActionKey, CoreActionDef>; // zod-free (клієнт імпортує)

export const coreActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["dash", "disengage", "dodge", "hide", "ready", "standUp", "escape"]), participantId: z.string().min(1) }),
  z.object({ action: z.enum(["help", "grapple"]), participantId: z.string().min(1), targetId: z.string().min(1) }),
  z.object({ action: z.literal("shove"), participantId: z.string().min(1), targetId: z.string().min(1), mode: z.enum(["prone", "push"]) }),
  z.object({ action: z.literal("readiedAttack"), participantId: z.string().min(1), targetId: z.string().min(1) }),
]);

export function runCoreAction(input: { participants: BattleParticipant[]; body: CoreActionBody; map: BattleMapConfig | null; rules: Ruleset; round: number; rng: () => number; battleId: string }): { participants: BattleParticipant[]; messages: string[]; actions?: BattleAction[] };
```

Маршрут: `access: BattleAccess.MEMBER`, `requireStatus: ACTIVE`, `blockedByMode: true`. Мутація: `rules.actions.enabled` інакше `BattleRuleError("action_rejected", "Дії 5e вимкнені в правилах кампанії")`; для всіх дій, крім `readiedAttack`, — `requireActor` / `canActNow` і поточний хід учасника (як `validateAttackRequest` L64-L78); для `readiedAttack` — `controls(actor, p)` (див. задачу 4). Вартість: `action` → `applyMainActionUsed` (відмова, якщо `hasUsedAction`), `bonusAction` → `hasUsedBonusAction`, `movement` → `movementUsed`. Подія — `systemEvent`/`ability` з повідомленнями.

У цій задачі реалізувати: `dash`, `disengage`, `dodge`, `help`, `standUp`. Решта ключів — у задачах 4–5 (до того мутація відповідає `action_rejected` «Ще не підтримується» — і цей текст прибирається в задачі 5).

Ефекти (через `upsertTimedEffect`, `timedKey: core:<action>:<participantId>`):
- `disengage`: `type: "buff"`, маркер `disengaged`, `armed: true`, `expireAtTurnEnd: true` (додано посеред ходу — без `armed` дожив би до кінця наступного ходу; див. `turn/effects.ts`). Якщо `TimedEffectInput` не має `armed`/`expireAtTurnEnd` — додати необов'язкові поля.
- `dodge`: `abilityEffects: [flag disadvantageForAttackers, flag saveAdvantage { abilities: ["dexterity"] }]`, `countdownAtTurnStart: true`, `rounds: 1`; знімається, якщо власник отримує `incapacitated` (через `removeEffects` у `conditions/apply.ts`, поряд із концентрацією) або швидкість 0 (`movementBudget === 0` на момент атаки — перевіряти в `rollModeReasons` не потрібно: ухилення просто знімається в `applyCondition5e` для `immobilized`/`incapacitated`).
- `help`: на союзника (суміжного; без мапи — будь-якого живого союзника), `abilityEffects: [flag advantage { attackKind: "all" }]`, `consumeOn: "ownAttack"`, `rounds: 1` (без `armed` — переживає до кінця наступного ходу союзника).
- `dash`: `battleData.extraMovement = (extraMovement ?? 0) + movementBudget(p)` (до додавання); `movementBudget` = `floor(speed/CELL_FEET) + (extraMovement ?? 0)` (0, якщо `immobilized`).
- `standUp`: якщо немає ефекту з `effects[0].type === "prone"` → відмова «Ви не лежите»; вартість `ceil(movementBudget/2)` (відмова, якщо `remainingMovement` менше); знімає ефекти `prone` через `removeEffects`.

- [ ] **Step 1: Failing tests:** кожна дія — ефект/поле і витрата; відмови: дію вже витрачено, не свій хід (гравець), ціль `help` не союзник / несуміжна (з мапою), `standUp` без `prone`, `standUp` без руху, `actions.enabled: false`; `dash` → `remainingMovement` подвоюється; `resetTurnState` скидає `extraMovement`; `disengage` зникає наприкінці ходу (через `finishTurnEffects`), `dodge` — на початку наступного ходу (через `processStartOfTurn`); `help` споживається першою атакою союзника (через `consumeAttackEffects`); ДМ може виконати дію за юніта на його ході.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. Маршрут — копія `reveal-participant/route.ts` з `access: BattleAccess.MEMBER`. **Step 4:** PASS + `pnpm test:related` (path.ts, turn-state.ts, timed-effects.ts). **Step 5: Commit** `feat(constructor): 5e core actions route (dash, disengage, dodge, help, stand up)`.

---

### Task 4: Серверна атака без ходу, Сховатися, Підготувати

**Files:** create `lib/utils/battle/attack/server-attack.ts`, test `lib/utils/battle/attack/__tests__/server-attack.test.ts`; modify `lib/utils/battle/attack/retaliation.ts` (використати хелпер), `lib/utils/battle/actions/run.ts` (`hide`, `ready`, `readiedAttack`), `lib/utils/battle/spell/cast/index.ts` (каст знімає «Схований»), tests у `lib/utils/battle/actions/__tests__/`.

**Interfaces — Produces:**

```ts
export function resolveServerAttack(input: {
  flow: ActionFlow; attackerId: string; targetId: string; attack: BattleAttack;
  currentRound: number; battleId: string; rng: () => number; bonusPercent?: number; label: "retaliation" | "opportunity" | "readied";
}): { battleAction: BattleAction; hit: boolean; downed: boolean };
```

Винести з `resolveRetaliation` (L96–L165) кроки «два d20 → `calculateAttackRoll` → КЗ/`guaranteedHit` → кидок шкоди `rollGroups(parseDiceLenient(heroAttackDamageParts(...)))` → `resolveHit(... offTurn: true)` → `buildRetaliationAction` → `consumeAttackEffects`» у `resolveServerAttack`. Гейтинг реакції (L75–L83) і `retaliationsUsed` лишаються в `resolveRetaliation`. Для `label !== "retaliation"` дія будується тим самим `buildRetaliationAction` з іншим заголовком (подивитися, чи він приймає назву; якщо ні — додати необов'язковий параметр `title`).

- [ ] **Step 1: Failing tests:**
- **якір HOMM:** наявні тести `retaliation*.test.ts` проходять без змін; новий тест — `resolveRetaliation` з `seq(...)` дає той самий `battleAction` і ту саму кількість викликів rng, що й до рефакторингу (зафіксувати очікуване значення, запустивши тест на коміті до зміни, і вписати його явно).
- `hide`: `rollCheck` Скритності проти максимальної `passivePerception` живих ворогів; успіх (≥) → ефект «Схований» (`abilityEffects: [advantage all, disadvantageForAttackers]`, `consumeOn: "ownAttack"`, `rounds: 10`, маркер `hidden`); провал → лише лог; каст заклинання власником знімає «Схований» (`removeEffects` за маркером `hidden` у `castSpell`, лише коли такий ефект є — HOMM без змін).
- `ready`: `battleData.readied = { kind: "attack", round }`, витрачає дію; `resetTurnState` власника знімає `readied`.
- `readiedAttack`: лише з `readied`, невитраченою реакцією, ціль — ворог у досяжності першої ближньої атаки (`attackReachError` з мапою; без мапи — будь-який живий ворог; якщо ближньої немає — перша атака); перевіряє `getDisabledAttackKinds` і `charmed` так само, як `validateAttackRequest` (L84–L94) — винести ці дві перевірки у спільну функцію `assertAttackAllowed(attacker, attack, targetIds, participants)` і викликати з обох місць; виконує `resolveServerAttack`, ставить `hasUsedReaction: true`, знімає `readied`. Доступ: власник учасника (`controls`) або ДМ — на будь-якому ході; гравець, що не контролює учасника, — 403.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS + `pnpm test:related lib/utils/battle/attack/retaliation.ts lib/utils/battle/attack-phase/request.ts lib/utils/battle/spell/cast/index.ts`. **Step 5: Commit** `feat(constructor): server-side reaction attack, hide, ready`.

---

### Task 5: Схоплення, Штовхання, Вирватися, тягнення

**Files:** create `lib/utils/battle/actions/grapple.ts`, test `lib/utils/battle/actions/__tests__/grapple.test.ts`; modify `lib/utils/battle/actions/run.ts`, `app/api/.../move/move-mutation.ts` (тягнення, розрив), `lib/utils/battle/conditions/apply.ts` (недієздатний схоплювач звільняє цілі).

**Interfaces — Produces:**

```ts
export function contest(input: { attacker: BattleParticipant; target: BattleParticipant; participants: BattleParticipant[]; rules: Ruleset; rng: () => number }): { success: boolean; message: string };
// 2014: rollCheck(attacker, athletics) vs rollCheck(target, athletics або acrobatics — більший бонус); нічия → ціль. 2024: rollSave(target, strength|dexterity — більший мод., dc = 8 + attacker.mod.strength + proficiencyBonus)
export function grappledBy(ps: BattleParticipant[], grapplerId: string): BattleParticipant[];
export function releaseGrapples(ps: BattleParticipant[], grapplerId: string, reason: string): { participants: BattleParticipant[]; messages: string[] };
```

Схоплення — це 5e-стан `grappled` (з 4a), накладений `applyCondition5e` з `source.participantId = attacker`, `timedKey: core:grapple:<attackerId>`, `permanent: true`.

- [ ] **Step 1: Failing tests:** `contest` 2014 (нічия на користь цілі), 2024 (рятівний кидок проти СК); `grapple` суміжного ворога → стан `grappled` з джерелом; несуміжного → відмова; `shove prone` → `prone`; `shove push` → ціль на 1 клітинку далі від атакувальника по прямій (dx, dy = sign різниці), клітинка зайнята/стіна → лише `prone` з повідомленням; `escape` знімає `grappled` від схоплювача (2014 — контест, 2024 — перевірка Атлетики/Акробатики цілі проти СК схоплювача); **тягнення:** схоплювач рухається → ціль займає останню клітинку шляху перед призначенням (суміжну до нового положення схоплювача), вартість руху ×2 (перевірка бюджету з подвоєною вартістю), якщо клітинка не вільна — схоплення розривається з повідомленням і рух виконується без тягнення; **розрив:** після будь-якого руху схоплювача чи цілі, якщо вони несуміжні — `releaseGrapples`; схоплювач отримує `incapacitated` → цілі звільнені. Без `rules.actions.enabled` — `move-mutation` поводиться як раніше (тест-якір: той самий результат для HOMM-руху).
- [ ] **Step 2:** FAIL. **Step 3:** реалізація; для шляху тягнення використати `pathTo` з задачі 6 — **якщо задача 6 ще не зроблена, реалізувати `pathTo` тут** (сигнатура в задачі 6) і в задачі 6 лише використати. **Step 4:** PASS + `pnpm test:related` змінених файлів. **Step 5: Commit** `feat(constructor): 5e grapple, shove, escape`.

---

### Task 6: Атаки при відході

**Files:** modify `lib/utils/battle/grid/path.ts` (`pathTo`, якщо ще немає), create `lib/utils/battle/actions/opportunity.ts`, test `lib/utils/battle/actions/__tests__/opportunity.test.ts`; modify `app/api/.../move/move-mutation.ts`; extend `app/api/__tests__/battles/move-mutation.test.ts` лише новими `it`.

**Interfaces — Produces:**

```ts
export function pathTo(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, to: GridPoint, budget: number): GridPoint[] | null; // клітинки від першого кроку до `to` включно; BFS з тим самим порядком сусідів (geometry.ts:3) і тими самими правилами прохідності, що `reachable`

export function resolveOpportunityAttacks(input: {
  participants: BattleParticipant[]; moverId: string; path: GridPoint[]; start: GridPoint; map: BattleMapConfig;
  round: number; battleId: string; rules: Ruleset; rng: () => number;
}): { participants: BattleParticipant[]; stopAt: GridPoint | null; cost: number; actions: BattleAction[]; messages: string[] };
```

Логіка `resolveOpportunityAttacks`: іти по шляху; на кожному кроці від клітинки A до B для кожного ворога E мувера: E `isActive`, не має `incapacitated`, `!hasUsedReaction`, має ближню атаку, `footprintDistance(cells(mover at A), cellsOf(E)) <= 1` і `> 1` для B, мувер без маркера `disengaged`, E ще не атакував у цьому русі → `resolveServerAttack({ label: "opportunity" })` з мувером у позиції A (тимчасово виставити `position = A` у `flow.ps` перед атакою), E отримує `hasUsedReaction: true`. Якщо після атаки мувер не `isActive` (або при смерті) — `stopAt = A`, `cost` = кроки до A. Лог: «⚔ Атака при відході: E → мувер».

У `move-mutation.ts` (звичайний рух, не `placement`): лише коли `rules.actions.enabled && rules.actions.opportunityAttacks` — побудувати `pathTo`, викликати `resolveOpportunityAttacks`; позиція = `stopAt ?? to`, `movementUsed += cost` (або повна вартість без зупинки); події атак — з `actions`; далі — наявний `hazardHit` для фінальної клітинки. Інакше — наявний код без змін (без побудови шляху).

- [ ] **Step 1: Failing tests:** `pathTo` = довжина з `reachable` для тієї самої клітинки; обходить ворогів; проходить крізь союзників; `null` для недосяжної. Атаки при відході: вихід з досяжності одного ворога → одна атака і реакція витрачена; два вороги → дві; ворог без реакції / недієздатний / без ближньої атаки → немає; `disengaged` → немає; рух усередині досяжності (з клітинки в клітинку поруч із ворогом) → немає; мувер падає від атаки → зупинка на клітинці виходу, `movementUsed` = кроки до неї; рух ДМ у розстановці → немає; `opportunityAttacks: false` → немає; `actions.enabled: false` → `move-mutation` дає той самий результат, що до змін, і не викликає rng.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS + `pnpm test:related lib/utils/battle/grid/path.ts "app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts"`. **Step 5: Commit** `feat(constructor): 5e opportunity attacks on movement`.

---

### Task 7: UI дій

**Files:** modify `lib/api/battles.ts` (`runCoreAction(campaignId, battleId, body)` POST `…/core-action`), `lib/hooks/battles/useBattles.ts` (`useBattleCoreAction` за зразком `useRevealBattleParticipants`), `lib/hooks/battle/useBattleScene.ts` (реєстрація `coreAction`), `lib/hooks/battle/usePlayerTurn.ts`, `lib/utils/battle/view/turn-exhausted.ts`, `components/battle/turn/ActionGrid.tsx`; create `components/battle/turn/CoreActionsDialog.tsx`, `lib/hooks/battle/useCoreActions.ts` (доступність дій, вибір цілі, відправка); кнопка «Підготовлена атака» — у картці учасника (`ParticipantRow` або `MyTurnControls`, де показується власний учасник поза ходом); tests `components/battle/turn/__tests__/CoreActionsDialog.test.tsx` (`// @vitest-environment happy-dom`), `lib/utils/battle/view/__tests__/turn-exhausted.test.ts` (нові `it`), `lib/hooks/battle/__tests__/useCoreActions.test.ts`.

**Interfaces — Consumes:** `CORE_ACTION_REGISTRY` (zod-free), `coreActionSchema` тип тіла (тип експортувати з `lib/api/battles.ts`, як `BattleConditionsBody` у 4a), `scene.rules.actions`.

- [ ] **Step 1: Failing tests:** діалог показує всі дії з вартістю й описом; недоступні — вимкнені з причиною («Дію вже витрачено», «Ви не лежите», «Немає суміжного ворога»); дії з ціллю показують список суміжних (без мапи — усіх живих) учасників потрібного боку; `shove` має вибір «Повалити / Відштовхнути»; відправка викликає `mutate` з правильним тілом. `turnExhausted`: при `rules.actions.enabled` і невитраченій дії — `false`; Ривок (`extraMovement`) не впливає на HOMM-гілку. Плитка «Дії» є лише при `rules.actions.enabled`; кнопка «Підготовлена атака» — лише власнику/ДМ при `readied` і невитраченій реакції.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація (діалог `ResponsiveDialog hud`; плитка — `Tile` з іконкою з `lucide-react`, як інші). **Step 4:** PASS + `pnpm test:related` + `client-entry-imports` тест. **Step 5: Commit** `feat(constructor): 5e core actions UI`.

---

### Task 8: Документи

- [ ] `docs/architecture/battle.md` — розділ «5e: базові дії» (каталог, маршрут `core-action`, `rollCheck`, `resolveServerAttack`, атаки при відході в `move-mutation`, схоплення/тягнення, підготовлена атака поза ходом); `docs/architecture/abilities.md` — прапорці `checkAdvantage`/`checkDisadvantage`/`skillProficiency`; `docs/STATUS.md` і `docs/archive/superpowers/constructor-handoff.md` — 4b готова, далі 4c; CLAUDE.md — без змін, якщо нових правил немає. Commit `docs(constructor): 4b — battle docs, status, handoff`.

### Task 9: Повна перевірка

- [ ] `pnpm test:run`, `pnpm lint` (0 errors), `pnpm build`, `battle-sweep` на HOMM5 (`set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`).
- [ ] Живий прогін (після фінального рев'ю): кампанія з шаблону HOMM5 + `constructor:copy-heroes`, увімкнено `actions` (+ `deathSaves`, `conditions`), бій з мапою: Ривок, Відхід, атака при відході, Ухилення, Допомога, Сховатися, Підготовлена атака поза ходом, Схоплення з тягненням, Штовхання (обидва режими), Встати; десктоп + 500 px; тестові дані видалити.
