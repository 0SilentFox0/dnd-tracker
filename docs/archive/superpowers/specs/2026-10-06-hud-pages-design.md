# Пункт 11 — основні сторінки в HUD-стилі + відкриті хвости

Дата: 2026-10-06 · гілка `feat/hud-pages`

## 1. Мета й межі

**Частина Б (основна).** Усі не-форменні сторінки отримують ту саму стилістику, що й форми, бій, профіль і прокачка (пункт 10): Alegreya, золото `#c9b37a`, рамки `#4a3c2c`, картки як «пропозиції» прокачки, активне — золотий метал.

Рішення користувача (2026-10-06): **варіант A**. Фоновий арт розділу (`BackgroundImage`, `public/screen-bg/*`, темний шар 75%) лишається. Вміст сторінок — напівпрозорі HUD-панелі поверх арту. Форми, профіль і бій лишаються непрозорими.

**Частина А (хвости).** Чотири відкриті дрібниці з аудиту (§6).

**Поза межами:**
- сторінки друку (`dm/print/*`) лишаються «паперовими»;
- 3c (імпорт CSV у новому форматі, `run-skills-testing` на `runAbilities`) — окремо, після рішення про формат CSV.

**Поведінка й дані не змінюються:**
- ті самі дані, запити, дії, діалоги, тексти кнопок, доступні імена й ARIA-атрибути, на які спираються тести;
- DnD юнітів між расами й рівнями працює як зараз.

**Мобільна вимога:** на 390 px немає горизонтального скролу, кнопки шапок сторінок не обрізаються.

## 2. Тема

- Правила полів і золотої кнопки в `hud.css` (зараз `.hud-form …`) поширюються на новий клас **`.hud-page`**: `.hud-form X, .hud-page X`. Тоді пошук, фільтри й головні кнопки списків виглядають як у формах.
- Акордеони всередині `.hud-surface` стилізуються в `hud.css` через `data-slot` (якщо в `components/ui/accordion.tsx` немає `data-slot`, додати `data-slot="accordion-item|accordion-trigger|accordion-content"`):
  - пункт: `background: rgba(20,16,12,.85)`, рамка `#4a3c2c`;
  - тригер: `hud-sc` золотом, hover `rgba(230,194,90,.06)`;
  - шеврон: `#8f8473`.

  Базовий shadcn-компонент не змінюється, тож поза HUD усе як було.
- **Стани** (`components/common/states`) усередині `.hud-surface`:
  - `EmptyState`: пунктир `#4a3c2c`, заголовок `hud-sc`;
  - `ErrorState`: рамка `#d0705c`;
  - `LoadingState`: скелетони `#1c1610`.

  Хуки тестів (`data-slot="skeleton-row"`, `role`, `aria-busy`, `.sr-only`) не змінюються.
- Жорсткі світлі або «чужі» кольори прибрати:
  - жовто-білий блок помилки БД у `app/campaigns/page.tsx`;
  - `border-gray-300` у `MainSkillCard`;
  - `border-green-500` / `bg-green-600` у списку боїв → HUD-акценти (активний бій — золота рамка зі світінням, завершений — приглушений).

## 3. Примітиви (`components/hud/page/`)

| Компонент | Роль |
|---|---|
| `HudPage` | Корінь сторінки: `HUD_SURFACE hud-page`, `mx-auto w-full max-w-6xl px-3 py-4 sm:px-4`, `HudPortalClassProvider value={HUD_SURFACE}`. Проп `width?: "md" \| "lg"` (`max-w-4xl` / `max-w-6xl`). Фон прозорий, арт видно з боків. Імпортує `hud.css`. |
| `HudPanel` | Напівпрозора панель: `rounded-xl border border-[#3a2e22] bg-[rgba(17,14,11,.82)] backdrop-blur-[2px]`, внутрішній відступ `p-3 sm:p-4`. Проп `as?: "section" \| "div"`. |
| `HudPageHeader` | Шапка сторінки в `HudPanel`. Назва `hud-sc text-xl text-[#efe5d2]`, підпис/лічильник `text-sm text-[#8f8473]` (наприклад, «Всього: 12»), слот `actions` праворуч, а на телефоні під назвою (`flex-wrap`, кнопки не обрізаються), слот `children` під шапкою (тулбар, таби). Замінює `PageHeader` і ~10 саморобних `h1 text-3xl` + рядок кнопок. |
| `HudCard` | Картка елемента списку в стилі `offer-card`: `rounded-lg bg-[rgba(20,16,12,.85)] shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]`, hover — повна золота рамка. Проп `tone?: "default" \| "active" \| "muted"` (активний — `inset 0 0 0 1px #e6c25a` + світіння, приглушений — `opacity-70`). Проп `accent?: string` — колір раси чи групи як ліва смуга `border-l-[3px]`. |
| `HudTile` | Плитка навігації (дашборд кампанії): іконка в рамці-металі, назва `hud-sc`, підпис. Посилання. |
| `HudChipTabs` | Таби-посилання або кнопки-фільтри як чипи з редактора вмінь (`aria-pressed` / `aria-current` зберігаються). Для фільтрів персонажів (Усі/Гравці/NPC-герої), рас у тулбарі юнітів і перемикача розділів довідника. |

