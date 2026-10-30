# AI: хвости читання сцен і мікро NPC — план

Гілка `fix/ai-reading-tails` (worktree `../dnd-tracker-ai-tails`, від main `7069555c7`). Основа: [спека](../../archive/superpowers/specs/2026-10-30-ai-scenario-reading-and-micro-npc-design.md), [ai.md](../../architecture/ai.md), рядок STATUS «AI: читання сцен і мікро NPC», звіти final review / live run (`.superpowers/sdd/2026-10-30-ai-scenario-reading-and-micro-npc/` у `../dnd-tracker-ai-reading`).

Ухвалені рішення не переглядаємо: результати читання не стискаються в межах запиту до `AI_LIMITS.keptReadingChars`; мікро NPC створюється лише в apply в тому ж записі сторінки; ref→id через `@ref:<ref>`; дубль імені → існуюче знайомство; `acquaintancesEnabled=false` → 403 `ACQUAINTANCES_DISABLED`, пропозиція лишається `pending` (раннє відхилення в prepare вже є); масова розмітка — окрема op `linkMentions`.

Виконання: 4 пакети для Sonnet-виконавців, без рев'ю на кожну задачу, одне фінальне Opus-рев'ю + `/simplify` (1 агент). Під час роботи — `pnpm test:related <files>` і `pnpm exec eslint --fix <files>`; повний `pnpm test:run` + `pnpm lint` один раз у пакеті 4.

## Перевикористання

| Існує | Де | Для чого |
|---|---|---|
| `OpView`, `Diff`, `Doc`, `Row`, `LossWarning` | `components/ai/AiProposalCard.tsx` | **переносяться** в спільний `ScenarioOpList`, рендерять ops і в `AiProposalCard`, і в `AssistantIntentCard` |
| `usePager` + `PagerNav`, `ASSISTANT_PAGE_SIZES.changes` | `lib/hooks/common`, `components/common/PagerNav` | пагінація рядків у `ScenarioOpList` (як зараз у картці інтенту) |
| ключі `ai.proposal.newAcquaintance`, `ai.proposal.changedRows` (ICU plural uk one/few/many/other вже вручну), `ai.intent.prevChanges/nextChanges/pagesAria` | `messages/{uk,en}/ai.json` | підписи; новий лише `ai.proposal.chipsAdded` |
| `docText`, `collectIds`/`idsOf` | `lib/utils/scenario/doc.ts`, `ai-refs.ts` | визначення «рядок змінено лише чіпами» |
| `searchText` колонка + `strpos(lower(...))` | `lib/server/scenario/search.ts`, `content-write.ts` | префільтр сторінок у `find_scenario_mentions` у SQL |
| `buildMentionPattern`, `wordStem`, `escapeRe` | `lib/utils/scenario/mentions.ts` | розширюються (не новий пошук) |
| `buildFormsPattern`, `wrapMentions` | `lib/utils/scenario/wrap-mentions.ts` | переписується лише обхід вузлів (по прогонах тексту) |
| `buildLayout` (`sections[].start/end`, `units`) | `lib/utils/scenario/read-chunks.ts` | абсолютні offset-и для читання секції |
| `substituteRefs`, `hasRefPlaceholder`, `acquaintanceMentionIds` | `lib/utils/scenario/ai-refs.ts` | один прохід `applyAiOps` в `applyClaimed` |
| `proposals-acquaintance.integration.test.ts` (`newPage`, `proposalFor`, local DB) | `lib/server/assistant/__tests__` | інтеграційний тест справжнього stale |

Нове потрібне лише для: рендеру ops у картці інтенту (нема), абсолютних offset-ів секції (зараз зсуви відносні до секційного layout-у), чергування приголосних і обходу прогонів тексту.

---

## Пакет 1 — якість пошуку згадок і egress (T1–T3, першим кроком 5b)

### T1. `mentions.ts`: англійські імена, мовно-нейтральний fallback, чергування

