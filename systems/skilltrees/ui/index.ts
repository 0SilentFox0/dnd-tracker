import { MainSkillsPage } from './content/MainSkillsPage';
import { SkillsPage } from './content/SkillsPage';
import { SkillTreesPage } from './content/SkillTreesPage';
import { LevelUpOverlay } from './progression/LevelUpOverlay';
import { SkillTreePanel } from './SkillTreePanel';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const SKILLTREES_MODULE_UI = defineAddon<SystemUi>(() => ({
    sheet: { pathPanels: [SkillTreePanel], overlays: [LevelUpOverlay] },
    dmPages: {
        skills: SkillsPage,
        'skill-trees': SkillTreesPage,
        'main-skills': MainSkillsPage,
    },
}));
