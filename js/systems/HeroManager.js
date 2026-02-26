/**
 * HeroManager.js
 * Manages hero recruitment (card-based), assignment (squad or building),
 * XP leveling, and combat bonus calculation.
 *
 * Recruitment: Heroes are unlocked via Hero Cards from the player inventory,
 *   not by directly spending base resources.
 *
 * Assignment:
 *   - Squad (max 3): Hero contributes aura bonuses to every battle.
 *   - Building (1 per building): Hero boosts that building's output.
 *   Both are mutually exclusive per hero.
 *
 * Leveling: XP only. Sources are battle victories and purchased XP bundles.
 */
import { eventBus }                       from '../core/EventBus.js';
import {
  HEROES_CONFIG,
  INVENTORY_ITEMS,
  GACHA_CONFIG,
  SKILLS_CONFIG,
  AWAKENING_CONFIG,
} from '../entities/GAME_DATA.js';

const MAX_SQUAD_HEROES = 3;

export class HeroManager {
  /**
   * @param {object} resourceManager
   * @param {object} buildingManager
   * @param {object} inventoryManager
   */
  constructor(resourceManager, buildingManager, inventoryManager) {
    this.name = 'HeroManager';
    this._rm  = resourceManager;
    this._bm  = buildingManager;
    this._inv = inventoryManager;

    /**
     * @type {Map<string, {
     *   heroId: string,
     *   level: number,
     *   xp: number,
     *   xpToNext: number,
     *   stars: number,
     *   effectiveStats: { hp: number, attack: number, defense: number, speed: number },
     *   assignment: { type: 'none'|'squad'|'building', buildingId?: string }
     * }>}
     */
    this._owned = new Map();

    /** Tracks active production buffs: [{value, endsAt}] */
    this._activeBuffs = [];
  }

  // =============================================
  // RECRUITMENT — Card-based
  // =============================================

  // =============================================
  // GACHA — Scroll-based recruitment
  // =============================================

  /**
   * Roll a recruitment scroll and return the result.
   * Consumes ONE scroll from inventory.
   * @param {string} scrollTier  'common' | 'rare' | 'legendary'
   * @returns {{
   *   outcome: 'resource'|'xp_item'|'buff'|'fragment'|'hero',
   *   itemId?: string,
   *   heroId?: string,
   *   isDuplicate?: boolean,
   *   tier?: string,
   *   reason?: string
   * }}
   */
  rollScroll(scrollTier) {
    const scrollId = `scroll_${scrollTier}`;
    if (!this._inv?.hasItem(scrollId)) {
      return { outcome: null, reason: 'No scroll of this tier.' };
    }

    this._inv.removeItem(scrollId, 1);

    const outcome = this._weightedRandom(GACHA_CONFIG.outcomeWeights[scrollTier]);
    let result = { outcome, scrollTier };

    if (outcome === 'resource') {
      const pool   = GACHA_CONFIG.resourcePool;
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      this._inv.addItem(itemId, 1);
      result.itemId = itemId;

    } else if (outcome === 'xp_item') {
      const pool   = GACHA_CONFIG.xpPool[scrollTier];
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      this._inv.addItem(itemId, 1);
      result.itemId = itemId;

    } else if (outcome === 'buff') {
      const pool   = GACHA_CONFIG.buffPool[scrollTier];
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      this._inv.addItem(itemId, 1);
      result.itemId = itemId;

    } else if (outcome === 'fragment') {
      const heroTier    = this._weightedRandom(GACHA_CONFIG.heroTierWeights[scrollTier]);
      const heroesOfTier = Object.values(HEROES_CONFIG).filter(h => h.tier === heroTier);
      const heroTarget  = heroesOfTier[Math.floor(Math.random() * heroesOfTier.length)];
      const fragmentId  = GACHA_CONFIG.fragmentItemId[heroTarget.id];
      if (fragmentId) {
        this._inv.addItem(fragmentId, 1);
        result.itemId  = fragmentId;
        result.heroId  = heroTarget.id;
        result.tier    = heroTier;
        // Check if enough fragments to summon
        const needed   = GACHA_CONFIG.fragmentsToSummon[heroTarget.tier];
        const owned    = this._inv.getQuantity(fragmentId);
        result.fragmentsOwned  = owned;
        result.fragmentsNeeded = needed;
        result.canSummon       = owned >= needed && !this._owned.has(heroTarget.id);
      }

    } else if (outcome === 'hero') {
      const heroTier     = this._weightedRandom(GACHA_CONFIG.heroTierWeights[scrollTier]);
      const candidates   = Object.values(HEROES_CONFIG).filter(h => h.tier === heroTier);
      const heroCfg      = candidates[Math.floor(Math.random() * candidates.length)];
      result.heroId      = heroCfg.id;
      result.tier        = heroTier;
      result.isDuplicate = this._owned.has(heroCfg.id);

      if (!result.isDuplicate) {
        this._recruitHero(heroCfg.id);
      } else {
        // Give a specific hero card as duplicate compensation
        const cardId = heroCfg.recruitCard;
        if (cardId && INVENTORY_ITEMS[cardId]) {
          this._inv.addItem(cardId, 1);
          result.itemId = cardId;
        }
      }
    }

    eventBus.emit('heroes:updated', this.getRosterWithState());
    return result;
  }

