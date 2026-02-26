/**
 * GAME_DATA.js
 * Static configuration for all game entities.
 * Phase 3: Added storehouse, 3 new monsters, 4 new tech, 4 new quests,
 *          ACHIEVEMENTS_CONFIG, CAMPAIGNS_CONFIG, and expanded hero/monster wave data.
 */

export const BUILDINGS_CONFIG = {
  townhall: {
    id: 'townhall', name: 'Town Hall', icon: '🏛️',
    description: 'The heart of your base. Upgrade to unlock new buildings and increase all caps.',
    maxLevel: 10,
    baseCost: { gold: 0, wood: 0, stone: 0 },
    costMultiplier: 2.0, buildTime: 0,
    effects: { unlockBuildings: true },
    storageCap: { gold: 2000, wood: 2000, stone: 2000, food: 500, mana: 100 },
    effectLabel: '📦 +2,000 storage cap / level · 🔓 Unlocks buildings',
    category: 'core', requires: null,
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
  },
  farm: {
    id: 'farm', name: 'Farm', icon: '🌾',
    description: 'Generates food to support a larger army.',
    maxLevel: 10,
    baseCost: { gold: 100, wood: 50, stone: 0 },
    costMultiplier: 1.6, buildTime: 10,
    effects: { food: 2 },
    effectLabel: '🌾 +2 Food/s per level',
    category: 'economy', requires: null,
    maxInstances: 4,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 3 } },
      { index: 2, condition: { townhall: 5 } },
      { index: 3, condition: { townhall: 7 } },
    ],
  },
  mine: {
    id: 'mine', name: 'Gold Mine', icon: '⛏️',
    description: 'Extracts gold from the earth.',
    maxLevel: 10,
    baseCost: { gold: 0, wood: 100, stone: 50 },
    costMultiplier: 1.8, buildTime: 15,
    effects: { gold: 3 },
    effectLabel: '💰 +3 Gold/s per level',
    category: 'economy', requires: null,
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
    baseCost: { gold: 50, wood: 0, stone: 50 },
    costMultiplier: 1.7, buildTime: 12,
    effects: { wood: 2.5 },
    effectLabel: '🪵 +2.5 Wood/s per level',
    category: 'economy', requires: null,
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
    baseCost: { gold: 150, wood: 100, stone: 0 },
    costMultiplier: 1.8, buildTime: 20,
    effects: { stone: 2 },
    effectLabel: '🪨 +2 Stone/s per level',
    category: 'economy', requires: null,
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
    baseCost: { gold: 300, wood: 200, stone: 150 },
    costMultiplier: 1.9, buildTime: 25,
    effects: {},
    storageCap: { gold: 3000, wood: 3000, stone: 3000, food: 1000, mana: 200 },
    effectLabel: '📦 +3,000 Gold/Wood/Stone cap · +1,000 Food cap · +200 Mana cap per level',
    category: 'economy', requires: null,
    maxInstances: 2,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 5 } },
    ],
  },
  magictower: {
    id: 'magictower', name: 'Magic Tower', icon: '🔮',
    description: 'Draws mana from ley lines for magical research.',
    maxLevel: 8,
    baseCost: { gold: 500, wood: 200, stone: 300 },
    costMultiplier: 2.0, buildTime: 60,
    effects: { mana: 1 },
    effectLabel: '💎 +1 Mana/s per level',
    category: 'magic', requires: { townhall: 3 },
    maxInstances: 2,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 6 } },
    ],
  },
  barracks: {
    id: 'barracks', name: 'Barracks', icon: '⚔️',
    description: 'Train soldiers to defend your base and raid enemies.',
    maxLevel: 8,
    baseCost: { gold: 200, wood: 150, stone: 100 },
    costMultiplier: 1.9, buildTime: 30,
    effects: { unitSlots: 10 },
    effectLabel: '🪖 +10 unit slots per level',
    category: 'military', requires: null,
    maxInstances: 2,
    instanceSlots: [
      { index: 0, condition: null },
      { index: 1, condition: { townhall: 4 } },
    ],
  },
  archeryrange: {
    id: 'archeryrange', name: 'Archery Range', icon: '🏹',
    description: 'Train ranged units with superior attack range.',
    maxLevel: 6,
    baseCost: { gold: 300, wood: 200, stone: 50 },
    costMultiplier: 1.9, buildTime: 45,
    effects: { unitSlots: 5 },
    effectLabel: '🏹 +5 unit slots per level',
    category: 'military', requires: { barracks: 2 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
  },
  heroquarters: {
    id: 'heroquarters', name: 'Hero Quarters', icon: '🦸',
    description: 'Recruit legendary heroes to lead your army.',
    maxLevel: 5,
    baseCost: { gold: 1000, wood: 500, stone: 500 },
    costMultiplier: 2.5, buildTime: 120,
    effects: { heroSlots: 1 },
    effectLabel: '👑 +1 hero slot per level',
    category: 'military', requires: { barracks: 3, townhall: 4 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
  },
  workshop: {
    id: 'workshop', name: 'Workshop', icon: '⚙️',
    description: 'Research technology and craft powerful equipment. Higher levels unlock more research queue slots.',
    maxLevel: 8,
    baseCost: { gold: 600, wood: 400, stone: 200 },
    costMultiplier: 2.1, buildTime: 90,
    effects: {},
    effectLabel: '🔬 Unlocks Research tab · Lv.2: 2nd research slot · Lv.4: 3rd slot (Premium) · Lv.6: 4th slot (Premium)',
    category: 'research', requires: { townhall: 5 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
  },
  construction_hall: {
    id: 'construction_hall', name: 'Construction Hall', icon: '🏗️',
    description: 'A dedicated facility for managing large-scale construction projects. Each level unlocks an additional build queue slot.',
    maxLevel: 3,
    baseCost: { gold: 800, wood: 500, stone: 400 },
    costMultiplier: 2.2, buildTime: 100,
    effects: {},
    effectLabel: '🏗️ Lv.1: 2nd build slot · Lv.2: 3rd slot (Premium) · Lv.3: 4th slot (Premium)',
    category: 'core', requires: { townhall: 2 },
    maxInstances: 1,
    instanceSlots: [{ index: 0, condition: null }],
  },
};

export const UNITS_CONFIG = {
  footman: {
    id: 'footman', name: 'Footman', icon: '🗡️',
    description: 'Basic melee infantry. Reliable and inexpensive.',
    cost: { gold: 50, food: 1 }, trainTime: 10,
    stats: { hp: 120, attack: 14, defense: 10, speed: 1.0 },
    category: 'melee', requires: { barracks: 1 }, tier: 1,
  },
  archer: {
    id: 'archer', name: 'Archer', icon: '🏹',
    description: 'Ranged unit. Low defense but high burst damage.',
    cost: { gold: 75, wood: 10, food: 1 }, trainTime: 15,
    stats: { hp: 80, attack: 22, defense: 5, speed: 1.2 },
    category: 'ranged', requires: { archeryrange: 1 }, tier: 1,
  },
  knight: {
    id: 'knight', name: 'Knight', icon: '🛡️',
    description: 'Heavy cavalry. High HP and attack but costs more food.',
    cost: { gold: 200, food: 3 }, trainTime: 40,
    stats: { hp: 350, attack: 40, defense: 25, speed: 1.5 },
    category: 'melee', requires: { barracks: 4 }, tier: 2,
  },
  mage: {
    id: 'mage', name: 'Battle Mage', icon: '🧙',
    description: 'Magical AoE attacker. Requires mana to sustain.',
    cost: { gold: 300, mana: 50, food: 2 }, trainTime: 60,
    stats: { hp: 70, attack: 60, defense: 4, speed: 0.8 },
    category: 'magic', requires: { magictower: 2 }, tier: 2,
  },
};

export const HEROES_CONFIG = {
  warlord: {
    id: 'warlord', name: 'Lord Arcturus', title: 'The Warlord', icon: '⚔️',
    tier: 'common',
    recruitCard: 'card_hero_warlord',
    description: 'A seasoned general who boosts the attack of all nearby melee units.',
    stats: { hp: 1500, attack: 80, defense: 40, speed: 1.2 },
    skills: ['charge', 'battle_cry', 'iron_will'],
    aura: { type: 'attack_boost', value: 0.15 },
    xpPerLevel: 500,
    buildingBonus: { stat: 'training_speed', label: 'Training Speed', buildingType: 'barracks' },
  },
  archsorceress: {
    id: 'archsorceress', name: 'Lyra Dawnveil', title: 'Arch Sorceress', icon: '🔮',
    tier: 'legendary',
    recruitCard: 'card_hero_archsorceress',
    description: 'Master of arcane magic. Devastating AoE spells.',
    stats: { hp: 900, attack: 160, defense: 12, speed: 0.9 },
    skills: ['fireball', 'arcane_nova', 'mana_shield'],
    aura: { type: 'magic_amplify', value: 0.25 },
    xpPerLevel: 600,
    buildingBonus: { stat: 'mana_production', label: 'Mana Output', buildingType: 'magictower' },
  },
  shadowblade: {
    id: 'shadowblade', name: 'Kira Nightwhisper', title: 'The Shadow Blade', icon: '🗡️',
    tier: 'rare',
    recruitCard: 'card_hero_shadowblade',
    description: 'Assassin class hero. High single-target burst and evasion.',
    stats: { hp: 1100, attack: 130, defense: 18, speed: 2.0 },
    skills: ['shadowstep', 'poison_blade', 'evasion'],
    aura: { type: 'crit_chance', value: 0.15 },
    xpPerLevel: 550,
    buildingBonus: { stat: 'gold_production', label: 'Gold Output', buildingType: 'mine' },
  },
  paladin: {
    id: 'paladin', name: 'Sir Aldric', title: 'The Paladin', icon: '✝️',
    tier: 'rare',
    recruitCard: 'card_hero_paladin',
    description: 'Holy warrior. Reduces casualties and boosts unit defense.',
    stats: { hp: 2000, attack: 60, defense: 70, speed: 0.9 },
    skills: ['divine_shield', 'holy_light', 'consecration'],
    aura: { type: 'defense_boost', value: 0.20 },
    xpPerLevel: 650,
    buildingBonus: { stat: 'defense', label: 'Base Defense', buildingType: 'heroquarters' },
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
    xpAmount: 250, goldCost: 500,
  },
  xp_bundle_medium: {
    id: 'xp_bundle_medium', type: 'xp_bundle',
    name: 'Tome of Experience (Medium)', icon: '📚',
    description: 'Grants 1,000 Hero XP to a chosen hero.',
    xpAmount: 1000, goldCost: 1800,
  },
  xp_bundle_large: {
    id: 'xp_bundle_large', type: 'xp_bundle',
    name: 'Tome of Experience (Grand)', icon: '📜',
    description: 'Grants 5,000 Hero XP to a chosen hero.',
    xpAmount: 5000, goldCost: 8000,
  },
  // ── Resource Bundles ─────────────────────────────────────────────────────
  res_bundle_gold_sm: {
    id: 'res_bundle_gold_sm', type: 'resource_bundle',
    name: 'Sack of Gold (Small)', icon: '💰',
    description: 'Instantly grants 1,000 Gold.',
    goldCost: 0, grants: { gold: 1000 }, rarity: 'common',
  },
  res_bundle_gold_lg: {
    id: 'res_bundle_gold_lg', type: 'resource_bundle',
    name: 'Sack of Gold (Large)', icon: '🏅',
    description: 'Instantly grants 5,000 Gold.',
    goldCost: 0, grants: { gold: 5000 }, rarity: 'rare',
  },
  res_bundle_wood_sm: {
    id: 'res_bundle_wood_sm', type: 'resource_bundle',
    name: 'Bundle of Timber', icon: '🪵',
    description: 'Instantly grants 1,000 Wood.',
    goldCost: 0, grants: { wood: 1000 }, rarity: 'common',
  },
  res_bundle_stone_sm: {
    id: 'res_bundle_stone_sm', type: 'resource_bundle',
    name: 'Load of Stone', icon: '🪨',
    description: 'Instantly grants 1,000 Stone.',
    goldCost: 0, grants: { stone: 1000 }, rarity: 'common',
  },
  res_bundle_food_sm: {
    id: 'res_bundle_food_sm', type: 'resource_bundle',
    name: 'Ration Pack', icon: '🌾',
    description: 'Instantly grants 1,000 Food.',
    goldCost: 0, grants: { food: 1000 }, rarity: 'common',
  },
  // ── Buffs ─────────────────────────────────────────────────────────────────
  buff_prod_sm: {
    id: 'buff_prod_sm', type: 'buff',
    name: 'Production Boost (Minor)', icon: '⚗️',
    description: '+25% all resource production for 1 hour.',
    goldCost: 0, durationMs: 3600000, value: 0.25, rarity: 'common',
  },
  buff_prod_lg: {
    id: 'buff_prod_lg', type: 'buff',
    name: 'Production Boost (Major)', icon: '🔥',
    description: '+50% all resource production for 2 hours.',
    goldCost: 0, durationMs: 7200000, value: 0.50, rarity: 'rare',
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
      { itemId: 'scroll_common',    goldCost: 800,  featured: false },
      { itemId: 'scroll_rare',      goldCost: 2500, featured: true  },
      { itemId: 'scroll_legendary', goldCost: 6000, featured: false },
    ],
  },
  {
    id: 'hero_cards', label: 'Hero Cards', icon: '🃏',
    items: [
      { itemId: 'card_hero_warlord',      goldCost: 1500 },
      { itemId: 'card_hero_paladin',       goldCost: 2500 },
      { itemId: 'card_hero_shadowblade',   goldCost: 2500 },
      { itemId: 'card_hero_archsorceress', goldCost: 5000, featured: true },
    ],
  },
  {
    id: 'universal_cards', label: 'Universal Cards', icon: '🎴',
    items: [
      { itemId: 'card_common',    goldCost: 800  },
      { itemId: 'card_rare',      goldCost: 2000 },
      { itemId: 'card_legendary', goldCost: 6000 },
    ],
  },
  {
    id: 'experience', label: 'XP Bundles', icon: '📖',
    items: [
      { itemId: 'xp_bundle_small',  goldCost: 500 },
      { itemId: 'xp_bundle_medium', goldCost: 1800, featured: true },
      { itemId: 'xp_bundle_large',  goldCost: 8000 },
    ],
  },
  {
    id: 'resources', label: 'Resources', icon: '📦',
    items: [
      { itemId: 'res_bundle_gold_sm',  goldCost: 400 },
      { itemId: 'res_bundle_gold_lg',  goldCost: 1600 },
      { itemId: 'res_bundle_wood_sm',  goldCost: 300 },
      { itemId: 'res_bundle_stone_sm', goldCost: 300 },
      { itemId: 'res_bundle_food_sm',  goldCost: 250 },
    ],
  },
  {
    id: 'buffs', label: 'Buffs', icon: '⚗️',
    items: [
      { itemId: 'buff_prod_sm', goldCost: 1200 },
      { itemId: 'buff_prod_lg', goldCost: 3000 },
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
    rewards: { gold: 150, wood: 50, xp: 100 },
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
    rewards: { gold: 250, wood: 80, xp: 200 },
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
    rewards: { gold: 400, stone: 100, xp: 300 },
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
    rewards: { gold: 600, stone: 150, xp: 480 },
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
    rewards: { gold: 800, mana: 100, xp: 600 },
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
    rewards: { gold: 1200, stone: 300, mana: 80, xp: 900 },
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
    rewards: { gold: 2000, mana: 300, stone: 500, xp: 1200 },
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
    rewards: { gold: 5000, mana: 500, xp: 2000 },
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
    rewards: { gold: 10000, mana: 1000, stone: 1500, xp: 5000 },
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
    rewards: { gold: 15000, mana: 2000, xp: 8000 },
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
    description: 'Gold Mine production +25% per level.',
    cost: { gold: 500, mana: 50 }, researchTime: 120,
    effects: { goldBonus: 0.25 }, requires: { workshop: 1 }, tier: 1,
    maxLevel: 3, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 2: { workshop: 2 }, 3: { workshop: 4 } },
  },
  reinforced_lumber: {
    id: 'reinforced_lumber', name: 'Reinforced Lumber', icon: '🪵',
    description: 'Lumber Mill production +25% per level.',
    cost: { gold: 400, stone: 100 }, researchTime: 90,
    effects: { woodBonus: 0.25 }, requires: { workshop: 1 }, tier: 1,
    maxLevel: 3, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 2: { workshop: 2 }, 3: { workshop: 3 } },
  },
  steel_armor: {
    id: 'steel_armor', name: 'Steel Armor', icon: '🛡️',
    description: 'All unit defense +25 and losses in battle reduced by 15% per level.',
    cost: { gold: 800, stone: 200 }, researchTime: 180,
    effects: { defenseBonus: 25, lossReduction: 0.15 }, requires: { workshop: 3 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 4 }, 4: { workshop: 5 } },
  },
  arcane_amplification: {
    id: 'arcane_amplification', name: 'Arcane Amplification', icon: '🔮',
    description: 'Mage attack +30% and Magic Tower production +50% per level.',
    cost: { gold: 1200, mana: 300 }, researchTime: 240,
    effects: { mageAttackBonus: 0.30, manaBonus: 0.50 },
    requires: { workshop: 5, magictower: 3 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.7, levelTimeMultiplier: 1.5,
    levelRequirements: {
      2: { workshop: 6, magictower: 4 },
      3: { workshop: 7, magictower: 5 },
      4: { workshop: 8, magictower: 6 },
      5: { workshop: 8, magictower: 7 },
    },
  },
  battle_formations: {
    id: 'battle_formations', name: 'Battle Formations', icon: '⚔️',
    description: 'Units attack +20% in the first wave of combat per level.',
    cost: { gold: 600, wood: 200 }, researchTime: 150,
    effects: { firstWaveBonus: 0.20 }, requires: { workshop: 2, barracks: 3 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 3, barracks: 4 }, 4: { workshop: 4, barracks: 5 } },
  },
  rapid_construction: {
    id: 'rapid_construction', name: 'Rapid Construction', icon: '🏗️',
    description: 'All building construction time reduced by 15% per level (stacks, max 60%).',
    cost: { gold: 700, stone: 300 }, researchTime: 200,
    effects: { buildTimeReduction: 0.15 }, requires: { workshop: 2 }, tier: 2,
    maxLevel: 4, levelCostMultiplier: 1.6, levelTimeMultiplier: 1.5,
    levelRequirements: { 3: { workshop: 3 }, 4: { workshop: 4 } },
  },
  alchemy: {
    id: 'alchemy', name: 'Alchemy', icon: '⚗️',
    description: 'Market trade ratios improved by 20% and Mana generation +30% per level.',
    cost: { gold: 1000, mana: 200 }, researchTime: 220,
    effects: { tradeBonus: 0.20, manaBonus: 0.30 }, requires: { workshop: 4, magictower: 2 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.7, levelTimeMultiplier: 1.5,
    levelRequirements: {
      2: { workshop: 5, magictower: 3 },
      3: { workshop: 6, magictower: 4 },
      4: { workshop: 7, magictower: 5 },
      5: { workshop: 8, magictower: 6 },
    },
  },
  elite_training: {
    id: 'elite_training', name: 'Elite Training', icon: '🏆',
    description: 'All unit HP +20% and attack +10% per level.',
    cost: { gold: 1500, food: 200 }, researchTime: 300,
    effects: { hpBonus: 0.20, attackBonus: 0.10 }, requires: { workshop: 6, barracks: 5 }, tier: 3,
    maxLevel: 5, levelCostMultiplier: 1.8, levelTimeMultiplier: 1.6,
    levelRequirements: {
      2: { workshop: 7, barracks: 6 },
      3: { workshop: 8, barracks: 7 },
      4: { workshop: 8, barracks: 7 },
      5: { workshop: 8, barracks: 8 },
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
    rewards: { gold: 200, xp: 50 }, category: 'tutorial',
    prerequisiteQuest: null,
  },
  recruit_army: {
    id: 'recruit_army', name: 'Army of One Hundred',
    description: 'Train 10 units to establish your military force.',
    briefing: 'Your keep needs defenders. A fortress without soldiers is just stone waiting to be taken.',
    icon: '⚔️',
    objectives: [{ type: 'train', target: 'any', count: 10 }],
    rewards: { gold: 500, food: 100, xp: 200 }, category: 'military',
    prerequisiteQuest: 'first_building',
  },
  first_victory: {
    id: 'first_victory', name: 'Baptism by Fire',
    description: 'Win your first combat encounter.',
    briefing: 'The enemy does not wait for invitations. Take the fight to them and claim your first triumph in battle.',
    icon: '🔥',
    objectives: [{ type: 'combat_win', target: 'any', count: 1 }],
    rewards: { gold: 1000, xp: 500 }, category: 'combat',
    prerequisiteQuest: 'recruit_army',
  },
  veteran_warrior: {
    id: 'veteran_warrior', name: 'Veteran Warrior',
    description: 'Win 5 battles to prove your military prowess.',
    briefing: 'One battle does not make a warrior. Five victories forge a commander whose name is whispered in fear.',
    icon: '🗡️',
    objectives: [{ type: 'combat_win', target: 'any', count: 5 }],
    rewards: { gold: 2000, mana: 100, xp: 1000 }, category: 'combat',
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
    rewards: { gold: 1500, mana: 200, xp: 800 }, category: 'research',
    prerequisiteQuest: null,
  },
  rising_power: {
    id: 'rising_power', name: 'Rising Power',
    description: 'Reach Commander Level 5.',
    briefing: 'Prestige is earned through growth. Rise to Level 5 and the realm will take notice of your growing dominion.',
    icon: '👑',
    objectives: [{ type: 'reach_level', target: 5, count: 5 }],
    rewards: { gold: 3000, xp: 500 }, category: 'progression',
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
    reward: { gold: 1000, xp: 500 }, rarity: 'uncommon',
  },
  warlord_title: {
    id: 'warlord_title', name: 'Warlord', icon: '🎖️',
    description: 'Win 50 battles.',
    trigger: 'combat_win', count: 50,
    reward: { gold: 5000, xp: 2000 }, rarity: 'rare',
  },
  first_recruit: {
    id: 'first_recruit', name: 'First Recruit', icon: '🗡️',
    description: 'Train your first unit.',
    trigger: 'unit_trained', count: 1,
    reward: { gold: 100, xp: 50 }, rarity: 'common',
  },
  standing_army: {
    id: 'standing_army', name: 'Standing Army', icon: '⚔️',
    description: 'Train 50 units in total.',
    trigger: 'unit_trained', count: 50,
    reward: { gold: 2000, xp: 1000 }, rarity: 'uncommon',
  },
  first_upgrade: {
    id: 'first_upgrade', name: 'Builder Instinct', icon: '🏗️',
    description: 'Upgrade your first building.',
    trigger: 'build', count: 1,
    reward: { gold: 100, xp: 50 }, rarity: 'common',
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
    reward: { gold: 5000, mana: 500, xp: 3000 }, rarity: 'legendary',
  },
  tech_pioneer: {
    id: 'tech_pioneer', name: 'Tech Pioneer', icon: '🔬',
    description: 'Research your first technology.',
    trigger: 'research', count: 1,
    reward: { mana: 100, xp: 200 }, rarity: 'common',
  },
  mad_scientist: {
    id: 'mad_scientist', name: 'Mad Scientist', icon: '⚗️',
    description: 'Research 5 technologies.',
    trigger: 'research', count: 5,
    reward: { mana: 1000, xp: 1500 }, rarity: 'rare',
  },
  hero_recruiter: {
    id: 'hero_recruiter', name: 'Hero Recruiter', icon: '🦸',
    description: 'Recruit your first hero.',
    trigger: 'hero_recruited', count: 1,
    reward: { gold: 500, xp: 300 }, rarity: 'uncommon',
  },
  hall_of_heroes: {
    id: 'hall_of_heroes', name: 'Hall of Heroes', icon: '👑',
    description: 'Recruit all 4 heroes.',
    trigger: 'hero_recruited', count: 4,
    reward: { gold: 10000, mana: 1000, xp: 5000 }, rarity: 'legendary',
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
    rewards: { gold: 100, wood: 50 },
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
    rewards: { food: 150, gold: 200 },
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
    rewards: { gold: 500, food: 100 },
    unlocksQuestIds: ['first_victory'],
  },
  {
    id: 'ch_arcane_awakening',
    title: 'Arcane Awakening',
    icon: '🔮',
    arc: 'Act I — The First War',
    arcColor: '#e74c3c',
    triggerCondition: { type: 'building_level', buildingId: 'magictower', level: 1 },
    dialogue: [
      { speaker: 'Scholar', text: 'Commander, the ley lines beneath this keep are extraordinary — far stronger than anything I have encountered in my travels. The Magic Tower is drinking deep from the earth itself.' },
      { speaker: 'Commander', text: 'Can we harness it for our forces? Turn this raw power into something that wins battles?' },
      { speaker: 'Scholar', text: 'With the right research, absolutely. Battle Mages, arcane amplification, alchemical transmutation — the possibilities are limitless. But it demands time, mana, and brilliant minds willing to push into the unknown.' },
    ],
    rewards: { mana: 100, gold: 300 },
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
    rewards: { mana: 200, gold: 1000, xp: 500 },
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
  resourcePool: ['res_bundle_gold_sm', 'res_bundle_wood_sm', 'res_bundle_stone_sm', 'res_bundle_food_sm'],

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