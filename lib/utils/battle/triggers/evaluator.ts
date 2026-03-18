export type TriggerContext = {
  event?:
    | "onHit"
    | "onKill"
    | "onBattleStart"
    | "bonusAction"
    | "onCast"
    | "passive";
  hp_percent?: number;
  allyHP?: number;
  ally_hp_percent?: number;
  enemy_hp_percent?: number;
  round?: number;
  rng?: number;
  [key: string]: string | number | undefined;
};

/**
 * Evaluates a trigger condition string.
 * Example: "onHit && rand() < 0.4"
 */
export function evaluateTrigger(
  trigger: string,
  context: TriggerContext,
): boolean {
  if (!trigger) return false;

  try {
    let parsedTrigger = trigger;

    const events = [
      "onHit",
      "onKill",
      "onBattleStart",
      "bonusAction",
      "onCast",
      "passive",
    ];

    for (const evt of events) {
      const isActive = context.event === evt;

      const regex = new RegExp(`\\b${evt}\\b`, "g");

      parsedTrigger = parsedTrigger.replace(regex, isActive.toString());
    }

    while (parsedTrigger.includes("rand()")) {
      const val = context.rng !== undefined ? context.rng : Math.random();

      parsedTrigger = parsedTrigger.replace("rand()", val.toString());
    }

    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (key === "event" || key === "rng") continue;

      const value = context[key];

      if (typeof value === "number") {
        const regex = new RegExp(`\\b${key}\\b`, "g");

        parsedTrigger = parsedTrigger.replace(regex, value.toString());
      }
    }

    const safePattern = /^[a-zA-Z0-9.\+\-\*\/\%\(\)\s<>=!&|]+$/;

    if (!safePattern.test(parsedTrigger)) {
      console.warn(`Unsafe characters in trigger: ${trigger} -> ${parsedTrigger}`);

      return false;
    }

    const func = new Function(`return ${parsedTrigger};`);

    const result = func();

    return !!result;
  } catch (error) {
    console.error(`Error evaluating trigger: ${trigger}`, error);

    return false;
  }
}