  /** @private weighted random pick from { key: weight } object */
  _weightedRandom(table) {
    let roll = Math.random() * 100;
    for (const [key, weight] of Object.entries(table)) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return Object.keys(table).at(-1);
  }

  /** @private Summon a fragment-based hero if enough fragments are held */
  summonFromFragments(heroId) {
    const heroCfg    = HEROES_CONFIG[heroId];
    if (!heroCfg) return { success: false, reason: 'Unknown hero.' };
    if (this._owned.has(heroId)) return { success: false, reason: 'Hero already owned.' };
    const fragmentId = GACHA_CONFIG.fragmentItemId[heroId];
    const needed     = GACHA_CONFIG.fragmentsToSummon[heroCfg.tier];
    if (!fragmentId || !needed) return { success: false, reason: 'No fragment config for this hero.' };
    if (!this._inv.hasItem(fragmentId, needed)) {
      return { success: false, reason: `Need ${needed} fragments (have ${this._inv.getQuantity(fragmentId)}).` };
    }
    this._inv.removeItem(fragmentId, needed);
    this._recruitHero(heroId);
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true, heroId };
  }

  /** Convert a hero fragment to XP on the target hero */
  useFragmentAsXP(fragmentItemId, heroId) {
    const cfg = INVENTORY_ITEMS[fragmentItemId];
    if (!cfg || cfg.type !== 'hero_fragment') return { success: false, reason: 'Not a fragment.' };
    if (!this._inv.hasItem(fragmentItemId)) return { success: false, reason: 'No fragments owned.' };
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    this._inv.removeItem(fragmentItemId, 1);
    this._applyXP(hero, HEROES_CONFIG[heroId], cfg.xpValue ?? 50);
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true, xpAmount: cfg.xpValue ?? 50 };
  }

  // =============================================
  // AWAKENING — Star system
  // =============================================

  /**
   * Awaken a hero by spending a duplicate card or fragments.
   * @param {string} heroId
   * @param {'card'|'fragment'} method
   * @returns {{ success: boolean, reason?: string, stars?: number }}
   */
  awakenHero(heroId, method) {
    const hero    = this._owned.get(heroId);
    const heroCfg = HEROES_CONFIG[heroId];
    if (!hero || !heroCfg) return { success: false, reason: 'Hero not in roster.' };
    if (hero.stars >= AWAKENING_CONFIG.maxStars) return { success: false, reason: 'Hero is at max stars.' };

    const costCfg    = AWAKENING_CONFIG.starCosts[hero.stars];
    const cardId     = heroCfg.recruitCard;
    const fragmentId = GACHA_CONFIG.fragmentItemId[heroId];
    const fragNeeded = costCfg.fragments[heroCfg.tier];

    if (method === 'card') {
      if (!cardId || !this._inv.hasItem(cardId, costCfg.cards)) {
        return { success: false, reason: `Need ${costCfg.cards} duplicate ${heroCfg.name} card(s).` };
      }
      this._inv.removeItem(cardId, costCfg.cards);

    } else if (method === 'fragment') {
      if (!fragmentId || !this._inv.hasItem(fragmentId, fragNeeded)) {
        return { success: false, reason: `Need ${fragNeeded} fragments (have ${this._inv.getQuantity(fragmentId ?? '')}).` };
      }
      this._inv.removeItem(fragmentId, fragNeeded);

    } else {
      return { success: false, reason: 'Invalid awakening method.' };
    }

    hero.stars++;
    this._applySkillPassives(hero);
    eventBus.emit('hero:awakened', { heroId, name: heroCfg.name, stars: hero.stars });
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true, stars: hero.stars };
  }

  // =============================================
  // SKILLS
  // =============================================

  /**
   * Get skill configs for a hero annotated with unlock state.
   * @param {string} heroId
   * @returns {Array<object>}
   */
  getSkillsForHero(heroId) {
    const heroCfg = HEROES_CONFIG[heroId];
    const hero    = this._owned.get(heroId);
    if (!heroCfg) return [];
    const level = hero?.level ?? 0;
    return (heroCfg.skills ?? []).map(skillId => {
      const skill = SKILLS_CONFIG[skillId];
      if (!skill) return { id: skillId, name: skillId, unlocked: false };
      return { ...skill, unlocked: level >= skill.unlockLevel };
    });
  }

  /**
   * Recalculate effectiveStats for a hero based on level, stars, and unlocked passives.
   * @private
   */
  _applySkillPassives(hero) {
    const cfg = HEROES_CONFIG[hero.heroId];
    if (!cfg) return;

    // Base stat multiplier from stars
    const starMult = 1 + (hero.stars ?? 0) * AWAKENING_CONFIG.perStarBonus.statMultiplier;
    const ef = {
      hp:      Math.floor(cfg.stats.hp      * starMult),
      attack:  Math.floor(cfg.stats.attack  * starMult),
      defense: Math.floor(cfg.stats.defense * starMult),
      speed:   cfg.stats.speed,
    };

    // Apply unlocked passive skill effects
    for (const skillId of (cfg.skills ?? [])) {
      const skill = SKILLS_CONFIG[skillId];
      if (!skill || skill.type !== 'passive') continue;
      if (hero.level < skill.unlockLevel) continue;
      const fx = skill.effect;
      if (fx.stat === 'attack' && fx.scope === 'squad') ef.attack = Math.floor(ef.attack * (1 + fx.value));
      if (fx.stat === 'defense' && fx.scope === 'squad') ef.defense = Math.floor(ef.defense * (1 + fx.value));
      // lossReduction, auraValue bonuses are handled in getCombatBonuses()
    }

    hero.effectiveStats = ef;
  }

  /** @private Create owned hero record and emit */
  _recruitHero(heroId) {
    const cfg = HEROES_CONFIG[heroId];
    if (!cfg) return;
    const hero = {
      heroId,
      level:    1,
      xp:       0,
      xpToNext: cfg.xpPerLevel ?? 500,
      stars:    0,
      effectiveStats: { ...cfg.stats },
      assignment: { type: 'none' },
    };
    this._owned.set(heroId, hero);
    this._applySkillPassives(hero);
    eventBus.emit('hero:recruited', { heroId, name: cfg.name, tier: cfg.tier });
  }

  /**
   * Recruit a hero by consuming a hero card from the player inventory.
   * Accepts specific hero cards (e.g. 'card_hero_warlord') and universal
   * tier cards (e.g. 'card_rare' → random unowned rare hero).
   * @param {string} cardId
   * @returns {{ success: boolean, reason?: string, heroId?: string }}
   */
  recruitWithCard(cardId) {
    const itemCfg = INVENTORY_ITEMS[cardId];
    if (!itemCfg) return { success: false, reason: 'Unknown card.' };

    if (!this._inv?.hasItem(cardId)) {
      return { success: false, reason: `You don't have a ${itemCfg.name}.` };
    }

    let heroId = null;

    if (itemCfg.type === 'hero_card') {
      heroId = itemCfg.targetHeroId;
      if (this._owned.has(heroId)) {
        return { success: false, reason: `${HEROES_CONFIG[heroId]?.name ?? heroId} is already in your roster.` };
      }

    } else if (itemCfg.type === 'hero_card_universal') {
      const tier       = itemCfg.targetTier;
      const candidates = Object.values(HEROES_CONFIG)
        .filter(cfg => cfg.tier === tier && !this._owned.has(cfg.id));
      if (candidates.length === 0) {
        return { success: false, reason: `You already own all ${tier} heroes!` };
      }
      heroId = candidates[Math.floor(Math.random() * candidates.length)].id;

    } else {
      return { success: false, reason: 'This item is not a hero card.' };
    }

    const cfg = HEROES_CONFIG[heroId];
    if (!cfg) return { success: false, reason: 'Hero config not found.' };

    this._inv.removeItem(cardId, 1);
    this._recruitHero(heroId);
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true, heroId };
  }

  // =============================================
  // ASSIGNMENT — Squad (active combat)
  // =============================================

  getSquadHeroIds() {
    return [...this._owned.values()]
      .filter(h => h.assignment?.type === 'squad')
      .map(h => h.heroId);
  }

  /** @deprecated Alias for getSquadHeroIds() */
  getActiveHeroIds() { return this.getSquadHeroIds(); }

  /**
   * Assign a hero to the active squad (max 3). Clears building assignment.
   * @param {string} heroId
   */
  assignHeroToSquad(heroId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    if (hero.assignment?.type === 'squad') return { success: false, reason: 'Already in squad.' };

    if (this.getSquadHeroIds().length >= MAX_SQUAD_HEROES) {
      return { success: false, reason: `Squad is full (${MAX_SQUAD_HEROES} heroes max).` };
    }

    hero.assignment = { type: 'squad' };
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  /** Remove a hero from the active squad. */
  unassignHeroFromSquad(heroId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    hero.assignment = { type: 'none' };
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  // =============================================
  // ASSIGNMENT — Buildings
  // =============================================

  /**
   * Station a hero at a building to boost its output.
   * One hero per building; clears squad assignment.
   * @param {string} heroId
   * @param {string} buildingId
   */
  assignHeroToBuilding(heroId, buildingId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };

    // Enforce fixed assignment: extract building type from instanceId (e.g. 'mine_0' → 'mine')
    const buildingType = buildingId.replace(/_\d+$/, '');
    const heroCfg = HEROES_CONFIG[heroId];
    const requiredType = heroCfg?.buildingBonus?.buildingType;
    if (requiredType && requiredType !== buildingType) {
      const BUILDING_NAMES = {
        barracks: 'Barracks', mine: 'Gold Mine', magictower: 'Magic Tower', heroquarters: 'Hero Quarters',
      };
      return { success: false, reason: `${heroCfg.name} can only be stationed at the ${BUILDING_NAMES[requiredType] ?? requiredType}.` };
    }

    const existing = this.getBuildingHero(buildingId);
    if (existing && existing.heroId !== heroId) {
      return { success: false, reason: `${HEROES_CONFIG[existing.heroId]?.name ?? existing.heroId} is already stationed here.` };
    }

    hero.assignment = { type: 'building', buildingId };
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  /** Remove a hero from their building assignment. */
  unassignHeroFromBuilding(heroId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    if (hero.assignment?.type !== 'building') {
      return { success: false, reason: 'Hero is not stationed at a building.' };
    }
    hero.assignment = { type: 'none' };
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  /** Returns the hero state assigned to a building, or null. */
  getBuildingHero(buildingId) {
    for (const h of this._owned.values()) {
      if (h.assignment?.type === 'building' && h.assignment.buildingId === buildingId) return h;
    }
    return null;
  }

  /** Convenience: clear any assignment from a hero. */
  unassignHero(heroId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    hero.assignment = { type: 'none' };
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  // =============================================
  // XP & LEVELING
  // =============================================

  /**
   * Grant XP to a single hero (e.g. from XP bundles or reward events).
   * @param {string} heroId
   * @param {number} amount
   */
  awardHeroXP(heroId, amount) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };
    this._applyXP(hero, HEROES_CONFIG[heroId], amount);
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  /**
   * Purchase and immediately apply an XP bundle to a hero using gold.
   * @param {string} heroId
   * @param {string} bundleId  'xp_bundle_small' | 'xp_bundle_medium' | 'xp_bundle_large'
   * @returns {{ success: boolean, reason?: string }}
   */
  purchaseXPBundle(heroId, bundleId) {
    const hero = this._owned.get(heroId);
    if (!hero) return { success: false, reason: 'Hero not in roster.' };

    const bundle = INVENTORY_ITEMS[bundleId];
    if (!bundle || bundle.type !== 'xp_bundle') return { success: false, reason: 'Invalid XP bundle.' };

    const cost = { gold: bundle.goldCost };
    if (!this._rm.canAfford(cost)) {
      return { success: false, reason: `Not enough gold. Need ${bundle.goldCost}g.` };
    }

    this._rm.spend(cost);
    this._applyXP(hero, HEROES_CONFIG[heroId], bundle.xpAmount);
    eventBus.emit('heroes:updated', this.getRosterWithState());
    return { success: true };
  }

  /**
   * Award battle XP to all squad-assigned heroes. Called by CombatManager.
   * @param {number} amount
   */
  awardBattleXP(amount) {
    for (const hero of this._owned.values()) {
      if (hero.assignment?.type !== 'squad') continue;
      this._applyXP(hero, HEROES_CONFIG[hero.heroId], amount);
    }
    eventBus.emit('heroes:updated', this.getRosterWithState());
  }

  /** @private */
  _applyXP(hero, cfg, amount) {
    hero.xp += amount;
    while (hero.xp >= hero.xpToNext) {
      hero.xp -= hero.xpToNext;
      hero.level++;
      hero.xpToNext = Math.floor((cfg.xpPerLevel ?? 500) * Math.pow(1.3, hero.level - 1));
      this._applySkillPassives(hero);
      eventBus.emit('hero:levelUp', { heroId: hero.heroId, name: cfg.name, level: hero.level });
    }
  }

  // =============================================
  // COMBAT BONUS CALCULATION
  // =============================================

  /**
   * Aggregate aura bonuses from all squad-assigned heroes.
   * @returns {{ attackMult: number, defenseMult: number, lossReduction: number }}
   */
  getCombatBonuses() {
    let attackMult    = 1.0;
    let defenseMult   = 1.0;
    let lossReduction = 0;
    let activeSkills  = []; // Active skill effects for CombatManager

    for (const hero of this._owned.values()) {
      if (hero.assignment?.type !== 'squad') continue;
      const cfg = HEROES_CONFIG[hero.heroId];
      if (!cfg) continue;

      // Aura value boosted by level, stars, and auraValue passive skills
      let auraValue = (cfg.aura?.value ?? 0) * (1 + (hero.level - 1) * 0.05);
      auraValue += (hero.stars ?? 0) * AWAKENING_CONFIG.perStarBonus.auraValueBonus;

      // Add auraValue passive skill bonuses
      for (const skillId of (cfg.skills ?? [])) {
        const skill = SKILLS_CONFIG[skillId];
        if (!skill || skill.type !== 'passive') continue;
        if (hero.level < skill.unlockLevel) continue;
        if (skill.effect.stat === 'auraValue') auraValue += skill.effect.value;
      }

      if (cfg.aura) {
        switch (cfg.aura.type) {
          case 'attack_boost':  attackMult  += auraValue;       break;
          case 'magic_amplify': attackMult  += auraValue * 0.8; break;
          case 'crit_chance':   attackMult  += auraValue;       break;
          case 'defense_boost': defenseMult += auraValue;       break;
        }
        // defense_boost only gives lossReduction, not double-counted
        if (cfg.aura.type === 'defense_boost') lossReduction += auraValue * 0.5;
      }

      // Passive lossReduction from skills (iron_will, evasion, consecration)
      for (const skillId of (cfg.skills ?? [])) {
        const skill = SKILLS_CONFIG[skillId];
        if (!skill || skill.type !== 'passive') continue;
        if (hero.level < skill.unlockLevel) continue;
        if (skill.effect.stat === 'lossReduction') lossReduction += skill.effect.value;
      }

      // Passive attack/defense squad bonuses
      for (const skillId of (cfg.skills ?? [])) {
        const skill = SKILLS_CONFIG[skillId];
        if (!skill || skill.type !== 'passive') continue;
        if (hero.level < skill.unlockLevel) continue;
        if (skill.effect.stat === 'attack'  && skill.effect.scope === 'squad') attackMult  += skill.effect.value;
        if (skill.effect.stat === 'defense' && skill.effect.scope === 'squad') defenseMult += skill.effect.value;
      }

      // Collect active skills for combat system hooks
      for (const skillId of (cfg.skills ?? [])) {
        const skill = SKILLS_CONFIG[skillId];
        if (!skill || skill.type !== 'active') continue;
        if (hero.level < skill.unlockLevel) continue;
        activeSkills.push({ heroId: hero.heroId, skill });
      }
    }

    // Active production buffs
    const now      = Date.now();
    this._activeBuffs = this._activeBuffs.filter(b => b.endsAt > now);
    const buffMult = this._activeBuffs.reduce((acc, b) => acc + b.value, 0);

    return { attackMult, defenseMult, lossReduction, activeSkills, productionBuffMult: buffMult };
  }

  /**
   * Activate a production buff.
   * @param {{ value: number, durationMs: number }} buffCfg
   */
  activateBuff(buffCfg) {
    this._activeBuffs.push({ value: buffCfg.value, endsAt: Date.now() + buffCfg.durationMs });
    eventBus.emit('buff:activated', { value: buffCfg.value, durationMs: buffCfg.durationMs });
  }

  getActiveBuffs() { return this._activeBuffs.filter(b => b.endsAt > Date.now()); }

  // =============================================
  // DATA ACCESS
  // =============================================

  getRosterWithState() {
    const goldAvailable = this._rm?.getSnapshot()?.gold?.amount ?? 0;
    const now = Date.now();
    this._activeBuffs = (this._activeBuffs ?? []).filter(b => b.endsAt > now);

    return Object.values(HEROES_CONFIG).map(cfg => {
      const owned      = this._owned.get(cfg.id);
      const assignment = owned?.assignment ?? { type: 'none' };

      const specificCardQty  = this._inv?.getQuantity(cfg.recruitCard)     ?? 0;
      const universalCardId  = `card_${cfg.tier}`;
      const universalCardQty = this._inv?.getQuantity(universalCardId)     ?? 0;
      const fragmentItemId   = GACHA_CONFIG.fragmentItemId[cfg.id];
      const fragmentQty      = fragmentItemId ? (this._inv?.getQuantity(fragmentItemId) ?? 0) : 0;
      const fragmentsNeeded  = GACHA_CONFIG.fragmentsToSummon[cfg.tier];
      const canRecruit       = !owned && (specificCardQty > 0 || universalCardQty > 0);
      const canSummonByFrags = !owned && fragmentQty >= fragmentsNeeded;

      // Awakening costs for next star
      const stars      = owned?.stars ?? 0;
      const nextStarCost = stars < AWAKENING_CONFIG.maxStars ? AWAKENING_CONFIG.starCosts[stars] : null;
      const dupCardQty   = this._inv?.getQuantity(cfg.recruitCard) ?? 0;
      const fragForAwaken = nextStarCost ? nextStarCost.fragments[cfg.tier] : 0;
      const canAwakenByCard = owned && nextStarCost && dupCardQty >= nextStarCost.cards;
      const canAwakenByFrag = owned && nextStarCost && fragmentQty >= fragForAwaken;

      return {
        ...cfg,
        isOwned:          !!owned,
        level:            owned?.level    ?? 1,
        xp:               owned?.xp       ?? 0,
        xpToNext:         owned?.xpToNext ?? cfg.xpPerLevel ?? 500,
        stars,
        effectiveStats:   owned?.effectiveStats ?? cfg.stats,
        assignment,
        isInSquad:        assignment.type === 'squad',
        isInBuilding:     assignment.type === 'building',
        assignedBuilding: assignment.buildingId ?? null,
        specificCardQty,
        universalCardId,
        universalCardQty,
        fragmentItemId,
        fragmentQty,
        fragmentsNeeded,
        canRecruit,
        canSummonByFrags,
        dupCardQty,
        nextStarCost,
        canAwakenByCard,
        canAwakenByFrag,
        canAffordSmallXP:  goldAvailable >= INVENTORY_ITEMS.xp_bundle_small.goldCost,
        canAffordMediumXP: goldAvailable >= INVENTORY_ITEMS.xp_bundle_medium.goldCost,
        canAffordLargeXP:  goldAvailable >= INVENTORY_ITEMS.xp_bundle_large.goldCost,
        skills:            this.getSkillsForHero(cfg.id),
      };
    });
  }

  isOwned(heroId) { return this._owned.has(heroId); }

  update(_dt) {}

  // =============================================
  // PERSISTENCE
  // =============================================

  serialize() {
    return {
      owned:       Object.fromEntries(this._owned),
      activeBuffs: this._activeBuffs ?? [],
    };
  }

  deserialize(data) {
    if (!data?.owned) return;
    this._activeBuffs = (data.activeBuffs ?? []).filter(b => b.endsAt > Date.now());

    for (const [id, state] of Object.entries(data.owned)) {
      const cfg = HEROES_CONFIG[id];
      if (!cfg) continue;

      // Migrate old saves: isActive boolean → assignment object
      let assignment = state.assignment ?? { type: 'none' };
      if (state.isActive === true && assignment.type === 'none') {
        assignment = { type: 'squad' };
      }

      const hero = {
        heroId:     id,
        level:      state.level    ?? 1,
        xp:         state.xp       ?? 0,
        xpToNext:   state.xpToNext ?? cfg.xpPerLevel ?? 500,
        stars:      state.stars    ?? 0,
        effectiveStats: state.effectiveStats ?? { ...cfg.stats },
        assignment,
      };
      this._owned.set(id, hero);
      this._applySkillPassives(hero); // recalculate on load
    }
  }
}
