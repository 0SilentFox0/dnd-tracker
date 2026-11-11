# WFRP 5c-1: стани й Fortune у бою — план

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (виконавці — Sonnet, без per-task рев'ю; одне фінальне Opus-рев'ю й один повний `pnpm test:run` наприкінці). Кроки — `- [ ]`. Кожна задача самодостатня: виконавець бачить лише свою задачу, тому імена/типи сусідніх задач наведено в блоці **Interfaces**.

**Goal:** 12 станів WFRP (рівневі й нерівневі) у бою з тіками, зняттям і накладанням ДМом; крит-маркери bleeding/stunned/unconscious/prone накладають стан; Fortune в атаці (перекидання або +1 SL) з переносом лист ↔ бій.

**Architecture:** новий необов'язковий хук `RuleSystemDefinition.conditions` (лише в wfrp) — ядро бою звертається до нього тільки через `ruleSystemOf(rules).conditions?.…`; стан = `ActiveEffect` з `abilityKey: "wfrp:cond:<key>"` і маркером рівня `wfrp:<key>` (5e-запити його не бачать). Fortune — прапорець `combat.fortune`, поле тіла атаки, логіка в `resolveWfrpAttack`, списання в `judgeWfrp`, перенос через `battleData.fortune` ↔ `resources.fortune`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod, TanStack Query, next-intl, vitest (+happy-dom для UI).

**Spec:** `docs/superpowers/specs/2026-11-04-wfrp-5c1-design.md` (коміт 967abca36). Контекст: `docs/architecture/rule-systems.md` («Межі 5b-2», «Межі 5b-3»), `docs/architecture/battle.md`.

## Global Constraints

- Робоча папка `/Users/silentfox/Work/dnd-tracker-wfrp`, гілка `feat/wfrp`. **Нічого з WFRP не мерджити в main і не пушити до явного «епік готовий» від користувача.** whats-new НЕ додавати.
- Ядро (`lib/utils/battle/**`, `lib/hooks/**`, `components/battle/**`) не імпортує `@/lib/utils/rules/systems/wfrp*` чи `@/components/systems/wfrp*` (ESLint `no-restricted-imports`, тест `lib/utils/rules/systems/__tests__/eslint-isolation.test.ts`); лише `ruleSystemOf(rules)` / `systemUiOf(key)`. Перевірки «чи wfrp» — через наявність хука (`conditions`, `combat.fortune`), ніколи `key === "wfrp"` (виняток — серверний вибір i18n-namespace у Task 9).
- d20-системи (homm, dnd5e): без змін поведінки; `CONDITION_5E_REGISTRY` не змінюється; наявні тести не правляться (крім явно названих у задачі файлів, куди лише додаються кейси).
- Будь-який запис знімка — лише через наявні `runBattleMutation`/`save-battle` (там же `snapshotHash`); нових шляхів запису знімка немає. Міграцій немає.
- Шари: `route.ts` — один рядок `runBattleMutation(..., { operation })`; компоненти не імпортують `@/lib/api/*` і не викликають `fetch`; логіка — у хуках/`lib/utils`; хуки імпортуються з барелів (`@/lib/hooks/battle`, `@/lib/hooks/battles`); групувати параметри в об'єкти (≤ ~7 props).
- i18n: усі нові UI/лог-тексти — у новому namespace `battleWfrp` (`messages/{uk,en}/battleWfrp.json`), помилки — `messages/{uk,en}/errors.json`; кирилиці в коді немає (ESLint); uk-тексти короткі (бюджет `scope-size`: 105 KB gzip, зараз uk ≈102 KB для «campaign + battle»). Не додавати `battleWfrp` у регулярку `BATTLE_KEY` у `lib/i18n/__tests__/battle-scope-imports.test.ts` (рушій wfrp досяжний з листа персонажа через реєстр, але його ключі рендеряться лише в бою).
- Числа каталогу станів — лише в `lib/utils/rules/systems/wfrp/conditions/catalog.ts` з коментарем `// All values: verify against 5e book.` (як `combat/constants.ts`), і кожне число закріплене тестом.
- Коментарі мінімальні (глобальний CLAUDE.md): лише неочевидне «чому», один рядок.
- Тести: TDD (спершу тест, червоний, потім код). Після задачі — лише `pnpm test:related <змінені файли>` і `pnpm exec eslint --fix <змінені файли>`; **заборонено** repo-wide `pnpm lint` і повний `pnpm test:run` у задачах (повний прогін — один раз у Task 12). Процес lint/test довше ~5 хв — завис, вбити й звузити.
- Кожен коміт закінчується рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (порожній рядок перед ним).

## Review Focus

1. **Тік вбиває/присипляє носія на початку ходу** (Bleeding до 0 Wounds або шанс непритомності): хід мусить перейти до наступного активного учасника, без зависання й без запуску `runAbilities`/`turnStart` вмінь для непритомного. Тест — Task 4 (`advanceTurn` і `enterChangedTurn`).
2. **Fortune «Перекинути» при влучанні з першого кидка** не списується й не з'являється в `percentile.fortune`; при промаху ближнього бою другий кидок атакувальника йде проти *того самого* кидка захисника. Тест — Task 6.
3. **Повторна спроба зняти той самий стан за хід / спроба не в свій хід / стан без `endTest`** — відмова `CONDITION_TEST_UNAVAILABLE` (або 403 не в свій хід), стан і `conditionTests` не змінюються. Тест — Task 5.
4. **Складання рівнів з двох джерел** (крит Bleeding 1 + ДМ Bleeding 2 = 3, обрізання до 10) і зняття −1 з найновішого ефекту, поки сума не дійде до 0; ДМ «зняти все» прибирає всі ефекти ключа. Тест — Task 1.
5. **Unconscious-стан знято ДМом, коли Wounds = 0** — статус лишається `UNCONSCIOUS`; при Wounds > 0 — `ACTIVE`. І навпаки: тік на непритомному носії не застосовується. Тест — Task 1 і Task 3.

---

## Карта файлів

| Файл | Відповідальність | Задача |
|---|---|---|
| `lib/utils/rules/systems/types.ts` | контракт `RuleSystemConditions`, `combat.fortune`, `ResolveAttackCtx.fortune`, `ResolvedAttack.fortune` | 1, 6 |
| `types/battle.ts` | `battleData.fortune`, `battleData.conditionTests` | 1 |
| `lib/utils/battle/types/attack.ts` | `PercentileAttackDetails.fortune` | 6 |
| `lib/utils/rules/systems/wfrp/conditions/{catalog,levels,apply,test-mod,tick,end-test,index}.ts` | рушій станів wfrp | 1–3 |
| `lib/utils/rules/systems/wfrp/combat/{crit-effect,resolve-attack}.ts`, `wfrp/sheet-test.ts`, `wfrp/index.ts` | крит→стан, модифікатори тестів, Fortune, реєстрація | 2, 3, 6 |
| `lib/utils/battle/turn/{turn-start,turn-state}.ts` | тік на початку ходу, скидання `conditionTests` | 4 |
| `lib/server/battles/mutations/{system-condition,condition-test}/…` + роути + `operations.ts` | мутації | 5 |
| `lib/api/battle-ops.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleActions.ts` | клієнт | 5 |
| `lib/schemas/battles.ts`, `lib/utils/battle/attack-phase/{request,run-attack-phase}.ts`, `lib/utils/battle/attack/process/run.ts`, `lib/utils/battle/types/attack-process.ts` | Fortune в атаці | 6 |
| `lib/utils/characters/resources/battle.ts` | Fortune лист ↔ бій | 7 |
| `lib/utils/battle/flows/attack-flow.ts`, `lib/hooks/battle/useAttackWizard.ts` | Fortune у візарді | 7 |
| `lib/utils/battle/view/{system-conditions,scene-maps}.ts`, `lib/hooks/battle/{useDisplayEffectMap,useBattleScene,useDmParticipantActions,useConditionTestPanel}.ts` | бейджі, ДМ-діалог, «Спробувати зняти» | 8 |
| `components/battle/hud/EffectLine.tsx`, `components/battle/participants/{ParticipantRow,MyHeroPanel,ConditionTestPanel}.tsx`, `components/battle/dm/DmQuickActionsPanel.tsx`, `components/systems/{types,wfrp/index,wfrp/SystemConditionsDialog}.tsx`, `components/battle/wizards/attack/D100RollBody.tsx`, `components/battle/overlays/PercentileResultLines.tsx` | UI | 8 |
| `messages/{uk,en}/battleWfrp.json`, `lib/i18n/{config,scopes}.ts`, `app/campaigns/[id]/{battles,dm/battles}/layout.tsx`, `lib/server/campaigns/system-key.ts`, `lib/i18n/__tests__/{scope-size,label-keys-battleWfrp}.test.ts` | i18n | 1 (каркас), 9 |
| `lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts` | e2e | 10 |
| `docs/architecture/rule-systems.md`, `docs/STATUS.md` | документація | 11 |

Порядок виконання: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 (live-run) → фінал (повний прогін + Opus-review). Задачі 5 і 6 незалежні одна від одної (обидві залежать від 1–3), але виконуються послідовно (спільні файли типів).

---

## Task 1: контракт, каталог, рівні, накладання/зняття, каркас `battleWfrp`

**Files:**
- Modify: `lib/utils/rules/systems/types.ts`, `types/battle.ts` (`BattleParticipantBattleData`), `lib/i18n/config.ts` (`NAMESPACES`)
- Create: `lib/utils/rules/systems/wfrp/conditions/catalog.ts`, `levels.ts`, `apply.ts`
- Create: `messages/uk/battleWfrp.json`, `messages/en/battleWfrp.json`
- Create test: `lib/utils/rules/systems/wfrp/conditions/__tests__/catalog.test.ts`, `lib/i18n/__tests__/label-keys-battleWfrp.test.ts`

