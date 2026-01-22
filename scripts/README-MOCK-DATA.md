# Мок Дані для Тестування Бойової Системи

## Використання

```bash
npm run seed-mock-battle YOUR_CAMPAIGN_ID
```

Або:

```bash
npx tsx scripts/seed-mock-battle-data.ts YOUR_CAMPAIGN_ID
```

## Що створюється

### 1. Заклинання (5 шт)
- Fireball (3 рівень, AOE, fire)
- Heal (3 рівень, target, heal)
- Magic Missile (1 рівень, target, force)
- Cure Wounds (1 рівень, target, heal)
- Poison Spray (0 рівень, target, poison з DOT)

### 2. Основні Скіли (4 шт)
- Бойова Майстерність (червоний)
- Магія (фіолетовий)
- Захист (синій)
- Швидкість (зелений)

### 3. Скіли для Human (4 шт)
- Базова Атака (+15% melee damage)
- Просунута Атака (+10% melee damage)
- Базовий Захист (+2 AC)
- Базове Заклинання (+10% spell effect)

### 4. Скіли для Elf (4 шт)
- Ельфійська Точність (Advantage на ranged)
- Магічна Стрільба (+20% ranged damage)
- Покращене Заклинання (+25% spell effect)
- Отруйна Стріла (додає poison до заклинання)

### 5. Раси (2 шт)
- human (з модифікатором моралі)
- elf (з Advantage на ranged)

### 6. Дерева Скілів (2 шт)
- Дерево для human
- Дерево для elf

### 7. Персонажі (4 шт)

#### Human:
1. **Годрик Воїн** (Fighter, 5 рівень)
   - Розблоковані скіли: Базова Атака, Базовий Захист
   - Атака: Меч (1d8+4)

2. **Айра Маг** (Wizard, 5 рівень)
   - Розблоковані скіли: Базове Заклинання
   - Заклинання: Fireball, Magic Missile, Cure Wounds
   - Spell slots: 4/3/2 (1/2/3 рівні)

#### Elf:
3. **Ліра Стрілець** (Ranger, 5 рівень)
   - Розблоковані скіли: Ельфійська Точність, Магічна Стрільба
   - Атака: Лук (1d8+4, ranged)
   - Заклинання: Heal, Cure Wounds

4. **Елвін Чарівник** (Sorcerer, 5 рівень)
   - Розблоковані скіли: Покращене Заклинання, Отруйна Стріла
   - Заклинання: Fireball, Magic Missile, Poison Spray
   - Spell slots: 4/3/2 (1/2/3 рівні)

## Видалення

Після тестування видаліть файл:
```bash
rm scripts/seed-mock-battle-data.ts
```

Або видаліть створені дані вручну через UI або SQL.
