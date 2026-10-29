import type { Locale } from "@/lib/i18n/config";
import type { ImportKind } from "@/types/content-import";

type PerField<T> = Readonly<Record<string, T>>;

const NAME = ["назва", "name", "ім'я"];

const ICON = ["іконка", "icon"];

const DESCRIPTION = ["опис", "description"];

const COLOR = ["колір", "color"];

const ABILITIES = ["здібності", "abilities"];

// header aliases per field: Ukrainian and English column names accepted by the CSV import (the field key itself always matches)
export const FIELD_ALIASES: Record<ImportKind, PerField<readonly string[]>> = {
  units: {
    name: NAME,
    level: ["рівень", "tier", "тір", "level"],
    raceId: ["раса", "група", "group", "race"],
    avatar: ["аватар", "image", "url", "зображення"],
    initiative: ["ініціатива", "init"],
    armorClass: ["кд", "ac", "клас броні", "armor class"],
    maxHp: ["хп", "hp", "хіти", "hit points", "hp_avg"],
    speed: ["швидкість"],
    strength: ["сил", "str", "сила"],
    dexterity: ["лов", "спр", "dex", "спритність"],
    constitution: ["тіл", "con", "статура"],
    intelligence: ["інт", "int", "інтелект"],
    wisdom: ["мдр", "муд", "wis", "мудрість"],
    charisma: ["хар", "cha", "харизма"],
    attacks: ["атаки", "атака"],
    abilities: ["навички/здібності", "особливості", "features", "здібності", "traits", "traits/abilities"],
    immunities: ["імунітети", "імунітет"],
    knownSpells: ["заклинання", "spells", "known spells"],
    statblock: ["статблок (json)", "statblock", "statblock (json)"],
    spellcasting: ["заклинання монстра (json)", "spellcasting", "monster spellcasting (json)"],
    proficiencyBonus: ["майстерність", "proficiency", "бонус майстерності"],
    gridSize: ["розмір на мапі", "клітинок", "map size"],
    morale: ["мораль"],
    minTargets: ["мін. цілей", "min targets"],
    maxTargets: ["макс. цілей", "max targets"],
    cr: ["небезпека", "рівень небезпеки", "challenge"],
    xp: ["досвід"],
    multiattack: ["мультиатака", "атак за дію"],
    legendaryActions: ["легендарні дії", "legendary actions"],
    legendaryResistances: ["легендарний опір", "legendary resistance", "legendary resistances"],
    saveProficiencies: ["рятівні кидки", "save proficiencies", "saving throw proficiencies", "saving throws"],
  },
  spells: {
    name: NAME,
    level: ["коло", "рівень", "круг", "level"],
    groupId: ["школа", "школа магії", "school", "група", "group"],
    description: DESCRIPTION,
    appearanceDescription: ["опис вигляду", "appearance", "appearance description"],
    icon: ICON,
    cost: ["вартість", "дія", "casting time", "час накладання"],
    casting: ["час накладання (json)", "casting", "casting time (json)"],
    dice: ["кістки", "кубики", "damage", "шкода"],
    dieSides: ["грань кубика", "die", "грань", "die sides"],
    concentration: ["концентрація"],
    stackable: ["стакається"],
    maxStacks: ["макс. стаків", "max stacks"],
    upcastDice: ["кістки за коло", "upcast", "upcast dice"],
    upcastTargets: ["цілі за коло", "upcast targets"],
    addAbilityMod: ["додавати модифікатор", "add ability modifier"],
    fixedDice: ["фіксовані кубики", "fixed dice"],
    damageBonus: ["бонус шкоди", "damage bonus"],
    targeting: ["ціль (json)", "ціль", "target", "target (json)"],
    resolution: ["кидок (json)", "кидок", "roll (json)"],
    spellEffects: ["ефекти (json)", "ефекти", "effects", "effects (json)"],
    raceModifiers: ["модифікатори рас (json)", "race modifiers (json)"],
    fx: ["візуальний ефект (json)", "visual effect (json)"],
    lists: ["списки", "lists", "spell lists"],
  },
  skills: {
    name: NAME,
    description: DESCRIPTION,
    icon: ICON,
    image: ["зображення", "image"],
    mainSkillId: ["основний скіл", "гілка", "main skill"],
    spellId: ["заклинання", "spell"],
    spellGroupId: ["школа магії", "школа", "spell group", "spell school"],
    grantedSpellId: ["дає заклинання", "granted spell", "grants spell"],
    abilities: ABILITIES,
  },
  "main-skills": {
    name: NAME,
    color: COLOR,
    icon: ICON,
    isEnableInSkillTree: ["у дереві скілів", "в дереві", "enabled", "in skill tree"],
    spellGroupId: ["школа магії", "школа", "spell group", "spell school"],
    role: ["роль", "role"],
  },
  "spell-groups": {
    name: NAME,
    color: COLOR,
    icon: ICON,
  },
  races: {
    name: NAME,
    icon: ICON,
    color: COLOR,
    availableSkills: ["доступні основні скіли", "available skills", "основні скіли", "available main skills"],
    disabledSkills: ["заборонені скіли", "disabled skills"],
    passiveAbility: ["пасивна здібність (json)", "passive ability", "passive ability (json)"],
    spellSlotProgression: ["слоти заклинань (json)", "слоти", "spell slots (json)"],
    choices: ["вибори (json)", "choices", "вибори", "лінії", "lineages", "choices (json)"],
    abilities: ABILITIES,
  },
  classes: {
    name: NAME,
    icon: ICON,
    color: COLOR,
    hitDie: ["кістка хітів", "hit die", "hd", "кістка"],
    savingThrows: ["рятівні кидки", "saving throws", "saves"],
    proficiencies: ["майстерності (json)", "proficiencies", "proficiencies (json)"],
    skillChoices: ["вибір навичок (json)", "skill choices", "skill choices (json)"],
    caster: ["тип заклинача", "caster", "заклинач", "caster type"],
    spellcastingAbility: ["характеристика заклинань", "spellcasting ability"],
    features: ["вміння за рівнями (json)", "features", "вміння", "features by level (json)"],
    subclassLevel: ["рівень підкласу", "subclass level"],
    subclasses: ["підкласи (json)", "subclasses", "subclasses (json)"],
    columns: ["таблиця класу (json)", "columns", "class table", "class table (json)"],
    spellList: ["список заклинань", "spell list"],
  },
  feats: {
    name: NAME,
    icon: ICON,
    type: ["тип", "type"],
    prerequisite: ["передумови (json)", "prerequisite", "передумова", "передумови", "prerequisites (json)"],
    repeatable: ["повторювана", "repeatable"],
    description: DESCRIPTION,
    abilities: ABILITIES,
    choices: ["вибори (json)", "choices", "вибори", "choices (json)"],
  },
  backgrounds: {
    name: NAME,
    icon: ICON,
    description: DESCRIPTION,
    choices: ["вибори (json)", "choices", "вибори", "choices (json)"],
    originFeatId: ["риса походження", "originfeatid", "originfeat", "origin feat"],
    skillProficiencies: ["навички (json)", "skillproficiencies", "навички", "skills (json)"],
    toolProficiencies: ["інструменти (json)", "toolproficiencies", "інструменти", "tools (json)"],
    equipmentText: ["спорядження (видає дм)", "equipmenttext", "спорядження", "equipment (given by the dm)"],
  },
  artifacts: {
    name: NAME,
    description: DESCRIPTION,
    rarity: ["рідкість", "rarity"],
    slot: ["слот", "slot", "тип"],
    setId: ["сет", "set", "комплект"],
    icon: ICON,
    weapon: ["зброя (json)", "weapon", "weapon (json)"],
    armor: ["броня (json)", "armor", "armor (json)"],
    item: ["предмет 5e (json)", "item", "item 5e (json)"],
    abilities: ABILITIES,
  },
  "artifact-sets": {
    name: NAME,
    description: DESCRIPTION,
    setBonus: ["бонус сету (json)", "set bonus", "бонус", "set bonus (json)"],
    abilities: ABILITIES,
    artifactIds: ["артефакти", "artifacts"],
    icon: ICON,
  },
};

