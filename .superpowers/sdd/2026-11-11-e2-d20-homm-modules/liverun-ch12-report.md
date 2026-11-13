# Live-run Ч12 (feat/e2-part12-battle-ui), 2026-11-13

Середовище: next dev :3100, БД prodcopy_ch12, бекап `/tmp/prodcopy-ch12-pre-liverun.dump`. Кампанії «LR12 …» з шаблонів (5e SRD 5.2, Heroes, Grim d100), `srd+morale` = SRD з `rules.system.modules:["morale"]` (через БД). Тестові бої змішані: герой+юніт на обох сторонах. Роль гравця — тимчасова зміна `dmUserId`/ролі в БД; 375 px — same-origin iframe.

## Таблиця (pass/fail)

| Профіль | ДМ desktop | ДМ 375 | Гравець desktop | Гравець 375 |
|---|---|---|---|---|
| srd-5.2 | pass (КБ 14, слоти I-V, Death saves, крит-діалог, без моралі) | pass | pass (частково) | pass |
| heroes-homm | pass (панель моралі, гейт, MyHeroPanel КБ 111/15, слоти, Army Training) | pass | pass | pass |
| grim-d100 | pass (Wounds, без слотів/Bonus/моралі) | pass | pass | pass |
| srd-5.2+morale | pass (бейдж/панель при morale!=0, Auto roll) | pass | pass | pass |

Додатково: крит-вибір (діалог Random/Double damage…/Confirm, Random for all) відпрацював, pendingChoice=null; homm: roll 1 при +1 -> no extra, roll 1 при -3 -> skip, хід передається на наступного (C1 без регресії), у журналі «skips the turn because of low morale»; тексти battleMorale без сирих ключів (скан regex на ключі: 0 збігів у всіх 4 профілях); Path/SkillsTab (`?tab=skills`) з'являється після завантаження правил (перші ~2 с вкладок немає, далі Combat/Path/Magic/Inventory/Story). Консоль: 0 помилок у всіх сценаріях. Горизонтального скролу на 375 px нема.

## Баги

Блокуючих немає.

Спостереження (не баги):
1. dnd5e з модулем morale: панель/бейдж моралі з'являються лише коли morale != 0 (у всіх 0 нічого не видно); у homm те саме при 0 у героя, але юніти мають +1 від Army Training.
2. Існуючий бій не підхоплює зміну `rules.system`/`criticals`: правила знімаються з рядка бою на старті, а `moraleCap` у учасників рахується при створенні бою. Для тесту модуля потрібен новий бій після зміни правил (очікувана поведінка).
3. Мінімальний розмір вікна 500 px, тому 375 через iframe.

## Не перевірено

- Гейт моралі саме на ході героя-гравця (потрібне проходження черги DM-ом із чужими гейтами); перевірено на ході юніта й героя з DM-ролі.
- «Death saves» у вигляді гравця: DB-хак HP=0 лишає status=active, тому мітка не з'явилась (через DM PATCH currentHp:0 мітка показується).
- Fumble/cancel-гілка крит-вибору.

## Прибрано / відновлено

Видалено 4 кампанії «LR12 …» через `DELETE /api/campaigns/:id` (разом з персонажами та боями); роль/dmUserId перед цим повернуті. Лічильники після: кампаній 13, персонажів 14, боїв 8 (як до тесту). Dev-сервер зупинено, `/tmp/e2-heavy.lock` знято. Код не змінювався.
