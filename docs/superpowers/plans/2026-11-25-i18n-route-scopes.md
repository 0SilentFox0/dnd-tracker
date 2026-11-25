# Скоупи перекладів за маршрутом — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** кожен маршрут `app/campaigns/**` вантажить лише свої простори перекладів (база ≤ ~25 KB uk gzip замість 113), бюджет — на маршрут, тести ловлять простір поза скоупом.

**Architecture:** `lib/i18n/route-scopes.ts` (база + пакети + скоупи за ключем сегмента) → серверний `<RouteScope>` у `layout.tsx` кожного сегмента (обгортка над `ExtendLocaleScope`) → system-ns за пакетами (`SystemI18n.packs`) → сторожі на статичному графі імпортів (порт `scripts/i18n/route-audit.ts`) → бюджети на маршрут у `scope-size`.

**Tech Stack:** Next.js 16 App Router, next-intl 4, vitest, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-11-25-i18n-route-scopes-design.md` (читати перед задачею).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-i18n`, гілка `feat/i18n-route-scopes`; основне дерево і `../dnd-tracker-ch8` не чіпати. `node_modules` у worktree може не бути — `pnpm install --frozen-lockfile` один раз (не міняти lockfile).
- Не змінювати розмітку/класи/стилі в `components/**` (паралельний редизайн Ч8a); дозволено лише виклики перекладу (`useTranslations('ns')` → інший ns) і обгортки в `app/**/layout.tsx`/`page.tsx`.
- `messages/*/common.json` не змінювати.
- Кирилиця в коді заборонена; нові коментарі — англійською, мінімально (лише «чому»).
- `app/layout.tsx` (root) не читає cookies/headers; `whatsNew` через `ExtendLocaleScope` у `GameShell` лишається.
- Агенти **не запускають** повний набір тестів; лише `pnpm test:related <files>` / `pnpm test:run <file>` для своїх тестів; `pnpm exec eslint --fix <files>`; `pnpm cycles`; `pnpm exec tsc --noEmit` — наприкінці задачі. Один повний `pnpm test:run` — у задачі 7.
- Імпорти лише через `@/`; `lib/utils` не імпортує `lib/server`.
- Коміт наприкінці кожної задачі з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (або моделі, що виконує).

## Review Focus

1. Сторінка, яка відкриває діалог/панель іншого розділу (редактор здібностей з аркуша героя, лог бою в профілі, «Що нового» в шапці) — має бачити свої тексти; сторож (б) мусить проходити `dynamic()`/`import()` (задача 1, тест на `dynamic(() => import(...))`).
2. Демо-кампанія (`demoTours`) і не-DM гравець — однакові скоупи сторінок, крім DM-only сегментів; гравець не отримує DM-пакетів (задача 3, тест layout).
3. Кампанія з невідомою/відсутньою системою (`system = null`) — `RouteScope` дає лише ядро, без падіння (задача 2, тест `routeNamespaces(route, null)`).
4. wfrp-кампанія: бій, аркуш, `dm/rules`, `character/draft` бачать свої wfrp-ns після переходу з слотів на пакети (задача 2, тест порівняння «старий слот ⊆ новий скоуп маршруту» для wfrp).
5. Клієнтська навігація між сегментами (`dm/spells` → `dm/units`) не втрачає тексти базового скоупу — `ExtendMessages` зливає з предком (задача 3, живий прогін у задачі 7).

---

## Файлова структура

