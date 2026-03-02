/**
 * data/combat.js
 * Monster definitions, campaign stages, and encounter modifiers.
 */

export const MONSTERS_CONFIG = {
  goblin_camp: {
    id: 'goblin_camp', name: 'Goblin Camp', icon: '👺',
    description: 'A disorganized rabble of goblins. A good first target.',
    difficulty: 1,
    waves: [
      { name: 'Goblin Scouts',    hp: 200,  attack: 8,  count: 5 },
      { name: 'Goblin Warriors',  hp: 350,  attack: 12, count: 8 },
    ],
    rewards: { money: 150, wood: 50, xp: 100 },
    maxRewardedWins: 5,
    campaignStage: 1,
  },
  bandit_camp: {
    id: 'bandit_camp', name: 'Bandit Hideout', icon: '🗡️',
    description: 'Organized brigands preying on nearby villages. Bring them to justice.',
    difficulty: 2,
    waves: [
      { name: 'Bandit Scouts',   hp: 280,  attack: 10, count: 6 },
      { name: 'Bandit Raiders',  hp: 450,  attack: 18, count: 5 },
    ],
    rewards: { money: 250, wood: 80, xp: 200 },
    maxRewardedWins: 5,
    campaignStage: 2,
  },
  orc_warband: {
    id: 'orc_warband', name: 'Orc Warband', icon: '🧟',
    description: 'A fierce orcish raiding party. Dangerous in groups.',
    difficulty: 3,
    waves: [
      { name: 'Orc Raiders',   hp: 500,  attack: 20, count: 6 },
      { name: 'Orc Shamans',   hp: 300,  attack: 35, count: 3, specialAbility: 'heal', abilityValue: 0.2 },
      { name: 'Orc Warchief',  hp: 1200, attack: 45, count: 1 },
    ],
    rewards: { money: 400, stone: 100, xp: 300 },
    maxRewardedWins: 4,
    requires: { townhall: 3 },
    campaignStage: 3,
  },
  troll_bridge: {
    id: 'troll_bridge', name: "Troll's Bridge", icon: '🧌',
    description: 'A massive troll clan blocks the only mountain pass. They regenerate fast.',
    difficulty: 4,
    waves: [
      { name: 'River Trolls',  hp: 900,  attack: 30, count: 4 },
      { name: 'Cave Trolls',   hp: 1400, attack: 50, count: 2, specialAbility: 'heal', abilityValue: 0.25 },
      { name: 'Troll Elder',   hp: 2500, attack: 70, count: 1, specialAbility: 'heal', abilityValue: 0.15 },
    ],
    rewards: { money: 600, stone: 150, xp: 480 },
    maxRewardedWins: 4,
    requires: { townhall: 4 },
    campaignStage: 4,
  },
  undead_legion: {
    id: 'undead_legion', name: 'Undead Legion', icon: '💀',
    description: 'Shambling hordes of the undead. They feel no pain and never stop.',
    difficulty: 5,
    waves: [
      { name: 'Skeleton Infantry',  hp: 400,  attack: 25, count: 15 },
      { name: 'Zombie Brutes',      hp: 800,  attack: 40, count: 8 },
      { name: 'Lich Priest',        hp: 600,  attack: 80, count: 1, specialAbility: 'revive', abilityValue: 0.3 },
    ],
    rewards: { money: 800, iron: 100, xp: 600 },
    maxRewardedWins: 3,
    requires: { townhall: 5 },
    campaignStage: 5,
  },
  frost_giant: {
    id: 'frost_giant', name: 'Frost Giant Hold', icon: '🥶',
    description: 'Colossal giants from the frozen north. Slow but devastating.',
    difficulty: 6,
    waves: [
      { name: 'Ice Thralls',    hp: 700,  attack: 35, count: 10 },
      { name: 'Frost Shaman',   hp: 500,  attack: 60, count: 2, specialAbility: 'heal', abilityValue: 0.2 },
      { name: 'Frost Giant',    hp: 4000, attack: 120, count: 1 },
    ],
    rewards: { money: 1200, stone: 300, iron: 80, xp: 900 },
    maxRewardedWins: 3,
    requires: { townhall: 6 },
    campaignStage: 6,
  },
  demon_gates: {
    id: 'demon_gates', name: 'Demon Gates', icon: '🔥',
    description: 'A rift to the demon realm has opened. Close it before all is lost.',
    difficulty: 7,
    waves: [
      { name: 'Imp Swarm',       hp: 300,  attack: 30, count: 20 },
      { name: 'Demon Knights',   hp: 1500, attack: 70, count: 4 },
      { name: 'Gate Archfiend',  hp: 3000, attack: 120, count: 1, specialAbility: 'aoe_blast', abilityValue: 0.5 },
    ],
    rewards: { money: 2000, iron: 300, stone: 500, xp: 1200 },
    maxRewardedWins: 3,
    requires: { townhall: 7, heroquarters: 2 },
    campaignStage: 7,
  },
  dragon_lair: {
    id: 'dragon_lair', name: "Dragon's Lair", icon: '🐉',
    description: 'A terrifying ancient dragon guards its hoard. Prepare well.',
    difficulty: 8,
    waves: [
      { name: 'Dragon Whelps',  hp: 600,  attack: 50, count: 6 },
      { name: 'Ancient Dragon', hp: 8000, attack: 200, count: 1, specialAbility: 'aoe_blast', abilityValue: 0.4 },
    ],
    rewards: { money: 5000, iron: 500, xp: 2000 },
    maxRewardedWins: 2,
    requires: { townhall: 7, heroquarters: 3 },
    campaignStage: 8,
  },
  corrupted_arena: {
    id: 'corrupted_arena', name: 'Corrupted Colosseum', icon: '⚔️',
    description: 'A dark gladiatorial arena where fallen champions have been raised to fight forever.',
    difficulty: 9,
    waves: [
      { name: 'Corrupted Gladiators', hp: 2000, attack: 100, count: 5 },
      { name: 'Shadow Champions',     hp: 4000, attack: 180, count: 2, specialAbility: 'revive', abilityValue: 0.4 },
      { name: 'Arena Overlord',       hp: 10000, attack: 250, count: 1, specialAbility: 'aoe_blast', abilityValue: 0.45 },
    ],
    rewards: { money: 10000, iron: 1000, stone: 1500, xp: 5000 },
    maxRewardedWins: 1,
    requires: { townhall: 9, heroquarters: 4 },
    campaignStage: 9,
  },
  chaos_titan: {
    id: 'chaos_titan', name: 'The Chaos Titan', icon: '🌋',
    description: 'The ultimate threat. A world-ending colossus of pure destruction.',
    difficulty: 10,
    waves: [
      { name: 'Chaos Minions',  hp: 1000, attack: 60,  count: 20 },
      { name: "Titan's Arm",    hp: 5000, attack: 150, count: 2 },
      { name: 'Chaos Titan',    hp: 15000, attack: 300, count: 1, specialAbility: 'aoe_blast', abilityValue: 0.6 },
    ],
    rewards: { money: 15000, iron: 2000, xp: 8000 },
    maxRewardedWins: 1,
    requires: { townhall: 10, heroquarters: 5 },
    campaignStage: 10,
  },
};

