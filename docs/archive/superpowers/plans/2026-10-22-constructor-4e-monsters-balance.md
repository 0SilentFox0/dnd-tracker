# Етап 4e: монстри й баланс 5e — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** юніт отримує поля 5e (CR, XP, мультиатака, легендарні дії й опір, рятівні кидки) і в бою стає монстром 5e (шкода 4c-2, СК з Інт/Мдр/Хар, мультиатака, легендарні дії поза ходом, автоматичний легендарний опір); кампанія може рахувати баланс за бюджетом XP 5e (2014/2024) замість `computeFairScaling` і автоматично ділити XP переможених між героями. HOMM5 без змін.

**Architecture:** нова секція `rules.encounters` (`balance: "fair" | "xp"`, `edition`, `autoXp`; default — поведінка HOMM5). Міграція лише додає колонки в `units`. Уся поведінка 5e юніта вмикається одним предикатом `isMonster5e(unit)` (`cr` задано); юніт без `cr` будує той самий snapshot і ті самі `UnitStats`. Чисті модулі: `lib/constants/challenge.ts` (таблиці CR), `lib/utils/units/monster.ts` (XP, СК, мультиатака як синтетичне вміння `attacksPerAction`), `lib/utils/battle/saves/legendary.ts` (`resolveSave`), `lib/utils/battle/actions/legendary-options.ts` + `legendary.ts` (легендарна дія), `lib/utils/battle/balance/xp-budget.ts` (бюджет XP, підбір), `lib/utils/battle/turn/battle-xp.ts` (авто-досвід). Легендарна дія — новий вид тіла роуту `core-action` (`legendary-mutation.ts`), авто-досвід пишеться в `saveBattle` у транзакції завершення.

**Tech Stack:** TypeScript strict, Prisma 6 (PostgreSQL), Zod 4, Vitest, Next.js route handlers, TanStack Query, React 19.

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4e. Дизайн: монстри й баланс 5e»; «Загальні правила етапу 4» — обов'язкові; розділи 4a–4d — контекст).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Міграцію писати вручну й застосовувати `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy` (**не** `migrate dev`), потім `pnpm exec prisma generate`. Ім'я міграції: `20261030000000_unit_5e` (остання наявна — `20261029000000_out_of_combat`). Нових таблиць немає — лише `ALTER TABLE "units" ADD COLUMN`.
- **Нульова зміна поведінки HOMM5:** `rules.encounters` за замовчуванням `{ balance: "fair", edition: "2014", autoXp: false }`. Юніт з `cr = null` (усі HOMM-юніти) будує той самий snapshot учасника і ті самі `getUnitStats`, що й до плану (тести-якорі в задачах 3). При `balance: "fair"` старт бою, підготовка й автопідбір працюють як зараз. Наявні тести (до першого коміту цього плану) не редагувати, крім адитивних змін форми: очікуваний `DEFAULT_RULES` у `lib/utils/rules/__tests__/schema.test.ts` (рядок `encounters`) і межа розміру OpenAPI (`lib/server/content/__tests__/openapi.test.ts`, `toBeLessThan(130_000)` — підняти до найближчих +5000, якщо падає лише вона). Падіння будь-якого іншого наявного тесту — баг нового коду.
- Уся поведінка монстра 5e вмикається лише через `isMonster5e(unit)` з `lib/utils/units/monster.ts` (`cr !== null && cr !== undefined`). Не вводити інших перемикачів.
- Рушій бою читає тільки `battle.rules`; мультиатака — лише через `collectModifiers` (синтетичне пасивне вміння `modifyStat attacksPerAction`); колонку `abilities` — лише через `lib/utils/abilities/read.ts`. Snapshot пише пайплайн (`snapshotHash` — автоматично).
- Таблиці 5e (копіювати дослівно в `lib/constants/challenge.ts` і `lib/utils/battle/balance/xp-budget.ts`, задачі 2 і 7):
  - CR → XP: 0→10, 1/8→25, 1/4→50, 1/2→100, 1→200, 2→450, 3→700, 4→1100, 5→1800, 6→2300, 7→2900, 8→3900, 9→5000, 10→5900, 11→7200, 12→8400, 13→10000, 14→11500, 15→13000, 16→15000, 17→18000, 18→20000, 19→22000, 20→25000, 21→33000, 22→41000, 23→50000, 24→62000, 25→75000, 26→90000, 27→105000, 28→120000, 29→135000, 30→155000.
  - CR → майстерність: 0–4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6, 21–24 → +7, 25–28 → +8, 29–30 → +9.
  - DMG 2014, пороги на героя (легкий/середній/складний/смертельний) і DMG 2024, бюджет на героя (низька/помірна/висока) — повні таблиці в задачі 7.
  - Множник кількості 2014: 1 → ×1, 2 → ×1.5, 3–6 → ×2, 7–10 → ×2.5, 11–14 → ×3, 15+ → ×4; група < 3 героїв — крок вгору (до ×5), ≥ 6 — крок вниз (до ×0.5). 2024 — без множника.
- `lib/constants/challenge.ts`, `lib/utils/units/monster.ts`, `lib/utils/battle/balance/xp-budget.ts`, `lib/utils/battle/actions/legendary-options.ts`, `lib/utils/battle/turn/battle-xp.ts`, `lib/utils/battle/turn/original-side.ts` імпортує клієнт — без `zod`, без `server-only`, без `@/lib/db` (`lib/__tests__/client-entry-imports.test.ts`). Zod-схеми — лише в `lib/schemas/units.ts`, `lib/utils/battle/actions/schema.ts`, `app/api/.../balance/balance-schema.ts`.
- Схема POST балансу **не може** мати ключ `difficulty` (наявний тест «схема не має складності» в `app/api/__tests__/balance-post.test.ts`) — поле називається `xpDifficulty`.
- Шари: `route.ts` тонкий; клієнтські запити — лише `lib/api/*`; хуки — `lib/hooks/<domain>/`; компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики. Помилки рушія — `BattleRuleError` / `BattleAccessError` (`lib/utils/battle/store`), тексти українською.
- Діалоги — `ResponsiveDialog hud`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: padding lines навколо `const`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle` (maxDepth 1), `react-hooks/exhaustive-deps` = error.
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>` під час роботи; повний `pnpm test:run`, `pnpm lint`, `pnpm build`, battle-sweep — лише в задачі 13. `pnpm build` тип-перевіряє й тести (`tsconfig` включає `**/*.ts(x)`), тож тестовий код має бути коректним за типами (касти `as never` / `as unknown as T` — як у сусідніх тестах).
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **Рятівний кидок монстра з легендарним опором проти заклинання союзника** (кастер на тому ж боці — лікувальне/корисне заклинання з рятівним кидком): опір **не** витрачається, провал лишається провалом. Тест у задачі 4.
2. **Легендарна дія мертвого / непритомного / недієздатного монстра, монстра в резерві або в його власний хід** — відмова 422 без зміни стану (лічильник не списано, атака не проведена). Тести в задачі 6.
3. **Режим XP зі змішаним складом ворогів** (HOMM-юніти без CR, NPC-герої на боці ворогів): юніти без CR потрапляють у `missingCr` і не впливають ні на XP, ні на множник кількості; NPC-герої ігноруються; складність рахується з решти, а коли CR немає ні в кого — «Дрібниця» з попередженням. Тест у задачі 7.
4. **Авто-досвід зі «шумними» учасниками**: слот додаткового ходу того самого героя, ворог, зачарований на бік героїв (`charmReturn`/`charmOrigin`), ворожий призваний (`summonedBy`), живий ворог — XP рахується лише за переможених оригінальних ворогів, кожен герой отримує частку рівно один раз. Тест у задачі 9.
5. **PATCH юніта з `cr: null`** (ДМ прибрав CR) — колонка стає `null` (не `undefined`), юніт повертається до поведінки HOMM; PATCH без `cr` не чіпає колонку. Тест у задачі 2.

## Рішення щодо неоднозначностей спеку

- **Тіло легендарної дії** — `{ action: "legendary", participantId, option }` (як решта тіл `core-action`, замість `actorId`); атака — `{ kind: "attack", attackIndex, targetId }` (одна ціль, одна атака), вміння — `{ kind: "ability", abilityKey, targetIds? }` (`ResolvedAbility.key` замість `abilityId`). Легендарна дія не потребує `rules.actions.enabled` — це властивість монстра.
- **Усе 5e юніта — лише з CR**: мультиатака, легендарні дії/опір, рятівні кидки, `damageModel`, СК без CR ігноруються (HOMM-юніт з `multiattack: 3` лишається HOMM). `basicInfo.xp` ставиться будь-якому юніту з ненульовим `unitXp` (HOMM-юніт з ручним XP теж дає досвід).
- **Майстерність монстра** — збережене `proficiencyBonus` (форма підставляє значення з CR при виборі CR, ДМ може змінити); сервер бере таблицю CR лише коли `proficiencyBonus` = 0 (як наявний запасний шлях за рівнем).
- **Рятівні кидки монстра** читає наявний `rollSave` (4a) — тобто за `rules.saves.proficiency`, як у героїв.
- **CR 0** дає 10 XP (SRD: «0 або 10») — інакше монстри CR 0 ніколи не впливали б на баланс.
- **Легендарний опір** не витрачається на заклинання кастера того самого боку (корисні заклинання з рятівним кидком); у решті викликів — завжди при провалі (і при автопровалі).
- **`legendaryCost`** — лише для `trigger: "action"` без `aim` (підбір цілей легендарної дії — учасники, не клітинки).
- **`battleData.legendary`** живе в snapshot (як `deathSaves`, `attacksLeft`), а не в `state` — без змін `split-participant.ts`.
- **Бюджет XP на підготовці**: рівні — героїв-союзників (`characterStats[id].level`), XP — юнітів-ворогів (резерв теж); NPC-герої на боці ворогів ігноруються; союзні юніти не впливають. «Найвищий досягнутий поріг» нижче першого — «Дрібниця».
- **Автопідбір XP** — один вид юніта (найпростіше детерміноване наближення «набирає юнітів з CR до порогу»): спершу смуга [поріг обраної складності, наступний поріг), інакше найближчий знизу.
- **«Другий вигляд BalanceSummary»** — окремий компонент `XpBalanceSummary` (наявний `BalanceSummary` і його тест без змін).
- **Блок «5e» форми юніта** показується, коли `classes.enabled` або `encounters.balance = "xp"`, а також коли в юніта вже є CR (щоб його можна було прибрати). Імпорт CSV полів 5e не отримує (лише JSON-імпорт `importUnitSchema`) — CSV-формат HOMM.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/{schema,defaults,registry}.ts`, `components/rules/RulesForm.tsx`, `components/rules/sections/EncountersSection.tsx` (новий) | `rules.encounters` |
| `lib/constants/challenge.ts` (новий) | таблиці CR → XP і майстерність, підписи CR |
| `lib/utils/units/monster.ts` (новий) | `isMonster5e`, `unitXp`, `bestMentalAbility`, `monsterSaveDc`, `readSaveProficiencies`, `multiattackAbilities` |
| `prisma/schema.prisma`, `prisma/migrations/20261030000000_unit_5e/migration.sql` | колонки `units` |
| `lib/schemas/units.ts`, `lib/server/content/resources/units.ts`, `lib/utils/units/{to-unit,unit-form,import-units}.ts`, `types/units.ts` | поля 5e на всьому шляху ресурсу |
| `types/battle.ts` | `basicInfo.xp`, `battleData.legendary`, `LegendaryState`, `LegendaryOption` |
| `lib/utils/battle/participant/from-unit.ts` | монстр 5e в бою |
| `lib/utils/battle/balance/{stats,unit-library}.ts`, `app/api/.../battles/balance/balance-get.ts`, `types/battle-setup.ts` | СК/мультиатака/CR/XP у статах балансу |
| `lib/utils/battle/saves/legendary.ts` (новий), `saves/{index,save-ends}.ts`, `spell/cast/outcome.ts`, `concentration/index.ts`, `actions/grapple.ts`, `maneuvers/fire-burst.ts` | легендарний опір |
| `lib/utils/abilities/schema/ability.ts`, `lib/utils/abilities/registry/labels.ts`, `components/abilities/sections/{LimitsSection,TriggerSection}.tsx`, `lib/utils/battle/view/hero.ts`, `lib/utils/battle/pipeline/ability-use.ts` | `limits.legendaryCost`, підказка лігва, приховування в ході |
| `lib/utils/battle/actions/{schema,legendary-options,legendary}.ts`, `lib/utils/battle/attack/server-attack.ts`, `lib/utils/battle/turn/turn-state.ts`, `app/api/.../core-action/{route,legendary-mutation}.ts`, `lib/api/battles.ts` | легендарна дія |
| `lib/utils/battle/balance/xp-budget.ts` (новий) | бюджет XP 2014/2024, підбір складу |
| `app/api/.../battles/balance/{balance-schema,balance-post}.ts`, `app/api/.../start/start-battle-handler.ts` | режим `xp` на сервері |
| `lib/utils/battle/turn/{original-side,battle-xp,victory}.ts`, `lib/utils/battle/store/{persist-xp,save-battle}.ts` | авто-досвід |
| `components/units/form/{UnitFiveEFields,UnitFormFields}.tsx`, `lib/hooks/units/useUnitFormFields.ts`, `components/units/list/UnitCard.tsx` | UI юніта |
| `lib/hooks/battle/{useLegendaryAction,useDmParticipantActions,index}.ts`, `components/battle/dm/{LegendaryActionDialog,DmParticipantRow,DmQuickActionsPanel}.tsx`, `components/battle/participants/ParticipantRow.tsx` | UI бою |
| `lib/hooks/battles/setup/{useXpBalance,useBattleSetup,useBalanceSuggestions}.ts`, `components/battle/setup/{XpBalanceSummary,AutopickCard,BattleSetupForm}.tsx` | UI підготовки бою |
| `docs/architecture/{battle,balance,abilities,content-api}.md`, `docs/STATUS.md` | документи |

---

### Task 1: Правила `encounters` і вкладка «Зустрічі»

**Files:**
- Modify: `lib/utils/rules/schema.ts` (секція в `sections`, `RulesetSchema`, `RulesetPatchSchema`), `lib/utils/rules/defaults.ts`, `lib/utils/rules/registry.ts`, `components/rules/RulesForm.tsx` (`SECTIONS.encounters`)
- Create: `components/rules/sections/EncountersSection.tsx`
- Test: `lib/utils/rules/__tests__/schema-4e.test.ts`, `components/rules/__tests__/encounters-section.test.tsx`; адитивно — рядок `encounters` в очікуваному `DEFAULT_RULES` у `lib/utils/rules/__tests__/schema.test.ts` (рядок ~27, після `outOfCombat`)

**Interfaces — Produces:**

```ts
// lib/utils/rules/schema.ts → sections
encounters: z.strictObject({
  balance: z.enum(["fair", "xp"]).default("fair"),
  edition: z.enum(["2014", "2024"]).default("2014"),
  autoXp: z.boolean().default(false),
}),
// Ruleset["encounters"] = { balance: "fair" | "xp"; edition: "2014" | "2024"; autoXp: boolean }
```

`MECHANIC_REGISTRY.encounters.label = "Зустрічі"`. Хеш синхронізації шаблону (`lib/server/templates/sync/hash.ts`) бере ключі з реєстру сам.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/rules/__tests__/schema-4e.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

const OFF = { balance: "fair", edition: "2014", autoXp: false };

describe("rules.encounters", () => {
  it("defaults to HOMM fair balance without auto XP", () => {
    expect(DEFAULT_RULES.encounters).toEqual(OFF);
    expect(parseRules({}).encounters).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ encounters: { balance: "cr" } }).encounters).toEqual(OFF);
  });

  it("patches one field", () => {
    const patch = RulesetPatchSchema.parse({ encounters: { balance: "xp", edition: "2024" } });

    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.encounters).toEqual({ ...OFF, balance: "xp", edition: "2024" });
  });

  it("is a registered mechanic", () => {
    expect(MECHANIC_REGISTRY.encounters.label).toBe("Зустрічі");
  });
});
```

```tsx
// components/rules/__tests__/encounters-section.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EncountersSection } from "../sections/EncountersSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState & { set: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe("EncountersSection", () => {
  it("перемикач бюджету XP пише лише секцію encounters", () => {
    const form = formOf(DEFAULT_RULES);

    render(<EncountersSection form={form} />);

    fireEvent.click(screen.getByRole("switch", { name: "Баланс за бюджетом XP 5e (інакше — рівний бій HOMM)" }));

    expect(form.set).toHaveBeenCalledWith("encounters", { balance: "xp", edition: "2014", autoXp: false });
  });

  it("авто-досвід без досвіду 5e показує підказку", () => {
    render(<EncountersSection form={formOf({ ...DEFAULT_RULES, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } })} />);

    expect(screen.getByText(/Діє лише разом із «Досвід за таблицею 5e»/)).toBeTruthy();
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/schema-4e.test.ts components/rules/__tests__/encounters-section.test.tsx` — FAIL (`encounters` undefined, модуля секції немає).
- [ ] **Step 3: Implement.**
  - `schema.ts`: секція вище в `sections` (після `outOfCombat`); `encounters: sections.encounters.prefault({}),` у `RulesetSchema`; `encounters: patchSection("encounters").optional(),` у `RulesetPatchSchema`.
  - `defaults.ts`: `encounters: { balance: "fair", edition: "2014", autoXp: false },` останнім рядком `DEFAULT_RULES`.
  - `registry.ts`, останнім рядком:

```ts
  encounters: { label: "Зустрічі", description: "Баланс бою: «рівний бій» HOMM (масштаб HP і шкоди ворогів) або бюджет XP 5e за CR юнітів (пороги DMG 2014 чи 2024, без масштабування). Авто-досвід: після перемоги XP переможених ворогів ділиться порівну між героями (потрібен «Досвід за таблицею 5e»)." },
```

  - `schema.test.ts` (адитивно, рядок після `outOfCombat: …`): `encounters: { balance: "fair", edition: "2014", autoXp: false },`.
  - `RulesForm.tsx`: `import { EncountersSection } from "./sections/EncountersSection";` і `encounters: EncountersSection,` останнім у `SECTIONS`.

```tsx
// components/rules/sections/EncountersSection.tsx
import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { Ruleset } from "@/lib/utils/rules";

export function EncountersSection({ form }: { form: RulesFormState }) {
  const section = form.data.encounters;

  const set = (patch: Partial<Ruleset["encounters"]>) => form.set("encounters", { ...section, ...patch });

  return (
    <RulesSection mechanic="encounters">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch id="rules-enc-balance" checked={section.balance === "xp"} onCheckedChange={(v) => set({ balance: v ? "xp" : "fair" })} />
          <Label htmlFor="rules-enc-balance">Баланс за бюджетом XP 5e (інакше — рівний бій HOMM)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="rules-enc-edition" checked={section.edition === "2024"} onCheckedChange={(v) => set({ edition: v ? "2024" : "2014" })} />
          <Label htmlFor="rules-enc-edition">Пороги складності за DMG 2024 (інакше 2014)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="rules-enc-autoxp" checked={section.autoXp} onCheckedChange={(v) => set({ autoXp: v })} />
          <Label htmlFor="rules-enc-autoxp">Авто-досвід після перемоги</Label>
        </div>
        {section.autoXp && !form.data.outOfCombat.xp && <p className="text-xs text-hud-muted">Діє лише разом із «Досвід за таблицею 5e» на вкладці «Поза боєм».</p>}
      </div>
    </RulesSection>
  );
}
```

- [ ] **Step 4:** `pnpm test:run lib/utils/rules/__tests__/schema-4e.test.ts components/rules/__tests__/encounters-section.test.tsx` + `pnpm test:related lib/utils/rules/schema.ts lib/utils/rules/registry.ts components/rules/RulesForm.tsx` — PASS. Якщо падає лише межа розміру OpenAPI — підняти на +5000 і записати в звіт.
- [ ] **Step 5: Commit**

```bash
git add lib/utils/rules components/rules
git commit -m "feat(constructor): 4e rules.encounters and rules tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Дані — таблиці CR, міграція, ресурс `units`

**Files:**
- Create: `lib/constants/challenge.ts`, `lib/utils/units/monster.ts`, `prisma/migrations/20261030000000_unit_5e/migration.sql`
- Modify: `prisma/schema.prisma` (`model Unit`), `lib/schemas/units.ts`, `lib/server/content/resources/units.ts`, `lib/utils/units/to-unit.ts`, `types/units.ts`, `lib/utils/units/unit-form.ts`, `lib/utils/units/import-units.ts`
- Test: `lib/constants/__tests__/challenge.test.ts`, `lib/utils/units/__tests__/monster.test.ts`, `lib/schemas/__tests__/units-5e.test.ts`, `lib/server/content/__tests__/units-resource-5e.test.ts`, `lib/utils/units/__tests__/unit-5e-fields.test.ts`

**Interfaces — Produces:**

```ts
// lib/constants/challenge.ts (клієнтський, без zod)
export const CHALLENGE_RATINGS: readonly number[];                 // [0, 0.125, 0.25, 0.5, 1, …, 30]
export function isChallengeRating(v: number): boolean;
export function xpForChallenge(cr: number): number;                // невідомий CR → 0
export function proficiencyForChallenge(cr: number): number;
export function challengeLabel(cr: number): string;                // 0.125 → "1/8"
export const CHALLENGE_OPTIONS: { value: string; label: string }[];

// lib/utils/units/monster.ts (клієнтський)
export function isMonster5e<T extends { cr?: number | null }>(u: T): u is T & { cr: number };
export function unitXp(u: { cr?: number | null; xp?: number | null }): number | null;   // xp ?? (CR ? таблиця : null)
export function bestMentalAbility(scores: Record<SpellcastingAbility, number>): SpellcastingAbility;  // нічия: Інт > Мдр > Хар
export function monsterSaveDc(saveDcBase: number, proficiencyBonus: number, scores: Record<SpellcastingAbility, number>): number;
export function readSaveProficiencies(raw: unknown): AbilityKey[];
export function multiattackAbilities(unit: { id: string; name: string; multiattack?: number | null }): ResolvedAbility[];  // multiattack ≤ 1 → []

// types/units.ts → interface Unit (усі опційні: фікстури старих тестів їх не мають)
cr?: number | null; xp?: number | null; multiattack?: number; legendaryActions?: number; legendaryResistances?: number; saveProficiencies?: AbilityKey[];

