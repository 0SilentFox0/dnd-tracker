# Ч16 live-run (feat/e2-part16-mode-seam), 2026-11-13

Середовище: next dev :3200, БД prodcopy_ch16, сесія silentfox. Копія до запуску: /tmp/prodcopy-ch16-pre-liverun.dump. 375 px — через same-origin iframe (мін. вікно 500). Окремого акаунта гравця немає: роль silentfox і dmUserId тимчасово змінювались у БД.
Перша спроба обірвалась (API 403); дані з неї лишились і були перевикористані.

| Сценарій | Desktop | 375 px |
|---|---|---|
| 1. Створення з модулями: `{dnd5e,[morale]}` 200, `{dnd5e,[]}` 200 (явний `modules:[]` збережено); `zzz`, `wfrp+morale`, `key:nope` 422 `errors.systemModulesInvalid` з issues; `system`+`templateId` 400 | pass | n/a (API) |
| 2. Перемикачі в «Правилах → Система»: вимк. morale -> вкладка Morale зникла, JSON `morale{cap:2,enabled:true}` збережено; вимк. -> знову ув. -> cap 2 (D16); у бою `moraleCap:2`; morale-check 200, повтор 422 `battleMoraleAlreadyChecked`; брудна форма вимикає перемикачі з підказкою | pass | pass (scrollW=clientW=371, switch 24px) |
| 2b. Залежності/конфлікти вимикають пункти | не перевірено: у каталозі немає addon-ів з conflicts/requires крім d20 (wfrp не має addon-ів) | - |
| 3. `heroscaling`/`skilltrees` при персонажах без confirm: 409 (`validation.systemModuleConfirm`); UI: діалог «Change a rule module?», Cancel не змінює, Change застосовує | pass | - |
| 4. Активний бій: зміна модулів 409 `errors.systemModulesInBattle`, у UI — діалог Notice з текстом; ідемпотентний патч 200; підготовлений бій змінам не заважає (200, 2 рази) | pass | - |
| 4b. Лише `key` у бою | 409 `systemLocked` (персонажі є) — до перевірки бою не доходить | - |
| 5. Гравець: сторінка правил редіректить на дашборд (перемикачів нема), `PATCH rules` 403, `GET rules` 200 | pass | - |
| 6. Консоль без помилок (відстеження стартувало пізно, лише для останніх сторінок), сирих i18n-ключів немає, whats-new «Rule modules» і help dm-rule-systems (розділ про модулі) відображаються; dev-лог без 5xx | pass | pass (правила) |

## Баги
Блокуючих немає.

Спостереження:
1. Ключ помилки 409 confirm — `validation.systemModuleConfirm` (у дизайні `errors.…`); це свідомий рух у коміті 3666194a5, UI працює (діалог з'являється).
2. Сценарій «key-only у бою → SYSTEM_MODULES_IN_BATTLE» недосяжний: бій потребує учасників, тож раніше спрацьовує SYSTEM_LOCKED. Гілка перевіряється лише юніт-тестом.
3. Залежності/конфлікти модулів у живому UI не перевірити — каталог їх не має.

## Прибрано
Видалено кампанії LR16 a morale і LR16 b bare (з героями та боями): кампаній 13 (було 13), LR16-персонажів/боїв 0. Ролі DM відновлено до видалення. Dev-сервер :3200 вбито, лок знято. Код не змінювався. Дамп /tmp/prodcopy-ch16-pre-liverun.dump залишено.
