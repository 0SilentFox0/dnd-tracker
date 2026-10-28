import { BATTLE_COMMANDS } from "./battle-actions";

const base = "campaigns/[id]/battles";

const battle = `${base}/[battleId]`;

/** Coverage metadata only; T14 activates the executable catalog and transports together. */
export const BATTLE_ACTION_COVERAGE = [
  ["GET", base, "list"], ["POST", base, "create"], ["DELETE", base, "clear-history"],
  ["GET", battle, "get"], ["PATCH", battle, "patch"], ["DELETE", battle, "delete"],
  ["GET", `${base}/balance`, "balance.get"], ["POST", `${base}/balance`, "balance"],
  ["GET", `${battle}/audio`, "audio.get"], ["POST", `${battle}/audio`, "audio"],
  ["GET", `${battle}/events`, "events"], ["GET", `${battle}/summary`, "summary"],
  ["GET", "campaigns/active-battles", "active"],
  ...BATTLE_COMMANDS.map(operation => operation === "participants.patch"
    ? ["PATCH", `${battle}/participants/[participantId]`, operation]
    : ["POST", `${battle}/${operation}`, operation]),
].map(([method, route, operation]) => ({ method, route, actionId: `battles.${operation}`, testId: "battle-actions" }));
