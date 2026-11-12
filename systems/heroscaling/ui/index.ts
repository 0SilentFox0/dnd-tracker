import { HeroScalingSection } from "./HeroScalingSection";

import type { SystemUi } from "@/components/systems/types";
import { defineAddon } from "@/lib/utils/rules/systems/compose";

export const HEROSCALING_MODULE_UI = defineAddon<SystemUi>(() => ({ rulesSections: { heroScaling: HeroScalingSection } }));
