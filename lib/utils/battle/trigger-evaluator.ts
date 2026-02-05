export type TriggerContext = {
  // Event context
  event?:
    | "onHit"
    | "onKill"
    | "onBattleStart"
    | "bonusAction"
    | "onCast"
    | "passive";
  // Actor stats
  hp_percent?: number;
  // Target/Ally stats (aliases for context)
  allyHP?: number; // absolute or percent? Let's assume absolute for now, or use specific vars
  ally_hp_percent?: number;
  enemy_hp_percent?: number;
  // Global
  round?: number;
  // RNG override (for testing)
  rng?: number;
  // Allow other props (numeric or string)
  [key: string]: string | number | undefined;
};

/**
 * Evaluates a trigger condition string.
 *
 * Supported syntax:
 * - Events: "onHit", "onKill", etc.
 * - Logic: "&&", "||", "!"
 * - Comparisons: "<", ">", "<=", ">=", "==", "!="
 * - Math: formulas supported by evaluateFormula
 * - Functions: "rand()" returns 0..1
 *
 * Example: "onHit && rand() < 0.4"
 * Example: "passive && ally_hp_percent <= 0.15"
 */
export function evaluateTrigger(
  trigger: string,
  context: TriggerContext,
): boolean {
  if (!trigger) return false;

  try {
    let parsedTrigger = trigger;

    // 1. Handle Event keywords
    // If the trigger contains an event keyword (e.g. "onHit"), it evaluates to true/false based on context.event
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

    // 2. Handle rand()
    // Replace rand() with a random number literal
    // We do this loop to handle multiple rand() calls if needed
    while (parsedTrigger.includes("rand()")) {
      const val = context.rng !== undefined ? context.rng : Math.random();

      parsedTrigger = parsedTrigger.replace("rand()", val.toString());
    }

    // 3. Prepare context for formula evaluation
    // We need to resolve variables that might be used in comparisons (e.g. ally_hp_percent)
    // The issue is that evaluateFormula returns a number, but here we have a full boolean expression.
    // We can try to use the same Function approach if we are careful.

    // Let's replace variable names with their values first.
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (key === "event" || key === "rng") continue; // Skip non-numeric/special props

      const value = context[key];

      if (typeof value === "number") {
        const regex = new RegExp(`\\b${key}\\b`, "g");

        parsedTrigger = parsedTrigger.replace(regex, value.toString());
      }
    }

    // 4. Validation
    // Allowed: true, false, digits, ., +, -, *, /, %, <, >, =, !, &, |, (, ), space
    // We need to be generous with logic operators
    const safePattern = /^[a-zA-Z0-9.\+\-\*\/\%\(\)\s<>=!&|]+$/;

    // Security check: ensure no unexpected function calls
    // Since we mapped events to "true"/"false", only "true" and "false" should remain as letters (mostly)
    // But evaluating "true && 0.3 < 0.5" is valid.

    if (!safePattern.test(parsedTrigger)) {
      console.warn(
        `Unsafe characters in trigger: ${trigger} -> ${parsedTrigger}`,
      );

      return false;
    }

    // 5. Evaluate
    const func = new Function(`return ${parsedTrigger};`);

    const result = func();

    return !!result;
  } catch (error) {
    console.error(`Error evaluating trigger: ${trigger}`, error);

    return false;
  }
}
