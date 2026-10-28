# Онбординг для ДМ і гравців — дизайн

_Дата: 2026-10-22. Гілка `feat/onboarding`, worktree `../dnd-tracker-onboarding`, локальна БД `onboarding`._

## Мета

Новий ДМ без автора поруч доходить від порожньої кампанії до першого бою, гравець — від інвайту до свого ходу в бою. Досвідчені користувачі дізнаються про нові фічі з «Що нового». Обидві аудиторії рівноцінні.

Входить: фундамент (реєстр, стан, API, хуки, компоненти) + наповнення на поточних фічах (чеклісти, підказки, довідка, стартові новини).
Не входить: майстер першої кампанії з шаблонами (після злиття конструктора 1c — окрема задача поверх цього реєстру), лендинг, демо без реєстрації, спотлайт-тури.

## Що перевикористовуємо

- `HudPanel`, `HudSection`, `HudPage`, `HudPageHeader`, `HudCard` (`components/hud`) — панелі чекліста, сторінки довідки.
- `EmptyState` (`components/common/states`) — порожні стани з поясненням.
- `ResponsiveDialog` (`components/ui/responsive-dialog`) — діалог «Що нового».
- `Header` (`components/layout/Header.tsx`) — кнопка «Що нового» і пункт меню «Довідка».
- `InviteCodeDisplay` — ціль кроку «Запроси гравців».
- `requireCampaignAccess`, `requireAuth`, `parseBody`, `errorResponse` (`lib/utils/api`) — роути.
- `PrefetchedQuery` + `readOkJson` — чекліст у першому HTML сторінки кампанії.
- Патерн реєстру як `AI_TOOLS` / реєстр режимів мапи.

Нове потрібне, бо в проєкті немає жодного механізму стану «бачив/закрив» і жодної довідки; markdown-бібліотеки теж немає — статті як TS-структури.

## Архітектура

### Реєстр `lib/onboarding/` (чиста логіка, без React)

- `facts.ts` — тип `OnboardingFacts`:
  `races, units, players, activePlayerCharacters, pendingDrafts, battles, battlesStarted, scenarioPages, shows, tracks, hasAiKey` (ДМ);
  `ownCharacter: "none" | "pending" | "active", inActiveBattle` (гравець). Тільки числа/булеві.
- `checklists/dm.ts`, `checklists/player.ts` — `OnboardingStep = { id, title, description, href(campaignId), helpSlug?, optional?, isDone(facts, flags) }`.
- `hints.ts` — `OnboardingHint = { id, audience, title, body, helpSlug? }`.
- `whats-new.ts` — `WhatsNewEntry = { id, date, audience: "dm" | "player" | "all", title, body, href? }`, новіші першими.
- `help/` — статті `HelpArticle = { slug, audience, title, summary, sections: { heading, blocks: HelpBlock[] }[] }`, `HelpBlock` = абзац | список | посилання на екран/статтю.
- `progress.ts` — `checklistProgress(steps, facts, flags)`, `unseenWhatsNew(entries, role, lastSeenId)`, `isHintHidden(id, flags)`.

### Дані

Нова таблиця (expand-only міграція + `ENABLE ROW LEVEL SECURITY`):

```prisma
model UserOnboardingFlag {
  id        String   @id @default(cuid())
  userId    String
  key       String
  value     String?
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@map("user_onboarding_flags")
}
```

Ключі:
- `hint:<id>` — підказку закрито; `hint:*` — сховано всі (включно з майбутніми).
- `checklist:<campaignId>` — `value` = `hidden` або ISO-дата першого «все обов'язкове виконано».
- `whats-new` — `value` = id останнього побаченого запису.

Виконання кроків **не зберігається** — завжди рахується з фактів (виняток: «Ознайомся з аркушем» = закрита підказка `player.character`).

### API

- `GET /api/onboarding` → `{ flags: Record<string, string | null> }` (requireAuth).
- `PUT /api/onboarding/flags` `{ key, value? }` → upsert. Zod: `key` відповідає `^(hint:[a-z0-9.*-]+|checklist:[a-z0-9]+|whats-new)$`, ≤ 100 символів; `value` ≤ 100.
- `GET /api/campaigns/[id]/onboarding` → `{ role, steps: { id, done, optional }[], completedAt? }`; роль із `requireCampaignAccess`, гравцю — лише його кроки. Факти — `readOnboardingFacts(campaignId, userId, role)` у `lib/server/onboarding/` одним `Promise.all` з `count`/`findFirst select id`.
- Сторінка кампанії викликає ту ж функцію читання і обгортає чекліст у `PrefetchedQuery`.

### Клієнт