// lib/utils/units/unit-form.ts
export function applyChallenge(cr: number | null): Partial<Unit>;  // null → { cr: null }; число → { cr, proficiencyBonus: proficiencyForChallenge(cr) }
```

Prisma `Unit`: `cr Float?`, `xp Int?`, `multiattack Int @default(1)`, `legendaryActions Int @default(0)`, `legendaryResistances Int @default(0)`, `saveProficiencies Json @default("[]")`. Бандл/синхронізація беруть колонки з DMMF (`Prisma.UnitScalarFieldEnum`) — правок не потребують; OpenAPI і MCP будуються зі схем Zod — правок не потребують.

- [ ] **Step 1: Failing tests**

```ts
// lib/constants/__tests__/challenge.test.ts
import { describe, expect, it } from "vitest";

import { CHALLENGE_OPTIONS, CHALLENGE_RATINGS, challengeLabel, isChallengeRating, proficiencyForChallenge, xpForChallenge } from "@/lib/constants/challenge";

describe("CR tables", () => {
  it("34 значення: 0, дроби, 1–30", () => {
    expect(CHALLENGE_RATINGS).toHaveLength(34);
    expect(CHALLENGE_RATINGS.slice(0, 5)).toEqual([0, 0.125, 0.25, 0.5, 1]);
    expect(CHALLENGE_RATINGS.at(-1)).toBe(30);
  });

  it("XP за CR (SRD)", () => {
    const expected: Array<[number, number]> = [
      [0, 10], [0.125, 25], [0.25, 50], [0.5, 100], [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900],
      [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000],
      [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000], [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
    ];

    for (const [cr, xp] of expected) expect(xpForChallenge(cr)).toBe(xp);
    expect(xpForChallenge(0.3)).toBe(0);
  });

  it("майстерність за CR", () => {
    const expected: Array<[number, number]> = [[0, 2], [0.125, 2], [0.5, 2], [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6], [21, 7], [24, 7], [25, 8], [28, 8], [29, 9], [30, 9]];

    for (const [cr, prof] of expected) expect(proficiencyForChallenge(cr)).toBe(prof);
  });

  it("підписи й валідація", () => {
    expect([0, 0.125, 0.25, 0.5, 7].map(challengeLabel)).toEqual(["0", "1/8", "1/4", "1/2", "7"]);
    expect(isChallengeRating(0.25)).toBe(true);
    expect(isChallengeRating(0.3)).toBe(false);
    expect(isChallengeRating(31)).toBe(false);
    expect(CHALLENGE_OPTIONS[1]).toEqual({ value: "0.125", label: "1/8" });
  });
});
```

```ts
// lib/utils/units/__tests__/monster.test.ts
import { describe, expect, it } from "vitest";

import { bestMentalAbility, isMonster5e, monsterSaveDc, multiattackAbilities, readSaveProficiencies, unitXp } from "@/lib/utils/units/monster";

describe("monster helpers", () => {
  it("isMonster5e — лише коли CR задано (0 теж)", () => {
    expect(isMonster5e({ cr: 0 })).toBe(true);
    expect(isMonster5e({ cr: null })).toBe(false);
    expect(isMonster5e({})).toBe(false);
  });

  it("unitXp: ручне XP має пріоритет; без CR і XP — null", () => {
    expect(unitXp({ cr: 5 })).toBe(1800);
    expect(unitXp({ cr: 5, xp: 2000 })).toBe(2000);
    expect(unitXp({ cr: null, xp: 300 })).toBe(300);
    expect(unitXp({ cr: null, xp: null })).toBeNull();
  });

  it("СК = база + майстерність + найкращий мод. Інт/Мдр/Хар; нічия — Інт", () => {
    expect(bestMentalAbility({ intelligence: 8, wisdom: 14, charisma: 16 })).toBe("charisma");
    expect(bestMentalAbility({ intelligence: 12, wisdom: 12, charisma: 12 })).toBe("intelligence");
    expect(monsterSaveDc(8, 3, { intelligence: 8, wisdom: 14, charisma: 16 })).toBe(14);
  });

  it("рятівні кидки: лише відомі ключі", () => {
    expect(readSaveProficiencies(["dexterity", "bogus", 3, "wisdom"])).toEqual(["dexterity", "wisdom"]);
    expect(readSaveProficiencies(null)).toEqual([]);
  });

  it("мультиатака — пасивне вміння attacksPerAction = n − 1", () => {
    expect(multiattackAbilities({ id: "u1", name: "Огр", multiattack: 1 })).toEqual([]);

    const [a] = multiattackAbilities({ id: "u1", name: "Огр", multiattack: 3 });

    expect(a).toMatchObject({ key: "unit:u1:multiattack", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 2 }], source: { type: "unit", id: "u1" } });
  });
});
```

```ts
// lib/schemas/__tests__/units-5e.test.ts
import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitSchema, updateUnitSchema } from "@/lib/schemas/units";

describe("unit 5e fields", () => {
  it("create: дефолти HOMM", () => {
    expect(createUnitSchema.parse({ name: "Гоблін" })).toMatchObject({ multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] });
    expect(createUnitSchema.parse({ name: "Гоблін" }).cr).toBeUndefined();
  });

  it("CR лише з таблиці; null дозволено", () => {
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.25 }).success).toBe(true);
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.3 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", cr: 31 }).success).toBe(false);
    expect(updateUnitSchema.parse({ cr: null }).cr).toBeNull();
  });

  it("межі лічильників і ключі рятівних кидків", () => {
    expect(createUnitSchema.safeParse({ name: "X", multiattack: 0 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", legendaryActions: 6 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", saveProficiencies: ["luck"] }).success).toBe(false);
    expect(updateUnitSchema.parse({})).toEqual({});
  });

  it("import приймає поля 5e", () => {
    expect(importUnitSchema.parse({ name: "Огр", cr: 2, multiattack: 2, saveProficiencies: ["strength"] })).toMatchObject({ cr: 2, multiattack: 2, saveProficiencies: ["strength"], legendaryActions: 0 });
  });
});
```

```ts
// lib/server/content/__tests__/units-resource-5e.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn() },
  spell: { count: vi.fn() },
  unit: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedUnits: vi.fn(async () => []) }));

import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import { unitsResource } from "@/lib/server/content/resources/units";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("unitsResource 5e", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.unit.create.mockResolvedValue({ id: "u1" });
    db.unit.update.mockResolvedValue({ id: "u1" });
  });

  it("create пише поля 5e; майстерність 0 → з таблиці CR", async () => {
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Огр", cr: 5, proficiencyBonus: 0, multiattack: 2, legendaryResistances: 1, saveProficiencies: ["strength"] }));

    expect(db.unit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cr: 5, xp: null, multiattack: 2, legendaryActions: 0, legendaryResistances: 1, saveProficiencies: ["strength"], proficiencyBonus: 3 }) });
  });

  it("create без CR — HOMM: cr null, майстерність за рівнем", async () => {
    await unitsResource.create(actor, createUnitSchema.parse({ name: "Гоблін", level: 5, proficiencyBonus: 0 }));

    expect(db.unit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cr: null, multiattack: 1, proficiencyBonus: 3 }) });
  });

  it("PATCH cr: null скидає колонку; PATCH без cr її не чіпає", async () => {
    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, updateUnitSchema.parse({ cr: null }));

    expect(db.unit.update.mock.calls[0][0].data.cr).toBeNull();

    await unitsResource.update(actor, { id: "u1", knownSpells: [] } as never, updateUnitSchema.parse({ name: "Інший" }));

    expect(db.unit.update.mock.calls[1][0].data.cr).toBeUndefined();
  });
});
```

```ts
// lib/utils/units/__tests__/unit-5e-fields.test.ts
import { describe, expect, it } from "vitest";

import { importUnitSchema } from "@/lib/schemas/units";
import { toUnitCreateData } from "@/lib/utils/units/import-units";
import { toUnit } from "@/lib/utils/units/to-unit";
import { applyChallenge, buildUnitFormData, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

describe("unit 5e fields through form, toUnit, import", () => {
  it("toUnit віддає поля 5e і чистить рятівні кидки", () => {
    const unit = toUnit({ id: "u1", campaignId: "c1", name: "Огр", raceId: null, attacks: [], immunities: [], knownSpells: [], abilities: [], cr: 2, xp: null, multiattack: 2, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: ["strength", "x"] } as never);

    expect(unit).toMatchObject({ cr: 2, xp: null, multiattack: 2, saveProficiencies: ["strength"] });
  });

  it("форма: дефолти HOMM; юніт без полів 5e читається як HOMM", () => {
    expect(emptyUnitFormDefaults()).toMatchObject({ cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] });
    expect(buildUnitFormData({ id: "u1", name: "Гоблін", attacks: [] } as unknown as Unit)).toMatchObject({ cr: null, multiattack: 1, saveProficiencies: [] });
  });

  it("applyChallenge підставляє майстерність з CR; зняття CR майстерність не чіпає", () => {
    expect(applyChallenge(9)).toEqual({ cr: 9, proficiencyBonus: 4 });
    expect(applyChallenge(null)).toEqual({ cr: null });
  });

  it("імпорт переносить поля 5e у рядок", () => {
    const row = importUnitSchema.parse({ name: "Огр", cr: 2, legendaryActions: 1 });

    expect(toUnitCreateData("c1", row, null)).toMatchObject({ cr: 2, xp: null, multiattack: 1, legendaryActions: 1, legendaryResistances: 0, saveProficiencies: [] });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/constants/__tests__/challenge.test.ts lib/utils/units/__tests__/monster.test.ts lib/schemas/__tests__/units-5e.test.ts lib/server/content/__tests__/units-resource-5e.test.ts lib/utils/units/__tests__/unit-5e-fields.test.ts` — FAIL (модулів і полів немає).
- [ ] **Step 3: Constants і чисті хелпери.**

```ts
// lib/constants/challenge.ts
const XP_BY_CR: ReadonlyArray<readonly [number, number]> = [
  [0, 10], [0.125, 25], [0.25, 50], [0.5, 100],
  [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900],
  [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000],
  [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000], [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
];

const XP_MAP = new Map(XP_BY_CR);

const FRACTIONS: Record<string, string> = { "0.125": "1/8", "0.25": "1/4", "0.5": "1/2" };

export const CHALLENGE_RATINGS: readonly number[] = XP_BY_CR.map(([cr]) => cr);

export const isChallengeRating = (v: number): boolean => XP_MAP.has(v);

export function xpForChallenge(cr: number): number {
  return XP_MAP.get(cr) ?? 0;
}

export function proficiencyForChallenge(cr: number): number {
  return cr < 1 ? 2 : Math.floor((cr - 1) / 4) + 2;
}

export function challengeLabel(cr: number): string {
  return FRACTIONS[String(cr)] ?? String(cr);
}

export const CHALLENGE_OPTIONS = CHALLENGE_RATINGS.map((cr) => ({ value: String(cr), label: challengeLabel(cr) }));
```

```ts
// lib/utils/units/monster.ts
import { type AbilityKey, isAbilityKey, SPELLCASTING_ABILITIES, type SpellcastingAbility } from "@/lib/constants/abilities";
import { xpForChallenge } from "@/lib/constants/challenge";
import { resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { ResolvedAbility } from "@/types/abilities";

export function isMonster5e<T extends { cr?: number | null }>(u: T): u is T & { cr: number } {
  return u.cr !== null && u.cr !== undefined;
}

export function unitXp(u: { cr?: number | null; xp?: number | null }): number | null {
  if (u.xp !== null && u.xp !== undefined) return u.xp;

  return isMonster5e(u) ? xpForChallenge(u.cr) : null;
}

export function bestMentalAbility(scores: Record<SpellcastingAbility, number>): SpellcastingAbility {
  return SPELLCASTING_ABILITIES.reduce<SpellcastingAbility>((best, k) => (scores[k] > scores[best] ? k : best), "intelligence");
}

export function monsterSaveDc(saveDcBase: number, proficiencyBonus: number, scores: Record<SpellcastingAbility, number>): number {
  return saveDcBase + proficiencyBonus + getAbilityModifier(scores[bestMentalAbility(scores)]);
}

export function readSaveProficiencies(raw: unknown): AbilityKey[] {
  return Array.isArray(raw) ? raw.filter(isAbilityKey) : [];
}

export function multiattackAbilities(unit: { id: string; name: string; multiattack?: number | null }): ResolvedAbility[] {
  const extra = (unit.multiattack ?? 1) - 1;

  if (extra < 1) return [];

  return resolveAbilities({ type: "unit", id: unit.id, name: unit.name }, [
    { id: "multiattack", name: `Мультиатака ×${extra + 1}`, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: extra }] },
  ]);
}
```

- [ ] **Step 4: Migration + Prisma.**

```sql
-- prisma/migrations/20261030000000_unit_5e/migration.sql
-- AlterTable
ALTER TABLE "units" ADD COLUMN "cr" DOUBLE PRECISION;
ALTER TABLE "units" ADD COLUMN "xp" INTEGER;
ALTER TABLE "units" ADD COLUMN "multiattack" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "units" ADD COLUMN "legendaryActions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "units" ADD COLUMN "legendaryResistances" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "units" ADD COLUMN "saveProficiencies" JSONB NOT NULL DEFAULT '[]';
```

`prisma/schema.prisma`, `model Unit`, після `levelScaling Json?`:

```prisma
  cr                   Float?
  xp                   Int?
  multiattack          Int      @default(1)
  legendaryActions     Int      @default(0)
  legendaryResistances Int      @default(0)
  saveProficiencies    Json     @default("[]")
```

Застосувати: `pnpm exec prisma format && set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`.

- [ ] **Step 5: Zod (`lib/schemas/units.ts`).** Додати імпорти `import { ABILITY_KEYS } from "@/lib/constants/abilities";`, `import { isChallengeRating } from "@/lib/constants/challenge";` і перед `createUnitSchema`:

```ts
const challengeSchema = z.number().refine(isChallengeRating, "CR: 0, 1/8, 1/4, 1/2 або ціле 1–30").describe("Рівень небезпеки 5e (0.125 = 1/8); null — юніт HOMM");

const monsterFields = {
  cr: challengeSchema.nullable().optional(),
  xp: z.number().int().min(0).max(1_000_000).nullable().optional().describe("XP за перемогу; порожньо — з таблиці CR"),
};

const multiattack = z.number().int().min(1).max(10).describe("Атак за дію «Атака» (монстр 5e)");

const legendaryActions = z.number().int().min(0).max(5).describe("Легендарних дій за раунд");

const legendaryResistances = z.number().int().min(0).max(10).describe("Легендарного опору за бій");

const saveProficiencies = z.array(z.enum(ABILITY_KEYS)).max(6).describe("Характеристики з майстерністю рятівних кидків (5e)");

const monsterCreateFields = {
  ...monsterFields,
  multiattack: multiattack.default(1),
  legendaryActions: legendaryActions.default(0),
  legendaryResistances: legendaryResistances.default(0),
  saveProficiencies: saveProficiencies.default([]),
};
```

`createUnitSchema` і `importUnitSchema`: додати `...monsterCreateFields,` останнім полем об'єкта. `updateUnitSchema`: додати

```ts
  ...monsterFields,
  multiattack: multiattack.optional(),
  legendaryActions: legendaryActions.optional(),
  legendaryResistances: legendaryResistances.optional(),
  saveProficiencies: saveProficiencies.optional(),
```

- [ ] **Step 6: Ресурс, toUnit, типи, форма, імпорт.**
  - `lib/server/content/resources/units.ts`: імпорти `import { proficiencyForChallenge } from "@/lib/constants/challenge";`, `import { isMonster5e } from "@/lib/utils/units/monster";`. У `create` → `data`: рядок майстерності замінити на `proficiencyBonus: data.proficiencyBonus || (isMonster5e(data) ? proficiencyForChallenge(data.cr) : getProficiencyBonus(data.level)),` і після `avatar: data.avatar ?? null,` додати

```ts
        cr: data.cr ?? null,
        xp: data.xp ?? null,
        multiattack: data.multiattack,
        legendaryActions: data.legendaryActions,
        legendaryResistances: data.legendaryResistances,
        saveProficiencies: data.saveProficiencies as Prisma.InputJsonValue,
```

    У `update` → `data` після `avatar: data.avatar,`:

```ts
        cr: data.cr,
        xp: data.xp,
        multiattack: data.multiattack,
        legendaryActions: data.legendaryActions,
        legendaryResistances: data.legendaryResistances,
        saveProficiencies: toJsonInput(data.saveProficiencies),
```

  - `lib/utils/units/to-unit.ts`: `import { readSaveProficiencies } from "@/lib/utils/units/monster";` і після `abilitySummary: …,`:

```ts
    cr: row.cr ?? null,
    xp: row.xp ?? null,
    multiattack: row.multiattack ?? 1,
    legendaryActions: row.legendaryActions ?? 0,
    legendaryResistances: row.legendaryResistances ?? 0,
    saveProficiencies: readSaveProficiencies(row.saveProficiencies),
```

  - `types/units.ts`: `import type { AbilityKey } from "@/lib/constants/abilities";` і в `interface Unit` після `avatar`:

```ts
  cr?: number | null;
  xp?: number | null;
  multiattack?: number;
  legendaryActions?: number;
  legendaryResistances?: number;
  saveProficiencies?: AbilityKey[];
```

  - `lib/utils/units/unit-form.ts`: `import { proficiencyForChallenge } from "@/lib/constants/challenge";`. У `buildUnitFormData` після `gridSize`:

```ts
    cr: unit.cr ?? null,
    xp: unit.xp ?? null,
    multiattack: unit.multiattack ?? 1,
    legendaryActions: unit.legendaryActions ?? 0,
    legendaryResistances: unit.legendaryResistances ?? 0,
    saveProficiencies: unit.saveProficiencies ?? [],
```

    У `emptyUnitFormDefaults` після `gridSize: 1,`: `cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [],` (по рядку на поле). Нова функція:

```ts
export function applyChallenge(cr: number | null): Partial<Unit> {
  return cr === null ? { cr: null } : { cr, proficiencyBonus: proficiencyForChallenge(cr) };
}
```

  - `lib/utils/units/import-units.ts`, `toUnitCreateData` після `avatar: unit.avatar ?? null,`:

```ts
    cr: unit.cr ?? null,
    xp: unit.xp ?? null,
    multiattack: unit.multiattack,
    legendaryActions: unit.legendaryActions,
    legendaryResistances: unit.legendaryResistances,
    saveProficiencies: unit.saveProficiencies as Prisma.InputJsonValue,
```

- [ ] **Step 7:** нові тести + `pnpm test:related lib/schemas/units.ts lib/server/content/resources/units.ts lib/utils/units/to-unit.ts lib/utils/units/unit-form.ts lib/utils/units/import-units.ts` + `pnpm test:run lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/tool-schemas.test.ts prisma/__tests__/migrations-rls.test.ts` — PASS (OpenAPI: див. Global Constraints).
- [ ] **Step 8: Commit**

```bash
git add prisma lib/constants/challenge.ts lib/constants/__tests__/challenge.test.ts lib/utils/units lib/schemas lib/server/content types/units.ts
git commit -m "feat(constructor): 4e unit CR/XP, multiattack, legendary and save fields

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Монстр 5e в бою і в статах балансу

**Files:**
- Modify: `types/battle.ts` (`BattleParticipantBasicInfo.xp`, `BattleParticipantBattleData.legendary`, новий `LegendaryState`), `lib/utils/battle/participant/from-unit.ts`, `lib/utils/battle/balance/stats.ts` (`UnitStatsInput`, `UnitStats`, `bestSpell`, `getUnitStats`), `lib/utils/battle/balance/unit-library.ts` (`UnitStatsRow`, `unitRowStats`), `app/api/campaigns/[id]/battles/balance/balance-get.ts`, `types/battle-setup.ts` (`UnitEntityStats`)
- Test: `lib/utils/battle/participant/__tests__/from-unit-5e.test.ts`, `lib/utils/battle/balance/__tests__/stats-5e.test.ts`

**Interfaces:**
- Consumes (задача 2): `isMonster5e`, `unitXp`, `bestMentalAbility`, `monsterSaveDc`, `readSaveProficiencies`, `multiattackAbilities` з `@/lib/utils/units/monster`; колонки `Unit.cr/xp/multiattack/legendaryActions/legendaryResistances/saveProficiencies` у `UnitFromPrisma`.
- Produces:

```ts
// types/battle.ts
export interface LegendaryState { actions: number; actionsLeft: number; resistLeft: number }
// BattleParticipantBasicInfo:  xp?: number;
// BattleParticipantBattleData: legendary?: LegendaryState;

// lib/utils/battle/balance/stats.ts
// UnitStatsInput += intelligence?, wisdom?, charisma?: number; cr?: number | null; xp?: number | null; multiattack?: number | null
// UnitStats += cr?: number; xp?: number
// types/battle-setup.ts UnitEntityStats += cr?: number; xp?: number
```

Учасник з юніта-монстра (`isMonster5e`): `abilities.damageModel = "5e"`; `abilities.saveProficiencies` (коли не порожні); `spellcasting.spellcastingAbility = bestMentalAbility(unit)`; `spellSaveDC = monsterSaveDc(rules.formulas.saveDcBase, unit.proficiencyBonus, unit)`; мультиатака — `multiattackAbilities(unit)` у `resolvedAbilities`; `battleData.legendary = { actions, actionsLeft: actions, resistLeft }`, коли `legendaryActions > 0 || legendaryResistances > 0`. `basicInfo.xp = unitXp(unit)`, коли не `null` (для будь-якого юніта: HOMM-юніт без ручного XP його не має). Майстерність — `unit.proficiencyBonus` як збережено (форма підставляє з CR, ДМ може змінити).

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/participant/__tests__/from-unit-5e.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

import { ParticipantSide } from "@/lib/constants/battle";
import { attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { attacksPerAction } from "@/lib/utils/battle/attack/attacks-left";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const homm = (over: Partial<UnitFromPrisma> = {}) =>
  ({
    id: "u1", campaignId: "c1", name: "Гоблін", raceId: null, level: 3,
    strength: 10, dexterity: 18, constitution: 10, intelligence: 8, wisdom: 14, charisma: 16,
    armorClass: 12, initiative: 1, speed: 30, gridSize: 1, maxHp: 30, proficiencyBonus: 2,
    attacks: [{ name: "Кинджал", attackBonus: 0, damageDice: "1d4", damageType: "piercing", type: "melee", traits: ["finesse"] }],
    knownSpells: [], avatar: null, createdAt: new Date(0), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], levelScaling: null,
    sourceId: null, sourceHash: null,
    ...over,
  }) as UnitFromPrisma;

const HOMM_DEFAULTS = { cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] } as Partial<UnitFromPrisma>;

const build = (u: UnitFromPrisma) => createBattleParticipantFromUnit(u, "b1", ParticipantSide.ENEMY, 1, {});

describe("createBattleParticipantFromUnit: HOMM без змін", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => vi.useRealTimers());

  it("нові колонки з дефолтами не змінюють snapshot", async () => {
    const before = await build(homm());

    const after = await build(homm(HOMM_DEFAULTS));

    expect(after).toStrictEqual(before);
    expect(after.abilities.damageModel).toBeUndefined();
    expect(after.basicInfo).not.toHaveProperty("xp");
    expect(after.battleData).not.toHaveProperty("legendary");
    expect(after.spellcasting.spellSaveDC).toBe(8 + 2 + 3);
    expect(after.spellcasting.spellcastingAbility).toBeUndefined();
    expect(attacksPerAction(after, [after])).toBe(0);
    expect(attackDamageModifier(after, after.battleData.attacks[0])).toBe(0);
  });

  it("мультиатака й легендарне без CR ігноруються", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, multiattack: 3, legendaryActions: 2 }));

    expect(attacksPerAction(p, [p])).toBe(0);
    expect(p.battleData.legendary).toBeUndefined();
  });
});