export const NUMBER_WORDS: Record<ImportKind, PerField<Readonly<Record<string, number>>>> = {
  units: {},
  spells: { level: { cantrip: 0, замовляння: 0, заговір: 0, "заговір (0)": 0 } },
  skills: {},
  "main-skills": {},
  "spell-groups": {},
  races: {},
  classes: {},
  feats: {},
  backgrounds: {},
  artifacts: {},
  "artifact-sets": {},
};

export const ENUM_LABELS: Partial<Record<ImportKind, PerField<Readonly<Record<string, readonly string[]>>>>> = {
  spells: {
    cost: {
      reaction: ["Реакція", "reaction", "1 reaction"],
      long: ["Тривале накладання", "long"],
      action: ["Дія", "1 дія", "action", "1 action", "дією"],
      bonusAction: ["Бонусна дія", "bonus action", "1 bonus action", "бонус", "бонусною дією", "1 бонусна дія"],
    },
  },
};

// short ability labels of the old unit CSV
export const LEGACY_ABILITY_SHORT: Readonly<Record<string, readonly string[]>> = { dexterity: ["ЛОВ"], wisdom: ["МДР"] };

export const TRUE_WORDS: ReadonlySet<string> = new Set(["так", "true", "1", "+", "yes", "y", "да", "✓", "x"]);

