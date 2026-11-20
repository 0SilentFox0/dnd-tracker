# WFRP 5e канон — передача: W7 + хвости W0–W6

Стан: W0–W6 злиті (гілка `feat/wfrp5-canon-w0-w1` + `main` після злиття W5/W6). Канон: `~/Work/wfrp-extract/out/wfrp5/pages` (лише перефраз, у репо цитат немає). Основний план: [mechanics](2026-11-19-wfrp5-canon-mechanics.md) (секція W7), аудит: `docs/superpowers/research/2026-11-19-wfrp5-canon-audit.md`, архітектура: `rule-systems.md` («Wfrp: редакція», розділи W2–W6).

## W7 — магія й релігія (M19, M27–M33, C magic)
Petty CN 0; Miracle без CN (або налаштування); overcast за таблицею с. 236 (межа IB+WPB, вибір напряму); Dispel; Malignant Influence замість Major miscast на 99/00; крит-каст бонуси; канальність; штраф броні `max` по локаціях; інгредієнти знижують ступінь miscast. Sin/Wrath: тригери (фамбл, одиниці ≤ Sin), +10 за Sin, `sin −= 1`. Шкода заклинань: WPB/TB/AP за каноном. Корупція: мутація за таблицями Body/Mind, межі TB/WPB. Зачіпає `magic/cast-test`, `magic/miscast.ts`, канальність (`lose-channelled`, `channel-mutation`), `recordCritWound`/`applyDamageConsequences` (фамбл/miscast рани йдуть тим самим шляхом).

## Хвости, які варто закрити в цій сесії (дешеві, пов'язані з W7)
- W4: рани фамблу/misfire без лог-рядків `applyDamageConsequences`; Oops `actLast`/`weaponDamage`/влучання по союзнику лише в лозі; вибух Misfire = фіксовані 4 Wounds (взяти шкоду зброї); `slPenalty` Oops лише на атаки; `grim-d100*` паки на «drop» (власні рядки Oops + i18n).
- W3: Broken Cool щораунд; Blinded без дальніх атак; Deafened; Entangled лише на рух; лог Surrounded-захисника; двозбройні/лук ігнорують виведену з ладу ліву руку; `rounds` у типових рядках крит-таблиць (тимчасові травми p174).
- W2: `location` у sheet-тесті приймається, але не використовується; `SheetFortuneKind` у core-типах.
- W1: підпис цілі атаки в UI лишається характеристикою (`wfrpAttackTarget` не знає редакції); `InitiativeRules` не типізує `edition`.
- W6: Beginning Trappings за класом + стартовий статок (с. 39), тік за trapping, фамбл Heal (с. 170), Burdens of Power (с. 196), Hardly Working (с. 199), `rollDailyRecovery` не підключено, Income має брати Earning Skill кар'єри (с. 199), списання кар'єри не скасовується, дані кар'єр B/M-10/M-11.

## Потребує ядра (рішення власника, не W7)
Хук `onMoveEnd` у гілці `!actions.enabled` у `walkMove` (`lib/server/battles/mutations/move/move-mutation.ts`): `{ mover, start, path, cost, participants } → participants`. Без нього Disengage/Charge не мають примусу при русі, Charge-Momentum рахується від відстані на декларації.

## Поза обсягом W0–W7 (не забути)
M13 (смуги дальності, укриття, aimed/called shot, Helpless, surrounded/outnumbered як SL, високий ґрунт), M14 (розмір), Flee (разом із Terror-розширенням), Reach/Defensive/Grapple/Mounted, Shooting into Melee/Group, «захищаюсь» +2 SL, Ambidextrous/Dual Wielder, Surrounded за «немає шляху втечі», Engaged за каноном, W8 (спорядження), W9.

## Не виконано на дату передачі
Живий прогін WFRP-бою в браузері; міграція W6 на проді (репетиція на `prodcopy_*`: dry-run → `--apply`, звіт `manual`/`negative-xp`; baseline `rulesHashes` — перепублікація шаблону); перепублікація шаблону Grim на проді; push/деплой (лише за «так»).