Файл `lib/utils/scenario/mentions.ts`, тести `__tests__/mentions.test.ts`.

Рішення:
- **Нормалізація запиту** (мовно-нейтральна): `query.normalize("NFC")`, токени без присвійного закінчення `'s`/`’s`/кінцевого `'`/`’` (`Beatrice's` → `Beatrice`). Текст сторінки для `scanDoc` теж NFC. Латиниця не обрізається `wordStem` (`STRIPPABLE` — лише кирилиця, лишається), суфікс `\p{L}{0,3}` уже дає `Beatrices`, а `Beatrice's` знаходиться як `Beatrice` (апостроф — межа слова).
- **Чергування г/к/х → з/ц/с** (давальний/місцевий: Ольга→Ользі, Марічка→Марічці, Солоха→Солосі) і зворотне (запит «Ользі» → «Ольга»): лише коли `wordStem` справді відкинув закінчення; остання літера основи стає класом `[гз]`, `[кц]`, `[хс]` (регістр — через прапорець `i`).
- Новий експорт `mentionPrefixes(query: string): string[]` — літеральний префікс кожного токена в нижньому регістрі (без класу чергування: «Ольга» → `"оль"`, короткий токен — сам токен). Для SQL-префільтра T3; гарантія: кожен збіг `buildMentionPattern` містить усі префікси як підрядки.

Тести (додати):
- `Ольга` знаходить `Ользі`, `Ольгою`; `Ользі` знаходить `Ольга`; `Тарас` не знаходить `Тарах` (без відкинутого закінчення чергування нема).
- English: `Beatrice` → `Beatrice`, `Beatrice's`, `Beatrice’s`, `BEATRICE`, `Beatrices`; forms = `["Beatrice", "BEATRICE", "Beatrices"]` (апостроф не входить у форму); запит `Beatrice's` = запит `Beatrice`; `Ser Beatrice` (два токени); `Bea` не матчить `Beatrice` (короткий токен — ціле слово).
- NFC: `Zoë` у NFD-тексті знаходиться NFC-запитом.
- `mentionPrefixes("Ольга Петрівна")` → `["оль", "петрівн"]`; property-перевірка на кількох рядках: кожен `m[0].toLowerCase()` містить кожен префікс.

### T2. `wrap-mentions.ts`: імена, розбиті розміткою; політика регістру

Файл `lib/utils/scenario/wrap-mentions.ts`, тести `__tests__/wrap-mentions.test.ts`.

Рішення:
- **Прогони тексту.** `wrapNodes` групує сусідні вузли `type: "text"` одного батька в прогін, матчить по конкатенації, позиції мапить назад на вузли. Збіг, що охоплює кілька вузлів, стає **одним** чіпом з **перетином** marks покритих вузлів (`**Bea**trice` → чіп без bold; `||Bea**trice**||` → чіп із `secret`). Межа слова перевіряється на конкатенації, тож поточна «edge»-логіка (`edge.before/after`) зникає. Це вирівнює поведінку з `findMentions`, який уже шукає по конкатенації блоку.
- **Регістр першої літери.** Форма з великої літери матчить лише входження з великої (решта літер — без регістру: `БЕАТРІС` у заголовку матчить `Беатріс`); форма з малої — будь-який регістр. Реалізація: `buildFormsPattern` лишається `giu`, у фільтрі збігів відкидаємо `m[0]`, якщо відповідна форма (`f.toLowerCase() === m[0].toLowerCase()`, найдовша) починається з великої, а `m[0][0]` — ні. Так `Віра`/`Роза` в forms не чіпають «віра»/«роза». `(?i:)` не використовуємо.
- Модель отримує форми з регістром із `find_scenario_mentions` (`forms` уже зберігають написання) — це і є її вибір; опис інструментів доповнюємо в T3.

