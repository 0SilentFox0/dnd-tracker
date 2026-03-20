# Сети артефактів

Сет об’єднує кілька артефактів кампанії. **Бонус сету** застосовується в бою лише якщо персонаж **екіпірував усі** артефакти, що належать цьому сету (поле `setId` у артефакта).

## Створення (DM)

1. **Кампанія → DM → Сети артефактів** — створити сет, заповнити форму бонусу повного комплекту, обрати артефакти-члени.
2. Або при створенні/редагуванні артефакта обрати існуючий сет у полі «Сет».

## Формат `setBonus` (у БД — JSON)

У формі DM бонус задається через UI (`ArtifactSetBonusEditor`). Поле зберігається в `artifact_sets.setBonus`. Парсер: `parseArtifactSetBonus` у `lib/types/artifact-set-bonus.ts`. Приклад сирого JSON — у `lib/constants/artifact-sets.ts` (`ARTIFACT_SET_BONUS_JSON_PLACEHOLDER`).

| Ключ | Опис |
|------|------|
| `name`, `description` | Текст для довідки (опційно) |
| `bonuses` | Плоскі числові бонуси: характеристики (`strength`…`charisma`), `armorClass`, `speed`, `initiative`, `morale`, `minTargets`, `maxTargets` |
| `modifiers` | Як у артефакта: `type`, `value`, `isPercentage` — враховуються в бою для атаки/шкоди. Шкода: `ranged_damage`, `melee_damage`, `physical_damage`, `all_damage` (див. `matchesAttackType`). Бонус до кидка атаки: `attack` (обидва типи), `ranged_attack`, `melee_attack` (див. `matchesAttackBonusModifier`). |
| `spellSlotBonus` | Об’єкт `{ "1": 1, "2": 1 }` — скільки **додати** до max/current відповідного рівня слотів |
| `passiveEffects` | Масив `{ stat, type?, value? }` — підмножина пасивів як у скілів: `hp_bonus`, `advantage` (перевага на всі кидки), **`advantage_ranged`** (лише дальні атаки), `crit_threshold`, `spell_slots_lvl4_5`, `spell_targets_lvl4_5`, резисти тощо (див. `apply-set-passive-effects.ts`) |
| `effectScope` | Опційно: `{ audience: "self" \| "all_allies" \| "all_enemies", immuneSpellIds?: string[] }`. За замовчуванням еквівалент `self`. Для `all_allies` / `all_enemies` бонус **не** зливається лише в носія: після створення всіх учасників бою викликається `distributePendingScopedArtifactBonuses` (див. `merge-set-bonus.ts`, `distribute-scoped-artifact-bonuses.ts`). `immuneSpellIds` — ID заклинань кампанії; ціль не отримує шкоду/лікування від цих заклинань (`spell-immunity.ts`, `process-damage.ts`). |

Приклад див. `lib/constants/artifact-sets.ts`.

### Приклад: дальній бій для всіх союзників

У бонусі сету можна поєднати `effectScope.audience: "all_allies"` з модифікатором шкоди та пасивом переваги:

```json
{
  "name": "Командна дальня підтримка",
  "effectScope": { "audience": "all_allies" },
  "modifiers": [
    { "type": "ranged_damage", "value": 20, "isPercentage": true }
  ],
  "passiveEffects": [
    { "stat": "advantage_ranged", "type": "flag", "value": 1 }
  ]
}
```

Після `distributePendingScopedArtifactBonuses` кожен союзник отримає +20% до шкоди дальніх атак і перевагу на кидки дальньої атаки.

Для **артефактів** той самий об’єкт можна покласти в `passiveAbility.effectScope` (парсинг у `extract-artifacts.ts` → поля `effectAudience` / `immuneSpellIds` на `EquippedArtifact`).

## API

- `GET/POST /api/campaigns/:id/artifact-sets`
- `GET/PATCH/DELETE /api/campaigns/:id/artifact-sets/:setId`

Після зміни складу сету `setId` у артефактів оновлюється автоматично.

Реалізація: Zod-схеми в `app/api/campaigns/[id]/artifact-sets/schemas.ts`, помилки в `route-errors.ts`, Prisma — `lib/utils/artifacts/artifact-set-queries.ts`, синхрон членів — `sync-artifact-set-members.ts`.

## Бій

Логіка повного сету: `lib/utils/battle/artifact-sets/` (`apply-completed-sets`, `merge-set-bonus`, `distribute-scoped-artifact-bonuses`, `load-maps`, `attach-to-spell-context`).

**Перевірка scoped (`all_allies` / `all_enemies`):** при старті бою після `Promise.all(createBattleParticipantFromCharacter…)` для всіх слотів викликається `distributePendingScopedArtifactBonuses(initiativeOrder)` — з усіх учасників збирається черга `pendingScopedArtifactBonuses`, черга очищується, і кожен запис застосовується до **усіх** одержувачів на відповідному боці (`distribute-scoped-artifact-bonuses.ts`). Те саме при **додаванні учасника** в активний бій (`add-participant/route.ts`). Для одного героя в прев’ю шкоди — `distributePendingScopedArtifactBonuses([participant])`.

**Іконка сету (`artifact_sets.icon`):** URL для HUD — у битві біля портрета показується маркер повного сету (`battleData.artifactSetHudMarkers`), зокрема для носія scoped-сету та для кожного союзника після роздачі. Задається в формі редагування сету (DM).
