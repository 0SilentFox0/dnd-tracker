### Task 5: Картка HUD над токеном

**Files:**
- Modify: `components/battle/map/MapToken.tsx`, `components/battle/map/BattleMap.tsx`
- Modify: `lib/hooks/battle/useBattleMapPlayground.ts`, `components/battle/map/dev/BattleMapPlayground.tsx`
- Test: `components/battle/map/__tests__/BattleMap.test.tsx`

**Interfaces:**
- `BattleMapView` отримує `hud?: Map<string, { exact: boolean; effects: ActiveEffect[] }>`; без запису для учасника — `exact: true`, ефекти — `[]`.

**Поведінка й верстка — як `components/battle/participants/ParticipantRow.tsx`, у компактному вигляді:**
- Над портретом токена (по центру, з відступом ~4 px) — плашка `rounded-md bg-black/70 px-1.5 py-1 backdrop-blur-[2px] border border-white/10`, ширина = більше з (ширина токена, ~2.2 клітинки в px), `pointer-events-none`.
- Рядок 1: імʼя (`hud-sc font-bold text-[var(--ink)] truncate`) + праворуч HP: при `exact` — `currentHp / maxHp` (червоний `#e04a35` при `hpRatio ≤ 0.25`, інакше `#d6cbb7`), інакше `HealthLabel`.
- Рядок 2: `HealthBar participant exact` (на всю ширину плашки).
- Рядок 3 (лише якщо є ефекти): `EffectLine effects` (іконки).
- Розміри шрифтів масштабуються від розміру клітинки в px (`clamp`, мін. 9 px імʼя / 8 px HP), щоб на 20×12 у десктопі читалось, а на телефоні не розвалювалось; якщо клітинка < 22 px — показувати лише смугу HP без тексту.
- Мертвий/непритомний (`isDown`) — `opacity-40`, імʼя `line-through`, як у рядку.
- Зміна HP: плаваюче число й спалах портрета, як у `ParticipantRow` (`useHpChange`, `useDamageShake`, класи `animate-[hud-float…]`, `animate-[hud-flash-red…]`/`green`).
- Прибрати поточну тонку `HealthBar` під портретом (її замінює плашка).
- Шар плашок вище за токени (`z-index`), щоб сусідні портрети не перекривали текст; плашка поточного/обраного учасника — найвище.
- Пісочниця: будує `hud` з `exact: true` для всіх і ефектами з `useDisplayEffectMap(participants)` (як сцена бою), щоб іконки ефектів відображались; додати двом мок-учасникам по 1–2 активні ефекти (наприклад, бафф і дебафф — подивися формат `ActiveEffect` у `types/battle.ts` і приклади в тестах), щоб рядок ефектів був видимий.
- Тести: плашка показує імʼя й «HP / max» для `exact`; при `exact: false` — немає чисел HP; є іконка ефекту, коли ефект передано.
- Перевірка: focused tests, `pnpm exec tsc --noEmit`, `pnpm lint`, повний `pnpm test:run`.
- Commit: `feat(battle-map): row-style HUD card above map tokens`

**Доповнення до Task 5 (вимога користувача): карта завжди вміщується в екран без скролу.**
- `BattleMap` займає весь наданий батьком прямокутник і вписує в нього карту з пропорцією `cols:rows` (contain): обчислення через `ResizeObserver` на зовнішній обгортці (`h-full w-full flex items-center justify-center`) → внутрішній блок отримує `width/height` у px = `min(W, H·ratio)` × `min(H, W/ratio)`. Обчислення — чиста функція `fitMapBox(avail: {width,height}, map) → {width,height}` у `lib/utils/battle/grid/layout.ts` з тестом (широкий і високий контейнер, 20×12 і 20×40).
- Пісочниця: сторінка `h-dvh overflow-hidden`, шапка/панель керування фіксованої висоти; область карти — `flex-1 min-h-0`. На мобілці панель керування згорнута над картою (компактний рядок кнопок), карта займає решту висоти.
- Тест компонента: при контейнері 1000×500 і карті 20×40 внутрішній блок має висоту ≤ 500.
- Ручна перевірка: 20×12 і 40×40 у вікні 1440×800 — без прокрутки сторінки.
