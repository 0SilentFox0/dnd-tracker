// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayerDraftForm } from '../PlayerDraftForm';

import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const system = vi.hoisted(() => ({ def: undefined as unknown }));

vi.mock('@/lib/hooks/systems', () => ({
    useRuleSystem: () => ({ system: system.def }),
}));
vi.mock('@/lib/hooks/races', () => ({ useRaces: () => ({ data: [] }) }));
vi.mock('@/lib/hooks/characters', () => ({
    useArchetypeOptions: () => ({ options: [] }),
    useChoiceRefs: () => ({ ready: false }),
    usePlayerDraftForm: () => ({
        form: {
            values: { name: '', race: '', class: '', archetype: 'warrior' },
            set: vi.fn(),
            setArchetype: vi.fn(),
            classes: undefined,
        },
        choices: { enabled: false },
        generate: {},
        ai: { available: false, avatar: { available: false } },
        submit: { error: null, isPending: false, run: vi.fn() },
        scoreStatus: { valid: true },
        reveal: {
            rolling: false,
            settled: new Set(),
            display: {},
            skip: vi.fn(),
        },
    }),
}));
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: () => null,
}));
vi.mock('@/components/choices/ChoicesEditor', () => ({
    ChoicesEditor: () => null,
}));
vi.mock('@/components/ui/image-upload', () => ({ ImageUpload: () => null }));
vi.mock('../AbilityScoresPicker', () => ({ AbilityScoresPicker: () => null }));
vi.mock('@/components/common/EntityIcon', () => ({ EntityIcon: () => null }));

const show = (key: string, modules?: string[]) => {
    system.def = ruleSystemOf(parseRules({ system: { key, modules } }));

    return render(<PlayerDraftForm campaignId="camp" />);
};

describe('PlayerDraftForm archetype field', () => {
    afterEach(cleanup);

    it('is hidden in a system without the archetype column', () => {
        show('dnd5e', []);

        expect(document.getElementById('draft-archetype')).toBeNull();
    });

    it('is shown with the hero scaling module', () => {
        show('homm');

        expect(document.getElementById('draft-archetype')).not.toBeNull();
    });
});
