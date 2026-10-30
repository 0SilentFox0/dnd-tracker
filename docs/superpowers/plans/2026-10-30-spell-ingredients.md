# Інгредієнти заклинань — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Кроки з чекбоксами; імплементер — Sonnet, суміжні малі задачі батчаться (2–3), без рев'ю на кожну задачу; наприкінці одне рев'ю гілки.

**Goal:** Структуровані інгредієнти заклинань (форма, імпорт) і їх перевірка/списання при касті в бою з предметів інвентаря та gp.

**Architecture:** `Spell.ingredients`/`componentFlags` (Json, expand-only міграція); чисті функції в `lib/utils/spells/ingredients/` діляться клієнтом і сервером; запас героя в `battleData.ingredientStock` (з інвентаря при збиранні учасника); перевірка в `createSpellMutation`, списання в `finalizeCast`, фіксація в БД у `saveBattle` (гілка `completing`) поруч із `persistConsumables`. Правило `rules.spellIngredients` за замовчуванням вимкнене.

**Tech Stack:** Next.js 16, Prisma 6, Zod, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-spell-ingredients-design.md` (читати перед стартом; розділ Reuse обов'язковий).

## Global Constraints

- Міграція expand-only, нових таблиць немає (RLS не потрібен); `lib/db.ts` для Prisma.
- Шари: component → hook → `lib/api/*`; ні `fetch`, ні `@/lib/api/*` у компонентах; ключі запитів — фабрики `keys.ts`; імпорти лише `@/…`.
- Текст UI лише через `messages/{uk,en}/*.json` (кирилиця в коді заборонена ESLint); нова помилка API — ключ + параметри.
- Коментарі мінімальні; нові ідентифікатори англійською.
- Тести: лише `pnpm test:related <файли>` / `pnpm test:changed`, лінт — `pnpm exec eslint --fix <змінені файли>`; повний `pnpm test:run` і lint файлів гілки (`git diff --name-only main | xargs pnpm exec eslint`) один раз перед мерджем. Перед важким запуском: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- Worktree: `pnpm install --frozen-lockfile` (без симлінка node_modules); не пушити.
- `useRecipeValues` не додавати в barrel `lib/hooks/abilities` (контекст етапу 2).
- Імена інгредієнтів — вміст користувача, не перекладаються.

## Review Focus

- Інгредієнт без `minGp` і не витратний (`focus: true`) не блокує каст і не списується.
- Нестача відхиляє каст без жодної зміни стану (слот, дія, `used`); `free`-каст ДМ, гранти, юніти без stock проходять.
- Прев'ю не списує; повторний каст після відмови працює.
- Гаманець: списання 1 gp з гаманця `0 gp, 5 sp, 20 cp` розмінює без втрати; значення ніколи не стає від'ємним.
- Старі заклинання (`ingredients=[]`, `componentFlags=null`) і вимкнене правило: поведінка боїв не змінюється, форма не падає.

---

## Частина A — дані, імпорт, форма

### Task 1: Схема, міграція, правило (батч 1–2)

**Files:**
- Create: `lib/schemas/spell-ingredients.ts`, `lib/constants/spell-ingredients.ts`, `lib/utils/spells/ingredients/{key.ts,index.ts}`, `prisma/migrations/<UTC-timestamp після 20261112000000>_spell_ingredients/migration.sql`
- Modify: `prisma/schema.prisma` (Spell: `ingredients Json @default("[]")`, `componentFlags Json?`), `lib/schemas/spells.ts` (`spellFields` + create/update), `lib/utils/rules/{schema,defaults,registry}.ts`, `types/spells.ts` (якщо там тип Spell для клієнта), `messages/{uk,en}/rules.json`
- Test: `lib/schemas/__tests__/spell-ingredients.test.ts`, `lib/utils/spells/ingredients/__tests__/key.test.ts`, наявний тест rules (defaults/parse)

**Interfaces — Produces:**
```ts
// lib/schemas/spell-ingredients.ts
export const SpellIngredientSchema: z.ZodType<SpellIngredient>;   // {name 1..80, qty int 1..99 =1, minGp? 0..100000, consumed =false, focus}
export const ComponentFlagsSchema: z.ZodType<ComponentFlags>;     // {v,s,m}
export type SpellIngredient = { name: string; qty: number; minGp?: number; consumed: boolean; focus: boolean };
export type ComponentFlags = { v: boolean; s: boolean; m: boolean };
export const defaultFocus = (i: { minGp?: number; consumed?: boolean }) => boolean; // !(minGp>0) && !consumed
// lib/utils/spells/ingredients/key.ts
export const ingredientKey = (name: string) => string; // lower-case slug, діакритика/пробіли → "-"
export const trackedIngredients = (list: SpellIngredient[]) => SpellIngredient[]; // !focus
// rules
rules.spellIngredients: { enabled: boolean (false); autoPay: boolean (true) }
```
Піддеталі: `ingredients` — масив ≤ 8, унікальні `ingredientKey`; refine: непорожній масив вимагає `componentFlags?.m === true`. У `spellFields` `ingredients` optional з default `[]`, `componentFlags` nullable optional.

- [x] Тести схеми: валідний рядок; дубль ключа → помилка; M=false з інгредієнтами → помилка; `null`/`[]` проходить; `defaultFocus`; `ingredientKey("Diamond Dust")==="diamond-dust"`.
- [x] Реалізувати схеми й ключі; додати поля в Prisma, `pnpm exec prisma migrate dev --name spell_ingredients` на локальній БД (власна БД у Docker, порт 54322), перевірити SQL: лише `ALTER TABLE "spells" ADD COLUMN … ` ×2.
- [x] Правило: секція `spellIngredients` в `sectionSchemas`, `withDefaults`, `RulesetSchema.prefault`, patch-схемі, `DEFAULT_RULES`, `MECHANIC_REGISTRY` (`label: "Інгредієнти заклинань"`); ключі `rules.spellIngredients.*` у `messages/*/rules.json`; оновити тести rules, що перелічують секції (знайти `pnpm test:related lib/utils/rules/schema.ts`).
- [x] `pnpm test:related lib/utils/rules/schema.ts lib/schemas/spells.ts`; eslint змінених; commit `feat(spells): ingredient schema, migration, rules.spellIngredients`.

### Task 2: Поширення поля (content-api, sync, сторожі)

**Files:** знайти всі місця, що перелічують поля заклинання: `grep -rn "raceModifiers" lib app scripts types --include='*.ts' -l | grep -v __tests__` (CRUD route/helpers, content-api схеми/ресурси, bundle/clone кампанії, sync-хеші `lib/server/…/source-sync`, assistant-інструменти, `toCastableSpell` не чіпати).
- [x] Для кожного місця, де заклинання копіюється/хешується/серіалізується поелементно, додати `ingredients` і `componentFlags` (туди ж, де `lists`/`raceModifiers`). Не додавати в `route.ts` логіку — лише в схеми/хелпери.
- [x] Тест: кругообіг bundle/clone зберігає поля; sync-хеш змінюється при зміні `ingredients`; OpenAPI/`toJsonSchemas` містить поле (наявні тести-сторожі мають пройти, оновити snapshot лише за потреби).
- [x] `pnpm test:changed`; commit `feat(spells): propagate ingredient fields through content API and sync`.

### Task 3: Імпорт 5etools (SRD-дані — сесія feat/srd-completeness)

**Files:**
- Modify: `lib/server/compendium-import/adapters/spell-cast.ts` (`components()` → також `ingredients`/`componentFlags`), `spell-derive.ts`/`content.ts` (передача в рядок Spell)
- Create: `lib/server/compendium-import/adapters/spell-patterns/ingredients.ts` (+ `__tests__`)

**Interfaces — Produces:**
```ts
// чисте, без zod
export function parseMaterial(raw: { text?: string; cost?: number; consume?: boolean | "optional" } | string): SpellIngredient[] | null;
// null = неоднозначно → лишається текстом без відстеження, у звіті manual
export function parseMaterialText(text: string): SpellIngredient[] | null; // "(a diamond worth 50+ GP, which the spell consumes)"
```
Правила: `cost` 5etools у мідних → `minGp = cost/100`; `consume: true` → `consumed: true`; `"optional"` → `consumed: false`; без вартості й без витрати → `[{ name, qty:1, consumed:false, focus:true }]`; кілька предметів в одній дужці з кількома вартостями (Astral Projection) → `null`. `componentFlags` з `v/s/m`.

- [x] Тести з позитивним і негативним випадком на правило: «worth 50+ GP» → `minGp 50`; «worth 1,000+ GP, which the spell consumes» → `1000`, `consumed`; «a pinch of sand» → `focus: true`; Astral Projection → `null`; 5etools-об'єкт `{text, cost: 5000, consume: true}`.
- [x] Реалізація; адаптер пише `components` як і раніше (текст) + нові поля; SRD-дані (`scripts/srd/`, `spells.json`, пресет `rules-preset.ts` з `spellIngredients.enabled: true`) заповнює окрема сесія `feat/srd-completeness` після мерджу цієї схеми; `parseMaterialText` лишається експортованою чистою функцією, її вони можуть перевикористати.
- [x] Прогнати наявні тести імпорту й SRD-шаблону (`pnpm test:related lib/server/compendium-import/adapters/spell-cast.ts`); commit `feat(import): structured spell ingredients (5etools + SRD)`.

### Task 4: Форма заклинання (батч 4–5 з Task 5)

**Files:**
- Create: `components/spells/form/SpellComponentsFields.tsx`, `components/spells/form/IngredientRow.tsx`, `lib/utils/spells/ingredients/presets.ts` (використовує `lib/constants/spell-ingredients.ts`: `INGREDIENT_PRESETS`)
- Modify: `components/spells/form/spell-form-defaults.ts` (`ingredients: []`, `componentFlags: null`), `components/spells/form/SpellFormBody.tsx` (секція у вкладці «Основне»), `lib/hooks/spells/useSpellFormSync.ts` або де формується payload; `messages/{uk,en}/spells.json`
- Test: `components/spells/form/__tests__/SpellComponentsFields.test.tsx` (`// @vitest-environment happy-dom`)

