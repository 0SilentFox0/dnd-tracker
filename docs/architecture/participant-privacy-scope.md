# Приватність учасників бою: оцінка обсягу

Нотатка-дослідження (5c-3, без реалізації). Питання: чи редагувати на сервері `initiativeOrder` (учасників) за глядачем, і скільки це коштує. Журнал і учасники редагуються (див. «Межі 5c-2» у [rule-systems.md](rule-systems.md) і розділ «Реалізація (L8b-1)» нижче).

## Шляхи доставки учасників клієнту

| Шлях | Де | Що несе | Редакція зараз |
|---|---|---|---|
| GET сцени | `readBattleScene` (`lib/server/battles/read-battle.ts`) -> `toBattleResponse` (`lib/utils/battle/pipeline/battle-response.ts`) | `initiativeOrder`, `pendingSummons`, `setup`, `battleLog` | усе для не-DM (L8b): учасники, журнал, `redacted: true` на сцені |
| SSR першого HTML | `app/campaigns/[id]/battles/[battleId]/page.tsx` через `PrefetchedQuery` (та сама відповідь `readBattleScene`) | те саме, потрапляє в HTML | як GET |
| Відповідь мутації | `runBattleMutation` (`run-battle-mutation.ts`): `ClientBattleDelta` | `upserted`/`patched`/`pending`/`setup` | `log` і учасники для не-DM; preview заклинання проходить `sanitizeLogEntry` |
| Pusher `private-battle-<id>` | `buildPusherMessages` | та сама дельта, що й гравцю; `redacted: true`, якщо щось змінено | `log` і учасники |
| Pusher `private-battle-dm-<id>` | `buildPusherMessages` (лише коли `changed`) | повна дельта для ДМ | не потрібна |
| Refetch-сигнал при переповненні | `fitOrRefetch` | без даних, далі GET сцени | див. GET |
| Сторінка журналу / summary | `readBattleEvents`, `readBattleSummary` | події, не учасники | журнал редагується (`redactLogForPlayers`); summary бере учасників на сервері |
| Клієнтський злив | `applyBattleDelta` (`lib/utils/battle/client/apply-delta.ts`) | `upserted`/`patched`/`order` у кеш TanStack | не стосується |

Канали `userChannelName` (turn-started) несуть лише id/ім'я учасника.

## Які поля витікають про ворога

Усе, що є в `BattleParticipant`, видно в мережі кожному члену кампанії (DevTools):

- `combatStats.currentHp`/`maxHp`, `tempHp`, AC, швидкості, збіги/опори, `abilities`/`statblock` (через `snapshot`);
- `activeEffects` (стани wfrp `wfrp:cond:*`, ефекти, концентрація, рівні);
- `snapshot` + `snapshotHash`, `knowledge`-незалежні характеристики wfrp (`characteristics`, Wounds, Fate);
- `basicInfo.controlledBy`, позиція на карті, `reserve`.

## Що вже обмежено на клієнті

`canSeeExactStats(p, viewer)` (`lib/utils/battle/view/visibility.ts`): точні стати бачить ДМ, глядач з прапорцем `seeEnemyHp` (`canSeeEnemyHp`/`alwaysSeesEnemyStats`) або союзник. Для решти UI ховає HP/AC/опори (`ParticipantList`, `ParticipantDetails`, `map-scene` HUD, `strike-steps`, майстер атаки, `useAttackSubmit`); `resolveObservedTraits` і `knowledge` дають лише спостережене. Це суто презентаційний гейт: дані в кеші клієнта повні.

## Що вже закрито на сервері (Ч19)

Єдиний виняток із «приховування лише в UI» — резерв: для гравця сервер віддає заглушки `{ id, side, reserved }` (`reserveStub`/`stubReserve`) у GET/SSR, відповіді мутації й публічній Pusher-дельті, а сетап `PREPARED` — без резервної частини (`publicSetup`). Решта лишається видимою гравцеві в мережі: стати ворогів, `battleData.system`, `battleData.dying`, `combatStats.moraleCap`, `scene.system`; приховування лише в UI. Тому система не кладе секретів у слоти стану (`battleData.system`). Джерела учасників (`character`/`unit`) перевіряються на належність кампанії (`assertParticipantSources`).

## Поля за глядачем (цільова модель)

| Поле ворога | ДМ | Гравець без `seeEnemyHp` | Гравець з `seeEnemyHp` |
|---|---|---|---|
| `currentHp`/`maxHp`/`tempHp` | точні | приховані (грубий стан за `knowledge`) | точні |
| AC, опори, `snapshot` | точні | приховані, лише спостережені риси | точні |
| `activeEffects` | усі | лише публічні (видимі на токені) | як у гравця; приховані мітки рівнів/цілей зняття ховаються |
| `abilities` | усі | лише відомі | усі |
| Позиція, ім'я, сторона, `status` | усі | усі | усі |

Союзники й власні герої не редагуються. Рішення «що публічно» вже є для журналу (`concealLine`), його треба перевикористати.

## Оцінка обсягу