describe("createBattleParticipantFromUnit: монстр 5e", () => {
  const monster = () => homm({ ...HOMM_DEFAULTS, cr: 5, proficiencyBonus: 3, multiattack: 2, legendaryActions: 3, legendaryResistances: 2, saveProficiencies: ["dexterity", "wisdom", "bogus"] });

  it("модель 5e, СК з найкращої ментальної, рятівні, XP, легендарне", async () => {
    const p = await build(monster());

    expect(p.abilities.damageModel).toBe("5e");
    expect(p.spellcasting.spellcastingAbility).toBe("charisma");
    expect(p.spellcasting.spellSaveDC).toBe(8 + 3 + 3);
    expect(p.abilities.saveProficiencies).toEqual(["dexterity", "wisdom"]);
    expect(p.basicInfo.xp).toBe(1800);
    expect(p.battleData.legendary).toEqual({ actions: 3, actionsLeft: 3, resistLeft: 2 });
  });

  it("мультиатака через collectModifiers; шкода фехтувальною — модифікатор Спр", async () => {
    const p = await build(monster());

    expect(attacksPerAction(p, [p])).toBe(1);
    expect(attackDamageModifier(p, p.battleData.attacks[0])).toBe(4);
  });

  it("ручне XP перекриває таблицю; без легендарного — без legendary", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, cr: 0.25, xp: 75 }));

    expect(p.basicInfo.xp).toBe(75);
    expect(p.battleData.legendary).toBeUndefined();
  });

  it("СК враховує rules.formulas.saveDcBase", async () => {
    const p = await createBattleParticipantFromUnit(monster(), "b1", ParticipantSide.ENEMY, 1, {}, { ...DEFAULT_RULES, formulas: { saveDcBase: 10, proficiencyBase: 2, proficiencyEvery: 4 } });

    expect(p.spellcasting.spellSaveDC).toBe(10 + 3 + 3);
  });
});
```

```ts
// lib/utils/battle/balance/__tests__/stats-5e.test.ts
import { describe, expect, it } from "vitest";

import { getUnitStats } from "@/lib/utils/battle/balance";
import type { UnitStatsInput } from "@/lib/utils/battle/balance/stats";

const fire = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const base: UnitStatsInput = { id: "u", name: "Огр", maxHp: 50, level: 3, strength: 10, dexterity: 10, intelligence: 8, wisdom: 12, charisma: 16, proficiencyBonus: 3, attacks: [{ damageDice: "1d8", type: "melee" }] };

const caster: UnitStatsInput = { ...base, attacks: [{ damageDice: "1d4", type: "melee" }], spells: [{ dice: 3, targeting: { kind: "allEnemies" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: [fire] }] };

describe("getUnitStats: 5e", () => {
  it("HOMM-юніт: нові поля з дефолтами нічого не змінюють", () => {
    expect(getUnitStats({ ...base, cr: null, xp: null, multiattack: 1 })).toStrictEqual(getUnitStats(base));
    expect(getUnitStats({ ...caster, cr: null, multiattack: 3 })).toStrictEqual(getUnitStats(caster));
    expect(getUnitStats(base)).not.toHaveProperty("cr");
    expect(getUnitStats(base)).not.toHaveProperty("xp");
  });

  it("монстр: СК = 8 + майстерність + найкращий мод. Інт/Мдр/Хар (без тіру)", () => {
    expect(getUnitStats(caster).spell?.save?.dc).toBe(11);
    expect(getUnitStats({ ...caster, cr: 5 }).spell?.save?.dc).toBe(14);
  });

  it("монстр: мультиатака множить DPR зброї; CR і XP у статах", () => {
    const s = getUnitStats({ ...base, cr: 2, multiattack: 2 });

    expect(s.dpr).toBe(9);
    expect(s).toMatchObject({ cr: 2, xp: 450 });
    expect(getUnitStats({ ...base, cr: 2, xp: 500 }).xp).toBe(500);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/participant/__tests__/from-unit-5e.test.ts lib/utils/battle/balance/__tests__/stats-5e.test.ts` — FAIL (немає `damageModel`, `xp`, `legendary`, СК без мод.).
- [ ] **Step 3: Types.** `types/battle.ts`:
  - у `BattleParticipantBasicInfo` після `isExtraTurnSlot?`: `/** XP за перемогу над учасником (юніт з CR або ручним XP) */` + `xp?: number;`
  - у `BattleParticipantBattleData` після `hpMultiplier?`: `/** Легендарні дії й опір монстра 5e; actionsLeft відновлюється на початку його ходу */` + `legendary?: LegendaryState;`
  - нову експортовану `interface LegendaryState { actions: number; actionsLeft: number; resistLeft: number }` перед `BattleParticipantBattleData`.
- [ ] **Step 4: `from-unit.ts`.** Імпорт `import { bestMentalAbility, isMonster5e, monsterSaveDc, multiattackAbilities, readSaveProficiencies, unitXp } from "@/lib/utils/units/monster";`. Після блоку `try { race = … } catch …` додати:

```ts
  const monster = isMonster5e(unit);

  const xp = unitXp(unit);

  const saveProficiencies = monster ? readSaveProficiencies(unit.saveProficiencies) : [];

  const legendary =
    monster && (unit.legendaryActions > 0 || unit.legendaryResistances > 0)
      ? { actions: unit.legendaryActions, actionsLeft: unit.legendaryActions, resistLeft: unit.legendaryResistances }
      : undefined;
```

  Зміни в об'єкті `participant`:
  - `basicInfo`: після `controlledBy: CONTROLLED_BY_DM,` → `...(xp !== null && { xp }),`
  - `abilities`: після `moraleCap: moraleCapFromRules(rules),` → `...(monster && { damageModel: "5e" as const }),` і `...(saveProficiencies.length > 0 && { saveProficiencies }),`
  - `spellcasting`: замінити `spellcastingAbility: undefined,` і рядки коментаря + `spellSaveDC` на

```ts
      spellcastingAbility: monster ? bestMentalAbility(unit) : undefined,
      // HOMM-юніт без заклинальної характеристики: СК росте з тіром (level = тір)
      spellSaveDC: monster ? monsterSaveDc(rules.formulas.saveDcBase, unit.proficiencyBonus, unit) : rules.formulas.saveDcBase + unit.proficiencyBonus + unit.level,
```

  - `resolvedAbilities`: між `...collectUnitAbilities(unit, race),` і `...immunityAbilities(…)` → `...(monster ? multiattackAbilities(unit) : []),`
  - `battleData`: після `pendingExtraActions: 0,` → `...(legendary && { legendary }),`
- [ ] **Step 5: Stats.** `lib/utils/battle/balance/stats.ts`:
  - імпорт `import { bestMentalAbility, isMonster5e, unitXp } from "@/lib/utils/units/monster";`
  - `UnitStats`: після `summon?` → `cr?: number;` `xp?: number;`
  - `UnitStatsInput`: після `dexterity?` → `intelligence?: number;` `wisdom?: number;` `charisma?: number;`; після `saveDcBase?` → `cr?: number | null;` `xp?: number | null;` `multiattack?: number | null;`
  - `bestSpell(spells, unit, saveDcBase = 8)` → `bestSpell(spells: UnitSpellInput[], unit: { level: number; proficiencyBonus?: number }, saveDcBase = 8, dcBonus = 0)`; рядок `save` (і коментар над ним) замінити на

```ts
    // СК як у рушії: HOMM — база + майстерність; монстр 5e — ще й найкращий мод. Інт/Мдр/Хар
    const save = resolution.kind === "save" ? { ability: resolution.ability, dc: saveDcBase + (unit.proficiencyBonus ?? 0) + dcBonus, half: resolution.onSuccess === "half" } : undefined;
```

  - `getUnitStats`: після циклу `for (const a of attacks) { … }` додати

```ts
  const monster = isMonster5e(unit);

  if (monster) weaponDpr *= Math.max(1, unit.multiattack ?? 1);

  const mental = { intelligence: unit.intelligence ?? 10, wisdom: unit.wisdom ?? 10, charisma: unit.charisma ?? 10 };

  const dcBonus = monster ? getAbilityModifier(mental[bestMentalAbility(mental)]) : 0;

  const xp = unitXp(unit);
```

    замінити `const spell = bestSpell(unit.spells ?? [], unit, unit.saveDcBase);` на `const spell = bestSpell(unit.spells ?? [], unit, unit.saveDcBase, dcBonus);`; у повернутий об'єкт останніми рядками додати `...(isMonster5e(unit) && { cr: unit.cr }),` і `...(xp !== null && { xp }),`.
  - `lib/utils/battle/balance/unit-library.ts`: `UnitStatsRow` += `intelligence?: number; wisdom?: number; charisma?: number; cr?: number | null; xp?: number | null; multiattack?: number;`; у виклику `getUnitStats({ … })` в `unitRowStats` додати `intelligence: u.intelligence, wisdom: u.wisdom, charisma: u.charisma, cr: u.cr, xp: u.xp, multiattack: u.multiattack,`.
  - `types/battle-setup.ts`, `UnitEntityStats`: `cr?: number;` `xp?: number;`.
  - `balance-get.ts`: в об'єкт `unitStats[u.unitId] = { … }` додати `cr: u.cr, xp: u.xp`.
- [ ] **Step 6:** `pnpm test:run lib/utils/battle/participant/__tests__/from-unit-5e.test.ts lib/utils/battle/balance/__tests__/stats-5e.test.ts` + `pnpm test:related lib/utils/battle/participant/from-unit.ts lib/utils/battle/balance/stats.ts lib/utils/battle/balance/unit-library.ts` — PASS, наявні тести без змін.
- [ ] **Step 7: Commit**

```bash
git add types/battle.ts types/battle-setup.ts lib/utils/battle/participant lib/utils/battle/balance "app/api/campaigns/[id]/battles/balance/balance-get.ts"
git commit -m "feat(constructor): 4e unit with CR builds a 5e monster participant and stats

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Легендарний опір

**Files:**
- Create: `lib/utils/battle/saves/legendary.ts`
- Modify: `lib/utils/battle/saves/index.ts`, `lib/utils/battle/saves/save-ends.ts`, `lib/utils/battle/spell/cast/outcome.ts` (`resolveOutcome`), `lib/utils/battle/concentration/index.ts` (`concentrationCheck`), `lib/utils/battle/actions/grapple.ts` (`contest`, `runGrapple`, `runShove`), `lib/utils/battle/maneuvers/fire-burst.ts`
- Test: `lib/utils/battle/saves/__tests__/legendary-resistance.test.ts`

**Interfaces:**
- Consumes (задача 3): `BattleParticipantBattleData.legendary?: LegendaryState`.
- Produces:

```ts
// lib/utils/battle/saves/legendary.ts
export function resolveSave<T extends { success: boolean }>(participant: BattleParticipant, result: T): { result: T; participant: BattleParticipant; message: string | null };
// провал і resistLeft > 0 → result.success = true, resistLeft − 1, message «👑 <ім'я>: Легендарний опір — провал стає успіхом (N залишилось)»; інакше — ті самі об'єкти, message null
// grapple.ts: contest(...) повертає ще й participants: BattleParticipant[]
```

Опір викликається там, де результат `rollSave` змінює стан учасника: заклинання (лише ціль з **іншого** боку, ніж кастер), концентрація, `saveEnds`, Схоплення/Штовхання 2024, Вогняний вибух. Лист персонажа (`sheet-roll.ts`) не чіпати.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/saves/__tests__/legendary-resistance.test.ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { contest } from "@/lib/utils/battle/actions/grapple";
import { beginConcentration, concentrationCheck } from "@/lib/utils/battle/concentration";
import { ABILITIES, byId, hp, MAP, percentOfAttack, perform, unit } from "@/lib/utils/battle/maneuvers/__tests__/fixtures";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollSaveEnds } from "@/lib/utils/battle/saves/save-ends";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const legendaryOf = (p: BattleParticipant, resistLeft: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, legendary: { actions: 0, actionsLeft: 0, resistLeft } } });

const resistOf = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.battleData.legendary?.resistLeft;

describe("resolveSave", () => {
  it("провал → успіх, лічильник −1, повідомлення", () => {
    const p = legendaryOf(makeParticipant({ id: "d" }), 2);

    const r = resolveSave(p, { success: false, total: 3 });

    expect(r.result).toEqual({ success: true, total: 3 });
    expect(r.participant.battleData.legendary?.resistLeft).toBe(1);
    expect(r.message).toBe("👑 d: Легендарний опір — провал стає успіхом (1 залишилось)");
  });

  it("успіх або порожній опір — без змін", () => {
    const p = legendaryOf(makeParticipant({ id: "d" }), 1);

    const ok = { success: true };

    expect(resolveSave(p, ok)).toEqual({ result: ok, participant: p, message: null });
    expect(resolveSave(legendaryOf(p, 0), { success: false }).result.success).toBe(false);
    expect(resolveSave(makeParticipant({ id: "x" }), { success: false }).message).toBeNull();
  });
});

describe("виклики rollSave", () => {
  it("saveEnds: провалений кидок звільняє за рахунок опору", () => {
    const base = legendaryOf(makeParticipant({ id: "t" }), 1);

    const p = { ...base, battleData: { ...base.battleData, activeEffects: [makeEffect("paralyzed", { name: "paralyzed", saveEnds: { ability: "wisdom", dc: 14 } })] } };

    const r = rollSaveEnds(p, [p], undefined, seq(0.1));

    expect(r.participant.battleData.activeEffects).toHaveLength(0);
    expect(r.participant.battleData.legendary?.resistLeft).toBe(0);
    expect(r.messages[1]).toContain("Легендарний опір");
  });

  it("концентрація: опір утримує її", () => {
    const begun = beginConcentration([legendaryOf(makeParticipant({ id: "c" }), 1)], "c", "c:sp@1#0", "Сповільнення", 3);

    const caster = begun.participants[0];

    const r = concentrationCheck({ caster, damage: 10, participants: begun.participants, rules: { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } }, rng: seq(0) });

    expect(r.participants[0].battleData.activeEffects.some((e) => e.concentration)).toBe(true);
    expect(resistOf(r.participants, "c")).toBe(0);
    expect(r.messages.join(" ")).toContain("утримує");
    expect(r.messages.join(" ")).toContain("Легендарний опір");
  });

  it("Схоплення 2024: опір цілі зриває захоплення", () => {
    const attacker = makeParticipant({ id: "a" });

    const target = legendaryOf(makeParticipant({ id: "t", side: ParticipantSide.ENEMY }), 1);

    const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true, variant: "2024" as const } };

    const r = contest({ attacker, target, participants: [attacker, target], rules, rng: () => 0.05 });

    expect(r.success).toBe(false);
    expect(resistOf(r.participants, "t")).toBe(0);
    expect(r.message).toContain("Легендарний опір");
  });

  it("Вогняний вибух: опір дає половину шкоди", () => {
    const ps = [
      unit("g", { side: ParticipantSide.ALLY, at: { x: 5, y: 5 }, abilities: [ABILITIES.fireBurst] }),
      legendaryOf(unit("e1", { at: { x: 6, y: 5 } }), 1),
      unit("e2", { at: { x: 4, y: 4 } }),
    ];

    const r = perform(ps, "fireBurst", { map: MAP, rng: () => 0 });

    const dmg = percentOfAttack(byId(r.participants, "g"), 50);

    expect(hp(r.participants, "e1")).toBe(200 - Math.floor(dmg / 2));
    expect(hp(r.participants, "e2")).toBe(200 - dmg);
    expect(resistOf(r.participants, "e1")).toBe(0);
  });

  describe("заклинання", () => {
    const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

    const spell = (targeting: CastableSpell["definition"]["targeting"]): CastableSpell => ({
      id: "sp", name: "Вогонь", level: 1, groupId: "chaos",
      definition: { dice: 2, cost: "action", targeting, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire], raceModifiers: [] },
    });

    const caster = () => {
      const p = makeParticipant({ id: "c" });

      return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
    };

    const cast = (s: CastableSpell, target: BattleParticipant) => {
      const c = caster();

      return castSpell({ caster: c, spell: s, targetIds: [target.basicInfo.id], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: target.basicInfo.id, roll: 1 }], rng: seq(0.5) });
    };

    it("ворог: провалений кидок стає успіхом (половина шкоди)", () => {
      const foe = legendaryOf(makeParticipant({ id: "e1", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), 1);

      const r = cast(spell({ kind: "enemy" }), foe);

      expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.combatStats.currentHp).toBe(197);
      expect(resistOf(r.allParticipantsUpdated, "e1")).toBe(0);
      expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("success");
      expect(r.battleAction.resultText).toContain("Легендарний опір");
    });

    it("ціль на боці кастера: опір не витрачається", () => {
      const friend = legendaryOf(makeParticipant({ id: "a1", hp: 200, maxHp: 200 }), 1);

      const r = cast(spell({ kind: "ally" }), friend);

      expect(resistOf(r.allParticipantsUpdated, "a1")).toBe(1);
      expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("fail");
    });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/saves/__tests__/legendary-resistance.test.ts` — FAIL (модуля немає).
- [ ] **Step 3: Helper.**

```ts
// lib/utils/battle/saves/legendary.ts
import type { BattleParticipant } from "@/types/battle";

export function resolveSave<T extends { success: boolean }>(participant: BattleParticipant, result: T): { result: T; participant: BattleParticipant; message: string | null } {
  const legendary = participant.battleData.legendary;

  if (result.success || !legendary || legendary.resistLeft <= 0) return { result, participant, message: null };

  const resistLeft = legendary.resistLeft - 1;

  return {
    result: { ...result, success: true },
    participant: { ...participant, battleData: { ...participant.battleData, legendary: { ...legendary, resistLeft } } },
    message: `👑 ${participant.basicInfo.name}: Легендарний опір — провал стає успіхом (${resistLeft} залишилось)`,
  };
}
```

`lib/utils/battle/saves/index.ts`: додати `export * from "./legendary";`.

- [ ] **Step 4: `save-ends.ts`** — тіло `rollSaveEnds` замінити на:

```ts
  const messages: string[] = [];

  const freed = new Set<string>();

  let current = p;

  for (const e of p.battleData.activeEffects) {
    if (!e.saveEnds) continue;

    const { ability, dc } = e.saveEnds;

    const rolled = rollSave({ target: current, ability, dc, participants, rules, rng });

    const { result, participant, message } = resolveSave(current, rolled);

    current = participant;

    const head = `🎲 ${p.basicInfo.name}: рятівний кидок ${ABILITY_LABELS[ability]} ${rolled.total} проти СК ${dc}`;

    messages.push(result.success ? `${head} — звільняється від стану «${e.name}»` : `${head} — стан «${e.name}» лишається`);

    if (message) messages.push(message);

    if (result.success) freed.add(e.id);
  }

  if (!freed.size) return { participant: current, messages };

  return { participant: removeEffects(current, (e) => freed.has(e.id)).participant, messages };
```

  з імпортом `import { resolveSave } from "@/lib/utils/battle/saves/legendary";`.

- [ ] **Step 5: `outcome.ts`** (`resolveOutcome`, гілка `withSave && def.resolution.kind === "save"`). Імпорти: `findParticipant, replaceParticipant, withSelf` з participants; `import { resolveSave } from "@/lib/utils/battle/saves/legendary";`. Блок від `const r = rollSave(…)` до `if (factor === 0) return SKIPPED;` замінити на:

```ts
    const r = rollSave({ target, ability: saveAbility, dc, participants: flow.ps, rules: flow.ctx.rules, rng: state.rng, presetRoll: state.saveRolls.find((s) => s.participantId === id)?.roll, vsSpell: true });

    // союзник кастера сам хоче провалити корисне заклинання — опір не витрачається
    const resisted = target.basicInfo.side !== state.caster.basicInfo.side ? resolveSave(target, r) : { result: r, participant: target, message: null };

    if (resisted.message) flow.ps = replaceParticipant(flow.ps, resisted.participant);

    const { roll, mod, bonus, total } = r;

    const { success } = resisted.result;

    state.saves.push({ participantId: id, ability: saveAbility, roll, result: success ? "success" : "fail", ...(r.mode !== "normal" && { mode: r.mode, rolls: r.rolls }), ...(r.autoFail && { autoFail: true }) });

    if (success) factor = onSuccess === "half" ? 0.5 : 0;

    const extra = (bonus ? `${bonus < 0 ? "-" : "+"}${Math.abs(bonus)}` : "");

    const note = r.autoFail ? " (автопровал)" : r.mode !== "normal" ? ` (${r.mode === "advantage" ? "перевага" : "недолік"}: ${r.rolls.join("/")})` : "";

    flow.messages.push(r.autoFail
      ? `🎲 ${target.basicInfo.name}: рятівний кидок проти СК ${dc} — автопровал`
      : `🎲 ${target.basicInfo.name}: рятівний кидок ${roll}${mod < 0 ? "-" : "+"}${Math.abs(mod)}${extra}=${total} проти СК ${dc}${note} — ${r.success ? (factor > 0 ? "успіх, половина шкоди" : "успіх") : "провал"}`);

    if (resisted.message) flow.messages.push(resisted.message);

    if (factor === 0) return SKIPPED;
