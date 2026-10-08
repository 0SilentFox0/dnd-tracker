import type { LibraryRacePassive } from "./types";

export const RACE_PASSIVES: Record<string, LibraryRacePassive> = {
  humans: {
    name: "Відвага",
    description: "+1 до всіх шести характеристик. Мораль героя ніколи не падає нижче 0.",
    appearanceDescription:
      "Воїн Імперії ставить ногу в стремено, і в його погляді немає ані тіні сумніву. Навіть коли навколо падають стяги й чути крики відступу, він тримає стрій, ніби тримається за невидимий щит. Страх ковзає по його кірасі, як дощ по бронзовому дзвону.",
    stats: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    trait: [{ id: "humans-courage", name: "Відвага", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "noNegativeMorale" }] }],
  },
  demons: {
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
    name: "Око лісу",
    description: "+2 до Спритності, +1 до Мудрості. Дальні атаки героя отримують +1 до атаки.",
    appearanceDescription:
      "Ельф примружується, і ліс ніби підказує йому, де гойднеться гілка, а де промайне тінь. Тятива співає тихо, а стріла вже летить туди, де ворог лише збирається ступити. Птахи не змовкають поруч із ним — вони знають, що він свій.",
    stats: { dexterity: 2, wisdom: 1 },
    trait: [{ id: "elves-forest-eye", name: "Око лісу", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1, attackKind: "ranged" }] }],
  },
  necromancers: {
    name: "Неживе тіло",
    description: "+2 до Інтелекту, +1 до Статури. Імунітет до шкоди отрутою та до страху.",
    appearanceDescription:
      "Шкіра некроманта холодна, як могильна плита, а в грудях давно не б'ється серце. Отрута стікає по ньому, не знаходячи живої плоті, а жах, що змушує інших кидати зброю, лише викликає в нього глуху усмішку. Він давно переступив межу, за якою страшно.",
    stats: { intelligence: 2, constitution: 1 },
    trait: [
      {
        id: "necromancers-undead-body",
        name: "Неживе тіло",
        trigger: { event: "passive" },
        effects: [
          { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 },
          { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] },
        ],
      },
    ],
  },
  mages: {
    name: "Магічна освіта",
    description: "+2 до Інтелекту, +1 до Мудрості. +1 слот заклинань 1 рівня.",
    appearanceDescription:
      "Роки в бібліотеках Академії залишили на пальцях чорнильні плями, а в пам'яті — сотні формул, що тихо шепочуться в тиші. Коли маг відкриває долоню, повітря над нею тремтить, ніби сторінка, яку ось-ось перегорне невидима рука. Магія для нього — не дар, а ремесло, відточене до досконалості.",
    stats: { intelligence: 2, wisdom: 1 },
    trait: [{ id: "mages-education", name: "Магічна освіта", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "spellSlots", flat: 1, spellLevels: [1] }] }],
  },
  "dark-elves": {
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
    name: "Кам'яна шкіра роду",
    description: "+2 до Статури, +1 до Сили. +1 до класу броні.",
    appearanceDescription:
      "Гном стоїть, ніби виріс із самої скелі: широкі плечі, борода, заплетена в залізні кільця, і шкіра, що темніє й твердне, наче граніт. Клинки скрегочуть по ній і відскакують, залишаючи лише іскри. Предки гір нібито вклали в нього частку своєї міцності.",
    stats: { constitution: 2, strength: 1 },
    trait: [{ id: "dwarves-stoneskin", name: "Кам'яна шкіра роду", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }],
  },
};
