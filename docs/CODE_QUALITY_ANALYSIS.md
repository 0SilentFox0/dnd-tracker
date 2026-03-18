# Аналіз стану коду проєкту (dnd-combat-tracker)

**Дата:** березень 2025  
**Обсяг:** ~559 TS/TSX файлів, ~212 тестових файлів

---

## 1. Загальна оцінка

| Критерій | Оцінка (1–5) | Коментар |
|----------|--------------|----------|
| **Типізація** | 4/5 | Домінують інтерфейси та типи; є дублі типів і місцями `any`/`unknown`. |
| **Дублювання** | 3/5 | Повторення в API routes, логіці бою та UI; частина вже винесена в утиліти. |
| **Декомпозиція компонентів** | 3.5/5 | Battle/participant-card розбито добре; є великі файли (PlayerTurnView, battle-participant). |
| **Тестування** | 4/5 | Багато юніт-тестів для battle/skills; API та інтеграційні тести є. |
| **Консистентність** | 4/5 | Єдині патерни (hooks, API auth, Zod), але не скрізь однаково. |

**Підсумок:** Код у хорошому стані для проєкту такого розміру. Найбільший потенціал — зменшити дублювання, централізувати типи та розбити кілька «гігантів».

---

## 2. Таблиця по папках

### Кореневі каталоги

| Папка | Рядків (орієнт.) | Типізація | Дублювання | Декомпозиція | Рекомендації |
|-------|------------------|-----------|------------|--------------|--------------|
| **`/types`** | ~50k | 5/5 | 2/5 (дублі) | — | Об’єднати дублі: `AttackData`, `MoraleCheckResult` в один джерело істини. |
| **`/lib`** | велика | 4/5 | 3/5 | 4/5 | Розбити `battle-participant.ts` (1600+ рядків); винести спільні патерни API. |
| **`/components`** | велика | 4/5 | 3/5 | 3.5/5 | Декомпозувати `PlayerTurnView`, `DamageSummaryModal`; уніфікувати форми. |
| **`/app`** | велика | 4/5 | 3/5 | 3/5 | Сторінка бою 500+ рядків — винести логіку в hooks/views. |
| **`/scripts`** | — | 3/5 | 2/5 | — | Дублювання з app/lib; можна використовувати спільні типи та утиліти. |

### `/types`

| Файл/підтема | Оцінка | Проблеми | Поради |
|--------------|--------|----------|--------|
| `battle.ts` | 5/5 | Великий файл, але структурований | Розглянути розбиття на battle-actions, battle-effects тощо. |
| `api.ts` | 5/5 | — | Єдине джерело для API payloads. |
| `battle-ui.ts` | 4/5 | Дубль `AttackData` з `api.ts` | Імпортувати з `api` або реекспортувати з одного місця. |
| `utils.ts` | 4/5 | Дубль `MoraleCheckResult` з battle-morale | Використовувати тип з `lib/utils/battle/battle-morale` або експорт з types. |

### `/lib`

| Підпапка | Оцінка | Проблеми | Поради |
|----------|--------|----------|--------|
| **`lib/utils/battle`** | 4/5 | `battle-participant.ts` 1600+ рядків, багато `unknown`/cast у API | Розбити на build-participant, skills-extraction, combat-stats; зменшити приведення типів. |
| **`lib/utils/skills`** | 4/5 | Складні типи, тести покривають | Залишити як є; при рефакторингу — виносити константи. |
| **`lib/utils/balance-calculations`** | 5/5 | Чисті функції, перевикористання | Можна експортувати `getDiceSlots` із balance-calculations, щоб не дублювати в DamageRollDialog. |
| **`lib/hooks`** | 4/5 | Частина хуків з `any` (useSkillForm, useDamageCalculator) | Посиліти типи для форм і калькулятора. |
| **`lib/api`** | 5/5 | Консистентні функції | Мінімальні зміни. |
| **`lib/constants`** | 5/5 | Чіткі константи | — |

### `/components`

