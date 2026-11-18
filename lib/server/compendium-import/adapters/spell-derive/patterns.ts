import { type AbilityKey } from '@/lib/constants/abilities';
import type { Effect } from '@/lib/utils/abilities/schema/effects';
import { isCustomConditionKey } from '@/lib/utils/abilities/schema/kinds';

export const SIGNAL_TEXT =
    /\bhit points\b|\bspeed\b[^.]{0,30}\b(?:reduced|increases?|decreases?|at least)\b|\b(?:reduces?|increases?)\b[^.]{0,30}\bspeed\b|\bArmor Class\b|\badvantage\b|\bdisadvantage\b|\bspell attack\b|\bsaving throw\b/i;

export const WEAPON =
    /\bweapon attacks?\b|\bammunition\b|\b(?:simple or martial|simple|martial) weapons?\b|\bweapons? of your choice\b|\bas a (?:melee |ranged )?weapon\b/i;

export const BUFF =
    /\b(?:your|its) Armor Class becomes\b|\btransforms?\b|\bnew (?:humanoid )?form\b/i;

export const SLOWED = /\bspeed is reduced by (\d+) feet/i;

export const REST = /\b(?:short|long) rest\b/i;

export const CHOICE = /\bone of the following\b|\bchoose one\b/i;

export const SPEED_UP = /\bspeed increases by (\d+) feet/i;

export const MOVE_TRIGGER =
    /(?:,? and )?\bwhenever\b[^.]*\bmove up to\b[^.]*\./gi;

export const IMMOBILIZING =
    /\bcan move only by\b|\bgrows around\b[^.]*\bcreatures?\b/i;

export const SELF_AND_OTHERS =
    /\byou and up to (\w+) (?:other |willing )+creatures\b/i;

export const LEADING_COUNT = /^(\w+) creatures\b/i;

export const ZONE =
    /\b(?:(?:at )?the (?:start|end) of (?:each|every|your turn|its turn|their turn)\b|whenever\b|for the first time on a turn|starts its turn|use your reaction|(?:each|every) turn|when a creature (?:enters|moves))/i;

export const SELF_DAMAGE = /\byou (?:take|suffer) (?:\d+d\d+|\d+) \w+ damage/i;

export const VARIABLE =
    /\b\d+-\d+ feet:|\b(?:for (?:every|each)|per) \d+ feet\b/i;

export const DEALS = /\bdeal(?:s|ing)\b[^.]{0,40}damage/i;

export const SELF_CONDITION =
    /\byou (?:\w+ )?(?:become|remain)s? (?:\w+ )?\{@condition (\w+)/i;

export const TARGET_CONDITION =
    /\b(?:target|creature|it)\b[^.{]{0,40}\b(?:is|becomes?)\s+(?:magically\s+)?\{@condition (\w+)/i;

export const UP_TO_CREATURES =
    /\bup to (\w+) (?:other |willing |hostile |(?:tiny|small|medium|large|huge|gargantuan)(?: or (?:smaller|larger))? )*creatures\b/i;

export const SHAPE_TEXT =
    /(\d+)-foot(?:-radius)?(?:, \d+-foot-(?:high|tall))? (sphere|cube|cone|cylinder)\b|(\d+)-foot-long[^.]{0,20}\bline\b|(\d+)-foot line\b|\bline up to (\d+) feet long/i;

export const PUSH = /\bpushed (?:up to )?(\d+) feet (?:away )?from you\b/i;

export const RIDERS: Array<
    [RegExp, 'push' | 'terrain' | 'vulnerability' | 'speed' | 'choice']
> = [
    [/\bpush(?:ed)?\b|\bpull(?:ed)?\b|\bknock(?:ed)?\b|carried along/i, 'push'],
    [/difficult terrain/i, 'terrain'],
    [/vulnerab|resistan|immun/i, 'vulnerability'],
    [/\bspeed\b/i, 'speed'],
    [CHOICE, 'choice'],
];

export const EXTRA_FILTERED_TARGETS = /\bone additional humanoid\b/i;

const REPEAT_SAVING_THROW = /\brepeat the saving throw\b/i;

export const withSaveEnds = (
    effects: Effect[],
    ability: AbilityKey | null,
    text: string,
    applied: string | null
): Effect[] =>
    isCustomConditionKey(applied) && ability && REPEAT_SAVING_THROW.test(text)
        ? effects.map((e) =>
              e.kind === 'applyCondition' && !e.saveEnds
                  ? { ...e, saveEnds: { ability } }
                  : e
          )
        : effects;