export const FALSE_WORDS: ReadonlySet<string> = new Set(["ні", "false", "0", "-", "no", "n", "нет"]);

export const BOOLEAN_WORDS: Record<Locale, { yes: string; no: string }> = { uk: { yes: "так", no: "ні" }, en: { yes: "yes", no: "no" } };

type Pair = readonly [string, string];

type Examples = Record<ImportKind, PerField<Pair>>;

const NEUTRAL: Examples = {
  units: { level: ["1", "2"], initiative: ["2", "3"], armorClass: ["13", "13"], speed: ["30", "40"], dexterity: ["14", "15"], constitution: ["10", "12"], intelligence: ["10", "3"], wisdom: ["8", "12"], charisma: ["8", "6"], immunities: ["", "poison"], gridSize: ["1", "1"], morale: ["0", "1"], minTargets: ["1", "1"], maxTargets: ["1", "1"], cr: ["1/4", "1/4"], multiattack: ["1", "1"], legendaryActions: ["0", "0"], legendaryResistances: ["0", "0"], saveProficiencies: ["", "dexterity, wisdom"] },
  spells: {
    level: ["3", "1"],
    dice: ["8d6", "1d8"],
    upcastDice: ["1", "1"],
    damageBonus: ["", "2"],
    targeting: ['{"kind":"template","shape":"circle","size":20,"side":"enemy","maxTargets":6}', '{"kind":"ally","range":5}'],
    resolution: ['{"kind":"save","ability":"dexterity","onSuccess":"half"}', '{"kind":"auto"}'],
    spellEffects: ["[]", "[]"],
    lists: ["Wizard, Sorcerer", "Cleric"],
  },
  skills: {},
  "main-skills": { color: ["#c0392b", "#f1c40f"] },
  "spell-groups": { color: ["#e25822", "#f5d76e"], icon: ["flame", "sun"] },
  races: { color: ["#2e8b57", "#b8860b"], spellSlotProgression: ['[{"level":1,"slots":2}]', ""], choices: ["[]", ""] },
  classes: {
    color: ["#8b0000", "#1e3a8a"],
    hitDie: ["10", "6"],
    savingThrows: ["strength, constitution", "intelligence, wisdom"],
    skillChoices: ['{"count":2,"from":["athletics","perception"]}', '{"count":2,"from":["arcana","history"]}'],
    spellcastingAbility: ["", "intelligence"],
    features: ["[]", "[]"],
    subclassLevel: ["3", "2"],
    subclasses: ["[]", "[]"],
    columns: ["[]", "[]"],
    spellList: ["", "Wizard"],
  },
  feats: { prerequisite: ["{}", '{"level":4}'], choices: ["[]", "[]"] },
  backgrounds: { skillProficiencies: ['["arcana","history"]', '["athletics","intimidation"]'] },
  artifacts: { weapon: ['{"damageDice":"1d8","damageType":"slashing","attackType":"melee"}', ""], item: ['{"unique":false}', '{"unique":false,"attunement":true,"charges":{"max":7,"rest":"long"}}'] },
  "artifact-sets": {},
};

