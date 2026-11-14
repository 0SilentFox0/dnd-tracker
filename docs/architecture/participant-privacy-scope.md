# Приватність учасників бою: оцінка обсягу

Нотатка-дослідження (5c-3, без реалізації). Питання: чи редагувати на сервері `initiativeOrder` (учасників) за глядачем, і скільки це коштує. Журнал уже редагується (див. «Межі 5c-2» у [rule-systems.md](rule-systems.md)); учасники йдуть клієнту сирими.

## Шляхи доставки учасників клієнту

| Шлях | Де | Що несе | Редакція зараз |
|---|---|---|---|
| GET сцени | `readBattleScene` (`lib/server/battles/read-battle.ts`) -> `toBattleResponse` (`lib/utils/battle/pipeline/battle-response.ts`) | повний `initiativeOrder`, `pendingSummons`, `setup` | лише журнал (`battleLog`) |
| SSR першого HTML | `app/campaigns/[id]/battles/[battleId]/page.tsx` через `PrefetchedQuery` (та сама відповідь `readBattleScene`) | те саме, потрапляє в HTML | лише журнал |
| Відповідь мутації | `runBattleMutation` (`run-battle-mutation.ts`): `ClientBattleDelta` | `upserted`/`patched`/`pending`/`setup` | `log` для не-DM; учасники повні |
| Pusher `private-battle-<id>` | `buildPusherMessages` | та сама дельта, що й гравцю; `redacted: true`, якщо журнал змінено | лише `log` |
| Pusher `private-battle-dm-<id>` | `buildPusherMessages` (лише коли `changed`) | повна дельта для ДМ | не потрібна |
| Refetch-сигнал при переповненні | `fitOrRefetch` | без даних, далі GET сцени | див. GET |
| Сторінка журналу / summary | `readBattleEvents`, `readBattleSummary` | події, не учасники | журнал редагується; summary бере учасників на сервері |
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