`PageHeader` (`components/common`) переходить на `HudPageHeader` зі збереженням свого API, тож UnitsPageHeader, SpellsPageHeader, RacesPageHeader і MainSkillsPageHeader підхоплюються автоматично.

## 4. Оболонка

- **`Header`:** `bg-[#0b0908]/90 backdrop-blur border-b border-[#3a2e22]`, іконки `#c9b37a` (hover `#e6c25a`), меню кампанії — HUD (`HudPortalClassProvider` навколо шапки, тож `DropdownMenuContent` отримує HUD-клас). Шрифт назв пунктів — Alegreya Sans.
- **`Breadcrumbs`:** `text-xs text-[#8f8473]`, поточний пункт `text-[#efe5d2]`. Мапа назв доповнюється: `skills` → «Скіли», `races` → «Раси», `main-skills` → «Основні навики», `skill-trees` → «Дерева прокачки», `info` → «Довідник», `artifact-sets` → «Сети артефактів», `print` → «Друк». Назви в константах поруч із мапою.
- **Нові сторінки:** `app/not-found.tsx`, `app/error.tsx` (client) і `app/campaigns/loading.tsx` — `HudPage` + `HudPanel` зі станом і кнопкою «На головну» / «Спробувати ще раз».
- **Вхід і реєстрація** (`app/(auth)/sign-in`, `sign-up`): спільний компонент `AuthCard` (зараз два майже дублікати). `HudPanel` по центру, назва `hud-sc`, кнопка Google — золотий метал, помилка — HUD-бокс. Тексти й поведінка ті самі.

## 5. Сторінки

| Сторінка | Що змінюється |
|---|---|
| `/campaigns` | `HudPage` + `HudPageHeader` «Мої кампанії» (дії: приєднатися, «+ Нова»). Кампанії — `HudCard`-посилання (назва `hud-sc`, бейдж DM — золотий чип, рівень, гравці, код запрошення — моноширинний чип `#1a140f`). Порожній стан і помилка БД — HUD-стани. |
| `/campaigns/[id]` (дашборд) | `HudPageHeader` (назва кампанії, опис). Панелі `HudPanel`: «Налаштування» (макс. рівень, множник XP, код запрошення, статус, кнопки), «Учасники» (`CampaignMembersList` рядками з тонкими розділювачами), «Довідник» (`HudTile`). DM-навігація — сітка `HudTile` (`grid-cols-2 sm:grid-cols-3`). Гравцю — «Мій персонаж» як `HudTile`. |
| `/dm/units` | `UnitsPageHeader` через `PageHeader`. `UnitsToolbar`: пошук HUD, раси — `HudChipTabs`. `UnitGroupAccordion`: колір раси як `accent`, акордеон за §2, підсвітка цілі DnD — золота. `UnitCard` → `HudCard`. |
| `/dm/spells` | `SpellsPageHeader`, `SpellGroupAccordion` / `SpellLevelAccordion` (HUD-акордеони, рівні з метал-рамкою кола як у слотах), `SpellCard` → `HudCard` (іконка в рамці `#4a3c2c`). |
| `/dm/skills` | Саморобна шапка → `HudPageHeader` (ті самі 4 кнопки й посилання на друк). `SkillGroupAccordion` / `SkillGroupAccordionItem` (колір основного навику як `accent`), `SkillCard` → `HudCard`. Кількість кнопок у тригері групи не змінюється (тест рахує кнопки). |
| `/dm/main-skills`, `/dm/races` | `PageHeader` → HUD. `MainSkillCard`, `RaceCard` → `HudCard` (колір як `accent`, бейджі навиків — HUD-чипи з кольором навику). |
| `/dm/artifacts` | `HudPageHeader`. Сети — `HudCard` зі списком компактних артефактів. Слоти — HUD-акордеони. `ArtifactCard` (`full` / `compact`) → `HudCard`. Дві копії картки сету (тут і в `/dm/artifact-sets`) зводяться в одну `ArtifactSetCard` (`components/artifact-sets`). |
| `/dm/artifact-sets` | `HudPageHeader` + `ArtifactSetCard`. |
| `/dm/characters` | `HudPageHeader`, фільтр Усі/Гравці/NPC-герої — `HudChipTabs` як посилання з `aria-current`. `DmCharacterCard` → `HudCard` (аватар у золотій рамці, як у профілі). |
| `/dm/battles` | `HudPageHeader`. Секції Активні / Підготовлені / Завершені — `HudSection` (з пункту 10). Три копії картки бою зводяться в одну `BattleListCard` з `tone`. |
| `/dm/battles/[battleId]` (редагування, пропущене в пункті 10) | За рецептом пункту 10: `HudFormPage` + `HudForm` з табами Основне · Герої · Юніти · Склад (як `battles/new`). Компоненти `EditBattle*` / `Available*` / `ParticipantSideCard` переходять на `HudSection`. |
| `/dm/skill-trees` | Обгортка → `HudPage`. Редактор дерева вже частково HUD — лише перевірка на узгодженість (заголовки, кнопки) без зміни логіки. |
| `/campaigns/[id]/info` (довідник) | Прибрати власну градієнтну обгортку → `HudPage width="md"`. `ReferenceSearchBar` — HUD-пошук і `HudChipTabs`. `ReferenceSectionAccordion` / `ReferenceGroupSection` — HUD-акордеони. `SkillReferenceCard` / `SpellReferenceCard` → `HudCard`. «Нічого не знайдено» → `EmptyState`. |
| `/campaigns/[id]/character` (немає персонажа) | `EmptyState` у `HudPage`. |

