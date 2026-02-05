import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      characters: { take: 5 },
      units: { take: 5 },
    },
  });

  if (campaigns.length === 0) {
    console.log("No campaigns found.");

    return;
  }

  const campaign = campaigns[0];

  console.log(`Using campaign: ${campaign.name} (${campaign.id})`);

  // Створюємо зброю для героїв
  const weapon = await prisma.artifact.upsert({
    where: { id: "mock-sword" },
    update: {},
    create: {
      id: "mock-sword",
      campaignId: campaign.id,
      name: "Срібний меч",
      slot: "weapon",
      bonuses: { attack: 2 },
      modifiers: [
        { type: "damage_dice", value: "1d8+2" },
        { type: "damage_type", value: "slash" },
        { type: "attack_type", value: "melee" },
      ],
    },
  });

  const participants = [];

  // Add characters
  for (const char of campaign.characters) {
    // Екіпіруємо зброю
    await prisma.characterInventory.upsert({
      where: { characterId: char.id },
      update: {
        equipped: { weapon: weapon.id },
      },
      create: {
        characterId: char.id,
        equipped: { weapon: weapon.id },
      },
    });

    // Встановлюємо мораль
    await prisma.character.update({
      where: { id: char.id },
      data: { morale: 2 },
    });

    participants.push({
      id: char.id,
      type: "character",
      side: "ally",
    });
  }

  // Add units as enemies
  for (const unit of campaign.units) {
    // Встановлюємо мораль для юнітів (негативну для тесту)
    await prisma.unit.update({
      where: { id: unit.id },
      data: {
        morale: -1,
        attacks: [
          {
            name: "Удар іклом",
            attackBonus: 4,
            damageDice: "1d6+2",
            damageType: "pierce",
            type: "melee",
          },
        ],
      },
    });

    participants.push({
      id: unit.id,
      type: "unit",
      side: "enemy",
      quantity: 1,
    });
  }

  const mockBattle = await prisma.battleScene.create({
    data: {
      campaignId: campaign.id,
      name: "Mock Test Battle",
      description: "A battle generated for testing the edit page",
      status: "prepared",
      participants: participants,
      currentRound: 1,
      currentTurnIndex: 0,
      initiativeOrder: [],
      battleLog: [],
    },
  });

  console.log(`Mock battle created: ${mockBattle.name} (${mockBattle.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
