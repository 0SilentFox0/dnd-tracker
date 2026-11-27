# Квіз «Історія персонажа» у майстрі створення WFRP (Grim d100) — design

Запит власника 2026-11-27: при створенні персонажа в Grim d100 — квіз, який складає історію героя. Зразок — 3-тя сторінка фізичного листа WFRP 4ed («Background and family») і розділ «Personality and Background» книги WFRP5 (p41). Рішення власника: квіз **лише при створенні** (не для наявних героїв); відповідь — вручну або кидок d100 по таблиці; ціни прокачки не чіпаємо.

Залежність: гілка `fix/wfrp-dm-creation` (ДМ теж створює героя через `WfrpDraftForm`). Квіз будується поверх неї, тож працює і для гравця, і для ДМ.

## Мета
Гравець (або ДМ) за 2–5 хвилин отримує зв'язну біографію і амбіції героя, не дивлячись у порожнє поле «Біографія». Кожне питання можна пропустити, написати своє або кинути кубик.

## Що вже є (з'ясовано в коді)
- Майстер: `systems/wfrp/ui/creation/WfrpDraftForm.tsx`, кроки `species → career → stats → talents → identity` (`STEP_ORDER`), стан у `systems/wfrp/hooks/useWfrpDraftForm.ts`, відправка в `useWfrpDraftSubmit.ts`.
- Крок `identity` (`IdentityStep.tsx`) уже має `background` (textarea, сервер `max(4000)`) і `goals: { text, kind }[]` (`GoalKind`: `main | personal | inner | secret`, `lib/constants/characters.ts`). Сервер (`create-wfrp-draft.ts`) пише `background` і `goals` через `mergeDraftGoals`.
- Кидок по таблиці: `rollTable(rows, rng, preset?)` (`systems/wfrp/rules/tables/roll-table.ts`), `Rng` з `@/lib/utils/common/rng` — детермінований у тестах.
- Ефект «прокручування» результату кидка вже є в майстрі (`form.reveal`, `form.shown(key, value)`) — перевикористати для кидків квізу.
- Профіль раси `SpeciesProfile` (`systems/wfrp/rules/creation/profile.ts`) не має зовнішності; редактор профілю `SpeciesProfileEditor.tsx`. Таблиці зовнішності є в книзі для кожної раси (вік, зріст, очі, волосся), раси шаблону знеособлені (Рівнинець, Копач, Вогнищанин, Вейл, Терновик).

## Рішення
1. **Новий крок `story`** між `talents` і `identity`: `STEP_ORDER = [species, career, stats, talents, story, identity]`. Крок необов'язковий (нема `stepErrors`), кнопка «Пропустити» = «Далі». У режимі редагування чернетки (`characterId`, лише `identity`) кроку немає.
2. **Питання (фіксований список id у коді)**, згруповані в 5 блоків на одному екрані (акордеон/секції, мобільний — одна колонка):
   - *Походження:* `origin` (звідки ти), `family` (родина, заняття батьків), `childhood` (яким було дитинство).
   - *Поворот:* `turningPoint` (що сталося і що ти зробив), `leftHome` (чому пішов з дому).
   - *Люди:* `friends` (найкращі друзі), `loyalty` (кому вірний), `hatred` (що/кого ненавидиш).
   - *Пам'ять і віра:* `bestMemory`, `worstMemory`, `faith` (віра/забобони).
   - *Характер і мета:* `demeanor` (вдача), `secret` (таємниця), `ambitionShort`, `ambitionLong`.
   - *Зовнішність:* `age`, `height`, `eyes`, `hair` — тільки якщо в профілі раси є `appearance` (п. 5); інакше блок ховається.
