import type { DemoTourId } from "@/lib/onboarding/flag-keys";

export type DemoTourStep = {
  id: string;
  route?: string;
  target: string;
  routeFromTarget?: string;
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

const step = (tour: DemoTourId, id: string, route: string): DemoTourStep => ({
  id,
  route,
  target: `[data-tour="${tour}.${id}"]`,
  titleKey: `demoTours.steps.${tour}.${id}.title`,
  descriptionKey: `demoTours.steps.${tour}.${id}.description`,
});

export const DEMO_TOURS: readonly DemoTourDefinition[] = [
  { id: "dashboard", startPath: "", titleKey: "demoTours.tours.dashboard.title", descriptionKey: "demoTours.tours.dashboard.description", steps: [step("dashboard", "navigation", ""), step("dashboard", "search", "")] },
  { id: "scenario", startPath: "/dm/scenario", titleKey: "demoTours.tours.scenario.title", descriptionKey: "demoTours.tours.scenario.description", steps: [step("scenario", "list", "/dm/scenario"), { ...step("scenario", "read", "/dm/scenario"), routeFromTarget: "scenario.open" }, { ...step("scenario", "playback", "/dm/scenario"), route: undefined }] },
  { id: "show", startPath: "/dm/show", titleKey: "demoTours.tours.show.title", descriptionKey: "demoTours.tours.show.description", steps: [step("show", "decks", "/dm/show"), step("show", "present", "/dm/show"), { ...step("show", "preview", "/dm/show"), route: undefined, routeFromTarget: "show.present" }] },
  { id: "world", startPath: "/world", titleKey: "demoTours.tours.world.title", descriptionKey: "demoTours.tours.world.description", steps: [step("world", "map", "/world"), step("world", "controls", "/world")] },
  { id: "music", startPath: "/dm/music", titleKey: "demoTours.tours.music.title", descriptionKey: "demoTours.tours.music.description", steps: [step("music", "groups", "/dm/music"), step("music", "player", "/dm/music")] },
  { id: "libraries", startPath: "/dm/skills", titleKey: "demoTours.tours.libraries.title", descriptionKey: "demoTours.tours.libraries.description", steps: [step("libraries", "browse", "/dm/skills"), step("libraries", "search", "/dm/skills"), { ...step("libraries", "detail", "/dm/skills"), routeFromTarget: "libraries.open" }] },
  { id: "battle", startPath: "/dm/battles", titleKey: "demoTours.tours.battle.title", descriptionKey: "demoTours.tours.battle.description", steps: [step("battle", "list", "/dm/battles"), { ...step("battle", "scene", "/dm/battles"), routeFromTarget: "battle.open" }] },
];
