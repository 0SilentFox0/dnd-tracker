"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Step } from "react-joyride";
import { usePathname, useRouter } from "next/navigation";

import { useSetOnboardingFlag } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import { DEMO_TOURS } from "@/lib/onboarding/demo-tours";
import { demoTourFlagKey, type DemoTourId } from "@/lib/onboarding/flag-keys";
import type { DemoTourRunnerProps } from "@/components/onboarding/DemoTourRunner";

const DemoTourRunner = dynamic<DemoTourRunnerProps>(() => import("@/components/onboarding/DemoTourRunner").then((module) => module.DemoTourRunner), { ssr: false });

const JOYRIDE = { COMPLETE: "complete", FINISHED: "finished", TOOLTIP: "tooltip", TOUR_END: "tour:end" } as const;

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

  const pathname = usePathname();

  const setFlag = useSetOnboardingFlag();

  const [activeTour, setActiveTour] = useState<DemoTourId | null>(null);

  const [run, setRun] = useState(false);

  const lastStepShown = useRef(false);

  const campaignPath = `/campaigns/${campaignId}`;

  const startTour = useCallback((id: DemoTourId) => {
    const tour = DEMO_TOURS.find((item) => item.id === id);

    if (!tour) return;

    lastStepShown.current = false;
    setActiveTour(id);

    const destination = `${campaignPath}${tour.startPath}`;

    if (!pathname.endsWith(destination)) router.push(destination);
    else setRun(true);
  }, [campaignPath, pathname, router]);

  const tour = activeTour ? DEMO_TOURS.find((item) => item.id === activeTour) : null;

  const steps = useMemo<Step[]>(() => tour?.steps.map((item) => ({
    id: `${tour.id}.${item.id}`,
    target: item.target,
    title: t(item.titleKey),
    content: t(item.descriptionKey),
    placement: "bottom",
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
        if (window.location.pathname.endsWith(destination) && document.querySelector(item.target)) return;

        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
    },
  })) ?? [], [campaignPath, router, t, tour]);

  const onEvent = useCallback((event: { action: string; type: string; index: number; status: string; step: { id?: string } }) => {
    if (activeTour && event.step.id && !event.step.id.startsWith(`${activeTour}.`)) return;

    if (event.type === JOYRIDE.TOOLTIP && event.index === steps.length - 1) lastStepShown.current = true;

    if (event.type === JOYRIDE.TOUR_END) {
      if (event.status === JOYRIDE.FINISHED && event.action === JOYRIDE.COMPLETE && lastStepShown.current && activeTour) {
        setFlag(demoTourFlagKey(activeTour), "complete");
      }

      lastStepShown.current = false;
      setRun(false);
      setActiveTour(null);
    }
  }, [activeTour, setFlag, steps.length]);

  const contextValue = useMemo(() => ({ startTour, activeTour }), [activeTour, startTour]);

  const isOnStartPath = tour ? pathname.endsWith(`${campaignPath}${tour.startPath}`) : false;

  useEffect(() => {
    if (activeTour && isOnStartPath) setRun(true);
  }, [activeTour, isOnStartPath]);

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
          locale={{ back: t("demoTours.controls.back"), close: t("demoTours.controls.close"), last: t("demoTours.controls.last"), next: t("demoTours.controls.next"), nextWithProgress: t("demoTours.controls.next"), skip: t("demoTours.controls.skip") }}
          options={{ buttons: ["back", "skip", "close", "primary"], closeButtonAction: "skip", dismissKeyAction: false, showProgress: true, targetWaitTimeout: 1000, overlayClickAction: false }}
        />
      )}
    </DemoTourContext.Provider>
  );
}
