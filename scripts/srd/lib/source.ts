import * as path from "path";

export const OPEN5E_REPO = "open5e/open5e-api";

export const OPEN5E_SHA = "e69ac13b49dae6a9d84abf38fc674fe1db5b392b";

export const OPEN5E_PATH = "data/v2/wizards-of-the-coast/srd-2024";

export const OPEN5E_FILES = {
  Document: "1be9b6dd22edfdfcff011667582eadaa",
  CharacterClass: "96808072805a3f4fd7b481c3cc5686b1",
  ClassFeature: "0ad7eb8dfdf0a52bd3f820a08bf91b71",
  ClassFeatureItem: "7b03db59a168a39dac5a89bd96674014",
  Species: "6e4e6727222a17e7265f138d285cba09",
  SpeciesTrait: "1c72e4b25d6bd35067eb92d39df0ce9c",
  Spell: "7dc8262eed2abc9b01aa26f13c1d45c4",
  SpellCastingOption: "414ec1f52cb4ed09a7e37328e60d6f13",
  Creature: "240d057d5eb325c3b5aac355bc8ee6e1",
  CreatureAction: "9d2d30a28f96a2cb35fd5664a67b07c9",
  CreatureActionAttack: "f9b09865c7af03f6167fd802b50091a8",
  CreatureTrait: "bee89cdde4d568cbd4e1b4c3455f5cbd",
  Weapon: "76ce1580250ca8bb85ab78753e1e214f",
  WeaponProperty: "a2f1957ec73e1425b3c08be2660d9afa",
  WeaponPropertyAssignment: "4a0fb2f1821dc2a1f5b906fca5573621",
  Armor: "8e030b74c8a06cb40a3f924565dc59d6",
  Item: "4f02971a31a32db793e357d3cd0624c8",
  MagicItem: "bb43403c17dea6aebed685d3626fdf14",
  Feat: "00522a4edd44236cc9dd6d95775d930b",
  FeatBenefit: "515b253cb2e00aba2c7886115cb043c7",
} as const;

export type Open5eFile = keyof typeof OPEN5E_FILES;

export const open5eUrl = (file: Open5eFile) => `https://raw.githubusercontent.com/${OPEN5E_REPO}/${OPEN5E_SHA}/${OPEN5E_PATH}/${file}.json`;

export const SRD_DATA_DIR = path.join(process.cwd(), "data", "templates", "srd-5.2");