Тести (додати/оновити):
- `**Super**Beatrice` (bold `Super` + `Beatrice`) → нічого не обгорнуто; `findMentions` теж 0.
- `Bea` + bold `trice` → один чіп `Beatrice`, без bold; текст навколо цілий.
- `||Бе**атріс**||` → чіп із `secret`, без `bold`.
- `Віра пішла. Віра — основа…` vs `віра в богів` з forms `["Віра"]` → обгорнуто лише капіталізовані; forms `["віра"]` → усі.
- наявні тести (`does not wrap mid-word across adjacent text nodes`, `wraps at a node edge…`) зелені без змін логіки очікувань.
- `ai-ops.test.ts`: `linkMentions` з forms `["Беатріс"]` над `беатріс` (мала) → `noMentions`.

### T3. `find_scenario_mentions`: SQL-префільтр сторінок, опис

Файл `lib/ai/tools/scenario-read.ts` (+ `lib/server/scenario/search.ts` для запиту), тести `lib/ai/tools/__tests__/scenario-read.test.ts`, `scenario-read-envelope.test.ts`.

Рішення (без кешу між викликами чи запитами):
- Без `pageId`: спершу `pageIdsMatching(campaignId, prefixes: string[]): Promise<string[]>` у `lib/server/scenario/search.ts` — `SELECT id FROM scenario_pages WHERE "campaignId" = $1 AND NOT EXISTS (SELECT 1 FROM unnest($2::text[]) p WHERE strpos(lower("searchText"), p) = 0) ORDER BY "sortOrder", title`. Далі `findMany({ where: { id: { in: ids } }, select: PAGE_SELECT })` лише для кандидатів (порядок — за `ids`). З БД виходить `content` тільки сторінок, де ім'я є. `searchText` = `docText` story+notes (з мітками чіпів і секретами), тож надмножина збігів `findMentions` зберігається.
- Порожній `prefixes` (неможливо після zod `min(2)`, але) → `[]`.
- Перевірити, що всі записи `scenario_pages.content` йдуть через `contentWrite` (grep `scenarioPage.update`/`create` з `content`); якщо знайдеться обхід — виправити, інакше префільтр пропустить сторінку.
- Опис інструмента: «`forms` keep the text's capitalisation. linkMentions matches a capitalised form only at a capital letter: for names that are also common words (Віра, Роза) pass only capitalised forms».
- Опис `propose_scenario_edit` (`lib/ai/tools/propose.ts`) — те саме речення про регістр у частині `linkMentions`.

Тести:
- `scenario-read.test.ts` (мок `prisma`/`$queryRaw`): без `pageId` викликається `pageIdsMatching` з `mentionPrefixes(query)`, `findMany` отримує лише повернені id; порожній результат → `{ total: 0, hits: [], nextOffset: null }` без `findMany`.
- з `pageId` — як зараз (`loadPageForAi`), без SQL-префільтра.
- envelope-тест лишається зеленим (оновити мок під новий шлях).

---

## Пакет 2 — offset-и і apply (T4–T5)

### T4. Offset завжди абсолютний для сторінки

Файли `lib/utils/scenario/read-chunks.ts`, `lib/ai/tools/scenario-read.ts`; тести `__tests__/read-chunks.test.ts`, `lib/ai/tools/__tests__/scenario-read.test.ts`.

Рішення: offset у `read_scenario_page` — **завжди абсолютна позиція в markdown усієї сторінки** (той самий простір, що `@N` в outline).
- `chunkContentMarkdown(title, content, { sectionId?, offset?, limit })`: layout будується **завжди для всієї сторінки** (`buildLayout(title, content)` без фільтра). Scope = `[0, total)` без `sectionId`, або `[section.start, section.end)` з `sectionId`. `units` фільтруються до scope; цикл вибору кінця той самий, але межа — `scope.end`.
- Offset за замовчуванням = `scope.start`. Offset поза scope → текст `[offset N is outside section S: A..B]`, `nextOffset: null`. Невідомий `sectionId` → `[section S not found]`.
- Трейлер `[next offset N of END]`, де `END` = кінець scope (довжина сторінки або кінець секції) — абсолютний. `ChunkResult.total` = `scope.end`.
- Читання секції більше не містить `# title`/легенди (вони є в outline і в читанні без `sectionId`). `contentToMarkdown(title, content, sectionId?)` лишається для інших викликачів без змін.
- Опис `read_scenario_page`: прибрати застереження «offset belongs to the same sectionId scope…», замінити на «Offsets are page-absolute (same as outline @N); with sectionId the read stops at the section end».

