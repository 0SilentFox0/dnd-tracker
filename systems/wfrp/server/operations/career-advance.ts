import { careerAdvanceOperation } from "./career";

import { characterRoute } from "@/lib/server/characters/operation-runner";

export const POST = characterRoute(careerAdvanceOperation);