export const CAMPAIGNS_CONFIG = [
  { stage: 1,  monsterId: 'goblin_camp',     name: 'Goblin Territory',      icon: '👺', requires: null },
  { stage: 2,  monsterId: 'bandit_camp',     name: 'Bandit Hideout',        icon: '🗡️', requires: null },
  { stage: 3,  monsterId: 'orc_warband',     name: 'The Orc Wastes',        icon: '🧟', requires: { townhall: 3 } },
  { stage: 4,  monsterId: 'troll_bridge',    name: "Troll's Bridge",        icon: '🧌', requires: { townhall: 4 } },
  { stage: 5,  monsterId: 'undead_legion',   name: 'Cursed Crypts',         icon: '💀', requires: { townhall: 5 } },
  { stage: 6,  monsterId: 'frost_giant',     name: 'Frost Giant Hold',      icon: '🥶', requires: { townhall: 6 } },
  { stage: 7,  monsterId: 'demon_gates',     name: 'Infernal Rift',         icon: '🔥', requires: { townhall: 7 } },
  { stage: 8,  monsterId: 'dragon_lair',     name: "Dragon's Peak",         icon: '🐉', requires: { townhall: 7, heroquarters: 3 } },
  { stage: 9,  monsterId: 'corrupted_arena', name: 'Corrupted Colosseum',   icon: '⚔️', requires: { townhall: 9, heroquarters: 4 } },
  { stage: 10, monsterId: 'chaos_titan',     name: 'The Final Battle',      icon: '🌋', requires: { townhall: 10 } },
];

