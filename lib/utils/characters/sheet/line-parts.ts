import type {
    AbilityKey,
    SheetLine,
    SheetLineSource,
} from '@/types/characters';
import type { LogLine } from '@/types/text';

export const abilityLabel = (key: AbilityKey) =>
    `gameTerms.abilities.${key}.label`;

export const labelParts = (
    label: LogLine
): Pick<SheetLine, 'label' | 'params'> =>
    typeof label === 'string'
        ? { label }
        : { label: label.message, params: label.params };

export const asSource = (t: string): SheetLineSource => t as SheetLineSource;
