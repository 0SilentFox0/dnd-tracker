# Ability flow: КОЛИ → ЯКЩО → ТОДІ → ЛІМІТ (етап 1 з 3, UX 5e-конструктора)

Гілка `feat/ability-ux` (worktree `../dnd-tracker-ux`). Етапи 2 (редактор: рецепти, згортання секцій, форма заклинань) і 3 (перегляд класів/рас/рис/підкласів) мають власні spec після цього.

## Мета

Нова людина, яка відкриває редактор здібностей або картку класу/раси/риси, має за секунду прочитати схему «коли → якщо → що → скільки разів». Зараз підсумок — один рядок через « · » (`describeAbility`), у редакторі він дрібний і стоїть під назвою, а тригер — довгий плаский список із 20+ подій.

Узгоджено з користувачем: варіант B (кольорові чипи) і в редакторі, і в перегляді; обсяг — тільки етап 1; модель даних і рушій не змінюються.

## Не в обсязі

Форма заклинань, рецепти/галерея, згортання секцій, таймлайн класів, перейменування тригерів/ефектів, зміни схеми `Ability`. Решта i18n part 6 (UI бою, crit-ефекти) теж поза обсягом; ability-описи з нього забираємо в цю гілку (див. крок 0).

## Дизайн

### 0. `describe*` через ключі (передумова)

Усі `describe*` у `lib/utils/abilities/registry/` (ефекти в `effects/*.ts`, `triggers.ts`, `limitsLabel` у `labels.ts`, опис умов) перестають повертати українські рядки й повертають `Segment = { key: string; params?: Record<string, string | number> }` (ключі в `abilityRegistry.json`, `summary.*`). Вкладені значення (назва стану, стат, ціль, тип шкоди) віддаються як ключі існуючих груп (`flags`, `stats`, `targets`, `conditionTypes`, `damageFilters`), а не як готовий текст, і розгортаються на межі. `randomOf` та інші складені ефекти містять вкладені `Segment[]`.

- Переклад на межі: `renderSegment(t, segment)` (одна функція в `lib/i18n/`, поруч із `getTranslator`/`translateIssue`); у серверному коді перекладу немає, він віддає сегменти.
- `describeAbility(a, t)` лишається для місць, що потребують рядка (AI-контекст, друк, `abilitySummary`-споживачі, що показують текст): збирає сегменти та перекладає.
- ~60–80 нових ICU-повідомлень у `messages/{uk,en}/abilityRegistry.json`; існуючі `effects.*.label`, `flags`, `fields`, `conditionTypes` перевикористовуються.
- Тести: параметризований по `EFFECT_REGISTRY`/`TRIGGER_REGISTRY` тест, що кожен вид має ключ у обох локалях і що `renderSegment` не лишає незаповнених `{param}`; наявні тести, що порівнюють рядки, переходять на сегменти або на перекладений рядок.
- Каталог `lib/utils/abilities/**` після кроку потрапляє до `i18n-migrated.json` (ESLint забороняє кирилицю); частина part 6 про ability-описи вважається виконаною (оновити `docs/architecture/i18n.md` і `STATUS.md`).

### 1. Структурований підсумок

`lib/utils/abilities/summary.ts` отримує чисту `summarizeAbility(a: Ability): AbilityFlowSummary`:

```ts
interface AbilityFlowSummary { when: Segment[]; if: Segment[]; then: Segment[][]; limits: Segment[] }
```

- `when` = сегменти тригера; `if` = сегменти `a.condition`; `then` = по масиву сегментів на кожен ефект; `limits` = сегменти лімітів.
- `abilitySummary(kind, row)` повертає `AbilityFlowSummary[]`; `withAbilitySummary` віддає їх у полі `abilitySummary`. Споживачі `string[]` (`format-skills-response`, `info-reference`, `artifact-reference`, `sheet-handler`, `get-progression-handler`, `to-unit`, print/skills) переходять на структуру в тому ж PR. Типи — `types/abilities.ts`.