```

- [ ] **Step 6: `concentration/index.ts`** (`concentrationCheck`). Імпорт `import { resolveSave } from "@/lib/utils/battle/saves/legendary";`. Рядки від `const save = rollSave(…)` до `if (save.success) return …` замінити на:

```ts
  const rolled = rollSave({ target: caster, ability: "constitution", dc, participants: ps, rules, rng });

  const { result: save, participant: resisted, message } = resolveSave(caster, rolled);

  const head = `🎲 ${caster.basicInfo.name}: концентрація — рятівний кидок ВИТ ${rolled.total} проти СК ${dc}`;

  if (save.success) return { participants: message ? replaceParticipant(ps, resisted) : ps, messages: [`${head} — утримує`, ...(message ? [message] : [])] };
```

- [ ] **Step 7: `grapple.ts`.** Імпорт `import { resolveSave, rollSave } from "@/lib/utils/battle/saves";` (замість лише `rollSave`). `contest`:

```ts
export function contest(input: { attacker: BattleParticipant; target: BattleParticipant } & RollInput): { success: boolean; message: string; participants: BattleParticipant[] } {
  const { attacker, target, participants, rules, rng } = input;

  if (rules.actions.variant === "2024") {
    const ability = target.abilities.modifiers.dexterity > target.abilities.modifiers.strength ? "dexterity" : "strength";

    const dc = grappleDc(attacker);

    const rolled = rollSave({ target, ability, dc, participants, rules, rng });

    const { result, participant, message } = resolveSave(target, rolled);

    return {
      success: !result.success,
      message: `🎲 СК ${dc}, ${target.basicInfo.name} кидає ${rolled.total}${message ? `; ${message}` : ""}`,
      participants: message ? replaceParticipant(participants, participant) : participants,
    };
  }

  const mine = rollCheck({ actor: attacker, subject: { skill: "athletics" }, participants, rules, rng });

  const theirs = rollCheck({ actor: target, subject: { skill: bestSkill(target, participants, rules) }, participants, rules, rng });

  return { success: mine.total > theirs.total, message: `🎲 ${mine.total} проти ${theirs.total}`, participants };
}
```

  У `runGrapple` і `runShove` у рядку `if (!check.success) return { participants, message: … }` замінити `participants` на `participants: check.participants`.

- [ ] **Step 8: `fire-burst.ts`.** Імпорти: `import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";`, `import { resolveSave } from "@/lib/utils/battle/saves/legendary";`. Від `const notes = new Map…` до кінця функції:

```ts
  const notes = new Map<string, string>();

  let next = ps;

  const resisted: string[] = [];

  const hits = targets.map((t) => {
    const rolled = rollSave({ target: t, ability: "dexterity", dc, participants: ps, rules: input.rules, rng: input.rng });

    const { result, participant, message } = resolveSave(t, rolled);

    if (message) {
      next = replaceParticipant(next, participant);
      resisted.push(message);
    }

    notes.set(t.basicInfo.id, ` (Спритність ${rolled.total} проти СК ${dc}${result.success ? " — половина" : ""})`);

    return { targetId: t.basicInfo.id, amount: result.success ? Math.floor(full / 2) : full };
  });

  return strikeAll(maneuverResult(next, resisted), hits, { actorId: actor.basicInfo.id, damageType: "fire", name: input.name, rules: input.rules, rng: input.rng, note: (id) => notes.get(id) ?? "" });
```

- [ ] **Step 9:** `pnpm test:run lib/utils/battle/saves/__tests__/legendary-resistance.test.ts` + `pnpm test:related lib/utils/battle/saves/save-ends.ts lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/concentration/index.ts lib/utils/battle/actions/grapple.ts lib/utils/battle/maneuvers/fire-burst.ts` — PASS.
- [ ] **Step 10: Commit**

```bash
git add lib/utils/battle/saves lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/concentration/index.ts lib/utils/battle/actions/grapple.ts lib/utils/battle/maneuvers/fire-burst.ts
git commit -m "feat(constructor): 4e legendary resistance on failed saves

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Обмеження `legendaryCost`, підказка лігва, приховування в ході

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts` (`LimitsSchema`, `superRefine` у `AbilitySchema`), `lib/utils/abilities/registry/labels.ts` (`limitsLabel`), `components/abilities/sections/LimitsSection.tsx`, `components/abilities/sections/TriggerSection.tsx`, `lib/utils/battle/view/hero.ts` (`abilityOptions`), `lib/utils/battle/pipeline/ability-use.ts` (`runAbilityUse`)
- Test: `lib/utils/abilities/__tests__/legendary-cost.test.ts`, `app/api/__tests__/battles/ability-action-legendary.test.ts`

**Interfaces — Produces:**

```ts
// lib/utils/abilities/schema/ability.ts
LimitsSchema += legendaryCost: z.number().int().min(1).max(3).optional()
// Limits["legendaryCost"]?: number — вміння з ним використовується лише як легендарна дія (задача 6), лише з trigger "action" і без aim
```

Дія лігва (спек §5) — без нового механізму: вміння з тригером `roundStart` і `limits.perRound: 1`; редактор показує підказку.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/abilities/__tests__/legendary-cost.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { limitsLabel } from "@/lib/utils/abilities/registry/labels";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { abilityOptions } from "@/lib/utils/battle/view";

const wing = { id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] };

