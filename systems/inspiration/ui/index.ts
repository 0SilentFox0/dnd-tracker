import { InspirationItem } from './InspirationItem';
import {
    InspirationAttackOption,
    InspirationCardMark,
    InspirationDmToggle,
    InspirationSheetOption,
} from './RerollTokenParts';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const INSPIRATION_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesItems: { 'outOfCombat.inspiration': InspirationItem },
    rerollToken: {
        DmToggle: InspirationDmToggle,
        CardMark: InspirationCardMark,
        AttackOption: InspirationAttackOption,
        SheetOption: InspirationSheetOption,
    },
}));
