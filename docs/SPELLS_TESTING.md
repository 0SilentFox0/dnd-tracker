Створити тести для всіх заклинань, працювати з заклинаннями конкретно через id
Заклинання будуть в форматі -
id - Назва заклинання

- опис тест кейсу який має перевіритися
- опис тест кейсу який має перевіритися

- ST {CHA} > {VAL} значення saving throw і характеристика зі значенням щоб уникнути заклинання
- HT {CHA} > {VAL} значення для перевірки попадання зі значенням характеристики щоб заклинання вийшло

якщо вказано ST - no / HT - no - перевірка не потрібна і модальне вікно не відкривається

якщо заклинання не проходить тест кейс точково виправити його умови щоб підходити під тест кейс

ТЕСТ КЕЙС - SOURCE OF TRUE

скорочення
TE - target enemy
TA - target ally
D{x} - debuff on x rounds
B{x} - buff on x rounds
AoE - can be applied to many units
Targeted - can be applied to 1 unit
No Target - applied to 0 targets (make some another effect)

debuff can be dispelled by Clensing
buff can be dispelled by Confusion

if spell is dispelled - all bonuses from spell disappear

\*Dark magic

1. cmldnjuk40009ipdsnhiziq6n - Slow

- D3 speed of TE -50%
- D3 initiative of TE -2

-ST WIZ >= 14

2. cmldnjuk4000aipds9faf2kkv - Sorrow

- D3 morale of TE -2
- D3 saving throw of TE -2

-ST WIZ >= 14

3. cmldnjuk40008ipdsp5ygnm42 - Weakness

- D3 melee/range attack damage of TE -40%

-ST WIZ >= 14

4. cmldnjuk4000cipdsnzbdcvlk - Decay

- D3 for TE, give 3d6 + lelvel of hero damage

-ST WIZ >= 15

5. cmldnjuk4000bipdswzpf3gi1 - Vulnerability

- D3 for TE, -4 AC

-ST WIZ >= 15

6. cmldnjuk4000dipdsoo49o7jx - Confusion

- D3 - dispell of buffs of TE

-ST WIZ >= 16

7. cmldnjuk4000eipdseyszgfvr -Suffering

- D1 - disable melee and range attack of TE

-ST WIZ >= 16

8. cmldnjuk4000gipdsofej5wl5 - Blindness

- D10 - disable TE, can be reveal when TE attacked

-ST WIZ >= 17

9. cmldnjuk4000fipdsfgbhl8xi - Frenzy

- D2 - force TE attack nearest unit with +60% damage

-ST WIZ >= 17

1.  cmldnjuk4000iipdsa3rdgkt6 - Curse_of_Netherworld

- give 6d6 + level of hero for all "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral" ALIGNMENTS

-ST - no

1.  cmldnjuk4000hipdse1xmy7zh - Puppet_Master

- D1 - TE become ally of spell caster hero, give +5 initiative for TE

-ST WIZ >= 18

12. cmldnjuk4000hipdse1xmy7zh - Vampirism

- D3 TE Heal itself for 50% melee/range attack damage

-ST - no

\*Light magic

1. cmldnjuk4000wipdspuumzd31 - Divine_Strength

- B3 TA +all dice size (example d4->d6, d6->d8 etc)

- HT INT >= 14

2. cmldnjuk4000xipdsq77m59tl - Haste

- B3 TA + 2 Initiative
- B3 TA + speed +50%

- HT INT >= 14

3. cmldnjuk4000zipdsp3rghjp2 - Cleansing

- reveal all debuff for TA

- HT INT >= 16

4. cmldnjuk40010ipdsgc229g9b - Endurance

- B3 for TA +3AC

- HT INT >= 15

5. cmldnjuk4000yipdss5tott2o - Regeneration

- B3 for TA - regain 15% of MAX HP each round

- HT INT >= 16

6. cmldnjuk50012ipdsnav06bif - Deflect_Missile

- B3 for TA - all income range damage -50%

- HT INT >= 15

7. cmldnjuk40011ipdsutqtil4c - Righteous_Might

-B3 for TA - +40% for all melee and range damage

- HT INT >= 16

8. cmldnjuk50015ipdsmpholy4y - Divine_Vengeance

- give TE pure damage hero_level \* current round value (example hero level 10, round 2 -> 20 pure damage)

- HT INT >= 16

9. cmldnjuk50013ipdsnfuukbr7 - Magical_Immunity

- B3 give TE or TA full immunity for all magic (damage from spells = 0, all Buffs and debuffs dispell, all buff bonus = 0)

- HT NO

10. cmldnjuk50017ipdsd9w97s5i - Resurrection

- Heal to 100% HP for TA
- Max HP of TA -20%

- HT INT >= 17

11. cmldnjuk50016ipdsxjmhmdgv - Word_of_Light

give 6d6 + level of hero for all
"Lawful Evil",
"Neutral Evil",
"Chaotic Evil" ALIGNMENTS

Chaotic Magic

- HT NO

1. cmldnjuk4000kipdssm2xdb69 - Eldritch_Arrow

- Targeted, give TE 2d6 + level hero damage

-ST DEX >=14

2. cmldnjuk4000lipdsjqr9hrvv - Stone_Spikes

- AoE, TE 1d6 + level hero damage
- -ST DEX >=14

3. cmldnjuk4000mipdsxe374rvp - Ice_Bolt

- Targeted, give TE 4d6 + level hero damage
- TE -1AC

-ST DEX >=15

4. cmldnjuk4000nipdsbr70v78a - Lightning_Bolt

- Targeted, give TE 4d6 + level hero damage
- TE initiative -1

-ST DEX >=15

5. cmldnjuk4000qipdstbaztng3 - Circle_of_Winter

- Aoe, give TE 4d8 + level hero damage

-ST DEX >=16
if saved take 50% damage

6. cmldnjuk4000oipdslursuzcq - Fireball

- Aoe, give TE 4d8 + level hero damage

-ST DEX >=16
if saved take 50% damage

7. cmldnjuk4000pipds6gaiakc3 - Firewall

- No target create infinity wall of fire
  if TE inside this wall give TA - 5d8 + level hero damage

-ST - NO

8. cmldnjuk4000ripds99do2raz - Chain_Lightning

- Aoe, TE receive 5d8 damage + level of hero,
  1st target receive - 100% damage
  2st target receive - 75% damage
  3st target receive - 50% damage
  4st target receive - 25% damage

-ST DEX >=17

9. cmldnjuk4000sipdsqyvh8ri4 - Meteor_Shower

- Aoe, TE receive 8d8 + level of hero damage

-ST DEX >=17

10. cmldnjuk4000uipdsikfedmqa - Armageddon

- AoE, TE received 5d8 + hero level damage

-ST - NO

11. cmldnjuk4000tipdszwj0gjib - Deep_Freeze

- Targeted, TE receive 10d8 damage
- D2 TE, -50% AC

-ST DEX >=18

12. cmldnjuk4000vipdsgk7aj2v0 - Implosion

- Targeted, TE receive 10d10 damage

-ST DEX >=18
if saved - TE stunned(proone) on next round
