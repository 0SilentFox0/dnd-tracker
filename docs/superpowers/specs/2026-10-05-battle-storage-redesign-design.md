# Редизайн зберігання і флоу бою

- **Дата:** 2026-10-05
- **Статус:** дизайн погоджено, очікує ревʼю спеки
- **Скоуп:** модель даних бою, серверний пайплайн дій, транспорт Pusher, клієнтський кеш бою, виправлення правил движка

## 1. Контекст і мета

Supabase-проєкт створюється з нуля, дані не мігруємо. Це дає змогу перепроєктувати зберігання бою без legacy-обмежень.

Зараз весь бій — це один рядок `BattleScene` із JSON-колонками `initiativeOrder`, `battleLog`, `pendingSummons`,
`pendingMoraleCheck`. Рядок важить ≈150–350KB і повністю переписується на кожну дію, без версії та транзакції. Із цього
випливає більшість проблем:

- **Втрачені оновлення.** Дві одночасні дії (DM next-turn + атака гравця) перезаписують одна одну; подвійний клік проходить перевірки двічі.
- **Rollback майже не працює.** `stateBefore` зберігається лише на останньому записі логу, а частина роутів його не пише взагалі.
- **Pusher.** Payload майже завжди перевищує ліміт, тож кожен клієнт робить повний GET після кожної дії.
- **Клієнтський кеш.** Пише будь-яку відповідь чи подію без порівняння версій, тож застарілий стан може назавжди перезаписати новий.

Також у серверному коді є дубльовані й уже розбіжні движки ходу та атаки, баги черговості ходів, а сервер приймає будь-які значення кубиків.

**Мета:** безпечні конкурентні дії, rollback до будь-якої дії, малі записи і Pusher-дельти до 10KB, одне місце для кожного
правила, і перемальовування на клієнті лише змінених учасників.

**Критерії успіху:**
- Дві паралельні дії: одна 200, друга 409, і жодна не губиться мовчки.
- Відкат на будь-який крок логу відновлює стан повністю, разом із саммонами в очікуванні та перевіркою моралі.
- Pusher-дельта типової дії в бою з 10 учасниками менша за 10KB.
- Одна Pusher-подія перемальовує лише картки змінених учасників.
- Кожен battle-роут займає ≤ 50 рядків і делегує логіку пайплайну.

## 2. Рішення продукту

| Питання | Рішення | Наслідок |
|---|---|---|
| Хто кидає кубики | Фізичні кубики, гравець вводить | Сервер довіряє значенням, але валідує межі; hit/miss вирішує лише сервер |
| Глибина rollback | До будь-якої дії | `BattleSnapshot` на кожну дію |
| Write-back у Character після бою | Ні | Кожен бій бере свіжий знімок персонажа; `complete` лише фіксує результат |
| Модель зберігання | Повна нормалізація | Рядок на учасника + журнал подій + знімки |

**Поза скоупом:**
- per-user фільтрація стану ворогів у Pusher (лишається приховування в UI);
- write-back у Character;
- ресинк знімка персонажа посеред бою.

## 3. Інваріант дизайну

Движок правил (`lib/utils/battle/*`, `lib/utils/skills/execution/*`) продовжує працювати з типом `BattleParticipant[]`
з `types/battle.ts`. Змінюються лише завантаження, збереження і транспорт. API повертає ту саму форму
`initiativeOrder: BattleParticipant[]`, тож клієнт мігрує окремим етапом.

## 4. Схема Prisma

```prisma
enum BattleStatus {
  prepared
  active
  completed
}

model BattleScene {
  id                 String       @id @default(cuid())
  campaignId         String
  name               String
  description        String?
  status             BattleStatus @default(prepared)
  round              Int          @default(1)
  turnIndex          Int          @default(0)
  version            Int          @default(0)   // optimistic lock, +1 на кожну мутацію
  eventSeq           Int          @default(0)   // seq останньої події
  setup              Json         @default("[]") // BattlePreparationParticipant[]
  pendingMoraleCheck Json?                       // валідується Zod-схемою
  startedAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  campaign     Campaign            @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  participants BattleParticipant[]
  events       BattleEvent[]
  snapshots    BattleSnapshot[]

  @@index([campaignId, status])
}

model BattleParticipant {
  id           String  @id          // = basicInfo.id
  battleId     String
  sourceType   String               // "character" | "unit"
  sourceId     String
  side         String               // "ally" | "enemy"
  controlledBy String               // userId | "dm"
  orderIndex   Int
  isPending    Boolean @default(false) // саммон, що входить у бій з наступного раунду
  extraTurnOf  String?              // id оригіналу для слота екстра-ходу

  currentHp          Int
  tempHp             Int
  maxHp              Int
  morale             Int
  status             String         // "active" | "unconscious" | "dead"
  initiative         Int
  hasUsedAction      Boolean
  hasUsedBonusAction Boolean
  hasUsedReaction    Boolean
  hasExtraTurn       Boolean

  snapshot     Json   // важке, майже незмінне
  state        Json   // решта мутабельного
  snapshotHash String

  battle BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@index([battleId, orderIndex])
}

model BattleEvent {
  id          String    @id @default(cuid())
  battleId    String
  seq         Int
  round       Int
  type        String
  actorId     String?
  targets     Json
  details     Json
  hpChanges   Json
  resultText  String
  cancelledAt DateTime?
  createdAt   DateTime  @default(now())

  battle BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@unique([battleId, seq])
}

model BattleSnapshot {
  battleId String
  seq      Int    // стан ПЕРЕД подією з цим seq
  state    Json

  battle BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@id([battleId, seq])
}
```