// example CSV rows (two per kind) in the template author's language; fields not listed here fall back to the neutral set
const LOCALIZED: Record<Locale, Examples> = {
  uk: {
    units: { name: ["Гоблін-лучник", "Вовк"], maxHp: ["7 (2к6)", "11 (2к8 + 2)"], strength: ["8 (-1)", "12"], attacks: ["Короткий лук +4, 1к6+2 колючий", "Укус +4, 2к4+2 колючий"], abilities: ["Втеча: бонусною дією відходить або ховається", "Зграя: перевага на атаку, якщо поруч союзник"] },
    spells: { name: ["Вогняна куля", "Лікування ран"], description: ["Вибух полум'я радіусом 20 футів", "Відновлює хіти дотиком"], cost: ["Дія", "Бонусна дія"], concentration: ["ні", "ні"], stackable: ["ні", "ні"], addAbilityMod: ["ні", "так"], fixedDice: ["ні", "так"] },
    skills: { name: ["Стійкість", "Майстер меча"], description: ["+1 до КД", "Додаткова атака мечем"], abilities: ["Стійкість: +1 до КД", ""] },
    "main-skills": { name: ["Напад", "Магія Світла"], isEnableInSkillTree: ["так", "так"], role: ["Напад", "Магія"] },
    "spell-groups": { name: ["Магія Хаосу", "Магія Світла"] },
    races: { name: ["Ельфи", "Гноми"], passiveAbility: ['{"name":"Лісова стежка","description":"Швидкість +10 у лісі"}', ""] },
    classes: { name: ["Воїн", "Чарівник"], proficiencies: ['{"armor":["усі обладунки","щити"],"weapons":["прості","бойові"],"tools":[]}', '{"armor":[],"weapons":["кинджали"],"tools":[]}'], caster: ["Не заклинач", "Повний заклинач"] },
    feats: { name: ["Пильний", "Влучний стрілець"], type: ["Походження", "Стиль бою"], repeatable: ["ні", "ні"], description: ["Майстерність до ініціативи", "+2 до дальніх атак"] },
    backgrounds: { name: ["Sage", "Soldier"] },
    artifacts: { name: ["Меч Дракона", "Кільце захисту"], description: ["Старовинний меч", "+1 до КД"], rarity: ["Рідкісний", "Незвичайний"], slot: ["Зброя", "Кільце"] },
    "artifact-sets": { name: ["Обладунки Дракона", "Регалії Мага"], setBonus: ['{"name":"Драконяча кров","description":"+2 до КД за повний комплект"}', ""] },
  },
  en: {
    units: { name: ["Goblin Archer", "Wolf"], maxHp: ["7 (2d6)", "11 (2d8 + 2)"], strength: ["8 (-1)", "12"], attacks: ["Shortbow +4, 1d6+2 piercing", "Bite +4, 2d4+2 piercing"], abilities: ["Nimble Escape: moves away or hides as a bonus action", "Pack Tactics: advantage on attacks when an ally is nearby"] },
    spells: { name: ["Fireball", "Cure Wounds"], description: ["A burst of flame in a 20-foot radius", "Restores hit points by touch"], cost: ["Action", "Bonus action"], concentration: ["no", "no"], stackable: ["no", "no"], addAbilityMod: ["no", "yes"], fixedDice: ["no", "yes"] },
    skills: { name: ["Resilience", "Sword Master"], description: ["+1 AC", "Extra sword attack"], abilities: ["Resilience: +1 AC", ""] },
    "main-skills": { name: ["Offense", "Light Magic"], isEnableInSkillTree: ["yes", "yes"], role: ["attack", "magic"] },
    "spell-groups": { name: ["Chaos Magic", "Light Magic"] },
    races: { name: ["Elves", "Gnomes"], passiveAbility: ['{"name":"Forest Path","description":"Speed +10 in forests"}', ""] },
    classes: { name: ["Fighter", "Wizard"], proficiencies: ['{"armor":["all armor","shields"],"weapons":["simple","martial"],"tools":[]}', '{"armor":[],"weapons":["daggers"],"tools":[]}'], caster: ["none", "full"] },
    feats: { name: ["Alert", "Sharpshooter"], type: ["origin", "fightingStyle"], repeatable: ["no", "no"], description: ["Proficiency bonus to initiative", "+2 to ranged attacks"] },
    backgrounds: { name: ["Sage", "Soldier"] },
    artifacts: { name: ["Dragon Sword", "Ring of Protection"], description: ["An ancient sword", "+1 AC"], rarity: ["rare", "uncommon"], slot: ["weapon", "ring"] },
    "artifact-sets": { name: ["Dragon Armor", "Mage Regalia"], setBonus: ['{"name":"Dragon Blood","description":"+2 AC for the full set"}', ""] },
  },
};

const EMPTY_PAIR: Pair = ["", ""];

export function exampleOf(locale: Locale, kind: ImportKind, key: string): Pair {
  return LOCALIZED[locale][kind][key] ?? NEUTRAL[kind][key] ?? EMPTY_PAIR;
}
