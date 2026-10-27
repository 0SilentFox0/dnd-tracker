# Інвентар героя як в іграх — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Об'єднати вкладки профілю «Речі» і «Підсумок» в одну вкладку «Інвентар»: слоти 3×3 з силуетами, гаманець, сітка рюкзака, панель деталей, drag-and-drop на десктопі і тап-дії всюди.

**Architecture:** Чиста логіка (клітинки рюкзака, правила drop) — у `lib/utils/inventory/backpack.ts`. Один хук `useInventory` (`lib/hooks/characters/`) збирає `sheet.items.grid` + `useStash` + `useStashAction`, тримає виділення і drag-стан, дає `actions`. Компоненти в `components/character-profile/inventory/` лише рендерять модель хука. Сервер і API не змінюються.

**Tech Stack:** React 19, TanStack Query, нативний HTML5 drag-and-drop (без нових залежностей), Vitest + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-27-inventory-design.md`

## Global Constraints

- Робота лише у worktree `/Users/silentfox/Work/dnd-tracker-inventory`, гілка `feat/inventory`. Без злиття в `main`.
- Без нових npm-залежностей; drag — нативний HTML5.
- Порядок слотів — `ARTIFACT_GRID_9` (кільце, шолом, амулет / дальня зброя, броня, щит / зброя, чоботи, плащ). Рамка рідкості — `ARTIFACT_RARITY_COLOR`.
- Рюкзак: 6 колонок на `lg` (`DESKTOP_QUERY` з `@/lib/hooks/common`, `min-width: 1024px`), 5 на телефоні; мінімум 3 повні ряди.
- Права: `canAct = (isDM || isOwner) && !review.pending`; інакше лише перегляд (без drag, без дій, без «+», без кнопок гаманця).
- Поки персонаж на схваленні: екіпірування видно, замість гаманця/рюкзака/журналу — `EmptyState` «Підсумок з'явиться після схвалення персонажа»; `useStash` вимкнений.
- Редактор DM (`ProfileEditor` → `CharacterArtifactsSection`) не змінюється.
- Діалоги: тільки `ResponsiveDialog` (`hud`), підтвердження — `useConfirm`, помилки — `useNotify(e.message || "Не вдалося виконати дію")`.
- Шари: компоненти не імпортують `@/lib/api/*`; хуки — з барелю `@/lib/hooks/characters`.
- UI-тексти українською; ідентифікатори англійською. Мінімум коментарів.
- Тести: `// @vitest-environment happy-dom`, рендер через `renderWithConfirm` (`components/ui/__tests__/render-with-confirm.tsx`), медіа — `mockMatchMedia(isMobile)` (`components/ui/__tests__/match-media.ts`).
- Під час задач — `pnpm test:related <files>`; `pnpm lint` і `pnpm exec tsc --noEmit` наприкінці кожної задачі; повний `pnpm test:run` — лише в задачі 6.
- Коміти закінчуються рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Ключові факти коду (прочитай перед роботою)

- `SheetArtifact.slot` (з `sheet.items.grid`) — **ключ клітинки** (`ring1`, `necklace`, `cape`…); `StashArtifact.slot` (з `useStash`) — **тип артефакта** `ArtifactSlot` (`ring`, `amulet`, `cloak`, `item`…). Відповідність — через `ARTIFACT_GRID_9[i].key` ↔ `.slotType`. Тип `item` не має слота і не вдягається.
- Сервер: `equip { artifactId }` сам обирає клітинку за типом і міняє місцями зайнятий слот; `stash { slot }` приймає ключ клітинки.
- `useStashAction` після успіху кладе новий `StashView` у кеш і (для артефактних дій) інвалідує лист героя з `awaitInvalidation`.
- `TransferArtifactDialog` приймає `source: { slot } | { artifactId }` — слот для вдягненого, id для рюкзака.
- `MoneyDialog` потребує `mode: "spend" | "gain" | "set"` (`set` — лише DM).
- Гравці можуть `addItem` (див. `lib/utils/inventory/permissions.ts`), `grant`/`revoke`/`setMoney` — лише DM.

## Review Focus

1. **Drop не-артефакта або артефакта типу `item` на слот** — особливі предмети не перетягуються; артефакт `item` не підсвічує жодного слота і drop ігнорується (без запиту). Тест — задача 1 (`dropAction`) і задача 4.
2. **Відповідність ключ↔тип** (`ring1`/`ring`, `necklace`/`amulet`, `cape`/`cloak`) — кільце з рюкзака підсвічує і приймає лише `ring1`; drop на `helmet` ігнорується. Тест — задача 1.
3. **Персонаж на схваленні** — `useStash` не викликається (`enabled: false`), екіпірування видно без drag і без дій, рюкзак замінено текстом. Тест — задача 2 і 4.
4. **Перегляд чужого героя (не DM, не власник)** — клітинки не `draggable`, деталі відкриваються, але без кнопок; «+» і кнопок гаманця немає. Тест — задача 4.
5. **Застаріле виділення** — предмет зник (передано, забрано, використано останній, інша вкладка DM) → `selection.value` стає `null`, шторка/панель не показує неіснуючий предмет і дія не шле запит зі старим id. Тест — задача 2.

---

### Task 1: Чиста логіка рюкзака і drop

**Files:**
- Create: `lib/utils/inventory/backpack.ts`
- Test: `lib/utils/inventory/__tests__/backpack.test.ts`

**Interfaces:**
- Produces:
```ts
export type BackpackCell =
  | { kind: "artifact"; key: string; artifact: StashArtifact }
  | { kind: "item"; key: string; item: SpecialItem }
  | { kind: "add"; key: "add" }
  | { kind: "empty"; key: string }; // key = `empty-${index}`

export function buildBackpackCells(view: Pick<StashView, "artifacts" | "items">, opts: { columns: number; minRows: number; withAdd: boolean }): BackpackCell[];

export type DragPayload = { from: "backpack"; artifactId: string; slotType: string } | { from: "slot"; slot: ArtifactGridSlotKey };
export type DropTarget = { kind: "slot"; slot: ArtifactGridSlotKey } | { kind: "backpack" };

export function slotAccepts(payload: DragPayload, slot: ArtifactGridSlotKey): boolean;
export function dropAction(payload: DragPayload, target: DropTarget): StashAction | null;
```
- Rules: cells = artifacts (у порядку `view.artifacts`), потім items, потім `empty`, і `add` — **остання** клітинка сітки, якщо `withAdd`. Довжина = `max(minRows * columns, ceil((content + add) / columns) * columns)`. `slotAccepts` = `payload.from === "backpack"` і клітинка з `key === slot` має `slotType === payload.slotType`. `dropAction`: backpack→slot (якщо `slotAccepts`) → `{ action: "equip", artifactId }`; slot→backpack → `{ action: "stash", slot }`; усе інше → `null`.

- [ ] **Step 1: Write failing tests** (`describe("buildBackpackCells")`, `describe("dropAction")`):
  - порожній view, `columns: 5, minRows: 3, withAdd: false` → 15 `empty`.
  - 2 артефакти + 1 предмет → порядок `artifact, artifact, item, empty…`; довжина 15.
  - `withAdd: true` → остання клітинка `add`, довжина 15, `empty` = 11.
  - 15 артефактів, `withAdd: true`, 5 колонок → 20 клітинок (росте повним рядом), 15-та артефакт, 20-та `add`.
  - 18 предметів, 6 колонок, `withAdd: false` → рівно 18.
  - `dropAction({ from: "backpack", artifactId: "r", slotType: "ring" }, { kind: "slot", slot: "ring1" })` → `{ action: "equip", artifactId: "r" }`.
  - той самий payload на `helmet` → `null`; payload `slotType: "item"` на будь-який із 9 слотів → `null`.
  - `{ from: "slot", slot: "cape" }` на `{ kind: "backpack" }` → `{ action: "stash", slot: "cape" }`; на `{ kind: "slot", slot: "cape" }` → `null`; backpack-payload на `{ kind: "backpack" }` → `null`.
  - `slotAccepts` для amulet→`necklace` true, cloak→`cape` true, amulet→`ring1` false.
- [ ] **Step 2:** `pnpm test:related lib/utils/inventory/backpack.ts` — FAIL (module not found).
- [ ] **Step 3:** Implement (без React, імпорти: `ARTIFACT_GRID_9`, `ArtifactGridSlotKey`, `StashAction`, типи з `@/types/inventory`).
- [ ] **Step 4:** Re-run — PASS. `pnpm lint` + `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(inventory): backpack cells and drop rules`.

---

### Task 2: Хук `useInventory`

**Files:**
- Create: `lib/hooks/characters/useInventory.ts`
- Modify: `lib/hooks/characters/index.ts` (export `useInventory`, `type InventoryModel`, `type InventorySelection`)
- Test: `lib/hooks/characters/__tests__/useInventory.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`buildBackpackCells`, `dropAction`, `DragPayload`, `DropTarget`), `useStash`, `useStashAction`, `useConfirm`, `useNotify`, `useMediaQuery(DESKTOP_QUERY)`.
- Produces:
```ts
export type SelectionKey = { kind: "artifact" | "item"; id: string };

export type InventorySelection =
  | { kind: "equipped"; slot: ArtifactGridSlotKey; label: string; artifact: SheetArtifact }
  | { kind: "backpack"; artifact: StashArtifact }
  | { kind: "item"; item: SpecialItem };

export interface EquipmentCell { key: ArtifactGridSlotKey; label: string; slotType: ArtifactSlot; artifact: SheetArtifact | null }

export interface InventoryModel {
  equipment: EquipmentCell[];
  backpack: { cells: BackpackCell[]; query: UseQueryResult<StashView> } | null; // null = на схваленні
  purse: Purse | null;
  access: { canAct: boolean; isDM: boolean; pending: boolean };
  layout: { desktop: boolean; columns: 5 | 6 };
  selection: { value: InventorySelection | null; set: (key: SelectionKey | null) => void };
  drag: { value: DragPayload | null; set: (p: DragPayload | null) => void };
  actions: {
    equip: (artifactId: string) => Promise<void>;
    unequip: (slot: ArtifactGridSlotKey) => Promise<void>;
    drop: (target: DropTarget) => Promise<void>;
    use: (itemId: string) => Promise<void>;
    revoke: (artifact: StashArtifact) => void; // confirm «Забрати «X»?»
    remove: (item: SpecialItem) => void;       // confirm «Викинути «X»?»
  };
  isPending: boolean;
}

export function useInventory(campaignId: string, characterId: string, sheet: CharacterSheet): InventoryModel;
```
- Decisions:
  - Хук не читає `ProfileContext` (lib не імпортує components) — `sheet` передається аргументом.
  - Виділення зберігається як `SelectionKey`; `value` **виводиться** на кожному рендері: артефакт шукається спершу в `equipment`, потім у `backpack.cells`; предмет — у `view.items`. Не знайдено → `null` (застаріле виділення).
  - Після успішних `equip`/`unequip`/`drop`/`revoke`/`remove` — `selection.set(null)` (щоб шторка не мигала між оновленням stash і sheet); після `use` виділення лишається (кількість зменшилась), а якщо предмет зник — `value` сам стане `null`.
  - Усі дії: якщо `!access.canAct` — no-op. Помилка → `notify(e.message || "Не вдалося виконати дію")`.
  - `drop(target)`: бере `drag.value`, скидає drag у `null`, рахує `dropAction`; `null` → нічого не шле.
  - `withAdd = access.canAct`.

- [ ] **Step 1: Write failing tests.** Обгортка: `QueryClientProvider` + `ConfirmProvider`; мок `@/lib/api/inventory` (`getStash` повертає view з артефактом-кільцем `{ id: "r1", slot: "ring" }`, предметом `{ id: "p1", consumable: true, quantity: 2 }`; `postStashAction` — `vi.fn()` що повертає view); `mockMatchMedia(false)`; `sheet` = `withSheet(...)` з `components/character-profile/__tests__/sheet-fixture.ts` (`viewer: { isDM: false, isOwner: true }`). Кейси:
  - `equipment` має 9 клітинок у порядку `ARTIFACT_GRID_9`, `armor` заповнена з фікстури.
  - `actions.equip("r1")` → `postStashAction("c", "ch", { action: "equip", artifactId: "r1" })`.
  - `actions.unequip("armor")` → `{ action: "stash", slot: "armor" }`.
  - `drag.set({ from: "backpack", artifactId: "r1", slotType: "ring" })` + `actions.drop({ kind: "slot", slot: "helmet" })` → `postStashAction` не викликано, `drag.value` = `null`; те саме на `ring1` → `equip`.
  - `actions.use("p1")` → `{ action: "useItem", itemId: "p1" }`.
  - стале виділення: `selection.set({ kind: "item", id: "p1" })`, потім кеш stash оновлено без `p1` (`qc.setQueryData`) → `selection.value === null`.
  - на схваленні (`review.pending: true`): `getStash` не викликано, `backpack === null`, `access.canAct === false`, `actions.equip` нічого не шле.
  - чужий перегляд (`isDM: false, isOwner: false`): `canAct === false`, немає клітинки `add`.
- [ ] **Step 2:** `pnpm test:related lib/hooks/characters/useInventory.ts` — FAIL.
- [ ] **Step 3:** Implement; експорт з барелю.
- [ ] **Step 4:** Re-run — PASS; lint + tsc.
- [ ] **Step 5: Commit** `feat(inventory): useInventory hook`.

---

### Task 3: Клітинки, силуети, сітки, гаманець

**Files:**
- Create: `components/character-profile/inventory/InventoryCell.tsx`, `slot-silhouettes.tsx`, `EquipmentGrid.tsx`, `BackpackGrid.tsx`, `PurseBar.tsx`
- Test: `components/character-profile/inventory/__tests__/inventory-grids.test.tsx`

**Interfaces:**
- Consumes: `InventoryModel` (Task 2), `slotAccepts`, `DragPayload`, `DropTarget`, `BackpackCell` (Task 1).
- Produces:
```ts
// slot-silhouettes.tsx
export const SLOT_SILHOUETTES: Record<ArtifactGridSlotKey, ReactNode>;

// InventoryCell.tsx — одна клітинка для слота і рюкзака
interface InventoryCellProps {
  label: string;                                   // aria-label, напр. «Шолом: Шолом Світла» або «Шолом, порожньо»
  thing?: { name: string; icon: string | null; rarity: string | null; badge?: string }; // badge: «×3», «⟳» для витратного
  placeholder?: ReactNode;                         // силует або «+»
  state: { selected: boolean; drop: "accept" | "dim" | null };
  dnd?: { draggable: boolean; onDragStart?: (e: DragEvent) => void; onDragEnd?: () => void; onDragOver?: (e: DragEvent) => void; onDrop?: (e: DragEvent) => void };
  onClick?: () => void;
}
export function InventoryCell(props: InventoryCellProps): JSX.Element;

export function EquipmentGrid({ inv }: { inv: InventoryModel }): JSX.Element;
export function BackpackGrid({ inv, onAdd }: { inv: InventoryModel; onAdd: () => void }): JSX.Element;
export function PurseBar({ purse, access, onMode }: { purse: Purse; access: InventoryModel["access"]; onMode: (m: MoneyMode) => void }): JSX.Element;
```
- Decisions:
  - `InventoryCell` — `<button type="button">` у квадраті `aspect-square`; заповнена — `EntityIcon` у рамці `ARTIFACT_RARITY_COLOR[rarity] ?? "border-hud-line"` (як у старому `ItemsTab`); порожня — силует з `opacity-25`, пунктирна рамка `border-hud-rule`. `title = name · artifactRarityLabel(rarity)` (hover-підказка десктопа). `selected` → `ring-2 ring-hud-gold-strong`; `drop: "accept"` → золота підсвітка, `"dim"` → `opacity-40`. Порожня клітинка без `onClick` — `disabled`.
  - Силуети: 9 inline `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>` з 1–3 простими `path`/`circle` (перстень — кільце з каменем, шолом, намисто, лук, кіраса, щит, меч, чобіт, плащ). Без зовнішніх файлів. Приклад:
    ```tsx
    ring1: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="15" r="6" /><path d="M9 6l3-3 3 3-3 3z" fill="currentColor" /></svg>),
    ```
  - `PurseBar`: рядок `з · ср · мд` (`COINS`, `COIN_LABEL`); при `access.canAct` — три малі кнопки праворуч `−` (aria «Витратити»), `+` («Отримати»), і лише DM `=` («Задати суму») → `onMode(mode)`. (Спека каже «клік відкриває MoneyDialog», але діалогу потрібен режим — тому три кнопки, а не одна.)
  - Drag wiring (у `EquipmentGrid`/`BackpackGrid`; `dataTransfer` може бути відсутній у happy-dom і на тачі — завжди `?.`):
    ```tsx
    const dragFrom = (payload: DragPayload) =>
      inv.access.canAct
        ? {
            draggable: true,
            onDragStart: (e: DragEvent) => {
              e.dataTransfer?.setData("text/plain", "inventory"); // Firefox не стартує drag без даних
              if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              inv.drag.set(payload);
            },
            onDragEnd: () => inv.drag.set(null),
          }
        : { draggable: false };

    const dropOn = (target: DropTarget) => ({
      onDragOver: (e: DragEvent) => {
        if (inv.drag.value && dropAction(inv.drag.value, target)) e.preventDefault();
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        void inv.actions.drop(target);
      },
    });
    ```
    Слот: `dnd = { ...(artifact ? dragFrom({ from: "slot", slot: key }) : {}), ...dropOn({ kind: "slot", slot: key }) }`; `state.drop = inv.drag.value?.from === "backpack" ? (slotAccepts(inv.drag.value, key) ? "accept" : "dim") : null`. Рюкзак: артефакт — `dragFrom({ from: "backpack", artifactId, slotType: artifact.slot })`; предмети не draggable; кожна клітинка рюкзака (і контейнер сітки) — `dropOn({ kind: "backpack" })`; під час drag зі слота контейнер рюкзака підсвічений. Клік по заповненій клітинці → `inv.selection.set({ kind: "artifact" | "item", id })`.
  - `BackpackGrid`: `grid-cols-5 lg:grid-cols-6` (кількість клітинок уже з `inv.layout.columns`); `add`-клітинка → `onAdd()`, placeholder «+», aria «Додати».

- [ ] **Step 1: Write failing tests** (рендер з фейковим `inv: InventoryModel` — фабрика `makeInv(overrides)` у тесті з `vi.fn()` для дій):
  - `EquipmentGrid`: 9 кнопок у порядку `ARTIFACT_GRID_9`; порожній «Шолом» має aria «Шолом, порожньо» і містить `svg`; заповнена броня має `title` «Кольчуга ельфів · Рідкісний».
  - при `inv.drag.value = { from: "backpack", artifactId: "r1", slotType: "ring" }` клітинка `ring1` має `data-drop="accept"`, решта — `"dim"` (додай `data-drop` атрибут у `InventoryCell` для тестованості).
  - `fireEvent.drop` на слот викликає `inv.actions.drop({ kind: "slot", slot: "ring1" })`.
  - `fireEvent.dragStart` на заповнений слот викликає `inv.drag.set({ from: "slot", slot: "armor" })`; при `access.canAct: false` клітинка має `draggable="false"` і `dragStart` нічого не робить.
  - `BackpackGrid`: клітинки предметів не draggable, бейдж «×2»; клік по артефакту → `selection.set({ kind: "artifact", id: "r1" })`; `add` → `onAdd`; без `add` у cells кнопки «Додати» немає.
  - `PurseBar`: показує суми; `canAct: false` — без кнопок; гравець — «Витратити»/«Отримати» без «Задати суму»; DM — усі три, клік «Задати суму» → `onMode("set")`.
- [ ] **Step 2:** `pnpm test:related components/character-profile/inventory/*.tsx` — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Re-run — PASS; lint + tsc.
- [ ] **Step 5: Commit** `feat(inventory): equipment and backpack grids with drag and drop`.

---

### Task 4: Деталі та `InventoryTab`

**Files:**
- Create: `components/character-profile/inventory/ItemDetails.tsx`, `components/character-profile/inventory/InventoryTab.tsx`, `components/character-profile/inventory/AddMenu.tsx`
- Test: `components/character-profile/inventory/__tests__/inventory-tab.test.tsx`

**Interfaces:**
- Consumes: `useInventory` (Task 2), Task 3 components, `useProfile`, `TransferArtifactDialog`, `GrantArtifactDialog`, `ItemDialog`, `MoneyDialog`, `InventoryLogPanel`, `SetList`.
- Produces:
```ts
export function InventoryTab(): JSX.Element;
export function ItemDetails({ inv, on }: { inv: InventoryModel; on: { transfer: (t: TransferTarget) => void; edit: (item: SpecialItem) => void } }): JSX.Element;
type TransferTarget = { artifact: { id: string; name: string; slot: string }; source: { slot: string } | { artifactId: string } };
```
- Decisions:
  - `ItemDetails` (без обгортки; `InventoryTab` кладе його або в праву колонку, або в шторку): назва, рідкість (`artifactRarityLabel`), слот (`label` клітинки для вдягненого / `artifactSlotLabel(slot)` для рюкзака), опис, ефекти (лише у вдягнених — `SheetArtifact.effects`), для предмета — кількість і «одноразова». Нічого не вибрано (десктоп) → «Вибери предмет, щоб побачити деталі».
  - Дії (`inv.access.canAct`, інакше кнопок немає; усі `disabled={inv.isPending}`):
    - рюкзак-артефакт: «Вдягнути» (лише якщо `slot !== ArtifactSlot.ITEM`), «Передати» → `on.transfer({ artifact, source: { artifactId } })`, «Забрати» (лише DM) → `inv.actions.revoke`.
    - вдягнений: «Зняти» → `inv.actions.unequip(slot)`, «Передати» → `source: { slot }`.
    - предмет: «Використати» (лише `consumable`), «Редагувати» → `on.edit`, «Видалити» → `inv.actions.remove`.
  - Рядок сету в деталях **не робимо**: ні `SheetArtifact`, ні `StashArtifact` не мають id сету (див. «Відкриті питання»); сети показує `SetList` під сітками.
  - `InventoryTab` розкладка:
    ```
    lg:grid lg:grid-cols-[auto_1fr] gap-4
      ліво: EquipmentGrid · PurseBar · BackpackGrid (або EmptyState на схваленні; QueryState для stash-запиту)
      право (лише inv.layout.desktop): HudPanel з ItemDetails, sticky top
    нижче на всю ширину: SetList(sheet.items.sets) · кнопка «Журнал ▸/▾» → InventoryLogPanel лише коли розгорнуто (щоб не вантажити журнал зайво); журнал прихований на схваленні
    «Зміни під час бою діють з наступного бою.» — дрібний текст під рюкзаком
    ```
  - Телефон: `<ResponsiveDialog hud open={!inv.layout.desktop && !!inv.selection.value} onOpenChange={(o) => !o && inv.selection.set(null)} title={назва}>` з `ItemDetails`; кнопки дій у `footer`.
  - Стан діалогів у `InventoryTab`: `transfer: TransferTarget | null` (знімок артефакта, бо після передачі виділення стане `null`), `editing: SpecialItem | "new" | null`, `money: MoneyMode | null`, `grantOpen`, `addOpen`. Відкриття «Передати»/«Редагувати» робить `inv.selection.set(null)` перед відкриттям діалогу (як старий `ItemsTab`).
  - `AddMenu` — маленький `ResponsiveDialog hud title="Додати"` з кнопками «Видати артефакт» (лише DM) і «Додати предмет»; для гравця «+» одразу відкриває `ItemDialog` без меню (одна опція). (Спека каже «+» лише для DM, але гравці вже мають право `addItem` у старому «Підсумку» — зберігаємо.)

- [ ] **Step 1: Write failing tests.** Мок `@/lib/hooks/characters` через `orig` + підміна: `useStash` → `{ data: view, isPending: false, isError: false, … }` (view: кільце `r1`, предмет `p1` consumable ×2, purse `{ gp: 5, sp: 0, cp: 3 }`), `useStashAction` → `{ mutateAsync, isPending: false }`, `useInventoryLog`, `useCharacterRoster`, `useTransferArtifact`, `useFreeArtifacts` — заглушки. Рендер у `ProfileContext.Provider` + `renderWithConfirm`. Кейси:
  - десктоп (`mockMatchMedia(false)`): клік по кільцю → у панелі тип «Кільце» і кнопка «Вдягнути»; клік «Вдягнути» → `mutateAsync({ action: "equip", artifactId: "r1" })`.
  - телефон (`mockMatchMedia(true)`): клік по предмету → `dialog` з назвою; «Використати» → `mutateAsync({ action: "useItem", itemId: "p1" })`.
  - drag: `fireEvent.dragStart(кільце)`, `fireEvent.drop(слот «Перстень»)` → `equip`; те саме на «Шолом» → `mutateAsync` не викликано.
  - drag зі слота «Броня» на клітинку рюкзака → `mutateAsync({ action: "stash", slot: "armor" })`.
  - перегляд (`viewer: { isDM: false, isOwner: false }`): клік по кільцю відкриває деталі без кнопок «Вдягнути»/«Передати»; немає «Додати» і «Витратити».
  - на схваленні (`review.pending: true`): видно 9 слотів і текст «Підсумок з'явиться після схвалення персонажа»; `useStash` викликано з `{ enabled: false }`.
  - DM: «+» → меню з «Видати артефакт» і «Додати предмет»; гравець-власник: «+» одразу відкриває діалог предмета.
  - «Витратити» відкриває `MoneyDialog` (діалог з назвою «Витратити»).
- [ ] **Step 2:** `pnpm test:related components/character-profile/inventory/InventoryTab.tsx` — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Re-run — PASS; lint + tsc.
- [ ] **Step 5: Commit** `feat(inventory): inventory tab with details panel and dialogs`.

---

### Task 5: Вкладка «Інвентар» у профілі

**Files:**
- Modify: `components/character-profile/CharacterProfile.tsx`, `components/character-profile/ProfileTabs.tsx`, `components/character-profile/index.ts`
- Modify tests: `components/character-profile/__tests__/profile-view.test.tsx`, `components/character-profile/__tests__/profile-tabs.test.tsx`

**Interfaces:**
- Consumes: `InventoryTab` (Task 4).
- Produces: `ProfileTabId = "basic" | "combat" | "skills" | "magic" | "items" | "story"`; `index.ts` експортує `InventoryTab` замість `ItemsTab`.
- Decisions:
  - `viewTabs()`: `{ id: "items", label: "Інвентар", content: <InventoryTab /> }`; рядок `stash` прибрати; `VIEW_TABS` без `"stash"`.
  - `asTab`: старі посилання `?tab=stash` → `"items"` (а не «Бій»).

- [ ] **Step 1: Update tests first:**
  - `profile-view.test.tsx`: у тесті перемикання вкладок «Речі» → «Інвентар» (`?tab=items`); новий кейс `initialTab="stash"` → активна «Інвентар»; немає вкладки «Підсумок». Додай мок `useStash`/`useInventoryLog` у `vi.mock("@/lib/hooks/characters", …)`.
  - `profile-tabs.test.tsx`: кейси, що рендерили `ItemsTab`, перенести на `InventoryTab` (броня з фікстури видна в слоті «Броня»; клік → деталі з «AC +2»); додай ті самі моки.
- [ ] **Step 2:** `pnpm test:related components/character-profile/CharacterProfile.tsx` — FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test:changed main` — PASS; lint + tsc.
- [ ] **Step 5: Commit** `feat(inventory): single «Інвентар» profile tab`.

---

### Task 6: Прибирання, документація, повний прогін, браузер

**Files:**
- Delete: `components/character-profile/ItemsTab.tsx`, `components/character-profile/stash/StashTab.tsx`, `stash/StashArtifactsPanel.tsx`, `stash/SpecialItemsPanel.tsx`, `stash/PursePanel.tsx` (діалоги, `InventoryLogPanel`, `describe-log.ts` лишаються).
- Modify: `lib/onboarding/whats-new.ts`, `lib/onboarding/hints.ts` (`player.character`), `lib/onboarding/help/player.ts` (список вкладок), `docs/architecture/characters.md`, `docs/STATUS.md`.

- [ ] **Step 1:** `grep -rn -e ItemsTab -e StashTab -e PursePanel -e SpecialItemsPanel -e StashArtifactsPanel app components lib` — нуль посилань поза файлами, що видаляються; `git rm` файли.
- [ ] **Step 2: Тексти.**
  - `whats-new.ts` — новий перший запис: `{ id: "2026-10-27-inventory", date: "2026-10-27", audience: "all", title: "Інвентар героя", body: "«Речі» й «Підсумок» тепер одна вкладка «Інвентар»: слоти з силуетами, рюкзак, гаманець. На комп'ютері речі можна перетягувати між рюкзаком і слотами, на телефоні — тап і дія." }`.
  - `hints.ts` / `help/player.ts`: «Речі», «Підсумок» → «Інвентар — екіпірування, рюкзак, гроші й журнал».
  - `docs/architecture/characters.md`: у розділі «Підсумок (stash)» — абзац «Клієнт: вкладка «Інвентар»» (`useInventory`, `buildBackpackCells`/`dropAction`, `SheetArtifact.slot` = ключ клітинки vs `StashArtifact.slot` = тип; drag лише десктоп, тап-дії всюди).
  - `docs/STATUS.md`: рядок «Інвентар героя» у «У роботі» (`feat/inventory`, `../dnd-tracker-inventory`, стан), дата оновлення 2026-10-27.
- [ ] **Step 3:** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:run` — усе зелене (якщо падає — виправити, не пропускати).
- [ ] **Step 4: Commit** `chore(inventory): remove old items/stash tabs, docs and what's new`.
- [ ] **Step 5: Живий браузерний прогін** (окремим Sonnet-субагентом, `pnpm dev` у worktree з локальною БД — перевір `DATABASE_URL` у `.env.local`; масштабовані скріни, перевірки через JS/текст). Десктоп (≥1280) і 390px, під DM і гравцем-власником:
  - drag кільця з рюкзака в слот (десктоп); drag на чужий слот ігнорується; swap — drag другої броні на зайняту «Броню», стара йде в рюкзак;
  - зняти (drag слот→рюкзак і кнопка «Зняти»); передати іншому герою (з рюкзака і зі слота);
  - використати витратний предмет (кількість зменшується, останній зникає, шторка закривається);
  - гаманець: «Витратити»/«Отримати» (гравець), «Задати суму» (DM);
  - «+» → «Видати артефакт» (DM), «Додати предмет» (обидва);
  - 390px: деталі як bottom sheet, без горизонтального скролу, рюкзак 5 колонок;
  - перегляд чужого героя гравцем — без дій; герой на схваленні — текст замість рюкзака.
  Знахідки виправити окремими комітами; тестові дані після прогону прибрати.
- [ ] **Step 6:** Фінальне Opus-рев'ю всієї гілки (контролер), далі `/simplify` перед злиттям.

---

## Відкриті питання (рішення прийнято в плані, можна переглянути)

- **Сет у деталях:** спека просить рядок сету, але дані артефакта не містять id сету — пропущено; сети видно у `SetList`. Якщо потрібно — окрема правка `build-sheet`/stash-view.
- **Гаманець:** три кнопки режимів замість одного кліку по рядку (`MoneyDialog` потребує режим).
- **«+» для гравця:** лишається (гравець і зараз може додавати предмети), але без «Видати артефакт».