- Нова чиста функція `redactParticipantsForViewer(participants, viewer, rules)` у `lib/utils/battle/view/` (+ тести на кожне поле/глядача): 2 файли.
- Застосування: `toBattleResponse` (GET + SSR, потрібен viewer: `BattleResponseView` несе лише `isDM`, для редакції треба додати viewer/userId), `buildPusherMessages` (публічна дельта: `upserted`, `patched`, `pending`, `setup`), відповідь мутації для не-DM: 3-4 файли.
- `patched` (`BattleParticipantPatch`) редагувати складніше, ніж `upserted`: треба або відкидати приховані ключі, або надсилати для ворога повний редагований upsert; +1-2 файли й тести.
- Клієнт: `applyBattleDelta` і оптимістичні апдейти (`useAttackSubmit`, `useBattleFxQueue`, FX з `currentHp` до/після) працюють із даними, яких у гравця більше не буде: аудит ~10 хуків/компонентів (`useBattleFxQueue`, `useDownedHeroPrompt`, `useAttackTargets`, `useAttackWizard`, `usePlayerTurn`, `derive-scene`, `strike-steps`, `InitiativeTrack`, `ParticipantList`, `ParticipantDetails`, `map-scene`).
- Оцінка: ~12-18 файлів коду, ~15-25 нових/змінених тестів (редаговані дельти, вирівнювання версій, GET/SSR, dm-канал), плюс live-run з другим акаунтом гравця (його зараз немає).

## Рекомендація

1. Один `redactParticipantsForViewer`, що використовує вже наявні `canSeeExactStats`/`seeEnemyHp` і правила прихованості журналу; застосовувати лише на шарі відповіді (GET/SSR, відповідь мутації, публічна Pusher-дельта), стан у БД і рушій не змінювати.
2. Використати dm-канал із 5c-2: у публічній дельті редагований набір, у `private-battle-dm-<id>` повний (умова `changed` розширюється на зміну учасників). Клієнт ДМ уже ігнорує `redacted` лише поки dm-канал підписаний.
3. Серверну редакцію вводити за прапорцем рульової системи/епіком для всіх систем (homm/dnd5e/wfrp), починаючи з GET/SSR, потім дельта.
4. Спершу виправити клієнтські шляхи, що читають приховані поля (FX, оптимістика), або віддавати для них окремий редагований знімок (приблизний HP-стан).

## Ризики

- **Egress** (жорстке обмеження): друга дельта на dm-канал уже є лише при `changed`; розширення `changed` на учасників подвоїть повідомлення кожної атаки (ДМ + публічна). Переповнення (`PUSHER_DELTA_LIMIT_BYTES`) частіше дасть refetch-сигнали й додатковий GET.
- **`snapshotHash`**: хеш пишеться разом із `snapshot`; редакція `snapshot` у відповіді ламає клієнтські порівняння й дельти «лише змінене» (`patched`), тож `snapshot` для чужих ворогів слід прибирати цілком разом із хешем або віддавати стабільну редаговану проєкцію.
- **Оптимістичний клієнт**: передбачення шкоди/зламу HP і FX (до/після) зараз бачать повні числа; після редакції вони мають спиратися на відповідь сервера або на «приблизні» рівні.
- **Версії та відкат**: дельти й `cancelledFrom` припускають, що клієнтський кеш збігається зі станом; різні проєкції для ДМ/гравця вимагають окремих тестів на злив і resync.
- **Кеш SSR**: `PrefetchedQuery` кладе відповідь у HTML; редагована відповідь залежить від користувача, тож її не можна кешувати спільно.
- **Верифікація**: жива Pusher-дельта гравцю не перевірена (немає другого акаунта).

## Реалізація (L8b-1)

`redactParticipantsForViewer(viewer, participants)` / `redactPatchesForViewer` / `redactPendingForViewer` (`lib/utils/battle/view/redact-participants.ts`), чисті функції; точки виходу: `toBattleResponse` (GET, SSR, відповідь ДМ-сервісу), `redactDeltaForPlayers` (відповідь мутації й публічна Pusher-дельта). ДМ і dm-канал бачать усе.

Рішення для учасника, який не точний для глядача (`canSeeExactStats` + власні герої за `controlledBy`):

- `currentHp`/`maxHp`: проєкція на відро `healthState` (`maxHp = 100`; 100/75/40/10/0), тож UI грубого стану не змінюється; `tempHp` та `armorClass` = 0;
- `abilities`: лише `level`, `initiative`, `baseInitiative`, `race(Id)`; бали й модифікатори нейтральні; слот `system` без `ext` (мораль, лігво, d20 death saves);
- `battleData`: без `hpMultiplier`, `damageMultiplier`, `lairResistances`, `senses`, `languages`, `telepathy`, `pendingHits`, `ingredientStock`, `legendary`; слот `system` без `ext`; concealed-ефекти знято;
- `spellcasting` порожній; `attacks`, `resolvedAbilities`, активні ефекти лишаються (потрібні карті, аурам і досяжності клієнта) — свідомий залишок;
- патчі (`patched`) проєктуються за `maxHp`/`status` власника, секретні ключі відкидаються.