Поведінка: чекбокси V/S/M; при M — список `IngredientRow` (назва, к-сть, «мін. вартість, gp», «витрачається», «замінює фокус» — вмикається автоматично через `defaultFocus`, поки користувач не змінить вручну), кнопка «Додати», `SelectField` пресетів (камінь ≥N gp витрачається, порошок витрачається, святий символ 5 gp, звичайний M-фокус); превʼю одним рядком «Потрібно: …» (`useIngredientSummary`, чиста `summarizeIngredients(list)` у `lib/utils/spells/ingredients/summary.ts` — тест). Для заклинань із `componentFlags == null` показати похідне «V, S, M» зі старого рядка й дозволити ввімкнути структуру. Поля — `min-h-11`, картки в одну колонку; помилки через `FieldErrors`/`useSpellIssueText`.

- [x] Тести: додавання/видалення рядка, автозначення `focus`, дубль назви показує помилку, M вимкнено ховає список і очищає `ingredients`, збереження payload.
- [x] Реалізація; ключі `spells.ingredients.*` обох мов; `pnpm test:related components/spells/form/SpellFormBody.tsx`; commit `feat(spells): components and ingredients in spell form`.

## Частина B — інвентар, рушій, списання

### Task 5: Предмети-інгредієнти в інвентарі

