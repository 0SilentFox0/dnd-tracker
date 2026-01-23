-- Міграція для групування CharacterFormData
-- Ця міграція не змінює структуру БД, оскільки дані залишаються в плоскій формі
-- Вона лише документує зміну структури даних в TypeScript

-- Примітка: Структура таблиці characters не змінюється
-- Всі поля залишаються на своїх місцях
-- Зміни стосуються лише структури CharacterFormData в TypeScript

-- Дані в БД залишаються в плоскій формі:
-- - name, type, controlledBy, level, class, subclass, race, subrace, alignment, background, experience, avatar
-- - strength, dexterity, constitution, intelligence, wisdom, charisma
-- - armorClass, initiative, speed, maxHp, currentHp, tempHp, hitDice
-- - savingThrows (JSON), skills (JSON)
-- - spellcastingClass, spellcastingAbility, spellSlots (JSON), knownSpells (JSON)
-- - languages (JSON), proficiencies (JSON), immunities (JSON), morale
-- - personalityTraits, ideals, bonds, flaws

-- Конвертація між CharacterFormData (згрупована) та Character (плоска)
-- виконується через утиліти в lib/utils/character-form.ts:
-- - characterToFormData() - конвертує Character в CharacterFormData
-- - formDataToCharacter() - конвертує CharacterFormData в Character

-- Міграція не вимагає виконання SQL команд, оскільки структура БД не змінюється
