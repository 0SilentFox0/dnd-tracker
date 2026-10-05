/** NULL = «бачив поточний рівень»; перше підвищення фіксує старий рівень, щоб профіль показав анімацію. */
export function seenLevelOnLevelChange(oldLevel: number, newLevel: number, seenLevel: number | null): number | undefined {
  if (newLevel <= oldLevel || seenLevel !== null) return undefined;

  return oldLevel;
}
