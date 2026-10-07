const LEVELS = ["basic", "advanced", "expert"] as const;

const H5_BRANCH: Record<string, string> = {
  attack: "Attack",
  defense: "Defense",
  light: "LightMagic",
  dark: "DarkMagic",
  chaos: "DestructiveMagic",
  nature: "SummoningMagic",
  leadership: "Leadership",
};

function branchEntries(): [string, string][] {
  const entries: [string, string][] = [];

  for (const [key, h5] of Object.entries(H5_BRANCH)) {
    entries.push([key, `H5Basic${h5}.png`]);

    for (const level of LEVELS) entries.push([`${key}-${level}`, `H5${level[0].toUpperCase()}${level.slice(1)}${h5}.png`]);
  }

  // H5 has no archery skill line, only the perk icon
  entries.push(["ranged", "H5Archery.png"], ...LEVELS.map((l): [string, string] => [`ranged-${l}`, "H5Archery.png"]));

  return entries;
}

export const BRANCH_ICONS: Record<string, string> = Object.fromEntries(branchEntries());

const RACIAL_LEVELS = ["basic", "advanced", "expert", "ultimate"] as const;

const H5_RACIAL: Record<string, string> = {
  humans: "Counterstrike",
  demons: "Gating",
  elves: "Avenger",
  necromancers: "Necromancy",
  mages: "Artificer",
  "dark-elves": "IrresistibleMagic",
  dwarves: "Runelore",
};

const RACIAL_ICONS: [string, string][] = Object.entries(H5_RACIAL).flatMap(([race, h5]) =>
  RACIAL_LEVELS.map((level): [string, string] => [`racial-${race}-${level}`, `H5${level[0].toUpperCase()}${level.slice(1)}${h5}.png`]),
);

export const SKILL_ICONS: Record<string, string> = {
  "cleaving-strike": "H5ExcruciatingStrike.png",
  "stunning-strike": "H5StunningBlow.PNG",
  "armor-break": "H5PowerfulBlow.png",
  brutality: "H5BattleFrenzy.png",
  sequence: "H5ColdSteel.png",
  reward: "H5PowerofSpeed.png",
  zeal: "H5OffensiveFormation.png",
  "crippling-shot": "H5ImbueArrow.png",
  "piercing-bolt": "H5FlamingArrows.png",
  "deflecting-arrow": "H5Distract.png",
  bullseye: "H5DeadeyeShot.png",
  "arrow-cloud": "H5RainofArrows.png",
  "double-shot": "H5Tactics.png",
  "force-arrow": "H5ElvenLuck.png",
  endurance: "H5Vitality.png",
  resilience: "H5Resistance.png",
  guardian: "H5DefendUsAll.PNG",
  "last-stand": "H5LastStand.png",
  "magic-ward": "H5Protection.png",
  readiness: "H5Preparation.png",
  "thorn-armor": "H5ChillingBones.png",
  "righteous-wrath": "H5MasterofWrath.png",
  "granting-protection": "H5MasterofAbjuration.png",
  "granting-blessing": "H5MasterofBlessings.png",
  "eternal-light": "H5EternalLight.png",
  "divine-power": "H5RefinedMana.png",
  benediction: "H5GuardianAngel.png",
  "master-of-pain": "H5MasterofPain.png",
  "master-of-mind": "H5MasterofMind.png",
  "master-of-curses": "H5MasterofCurses.png",
  "deaths-march": "H5SealofDarkness.png",
  devourer: "H5ConsumeCorpse.png",
  "dark-master": "H5DarkRenewal.png",
  compensation: "H5ErraticMana.png",
  "master-of-storms": "H5MasterofStorms.png",
  "master-of-fire": "H5MasterofFire.png",
  "master-of-ice": "H5MasterofIce.png",
  "mana-burst": "H5ManaBurst.png",
  "infernal-power": "H5SecretsofDestruction.png",
  pyrokinesis: "H5Ignite.png",
  "fire-attack": "H5FieryWrath.png",
  "forest-lord": "H5MasterofEarthblood.png",
  "life-force": "H5MasterofLife.png",
  thorns: "H5RunicArmour.png",
  "call-of-the-beast": "H5MasterofConjuration.png",
  "natures-poison": "H5CorruptedSoil.png",
  "natures-wrath": "H5NaturesWrath.png",
  banish: "H5Banish.png",
  "chosen-elemental": "H5ElementalBalance.png",
  "eternal-warriors": "H5FireWarriors.png",
  "forest-roots": "H5FogVeil.png",
  "life-lord": "H5ArcaneBrilliance.png",
  empathy: "H5Empathy.png",
  restoration: "H5DivineGuidance.png",
  retribution: "H5Retribution.png",
  inspiration: "H5BattleCommander.png",
  vengeance: "H5HeraldOfDeath.PNG",
  success: "H5BattleElation.PNG",
  ...Object.fromEntries(RACIAL_ICONS),
};

export function iconBucket(key: string): "skill-icons" | "main-skill-icons" {
  return key in BRANCH_ICONS ? "main-skill-icons" : "skill-icons";
}

export function iconPublicUrl(supabaseUrl: string, key: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${iconBucket(key)}/${key}.webp`;
}
