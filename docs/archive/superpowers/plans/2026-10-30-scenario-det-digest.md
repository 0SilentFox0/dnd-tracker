# Детермінований digest сценарію: план

Спека: `docs/superpowers/specs/2026-10-30-scenario-det-digest-design.md`. Виконання: SDD, Sonnet-імплементер на кожну задачу (T1+T2 разом, T3+T4 разом), без рев'ю по задачах, один фінальний Opus-рев'ю. Тести: `pnpm test:related <файли>`, `pnpm exec eslint --fix <файли>`; повний прогін і repo-wide lint один раз у кінці.

## T1. Константи й розбір searchText (чиста логіка)

- `lib/constants/ai.ts`: `digestLeadChars: 90`, `digestEntities: 12` у `AI_LIMITS`.
- `lib/utils/scenario/search-text.ts`: `sectionLead(line: string, title: string, max: number): string`. Рядок секції = `oneLine(title + " " + body)`; прибирає префікс `title`, обрізає до `max` символів по межі кодпойнта (`Array.from`), додає `…`, порожнє тіло → `""`.
- Тести в `__tests__/search-text.test.ts`: префікс прибирається, порожнє тіло, обрізання з емодзі, заголовок без тіла.

## T2. Збірка й бюджет (чиста логіка, `lib/utils/scenario/digest/`)

Типи:

```ts
interface DigestPage { id; title; arc: string | null; sortOrder: number; llm: { digest: string; stale: boolean } | null; sections: { title: string; played: boolean; lead: string }[]; entities: string[] }
```

- `build-lines.ts`: `pageLine(page, level: 0|1|2|3): string` за форматом зі спеки; `llm` перекриває на всіх рівнях (формат `- Title [id]: digest (stale)`). Рівні 0: секції з лідами + сутності; 1: секції без лідів + сутності; 2: назва+арка+сутності; 3: назва+арка.
- `scenario-digest.ts`: `scenarioDigest(pages, { maxChars }): string` — сортує за `sortOrder`, для рівнів 0→3 бере перший, де сума ≤ `maxChars`; інакше рівень 3 + обрізання цілими рядками і маркер `… N more pages omitted` (перевикористати логіку `summariesDigest`: винести `fitLines(lines, maxChars)` і викликати з обох місць).
- Тести: 1/10/200 сторінок, перекриття LLM, `stale`, кожен рівень, межа `maxChars` точно, порожній список → `""`.

## T3. Завантаження (сервер)

- `lib/server/scenario/summary-store.ts`: `loadDigestItems(campaignId)` → `DigestPage[]`. Один `$queryRaw`: `scenario_pages p LEFT JOIN scenario_page_index i ON i."pageId"=p.id AND i.version=p.version LEFT JOIN scenario_page_summaries s ON s."pageId"=p.id`, вибирає `p.id,title,arc,sortOrder`, `i.facts`, `s.summary->>'digest'`, `s.version < p.version AS stale`, ліди з `searchText` через `array(SELECT m FROM regexp_matches(p."searchText", '§([^\t\n]*)\t([^\n]{0,N})', 'g') m)` (N = заголовок + `digestLeadChars` + запас; точне зрізання робить `sectionLead`). Жодного `p.content`.
- `facts` валідувати `pageFactsSchema.safeParse`; невалідні/відсутні → без сутностей і з секціями лише із `searchText` (played = false). Сутності: унікальні непорожні `label` за спаданням сумарного `count`, ≤ `digestEntities`. Збіг секцій: за `id` секції.
- Тести (мок `prisma.$queryRaw`): LEFT JOIN-поведінка, відсутній/застарілий індекс, невалідні факти, assert що SQL не містить `content`.

## T4. Промпт і документація

- `lib/ai/context/prompt.ts`: замінити `summariesDigest(...)` на `scenarioDigest(...)`, новий `DIGEST_LABEL`, виключення сторінки фокусу лишається. Експорт `summariesDigest` прибрати, якщо нікому більше не потрібен (grep).
- Тести `lib/ai/context/__tests__`: не-`session` → 403, `live` без `digest`, фокусна сторінка виключена, блок є за відсутності конспектів, бюджет не перевищено.
- `docs/architecture/ai.md` (розділ «Digest конспектів»), `docs/STATUS.md`; `docs/superpowers/{specs,plans}` → архів у merge-коміті (`git mv` у `docs/archive/superpowers/`).
- Нова user-facing фічі немає (whats-new не потрібен): зміна лише контексту асистента.

## T5. Фінал

- `/simplify` на диф гілки (1–2 агенти), один Opus-рев'ю, повний `pnpm test:run` і repo-wide `pnpm lint` (за перевіркою `ps`), merge у temp-worktree.
- Живий прогін (Sonnet-субагент, браузер): prodcopy або прод, `/dm/ai`, розкриття контексту показує `digest`; оцінка токенів; чат з ключем, який вводить користувач.

## Оцінка вартості

T1–T4 ≈ 2 Sonnet-диспатчі + 1 Opus-рев'ю + 1 живий прогін; приблизно 5–8% тижневого ліміту. Перевір `/usage` перед стартом.
