# Ч12 С3 — звіт

Статус: DONE (3 коміти, tsc чистий).

## Коміти
- a423f3b3b feat(ch12): system i18n scopes follow the composition
- fe5a19100 refactor(ch12): morale battle texts live in battleMorale
- 2749f93d2 refactor(ch12): off-hand and spell ability modifier ask the d20 base

## Що -> куди
- `systemScope(system: string | { key; modules? } | null, slot)`: рядок як раніше; обʼєкт = обʼєднання `i18n[slot]` мети ключа, мети бази композиції і мет усіх модулів (без дублів); невідомий ключ -> `[]`.
- `lib/server/systems/campaign-system.ts`: `systemOfCampaign` (сирий запит `rules->'system'`), чистий `parseSystemSelection` (протестований). Обидва battle layouts на ньому. `system-key.ts` не чіпано.
- DemoBattleSandbox: рендериться лише у власному тесті (у `app` не підключений), мораль не використовує — скоуп не потрібен.

## Ключі: старий -> новий
| старий | новий |
|---|---|
| `battle.morale.*` (extraTitle, extraText, detail, toBattle, skipTitle, skipText, checkD10, extraOn, skipOn, outcome.*) | `battleMorale.*` (ті ж імена) |
| `battle.hero.morale` | `battleMorale.badge` |
| `battle.notify.moraleUnchanged` | `battleMorale.unchanged` |
| `battle.turnControls.strip.gate` | `battleMorale.strip` |

`MORALE_META.i18n = { battle: ['battleMorale'] }`; `global.d.ts` отримав `battleMorale`. Тест `label-keys-battle` оновлено, додано `label-keys-battleMorale`.

## scope-size (uk gzip, виміряно)
- campaign+battle 99.3 KB; dnd5e battle 99.3; dnd5e battle + modules 99.5 (ліміт 105); wfrp battle 101.0 (= + modules). `LIMIT_KB` не змінювався. Нові сценарії `<key> battle + modules` додано.

## isFiveE (коміт 3)
- `RuleSystemCombat.offHand?`, `RuleSystemMagic.spellAbilityMod?` у `types.ts`; d20: `offHand: isFiveE`, `spellAbilityMod` = `isFiveE ? weaponModifier : null`.
- `weaponModifier`/`spellcastingModifier` винесено в листовий файл `lib/utils/battle/spell/ability-modifier.ts` (щоб d20 не імпортував `power.ts`, який тепер імпортує реєстр: цикл). `spellAttackBonus` лишився в `power.ts`.
- `computeSpellPower` отримав обовʼязкове `rules`; викликачі: `cast/effects.ts` (`state.flow.ctx.rules`), `cast/index.ts` (`params.rules`), `scripts/sim/hero-growth-report.ts` (`DEFAULT_RULES`, бо скрипт не читає правил кампанії). Три тести-викликачі оновлено. `power.ts` вдалося.
- `LEAK_NAMES.isFiveE: 10` (було 12 core-файлів).

## Відхилення
- `rules` у `computeSpellPower` обовʼязкове (не optional), щоб не було мовчазного відключення модифікатора.
- Порушення процесу: одна порожня heredoc-команда `cat > /dev/null <<EOF` (нічого не записала, файлів не змінила); далі лише Edit/Write.

## Тести
Нові: `lib/i18n/__tests__/{system-scope,label-keys-battleMorale}.test.ts`, `lib/server/systems/__tests__/campaign-system.test.ts`, `systems/d20/__tests__/rules/magic/spell-ability-mod.test.ts`; оновлені `scope-size`, `label-keys-battle`, `slot-choice`, `library-spells-dark`, `hero-archetype-damage`, `system-literals`. Точково під локом: `lib/i18n`, `systems/morale`, `lib/utils/battle/{spell,attack-phase,damage}`, `attack-off-hand`, `system-literals`, `system-imports`, `client-entry-imports` — зелені. Повний прогін не робився.

## Ratchet
exempt-файли (`system-imports-exempt.json` 6, `system-literals-exempt.json` 16 рядків) і `i18n-exempt.json` без змін; `LEAK_NAMES.isFiveE: 10` додано.
`rg "battle\.morale|moraleUnchanged|hero\.morale"` у core/модулях без тестів — порожньо.