Публічна Pusher-дельта використовує найсуворішого глядача. Гравець, у якого кожен герой має `seeEnemyHp` (`alwaysSeesEnemyStats`), точні дані бере з GET/відповіді мутації; на `redacted` дельту `usePusherBattleSync` лише інвалідує сцену. `snapshot`/`snapshotHash` у клієнтські типи не потрапляють (лишаються на сервері).

### Виправлення за рев'ю L8b

- **Журнал**: для цілі, чиї стати глядач не бачить, `change` лишається, а `oldHp`/`newHp` стають відрами `healthState` (`hp-bucket.ts`), `spellAttacks[].ac` знімається. `damageSteps` лишаються свідомо: з них будується «спостережене» (`observedTraits`), а опір і так виводиться з `change`.
- **Слоти систем**: ядро завжди знімає `slot.ext` (стан модулів), а решту ховає сама система через `RuleSystemParticipant.redactSlot` (список `SlotRedactor(slot, scope)`, `scope` = `abilities` | `battle`). wfrp (`systems/wfrp/rules/redact.ts`) лишає розмір, `flexible` і швидкість ходу; характеристики, `ap`, `ward`, `fortune`, `sin`, `channelledSl` прибирає. d20 свого не має: його приховане лежить лише в `ext`. Редактори отримують `rules` ( `redactParticipantsForViewer(viewer, participants, rules)`).
- **Клієнт**: сцена несе `redacted: true`, коли сервер проєктував ворогів; `deriveScene` тоді не вважає дані точними, навіть якщо в героя є `seeEnemyHp`. ДМ без підписаного dm-каналу на `redacted` дельту лише інвалідує сцену, версія перевіряється до інвалідації. Зміна `side`/`controlledBy` шле повного учасника, не патч.
- **FX**: для ворога-відра число удару береться з `FxImpact.delta` (з `hpChanges[].change`), а удар без зміни відра теж дає зміну.
### Хвости L8b (хвиля 2b)

- **Статблок**: для не-точного учасника `attacks` втрачають `attackBonus` (0), `damageDice` (`''`), `damageBonus`, `guaranteedDamage`, `versatileDice`, `damageDistribution`; лишаються тип, дальність, `reachCells`, `targetType`, ліміти цілей (карта/досяжність). З `resolvedAbilities` знімаються ефекти `resistance` і `spellAbsorb` (здібність, що лишилась без ефектів, випадає). Те саме в патчах. `combatStats.morale` ворога = 0 (бейдж моралі ховається); союзники й глядачі з `seeEnemyHp` без змін.
- **dm-дублікат**: `redactDeltaForPlayers.changed` тепер true лише коли проєкція серіалізується інакше, ніж повна дельта (патч ворога без HP/ефектів/секретів — одне публічне повідомлення без `redacted`).
- **GET при `redacted`**: інвалідація сцени для ДМ без dm-каналу, глядача зі `seeEnemyHp` і власника героя на не-союзній стороні (charm/PvP, `controlsNonAlly`) об'єднується (debounce 400 мс) — один GET на серію дельт. Оцінка egress на хід із N дій по ворогах: було до N GET сцени на кожного такого глядача, стало 1-2 (за вікно 400 мс; дії зазвичай рознесені, тож реальний виграш на швидких серіях: хвіст «ворог ходить, кілька атак поспіль»). Версія вже перевіряється до інвалідації (дельта не новіша за кеш відкидається), тож власні відповіді мутації не дають зайвого GET.
- **M3/M4**: власний герой гравця на ворожому боці в публічній дельті проєктується як для `PLAYER_VIEWER` — клієнт це компенсує GET (`controlsNonAlly`). Журнал для глядача зі `seeEnemyHp` лишається редагованим (відра HP, без AC заклинань): публічний канал спільний і серверної точної копії для нього немає — свідомий компроміс.
- **Лишається**: серверна відповідь мутації вже точна для свого актора, але публічна дельта інших глядачів потребує GET; повна відмова від нього вимагала б per-user каналів.

### Виправлення за рев'ю хвилі 2b

- **Власний герой у цій же дельті**: `deltaTouchesOwned` (`visibility.ts`) — на `redacted` дельту, що upsert-ить героя гравця або патчить його (чи змінює `side`/`controlledBy` будь-кого), `usePusherBattleSync` інвалідує сцену, а не пише проєктовану копію (зачарування в цій дельті більше не дає гравцю героя з attackBonus 0, AC 0, morale 0).
- **Здібності**: якщо з `resolvedAbilities` знято ефект `resistance`/`spellAbsorb`, а здібність лишилась, її `description` і `details` обнуляються (там могли бути числа опорів).
- **Відомий компроміс (egress)**: у PvP/NEUTRAL кожен гравець зі героєм не на стороні союзників робить повний GET сцени на кожну урізану дельту (debounce 400 мс). Майбутнє рішення: персональний канал Pusher або «точні» патчі власника у відповіді мутації.
