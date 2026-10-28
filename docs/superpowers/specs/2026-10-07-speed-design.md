# Пункт 13 — швидкодія фронтенду для гравців

Дата: 2026-10-07 · гілка `feat/speed` · джерело: `docs/reports/final-review-2026-10-07.md` (розділ C)

## Мета

Бій і профіль на телефоні відкриваються й реагують швидше, без зміни поведінки й даних.

**Критерії:**
- перше завантаження JS бою ≤ 300 KB gz (зараз 459);
- перше завантаження JS профілю ≤ 280 KB gz (зараз 392);
- на холодному завантаженні −1.5 MB (шрифти й фон);
- бій і профіль показують дані в першому HTML (без «JS → фетч»);
- жоден `/api` запит не робить мережевий виклик до Supabase Auth, якщо можна перевірити JWT локально;
- атака перемальовує список учасників щонайбільше двічі.

**Вимірювання до і після** записати в звіт: `pnpm build`, gzip entry-чанків кожного маршруту з `.next` (як у рев'ю), кількість preload-шрифтів, розмір фону, кількість рендерів на атаку (React Profiler у тесті або лічильник).

## Потоки робіт (паралельно, кожен у своєму worktree)

### S1 — ресурси й оболонка (C1, C2, C9, C10)

1. **Шрифти** (`components/hud/fonts.ts`, `app/layout.tsx`):
   - Alegreya Sans — 400 і 700, Alegreya SC — 700 (перевір, які ваги реально використовуються, через grep класів `font-*`/`hud-sc`);
   - preload лише Sans 400 і SC 700, решта `preload: false`;
   - курсиви не вантажити, якщо ніде не використовуються;
   - EB Garamond (`.hud-book`) з `preload: false`;
   - Geist Mono прибрати, `font-mono` → системний моноширинний;
   - Geist додати кириличний subset або замінити на Alegreya Sans як основний шрифт тексту, якщо дизайн дозволяє (рішення — за візуальною рівністю).
2. **Фон:**
   - усі `public/screen-bg/*` конвертувати у `webp` (довша сторона ≤ 1600 px, якість ~70) і лишити оригінали лише якщо десь посилаються;
   - фон розділу виставляти на сервері: клас або `data-bg` на `body` / обгортці з layout за сегментом маршруту, без `useEffect` і без дефолтного `tavern.png`, який вантажиться до гідратації;
   - прибрати `background-attachment: fixed`, замінити на фіксований псевдоелемент `body::before` з тим самим зображенням.
3. **Шапка без supabase-js:** email користувача приходить з серверного layout (`getClaims`) пропом. Вихід — через `POST /auth/signout` (route handler, `supabase.auth.signOut()` на сервері + redirect) або динамічний імпорт клієнта лише при натисканні. `HudPortalClassProvider` лишається.
4. **Дрібне:**
   - `backdrop-blur` прибрати там, де фон ≥ 90% непрозорий (Header, HudTabs, BattleLogPanel), а непрозорість підняти до ~97%;
   - повноекранний blur у `BattlePreparationView` прибрати;
   - мемоізувати `ProfileContext` value;
   - дедуплікувати `@radix-ui/react-primitive` (один пакет `radix-ui` або лише `@radix-ui/*` — обрати той, що вже переважає).

### S2 — мережа, авторизація, дані на сервері (C3, C4, C5 + трафік бою)

1. **Pusher розділити:**
   - `lib/pusher-client.ts` (`pusher-js`, `getPusherClient`, `channelAuthorization`);
   - `lib/pusher-server.ts` (`import "server-only"`, `pusherServer`).

   `usePusherBattleSync` імпортує лише клієнтський модуль. Маршрути й `default-deps` імпортують серверний. `lib/pusher.ts` видалити. Тест: клієнтський модуль не тягне `pusher` (перевірка імпортів).
2. **Auth:**
   - `lib/supabase/middleware.ts` → `getClaims()` замість `getUser()`; matcher у `proxy.ts` без `/api` (маршрути самі перевіряють сесію; оновлення токена — через сторінки);
   - `requireAuth` / `getAuthUser` (`lib/utils/api/api-auth.ts`, `lib/auth.ts`) і `pusher/auth` → `getClaims()` (`sub`), `getUser()` лише там, де потрібні `user_metadata` / email (auth callback, створення кампанії, join).

   Перевір, чи проєкт Supabase використовує асиметричні ключі JWT: `getClaims` перевіряє локально лише з ними. Якщо ні, зафіксуй у звіті й запропонуй увімкнути (Dashboard → JWT Keys). Тести на нові шляхи авторизації.
3. **Дані в першому HTML:**
   - `battles/[battleId]/page.tsx` і `character/page.tsx` (+ DM-версія профілю) завантажують сцену й лист на сервері тими самими функціями, що й GET-маршрути (з тими самими правилами доступу й санітизації для гравця);
   - передають як `initialData` у `useBattle` / `useCharacterSheet` (або `HydrationBoundary`), тож на клієнті немає повторного GET;
   - `loading.tsx` лишаються для навігації.

   Кількість читань з БД на відкриття не росте (той самий завантажувач, без дублювання).
4. **Трафік бою на дію:**
   - заміряти, скільки байтів читає `loadBattle` на дію в бою з 15 учасників;
   - якщо снапшоти учасників (найбільша частина) не змінюються між діями, зменшити читання. Варіанти: читати снапшот лише для учасників, яких мутація реально торкається (якщо рушій це дозволяє), або тримати хеш снапшоту й не перечитувати. Обрати найпростіший безпечний.
   - якщо безпечного варіанта немає — задокументувати чому й лишити.
   - записи журналу в Pusher-дельті урізати до полів, які показує журнал (`details` без важких полів), якщо це не ламає знання / відкат.

### S3 — бандл і рендер (C6, C7, C8)

1. **Мемоізація сцени бою:**
   - `useBattleSceneValue` — `useMemo` для похідних (turn, queue, allies, enemies) і value;
   - швидкозмінний UI-стан (toast, result, log, selection, `anyPending`) — в окремий контекст, щоб список учасників не перемальовувався;
   - `ParticipantList` — AC і знання мемоізувати на `[order, battleLog, knowledge]`;
   - `useBelowHeaderHeight` рахувати один раз у `BattleScreen` (state + resize), а не читати layout під час рендеру.

   Тест: кількість рендерів `ParticipantRow` / `ParticipantList` на атаку ≤ 2.
2. **Zod поза клієнтом гравця:**
   - константи, type guards і `DICE_RE` з `lib/utils/abilities/schema` у модуль без zod (`schema/kinds.ts`);
   - клієнтський код імпортує звідти та глибокими шляхами, а не з бочки `@/lib/utils/abilities`;
   - `lib/utils/characters/goals.ts` бере `MAX_GOALS` з константи.

   Перевірка: chunk zod не входить у entry бою й профілю гравця.
3. **Ліниве завантаження:**
   - через `next/dynamic` вантажити `DesktopBattleLayout` (лише ≥ 1024 px), `DmPanel` і DM-діалоги (лише DM), `BattlePreparationView`, `CompleteBattleDialog`, `ResultOverlay`, майстри атаки й книги заклинань (лише на своєму ході), `ProfileEditor` (лише при редагуванні);
   - framer-motion у `BattlePreparationView` замінити на CSS `animate-in fade-in`, а залежність прибрати, якщо більше ніде не використовується.

## Поза межами

Рефактор дублікатів і якість — пункт 14.

## Перевірка

- `pnpm test:run && pnpm test:integration && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm simulate-battle`.
- Виміри до і після (§ Мета).
- Браузер:
  - бій (DM і гравець) на 390 і 1280 px: шрифти, фон, лінивий DM-UI, анімації;
  - профіль, шапка: email і вихід;
  - вхід і вихід;
  - онлайн на проді після мерджу: дві вкладки, як у пункті 12.
- Opus-рев'ю всієї гілки → виправлення → мердж.