### 2. `AbilityFlow` (`components/abilities/AbilityFlow.tsx`)

- Чотири типи чипів: КОЛИ (синій), ЯКЩО (жовтий), ТОДІ (червоний), ЛІМІТ (сірий). Кольори — токени `--hud-*` у `app/globals.css` / HUD, спільні з секціями редактора.
- Перекладає сегменти через `renderSegment` (клієнтський `useTranslations`). Props: `summary: AbilityFlowSummary`, `variant: "editor" | "card"`, `onChipClick?: (part: "when" | "if" | "then" | "limits") => void`.
- Порожній `if`/`limits` не рендеряться. Кілька ефектів — кілька ТОДІ-чипів. На вузьких екранах (<640px) чипи йдуть стовпчиком, стрілки ховаються.
- `AbilitySummary` замінюється на `AbilityFlow variant="card"`; його споживачі: `SkillCard`, `UnitCard`, `ArtifactCard`, `ArtifactSetCard`, `ArtifactSetBonusDisplay`, `app/campaigns/[id]/info`, dm/artifact-sets. `AbilitySummary` видаляється, якщо споживачів не лишиться.

### 3. Редактор

- `AbilityPanel`: `AbilityFlow variant="editor"` угорі, під назвою, замість дрібного `describeAbility`; оновлюється з поточного стану форми.
- Клік по чипу скролить до відповідної секції (`TriggerSection`, `ConditionSection`, `EffectsSection`, `LimitsSection`) і коротко підсвічує її. Секції отримують кольорову смужку зліва тим самим токеном.

### 4. Тригери за категоріями

- `TriggerDefinition` у `registry/triggers.ts` отримує поле `group` (`always | boundaries | myTurn | incoming | outgoing | other`), а `TRIGGER_REGISTRY` лишається джерелом істини.
- `TriggerSection` рендерить селект із групами (`SelectField` має підтримувати `groups`, інакше додати) і під ним одне речення-пояснення з прикладом (`triggers.<event>.hint` у `abilityRegistry.json`, uk+en). Існуючий `roundStartHint` стає частиною цього механізму.
- Порядок і склад груп фіксуємо в плані після інвентаризації всіх подій реєстру.

## Повторне використання

`describeTrigger`/`describeEffect`/`limitsLabel` (`registry`), `useTranslator("abilityRegistry")`, `SelectField`, HUD-токени. Нових бібліотек немає.

## Тести

- Юніт `summarizeAbility`: по одному випадку на кожен вид тригера та ефекту (параметризовано по реєстрах, щоб новий запис без опису падав), порожні умова/ліміти, `randomOf`.
- `describeAbility(a, t)` в uk дає той самий рядок, що й раніше (регресія, golden-тест по шаблонах `templates`).
- Компонент `AbilityFlow`: обидва варіанти, порожні частини, клік по чипу.
- `AbilityPanel`: клік по чипу веде до секції; чип оновлюється при зміні тригера/ефекту.
- Реєстр: кожен тригер має `group` і `hint` в обох локалях (тест на ключі, як у `i18n.md`).
- Оновити тести споживачів `abilitySummary` (`format-skills-response`, `info-reference`, картки).

## Ризики

- Зміна форми `abilitySummary` зачіпає кеші (`info-reference`, `artifact-reference`): перевірити інвалідацію й розмір відповіді (egress).
- Воркттрі `../dnd-tracker-t6` (`feat/i18n-part6`) на момент спеку чисте й на `main`, тобто part 6 не розпочато. Попередити в новій сесії part 6, що ability-описи вже тут; перед мерджем rebase на `main`.
- Крок 0 найбільший за обсягом: ризик розбіжності uk-тексту з поточним. Захист: golden-тест на `describeAbility` у uk до й після.
- `docs/architecture/abilities.md` і `docs/STATUS.md` оновити в кінці гілки; `whats-new` не потрібен, якщо змінюється лише вигляд існуючих екранів (вирішити в плані).