describe("limits.legendaryCost", () => {
  it("дозволено лише для вміння-дії, 1–3, без aim", () => {
    expect(AbilitySchema.safeParse(wing).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...wing, trigger: { event: "bonusAction" } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, limits: { legendaryCost: 4 } }).success).toBe(false);
    expect(AbilitySchema.safeParse({ ...wing, aim: { kind: "cell", range: 30 } }).success).toBe(false);
  });

  it("підпис ліміту", () => {
    expect(limitsLabel({ legendaryCost: 2 })).toEqual(["легендарна дія (2)"]);
  });

  it("у звичайному ході легендарне вміння приховане", () => {
    const normal = resolved({ id: "hit", name: "Удар", trigger: { event: "action" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const p = makeParticipant({ id: "d", abilities: [normal, resolved(wing as never)] });

    expect(abilityOptions(p, "action", 1).map((o) => o.ability.id)).toEqual(["hit"]);
  });
});
```

```ts
// app/api/__tests__/battles/ability-action-legendary.test.ts
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { abilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";

const wing = resolved({ id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const base = participant("hero", { controlledBy: "user-1" });

const hero = { ...base, battleData: { ...base.battleData, resolvedAbilities: [wing] } };

describe("ability-action: легендарне вміння", () => {
  it("не використовується звичайною дією", async () => {
    await expect(abilityActionMutation(context({ participants: [hero, goblin] }), { participantId: "hero", abilityKey: wing.key })).rejects.toMatchObject({ message: "Це вміння — легендарна дія, її використовують поза своїм ходом" });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/abilities/__tests__/legendary-cost.test.ts app/api/__tests__/battles/ability-action-legendary.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
  - `ability.ts`: у `LimitsSchema` останнім полем `legendaryCost: z.number().int().min(1).max(3).optional(),`. У `.superRefine((a, ctx) => { … })` після перевірки `aim` додати:

```ts
    if (a.limits?.legendaryCost !== undefined && (a.trigger.event !== "action" || a.aim)) {
      ctx.addIssue({ code: "custom", path: ["limits", "legendaryCost"], message: "Легендарна дія — лише для вміння-дії без прицілу на клітинку" });
    }
```

  - `labels.ts`, `limitsLabel`: у масив після рядка `chance` додати `l.legendaryCost ? \`легендарна дія (${l.legendaryCost})\` : null,`.
  - `LimitsSection.tsx`: у другий `grid` після блоку `isButton && (… maxTargets …)` додати

```tsx
        {ability.trigger.event === "action" && (
          <FieldRenderer meta={{ name: "legendaryCost", label: "Легендарна дія (вартість 1–3)", input: "number", optional: true }} path={`${path}.limits.legendaryCost`} value={ability.limits?.legendaryCost} onChange={(v) => set("legendaryCost", v)} />
        )}
```

  - `TriggerSection.tsx`: після `</div>` з `SelectField` (блок «Подія») додати

```tsx
      {ability.trigger.event === "roundStart" && <p className="text-xs text-muted-foreground">Дія лігва 5e: «Початок раунду» + ліміт «Разів за раунд» = 1.</p>}
```

  - `lib/utils/battle/view/hero.ts`, `abilityOptions`: фільтр `(a) => a.trigger.event === trigger && withinCountLimits(p, a)` → `(a) => a.trigger.event === trigger && !a.limits?.legendaryCost && withinCountLimits(p, a)`.
  - `lib/utils/battle/pipeline/ability-use.ts`, після `if (!ability) throw …`:

```ts
  if (ability.limits?.legendaryCost) throw new BattleRuleError("action_rejected", "Це вміння — легендарна дія, її використовують поза своїм ходом");
```

- [ ] **Step 4:** обидва тести + `pnpm test:related lib/utils/abilities/schema/ability.ts lib/utils/abilities/registry/labels.ts lib/utils/battle/view/hero.ts lib/utils/battle/pipeline/ability-use.ts components/abilities/sections/LimitsSection.tsx` — PASS (OpenAPI — див. Global Constraints).
- [ ] **Step 5: Commit**

```bash
git add lib/utils/abilities components/abilities lib/utils/battle/view/hero.ts lib/utils/battle/pipeline/ability-use.ts app/api/__tests__/battles/ability-action-legendary.test.ts
git commit -m "feat(constructor): 4e limits.legendaryCost and lair action hint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Легендарна дія (роут `core-action`)

**Files:**
- Modify: `types/battle.ts` (`LegendaryOption`), `lib/utils/battle/actions/schema.ts`, `lib/utils/battle/attack/server-attack.ts` (`ServerAttackLabel`, `LABELS`), `lib/utils/battle/turn/turn-state.ts` (`resetTurnState`), `app/api/campaigns/[id]/battles/[battleId]/core-action/route.ts`, `lib/api/battles.ts` (`CoreActionBody`)
- Create: `lib/utils/battle/actions/legendary-options.ts`, `lib/utils/battle/actions/legendary.ts`, `app/api/campaigns/[id]/battles/[battleId]/core-action/legendary-mutation.ts`
- Test: `lib/utils/battle/actions/__tests__/legendary-options.test.ts`, `app/api/__tests__/battles/legendary-mutation.test.ts`

**Interfaces:**
- Consumes: `LegendaryState` (задача 3), `limits.legendaryCost` (задача 5), `resolveServerAttack` (`lib/utils/battle/attack/server-attack.ts`), `runAbilities`, `applyAbilitySummons`, `abilityRunContext` (`lib/utils/battle/pipeline/ability-use.ts`), `assertAbilityTargets`, `abilityOnMap`.
- Produces:

```ts
// types/battle.ts
export type LegendaryOption = { kind: "attack"; attackIndex: number; targetId: string } | { kind: "ability"; abilityKey: string; targetIds?: string[] };

// lib/utils/battle/actions/schema.ts
export const legendaryActionSchema: z.ZodType<{ action: "legendary"; participantId: string; option: LegendaryOption }>;
export type LegendaryActionBody = z.infer<typeof legendaryActionSchema>;
export const coreActionRouteSchema; // z.union([coreActionSchema, legendaryActionSchema])

// lib/utils/battle/actions/legendary-options.ts (клієнтський)
export const legendaryCostOf: (a: ResolvedAbility) => number;              // 0 — не легендарне
export const legendaryAbilities: (p: BattleParticipant) => ResolvedAbility[];
export const hasLegendaryActions: (p: BattleParticipant) => boolean;       // legendary.actions > 0
export function legendaryBlocker(p: BattleParticipant, current: BattleParticipant | undefined, cost?: number): string | null;
export function spendLegendary(p: BattleParticipant, cost: number): BattleParticipant;
export function legendaryBadge(p: BattleParticipant): string | null;       // «Леґ. дії 2/3 · Леґ. опір 1»

// lib/utils/battle/actions/legendary.ts
export interface LegendaryAttackInput { participants: BattleParticipant[]; actorId: string; attackIndex: number; targetId: string; map: BattleMapConfig | null; rules: Ruleset; round: number; rng: () => number; battleId: string }
export function legendaryAttack(input: LegendaryAttackInput): { participants: BattleParticipant[]; action: BattleAction; attackName: string };

// app/.../core-action/legendary-mutation.ts
export function createLegendaryMutation(deps?: SummonDeps): (ctx: BattleMutationContext, body: LegendaryActionBody) => Promise<MutationResult>;
export const legendaryMutation: ReturnType<typeof createLegendaryMutation>;

// lib/api/battles.ts → CoreActionBody += | { action: "legendary"; participantId: string; option: LegendaryOption }
```

Правила: лише ДМ (інакше `BattleAccessError(403)`); не працює в хід самого монстра, для мертвого/непритомного/недієздатного/резервного — `BattleRuleError("action_rejected")`; не залежить від `rules.actions.enabled`. Атака коштує 1 (одна атака через `resolveServerAttack`, без мультиатаки), вміння — `limits.legendaryCost`. `actionsLeft` відновлюється в `resetTurnState` (початок ходу цього учасника).

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/actions/__tests__/legendary-options.test.ts
import { describe, expect, it } from "vitest";

import { makeEffect, makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { hasLegendaryActions, legendaryAbilities, legendaryBadge, legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import { resetTurnState } from "@/lib/utils/battle/turn/turn-state";
import type { BattleParticipant } from "@/types/battle";

const wing = resolved({ id: "wing", name: "Крила", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const dragon = (actionsLeft = 3, resistLeft = 1): BattleParticipant => {
  const p = makeParticipant({ id: "d", abilities: [wing] });

  return { ...p, battleData: { ...p.battleData, legendary: { actions: 3, actionsLeft, resistLeft } } };
};

const other = makeParticipant({ id: "o" });

describe("legendary options", () => {
  it("вартість і список легендарних вмінь", () => {
    expect(legendaryCostOf(wing)).toBe(2);
    expect(legendaryAbilities(dragon()).map((a) => a.id)).toEqual(["wing"]);
    expect(hasLegendaryActions(dragon())).toBe(true);
    expect(hasLegendaryActions(other)).toBe(false);
  });

  it("блокування: немає дій, свій хід, недієздатний, мертвий, резерв, бюджет", () => {
    expect(legendaryBlocker(other, undefined)).toBe("У учасника немає легендарних дій");
    expect(legendaryBlocker(dragon(), dragon())).toBe("Легендарна дія — лише поза своїм ходом");

    const stunned = { ...dragon(), battleData: { ...dragon().battleData, activeEffects: [makeEffect("s", { type: "condition", effects: [{ type: "incapacitated", value: 1 }] })] } };

    expect(legendaryBlocker(stunned, other)).toBe("Недієздатний учасник не може діяти");
    expect(legendaryBlocker({ ...dragon(), combatStats: { ...dragon().combatStats, currentHp: 0, status: "dead" } }, other)).toBe("Недієздатний учасник не може діяти");
    expect(legendaryBlocker({ ...dragon(), battleData: { ...dragon().battleData, reserved: true } }, other)).toBe("Недієздатний учасник не може діяти");
    expect(legendaryBlocker(dragon(1), other, 2)).toBe("Не вистачає легендарних дій (1 з 2)");
    expect(legendaryBlocker(dragon(), other, 2)).toBeNull();
  });

  it("витрата, підпис, відновлення лише на початку власного ходу", () => {
    const spent = spendLegendary(dragon(), 2);

    expect(spent.battleData.legendary?.actionsLeft).toBe(1);
    expect(legendaryBadge(spent)).toBe("Леґ. дії 1/3 · Леґ. опір 1");
    expect(legendaryBadge(other)).toBeNull();
    expect(resetTurnState(spent).legendary).toEqual({ actions: 3, actionsLeft: 3, resistLeft: 1 });
    expect(resetTurnState(other)).not.toHaveProperty("legendary");
  });
});
```

```ts
// app/api/__tests__/battles/legendary-mutation.test.ts
import { describe, expect, it } from "vitest";

import { context, hero, participant } from "./fixtures";

import { legendaryMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/core-action/legendary-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const wing = resolved({ id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const plain = resolved({ id: "bite", name: "Укус", trigger: { event: "action" }, effects: [{ kind: "changeMorale", delta: 1 }] });

const dragonOf = (over: Partial<BattleParticipant["battleData"]> = {}, stats: Partial<BattleParticipant["combatStats"]> = {}): BattleParticipant => {
  const p = participant("dragon", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Дракон", sourceType: "unit" });

  return {
    ...p,
    combatStats: { ...p.combatStats, ...stats },
    battleData: {
      ...p.battleData,
      attacks: [{ id: "tail", name: "Хвіст", type: AttackType.MELEE, attackBonus: 30, damageDice: "1d6", damageType: "bludgeoning" }],
      resolvedAbilities: [wing, plain],
      legendary: { actions: 3, actionsLeft: 3, resistLeft: 0 },
      ...over,
    },
  };
};

const dm = (dragon: BattleParticipant, turnIndex = 0) => context({ participants: [hero, dragon], isDM: true, userId: "dm", rng: () => 0.5, scene: { ...context().scene, turnIndex } });

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const attack = { action: "legendary" as const, participantId: "dragon", option: { kind: "attack" as const, attackIndex: 0, targetId: "hero" } };

const ability = (abilityKey: string) => ({ action: "legendary" as const, participantId: "dragon", option: { kind: "ability" as const, abilityKey } });

describe("legendary mutation", () => {
  it("атака поза ходом: −1 дія, подія легендарної дії й атаки; правила дій 5e не потрібні", async () => {
    const out = await legendaryMutation(dm(dragonOf()), attack);

    expect(find(out.participants, "dragon").battleData.legendary?.actionsLeft).toBe(2);
    expect(out.events).toHaveLength(2);
    expect(out.events[0].resultText).toBe("👑 Дракон: легендарна дія — Хвіст (2/3)");
    expect(find(out.participants, "hero").combatStats.currentHp).toBeLessThan(20);
  });

  it("вміння коштує legendaryCost і рахує використання", async () => {
    const out = await legendaryMutation(dm(dragonOf()), ability(wing.key));

    const d = find(out.participants, "dragon");

    expect(d.battleData.legendary?.actionsLeft).toBe(1);
    expect(d.combatStats.morale).toBe(1);
    expect(d.battleData.abilityUsage?.[wing.key].battle).toBe(1);
  });

  it("звичайне вміння легендарною дією не використовується", async () => {
    await expect(legendaryMutation(dm(dragonOf()), ability(plain.key))).rejects.toMatchObject({ message: "У учасника немає такої легендарної дії" });
  });

  it("свій хід, бюджет, мертвий, атака по союзнику — відмова без змін", async () => {
    await expect(legendaryMutation(dm(dragonOf(), 1), attack)).rejects.toMatchObject({ message: "Легендарна дія — лише поза своїм ходом" });
    await expect(legendaryMutation(dm(dragonOf({ legendary: { actions: 3, actionsLeft: 1, resistLeft: 0 } })), ability(wing.key))).rejects.toMatchObject({ message: "Не вистачає легендарних дій (1 з 2)" });
    await expect(legendaryMutation(dm(dragonOf({}, { currentHp: 0, status: "dead" })), attack)).rejects.toMatchObject({ message: "Недієздатний учасник не може діяти" });

    const ally = participant("imp", { side: ParticipantSide.ENEMY, controlledBy: "dm" });

    const ctx = context({ participants: [hero, dragonOf(), ally], isDM: true, userId: "dm", rng: () => 0.5 });

    await expect(legendaryMutation(ctx, { ...attack, option: { ...attack.option, targetId: "imp" } })).rejects.toMatchObject({ message: "Ціллю має бути живий ворог" });
  });

  it("гравець — 403", async () => {
    await expect(legendaryMutation(context({ participants: [hero, dragonOf()] }), attack)).rejects.toBeInstanceOf(BattleAccessError);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/actions/__tests__/legendary-options.test.ts app/api/__tests__/battles/legendary-mutation.test.ts` — FAIL.
- [ ] **Step 3: Types, schema, label, turn reset.**
  - `types/battle.ts` (поруч з `LegendaryState`): `export type LegendaryOption = { kind: "attack"; attackIndex: number; targetId: string } | { kind: "ability"; abilityKey: string; targetIds?: string[] };`
  - `lib/utils/battle/actions/schema.ts`, після `CoreActionBody`:

```ts
const legendaryOptionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attack"), attackIndex: z.number().int().min(0).max(50), targetId: id }),
  z.object({ kind: z.literal("ability"), abilityKey: id, targetIds: z.array(id).max(20).optional() }),
]);

export const legendaryActionSchema = z.object({ action: z.literal("legendary"), participantId: id, option: legendaryOptionSchema });

export type LegendaryActionBody = z.infer<typeof legendaryActionSchema>;

export const coreActionRouteSchema = z.union([coreActionSchema, legendaryActionSchema]);
```

  - `server-attack.ts`: `export type ServerAttackLabel = "retaliation" | "opportunity" | "readied" | "legendary";` і в `LABELS` → `legendary: { title: "Легендарна дія", noun: "легендарна атака" },`.
  - `turn-state.ts`, у повернутий об'єкт `resetTurnState` останнім рядком: `...(p.battleData.legendary && { legendary: { ...p.battleData.legendary, actionsLeft: p.battleData.legendary.actions } }),`.
- [ ] **Step 4: Pure helpers.**

```ts
// lib/utils/battle/actions/legendary-options.ts
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export const legendaryCostOf = (a: ResolvedAbility): number => a.limits?.legendaryCost ?? 0;

export const legendaryAbilities = (p: BattleParticipant): ResolvedAbility[] => (p.battleData.resolvedAbilities ?? []).filter((a) => legendaryCostOf(a) > 0);

export const hasLegendaryActions = (p: BattleParticipant): boolean => (p.battleData.legendary?.actions ?? 0) > 0;

export function legendaryBlocker(p: BattleParticipant, current: BattleParticipant | undefined, cost = 1): string | null {
  const legendary = p.battleData.legendary;

  if (!legendary || legendary.actions <= 0) return "У учасника немає легендарних дій";

  if (current?.basicInfo.id === p.basicInfo.id) return "Легендарна дія — лише поза своїм ходом";

  if (!isActive(p) || hasCondition(p, "incapacitated") || p.battleData.reserved) return "Недієздатний учасник не може діяти";

  return legendary.actionsLeft < cost ? `Не вистачає легендарних дій (${legendary.actionsLeft} з ${cost})` : null;
}

export function spendLegendary(p: BattleParticipant, cost: number): BattleParticipant {
  const legendary = p.battleData.legendary;

  if (!legendary) return p;

  return { ...p, battleData: { ...p.battleData, legendary: { ...legendary, actionsLeft: Math.max(0, legendary.actionsLeft - cost) } } };
}

export function legendaryBadge(p: BattleParticipant): string | null {
  const l = p.battleData.legendary;

  if (!l) return null;

  const parts = [l.actions > 0 ? `Леґ. дії ${l.actionsLeft}/${l.actions}` : null, l.resistLeft > 0 ? `Леґ. опір ${l.resistLeft}` : null].filter((x): x is string => !!x);

  return parts.length > 0 ? parts.join(" · ") : null;
}
```

```ts
// lib/utils/battle/actions/legendary.ts
import { reject } from "./errors";

import { findParticipant, isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import { assertAttackAllowed } from "@/lib/utils/battle/attack-phase/request";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface LegendaryAttackInput {
  participants: BattleParticipant[];
  actorId: string;
  attackIndex: number;
  targetId: string;
  map: BattleMapConfig | null;
  rules: Ruleset;
  round: number;
  rng: () => number;
  battleId: string;
}

export function legendaryAttack(input: LegendaryAttackInput): { participants: BattleParticipant[]; action: BattleAction; attackName: string } {
  const { participants, actorId, targetId, map, rules, round, rng, battleId } = input;

  const actor = findParticipant(participants, actorId) ?? reject("Учасника немає в бою");

  const attack = actor.battleData.attacks[input.attackIndex] ?? reject("У учасника немає такої атаки");

  if (attack.hand === "off" || getDisabledAttackKinds(actor)[attackKindOf(attack.type)]) return reject("Ця атака зараз недоступна");

  const target = findParticipant(participants, targetId);

  if (!target || target.basicInfo.side === actor.basicInfo.side || !isAttackable(target) || target.battleData.reserved) return reject("Ціллю має бути живий ворог");

  assertAttackAllowed(actor, attack, [target]);

  const reach = attackReachError(map, participants, actor, attack, [target]);

  if (reach) return reject(reach);

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map, rules } };

  const { battleAction } = resolveServerAttack({ flow, attackerId: actorId, targetId, attack, currentRound: round, battleId, rng, label: "legendary" });

  return { participants: flow.ps, action: battleAction, attackName: attack.name };
}
```

- [ ] **Step 5: Mutation і роут.**

```ts
// app/api/campaigns/[id]/battles/[battleId]/core-action/legendary-mutation.ts
import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { cooldownLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { legendaryAttack } from "@/lib/utils/battle/actions/legendary";
import { legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import type { LegendaryActionBody } from "@/lib/utils/battle/actions/schema";
import { abilityRunContext } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";
import { abilityOnMap } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

function assertCanAct(ctx: BattleMutationContext, actor: BattleParticipant, cost: number): void {
  const blocker = legendaryBlocker(actor, ctx.participants[ctx.scene.turnIndex], cost);

  if (blocker) throw new BattleRuleError("action_rejected", blocker);
}

const counter = (p: BattleParticipant) => `${p.battleData.legendary?.actionsLeft ?? 0}/${p.battleData.legendary?.actions ?? 0}`;

export function createLegendaryMutation(deps: SummonDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, body: LegendaryActionBody): Promise<MutationResult> => {
    if (!ctx.isDM) throw new BattleAccessError(403, "Легендарні дії — лише для ДМ");

    const actor = findParticipant(ctx.participants, body.participantId);

    if (!actor) throw new BattleAccessError(404, "Учасника немає в бою");

    const id = actor.basicInfo.id;

    const round = ctx.scene.round;

    const name = actor.basicInfo.name;

    const { option } = body;

    if (option.kind === "attack") {
      assertCanAct(ctx, actor, 1);

      const out = legendaryAttack({ participants: ctx.participants, actorId: id, attackIndex: option.attackIndex, targetId: option.targetId, map: ctx.meta.map, rules: ctx.meta.rules, round, rng: ctx.rng ?? Math.random, battleId: ctx.scene.id });

      const participants = updateParticipant(out.participants, id, (p) => spendLegendary(p, 1));

      const after = findParticipant(participants, id) ?? actor;

      return { participants, pending: ctx.pending, events: [systemEvent(round, `👑 ${name}: легендарна дія — ${out.attackName} (${counter(after)})`), battleActionToEvent(out.action)] };
    }

    const ability = (actor.battleData.resolvedAbilities ?? []).find((a) => a.key === option.abilityKey && legendaryCostOf(a) > 0);

    if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такої легендарної дії");

    const cost = legendaryCostOf(ability);

    assertCanAct(ctx, actor, cost);

    if (!withinCountLimits(actor, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

    const wait = cooldownLeft(actor, ability, round);

    if (wait > 0) throw new BattleRuleError("ability_limit", `Перезарядка: ще ${wait} р.`);

    const targetIds = assertAbilityTargets(ability, ctx.participants, option.targetIds ?? [], { owner: actor, onMap: abilityOnMap(ctx.meta.map, actor) });

    const run = runAbilities(ctx.participants, { type: "action", actorId: id, abilityKey: ability.key, targetIds }, abilityRunContext(ctx));

    const summoned = await applyAbilitySummons(run.summons, run.participants, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng: ctx.rng ?? Math.random, rules: ctx.meta.rules, deps });

    const participants = updateParticipant(summoned.order, id, (p) => spendLegendary(p, cost));

    const after = findParticipant(participants, id) ?? actor;

    const text = run.fired.length ? [...run.messages, ...summoned.messages].join(" | ") : `${ability.name}: не спрацювало`;

    return {
      participants,
      pending: ctx.pending,
      events: [
        {
          type: "ability",
          round,
          actorId: id,
          resultText: `👑 ${name}: легендарна дія «${ability.name}» (${counter(after)}) — ${text}`,
          details: { actorName: name, actorSide: actor.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name } },
        },
      ],
    };
  };
}

export const legendaryMutation = createLegendaryMutation();
```

```ts
// app/api/campaigns/[id]/battles/[battleId]/core-action/route.ts
import { coreActionMutation } from "./core-action-mutation";
import { legendaryMutation } from "./legendary-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { coreActionRouteSchema } from "@/lib/utils/battle/actions/schema";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: BattleStatus.ACTIVE,
    blockedByMode: true,
    schema: coreActionRouteSchema,
    mutate: (ctx, body) => (body.action === "legendary" ? legendaryMutation(ctx, body) : coreActionMutation(ctx, body)),
  });
}
```

  `lib/api/battles.ts`: `import type { …, LegendaryOption } from "@/types/battle";` (додати до наявного імпорту типів з `@/types/battle` або окремим рядком) і в `CoreActionBody` четвертий варіант `| { action: "legendary"; participantId: string; option: LegendaryOption }`.

- [ ] **Step 6:** обидва тести + `pnpm test:related lib/utils/battle/turn/turn-state.ts lib/utils/battle/attack/server-attack.ts lib/utils/battle/actions/schema.ts "app/api/campaigns/[id]/battles/[battleId]/core-action/route.ts"` — PASS (наявний `core-action-mutation.test.ts` без змін).
- [ ] **Step 7: Commit**

```bash
git add types/battle.ts lib/utils/battle/actions lib/utils/battle/attack/server-attack.ts lib/utils/battle/turn/turn-state.ts "app/api/campaigns/[id]/battles/[battleId]/core-action" lib/api/battles.ts app/api/__tests__/battles/legendary-mutation.test.ts
git commit -m "feat(constructor): 4e legendary actions off-turn via core-action

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Бюджет XP (чистий модуль)

**Files:**
- Create: `lib/utils/battle/balance/xp-budget.ts`
- Modify: `lib/utils/battle/balance/setup.ts` (нова `setupXpBudget`)
- Test: `lib/utils/battle/balance/__tests__/xp-budget.test.ts`

**Interfaces:**
- Consumes: `SetupBalanceParticipant`, `SetupBalanceStats` (`setup.ts`); `PartyMember.level` (уже є в `characterStats` з `getBalancePayload`); `UnitStats.xp` (задача 3).
- Produces:

```ts
// lib/utils/battle/balance/xp-budget.ts (клієнтський)
export type XpEdition = "2014" | "2024";
export const XP_DIFFICULTIES: { "2014": readonly ["easy", "medium", "hard", "deadly"]; "2024": readonly ["low", "moderate", "high"] };
export type XpDifficulty = "easy" | "medium" | "hard" | "deadly" | "low" | "moderate" | "high";
export type XpVerdict = XpDifficulty | "trivial";
export const XP_DIFFICULTY_LABELS: Record<XpVerdict, string>;
export const DEFAULT_XP_DIFFICULTY: { "2014": "medium"; "2024": "moderate" };
export function isXpDifficultyOf(edition: XpEdition, v: string | null | undefined): v is XpDifficulty;
export function partyThresholds(edition: XpEdition, heroLevels: number[]): Partial<Record<XpDifficulty, number>>;
export function encounterMultiplier(monsters: number, partySize: number): number;
export interface XpEnemy { unitId: string; quantity: number; xp: number | null }
export interface XpBudgetResult { edition: XpEdition; enemyXp: number; adjustedXp: number; multiplier: number; thresholds: Partial<Record<XpDifficulty, number>>; difficulty: XpVerdict; missingCr: string[] }
export function computeXpBudget(input: { edition: XpEdition; heroLevels: number[]; enemies: XpEnemy[] }): XpBudgetResult;
export interface XpCandidate { unitId: string; xp?: number; raceId: string | null; summon?: boolean }
export function pickXpRoster(input: { edition: XpEdition; heroLevels: number[]; library: XpCandidate[]; difficulty: XpDifficulty; raceId?: string | null; maxQuantity?: number }): { unitId: string; quantity: number } | null;

// lib/utils/battle/balance/setup.ts
export function setupXpBudget(participants: SetupBalanceParticipant[], stats: SetupBalanceStats, edition: XpEdition): XpBudgetResult | null;  // null — немає героїв-союзників або юнітів-ворогів
```

Підбір (`pickXpRoster`): один вид юніта з XP (без призваних, з фільтром раси), кількість 1–`maxQuantity` (10); ціль — поріг обраної складності, верхня межа — наступний поріг (для найвищої — ×1.5, не включно). Спершу варіанти в смузі `[ціль, межа)` з найменшим надлишком; якщо таких немає — найближчий знизу. Нічия — менша кількість, далі менший `unitId`.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/balance/__tests__/xp-budget.test.ts
import { describe, expect, it } from "vitest";

import { setupXpBudget } from "@/lib/utils/battle/balance/setup";
import { computeXpBudget, encounterMultiplier, isXpDifficultyOf, partyThresholds, pickXpRoster } from "@/lib/utils/battle/balance/xp-budget";

const party = (n: number, level: number) => Array.from({ length: n }, () => level);

describe("пороги", () => {
  it("2014 (DMG): легкий / середній / складний / смертельний на героя", () => {
    expect(partyThresholds("2014", [1])).toEqual({ easy: 25, medium: 50, hard: 75, deadly: 100 });
    expect(partyThresholds("2014", [5])).toEqual({ easy: 250, medium: 500, hard: 750, deadly: 1100 });
    expect(partyThresholds("2014", [11])).toEqual({ easy: 800, medium: 1600, hard: 2400, deadly: 3600 });
    expect(partyThresholds("2014", [20])).toEqual({ easy: 2800, medium: 5700, hard: 8500, deadly: 12700 });
    expect(partyThresholds("2014", party(4, 3))).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 });
  });

  it("2024 (DMG): низька / помірна / висока на героя; рівень обрізається до 1–20", () => {
    expect(partyThresholds("2024", [1])).toEqual({ low: 50, moderate: 75, high: 100 });
    expect(partyThresholds("2024", [10])).toEqual({ low: 1600, moderate: 2300, high: 3100 });
    expect(partyThresholds("2024", [20])).toEqual({ low: 6400, moderate: 13200, high: 22000 });
    expect(partyThresholds("2024", [0, 25])).toEqual({ low: 6450, moderate: 13275, high: 22100 });
  });
});

describe("множник кількості 2014", () => {
  it("група 3–5", () => {
    expect([1, 2, 3, 6, 7, 10, 11, 14, 15, 30].map((m) => encounterMultiplier(m, 4))).toEqual([1, 1.5, 2, 2, 2.5, 2.5, 3, 3, 4, 4]);
  });

  it("група < 3 — крок вгору, ≥ 6 — крок вниз", () => {
    expect([1, 2, 15].map((m) => encounterMultiplier(m, 2))).toEqual([1.5, 2, 5]);
    expect([1, 2, 15].map((m) => encounterMultiplier(m, 6))).toEqual([0.5, 1, 3]);
  });
});

describe("computeXpBudget", () => {
  const ogres = { unitId: "ogre", quantity: 2, xp: 450 };

  it("2014: XP × множник, найвищий досягнутий поріг", () => {
    expect(computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [ogres] })).toEqual({
      edition: "2014", enemyXp: 900, adjustedXp: 1350, multiplier: 1.5, thresholds: { easy: 300, medium: 600, hard: 900, deadly: 1600 }, difficulty: "hard", missingCr: [],
    });
  });

  it("2024: без множника", () => {
    const r = computeXpBudget({ edition: "2024", heroLevels: party(4, 3), enemies: [ogres] });

    expect(r).toMatchObject({ enemyXp: 900, adjustedXp: 900, multiplier: 1, difficulty: "moderate" });
  });

  it("мала група підвищує складність; нижче першого порогу — дрібниця", () => {
    expect(computeXpBudget({ edition: "2014", heroLevels: party(2, 3), enemies: [{ unitId: "ogre", quantity: 1, xp: 450 }] }).difficulty).toBe("hard");
    expect(computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [{ unitId: "wolf", quantity: 1, xp: 50 }] }).difficulty).toBe("trivial");
  });

  it("юніти без CR — у missingCr, не впливають на XP і множник", () => {
    const r = computeXpBudget({ edition: "2014", heroLevels: party(4, 3), enemies: [{ unitId: "homm", quantity: 5, xp: null }, { unitId: "ogre", quantity: 1, xp: 450 }] });

    expect(r).toMatchObject({ enemyXp: 450, multiplier: 1, adjustedXp: 450, difficulty: "easy", missingCr: ["homm"] });
    expect(computeXpBudget({ edition: "2024", heroLevels: [3], enemies: [{ unitId: "homm", quantity: 1, xp: null }] }).difficulty).toBe("trivial");
  });

  it("складність для редакції", () => {
    expect(isXpDifficultyOf("2014", "deadly")).toBe(true);
    expect(isXpDifficultyOf("2014", "low")).toBe(false);
    expect(isXpDifficultyOf("2024", "moderate")).toBe(true);
    expect(isXpDifficultyOf("2024", undefined)).toBe(false);
  });
});

describe("pickXpRoster", () => {
  const library = [
    { unitId: "wolf", xp: 50, raceId: null },
    { unitId: "ogre", xp: 450, raceId: "giants" },
    { unitId: "homm", raceId: null },
    { unitId: "phoenix", xp: 3900, raceId: null, summon: true },
  ];

  it("2014: точне попадання в поріг (вовки ×6 = 300 × 2 = 600)", () => {
    expect(pickXpRoster({ edition: "2014", heroLevels: party(4, 3), library, difficulty: "medium" })).toEqual({ unitId: "wolf", quantity: 6 });
  });

  it("2024: нічия — менша кількість", () => {
    const lib = [{ unitId: "goblin", xp: 50, raceId: null }, { unitId: "orc", xp: 100, raceId: null }];

    expect(pickXpRoster({ edition: "2024", heroLevels: party(4, 1), library: lib, difficulty: "moderate" })).toEqual({ unitId: "orc", quantity: 3 });
  });

  it("фільтр раси, без героїв — null", () => {
    expect(pickXpRoster({ edition: "2014", heroLevels: party(4, 3), library, difficulty: "medium", raceId: "giants" })).toEqual({ unitId: "ogre", quantity: 1 });
    expect(pickXpRoster({ edition: "2014", heroLevels: [], library, difficulty: "medium" })).toBeNull();
  });
});

describe("setupXpBudget", () => {
  const stats = {
    characterStats: { h1: { dpr: 10, hp: 30, level: 3 }, h2: { dpr: 10, hp: 30, level: 3 }, npc: { dpr: 10, hp: 30, level: 9 } },
    unitStats: {
      ogre: { dpr: 9, hp: 60, kpi: 0.15, name: "Огр", level: 3, raceId: null, xp: 450 },
      gob: { dpr: 3, hp: 7, kpi: 0.4, name: "Гоблін", level: 1, raceId: null },
    },
  };

  it("герої-союзники дають рівні, вороги-юніти — XP; NPC-вороги ігноруються", () => {
    const r = setupXpBudget(
      [
        { id: "h1", type: "character", side: "ally" },
        { id: "h2", type: "character", side: "ally" },
        { id: "npc", type: "character", side: "enemy" },
        { id: "ogre", type: "unit", side: "enemy", quantity: 1 },
        { id: "gob", type: "unit", side: "enemy", quantity: 3 },
      ],
      stats,
      "2014",
    );

    expect(r).toMatchObject({ enemyXp: 450, multiplier: 1.5, adjustedXp: 675, thresholds: { easy: 150, medium: 300, hard: 450, deadly: 800 }, difficulty: "hard", missingCr: ["gob"] });
  });

  it("немає героїв або ворогів — null", () => {
    expect(setupXpBudget([{ id: "ogre", type: "unit", side: "enemy" }], stats, "2014")).toBeNull();
    expect(setupXpBudget([{ id: "h1", type: "character", side: "ally" }], stats, "2014")).toBeNull();
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/balance/__tests__/xp-budget.test.ts` — FAIL (модуля немає).
- [ ] **Step 3: Implement.**

```ts
// lib/utils/battle/balance/xp-budget.ts
export type XpEdition = "2014" | "2024";

export const XP_DIFFICULTIES = { "2014": ["easy", "medium", "hard", "deadly"], "2024": ["low", "moderate", "high"] } as const;

export type XpDifficulty = (typeof XP_DIFFICULTIES)[XpEdition][number];

export type XpVerdict = XpDifficulty | "trivial";

export const XP_DIFFICULTY_LABELS: Record<XpVerdict, string> = {
  trivial: "Дрібниця",
  easy: "Легка",
  medium: "Середня",
  hard: "Складна",
  deadly: "Смертельна",
  low: "Низька",
  moderate: "Помірна",
  high: "Висока",
};

export const DEFAULT_XP_DIFFICULTY = { "2014": "medium", "2024": "moderate" } as const satisfies Record<XpEdition, XpDifficulty>;

// DMG 2014: пороги XP на героя — легкий, середній, складний, смертельний
const THRESHOLDS_2014: Record<number, readonly number[]> = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

// DMG 2024: бюджет XP на героя — низька, помірна, висока
const BUDGET_2024: Record<number, readonly number[]> = {
  1: [50, 75, 100],
  2: [100, 150, 200],
  3: [150, 225, 400],
  4: [250, 375, 500],
  5: [500, 750, 1100],
  6: [600, 1000, 1400],
  7: [750, 1300, 1700],
  8: [1000, 1700, 2100],
  9: [1300, 2000, 2600],
  10: [1600, 2300, 3100],
  11: [1900, 2900, 4100],
  12: [2200, 3700, 4700],
  13: [2600, 4200, 5400],
  14: [2900, 4900, 6200],
  15: [3300, 5400, 7800],
  16: [3800, 6100, 9800],
  17: [4500, 7200, 11700],
  18: [5000, 8700, 14200],
  19: [5500, 10700, 17200],
  20: [6400, 13200, 22000],
};

const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

const clampLevel = (level: number) => Math.min(20, Math.max(1, Math.round(level)));

const orderOf = (edition: XpEdition): readonly XpDifficulty[] => XP_DIFFICULTIES[edition];

export function isXpDifficultyOf(edition: XpEdition, v: string | null | undefined): v is XpDifficulty {
  return !!v && (orderOf(edition) as readonly string[]).includes(v);
}

export function partyThresholds(edition: XpEdition, heroLevels: number[]): Partial<Record<XpDifficulty, number>> {
  const keys = orderOf(edition);

  const table = edition === "2014" ? THRESHOLDS_2014 : BUDGET_2024;

  const sums = keys.map((_, i) => heroLevels.reduce((sum, level) => sum + table[clampLevel(level)][i], 0));

  return Object.fromEntries(keys.map((k, i) => [k, sums[i]]));
}

export function encounterMultiplier(monsters: number, partySize: number): number {
  if (monsters <= 0) return 1;

  const base = monsters === 1 ? 1 : monsters === 2 ? 2 : monsters <= 6 ? 3 : monsters <= 10 ? 4 : monsters <= 14 ? 5 : 6;

  const step = partySize < 3 ? 1 : partySize >= 6 ? -1 : 0;

  return MULTIPLIERS[Math.min(MULTIPLIERS.length - 1, Math.max(0, base + step))];
}

export interface XpEnemy {
  unitId: string;
  quantity: number;
  xp: number | null;
}

export interface XpBudgetResult {
  edition: XpEdition;
  enemyXp: number;
  adjustedXp: number;
  multiplier: number;
  thresholds: Partial<Record<XpDifficulty, number>>;
  difficulty: XpVerdict;
  missingCr: string[];
}

export function computeXpBudget({ edition, heroLevels, enemies }: { edition: XpEdition; heroLevels: number[]; enemies: XpEnemy[] }): XpBudgetResult {
  const counted = enemies.filter((e) => e.xp !== null && e.quantity > 0);

  const missingCr = [...new Set(enemies.filter((e) => e.xp === null).map((e) => e.unitId))];

  const enemyXp = counted.reduce((sum, e) => sum + (e.xp ?? 0) * e.quantity, 0);

  const monsters = counted.reduce((sum, e) => sum + e.quantity, 0);

  const multiplier = edition === "2014" ? encounterMultiplier(monsters, heroLevels.length) : 1;

  const adjustedXp = Math.round(enemyXp * multiplier);

  const thresholds = partyThresholds(edition, heroLevels);

  const reached = orderOf(edition).filter((k) => (thresholds[k] ?? 0) > 0 && adjustedXp >= (thresholds[k] ?? 0));

  return { edition, enemyXp, adjustedXp, multiplier, thresholds, difficulty: reached.at(-1) ?? "trivial", missingCr };
}

export interface XpCandidate {
  unitId: string;
  xp?: number;
  raceId: string | null;
  summon?: boolean;
}

export function pickXpRoster(input: { edition: XpEdition; heroLevels: number[]; library: XpCandidate[]; difficulty: XpDifficulty; raceId?: string | null; maxQuantity?: number }): { unitId: string; quantity: number } | null {
  const { edition, heroLevels, library, difficulty, raceId, maxQuantity = 10 } = input;

  const thresholds = partyThresholds(edition, heroLevels);

  const order = orderOf(edition);

  const target = thresholds[difficulty] ?? 0;

  if (target <= 0) return null;

  const next = order[order.indexOf(difficulty) + 1];

  const upper = next ? (thresholds[next] ?? Infinity) : target * 1.5;

  let best: { unitId: string; quantity: number; score: number } | null = null;

  for (const u of library) {
    if (!u.xp || u.summon || (raceId && u.raceId !== raceId)) continue;

    for (let quantity = 1; quantity <= maxQuantity; quantity += 1) {
      const adjusted = computeXpBudget({ edition, heroLevels, enemies: [{ unitId: u.unitId, quantity, xp: u.xp }] }).adjustedXp;

      if (adjusted >= upper) break;

      // варіанти в смузі [ціль, межа) завжди кращі за будь-який нижче цілі
      const score = adjusted >= target ? adjusted - target : upper + target - adjusted;

      const better = !best || score < best.score || (score === best.score && (quantity < best.quantity || (quantity === best.quantity && u.unitId < best.unitId)));

      if (better) best = { unitId: u.unitId, quantity, score };
    }
  }

  return best && { unitId: best.unitId, quantity: best.quantity };
}
```

`lib/utils/battle/balance/setup.ts`: імпорт `import { computeXpBudget, type XpBudgetResult, type XpEdition } from "./xp-budget";` і нова функція в кінці файлу:

```ts
/** Бюджет XP 5e над складом підготовки: рівні героїв-союзників і XP юнітів-ворогів. */
export function setupXpBudget(participants: SetupBalanceParticipant[], stats: SetupBalanceStats, edition: XpEdition): XpBudgetResult | null {
  const heroLevels = participants.flatMap((p) => (p.side === ParticipantSide.ALLY && p.type === ParticipantSourceType.CHARACTER && stats.characterStats[p.id] ? [stats.characterStats[p.id].level ?? 1] : []));

  const enemies = participants
    .filter((p) => p.side === ParticipantSide.ENEMY && p.type === ParticipantSourceType.UNIT)
    .map((p) => ({ unitId: p.id, quantity: p.quantity ?? 1, xp: stats.unitStats[p.id]?.xp ?? null }));

  if (heroLevels.length === 0 || enemies.length === 0) return null;

  return computeXpBudget({ edition, heroLevels, enemies });
}
```

- [ ] **Step 4:** `pnpm test:run lib/utils/battle/balance/__tests__/xp-budget.test.ts` + `pnpm test:related lib/utils/battle/balance/setup.ts` + `pnpm test:run lib/__tests__/client-entry-imports.test.ts` — PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle/balance/xp-budget.ts lib/utils/battle/balance/setup.ts lib/utils/battle/balance/__tests__/xp-budget.test.ts
git commit -m "feat(constructor): 4e XP budget 2014/2024 and XP roster pick

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Режим `xp` на сервері — автопідбір і старт бою без масштабу

**Files:**
- Modify: `app/api/campaigns/[id]/battles/balance/balance-schema.ts`, `app/api/campaigns/[id]/battles/balance/balance-post.ts`, `app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler.ts` (`buildStartOrder`), `types/battle-setup.ts` (`SuggestedEnemy.xp`, `BattleBalanceBody.xpDifficulty`)
- Test: `app/api/__tests__/balance-post-xp.test.ts`, `app/api/__tests__/battles/start-build-order-xp.test.ts`

**Interfaces:**
- Consumes: `pickXpRoster`, `DEFAULT_XP_DIFFICULTY`, `isXpDifficultyOf`, `XP_DIFFICULTIES` (задача 7); `rules.encounters` (задача 1); `UnitStats.xp` (задача 3).
- Produces:

```ts
// balance-schema.ts
xpDifficulty: z.enum(["easy", "medium", "hard", "deadly", "low", "moderate", "high"]).optional()
// types/battle-setup.ts
SuggestedEnemy.xp?: number;           // лише в режимі xp; hpMult/dmgMult тоді відсутні
BattleBalanceBody.xpDifficulty?: XpDifficulty;
```

У режимі `xp` автопідбір повертає один рядок (`pickXpRoster`) без множників; складність не з редакції → default редакції. Старт бою при `rules.encounters.balance === "xp"` не викликає `scaleEnemiesForFairBattle`.

- [ ] **Step 1: Failing tests**

```ts
// app/api/__tests__/balance-post-xp.test.ts
import { describe, expect, it, vi } from "vitest";

const DATA = vi.hoisted(() => {
  const hero = (id: string) => ({
    id, campaignId: "camp", type: "player", controlledBy: "u", name: id, level: 4, class: "Fighter", race: "Ельф",
    strength: 14, dexterity: 12, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 14, initiative: 1, speed: 30,
    maxHp: 40, currentHp: 40, spellSlots: {}, knownSpells: [], skillTreeProgress: {}, personalSkillId: null, immunities: [], morale: 0,
    maxTargets: 1, minTargets: 1, hpMultiplier: null, meleeMultiplier: null, rangedMultiplier: null, primaryAbility: null,
    inventory: { id: `inv-${id}`, characterId: id, equipped: {} },
  });

  const unit = (id: string, cr: number | null) => ({
    id, campaignId: "camp", name: id, raceId: null, level: 2, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 12, initiative: 0, speed: 30, maxHp: 20, proficiencyBonus: 2, attacks: [{ name: "Удар", attackBonus: 3, damageDice: "1d6", damageType: "slashing", type: "melee" }],
    knownSpells: [], avatar: null, immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
    cr, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [],
  });

  return { heroes: ["h1", "h2", "h3", "h4"].map(hero), units: [unit("wolf", 0.25), unit("ogre", 2), unit("homm", null)] };
});

vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method: string) => async () => {
        if (name === "character" && method === "findMany") return DATA.heroes;

        if (name === "unit" && method === "findMany") return DATA.units;

        if (name === "campaign") return { maxLevel: 20 };

        return method === "findMany" ? [] : null;
      },
    });

  return { prisma: new Proxy({}, { get: (_t, name: string) => model(name) }) };
});

import { postBalanceResponse } from "@/app/api/campaigns/[id]/battles/balance/balance-post";
import { balanceSchema } from "@/app/api/campaigns/[id]/battles/balance/balance-schema";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const allies = { characterIds: ["h1", "h2", "h3", "h4"], units: [] };

const XP: Ruleset = { ...DEFAULT_RULES, encounters: { balance: "xp", edition: "2014", autoXp: false } };

describe("POST balance: режим xp", () => {
  it("середня складність для 4 героїв 4 рівня (ціль 1000): вовки ×8 = 400 × 2.5", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true }), XP);

    expect(res.suggestedEnemies).toEqual([{ unitId: "wolf", name: "wolf", quantity: 8, dpr: expect.any(Number), hp: 20, totalDpr: expect.any(Number), totalHp: 160, xp: 50 }]);
  });

  it("складність не з редакції → default; смертельна (ціль 2000, смуга до 3000) → огри ×3 = 1350 × 2", async () => {
    const wrong = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true, xpDifficulty: "low" }), XP);

    expect(wrong.suggestedEnemies?.[0]).toMatchObject({ unitId: "wolf", quantity: 8 });

    const deadly = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true, xpDifficulty: "deadly" }), XP);

    expect(deadly.suggestedEnemies?.[0]).toMatchObject({ unitId: "ogre", quantity: 3, xp: 450 });
    expect(deadly.suggestedEnemies?.[0]).not.toHaveProperty("hpMult");
  });

  it("режим fair — підбір як раніше, з множниками", async () => {
    const res = await postBalanceResponse("camp", balanceSchema.parse({ allyParticipants: allies, suggest: true }), DEFAULT_RULES);

    expect(res.suggestedEnemies?.every((e) => e.hpMult !== undefined)).toBe(true);
  });
});
```

```ts
// app/api/__tests__/battles/start-build-order-xp.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fromCharacter: vi.fn(), fromUnit: vi.fn(), scale: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findMany: vi.fn(async () => [{ id: "h1" }]) },
    unit: { findMany: vi.fn(async () => [{ id: "u1" }]) },
  },
}));
vi.mock("@/app/api/campaigns/[id]/battles/[battleId]/start/start-build-context", () => ({
  buildCampaignContextForStart: vi.fn(async () => ({ campaignContext: {}, racesById: {} })),
}));
vi.mock("@/app/api/campaigns/[id]/battles/[battleId]/start/start-fair-scaling", () => ({ scaleEnemiesForFairBattle: mocks.scale }));
vi.mock("@/lib/utils/battle/participant", () => ({
  createBattleParticipantFromCharacter: mocks.fromCharacter,
  createBattleParticipantFromUnit: mocks.fromUnit,
}));

import { buildStartOrder } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler";
import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const setup = [
  { id: "h1", type: "character" as const, side: ParticipantSide.ALLY },
  { id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY, quantity: 1 },
];

describe("buildStartOrder: режим балансу", () => {
  beforeEach(() => {
    mocks.scale.mockReset();
    mocks.scale.mockImplementation(async (_c: string, _s: unknown, built: unknown) => built);
    mocks.fromCharacter.mockResolvedValue(makeParticipant({ id: "h1" }));
    mocks.fromUnit.mockResolvedValue(makeParticipant({ id: "w1", side: ParticipantSide.ENEMY }));
  });

  it("xp — без масштабування ворогів", async () => {
    await buildStartOrder("b1", "c1", setup, null, { ...DEFAULT_RULES, encounters: { balance: "xp", edition: "2014", autoXp: false } });

    expect(mocks.scale).not.toHaveBeenCalled();
  });

  it("fair — як раніше", async () => {
    await buildStartOrder("b1", "c1", setup, null, DEFAULT_RULES);

    expect(mocks.scale).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2:** `pnpm test:run app/api/__tests__/balance-post-xp.test.ts app/api/__tests__/battles/start-build-order-xp.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
  - `balance-schema.ts`: після `raceId` → `xpDifficulty: z.enum(["easy", "medium", "hard", "deadly", "low", "moderate", "high"]).optional(),`.
  - `types/battle-setup.ts`: `import type { XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";`; `SuggestedEnemy` += `xp?: number;`; `BattleBalanceBody` += `xpDifficulty?: XpDifficulty;`.
  - `balance-post.ts`: імпорти `import type { UnitStats } from "@/lib/utils/battle/balance";`, `import { DEFAULT_XP_DIFFICULTY, isXpDifficultyOf, pickXpRoster, type XpEdition } from "@/lib/utils/battle/balance/xp-budget";`. Нова функція над `postBalanceResponse`:

```ts
function xpSuggestion(heroLevels: number[], library: UnitStats[], data: BalancePostData, edition: XpEdition): SuggestedEnemy[] {
  const difficulty = isXpDifficultyOf(edition, data.xpDifficulty) ? data.xpDifficulty : DEFAULT_XP_DIFFICULTY[edition];

  const pick = pickXpRoster({ edition, heroLevels, library, difficulty, raceId: data.raceId });

  const u = pick && library.find((x) => x.unitId === pick.unitId);

  if (!pick || !u) return [];

  return [{ unitId: u.unitId, name: u.name, quantity: pick.quantity, dpr: u.dpr, hp: u.hp, totalDpr: round1(u.dpr * pick.quantity), totalHp: u.hp * pick.quantity, ...(u.xp !== undefined && { xp: u.xp }) }];
}
```

    Блок `if (allyParticipants.characterIds.length > 0) { for (const { stats } of await loadCharacterBalanceStats(…)) { … } }` замінити на

```ts
  const heroes = allyParticipants.characterIds.length > 0 ? await loadCharacterBalanceStats(campaignId, allyParticipants.characterIds) : [];

  for (const { stats } of heroes) {
    members.push({ stats: heroMember(stats), hero: true });
    allyCount += 1;
  }
```

    а `if (suggest) {` — на

```ts
  if (suggest && rules?.encounters.balance === "xp") {
    response.suggestedEnemies = xpSuggestion(heroes.map((h) => h.character.level), library, data, rules.encounters.edition);
  } else if (suggest) {
```

    (тіло старої гілки без змін).
  - `start-battle-handler.ts`: `const built = await scaleEnemiesForFairBattle(campaignId, slots, builtRaw, campaignContext);` → `const built = rules.encounters.balance === "xp" ? builtRaw : await scaleEnemiesForFairBattle(campaignId, slots, builtRaw, campaignContext);`.
- [ ] **Step 4:** обидва тести + `pnpm test:run app/api/__tests__/balance-post.test.ts app/api/__tests__/battles/start-build-order.test.ts app/api/__tests__/battles/fair-parity.test.ts` — PASS.
- [ ] **Step 5: Commit**

```bash
git add "app/api/campaigns/[id]/battles/balance" "app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler.ts" types/battle-setup.ts app/api/__tests__/balance-post-xp.test.ts app/api/__tests__/battles/start-build-order-xp.test.ts
git commit -m "feat(constructor): 4e XP balance mode for autopick and battle start

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Авто-досвід після перемоги

**Files:**
- Create: `lib/utils/battle/turn/original-side.ts`, `lib/utils/battle/turn/battle-xp.ts`, `lib/utils/battle/store/persist-xp.ts`
- Modify: `lib/utils/battle/turn/victory.ts` (`originalSide` переїжджає, `completeBattle` — рядок досвіду), `lib/utils/battle/store/save-battle.ts` (гілка `completing`)
- Test: `lib/utils/battle/turn/__tests__/battle-xp.test.ts`, `lib/utils/battle/store/__tests__/save-battle-xp.test.ts`

**Interfaces:**
- Consumes: `basicInfo.xp` (задача 3), `rules.encounters.autoXp` (задача 1), `rules.outOfCombat.xp`, `xpShare`, `addExperience` (`lib/constants/experience.ts`), `lockCharacters` (`lib/server/characters/lock.ts`), `writeCharacterLog` (`lib/server/characters/log.ts`), `CharacterLogKind.XP`.
- Produces:

```ts
// lib/utils/battle/turn/original-side.ts  (victory.ts реекспортує originalSide — наявні імпорти не змінюються)
export function originalSide(p: BattleParticipant): ParticipantSide;

// lib/utils/battle/turn/battle-xp.ts (клієнтський — його тягне victory.ts)
export interface BattleXpAward { total: number; share: number; characterIds: string[] }
export const autoXpEnabled: (rules?: Ruleset) => boolean;            // encounters.autoXp && outOfCombat.xp
export function battleXpAward(participants: BattleParticipant[]): BattleXpAward | null;

// lib/utils/battle/store/persist-xp.ts
export const BATTLE_XP_NOTE = "Перемога в бою";
export function isVictoryOutcome(events: NewBattleEvent[]): boolean;
export function persistBattleXp(tx: Pick<Prisma.TransactionClient, "character" | "characterLog" | "$queryRaw">, battle: { campaignId: string; battleId: string; rules: Ruleset }, participants: BattleParticipant[], events: NewBattleEvent[]): Promise<void>;
```

XP рахується з учасників у полі (без резерву): вороги за `originalSide`, статус `dead`/`unconscious`, без `summonedBy`, без `isExtraTurnSlot`; герої — `sourceType: "character"` з `originalSide === ally`, унікальні `sourceId` (живі чи ні). Частка — `xpShare(total, n, true)`. Запис — лише в переході в COMPLETED (`completing`), лише при перемозі (подія з `actionDetails.battleResult === "victory"`), для активних персонажів кампанії, з `lockCharacters`, журнал `xp` з `{ amount, total, note, battleId }`.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/turn/__tests__/battle-xp.test.ts
import { describe, expect, it } from "vitest";

import { CombatStatus, type CombatStatusType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { autoXpEnabled, battleXpAward } from "@/lib/utils/battle/turn/battle-xp";
import { completeBattle, originalSide } from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, info: Partial<BattleParticipant["basicInfo"]>, status: CombatStatusType = CombatStatus.ACTIVE, data: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, ...info }, combatStats: { ...b.combatStats, status }, battleData: { ...b.battleData, ...data } };
};

const hero = (id: string, sourceId: string, extra: Partial<BattleParticipant["basicInfo"]> = {}) => p(id, { sourceId, sourceType: "character", side: ParticipantSide.ALLY, ...extra });

const foe = (id: string, xp: number, status: CombatStatusType = CombatStatus.DEAD, data: Partial<BattleParticipant["battleData"]> = {}) => p(id, { sourceId: id, sourceType: "unit", side: ParticipantSide.ENEMY, xp }, status, data);

const ON: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp: true }, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } };

describe("battleXpAward", () => {
  it("лише переможені оригінальні вороги; призвані, живі й слоти ходу — ні; герої — по разу", () => {
    const charmed = foe("charmed", 200, CombatStatus.UNCONSCIOUS, { charmReturn: { side: ParticipantSide.ENEMY, controlledBy: "dm" } });

    const ps = [
      hero("h1", "ch-1"),
      hero("h1-x", "ch-1", { isExtraTurnSlot: true }),
      hero("h2", "ch-2"),
      { ...charmed, basicInfo: { ...charmed.basicInfo, side: ParticipantSide.ALLY } },
      foe("ogre", 450),
      foe("ogre-x", 450, CombatStatus.DEAD),
      foe("alive", 1000, CombatStatus.ACTIVE),
      foe("imp", 50, CombatStatus.DEAD, { summonedBy: "ogre" }),
      p("npc", { sourceId: "npc", sourceType: "character", side: ParticipantSide.ENEMY }, CombatStatus.DEAD),
    ];

    ps[5] = { ...ps[5], basicInfo: { ...ps[5].basicInfo, isExtraTurnSlot: true } };

    expect(originalSide(ps[3])).toBe(ParticipantSide.ENEMY);
    expect(battleXpAward(ps)).toEqual({ total: 650, share: 325, characterIds: ["ch-1", "ch-2"] });
  });

  it("немає XP або героїв — null", () => {
    expect(battleXpAward([hero("h1", "ch-1"), foe("homm", 0)])).toBeNull();
    expect(battleXpAward([foe("ogre", 450)])).toBeNull();
  });

  it("autoXpEnabled потребує обох правил", () => {
    expect(autoXpEnabled(ON)).toBe(true);
    expect(autoXpEnabled({ ...ON, outOfCombat: DEFAULT_RULES.outOfCombat })).toBe(false);
    expect(autoXpEnabled(DEFAULT_RULES)).toBe(false);
    expect(autoXpEnabled(undefined)).toBe(false);
  });
});

describe("completeBattle: рядок досвіду в лозі", () => {
  const ps = () => [hero("h1", "ch-1"), hero("h2", "ch-2"), foe("ogre", 450)];

  it("перемога з авто-досвідом", () => {
    expect(completeBattle(ps(), "victory", 3, ON).battleAction.resultText).toBe("🎉 Бій завершено! Перемога союзників! · ⭐ Досвід: 225 кожному");
  });

  it("поразка або вимкнене правило — як раніше", () => {
    expect(completeBattle(ps(), "defeat", 3, ON).battleAction.resultText).toBe("💀 Бій завершено! Поразка союзників!");
    expect(completeBattle(ps(), "victory", 3, DEFAULT_RULES).battleAction.resultText).toBe("🎉 Бій завершено! Перемога союзників!");
  });
});
```

```ts
// lib/utils/battle/store/__tests__/save-battle-xp.test.ts
import { describe, expect, it, vi } from "vitest";

import { BattleStatus, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { LoadedBattle, NewBattleEvent } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const hero = (id: string, sourceId: string): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, sourceId, sourceType: "character", side: ParticipantSide.ALLY } };
};

const ogre = (): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id: "ogre", sourceId: "u-ogre", sourceType: "unit", side: ParticipantSide.ENEMY, xp: 450 }, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.DEAD } };
};

const ON: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp: true }, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } };

const loaded = (rules: Ruleset, participants: BattleParticipant[]): LoadedBattle => ({
  scene: { id: "b1", campaignId: "c1", status: BattleStatus.ACTIVE, round: 3, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules, map: null, createdAt: new Date() },
  participants,
  pending: [],
  isDM: true,
});

const resultEvent = (battleResult: "victory" | "defeat"): NewBattleEvent => ({ type: "end_turn", round: 3, resultText: "кінець", details: { actionDetails: { battleResult } } });

function fakeDb() {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    character: { findMany: vi.fn(async () => [{ id: "ch-1" }, { id: "ch-2" }]), update: vi.fn(async () => ({})), updateMany: vi.fn() },
    characterLog: { createMany: vi.fn(async () => ({ count: 2 })) },
    $queryRaw: vi.fn(async () => [{ id: "ch-1", resources: {}, experience: 100 }, { id: "ch-2", resources: {}, experience: 0 }]),
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const COMPLETE = { status: BattleStatus.COMPLETED, completedAt: new Date() };

const ps = () => [hero("h1", "ch-1"), hero("h2", "ch-2"), ogre()];

describe("saveBattle: авто-досвід", () => {
  it("перемога: XP порівну, з блокуванням рядків і журналом", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, loaded(ON, ps()), { participants: ps(), pending: [], events: [resultEvent("victory")], scene: COMPLETE });

    expect(tx.character.findMany).toHaveBeenCalledWith({ where: { id: { in: ["ch-1", "ch-2"] }, campaignId: "c1", status: "active" }, select: { id: true } });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-1" }, data: { experience: 325 } });
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-2" }, data: { experience: 225 } });
    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "ch-1", kind: "xp", actorUserId: null, data: { amount: 225, total: 325, note: "Перемога в бою", battleId: "b1" } }), expect.objectContaining({ characterId: "ch-2" })] });
  });

  it("поразка, вимкнене правило або бій не завершується — нічого", async () => {
    for (const [rules, events, scene] of [
      [ON, [resultEvent("defeat")], COMPLETE],
      [{ ...ON, outOfCombat: DEFAULT_RULES.outOfCombat }, [resultEvent("victory")], COMPLETE],
      [ON, [resultEvent("victory")], { turnIndex: 1 }],
    ] as const) {
      const { db, tx } = fakeDb();

      await saveBattle(db, loaded(rules, ps()), { participants: ps(), pending: [], events: [...events], scene });

      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.character.update).not.toHaveBeenCalled();
    }
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/turn/__tests__/battle-xp.test.ts lib/utils/battle/store/__tests__/save-battle-xp.test.ts` — FAIL.
- [ ] **Step 3: `original-side.ts`, `battle-xp.ts`, `victory.ts`.**

```ts
// lib/utils/battle/turn/original-side.ts
import type { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

/** Зачарований юніт у переможних умовах лишається на своєму початковому боці. */
export function originalSide(p: BattleParticipant): ParticipantSide {
  const origin = p.battleData.charmReturn ?? p.battleData.activeEffects.find((e) => e.charmOrigin)?.charmOrigin;

  return origin?.side ?? p.basicInfo.side;
}
```

```ts
// lib/utils/battle/turn/battle-xp.ts
import { originalSide } from "./original-side";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { xpShare } from "@/lib/constants/experience";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export interface BattleXpAward {
  total: number;
  share: number;
  characterIds: string[];
}

export const autoXpEnabled = (rules?: Ruleset): boolean => !!rules && rules.encounters.autoXp && rules.outOfCombat.xp;

const defeated = (p: BattleParticipant) => p.combatStats.status === CombatStatus.DEAD || p.combatStats.status === CombatStatus.UNCONSCIOUS;

export function battleXpAward(participants: BattleParticipant[]): BattleXpAward | null {
  const real = participants.filter((p) => !p.basicInfo.isExtraTurnSlot);

  const total = real
    .filter((p) => originalSide(p) === ParticipantSide.ENEMY && !p.battleData.summonedBy && defeated(p))
    .reduce((sum, p) => sum + (p.basicInfo.xp ?? 0), 0);

  const characterIds = [...new Set(real.filter((p) => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && originalSide(p) === ParticipantSide.ALLY).map((p) => p.basicInfo.sourceId))];

  if (total <= 0 || characterIds.length === 0) return null;

  const share = xpShare(total, characterIds.length, true);

  return share > 0 ? { total, share, characterIds } : null;
}
```

  `victory.ts`:
  - тіло й JSDoc `originalSide` видалити; угорі `import { autoXpEnabled, battleXpAward } from "./battle-xp";` і `import { originalSide } from "./original-side";`, нижче імпортів `export { originalSide };`;
  - у `completeBattle` після обчислення `updatedParticipants`: `const award = result === "victory" && autoXpEnabled(rules) ? battleXpAward(updatedParticipants) : null;`
  - рядок `resultText: result === "victory" ? "🎉 Бій завершено! Перемога союзників!" : "💀 Бій завершено! Поразка союзників!",` замінити на

```ts
    resultText: `${result === "victory" ? "🎉 Бій завершено! Перемога союзників!" : "💀 Бій завершено! Поразка союзників!"}${award ? ` · ⭐ Досвід: ${award.share} кожному` : ""}`,
```

- [ ] **Step 4: `persist-xp.ts` і `save-battle.ts`.**

```ts
// lib/utils/battle/store/persist-xp.ts
import type { Prisma } from "@prisma/client";

import type { NewBattleEvent } from "./types";

import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { addExperience } from "@/lib/constants/experience";
import { lockCharacters } from "@/lib/server/characters/lock";
import { type CharacterLogInput, writeCharacterLog } from "@/lib/server/characters/log";
import { autoXpEnabled, battleXpAward } from "@/lib/utils/battle/turn/battle-xp";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export const BATTLE_XP_NOTE = "Перемога в бою";

export function isVictoryOutcome(events: NewBattleEvent[]): boolean {
  return events.some((e) => (e.details?.actionDetails as { battleResult?: string } | undefined)?.battleResult === "victory");
}

export async function persistBattleXp(
  tx: Pick<Prisma.TransactionClient, "character" | "characterLog" | "$queryRaw">,
  battle: { campaignId: string; battleId: string; rules: Ruleset },
  participants: BattleParticipant[],
  events: NewBattleEvent[],
): Promise<void> {
  if (!autoXpEnabled(battle.rules) || !isVictoryOutcome(events)) return;

  const award = battleXpAward(participants);

  if (!award) return;

  const rows = await tx.character.findMany({ where: { id: { in: award.characterIds }, campaignId: battle.campaignId, status: CharacterStatus.ACTIVE }, select: { id: true } });

  if (rows.length === 0) return;

  const locked = await lockCharacters(tx, rows.map((r) => r.id));

  const logs: CharacterLogInput[] = [];

  for (const { id } of rows) {
    const total = addExperience(locked.get(id)?.experience ?? 0, award.share);

    await tx.character.update({ where: { id }, data: { experience: total } });

    logs.push({ campaignId: battle.campaignId, characterId: id, actorUserId: null, kind: CharacterLogKind.XP, data: { amount: award.share, total, note: BATTLE_XP_NOTE, battleId: battle.battleId } });
  }

  await writeCharacterLog(tx, logs);
}
```

  `save-battle.ts`: `import { persistBattleXp } from "./persist-xp";`; у `if (completing) { … }` між `persistCharacterResources(…)` і `pruneSnapshotsSql` додати

```ts
      await persistBattleXp(tx, { campaignId: scene.campaignId, battleId: scene.id, rules: before.meta.rules }, outcome.participants, outcome.events);
```

- [ ] **Step 5:** обидва тести + `pnpm test:related lib/utils/battle/turn/victory.ts lib/utils/battle/store/save-battle.ts` + `pnpm test:run lib/__tests__/client-entry-imports.test.ts` — PASS (наявні `victory*.test.ts`, `save-battle-resources.test.ts` без змін).
- [ ] **Step 6: Commit**

```bash
git add lib/utils/battle/turn lib/utils/battle/store
git commit -m "feat(constructor): 4e auto XP split after victory

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: UI юніта — блок «5e» і чип CR

**Files:**
- Create: `components/units/form/UnitFiveEFields.tsx`
- Modify: `lib/hooks/units/useUnitFormFields.ts` (`options.fiveE`), `components/units/form/UnitFormFields.tsx` (вкладка «Основне»), `components/units/list/UnitCard.tsx` (чип біля назви)
- Test: `components/units/__tests__/UnitFiveEFields.test.tsx`, `components/units/__tests__/UnitCard-cr.test.tsx`

**Interfaces:**
- Consumes: `applyChallenge` (`lib/utils/units/unit-form.ts`), `CHALLENGE_OPTIONS`, `challengeLabel`, `xpForChallenge` (`lib/constants/challenge.ts`), поля `Unit` (задача 2), `useCampaignRules` (`@/lib/hooks/campaigns`), `rules.encounters` (задача 1).
- Produces: `UnitFormFieldsState.options.fiveE: boolean` (= `classes.enabled || encounters.balance === "xp"`); `UnitFiveEFields({ formData, onChange })`.

Блок показується, коли `options.fiveE` або в юніта вже є CR (щоб ДМ міг прибрати CR після вимкнення правил). XP порожнє = з таблиці (плейсхолдер показує значення таблиці); вибір CR підставляє майстерність (`applyChallenge`), ДМ може змінити її в полі «Бонус майстерності».

- [ ] **Step 1: Failing tests**

```tsx
// components/units/__tests__/UnitFiveEFields.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnitFiveEFields } from "@/components/units/form/UnitFiveEFields";

afterEach(cleanup);

describe("UnitFiveEFields", () => {
  it("рятівні кидки — чекбокси в порядку характеристик", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 5, saveProficiencies: ["wisdom"] }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність" }));

    expect(onChange).toHaveBeenCalledWith({ saveProficiencies: ["dexterity", "wisdom"] });
  });

  it("XP порожнє — плейсхолдер з таблиці CR; ввід пише число, очищення — null", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 5, xp: null }} onChange={onChange} />);

    const xp = screen.getByLabelText("XP") as HTMLInputElement;

    expect(xp.placeholder).toBe("1800");

    fireEvent.change(xp, { target: { value: "2000" } });

    expect(onChange).toHaveBeenLastCalledWith({ xp: 2000 });
  });

  it("лічильники не нижче мінімуму", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 1, multiattack: 2 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Атак за дію «Атака»"), { target: { value: "0" } });

    expect(onChange).toHaveBeenLastCalledWith({ multiattack: 1 });
  });
});
```

```tsx
// components/units/__tests__/UnitCard-cr.test.tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { UnitCard } from "@/components/units/list/UnitCard";
import type { Unit } from "@/lib/hooks/units";

const renderCard = (unit: Unit) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmProvider>
        <UnitCard unit={unit} campaignId="c1" onDelete={vi.fn()} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );

