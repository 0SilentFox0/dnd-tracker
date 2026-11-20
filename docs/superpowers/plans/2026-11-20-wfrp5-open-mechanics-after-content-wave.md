# WFRP 5e: що лишилось після контент-хвилі (аудит 2026-11-20, Opus)

Епік механік W0–W9 виконано приблизно на 85%; контент-хвиля C0–C6 у шаблоні `grim-d100` готова (main c96e517d5, не запушено). Нижче — відкрите, за пріоритетом.

1. **Розмір (Critical, S–M):** M14 / C/B-01 / C/B-02 — +SB за ступінь розміру (+2×SB для Monstrous), ±1 SL за розмір лише для стрілецьких, −2 SL до парирування більшого, ваги розміру в outnumbering (`traits/size.ts`, `combat/mitigate.ts`, `resolve-attack.ts`).
2. **M13 модифікатори бою (L):** смуги дальності, укриття, прицілювання, цільовий удар, висота, рух стрільця, стрільба в ближній бій; Outnumbered/Surrounded як SL, не +10; повний Helpless.
3. **C/M-07 шкода заклять (L):** flat + WPB − TB − AP замість `spellRoll`; торкається ядра spell-effect і контенту.
4. **M12 залишок (M):** On the Defensive +2 SL, Flee, Engaged, Reach/Grapple/Mounted, Ambidextrous/Dual Wielder.
5. **C/B-04, C/B-03 трейти істот (L):** Swarm, Fly, Painless, Undead, канонічна Regeneration, типи дихання; Tiny/Little лишити чи прибрати.
6. **M19 overcast напрямки (M):** SL у дальність/цілі/зону/тривалість, не лише шкода.
7. **Хвости W8 (M):** practical, repeater, trapBlade, distract, spread, unbreakable (`implemented:false`), знос Hack, сума щитів у `useEquippedAp`, перерахунок encumbrance у бою.
8. **B/N-02, B/N-06 (S):** три кидки кар'єри; блок поза-кар'єрних талантів і розширених навичок.
9. **Дані (S–M):** канонічні рядки крит-таблиць, rounds для `disarmed`/`crippled`, Oops `actLast`/`weaponDamage` реально діють, 20-рядкові таблиці miscast/wrath.
10. **Прибирання (S):** 26 коментарів «verify against 5e book» у `systems/wfrp`.

## Контент: відкриті хвости
- Пари вибору талантів у видів (дварф, високий і лісовий ельф): `profile.talents` плаский список → схема або рішення власника.
- Deep Scholar (Lore), Terrain Strider (Terrain): потрібні списки спеціалізацій (книга).
- Не додано: 3 quick armour (слот/смуги AP), 3 entangling-зброї (немає групи в `GRIM_WEAPON_GROUPS`), рядки Unarmed Strike / Improvised Weapon / Thrown Rock.
- Вигадані власницькі рішення для огляду: спеціалізації (Bitter Grudge, Fervent Cause, Rite Keeper, Seasoned Tradesman, Hardened Against, Artist's Gift, Gifted Craftsman), нові мови, назви навичок в uk, термін «Ненависть (грабіжники)» (глосарій), Market Trader, Frostbite Bolt (назва vs ефект), Death Vower Brass 2 на всіх тірах.
- Не виражено схемою: тривалість/формули заклять, ефекти предметів і протезів, дози отрут, бойовий профіль тварин.
- 6 додаткових кар'єр без книжкового відповідника не входять до таблиць видів.

## Верифікація, якої не було
Живий WFRP-бій у браузері, battle-sweep homm/dnd5e на prodcopy, репетиція міграції героїв W6, публікація шаблону на прод — усе лише за «так».

## Іконки (нова сесія)
740 нових рядків; субʼєкти вже у `scripts/assets/icon-subjects/grim-*.json`. Порядок: `pnpm assets:grim-icons prompts`, пробна пачка 3 кар'єр (план `wfrp5-icons/plan.md` п. 5), негативи за kind — `~/Downloads/grim-icons-negative-by-kind.md`, 14 пачок по 50 + 1 на 7.
