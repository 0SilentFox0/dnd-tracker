
import { callerOf } from "./assistant-caller";
import { defineTool } from "./define";
import { toolRequestId } from "./request-key";

import "server-only";
import { proposeScenarioEditSchema } from "@/lib/schemas/ai";
import { dispatchAction } from "@/lib/server/assistant/execute";

export const proposeScenarioEditTool = defineTool({
  name: "propose_scenario_edit",
  scopes: ["scenario:write"],
  title: "Propose scenario edit",
  description:
    "Propose edits to a scenario page; the DM reviews and applies them. Never paste full rewritten rows into the chat — use this tool. Ops: replaceRow (story and/or notes; it replaces the WHOLE field, so to edit part of a row copy every other block — callouts, :::read, tables, ||secrets|| — verbatim from read_scenario_page; removing blocks is rejected unless allowRemoval: true and the DM explicitly asked), insertRow (afterRowId omitted = top of section), addSection (afterSectionId omitted = top of page), renameSection, createAcquaintance {ref, name, description?} (a micro NPC created on apply; ref is your own label), linkMentions {acquaintance: {ref} or {id}, forms, sectionId?, rowIds?, fields?} (the server turns every occurrence of the listed forms — all grammatical forms, e.g. Beatrice, Beatrice's — into mention chips in the story/notes; a capitalised form matches only a capitalised occurrence, so for names that are also common words (Hope, Rose) pass only capitalised forms). To mark a character in many places NEVER use replaceRow per row: first call find_scenario_mentions to collect the forms, then one createAcquaintance plus one linkMentions with those forms (use {id} for an existing acquaintance). Text uses the scenario markdown dialect: **bold**, _italic_, ||DM secret||, - lists, ### heading, :::read … ::: (read aloud), :::say … :::, :::callout kind=\"check\" tag=\"Check\" … :::, [@Name](character:id) and [@Name](acquaintance:id) mentions, {{token:red}}. Read the page first to get section and row ids.",
  input: proposeScenarioEditSchema,
  handler: (ctx, input) => dispatchAction(callerOf(ctx), { actionId: "scenario.propose-edit", input, requestId: toolRequestId(ctx) }, ctx.abortSignal),
});
