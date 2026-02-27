/**
 * data/progression.js
 * Quests, achievements, challenges, daily login rewards, and pass configs.
 */

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

// ─── CHALLENGES CONFIG ────────────────────────────────────────────
// Each challenge: id, type ('daily'|'weekly'), name, description,
//   objective: { event, count, countField? },
//   reward: { resources },  xpReward: pass XP awarded on claim
export const CHALLENGES_CONFIG = [
  // ══ Daily (total max XP: 580) ════════════════════════════════════
  {
    id:          'daily_research',
    type:        'daily',
    name:        'Research Rush',
    description: 'Complete 1 research today',
    objective:   { event: 'tech:researched', count: 1 },
    reward:      { money: 600, iron: 150 },
    xpReward:    40,   // easiest daily
  },
  {
    id:          'daily_market_trades',
    type:        'daily',
    name:        'Market Day',
    description: 'Make 5 market trades today',
    objective:   { event: 'market:traded', count: 5 },
    reward:      { money: 1200, wood: 400 },
    xpReward:    50,
  },
  {
    id:          'daily_start_builds',
    type:        'daily',
    name:        'Construction Spree',
    description: 'Start 3 construction projects today',
    objective:   { event: 'building:started', count: 3 },
    reward:      { wood: 600, stone: 600 },
    xpReward:    60,
  },
  {
    id:          'daily_complete_quests',
    type:        'daily',
    name:        'Task Force',
    description: 'Complete 2 quests today',
    objective:   { event: 'quest:completed', count: 2 },
    reward:      { wood: 500, stone: 500, iron: 300 },
    xpReward:    65,
  },
  {
    id:          'daily_train_units',
    type:        'daily',
    name:        'Boot Camp',
    description: 'Train 200 units today',
    objective:   { event: 'unit:trained', count: 200, countField: 'count' },
    reward:      { money: 800, iron: 200 },
    xpReward:    75,
  },
  {
    id:          'daily_recruit_hero',
    type:        'daily',
    name:        'Hero Hunter',
    description: 'Recruit 1 hero today',
    objective:   { event: 'hero:recruited', count: 1 },
    reward:      { diamond: 2, money: 800 },
    xpReward:    80,
  },
  {
    id:          'daily_win_battles',
    type:        'daily',
    name:        "Warrior's Trial",
    description: 'Win 3 battles today',
    objective:   { event: 'combat:victory', count: 3 },
    reward:      { money: 1000, diamond: 1 },
    xpReward:    90,
  },
  {
    id:          'daily_unlock_achievement',
    type:        'daily',
    name:        'Achievement Seeker',
    description: 'Unlock 1 achievement today',
    objective:   { event: 'achievement:unlocked', count: 1 },
    reward:      { money: 1500, diamond: 2 },
    xpReward:    120,  // hardest daily — achievements are rare
  },
  // ══ Weekly (total max XP: 1,750) ═════════════════════════════════
  {
    id:          'weekly_market_trades',
    type:        'weekly',
    name:        'Market Maven',
    description: 'Make 10 market trades this week',
    objective:   { event: 'market:traded', count: 10 },
    reward:      { money: 3000, diamond: 3 },
    xpReward:    150,
  },
  {
    id:          'weekly_buildings_built',
    type:        'weekly',
    name:        'Master Builder',
    description: 'Complete 5 construction projects this week',
    objective:   { event: 'building:completed', count: 5 },
    reward:      { diamond: 5, money: 2000 },
    xpReward:    175,
  },
  {
    id:          'weekly_complete_quests',
    type:        'weekly',
    name:        'Quest Chain',
    description: 'Complete 10 quests this week',
    objective:   { event: 'quest:completed', count: 10 },
    reward:      { money: 3500, wood: 1000, iron: 500 },
    xpReward:    200,
  },
  {
    id:          'weekly_research',
    type:        'weekly',
    name:        'Tech Tree Climber',
    description: 'Research 5 technologies this week',
    objective:   { event: 'tech:researched', count: 5 },
    reward:      { money: 4000, iron: 1000 },
    xpReward:    225,
  },
  {
    id:          'weekly_achievements',
    type:        'weekly',
    name:        'Hall of Fame',
    description: 'Unlock 3 achievements this week',
    objective:   { event: 'achievement:unlocked', count: 3 },
    reward:      { diamond: 10, money: 4000 },
    xpReward:    275,
  },
  {
    id:          'weekly_win_battles',
    type:        'weekly',
    name:        'Battle Hardened',
    description: 'Win 20 battles this week',
    objective:   { event: 'combat:victory', count: 20 },
    reward:      { money: 5000, diamond: 5 },
    xpReward:    325,
  },
  {
    id:          'weekly_train_units',
    type:        'weekly',
    name:        'War Machine',
    description: 'Train 1,000 units this week',
    objective:   { event: 'unit:trained', count: 1000, countField: 'count' },
    reward:      { money: 6000, diamond: 8 },
    xpReward:    400,  // hardest weekly
  },
];

