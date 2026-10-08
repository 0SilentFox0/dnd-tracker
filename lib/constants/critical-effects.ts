export type CriticalEffectType =
  | "double_damage"
  | "max_damage"
  | "advantage_next_attack"
  | "ac_debuff"
  | "additional_damage"
  | "free_attack"
  | "block_bonus_action"
  | "ignore_reactions"
  | "advantage_on_target"
  | "combo_attack"
  | "simple_miss"
  | "prone"
  | "disadvantage_next_attack"
  | "lose_bonus_action"
  | "weakened_next_hit"
  | "provoke_opportunity_attack"
  | "lose_reaction"
  | "advantage_on_self"
  | "lose_action";

export interface CriticalEffect {
  id: number; // 1-10 для d10
  name: string;
  description: string;
  type: "success" | "fail";
  flavor: string[];
  effect: {
    type: CriticalEffectType;
    value?: number | string;
    duration?: number;
    target?: "self" | "target" | "next_turn";
  };
}

/**
 * Критична Удача (Natural 20 на d20) - випадковий ефект з d10
 */
export const CRITICAL_SUCCESS_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Подвійний урон",
    description: "Урон подвоюється (x2)",
    type: "success",
    flavor: [
      "{attacker} вкладає в удар усю вагу тіла — {target} аж відкидає назад!",
      "Сталь {attacker} проходить крізь захист {target}, мов крізь вологий папір!",
      "Удар {attacker} лунає, як грім над Асханом, — {target} хитається від болю!",
    ],
    effect: {
      type: "double_damage",
      value: 2,
    },
  },
  {
    id: 2,
    name: "Максимальний урон",
    description: "Урон = максимальне значення кубиків",
    type: "success",
    flavor: [
      "Ідеальний удар! {attacker} знаходить найвразливіше місце {target}.",
      "Доля на боці {attacker}: кожна грань кубиків показує максимум.",
      "{attacker} б'є з холодною точністю майстра — {target} нічим не пом'якшити удар.",
    ],
    effect: {
      type: "max_damage",
    },
  },
  {
    id: 3,
    name: "Advantage на наступну атаку",
    description: "Наступна атака з Advantage",
    type: "success",
    flavor: [
      "{attacker} відчуває ритм бою — наступний удар буде ще влучнішим.",
      "Очі {attacker} спалахують: тепер кожен рух {target} як на долоні.",
      "Кров кипить, рука певна — {attacker} уже готує наступний удар.",
    ],
    effect: {
      type: "advantage_next_attack",
      duration: 2, // 1 атака
      target: "self",
    },
  },
  {
    id: 4,
    name: "Ослаблення захисту",
    description: "Ціль отримує −2 AC до початку її наступного ходу",
    type: "success",
    flavor: [
      "Удар {attacker} розколює обладунок {target} — у броні зяє щілина!",
      "Ремені лопаються, і щит {target} провисає на руці.",
      "{attacker} вибиває {target} з рівноваги — захист розсипається.",
    ],
    effect: {
      type: "ac_debuff",
      value: -2,
      duration: 1, // до наступного ходу цілі
      target: "target",
    },
  },
  {
    id: 5,
    name: "Додатковий урон",
    description: "Додатковий урон +1d6",
    type: "success",
    flavor: [
      "Лезо {attacker} прокручується в рані — {target} кричить від болю!",
      "{attacker} додає до удару ще й лікоть — підступно, але дієво.",
      "Друга хвиля болю накриває {target}: удар {attacker} зачіпає кістку.",
    ],
    effect: {
      type: "additional_damage",
      value: "1d6",
    },
  },
  {
    id: 6,
    name: "Безкоштовна атака",
    description: "Безкоштовна додаткова атака (1 раз)",
    type: "success",
    flavor: [
      "Клинок {attacker} ще не встиг зупинитися, а вже шукає нову щілину в обороні {target}!",
      "{attacker} рухається швидше за думку — ще одна атака напоготові!",
      "Вихор сталі: {attacker} одразу ж б'є знову.",
    ],
    effect: {
      type: "free_attack",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 7,
    name: "Блокування бонусної дії",
    description: "Ворог втрачає Bonus Action наступного ходу",
    type: "success",
    flavor: [
      "Удар {attacker} оглушує {target} — наступного ходу не до хитрощів.",
      "{target} хапається за рану й забуває про все, крім неї.",
      "У вухах {target} дзвенить — дрібні маневри доведеться відкласти.",
    ],
    effect: {
      type: "block_bonus_action",
      duration: 1,
      target: "target",
    },
  },
  {
    id: 8,
    name: "Ігнорування реакцій",
    description: "Атака ігнорує реакції цілі",
    type: "success",
    flavor: [
      "{attacker} б'є так раптово, що {target} навіть не встигає замахнутися у відповідь.",
      "Удар зі сліпої зони — {target} не бачить, звідки прийшла смерть.",
      "{attacker} прослизає під захистом {target}, не лишаючи шансу на відсіч.",
    ],
    effect: {
      type: "ignore_reactions",
      target: "target",
    },
  },
  {
    id: 9,
    name: "Mark для Advantage",
    description: "Наступна атака по цілі з Advantage",
    type: "success",
    flavor: [
      "{target} розкривається після удару — союзники {attacker} бачать слабке місце!",
      "Кров виказує рану {target} — по ній легко влучити ще раз.",
      "{attacker} позначає ціль: тепер {target} — легка здобич.",
    ],
    effect: {
      type: "advantage_on_target",
      duration: 2,
      target: "target",
    },
  },
  {
    id: 10,
    name: "Комбо-удар",
    description: "Ще одна атака з Disadvantage",
    type: "success",
    flavor: [
      "{attacker} не зупиняється — розворот і ще один, відчайдушний удар!",
      "Комбо! {attacker} продовжує атаку, хоч і втрачаючи рівновагу.",
      "Інерція несе {attacker} далі — ще один удар, грубий, але небезпечний.",
    ],
    effect: {
      type: "combo_attack",
      value: "disadvantage",
      duration: 1,
      target: "self",
    },
  },
];

