export type IconCredit = {
    key: string;
    name: string;
    author: string;
    license: 'CC BY 3.0';
    url: string;
};

const base = 'https://game-icons.net/1x1';

export const ICON_CREDITS: readonly IconCredit[] = [
    { key: 'attack', name: 'Crossed swords', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/crossed-swords.html` },
    { key: 'magic', name: 'Spell book', author: 'Delapouite', license: 'CC BY 3.0', url: `${base}/delapouite/spell-book.html` },
    { key: 'channel', name: 'Magic swirl', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/magic-swirl.html` },
    { key: 'ability', name: 'Muscle up', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/muscle-up.html` },
    { key: 'bonus', name: 'Power lightning', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/power-lightning.html` },
    { key: 'reaction', name: 'Shield reflect', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/shield-reflect.html` },
    { key: 'core', name: 'Checklist', author: 'Delapouite', license: 'CC BY 3.0', url: `${base}/delapouite/checklist.html` },
    { key: 'gear', name: 'Backpack', author: 'Delapouite', license: 'CC BY 3.0', url: `${base}/delapouite/backpack.html` },
    { key: 'strikeAndReturn', name: 'Ricochet', author: 'Caro Asercion', license: 'CC BY 3.0', url: `${base}/caro-asercion/ricochet.html` },
    { key: 'endTurn', name: 'Checkered flag', author: 'Delapouite', license: 'CC BY 3.0', url: `${base}/delapouite/checkered-flag.html` },
    { key: 'nextTurn', name: 'Fast forward button', author: 'Delapouite', license: 'CC BY 3.0', url: `${base}/delapouite/fast-forward-button.html` },
    { key: 'gate', name: 'Hourglass', author: 'Lorc', license: 'CC BY 3.0', url: `${base}/lorc/hourglass.html` },
];