- `lib/api/onboarding.ts` — `getFlags`, `setFlag`, `getCampaignOnboarding`.
- `lib/hooks/onboarding/` (`index.ts` + `keys.ts` без `"use client"`): `useOnboardingFlags` (`staleTime: Infinity`), `useSetOnboardingFlag` (оптимістично), `useCampaignOnboarding(campaignId)`, `useWhatsNew(role)`.
- `components/onboarding/`:
  - `OnboardingChecklist` — панель угорі сторінки кампанії: прогрес «3/6», кроки з «Перейти» та «Як це?», група «Більше можливостей», «Сховати».
  - `OnboardingHint id` — callout із хрестиком, не рендериться, якщо закрито / `hint:*` / прапорці не завантажені.
  - `WhatsNewButton` — у `Header`, бейдж непобачених для ролі, `ResponsiveDialog` зі списком; відкриття ставить `whats-new` = найновіший id.
- Сторінки `app/help/page.tsx` (список статей за аудиторією + «Сховати всі підказки» / «Показати знову» + «Повернути чекліст») і `app/help/[slug]/page.tsx`; HUD-стиль, пункт «Довідка» в меню хедера.

## Наповнення

### Чекліст ДМ

| # | Крок | Виконано, коли | Ціль |
|---|---|---|---|
| 1 | Створи расу | `races > 0` | `dm/races`, стаття «Світ кампанії» |
| 2 | Додай юнітів-супротивників | `units > 0` | `dm/units` (є імпорт) |
| 3 | Запроси гравців | `players > 0` | інвайт-код на сторінці кампанії |
| 4 | Схвали або створи героя | `activePlayerCharacters > 0` | `dm/characters`; якщо `pendingDrafts > 0` — опис про чернетки |
| 5 | Підготуй бій | `battles > 0` | `dm/battles` |
| 6 | Проведи перший бій | `battlesStarted > 0` (active/completed) | `dm/battles` |
| — | Більше можливостей (optional) | сценарій, показ, музика, AI-ключ | `dm/scenario`, `dm/show`, `dm/music`, `/settings/ai` |

### Чекліст гравця

1. Створи героя — є персонаж; стан «чекає схвалення ДМ», якщо чернетка `pending`.
2. Ознайомся з аркушем героя — закрита підказка `player.character`.
3. Приєднайся до бою — `inActiveBattle`; інакше «ДМ запустить бій — кнопка з'явиться в хедері».
4. Показ — інформаційний (optional, без галочки).

### Підказки (~12)

ДМ: `dm.races`, `dm.skill-trees`, `dm.skills`, `dm.units`, `dm.spells`, `dm.artifacts`, `dm.battles`, `dm.battle-setup` (баланс, резерв), `dm.battle-scene`, `dm.scenario`, `dm.show`.
Гравець: `player.character`, `player.draft`, `player.battle`.
Кожна — 2–3 речення + посилання на статтю.

### Довідка (~8 статей)

ДМ: «Швидкий старт ДМ», «Світ кампанії: раси, скіли, дерева», «Юніти й баланс бою», «Проведення бою», «Сценарій і показ», «AI-асистент».
Гравець: «Швидкий старт гравця», «Бій з телефона».
Тексти українською на основі `docs/architecture/*`; вичитує власник.

### «Що нового» — стартові записи

Підсумок героя й чернетки гравця, стрільба, рукопис сценарію, AI-асистент (з аудиторіями).

## Поведінка і помилки

- Чекліст при виконанні всіх обов'язкових кроків згортається в рядок «Перші кроки пройдено ✓ · Довідка»; через 7 днів від `completedAt` зникає. «Сховати» — одразу; повернути з `/help`.
- Кампанії з даними: чекліст одразу згорнутий; підказки екранів показуються один раз.
- Перший вхід (немає прапорця `whats-new`) — ставимо найновіший id без бейджа.
- Помилка будь-якого API онбордингу → компоненти рендерять нічого; онбординг ніколи не блокує роботу.
- Тексти помилок роутів — з `lib/constants/api-errors.ts`.

## Тести

- `lib/onboarding/__tests__`: `isDone` кожного кроку на наборах фактів; `checklistProgress`, згортання/7 днів; `unseenWhatsNew` за аудиторією і першим входом; унікальність id кроків/підказок/записів; кожен `helpSlug` існує.
- Роути: Zod-валідація ключа, 401/403, гравець не отримує кроки ДМ, upsert.
- Компоненти (`happy-dom`): прогрес чекліста, закриття підказки, бейдж і діалог «Що нового».
- Браузерна перевірка ДМ і гравця, десктоп + телефон, на локальній БД `onboarding`.

## Розгортання і документація

- Міграція `user_onboarding_flags` піде на прод при деплої.
- `docs/architecture/onboarding.md` + рядок у `docs/architecture/README.md`, `docs/STATUS.md`.
- CLAUDE.md: «нова фіча для користувача → запис у `lib/onboarding/whats-new.ts` (+ підказка/стаття, якщо з'явився новий екран)».
- Майстер першої кампанії після конструктора 1c — новий крок «вибери шаблон» у реєстрі.