### 4.1 Розподіл полів `BattleParticipant`

Одне місце в коді, `splitParticipant` / `joinParticipant`, визначає, куди йде кожне поле:

| Частина | Поля |
|---|---|
| Колонки | `basicInfo.{id, sourceType, sourceId, side, controlledBy}`, `combatStats.{currentHp, tempHp, maxHp, morale, status}`, `abilities.initiative`, `actionFlags.*` |
| `snapshot` | `basicInfo` (решта), `abilities` (крім `initiative`), `combatStats.{armorClass, speed, minTargets, maxTargets}`, `spellcasting` (крім `spellSlots[*].current`), `battleData.{attacks, passiveAbilities, racialAbilities, activeSkills, equippedArtifacts, artifactSetHudMarkers, extras}` |
| `state` | `battleData.{activeEffects, skillUsageCounts, pendingExtraActions}`, `spellSlots[*].current` |

Баффи під час бою змінюють навіть «статичні» поля (характеристики, AC, `extras` через `apply-passive-stat-effect.ts`).
Тому поділ — це оптимізація продуктивності, а не обмеження коректності: saver порівнює `snapshotHash` і переписує
`snapshot`, якщо він змінився. Обрізання описів (зараз `slimInitiativeOrderForStorage`) виконується один раз під час
побудови `snapshot` на старті. `pendingScopedArtifactBonuses` потрібне лише під час старту і не зберігається.

Прихований каст `battleData.extras` (`participant/extras.ts`) стає типізованим полем `BattleParticipantBattleData.extras`.

### 4.2 Формат `BattleSnapshot.state`

```ts
{
  scene: { round, turnIndex, status, pendingMoraleCheck },
  participants: Array<{ id, orderIndex, isPending, extraTurnOf, hot: {...}, state: {...} }>,
  changedSnapshots?: Record<participantId, snapshot>, // лише якщо дія змінила snapshot
  removed?: Array<FullParticipantRow>,                // учасники, яких дія видалила
}
```
Важкий `snapshot` між подіями незмінний, тож у знімку rollback він не дублюється. Розмір ≈ 1–3KB на дію.

### 4.3 Індекси поза боєм

Нова схема одразу включає індекси, яких бракує зараз: `CampaignMember.userId`, `Campaign.dmUserId`,
`Character.controlledBy`, `campaignId` на `UnitGroup`, `SpellGroup`, `ArtifactSet`, `RacialAbility`.

## 5. Шар зберігання `lib/utils/battle/store/`

| Файл | Відповідальність |
|---|---|
| `split-participant.ts` | `splitParticipant(p) → { columns, snapshot, state, snapshotHash }`, `joinParticipant(row) → BattleParticipant` |
| `load-battle.ts` | `loadBattle(tx, { battleId, campaignId, userId }) → LoadedBattle \| null`: один запит з `participants` і перевіркою членства |
| `save-battle.ts` | `saveBattle(tx, before, after, events) → BattleDelta` |
| `battle-delta.ts` | тип `BattleDelta` і `diffParticipants(before, after)` |
| `errors.ts` | `BattleConflictError`, `BattleAccessError`, `BattleRuleError(code)` |

```ts
interface LoadedBattle {
  scene: { id; campaignId; status; round; turnIndex; version; eventSeq; pendingMoraleCheck; setup };
  participants: BattleParticipant[]; // активні, впорядковані за orderIndex
  pending: BattleParticipant[];      // isPending
  isDM: boolean;
}
```