Тести:
- outline → read: на сторінці з 3 секціями взяти `@N` рядка другої секції з `outlineContent`, викликати `chunkContentMarkdown` з `sectionId` цієї секції та `offset: N` → текст починається з `### Row <id>`; те саме без `sectionId` → той самий початок.
- пагінація секції: склеювання чанків з `sectionId` (без трейлерів) == `markdown.slice(section.start, section.end)` повного layout-у; останній чанк без трейлера і не заходить у наступну секцію.
- offset з іншої секції + `sectionId` → текст `outside section`; невідомий `sectionId` → `not found`.
- envelope-тест: `nextOffset` з читання секції приймається наступним викликом з тим самим `sectionId`.

### T5. Один прохід `applyAiOps`; перевірка envelope-тесту на старому коді; справжній stale

Файл `lib/server/assistant/proposals.ts` (`applyClaimed`), тести `__tests__/proposals-acquaintance.test.ts`, `proposals-acquaintance.integration.test.ts`.

**5a. Один прохід.** Порядок у `applyClaimed` після перевірки `acquaintancesEnabled`:
1. `byName` + `ids`/`created` (як зараз; для `newcomers.length === 0` — пропустити запит).
2. `finalOps = newcomers.length ? substituteRefs(scenarioOps, ids) : scenarioOps`.
3. `applied = applyAiOps(content, finalOps)`; `!ok` → `settle(... "stale", 409)`. `substituteRefs` змінює лише `story`/`notes` (не `before`), тож результат stale-перевірки ідентичний першому проходу старого коду.
4. `hasRefPlaceholder(finalOps)` → `rejected`; `foreign` → 404; далі без змін.
Порядок кодів помилок не змінюється (stale → rejected → 404 → 400/413). Єдина різниця — пошук імен виконується до stale-повернення, коли є `createAcquaintance` (один дешевий запит). Змінна `applied` стає `const`.
Тест (unit, `proposals-acquaintance.test.ts` з моками): stale-пропозиція з `createAcquaintance` → 409 stale, `acquaintance.create` не викликано; ref-плейсхолдер на stale сторінці → як і раніше `stale` (не `rejected`).

**5b. Envelope-тест проти старого коду** (`lib/ai/tools/__tests__/scenario-read-envelope.test.ts`, доданий у `c4cac0d10` без червоного прогону):
1. Тимчасово відтворити поведінку до фіксу в `scenario-read.ts`: `read_scenario_page` повертає `chunkContentMarkdown(..., { limit: AI_LIMITS.toolResultChars }).text`, а `find_scenario_mentions` ріже `all.slice(offset, offset + 100)` без циклу бюджету і з `nextOffset = offset + 100`.
2. `pnpm test:run lib/ai/tools/__tests__/scenario-read-envelope.test.ts` → **обидва тести мають впасти** (трейлер зрізаний `boundedOutput`, хітів 0 / проєкція). Записати вивід у звіт пакета.
3. `git checkout -- lib/ai/tools/scenario-read.ts`, тест знову зелений. Якщо тест на старому коді зелений — він не ловить регресію: посилити (більша сторінка / 100 великих хітів), повторити, закомітити лише тест.
Порядок: **5b — перший крок пакета 1, до T3** (файл ще чистий, нічого не змішується з T3/T4); описано тут, бо стосується перевірки фіксу.

