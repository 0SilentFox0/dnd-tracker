// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HudPortalClassProvider } from '@/components/ui/portal-class';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

afterEach(cleanup);

const content = () =>
    document.body.querySelector('[data-slot="tooltip-content"]');

const tip = (
    <TooltipProvider>
        <Tooltip open>
            <TooltipTrigger>t</TooltipTrigger>
            <TooltipContent>Підказка</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

describe('TooltipContent', () => {
    it('ignores the HUD portal class: .hud-surface sets an unlayered colour that would beat text-hud-ink', () => {
        render(
            <HudPortalClassProvider value="hud-surface">
                {tip}
            </HudPortalClassProvider>
        );

        const classes = content()?.className.split(' ') ?? [];

        expect(classes).not.toContain('hud-surface');
        expect(classes).toContain('bg-hud-panel-2');
        expect(classes).toContain('text-hud-ink');
    });

    it('renders the same classes outside the HUD', () => {
        render(tip);

        expect(content()?.className).toContain('text-hud-ink');
    });
});
