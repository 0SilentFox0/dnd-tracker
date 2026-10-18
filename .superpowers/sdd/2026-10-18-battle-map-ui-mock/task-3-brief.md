### Task 3: Сторінка-пісочниця `/dev/battle-map`

**Files:**
- Create: `app/dev/battle-map/page.tsx` (server: `notFound()` у production, інакше рендер клієнта)
- Create: `components/battle/map/dev/BattleMapPlayground.tsx` (`"use client"`)
- Create: `components/battle/map/dev/mock-participants.ts`
- Create: `lib/hooks/battle/useBattleMapPlayground.ts` (стан і логіка пісочниці; експорт у barrel)

**Interfaces:**
- Consumes: `BattleMap` (Task 2), `moveMarks`, `targetMarks`, `placeParticipants`, `attackReachError`, `cellKey`, `DEFAULT_BATTLE_MAP`, `createMockParticipant` **не можна** (тестова фікстура) — мок-учасників будуй вручну в `mock-participants.ts` як `BattleParticipant[]` з мінімальними полями (подивись `lib/utils/battle/__tests__/fixtures/mock-participant.ts` як довідку по обовʼязкових полях і скопіюй потрібну структуру).

**Мок-набір (8 учасників):** союзники — «Лицар» (melee, speed 30), «Лучниця» (ranged `80/320 фт`, speed 30), «Маг» (ranged `60 фт`, speed 30), «Грифон» (melee, speed 40, `gridSize: 2`); вороги — «Скелет-воїн» ×2 (melee, speed 30), «Скелет-лучник» (ranged `80/320 фт`), «Кістяний дракон» (melee, speed 40, `gridSize: 2`). Аватари — `unitIcon("<file>")` = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/unit-icons/${file}.webp`; файли підбери з `ls assets/unit-icons` (люди/некроманти/нейтрали — наприклад `humans-*`, `necromancers-*`); якщо env немає — без аватара (ініціали). Різні HP, у одного скелета `currentHp` = 30 % від max, щоб було видно смугу.

**Хук `useBattleMapPlayground()`** повертає `{ map, setMap, participants, activeId, mode, view, actions, controls }`:
- `map` — стан `BattleMapConfig` (старт `DEFAULT_BATTLE_MAP`), учасники розставлені `placeParticipants(map, mock)` при старті й при зміні `cols/rows/grid` (позиції скидаються й розставляються заново).
- `activeId` — чий «хід» (перший союзник на старті); `mode: "move" | "attack"`.
- `view.marks`: у режимі `move` — `moveMarks(...)` для активного; у режимі `attack` — `targetMarks(...)` з першою атакою активного.
- `view.trajectory`: у режимі `attack` при наведенні на клітинку з `"target"` — лінія від активного до цієї клітинки.
- `actions.onCellClick(p)`: `move` — якщо клітинка є в marks, оновити `position` і `movementUsed += cost`; `attack` — якщо `"target"`, знайти ціль під клітинкою й зменшити її `currentHp` на 7 (при ≤ 0 → `status: "dead"`), записати рядок у локальний лог.
- `actions.onTokenClick(id)` — зробити учасника активним (як «вибрати, хто ходить»).
- `controls`: `nextTurn()` (наступний живий у списку, `movementUsed: 0`), `setMode`, `reset()` (початковий мок).

**Сторінка (`BattleMapPlayground`)**: обгортка `battle-hud min-h-screen` (клас із `components/battle/hud/battle-hud.css`; імпортуй CSS так само, як сцена бою — знайди `grep -rn "battle-hud.css" app components`), заголовок «Карта бою — пісочниця», ліворуч на desktop / зверху на mobile панель керування:
- форма сітки (кнопки «Квадрати» / «Гекси»), повзунок прозорості 0–1, поля колонок/рядків (4–40),
- режим «Рух» / «Атака», кнопка «Наступний хід», «Скинути»,
- картка активного учасника: імʼя, залишок руху (`remainingMovement`), атака (назва, тип, дальність),
- лог останніх 6 дій;
праворуч / знизу — `BattleMap` на всю ширину. На ширині < 1024 px — колонка; ≥ 1024 — `grid-cols-[300px_1fr]`. Використовуй наявні HUD-компоненти (`HudPanel`, `HudChipTabs` з `components/hud/page`), якщо вони підходять без підганяння; інакше прості tailwind-кнопки в стилі HUD.

- [ ] **Step 1:** Тест хука (`lib/hooks/battle/__tests__/useBattleMapPlayground.test.ts`, happy-dom, `renderHook` з `@testing-library/react`, якщо є): старт — усі мок-учасники мають позицію; `onCellClick` у режимі `move` на досяжну клітинку змінює позицію активного й `movementUsed`; на недосяжну — нічого; `nextTurn` скидає рух і змінює `activeId`; зміна `grid` на `hex` перерозставляє всіх без перекриттів.
- [ ] **Step 2: Run — FAIL**, реалізація, **Run — PASS**.
- [ ] **Step 3:** Сторінка й мок; `pnpm exec tsc --noEmit`, `pnpm lint`, повний `pnpm test:run`.
- [ ] **Step 4:** Ручна перевірка: `pnpm dev`, відкрити `http://localhost:3000/dev/battle-map` (потрібен вхід — сторінка під авторизацією, як решта застосунку): видно фон, сітку, 8 токенів; клік по клітинці рухає; «Атака» підсвічує цілі; «Гекси» перемальовує. Зафіксуй у звіті, що саме перевірив (або що dev-сервер не вдалося запустити).
- [ ] **Step 5: Commit** — `feat(battle-map): /dev/battle-map playground with mock participants`