**5c. Справжній stale (локальна БД, `describe.skipIf(!isLocalDevDatabaseEnv())`)** у `proposals-acquaintance.integration.test.ts`:
- `newPage()` → `proposalFor(page.id)` (createAcquaintance + linkMentions) → ДМ редагує той самий рядок напряму (`db.scenarioPage.update` з `contentWrite(...)` і `version: { increment: 1 }`, текст рядка змінено) → `applyProposal` → `{ ok: false, status: 409, error: AI_PROPOSAL_STALE }`; статус пропозиції `stale`; `acquaintance.count === 0`; контент сторінки = відредагований ДМ-ом, без `@ref:`; версія не зросла від apply.
- Варіант: редагування **іншого** рядка (не зачепленого ops) → apply успішний (stale лише по зачеплених рядках).
- Прогін: `pnpm test:run lib/server/assistant/__tests__/proposals-acquaintance.integration.test.ts` з локальним Docker-DB; якщо БД нема — тест skip, у звіті позначити «не прогнано».

---

## Пакет 3 — картка підтвердження v2 і розмір preview (T6–T7)

### T6. Спільний `ScenarioOpList`; компактні рядки «лише чіпи»

Нові/змінені файли: `components/ai/ScenarioOpList.tsx` (новий), `components/ai/AiProposalCard.tsx`, `lib/utils/scenario/ai-refs.ts`, `messages/{uk,en}/ai.json`; тести `components/ai/__tests__/scenario-op-list.test.tsx` (`// @vitest-environment happy-dom`), `ai-proposal-card.test.tsx`, `lib/utils/scenario/__tests__/ai-refs.test.ts`.

- `addedMentionCount(before: RichDoc, after: RichDoc): number | null` у `ai-refs.ts` — кількість нових вузлів `mention`, якщо `docText(before) === docText(after)` і mention-ів у `after` більше; інакше `null`. Чиста функція.
- `ScenarioOpList({ ops: ScenarioAiOp[]; campaignId: string })` — переносить `Doc`/`Row`/`Diff`/`LossWarning`/`OpView` з `AiProposalCard` (без змін розмітки, щоб існуючі тести/`data-slot` лишились). Порядок: спершу картки `createAcquaintance` (як зараз «Новий мікро NPC: {name}» + опис), далі рядок `proposal.changedRows` коли `replaceRow` ≥ 2, далі ops через `usePager(ops, ASSISTANT_PAGE_SIZES.changes)` + `PagerNav` (ключі `ai.intent.pagesAria/prevChanges/nextChanges`), показуючи пагінатор лише при `pageCount > 1`.
- `replaceRow`, де для кожної зміненої частини `addedMentionCount` ≠ `null`: компактно — одна колонка «Стане» з `Doc after` і підписом `ai.proposal.chipsAdded` (`{count}` — сума), без «Було»/`LossWarning`. Інакше — наявний `Diff`.
- Новий ключ `ai.proposal.chipsAdded`: uk `"{label}: {count, plural, one {+# чіп} few {+# чіпи} many {+# чіпів} other {+# чіпа}}"`, en `"{label}: {count, plural, one {+# chip} other {+# chips}}"` (`label` = `proposal.parts.story|notes`). Обидві локалі.
- `AiProposalCard`: слайдові пропозиції → `SlideView` як зараз; інакше `<ScenarioOpList ops={proposal.ops as ScenarioAiOp[]} …/>`; власний підрахунок `changedRows`/`hasNpc` прибрати (тепер у списку).

Тести:
- `addedMentionCount`: лише чіпи → N; змінений текст → null; той самий doc → null.
- `ScenarioOpList`: createAcquaintance + 3 chip-only replaceRow → текст `ai.proposal.newAcquaintance`, `ai.proposal.changedRows`, три `ai.proposal.chipsAdded`, жодного `ai.proposal.before`; replaceRow зі зміною тексту → `Diff` (before/after); 25 replaceRow → 20 на сторінці, `ai.intent.nextChanges` показує решту.
- `ai-proposal-card.test.tsx` зелений без зміни очікувань (крім `changedRows`, якщо тест закладав умову «лише з NPC» — тоді оновити під «≥ 2 рядки»).

