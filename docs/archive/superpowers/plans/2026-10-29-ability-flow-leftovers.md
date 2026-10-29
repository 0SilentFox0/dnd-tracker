# Ability flow: leftovers for i18n part 6

Кирилиця в `lib/utils/abilities/**` (поза тестами й коментарями), що лишилась свідомо: це текст журналу бою / серверних повідомлень рушія, а не UI-підписи редактора. Переклад — у частині 6 (лог бою), каталоги з `i18n-migrated.json` цього не покривають.

## Battle log (engine messages)

- `lib/utils/abilities/log-text.ts` — `logText`: синхронний uk-рендерер сегментів (`describeAbility` для логу). Замінити на локалізований рендер, коли лог стане ключами.
- `lib/utils/abilities/registry/effects/state.ts`
  - 56 — `⛔ ... імунітет`
  - 67-73 — `CONDITION_LOG_LABELS` (позначено `// i18n part 6: battle log`; виключити файл з `i18n-migrated.json`)
  - 135 — `⛓ ... CONDITION_LOG_LABELS[...] (N р.)`
  - 182 — `🔮 ... відновлює N слотів` (pluralUk)
  - 216 — `🔮 ... втрачає слот`
  - 232 — `📊 ... мораль`
  - 252 — `✨ ... знято дебафи та стани`
  - 287 — `🎯 ... мітка`
  - 312 — `🛡 ... захист`
- `lib/utils/abilities/registry/effects/hp.ts` — 93, 119, 144, 187
- `lib/utils/abilities/registry/effects/control.ts` — 27, 32, 52, 75, 80, 102
- `lib/utils/abilities/registry/effects/static.ts` — 75, 83, 85
- `lib/utils/abilities/registry/effects/summon.ts` — 58, 60
- `lib/utils/abilities/registry/effects/copy-buffs.ts` — 40
- `lib/utils/abilities/engine/core/run-abilities.ts` — 63 (`не спрацювало (шанс N %)`), 77 (`(шанс N %)`)
- `lib/utils/abilities/engine/core/collect-modifiers.ts` — 196 (`label: "Ця дія"` джерела модифікатора)

## Server / data text

- `lib/utils/abilities/read.ts` — 61, 66: `issues[].message` про невалідні дані вмінь (мають стати ключами `abilities.*`).
- `lib/utils/abilities/build/immunities.ts` — 7-11: регекс-розпізнавання українського тексту імунітетів (вхідні дані, не вивід); 26 (`Імунітет: ...` у нотатці), 38-39 (назва вміння «Імунітети»).
- `lib/utils/abilities/editor.ts` — 29: дефолтний текст нотатки `"Опис"` (зберігається у вмінні; `eslint-disable` стоїть).

## Додано після злиття з main (2026-10-29)

- `lib/utils/abilities/registry/effects/push.ts` — `applyPush`: повідомлення журналу (`↔️ ...`); файл у `I18N_LEFTOVERS`.
- `state.ts` — `CONDITION_LOG_LABELS` доповнено `no_hostile_spells` і `no_damage_dealt`; `applyHelp` — повідомлення `🤝 ... має перевагу на наступну атаку`.
- `hp.ts` — `applyDot` з `linkedToCondition` (без нових рядків журналу).
