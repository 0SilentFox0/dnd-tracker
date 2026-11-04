import { describe, expect, it } from "vitest";

import { DEMO_TOURS } from "@/lib/onboarding/demo-tours";
import english from "@/messages/en/onboarding.json";
import ukrainian from "@/messages/uk/onboarding.json";

describe("demo visual tours", () => {
  it("defines all seven independently launchable flows with stable, unique targets", () => {
    expect(DEMO_TOURS.map(({ id }) => id)).toEqual(["dashboard", "scenario", "show", "world", "music", "libraries", "battle"]);

    const targets = DEMO_TOURS.flatMap((tour) => tour.steps.map((step) => step.target));

    expect(new Set(targets).size).toBe(targets.length);
    expect(DEMO_TOURS.every((tour) => tour.steps.length > 0)).toBe(true);
  });

  it("keeps steps on the destination route after a tour has navigated there", () => {
    const scenario = DEMO_TOURS.find((tour) => tour.id === "scenario")!;

    const show = DEMO_TOURS.find((tour) => tour.id === "show")!;

    expect(scenario.steps[1].routeFromTarget).toBe("scenario.open");
    expect(scenario.steps[2].route).toBeUndefined();
    expect(show.steps[2].routeFromTarget).toBe("show.present");
    expect(show.steps[2].route).toBeUndefined();
  });

  it("provides every tour and step string in both supported locales", () => {
    for (const messages of [english.demoTours, ukrainian.demoTours] as const) {
      const lookup = (...keys: string[]) => keys.reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, messages);

      for (const tour of DEMO_TOURS) {
        const [, , id, field] = tour.titleKey.split(".");

        expect(lookup("tours", id, field)).toBeTruthy();
        for (const item of tour.steps) {
          const [, , stepTourId, stepId, key] = item.titleKey.split(".");

          expect(lookup("steps", stepTourId, stepId, key)).toBeTruthy();

          const descriptionKey = item.descriptionKey.split(".").at(-1)!;

          expect(lookup("steps", stepTourId, stepId, descriptionKey)).toBeTruthy();
        }
      }
      for (const control of ["next", "back", "skip", "close", "last"] as const) expect(lookup("controls", control)).toBeTruthy();
    }
  });
});