- Create `lib/i18n/test/route-namespaces.ts` — аналізатор: сторінки кампанії, ланцюжок layout-ів, використані ns за видом (`hook`/`server`/`literal`/`template`), оголошені `RouteScope`-ключі.
- Modify `scripts/i18n/route-audit.ts` — CLI-звіт поверх аналізатора (`pnpm i18n:route-audit [outDir]`).
- Create `lib/i18n/route-scopes.ts` — `CAMPAIGN_BASE`, `PACKS`, `ROUTE_SCOPES`, `routeNamespaces`.
- Create `lib/i18n/route-scope.tsx` — `<RouteScope>`.
- Modify `lib/i18n/system-scope.ts`, `lib/utils/rules/systems/meta.ts` (`SystemI18n.packs`), `systems/{wfrp,d20,inspiration,skilltrees,morale}/meta.ts`, генератор `i18nNamespaces` (`lib/utils/rules/systems/…`, див. `__tests__/i18n-namespaces.test.ts`).
- Modify `lib/i18n/core-namespaces.ts` (`CAMPAIGN_NAMESPACES` прибрати; `abilityEditor` додати), `global.d.ts`.
- Create `messages/{uk,en}/abilityEditor.json`; modify `messages/{uk,en}/abilityRegistry.json`.
- Modify всі `app/campaigns/**/layout.tsx` + create відсутні; modify сторінки з `ExtendLocaleScope`.
- Create `lib/i18n/__tests__/route-scopes.test.ts`; delete `lib/i18n/__tests__/battle-scope-imports.test.ts`; rewrite `lib/i18n/__tests__/scope-size.test.ts`.
- Docs: `docs/architecture/i18n.md`, `docs/STATUS.md`.

---

### Task 1: Аналізатор маршрутів (порт аудиту)

**Files:**
- Create: `lib/i18n/test/route-namespaces.ts`
- Modify: `scripts/i18n/route-audit.ts` (лише CLI: імпорт аналізатора + markdown/JSON-звіт), `package.json` (скрипт `i18n:route-audit`)
- Test: `lib/i18n/__tests__/route-namespaces.test.ts`

**Interfaces — Produces:**
```ts
export type UseKind = 'hook' | 'server' | 'literal' | 'template';
export interface NsUse { ns: string; file: string; kind: UseKind }
export interface RouteGraph {
    page: string;                 // 'app/campaigns/[id]/dm/spells/page.tsx'
    chain: string[];              // ancestor layout.tsx files, root first, from app/campaigns/layout.tsx
    files: ReadonlySet<string>;   // reachable sources (client+server), systems/* through registries excluded
    uses: NsUse[];                // excludes FALSE_POSITIVE_FILES and SERVER_TRANSLATED literal uses
    declaredRoutes: string[];     // RouteScope route keys found in chain files (regex `<RouteScope[^>]*route=["']([^"']+)["']`)
    usesBase: boolean;            // chain contains app/campaigns/layout.tsx
}
export function campaignPages(): string[];
export function routeGraph(page: string): RouteGraph;
export function systemUiUses(systemDir: string): NsUse[]; // uses in systems/<id>/{ui,hooks}/** (registry-rendered UI)
```
- Перенести з `scripts/i18n/route-audit.ts`: `parse` (хуки, `getTranslator(locale,'ns')`, кореневий `t('ns.x')`, літерали з першим сегментом = відомий ns і шляхом, що резолвиться в `messages/uk`), резолвер (alias `@/`, відносні, `export … from`, barrel по імені), `"use client"`-межа, зупинка на `lib/server`, `app/api`, `"server-only"`. `FALSE_POSITIVE_FILES` і `SERVER_TRANSLATED` — експортовані константи з коментарем-причиною.
- Обов'язково: `dynamic(() => import('@/…'))` і `import('…')` — ребра графа.
- Кешування `parse` між сторінками (module-level `Map`) — тест має пройти ≤ ~10 с.

