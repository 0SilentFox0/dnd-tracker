export const withAbilityErrors = (label: string, errorCount: number) => (errorCount > 0 ? `${label} (помилок у вміннях: ${errorCount})` : label);
