import { compendiumRoute } from "@/lib/server/compendium-import/http";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = compendiumRoute("media");
