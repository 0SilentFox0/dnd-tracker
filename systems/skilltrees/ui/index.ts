import { MainSkillsPage } from './content/MainSkillsPage';
import { SkillsPage } from './content/SkillsPage';
import { SkillTreesPage } from './content/SkillTreesPage';
import { SkillTreePanel } from './SkillTreePanel';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const SKILLTREES_MODULE_UI = defineAddon<SystemUi>(() => ({
    sheet: { pathPanels: [SkillTreePanel] },
    dmPages: {
        skills: SkillsPage,
        'skill-trees': SkillTreesPage,
        'main-skills': MainSkillsPage,
    },
}));