| Підпапка | Оцінка | Проблеми | Поради |
|----------|--------|----------|--------|
| **`components/battle`** | 4/5 | `PlayerTurnView` 766 рядків, багато стану | Розбити на під-views (AttackFlow, DamageFlow, MoraleFlow) або хуки useAttackFlow, useDamageSubmit. |
| **`components/battle/dialogs`** | 4/5 | Спільний патерн (BattleDialog, ConfirmCancelFooter) | Продовжити використовувати shared; перевірити дублі валідації (dice, roll). |
| **`components/battle/cards`** | 5/5 | ParticipantCard вже декомпонований | Можна винести damage-flash логіку в хук useDamageFlash. |
| **`components/ui`** | 5/5 | Radix + кастом, типізовані пропси | — |
| **`components/skills`** | 4/5 | Складні форми, частина дублів у ефектах | Винести спільні поля ефектів у перевикористовувані компоненти. |
| **`components/characters`** | 4/5 | Багато секцій, частково дублі з DM сторінок | Спільні компоненти для character view (accordion вже є). |
| **`components/campaigns`** | 4/5 | — | Продовжити використовувати ReferenceGroupSection та подібні. |

### `/app`

| Підпапка | Оцінка | Проблеми | Поради |
|----------|--------|----------|--------|
| **`app/api/campaigns/[id]/battles`** | 4/5 | Повторення: requireCampaignAccess, prisma, strip-battle-payload | Загальний middleware/helper для battle routes (getBattleWithAccess). |
| **`app/campaigns/[id]/battles/[battleId]`** | 3.5/5 | page.tsx 513 рядків, багато стану та діалогів | Винести стан діалогів у useBattlePageDialogs; логіку моралі/overlay — в окремі хуки. |
| **`app/campaigns/[id]/dm`** | 4/5 | page-client патерн повторюється | Спільний layout для DM секцій (list + header + actions). |
| **`app/campaigns/[id]/character`** | 4/5 | Accordion-структура добра | Продовжити використовувати character-view компоненти. |

---

## 3. Типізація

### Сильні сторони

- Чіткі інтерфейси в `types/` (BattleParticipant, BattleAction, ActiveEffect, SkillEffect тощо).
- Zod для валідації API (attack, morale-check, spell).
- Типи для пропсів компонентів (наприклад, `ParticipantCardProps`, `PlayerTurnViewProps`).

### Проблеми

- **Дублі типів:** `AttackData` в `types/api.ts` і `types/battle-ui.ts`; `MoraleCheckResult` в `types/utils.ts` і `lib/utils/battle/battle-morale.ts`. Потрібне одне джерело істини.
- **any/unknown:** понад 80 згадок; сконцентровані в API routes (initiativeOrder as BattleParticipant[]), skill form, character view, strip-battle-payload. Де можливо — замінити на конкретні типи або generics.
- **Типи з lib і types:** частина типів живе в `lib/utils/battle` (MoraleCheckResult), частина в `types`. Краще чітко розділити: доменні типи в `types`, утилітні типи результату функцій — біля реалізації з реекспортом у `types` за потреби.

### Рекомендації

1. Визначити один модуль для `AttackData` (наприклад, `types/api.ts`) і в `battle-ui` імпортувати з нього.
2. `MoraleCheckResult`: експортувати з `lib/utils/battle/battle-morale` і в `types/utils` робити `export type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale"` або видалити дубль.
3. Поступово замінювати `as unknown as BattleParticipant[]` на типізовані хелпери (наприклад, `parseInitiativeOrder(json)` з поверненням `BattleParticipant[]`).
4. У формах (skills, characters) посилити типи подій та даних (unique-ідентифікатори, enum замість рядків де доречно).

---

## 4. Дублювання коду

### Де повторюється

1. **API battle routes**  
   Один і той самий патерн: `requireCampaignAccess` → отримати battle → знайти participant/initiativeOrder → перетворення типів. Рішення: хелпер `getBattleForCampaign(campaignId, battleId)` або middleware, що кладе типізований battle у контекст.

2. **Розрахунок hit/miss (attack roll)**  
   Логіка d20 + bonus vs AC повторюється в `PlayerTurnView` (handleAttackRollConfirm, handleRollResultComplete для multi-target). Рішення: винести в `lib/utils/battle/attack-roll-helpers.ts` (наприклад, `resolveAttackRoll(data, targetAC)` → { hit, crit, critFail }).

3. **Dice notation**  
   `getDiceSlots` в `DamageRollDialog` дублює ідею з `parseDiceNotationToGroups`. Рішення: експортувати з balance-calculations `getDiceSlots(formula): number[]` і використовувати в діалозі.

4. **mergeDiceFormulas**  
   Використовується в кількох місцях (battle-attack-process, battle-damage-breakdown, PlayerTurnView) — це вже добре, дубль не потрібен.