- [ ] **Step 1: Тест (падає):**
```ts
describe('routeGraph', () => {
    it('finds the campaign pages', () => {
        expect(campaignPages()).toContain('app/campaigns/[id]/dm/spells/page.tsx');
        expect(campaignPages().length).toBeGreaterThan(55);
    });
    it('sees hook uses on the dashboard', () => {
        const g = routeGraph('app/campaigns/[id]/page.tsx');
        expect(g.uses.some((u) => u.ns === 'dashboard' && u.kind === 'hook')).toBe(true);
        expect(g.usesBase).toBe(true);
    });
    it('sees the battleCommon read on dm/rules (known hole)', () => {
        const g = routeGraph('app/campaigns/[id]/dm/rules/page.tsx');
        expect(g.uses.some((u) => u.ns === 'battleCommon' && u.file.endsWith('SummaryStep.tsx'))).toBe(true);
    });
    it('follows dynamic imports', () => {
        // pick any page that renders a next/dynamic component (grep `dynamic(() => import` under components/ reachable from app/campaigns/[id]/battles) and assert the imported file is in g.files
    });
    it('chain lists ancestor layouts root-first', () => {
        const g = routeGraph('app/campaigns/[id]/dm/battles/[battleId]/page.tsx');
        expect(g.chain.slice(0, 3)).toEqual(['app/campaigns/layout.tsx', 'app/campaigns/[id]/layout.tsx', 'app/campaigns/[id]/dm/layout.tsx']);
    });
});
```
Для `follows dynamic imports` — знайти конкретний файл grep-ом і вписати точні шляхи (не лишати коментар).
- [ ] **Step 2:** `pnpm test:run lib/i18n/__tests__/route-namespaces.test.ts` → FAIL.
- [ ] **Step 3:** Реалізація (порт), CLI-скрипт повторно використовує аналізатор.
- [ ] **Step 4:** Тест PASS; `pnpm exec tsx scripts/i18n/route-audit.ts /tmp/x` дає ті самі цифри, що звіт аудиту (база 113 KB, середнє ~81 KB зайвих).
- [ ] **Step 5:** eslint по файлах, коміт `feat(i18n): route namespace analyzer`.

### Task 2: Модель скоупів + system-пакети

**Files:**
- Create: `lib/i18n/route-scopes.ts`
- Modify: `lib/i18n/system-scope.ts`, `lib/utils/rules/systems/meta.ts`, `systems/{wfrp,d20,inspiration,skilltrees,morale}/meta.ts` (і будь-який інший meta з `campaign|member|dm|battle`), генератор namespace-ів систем (знайти через `lib/utils/rules/systems/__tests__/i18n-namespaces.test.ts`; `budgetKb` і `packs` ігнор/врахування), `lib/__tests__/system-contract.test.ts`
- Test: `lib/i18n/__tests__/route-scopes-model.test.ts`, оновити `lib/i18n/__tests__/system-scope.test.ts`, `lib/utils/rules/systems/__tests__/i18n-namespaces.test.ts`, `lib/__tests__/systems-index.test.ts`

**Interfaces — Produces:**
```ts
export const CAMPAIGN_BASE: readonly Namespace[];        // initial: common, validation, gameTerms, inventory, onboarding, soundboard, abilities (Task 4 tunes)
export type PackKey = 'campaigns' | 'dashboard' | 'rules' | 'characterSheet' | 'abilityDisplay' | 'abilityEditor'
    | 'contentLibrary' | 'story' | 'battle' | 'ai' | 'units';
export const PACKS: Record<PackKey, readonly Namespace[]>;
export type RouteKey = keyof typeof ROUTE_SCOPES;          // dir of the layout relative to app/campaigns: 'list' (app/campaigns itself), '[id]', '[id]/dm', '[id]/dm/spells', '[id]/dm/spells/[spellId]', '[id]/battles', ...
export const ROUTE_SCOPES: Record<string, readonly PackKey[]>; // `as const satisfies`
export function routeNamespaces(route: RouteKey, system: SystemScopeInput | null): readonly Namespace[];
// = core ns of the route's packs + systemPackScope(system, pack) for each pack; no CAMPAIGN_BASE (the base comes from the ancestor LocaleScope)
export function systemPackScope(system: SystemScopeInput | null, pack: PackKey): readonly Namespace[]; // in system-scope.ts, replaces systemScope(…,'battle'|'campaign'|'member'|'dm')
```
- `SystemI18n`: додати `packs?: Partial<Record<PackKey, readonly string[]>>`; видалити `battle`, `campaign`, `member`, `dm`; `budgetKb` → `{ packs?: Partial<Record<PackKey, number>>; pages?: … }`. `PackKey` визначити в `lib/utils/rules/systems/meta.ts`-сумісному місці без імпорту `lib/i18n` в `lib/utils` циклом (тип рядкового union у `lib/utils/rules/systems/types-i18n.ts` або в meta.ts; `route-scopes.ts` реекспортує).
- `logScope` переходить у пакет `battle` (лишається функцією, `routeNamespaces` додає її для `battle`-пакета).
- `pages` лишаються (`character`, `draft`, `dmCharacter`, `dmCharacters`, `dmRules`) — `routeNamespaces` додає `systemScope(system, page)` для маршрутів, чий ключ мапиться: `character`→`character`, `character/draft`+`character/new`→`draft`, `dm/characters/[characterId]`→`dmCharacter`, `dm/characters`→`dmCharacters`, `dm/rules`→`dmRules` (+ `rulesFormScope()`). Мапа `ROUTE_SYSTEM_PAGE` (ключі повні: `[id]/character`, `[id]/character/draft`, `[id]/character/new`, `[id]/dm/characters/[characterId]`, `[id]/dm/characters`, `[id]/dm/rules`) у `route-scopes.ts`.
- Перенесення system-слотів: `battle` → `packs.battle`; `campaign`/`member`/`dm` → пакет за фактичним використанням (`pnpm exec tsx scripts/i18n/route-audit.ts` + `systemUiUses('systems/wfrp')`): стартова мапа wfrp — `wfrpMagic`, `wfrpAdvancement`, `wfrpEquipment` → `characterSheet`; `wfrpCareers`, `wfrpCreation`, `wfrpEquipmentEditor`, `wfrpTraits`, `wfrpTables` → `contentLibrary` (+ `characterSheet`, якщо їх читає аркуш); `inspiration` → `characterSheet` + `battle`; `skillTree` → `characterSheet` + пакет `dm/skills`-маршруту. Зафіксувати в коміті таблицю «старий слот → пакети».
- `ROUTE_SCOPES` стартовий склад (ключі нижче — без префікса `[id]/`, у коді з ним) — з аудиту (`needed` по маршрутах, див. `scripts/i18n/route-audit.ts` звіт): `list`→`campaigns`; `[id]` (дашборд, ключ `[id]`)→`dashboard`,`rules`; `info`→`dashboard`,`rules`,`characterSheet`,`abilityDisplay`; `character`→`characterSheet`,`abilityDisplay`,`rules`,`story`; `character/draft`,`character/new`,`character/edit`→`characterSheet`,`contentLibrary` (`SourceNotes` читає `compendium`); `battles`→`battle`,`abilityDisplay`,`characterSheet`,`rules`,`story`(`music`); `journal`→`story`; `world`,`show`,`acquaintances`→`story`; `dm`→ — (лише `contentCopy` у `contentLibrary` для списків); `dm/<content>` списки → `contentLibrary`; `dm/<content>/[id]`,`new` → `abilityDisplay`,`abilityEditor`,`characterSheet`; `dm/battles`→`battle`,`abilityDisplay`; `dm/maps`→`battle`(для `[mapId]`) / `maps`; `dm/scenario`,`dm/graph`,`dm/show`,`dm/world`,`dm/music`→`story`,`dashboard`; `dm/ai`,`dm/assistant`→`ai`; `dm/rules`→`rules`,`abilityDisplay`; `dm/units*`→`units`+…; `dm/print/*`, `dm/system/*`, `dm/classes`, `dm/skills`, `dm/main-skills`, `dm/npc-heroes`, `dm/backgrounds` — консервативно (`characterSheet`,`abilityDisplay`,`abilityEditor`,`contentLibrary`). Остаточний склад доводить задача 4.

- [ ] **Step 1: Тест (падає)** `route-scopes-model.test.ts`:
```ts
it('every pack namespace exists and packs do not repeat the base', () => {
    for (const ns of Object.values(PACKS).flat()) {
        expect(NAMESPACES).toContain(ns);
        expect(CAMPAIGN_BASE).not.toContain(ns);
    }
});
it('a null system gets only core namespaces', () => {
    expect(routeNamespaces('[id]/battles', null)).toEqual(expect.arrayContaining(['battle', 'battleLog']));
    expect(routeNamespaces('[id]/battles', null).some((ns) => ns.startsWith('wfrp'))).toBe(false);
});
it('wfrp keeps every namespace it had before on the matching routes', () => {
    const wfrp = { key: 'wfrp' };
    expect(routeNamespaces('[id]/battles', wfrp)).toEqual(expect.arrayContaining(['battleWfrp']));
    expect(routeNamespaces('[id]/character', wfrp)).toEqual(expect.arrayContaining(['wfrpEquipment', 'wfrpMagic', 'wfrpAdvancement', 'wfrpDowntime', 'wfrpCorruption']));
    expect(routeNamespaces('[id]/character/draft', wfrp)).toEqual(expect.arrayContaining(['wfrpCreation']));
    expect(routeNamespaces('[id]/dm/rules', wfrp)).toEqual(expect.arrayContaining(['battleWfrp', 'wfrpDowntime', 'wfrpCorruption']));
});
it('a d20 campaign gets battleD20 only through the battle pack', () => {
    expect(systemPackScope({ key: 'dnd5e', modules: [] }, 'battle')).toContain('battleD20');
    expect(systemPackScope({ key: 'dnd5e', modules: [] }, 'characterSheet')).not.toContain('battleD20');
});
```
(ключі маршрутів у тесті — ті, що визначені в `ROUTE_SCOPES`; якщо назви інші, вирівняти.)
- [ ] **Step 2:** FAIL. **Step 3:** реалізація + міграція meta + генератор + `system-contract` (кожен ns з `packs` має JSON; ключ пакета ∈ `PackKey`). `pnpm systems:index` після зміни meta.
- [ ] **Step 4:** `pnpm test:run` для 5 тестів зі списку вище → PASS; `pnpm exec tsc --noEmit` (очікувано падіння лише в `app/**`, що ще викликають `systemScope(…,'campaign'|…)` — допустимо до задачі 3, але **не комітити зламаний tsc**: у цій задачі одразу замінити ці 4 виклики в `app/campaigns/[id]/layout.tsx`, `battles/layout.tsx`, `dm/battles/layout.tsx` на `systemPackScope`, зберігши поточну поведінку).
- [ ] **Step 5:** коміт `feat(i18n): route scope model and system packs`.

### Task 3: `abilityRegistry` → `abilityRegistry` + `abilityEditor`

**Files:**
- Create: `messages/{uk,en}/abilityEditor.json`; Modify: `messages/{uk,en}/abilityRegistry.json`, `lib/i18n/core-namespaces.ts` (додати `abilityEditor` у core-список; у `PACKS.abilityEditor`), `global.d.ts`, споживачі ключів (`grep -rn "abilityRegistry" components lib systems app`, 16 файлів).
- Test: `lib/i18n/__tests__/label-keys-abilityRegistry.test.ts` (поділити), create `label-keys-abilityEditor.test.ts`; `parity` проходить автоматично.

**Decision:** у `abilityEditor` переїжджають піддерева `fields`, `flags`, `options`, `optionGroups`, `templates`, `triggerGroups`, `damageFilters` — **лише якщо** жоден файл, досяжний з не-редакторних маршрутів (аркуш, бій, `[id]/info`, `dm/print/*`), їх не читає. Перевірка: аналізатор задачі 1 — для кожного піддерева список файлів-читачів; піддерево, яке читає `lib/utils/abilities/segments.ts`/`describe*` (рендер опису), лишається в `abilityRegistry`. Результат — таблиця в коміті.
- Читачі: `useTranslations('abilityRegistry')` → `useTranslations('abilityEditor')` для перенесених піддерев; файли, що читають обидва, — два `t`. Ключі-шаблони (`` `abilityRegistry.options.${x}` ``) — переписати префікс.
- [ ] **Step 1:** тест `label-keys-abilityEditor` (ті самі перевірки реєстрових ключів, що були для перенесених піддерев у `label-keys-abilityRegistry`) → FAIL.
- [ ] **Step 2:** перенесення JSON (uk/en, порядок ключів збережено) + споживачі.
- [ ] **Step 3:** `pnpm test:related <змінені файли>` + `label-keys-*`, `parity`, `untranslated` → PASS; `tsc`.
- [ ] **Step 4:** коміт `refactor(i18n): split ability editor texts out of abilityRegistry`.

### Task 4: `<RouteScope>` у всіх сегментах + сторожі

**Files:**
- Create: `lib/i18n/route-scope.tsx`, `lib/i18n/__tests__/route-scopes.test.ts`, відсутні `layout.tsx` під `app/campaigns/**` (мінімальні: params → `RouteScope`).
- Modify: `app/campaigns/layout.tsx` (`CAMPAIGN_BASE`), `app/campaigns/[id]/layout.tsx` (прибрати system campaign/member/dm — тепер у пакетах; `demoTours` лишити), усі layout/page з `ExtendLocaleScope` (перелік у spec §2), `app/campaigns/page.tsx`/`new` (`RouteScope route="list"`), тести layout-ів, що мокають `ExtendLocaleScope` (замокати `RouteScope` так само).
- Delete: `lib/i18n/__tests__/battle-scope-imports.test.ts`.
- Fix: `components/rules/system/SummaryStep.tsx` — простір `battleCommon` додається в скоуп `dm/rules` (лише конфіг, не компонент).

**Interfaces:**
```tsx
export async function RouteScope({ route, campaignId, children }: { route: RouteKey; campaignId?: string; children: React.ReactNode }) {
    const system = campaignId ? await systemOfCampaign(campaignId) : null;   // react cache, already per request
    const namespaces = routeNamespaces(route, system);
    return namespaces.length ? <ExtendLocaleScope namespaces={namespaces}>{children}</ExtendLocaleScope> : <>{children}</>;
}
```
Layout-шаблон:
```tsx
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <RouteScope route="[id]/dm/spells" campaignId={id}>{children}</RouteScope>;
}
```
- DM-only: пакети DM-сегментів сидять під `app/campaigns/[id]/dm/layout.tsx` (той уже обмежує доступ) — гравець їх не отримує.
- **Сторожі** (`route-scopes.test.ts`, на `routeGraph`):
  - (а) `it.each(campaignPages())('%s declares its scope')`: `usesBase` і кожен елемент `declaredRoutes` ∈ `ROUTE_SCOPES`; для сторінки під `[id]` — щонайменше один `RouteScope` у ланцюжку **або** запис у `ROUTE_SCOPE_BASE_ONLY` (сторінки, яким досить бази, з причиною).
  - (б) `it.each(campaignPages())('%s reads only namespaces in its scope')`: скоуп = `CAMPAIGN_BASE` ∪ `routeNamespaces(r, null)` для всіх `declaredRoutes` ∪ `ROOT_NAMESPACES` ∪ `whatsNew` ∪ `demoTours` ∪ `logScope`/system-ns усіх систем (`systemPackScope` для кожного `SYSTEM_META` base — щоб d20/wfrp-специфічні читання не падали); `uses` з `kind` `hook`/`server` поза скоупом → помилка з файлом; `literal`/`template` поза скоупом → помилка, якщо `file` не в `ROUTE_SCOPE_LITERAL_EXEMPT: { file: string; reason: string }[]` (стартово: рушій бою `lib/utils/battle/**` досяжний з аркуша/редакторів — «returns log refs, rendered only in battle»; уточнити за фактичним виводом, кожен рядок з причиною).
  - (в) `it.each(Object.keys(ROUTE_SCOPES))('%s has no unused namespaces')`: кожен ns `routeNamespaces(r, null)` читається (будь-який `kind`) хоча б однією сторінкою, що оголошує `r` у ланцюжку, або в `ROUTE_SCOPE_UNUSED_ALLOWED: { route; ns; reason }[]` (сторінки, що рендеряться через реєстри систем — `systemUiUses`).
  - Окремий тест: файли, досяжні з `app/campaigns/[id]/layout.tsx`+`campaign-game-shell.tsx`/`GameShell` (оболонка), читають лише `CAMPAIGN_BASE` ∪ root ∪ `whatsNew` ∪ `demoTours` — так визначається остаточний склад бази.
- **Ітерація складу:** запускати `pnpm test:run lib/i18n/__tests__/route-scopes.test.ts`, правити `CAMPAIGN_BASE`/`PACKS`/`ROUTE_SCOPES` (не компоненти) до зеленого; зайві ns — прибирати з пакетів/маршрутів, а не в allowlist, якщо читач справді відсутній.
- [ ] **Step 1:** тести-сторожі → FAIL (нема `RouteScope`).
- [ ] **Step 2:** `RouteScope`, layout-и, заміна `ExtendLocaleScope`, видалення `battle-scope-imports`.
- [ ] **Step 3:** ітерація складу до зеленого; `pnpm test:related` для змінених layout-ів (оновити тести, що мокають `ExtendLocaleScope`), `tsc`, `pnpm cycles`, eslint по `app/campaigns lib/i18n`.
- [ ] **Step 4:** коміт `feat(i18n): per-route message scopes with guards`.

### Task 5: Бюджети на маршрут

**Files:** Modify `lib/i18n/__tests__/scope-size.test.ts`, `systems/{wfrp,d20}/meta.ts` (`budgetKb.packs`), `lib/i18n/route-scopes.ts` (`ROUTE_BUDGETS_KB`, `CAMPAIGN_BASE_LIMIT_KB`).

- Бюджет бази: `CAMPAIGN_BASE` (uk/en).
- Бюджет маршруту: для кожного **листового ланцюжка** (сторінки) — `CAMPAIGN_BASE` ∪ ns усіх `declaredRoutes` ланцюжка (null-система) ∪ `whatsNew` (обрізаний `trimWhatsNew`) — ліміт `ROUTE_BUDGETS_KB[<ключ останнього RouteScope>]`. Тобто бюджет прив'язаний до ключа найглибшого сегмента; сторінки з однаковим найглибшим ключем ділять бюджет (беремо максимум).
- System: для кожної base-системи і кожного `PackKey` з `budgetKb.packs` — лише `systemPackScope(system, pack)` (+ `logScope` для `battle`).
- Значення = виміряне uk gzip + 0.5 KB, округлено вгору до 0.1; `en` перевіряється тим самим лімітом.
- Видалити `LIMIT_KB` і систему «сума ядра + системи».
- [ ] **Step 1:** переписати тест; запустити, зчитати `console.info`, вписати бюджети.
- [ ] **Step 2:** PASS; коміт `test(i18n): per-route scope budgets`.

### Task 6: Документація

**Files:** `docs/architecture/i18n.md` (новий розділ «Скоупи за маршрутом»: база, пакети, `RouteScope`, як додати ns/маршрут, сторожі й allowlist-и, бюджети; оновити п.4 «Потік мови», ч.4/ч.5/ч.6 згадки `CAMPAIGN_NAMESPACES`/`BATTLE_NAMESPACES`/слотів `battle|campaign|member|dm`), `docs/architecture/rule-systems.md` (якщо описує `i18n.campaign/member/dm`), `CLAUDE.md` — лише якщо там згадано `CAMPAIGN_NAMESPACES` (перевірити grep), `docs/STATUS.md` (рядок епіка + цифри до/після).
- [ ] Коміт `docs(i18n): route scopes`.

### Task 7: Інтеграційна перевірка (контролер)

- [ ] `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`, **один** `pnpm test:run`.
- [ ] Розмір «до»: на `main` (основне дерево не чіпати — окремий тимчасовий worktree або `git stash`-вільний `next build` у `../dnd-tracker-i18n` на коміті-базі) — зручніше: зміряти «до» скриптом через `loadMessages` для старого набору (`CAMPAIGN_NAMESPACES`+слоти), «після» — з HTML.
- [ ] `next build` + `next start -p <вільний, не 3100>` з локальною БД (`.env.local` з основного дерева, не prodcopy). Субагент Sonnet з браузером: ДМ і гравець, усі розділи `[id]/*` і `dm/*` (список сторінок — `campaignPages()`), бій (d20; wfrp — якщо є локальна wfrp-кампанія), профіль, перехід між розділами клієнтською навігацією; консоль — без `MISSING_MESSAGE`/`IntlError`, на сторінках — без сирих ключів (`/\b[a-z]+[A-Z]?\w*\.[a-z]\w*\.[a-z]/` у тексті DOM); розмір JSON повідомлень у `self.__next_f` на 6 сторінках (дашборд, аркуш, `dm/spells/[id]`, `dm/scenario`, бій, `dm/rules`).
- [ ] Фінальне рев'ю (Opus субагентом, дати diff `main...HEAD`), фікси, `/simplify` на diff (1 агент), запис у STATUS + memory.
- [ ] Merge/push — лише після окремого «так» власника; merge у тимчасовому worktree; spec/plan `git mv` у `docs/archive/superpowers/` у merge-коміті.
