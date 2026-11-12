import type { ParticipantPart } from "@/lib/utils/rules/systems/types";

export const moraleCapPart: ParticipantPart<object> = (p, { rules }) => ({ ...p, abilities: { ...p.abilities, moraleCap: rules.morale.enabled ? rules.morale.cap : 0 } });
