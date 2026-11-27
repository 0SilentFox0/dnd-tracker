# Посилання-запрошення (П2.6 UX-аудиту) — дизайн

**Мета.** ДМ копіює посилання `/join/<код>` і надсилає гравцю. Гравець відкриває його: якщо не залогінений — вхід/реєстрація, потім повернення на `/join/<код>` і одразу кампанія. Код без схожих символів `0 O 1 I`, регістр не важливий.

## Що є зараз (перевірено в коді)
- `lib/utils/campaigns/invite-code.ts`: `ALPHABET = 0-9A-Z`, довжина 6, `randomInt`; виклик у `lib/server/campaigns/create-campaign.ts:95`. У БД `campaigns."inviteCode"` — `@unique` (індекс чутливий до регістру); усі коди генерувались у верхньому регістрі.
- Join уже без урахування регістру: `joinCampaignByCode` (`lib/server/campaigns/join-campaign.ts`) шукає `mode: 'insensitive'` (повний скан, індекс не працює). Перевіряє template/demo/неактивну/вже учасник. Маршрут `POST /api/campaigns/join` має rate limit (`JOIN_RATE_LIMIT` 10/10 хв на користувача).
- **Головна діра для посилань:** proxy (`lib/supabase/middleware.ts:177`) редиректить незалогіненого на `/sign-in` і **губить шлях** (немає `next`); залогінений на `/sign-in` іде на `/campaigns`, ігноруючи `next`. Вхід email (`useEmailSignIn`) і Google (`useGoogleOAuth`) `next` уже читають через `safeNextPath`; реєстрація (`useEmailSignUp`) — ні: `emailRedirectTo: callbackUrl()` без `next`, а сесія без підтвердження йде на `AFTER_SIGN_IN_PATH`. Посилання sign-in ↔ sign-up в `AuthScreens.tsx` теж гублять `?next`.
- Копіювання: `InviteCodeDisplay.tsx` копіює лише код, власний `useState`+`setTimeout`; спільного хука clipboard немає (ще дублікати в `ApiTokenList.tsx`, `SpellCard.tsx`). `CampaignMembersList` коду не отримує.

## Перевикористовуємо
`joinCampaignByCode` (+ винесена перевірка), `useJoinCampaign`, `joinErrorMessage`, `safeNextPath`, `callbackUrl` з `useEmailAuth`, `checkRateLimit`, `InviteCodeDisplay`, `HudPage`/`HudPanel`, `Button`. Новий лише хук clipboard (бо 3 копії вже є) і сторінка `/join/[code]`.

