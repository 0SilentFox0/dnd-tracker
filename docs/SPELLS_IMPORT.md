# Імпорт заклинань

Є два способи імпортувати заклинання в кампанію:

## 1. Через API (рекомендовано)

Використовуйте endpoint `/api/campaigns/[id]/spells/import` для масового імпорту заклинань.

### Формат JSON:

```json
{
  "spells": [
    {
      "name": "Fireball",
      "level": 3,
      "school": "Evocation",
      "type": "aoe",
      "damageType": "damage",
      "castingTime": "1 action",
      "range": "150 feet",
      "components": "V, S, M",
      "duration": "Instantaneous",
      "concentration": false,
      "damageDice": "8d6",
      "savingThrowAbility": "dexterity",
      "savingThrowOnSuccess": "half",
      "description": "A bright streak flashes from your pointing finger to a point you choose within range..."
    }
  ],
  "groupId": "optional-group-id"
}
```

### Приклад використання з curl:

```bash
curl -X POST https://your-domain.com/api/campaigns/YOUR_CAMPAIGN_ID/spells/import \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d @spells.json
```

## 2. Через скрипт (для локальної розробки)

Використовуйте скрипт `import-spells.ts` для імпорту з CSV або JSON файлу.

### Встановлення залежностей:

```bash
npm install
```

### Формат CSV:

Створіть файл `spells.csv` з такими колонками:

```csv
name,level,school,type,damageType,castingTime,range,components,duration,concentration,damageDice,savingThrowAbility,savingThrowOnSuccess,description
Fireball,3,Evocation,aoe,damage,1 action,150 feet,"V, S, M",Instantaneous,false,8d6,dexterity,half,"A bright streak flashes from your pointing finger..."
Magic Missile,1,Evocation,target,damage,1 action,120 feet,"V, S",Instantaneous,false,1d4+1,,,"A dart of force streaks toward a creature..."
Cure Wounds,1,Evocation,target,heal,1 action,Touch,"V, S",Instantaneous,false,1d8+spellcasting,,,"A creature you touch regains hit points..."
```

### Формат JSON:

```json
[
  {
    "name": "Fireball",
    "level": 3,
    "school": "Evocation",
    "type": "aoe",
    "damageType": "damage",
    "castingTime": "1 action",
    "range": "150 feet",
    "components": "V, S, M",
    "duration": "Instantaneous",
    "concentration": false,
    "damageDice": "8d6",
    "savingThrowAbility": "dexterity",
    "savingThrowOnSuccess": "half",
    "description": "A bright streak flashes from your pointing finger..."
  }
]
```

### Використання скрипту:

```bash
# Імпорт з CSV
npm run import-spells YOUR_CAMPAIGN_ID spells.csv

# Імпорт з JSON
npm run import-spells YOUR_CAMPAIGN_ID spells.json

# Імпорт з призначенням групи
npm run import-spells YOUR_CAMPAIGN_ID spells.csv GROUP_ID
```

## Поля заклинання

### Обов'язкові поля:
- `name` - Назва заклинання (string)
- `description` - Опис заклинання (string)

### Опціональні поля:
- `level` - Рівень заклинання (0-9, default: 0)
- `school` - Школа магії (string, наприклад: "Evocation", "Abjuration")
- `type` - Тип заклинання: `"target"` або `"aoe"` (default: "target")
- `damageType` - Тип урону: `"damage"` або `"heal"` (default: "damage")
- `castingTime` - Час вимови (string, наприклад: "1 action", "1 bonus action")
- `range` - Дальність (string, наприклад: "Self", "Touch", "60 feet")
- `components` - Компоненти (string, наприклад: "V, S, M")
- `duration` - Тривалість (string, наприклад: "Instantaneous", "1 hour", "Concentration, up to 1 minute")
- `concentration` - Чи потребує концентрації (boolean або "true"/"false"/"так", default: false)
- `damageDice` - Кубики урону (string, наприклад: "8d6", "1d4+1")
- `savingThrowAbility` - Характеристика для збереження: `"strength"`, `"dexterity"`, `"constitution"`, `"intelligence"`, `"wisdom"`, `"charisma"`
- `savingThrowOnSuccess` - Що відбувається при успішному збереженні: `"half"` або `"none"` (default: "half")
- `groupId` - ID групи заклинань (string, опціонально)

## Примітки

- Дублікати за назвою автоматично пропускаються
- Якщо поле `concentration` в CSV має значення "true", "yes", "1" або "так", воно буде інтерпретовано як `true`
- Для заклинань без урону залиште `damageDice` порожнім
- Для заклинань без збереження залиште `savingThrowAbility` порожнім
