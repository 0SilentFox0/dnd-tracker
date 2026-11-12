import { DEFAULT_RULES } from './defaults';
import { sectionSchemas } from './section-shapes';
import { itemsFromShape } from './sections';

/** Items of a legacy section (all of them, or only `keys`) with schemas and defaults from section-shapes/DEFAULT_RULES */
export const sectionItems = <
    K extends Exclude<keyof typeof sectionSchemas, 'advancement'>,
>(
    name: K,
    keys?: readonly string[]
) =>
    itemsFromShape(
        sectionSchemas[name].shape as never,
        DEFAULT_RULES[name] as never,
        keys
    );