**Files:**
- Modify: `types/inventory.ts` (`SpecialItem.worthGp?: number; ingredient?: string`), `lib/utils/inventory/items.ts` (`normalizeItems`: `worthGp` число ≥0, `ingredient` slug `^[a-z0-9][a-z0-9-]{0,39}$`), zod-схема оновлення інвентаря (`lib/server/characters/operations/inventory-update.ts` та схема, знайти `grep -rn "consumable" lib/schemas lib/server/characters -l`), `components/character-profile/stash/ItemDialog.tsx` (поля «Вартість, gp», «Інгредієнт для…»), `messages/{uk,en}/inventory.json`
- Test: `lib/utils/inventory/__tests__/items.test.ts`, тест `ItemDialog`

**Interfaces — Produces:** `itemIngredientKey(item: SpecialItem): string` у `lib/utils/spells/ingredients/key.ts` = `ingredientKey(item.ingredient ?? item.name)`.

- [x] Тести: нормалізація зберігає/відкидає поля; діалог відправляє `worthGp`/`ingredient`; старі предмети без полів валідні.
- [x] Реалізація; commit `feat(inventory): ingredient fields on special items`.

### Task 6: Чисті `planIngredients` і запас

**Files:**
- Create: `lib/utils/spells/ingredients/{plan.ts,stock.ts}`, `types/battle.ts` (додати `IngredientStock` і `BattleData.ingredientStock?`)
- Test: `lib/utils/spells/ingredients/__tests__/{plan,stock}.test.ts`

