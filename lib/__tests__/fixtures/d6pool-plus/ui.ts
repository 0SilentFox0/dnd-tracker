import type { SystemUi } from "@/components/systems/types";
import type { AddonBuilder } from "@/lib/utils/rules/systems/compose";

const Section = () => null;

export const D6POOL_PLUS_UI: AddonBuilder<SystemUi> = () => ({ rulesSections: { initiative: Section } });