`saveBattle` в одній `prisma.$transaction`:
1. `battleScene.updateMany({ where: { id, version: before.version }, data: { version: { increment: 1 }, ...scenePatch, eventSeq } })`;
   якщо `count === 0`, кидає `BattleConflictError`.
2. `diffParticipants`: нові → `createMany`; видалені → `deleteMany`; змінені → `update` лише змінених частин
   (колонки, `state`, якщо JSON відрізняється, `snapshot`, якщо змінився `snapshotHash`).
3. `battleSnapshot.create({ seq: before.eventSeq + 1, state: <стан before> })`, якщо є хоча б одна подія.
4. `battleEvent.createMany` з послідовними `seq`.

`strip-battle-payload.ts` видаляється разом із `PUSHER_SIZE_LIMIT_BYTES`, `STATE_BEFORE_KEEP_LAST_N` і light payload.

## 6. Пайплайн `runBattleMutation`

`lib/utils/battle/pipeline/run-battle-mutation.ts`:

```ts
type BattleAccess = "dm" | "turnController" | "member";

interface BattleMutationContext {
  scene: LoadedBattle["scene"];
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  userId: string;
  isDM: boolean;
}

interface MutationResult {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene?: Partial<Pick<Scene, "status" | "round" | "turnIndex" | "pendingMoraleCheck" | "startedAt" | "completedAt">>;
  events: NewBattleEvent[];
  response?: unknown; // додаткові дані для клієнта (наприклад, результат атаки для модалки)
}

runBattleMutation(req, {
  params,                // { id, battleId }
  access: BattleAccess,
  requireStatus?: BattleStatus | BattleStatus[],
  schema?: ZodSchema<TBody>,
  rateLimit?: boolean,
  mutate: (ctx, body: TBody) => MutationResult | Promise<MutationResult>,
}): Promise<NextResponse>
```

Кроки:
1. `getClaims()` (локальна перевірка JWT) паралельно з rate-limit (Upstash).
2. Парсинг тіла через Zod; невалідне тіло → 400.
3. `loadBattle` (бій + членство одним запитом); немає → 404; немає доступу → 403.
4. Перевірка `access`. `turnController` означає: DM, або контролер учасника на поточному індексі, який живий.
5. Перевірка `requireStatus`; якщо тіло містить `expectedVersion` і воно ≠ `scene.version` → 409 без мутації.
6. `mutate(ctx, body)`.
7. `checkVictory`: єдине місце перевірки перемоги, після кожної мутації в активному бою.
8. `saveBattle` → `BattleDelta`.
9. Відповідь `{ battle: <повний бій у поточній API-формі>, delta, ...response }`.
10. `after(() => pusherServer.trigger(channel, "battle-delta", deltaOrRefetch))`.

Захист від подвійного кліку дає optimistic lock: кожне тіло дії має опційне `expectedVersion` (версія з кешу клієнта).
Другий клік несе ту саму, вже застарілу версію і отримує 409 на кроці 5, ще до мутації; гонку між двома одночасними
запитами ловить `updateMany where version` у `saveBattle`.

**Помилки → HTTP:** `BattleConflictError` → 409 `{ code: "conflict", version }`, `BattleAccessError` → 403,
`BattleRuleError` → 422 `{ code }` (наприклад `not_your_turn`, `action_used`, `participant_dead`, `invalid_dice`),
Zod → 400. Мапінг помилок за підрядком прибирається.

### 6.1 Pusher-дельта

```ts
interface BattleDelta {
  battleId: string;
  version: number;
  scene: { status; round; turnIndex; pendingMoraleCheck };
  upserted: BattleParticipant[]; // нові або змінені (включно з pending)
  removed: string[];
  events: BattleEvent[];
  cancelledFromSeq?: number;     // для rollback
}
```
Якщо серіалізована дельта більша за 9_500 байт (старт бою, reset, rollback), шлеться `{ battleId, version, refetch: true }`.
Подія зветься `battle-delta`; старі `battle-updated` і `battle-started` прибираються в етапі 5. Події `battle-completed`
і `turn-started` на канал гравця лишаються.

## 7. Роути

Кожен роут — Zod-схема плюс виклик `runBattleMutation` із `mutate`, що звертається до існуючих функцій движка.

