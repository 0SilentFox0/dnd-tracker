import type { NameTable } from "./names-table";

export const NAME_TABLES_EN: NameTable[] = [
  { match: /orc|stronghold/i, first: ["Gra", "Ur", "Tor", "Mag", "Zug", "Kra"], second: ["sh", "ak", "gol", "rug", "nar", "zog"] },
  { match: /dark.*elf|elf.*dark|dungeon|underground|drow/i, first: ["Lis", "Raven", "Shad", "Mal", "Zir", "Niv"], second: ["endra", "ara", "ix", "irel", "avrin", "itra"] },
  { match: /elf|elv|sylvan/i, first: ["El", "Lira", "En", "Fa", "Si", "Tal"], second: ["ranil", "dir", "vael", "morin", "ilas", "endil"] },
  { match: /gnome|dwarf|dwarv|fortress/i, first: ["Bru", "Tor", "Dur", "Gim", "Kra", "Bal"], second: ["ngar", "in", "rik", "dum", "bor", "halm"] },
  { match: /undead|necro|dead/i, first: ["Mor", "Az", "Vor", "Nek", "Mal", "Gra"], second: ["tagor", "rahil", "dret", "us", "ahar", "zabet"] },
  { match: /demon|inferno|hell/i, first: ["Mal", "Zag", "Bal", "Az", "Ker", "Var"], second: ["gar", "mok", "izar", "zul", "rat", "ax"] },
  { match: /mage|academy|wizard/i, first: ["Ra", "Ze", "Sol", "Nika", "Ota", "Dan"], second: ["ziel", "hir", "mir", "ren", "lias", "bar"] },
  { match: /human|knight|order|haven/i, first: ["Godr", "Alen", "Isabel", "Rich", "Wilm", "Mar"], second: ["ic", "ard", "la", "en", "in", "us"] },
];

export const GENERIC_EN: NameTable = { match: /./, first: ["Ar", "Bel", "Dor", "Kal", "Ven", "Tar"], second: ["ion", "an", "ek", "ora", "is", "gen"] };
