/**
 * GAME_DATA.js
 * Static configuration for all game entities.
 * Phase 3: Added storehouse, 3 new monsters, 4 new tech, 4 new quests,
 *          ACHIEVEMENTS_CONFIG, CAMPAIGNS_CONFIG, and expanded hero/monster wave data.
 */

export const BUILDINGS_CONFIG = {
  townhall: {
    id: 'townhall', name: 'Headquarters (HQ)', icon: '🏛️',
    description: 'The heart of your base. Upgrade to unlock new buildings, increase all caps, and lead a larger population.',
    maxLevel: 10,
    baseCost: { wood: 500, stone: 300 },
    costMultiplier: 2.0, buildTime: 120,
    effects: { unlockBuildings: true },
    storageCap: { wood: 2000, stone: 2000, iron: 500, food: 500, water: 500, money: 5000 },
    effectLabel: '📦 +storage cap per level · 🔓 Unlocks buildings',
    category: 'core', requires: null,
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 3,  // Can hold up to 3 heroes who provide various bonuses and abilities to the base
  },
  farm: {
    id: 'farm', name: 'Farm', icon: '🌾',
    description: 'Generates food to support a larger army.',
    maxLevel: 10,
    baseCost: { wood: 80, stone: 30 },
    costMultiplier: 1.6, buildTime: 10,
    effects: { food: 2 },
    effectLabel: '🌾 +2 Food/s per level',
    category: 'production', requires: null,
    heroCapacity: 1,
    maxInstances: 4,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 3 } },
      { index: 2, condition: { townhall: 5 } },
      { index: 3, condition: { townhall: 7 } },
    ],
  },
  mine: {
    id: 'mine', name: 'Iron Mine', icon: '⛏️',
    description: 'Extracts iron ore for tools, weapons, and construction.',
    maxLevel: 10,
    baseCost: { wood: 100, stone: 50 },
    costMultiplier: 1.8, buildTime: 15,
    effects: { iron: 2 },
    effectLabel: '⚙️ +2 Iron/s per level',
    category: 'production', requires: null,
    heroCapacity: 1,
    maxInstances: 3,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 4 } },
      { index: 2, condition: { townhall: 6 } },
    ],
  },
  lumbermill: {
    id: 'lumbermill', name: 'Lumber Mill', icon: '🪵',
    description: 'Chops down trees for wood production.',
    maxLevel: 10,
    baseCost: { stone: 80 },
    costMultiplier: 1.7, buildTime: 12,
    effects: { wood: 2.5 },
    effectLabel: '🪵 +2.5 Wood/s per level',
    category: 'production', requires: null,
    heroCapacity: 1,
    maxInstances: 3,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 3 } },
      { index: 2, condition: { townhall: 5 } },
    ],
  },
  quarry: {
    id: 'quarry', name: 'Stone Quarry', icon: '🪨',
    description: 'Mines stone for construction.',
    maxLevel: 10,
    baseCost: { wood: 100, iron: 20 },
    costMultiplier: 1.8, buildTime: 20,
    effects: { stone: 2 },
    effectLabel: '🪨 +2 Stone/s per level',
    category: 'production', requires: null,
    heroCapacity: 1,
    maxInstances: 3,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 4 } },
      { index: 2, condition: { townhall: 6 } },
    ],
  },
  storehouse: {
    id: 'storehouse', name: 'Storehouse', icon: '🏚️',
    description: 'Expands your resource storage. Each level significantly increases all caps.',
    maxLevel: 10,
    baseCost: { wood: 300, stone: 200 },
    costMultiplier: 1.9, buildTime: 25,
    effects: {},
    storageCap: { wood: 3000, stone: 3000, iron: 1000, food: 1000, water: 1000, money: 10000 },
    effectLabel: '📦 +3,000 Wood/Stone cap · +1,000 Iron/Food/Water cap · +10,000 Money cap per level',
    category: 'core', requires: null,
    maxInstances: 2,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 5 } },
    ],
    heroCapacity: 0,  // Can't hold heroes itself, but boosts storage efficiency
  },
  well: {
    id: 'well', name: 'Well', icon: '🪣',
    description: 'Draws fresh water from underground springs. Essential for population growth.',
    maxLevel: 8,
    baseCost: { stone: 80, iron: 20 },
    costMultiplier: 1.7, buildTime: 15,
    effects: { water: 2 },
    effectLabel: '💧 +2 Water/s per level',
    category: 'production', requires: null,
    maxInstances: 3,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 3 } },
      { index: 2, condition: { townhall: 6 } },
    ],
    heroCapacity: 1,  // Can hold 1 hero
  },
  house: {
    id: 'house', name: 'House', icon: '🏠',
    description: 'Provides housing for your population. Each level holds 10 more people. Requires cafeteria food and water to sustain occupants.',
    maxLevel: 10,
    baseCost: { wood: 120, stone: 80 },
    costMultiplier: 1.6, buildTime: 20,
    effects: {},
    effectLabel: '👥 +10 population capacity per level · Higher levels require a higher Cafeteria',
    category: 'population', requires: { townhall: 1, cafeteria: 1 },
    levelRequirements: {
      3: { cafeteria: 2 }, 4: { cafeteria: 2 },
      5: { cafeteria: 3 }, 6: { cafeteria: 3 },
      7: { cafeteria: 5 }, 8: { cafeteria: 5 },
      9: { cafeteria: 7 }, 10: { cafeteria: 7 },
    },
    maxInstances: 6,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 2 } },
      { index: 2, condition: { townhall: 3 } },
      { index: 3, condition: { townhall: 5 } },
      { index: 4, condition: { townhall: 7 } },
      { index: 5, condition: { townhall: 9 } },
    ],
    heroCapacity: 0,  // Can't hold heroes itself
  },
  cafeteria: {
    id: 'cafeteria', name: 'Cafeteria', icon: '🍽️',
    description: 'Maintains an internal stock of food and water that houses draw from each tick. Must be restocked from your global supply — manually or via automation.',
    maxLevel: 8,
    baseCost: { wood: 200, stone: 120 },
    costMultiplier: 1.8, buildTime: 30,
    effects: {},
    effectLabel: '🍽️ Holds 200 Food + 200 Water stock per level · Feeds housed population',
    category: 'core', requires: { townhall: 2, well: 1 },
    maxInstances: 1,
    instanceSlots: [
      { index: 0, condition: null },
    ],
    heroCapacity: 0,  // Can't hold heroes itself, but boosts food/water consumption efficiency
  },
  bank: {
    id: 'bank', name: 'Bank', icon: '🏦',
    description: 'Generates money based on your thriving population. Requires a minimum population to operate.',
    maxLevel: 8,
    baseCost: { wood: 400, stone: 300, iron: 100 },
    costMultiplier: 2.0, buildTime: 60,
    effects: { money: 5 },
    effectLabel: '🪙 +5 Money/s per level · Efficiency scales with population fill ratio · Higher levels require more residents',
    category: 'population', requires: { townhall: 3 },
    levelRequirements: {
      2: { population: 10 },   3: { population: 20 },
      4: { population: 50 },  5: { population: 100 },
      6: { population: 180 }, 7: { population: 300 },
      8: { population: 450 },
    },
    maxInstances: 2,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 6 } },
    ],
    heroCapacity: 1,  // Can hold 1 hero who boosts money production
  },
  barracks: {
    id: 'barracks', name: 'Barracks', icon: '⚔️',
    description: 'Squad management building. Each barracks houses one squad. Level determines squad capacity.',
    maxLevel: 8,
    baseCost: { wood: 200, stone: 150 },
    costMultiplier: 1.9, buildTime: 30,
    effects: { squadCapacity: 3 },
    effectLabel: '🪖 +3 squad capacity per level · Holds 1 squad & up to 4 heroes',
    category: 'military', requires: null,
    maxInstances: 4,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 4 } },
      { index: 2, condition: { townhall: 6 } },
      { index: 3, condition: { townhall: 8 } },
    ],
    heroCapacity: 4,  // Can hold up to 4 heroes who lead the squad
  },
  archeryrange: {
    id: 'archeryrange', name: 'Archery Range', icon: '🏹',
    description: 'Train ranged units with superior attack range.',
    maxLevel: 8,
    baseCost: { wood: 200, stone: 100 },
    costMultiplier: 1.9, buildTime: 45,
    effects: {},
    effectLabel: '🏹 Trains Ranged units · +5% training speed per level',
    category: 'military', requires: { barracks: 1 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 1,  // Can hold 1 hero
  },
  heroquarters: {
    id: 'heroquarters', name: 'Hero Quarters', icon: '🦸',
    description: 'Recruit legendary heroes to lead your army.',
    maxLevel: 10,
    baseCost: { wood: 500, stone: 400, iron: 100 },
    costMultiplier: 2.5, buildTime: 120,
    effects: { heroSlots: 5 },
    effectLabel: '👑 +5 hero slots per level.',
    category: 'military', requires: { barracks: 3, townhall: 4 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 0,  // can't hold heroes itself, but unlocks hero recruitment and provides hero slots for other buildings
  },
  workshop: {
    id: 'workshop', name: 'Workshop', icon: '⚙️',
    description: 'Research technology and craft powerful equipment. Higher levels unlock more research queue slots.',
    maxLevel: 8,
    baseCost: { wood: 400, stone: 300, iron: 100 },
    costMultiplier: 2.1, buildTime: 90,
    effects: {},
    effectLabel: '🔬 Unlocks Research tab · Lv.2: 2nd research slot · Lv.4: 3rd slot (Premium) · Lv.6: 4th slot (Premium)',
    category: 'core', requires: { townhall: 5 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 1,  // Can hold 1 hero who boosts research speed
  },
  construction_hall: {
    id: 'construction_hall', name: 'Construction Hall', icon: '🏗️',
    description: 'A dedicated facility for managing large-scale construction projects. Each level unlocks an additional build queue slot.',
    maxLevel: 3,
    baseCost: { wood: 500, stone: 400 },
    costMultiplier: 2.2, buildTime: 100,
    effects: {},
    effectLabel: '🏗️ Lv.1: 2nd build slot · Lv.2: 3rd slot (Premium) · Lv.3: 4th slot (Premium)',
    category: 'core', requires: { townhall: 2 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 0,  // Can't hold heroes, but unlocks more build queues for faster construction
  },
  infantryhall: {
    id: 'infantryhall', name: 'Infantry Hall', icon: '🗡️',
    description: 'Trains and upgrades infantry units. Each level increases training speed.',
    maxLevel: 10,
    baseCost: { wood: 300, stone: 200, iron: 50 },
    costMultiplier: 2.0, buildTime: 45,
    effects: {},
    effectLabel: '⚔️ Trains Infantry units · +5% training speed per level',
    category: 'military', requires: { townhall: 2 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 1,
  },
  cavalrystable: {
    id: 'cavalrystable', name: 'Cavalry Stable', icon: '🐴',
    description: 'Houses and trains cavalry units. Higher levels unlock stronger cavalry tiers.',
    maxLevel: 10,
    baseCost: { wood: 400, stone: 300, iron: 100 },
    costMultiplier: 2.1, buildTime: 80,
    effects: {},
    effectLabel: '🐴 Trains Cavalry units · +5% training speed per level',
    category: 'military', requires: { infantryhall: 3, townhall: 4 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 1,
  },
  siegeworkshop: {
    id: 'siegeworkshop', name: 'Siege Workshop', icon: '💣',
    description: 'Crafts powerful siege weapons. Requires a workshop to operate.',
    maxLevel: 10,
    baseCost: { wood: 500, stone: 400, iron: 150 },
    costMultiplier: 2.2, buildTime: 120,
    effects: {},
    effectLabel: '💣 Trains Siege units · +5% training speed per level',
    category: 'military', requires: { workshop: 1, townhall: 5 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 1,
  },
  magictower: {
    id: 'magictower', name: 'Magic Tower', icon: '🔮',
    description: 'A tower of arcane power. Empowers all military operations with magical energy.',
    maxLevel: 8,
    baseCost: { wood: 600, stone: 500, iron: 200 },
    costMultiplier: 2.5, buildTime: 180,
    effects: {},
    effectLabel: '🔮 +5% attack bonus per level · Unlocks advanced magical research',
    category: 'special', requires: { workshop: 5, townhall: 8 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
    heroCapacity: 2,
  },
};

export const UNITS_CONFIG = {
  infantry: {
    id: 'infantry', name: 'Infantry', icon: '🗡️',
    description: 'Melee fighters. Reliable front-line warriors that scale from basic footmen to legendary archons.',
    category: 'melee', buildingId: 'infantryhall',
    tiers: [
      { tier: 1,  name: 'Footman',   cost: { money: 50,   food: 1 },              trainTime: 10,  stats: { hp: 120,  attack: 14,  defense: 10,  speed: 1.0 }, upgradeCost: { money: 100,  iron: 5   } },
      { tier: 2,  name: 'Soldier',   cost: { money: 100,  food: 1, iron: 1 },     trainTime: 15,  stats: { hp: 180,  attack: 20,  defense: 15,  speed: 1.0 }, upgradeCost: { money: 200,  iron: 10  } },
      { tier: 3,  name: 'Sergeant',  cost: { money: 160,  food: 2, iron: 2 },     trainTime: 22,  stats: { hp: 260,  attack: 28,  defense: 20,  speed: 1.0 }, upgradeCost: { money: 350,  iron: 20  } },
      { tier: 4,  name: 'Knight',    cost: { money: 250,  food: 2, iron: 5 },     trainTime: 35,  stats: { hp: 380,  attack: 40,  defense: 28,  speed: 1.0 }, upgradeCost: { money: 600,  iron: 40  }, techRequired: 'infantry_mastery' },
      { tier: 5,  name: 'Paladin',   cost: { money: 400,  food: 3, iron: 10 },    trainTime: 50,  stats: { hp: 540,  attack: 56,  defense: 38,  speed: 1.0 }, upgradeCost: { money: 900,  iron: 80  }, techRequired: 'infantry_mastery' },
      { tier: 6,  name: 'Champion',  cost: { money: 600,  food: 3, iron: 15 },    trainTime: 70,  stats: { hp: 750,  attack: 76,  defense: 50,  speed: 1.0 }, upgradeCost: { money: 1400, iron: 120 }, techRequired: 'infantry_mastery' },
      { tier: 7,  name: 'Vanguard',  cost: { money: 900,  food: 4, iron: 25 },    trainTime: 95,  stats: { hp: 1020, attack: 102, defense: 66,  speed: 1.0 }, upgradeCost: { money: 2000, iron: 200 }, techRequired: 'infantry_mastery' },
      { tier: 8,  name: 'Warlord',   cost: { money: 1300, food: 4, iron: 40 },    trainTime: 130, stats: { hp: 1380, attack: 136, defense: 85,  speed: 1.0 }, upgradeCost: { money: 2800, iron: 300 }, techRequired: 'infantry_mastery' },
      { tier: 9,  name: 'Crusader',  cost: { money: 1900, food: 5, iron: 60 },    trainTime: 175, stats: { hp: 1860, attack: 180, defense: 110, speed: 1.0 }, upgradeCost: { money: 4000, iron: 450 }, techRequired: 'infantry_mastery' },
      { tier: 10, name: 'Archon',    cost: { money: 2800, food: 6, iron: 90 },    trainTime: 240, stats: { hp: 2500, attack: 240, defense: 145, speed: 1.0 },                                            techRequired: 'infantry_mastery' },
    ],
  },
  ranged: {
    id: 'ranged', name: 'Ranged', icon: '🏹',
    description: 'Ranged attackers. High burst damage at low defense. Train at the Archery Range.',
    category: 'ranged', buildingId: 'archeryrange',
    tiers: [
      { tier: 1,  name: 'Archer',       cost: { money: 80,   wood: 10,  food: 1 },           trainTime: 15,  stats: { hp: 80,   attack: 22,  defense: 5,  speed: 1.2 }, upgradeCost: { money: 150,  wood: 20  } },
      { tier: 2,  name: 'Crossbowman',  cost: { money: 140,  wood: 15,  food: 1 },           trainTime: 22,  stats: { hp: 120,  attack: 32,  defense: 8,  speed: 1.2 }, upgradeCost: { money: 280,  wood: 40  } },
      { tier: 3,  name: 'Sharpshooter', cost: { money: 220,  wood: 25,  food: 2 },           trainTime: 30,  stats: { hp: 170,  attack: 46,  defense: 11, speed: 1.2 }, upgradeCost: { money: 450,  wood: 70  } },
      { tier: 4,  name: 'Ranger',       cost: { money: 340,  wood: 40,  food: 2, iron: 3 },  trainTime: 42,  stats: { hp: 240,  attack: 64,  defense: 15, speed: 1.2 }, upgradeCost: { money: 700,  wood: 120, iron: 20 }, techRequired: 'ranged_mastery' },
      { tier: 5,  name: 'Strider',      cost: { money: 520,  wood: 60,  food: 3, iron: 6 },  trainTime: 58,  stats: { hp: 330,  attack: 88,  defense: 20, speed: 1.2 }, upgradeCost: { money: 1000, wood: 180, iron: 40 }, techRequired: 'ranged_mastery' },
      { tier: 6,  name: 'Predator',     cost: { money: 780,  wood: 90,  food: 3, iron: 10 }, trainTime: 78,  stats: { hp: 450,  attack: 118, defense: 26, speed: 1.2 }, upgradeCost: { money: 1500, wood: 270, iron: 70 }, techRequired: 'ranged_mastery' },
      { tier: 7,  name: 'Sniper',       cost: { money: 1150, wood: 130, food: 4, iron: 18 }, trainTime: 105, stats: { hp: 600,  attack: 156, defense: 33, speed: 1.2 }, upgradeCost: { money: 2200, wood: 380, iron: 110 }, techRequired: 'ranged_mastery' },
      { tier: 8,  name: 'Hawkeye',      cost: { money: 1650, wood: 190, food: 4, iron: 28 }, trainTime: 140, stats: { hp: 800,  attack: 206, defense: 42, speed: 1.2 }, upgradeCost: { money: 3000, wood: 550, iron: 160 }, techRequired: 'ranged_mastery' },
      { tier: 9,  name: 'Phantom',      cost: { money: 2400, wood: 280, food: 5, iron: 45 }, trainTime: 185, stats: { hp: 1060, attack: 270, defense: 54, speed: 1.2 }, upgradeCost: { money: 4200, wood: 800, iron: 240 }, techRequired: 'ranged_mastery' },
      { tier: 10, name: 'Deathbolt',    cost: { money: 3500, wood: 400, food: 6, iron: 70 }, trainTime: 255, stats: { hp: 1400, attack: 356, defense: 68, speed: 1.2 },                                                      techRequired: 'ranged_mastery' },
    ],
  },
  cavalry: {
    id: 'cavalry', name: 'Cavalry', icon: '🐴',
    description: 'Mounted warriors. High speed and attack, but costly to field. Train at the Cavalry Stable.',
    category: 'cavalry', buildingId: 'cavalrystable',
    tiers: [
      { tier: 1,  name: 'Scout',        cost: { money: 150,  food: 2 },             trainTime: 20,  stats: { hp: 200,  attack: 28,  defense: 14,  speed: 1.8 }, upgradeCost: { money: 300,  iron: 15  } },
      { tier: 2,  name: 'Horseman',     cost: { money: 240,  food: 2, iron: 3 },    trainTime: 30,  stats: { hp: 300,  attack: 42,  defense: 20,  speed: 1.8 }, upgradeCost: { money: 480,  iron: 30  } },
      { tier: 3,  name: 'Lancer',       cost: { money: 370,  food: 3, iron: 6 },    trainTime: 42,  stats: { hp: 440,  attack: 60,  defense: 27,  speed: 1.8 }, upgradeCost: { money: 740,  iron: 55  } },
      { tier: 4,  name: 'Knight',       cost: { money: 560,  food: 3, iron: 12 },   trainTime: 60,  stats: { hp: 640,  attack: 84,  defense: 36,  speed: 1.8 }, upgradeCost: { money: 1100, iron: 100 }, techRequired: 'cavalry_mastery' },
      { tier: 5,  name: 'Cavalier',     cost: { money: 840,  food: 4, iron: 20 },   trainTime: 82,  stats: { hp: 920,  attack: 116, defense: 48,  speed: 1.8 }, upgradeCost: { money: 1700, iron: 170 }, techRequired: 'cavalry_mastery' },
      { tier: 6,  name: 'Heavy Rider',  cost: { money: 1250, food: 4, iron: 32 },   trainTime: 110, stats: { hp: 1300, attack: 156, defense: 62,  speed: 1.8 }, upgradeCost: { money: 2500, iron: 270 }, techRequired: 'cavalry_mastery' },
      { tier: 7,  name: 'Templar',      cost: { money: 1850, food: 5, iron: 50 },   trainTime: 145, stats: { hp: 1820, attack: 206, defense: 80,  speed: 1.8 }, upgradeCost: { money: 3600, iron: 400 }, techRequired: 'cavalry_mastery' },
      { tier: 8,  name: 'Warden',       cost: { money: 2700, food: 5, iron: 78 },   trainTime: 195, stats: { hp: 2500, attack: 270, defense: 102, speed: 1.8 }, upgradeCost: { money: 5000, iron: 600 }, techRequired: 'cavalry_mastery' },
      { tier: 9,  name: 'Juggernaut',   cost: { money: 3900, food: 6, iron: 120 },  trainTime: 260, stats: { hp: 3400, attack: 352, defense: 130, speed: 1.8 }, upgradeCost: { money: 7000, iron: 900 }, techRequired: 'cavalry_mastery' },
      { tier: 10, name: 'Dreadnought',  cost: { money: 5600, food: 7, iron: 180 },  trainTime: 350, stats: { hp: 4600, attack: 460, defense: 165, speed: 1.8 },                                           techRequired: 'cavalry_mastery' },
    ],
  },
  siege: {
    id: 'siege', name: 'Siege', icon: '💣',
    description: 'Heavy siege weapons. Devastating damage but slow. Train at the Siege Workshop.',
    category: 'siege', buildingId: 'siegeworkshop',
    tiers: [
      { tier: 1,  name: 'Catapult',        cost: { money: 300,   wood: 50,   iron: 10  }, trainTime: 60,  stats: { hp: 70,   attack: 60,   defense: 4,  speed: 0.7 }, upgradeCost: { money: 600,   wood: 100,  iron: 30   } },
      { tier: 2,  name: 'Ballista',         cost: { money: 480,   wood: 80,   iron: 18  }, trainTime: 85,  stats: { hp: 100,  attack: 88,   defense: 6,  speed: 0.7 }, upgradeCost: { money: 950,   wood: 160,  iron: 55   } },
      { tier: 3,  name: 'Trebuchet',        cost: { money: 740,   wood: 120,  iron: 30  }, trainTime: 115, stats: { hp: 140,  attack: 125,  defense: 8,  speed: 0.7 }, upgradeCost: { money: 1450,  wood: 240,  iron: 100  } },
      { tier: 4,  name: 'Battering Ram',    cost: { money: 1100,  wood: 180,  iron: 50  }, trainTime: 155, stats: { hp: 200,  attack: 174,  defense: 11, speed: 0.7 }, upgradeCost: { money: 2200,  wood: 360,  iron: 160  }, techRequired: 'siege_mastery' },
      { tier: 5,  name: 'Bombard',          cost: { money: 1650,  wood: 260,  iron: 80  }, trainTime: 205, stats: { hp: 280,  attack: 240,  defense: 15, speed: 0.7 }, upgradeCost: { money: 3200,  wood: 520,  iron: 240  }, techRequired: 'siege_mastery' },
      { tier: 6,  name: 'Heavy Cannon',     cost: { money: 2400,  wood: 380,  iron: 120 }, trainTime: 270, stats: { hp: 390,  attack: 328,  defense: 20, speed: 0.7 }, upgradeCost: { money: 4700,  wood: 760,  iron: 360  }, techRequired: 'siege_mastery' },
      { tier: 7,  name: 'Siege Tower',      cost: { money: 3500,  wood: 550,  iron: 180 }, trainTime: 355, stats: { hp: 540,  attack: 444,  defense: 26, speed: 0.7 }, upgradeCost: { money: 6800,  wood: 1100, iron: 540  }, techRequired: 'siege_mastery' },
      { tier: 8,  name: 'War Engine',       cost: { money: 5000,  wood: 800,  iron: 270 }, trainTime: 460, stats: { hp: 740,  attack: 600,  defense: 34, speed: 0.7 }, upgradeCost: { money: 9500,  wood: 1600, iron: 800  }, techRequired: 'siege_mastery' },
      { tier: 9,  name: 'Doomsday Cannon',  cost: { money: 7200,  wood: 1150, iron: 400 }, trainTime: 600, stats: { hp: 1000, attack: 804,  defense: 44, speed: 0.7 }, upgradeCost: { money: 13500, wood: 2300, iron: 1200 }, techRequired: 'siege_mastery' },
      { tier: 10, name: 'Obliterator',      cost: { money: 10500, wood: 1700, iron: 600 }, trainTime: 800, stats: { hp: 1400, attack: 1080, defense: 56, speed: 0.7 },                                                          techRequired: 'siege_mastery' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HERO CLASSIFICATION SYSTEM
// Heroes belong to one class but can be assigned anywhere.
// Classification is informational — it drives effectiveness badges and buff
// categorisation, but never prevents assignment.
// ─────────────────────────────────────────────────────────────────────────────
export const HERO_CLASSIFICATIONS = {
  combat: {
    label: 'Combat',
    icon: '⚔️',
    color: '#ef4444',
    cssClass: 'class-combat',
    description: 'Most effective in Barracks and leading squads into battle.',
    preferredBuildings: ['barracks', 'heroquarters'],
    preferredUnitTypes: ['infantry', 'cavalry'],
  },
  tech: {
    label: 'Tech',
    icon: '🔬',
    color: '#a855f7',
    cssClass: 'class-tech',
    description: 'Most effective in research and technology buildings.',
    preferredBuildings: ['workshop'],
    preferredUnitTypes: ['siege', 'ranged'],
  },
  development: {
    label: 'Development',
    icon: '🏗️',
    color: '#22c55e',
    cssClass: 'class-development',
    description: 'Most effective in production and economy buildings.',
    preferredBuildings: ['mine', 'farm', 'lumbermill', 'quarry', 'bank'],
    preferredUnitTypes: ['ranged', 'infantry'],
  },
};

export const BUFF_CATEGORIES = {
  military:    { label: 'Military',    icon: '⚔️',  color: '#ef4444', description: 'Attack, defense and combat effectiveness bonuses' },
  development: { label: 'Development', icon: '🏗️',  color: '#22c55e', description: 'Training speed and research speed bonuses' },
  production:  { label: 'Production',  icon: '🏭',  color: '#f59e0b', description: 'Resource production rate bonuses' },
};

/** Maps an aura type to its buff category */
export const AURA_BUFF_CATEGORY = {
  attack_boost:    'military',
  magic_amplify:   'military',
  crit_chance:     'military',
  defense_boost:   'military',
  training_speed:  'development',
  research_speed:  'development',
  gold_production: 'production',
};

export const HEROES_CONFIG = {
  warlord: {
    id: 'warlord', name: 'Lord Arcturus', title: 'The Warlord', icon: '⚔️',
    tier: 'common',
    classification: 'combat',
    recruitCard: 'card_hero_warlord',
    description: 'A seasoned general who boosts the attack of all nearby melee units.',
    stats: { hp: 1500, attack: 80, defense: 40, speed: 1.2 },
    skills: ['charge', 'battle_cry', 'iron_will'],
    aura: { type: 'attack_boost', value: 0.15, buffCategory: 'military' },
    xpPerLevel: 500,
    buildingBonus: { stat: 'training_speed', label: 'Training Speed', buildingType: 'barracks', buffCategory: 'development' },
  },
  archsorceress: {
    id: 'archsorceress', name: 'Lyra Dawnveil', title: 'Arch Sorceress', icon: '🔮',
    tier: 'legendary',
    classification: 'tech',
    recruitCard: 'card_hero_archsorceress',
    description: 'Master of arcane magic. Devastating AoE spells.',
    stats: { hp: 900, attack: 160, defense: 12, speed: 0.9 },
    skills: ['fireball', 'arcane_nova', 'mana_shield'],
    aura: { type: 'magic_amplify', value: 0.25, buffCategory: 'military' },
    xpPerLevel: 600,
    buildingBonus: { stat: 'research_speed', label: 'Research Speed', buildingType: 'workshop', buffCategory: 'development' },
  },
  shadowblade: {
    id: 'shadowblade', name: 'Kira Nightwhisper', title: 'The Shadow Blade', icon: '🗡️',
    tier: 'rare',
    classification: 'development',
    recruitCard: 'card_hero_shadowblade',
    description: 'Assassin class hero. High single-target burst and evasion.',
    stats: { hp: 1100, attack: 130, defense: 18, speed: 2.0 },
    skills: ['shadowstep', 'poison_blade', 'evasion'],
    aura: { type: 'crit_chance', value: 0.15, buffCategory: 'military' },
    xpPerLevel: 550,
    buildingBonus: { stat: 'gold_production', label: 'Gold Output', buildingType: 'mine', buffCategory: 'production' },
  },
  paladin: {
    id: 'paladin', name: 'Sir Aldric', title: 'The Paladin', icon: '✝️',
    tier: 'rare',
    classification: 'combat',
    recruitCard: 'card_hero_paladin',
    description: 'Holy warrior. Reduces casualties and boosts unit defense.',
    stats: { hp: 2000, attack: 60, defense: 70, speed: 0.9 },
    skills: ['divine_shield', 'holy_light', 'consecration'],
    aura: { type: 'defense_boost', value: 0.20, buffCategory: 'military' },
    xpPerLevel: 650,
    buildingBonus: { stat: 'defense', label: 'Base Defense', buildingType: 'heroquarters', buffCategory: 'military' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY ITEMS
// Items that can be held in the player inventory. Hero cards are the primary
// recruitment mechanism. XP bundles are purchasable from the shop (coming soon).
// ─────────────────────────────────────────────────────────────────────────────
export const INVENTORY_ITEMS = {
  // ── Specific Hero Cards ──────────────────────────────────────────────────
  card_hero_warlord: {
    id: 'card_hero_warlord', type: 'hero_card',
    name: 'Hero Card: Lord Arcturus', icon: '⚔️',
    description: 'Recruit the legendary Warlord, Lord Arcturus.',
    rarity: 'common', targetHeroId: 'warlord',
  },
  card_hero_archsorceress: {
    id: 'card_hero_archsorceress', type: 'hero_card',
    name: 'Hero Card: Lyra Dawnveil', icon: '🔮',
    description: 'Recruit the legendary Arch Sorceress, Lyra Dawnveil.',
    rarity: 'legendary', targetHeroId: 'archsorceress',
  },
  card_hero_shadowblade: {
    id: 'card_hero_shadowblade', type: 'hero_card',
    name: 'Hero Card: Kira Nightwhisper', icon: '🗡️',
    description: 'Recruit the elusive Shadow Blade, Kira Nightwhisper.',
    rarity: 'rare', targetHeroId: 'shadowblade',
  },
  card_hero_paladin: {
    id: 'card_hero_paladin', type: 'hero_card',
    name: 'Hero Card: Sir Aldric', icon: '✝️',
    description: 'Recruit the noble Paladin, Sir Aldric.',
    rarity: 'rare', targetHeroId: 'paladin',
  },
  // ── Universal Hero Cards ─────────────────────────────────────────────────
  card_common: {
    id: 'card_common', type: 'hero_card_universal',
    name: 'Common Hero Card', icon: '🃏',
    description: 'Recruits a random unowned Common-tier hero.',
    rarity: 'common', targetTier: 'common',
  },
  card_rare: {
    id: 'card_rare', type: 'hero_card_universal',
    name: 'Rare Hero Card', icon: '🎴',
    description: 'Recruits a random unowned Rare-tier hero.',
    rarity: 'rare', targetTier: 'rare',
  },
  card_legendary: {
    id: 'card_legendary', type: 'hero_card_universal',
    name: 'Legendary Hero Card', icon: '👑',
    description: 'Recruits a random unowned Legendary-tier hero.',
    rarity: 'legendary', targetTier: 'legendary',
  },
  // ── XP Bundles ───────────────────────────────────────────────────────────
  xp_bundle_small: {
    id: 'xp_bundle_small', type: 'xp_bundle',
    name: 'Tome of Experience (Small)', icon: '📖',
    description: 'Grants 250 Hero XP to a chosen hero.',
    moneyCost: 250, grants: { xp: 250 }, rarity: 'common',
  },
  xp_bundle_medium: {
    id: 'xp_bundle_medium', type: 'xp_bundle',
    name: 'Tome of Experience (Medium)', icon: '📚',
    description: 'Grants 1,000 Hero XP to a chosen hero.',
    moneyCost: 900, grants: { xp: 1000 }, rarity: 'rare',
  },
  xp_bundle_large: {
    id: 'xp_bundle_large', type: 'xp_bundle',
    name: 'Tome of Experience (Grand)', icon: '📜',
    description: 'Grants 5,000 Hero XP to a chosen hero.',
    moneyCost: 4000, grants: { xp: 5000 }, rarity: 'rare',
  },
  // ── Resource Bundles ─────────────────────────────────────────────────────
  res_bundle_wood_sm: {
    id: 'res_bundle_wood_sm', type: 'resource_bundle',
    name: 'Bundle of Timber', icon: '🪵',
    description: 'Instantly grants 1,000 Wood.',
    moneyCost: 0, grants: { wood: 1000 }, rarity: 'common',
  },
  res_bundle_stone_sm: {
    id: 'res_bundle_stone_sm', type: 'resource_bundle',
    name: 'Load of Stone', icon: '🪨',
    description: 'Instantly grants 1,000 Stone.',
    moneyCost: 0, grants: { stone: 1000 }, rarity: 'common',
  },
  res_bundle_iron_sm: {
    id: 'res_bundle_iron_sm', type: 'resource_bundle',
    name: 'Pile of Iron Ore', icon: '⚙️',
    description: 'Instantly grants 500 Iron.',
    moneyCost: 0, grants: { iron: 500 }, rarity: 'common',
  },
  res_bundle_food_sm: {
    id: 'res_bundle_food_sm', type: 'resource_bundle',
    name: 'Ration Pack', icon: '🌾',
    description: 'Instantly grants 1,000 Food.',
    moneyCost: 0, grants: { food: 1000 }, rarity: 'common',
  },
  res_bundle_water_sm: {
    id: 'res_bundle_water_sm', type: 'resource_bundle',
    name: 'Barrel of Water', icon: '💧',
    description: 'Instantly grants 500 Water.',
    moneyCost: 0, grants: { water: 500 }, rarity: 'common',
  },
  res_bundle_diamond_sm: {
    id: 'res_bundle_diamond_sm', type: 'resource_bundle',
    name: 'Gem Pouch', icon: '💎',
    description: 'Instantly grants 5 Diamonds.',
    diamondCost: 0, grants: { diamond: 5 }, rarity: 'rare',
  },
  // ── Automations ──────────────────────────────────────────────────────────
  cafeteria_automation: {
    id: 'cafeteria_automation', type: 'automation',
    name: 'Cafeteria Auto-Restock', icon: '🤖',
    description: 'Automatically restocks your Cafeteria every 60 seconds using global reserves.',
    diamondCost: 0, automation: 'cafeteriaRestock', rarity: 'rare', singleUse: true,
  },
  // ── Buffs ─────────────────────────────────────────────────────────────────
  buff_prod_sm: {
    id: 'buff_prod_sm', type: 'buff',
    name: 'Production Boost (Minor)', icon: '⚗️',
    description: '+25% all resource production for 1 hour.',
    moneyCost: 600, durationMs: 3600000, value: 0.25, rarity: 'common',
  },
  buff_prod_lg: {
    id: 'buff_prod_lg', type: 'buff',
    name: 'Production Boost (Major)', icon: '🔥',
    description: '+50% all resource production for 2 hours.',
    moneyCost: 1500, durationMs: 7200000, value: 0.50, rarity: 'rare',
  },
  // ── Recruitment Scrolls ───────────────────────────────────────────────────
  scroll_common: {
    id: 'scroll_common', type: 'recruitment_scroll',
    name: 'Common Recruitment Scroll', icon: '📜',
    description: 'Roll the dice to recruit a hero, fragment, resource, XP, or buff. Common tier — heroes are mostly common.',
    rarity: 'common', tier: 'common',
  },
  scroll_rare: {
    id: 'scroll_rare', type: 'recruitment_scroll',
    name: 'Rare Recruitment Scroll', icon: '🌀',
    description: 'Roll the dice to recruit a hero, fragment, resource, XP, or buff. Rare tier — heroes skew rare.',
    rarity: 'rare', tier: 'rare',
  },
  scroll_legendary: {
    id: 'scroll_legendary', type: 'recruitment_scroll',
    name: 'Legendary Recruitment Scroll', icon: '✨',
    description: 'Roll the dice to recruit a hero, fragment, resource, XP, or buff. Legendary tier — all hero tiers possible at high rates.',
    rarity: 'legendary', tier: 'legendary',
  },
  // ── Hero Fragments ────────────────────────────────────────────────────────
  fragment_warlord: {
    id: 'fragment_warlord', type: 'hero_fragment',
    name: 'Fragment: Lord Arcturus', icon: '⚔️',
    description: 'A fragment of Lord Arcturus\' essence. Collect 10 to summon the hero or use for awakening.',
    rarity: 'common', targetHeroId: 'warlord', xpValue: 50,
  },
  fragment_archsorceress: {
    id: 'fragment_archsorceress', type: 'hero_fragment',
    name: 'Fragment: Lyra Dawnveil', icon: '🔮',
    description: 'A fragment of Lyra Dawnveil\' power. Collect 30 to summon the hero or use for awakening.',
    rarity: 'legendary', targetHeroId: 'archsorceress', xpValue: 50,
  },
  fragment_shadowblade: {
    id: 'fragment_shadowblade', type: 'hero_fragment',
    name: 'Fragment: Kira Nightwhisper', icon: '🗡️',
    description: 'A fragment of Kira Nightwhisper\' shadow. Collect 20 to summon the hero or use for awakening.',
    rarity: 'rare', targetHeroId: 'shadowblade', xpValue: 50,
  },
  fragment_paladin: {
    id: 'fragment_paladin', type: 'hero_fragment',
    name: 'Fragment: Sir Aldric', icon: '✝️',
    description: 'A fragment of Sir Aldric\' holy light. Collect 20 to summon the hero or use for awakening.',
    rarity: 'rare', targetHeroId: 'paladin', xpValue: 50,
  },
  // ── Speed-Up Items ─────────────────────────────────────────────────────────
  speedup_build_5m:   { id: 'speedup_build_5m',   type: 'speed_boost', target: 'building',  name: 'Build Speed-Up (5m)',        icon: '🏗️', description: 'Reduces the active build timer by 5 minutes.',    rarity: 'common',    skipSeconds: 300    },
  speedup_build_15m:  { id: 'speedup_build_15m',  type: 'speed_boost', target: 'building',  name: 'Build Speed-Up (15m)',       icon: '🏗️', description: 'Reduces the active build timer by 15 minutes.',   rarity: 'common',    skipSeconds: 900    },
  speedup_build_1h:   { id: 'speedup_build_1h',   type: 'speed_boost', target: 'building',  name: 'Build Speed-Up (1h)',        icon: '🏗️', description: 'Reduces the active build timer by 1 hour.',       rarity: 'rare',      skipSeconds: 3600   },
  speedup_build_8h:   { id: 'speedup_build_8h',   type: 'speed_boost', target: 'building',  name: 'Build Speed-Up (8h)',        icon: '🏗️', description: 'Reduces the active build timer by 8 hours.',      rarity: 'rare',      skipSeconds: 28800  },
  speedup_train_5m:   { id: 'speedup_train_5m',   type: 'speed_boost', target: 'training',  name: 'Training Speed-Up (5m)',     icon: '⚔️', description: 'Reduces the active training timer by 5 minutes.',  rarity: 'common',    skipSeconds: 300    },
  speedup_train_15m:  { id: 'speedup_train_15m',  type: 'speed_boost', target: 'training',  name: 'Training Speed-Up (15m)',    icon: '⚔️', description: 'Reduces the active training timer by 15 minutes.', rarity: 'common',    skipSeconds: 900    },
  speedup_train_1h:   { id: 'speedup_train_1h',   type: 'speed_boost', target: 'training',  name: 'Training Speed-Up (1h)',     icon: '⚔️', description: 'Reduces the active training timer by 1 hour.',     rarity: 'rare',      skipSeconds: 3600   },
  speedup_train_8h:   { id: 'speedup_train_8h',   type: 'speed_boost', target: 'training',  name: 'Training Speed-Up (8h)',     icon: '⚔️', description: 'Reduces the active training timer by 8 hours.',    rarity: 'rare',      skipSeconds: 28800  },
  speedup_research_5m:  { id: 'speedup_research_5m',  type: 'speed_boost', target: 'research', name: 'Research Speed-Up (5m)',   icon: '🔬', description: 'Reduces the active research timer by 5 minutes.',  rarity: 'common',    skipSeconds: 300    },
  speedup_research_15m: { id: 'speedup_research_15m', type: 'speed_boost', target: 'research', name: 'Research Speed-Up (15m)',  icon: '🔬', description: 'Reduces the active research timer by 15 minutes.', rarity: 'common',    skipSeconds: 900    },
  speedup_research_1h:  { id: 'speedup_research_1h',  type: 'speed_boost', target: 'research', name: 'Research Speed-Up (1h)',   icon: '🔬', description: 'Reduces the active research timer by 1 hour.',     rarity: 'rare',      skipSeconds: 3600   },
  speedup_research_8h:  { id: 'speedup_research_8h',  type: 'speed_boost', target: 'research', name: 'Research Speed-Up (8h)',   icon: '🔬', description: 'Reduces the active research timer by 8 hours.',    rarity: 'rare',      skipSeconds: 28800  },
  speedup_universal_5m:  { id: 'speedup_universal_5m',  type: 'speed_boost', target: 'any', name: 'Universal Speed-Up (5m)',  icon: '⚡', description: 'Reduces any active build, train, or research timer by 5 minutes.',  rarity: 'common',    skipSeconds: 300    },
  speedup_universal_15m: { id: 'speedup_universal_15m', type: 'speed_boost', target: 'any', name: 'Universal Speed-Up (15m)', icon: '⚡', description: 'Reduces any active build, train, or research timer by 15 minutes.', rarity: 'common',    skipSeconds: 900    },
  speedup_universal_1h:  { id: 'speedup_universal_1h',  type: 'speed_boost', target: 'any', name: 'Universal Speed-Up (1h)',  icon: '⚡', description: 'Reduces any active build, train, or research timer by 1 hour.',     rarity: 'rare',      skipSeconds: 3600   },
  speedup_universal_8h:  { id: 'speedup_universal_8h',  type: 'speed_boost', target: 'any', name: 'Universal Speed-Up (8h)',  icon: '⚡', description: 'Reduces any active build, train, or research timer by 8 hours.',    rarity: 'rare',      skipSeconds: 28800  },
  speedup_universal_instant: { id: 'speedup_universal_instant', type: 'speed_boost', target: 'any', name: 'Instant Completion', icon: '✨', description: 'Instantly completes the current active build, train, or research.', rarity: 'legendary', skipSeconds: 999999 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SHOP CONFIG
// Defines what items are sold in the Shop and at what price.
// goldCost: in-game gold. premiumCost: future real-money / premium currency.
// ─────────────────────────────────────────────────────────────────────────────
export const SHOP_CONFIG = [
  {
    id: 'heroes', label: 'Recruit', icon: '🎲',
    items: [
      { itemId: 'scroll_common',    moneyCost: 400,  featured: false },
      { itemId: 'scroll_rare',      moneyCost: 1250, featured: true  },
      { itemId: 'scroll_legendary', diamondCost: 6, featured: false },
    ],
  },
  {
    id: 'hero_cards', label: 'Hero Cards', icon: '🃏',
    items: [
      { itemId: 'card_hero_warlord',      moneyCost: 750 },
      { itemId: 'card_hero_paladin',       moneyCost: 1250 },
      { itemId: 'card_hero_shadowblade',   moneyCost: 1250 },
      { itemId: 'card_hero_archsorceress', diamondCost: 5, featured: true },
    ],
  },
  {
    id: 'universal_cards', label: 'Universal Cards', icon: '🎴',
    items: [
      { itemId: 'card_common',    moneyCost: 400  },
      { itemId: 'card_rare',      moneyCost: 1000 },
      { itemId: 'card_legendary', diamondCost: 6 },
    ],
  },
  {
    id: 'experience', label: 'XP Bundles', icon: '📖',
    items: [
      { itemId: 'xp_bundle_small',  moneyCost: 250 },
      { itemId: 'xp_bundle_medium', moneyCost: 900, featured: true },
      { itemId: 'xp_bundle_large',  moneyCost: 4000 },
    ],
  },
  {
    id: 'resources', label: 'Resources', icon: '📦',
    items: [
      { itemId: 'res_bundle_wood_sm',  moneyCost: 150 },
      { itemId: 'res_bundle_stone_sm', moneyCost: 150 },
      { itemId: 'res_bundle_iron_sm',  moneyCost: 200 },
      { itemId: 'res_bundle_food_sm',  moneyCost: 125 },
      { itemId: 'res_bundle_water_sm', moneyCost: 200 },
      { itemId: 'res_bundle_diamond_sm', diamondCost: 2 },
    ],
  },
  {
    id: 'buffs', label: 'Buffs', icon: '⚗️',
    items: [
      { itemId: 'buff_prod_sm', moneyCost: 600 },
      { itemId: 'buff_prod_lg', moneyCost: 1500 },
    ],
  },
  {
    id: 'automations', label: 'Automations', icon: '🤖',
    items: [
      { itemId: 'cafeteria_automation', diamondCost: 5, featured: true },
    ],
  },
  {
    id: 'speedups', label: 'Speed Ups', icon: '⚡',
    items: [
      { itemId: 'speedup_build_5m',          moneyCost: 200  },
      { itemId: 'speedup_build_15m',         moneyCost: 500  },
      { itemId: 'speedup_build_1h',          moneyCost: 1500 },
      { itemId: 'speedup_build_8h',          moneyCost: 8000 },
      { itemId: 'speedup_train_5m',          moneyCost: 200  },
      { itemId: 'speedup_train_15m',         moneyCost: 500  },
      { itemId: 'speedup_train_1h',          moneyCost: 1500 },
      { itemId: 'speedup_train_8h',          moneyCost: 8000 },
      { itemId: 'speedup_research_5m',       moneyCost: 200  },
      { itemId: 'speedup_research_15m',      moneyCost: 500  },
      { itemId: 'speedup_research_1h',       moneyCost: 1500 },
      { itemId: 'speedup_research_8h',       moneyCost: 8000 },
      { itemId: 'speedup_universal_5m',      moneyCost: 400,  featured: false },
      { itemId: 'speedup_universal_15m',     moneyCost: 1000, featured: false },
      { itemId: 'speedup_universal_1h',      moneyCost: 3000, featured: true  },
      { itemId: 'speedup_universal_8h',      moneyCost: 18000 },
      { itemId: 'speedup_universal_instant', diamondCost: 8,  featured: true  },
    ],
  },
  {
    id: 'premium', label: 'Premium', icon: '👑',
    items: [
      { itemId: null, label: 'Extra Build Slot', icon: '🏗️', description: 'Unlock an additional build queue slot.', goldCost: null, comingSoon: true },
      { itemId: null, label: 'Rename Token',     icon: '✏️',  description: 'Change your commander name.',             goldCost: null, comingSoon: true },
    ],
  },
];

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



export const TECH_CONFIG = {
  improved_smelting: {
    id: 'improved_smelting', name: 'Improved Smelting', icon: '⚒️',
    description: 'Iron Mine production +25% per level.',
    cost: { money: 500, iron: 100 }, researchTime: 120,
    effects: { ironBonus: 0.25 }, requires: { workshop: 1 }, tier: 1,
    maxLevel: 3, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 2: { workshop: 2 }, 3: { workshop: 4 } },
  },
  reinforced_lumber: {
    id: 'reinforced_lumber', name: 'Reinforced Lumber', icon: '🪵',
    description: 'Lumber Mill production +25% per level.',
    cost: { money: 400, stone: 100 }, researchTime: 90,
    effects: { woodBonus: 0.25 }, requires: { workshop: 1 }, tier: 1,
    maxLevel: 3, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 2: { workshop: 2 }, 3: { workshop: 3 } },
  },
  steel_armor: {
    id: 'steel_armor', name: 'Steel Armor', icon: '🛡️',
    description: 'All unit defense +25 and losses in battle reduced by 15% per level.',
    cost: { money: 800, iron: 200 }, researchTime: 180,
    effects: { defenseBonus: 25, lossReduction: 0.15 }, requires: { workshop: 3 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 4 }, 4: { workshop: 5 } },
  },
  advanced_tactics: {
    id: 'advanced_tactics', name: 'Advanced Tactics', icon: '🎯',
    description: 'Improved combat strategies. Army attack +30% in the first wave per level.',
    cost: { money: 1200, iron: 300 }, researchTime: 240,
    effects: { firstWaveBonus: 0.30 },
    requires: { workshop: 5 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.7, levelTimeMultiplier: 1.5,
    levelRequirements: {
      2: { workshop: 6 },
      3: { workshop: 7 },
      4: { workshop: 8 },
      5: { workshop: 8 },
    },
  },
  battle_formations: {
    id: 'battle_formations', name: 'Battle Formations', icon: '⚔️',
    description: 'Units attack +20% in the first wave of combat per level.',
    cost: { money: 600, wood: 200 }, researchTime: 150,
    effects: { firstWaveBonus: 0.20 }, requires: { workshop: 2, barracks: 3 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 3, barracks: 4 }, 4: { workshop: 4, barracks: 5 } },
  },
  rapid_construction: {
    id: 'rapid_construction', name: 'Rapid Construction', icon: '🏗️',
    description: 'All building construction time reduced by 15% per level (stacks, max 60%).',
    cost: { money: 700, stone: 300 }, researchTime: 200,
    effects: { buildTimeReduction: 0.15 }, requires: { workshop: 2 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 3 }, 4: { workshop: 4 } },
  },
  infrastructure: {
    id: 'infrastructure', name: 'Infrastructure', icon: '🏘️',
    description: 'Water production +30% and storage capacity increased by 20% per level.',
    cost: { money: 1000, stone: 200 }, researchTime: 220,
    effects: { waterBonus: 0.30, storageCapacityBonus: 0.20 }, requires: { workshop: 4, well: 2 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.7, levelTimeMultiplier: 1.5,
    levelRequirements: {
      2: { workshop: 5, well: 3 },
      3: { workshop: 6, well: 4 },
      4: { workshop: 7, well: 5 },
      5: { workshop: 8, well: 6 },
    },
  },
  elite_training: {
    id: 'elite_training', name: 'Elite Training', icon: '🏆',
    description: 'All unit HP +20% and attack +10% per level.',
    cost: { money: 1500, food: 200 }, researchTime: 300,
    effects: { hpBonus: 0.20, attackBonus: 0.10 }, requires: { workshop: 6, barracks: 5 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.8, levelTimeMultiplier: 1.6,
    levelRequirements: {
      2: { workshop: 7, barracks: 6 },
      3: { workshop: 8, barracks: 7 },
      4: { workshop: 8, barracks: 7 },
      5: { workshop: 8, barracks: 8 },
    },
  },
  infantry_mastery: {
    id: 'infantry_mastery', name: 'Infantry Mastery', icon: '🗡️',
    description: 'Unlocks Infantry tiers 4–10. Each research level unlocks the next 1 tier.',
    cost: { money: 1000, iron: 200 }, researchTime: 200,
    effects: { infantryTierBonus: 1 }, requires: { workshop: 3, infantryhall: 3 }, tier: 2,
    maxLevel: 7, levelCostMultiplier: 1.8, levelTimeMultiplier: 1.6,
    levelRequirements: {
      2: { workshop: 4, infantryhall: 4 }, 3: { workshop: 5, infantryhall: 5 },
      4: { workshop: 6, infantryhall: 6 }, 5: { workshop: 6, infantryhall: 7 },
      6: { workshop: 7, infantryhall: 8 }, 7: { workshop: 8, infantryhall: 9 },
    },
  },
  ranged_mastery: {
    id: 'ranged_mastery', name: 'Ranged Mastery', icon: '🏹',
    description: 'Unlocks Ranged tiers 4–10. Each research level unlocks the next 1 tier.',
    cost: { money: 1000, wood: 200 }, researchTime: 200,
    effects: { rangedTierBonus: 1 }, requires: { workshop: 3, archeryrange: 3 }, tier: 2,
    maxLevel: 7, levelCostMultiplier: 1.8, levelTimeMultiplier: 1.6,
    levelRequirements: {
      2: { workshop: 4, archeryrange: 4 }, 3: { workshop: 5, archeryrange: 5 },
      4: { workshop: 6, archeryrange: 6 }, 5: { workshop: 6, archeryrange: 7 },
      6: { workshop: 7, archeryrange: 8 }, 7: { workshop: 8, archeryrange: 8 },
    },
  },
  cavalry_mastery: {
    id: 'cavalry_mastery', name: 'Cavalry Mastery', icon: '🐴',
    description: 'Unlocks Cavalry tiers 4–10. Each research level unlocks the next 1 tier.',
    cost: { money: 1200, iron: 300 }, researchTime: 250,
    effects: { cavalryTierBonus: 1 }, requires: { workshop: 4, cavalrystable: 3 }, tier: 3,
    maxLevel: 7, levelCostMultiplier: 1.8, levelTimeMultiplier: 1.6,
    levelRequirements: {
      2: { workshop: 5, cavalrystable: 4 }, 3: { workshop: 5, cavalrystable: 5 },
      4: { workshop: 6, cavalrystable: 6 }, 5: { workshop: 7, cavalrystable: 7 },
      6: { workshop: 8, cavalrystable: 8 }, 7: { workshop: 8, cavalrystable: 9 },
    },
  },
  siege_mastery: {
    id: 'siege_mastery', name: 'Siege Mastery', icon: '💣',
    description: 'Unlocks Siege tiers 4–10. Each research level unlocks the next 1 tier.',
    cost: { money: 1500, iron: 400, wood: 300 }, researchTime: 300,
    effects: { siegeTierBonus: 1 }, requires: { workshop: 5, siegeworkshop: 3 }, tier: 3,
    maxLevel: 7, levelCostMultiplier: 1.9, levelTimeMultiplier: 1.7,
    levelRequirements: {
      2: { workshop: 5, siegeworkshop: 4 }, 3: { workshop: 6, siegeworkshop: 5 },
      4: { workshop: 6, siegeworkshop: 6 }, 5: { workshop: 7, siegeworkshop: 7 },
      6: { workshop: 8, siegeworkshop: 8 }, 7: { workshop: 8, siegeworkshop: 9 },
    },
  },
};

/**
 * QUEUE_CONFIG — Defines how many queue slots are available for each system
 * and what prerequisites unlock each additional slot.
 * `premium: true` means this slot also requires a premium purchase in addition to buildings.
 */
export const QUEUE_CONFIG = {
  research: [
    { slots: 1, requires: null, premium: false },
    { slots: 2, requires: { workshop: 2 }, premium: false },
    { slots: 3, requires: { workshop: 4 }, premium: true },
    { slots: 4, requires: { workshop: 6 }, premium: true },
  ],
  building: [
    { slots: 1, requires: null, premium: false },
    { slots: 2, requires: { construction_hall: 1 }, premium: false },
    { slots: 3, requires: { construction_hall: 2 }, premium: true },
    { slots: 4, requires: { construction_hall: 3 }, premium: true },
  ],
};

export const QUESTS_CONFIG = {
  first_building: {
    id: 'first_building', name: 'The First Stone',
    description: 'Build your first structure to begin your conquest.',
    briefing: 'Every great citadel begins with a single structure. Prove your intent and lay the foundation of your empire.',
    icon: '🏗️',
    objectives: [{ type: 'build', target: 'any', count: 1 }],
    rewards: { money: 200, xp: 50 }, category: 'tutorial',
    prerequisiteQuest: null,
  },
  recruit_army: {
    id: 'recruit_army', name: 'Army of One Hundred',
    description: 'Train 10 units to establish your military force.',
    briefing: 'Your keep needs defenders. A fortress without soldiers is just stone waiting to be taken.',
    icon: '⚔️',
    objectives: [{ type: 'train', target: 'any', count: 10 }],
    rewards: { money: 500, food: 100, xp: 200 }, category: 'military',
    prerequisiteQuest: 'first_building',
  },
  first_victory: {
    id: 'first_victory', name: 'Baptism by Fire',
    description: 'Win your first combat encounter.',
    briefing: 'The enemy does not wait for invitations. Take the fight to them and claim your first triumph in battle.',
    icon: '🔥',
    objectives: [{ type: 'combat_win', target: 'any', count: 1 }],
    rewards: { money: 1000, xp: 500 }, category: 'combat',
    prerequisiteQuest: 'recruit_army',
  },
  veteran_warrior: {
    id: 'veteran_warrior', name: 'Veteran Warrior',
    description: 'Win 5 battles to prove your military prowess.',
    briefing: 'One battle does not make a warrior. Five victories forge a commander whose name is whispered in fear.',
    icon: '🗡️',
    objectives: [{ type: 'combat_win', target: 'any', count: 5 }],
    rewards: { money: 2000, iron: 100, xp: 1000 }, category: 'combat',
    prerequisiteQuest: 'first_victory',
  },
  master_builder: {
    id: 'master_builder', name: 'Master Builder',
    description: 'Build or upgrade any structure 5 times.',
    briefing: 'Expand your base relentlessly. Every upgrade brings you closer to an unassailable fortress.',
    icon: '🏛️',
    objectives: [{ type: 'build', target: 'any', count: 5 }],
    rewards: { stone: 500, wood: 500, xp: 400 }, category: 'economy',
    prerequisiteQuest: null,
  },
  scholar: {
    id: 'scholar', name: 'Scholar of the Realm',
    description: 'Research 2 technologies.',
    briefing: 'Technology separates great commanders from merely lucky ones. Invest in the Workshop and let knowledge be your sharpest weapon.',
    icon: '🔬',
    objectives: [{ type: 'research', target: 'any', count: 2 }],
    rewards: { money: 1500, iron: 200, xp: 800 }, category: 'research',
    prerequisiteQuest: null,
  },
  rising_power: {
    id: 'rising_power', name: 'Rising Power',
    description: 'Reach Commander Level 5.',
    briefing: 'Prestige is earned through growth. Rise to Level 5 and the realm will take notice of your growing dominion.',
    icon: '👑',
    objectives: [{ type: 'reach_level', target: 5, count: 5 }],
    rewards: { money: 3000, xp: 500 }, category: 'progression',
    prerequisiteQuest: 'first_victory',
  },
};

export const ACHIEVEMENTS_CONFIG = {
  first_blood: {
    id: 'first_blood', name: 'First Blood', icon: '⚔️',
    description: 'Win your first battle.',
    trigger: 'combat_win', count: 1,
    reward: { xp: 200 }, rarity: 'common',
  },
  serial_victor: {
    id: 'serial_victor', name: 'Serial Victor', icon: '🏆',
    description: 'Win 10 battles.',
    trigger: 'combat_win', count: 10,
    reward: { money: 1000, xp: 500 }, rarity: 'uncommon',
  },
  warlord_title: {
    id: 'warlord_title', name: 'Warlord', icon: '🎖️',
    description: 'Win 50 battles.',
    trigger: 'combat_win', count: 50,
    reward: { money: 5000, xp: 2000 }, rarity: 'rare',
  },
  first_recruit: {
    id: 'first_recruit', name: 'First Recruit', icon: '🗡️',
    description: 'Train your first unit.',
    trigger: 'unit_trained', count: 1,
    reward: { money: 100, xp: 50 }, rarity: 'common',
  },
  standing_army: {
    id: 'standing_army', name: 'Standing Army', icon: '⚔️',
    description: 'Train 50 units in total.',
    trigger: 'unit_trained', count: 50,
    reward: { money: 2000, xp: 1000 }, rarity: 'uncommon',
  },
  first_upgrade: {
    id: 'first_upgrade', name: 'Builder Instinct', icon: '🏗️',
    description: 'Upgrade your first building.',
    trigger: 'build', count: 1,
    reward: { money: 100, xp: 50 }, rarity: 'common',
  },
  city_planner: {
    id: 'city_planner', name: 'City Planner', icon: '🏛️',
    description: 'Build or upgrade 20 structures.',
    trigger: 'build', count: 20,
    reward: { stone: 2000, xp: 1000 }, rarity: 'uncommon',
  },
  first_quest: {
    id: 'first_quest', name: 'Quest Taker', icon: '📜',
    description: 'Complete your first quest.',
    trigger: 'quest_completed', count: 1,
    reward: { xp: 150 }, rarity: 'common',
  },
  all_quests: {
    id: 'all_quests', name: 'Questmaster', icon: '📚',
    description: 'Complete all available quests.',
    trigger: 'quest_completed', count: 7,
    reward: { money: 5000, diamond: 5, xp: 3000 }, rarity: 'legendary',
  },
  tech_pioneer: {
    id: 'tech_pioneer', name: 'Tech Pioneer', icon: '🔬',
    description: 'Research your first technology.',
    trigger: 'research', count: 1,
    reward: { iron: 100, xp: 200 }, rarity: 'common',
  },
  mad_scientist: {
    id: 'mad_scientist', name: 'Mad Scientist', icon: '⚗️',
    description: 'Research 5 technologies.',
    trigger: 'research', count: 5,
    reward: { iron: 1000, xp: 1500 }, rarity: 'rare',
  },
  hero_recruiter: {
    id: 'hero_recruiter', name: 'Hero Recruiter', icon: '🦸',
    description: 'Recruit your first hero.',
    trigger: 'hero_recruited', count: 1,
    reward: { money: 500, xp: 300 }, rarity: 'uncommon',
  },
  hall_of_heroes: {
    id: 'hall_of_heroes', name: 'Hall of Heroes', icon: '👑',
    description: 'Recruit all 4 heroes.',
    trigger: 'hero_recruited', count: 4,
    reward: { money: 10000, diamond: 10, xp: 5000 }, rarity: 'legendary',
  },
};
/**
 * STORY_CHAPTERS — Linear narrative chapters triggered by in-game events.
 * triggerCondition types:
 *   { type: 'start' }                                      — fires on first game load
 *   { type: 'quest_completed', questId }                  — fires when a quest finishes
 *   { type: 'building_level', buildingId, level }         — fires when a building reaches level
 *   { type: 'player_level',   level }                     — fires when commander reaches level
 */
export const STORY_CHAPTERS = [
  {
    id: 'ch_beginning',
    title: 'The Abandoned Keep',
    icon: '🏰',
    arc: 'Prologue',
    arcColor: '#9b59b6',
    triggerCondition: { type: 'start' },
    dialogue: [
      { speaker: 'Narrator', text: 'An ancient keep sits upon a forgotten hill, long-abandoned and overgrown with vines. Crows circle in the grey sky above its crumbling walls.' },
      { speaker: 'Scout', text: 'Commander, the walls still hold. The foundations are solid — stone cut by artisans of the old empire. With enough resources and resolve, this place could become a fortress once more.' },
      { speaker: 'Commander', text: 'Then we start today. Lay the foundations and send word: our banner flies here now. Our legend begins at this very stone.' },
    ],
    rewards: { money: 100, wood: 50 },
    unlocksQuestIds: ['first_building'],
  },
  {
    id: 'ch_first_harvest',
    title: 'First Harvest',
    icon: '🌾',
    arc: 'Prologue',
    arcColor: '#9b59b6',
    triggerCondition: { type: 'quest_completed', questId: 'first_building' },
    dialogue: [
      { speaker: 'Steward', text: 'The first stone has been laid, Commander. But a keep without food is just an elaborate tomb.' },
      { speaker: 'Commander', text: 'Order the farmers to clear the southern fields. We need crops and we need them fast.' },
      { speaker: 'Steward', text: 'Wise counsel. Wood and gold will follow where there is will, but food is what feeds an army through a long siege. The people look to you.' },
    ],
    rewards: { food: 150, money: 200 },
    unlocksQuestIds: ['recruit_army'],
  },
  {
    id: 'ch_enemy_advances',
    title: 'The Enemy Advances',
    icon: '⚔️',
    arc: 'Act I — The First War',
    arcColor: '#e74c3c',
    triggerCondition: { type: 'building_level', buildingId: 'barracks', level: 1 },
    dialogue: [
      { speaker: 'Scout', text: 'Commander! Reports from the eastern ridge — goblin war camps have been spotted moving toward our borders. They grow bolder by the day.' },
      { speaker: 'Commander', text: 'Then we shall not wait for them to reach our walls. Train the soldiers. I want every able-bodied fighter ready for march within the week.' },
      { speaker: 'Warlord', text: 'Give me men and I will give you victory, Commander. The goblins will learn to fear this banner — we will carve our name into their memory.' },
    ],
    rewards: { money: 500, food: 100 },
    unlocksQuestIds: ['first_victory'],
  },
  {
    id: 'ch_arcane_awakening',
    title: 'Arcane Awakening',
    icon: '🔮',
    arc: 'Act I — The First War',
    arcColor: '#e74c3c',
    triggerCondition: { type: 'building_level', buildingId: 'workshop', level: 1 },
    dialogue: [
      { speaker: 'Scholar', text: 'Commander, the ley lines beneath this keep are extraordinary — far stronger than anything I have encountered in my travels. The Magic Tower is drinking deep from the earth itself.' },
      { speaker: 'Commander', text: 'Can we harness it for our forces? Turn this raw power into something that wins battles?' },
      { speaker: 'Scholar', text: 'With the right research, absolutely. Battle Mages, arcane amplification, alchemical transmutation — the possibilities are limitless. But it demands time, mana, and brilliant minds willing to push into the unknown.' },
    ],
    rewards: { iron: 100, money: 300 },
    unlocksQuestIds: ['scholar'],
  },
  {
    id: 'ch_scholars_path',
    title: "The Scholar's Path",
    icon: '🔬',
    arc: 'Act II — The Age of Discovery',
    arcColor: '#2980b9',
    triggerCondition: { type: 'quest_completed', questId: 'scholar' },
    dialogue: [
      { speaker: 'Scholar', text: 'The breakthroughs we have achieved these past months surpass anything I had hoped for when I first arrived at your gates, Commander.' },
      { speaker: 'Commander', text: 'And yet I feel we have only scratched the surface. There is an ancient power here that we have barely begun to understand.' },
      { speaker: 'Scholar', text: 'You are correct. There are sealed texts, forgotten technologies, and tactical insights yet to be uncovered. The true potential of this keep — of your empire — has barely stirred from its slumber.' },
    ],
    rewards: { iron: 200, money: 1000, xp: 500 },
    unlocksQuestIds: ['rising_power'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GACHA CONFIG
// Weighted probability tables for tiered recruitment scrolls.
// ─────────────────────────────────────────────────────────────────────────────
export const GACHA_CONFIG = {
  /** How many fragments needed to summon each tier hero via fragments alone */
  fragmentsToSummon: { common: 10, rare: 20, legendary: 30 },

  /** Fragment item IDs per hero */
  fragmentItemId: {
    warlord:       'fragment_warlord',
    archsorceress: 'fragment_archsorceress',
    shadowblade:   'fragment_shadowblade',
    paladin:       'fragment_paladin',
  },

  /** Outcome weights per scroll tier. Must sum to 100. */
  outcomeWeights: {
    common:    { resource: 40, xp_item: 30, buff: 15, fragment: 10, hero: 5  },
    rare:      { resource: 30, xp_item: 25, buff: 20, fragment: 17, hero: 8  },
    legendary: { resource: 20, xp_item: 20, buff: 20, fragment: 20, hero: 20 },
  },

  /** When outcome=hero, which tier hero is drawn. Must sum to 100. */
  heroTierWeights: {
    common:    { common: 91, rare: 8,  legendary: 1  },
    rare:      { common: 20, rare: 70, legendary: 10 },
    legendary: { common: 5,  rare: 30, legendary: 65 },
  },

  /** Resource bundle pool drawn randomly when outcome=resource */
  resourcePool: ['res_bundle_wood_sm', 'res_bundle_stone_sm', 'res_bundle_food_sm', 'res_bundle_iron_sm', 'res_bundle_water_sm'],

  /** XP bundle pool drawn randomly when outcome=xp_item */
  xpPool: {
    common:    ['xp_bundle_small'],
    rare:      ['xp_bundle_small', 'xp_bundle_medium'],
    legendary: ['xp_bundle_medium', 'xp_bundle_large'],
  },

  /** Buff pool drawn randomly when outcome=buff */
  buffPool: {
    common:    ['buff_prod_sm'],
    rare:      ['buff_prod_sm', 'buff_prod_lg'],
    legendary: ['buff_prod_lg'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS CONFIG
// All hero skills available in the game. Referenced by hero.skills arrays.
// type: 'passive' — always-on stat modifier unlocked at a level threshold.
// type: 'active'  — triggered during combat at specific conditions.
// ─────────────────────────────────────────────────────────────────────────────
export const SKILLS_CONFIG = {
  // Lord Arcturus — Warlord
  charge: {
    id: 'charge', name: 'Charge', type: 'active',
    unlockLevel: 5,
    icon: '💨',
    description: 'On battle start, units deal +20% damage for the first round.',
    effect: { trigger: 'battle_start', attackBonus: 0.20, duration: 1 },
  },
  battle_cry: {
    id: 'battle_cry', name: 'Battle Cry', type: 'passive',
    unlockLevel: 10,
    icon: '📣',
    description: '+10% attack to all squad heroes.',
    effect: { stat: 'attack', value: 0.10, scope: 'squad' },
  },
  iron_will: {
    id: 'iron_will', name: 'Iron Will', type: 'passive',
    unlockLevel: 20,
    icon: '🦾',
    description: 'Reduces troop losses by 8% in every battle.',
    effect: { stat: 'lossReduction', value: 0.08 },
  },

  // Lyra Dawnveil — Arch Sorceress
  fireball: {
    id: 'fireball', name: 'Fireball', type: 'active',
    unlockLevel: 5,
    icon: '🔥',
    description: 'Deals a burst of magic damage at the start of battle (+25% attack, one round).',
    effect: { trigger: 'battle_start', attackBonus: 0.25, duration: 1 },
  },
  arcane_nova: {
    id: 'arcane_nova', name: 'Arcane Nova', type: 'passive',
    unlockLevel: 10,
    icon: '🌀',
    description: '+15% magic amplify aura bonus (stacks with base aura).',
    effect: { stat: 'auraValue', value: 0.15 },
  },
  mana_shield: {
    id: 'mana_shield', name: 'Mana Shield', type: 'passive',
    unlockLevel: 20,
    icon: '🔵',
    description: '+12% defense for all squad units.',
    effect: { stat: 'defense', value: 0.12, scope: 'squad' },
  },

  // Kira Nightwhisper — Shadow Blade
  shadowstep: {
    id: 'shadowstep', name: 'Shadowstep', type: 'active',
    unlockLevel: 5,
    icon: '🌑',
    description: 'First round: hero evades one attack, dealing no losses to own side.',
    effect: { trigger: 'battle_start', evasion: true, duration: 1 },
  },
  poison_blade: {
    id: 'poison_blade', name: 'Poison Blade', type: 'passive',
    unlockLevel: 10,
    icon: '☠️',
    description: '+12% crit chance aura bonus (stacks with base aura).',
    effect: { stat: 'auraValue', value: 0.12 },
  },
  evasion: {
    id: 'evasion', name: 'Evasion', type: 'passive',
    unlockLevel: 20,
    icon: '🌬️',
    description: 'Reduces troop losses by 10% in every battle.',
    effect: { stat: 'lossReduction', value: 0.10 },
  },

  // Sir Aldric — Paladin
  divine_shield: {
    id: 'divine_shield', name: 'Divine Shield', type: 'active',
    unlockLevel: 5,
    icon: '✨',
    description: 'At battle start, reduces incoming damage by 30% for the first round.',
    effect: { trigger: 'battle_start', defenseBonus: 0.30, duration: 1 },
  },
  holy_light: {
    id: 'holy_light', name: 'Holy Light', type: 'passive',
    unlockLevel: 10,
    icon: '☀️',
    description: '+10% defense aura bonus (stacks with base aura).',
    effect: { stat: 'auraValue', value: 0.10 },
  },
  consecration: {
    id: 'consecration', name: 'Consecration', type: 'passive',
    unlockLevel: 20,
    icon: '🕊️',
    description: 'Reduces troop losses by 12% and restores 5% of lost units after battle.',
    effect: { stat: 'lossReduction', value: 0.12, postBattleHeal: 0.05 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AWAKENING CONFIG
// Star-based hero awakening. Costs duplicate hero cards OR fragments.
// Each star level grants stat buffs and increases aura value.
// ─────────────────────────────────────────────────────────────────────────────
export const AWAKENING_CONFIG = {
  maxStars: 5,

  /** Cost per star level (1-indexed: index 0 = going from 0→1 star) */
  starCosts: [
    { cards: 1, fragments: { common: 10, rare: 20, legendary: 30 } },
    { cards: 1, fragments: { common: 15, rare: 30, legendary: 45 } },
    { cards: 2, fragments: { common: 20, rare: 40, legendary: 60 } },
    { cards: 2, fragments: { common: 25, rare: 50, legendary: 75 } },
    { cards: 3, fragments: { common: 30, rare: 60, legendary: 90 } },
  ],

  /** Per-star bonus applied on top of base stats */
  perStarBonus: {
    statMultiplier: 0.10,   // +10% base stats per star
    auraValueBonus: 0.05,   // +5% aura value per star (absolute, not relative)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HQ UNLOCK TABLE
// Defines what buildings, unit types, and technologies become available as the
// Headquarters (townhall) is upgraded. Also provides per-level combat/production
// bonuses that apply globally to the player's base.
// ─────────────────────────────────────────────────────────────────────────────
export const HQ_UNLOCK_TABLE = {
  2: {
    buildings: ['archeryrange', 'infantryhall'],
    units:     ['infantry', 'ranged'],
    techs:     ['reinforced_lumber', 'improved_smelting'],
    benefits:  { productionBonus: 0.02, attackBonus: 0.00, defenseBonus: 0.00, storageBonus: 0.00 },
  },
  3: {
    buildings: ['cafeteria', 'house'],
    units:     [],
    techs:     ['battle_formations', 'rapid_construction'],
    benefits:  { productionBonus: 0.04, attackBonus: 0.01, defenseBonus: 0.01, storageBonus: 0.00 },
  },
  4: {
    buildings: ['heroquarters', 'cavalrystable'],
    units:     ['cavalry'],
    techs:     ['steel_armor'],
    benefits:  { productionBonus: 0.06, attackBonus: 0.02, defenseBonus: 0.02, storageBonus: 0.05 },
  },
  5: {
    buildings: ['workshop', 'siegeworkshop'],
    units:     ['siege'],
    techs:     ['advanced_tactics', 'infantry_mastery', 'ranged_mastery'],
    benefits:  { productionBonus: 0.08, attackBonus: 0.04, defenseBonus: 0.03, storageBonus: 0.10 },
  },
  6: {
    buildings: ['bank'],
    units:     [],
    techs:     ['cavalry_mastery', 'infrastructure'],
    benefits:  { productionBonus: 0.10, attackBonus: 0.06, defenseBonus: 0.05, storageBonus: 0.15 },
  },
  7: {
    buildings: [],
    units:     [],
    techs:     ['elite_training', 'siege_mastery'],
    benefits:  { productionBonus: 0.12, attackBonus: 0.08, defenseBonus: 0.07, storageBonus: 0.20 },
  },
  8: {
    buildings: ['magictower'],
    units:     [],
    techs:     [],
    benefits:  { productionBonus: 0.15, attackBonus: 0.10, defenseBonus: 0.10, storageBonus: 0.25 },
  },
  9: {
    buildings: [],
    units:     [],
    techs:     [],
    benefits:  { productionBonus: 0.18, attackBonus: 0.13, defenseBonus: 0.13, storageBonus: 0.30 },
  },
  10: {
    buildings: [],
    units:     [],
    techs:     [],
    benefits:  { productionBonus: 0.20, attackBonus: 0.15, defenseBonus: 0.15, storageBonus: 0.35 },
  },
};