import type { DemoTourId } from "@/lib/onboarding/flag-keys";

export type DemoTourPlacement = "top" | "bottom" | "left" | "right";

export type DemoTourStep = {
  id: string;
  route?: string;
  target: string;
  /** Navigate to the href of this anchor's link instead of a fixed route. */
  routeFromTarget?: string;
  /** Activate this anchor (click) before waiting for the target; missing anchor = no-op. */
  clickFromTarget?: string;
  /** Repeat the click until the target appears (bounded). */
  clickUntilTarget?: boolean;
  placement?: DemoTourPlacement;
  titleKey: string;
  descriptionKey: string;
};

export type DemoTourDefinition = {
  id: DemoTourId;
  startPath: string;
  titleKey: string;
  descriptionKey: string;
  steps: readonly DemoTourStep[];
};

type StepOptions = Partial<Pick<DemoTourStep, "route" | "routeFromTarget" | "clickFromTarget" | "clickUntilTarget" | "placement">> & { anchor?: string };

const step = (tour: DemoTourId, id: string, options: StepOptions = {}): DemoTourStep => {
  const { anchor, ...rest } = options;

  return {
    id,
    target: `[data-tour="${anchor ?? `${tour}.${id}`}"]`,
    titleKey: `steps.${tour}.${id}.title`,
    descriptionKey: `steps.${tour}.${id}.description`,
    ...rest,
  };
};

const tour = (id: DemoTourId, startPath: string, steps: readonly DemoTourStep[]): DemoTourDefinition => ({
  id,
  startPath,
  titleKey: `tours.${id}.title`,
  descriptionKey: `tours.${id}.description`,
  steps,
});

const BATTLES = "/dm/battles";

export const DEMO_TOURS: readonly DemoTourDefinition[] = [
  tour("dashboard", "", [
    step("dashboard", "header", { route: "" }),
    step("dashboard", "notice"),
    step("dashboard", "search"),
    step("dashboard", "group-game"),
    step("dashboard", "group-heroes"),
    step("dashboard", "group-libraries"),
    step("dashboard", "tours", { placement: "left" }),
    step("dashboard", "summary", { placement: "left" }),
  ]),
  tour("scenario", "/dm/scenario", [
    step("scenario", "search", { route: "/dm/scenario" }),
    step("scenario", "list"),
    step("scenario", "bar", { routeFromTarget: "scenario.open" }),
    step("scenario", "toc", { placement: "right" }),
    step("scenario", "section"),
    step("scenario", "bindings"),
    step("scenario", "notes", { placement: "left" }),
    step("scenario", "dock", { placement: "top" }),
  ]),
  tour("show", "/dm/show", [
    step("show", "decks", { route: "/dm/show" }),
    step("show", "deck-card"),
    step("show", "start"),
    step("show", "present"),
    step("show", "stage", { routeFromTarget: "show.present" }),
    step("show", "nav", { placement: "top" }),
    step("show", "back"),
    step("show", "header", { placement: "bottom" }),
  ]),
  tour("world", "/world", [
    step("world", "crumbs", { route: "/world" }),
    step("world", "map"),
    step("world", "marker"),
    step("world", "notes", { clickFromTarget: "world.marker", placement: "left" }),
    step("world", "open-map", { placement: "left" }),
    step("world", "zoom", { placement: "top" }),
    step("world", "places", { placement: "left" }),
    step("world", "journal", { placement: "left" }),
  ]),
  tour("music", "/dm/music", [
    step("music", "library", { route: "/dm/music" }),
    step("music", "play"),
    step("music", "source"),
    step("music", "battle", { route: BATTLES, anchor: "battle.open" }),
    step("music", "dock", { routeFromTarget: "battle.open", placement: "right" }),
    step("music", "transport", { clickFromTarget: "music.expand", placement: "right" }),
    step("music", "playlist", { placement: "right" }),
    step("music", "collapse", { clickFromTarget: "music.collapse", anchor: "music.expand", placement: "right" }),
  ]),
  tour("libraries", "/dm/spells", [
    step("libraries", "filters", { route: "/dm/spells" }),
    step("libraries", "search"),
    step("libraries", "group"),
    step("libraries", "level"),
    step("libraries", "card"),
    step("libraries", "print"),
    step("libraries", "dashboard", { route: "", anchor: "dashboard.group-libraries" }),
  ]),
  tour("battle", BATTLES, [
    step("battle", "list", { route: BATTLES }),
    step("battle", "card"),
    step("battle", "arena", { routeFromTarget: "battle.open" }),
    step("battle", "start"),
    step("battle", "topbar", { clickFromTarget: "battle.start" }),
    step("battle", "initiative"),
    step("battle", "hero", { placement: "right" }),
    step("battle", "map-tools"),
    step("battle", "map", { placement: "left" }),
    step("battle", "log", { placement: "left" }),
    step("battle", "next-turn"),
    step("battle", "turn-controls", { clickFromTarget: "battle.next-turn", clickUntilTarget: true, placement: "right" }),
    step("battle", "dm-actions", { clickFromTarget: "battle.dm-open", placement: "left" }),
    step("battle", "dm-participants", { placement: "left" }),
    step("battle", "audio", { clickFromTarget: "battle.dm-close", anchor: "music.dock", placement: "right" }),
    step("battle", "reset"),
  ]),
];
