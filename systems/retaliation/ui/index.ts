import { RetaliationItem } from './RetaliationItem';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const RETALIATION_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesItems: { 'actions.retaliation': RetaliationItem },
}));