| Роут | access / статус | `mutate` |
|---|---|---|
| `POST start` | dm / prepared | builders `from-character` / `from-unit` зі спільним контекстом + start triggers + сортування |
| `POST next-turn` | turnController / active | **один** `advanceTurn` (злиття `advance-turn-phase.ts` і `next-turn-advance.ts` + `next-turn-helpers.ts`, включно з застосуванням і очищенням моралі) |
| `POST attack` | turnController / active | `runAttackPhase`; поле `endTurn: boolean` замінює окремий роут `attack-and-next-turn` |
| `POST attack/resolve` | turnController / active | без запису: `{ isHit, isCritical, needsDamageRoll, damageDice, targetAc? }` |
| `POST spell` | turnController / active | `processSpell` (+ саммон як `isPending` або в кінець ініціативи, як зараз) |
| `POST bonus-action` | turnController / active | `executeBonusActionSkill` |
| `POST morale-check` | turnController / active | `checkMorale`; повторний сабміт для тієї ж перевірки → 422 |
| `POST add-participant` | dm / active | builders зі спільним `CampaignSpellContext` (без fallback-запитів) |
| `POST add-summon` | dm / active | побудова учасника, `isPending: true` |
| `PATCH participants` | dm / active | видалити учасника / змінити HP + complex HP triggers |
| `POST complete` | dm / active | `completeBattle` |
| `POST reset` | dm / active, completed | повертає `prepared`, видаляє учасників, події і знімки, чистить мораль |
| `POST rollback` | dm / active, completed | див. §8 |
| `PATCH /` | dm | лише `name`, `description`, `setup` (Zod whitelist) |
| `GET /` | member | `loadBattle` + останні 50 подій |
| `GET events?beforeSeq=` | member | пагінація логу |
| `GET damage-breakdown` | member | без змін |

`attack-handler.ts` і роут `attack-and-next-turn` видаляються.

## 8. Rollback

`POST rollback { targetSeq }`:
1. Читає `BattleSnapshot(battleId, targetSeq)`; немає → 404.
2. Відновлює колонки і `state` усіх учасників зі знімка, `snapshot` з `changedSnapshots`, повертає `removed`,
   видаляє учасників, створених після `targetSeq`.
3. Відновлює `scene` (round, turnIndex, status, pendingMoraleCheck).
4. Ставить `cancelledAt` подіям із `seq ≥ targetSeq` і видаляє знімки з `seq > targetSeq`.
5. Звичайний шлях `saveBattle` з `version + 1`; дельта `refetch: true`.

Rollback покриває **кожну** дію, включно з DM-діями (add-participant, add-summon, PATCH participants, morale),
бо знімок пише `saveBattle`, а не окремі роути.

## 9. Валідація фізичних кубиків

`lib/utils/common/dice.ts` — один парсер замість 6+ існуючих (`common/calculations.ts`, `battle/balance/dice.ts`,
`skills/execution/helpers.ts`, `spells/spell-parsing.ts`, `battle/spell/process-helpers.ts`, інлайн-регекси в
`attack/reaction.ts` і `attack/process/compute.ts`):

```ts
parseDice(formula: string): { groups: Array<{ count: number; size: number }>; flat: number };
validateDiceRolls(formula: string, rolls: number[]): Result<void, "count_mismatch" | "out_of_range">;
maxRoll(formula: string): number;
averageRoll(formula: string): number;
```

Правила:
- `d20Roll`: 1..20; при advantage/disadvantage рівно 2 значення.
- `damageRolls`: кількість дорівнює кубикам формули атаки (з урахуванням крит-подвоєння), кожне значення 1..size.
- `reactionDamage` ≤ `maxRoll` формули.
- Saving throws: 1..20.
- Порушення → `BattleRuleError("invalid_dice")` → 422.

Hit/miss, крит, ефективний AC і бонуси рахує лише сервер (`calculateAttackRoll`, `getEffectiveArmorClass`).
Клієнт показує оверлей за відповіддю `attack/resolve`.

## 10. Виправлення правил движка

Кожне виправлення супроводжує тест у `lib/utils/battle/__tests__/`:

1. **Індекс наступного ходу.** Обчислюється після пересортування, додавання саммонів і видалення слотів екстра-ходу:
   за id наступного живого учасника, а не за позицією в старому масиві (`battle-turn.ts:210-252`).
2. **Екстра-хід.** Слот — рядок з `extraTurnOf` і без власного бойового стану. `joinParticipant` для слота віддає стан
   оригіналу; урон і витрати слота пишуться в оригінал; `checkVictory` ігнорує слоти.
3. **Видалення поточного учасника.** Наступний живий отримує `processStartOfTurn`; якщо видалений був останнім — перехід раунду.
4. **Ефекти.** Тривалості тікають після застосування обмежень ходу (`no_bonus_action`, `no_reaction`); DoT може довести до
   0 HP зі статусом `unconscious`/`dead`; start-of-turn пасивки застосовуються, а не лише логуються; on_hit ефекти реалізуються
   (`attack/process/run.ts:217`).
