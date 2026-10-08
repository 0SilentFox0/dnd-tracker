import type { LibraryArtifactSet } from "./types";

const IVAN_PREY = "ivan-prey";

export const LIBRARY_ARTIFACT_SETS: LibraryArtifactSet[] = [
{
  key: "set-archers-dream", name: "Мрія лучника", heroName: "Айвен", iconKey: "archers-dream",
  description: "Повний комплект: дальнє влучання позначає ціль «Здобиччю» на 2 раунди; дальні атаки Айвена по «Здобичі» завдають +15 % шкоди.",
  appearanceDescription: "Сильванські лучники кажуть, що єдиноріг сам обирає, чий лук носитиме його ріг, а Деревородні — чий сагайдак ніколи не спорожніє. Коли обидва дари зустрічаються в одних руках, ліс замовкає: кожна стріла вже знає свою жертву.",
  abilities: [
    { id: "archers-dream-prey", name: "Здобич", trigger: { event: "hit", role: "attacker", attackKind: "ranged" }, effects: [{ kind: "mark", markId: IVAN_PREY, duration: { rounds: 2 }, target: "eventTarget" }] },
    { id: "archers-dream-prey-bonus", name: "Здобич: шкода", trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" }, condition: { type: "hasMark", who: "eventTarget", markId: IVAN_PREY, bySelf: true }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 15 }] },
  ],
  artifacts: [
    { key: "unicorn-horn-bow", name: "Лук з рогу єдинорога", slot: "range_weapon", rarity: "legendary", iconKey: "unicorn-horn-bow",
      description: "Дальня атака може вразити 2 цілі; для кожної — окремий кидок влучання й шкоди.",
      appearanceDescription: "Тятива сплетена з гриви єдинорога, а плечі лука вирізані з його рогу, що сам віддав його лісу. Стріла з нього не летить — вона ковзає між краплинами дощу і знаходить дві цілі там, де інший лучник бачить одну.",
      modifiers: [{ type: "damageDice", value: "1d8" }, { type: "damageType", value: "piercing" }, { type: "attackType", value: "ranged" }],
      abilities: [{ id: "unicorn-horn-bow-two-targets", name: "Подвійний постріл", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxTargets", flat: 1 }] }] },
    { key: "treeborn-quiver", name: "Сагайдак Деревородних", slot: "cape", rarity: "epic", iconKey: "treeborn-quiver",
      description: "Вбивство повертає бонусну дію (1 раз за раунд).",
      appearanceDescription: "Сагайдак виріс, а не був зшитий: Деревородні виплекали його з кори старого дуба, і в ньому завжди пахне живицею. Щойно ворог падає, сагайдак тихо шелестить — і рука лучника вже тягнеться по наступну стрілу.",
      abilities: [{ id: "treeborn-quiver-refresh", name: "Шелест сагайдака", trigger: { event: "kill", role: "killer" }, limits: { perRound: 1 }, effects: [{ kind: "grantAction", refreshBonusAction: true, target: "self" }] }] },
    { key: "ring-of-celerity", name: "Перстень стрімкості", slot: "ring1", rarity: "epic", iconKey: "ring-of-celerity",
      description: "+15 % шкоди по цілі з повним HP.",
      appearanceDescription: "Платинові крила Їлата, освячені ще в Соколиній імперії, обіймають камінь цього персня. Кажуть, вітри вічності дмуть у спину тому, хто його носить, — і перший удар по необережному ворогу завжди найглибший.",
      abilities: [{ id: "ring-of-celerity-fresh", name: "Перший удар", trigger: { event: "attack", phase: "before", role: "attacker" }, condition: { type: "hpAbove", who: "eventTarget", percent: 99 }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 15 }] }] },
  ],
},
{
  key: "set-dwarven-kings", name: "Обладунки гномських королів", heroName: "Семгрун", iconKey: "dwarven-kings",
  description: "Повний комплект: коли Семгрун влучають, з шансом 30 % (не частіше 1 разу за раунд) союзникам на 1 раунд дістається випадкова руна: +10 % шкоди, +1 AC, +2 ініціативи або лікування 5 % max HP.",
  appearanceDescription: "Чотири частини обладунку куті в горнилах Гробниць гномських королів, і на кожній вибита руна предка, що загинув, тримаючи стрій. Поки хоч один лицар у цій броні стоїть на ногах, руни шепочуть його побратимам: «Ми з вами».",
  abilities: [
    { id: "dwarven-kings-runes", name: "Руни королів", trigger: { event: "hit", role: "target" }, limits: { chance: 30, perRound: 1 }, effects: [{ kind: "randomOf", options: [
      { kind: "damageBonus", filter: { kind: "all" }, percent: 10, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "modifyStat", stat: "initiative", flat: 2, duration: { rounds: 1 }, target: "allAllies" },
      { kind: "heal", amount: { percentOf: "maxHp", value: 5 }, target: "allAllies" },
    ] }] },
  ],
  artifacts: [
    { key: "helm-of-the-dwarven-kings", name: "Шолом гномських королів", slot: "helmet", rarity: "epic", iconKey: "helm-of-the-dwarven-kings",
      description: "Союзники імунні до Сліпоти й Сповільнення.",
      appearanceDescription: "Шолом королів пам'ятає кожен погляд, що намагався його засліпити, і кожне закляття, що прагнуло скувати ноги його носія. Тепер ця пам'ять береже всіх, хто стоїть з ним в одному строю.",
      abilities: [{ id: "helm-of-the-dwarven-kings-ward", name: "Пильність королів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity", spellIds: ["blindness", "slow"], target: "allAllies" }] }] },
    { key: "cuirass-of-the-dwarven-kings", name: "Кіраса гномських королів", slot: "armor", rarity: "epic", iconKey: "cuirass-of-the-dwarven-kings",
      description: "Коли Семгрун влучають, усі атакують кривдника з перевагою 1 раунд.",
      appearanceDescription: "Від удару по цій кірасі лунає гул, як від вечірнього дзвону в Грімгейті. Почувши його, побратими розвертаються до того, хто посмів ударити, — і стають безжальними.",
      abilities: [{ id: "cuirass-of-the-dwarven-kings-toll", name: "Дзвін кіраси", trigger: { event: "hit", role: "target" }, effects: [{ kind: "flag", flag: "advantageForAttackers", duration: { rounds: 1 }, target: "eventActor" }] }] },
    { key: "shield-of-the-dwarven-kings", name: "Щит гномських королів", slot: "shield", rarity: "legendary", iconKey: "shield-of-the-dwarven-kings",
      description: "На початку бою Семгрун бере під варту союзників: 20 % їхньої шкоди переходить на неї.",
      appearanceDescription: "Король, що носив цей щит, ні разу не відступив і ні разу не дозволив упасти побратиму поруч. Щит досі пам'ятає ту клятву й тягне на себе удари, призначені іншим.",
      abilities: [{ id: "shield-of-the-dwarven-kings-guard", name: "Клятва щита", trigger: { event: "battleStart" }, effects: [{ kind: "guard", percent: 20, duration: { rounds: 99 }, target: "allAllies" }] }] },
    { key: "greaves-of-the-dwarven-kings", name: "Поножі гномських королів", slot: "boots", rarity: "epic", iconKey: "greaves-of-the-dwarven-kings",
      description: "Смертельний удар (1 раз за бій): Семгрун лишається з 30 % HP, мораль союзників +1.",
      appearanceDescription: "Кажуть, гномські королі ніколи не падали — їх виносили з поля, ще живих і лайливих. Ці поножі вросли в камінь під ногами, і жоден удар не може збити їхнього власника з ніг з першого разу.",
      abilities: [{ id: "greaves-of-the-dwarven-kings-stand", name: "Королі не падають", trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [
        { kind: "heal", amount: { percentOf: "maxHp", value: 30 }, revive: true, target: "self" },
        { kind: "changeMorale", delta: 1, target: "allAllies" },
      ] }] },
  ],
},
];
