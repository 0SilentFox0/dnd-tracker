import type { ComponentType } from 'react';

import { AnchoredZoneEditor } from './editors/AnchoredZoneEditor';
import { BurstEditor } from './editors/BurstEditor';
import { ChooseOneEditor } from './editors/ChooseOneEditor';
import { CreateTerrainEditor } from './editors/CreateTerrainEditor';
import { GrantCastEditor } from './editors/GrantCastEditor';
import { GrantSpellEditor } from './editors/GrantSpellEditor';
import { HitRiderEditor } from './editors/HitRiderEditor';
import { InputDiceEditor } from './editors/InputDiceEditor';
import { InterruptCastEditor } from './editors/InterruptCastEditor';
import { MoveSelfEditor } from './editors/MoveSelfEditor';
import { MoveSummonEditor } from './editors/MoveSummonEditor';
import { PhantomEditor } from './editors/PhantomEditor';
import { SummonInlineEditor } from './editors/SummonInlineEditor';
import { TeleportSelfEditor } from './editors/TeleportSelfEditor';
import { TransformEditor } from './editors/TransformEditor';
import type { SpellOnlyEditorProps } from './spell-only-types';

import type { SpellOnlyKind } from '@/lib/utils/spells/editor/spell-only';

type EditorMap = {
    [K in SpellOnlyKind]?: ComponentType<SpellOnlyEditorProps<K>>;
};

export const SPELL_ONLY_EDITORS: EditorMap = {
    chooseOne: ChooseOneEditor,
    inputDice: InputDiceEditor,
    moveSelf: MoveSelfEditor,
    teleportSelf: TeleportSelfEditor,
    burst: BurstEditor,
    grantSpell: GrantSpellEditor,
    moveSummon: MoveSummonEditor,
    phantom: PhantomEditor,
    interruptCast: InterruptCastEditor,
    createTerrain: CreateTerrainEditor,
    transform: TransformEditor,
    hitRider: HitRiderEditor,
    grantCast: GrantCastEditor,
    anchoredZone: AnchoredZoneEditor,
    summonInline: SummonInlineEditor,
};