3. **Відповідь на питання:** поле тексту + кнопка 🎲 (d100 → рядок таблиці, показ з `reveal`; результат потрапляє в поле і далі редагується) + «Кинути все» вгорі кроку (кидає лише порожні питання). Перекидання дозволене без обмежень.
4. **Таблиці варіантів — у коді, тексти — i18n.** `systems/wfrp/rules/creation/story/tables.ts`: `STORY_TABLES: Record<StoryQuestionId, { max: number; key: string }[]>` — 10 рядків на питання (`max` 10, 20, …, 100), `key` → `wfrpCreation.story.tables.<question>.<n>`. Тексти власні, у стилі темного фентезі, **без назв і цитат із книги** (жодних Reikland/Altdorf/Sigmar/Ranald — шаблон знеособлений; боги описово: «бог війни», «пані удачі»). Обидві мови `uk`/`en` — у наявному namespace `wfrpCreation` (піддерево `story`), бо він уже підключений до обох маршрутів майстра (`[id]/character/new`, `[id]/dm/characters/new`); бюджети цих маршрутів у `lib/i18n/test/route-budgets.ts` підняти до виміряного + 0.5.
5. **Зовнішність — у профілі раси (контент), кольори — словник у коді:** `SpeciesProfile.appearance?: { age: { base: number; dice: number }; heightCm: { base: number; dice: number }; eyes: AppearanceColour[]; hair: AppearanceColour[] }`, де `dice` = кількість d10 (книга: «14+2d10» → `{ base: 14, dice: 2 }`; зріст у см). `AppearanceColour` — ключ зі спільного словника `APPEARANCE_COLOURS` (~25 кольорів очей/волосся, тексти `wfrpCreation.story.colours.<key>` uk/en): race-profiles не мають i18n-оверлею шаблону, тож текст кольорів у контенті не зберігаємо. Кидок: вік/зріст = base + Nd10; очі/волосся = рівномірно по списку раси (d100 → індекс). Схема `SpeciesProfileSchema` (`systems/wfrp/rules/creation/schema.ts`) — поле опціональне, старі профілі валідні. Редактор: секція «Зовнішність» у `SpeciesProfileEditor` (чотири числа + два мультивибори кольорів). Дані 5 рас — у `data/templates/grim-d100/race-profiles.json` (значення віку/зросту за книгою для відповідної раси, кольори — найближчі зі словника); **публікація шаблону на прод — окреме «так» власника**.
6. **Складання тексту — чиста функція** `composeStory(answers, phrase)` у `systems/wfrp/rules/creation/story/compose.ts`: для кожного непорожнього питання — речення-шаблон `wfrpCreation.story.sentences.<question>` з `{answer}` (на кшталт листа: «Я родом з {answer}.», «Моя родина — {answer}.»), абзаци за блоками; порожні питання пропускаються. Переклад робиться на межі (хук передає `phrase = (id, answer) => t(...)`), у `rules` тексту немає. Результат обрізається до ліміту `background` (4000) з попередженням у UI, якщо не влазить.
7. **Куди йде результат:**
   - Біографія → `identity.background`. При переході на крок `identity`: якщо користувач ще не редагував біографію вручну — вона заповнюється складеним текстом; якщо редагував — не чіпаємо, а над полем кнопка «Замінити історією з квізу».
   - `ambitionLong` → goal `main`, `ambitionShort` → goal `personal`, `secret` → goal `secret` (не дублюються в біографії). Додаються до `identity.goals`, якщо ще немає цілі з тим самим текстом; при повторному переході — оновлюються ті, що прийшли з квізу (мітка в стані хука, не в даних).
   - Зовнішність → перший абзац біографії («Мені {age} років, зріст {height} см, очі {eyes}, волосся {hair}.»).
8. **Нічого не зберігається окремо:** відповіді квізу живуть лише в стані майстра; на сервер іде тільки `background` + `goals` (наявний контракт). Міграцій немає. Серверних змін немає, крім схеми профілю раси (п. 5).
9. **Онбординг:** запис у `lib/onboarding/whats-new.ts` (через `meta.whatsNew` системи wfrp) + ключі `whatsNew.<id>` в обох `messages/*/whatsNew.json`.

## Поза скоупом
Квіз для наявних героїв; AI-генерація історії; редагування таблиць ДМ-ом; таблиці, залежні від раси/кар'єри (крім зовнішності); зміни цін прокачки; партійна амбіція (окремий ДМ-процес).

## Перевикористання
`rollTable`, `Rng`/`rollDie`, `reveal`/`shown` майстра, `HudSection`/`FormField`/`OptionCard` для UI, `GoalKind`, `mergeDraftGoals` на сервері, `SpeciesProfileEditor` + `parseProfile`. Нове: `story/{tables,compose,types}.ts`, `StoryStep.tsx`, `useStoryQuiz` (стан + кидки + composition, у `systems/wfrp/hooks`), поле `appearance` профілю.

## Файли (сигнатури)
- `systems/wfrp/rules/creation/story/types.ts`: `type StoryQuestionId = 'origin' | … | 'hair'`; `type StoryAnswers = Partial<Record<StoryQuestionId, string>>`; `STORY_BLOCKS: { id: string; questions: StoryQuestionId[] }[]`.
- `story/tables.ts`: `STORY_TABLES`; `rollStory(question, rng): { roll: number; key: string }`; `rollAppearance(appearance, field, rng): { roll: number; value: string }`.
- `story/compose.ts`: `composeStory(answers: StoryAnswers, phrase: (id: StoryQuestionId, answer: string) => string): { background: string; goals: { text: string; kind: GoalKind }[]; truncated: boolean }`.
- `systems/wfrp/hooks/useStoryQuiz.ts`: `{ answers, set(id, text), roll(id), rollAll(), compose(): ReturnType<typeof composeStory> }`; підключається в `useWfrpDraftForm` як `form.story`.
- `systems/wfrp/ui/creation/StoryStep.tsx`: рендер блоків; `IdentityStep` — кнопка «Замінити історією з квізу».

## Тести
- `compose.test.ts`: порожні відповіді → порожній текст; порядок блоків; амбіції/таємниця → goals з правильним kind і не в тексті; обрізка до 4000 з `truncated: true`.
- `tables.test.ts`: кожна таблиця має 10 рядків з `max` 10…100; кожен `key` існує в `messages/uk` і `messages/en` (обидві мови); `rollStory` з фіксованим rng повертає очікуваний рядок; `rollAppearance` — base + Nd10 у межах.
- Схема профілю: профіль без `appearance` валідний; з `appearance` — парситься; некоректні значення відхиляються.
- `StoryStep.test.tsx` (happy-dom): кнопка 🎲 заповнює поле; «Кинути все» не чіпає заповнені; блок зовнішності прихований без `appearance`.
- `WfrpDraftForm.test.tsx`: крок `story` між `talents` і `identity`; пропуск кроку не блокує сабміт; біографія заповнюється складеним текстом, ручна правка не перезаписується.
- Live-run (next start, після плану): гравець і ДМ проходять майстер у Grim d100 з квізом, герой зберігається з біографією й цілями.