**Interfaces — Produces:**
```ts
// types/battle.ts
export interface IngredientStockItem { id: string; key: string; name: string; worthGp: number; qty: number; used: number }
export interface IngredientStock { items: IngredientStockItem[]; purseCp: number; usedCp: number }

// stock.ts
export function buildIngredientStock(inventory: { items: unknown; gold: number; silver: number; copper: number }): IngredientStock | undefined; // undefined, якщо немає предметів і гаманець 0
export const purseToCp = (p: { gold: number; silver: number; copper: number }) => number; // COIN_VALUE

// plan.ts
export interface IngredientPlan { ok: boolean; spendItems: Record<string, number>; spendCp: number; missing: Array<{ name: string; qty: number; minGp?: number }> }
export function planIngredients(ingredients: SpellIngredient[], stock: IngredientStock, opts: { autoPay: boolean }): IngredientPlan;
export function applyIngredientPlan(stock: IngredientStock, plan: IngredientPlan): IngredientStock; // збільшує used/usedCp
```
Алгоритм: для кожного `!focus` інгредієнта: збіг за `key` і `worthGp >= (minGp ?? 0)`, доступно `qty - used`; брати від найдешевшого достатнього; решта покривається `minGp*100*rest` мідних, якщо `autoPay && minGp > 0` і вистачає `purseCp - usedCp`; інакше йде в `missing` (з кількістю решти). План — загальний атомарний: якщо є `missing`, `spendItems`/`spendCp` порожні.

- [x] Тести: достатньо предметів; частково предмети + gp; `autoPay:false` → missing; без `minGp` і без предмета → missing; `focus` ігнорується; два ключі; дешевший предмет першим; `used` враховується; жодних мутацій вхідного stock.
- [x] Реалізація; commit `feat(spells): pure ingredient planning`.

### Task 7: Збирання запасу в учасника + дельти

**Files:** `lib/utils/battle/participant/character-spell-grants.ts` / `extract-artifacts.ts` / `load-character-context.ts` (з тих самих місць, де береться `character.inventory.items` для consumable; перевірити `grep -n "inventory" lib/utils/battle/participant/*.ts`), `types/battle.ts` (`BattleData.ingredientStock`), `lib/utils/battle/refresh*` (зберегти `used`/`usedCp` при `refreshFromSource`), клієнтська дельта (`client-delta`: учасник передається цілком — переконатись, що поле не відкидається).
- [x] Тест: герой із предметом-інгредієнтом отримує `ingredientStock` лише коли `rules.spellIngredients.enabled`; юніт — ні; `refreshFromSource` зберігає `used`; поле є в клієнтській дельті.
- [x] Реалізація; commit `feat(battle): ingredient stock on hero participants`.

### Task 8: Перевірка й списання при касті

**Files:** `lib/server/battles/mutations/spell/spell-mutation.ts`, `lib/utils/battle/spell/ingredients.ts` (тонка обгортка `ingredientsGate(caster, spell, rules, source)`), `lib/constants/api-errors.ts` (`BATTLE_SPELL_INGREDIENTS_MISSING`) + ключ у `messages/{uk,en}/errors.json` (за прикладом `BATTLE_NO_FREE_SLOT_TO_CAST`), `messages/*/battleLog.json` (`spell.ingredientsSpent`), `types/battle.ts`/`lib/schemas/battles.ts` якщо потрібен параметр помилки
- Test: `lib/server/battles/mutations/spell/__tests__/` (поруч із наявними тестами spell-mutation; дотримуватись їхніх фабрик учасників)

