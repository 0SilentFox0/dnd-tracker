import type { LibraryRacePassive } from "./types";

export const RACE_PASSIVES: Record<string, LibraryRacePassive> = {
  humans: {
    iconKey: "race-flag-humans",
    name: "Вишкіл війська",
    description: "+2 до Сили, +1 до Харизми. На початку бою герой і всі союзники отримують +1 до моралі на 2 раунди.",
    appearanceDescription:
      "Перед першою сутичкою лунає короткий сигнал сурми, і ряди імперських воїнів вирівнюються, наче по шнурку. Командир кидає один погляд на стрій, і навіть новобранці відчувають, що за плечима в них стоїть уся армія. Шоломи піднімаються, щити змикаються, і страх відступає перед спільним ритмом кроків.",
    stats: { strength: 2, charisma: 1 },
    trait: [
      {
        id: "humans-army-drill",
        name: "Вишкіл війська",
        trigger: { event: "battleStart" },
        effects: [{ kind: "modifyStat", stat: "morale", flat: 1, duration: { rounds: 2 }, target: "allAllies" }],
      },
    ],
  },

  demons: {
    iconKey: "race-flag-demons",
    name: "Пекельна кров",
    description: "+2 до Сили, +1 до Харизми. Опір вогню 50 %.",
    appearanceDescription:
      "По венах демона тече не кров, а розжарена лава, і шкіра вкривається багряними тріщинами, коли поруч спалахує полум'я. Вогонь лиже його плечі, наче давній знайомий, і гасне, не залишивши опіків. Лише дим здіймається від обгорілого плаща.",
    stats: { strength: 2, charisma: 1 },
    trait: [
      { id: "demons-hellblood", name: "Пекельна кров", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }] },
    ],
  },
  elves: {
    iconKey: "race-flag-elves",
    name: "Око лісу",
    description: "+2 до Спритності, +1 до Мудрості. Усі атаки героя отримують +1 до кидка влучання.",
    appearanceDescription:
      "Ельф примружується, і ліс ніби підказує йому, де гойднеться гілка, а де промайне тінь. Його погляд ловить найменшу прогалину в обороні ворога, чи то між пластинами лат, чи між ударами мечів. Птахи не змовкають поруч із ним — вони знають, що він свій.",
    stats: { dexterity: 2, wisdom: 1 },
    trait: [{ id: "elves-forest-eye", name: "Око лісу", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1 }] }],
  },

  necromancers: {
    iconKey: "race-flag-necromancers",
    name: "Неживе тіло",
    description: "+2 до Інтелекту, +1 до Статури. Мораль героя завжди 0. Імунітет до шкоди отрутою.",
    appearanceDescription:
      "Шкіра некроманта холодна, як могильна плита, а в грудях давно не б'ється серце. Отрута стікає по ньому, не знаходячи живої плоті, а ні відвага, ні жах не торкаються його порожнього погляду. Він давно переступив межу, за якою щось відчувають.",
    stats: { intelligence: 2, constitution: 1 },
    trait: [
      {
        id: "necromancers-undead-body",
        name: "Неживе тіло",
        trigger: { event: "passive" },
        effects: [
          { kind: "flag", flag: "ignoreMorale" },
          { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 },
        ],
      },
    ],
  },

  mages: {
    iconKey: "race-flag-mages",
    name: "Магічний захист",
    description: "+2 до Інтелекту, +1 до Мудрості. Опір шкоді від заклинань 15 %.",
    appearanceDescription:
      "Роки в бібліотеках Академії залишили на пальцях чорнильні плями, а на плечах — невидиму оболонку з вивірених формул. Ворожі чари ковзають по ній, як дощ по склу, і втрачають частину сили ще до удару. Маг навіть не здригається: він знає цю магію краще за тих, хто її кличе.",
    stats: { intelligence: 2, wisdom: 1 },
    trait: [{ id: "mages-ward", name: "Магічний захист", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 15 }] }],
  },

  "dark-elves": {
    iconKey: "race-flag-dark-elves",
    name: "Підземний зір",
    description: "+2 до Спритності, +1 до Харизми. Перша атака героя в бою — з перевагою.",
    appearanceDescription:
      "Очі темного ельфа бачать там, де інші впираються в суцільну пітьму: кожен рух ворога світиться для нього тьмяним фіалковим вогнем. Він завмирає в тіні, чекаючи першого удару, і б'є так, що жертва ще довго не розуміє, звідки прийшла смерть.",
    stats: { dexterity: 2, charisma: 1 },
    trait: [
      {
        id: "dark-elves-darkvision",
        name: "Підземний зір",
        trigger: { event: "attack", phase: "before", role: "attacker" },
        limits: { perBattle: 1 },
        effects: [{ kind: "flag", flag: "advantage", attackKind: "all" }],
      },
    ],
  },
  dwarves: {
    iconKey: "race-flag-dwarves",
    name: "Кам'яна шкіра роду",
    description: "+2 до Статури, +1 до Сили. +1 до класу броні.",
    appearanceDescription:
      "Гном стоїть, ніби виріс із самої скелі: широкі плечі, борода, заплетена в залізні кільця, і шкіра, що темніє й твердне, наче граніт. Клинки скрегочуть по ній і відскакують, залишаючи лише іскри. Предки гір немов вклали в нього частку своєї міцності.",
    stats: { constitution: 2, strength: 1 },
    trait: [{ id: "dwarves-stoneskin", name: "Кам'яна шкіра роду", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }],
  },
};