## Рішення
1. **Алфавіт** `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 символи, 32⁶ ≈ 1,07·10⁹). Старі коди не чіпаємо і не перегенеровуємо — вони містять `0/O/1/I`, тому **не** підміняємо `O→0`, `I→1` при пошуку.
2. **Регістр:** нормалізація на вході, а не в запиті: `joinCampaignSchema.inviteCode = z.string().trim().toUpperCase().min(1)`, у пошуку точний `findUnique({ where: { inviteCode } })` (працює індекс). Колізій нема, бо всі коди uppercase; перед мерджем перевірити на prodcopy/проді: `SELECT count(*) FROM campaigns WHERE "inviteCode" <> upper("inviteCode")` = 0.
3. **`/join/[code]` — сторінка-підтвердження, не GET-мутація** (див. питання власнику). Серверна `page.tsx`: сесія (proxy вже гарантує логін), `getJoinPreview` → якщо вже учасник/ДМ — `redirect('/campaigns/<id>')`; якщо можна — картка «Кампанія X · ДМ Y» + кнопка «Приєднатися» (`useJoinCampaign`, `onSuccess` → `router.replace('/campaigns/<id>')`); інакше — повідомлення помилки (не знайдено / шаблон / демо / неактивна) з посиланням на `/campaigns`. Відповідь `ALREADY_MEMBER` на POST (подвійний клік, гонка) теж веде в кампанію.
4. **Повернення після входу:** proxy при редиректі на `/sign-in` ставить `next = pathname + search` (крім `AFTER_SIGN_IN_PATH`); залогінений на `/sign-in`/`/sign-up` → `safeNextPath(next)`. Реєстрація передає `next` у `callbackUrl(next)` і в редирект при негайній сесії. `AuthLink` між sign-in/sign-up зберігають `?next`. Це загальне виправлення deep-link'ів, не лише для join.
5. **Rate limit:** preview на сторінці — `checkRateLimit({ scope: 'campaign-join-preview', ...JOIN_RATE_LIMIT })`; при перевищенні — та сама сторінка помилки. POST — без змін.
6. **Посилання** = `${window.location.origin}/join/${code}` (а не `SITE_URL`, щоб працювало на превʼю-стейджах).

## Файли (сигнатури)
- `lib/utils/campaigns/invite-code.ts` — новий `ALPHABET`; `normalizeInviteCode(raw: string): string` (trim+upper); `inviteLinkPath(code: string): string` → `/join/<code>`.
- `lib/schemas/campaigns.ts` — `inviteCode` через `.transform(normalizeInviteCode)`.
- `lib/server/campaigns/join-campaign.ts` — `checkJoinable(campaign, userId): JoinFailure | null` (спільне); `getJoinPreview(userId, code): Promise<{ kind: 'member'; campaignId } | { kind: 'joinable'; campaign: { id; name; dmName } } | JoinFailure>`; `joinCampaignByCode` на `findUnique`.
- `app/join/[code]/page.tsx` (server) + `components/campaigns/join/JoinByLinkPanel.tsx` (client: кнопка, помилка).
- `lib/supabase/middleware.ts` — `next` у редиректі; `/sign-in`, `/sign-up` з сесією → `safeNextPath`.
- `lib/hooks/auth/useEmailAuth.ts` — `useEmailSignUp` читає `next`; `components/auth/AuthScreens.tsx` — `AuthLink` з `next`.
- `lib/hooks/common/useCopyToClipboard.ts` — `useCopyToClipboard(resetMs = 2000): { copied: boolean; copy(text: string): Promise<boolean> }` (+ барель); `InviteCodeDisplay` переходить на нього й отримує другу кнопку «Копіювати посилання» (`Link` icon).
- `components/campaigns/members/CampaignMembersList.tsx` — проп `inviteCode: string | null`; кнопка копіювання посилання в шапці, коли `isDM && inviteCode`; `app/campaigns/[id]/page.tsx:342` передає те саме значення, що й рядок 187 (`isDM && !isTemplate ? … : null`).
- `lib/utils/campaigns/join-error.ts` — мапінг `TEMPLATE_NOT_JOINABLE`, `DEMO_NOT_JOINABLE` (зараз падають у сирий текст).
- i18n (`messages/{uk,en}`): `campaigns.settings.copyLink`, `campaigns.settings.linkCopied`, `campaigns.joinLink.{title,description,dm,submit,joining,back}`, `common.joinErrors.{templateNotJoinable,demoNotJoinable,rateLimited}`; `onboarding` крок «players» — згадати посилання; `lib/onboarding/whats-new.ts` + `whatsNew.inviteLinks` в обох локалях.

## Тест-кейси
- `invite-code`: 1000 згенерованих кодів не містять `0O1I`, довжина 6; `normalizeInviteCode(' ab3k9z ')` = `AB3K9Z`.
- Схема: нижній регістр і пробіли → верхній регістр; порожній рядок — 400.
- `join-campaign`: код у нижньому регістрі знаходить кампанію; старий код з `0`/`O` працює; preview: учасник і ДМ → `member`; demo/template/неактивна/невідомий → відповідна помилка.
- `middleware-session.test.ts`: гість на `/join/AB3K9Z` → `/sign-in?next=%2Fjoin%2FAB3K9Z`; гість на `/campaigns` → без `next`; залогінений на `/sign-in?next=/join/X` → `/join/X`; `next=//evil.com` → `/campaigns`.
- `useEmailSignUp`: `emailRedirectTo` містить `next`; негайна сесія → `next`.
- `InviteCodeDisplay` (happy-dom): «Копіювати посилання» пише `<origin>/join/<код>`; `CampaignMembersList` без `inviteCode` кнопки не показує, гравцю — теж.
- Живий прогін: гість відкриває посилання → реєстрація email (з підтвердженням) → лист → кампанія; те саме через Google; ДМ відкриває своє посилання → дашборд.

## Відкрите питання
Авто-приєднання при відкритті посилання чи сторінка-підтвердження (рішення 3)? Також на проді перевірити, що Supabase Redirect URLs пропускають `/auth/callback?next=…` (інакше лист із реєстрації веде на Site URL, `next` губиться — тоді запасний варіант: короткий cookie `pending_join`).