**Interfaces:**
- Produces (types.ts, експорт з `lib/utils/rules/systems/types.ts`):
```ts
export interface SystemConditionInfo { key: string; maxLevel: number | null; endTest: "roll" | "stand" | null }
export interface SystemConditionApply { key: string; levels?: number; rounds?: number; round: number; source?: ActiveEffect["source"]; sourceName: LogLine }
export interface SystemConditionResult { participants: BattleParticipant[]; messages: LogLine[] }
export interface SystemConditionLevel { key: string; level: number; effectKey: string }
export interface RuleSystemConditions {
  catalog: readonly SystemConditionInfo[];
  list(p: BattleParticipant): SystemConditionLevel[];
  apply(ps: BattleParticipant[], targetId: string, input: SystemConditionApply): SystemConditionResult;
  reduce(ps: BattleParticipant[], targetId: string, key: string, by: 1 | "all"): SystemConditionResult & { removed: boolean };
  turnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset }): SystemConditionResult & { downed: boolean };
  attemptEnd(ps: BattleParticipant[], id: string, key: string, ctx: { round: number; rng: Rng; rules: Ruleset; presetRoll?: number }): SystemConditionResult & { success: boolean; roll: number; target: number; sl: number };
}
// RuleSystemDefinition: conditions?: RuleSystemConditions;   RuleSystemCombat: fortune?: true;
```
  (`effectKey` у `list` — відхилення від спеки: потрібен в'юсі ядра, щоб згорнути стеки в один бейдж без знання префікса `wfrp:cond:`.)
- Produces (`types/battle.ts`, `BattleParticipantBattleData`): `fortune?: number;` (з коментарем-«чому» не потрібно) і `conditionTests?: string[];`.
- Produces (wfrp):
  - `catalog.ts`: `WFRP_CONDITION_KEYS` (12 ключів у порядку спеки), `type WfrpConditionKey`, `interface WfrpConditionDef`, `WFRP_CONDITION_REGISTRY: Record<WfrpConditionKey, WfrpConditionDef>`, `WFRP_CONDITION_MAX_LEVEL = 10`, `BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL = 0.1`, `isWfrpConditionKey(k: string): k is WfrpConditionKey`, `wfrpConditionEffectKey(key) => \`wfrp:cond:${key}\``, `wfrpConditionMarker(key) => \`wfrp:${key}\``.
  - `levels.ts`: `conditionLevel(p: BattleParticipant, key: WfrpConditionKey): number`, `wfrpConditions(p): SystemConditionLevel[]` (лише ключі з рівнем > 0, у порядку `WFRP_CONDITION_KEYS`).
  - `apply.ts`: `applyWfrpConditionTo(p, input: SystemConditionApply & { key: WfrpConditionKey }): { participant: BattleParticipant; messages: LogLine[] }`, `reduceWfrpCondition(p, key: WfrpConditionKey, by: 1 | "all"): { participant: BattleParticipant; removed: boolean }`, обгортки на масив `applyWfrpCondition(ps, targetId, input): SystemConditionResult`, `reduceWfrpConditionIn(ps, targetId, key: string, by): SystemConditionResult & { removed: boolean }` (невідомий ключ/учасник → `removed: false`, масив без змін).

**Рішення щодо каталогу (`catalog.ts`):**
```ts
import { EffectMarker } from "@/lib/constants/battle";
import type { CharacteristicKey } from "../characteristics/keys";

// All values: verify against 5e book.
export const WFRP_CONDITION_MAX_LEVEL = 10;
export const BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL = 0.1;
export const CONDITION_TEST_STEP = -10;
export const BLINDED_SELF_ATTACK = -20;
export const AGAINST_BONUS = 20;

export const WFRP_CONDITION_KEYS = ["bleeding", "fatigued", "poisoned", "stunned", "ablaze", "broken", "entangled", "prone", "surprised", "blinded", "deafened", "unconscious"] as const;
export type WfrpConditionKey = (typeof WFRP_CONDITION_KEYS)[number];

export interface WfrpConditionDef {
  leveled: { max: number } | false;
  markers: EffectMarker[];
  testMod?: { self?: (level: number) => number; selfAttack?: number; against?: { melee?: number; all?: number } };
  tick?: "bleeding" | "ablaze";
  endTest: { skill: string } | { characteristic: CharacteristicKey } | "stand" | null;
  rounds?: number;
}

const leveled = { max: WFRP_CONDITION_MAX_LEVEL };
const perLevel = (level: number) => CONDITION_TEST_STEP * level;

export const WFRP_CONDITION_REGISTRY: Record<WfrpConditionKey, WfrpConditionDef> = {
  bleeding: { leveled, markers: [], tick: "bleeding", endTest: { skill: "endurance" } },
  fatigued: { leveled, markers: [], testMod: { self: perLevel }, endTest: null },
  poisoned: { leveled, markers: [], testMod: { self: perLevel }, endTest: { skill: "endurance" } },
  stunned: { leveled, markers: [EffectMarker.SKIP_ACTION], testMod: { self: perLevel }, endTest: { skill: "endurance" } },
  ablaze: { leveled, markers: [], tick: "ablaze", endTest: { skill: "athletics" } },
  broken: { leveled, markers: [], testMod: { self: perLevel }, endTest: { skill: "cool" } },
  entangled: { leveled, markers: [EffectMarker.IMMOBILIZED], testMod: { self: perLevel }, endTest: { characteristic: "s" } },
  prone: { leveled: false, markers: [EffectMarker.IMMOBILIZED], testMod: { against: { melee: AGAINST_BONUS } }, endTest: "stand" },
  surprised: { leveled: false, markers: [EffectMarker.SKIP_ACTION], testMod: { against: { all: AGAINST_BONUS } }, endTest: null, rounds: 1 },
  blinded: { leveled: false, markers: [], testMod: { selfAttack: BLINDED_SELF_ATTACK, against: { all: AGAINST_BONUS } }, endTest: null },
  deafened: { leveled: false, markers: [], endTest: null },
  unconscious: { leveled: false, markers: [EffectMarker.SKIP_ACTION, EffectMarker.IMMOBILIZED], endTest: null },
};
```
Маркер `SKIP_ACTION` у ефекті має значення `100` (як 5e, `turn-start.ts` читає value як відсоток), решта маркерів — `1`.

**Рішення щодо `apply.ts`:**
- Ефект через `upsertLabeled` (`@/lib/utils/battle/actions/effects`): `{ timedKey: wfrpConditionEffectKey(key), name: wfrpConditionEffectKey(key), label: dynamicTextRef(\`battleWfrp.conditions.${key}.label\`), type: "condition", rounds: input.rounds ?? def.rounds ?? PERMANENT_ROUNDS, permanent: !(input.rounds ?? def.rounds), stackable: !!def.leveled, source: input.source, effects: [{ type: wfrpConditionMarker(key), value: def.leveled ? clampLevels : 1 }, ...def.markers.map((m) => ({ type: m, value: m === EffectMarker.SKIP_ACTION ? 100 : 1 }))] }`, потім у створеному ефекті (тих, що мають цей `abilityKey`) виставити `description: dynamicTextRef(\`battleWfrp.conditions.${key}.description\`)` (підказка чипа, бо `effectLines` бере `description`).
- Рівневий: `levels = clamp(input.levels ?? 1, 1, max)`; якщо поточний `conditionLevel` уже = `max`, ефект не додається (повідомлення все одно `battleWfrp.log.applied`). Обрізання суми в `conditionLevel` (а не в ефекті) — ефекти можуть сумарно перевищувати `max`, рівень — ні.
- Нерівневий, якщо вже є: `upsertTimedEffect` з `stackable: false` оновлює той самий ефект (тривалість перезаписується) — дубля немає.
- `unconscious`: ставить `combatStats.status = CombatStatus.UNCONSCIOUS`, якщо статус не `DEAD`.
- Повідомлення: `textRef("battleWfrp.log.applied", { target: name, condition: dynamicTextRef(label key), level, source: input.sourceName })` (для нерівневих `level` = 1; текст лог-ключа не показує рівень, якщо він 1 — див. i18n нижче, використовуйте ICU `{level, plural, =1 {} other { ×#}}`).
- `reduceWfrpCondition(p, key, 1)`: знайти ефекти з `abilityKey === wfrpConditionEffectKey(key)`; найновіший (останній у масиві) — зменшити значення маркера `wfrp:<key>` на 1; якщо стало 0 або стан нерівневий — `removeEffects(p, (e) => e.id === newest.id)` (`@/lib/utils/battle/conditions/query`). `"all"` — `removeEffects` усіх ефектів ключа. `removed` = після операції `conditionLevel === 0`.
- Зняття `unconscious` (будь-яке, що призвело до рівня 0): статус `ACTIVE` лише якщо `currentHp > 0` і статус був `UNCONSCIOUS`.

- [ ] **Step 1: каркас i18n.** Додати `"battleWfrp"` у `NAMESPACES` (`lib/i18n/config.ts`, після `"battleActions"`). Створити `messages/{uk,en}/battleWfrp.json` зі структурою:
```json
{
  "conditions": {
    "bleeding": { "label": "Кровотеча", "description": "На початку ходу −1 Wounds за рівень; шанс знепритомніти 10% за рівень" },
    "fatigued": { "label": "Втома", "description": "−10 до тестів за рівень" },
    "poisoned": { "label": "Отруєння", "description": "−10 до тестів за рівень" },
    "stunned": { "label": "Оглушення", "description": "Без дії; −10 до тестів за рівень" },
    "ablaze": { "label": "Горіння", "description": "На початку ходу d10 + рівень − 1 шкоди" },
    "broken": { "label": "Зламаний", "description": "−10 до тестів за рівень" },
    "entangled": { "label": "Сплутаний", "description": "Не рухається; −10 до тестів за рівень" },
    "prone": { "label": "Лежить", "description": "Не рухається; ближнім атакам по ньому +20" },
    "surprised": { "label": "Захоплений зненацька", "description": "Без дії; атакам по ньому +20" },
    "blinded": { "label": "Осліплений", "description": "−20 до власних атак; атакам по ньому +20" },
    "deafened": { "label": "Оглушений звуком", "description": "Не чує" },
    "unconscious": { "label": "Непритомний", "description": "Не діє й не рухається" }
  },
  "log": {
    "applied": "{target}: {condition}{level, plural, =1 {} other { ×#}} ({source})",
    "removed": "{target}: {condition} знято",
    "reduced": "{target}: {condition} ×{level}"
  }
}
```
  (en — ті самі ключі англійською: Bleeding, Fatigued, Poisoned, Stunned, Ablaze, Broken, Entangled, Prone, Surprised, Blinded, Deafened, Unconscious; описи — дослівні переклади.) Наступні задачі лише додають ключі в цей файл.
- [ ] **Step 2: тест ключів.** `lib/i18n/__tests__/label-keys-battleWfrp.test.ts` за зразком `label-keys-rule-systems.test.ts`: `for (const k of WFRP_CONDITION_KEYS) expectLabelKeys("battleWfrp", \`conditions.${k}\`, ["label", "description"]);`.
- [ ] **Step 3: падаючі тести** `lib/utils/rules/systems/wfrp/conditions/__tests__/catalog.test.ts` (учасник — `makeParticipant` з `@/lib/utils/abilities/__tests__/fixtures`, `round: 1`):
  - значення каталогу: `WFRP_CONDITION_MAX_LEVEL === 10`, `BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL === 0.1`, `WFRP_CONDITION_REGISTRY.fatigued.testMod.self(2) === -20`, `prone.testMod.against.melee === 20`, `blinded.testMod.selfAttack === -20`, `surprised.rounds === 1`, `entangled.endTest` = `{ characteristic: "s" }`, `ablaze.endTest` = `{ skill: "athletics" }`, `bleeding/poisoned/stunned.endTest` = `{ skill: "endurance" }`, `broken.endTest` = `{ skill: "cool" }`, `fatigued/surprised/blinded/deafened/unconscious.endTest === null`, `prone.endTest === "stand"`; маркери: stunned/surprised → `SKIP_ACTION`, entangled/prone → `IMMOBILIZED`, unconscious → обидва;
  - Bleeding 1 (крит) + Bleeding 2 (ДМ) → `conditionLevel = 3`, два ефекти з `abilityKey "wfrp:cond:bleeding"`, `type "condition"`, `permanent: true`;
  - Bleeding 6 + 6 → рівень 10 (обрізання); ще +1 при рівні 10 — кількість ефектів не росте;
  - Prone двічі → один ефект, рівень 1;
  - `reduce(…, 1)` з рівнями [1, 2] → [1, 1] (зменшено найновіший), ще раз → [1], ще раз → ефектів немає, `removed: true`;
  - `reduce(…, "all")` → усі ефекти ключа зникли;
  - Unconscious: apply → статус `UNCONSCIOUS`; reduce при `currentHp = 5` → `ACTIVE`; при `currentHp = 0` → лишається `UNCONSCIOUS`; apply на `DEAD` → статус лишається `DEAD`;
  - маркери `wfrp:*` не бачить 5e: `hasCondition(p, "prone")` = false після wfrp Prone, `conditionEffects(p)` порожній, `hasAnyCondition5e(p)` = false (`@/lib/utils/battle/conditions/query`);
  - ефект має `label` = `dynamicTextRef("battleWfrp.conditions.bleeding.label")` і `description` з `.description`;
  - Stunned має маркер `{ type: "skip_action", value: 100 }`;
  - `wfrpConditions(p)` для Bleeding 3 + Prone → `[{ key: "bleeding", level: 3, effectKey: "wfrp:cond:bleeding" }, { key: "prone", level: 1, effectKey: "wfrp:cond:prone" }]`;
  - `applyWfrpCondition(ps, "missing", …)` → масив без змін, `messages: []`; `reduceWfrpConditionIn(ps, id, "frenzy", 1)` → `removed: false`.
- [ ] **Step 4:** `pnpm test:run lib/utils/rules/systems/wfrp/conditions` → FAIL (модулів немає).
- [ ] **Step 5:** реалізувати `types.ts` (контракт), поля в `types/battle.ts`, `catalog.ts`, `levels.ts`, `apply.ts` за рішеннями вище.
- [ ] **Step 6:** `pnpm test:related lib/utils/rules/systems/types.ts lib/utils/rules/systems/wfrp/conditions/catalog.ts lib/utils/rules/systems/wfrp/conditions/levels.ts lib/utils/rules/systems/wfrp/conditions/apply.ts types/battle.ts lib/i18n/config.ts` + `pnpm test:run lib/i18n/__tests__/label-keys-battleWfrp.test.ts lib/i18n/__tests__/parity.test.ts lib/i18n/__tests__/messages.test.ts` → PASS; `pnpm exec eslint --fix <усі змінені/створені файли>`.
- [ ] **Step 7: Commit**
```bash
git add lib/utils/rules/systems/types.ts types/battle.ts lib/utils/rules/systems/wfrp/conditions lib/i18n/config.ts lib/i18n/__tests__/label-keys-battleWfrp.test.ts messages/uk/battleWfrp.json messages/en/battleWfrp.json
git commit -m "feat(wfrp): condition contract, catalog and stacking levels

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

**Готово, коли:** каталог і рівні покриті тестами вище; d20-код не змінено; `battleWfrp` у `NAMESPACES` з паритетом uk/en.

---

## Task 2: модифікатори тестів і крит → стан

**Files:**
- Create: `lib/utils/rules/systems/wfrp/conditions/test-mod.ts`
- Modify: `lib/utils/rules/systems/wfrp/combat/resolve-attack.ts`, `lib/utils/rules/systems/wfrp/sheet-test.ts`, `lib/utils/rules/systems/wfrp/combat/crit-effect.ts`
- Test: `lib/utils/rules/systems/wfrp/conditions/__tests__/test-mod.test.ts` (create), `lib/utils/rules/systems/wfrp/combat/__tests__/combat.test.ts` (додати `describe`), `lib/utils/rules/systems/wfrp/__tests__/sheet-test.test.ts` (додати кейс)

**Interfaces:**
- Consumes: `conditionLevel`, `WFRP_CONDITION_REGISTRY`, `WFRP_CONDITION_KEYS`, `isWfrpConditionKey`, `applyWfrpConditionTo` (Task 1).
- Produces: `selfTestMod(p: BattleParticipant | undefined, kind: "attack" | "test"): number`, `againstMod(target: BattleParticipant, attackKind: "melee" | "ranged"): number` у `test-mod.ts`; `attackerTargetOf(attacker, attack)` (не експортується) у `resolve-attack.ts`.

**Рішення:**
- `selfTestMod`: сума по ключах з `testMod.self` → `self(conditionLevel)` (лише якщо рівень > 0) плюс, для `kind === "attack"`, `testMod.selfAttack` для наявних станів. `p` без `battleData` (тест листа передає `{}`) → 0.
- `againstMod(target, kind)`: сума `against.all` наявних станів + `against.melee`, якщо `kind === "melee"`.
- `resolve-attack.ts`: `attackerTargetOf = (a, attack) => attackBaseTargetOf(a, attack) + selfTestMod(a, "attack")`; `wfrpAttackTarget` повертає `target: attackerTargetOf(...)` (прев'ю візарда вже бачить штраф); дальній тест: `target: attackerTargetOf(attacker, attack) + againstMod(target, "ranged")`; ближній: `attackerTarget: attackerTargetOf(attacker, attack) + againstMod(target, "melee") + outnumbering`, кожна `defenderTargets[i].target + selfTestMod(target, "test")`.
- `sheet-test.ts`: `target = <наявне> + selfTestMod(participant, "test")`. Примітка для «Межі 5c-1» (Task 11): `roll-handler.ts` будує свіжого учасника з листа, тож у реальному виклику модифікатор зараз дорівнює 0 — стани в бою на тест з листа не впливають, доки обробник не братиме учасника зі знімка бою.
- `crit-effect.ts`: якщо `crit.markerKey && isWfrpConditionKey(crit.markerKey)` → `applyWfrpConditionTo(target, { key, levels: 1, round, sourceName: dynamicTextRef(crit.textKey) })`, `message` — наявний крит-рядок (стан додається до повідомлень? ні: повертається лише крит-рядок, щоб не дублювати лог; стан видно бейджем). Інакше (disarmed/winded/crippled) — наявна інертна мітка без змін. Head.5 «unconscious» тепер ставить статус `UNCONSCIOUS` через стан.

- [ ] **Step 1: падаючі тести** `test-mod.test.ts`:
  - Fatigued 2 → `selfTestMod(p, "attack") === -20` і `selfTestMod(p, "test") === -20`;
  - Fatigued 1 + Poisoned 2 → −30; Blinded → attack −20, test 0; Stunned 1 + Blinded → attack −30;
  - Prone: `againstMod(p, "melee") === 20`, `againstMod(p, "ranged") === 0`; Surprised → 20/20; Blinded + Prone → melee 40;
  - порожній учасник `{}` → 0;
  - `wfrpAttackTarget(attacker з Fatigued 1, sword).target` = WS − 10.
- [ ] **Step 2: падаючі тести** у `combat.test.ts`, новий `describe("resolveWfrpAttack conditions")` (учасники — як `fighter()` у `lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts`: `wfrpAbilitiesOf(characteristics)` у `abilities`, WS/AG 40; кидки через `manualRoll`, rng `() => 0.5`):
  - Stunned 1 в атакувальника → `attackRoll.percentile.target` = 30 (40 − 10), ближній;
  - Prone у цілі → ціль атакувальника 60 (40 + 20), дальній без Prone-бонусу (ціль BS 40);
  - Fatigued 2 у захисника → `percentile.defender.target` = 20;
  - крит: `applyWfrpCrit(target, { id: "head.2", textKey: "battleLog.wfrp.crit.head.2", bonusDamage: 2, markerKey: "bleeding" }, 1)` → `conditionLevel(p, "bleeding") === 1`, жодного ефекту з `name` що починається з `crit.wfrp.`; head.5 (`markerKey: "unconscious"`) → статус `UNCONSCIOUS`; arm.3 `markerKey: "disarmed"` → наявна мітка `crit.wfrp.arm.3.disarmed` (як раніше); leg.3 `prone` → стан Prone.
- [ ] **Step 3:** у `sheet-test.test.ts` кейс: `participant` з Fatigued 1 (через `applyWfrpConditionTo` на `makeParticipant`) → `target` на 10 менший за кейс без стану.
- [ ] **Step 4:** `pnpm test:run lib/utils/rules/systems/wfrp` → FAIL.
- [ ] **Step 5:** реалізувати.
- [ ] **Step 6:** `pnpm test:related lib/utils/rules/systems/wfrp/conditions/test-mod.ts lib/utils/rules/systems/wfrp/combat/resolve-attack.ts lib/utils/rules/systems/wfrp/sheet-test.ts lib/utils/rules/systems/wfrp/combat/crit-effect.ts` → PASS (зокрема наявний `wfrp-battle-e2e.test.ts`: якщо його перший сценарій перевіряв `crits(target)` за `name.startsWith("crit.wfrp.")` і тепер крит став станом — **не правити очікування мовчки**: з'ясувати, який рядок крита випав; якщо це bleeding/stunned/unconscious/prone, оновити перевірку на `conditionLevel(...) > 0 || crits(...)` і зафіксувати в коміті причину); eslint `--fix` по змінених.
- [ ] **Step 7: Commit** `feat(wfrp): condition test modifiers; crit markers apply conditions` (+ рядок Co-Authored-By).

**Готово, коли:** штрафи/бонуси станів впливають на цілі атаки й захисту; крити bleeding/stunned/unconscious/prone накладають стан; disarmed/winded/crippled — мітки як раніше.

---

## Task 3: тіки, тест зняття, реєстрація хука в WFRP_SYSTEM

**Files:**
- Create: `lib/utils/rules/systems/wfrp/conditions/tick.ts`, `end-test.ts`, `index.ts`
- Modify: `lib/utils/rules/systems/wfrp/index.ts`
- Test: `lib/utils/rules/systems/wfrp/conditions/__tests__/tick.test.ts`, `end-test.test.ts` (create), `lib/utils/rules/systems/__tests__/registry.test.ts` (додати кейс)

**Interfaces:**
- Consumes: Task 1 (`applyWfrpConditionTo`, `reduceWfrpCondition`, `conditionLevel`, `wfrpConditions`, `applyWfrpCondition`, `reduceWfrpConditionIn`, `BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL`), Task 2 (`selfTestMod`), `applyDamageConsequences` (`@/lib/utils/battle/damage/consequences`), `resolvePercentileTest` (`../percentile`), `skillTarget`/`value` (`../characteristics/derive`), `readCharacteristics` (`../characteristics/keys`), `MIN_DAMAGE` (`../combat/constants`), `rollDie` (`@/lib/utils/common/dice`).
- Produces: `wfrpConditionsTurnStart(ps, id, ctx): SystemConditionResult & { downed: boolean }`, `attemptWfrpConditionEnd(ps, id, key, ctx): SystemConditionResult & { success; roll; target; sl }`, `WFRP_CONDITIONS: RuleSystemConditions`; `WFRP_SYSTEM.conditions = WFRP_CONDITIONS`, `WFRP_SYSTEM.combat.fortune = true`.

**Рішення (`tick.ts`):**
```ts
export function wfrpConditionsTurnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset }): SystemConditionResult & { downed: boolean } {
  const start = findParticipant(ps, id);
  if (!start || !isActive(start)) return { participants: ps, messages: [], downed: false };
  let participants = ps;
  const messages: LogLine[] = [];
  const hurt = (amount: number, key: "bleeding" | "ablaze") => {
    const before = findParticipant(participants, id);
    if (!before || !isActive(before) || amount <= 0) return;
    const after = { ...before, combatStats: { ...before.combatStats, currentHp: before.combatStats.currentHp - amount } };
    const r = applyDamageConsequences({ before, after, amount, rules: ctx.rules, rng: ctx.rng, participants: replaceParticipant(participants, after), round: ctx.round });
    participants = r.participants;
    messages.push(textRef(`battleWfrp.log.tick.${key}`, { name: before.basicInfo.name, damage: amount }), ...r.messages);
  };
  const bleeding = conditionLevel(findParticipant(participants, id)!, "bleeding");
  if (bleeding > 0) {
    hurt(bleeding, "bleeding");
    const now = findParticipant(participants, id)!;
    if (isActive(now) && ctx.rng() < BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL * bleeding) {
      const faint = applyWfrpConditionTo(now, { key: "unconscious", levels: 1, round: ctx.round, sourceName: dynamicTextRef("battleWfrp.conditions.bleeding.label") });
      participants = replaceParticipant(participants, faint.participant);
      messages.push(textRef("battleWfrp.log.tick.faint", { name: now.basicInfo.name }));
    }
  }
  const ablaze = conditionLevel(findParticipant(participants, id)!, "ablaze");
  if (ablaze > 0) {
    const p = findParticipant(participants, id)!;
    hurt(Math.max(MIN_DAMAGE, rollDie(10, ctx.rng) + ablaze - 1 - (p.abilities.wfrp?.tb ?? 0) - (p.abilities.wfrp?.ap.body ?? 0)), "ablaze");
  }
  const after = findParticipant(participants, id);
  return { participants, messages, downed: !!after && !isActive(after) && isActive(findParticipant(ps, id)!) };
}
```
- Bleeding (L > 0): `hurt(L)`; якщо носій ще активний і `ctx.rng() < BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL * L` → `applyWfrpConditionTo(unconscious, { levels: 1, round, sourceName: dynamicTextRef("battleWfrp.conditions.bleeding.label") })`, повідомлення `battleWfrp.log.tick.faint`.
- Ablaze (L > 0, носій ще активний): `Math.max(MIN_DAMAGE, rollDie(10, ctx.rng) + L - 1 - (wfrp.tb ?? 0) - (wfrp.ap.body ?? 0))`, де `wfrp = p.abilities.wfrp`.
- Шкода на 0 Wounds іде через `applyDamageConsequences` → `wfrpOnZeroHp` (наявне правило: небойове джерело без `location` → крит у body, статус `UNCONSCIOUS`). Носій, неактивний на вході, — без тіків (повертає вхід, `downed: false`).

**Рішення (`end-test.ts`):**
- Невідомий ключ / стан відсутній / `endTest === null` → `{ participants: ps, messages: [], success: false, roll: 0, target: 0, sl: 0 }` (мутація перевіряє наявність раніше; це захист).
- `"stand"` → `reduceWfrpCondition(p, key, "all")`, `success: true, roll: 0, target: 0, sl: 0`, лог `battleWfrp.log.stand`.
- Інакше `c = readCharacteristics({ characteristics: p.abilities.characteristics })`; `base = "skill" in endTest ? (skillTarget(c, endTest.skill)?.target ?? 0) : value(c, endTest.characteristic)`; `target = base + selfTestMod(p, "test")`; `t = resolvePercentileTest({ target, rng: ctx.rng, presetRoll: ctx.presetRoll })`; `success = t.outcome === "success" || t.outcome === "critical"`; успіх → `reduceWfrpCondition(p, key, 1)` (нерівневий — повне зняття, бо рівень 1); лог `battleWfrp.log.endTestSuccess` / `endTestFail` з `{ name, condition, roll: t.roll, target, sl: t.sl }`; повертає `roll: t.roll, target, sl: t.sl`.

**`index.ts`:**
```ts
export const WFRP_CONDITIONS: RuleSystemConditions = {
  catalog: WFRP_CONDITION_KEYS.map((key) => { const d = WFRP_CONDITION_REGISTRY[key]; return { key, maxLevel: d.leveled ? d.leveled.max : null, endTest: d.endTest === null ? null : d.endTest === "stand" ? "stand" : "roll" }; }),
  list: wfrpConditions,
  apply: (ps, id, input) => (isWfrpConditionKey(input.key) ? applyWfrpCondition(ps, id, { ...input, key: input.key }) : { participants: ps, messages: [] }),
  reduce: reduceWfrpConditionIn,
  turnStart: wfrpConditionsTurnStart,
  attemptEnd: attemptWfrpConditionEnd,
};
```
`wfrp/index.ts`: `conditions: WFRP_CONDITIONS`, у `combat` додати `fortune: true`. `unusedMechanics` лишає `"conditions"`.

i18n (`battleWfrp.log`): `"tick": { "bleeding": "{name}: кровотеча, −{damage} Wounds", "ablaze": "{name}: горить, −{damage} Wounds", "faint": "{name} знепритомнів від крововтрати" }`, `"endTestSuccess": "{name}: {condition} — тест {roll} / {target}, SL {sl}: успіх"`, `"endTestFail": "{name}: {condition} — тест {roll} / {target}, SL {sl}: невдача"`, `"stand": "{name} підводиться"` (+ en).

- [ ] **Step 1: падаючі тести** `tick.test.ts` (rng детермінований через фабрику `seq(...values)` з `@/lib/utils/abilities/__tests__/fixtures` або власний масив; учасник wfrp з `tb: 3`, `ap.body: 1`, `currentHp: 10`, правила `WFRP_RULES`):
  - Bleeding 2, rng 0.5 → `currentHp` 8, повідомлення `battleWfrp.log.tick.bleeding`, `downed: false`;
  - Bleeding 2, rng 0.19 → стан Unconscious, статус `UNCONSCIOUS`, `downed: true`; rng 0.21 → без непритомності;
  - Ablaze 1, rng так, що `rollDie(10)` = 8 (rng 0.75) → 8 + 0 − 3 − 1 = 4 → `currentHp` 6; Ablaze 1 з rollDie = 1 (rng 0) → мінімум `MIN_DAMAGE` = 1;
  - Bleeding 3 при `currentHp` 2 → статус `UNCONSCIOUS`, є крит-повідомлення від `wfrpOnZeroHp` (`battleLog.wfrp.unconscious`), `downed: true`;
  - неактивний (UNCONSCIOUS) носій з Bleeding 2 → без змін, `downed: false`;
  - без станів → `participants` той самий масив за посиланням, `messages: []`.
- [ ] **Step 2: падаючі тести** `end-test.test.ts` (Endurance = T, характеристики за замовчуванням 30):
  - Bleeding 2, `presetRoll: 10` → `success: true`, рівень 1; `presetRoll: 90` → `success: false`, рівень 2;
  - Prone → `success: true` без кидка (`roll: 0`), стану немає;
  - Fatigued 3 + Bleeding 1, `presetRoll: 25` → ціль 30 − 30 = 0 → провал (25 > 0 і не автоуспіх ≤ 5), `target === 0`;
  - Entangled → ціль = значення S (характеристика), не навичка;
  - Fatigued (без `endTest`) → `success: false`, без змін;
  - без `presetRoll` використовує `ctx.rng`.
- [ ] **Step 3:** у `registry.test.ts` кейс: `RULE_SYSTEM_REGISTRY.wfrp.conditions` визначено, `combat.fortune === true`; `homm`/`dnd5e` — `conditions` і `combat.fortune` `undefined`; `WFRP_CONDITIONS.catalog` має 12 записів, `prone.endTest === "stand"`, `fatigued.endTest === null`, `bleeding.maxLevel === 10`, `prone.maxLevel === null`.
- [ ] **Step 4:** `pnpm test:run lib/utils/rules/systems` → FAIL; реалізувати; → PASS.
- [ ] **Step 5:** `pnpm test:related lib/utils/rules/systems/wfrp/conditions/tick.ts lib/utils/rules/systems/wfrp/conditions/end-test.ts lib/utils/rules/systems/wfrp/conditions/index.ts lib/utils/rules/systems/wfrp/index.ts` → PASS; `pnpm test:run lib/i18n/__tests__/parity.test.ts`; eslint `--fix`.
- [ ] **Step 6: Commit** `feat(wfrp): condition ticks, end test and rule-system hook` (+ Co-Authored-By).

**Готово, коли:** хук `conditions` зареєстрований лише у wfrp; тіки й тест зняття детерміновано покриті.

---

## Task 4: тік у ядрі на початку ходу + скидання спроб зняття

**Files:**
- Modify: `lib/utils/battle/turn/turn-start.ts`, `lib/utils/battle/turn/turn-state.ts`
- Create test: `lib/utils/battle/turn/__tests__/system-conditions-turn.test.ts`

**Interfaces:**
- Consumes: `ruleSystemOf(rules).conditions?.turnStart` (Task 3), `WFRP_RULES` (`@/lib/utils/rules/systems/wfrp/rules-preset` — у тестах дозволено), `applyWfrpCondition` лише в тесті (тести можуть імпортувати wfrp; якщо ESLint-ізоляція скаржиться на тестовий файл у `lib/utils/battle/**`, накладати стан через `ruleSystemOf(WFRP_RULES).conditions!.apply(...)`).
- Produces: поведінка: тік виконується в `processStartOfTurn` для активного носія; `battleData.conditionTests` скидається на початку власного ходу.

**Рішення:**
- У `applyStartOfTurnDamage` усередині гілки `if (status !== DEAD && status !== UNCONSCIOUS && !sitsOutTurn(...))` **одразу після блоку DoT** (після `damageMessages.push(...dotResult.damageMessages, ...)`):
```ts
    const ticks = ruleSystemOf(rules).conditions?.turnStart(replaceParticipant(others, updatedParticipant), updatedParticipant.basicInfo.id, { round: currentRound, rng, rules });

    if (ticks) {
      others = ticks.participants;
      updatedParticipant = findParticipant(others, updatedParticipant.basicInfo.id) ?? updatedParticipant;
      damageMessages.push(...ticks.messages);
      systemDowned = ticks.downed;
    }
```
  `others` у цій функції — повний масив, у якому носій може бути застарілим, тому передається `replaceParticipant(others, updatedParticipant)` (як `resolvePendingHits` вище).
- Новий прапорець `systemDowned` (`let systemDowned = false;` поруч із `killedByRules`, повертається в `StartOfTurnDamage`) (не зливати з `killedByRules`, бо той перезаписується нижче hazard/zone-кроками). У `processStartOfTurn`: `else if (killedByRules || damage.systemDowned) statusChanged = true;` — далі наявний `resolveDowned`, `runAbilities(turnStart)` не запускається.
- `resetTurnState` (`turn-state.ts`): додати `...(p.battleData.conditionTests && { conditionTests: undefined })` (умовний спред — щоб не міняти наявні снапшоти `__snapshots__`).
- `import { ruleSystemOf } from "@/lib/utils/rules/systems";` у `turn-start.ts`. Цикл модулів (`systems → wfrp → conditions/tick → damage/consequences → systems`) безпечний: усі виклики — всередині функцій; якщо vitest покаже `undefined` при ініціалізації — не переносити код, а перевірити, що жоден модуль не читає `RULE_SYSTEM_REGISTRY` на верхньому рівні.

- [ ] **Step 1: падаючі тести** `system-conditions-turn.test.ts` (учасники wfrp як у `wfrp-initiative.test.ts`: `createMockParticipant` + `wfrpAbilitiesOf`; правила `WFRP_RULES`):
  - `processStartOfTurn(a з Bleeding 2, hp 10, ..., rng () => 0.5, null, WFRP_RULES)` → `participant.combatStats.currentHp === 8`, `damageMessages` містить `battleWfrp.log.tick.bleeding` (перевірка через `lineKey` або `.message`), `statusChanged: false`;
  - Bleeding 2, rng 0.1 → `statusChanged: true`, статус `UNCONSCIOUS`, `abilityMessages` не містить результатів `runAbilities` (перевірити, що `actionFlags` носія неактивного не скинуто в «може діяти»: `isActive(participant) === false`);
  - `advanceTurn({ participants: [a, b (Bleeding 1, hp 1), c], pending: [], scene: { ...сцена з turnIndex 0, round 1 }, rng: () => 0.5, map: null, rules: WFRP_RULES })` → `b` знепритомнів від тіку, `scene.turnIndex` вказує на `c` (наступний активний), `b.combatStats.status === UNCONSCIOUS`; (форму `scene` взяти з `lib/server/battles/__tests__/mutations/fixtures.ts` `context().scene`; сигнатуру — з `lib/server/battles/mutations/attack/attack-mutation.ts`, виклик `advanceTurn` там);
  - `enterChangedTurn({ rules: WFRP_RULES, before, after: [b (Bleeding 1, hp 1), c], fromIndex: 0, toIndex: 0, round: 2, rng: () => 0.5 })` → `turnIndex` = індекс `c`, `b` неактивний;
  - d20: `processStartOfTurn(..., DEFAULT_RULES)` для учасника з wfrp-ефектом Bleeding (накладеним вручну через `upsertLabeled`) → `currentHp` не змінюється (у d20 хука немає);
  - `resetTurnState({ ...p, battleData: { ...p.battleData, conditionTests: ["bleeding"] } }).conditionTests` → `undefined`; для учасника без поля — ключа `conditionTests` у результаті немає (`"conditionTests" in result === false`).
- [ ] **Step 2:** `pnpm test:run lib/utils/battle/turn/__tests__/system-conditions-turn.test.ts` → FAIL.
- [ ] **Step 3:** реалізувати.
- [ ] **Step 4:** `pnpm test:related lib/utils/battle/turn/turn-start.ts lib/utils/battle/turn/turn-state.ts` → PASS (наявні тести ходу без правок, снапшоти не оновлювати: якщо снапшот змінився — це помилка реалізації); eslint `--fix`.
- [ ] **Step 5: Commit** `feat(battle): system condition ticks at turn start` (+ Co-Authored-By).

**Готово, коли:** тік у wfrp працює, знепритомнілий від тіку носій пропускається циклом; d20 і снапшоти без змін.

---

## Task 5: мутації `system-condition` і `condition-test`, роути, клієнт

**Files:**
- Create: `lib/server/battles/mutations/system-condition/system-condition-mutation.ts`, `lib/server/battles/mutations/condition-test/condition-test-mutation.ts`
- Create: `app/api/campaigns/[id]/battles/[battleId]/system-condition/route.ts`, `app/api/campaigns/[id]/battles/[battleId]/condition-test/route.ts`
- Modify: `lib/server/battles/operations.ts`, `lib/constants/api-errors.ts`, `messages/{uk,en}/errors.json`, `messages/{uk,en}/battleWfrp.json`, `lib/api/battle-ops.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleActions.ts`
- Create test: `lib/server/battles/__tests__/mutations/system-condition-mutation.test.ts`, `lib/server/battles/__tests__/mutations/condition-test-mutation.test.ts`

**Interfaces:**
- Consumes: `RuleSystemConditions` (Task 1/3), `requireActor`/`currentOf` (`@/lib/utils/battle/common/control`), `assertCanAct` (`@/lib/utils/battle/turn`), `BattleRuleError`, `dmEvent`, `battleActionToEvent` (`@/lib/utils/battle/store`), `newBattleAction` (`@/lib/utils/battle/common/new-action`), `logFields`/`lineText` (`@/lib/utils/battle/log/lines`), `rngOf` (`@/lib/utils/common/rng`), `CONDITION_LIMITS`, `PERMANENT_ROUNDS`.
- Produces:
```ts
export const systemConditionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply"), participantId: z.string().min(1), condition: z.string().min(1).max(40), levels: z.number().int().min(1).max(10).optional(), rounds: z.number().int().min(1).max(CONDITION_LIMITS.rounds).optional() }),
  z.object({ action: z.literal("remove"), participantId: z.string().min(1), condition: z.string().min(1).max(40), all: z.boolean().optional() }),
]);
export type SystemConditionBody = z.infer<typeof systemConditionSchema>;
export function systemConditionMutation(ctx: BattleMutationContext, body: SystemConditionBody): MutationResult;

export const conditionTestSchema = z.object({ participantId: z.string().min(1), condition: z.string().min(1).max(40), roll: z.number().int().min(1).max(100).optional(), serverRoll: z.boolean().optional() })
  .refine((d) => d.roll !== undefined || d.serverRoll === true, { message: REJECT.rollsRequired, path: ["roll"] });
export type ConditionTestBody = z.infer<typeof conditionTestSchema>;
export function conditionTestMutation(ctx: BattleMutationContext, body: ConditionTestBody): MutationResult;
```
- Клієнт (`lib/api/battle-ops.ts`): типи-дзеркала (як `BattleConditionsBody` там же, без імпорту з `lib/server`):
```ts
export type SystemConditionBody = { action: "apply"; participantId: string; condition: string; levels?: number; rounds?: number } | { action: "remove"; participantId: string; condition: string; all?: boolean };
export type ConditionTestBody = { participantId: string; condition: string; roll?: number; serverRoll?: boolean };
// у battleOps:
systemCondition: op<SystemConditionBody>({ path: "/system-condition" }),
conditionTest: op<ConditionTestBody>({ path: "/condition-test" }),
```
- Хуки (`useBattles.ts`): `export const useSystemCondition = makeBattleHook(battleOps.systemCondition); export const useConditionTest = makeBattleHook(battleOps.conditionTest);` (+ експорт з барелю `lib/hooks/battles/index.ts`, якщо він перелічує явно). `useBattleActions.ts`: `systemCondition: useSystemCondition(campaignId, battleId, o), conditionTest: useConditionTest(campaignId, battleId, o)` — обов'язково, бо `BattleSceneActions` виводиться з ключів `battleOps`.
- Помилки (`lib/constants/api-errors.ts`, поруч із `CONDITION_ABSENT`): `CONDITION_UNSUPPORTED: "errors.conditionUnsupported"`, `CONDITION_TEST_UNAVAILABLE: "errors.conditionTestUnavailable"`, `NO_FORTUNE: "errors.noFortune"` (останній використає Task 6); тексти uk: «Цей стан недоступний у цій системі», «Цей стан зараз не можна спробувати зняти», «У героя немає Fortune»; en відповідно.

**Рішення (`systemConditionMutation`, ДМ):**
- `const conditions = ruleSystemOf(ctx.meta.rules).conditions;` немає або `!conditions.catalog.some((c) => c.key === body.condition)` → `throw new BattleRuleError("invalid_target", API_ERRORS.CONDITION_UNSUPPORTED)`.
- Ціль відсутня → `BattleRuleError("invalid_target", API_ERRORS.MEMBER_NOT_FOUND)` (як `conditions-mutation.ts`).
- apply: `conditions.apply(ctx.participants, id, { key, levels, rounds, round: ctx.scene.round, sourceName: textRef("battleLog.dm.name") })`; подія `dmEvent(round, lineText(messages, "; "), targets)`.
- remove: `conditions.reduce(ps, id, key, body.all ? "all" : 1)`; якщо стану не було (`conditions.list(target)` не містить ключа до виклику) → `BattleRuleError("invalid_target", API_ERRORS.CONDITION_ABSENT, { name })`; подія `dmEvent` з `messages` (reduce повертає `battleWfrp.log.removed` / `reduced`).
- Повертає `{ participants, pending: ctx.pending, events: [...] }` (дельта формується пайплайном).

**Рішення (`conditionTestMutation`, гравець/ДМ):**
- `conditions` немає → `CONDITION_UNSUPPORTED`.
- `const actor = requireActor(ctx, body.participantId, { missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE, forbidden: API_ERRORS.FORBIDDEN, inactive: { code: "action_rejected", message: API_ERRORS.CONDITION_TEST_UNAVAILABLE } })` — гравець лише своїм і в свій хід; ДМ — будь-ким, але додатково `currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id` → `BattleRuleError("action_rejected", API_ERRORS.CONDITION_TEST_UNAVAILABLE)` (спроба лише за ходом носія й для ДМ).
- `assertCanAct(ctx, actor.basicInfo.id)`.
- `info = conditions.catalog.find(...)`; недоступно, якщо `!info || info.endTest === null || !conditions.list(actor).some((c) => c.key === body.condition) || (actor.battleData.conditionTests ?? []).includes(body.condition)` → `CONDITION_TEST_UNAVAILABLE`.
- `r = conditions.attemptEnd(ctx.participants, id, key, { round, rng: rngOf(ctx), rules: ctx.meta.rules, presetRoll: body.serverRoll ? undefined : body.roll })`.
- Записати спробу: у `r.participants` учаснику `battleData.conditionTests = [...old, key]`. Дія не витрачається (`actionFlags` не чіпати).
- Подія: `battleActionToEvent(newBattleAction(actor, "ability", { battleId: ctx.scene.id, round, targets: [actor] }, { actionDetails: {}, ...logFields(lineText(r.messages, "; ")) }))`. (Відхилення від спеки: `actionDetails.percentile` не пишемо — тип описує атаку (локація, netSl); кидок/ціль/SL — у рядку журналу.)
- `operations.ts`: `"system-condition": operation({ access: DM, load: async () => { const { systemConditionMutation, systemConditionSchema } = await import(...); return { schema: systemConditionSchema, mutate: systemConditionMutation }; } })`; `"condition-test": operation({ access: MEMBER, blockedByMode: true, rateLimitScope: "attack", load: … })`. Розмістити в алфавітному порядку ключів, як сусіди.
- Роути — копія `conditions/route.ts` з `operation: "system-condition"` / `"condition-test"`.

i18n `battleWfrp.log`: `"removed"` уже є (Task 1), `"reduced"` — теж.

- [ ] **Step 1: падаючі тести** `system-condition-mutation.test.ts` (контекст `context()` з `./fixtures`, `meta.rules = WFRP_RULES`, `isDM: true`; учасники `hero`, `goblin`):
  - apply bleeding levels 2 → у `gob` рівень 2 (`ruleSystemOf(WFRP_RULES).conditions!.list(...)`), 1 подія з текстом, що містить ім'я «Гоблін» (`eventTextOf` з `@/lib/utils/battle/log/__tests__/event-text`);
  - apply prone rounds 2 → ефект не `permanent`, `duration` 2;
  - remove bleeding (рівень 2) → рівень 1; `all: true` → стану немає;
  - remove відсутнього → `toThrow(API_ERRORS.CONDITION_ABSENT)`;
  - невідомий ключ `"frenzy"` → `CONDITION_UNSUPPORTED`; d20 (`DEFAULT_RULES`) з `"bleeding"` → `CONDITION_UNSUPPORTED`;
  - схема: `levels: 11` і `rounds: 100` відхиляються; `condition: ""` відхиляється.
- [ ] **Step 2: падаючі тести** `condition-test-mutation.test.ts` (wfrp; `hero` керує `user-1`, `turnIndex: 0` = `hero`; на `hero` Bleeding 2 через `conditions.apply`):
  - гравець `roll: 10` → рівень 1, `conditionTests: ["bleeding"]`, `actionFlags.hasUsedAction` без змін, подія одна;
  - повтор того самого стану → `CONDITION_TEST_UNAVAILABLE`; інший стан (Poisoned) у той самий хід — дозволено;
  - `roll: 95` → провал, рівень 2, але `conditionTests` містить ключ;
  - не свій хід (`turnIndex: 1`) для гравця → 403 (`BattleAccessError`); ДМ (`isDM: true`) для не-поточного учасника → `CONDITION_TEST_UNAVAILABLE`;
  - стан без `endTest` (Fatigued) → `CONDITION_TEST_UNAVAILABLE`; стан, якого немає → `CONDITION_TEST_UNAVAILABLE`;
  - Prone → знято без кидка;
  - `serverRoll: true` з `ctx.rng = () => 0.05` → `rollDie` = 6 → успіх;
  - схема: без `roll` і без `serverRoll` → помилка; `roll: 0` / `101` → помилка;
  - після `resetTurnState` (новий хід) спроба знову доступна (перевірка через `resetTurnState` з Task 4).
- [ ] **Step 3:** `pnpm test:run lib/server/battles/__tests__/mutations/system-condition-mutation.test.ts lib/server/battles/__tests__/mutations/condition-test-mutation.test.ts` → FAIL; реалізувати мутації, операції, роути, помилки, клієнт; → PASS.
- [ ] **Step 4:** `pnpm test:related lib/server/battles/operations.ts lib/api/battle-ops.ts lib/hooks/battles/useBattles.ts lib/hooks/battle/useBattleActions.ts lib/constants/api-errors.ts` + `pnpm test:run lib/i18n/__tests__/parity.test.ts lib/i18n/__tests__/client-api-errors.test.ts` → PASS; eslint `--fix` по всіх змінених і створених (включно з `route.ts`).
- [ ] **Step 5: Commit** `feat(wfrp): DM system-condition and condition-test mutations` (+ Co-Authored-By).

**Готово, коли:** обидва роути працюють через `runBattleMutation`, клієнтські хуки доступні в `useBattleScene().actions.systemCondition/conditionTest`.

---

## Task 6: Fortune в атаці (сервер)

**Files:**
- Modify: `lib/utils/rules/systems/types.ts` (`ResolveAttackCtx`, `ResolvedAttack`), `lib/utils/battle/types/attack.ts` (`PercentileAttackDetails`), `lib/schemas/battles.ts` (`attackBodySchema`), `lib/utils/battle/attack-phase/request.ts` (`AttackRequest`, `validateAttackRequest`), `lib/utils/battle/types/attack-process.ts` (`ProcessAttackParams`), `lib/utils/battle/attack-phase/run-attack-phase.ts` (`strikeAt`), `lib/utils/battle/attack/process/run.ts` (`judgeWfrp`), `lib/utils/rules/systems/wfrp/combat/resolve-attack.ts`, `messages/{uk,en}/battleWfrp.json`
- Test: `lib/utils/rules/systems/wfrp/combat/__tests__/combat.test.ts` (додати `describe("fortune")`), create `lib/server/battles/__tests__/mutations/wfrp-fortune.test.ts`

**Interfaces:**
- Consumes: `API_ERRORS.NO_FORTUNE` (Task 5), `combat.fortune` (Task 3), `battleData.fortune` (Task 1).
- Produces:
```ts
// types.ts
export type FortuneKind = "reroll" | "sl";
// ResolveAttackCtx: fortune?: { kind: FortuneKind; manualReroll?: number };
// ResolvedAttack:   fortune?: { kind: FortuneKind; firstRoll?: number };   // лише коли Fortune спрацювало
// PercentileAttackDetails (lib/utils/battle/types/attack.ts): fortune?: { kind: "reroll" | "sl"; firstRoll?: number };
// attackBodySchema: fortune: z.enum(["reroll", "sl"]).optional(), fortuneRoll: z.number().int().min(1).max(100).optional()
// AttackRequest: fortune?: "reroll" | "sl"; fortuneRoll?: number;
// ProcessAttackParams: fortune?: { kind: "reroll" | "sl"; manualReroll?: number };
```
  (Відхилення від спеки: замість окремого `actionDetails.fortune` маркер лежить у `actionDetails.percentile.fortune` — `withRollDetails` уже копіює `percentile` в дію, а `ActionResultCard`/`PercentileResultLines` отримують його без нового каналу.)

**Рішення:**
- Схема: додати поля і refine `(d) => !d.fortune || requestedTargetIds(d).length === 1` — `requestedTargetIds` тут недоступний (schemas не імпортують utils?) — перевірити імпорти `lib/schemas/battles.ts`; якщо імпорт неприйнятний, refine інлайн: `(d) => !d.fortune || ((d.targetIds?.length ?? 0) + (d.targetId ? 1 : 0) === 1 && (!d.targetIds || d.targetIds.length <= 1))`, повідомлення `REJECT.oneTargetRequired`, `path: ["fortune"]`.
- `validateAttackRequest` (після `requireActor`): `if (data.fortune && (!ruleSystemOf(rules).combat.fortune || (attacker.battleData.fortune ?? 0) < 1 || chosenTargets.length !== 1)) throw new BattleRuleError("action_rejected", API_ERRORS.NO_FORTUNE);`
- `run-attack-phase.ts` `strikeAt`: `fortune: i === 0 && data.fortune ? { kind: data.fortune, ...(data.fortuneRoll !== undefined && !input.serverRolls && { manualReroll: data.fortuneRoll }) } : undefined`. (Назва прапорця серверних кидків у `input` — перевірити в `AttackPhaseInput`: там `serverRolls`.)
- `resolveWfrpAttack(ctx)`:
  - `slBonus = ctx.fortune?.kind === "sl" ? 1 : 0` — дальній: `slModifier: DIFFICULTY_SL.challenging + slBonus`; ближній: `attackerSlMod: (spent ? MOMENTUM_SL_BONUS : 0) + slBonus`. При `sl` результат має `fortune: { kind: "sl" }` і `percentile.fortune = { kind: "sl" }` завжди.
  - `reroll`: обчислити як зараз; якщо `!isHit` — дальній: другий `resolvePercentileTest` з тими самими параметрами і `presetRoll: ctx.fortune.manualReroll`; ближній: другий `resolveOpposed` з тими самими цілями/модифікаторами і `presetRolls: { attacker: ctx.fortune.manualReroll, defender: first.defender.rawRoll }`. Береться другий результат повністю (isHit, netSl, локація, Momentum `gainedBy` із другого). `fortune = { kind: "reroll", firstRoll: first.attacker.roll }` (дальній — `first.roll`). Влучання першим кидком → `fortune` відсутнє.
  - Винести обчислення в локальні `rangedOnce(presetRoll)` / `meleeOnce(presets)` щоб не дублювати.
- `judgeWfrp` (`run.ts`): передати `fortune: params.fortune` у `resolve({...})`; якщо `r.fortune` — `put(flow, { ...attacker, battleData: { ...attacker.battleData, fortune: Math.max(0, (attacker.battleData.fortune ?? 0) - 1) } })` (через наявний `put`/`getP` з `action-flow`, взяти свіжого атакувальника `getP(flow, attackerId)`), `flow.messages.push(textRef(r.fortune.kind === "reroll" ? "battleWfrp.log.fortuneReroll" : "battleWfrp.log.fortuneSl", { name, first: r.fortune.firstRoll ?? 0 }))`. `server-attack.ts` (`judgeServerWfrp`) не змінюється.
- i18n `battleWfrp.log`: `"fortuneReroll": "{name} витрачає Fortune: перекидання (перший кидок {first})"`, `"fortuneSl": "{name} витрачає Fortune: +1 SL"` (+ en).

- [ ] **Step 1: падаючі тести** `combat.test.ts` `describe("fortune")` (`resolveWfrpAttack` з учасниками як у Task 2):
  - ближній `reroll`, `manualRoll: 90` (промах), `manualReroll: 20`, rng `() => 0.5` (захисник кидає 51) → `isHit: true`, `fortune: { kind: "reroll", firstRoll: 90 }`, `attackRoll.percentile.defender.roll === 51` (той самий), `attackRoll.percentile.fortune` задано;
  - ближній `reroll`, `manualRoll: 20` (влучання) → `fortune` undefined, `percentile.fortune` undefined;
  - дальній `reroll`, `manualRoll: 90`, `manualReroll: 10` → `isHit: true`, `firstRoll: 90`;
  - дальній `reroll` без `manualReroll` → другий кидок з `ctx.rng`;
  - `sl`, ближній: `netSl` на 1 більший, ніж без Fortune з тими самими кидками; `fortune: { kind: "sl" }` навіть при промаху.
- [ ] **Step 2: падаючі тести** `wfrp-fortune.test.ts` (форма як `wfrp-battle-e2e.test.ts`: `fighter()`, `context`, `WFRP_RULES`, `attackBodySchema.parse`, `attackMutation`; атакувальник `a` з `battleData.fortune: 2`):
  - `fortune: "reroll"`, `d20Roll: 90`, `fortuneRoll: 20` → ціль поранена, `a.battleData.fortune === 1`, подія атаки має `details.actionDetails.percentile.fortune.kind === "reroll"` (знайти поле через наявний формат подій у тесті e2e) і лог містить ключ `battleWfrp.log.fortuneReroll`;
  - `fortune: "reroll"`, `d20Roll: 20` (влучання) → `fortune` лишається 2;
  - `fortune: "sl"` → 1;
  - `fortune` при `battleData.fortune` 0 / відсутньому → `toThrow(API_ERRORS.NO_FORTUNE)`;
  - d20 (`DEFAULT_RULES`, d20-учасники з `./fixtures`) з `fortune: "sl"` → `NO_FORTUNE`;
  - схема: `fortune` з `targetIds: ["t", "u"]` → `safeParse` неуспішний; `fortuneRoll: 101` → неуспішний;
  - `serverRoll: true` + `fortune: "reroll"` + `fortuneRoll: 5` → `fortuneRoll` ігнорується (перекидання з rng).
- [ ] **Step 3:** FAIL → реалізація → PASS: `pnpm test:run lib/utils/rules/systems/wfrp/combat lib/server/battles/__tests__/mutations/wfrp-fortune.test.ts`.
- [ ] **Step 4:** `pnpm test:related lib/schemas/battles.ts lib/utils/battle/attack-phase/request.ts lib/utils/battle/attack-phase/run-attack-phase.ts lib/utils/battle/attack/process/run.ts lib/utils/rules/systems/wfrp/combat/resolve-attack.ts lib/utils/battle/types/attack.ts lib/utils/rules/systems/types.ts` → PASS (d20-тести атаки без правок); eslint `--fix`.
- [ ] **Step 5: Commit** `feat(wfrp): Fortune reroll and +1 SL in attacks` (+ Co-Authored-By).

**Готово, коли:** Fortune списується лише коли спрацювало; відмови `NO_FORTUNE` для d20/нуля; маркер у `percentile.fortune`.

---

## Task 7: Fortune лист ↔ бій і у візарді атаки

**Files:**
- Modify: `lib/utils/characters/resources/battle.ts` (`applyCharacterResources`, `applyBattleResult`), `lib/utils/battle/flows/attack-flow.ts`, `lib/hooks/battle/useAttackWizard.ts`
- Test: `lib/utils/characters/resources/__tests__/battle-result.test.ts` (додати кейси), `lib/utils/battle/flows/__tests__/attack-flow.test.ts` (додати кейси; якщо файлу з такою назвою немає — знайти наявний тест `attackFlow`/`attackPayload` через `grep -rln "attackPayload" lib/utils/battle/flows`)

**Interfaces:**
- Consumes: `battleData.fortune` (Task 1), поля тіла `fortune`/`fortuneRoll` (Task 6), `ruleSystemOf(rules).combat.fortune`.
- Produces:
  - `AttackFlowState.fortune?: "reroll" | "sl"`; дія `{ type: "SET_FORTUNE"; value: "reroll" | "sl" | null }`; у `ROLL` для percentile зберігати `second` (кидок Fortune) у strike.
  - `attackPayload(s, attackerId)`: `...(s.fortune && s.strikes.length === 1 && { fortune: s.fortune })`, `...(s.fortune === "reroll" && s.percentile-шлях && st.second !== undefined && !serverRoll && { fortuneRoll: st.second })`; для d100 `advantageRoll`/`disadvantageRoll` не ставити (режим d100 завжди `normal`, перевірити, що `strikeMode` для d100 дає `normal`).
  - `useAttackWizard`: `view.fortune: { available: boolean; left: number }` — `available = dice === 100 && !!ruleSystemOf(rules).combat.fortune && (attacker?.battleData.fortune ?? 0) >= 1 && state.targetIds.length === 1`; `actions.setFortune(value: "reroll" | "sl" | null)`; `rollAction(d20, second)` для d100 передає й `second` (зараз ігнорує).
  - `SET_FORTUNE` і зміна цілей: при `TOGGLE_TARGET`/`SET_TARGETS`, що робить цілей > 1, скидати `fortune` (у редʼюсері).

**Рішення (ресурси):**
- `applyCharacterResources`: після наявного ланцюжка `const out = withHpState(...)`; `return r.fortune === undefined ? out : { ...out, battleData: { ...out.battleData, fortune: r.fortune } }`.
- `applyBattleResult`: у `next` додати `fortune: p.battleData.fortune ?? r.fortune` (`compactResources` прибере `undefined`).

- [ ] **Step 1: падаючі тести** `battle-result.test.ts`: `applyCharacterResources(p, { inspiration: null, resources: { fortune: 2 } }, WFRP_RULES).battleData.fortune === 2`; без `fortune` у ресурсах — поля немає; `applyBattleResult({ fortune: 2 }, p з battleData.fortune 1).fortune === 1`; `applyBattleResult({ fortune: 2 }, p без поля).fortune === 2`; d20-ресурси без fortune → ключа `fortune` у результаті немає. (Тип `StoredCharacterState` — подивитися в файлі, мінімальне валідне значення взяти з наявних кейсів.)
- [ ] **Step 2: падаючі тести** flow: `SET_FORTUNE "reroll"` → `state.fortune === "reroll"`; `attackPayload` для однієї цілі з `percentile` і `strikes[0] = { d20: 90, second: 20 }` → `{ fortune: "reroll", fortuneRoll: 20, attackRoll: 90 }`; `serverRoll` (d20 undefined) → `fortune` є, `fortuneRoll` немає; `"sl"` → без `fortuneRoll`; дві цілі → `fortune` відсутній у тілі; `SET_TARGETS` з двома id скидає `fortune`.
- [ ] **Step 3:** FAIL → реалізація → PASS.
- [ ] **Step 4:** `pnpm test:related lib/utils/characters/resources/battle.ts lib/utils/battle/flows/attack-flow.ts lib/hooks/battle/useAttackWizard.ts` → PASS; eslint `--fix`.
- [ ] **Step 5: Commit** `feat(wfrp): carry Fortune between sheet and battle; wizard Fortune state` (+ Co-Authored-By).

**Готово, коли:** Fortune з листа доступне в бою й повертається на лист після завершення (wfrp `persistResources: true`); візард формує правильне тіло.

---

## Task 8: UI — бейджі, діалог ДМ, «Спробувати зняти», перемикач Fortune

**Files:**
- Create: `lib/utils/battle/view/system-conditions.ts`, `lib/hooks/battle/useConditionTestPanel.ts`, `components/battle/participants/ConditionTestPanel.tsx`, `components/systems/wfrp/SystemConditionsDialog.tsx`
- Modify: `lib/utils/battle/view/scene-maps.ts` (`buildDisplayEffects`), `lib/utils/battle/view/index.ts` (експорт), `lib/hooks/battle/useDisplayEffectMap.ts`, `lib/hooks/battle/useBattleScene.ts` (виклик), `lib/hooks/battle/useDmParticipantActions.ts`, `lib/hooks/battle/index.ts` (барель), `components/battle/hud/EffectLine.tsx`, `components/battle/participants/ParticipantRow.tsx`, `components/battle/participants/MyHeroPanel.tsx`, `components/battle/dm/DmQuickActionsPanel.tsx`, `components/systems/types.ts`, `components/systems/wfrp/index.ts`, `components/battle/wizards/attack/D100RollBody.tsx`, `components/battle/overlays/PercentileResultLines.tsx`, `messages/{uk,en}/battleWfrp.json`
- Test: create `lib/utils/battle/view/__tests__/system-conditions.test.ts`; UI-кейси додати в `components/battle/__tests__/rule-system-flags.test.tsx` (там уже є d20/wfrp обгортки для `MyHeroPanel`); `components/systems/wfrp/__tests__/SystemConditionsDialog.test.tsx` (create, `// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `RuleSystemConditions.list/catalog` (Tasks 1, 3), `actions.systemCondition`, `actions.conditionTest` (Task 5), `view.fortune`, `actions.setFortune` (Task 7), `percentile.fortune` (Task 6).
- Produces:
```ts
// lib/utils/battle/view/system-conditions.ts
export type DisplayEffect = ActiveEffect & { level?: number };
export function collapseSystemConditions(effects: ActiveEffect[], levels: SystemConditionLevel[]): DisplayEffect[]; // ефекти з abilityKey ∈ levels.effectKey згортаються в перший такий, з level; решта — без змін і в тому ж порядку
// scene-maps.ts
export function buildDisplayEffects(order: BattleParticipant[], prev?: Map<string, DisplayEffect[]>, rules?: Ruleset): Map<string, DisplayEffect[]>;
// useDisplayEffectMap(order, rules?)
// useConditionTestPanel(hero: BattleParticipant): { items: { key: string; label: LogLine; stand: boolean }[]; attempt(key: string, roll?: number): void; isPending: boolean } | null  — null, якщо системи без conditions, не хід носія або нічого спробувати
// components/systems/types.ts, SystemUi: battleConditionsDialog?: ComponentType<SystemConditionsDialogProps>;
export interface SystemConditionsDialogProps { participant: BattleParticipant | null; onClose: () => void; onSubmit: (body: SystemConditionBody) => void; isPending: boolean }
```

**Рішення:**
- **Бейджі.** `buildDisplayEffects`: `const levels = rules ? ruleSystemOf(rules).conditions?.list(p) : undefined; const list = displayEffects(p, order); const shown = levels?.length ? collapseSystemConditions(list, levels) : list;` (порівняння з `prev` — як зараз). `useBattleScene`: `useDisplayEffectMap(order ?? NO_ORDER, battle?.rules)`. `EffectLine`: проп `effects: readonly DisplayEffect[]`, новий необов'язковий `hideLevels?: boolean`; `EffectChip` після назви показує `×{level}`, якщо `effect.level && effect.level > 1 && !hideLevels`. `ParticipantRow`: `<EffectLine effects={effects} hideLevels={!exact} />` (приватність `canSeeExactStats` — `exact` уже обчислено в `view`). `MyHeroPanel` — без `hideLevels` (власний учасник). Тип пропа `effects` у `ParticipantRow`/`MapToken` — `readonly DisplayEffect[]` (сумісний з `ActiveEffect[]`). `MapToken` не змінюється (ефекти там — лише аури; постійні стани аур не мають — `auraOf` повертає `null` для `permanent`).
- **Діалог ДМ.** `SystemConditionsDialog` (`components/systems/wfrp/`, може імпортувати `WFRP_CONDITIONS` з `@/lib/utils/rules/systems/wfrp/conditions`): список каталогу (назва `battleWfrp.conditions.<key>.label`), для рівневих — числове поле рівнів 1..`maxLevel` (за замовчуванням 1), поле тривалості в раундах (порожнє = постійно, 1..99), кнопки «Накласти»; поточні стани учасника (`WFRP_CONDITIONS.list(participant)`) з кнопками «−1» (`{ action: "remove", condition, all: false }`) і «Зняти» (`all: true`). Розмітку й класи скопіювати з `components/battle/dm/ConditionsDialog.tsx` (той самий `Dialog`/HUD-стиль), ≤ ~200 рядків; тексти `battleWfrp.ui.dialog.*`. `WFRP_UI.battleConditionsDialog = SystemConditionsDialog`; `D20_UI` поля не має.
- `useDmParticipantActions`: `conditionsEnabled: (battle.rules?.conditions.enabled ?? false) || !!(battle.rules && ruleSystemOf(battle.rules).conditions) || …hasAnyCondition5e`; повертає ще `systemConditions: { submit: actions.systemCondition.mutate, isPending: actions.systemCondition.isPending, dialog: battle.rules ? systemUiOf(battle.rules.system.key).battleConditionsDialog : undefined }` (`systemUiOf` з `@/components/systems` — хук у `lib/hooks` не може імпортувати компоненти? Перевірити ESLint: якщо `lib/hooks/**` не може імпортувати `@/components/**`, тоді `DmQuickActionsPanel` сам бере `systemUiOf(rules.system.key)` через `useBattleRules`/`useBattleSceneData` — так і робити: хук повертає лише `submit/isPending`, вибір компонента — у панелі).
- `DmQuickActionsPanel`: `const SystemDialog = systemUiOf(battle.rules.system.key).battleConditionsDialog;` — якщо є, рендерити `<SystemDialog participant={conditions.target} onClose={conditions.close} onSubmit={systemConditions.submit} isPending={systemConditions.isPending} />` замість `ConditionsDialog`; інакше — як зараз.
- **«Спробувати зняти».** `useConditionTestPanel(hero)`: бере `useBattleSceneData()` (`battle.rules`, `turn.current`/`isMyTurn` або порівняння з поточним за `turnIndex`) і `useBattleScene().actions.conditionTest`; `items` = `conditions.list(hero)` ∩ каталог з `endTest !== null`, мінус `hero.battleData.conditionTests`; `attempt(key, roll)` → `mutate({ participantId, condition: key, ...(roll === undefined ? { serverRoll: true } : { roll }) })`. `ConditionTestPanel`: для кожного пункту кнопка «Спробувати зняти: {назва}»; клік розкриває перемикач «Авто»/«Вручну» (як `SOURCES` у `D100RollBody`) і `D100Input` (`@/components/battle/hud/D100Input`) або `AiRollButton`; для `stand` — одна кнопка «Встати» без кидка (`attempt(key, undefined)` → сервер не кидає). Рендер у `MyHeroPanel` під `EffectLine` (не в `compact`). ДМ бачить панель, коли керує поточним учасником (той самий `MyHeroPanel` для `hero` з dmControl) — перевірити в live-run.
- **Перемикач Fortune.** `D100RollBody`: якщо `view.fortune.available && state.index === 0` — 3-кнопкова група (вимк. / «Перекинути» / «+1 SL») з `aria-pressed`, підпис `battleWfrp.ui.fortune.left` з `{count}`; `actions.setFortune(...)`. Вручну + «Перекинути»: після першого `D100Input` показати другий `D100Input` з підписом `battleWfrp.ui.fortune.secondRoll` і лише тоді `actions.roll(first, second)`; «Авто» — `actions.aiRoll()` без змін.
- **Підсумок.** `PercentileResultLines`: якщо `p.fortune` — рядок `battleWfrp.ui.fortune.used` (`reroll`: з `{first}`, `sl`: `battleWfrp.ui.fortune.usedSl`).
- i18n `battleWfrp.ui`: `dialog.{title, level, rounds, permanent, apply, reduce, remove, current, none}`, `test.{attempt, stand, auto, manual}`, `fortune.{label, off, reroll, sl, left, secondRoll, used, usedSl}` (uk/en, короткі форми).

- [ ] **Step 1: падаючі тести** `system-conditions.test.ts`: два ефекти Bleeding (рівні 1 і 2) + сторонній бафф → `collapseSystemConditions` повертає 2 записи, Bleeding з `level: 3` на місці першого; `levels: []` → вхід без змін (той самий порядок); `buildDisplayEffects([p], undefined, WFRP_RULES)` згортає, з `DEFAULT_RULES` — ні.
- [ ] **Step 2: падаючі UI-тести** (happy-dom; обгортки з `rule-system-flags.test.tsx`):
  - `EffectLine` з `{ ...bleedingEffect, level: 3 }` показує «×3»; з `hideLevels` — ні;
  - wfrp `MyHeroPanel` для героя з Bleeding у свій хід показує кнопку `battleWfrp.ui.test.attempt` (текст за тестовим перекладом), без `conditionTests`; з `conditionTests: ["bleeding"]` — кнопки немає; d20 — ніколи;
  - `SystemConditionsDialog`: вибір Bleeding, рівень 2, «Накласти» → `onSubmit({ action: "apply", participantId, condition: "bleeding", levels: 2 })`; поточний стан «Зняти» → `{ action: "remove", …, all: true }`;
  - `D100RollBody` (через `RollStep` або напряму з мок-моделлю візарда, як у наявних тестах візарда — знайти `grep -rln "D100RollBody\|RollStep" components/battle/**/__tests__`): при `view.fortune.available` є група Fortune, при `false` — немає.
- [ ] **Step 3:** FAIL → реалізація → PASS.
- [ ] **Step 4:** `pnpm test:related <усі змінені/створені файли задачі>` → PASS; `pnpm exec eslint --fix <ті самі файли>` (зокрема ізоляція систем: `components/battle/**` не імпортує `@/components/systems/wfrp*`, лише `@/components/systems`).
- [ ] **Step 5: Commit** `feat(wfrp): condition badges, DM condition dialog, end-test button, Fortune toggle` (+ Co-Authored-By).

**Готово, коли:** бейджі з рівнем (приховано для не-exact), ДМ накладає/знімає стани в wfrp-бою, носій пробує зняти стан у свій хід, візард має Fortune.

---

## Task 9: i18n-scope `battleWfrp` у бойових лейаутах і бюджет

**Files:**
- Create: `lib/server/campaigns/system-key.ts`
- Modify: `lib/i18n/scopes.ts`, `app/campaigns/[id]/battles/layout.tsx`, `app/campaigns/[id]/dm/battles/layout.tsx`, `lib/i18n/__tests__/scope-size.test.ts`
- Test: create `lib/server/campaigns/__tests__/system-key.test.ts` (мок `prisma` як у сусідніх тестах `lib/server/campaigns/__tests__`), `scope-size.test.ts`

**Interfaces:**
- Produces: `WFRP_BATTLE_NAMESPACES = [...BATTLE_NAMESPACES, "battleWfrp"] as const satisfies readonly Namespace[]` (`scopes.ts`); `isWfrpCampaign(campaignId: string): Promise<boolean>` (`system-key.ts`, `import "server-only"`, `cache` з `react` для дедуплікації в межах запиту).

**Рішення:**
- `isWfrpCampaign`: `const rows = await prisma.$queryRaw<{ wfrp: boolean }[]>\`SELECT (rules->'system'->>'key') = 'wfrp' AS wfrp FROM campaigns WHERE id = ${campaignId}\`; return rows[0]?.wfrp === true;` — без читання й парсингу всього `rules` (для відсутнього ключа `parseRules` виводить homm/dnd5e, тож лише явне `'wfrp'` — wfrp). Це єдине місце з порівнянням ключа системи, бо namespace має бути відомий серверу до рендеру.
- Лейаути стають `async` і приймають `params: Promise<{ id: string }>`: `const { id } = await params; const namespaces = (await isWfrpCampaign(id)) ? WFRP_BATTLE_NAMESPACES : BATTLE_NAMESPACES;` → `<ExtendLocaleScope namespaces={namespaces}>`.
- `scope-size.test.ts`: третій сценарій `{ name: "campaign + battle + battleWfrp", namespaces: [...CAMPAIGN_NAMESPACES, ...WFRP_BATTLE_NAMESPACES] }`, той самий `LIMIT_KB = 105`. Якщо перевищує — скоротити описи в `battleWfrp.conditions.*.description` (одна коротка фраза), не піднімати ліміт.

- [ ] **Step 1: падаючі тести:** `system-key.test.ts` — `$queryRaw` повертає `[{ wfrp: true }]` → `true`; `[]` → `false`; `[{ wfrp: null }]` → `false`. `scope-size` — новий сценарій (спершу FAIL через відсутній `WFRP_BATTLE_NAMESPACES`).
- [ ] **Step 2:** реалізувати.
- [ ] **Step 3:** `pnpm test:run lib/i18n/__tests__ lib/server/campaigns/__tests__/system-key.test.ts` (вузький i18n-набір дозволено) → PASS; записати з виводу `console.info` розміри uk/en для звіту; eslint `--fix` по змінених.
- [ ] **Step 4: Commit** `feat(wfrp): load battleWfrp messages only in wfrp battles` (+ Co-Authored-By).

**Готово, коли:** `battleWfrp` вантажиться лише в бойових сторінках wfrp-кампаній; бюджет < 105 KB gzip для всіх трьох сценаріїв.

---

## Task 10: e2e — крит → Bleeding → тік → «Спробувати зняти»

**Files:**
- Modify: `lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts` (новий `it`, без правок наявних, окрім вимушеної в Task 2)

**Interfaces:**
- Consumes: `attackMutation`, `conditionTestMutation` (Task 5), `ruleSystemOf(WFRP_RULES).conditions` (Task 3), `fighter()` з цього файлу.

- [ ] **Step 1: тест** `it("crit applies Bleeding, it ticks at the bearer's turn start and an Endurance test removes it")`:
  - `a` (ALLY) і `t` (ENEMY), обидва `controlledBy: "dm"`, `ctx.isDM = true`, `WFRP_RULES`, порядок `[a, t]`, `turnIndex: 0`;
  - атака `a → t`: `d20Roll: 22` (дубль, WS 40 → успіх, SL 2; `hitLocation(22)` = arm), `damageRolls: [4]`, `endTurn: true`, `rng: () => 0.3` (захисник: `rollDie(100)` = 31 → SL 1, net 1 → влучання; крит arm: 31 → arm.2 Bleeding);
  - очікування: `conditions.list(t)` містить `{ key: "bleeding", level: 1 }`; хід перейшов до `t` (`scene.turnIndex === 1`), тік уже застосовано на початку ходу `t`: `currentHp` = 20 − (зброя 4 + SB 3 + net SL 1 − TB 3 − AP 0) − 2 (бонус крита arm.2) − 1 (тік) = 12 (розклад за `computeWfrpDamage`; якщо фактичне значення інше — звірити з цією формулою, а не підганяти число; тік −1 додатково перевірити порівнянням з тим самим ударом при `endTurn: false`);
  - журнал подій містить ключ `battleWfrp.log.tick.bleeding`;
  - `conditionTestMutation(ctx, { participantId: "t", condition: "bleeding", roll: 10 })` (Endurance = T 30 → успіх) → стану немає, `conditionTests: ["bleeding"]`; повтор → `CONDITION_TEST_UNAVAILABLE`.
- [ ] **Step 2:** `pnpm test:run lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts` → PASS (якщо FAIL — виправляти код задач 2–5, не тест; тест фіксує спеку).
- [ ] **Step 3:** eslint `--fix` по файлу; **Commit** `test(wfrp): e2e crit, Bleeding tick and end test` (+ Co-Authored-By).

**Готово, коли:** сценарій спеки проходить на рівні рушія.

---

## Task 11: документація

**Files:**
- Modify: `docs/architecture/rule-systems.md`, `docs/STATUS.md`, `docs/architecture/battle.md` (лише якщо там описано маршрути/операції бою — додати два нові)

- [ ] **Step 1:** `rule-systems.md`: у «Реєстр і хуки» додати `conditions` (опис контракту одним абзацом) і `combat.fortune`; у «Що де лежить (wfrp)» — `wfrp/conditions/*`; новий розділ **«Межі 5c-1»** (українською, як сусідні):
  - 12 станів; числа каталогу — припущення до звірки з книгою (`catalog.ts`);
  - стан = `ActiveEffect` `wfrp:cond:<key>`, рівень = сума маркерів `wfrp:<key>`, обрізання `max` 10;
  - тіки лише на активному носії; кровотеча на непритомному — 5c-2;
  - Unconscious: два джерела; лікування до > 0 Wounds не знімає стан-ефект (ДМ знімає вручну);
  - спроба зняття — вільна, одна на стан за хід (`battleData.conditionTests`), подія без `actionDetails.percentile` (кидок у рядку журналу);
  - тест з листа отримує `selfTestMod`, але `roll-handler` будує учасника з листа, тож стани бою на нього зараз не впливають;
  - Fortune: `percentile.fortune` замість окремого `actionDetails.fortune`; серверні атаки й ініціатива без Fortune; Fate без механіки;
  - мітки disarmed/winded/crippled — інертні (5c-2); Besmirched, Corruption, психологія, травми — поза межами;
  - `battleWfrp` вантажиться лише в бойових лейаутах wfrp-кампаній (`isWfrpCampaign`), бюджет — цифри з Task 9.
  У «Межі 5b-2» прибрати рядок про інертні крит-маркери або замінити посиланням «закрито в 5c-1 для bleeding/stunned/unconscious/prone».
- [ ] **Step 2:** `docs/STATUS.md`: у рядку WFRP додати «**5c-1 (стани й Fortune) реалізовано на `feat/wfrp`, не змерджено:** …» (2–3 речення: стани/тіки/зняття/Fortune, без міграції, namespace `battleWfrp`, live-run — результат Task 12) і «Далі: 5c-2».
- [ ] **Step 3: Commit** `docs(wfrp): 5c-1 boundaries and status` (+ Co-Authored-By).

---

## Task 12: живий прогін у браузері (окремий Sonnet-субагент)

Виконується за `feedback-browser-context` і `feedback-test-battles`: Chrome-інструменти (`claude-in-chrome`), скріншоти зменшені/масштабовані, перевірки — через JS/текст сторінки (`get_page_text`, `javascript_tool`), а не розглядання зображень; мішані раси/герої на обох сторонах; після прогону видалити всі тестові бої.

- [ ] **Step 1: оточення.** У `/Users/silentfox/Work/dnd-tracker-wfrp`: перевірити `.env.local` — `DATABASE_URL`/`DIRECT_URL` мають вести на локальну Docker-БД (`localhost:54322`). Для wfrp-гілки використовувати окрему БД `wfrp` (нотатка проєкту): якщо її немає — `./scripts/db/prodcopy-db.sh wfrp` (потрібні `docker compose` з `pnpm db:local` і `.env.production-db.local`; прод лише читається), і тимчасово перемкнути `.env.local` на `.../wfrp` (не комітити `.env.local`). Міграції гілки (`characteristics`, `units_base_characteristics`, `battle_scene_momentum`) — `pnpm exec prisma migrate deploy` проти локальної БД. Перед стартом перевірити, що не працює важкий процес (`ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`) і що порт вільний (головна папка може тримати 3000 — тоді `pnpm dev -p 3001`).
- [ ] **Step 2: сценарій (ДМ):** wfrp-кампанія (або створити: система «Grim d100»), 2 герої + 2 юніти на обох сторонах; почати бій.
  (a) атака d100 з дублем, поки крит не дасть Bleeding/Stunned/Prone (ручний кидок, напр. 22/33/44) → бейдж стану на токені/в списку, рівень «×N» при складанні;
  (b) кінець ходу → на початку ходу носія в журналі рядок тіку кровотечі, Wounds зменшились;
  (c) у свій хід носія (ДМ керує учасником) — «Спробувати зняти» в панелі героя: «Вручну» з кидком 10 → стан знято/рівень −1; повтор того ж стану недоступний (кнопка зникла);
  (d) ДМ-діалог станів: накласти Fatigued 2 → у візарді атаки ціль d100 нижча на 20; зняти −1 і «Зняти»;
  (e) Prone → «Встати» без кидка; Unconscious від ДМ → учасник пропускає хід;
  (f) Fortune: у листі героя Fortune ≥ 1 (кнопка «Нова сесія» або редагування ресурсу) → у візарді група Fortune з залишком; «Перекинути» вручну (перший 90, другий 20) → влучання, у підсумку «Fortune використано (перший кидок 90)», залишок −1; «+1 SL» в авто-режимі; влучання першим кидком з «Перекинути» → Fortune не списано;
  (g) завершити бій → на листі героя Fortune = залишок з бою.
- [ ] **Step 3: роль гравця** (другий акаунт/гравець кампанії, якщо доступний; інакше «Вигляд гравця» ДМа): рівень стану ворожої не-exact цілі не видно (лише назва), власні рівні видно.
- [ ] **Step 4: регрес d20:** dnd5e або homm бій — 5e-діалог станів ДМа як раніше, жодних wfrp-бейджів/Fortune.
- [ ] **Step 5:** видалити тестові бої (UI або скрипт), повернути `.env.local`, якщо перемикали; звіт: що пройшло, розбіжності UI ↔ журнал. Виправлення — окремими комітами `fix(wfrp): …` (+ Co-Authored-By); комміт звіту не потрібен.

---

## Фінал (контролер, не субагент-виконавець)

1. Перевірити, що немає іншого важкого прогону; **один** `pnpm test:run` (повний) → зелений, окрім відомих 42 старих падінь api-auth на main (порівняти список з попереднім прогоном; нові падіння — виправити).
2. `pnpm exec eslint` по всіх змінених у гілці з 967abca36 файлах (`git diff --name-only 967abca36 -- '*.ts' '*.tsx'`); repo-wide `pnpm lint` у цьому плані не запускати (на гілці він висне > 10 хв).
3. Одне фінальне Opus-рев'ю диф-у `967abca36..HEAD` (superpowers:requesting-code-review) з акцентом на «Review Focus» і на ізоляцію систем; виправлення — Sonnet-субагентом.
4. Оновити пам'ять/`docs/STATUS.md` статусом; **без merge і push**.

---

## Self-review (покриття спеки)

| Вимога спеки | Задача |
|---|---|
| Контракт `RuleSystemConditions`, `conditions?`, `combat.fortune?` | 1, 3 |
| Каталог 12 станів, числа в одному файлі з тестами | 1 |
| `levels`/`apply`/`reduce`, Unconscious-статус, маркери `wfrp:*` поза 5e | 1 |
| `test-mod` в атаці, захисті, тесті листа, тесті зняття | 2, 3 |
| Крит → стан (head.5 Unconscious) | 2 |
| Тіки Bleeding/Ablaze, шанс непритомності, `applyDamageConsequences` | 3 |
| Тест зняття (`endTest`, «stand», presetRoll) | 3 |
| Ядро: тік у `applyStartOfTurnDamage`, `downed` → `resolveDowned`, тест циклу/`enterChangedTurn` | 4 |
| `battleData.conditionTests`, скидання в `resetTurnState` | 1, 4 |
| Мутації `system-condition`/`condition-test`, роути, операції, помилки, `lib/api`, хуки | 5 |
| Fortune: схема, `validateAttackRequest`, `resolveWfrpAttack`, `judgeWfrp`, ручний `fortuneRoll` | 6 |
| Fortune лист ↔ бій | 7 |
| UI: бейджі з рівнем і приватністю, `SystemConditionsDialog` + слот, «Спробувати зняти», перемикач Fortune, підсумок | 7, 8 |
| i18n `battleWfrp`, `ExtendLocaleScope` лише для wfrp, `scope-size` | 1, 9 |
| e2e крит → Bleeding → тік → зняття | 10 |
| Документація «Межі 5c-1», STATUS | 11 |
| Live-run | 12 |
| Паритет d20, повний прогін, Opus-review | 4, 6, 12, Фінал |

**Відхилення від спеки (свідомі):**
- `list()` повертає ще `effectKey` (для згортання бейджів у ядрі без знання префікса).
- Маркер Fortune у `actionDetails.percentile.fortune`, не окреме `actionDetails.fortune`.
- Подія тесту зняття без `actionDetails.percentile` (тип атакоцентричний); кидок/ціль/SL — у рядку журналу.
- Типи тіл клієнта — у `lib/api/battle-ops.ts` (там живе `BattleConditionsBody`), а не в `types/battle.ts`.
- `selfTestMod` у тесті з листа підключено, але фактично діє 0, бо `roll-handler` будує учасника з листа (зафіксовано в «Межі 5c-1»).
- Ключ системи для i18n-scope читається одним SQL-виразом `rules->'system'->>'key'` (`isWfrpCampaign`) — єдине порівняння з `"wfrp"` поза реєстром.

---

## Промпт для виконавця

```text
Продовжуємо епік WFRP, частина 5c-1 (стани й Fortune у бою). Мова спілкування — українська.

Робоча папка: /Users/silentfox/Work/dnd-tracker-wfrp (worktree, гілка feat/wfrp). Перевір `git branch --show-current` = feat/wfrp і чистий `git status` перед стартом.
ЖОРСТКЕ ПРАВИЛО: нічого з WFRP не мерджити в main і не пушити, доки я явно не скажу «епік готовий».

Спека: docs/superpowers/specs/2026-11-04-wfrp-5c1-design.md
План:  docs/superpowers/plans/2026-11-04-wfrp-5c1-conditions-fortune.md

Виконай план через superpowers:subagent-driven-development:
- Виконавці задач — Sonnet-субагенти (по одному на задачу 1–11, задачу 12 — live-run у браузері — окремий Sonnet-субагент). Передавай кожному повний текст його задачі з плану + розділи «Global Constraints» і «Review Focus».
- Per-task рев'ю НЕ робити. Після всіх задач — один повний `pnpm test:run` і одне фінальне Opus-рев'ю диф-у 967abca36..HEAD; виправлення за рев'ю — Sonnet-субагентом.
- Тести/lint під час задач: лише `pnpm test:related <файли>` і `pnpm exec eslint --fix <змінені файли>`. Repo-wide `pnpm lint` не запускати взагалі (висне на гілці), повний test:run — лише один раз у фіналі. Перед повним прогоном перевір, що немає іншого важкого процесу (`ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`); процес > 5 хв — завис, вбити.
- Коміти — після кожної задачі, з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Коли субагент повернув результат — одразу зупиняй його (TaskStop). Відповіді на нотифікації — один рядок.
- Контекст: коли контекст сесії підходить до ~150k токенів і завершено логічний блок (задача), зупинись, онови docs/STATUS.md (рядок WFRP: які задачі плану зроблено, HEAD) і дай мені готовий промпт для нової сесії (ця ж структура + «почати з Task N»).

Наприкінці дай звіт: HEAD-коміт, список комітів, результати повного прогону (нові падіння vs відомі 42 api-auth), висновки Opus-рев'ю і що виправлено, результат live-run (що пройшло/розбіжності, видалені тестові бої), розміри scope-size (uk/en), відкриті хвости для 5c-2.
```
