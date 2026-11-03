"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Step } from "react-joyride";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { DemoTourRunnerProps } from "@/components/onboarding/DemoTourRunner";
import { DemoTourTooltip } from "@/components/onboarding/DemoTourTooltip";
import { useSetOnboardingFlag } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import { DEMO_TOURS } from "@/lib/onboarding/demo-tours";
import { demoTourFlagKey, type DemoTourId } from "@/lib/onboarding/flag-keys";

const DemoTourRunner = dynamic<DemoTourRunnerProps>(() => import("@/components/onboarding/DemoTourRunner").then((module) => module.DemoTourRunner), { ssr: false });

const JOYRIDE = { FINISHED: "finished", TOOLTIP: "tooltip", TOUR_END: "tour:end" } as const;

// запас під тултіп: якщо ціль + тултіп не вміщаються у вікно, крок центруємо
const TOOLTIP_ROOM_PX = 220;

// темний UI: 50% дефолтного оверлею не виділяє ціль, тому затемнення сильніше + золота рамка вирізу
const TOUR_STYLES: DemoTourRunnerProps["styles"] = { overlay: { backgroundColor: "rgba(0, 0, 0, 0.78)" }, spotlight: { stroke: "var(--color-hud-gold-strong)", strokeWidth: 2 } };

type DemoTourContextValue = { startTour(id: DemoTourId): void; activeTour: DemoTourId | null };

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function useDemoTour() {
  const context = useContext(DemoTourContext);

  if (!context) throw new Error("useDemoTour must be used inside DemoTourCoordinator");

  return context;
}

export function DemoTourCoordinator({ campaignId, children }: { campaignId: string; children: ReactNode }) {
  const t = useTranslator("onboarding");

  const router = useRouter();

  const setFlag = useSetOnboardingFlag();

  const [activeTour, setActiveTour] = useState<DemoTourId | null>(null);

  const [run, setRun] = useState(false);

  const lastStepShown = useRef(false);

  // цілі на весь екран (сцена бою, довгі списки): прив'язаний тултіп вилітає за вікно — такі кроки центруємо
  const [centeredSteps, setCenteredSteps] = useState<ReadonlySet<string>>(() => new Set());

  const campaignPath = `/campaigns/${campaignId}`;

  const startTour = useCallback((id: DemoTourId) => {
    if (!DEMO_TOURS.some((item) => item.id === id)) return;

    lastStepShown.current = false;
    setCenteredSteps(new Set());
    setActiveTour(id);
    setRun(true);
  }, []);

  const tour = activeTour ? DEMO_TOURS.find((item) => item.id === activeTour) : null;

  const steps = useMemo<Step[]>(() => tour?.steps.map((item) => ({
    id: `${tour.id}.${item.id}`,
    target: item.target,
    title: t(item.titleKey),
    content: t(item.descriptionKey),
    placement: centeredSteps.has(item.id) ? "center" : "bottom",
    beforeTimeout: 5000,
    before: async () => {
      let destination = item.route ? `${campaignPath}${item.route}` : window.location.pathname;

      if (item.routeFromTarget) {
        const source = document.querySelector(`[data-tour="${item.routeFromTarget}"]`);

        const anchor = source instanceof HTMLAnchorElement ? source : source?.closest("a");

        if (!(anchor instanceof HTMLAnchorElement)) return;

        destination = new URL(anchor.href).pathname;
      }

      if (!window.location.pathname.endsWith(destination)) router.push(destination);

      const deadline = Date.now() + 4300;

      while (Date.now() < deadline) {
        const target = window.location.pathname.endsWith(destination) ? document.querySelector(item.target) : null;

        if (target) {
          if (target.getBoundingClientRect().height > window.innerHeight - TOOLTIP_ROOM_PX) setCenteredSteps((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));

          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
    },
  })) ?? [], [campaignPath, centeredSteps, router, t, tour]);

  const onEvent = useCallback((event: { action: string; type: string; index: number; status: string; step: { id?: string } }) => {
    if (activeTour && event.step.id && !event.step.id.startsWith(`${activeTour}.`)) return;

    if (event.type === JOYRIDE.TOOLTIP && event.index === steps.length - 1) lastStepShown.current = true;

    if (event.type === JOYRIDE.TOUR_END) {
      if (event.status === JOYRIDE.FINISHED && lastStepShown.current && activeTour) {
        setFlag(demoTourFlagKey(activeTour), "complete");
      }

      lastStepShown.current = false;
      setRun(false);
      setActiveTour(null);
    }
  }, [activeTour, setFlag, steps.length]);

  const contextValue = useMemo(() => ({ startTour, activeTour }), [activeTour, startTour]);

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
          locale={{ back: t("demoTours.controls.back"), close: t("demoTours.controls.close"), last: t("demoTours.controls.last"), next: t("demoTours.controls.next"), nextWithProgress: t("demoTours.controls.next"), skip: t("demoTours.controls.skip") }}
          options={{ buttons: ["back", "skip", "close", "primary"], closeButtonAction: "skip", dismissKeyAction: false, showProgress: true, skipBeacon: true, spotlightPadding: 8, spotlightRadius: 10, arrowColor: "var(--color-hud-gold-strong)", targetWaitTimeout: 1000, overlayClickAction: false }}
        />
      )}
    </DemoTourContext.Provider>
  );
}
