'use client';

import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { Step } from 'react-joyride';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import type { DemoTourRunnerProps } from '@/components/onboarding/DemoTourRunner';
import { DemoTourTooltip } from '@/components/onboarding/DemoTourTooltip';
import { resetPlayerViews, useScrollLock } from '@/lib/hooks/common';
import { useSetOnboardingFlag } from '@/lib/hooks/onboarding';
import { useTranslator } from '@/lib/i18n/use-translator';
import { setActiveDemoTour } from '@/lib/onboarding/active-demo-tour';
import { DEMO_TOURS } from '@/lib/onboarding/demo-tours';
import { demoTourFlagKey, type DemoTourId } from '@/lib/onboarding/flag-keys';
import {
    prepareTourStep,
    SCROLL_OFFSET_PX,
    stepWait,
} from '@/lib/utils/onboarding/demo-tour-dom';

const DemoTourRunner = dynamic<DemoTourRunnerProps>(
    () =>
        import('@/components/onboarding/DemoTourRunner').then(
            (module) => module.DemoTourRunner
        ),
    { ssr: false }
);

const JOYRIDE = {
    FINISHED: 'finished',
    TOOLTIP: 'tooltip',
    TOUR_END: 'tour:end',
} as const;

const TOUR_STYLES: DemoTourRunnerProps['styles'] = {
    overlay: { backgroundColor: 'rgba(0, 0, 0, 0.78)' },
    spotlight: { stroke: 'var(--color-hud-gold-strong)', strokeWidth: 2 },
};

type DemoTourContextValue = {
    startTour(id: DemoTourId): void;
    activeTour: DemoTourId | null;
};

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function useDemoTour() {
    const context = useContext(DemoTourContext);

    if (!context)
        throw new Error('useDemoTour must be used inside DemoTourCoordinator');

    return context;
}

export function DemoTourCoordinator({
    campaignId,
    children,
}: {
    campaignId: string;
    children: ReactNode;
}) {
    const t = useTranslator('demoTours');

    const router = useRouter();

    const setFlag = useSetOnboardingFlag();

    const [activeTour, setActiveTour] = useState<DemoTourId | null>(null);

    const [run, setRun] = useState(false);

    useEffect(() => {
        setActiveDemoTour(run ? activeTour : null);

        return () => setActiveDemoTour(null);
    }, [run, activeTour]);

    useScrollLock(run, '[data-joyride-step]');

    const lastStepShown = useRef(false);

    const [centeredSteps, setCenteredSteps] = useState<ReadonlySet<string>>(
        () => new Set()
    );

    const campaignPath = `/campaigns/${campaignId}`;

    const startTour = useCallback((id: DemoTourId) => {
        if (!DEMO_TOURS.some((item) => item.id === id)) return;

        resetPlayerViews();
        lastStepShown.current = false;
        setCenteredSteps(new Set());
        setActiveTour(id);
        setRun(true);
    }, []);

    const tour = activeTour
        ? DEMO_TOURS.find((item) => item.id === activeTour)
        : null;

    const steps = useMemo<Step[]>(
        () =>
            tour?.steps.map((item) => ({
                id: `${tour.id}.${item.id}`,
                target: item.target,
                title: t(item.titleKey),
                content: t(item.descriptionKey),
                placement: centeredSteps.has(item.id)
                    ? 'center'
                    : (item.placement ?? 'bottom'),
                beforeTimeout: stepWait(item),
                before: () =>
                    prepareTourStep(item, {
                        campaignPath,
                        push: router.push,
                        onTall: (id) =>
                            setCenteredSteps((prev) =>
                                prev.has(id) ? prev : new Set(prev).add(id)
                            ),
                    }),
            })) ?? [],
        [campaignPath, centeredSteps, router, t, tour]
    );

    const onEvent = useCallback(
        (event: {
            action: string;
            type: string;
            index: number;
            status: string;
            step: { id?: string };
        }) => {
            if (
                activeTour &&
                event.step.id &&
                !event.step.id.startsWith(`${activeTour}.`)
            )
                return;

            if (
                event.type === JOYRIDE.TOOLTIP &&
                event.index === steps.length - 1
            )
                lastStepShown.current = true;

            if (event.type === JOYRIDE.TOUR_END) {
                if (
                    event.status === JOYRIDE.FINISHED &&
                    lastStepShown.current &&
                    activeTour
                ) {
                    setFlag(demoTourFlagKey(activeTour), 'complete');
                }

                lastStepShown.current = false;
                setRun(false);
                setActiveTour(null);
            }
        },
        [activeTour, setFlag, steps.length]
    );

    const contextValue = useMemo(
        () => ({ startTour, activeTour }),
        [activeTour, startTour]
    );

    return (
        <DemoTourContext.Provider value={contextValue}>
            {children}
            {tour && (
                <DemoTourRunner
                    run={run}
                    steps={steps}
                    continuous
                    scrollToFirstStep
                    onEvent={onEvent}
                    tooltipComponent={DemoTourTooltip}
                    styles={TOUR_STYLES}
                    locale={{
                        back: t('controls.back'),
                        close: t('controls.close'),
                        last: t('controls.last'),
                        next: t('controls.next'),
                        nextWithProgress: t('controls.next'),
                        skip: t('controls.skip'),
                    }}
                    options={{
                        buttons: ['back', 'skip', 'close', 'primary'],
                        closeButtonAction: 'skip',
                        dismissKeyAction: false,
                        showProgress: true,
                        skipBeacon: true,
                        spotlightPadding: 8,
                        spotlightRadius: 10,
                        arrowColor: 'var(--color-hud-gold-strong)',
                        targetWaitTimeout: 3000,
                        overlayClickAction: false,
                        scrollOffset: SCROLL_OFFSET_PX,
                    }}
                />
            )}
        </DemoTourContext.Provider>
    );
}
