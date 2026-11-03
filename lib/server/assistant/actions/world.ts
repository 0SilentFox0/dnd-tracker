import { z } from "zod";

import type { AssistantActionDef } from "../types";
import { prepareWorldAction, runWorldAction,WORLD_ACTION_INPUTS, type WorldOperation } from "./world-service";

import "server-only";

const writeActions: AssistantActionDef[] = (Object.keys(WORLD_ACTION_INPUTS) as WorldOperation[]).map((operation): AssistantActionDef => ({
  id: `world.${operation}`,
  title: `World map: ${operation}`,
  description: "Map, marker, note, and party-travel operations for the current campaign. Writes use the configured review policy; destructive and movement operations always require human confirmation.",
  input: WORLD_ACTION_INPUTS[operation],
  need: { access: "dm", scope: "world:write" },
  effect: "write",
  confirmation: ["maps.delete", "markers.delete", "travel", "enter", "exit", "rest"].includes(operation) ? "always" : "standard",
  prepare: (caller, input) => prepareWorldAction(caller, operation, input),
  execute: (ctx, input) => runWorldAction(ctx, operation, input),
}));

export const WORLD_ACTIONS: readonly AssistantActionDef[] = [...writeActions, {
  id: "world.maps.upload-handoff",
  title: "Upload a world map image",
  description: "Opens the world-map editor to upload an image. MCP clients do not send map image files through this action.",
  input: z.strictObject({}),
  need: { access: "dm", scope: "world:write" },
  effect: "handoff",
  execute: async caller => ({ href: `/campaigns/${encodeURIComponent(caller.actor.campaignId)}/dm/world`, reason: "Upload the map image in the app, then create the map with world_action." }),
}];