Поведінка: після `resolveChosenSlot` і перед гілкою `cost: long` викликати `ingredientsGate`; активна лише коли `rules.spellIngredients.enabled && !free && !legendaryAbility && !grant && caster.battleData.ingredientStock && відстежувані.length`. При `!plan.ok` → `throw ruleErrorOf("action_rejected", API_ERRORS.BATTLE_SPELL_INGREDIENTS_MISSING, { list })` (формат `list` — «Diamond ×1 (50 gp)», збирає `formatMissing` у `lib/utils/spells/ingredients/summary.ts`). Списання (`applyIngredientPlan` через `updateParticipant`) — у `finalizeCast`, не при `data.preview`; для `cost: long` — тільки на завершенні касту. Лог-рядок `ingredientsSpent` з переліком.

- [x] Тести: відмова без змін стану (слот, дія, `used`); успіх списує предмет і `used`; доплата gp збільшує `usedCp`; `free`, `grant`, `legendaryAbility`, юніт без stock, вимкнене правило — каст проходить без змін; `preview` не списує; довгий каст: початок лише перевіряє, завершення списує; повторний каст після відмови працює; рядок логу присутній.
- [x] Реалізація; commit `feat(battle): check and spend spell ingredients on cast`.

### Task 9: Фіксація в БД при завершенні бою

**Files:** Create `lib/utils/battle/store/persist-ingredients.ts`; Modify `lib/utils/battle/store/` місце виклику `persistConsumables` (знайти `grep -rn "persistConsumables" lib`), `lib/utils/inventory/money.ts` або наявний «spend money» хелпер (знайти в `inventory-update.ts`; не дублювати логіку розміну).
- Test: `lib/utils/battle/store/__tests__/persist-ingredients.test.ts`

**Interfaces — Produces:**
```ts
export async function persistIngredients(tx: Pick<Prisma.TransactionClient, "characterInventory" | "inventoryLog" | "campaign" | "$executeRaw">, battle: { campaignId: string }, participants: BattleParticipant[]): Promise<void>;
export function spendCp(p: { gold: number; silver: number; copper: number }, cp: number): { gold: number; silver: number; copper: number }; // спершу gp→розмін, без від'ємних; чисте, у тесті
```
Поведінка: для `persistedHeroes` з `used>0`/`usedCp>0`: зменшити `quantity` предметів (0 → видалити), списати гаманець, журнал `item_use` (`{ item, qty: -n }`) і `money_spend` від `campaigns.dmUserId`; один `lockCampaignArtifacts`; поряд із `persistConsumables` в одній транзакції; `persistResources` вимкнено → `persistedHeroes` повертає порожній список (як слоти).
- [x] Тести `spendCp`: `0gp 5sp 20cp − 100cp → 0/0/…` без втрати, ніколи < 0, розмін з gp; `persistIngredients`: предмет зменшується/видаляється, журнал, герой без `used` ігнорується, `persistResources:false` нічого не пише, два герої.
- [x] Реалізація; commit `feat(battle): persist spent ingredients on battle completion`.

## Частина C — UI боя, лист, документація

### Task 10: Каст-діалог і картка заклинання (батч 10–11)

**Files:** Create `components/spells/SpellComponentsLine.tsx`, `components/battle/wizards/spellbook/IngredientsLine.tsx`, `lib/hooks/battle/useIngredientPlan.ts` (мемо `planIngredients` по `caster.battleData.ingredientStock` і `spell.ingredients`); Modify `SpellSummary.tsx`/`SpellCastDialog.tsx` (блокувати «Застосувати» при нестачі й `enabled`), картки заклинань листа/галереї (`components/spells/list/*`, `book/*`; знайти, де виводиться `components`/школа), `messages/{uk,en}/{battleWizards,spells}.json`.
- Test: `components/battle/wizards/spellbook/__tests__/IngredientsLine.test.tsx` (happy-dom), `components/spells/__tests__/SpellComponentsLine.test.tsx`

