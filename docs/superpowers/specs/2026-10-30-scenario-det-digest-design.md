# Детермінований digest сценарію (етап 3d, варіант A)

## Мета

Блок `digest` у промпті асистента ДМа (режим `scenario`) наповнюється без LLM і без токенів: з індексу й `searchText`. Зараз `scenario_page_summaries` порожня, тож блок порожній. Існуючий LLM-конспект сторінки перекриває її детермінований рядок.

## Межі (не змінюються)

- Лише сесія ДМа (`actor.via === "session"`), лише `mode === "scenario"`; `live`, токени, MCP, `get_campaign_brief` не чіпаємо.
- Бюджет `AI_LIMITS.digestChars` (4000), блок останній серед необов'язкових, сторінка фокусу виключається.
- Міграцій немає, нових таблиць і колонок немає.

## Дані й egress

Один `$queryRaw` по `scenario_pages` LEFT JOIN `scenario_page_index` LEFT JOIN `scenario_page_summaries`:

- `p.id, title, arc, kind, sortOrder, version`; `i.facts` лише якщо `i.version = p.version`; конспект `s.summary->>'digest'` і `s.version < p.version AS stale`.
- Перші рядки секцій: `searchText` розбирається в SQL (`regexp_matches` на `§id<TAB>…`, не більше `DIGEST_LEAD_CHARS` символів на секцію), тож повний `searchText` і `content` не читаються. `searchText` уже без `||секретів||` (`docText`).
- Сторінка без актуального індексу: лише назва/арка/секції з `searchText`, без сутностей (індекс не перебудовуємо, `content` не читаємо).

## Формат рядка сторінки

```
- Title [pageId] (arc): § Section A ✓ — перший рядок; § Section B — …; entities: Name1, Name2
```

- `✓` = секція `played` (з `facts.sections`). Порядок сторінок = `sortOrder` (послідовність сцен), секцій = порядок у фактах.
- Сутності: унікальні `ref.label` з чипів усіх секцій (порожні мітки пропускаються), за спаданням `count`, максимум `DIGEST_ENTITIES` (12).
- Перший рядок секції: `searchText`-рядок секції мінус префікс заголовка, обрізаний до `DIGEST_LEAD_CHARS` (90), `…` при обрізанні.
- Сторінка з LLM-конспектом: рядок як зараз (`- Title [id]: digest (stale)`), детермінований для неї не будується.

## Бюджет: градація

Чиста функція `scenarioDigest(items, {maxChars})` вибирає найбагатший рівень, у який усе влізає: (0) повний рядок, (1) без перших рядків секцій, (2) назва + арка + сутності, (3) назва + арка. Якщо навіть рівень 3 не влізає, лишаються перші за `sortOrder` + маркер `… N more pages omitted` (наявна поведінка `summariesDigest`).

## Reuse

| Що | Звідки |
|---|---|
| факти й сутності з чипів | `extractPageFacts` / `pageFactsSchema` / `PageFacts` (читаємо збережені `scenario_page_index.facts`, не перераховуємо) |
| формат `searchText` (`§id\t…`) | `buildSearchText` у `lib/utils/scenario/search-text.ts` (префікс і `oneLine` там); парсер розбору поруч |
| рядок LLM-конспекту, маркер omitted, обрізання цілими рядками | `summariesDigest`, `DigestItem` (`lib/utils/scenario/summary/digest.ts`): розширюємо, не дублюємо |
| завантаження digest | `loadDigestItems` у `summary-store.ts`: змінюємо запит (LEFT JOIN замість INNER) |
| бюджет і блок у промпті | `AI_LIMITS.digestChars`, `fitContext`, `prompt.ts` (змінюється лише `DIGEST_LABEL` і виклик) |

Нове потрібне, бо наявне не вміє: детермінована збірка рядка сторінки з фактів + `searchText` і градація бюджету (`summariesDigest` приймає готові рядки без рівнів); SQL-вибірка перших рядків секцій (`search.ts` шукає збіги, не береже по секціях).

## Зміни у файлах

- `lib/utils/scenario/digest/` (нове, поруч із `summary/`): `build-lines.ts` (рівні рядка), `scenario-digest.ts` (вибір рівня + маркер); `summariesDigest` лишається для чистого LLM-рядка.
- `lib/utils/scenario/search-text.ts`: `sectionLead(line, title, max)`.
- `lib/server/scenario/summary-store.ts`: `loadDigestItems` повертає всі сторінки з `digest | null`, `facts`, `leads`.
- `lib/ai/context/prompt.ts`: виклик нової функції, `DIGEST_LABEL` («Campaign digest (DM-only): …; (stale) = LLM summary older than the page»), блок є, коли є хоч одна сторінка.
- `lib/constants/ai.ts`: `digestLeadChars: 90`, `digestEntities: 12`.
- Документи: `docs/architecture/ai.md` (розділ digest), `docs/STATUS.md`.

## Тести

- Чисті: рівні градації на 1/10/200 сторінок у межах `maxChars`; LLM-конспект перекриває рядок; `stale`; сторінка без індексу; обрізання лідів; сутності без порожніх міток.
- `loadDigestItems` (мок prisma): LEFT JOIN, відсутній індекс, застарілий `facts` ігнорується.
- `buildInstructions`: токен/не-`session` → 403, `live` без digest, фокусна сторінка виключена, блок є без жодного конспекту.
- Перевірка egress: запит не вибирає `content` (assert на SQL-текст).

## Перевірка на живому

prodcopy або прод: розкрити розкриття контексту (`AssistantContextDisclosure`) у `/dm/ai`, скласти оцінку токенів digest (≈ 4000 символів ≈ 1–1.3k токенів), потім чат із власним ключем Gemini (вводить користувач).

## Поза межами

Варіант B (LLM «digest-only» на дешевій моделі), нові інструменти, зміна `AiFocus`, перебудова індексу з промпта.
