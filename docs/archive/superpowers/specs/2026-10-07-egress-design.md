# Пункт 12 — безпека кешу й трафік (egress)

Дата: 2026-10-07 · гілка `feat/egress` · джерело: `docs/reports/final-review-2026-10-07.md` (розділи A, B)

## Мета

Мінімальний трафік із Supabase і швидша реакція для гравців без зміни поведінки. Плюс закрити знайдені проблеми безпеки й коректності кешу.

**Критерії:**
- типова дельта бою ≤ 2 KB і без повного GET в інших клієнтів;
- запис бою не читає назад рядки;
- лист персонажа ≤ 5 запитів до БД;
- профіль не тягне дерево прокачки, доки не відкрито «Вміння»;
- книга заклинань і довідник не тягнуть усю бібліотеку на кожен візит;
- жодної публічної CDN-відповіді з даними кампанії.

## Потоки робіт (незалежні, виконуються паралельно)

### W1 — кеш, безпека, коректність (B1–B3, B5, B6)

1. **Заголовки кешу.** `spells/route.ts`, `main-skills/route.ts` → `Cache-Control: private, no-store`, як у юнітів і рас. Grep інших `s-maxage` / `public` у `app/api` і виправити так само.
2. **Теги кешу.** `lib/cache/tags.ts`: `cacheTags.{spells,mainSkills,skills,units,races}(campaignId)` + `invalidateReference(kind, campaignId)` з `revalidateTag(tag, { expire: 0 })`.
   - Викликати в кожному записі заклинань, груп заклинань (import, delete-all, delete-by-level, remove-from-group, groups/*), основних навиків, скілів, юнітів і рас.
   - `lib/cache/reference-data.ts` бере теги з `cacheTags`.
   - Інлайн-рядки тегів прибрати.
3. **Без фолбеку на кампанію за замовчуванням.** `getCampaignId` / `campaignRequest` без `campaignId` кидають помилку. `DEFAULT_CAMPAIGN_ID` переїжджає в `scripts/` (і `lib/constants` його більше не експортує).
4. **Опитування бою `prepared`.** Коли Pusher недоступний, бій у статусі `prepared` опитується так само, як `active` (30 с, лише видима вкладка).
5. **Тести:**
   - `pusher/auth` (`isChannelAllowedForUser`: член бою — так, чужий бій — 403, user-канал чужого `userId` — 403);
   - `lib/utils/api/api-auth.ts` (`requireCampaignAccess`, `requireDM`, `validateCampaignOwnership`);
   - маршрути spells / main-skills / members / join: 403 для гравця на DM-операціях і виклик інвалідації після запису.

### W2 — дані бою (A1, A2, A7, A10, B4)

1. **Тонкі дельти.** `ClientBattleDelta` (`pipeline/client-delta.ts`):
   - нові учасники й ті, в кого змінився снапшот (`snapshotChanged`), — повний `BattleParticipant` у `upserted`;
   - решта змінених — у новому полі `patched: Array<{ id: string } & Partial<BattleParticipant>>` лише з полів, що походять із колонок і `state` (HP, ефекти, слоти, ресурси, статус, ініціатива тощо — визнач точний перелік за `ParticipantUpdate` і функцією, що будує `BattleParticipant` з рядка).
   - `applyBattleDelta` мерджить `patched` поверх кешованого учасника (неглибоко, з повною заміною вкладених полів, що прийшли), зберігаючи посилання на незмінених. Якщо патч прийшов на невідомий id — `"refetch"`.
   - Поріг Pusher 9 500 B лишається.
   - Тести: розмір дельти атаки героя на стандартній фікстурі < 2 KB; мердж патча; невідомий id → refetch.
2. **`saveBattle` без читання назад.** Оновлення учасників одним `$executeRaw` `UPDATE … FROM (VALUES …)` або `updateMany` без повернення рядків. Знімок — `createMany`. Кількість запитів у транзакції не росте з кількістю учасників. Тести store і `simulate-battle` 43/43.
3. **Менший GET.** `includeRecentEvents` 100 → 30. Новий `GET /battles/[id]/events?before=<seq>&limit=50` (вузький `select`, ті самі правила видимості й санітизації, що й у GET) + хук для журналу: «Показати раніші» в журналі бою підвантажує сторінку й мерджить у кеш (`mergeLog`). Знання про ворогів не страждає, бо є серверне зведення.
4. **Дешева ресинхронізація.**
   - `GET /battles/[id]?versionOnly=1` → `{ version }` (лише `select: { version }`).
   - `usePusherBattleSync`: прапорець «був розрив» при будь-якому виході зі стану `connected`; після повернення в `connected` або `visibilitychange → visible` (якщо вкладка була схована > 15 с) — запит версії, і повний GET лише якщо версія новіша за кешовану.
5. **Прибирання знімків.** На `complete` видаляти `battle_snapshots` цього бою, якщо після завершення відкат неможливий. Перевір `rollback-mutation`: якщо відкат дозволено для `completed`, тоді лишати останні 20 знімків замість видалення. Події не чіпати (журнал і знання).

### W3 — профіль, заклинання, довідник (A3–A6, A8, A9, A11)

1. **Лист за ≤ 5 запитів.** `sheet-handler` будує контекст одного персонажа одним паралельним пакетом (`Promise.all`: персонаж+інвентар, дерево, скіли за id, основні навики, раса, заклинання за id, артефакти й сети за id) і передає його в `createBattleParticipantFromCharacter` як `context` — за зразком `buildCampaignContextForStart(…, { forBalance: true })`. Жодних повторних читань раси, дерева, скілів чи кампанії (`maxLevel` — з `requireCampaignAccess`). Тест: кількість викликів Prisma на лист ≤ 5 (лічильник у моку).
2. **Прогресія лише на табі.**
   - DTO листа отримує `progression: { freePoints: number; level: number; seenLevel: number }`, обчислене тим самим рушієм, що й `GET /progression`, але без завантаження деталей скілів.
   - `LevelUpBadge` і `LevelUpOverlay` читають це з листа.
   - `useCharacterProgression` вмикається лише в `ProgressionPanel` (таб «Вміння»), `staleTime` = `ENTITY_STALE_MS`.
3. **Learn / unlearn.** Замість інвалідації листа на кожну дію — одна інвалідація листа через 1 с після останньої дії (debounce у хуку), а `progression.freePoints` у листі патчиться одразу через `setQueryData`.
4. **Книга заклинань у бою.** `GET /spells?ids=a,b,c` (Zod, до 200 id, вузький `select` полів, які показує книга) + `useSpellsByIds`. `useSpellBook` бере відомі заклинання героя через нього. DM-шлях (`allSpells`) без змін. Префетч під час простою на монтуванні бою, якщо в героя є `knownSpells`.
5. **Довідник.** `app/campaigns/[id]/info/page.tsx`: явні `select` (лише поля, які рендерить довідник; без зв'язку `spell`), обгорнуто в `unstable_cache` з тегами `cacheTags.skills` / `cacheTags.spells`.
6. **Дрібне (A11):**
   - DM `AddParticipantDialog` вантажить дані лише коли відкритий;
   - старт бою — `forBalance`-контекст замість усієї бібліотеки;
   - видалення — `deleteMany` / `select: { id }`;
   - DM-списки боїв і персонажів — вузькі `select`.

## Поза межами

- Префетч бою й профілю на сервері, шрифти, бандл — це пункт 13.
- Рефактор дублікатів — пункт 14.

## Перевірка

- `pnpm test:run && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm simulate-battle` (43/43).
- Вимір до/після на локальній БД: розмір дельти атаки й ходу, кількість запитів листа, розмір GET бою (записати в звіт рев'ю).
- Браузер: бій двома вкладками (DM і гравець) — атака, хід, відкат, «Показати раніші»; профіль — бейдж рівня, таб «Вміння», learn.
- Opus-рев'ю всієї гілки → виправлення → мердж після «так».
