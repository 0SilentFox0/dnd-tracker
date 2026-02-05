/**
 * Evaluates mathematical formulas with support for context variables and basic functions.
 *
 * Supported operators: +, -, *, /, (), %
 * Supported functions: floor(), ceil(), round(), max(a,b), min(a,b), abs()
 *
 * Example: "3 * floor(lost_hp_percent / 10)"
 */
export function evaluateFormula(
  formula: string,
  context: Record<string, number>,
): number {
  try {
    // 1. Replace variables with values from context
    let parsedFormula = formula;

    // Sort keys by length (descending) to avoid partial replacement issues
    // e.g. replacing "hp" inside "max_hp"
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const value = context[key];

      // Use regex with word boundaries to ensure exact match
      const regex = new RegExp(`\\b${key}\\b`, "g");

      parsedFormula = parsedFormula.replace(regex, value.toString());
    }

    // 2. Replace supported functions
    // Note: This is a safe replacement because we control the functions allowed
    parsedFormula = parsedFormula
      .replace(/floor\(/g, "Math.floor(")
      .replace(/ceil\(/g, "Math.ceil(")
      .replace(/round\(/g, "Math.round(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/max\(/g, "Math.max(")
      .replace(/min\(/g, "Math.min(");

    // 3. Validation: Ensure only safe characters remain
    let validationString = parsedFormula;

    const allowedFunctions = [
      "Math.floor",
      "Math.ceil",
      "Math.round",
      "Math.abs",
      "Math.max",
      "Math.min",
    ];

    // Remove all allowed function calls from the validation string
    for (const fn of allowedFunctions) {
      // split/join IS checking for the string literal, so it effectively removes it
      validationString = validationString.split(fn).join("");
    }

    // Now validationString should strictly contain only numbers, operators, parens, spaces, and commas
    const safePattern = /^[0-9.\+\-\*\/\%\(\)\s,]+$/;

    if (!safePattern.test(validationString)) {
      console.warn(
        `Unsafe characters in formula: ${formula} -> ${parsedFormula} (Validation remnant: ${validationString})`,
      );

      return 0;
    }

    // 4. Evaluate safely
    // distinct from eval(), Function() is slightly safer but still risky if input is uncontrolled.
    // However, step 3 mitigation makes it acceptable for this constrained use case.
    const func = new Function(`return ${parsedFormula};`);

    const result = func();

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      console.warn(
        `Formula result is not a valid number: ${formula} -> ${result}`,
      );

      return 0;
    }

    return result;
  } catch (error) {
    console.error(`Error evaluating formula: ${formula}`, error);

    return 0;
  }
}
