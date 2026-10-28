import type { CriticalEffect } from "@/lib/constants/critical-effects";

/** Нат. 20 на рятівному кидку цілі; `{attacker}` — кастер, `{target}` — ціль, що кидала. */
export const SAVE_SUCCESS_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Повне уникнення",
    description: "Шкода від заклинання = 0, навіть при «половині»",
    type: "success",
    flavor: [
      "{target} пірнає під хвилю магії — заклинання {attacker} не лишає й подряпини.",
      "{target} вислизає з-під удару так легко, ніби {attacker} цілив у тінь.",
    ],
    effect: { type: "negate_damage", target: "target" },
  },
  {
    id: 2,
    name: "Контр-ритм",
    description: "Наступна атака з Advantage",
    type: "success",
    flavor: [
      "{target} ловить ритм чарів {attacker} — наступний удар буде влучнішим.",
      "Магія {attacker} ковзає повз, а {target} уже примічає слабке місце ворога.",
    ],
    effect: { type: "advantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 3,
    name: "Вільна атака по кастеру",
    description: "Ціль одразу атакує кастера (1 раз)",
    type: "success",
    flavor: [
      "{target} розвіює чари {attacker} і б'є у відповідь, поки той не опам'ятався!",
      "Заклинання {attacker} розсипається іскрами — {target} кидається в контратаку.",
    ],
    effect: { type: "free_attack", duration: 1, target: "target" },
  },
  {
    id: 4,
    name: "Гарт",
    description: "+2 КЗ до кінця раунду",
    type: "success",
    flavor: [
      "Магія {attacker} загартовує {target}: шкіра твердне, як камінь.",
      "{target} відбиває чари {attacker} і відчуває, як силует вкриває невидимий щит.",
    ],
    effect: { type: "ac_buff", value: 2, duration: 1, target: "target" },
  },
  {
    id: 5,
    name: "Скидання",
    description: "Заклинання не накладає статусів",
    type: "success",
    flavor: [
      "{target} струшує чари {attacker}, мов краплі дощу — жодна хвороба не чіпляється.",
      "Розум {target} чистий, мов джерело: накладання {attacker} розсіюється без сліду.",
    ],
    effect: { type: "negate_effects", target: "target" },
  },
  {
    id: 6,
    name: "Другий вдих",
    description: "Ціль отримує додаткову дію",
    type: "success",
    flavor: [
      "{target} пережив чари {attacker} і відчуває несподіваний приплив сил.",
      "Удар магії {attacker} лише розганяє кров {target} — час ніби уповільнюється.",
    ],
    effect: { type: "extra_action", target: "target" },
  },
];

/** Нат. 1 на рятівному кидку цілі. */
export const SAVE_FAIL_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Подвійна шкода",
    description: "Шкода від заклинання подвоюється для цієї цілі",
    type: "fail",
    flavor: [
      "{target} підставляється під самісіньке вістря чарів {attacker} — біль подвійний!",
      "Магія {attacker} вдаряє в {target} з подвоєною силою.",
    ],
    effect: { type: "double_damage", value: 2, target: "target" },
  },
  {
    id: 2,
    name: "Збитий з ніг",
    description: "Prone (лежачи)",
    type: "fail",
    flavor: [
      "Хвиля чарів {attacker} збиває {target} з ніг.",
      "{target} втрачає рівновагу під натиском магії {attacker} і падає ниць.",
    ],
    effect: { type: "prone", duration: 2, target: "target" },
  },
  {
    id: 3,
    name: "Збентеження",
    description: "Disadvantage на наступну атаку",
    type: "fail",
    flavor: [
      "Чари {attacker} затуманюють погляд {target} — наступний удар піде наосліп.",
      "{target} спантеличений магією {attacker}: рука тремтить, ціль пливе перед очима.",
    ],
    effect: { type: "disadvantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 4,
    name: "Прогалина в захисті",
    description: "−2 КЗ до початку наступного ходу",
    type: "fail",
    flavor: [
      "Магія {attacker} розхитує оборону {target} — у броні з'являється щілина.",
      "{target} розкривається під чарами {attacker}: захист ледь тримається.",
    ],
    effect: { type: "ac_debuff", value: -2, duration: 1, target: "target" },
  },
  {
    id: 5,
    name: "Втрата реакції",
    description: "Втрата реакції до наступного ходу",
    type: "fail",
    flavor: [
      "{target} заціпеніває від чарів {attacker} і не встигає відреагувати.",
      "Магія {attacker} оглушує {target} — відповісти на удар не вийде.",
    ],
    effect: { type: "lose_reaction", duration: 1, target: "target" },
  },
  {
    id: 6,
    name: "Втрата бонусної дії",
    description: "Ціль втрачає Bonus Action наступного ходу",
    type: "fail",
    flavor: [
      "Заклинання {attacker} виснажує {target} — на дрібні маневри сил немає.",
      "{target} хапається за голову: чари {attacker} вибили з пам'яті всі хитрощі.",
    ],
    effect: { type: "block_bonus_action", duration: 1, target: "target" },
  },
];
