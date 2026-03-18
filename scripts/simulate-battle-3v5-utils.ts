/**
 * Допоміжні функції для simulate-battle-3v5
 */

export interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export function createAssert(
  testResults: TestResult[],
): (name: string, condition: boolean, detail?: string) => void {
  return (name, condition, detail) => {
    testResults.push({ name, passed: condition, detail });

    if (!condition) {
      console.log(`  ❌ ${name}${detail ? `: ${detail}` : ""}`);
    }
  };
}

/** Парсинг damageDice "2d6+4" -> кількість кубиків */
export function getDiceCount(damageDice: string): number {
  const m = damageDice.match(/(\d+)d\d+/);

  return m ? parseInt(m[1], 10) : 1;
}
