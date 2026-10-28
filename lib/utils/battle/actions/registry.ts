export const CORE_ACTION_KEYS = ["dash", "disengage", "dodge", "help", "hide", "ready", "standUp", "grapple", "shove", "escape"] as const;

export type CoreActionKey = (typeof CORE_ACTION_KEYS)[number];

export type CoreActionDef = {
  label: string;
  description: string;
  cost: "action" | "bonusAction" | "movement";
  target: "none" | "allyAdjacent" | "enemyAdjacent";
};

export const CORE_ACTION_REGISTRY: Record<CoreActionKey, CoreActionDef> = {
  dash: { label: "Ривок", description: "Додає до руху цього ходу ще стільки, скільки дає швидкість.", cost: "action", target: "none" },
  disengage: { label: "Відхід", description: "До кінця ходу рух не провокує атак при відході.", cost: "action", target: "none" },
  dodge: { label: "Ухилитися", description: "До початку наступного ходу атаки по вас з недоліком, перевага на рятівні кидки СПР.", cost: "action", target: "none" },
  help: { label: "Допомога", description: "Союзник поруч отримує перевагу на наступну атаку.", cost: "action", target: "allyAdjacent" },
  hide: { label: "Сховатися", description: "Кидок Скритності проти пасивного Сприйняття ворогів.", cost: "action", target: "none" },
  ready: { label: "Підготувати атаку", description: "Атака реакцією до початку вашого наступного ходу.", cost: "action", target: "none" },
  standUp: { label: "Підвестися", description: "Витрачає половину руху й знімає стан «повалений».", cost: "movement", target: "none" },
  grapple: { label: "Схопити", description: "Змагання (2014) або рятівний кидок (2024): ціль стає схопленою.", cost: "action", target: "enemyAdjacent" },
  shove: { label: "Штовхнути", description: "Змагання (2014) або рятівний кидок (2024): повалити ціль або відштовхнути на 5 фт.", cost: "action", target: "enemyAdjacent" },
  escape: { label: "Вирватися", description: "Змагання проти того, хто схопив (2024: проти СК): знімає стан «схоплений».", cost: "action", target: "none" },
};