5. **HP PATCH.** HP > 0 повертає статус `unconscious` у `active`.
6. **`completeBattle`.** `hpChanges` рахується до зміни статусу (`battle-victory.ts:79-120`).
7. **Дубльовані хелпери.** `getModifierValue`: одна реалізація з семантикою `== null` (0 — валідне значення); формула модифікатора
   характеристики скрізь через `getAbilityModifier`.

## 11. Клієнт

1. `lib/hooks/battle/apply-battle-delta.ts`: `applyBattleDelta(queryClient, key, delta)`:
   - `delta.version <= cached.version` → ігнор;
   - `=== cached.version + 1` → патч лише `upserted` / `removed`; незмінені учасники зберігають посилання;
   - пропуск версії або `refetch` → `invalidateQueries`.
   Ту саму функцію використовують відповіді мутацій. `mergeBattleCache` і логіка light payload з 8-секундним пропуском видаляються.
2. `usePusherBattleSync`: підписка на `battle-delta`, `unbind` слухача `state_change`, без глобального `unsubscribe` каналу.
3. 409 → refetch і toast «Стан бою змінився, повторіть дію».
4. Атака: hit/miss з `attack/resolve`; `useAttackFlow` переходить на `useReducer`-машину
   `selectTarget → roll[i] → resolve → damage → summary → submitting`.
5. Спел: один `useSpellCastFlow` для всіх трьох входів (player direct, player preview, DM); список спелів через `useQuery`.
6. `PlayerTurnView key={participantId + round}`; автоскіп гейтиться будь-якою pending-мутацією.
7. Рендер: `ParticipantCard` / `InitiativeTimeline` у `memo` з вузькими пропсами, `reactCompiler`, `next/dynamic` для діалогів,
   `layout` лише на поточному елементі таймлайну.
8. Battle page — server component з prefetch і `userId` із сервера.
9. Видалення мертвого коду: `AttackDialog`, page-level `MoraleCheckDialog`, `ActionPanel`, `BattleInitiativeBar`, `ParticipantList`,
   `AttackTypeDialog`, `MoraleResultModal`, `SpellSelectionDialog`, `EffectsRow`, тип `BattleLogEntry`.

## 12. Етапи (кожен — окремий план реалізації і окремий PR)

1. **Інфраструктура.** Новий Supabase в `eu-central-1`, Vercel `regions: ["fra1"]`, Pusher-кластер `eu`, чиста початкова
   міграція з нової схеми. `prisma migrate deploy` повертається у флоу деплою, бо проблеми P3005 більше немає.
   Оновлюються `CLAUDE.md`, `docs/VERCEL.md`, `docs/DATABASE-SYNC.md`.
2. **Store + пайплайн.** Схема §4, `lib/utils/battle/store/*`, `runBattleMutation`, `lib/utils/common/dice.ts` з тестами.
3. **Перенесення роутів.** По одному: start → next-turn (злиття движків) → attack (+`endTurn`, `attack/resolve`) → spell →
   bonus-action / morale-check → DM-роути → rollback. Поки клієнт не мігрував, сервер шле і `battle-updated` (повний бій),
   і `battle-delta`.
4. **Правила движка** (§10) з тестами.
5. **Клієнт** (§11) у вказаному порядку; наприкінці прибирається `battle-updated`.

## 13. Тестування

- `split-participant`: `joinParticipant(splitParticipant(p)) ≡ p` на фікстурах персонажа з артефактами і скілами та юніта.
- `diffParticipants` / `saveBattle`: змінився 1 учасник → рівно 1 update; змінився `snapshot` → оновлюється `snapshotHash`.
- Конкурентність: два `saveBattle` з однаковою `version` → другий кидає `BattleConflictError`.
- Rollback: послідовність з 5 дій (включно з add-summon і morale) → відкат на кожен крок відновлює стан, ідентичний збереженому.
- Движок: перехід ходу з саммонами, видаленням поточного учасника, екстра-ходом; перевірка перемоги після атаки й спелу.
- Кубики: 0, 7 на d6, зайвий кубик, від'ємне значення → 422; коректні значення → 200.
- Розмір дельти: бій із 10 учасниками, атака по одній цілі → серіалізована дельта < 10KB.
- Клієнт: `applyBattleDelta` ігнорує старі версії, патчить послідовну, рефетчить при пропуску.
- `pnpm lint && pnpm test:run && pnpm build` на кожному етапі.
