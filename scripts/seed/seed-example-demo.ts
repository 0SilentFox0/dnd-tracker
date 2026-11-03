#!/usr/bin/env tsx
import type { Prisma } from "@prisma/client";

import { assertSeedTarget } from "./seed-library-lib";

import { DEMO_CAMPAIGN, DEMO_GM_NOTES, DEMO_IDS, DEMO_SCENE_CONTENT, DEMO_UNITS } from "@/data/example-demo-content";
import { CampaignKind } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { emptyMaze } from "@/lib/utils/battle/modes/maze/constants";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const MAPS = {
  world: "/example-demo/maps/world.jpg",
  alderwake: "/example-demo/maps/alderwake.jpg",
  grove: "/example-demo/maps/grove.jpg",
  vault: "/example-demo/maps/vault.jpg",
} as const;

const json = (value: unknown) => value as Prisma.InputJsonValue;

async function seed(userId: string) {
  const otherDemoCampaigns = await prisma.campaign.count({ where: { kind: CampaignKind.DEMO, id: { not: DEMO_IDS.campaign } } });

  if (otherDemoCampaigns > 0) {
    throw new Error(`Found ${otherDemoCampaigns} other Demo campaign(s); refusing to delete customer data.`);
  }

  const fields = {
    dmUserId: userId,
    ...DEMO_CAMPAIGN,
    maxLevel: 5,
    rules: json(DEFAULT_RULES),
    kind: CampaignKind.DEMO,
    visibility: "official",
    status: "active",
    locale: "en",
  };

  const campaign = await prisma.campaign.upsert({
    where: { id: DEMO_IDS.campaign },
    create: { id: DEMO_IDS.campaign, inviteCode: "EXAMPLE-DEMO-5E", ...fields },
    update: fields,
  });

  await prisma.$transaction(async (tx) => {
    // Demo-owned seed data is rebuilt as one transaction. Other campaign content is untouched.
    await tx.acquaintance.deleteMany({ where: { campaignId: campaign.id } });
    await tx.scenarioPage.deleteMany({ where: { campaignId: campaign.id } });
    await tx.slideDeck.deleteMany({ where: { campaignId: campaign.id } });
    await tx.battleScene.deleteMany({ where: { campaignId: campaign.id } });
    await tx.worldMap.deleteMany({ where: { campaignId: campaign.id } });
    await tx.campaignTrack.deleteMany({ where: { campaignId: campaign.id } });
    await tx.unit.deleteMany({ where: { campaignId: campaign.id } });

    await tx.unit.createMany({ data: DEMO_UNITS.map((unit) => ({ ...unit, campaignId: campaign.id, attacks: json(unit.attacks), statblock: json(unit.statblock) })) });

    await tx.character.upsert({
      where: { id: DEMO_IDS.characters.scout },
      create: { id: DEMO_IDS.characters.scout, campaignId: campaign.id, controlledBy: userId, type: "player", name: "Lark, trail scout", class: "Ranger", race: "Human", level: 3, strength: 10, dexterity: 16, constitution: 12, intelligence: 11, wisdom: 14, charisma: 10, armorClass: 14, initiative: 3, speed: 30 },
      update: { campaignId: campaign.id, controlledBy: userId, type: "player", name: "Lark, trail scout", class: "Ranger", race: "Human", level: 3, strength: 10, dexterity: 16, constitution: 12, intelligence: 11, wisdom: 14, charisma: 10, armorClass: 14, initiative: 3, speed: 30, status: "active" },
    });

    await tx.campaignTrack.create({ data: { id: DEMO_IDS.tracks.ambience, campaignId: campaign.id, title: "1 hour of Ambient Fantasy Music | Enchanted Forest", kind: "youtube", youtubeId: "uHD_AnjCRtc", url: "https://www.youtube.com/watch?v=uHD_AnjCRtc", sortOrder: 0 } });

    const world = await tx.worldMap.create({ data: { id: DEMO_IDS.maps.world, campaignId: campaign.id, name: "Briarwood and Alderwake", imageUrl: MAPS.world, width: 1398, height: 1080, fogEnabled: false, revealRadius: 1 } });

    const points = await Promise.all([
      tx.worldMarker.create({ data: { id: DEMO_IDS.markers.village, mapId: world.id, kind: "point", x: 0.22, y: 0.62, name: "Alderwake", icon: "home", alwaysVisible: true, sortOrder: 0, dmNote: "Ivo and Tamsin offer the first clues." } }),
      tx.worldMarker.create({ data: { id: DEMO_IDS.markers.grove, mapId: world.id, kind: "point", x: 0.56, y: 0.43, name: "Listening Grove", icon: "tree", alwaysVisible: true, sortOrder: 1, dmNote: "Three listening bowls guard the gate." } }),
      tx.worldMarker.create({ data: { id: DEMO_IDS.markers.vault, mapId: world.id, kind: "point", x: 0.82, y: 0.24, name: "Root Vault", icon: "mountain", alwaysVisible: true, sortOrder: 2, dmNote: "A shifting maze leads to the Warden." } }),
    ]);

    await tx.worldMarker.createMany({ data: [
      { id: DEMO_IDS.markers.zoneNorth, mapId: world.id, kind: "zone", x: 0.42, y: 0.2, polygon: json([[0.08, 0.12], [0.58, 0.08], [0.54, 0.34], [0.12, 0.4]]), name: "Northwood", color: "#52715a", sortOrder: 3, alwaysVisible: true },
      { id: DEMO_IDS.markers.zoneSouth, mapId: world.id, kind: "zone", x: 0.48, y: 0.73, polygon: json([[0.1, 0.57], [0.48, 0.52], [0.64, 0.88], [0.16, 0.91]]), name: "Silver Creek", color: "#82a69a", sortOrder: 4, alwaysVisible: true },
    ] });
    for (const [index, marker] of points.entries()) {
      const [name, imageUrl] = [["Alderwake", MAPS.alderwake], ["Listening Grove", MAPS.grove], ["Root Vault", MAPS.vault]][index] as [string, string];

      const dimensions = [[736, 823], [3000, 3256], [613, 792]][index] as [number, number];

      await tx.worldMap.create({ data: { id: [DEMO_IDS.maps.alderwake, DEMO_IDS.maps.grove, DEMO_IDS.maps.vault][index], campaignId: campaign.id, parentMarkerId: marker.id, name, imageUrl, width: dimensions[0], height: dimensions[1], fogEnabled: false } });
    }

    const groveMap = { cols: 20, rows: 12, background: MAPS.grove, opacity: 0.35 };

    const mazeMap = { cols: 20, rows: 12, background: MAPS.vault, opacity: 0.35, maze: { ...emptyMaze("medium"), exit: { x: 18, y: 6 }, walls: ["3:0:e", "3:1:e", "3:2:e", "3:3:e", "6:4:e", "6:5:e", "6:6:e", "10:1:s", "11:1:s", "12:1:s", "13:1:s", "14:7:e", "14:8:e", "14:9:e"], teleports: [[{ x: 5, y: 10 }, { x: 16, y: 2 }]], fog: ["8:5", "8:6"], dark: false } };

    await tx.battleScene.createMany({ data: [
      { id: DEMO_IDS.battles.grove, campaignId: campaign.id, name: "Briar Warden at the Listening Grove", description: "A standard encounter: silence the damaged fork, defend the clearing, or calm the guardian.", status: "prepared", participants: json([{ id: "demo-ally-scout", type: "unit", side: "ally" }, { id: "demo-ally-bellkeeper", type: "unit", side: "ally" }, { id: "demo-ally-mage", type: "unit", side: "ally" }, { id: "demo-ally-guard", type: "unit", side: "ally" }, { id: "demo-unit-briar-warden", type: "unit", side: "enemy" }, { id: "demo-unit-rootling", type: "unit", side: "enemy", quantity: 2 }]), map: json(groveMap), rules: json(DEFAULT_RULES) },
      { id: DEMO_IDS.battles.maze, campaignId: campaign.id, name: "The Root Vault Labyrinth", description: "A maze-mode encounter with a marked exit, echo passages and two linked teleports.", status: "prepared", participants: json([{ id: "demo-ally-scout", type: "unit", side: "ally" }, { id: "demo-ally-bellkeeper", type: "unit", side: "ally" }, { id: "demo-ally-mage", type: "unit", side: "ally" }, { id: "demo-ally-guard", type: "unit", side: "ally" }, { id: "demo-unit-briar-warden", type: "unit", side: "enemy" }]), map: json(mazeMap), rules: json(DEFAULT_RULES) },
    ] });

    const pageRows = [
      { id: DEMO_IDS.pages.scene, campaignId: campaign.id, kind: "scene", arc: "The Bell Beneath Briarwood", title: "The Bell Beneath Briarwood", subtitle: "A 5e adventure of listening, roots and second chances", status: "ready", sortOrder: 0, content: json(DEMO_SCENE_CONTENT), searchText: "Alderwake Ivo Tamsin listening grove three bowls Briar Warden maze Root Vault" },
      { id: DEMO_IDS.pages.notes, campaignId: campaign.id, kind: "note", arc: "The Bell Beneath Briarwood", title: "GM notes · running the one-shot", subtitle: "Pacing, NPC cues and alternate outcomes", status: "ready", sortOrder: 1, content: json(DEMO_GM_NOTES), searchText: "GM notes NPC pacing Warden outcomes" },
    ];

    await tx.scenarioPage.createMany({ data: pageRows });
    await tx.slideDeck.create({ data: { id: DEMO_IDS.deck, campaignId: campaign.id, title: "Listening Grove · music and map", scenarioPageId: DEMO_IDS.pages.scene, slides: json([
      { id: "grove-slide", imageUrl: MAPS.grove, title: "The listening bowls", caption: "Sound the notes: droplet, leaf, mountain.", trackId: DEMO_IDS.tracks.ambience },
      { id: "grove-puzzle", imageUrl: MAPS.grove, title: "Three-tone gate", kind: "puzzle", puzzle: { cut: "organic", count: 12, seed: 5321, imageWidth: 3000, imageHeight: 3256 }, trackId: DEMO_IDS.tracks.ambience },
    ]) } });
    await tx.acquaintance.createMany({ data: [
      { id: DEMO_IDS.acquaintances.mara, campaignId: campaign.id, kind: "npc", name: "Mara Venn", description: "A patient trail keeper who can read the old listening marks.", sourcePageId: DEMO_IDS.pages.scene, sourceSectionId: DEMO_IDS.sections.grove },
      { id: DEMO_IDS.acquaintances.ivo, campaignId: campaign.id, kind: "npc", name: "Ivo Pell", description: "A blunt, kind bellmaker who knows the old three-note rhyme.", sourcePageId: DEMO_IDS.pages.scene, sourceSectionId: DEMO_IDS.sections.village },
      { id: DEMO_IDS.acquaintances.tamsin, campaignId: campaign.id, kind: "npc", name: "Tamsin Reed", description: "An eager courier who saw lanterns move against the wind.", sourcePageId: DEMO_IDS.pages.scene, sourceSectionId: DEMO_IDS.sections.village },
    ] });

  });

  console.info(`Seeded one shared Demo campaign: ${campaign.id}`);
}

async function main() {
  const userId = process.argv[2];

  const allowRemote = process.argv.includes("--allow-remote");

  const expectedHost = process.argv.find((arg) => arg.startsWith("--expected-host="))?.slice("--expected-host=".length);

  if (!userId) throw new Error("Usage: pnpm seed:example-demo <existing-user-id> [--allow-remote --expected-host=<production-db-host>]");

  const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  if (allowRemote && (process.env.VERCEL_ENV !== "production" || !expectedHost || host !== expectedHost)) {
    throw new Error("Remote seeding requires Vercel production environment and an exact --expected-host match.");
  }

  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) throw new Error(`User ${userId} does not exist`);

  console.info(`${allowRemote ? "Production" : "Local"} database: ${host}`);
  await seed(userId);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
