/** A rename cannot accidentally enable a descriptive imported spell. */
export function assertManualActivation(current: string | null | undefined, update: Record<string, unknown>): void {
  if (current !== "manual" || update.executionMode !== "native") return;

  for (const field of ["cost", "dice", "targeting", "resolution", "spellEffects"]) {
    if (update[field] === undefined) throw new Error("Для автоматичного застосування явно налаштуйте всю механіку заклинання");
  }
}
