# CSV файли для імпорту

Ця папка містить CSV файли для масового імпорту даних в кампанії.

## Файли

- `spells-import.csv` - заклинання для імпорту
- `units-import.csv` - юніти для імпорту

## Використання

### Імпорт заклинань

```bash
npm run import-spells <campaignId> imports/spells-import.csv
```

або

```bash
npm run import-spells-csv <campaignId> imports/spells-import.csv
```

### Імпорт юнітів

```bash
npm run import-units <campaignId> imports/units-import.csv
```

## Формат файлів

### spells-import.csv

Колонки:
- `School` - школа магії
- `Level` - рівень заклинання
- `UA Name` - назва українською
- `Original Name` - оригінальна назва
- `Effect` - опис ефекту

### units-import.csv

Колонки:
- `Tier` - рівень (tier) юніта
- `Назва` - назва юніта
- `КД` - клас доспеху
- `ХП` - хітпоінти
- `Швидкість` - швидкість пересування
- `СИЛ`, `ЛОВ`, `ТІЛ`, `ІНТ`, `МДР`, `ХАР` - характеристики
- `Навички/Здібності` - спеціальні здібності
- `Спасброски` - спасброски
- `Атаки` - опис атак
- `Особливості` - особливості юніта
- `Група` - назва групи юнітів
