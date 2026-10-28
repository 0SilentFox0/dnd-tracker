import { type CharacterOperation } from "../operation-runner";
import { choicesOperation } from "./choices";
import { createOperation } from "./create";
import { deleteOperation } from "./delete";
import { deleteAllOperation } from "./delete-all";
import { experienceOperation } from "./experience";
import { getOperation } from "./get";
import { goalsOperation } from "./goals";
import { hitDiceOperation } from "./hit-dice";
import { inspirationOperation } from "./inspiration";
import { inventoryUpdateOperation } from "./inventory-update";
import { levelUpOperation } from "./level-up";
import { listOperation } from "./list";
import { notesOperation } from "./notes";
import { patchOperation } from "./patch";
import { READ_OPERATIONS } from "./reads";
import { resourcesOperation } from "./resources";
import { restOperation } from "./rest";
import { reviewOperation } from "./review";
import { rollOperation } from "./roll";
import { rosterOperation } from "./roster";
import { stashUpdateOperation } from "./stash-update";
import { tokensCreateOperation } from "./tokens-create";
import { tokensDeleteOperation } from "./tokens-delete";
import { transferOperation } from "./transfer";

const erased = (op: unknown) => op as CharacterOperation;

/** Assistant entry points keyed by action name: the same pure `(gate, input)` cores the HTTP routes use. */
export const CHARACTER_OPERATIONS: Record<string, CharacterOperation> = {
  create: erased(createOperation),
  list: erased(listOperation),
  roster: erased(rosterOperation),
  get: erased(getOperation),
  patch: erased(patchOperation),
  delete: erased(deleteOperation),
  "delete-all": erased(deleteAllOperation),
  review: erased(reviewOperation),
  notes: erased(notesOperation),
  goals: erased(goalsOperation),
  "tokens.create": erased(tokensCreateOperation),
  "tokens.delete": erased(tokensDeleteOperation),
  "level-up": erased(levelUpOperation),
  choices: erased(choicesOperation),
  resources: erased(resourcesOperation),
  "inventory.patch": erased(inventoryUpdateOperation),
  "stash.apply": erased(stashUpdateOperation),
  transfer: erased(transferOperation),
  "hit-dice": erased(hitDiceOperation),
  inspiration: erased(inspirationOperation),
  rest: erased(restOperation),
  experience: erased(experienceOperation),
  roll: erased(rollOperation),
  ...Object.fromEntries(Object.entries(READ_OPERATIONS).map(([key, op]) => [key, erased(op)])),
};
