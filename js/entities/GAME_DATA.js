/**
 * GAME_DATA.js
 * Barrel re-export — all game data is split into focused domain files under js/entities/data/.
 * Import from this file exactly as before; no consumers need to change.
 *
 * Domain files:
 *   data/buildings.js   — BUILDINGS_CONFIG, QUEUE_CONFIG, HQ_UNLOCK_TABLE
 *   data/units.js       — UNITS_CONFIG
 *   data/heroes.js      — HERO_CLASSIFICATIONS, BUFF_CATEGORIES, AURA_BUFF_CATEGORY,
 *                          HEROES_CONFIG, SKILLS_CONFIG, AWAKENING_CONFIG, GACHA_CONFIG
 *   data/economy.js     — INVENTORY_ITEMS, SHOP_CONFIG
 *   data/combat.js      — MONSTERS_CONFIG, CAMPAIGNS_CONFIG, ENCOUNTER_MODIFIERS
 *   data/tech.js        — TECH_CONFIG
 *   data/progression.js — QUESTS_CONFIG, ACHIEVEMENTS_CONFIG, CHALLENGES_CONFIG,
 *                          DAILY_PASS_CONFIG, CHALLENGE_PASS_CONFIG,
 *                          DAILY_LOGIN_REWARDS, DAILY_LOGIN_MILESTONE
 *   data/story.js       — STORY_CHAPTERS
 */

export { BUILDINGS_CONFIG, QUEUE_CONFIG, HQ_UNLOCK_TABLE } from './data/buildings.js';
export { UNITS_CONFIG } from './data/units.js';
export {
  HERO_CLASSIFICATIONS, BUFF_CATEGORIES, AURA_BUFF_CATEGORY,
  HEROES_CONFIG, SKILLS_CONFIG, AWAKENING_CONFIG, GACHA_CONFIG
} from './data/heroes.js';
export { INVENTORY_ITEMS, SHOP_CONFIG } from './data/economy.js';
export { MONSTERS_CONFIG, CAMPAIGNS_CONFIG, ENCOUNTER_MODIFIERS } from './data/combat.js';
export { TECH_CONFIG } from './data/tech.js';
export {
  QUESTS_CONFIG, ACHIEVEMENTS_CONFIG, CHALLENGES_CONFIG,
  DAILY_PASS_CONFIG, CHALLENGE_PASS_CONFIG,
  DAILY_LOGIN_REWARDS, DAILY_LOGIN_MILESTONE
} from './data/progression.js';
export { STORY_CHAPTERS } from './data/story.js';
