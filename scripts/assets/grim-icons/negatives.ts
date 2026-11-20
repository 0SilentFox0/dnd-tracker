import type { WfrpRowKind } from '../../templates/systems/wfrp/common';

// Mirrors generate_grim.py: per-kind ICON_NEGATIVE (units keep the generator's UNIT_NEGATIVE).
export const ICON_NEGATIVE_BY_KIND: Record<WfrpRowKind, string> = {
    careers:
        ', text, letters, close-up face, extreme close-up, portrait crop, crowd, text on clothing, heraldry, coat of arms',
    races: ', text, letters, close-up face, extreme close-up, portrait crop',
    feats: ', full human portrait, standing person, character, book, scroll text, banner, label',
    spells: ', person, character, portrait, rune circle with writing, glyphs, sigil text',
    artifacts:
        ', person, human figure, face, hands, fingers, holding, multiple items, hand holding, table setting, duplicate object, cropped item, wooden frame, book, scroll text, tavern sign, coin inscription, engraved lettering, stamped marks, shop sign, label, price tag, poster, handwriting, calligraphy',
    units: '',
};

export const SHARED_EXTRA_NEGATIVE =
    ', book, scroll text, banner, tavern sign, coin inscription, engraved lettering, stamped marks, shop sign, label, price tag, poster, handwriting, calligraphy';