5. **Скидання стану після атаки**  
   Набір setSelectedAttack(null); setSelectedTarget(null); … повторюється в кількох гілках у PlayerTurnView. Рішення: функція `clearAttackState()` або хук `useAttackState()`, що повертає state + clear.

6. **DM list pages**  
   Патерн page.tsx + page-client.tsx + список + header повторюється (skills, spells, units, characters, races). Рішення: спільний `DmListLayout` або HOC з конфігом (title, useQuery, columns, createPath).

### Рекомендації

- Впровадити 1–2 спільні хелпери для battle API (getBattle, getParticipant).
- Винести attack-roll resolution у одну функцію і використовувати в клієнті та (за потреби) на бекенді.
- Уніфікувати скидання стану атаки в одному місці (функція або хук).

---

## 5. Декомпозиція та оптимізація

### Компоненти

| Компонент | Рядків | Рекомендація |
|-----------|--------|--------------|
| **PlayerTurnView** | ~766 | Розбити на: TurnStartBlock, ActionPanelWithDialogs, AttackFlow (roll → damage → summary), MoraleBlock. Або хуки: useAttackFlow, useMoraleCheck, useSpellCast. |
| **Battle page (page.tsx)** | ~513 | Винести: useBattlePageDialogs, useMoraleOverlay, окремий компонент BattlePageDialogs (всі діалоги в одному місці). |
| **DamageSummaryModal** | великий | Розбити на: DamageSummaryContent, TargetBreakdownList, один хук для fetch breakdown. |
| **battle-participant.ts** | 1619 | Розбити на: build-from-character, build-from-unit, extract-skills, extract-attacks, apply-defaults; за потреби підмодулі по типах учасників. |

### Продуктивність

- **ParticipantCard:** вже є useMemo для groupedEffects; damage flash через queueMicrotask — добре. Можна розглянути React.memo для списку карток, якщо список учасників великий.
- **Battle:** при частій зміні initiativeOrder перевірити, що не перестворюються зайві об’єкти в контексті/хуках.
- **Queries:** переконатися, що react-query keys узгоджені (campaignId, battleId) і не викликають зайвих refetch.

### Рекомендації

1. Поетапно декомпонувати PlayerTurnView (спочатку хуки, потім розбиття на підкомпоненти).
2. Винести логіку сторінки бою в хуки; page лишати тонким (композиція + маршрутизація).
3. Розбити `battle-participant.ts` на 3–5 модулів за відповідальністю.
4. Для списків (participants, skills, spells) при потребі додати віртуалізацію або пагінацію.

---

## 6. Загальні поради

1. **Типи:** один джерело істини для спільних типів (API, battle-ui); реекспорт з одного місця.
2. **API:** спільний хелпер для battle routes (auth + load battle + типізація).
3. **Battle UI:** один хук для стану атаки (targets, rolls, damage, submit) і один для діалогів сторінки бою.
4. **Тести:** зберегти поточний рівень покриття для battle/skills; додати інтеграційні тести для критичних API (attack-and-next-turn, morale-check).
5. **Документація:** зафіксувати в README або ARCHITECTURE.md: де живуть типи (types vs lib), як влаштовані battle flow та API routes.
6. **Lint:** увімкнути strict rules для any (no-explicit-any) поетапно по модулях після виправлення типів.

---

## 7. Пріоритизація змін

| Пріоритет | Задача | Складність | Вплив |
|-----------|--------|------------|--------|
| Високий | Об’єднати дублі типів (AttackData, MoraleCheckResult) | Низька | Менше плутанини, краща підтримка |
| Високий | Хелпер для battle API (getBattle / getParticipant) | Середня | Менше дублювання, менше помилок |
| Середній | Винести attack-roll resolution у утиліту | Низька | Менше дублів у PlayerTurnView |
| Середній | getDiceSlots з balance-calculations у DamageRollDialog | Низька | Один місць для логіки кубиків |
| Середній | Розбити battle-participant.ts на модулі | Середня | Читабельність, тестування |
| Нижчий | Декомпозиція PlayerTurnView (хуки + підкомпоненти) | Середня | Підтримка та повторне використання |
| Нижчий | Зменшити any/unknown у формах і API | Різна | Краща безпека типів |

Цей документ можна оновлювати після рефакторингів і використовувати як орієнтир для наступних ітерацій.