## 6. Частина А — хвости

1. **«+ рівень» на `campaign.maxLevel`.** `ProfileEditor` ховає кнопку, коли `level >= maxLevel`. `maxLevel` береться з DTO листа персонажа (`GET /characters/[id]/sheet`), якщо він там є, інакше додається туди одним полем. Сервер і так відхиляє запит.
2. **Персональне вміння без усієї бібліотеки.** `CharacterAbilitiesSection` зараз робить `useSkills(campaignId)` (усі скіли) і фільтрує на клієнті. Новий параметр `mainSkillId` у `GET /skills` (вузький `select`: id, name, icon, description) + `useSkills(campaignId, { mainSkillId })` або окремий `usePersonalSkills`. Ключ кешу окремий. Мета — менше трафіку з Supabase.
3. **Відоме AC ворогів після перезавантаження.** Зараз воно збирається на клієнті з останніх 100 подій бою. `GET` бою віддає зведення `knowledge: { acRange: Record<participantId, { min, max }> }`, обчислене на сервері тією самою функцією з `lib/utils/battle/view` по всіх подіях атак цього бою: вузький `select` по `battle_events` з типом атаки, лише потрібні поля. Клієнт об'єднує зведення з тим, що видно з подій. Спостережені риси (`observed traits`) — так само, якщо використовують ту саму модель; якщо ні — лише AC, а риси лишаються як є. Тест: знання з події #1 видно після GET з `includeRecentEvents: 100` при 150 подіях.
4. **`legacy-battle.ts`** перейменувати на `battle-response.ts` (`toLegacyBattle` → `toBattleResponse`, `buildPusherMessages` лишається). Без зміни поведінки.

## 7. Тести й перевірка

- **Нові unit-тести:**
  - `HudPageHeader`: дії на телефоні не обрізаються — лише структура, `flex-wrap`;
  - `HudCard`: `tone` і `accent`;
  - `HudChipTabs`: `aria-pressed` / `aria-current`;
  - `BattleListCard`, `ArtifactSetCard`;
  - хвости 1–3 (сервер і хук).
- **Наявні тести списків** проходять без змін (§4 огляду: тексти, ролі, `aria-pressed`, `aria-current`, кількість кнопок у тригері групи скілів, класи `EntityIcon`).
- **Ланцюжок:** `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm simulate-battle` (43/43).
- **Браузер** (локальна Docker-БД, кампанія «Перегляд профілю (пункт 8)», роль DM тимчасово і назад на `player`): кожна сторінка §5 на 390 px (iframe-перевірка `scrollWidth` + кнопки шапки) і 1280 px; DnD юніта між расами; меню в шапці й діалоги на сторінках — HUD; арт видно навколо панелей; сторінка бою, профіль і прокачка — без регресій.

## 8. Ризики

- **Правила `.hud-page` для полів і золотої кнопки.** Кнопки з власним фоном у списках можуть перефарбуватися, як це сталося з профілем у пункті 10. Перевірити grep-ом `variant` за замовчуванням із `bg-` класами в списках, і там, де треба, дати явний `variant`.
- **`backdrop-blur` на багатьох панелях** коштує на слабких телефонах. Блюр лише на `HudPageHeader` і `Header`, решта панелей — без блюру (лише прозорість).
- **Великі файли** (`ReferenceSearchBar` 279, `SpellCard` 279, `UnitsListCard`): переносимо стилі, не логіку.
