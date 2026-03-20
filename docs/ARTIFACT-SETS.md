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
| `modifiers` | Як у артефакта: `type`, `value`, `isPercentage` — враховуються в бою для атаки/шкоди (напр. `damageMelee`, `attack`) |
| `spellSlotBonus` | Об’єкт `{ "1": 1, "2": 1 }` — скільки **додати** до max/current відповідного рівня слотів |
| `passiveEffects` | Масив `{ stat, type?, value? }` — підмножина пасивів як у скілів: `hp_bonus`, `advantage`, `crit_threshold`, `spell_slots_lvl4_5`, `spell_targets_lvl4_5`, резисти тощо (див. `lib/utils/battle/artifact-sets/apply-set-passive-effects.ts`) |
| `effectScope` | Опційно: `{ audience: "self" \| "all_allies" \| "all_enemies", immuneSpellIds?: string[] }`. За замовчуванням еквівалент `self`. Для `all_allies` / `all_enemies` бонус **не** зливається лише в носія: після створення всіх учасників бою викликається `distributePendingScopedArtifactBonuses` (див. `merge-set-bonus.ts`, `distribute-scoped-artifact-bonuses.ts`). `immuneSpellIds` — ID заклинань кампанії; ціль не отримує шкоду/лікування від цих заклинань (`spell-immunity.ts`, `process-damage.ts`). |

Приклад див. `lib/constants/artifact-sets.ts`.

Для **артефактів** той самий об’єкт можна покласти в `passiveAbility.effectScope` (парсинг у `extract-artifacts.ts` → поля `effectAudience` / `immuneSpellIds` на `EquippedArtifact`).

## API

- `GET/POST /api/campaigns/:id/artifact-sets`
- `GET/PATCH/DELETE /api/campaigns/:id/artifact-sets/:setId`

Після зміни складу сету `setId` у артефактів оновлюється автоматично.

Реалізація: Zod-схеми в `app/api/campaigns/[id]/artifact-sets/schemas.ts`, помилки в `route-errors.ts`, Prisma — `lib/utils/artifacts/artifact-set-queries.ts`, синхрон членів — `sync-artifact-set-members.ts`.

## Бій

Логіка повного сету: `lib/utils/battle/artifact-sets/` (`apply-completed-sets`, `merge-set-bonus`, `distribute-scoped-artifact-bonuses`, `load-maps`, `attach-to-spell-context`). Роздача scoped-бонусів також викликається при додаванні учасника в активний бій і в прев’ю шкоди персонажа.
