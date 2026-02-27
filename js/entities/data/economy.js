/**
 * data/economy.js
 * Inventory item definitions and shop configuration.
 */

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
