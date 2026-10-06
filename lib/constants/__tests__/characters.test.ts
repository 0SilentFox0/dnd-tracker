import { describe, expect, it } from "vitest";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterType } from "@/lib/constants/characters";

describe("stored domain values", () => {
  it("character type values match the DB", () => {
    expect(CharacterType.PLAYER).toBe("player");
    expect(CharacterType.NPC_HERO).toBe("npc_hero");
  });

  it("participant source values match snapshots and API payloads", () => {
    expect(ParticipantSourceType.CHARACTER).toBe("character");
    expect(ParticipantSourceType.UNIT).toBe("unit");
  });

  it("campaign role values match campaign_members.role", () => {
    expect(CampaignRole.DM).toBe("dm");
    expect(CampaignRole.PLAYER).toBe("player");
  });
});
