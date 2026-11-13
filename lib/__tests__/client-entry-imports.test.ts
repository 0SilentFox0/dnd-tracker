import { describe, expect, it } from 'vitest';

import { staticGraph } from './helpers/static-graph';

const importers = (graph: ReturnType<typeof staticGraph>, pkg: string) =>
    [...graph.packages]
        .filter(([spec]) => spec === pkg || spec.startsWith(`${pkg}/`))
        .map(([, by]) => by);

describe('entry-чанки гравця', () => {
    const battle = staticGraph([
        'app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx',
    ]);

    const profile = staticGraph([
        'components/character-profile/index.ts',
        'components/hud/page/index.ts',
        'components/common/states/index.ts',
    ]);

    it('обхід бачить граф і zod', () => {
        expect(battle.files).toContain(
            'components/battle/participants/ParticipantList.tsx'
        );
        expect(profile.files).toContain(
            'components/character-profile/CharacterProfile.tsx'
        );
        expect(
            importers(staticGraph(['lib/utils/abilities/read.ts']), 'zod')
                .length
        ).toBeGreaterThan(0);
    });

    it('бій не тягне zod', () => {
        expect(importers(battle, 'zod')).toEqual([]);
    });

    it('профіль не тягне zod', () => {
        expect(importers(profile, 'zod')).toEqual([]);
    });

    it('десктоп, DM-UI, майстри й оверлеї бою вантажаться окремо', () => {
        const lazy = [
            'components/battle/scene/DesktopBattleLayout.tsx',
            'components/battle/dm/DmPanel.tsx',
            'components/battle/dm/CompleteBattleDialog.tsx',
            'components/battle/dm/dialogs/AddParticipantDialog.tsx',
            'components/battle/dm/dialogs/ChangeHpDialog.tsx',
            'components/battle/dm/dialogs/DmCasterPickerDialog.tsx',
            'components/battle/overlays/BattlePreparationView.tsx',
            'systems/morale/ui/battle/MoraleResultOverlay.tsx',
            'components/battle/wizards/AttackWizard.tsx',
            'components/battle/wizards/SpellBook.tsx',
            'components/battle/wizards/BonusActionPicker.tsx',
        ];

        expect(lazy.filter((f) => battle.files.has(f))).toEqual([]);
        expect(battle.files).toContain(
            'components/battle/scene/MobileBattleLayout.tsx'
        );
        expect(importers(battle, 'framer-motion')).toEqual([]);
    });

    it('редактор профілю вантажиться окремо', () => {
        expect(
            profile.files.has('components/character-profile/ProfileEditor.tsx')
        ).toBe(false);
    });
});