### T7. `AssistantIntentCard` рендерить ops сценарію; preview без дампу сторінки

Файли `components/ai/AssistantIntentCard.tsx`, `components/ai/AssistantReview.tsx`, `lib/server/assistant/actions/scenario-edit.ts`; тести `components/ai/__tests__/assistant-intent-card.test.tsx`, `lib/server/assistant/__tests__/scenario-edit-prepare.test.ts`.

- **Preview:** у `prepare` `changes: [{ target, path: "ops", before: null, after: jsonContent(resolved.ops) }]` — повний `state.page` більше не пишеться в `assistant_intents.preview`. Нічого на сервері не читає `changes[].before` (перевірено grep), `replaceRow` має власний `before` у ops. Факт про egress: список інтентів, що политься кожні 10 с (`ASSISTANT_POLLING.intentsMs`), уже тягне лише `SUMMARY_SELECT` без `preview`; preview приходить у детальному запиті (без `refetchInterval`) при кожному відкритті та входить у `ASSISTANT_LIMITS.maxPayloadBytes` (3 МБ) — дамп сторінки 50–150 КБ JSON прибирається з обох місць. Полінг не змінюємо.
- **Картка:** новий проп `campaignId: string` (`AssistantReview` передає свій). Якщо `intent.actionId === "scenario.propose-edit"` і `change.path === "ops"` і `Array.isArray(change.after)` — замість `ChangeDiff` рендерити `<ScenarioOpList ops={change.after as unknown as ScenarioAiOp[]} campaignId=…/>`, а рядок `intent.fullPreview` і пагінатор змін для цього change не показувати (пагінація всередині списку). Старі інтенти з дампом у `before` рендеряться так само (before ігнорується). Інші action-и — без змін (сирий JSON лишається для них).

Тести:
- `scenario-edit-prepare.test.ts`: `prepare` з `renameSection` → `changes[0].before === null`; `JSON.stringify(preview)` не містить `"sections"` сторінки (лише ops).
- `assistant-intent-card.test.tsx`: інтент `scenario.propose-edit` з `after` = [createAcquaintance, 2 chip-only replaceRow] → є `ai.proposal.newAcquaintance`, `ai.proposal.changedRows`, `ai.proposal.chipsAdded`; немає тексту `"op":` / елементів `pre` з JSON; кнопки Confirm/Reject як раніше. Наявні тести (`scenario.update` з 25 рядковими змінами) — додати `campaignId` у рендер, очікування без змін.

---

## Пакет 4 — документація і фінальна перевірка (T8–T9)

### T8. Документи
- `docs/architecture/ai.md`: абсолютні offset-и (`sectionId` обмежує scope), префільтр `find_scenario_mentions` по `searchText`, чергування/англійські імена, правило регістру першої літери у `linkMentions`, спільний `ScenarioOpList` в обох картках, preview `scenario.propose-edit` без дампу сторінки.
- `docs/STATUS.md`, рядок «AI: читання сцен і мікро NPC»: прибрати «Відкрито: … AssistantIntentCard із сирим JSON …; кеш сторінок …», додати короткий підсумок хвостів.
- Онбординг: whats-new не додаємо — це поліпшення наявної картки, не нова функція (рядок довідки ШІ — лише якщо там описано сирий JSON).

### T9. Перевірка
- `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` → повний `pnpm test:run` і `pnpm lint` (по одному), `pnpm exec tsc --noEmit`.
- Інтеграційні тести `proposals-acquaintance.integration.test.ts` на локальній БД (якщо є).
- Фінальне Opus-рев'ю диф-у гілки, далі `/simplify` (1 агент). Живий прогін у браузері — за бажанням користувача (картка інтенту з 40+ чіпами — головне, що варто побачити).