/**
 * Difficulty scaling applied on top of encounter modifiers in _simulateBattle().
 * enemyHpMult / enemyAtkMult scale raw enemy wave stats.
 * resourceRate multiplies all passive resource production rates.
 */
export const DIFFICULTY_MODIFIERS = {
  easy:   { enemyHpMult: 0.7,  enemyAtkMult: 0.7,  resourceRate: 1.3  },
  normal: { enemyHpMult: 1.0,  enemyAtkMult: 1.0,  resourceRate: 1.0  },
  hard:   { enemyHpMult: 1.4,  enemyAtkMult: 1.3,  resourceRate: 0.85 },
};

/**
 * Baseline monster template for Survival mode.
 * Stats escalate by 5% per wave via CombatManager._survivalMult.
 */
export const SURVIVAL_MONSTER = {
  id:          'survival_wave',
  name:        'Survival Wave',
  icon:        '🌊',
  description: 'An endless escalating stream of enemies. How long can you hold?',
  // Base wave — HP and attack are multiplied by _survivalMult each wave
  baseWave: { name: 'Survival Enemies', hp: 350, attack: 18, count: 8 },
  rewards: { money: 80, xp: 50 },
  maxRewardedWins: Infinity,
};

/**
 * Random encounter modifiers that can be rolled when a player enters a stage.
 * Each modifier tweaks wave stats before _simulateBattle() runs.
 * chance: 0–1 probability that any given stage roll produces this modifier
 *         (they are mutually exclusive; ~25% chance of no modifier total).
 */
export const ENCOUNTER_MODIFIERS = [
  {
    id: 'enraged',
    name: 'Enraged',
    description: 'Enemies are furious — their attack is +30%.',
    icon: '🔴',
    chance: 0.15,
    waveTransform: w => ({ ...w, attack: Math.round(w.attack * 1.3) }),
  },
  {
    id: 'weakened',
    name: 'Weakened',
    description: 'Enemies seem weakened — their HP is −20%.',
    icon: '🟢',
    chance: 0.15,
    waveTransform: w => ({ ...w, hp: Math.round(w.hp * 0.8) }),
  },
  {
    id: 'fortified',
    name: 'Fortified',
    description: 'Enemies have fortified positions — defense +40% but HP −20%.',
    icon: '🛡️',
    chance: 0.15,
    waveTransform: w => ({ ...w, hp: Math.round(w.hp * 0.8), attack: Math.round(w.attack * 1.15) }),
  },
  {
    id: 'fragile',
    name: 'Fragile',
    description: 'Enemies are poorly equipped — HP +20% but they take +30% damage (player attack scales).',
    icon: '💧',
    chance: 0.15,
    waveTransform: w => ({ ...w, hp: Math.round(w.hp * 1.2) }),
    playerAttackMult: 1.3,
  },
  {
    id: 'blessed',
    name: 'Blessed',
    description: 'Your forces feel the divine blessing — player HP +15% this battle.',
    icon: '✨',
    chance: 0.15,
    waveTransform: w => w,
    playerHpMult: 1.15,
  },
];