Поведінка: «Потрібно: Diamond ×1 (≥50 gp, витрачається)»; «Бракує: …» (червоний `text-destructive`), підказка «буде сплачено 50 gp з гаманця» при автооплаті; нічого не показувати, коли відстежуваних немає або правило вимкнене; сервер лишається арбітром (помилка 422 показується наявним тостом/форматером помилок). Лист показує лише `SpellComponentsLine` (V S M + інгредієнти), без «бракує».
- [x] Тести: рендер потрібно/бракує/автооплата, блокування кнопки, відсутність рядка без інгредієнтів, `componentFlags: null` показує старий рядок.
- [x] Реалізація; commit `feat(battle-ui): ingredient requirements in cast dialog and spell cards`.

### Task 11: Whats-new, i18n-перевірка, документація

**Files:** `lib/onboarding/whats-new.ts` (`{ id: "2026-10-30-spell-ingredients", date: "2026-10-30", audience: "all" }` на початок списку; перед мерджем перевірити, чи main не додав записи — злити, а не перезаписати), `messages/{uk,en}/whatsNew.json` (`whatsNew.2026-10-30-spell-ingredients.{title,body}`), підказка біля перемикача в `/dm/rules`, `docs/architecture/battle.md` (розділ каст/пули: `ingredientStock`, перевірка, `persistIngredients`), `docs/architecture/abilities.md` (правило й поля Spell), `docs/architecture/i18n.md` лише якщо додано нові простори, `docs/STATUS.md`; `i18n-exempt.json` не чіпати.
- [x] `pnpm test:related lib/onboarding/whats-new.ts` + тест ключів i18n; commit `docs: spell ingredients (whats-new, architecture, status)`.

### Task 12: Живе підтвердження й кінець гілки

- [ ] (Sonnet-субагент, `feedback-browser-context`: скриншоти зменшені, JS/текст замість скрінів) Власна БД у Docker (54322), `pnpm install --frozen-lockfile` у worktree, ключі Supabase копіювати з основної папки лише з дозволу користувача, логін робить користувач. Сценарій: увімкнути `spellIngredients`, заклинання з «Diamond ≥50 gp, витрачається» через форму; герой із предметом Diamond (50 gp) і герой без предмета з 100 gp; каст у бою (успіх/списання/відмова/доплата gp); завершити бій і перевірити інвентар, гаманець і журнал; мобільна ширина форми й діалогу; повторна перевірка зі вимкненим правилом.
- [ ] Повний `pnpm test:run` один раз; lint файлів гілки (`git diff --name-only main -- '*.ts' '*.tsx' | xargs pnpm exec eslint`); `/simplify` на діф гілки (1 агент); одне фінальне Opus-рев'ю (1 агент) діфу.
- [ ] Перед мерджем: `git fetch`/звірити main (він міг піти вперед у `whats-new.ts`), мердж у тимчасовому worktree, не пушити без згоди користувача; `git mv` spec і plan у `docs/archive/superpowers/` у merge-коміті; оновити `docs/STATUS.md`; видалити локальну БД і worktree.

## Self-review

- Spec coverage: модель (T1), поширення й міграція (T1–2), імпорт (T3), форма (T4), інвентар/гроші (T5–6), каст і списання (T7–9), UI (T10), правила/i18n/whats-new/доки (T1, T10–11), приховані оцінки (T3, T5, T9, T2), перевірка в браузері (T12). Поза обсягом не реалізується.
- Узгодженість типів: `SpellIngredient`, `IngredientStock`, `planIngredients`, `applyIngredientPlan`, `ingredientKey`, `itemIngredientKey`, `persistIngredients` використовуються однаково в T1→T10.
- Відомі місця пошуку (не вигадані): потрібно знайти `persistConsumables` caller, спільний money-spend хелпер, SRD-скрипт збірки, перелік місць `raceModifiers`; кожна задача називає команду пошуку.
