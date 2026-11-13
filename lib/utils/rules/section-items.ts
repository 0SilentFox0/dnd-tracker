import { SECTION_DEFAULTS } from './defaults';
import { sectionSchemas } from './section-shapes';
import { itemsFromShape } from './sections';

/** Items of a legacy section (all of them, or only `keys`) with schemas and defaults from section-shapes/SECTION_DEFAULTS */
export const sectionItems = (
    name: keyof typeof sectionSchemas,
    keys?: readonly string[]
) =>
    itemsFromShape(
        sectionSchemas[name].shape as never,
        (SECTION_DEFAULTS as Record<string, never>)[name] ?? {},
        keys
    );
