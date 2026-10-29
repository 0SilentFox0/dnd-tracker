import type { NameTable } from "./names-table";

export const NAME_TABLES_EN: NameTable[] = [
  { id: "orc", match: /orc|stronghold/i, first: ["Gra", "Ur", "Tor", "Mag", "Zug", "Kra"], second: ["sh", "ak", "gol", "rug", "nar", "zog"] },
  { id: "darkElf", match: /dark.*elf|elf.*dark|dungeon|underground|drow/i, first: ["Lis", "Raven", "Shad", "Mal", "Zir", "Niv"], second: ["endra", "ara", "ix", "irel", "avrin", "itra"] },
  { id: "elf", match: /elf|elv|sylvan/i, first: ["El", "Lira", "En", "Fa", "Si", "Tal"], second: ["ranil", "dir", "vael", "morin", "ilas", "endil"] },
  { id: "dwarf", match: /gnome|dwarf|dwarv|fortress/i, first: ["Bru", "Tor", "Dur", "Gim", "Kra", "Bal"], second: ["ngar", "in", "rik", "dum", "bor", "halm"] },
  { id: "undead", match: /undead|necro|dead/i, first: ["Mor", "Az", "Vor", "Nek", "Mal", "Gra"], second: ["tagor", "rahil", "dret", "us", "ahar", "zabet"] },
  { id: "demon", match: /demon|inferno|hell/i, first: ["Mal", "Zag", "Bal", "Az", "Ker", "Var"], second: ["gar", "mok", "izar", "zul", "rat", "ax"] },
  { id: "mage", match: /mage|academy|wizard/i, first: ["Ra", "Ze", "Sol", "Nika", "Ota", "Dan"], second: ["ziel", "hir", "mir", "ren", "lias", "bar"] },
  { id: "human", match: /human|knight|order|haven/i, first: ["Godr", "Alen", "Isabel", "Rich", "Wilm", "Mar"], second: ["ic", "ard", "la", "en", "in", "us"] },
];

export const GENERIC_EN: NameTable = { id: "generic", match: /./, first: ["Ar", "Bel", "Dor", "Kal", "Ven", "Tar"], second: ["ion", "an", "ek", "ora", "is", "gen"] };
