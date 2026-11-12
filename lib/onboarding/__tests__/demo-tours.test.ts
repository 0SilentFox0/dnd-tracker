import { describe, expect, it } from 'vitest';

import { DEMO_TOURS } from '@/lib/onboarding/demo-tours';
import english from '@/messages/en/demoTours.json';
import ukrainian from '@/messages/uk/demoTours.json';

const lookup = (messages: unknown, ...keys: string[]) =>
    keys.reduce<unknown>(
        (value, key) =>
            value && typeof value === 'object'
                ? (value as Record<string, unknown>)[key]
                : undefined,
        messages
    );

describe('demo visual tours', () => {
    it('defines all seven independently launchable flows with unique step ids per tour', () => {
        expect(DEMO_TOURS.map(({ id }) => id)).toEqual([
            'dashboard',
            'scenario',
            'show',
            'world',
            'music',
            'libraries',
            'battle',
        ]);

        for (const tour of DEMO_TOURS) {
            const ids = tour.steps.map((step) => step.id);

            expect(ids.length).toBeGreaterThanOrEqual(6);
            expect(new Set(ids).size).toBe(ids.length);
            expect(new Set(tour.steps.map((step) => step.target)).size).toBe(
                ids.length
            );
        }
    });

    it('starts every tour with an explicit route and keeps the rest on the page they reach', () => {
        for (const tour of DEMO_TOURS) {
            expect(tour.steps[0].route).toBe(tour.startPath);
            expect(tour.steps[0].routeFromTarget).toBeUndefined();
        }
    });

    it('navigates into detail pages through anchor links and drives state changes through clicks', () => {
        const by = (tourId: string, stepId: string) =>
            DEMO_TOURS.find((tour) => tour.id === tourId)!.steps.find(
                (step) => step.id === stepId
            )!;

        expect(by('scenario', 'bar')).toMatchObject({
            routeFromTarget: 'scenario.open',
        });
        expect(by('scenario', 'bar').route).toBeUndefined();
        expect(by('show', 'stage')).toMatchObject({
            routeFromTarget: 'show.present',
        });
        expect(by('show', 'stage').route).toBeUndefined();
        expect(by('battle', 'arena')).toMatchObject({
            routeFromTarget: 'battle.open',
        });
        expect(by('music', 'dock')).toMatchObject({
            routeFromTarget: 'battle.open',
        });

        expect(by('world', 'notes')).toMatchObject({
            clickFromTarget: 'world.marker',
        });
        expect(by('battle', 'topbar')).toMatchObject({
            clickFromTarget: 'battle.start',
        });
        expect(by('battle', 'turn-controls')).toMatchObject({
            clickFromTarget: 'battle.next-turn',
            clickUntilTarget: true,
        });
        expect(by('battle', 'dm-actions')).toMatchObject({
            clickFromTarget: 'battle.dm-open',
            placement: 'left',
        });
        expect(by('battle', 'audio')).toMatchObject({
            clickFromTarget: 'battle.dm-close',
            target: '[data-tour="music.dock"]',
        });
        expect(by('libraries', 'dashboard')).toMatchObject({
            route: '',
            target: '[data-tour="dashboard.group-libraries"]',
        });
    });

    it('only clicks anchors that belong to the current page or were reached earlier in the same tour', () => {
        for (const tour of DEMO_TOURS) {
            const seen = new Set<string>();

            for (const step of tour.steps) {
                for (const source of [
                    step.clickFromTarget,
                    step.routeFromTarget,
                ]) {
                    if (source && !source.startsWith(`${tour.id}.`))
                        expect(seen.has(`[data-tour="${source}"]`)).toBe(true);
                }

                seen.add(step.target);
            }
        }
    });

    it('provides every tour and step string in both supported locales', () => {
        for (const messages of [english, ukrainian] as const) {
            for (const tour of DEMO_TOURS) {
                const [, id, field] = tour.titleKey.split('.');

                expect(lookup(messages, 'tours', id, field)).toBeTruthy();
                expect(
                    lookup(messages, 'tours', id, 'description')
                ).toBeTruthy();
                for (const item of tour.steps) {
                    const [, stepTourId, stepId] = item.titleKey.split('.');

                    expect(
                        lookup(messages, 'steps', stepTourId, stepId, 'title'),
                        `${stepTourId}.${stepId}.title`
                    ).toBeTruthy();
                    expect(
                        lookup(
                            messages,
                            'steps',
                            stepTourId,
                            stepId,
                            'description'
                        ),
                        `${stepTourId}.${stepId}.description`
                    ).toBeTruthy();
                }
            }
            for (const control of [
                'next',
                'back',
                'skip',
                'close',
                'last',
            ] as const)
                expect(lookup(messages, 'controls', control)).toBeTruthy();
        }
    });

    it('has no orphan step texts in either locale', () => {
        const defined = new Set(
            DEMO_TOURS.flatMap((tour) =>
                tour.steps.map((step) => `${tour.id}.${step.id}`)
            )
        );

        for (const messages of [english, ukrainian] as const) {
            const texts = Object.entries(messages.steps).flatMap(
                ([tourId, steps]) =>
                    Object.keys(steps).map((stepId) => `${tourId}.${stepId}`)
            );

            expect(texts.filter((key) => !defined.has(key))).toEqual([]);
        }
    });
});
