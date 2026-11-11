import * as path from "path";

import { readPack } from "../../../lib/pack";
import { wfrpDataOf } from "../common";

export const FIXTURES_DIR = path.join(__dirname, "../../../__tests__/fixtures");

export const grimPack = () => readPack("grim-d100");

export const fixturePack = () => structuredClone(readPack("grim-fixture", FIXTURES_DIR));

export const grimData = () => wfrpDataOf(grimPack());

export const fixtureData = () => wfrpDataOf(fixturePack());