describe("UnitCard: CR", () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(cleanup);

  it("чип CR з дробом", () => {
    renderCard({ id: "u1", name: "Вовк", level: 1, attacks: [], cr: 0.25 } as unknown as Unit);

    expect(screen.getByText("CR 1/4")).toBeTruthy();
  });

  it("HOMM-юніт без чипа", () => {
    renderCard({ id: "u2", name: "Гоблін", level: 1, attacks: [], cr: null } as unknown as Unit);

    expect(screen.queryByText(/^CR /)).toBeNull();
  });
});
```

- [ ] **Step 2:** `pnpm test:run components/units/__tests__/UnitFiveEFields.test.tsx components/units/__tests__/UnitCard-cr.test.tsx` — FAIL.
- [ ] **Step 3: Implement.**

```tsx
// components/units/form/UnitFiveEFields.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CHALLENGE_OPTIONS, xpForChallenge } from "@/lib/constants/challenge";
import { applyChallenge } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

type CountKey = "multiattack" | "legendaryActions" | "legendaryResistances";

const COUNT_FIELDS: Array<{ key: CountKey; label: string; min: number }> = [
  { key: "multiattack", label: "Атак за дію «Атака»", min: 1 },
  { key: "legendaryActions", label: "Легендарних дій за раунд", min: 0 },
  { key: "legendaryResistances", label: "Легендарного опору за бій", min: 0 },
];

