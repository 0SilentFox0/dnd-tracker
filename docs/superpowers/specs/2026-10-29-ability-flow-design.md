# Ability flow: КОЛИ → ЯКЩО → ТОДІ → ЛІМІТ (етап 1 з 3, UX 5e-конструктора)

Гілка `feat/ability-ux` (worktree `../dnd-tracker-ux`). Етапи 2 (редактор: рецепти, згортання секцій, форма заклинань) і 3 (перегляд класів/рас/рис/підкласів) мають власні spec після цього.

## Мета

Нова людина, яка відкриває редактор здібностей або картку класу/раси/риси, має за секунду прочитати схему «коли → якщо → що → скільки разів». Зараз підсумок — один рядок через « · » (`describeAbility`), у редакторі він дрібний і стоїть під назвою, а тригер — довгий плаский список із 20+ подій.

Узгоджено з користувачем: варіант B (кольорові чипи) і в редакторі, і в перегляді; обсяг — тільки етап 1; модель даних і рушій не змінюються.

## Не в обсязі

Форма заклинань, рецепти/галерея, згортання секцій, таймлайн класів, перейменування тригерів/ефектів, зміни схеми `Ability`, переклад `describe*` (це i18n part 6).

## Дизайн

### 1. Структурований підсумок

`lib/utils/abilities/summary.ts` отримує чисту `summarizeAbility(a: Ability): AbilityFlowSummary`:

```ts
interface AbilityFlowSummary { when: string[]; if: string[]; then: string[]; limits: string[] }
```

- `when` = `describeTrigger(a.trigger)`; `if` = опис `a.condition` (повторно використати describe з `registry/conditions.ts`, якщо його немає — додати поруч); `then` = `a.effects.map(describeEffect)`; `limits` = `limitsLabel(a.limits)`.
- Нових i18n-ключів немає: структура береться групуванням наявних `describe*`, тож коли part 6 переведе їх, підсумок успадкує переклад. Це свідомо, щоб не конфліктувати з `feat/i18n-part6`.
- `describeAbility` лишається (рядок для AI-контексту, друку, тестів) і збирається з `summarizeAbility`.
- `abilitySummary(kind, row)` повертає `AbilityFlowSummary[]`; `withAbilitySummary` віддає їх у полі `abilitySummary`. Додаємо `flow`-структуру, старі споживачі `string[]` (`format-skills-response`, `info-reference`, `artifact-reference`, `sheet-handler`, `get-progression-handler`, `to-unit`, print/skills) переводяться на неї в тому ж PR. Типи — `types/abilities.ts`.

### 2. `AbilityFlow` (`components/abilities/AbilityFlow.tsx`)

- Чотири типи чипів: КОЛИ (синій), ЯКЩО (жовтий), ТОДІ (червоний), ЛІМІТ (сірий). Кольори — токени `--hud-*` у `app/globals.css` / HUD, спільні з секціями редактора.
- Props: `summary: AbilityFlowSummary`, `variant: "editor" | "card"`, `onChipClick?: (part: "when" | "if" | "then" | "limits") => void`.
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
- `describeAbility` дає той самий рядок, що й раніше (регресія).
- Компонент `AbilityFlow`: обидва варіанти, порожні частини, клік по чипу.
- `AbilityPanel`: клік по чипу веде до секції; чип оновлюється при зміні тригера/ефекту.
- Реєстр: кожен тригер має `group` і `hint` в обох локалях (тест на ключі, як у `i18n.md`).
- Оновити тести споживачів `abilitySummary` (`format-skills-response`, `info-reference`, картки).

## Ризики

- Зміна форми `abilitySummary` зачіпає кеші (`info-reference`, `artifact-reference`): перевірити інвалідацію й розмір відповіді (egress).
- Паралельна гілка `feat/i18n-part6` змінює ті самі `registry/*` і `messages/*/abilityRegistry.json`: перед мерджем зробити rebase на `main` з part 6.
- `docs/architecture/abilities.md` і `docs/STATUS.md` оновити в кінці гілки; `whats-new` не потрібен, якщо змінюється лише вигляд існуючих екранів (вирішити в плані).
