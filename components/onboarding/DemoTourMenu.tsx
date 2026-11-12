'use client';

import { Check, Compass, Play } from 'lucide-react';

import { useDemoTour } from '@/components/onboarding/DemoTourCoordinator';
import { Button } from '@/components/ui/button';
import { useOnboardingFlags } from '@/lib/hooks/onboarding';
import { useTranslator } from '@/lib/i18n/use-translator';
import { DEMO_TOURS } from '@/lib/onboarding/demo-tours';
import { demoTourFlagKey } from '@/lib/onboarding/flag-keys';

export function DemoTourMenu() {
    const t = useTranslator('demoTours');

    const { flags } = useOnboardingFlags();

    const { startTour, activeTour } = useDemoTour();

    return (
        <section
            data-tour="dashboard.tours"
            aria-labelledby="demo-tour-menu-title"
            className="rounded-lg border border-hud-gold/50 bg-hud-panel/80 p-3"
        >
            <div className="mb-2 flex items-start gap-2">
                <Compass
                    className="mt-0.5 size-4 shrink-0 text-hud-gold"
                    aria-hidden
                />
                <div>
                    <h2
                        id="demo-tour-menu-title"
                        className="hud-sc text-sm text-hud-ink"
                    >
                        {t('menuTitle')}
                    </h2>
                    <p className="text-xs text-hud-muted">
                        {t('menuDescription')}
                    </p>
                </div>
            </div>
            <ul className="grid grid-cols-1 gap-1">
                {DEMO_TOURS.map((tour) => {
                    const completed =
                        flags?.[demoTourFlagKey(tour.id)] === 'complete';

                    const starting = activeTour === tour.id;

                    return (
                        <li key={tour.id}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto min-h-9 w-full justify-start gap-2 px-2 py-1.5 text-left whitespace-normal"
                                onClick={() => startTour(tour.id)}
                                aria-label={`${t(tour.titleKey)} — ${completed ? t('restart') : t('start')}`}
                            >
                                {completed ? (
                                    <Check
                                        className="size-4 shrink-0 text-emerald-400"
                                        aria-hidden
                                    />
                                ) : (
                                    <Play
                                        className="size-4 shrink-0 text-hud-muted"
                                        aria-hidden
                                    />
                                )}
                                <span className="min-w-0 flex-1 truncate">
                                    {t(tour.titleKey)}
                                </span>
                                <span className="shrink-0 text-xs text-hud-muted">
                                    {starting
                                        ? t('starting')
                                        : completed
                                          ? t('completed')
                                          : t('notCompleted')}
                                </span>
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
