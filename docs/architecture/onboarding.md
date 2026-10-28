# Онбординг: перші кроки, підказки, «Що нового», довідка

Спека: `docs/archive/superpowers/specs/2026-10-22-onboarding-design.md`.

## Реєстр (`lib/onboarding/`, чисті дані й функції)

У TS лишаються лише `id`, `date`, `audience`, `href`, `helpSlug`, `optional`, `informational`, `isDone` і скелет help-статей; **тексти — у `messages/{uk,en}/{onboarding,whatsNew,help}.json`** (див. [i18n.md](i18n.md)). Не-React код віддає id/variant, переклад — на межі (клієнт: `useTranslator`; help — сервер).

- `checklists.ts` — кроки ДМ (`DM_STEPS`: 6 обов'язкових + optional) і гравця (`PLAYER_STEPS`); кожен крок має `isDone(facts)`. `StepStatus` несе `id` і необов'язковий `variant` `{ name, params }` (напр. `pending` + `{count}`), а не готові тексти; `step-text.ts` (`stepText(t, role, step)`) дає `checklist.<role>.<id>.title|description[Variant]` для клієнта й MCP.
- `progress.ts` — `checklistProgress`, `checklistState` (`open` → `collapsed` на 7 днів після першого «все виконано» → `hidden`; збережена дата завершення фіксує результат, регрес фактів чекліст не розгортає), `unseenWhatsNew`/`visibleWhatsNew`, `isHintHidden`.
- `hints.ts` (`HINTS`), `whats-new.ts` (`WHATS_NEW`, новіші першими), `help/` (`HELP_ARTICLES` — скелет статей без текстів: `slug`, секції, форма блоків; текст `help.<slug>.title|summary|sections.s<i>.heading|b<j>`, список — об'єкт `i0..iN`; тест скелет↔JSON ловить розбіжність).
- `flag-keys.ts` — ключі прапорців і `FLAG_KEY_RE`.

## Правило: прогрес = факти, у БД лише прапорці

Виконання кроків **не зберігається** (крок гравця «бій» — участь у будь-якому бою, що стартував; «аркуш» — `seen:player-sheet` або вже був бій) — `lib/server/onboarding/facts.ts` рахує його з даних кампанії одним `$queryRaw` (`readOnboardingSnapshot`): підзапити `count` плюс потрібні прапорці (`checklist:<id>`, `seen:player-sheet`) — на Vercel `connection_limit = 1`, окремі запити йшли б послідовно. Тому нинішні кампанії одразу бачать реальний прогрес.

`user_onboarding_flags (userId, key, value)` тримає лише:

| Ключ | Значення |
|---|---|
| `hint:<id>` | підказку закрито; приймаються лише id з `HINTS` |
| `hint:*` | сховано всі підказки, включно з майбутніми |
| `seen:player-sheet` | гравець відкрив аркуш схваленого героя (`PlayerSheetHint`); окремо від `hint:*`, щоб дії з підказками не міняли прогрес |
| `checklist:<campaignId>` | `hidden` або ISO-дата першого «все обов'язкове виконано» |
| `whats-new` | id останнього побаченого запису; при першому `GET /api/onboarding` ставиться на найновіший, тож новий користувач не бачить історію бейджем |

## API і клієнт

- `GET /api/onboarding` → `{ flags, audiences }` (ролі користувача в усіх кампаніях — для фільтра «Що нового»).
- `PUT /api/onboarding/flags` `{ key, value? }` — Zod за `FLAG_KEY_RE`; `checklist:<id>` — лише для члена кампанії.
- `POST /api/onboarding/reset` `{ scope: "hints" | "checklists" }`.
- `GET /api/campaigns/[id]/onboarding` → `{ role, state, steps, requiredDone, requiredTotal }`; ядро — `readCampaignOnboarding` (`lib/server/onboarding/campaign.ts`, членство перевіряє виклик), сторінка кампанії викликає його напряму й засіває кеш через `PrefetchedQuery`.
- `lib/api/onboarding.ts` → `lib/hooks/onboarding` (`useOnboardingFlags`, `useOnboardingHint`, `useCampaignOnboarding`, `useWhatsNew`) → `components/onboarding` (`OnboardingChecklist`, `OnboardingHint`, `WhatsNewButton`, `HelpArticleView`, `HelpSettings`). Сторінки — `app/help`, `app/help/[slug]`.

## Помилки

Будь-яка помилка API онбордингу → компонент рендерить `null`; сторінка кампанії ловить помилку читання чекліста. Онбординг ніколи не блокує роботу.

## Як додати

- **Крок** — рядок у `DM_STEPS`/`PLAYER_STEPS` і ключі `onboarding.checklist.<role>.<id>` в обох мовах; якщо потрібен новий факт — поле в `DmFacts`/`PlayerFacts` і підзапит у `facts.ts`.
- **Підказку в бою** — `BattleScreen`: ДМ бачить `dm.battle-scene` на екрані підготовки, гравець із героєм — `player.battle` у стеку сповіщень лише не у свій хід (не перекриває мапу, коли вона потрібна; глядачам не показується).
- **Підказку** — рядок у `hints.ts`, ключі `onboarding.hints.<id>.title|body` в обох мовах і `<OnboardingHint id="…" />` на екрані. У тестах `OnboardingHint`/`PlayerSheetHint` глобально замокані в `vitest-setup.ts`; власний тест підказки робить `vi.unmock`.
- **Запис «Що нового»** — на початок `WHATS_NEW` (id, дата, audience, href) і ключі `whatsNew.<id>.title|body` в `uk` та `en` — у коміті фічі; запис без ключів ламає тест реєстру.
- **Статтю** — скелет у `help/dm.ts` або `help/player.ts` і ключі `help.<slug>.*` в обох мовах; тест реєстру перевіряє, що кожен `helpSlug` існує.