/**
 * Критична Невдача (Natural 1 на d20) - випадковий ефект з d10
 */
export const CRITICAL_FAIL_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Простий промах",
    description: "Промах без додаткових ефектів",
    type: "fail",
    flavor: [
      "{attacker} розсікає порожнечу — {target} навіть не здригається.",
      "Удар {attacker} іде вбік. Буває й таке.",
      "{attacker} промахується так, що аж соромно перед побратимами.",
    ],
    effect: {
      type: "simple_miss",
    },
  },
  {
    id: 2,
    name: "Падіння",
    description: "Prone (лежачи)",
    type: "fail",
    flavor: [
      "{attacker} послизається на закривавленій землі й гепається в багнюку!",
      "Нога підвертається — і ось {attacker} уже на землі, дивлячись у небо.",
      "Замах надто широкий: {attacker} падає, втрачаючи рівновагу.",
    ],
    effect: {
      type: "prone",
      duration: 2, // до кінця наступного ходу
      target: "self",
    },
  },
  {
    id: 3,
    name: "Disadvantage на наступну атаку",
    description: "Disadvantage на наступну атаку",
    type: "fail",
    flavor: [
      "Пил засліплює {attacker} — наступний удар буде наосліп.",
      "Рука {attacker} тремтить після невдалого замаху.",
      "Піт заливає очі {attacker}, і ціль розпливається.",
    ],
    effect: {
      type: "disadvantage_next_attack",
      duration: 2,
      target: "self",
    },
  },
  {
    id: 4,
    name: "Втрата бонусної дії",
    description: "Втрата Bonus Action цього ходу",
    type: "fail",
    flavor: [
      "{attacker} гарячково виправляє хват — на дрібниці часу вже немає.",
      "Ремінь заплутується — {attacker} втрачає дорогоцінну мить.",
      "Збентеження після промаху змушує {attacker} забути про задум.",
    ],
    effect: {
      type: "lose_bonus_action",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 5,
    name: "Зброя вислизає",
    description: "Наступне влучання завдає ×0.5 шкоди",
    type: "fail",
    flavor: [
      "Руків'я вислизає з пітної долоні {attacker} — наступний удар буде слабким.",
      "Зброя ледь не випадає з рук {attacker}, і тепер хват незграбний.",
      "Лезо {attacker} б'ється об каміння й тупиться.",
    ],
    effect: {
      type: "weakened_next_hit",
      value: 0.5,
      duration: 2,
      target: "self",
    },
  },
  {
    id: 6,
    name: "Ослаблення захисту",
    description: "−2 AC до початку наступного ходу",
    type: "fail",
    flavor: [
      "{attacker} надто розкривається після замаху — захист нікудишній.",
      "Пряжка нагрудника {attacker} лопається, броня з'їжджає набік.",
      "Інерція розвертає {attacker} спиною до ворогів.",
    ],
    effect: {
      type: "ac_debuff",
      value: -2,
      duration: 1,
      target: "self",
    },
  },
  {
    id: 7,
    name: "Провокація",
    description: "Провокує Opportunity Attack",
    type: "fail",
    flavor: [
      "{attacker} спотикається просто перед {target} і відкривається для удару.",
      "Невдалий випад залишає {attacker} без прикриття перед {target}.",
      "{target} помічає помилку {attacker}: захист відкрито.",
    ],
    effect: {
      type: "provoke_opportunity_attack",
      target: "self",
    },
  },
  {
    id: 8,
    name: "Втрата реакції",
    description: "Втрата реакції до наступного ходу",
    type: "fail",
    flavor: [
      "Після промаху {attacker} не встигне відповісти на удар.",
      "Увага {attacker} розсіяна: ворог може бити без остраху відсічі.",
      "{attacker} надто зосереджується на власній помилці, щоб стежити за ворогом.",
    ],
    effect: {
      type: "lose_reaction",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 9,
    name: "Mark для ворога",
    description: "Наступна атака по персонажу з Advantage",
    type: "fail",
    flavor: [
      "{attacker} розкривається — тепер кожен ворог бачить слабке місце.",
      "Промах лишає {attacker} без захисту, і вороги це помічають.",
      "{attacker} стоїть як мішень посеред поля бою.",
    ],
    effect: {
      type: "advantage_on_self",
      duration: 2,
      target: "self",
    },
  },
  {
    id: 10,
    name: "Втрата дії",
    description: "Втрата дії (Action)",
    type: "fail",
    flavor: [
      "Невдалий удар виснажує {attacker} — наступний хід піде на відновлення сил.",
      "Зброя {attacker} застрягає — наступного ходу доведеться її виколупувати.",
      "У голові {attacker} паморочиться — наступного ходу з бійця користі мало.",
    ],
    effect: {
      type: "lose_action",
      duration: 1,
      target: "self",
    },
  },
];

/**
 * Отримати критичний ефект по ID та типу
 */
export function getCriticalEffect(
  id: number,
  type: "success" | "fail"
): CriticalEffect | undefined {
  const effects =
    type === "success" ? CRITICAL_SUCCESS_EFFECTS : CRITICAL_FAIL_EFFECTS;

  return effects.find((effect) => effect.id === id);
}

/**
 * Отримати випадковий критичний ефект (для автоматичної генерації)
 */
export function getRandomCriticalEffect(
  type: "success" | "fail",
  rng: () => number = Math.random,
): CriticalEffect {
  const effects =
    type === "success" ? CRITICAL_SUCCESS_EFFECTS : CRITICAL_FAIL_EFFECTS;

  const randomId = Math.floor(rng() * effects.length) + 1;

  return getCriticalEffect(randomId, type) || effects[0];
}