// ─── DAILY LOGIN REWARDS ──────────────────────────────────────────
// 7-day cycle; day 8+ wraps back to day 1.
// Every 30th consecutive day the MILESTONE entry fires instead.
export const DAILY_LOGIN_REWARDS = [
  { day: 1, label: 'Day 1',  rewards: { money: 500 } },
  { day: 2, label: 'Day 2',  rewards: { wood: 300, stone: 200 } },
  { day: 3, label: 'Day 3',  rewards: { iron: 200 } },
  { day: 4, label: 'Day 4',  rewards: { money: 1000, wood: 500 } },
  { day: 5, label: 'Day 5',  rewards: { iron: 400, stone: 300 } },
  { day: 6, label: 'Day 6',  rewards: { money: 1500, diamond: 2 } },
  { day: 7, label: 'Day 7',  rewards: { diamond: 5, money: 2000 }, items: ['xp_bundle_small'] },
];

/** Fired instead of the normal day when streak is a multiple of 30. */
export const DAILY_LOGIN_MILESTONE = { diamond: 50, money: 5000 };

// ─── DAILY CHALLENGE PASS ─────────────────────────────────────────
// Resets each day. Max daily XP = 580 (all 8 dailies completed).
// 5 milestones spread across the full range.
export const DAILY_PASS_CONFIG = [
  { xp:  80, label: '+1,000 Gold',          rewards: { money: 1000                }, icon: '🪙' },
  { xp: 200, label: 'Common Scroll',        rewards: { items: ['scroll_common']   }, icon: '📜' },
  { xp: 360, label: '+5 Diamonds',          rewards: { diamond: 5                 }, icon: '💎' },
  { xp: 480, label: '+2,000 Gold & Iron',   rewards: { money: 2000, iron: 300     }, icon: '⚗️' },
  { xp: 580, label: '+8 Diamonds',          rewards: { diamond: 8                 }, icon: '👑' },
];

// ─── WEEKLY CHALLENGE PASS ────────────────────────────────────────
// Resets each Monday. Max weekly XP = 1,750 (all 7 weeklies completed).
// 6 milestones spread across the full range.
export const CHALLENGE_PASS_CONFIG = [
  { xp:  200, label: '+5 Diamonds',         rewards: { diamond: 5                  }, icon: '💎' },
  { xp:  500, label: 'Rare Scroll',         rewards: { items: ['scroll_rare']      }, icon: '📜' },
  { xp:  875, label: '+10 Diamonds',        rewards: { diamond: 10, money: 2000    }, icon: '💎' },
  { xp: 1200, label: 'Rare Hero Card',      rewards: { items: ['card_rare']        }, icon: '🃏' },
  { xp: 1500, label: '+20 Diamonds',        rewards: { diamond: 20                 }, icon: '💎' },
  { xp: 1750, label: 'Legendary Scroll',    rewards: { items: ['scroll_legendary'] }, icon: '📜' },
];