interface UnitFiveEFieldsProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitFiveEFields({ formData, onChange }: UnitFiveEFieldsProps) {
  const cr = formData.cr ?? null;

  const saves = formData.saveProficiencies ?? [];

  const toggleSave = (key: AbilityKey, on: boolean) => onChange({ saveProficiencies: ABILITY_KEYS.filter((k) => (k === key ? on : saves.includes(k))) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-5">
        <div className="flex flex-col justify-end">
          <Label htmlFor="cr" className="text-xs leading-tight">
            Небезпека (CR)
          </Label>
          <SelectField id="cr" value={cr === null ? "" : String(cr)} onValueChange={(v) => onChange(applyChallenge(v === "" ? null : Number(v)))} options={CHALLENGE_OPTIONS} allowNone noneLabel="Без CR (HOMM)" />
        </div>
        <div className="flex flex-col justify-end">
          <Label htmlFor="xp" className="text-xs leading-tight">
            XP
          </Label>
          <NumberInput id="xp" value={formData.xp ?? undefined} placeholder={cr === null ? "" : String(xpForChallenge(cr))} onChange={(v) => onChange({ xp: v ?? null })} />
        </div>
        {COUNT_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col justify-end">
            <Label htmlFor={f.key} className="text-xs leading-tight">
              {f.label}
            </Label>
            <NumberInput id={f.key} value={formData[f.key] ?? f.min} onChange={(v) => onChange({ [f.key]: Math.max(f.min, v ?? f.min) } as Partial<Unit>)} />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Майстерність рятівних кидків</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ABILITY_KEYS.map((key) => (
            <label key={key} htmlFor={`save-${key}`} className="flex items-center gap-2 text-sm">
              <Checkbox id={`save-${key}`} checked={saves.includes(key)} onCheckedChange={(v) => toggleSave(key, v === true)} />
              {ABILITY_LABELS[key]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
```

  - `useUnitFormFields.ts`: `import { useCampaignRules } from "@/lib/hooks/campaigns";`; у тілі `const { data: rules } = useCampaignRules(campaignId);` і `const fiveE = !!rules && (rules.classes.enabled || rules.encounters.balance === "xp");`; `options: { races, race, spells, fiveE }`.
  - `UnitFormFields.tsx`: `import { UnitFiveEFields } from "./UnitFiveEFields";`; `const { races, spells, fiveE } = editor.options;`; у вкладці `basic` після `<UnitBasicInfo … />`:

```tsx
          {(fiveE || formData.cr != null) && (
            <HudSection title="5e">
              <UnitFiveEFields formData={formData} onChange={change} />
            </HudSection>
          )}
```

  - `UnitCard.tsx`: `import { challengeLabel } from "@/lib/constants/challenge";`; `<h3 …>{unit.name}</h3>` →

```tsx
            <h3 className="text-base font-semibold text-hud-ink">
              {unit.name}
              {unit.cr != null && (
                <Badge variant="outline" className="ml-2 align-middle text-xs">
                  {`CR ${challengeLabel(unit.cr)}`}
                </Badge>
              )}
            </h3>
```

- [ ] **Step 4:** обидва тести + `pnpm test:related lib/hooks/units/useUnitFormFields.ts components/units/form/UnitFormFields.tsx components/units/list/UnitCard.tsx` — PASS (наявні `useUnitCreateForm`/`useUnitEditForm`/`UnitCard` тести без змін; запит правил у них падає в помилку запиту — `fiveE = false`).
- [ ] **Step 5: Commit**

```bash
git add components/units lib/hooks/units/useUnitFormFields.ts
git commit -m "feat(constructor): 4e unit form 5e block and CR chip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: UI бою — легендарна дія ДМ і значки

**Files:**
- Create: `lib/hooks/battle/useLegendaryAction.ts`, `components/battle/dm/LegendaryActionDialog.tsx`
- Modify: `lib/hooks/battle/index.ts`, `lib/hooks/battle/useDmParticipantActions.ts` (`onLegendary`, стан цілі), `components/battle/dm/DmParticipantRow.tsx` (кнопка й значок), `components/battle/dm/DmQuickActionsPanel.tsx` (діалог), `components/battle/participants/ParticipantRow.tsx` (значок)
- Test: `components/battle/dm/__tests__/LegendaryActionDialog.test.tsx`, `lib/hooks/battle/__tests__/useDmParticipantActions-legendary.test.tsx`

**Interfaces:**
- Consumes (задача 6): `legendaryAbilities`, `legendaryBlocker`, `legendaryCostOf`, `hasLegendaryActions`, `legendaryBadge` (`lib/utils/battle/actions/legendary-options.ts`); `LegendaryOption` (`types/battle.ts`); `CoreActionBody` з варіантом `legendary` (`lib/api/battles.ts`) — запит іде через наявну `actions.coreAction`.
- Produces:

```ts
// lib/hooks/battle/useLegendaryAction.ts
export interface LegendaryChoice { id: string; kind: "attack" | "ability"; label: string; cost: number; attackIndex?: number; abilityKey?: string; needsTarget: boolean; maxTargets: number; candidates: BattleParticipant[]; blocked: string | null }
export function useLegendaryAction(participant: BattleParticipant): { legendary: LegendaryState | undefined; choices: LegendaryChoice[]; run: (option: LegendaryOption) => Promise<boolean>; isPending: boolean };

// DmParticipantActions += onLegendary?: (p: BattleParticipant) => void
// useDmParticipantActions(...) повертає ще legendary: { target: BattleParticipant | null; close: () => void }
// components/battle/dm/LegendaryActionDialog.tsx
export function LegendaryActionDialog(props: { participant: BattleParticipant | null; onClose: () => void }): JSX.Element | null;
```

- [ ] **Step 1: Failing tests**

```tsx
// components/battle/dm/__tests__/LegendaryActionDialog.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { LegendaryActionDialog } from "@/components/battle/dm/LegendaryActionDialog";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleParticipant } from "@/types/battle";

function sceneWithDragon(isMyTurn: boolean) {
  const scene = fakeScene({ isDM: true, isMyTurn });

  const dragon: BattleParticipant = { ...scene.gob, battleData: { ...scene.gob.battleData, legendary: { actions: 3, actionsLeft: 3, resistLeft: 1 } } };

  scene.value.battle = { ...scene.value.battle, initiativeOrder: [scene.me, dragon, scene.ally] };

  if (!isMyTurn) scene.value.turn = { ...scene.value.turn, current: dragon };

  return { ...scene, dragon };
}

afterEach(cleanup);

describe("LegendaryActionDialog", () => {
  it("атака: вибір атаки й цілі → core-action legendary", async () => {
    const { wrapper, dragon, coreAction } = sceneWithDragon(true);

    const onClose = vi.fn();

    render(<LegendaryActionDialog participant={dragon} onClose={onClose} />, { wrapper });

    fireEvent.click(screen.getByRole("radio", { name: /Рапіра/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Фрейда" }));
    fireEvent.click(screen.getByRole("button", { name: "Виконати" }));

    await waitFor(() => expect(coreAction).toHaveBeenCalledWith({ action: "legendary", participantId: "gob", option: { kind: "attack", attackIndex: 0, targetId: "me" } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("у хід самого монстра варіанти заблоковані з причиною", () => {
    const { wrapper, dragon } = sceneWithDragon(false);

    render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });

    expect((screen.getByRole("radio", { name: /Рапіра/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Легендарна дія — лише поза своїм ходом")).toBeTruthy();
  });

  it("без цілі не можна виконати", () => {
    const { wrapper, dragon } = sceneWithDragon(true);

    render(<LegendaryActionDialog participant={dragon} onClose={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByRole("radio", { name: /Рапіра/ }));

    expect((screen.getByRole("button", { name: "Виконати" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

```tsx
// lib/hooks/battle/__tests__/useDmParticipantActions-legendary.test.tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fakeScene } from "./fake-scene";

import { useDmParticipantActions } from "@/lib/hooks/battle";

const noop = () => {};

describe("useDmParticipantActions: легендарна дія", () => {
  it("активний бій — onLegendary відкриває діалог для учасника", () => {
    const { wrapper, gob } = fakeScene({ isDM: true });

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.legendary.target).toBeNull();

    act(() => result.current.row.onLegendary?.(gob));

    expect(result.current.legendary.target?.basicInfo.id).toBe("gob");

    act(() => result.current.legendary.close());

    expect(result.current.legendary.target).toBeNull();
  });

  it("підготовлений бій — без onLegendary", () => {
    const { wrapper } = fakeScene({ isDM: true, status: "prepared" });

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.row.onLegendary).toBeUndefined();
  });
});
```

- [ ] **Step 2:** `pnpm test:run components/battle/dm/__tests__/LegendaryActionDialog.test.tsx lib/hooks/battle/__tests__/useDmParticipantActions-legendary.test.tsx` — FAIL.
- [ ] **Step 3: Hook.**

```ts
// lib/hooks/battle/useLegendaryAction.ts
"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf } from "@/lib/utils/battle/actions/legendary-options";
import { abilityMaxTargets } from "@/lib/utils/battle/validation/ability-targets";
import { bonusTargetCandidates, needsBonusTarget } from "@/lib/utils/battle/view";
import type { BattleParticipant, LegendaryOption } from "@/types/battle";

export interface LegendaryChoice {
  id: string;
  kind: "attack" | "ability";
  label: string;
  cost: number;
  attackIndex?: number;
  abilityKey?: string;
  needsTarget: boolean;
  maxTargets: number;
  candidates: BattleParticipant[];
  blocked: string | null;
}

export function useLegendaryAction(participant: BattleParticipant) {
  const { battle, turn, actions } = useBattleScene();

  const order = battle.initiativeOrder;

  const current = turn.current ?? undefined;

  const choices = useMemo<LegendaryChoice[]>(() => {
    const field = (order ?? []).filter((p) => !p.battleData.reserved);

    const allies = field.filter((p) => p.basicInfo.side === participant.basicInfo.side);

    const enemies = field.filter((p) => p.basicInfo.side !== participant.basicInfo.side);

    const attacks = participant.battleData.attacks.flatMap((a, i): LegendaryChoice[] =>
      a.hand === "off" ? [] : [{ id: `attack:${i}`, kind: "attack", label: a.name, cost: 1, attackIndex: i, needsTarget: true, maxTargets: 1, candidates: enemies.filter(isAttackable), blocked: legendaryBlocker(participant, current, 1) }],
    );

    const abilities = legendaryAbilities(participant).map((a): LegendaryChoice => {
      const cost = legendaryCostOf(a);

      return { id: `ability:${a.key}`, kind: "ability", label: a.name, cost, abilityKey: a.key, needsTarget: needsBonusTarget(a), maxTargets: abilityMaxTargets(a), candidates: bonusTargetCandidates(a, allies, enemies, participant), blocked: legendaryBlocker(participant, current, cost) };
    });

    return [...attacks, ...abilities];
  }, [order, participant, current]);

  const run = async (option: LegendaryOption) => {
    try {
      await actions.coreAction.mutateAsync({ action: "legendary", participantId: participant.basicInfo.id, option });
    } catch {
      return false;
    }

    return true;
  };

  return { legendary: participant.battleData.legendary, choices, run, isPending: actions.coreAction.isPending };
}
```

  `lib/hooks/battle/index.ts`: `export { type LegendaryChoice, useLegendaryAction } from "./useLegendaryAction";` (у алфавітному місці після `useHpChange`).

- [ ] **Step 4: Dialog.**

```tsx
// components/battle/dm/LegendaryActionDialog.tsx
"use client";

import { useState } from "react";

import { OPTION_BUTTON, OPTION_ON } from "@/components/battle/turn/option-button";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useLegendaryAction } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { toggleAbilityTarget } from "@/lib/utils/battle/validation/ability-targets";
import type { BattleParticipant, LegendaryOption } from "@/types/battle";

interface LegendaryActionDialogProps {
  participant: BattleParticipant | null;
  onClose: () => void;
}

export function LegendaryActionDialog({ participant, onClose }: LegendaryActionDialogProps) {
  return participant ? <LegendaryActionBody key={participant.basicInfo.id} participant={participant} onClose={onClose} /> : null;
}

function LegendaryActionBody({ participant, onClose }: { participant: BattleParticipant; onClose: () => void }) {
  const { legendary, choices, run, isPending } = useLegendaryAction(participant);

  const [choiceId, setChoiceId] = useState<string | null>(null);

  const [targets, setTargets] = useState<string[]>([]);

  const choice = choices.find((c) => c.id === choiceId) ?? null;

  const ready = !!choice && !choice.blocked && !isPending && (!choice.needsTarget || targets.length > 0);

  const optionOf = (c: NonNullable<typeof choice>): LegendaryOption =>
    c.kind === "attack" ? { kind: "attack", attackIndex: c.attackIndex ?? 0, targetId: targets[0] ?? "" } : { kind: "ability", abilityKey: c.abilityKey ?? "", ...(targets.length > 0 && { targetIds: targets }) };

  const submit = async () => {
    if (choice && (await run(optionOf(choice)))) onClose();
  };

  const pickTarget = (id: string) => setTargets(choice && choice.maxTargets > 1 ? toggleAbilityTarget(targets, id, choice.maxTargets) : [id]);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      hud
      title={`Легендарна дія: ${participant.basicInfo.name}`}
      description={legendary ? `Залишилось ${legendary.actionsLeft} з ${legendary.actions}` : ""}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Закрити
          </Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>
            Виконати
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-1" role="radiogroup" aria-label="Дія">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={choiceId === c.id}
              disabled={!!c.blocked}
              onClick={() => {
                setChoiceId(c.id);
                setTargets([]);
              }}
              className={cn(OPTION_BUTTON, choiceId === c.id && OPTION_ON)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-[var(--hud-muted)]">{c.cost}</span>
              </div>
              {c.blocked && <div className="pt-0.5 text-xs text-hud-danger">{c.blocked}</div>}
            </button>
          ))}
        </div>
        {choice?.needsTarget && (
          <div className="grid gap-1" role="radiogroup" aria-label="Ціль">
            {choice.candidates.map((t) => (
              <button key={t.basicInfo.id} type="button" role="radio" aria-checked={targets.includes(t.basicInfo.id)} onClick={() => pickTarget(t.basicInfo.id)} className={cn(OPTION_BUTTON, targets.includes(t.basicInfo.id) && OPTION_ON)}>
                {t.basicInfo.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
```

  Якщо всі варіанти заблоковані з однієї причини, текст повторюється в кожному рядку — так само, як у `CoreActionsDialog` (тест вище шукає `getAllByText` не потрібно: у фікстурі одна атака й жодного легендарного вміння, тож рядок один).

- [ ] **Step 5: DM-панель і значки.**
  - `useDmParticipantActions.ts`: у `DmParticipantActions` після `onConditions?` → `onLegendary?: (p: BattleParticipant) => void;`; у тілі `const [legendaryId, setLegendaryId] = useState<string | null>(null);`; у `row` після `onConditions` → `onLegendary: isActive ? (p) => setLegendaryId(p.basicInfo.id) : undefined,`; після `conditionsTarget`:

```ts
  const legendaryTarget = useMemo(() => (battle.initiativeOrder ?? []).find((p) => p.basicInfo.id === legendaryId) ?? null, [battle.initiativeOrder, legendaryId]);
```

    і в повернутий об'єкт `legendary: { target: legendaryTarget, close: () => setLegendaryId(null) },`.
  - `DmParticipantRow.tsx`: імпорти `Crown` з `lucide-react`, `import { hasLegendaryActions, legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";`; деструктуризація `actions` += `onLegendary`; `const legendary = participant.battleData.legendary;`, `const badge = legendaryBadge(participant);`, `const canLegendary = !!onLegendary && hasLegendaryActions(participant);`; під рядком `label` у колонці імені:

```tsx
        {badge && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="legendary-badge">{badge}</div>}
```

    у блоці кнопок перед `canConditions`:

```tsx
        {canLegendary && legendary && (
          <button type="button" className={cn(ICON, "text-[var(--gold)] hover:border-[var(--gold)]/40")} title={`Легендарна дія (${legendary.actionsLeft}/${legendary.actions})`} onClick={() => onLegendary?.(participant)}>
            <Crown className="size-3.5" />
          </button>
        )}
```

  - `DmQuickActionsPanel.tsx`: `import { LegendaryActionDialog } from "./LegendaryActionDialog";`; `const { row, refreshSources, randomUnits, conditions, legendary } = useDmParticipantActions(…);`; поруч з `<ConditionsDialog … />` → `<LegendaryActionDialog participant={legendary.target} onClose={legendary.close} />`.
  - `ParticipantRow.tsx`: `import { legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";`; у тілі `const badge = legendaryBadge(participant);`; після рядка `deathSaves` → `{badge && <div className="mt-1 text-xs text-[var(--hud-muted)]">{badge}</div>}`.
- [ ] **Step 6:** обидва тести + `pnpm test:related lib/hooks/battle/useDmParticipantActions.ts components/battle/dm/DmParticipantRow.tsx components/battle/dm/DmQuickActionsPanel.tsx components/battle/participants/ParticipantRow.tsx` — PASS.
- [ ] **Step 7: Commit**

```bash
git add lib/hooks/battle components/battle/dm components/battle/participants/ParticipantRow.tsx
git commit -m "feat(constructor): 4e DM legendary action dialog and badges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: UI підготовки бою в режимі XP

**Files:**
- Create: `lib/hooks/battles/setup/useXpBalance.ts`, `components/battle/setup/XpBalanceSummary.tsx`
- Modify: `lib/hooks/battles/setup/useBattleSetup.ts`, `lib/hooks/battles/setup/useBalanceSuggestions.ts`, `components/battle/setup/AutopickCard.tsx`, `components/battle/setup/BattleSetupForm.tsx`
- Test: `components/battle/setup/__tests__/xp-balance-summary.test.tsx`, `components/battle/setup/__tests__/autopick-xp.test.tsx`

**Interfaces:**
- Consumes: `setupXpBudget` (задача 7), `XP_DIFFICULTIES`, `XP_DIFFICULTY_LABELS`, `DEFAULT_XP_DIFFICULTY`, `isXpDifficultyOf`, `XpBudgetResult`, `XpDifficulty` (`xp-budget.ts`), `BattleBalanceBody.xpDifficulty`, `SuggestedEnemy.xp` (задача 8), `useCampaignRules` (`@/lib/hooks/campaigns`), `DEFAULT_RULES`.
- Produces:

```ts
// lib/hooks/battles/setup/useXpBalance.ts
export function useXpBalance(participants: SetupBalanceParticipant[], stats: SetupBalanceStats | null | undefined, encounters: Ruleset["encounters"]): XpBudgetResult | null;  // fair → null
// useBattleSetup(...) повертає ще encounters: Ruleset["encounters"], xp: XpBudgetResult | null
// useBalanceSuggestions({ ..., encounters }) повертає ще xp: { enabled: boolean; edition: XpEdition; difficulty: XpDifficulty }, actions.setDifficulty(d: XpDifficulty)
// components/battle/setup/XpBalanceSummary.tsx
export function XpBalanceSummary(props: { xp: XpBudgetResult | null; units: Array<{ id: string; name: string }> }): JSX.Element;
```

- [ ] **Step 1: Failing tests**

```tsx
// components/battle/setup/__tests__/xp-balance-summary.test.tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { XpBalanceSummary } from "@/components/battle/setup/XpBalanceSummary";
import { computeXpBudget } from "@/lib/utils/battle/balance/xp-budget";

afterEach(cleanup);

const units = [{ id: "ogre", name: "Огр" }, { id: "gob", name: "Гоблін" }];

describe("XpBalanceSummary", () => {
  it("складність, XP з множником, пороги, юніти без CR", () => {
    const xp = computeXpBudget({ edition: "2014", heroLevels: [3, 3, 3, 3], enemies: [{ unitId: "ogre", quantity: 2, xp: 450 }, { unitId: "gob", quantity: 3, xp: null }] });

    render(<XpBalanceSummary xp={xp} units={units} />);

    expect(screen.getByTestId("xp-difficulty").textContent).toBe("Складність: Складна");
    expect(screen.getByText("XP ворогів 900 × 1.5 = 1350")).toBeTruthy();
    expect(screen.getByText("Смертельна 1600")).toBeTruthy();
    expect(screen.getByTestId("xp-missing-cr").textContent).toBe("Немає CR, не враховано: Гоблін");
  });

  it("2024 без множника; порожній склад — підказка", () => {
    const xp = computeXpBudget({ edition: "2024", heroLevels: [3, 3, 3, 3], enemies: [{ unitId: "ogre", quantity: 2, xp: 450 }] });

    const { rerender } = render(<XpBalanceSummary xp={xp} units={units} />);

    expect(screen.getByText("XP ворогів 900")).toBeTruthy();

    rerender(<XpBalanceSummary xp={null} units={units} />);

    expect(screen.getByText(/Додайте героїв/)).toBeTruthy();
  });
});
```

```tsx
// components/battle/setup/__tests__/autopick-xp.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AutopickCard } from "@/components/battle/setup/AutopickCard";
import type { BalanceSuggestions } from "@/lib/hooks/battles";

afterEach(cleanup);

const suggestions = (enabled: boolean, setDifficulty = vi.fn()): BalanceSuggestions => ({
  isLoading: false,
  suggested: [{ unitId: "wolf", name: "Вовк", quantity: 8, dpr: 3.5, hp: 11, totalDpr: 28, totalHp: 88, xp: 50 }],
  done: true,
  race: "",
  xp: { enabled, edition: "2014", difficulty: "medium" },
  actions: { setRace: vi.fn(), suggest: vi.fn(), apply: vi.fn(), setDifficulty },
});

describe("AutopickCard: XP", () => {
  it("чипи складності редакції; вибір викликає setDifficulty", () => {
    const setDifficulty = vi.fn();

    render(<AutopickCard hasAllies races={[]} balance={suggestions(true, setDifficulty)} />);

    expect(screen.getByRole("button", { name: "Середня" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Смертельна" }));

    expect(setDifficulty).toHaveBeenCalledWith("deadly");
    expect(screen.getByText(/XP 50/)).toBeTruthy();
  });

  it("режим fair — без чипів", () => {
    render(<AutopickCard hasAllies races={[]} balance={suggestions(false)} />);

    expect(screen.queryByRole("button", { name: "Середня" })).toBeNull();
  });
});
```

- [ ] **Step 2:** `pnpm test:run components/battle/setup/__tests__/xp-balance-summary.test.tsx components/battle/setup/__tests__/autopick-xp.test.tsx` — FAIL.
- [ ] **Step 3: Hooks.**

```ts
// lib/hooks/battles/setup/useXpBalance.ts
"use client";

import { useMemo } from "react";

import { type SetupBalanceParticipant, type SetupBalanceStats, setupXpBudget } from "@/lib/utils/battle/balance/setup";
import type { Ruleset } from "@/lib/utils/rules";

export function useXpBalance(participants: SetupBalanceParticipant[], stats: SetupBalanceStats | null | undefined, encounters: Ruleset["encounters"]) {
  const { balance, edition } = encounters;

  return useMemo(() => (balance === "xp" && stats ? setupXpBudget(participants, stats, edition) : null), [participants, stats, balance, edition]);
}
```

  - `useBalanceSuggestions.ts`: імпорти `import { DEFAULT_XP_DIFFICULTY, isXpDifficultyOf, type XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";`, `import type { Ruleset } from "@/lib/utils/rules";`; `UseBalanceSuggestionsParams` += `encounters: Ruleset["encounters"];`; деструктуризація += `encounters`; стан і похідні:

```ts
  const [picked, setPicked] = useState<XpDifficulty | null>(null);

  const xpMode = encounters.balance === "xp";

  const difficulty: XpDifficulty = isXpDifficultyOf(encounters.edition, picked) ? picked : DEFAULT_XP_DIFFICULTY[encounters.edition];
```

    у `suggestEnemies` тіло запиту: `{ allyParticipants: allies.value, suggest: true, raceId: balanceRace || undefined, ...(xpMode && { xpDifficulty: difficulty }) }`, залежності `useCallback` += `xpMode, difficulty`; у повернутому об'єкті `xp: { enabled: xpMode, edition: encounters.edition, difficulty },` і `actions: { setRace: setBalanceRace, suggest: suggestEnemies, apply: applySuggestedEnemies, setDifficulty: setPicked }`.
  - `useBattleSetup.ts`: імпорти `import { useXpBalance } from "./useXpBalance";`, `import { useCampaignRules } from "@/lib/hooks/campaigns";`, `import { DEFAULT_RULES } from "@/lib/utils/rules";`; після `useNewBattleData`:

```ts
  const { data: rules } = useCampaignRules(campaignId);

  const encounters = rules?.encounters ?? DEFAULT_RULES.encounters;
```

    `useBalanceSuggestions({ …, encounters })`; після `fair`: `const xp = useXpBalance(participants.list, entityStats, encounters);`; у повернутий об'єкт `encounters, xp,`.
- [ ] **Step 4: Components.**

```tsx
// components/battle/setup/XpBalanceSummary.tsx
import { HudSection } from "@/components/hud/form";
import { HudCard } from "@/components/hud/page";
import { XP_DIFFICULTY_LABELS, type XpBudgetResult, type XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";

interface XpBalanceSummaryProps {
  xp: XpBudgetResult | null;
  units: Array<{ id: string; name: string }>;
}

export function XpBalanceSummary({ xp, units }: XpBalanceSummaryProps) {
  const nameOf = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  return (
    <HudSection title="Баланс бою (XP 5e)" className="mb-4">
      <HudCard className="space-y-3" data-testid="xp-balance-summary">
        {!xp ? (
          <p className="text-sm text-[var(--hud-muted)]">Додайте героїв у союзники та юнітів у вороги, щоб побачити складність.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded border border-border bg-card px-2 py-0.5" data-testid="xp-difficulty">
                Складність: {XP_DIFFICULTY_LABELS[xp.difficulty]}
              </span>
              <span>{xp.multiplier === 1 ? `XP ворогів ${xp.enemyXp}` : `XP ворогів ${xp.enemyXp} × ${xp.multiplier} = ${xp.adjustedXp}`}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--hud-muted)]">
              {(Object.entries(xp.thresholds) as Array<[XpDifficulty, number]>).map(([k, v]) => (
                <span key={k}>{`${XP_DIFFICULTY_LABELS[k]} ${v}`}</span>
              ))}
            </div>
            {xp.missingCr.length > 0 && (
              <p className="text-xs text-destructive" data-testid="xp-missing-cr">
                {`Немає CR, не враховано: ${xp.missingCr.map(nameOf).join(", ")}`}
              </p>
            )}
          </>
        )}
      </HudCard>
    </HudSection>
  );
}
```

  - `AutopickCard.tsx`: імпорти `import { HudChipTabs } from "@/components/hud/page";`, `import { XP_DIFFICULTIES, XP_DIFFICULTY_LABELS } from "@/lib/utils/battle/balance/xp-budget";`; `const { isLoading, race, suggested, done, actions, xp } = balance;`; текст опису: `{xp.enabled ? "Система підбирає склад під бюджет XP 5e обраної складності — без масштабування HP і шкоди." : "Система підбирає склад і сама масштабує HP та шкоду ворогів під силу героїв, щоб бій тривав ~3–4 раунди."}`; перед блоком кнопок (усередині `hasAllies`):

```tsx
          {xp.enabled && (
            <HudChipTabs
              ariaLabel="Складність"
              items={XP_DIFFICULTIES[xp.edition].map((d) => ({ key: d, label: XP_DIFFICULTY_LABELS[d], active: xp.difficulty === d, onSelect: () => actions.setDifficulty(d) }))}
            />
          )}
```

    у рядку рекомендації після блоку `hpMult/dmgMult` → `{s.xp !== undefined && <span className="ml-2 text-xs text-muted-foreground">XP {s.xp}</span>}`.
  - `BattleSetupForm.tsx`: `import { XpBalanceSummary } from "./XpBalanceSummary";`; у вкладці `roster` `<BalanceSummary fair={setup.fair} />` → `{setup.encounters.balance === "xp" ? <XpBalanceSummary xp={setup.xp} units={data.units} /> : <BalanceSummary fair={setup.fair} />}`.
- [ ] **Step 5:** обидва тести + `pnpm test:related lib/hooks/battles/setup/useBattleSetup.ts lib/hooks/battles/setup/useBalanceSuggestions.ts components/battle/setup/AutopickCard.tsx components/battle/setup/BattleSetupForm.tsx` — PASS (наявні `battle-setup-form.test.tsx`, `balance-summary.test.tsx` без змін).
- [ ] **Step 6: Commit**

```bash
git add lib/hooks/battles/setup components/battle/setup
git commit -m "feat(constructor): 4e battle setup XP difficulty view and autopick chips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/battle.md` (новий розділ «5e: монстри» перед «Changing battle behavior»), `docs/architecture/balance.md` (розділ «Режим XP (5e)» і речення в першому абзаці), `docs/architecture/abilities.md` (пункт «Етап 4e»), `docs/architecture/content-api.md` (розділ «Монстри 5e (етап 4e)» перед «Оновлення з джерела»), `docs/STATUS.md` (рядок «Конструктор кампаній»)

- [ ] **Step 1: `battle.md`** — розділ «## 5e: монстри» (українською, стисло, у стилі сусідніх):
  - юніт з `cr` (`isMonster5e`, `lib/utils/units/monster.ts`) у `createBattleParticipantFromUnit`: `damageModel: "5e"`, СК = `saveDcBase` + майстерність + найкращий мод. Інт/Мдр/Хар (`spellcastingAbility` — ця характеристика), `saveProficiencies` (читає `rollSave` за `rules.saves.proficiency`), мультиатака — синтетичне пасивне вміння `unit:<id>:multiattack` (`modifyStat attacksPerAction`), `basicInfo.xp` (`unitXp`), `battleData.legendary { actions, actionsLeft, resistLeft }`; юніт без `cr` — нульова зміна;
  - легендарні дії: тіло `{ action: "legendary", participantId, option }` роуту `core-action` (`legendary-mutation.ts`), лише ДМ, поза ходом монстра, не залежить від `rules.actions`; атака — `legendaryAttack` → `resolveServerAttack` (`label: "legendary"`, одна атака), вміння — `limits.legendaryCost` через `runAbilities` подією `action`; відновлення в `resetTurnState`; UI — `LegendaryActionDialog` (кнопка-корона в панелі ДМ), значок `legendaryBadge`;
  - легендарний опір: `resolveSave` (`saves/legendary.ts`) у заклинаннях (лише ціль з іншого боку), концентрації, `saveEnds`, Схопленні/Штовханні 2024, Вогняному вибуху; лист не зачіпає;
  - дії лігва — вміння `roundStart` + `perRound: 1`;
  - авто-досвід: `completeBattle` додає «⭐ Досвід: N кожному», `saveBattle` (гілка `completing`) → `persistBattleXp` (`store/persist-xp.ts`: `battleXpAward`, `lockCharacters`, журнал `xp` з `battleId`); лише перемога, `encounters.autoXp && outOfCombat.xp`; відкат завершеного бою повторює нарахування (як запис ресурсів 4d).
- [ ] **Step 2: `balance.md`** — у першому абзаці після «call the same function.» додати «In the XP mode (`rules.encounters.balance: "xp"`) neither of them scales — see below.»; новий розділ:

```markdown
## XP mode (5e)

`rules.encounters { balance: "fair" | "xp", edition: "2014" | "2024" }`. In `xp` the setup shows `XpBalanceSummary` (`setupXpBudget` → `computeXpBudget` in `balance/xp-budget.ts`: DMG 2014 per-hero thresholds × the monster-count multiplier with the party-size step, or DMG 2024 per-hero budget without a multiplier; units without CR go to `missingCr`, NPC enemies are ignored); the battle start skips `scaleEnemiesForFairBattle`; autopick (`balance-post`, `xpDifficulty`) uses `pickXpRoster` (one unit kind, the band from the chosen threshold up to the next one). Unit XP comes from `unitXp` (manual `xp`, else the CR table); `UnitStats` carries `cr`/`xp`, a CR unit's spell DC adds its best Int/Wis/Cha modifier and its weapon DPR is multiplied by `multiattack`.
```

- [ ] **Step 3: `abilities.md`** — пункт: «Етап 4e (5e): `LimitsSchema.legendaryCost` (1–3, лише `trigger: action` без `aim`) — таке вміння використовується лише легендарною дією (`core-action` `legendary`), у звичайному ході приховане (`abilityOptions`, відмова в `runAbilityUse`). Мультиатака юніта з CR — синтетичне пасивне вміння `modifyStat attacksPerAction`. Дія лігва — тригер `roundStart` + `perRound: 1` (підказка в редакторі). Деталі — [battle.md](battle.md).»
- [ ] **Step 4: `content-api.md`** — розділ «## Монстри 5e (етап 4e)»: поля юніта `cr` (0, 0.125, 0.25, 0.5, 1–30; `null` — HOMM), `xp` (`null` — з таблиці CR), `multiattack` (1–10), `legendaryActions` (0–5), `legendaryResistances` (0–10), `saveProficiencies` (ключі характеристик); міграція `20261030000000_unit_5e` лише додає колонки; при створенні з `proficiencyBonus: 0` і CR майстерність береться з таблиці CR (клієнтам API краще передавати її явно); бандл, синхронізація, OpenAPI і MCP — автоматично; правила — `rules.encounters`.
- [ ] **Step 5: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента 4d додати: «**4e «монстри й баланс 5e» готовий** (поля юніта CR/XP/мультиатака/легендарні дії й опір/рятівні, міграція `20261030000000_unit_5e`, монстр 5e в бою, легендарні дії поза ходом і легендарний опір, `limits.legendaryCost`, дії лігва через `roundStart`, `rules.encounters` — баланс за бюджетом XP 2014/2024 і авто-досвід; спек — розділ 4e того ж файлу, план `docs/superpowers/plans/2026-10-22-constructor-4e-monsters-balance.md`; опис — `docs/architecture/battle.md` «5e: монстри», `balance.md`)» і замінити «далі 4e монстри/баланс, 4f…» на «далі 4f…».
- [ ] **Step 6: Full verification.**
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build` (тип-перевірка охоплює й тести — `tsconfig` включає `**/*.ts(x)`).
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу на HOMM5 (відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).
- [ ] **Step 7: Commit**

```bash
git add docs/architecture docs/STATUS.md
git commit -m "docs(constructor): 4e monsters and XP balance architecture and status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8:** звіт контролеру: список комітів, відхилення від плану, підняті межі (OpenAPI), нестабільні тести.

(Фінальне рев'ю opus, хвиля виправлень, повторне рев'ю, `/simplify`, живий прогін за §10 спеку — кампанія з класами, `encounters.balance: "xp"`, `autoXp`; монстр CR 5 з мультиатакою 2, легендарними діями 3 і опором 2 → складність у підготовці → мультиатака, легендарна дія поза ходом, опір на заклинанні → перемога → досвід у листі; тестові дані видалити — хендоф і пам'ять робить контролер після задачі 13.)
