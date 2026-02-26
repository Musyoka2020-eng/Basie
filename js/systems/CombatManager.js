/**
 * CombatManager.js — Phase 4
 * Adds repeatable monster fights with diminishing returns:
 *  - Tracks victory count per monster
 *  - Full rewards for first N wins (monster.maxRewardedWins)
 *  - 10% rewards thereafter (still beatable, just no more full loot)
 */
import { eventBus } from '../core/EventBus.js';
import { MONSTERS_CONFIG, UNITS_CONFIG, CAMPAIGNS_CONFIG, ENCOUNTER_MODIFIERS } from '../entities/GAME_DATA.js';
import { BUILDINGS_CONFIG } from '../entities/GAME_DATA.js';

const MAX_BATTLE_LOG = 20;

export class CombatManager {
  constructor(unitManager, userManager, resourceManager, heroManager, buildingManager) {
    this.name = 'CombatManager';
    this._um = unitManager;
    this._user = userManager;
    this._rm = resourceManager;
    this._hm = heroManager;
    this._bm = buildingManager ?? null;
    this._battleLog = [];
    /** @type {Record<string, number>} monsterId → total victories */
    this._victoryCounts = {};
    this._techBonuses = {};
    /** @type {Map<string, object|null>} monsterId → rolled encounter modifier */
    this._pendingModifiers = new Map();
    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; });
  }

  update(dt) {}

  attack(monsterId, squadId) {
    const monster = MONSTERS_CONFIG[monsterId];
    if (!monster) return { success: false, reason: 'Unknown target.' };

    const squadData = this._um.getSquad(squadId);
    const army = squadData ? squadData.units : [];
    if (army.length === 0) return { success: false, reason: 'You have no units to send.' };

    // Consume the pending encounter modifier (if any)
    const modifier = this._pendingModifiers.get(monsterId) ?? null;
    this._pendingModifiers.delete(monsterId);

    eventBus.emit('combat:started', { monsterId, monster });

    const result = this._simulateBattle(army, monster, modifier);

    // Determine if this win still yields full rewards
    const victoryCount = this._victoryCounts[monsterId] ?? 0;
    const maxRewarded  = monster.maxRewardedWins ?? 999;
    const isFullReward = result.victory && victoryCount < maxRewarded;
    const isReduced    = result.victory && !isFullReward;

    // Scale rewards
    let rewards = null;
    if (result.victory) {
      rewards = {};
      for (const [k, v] of Object.entries(monster.rewards)) {
        rewards[k] = isFullReward ? v : Math.max(1, Math.floor(v * 0.1));
      }
    }

    // Log entry
    this._battleLog.unshift({
      timestamp: Date.now(),
      monster: monster.name,
      icon: monster.icon,
      monsterId,
      squadName: squadData?.name ?? 'Unknown Squad',
      result: result.victory ? 'Victory' : 'Defeat',
      rewards,
      reducedReward: isReduced,
      wavesSurvived: result.wavesSurvived,
      totalWaves: monster.waves.length,
      modifier: modifier ? { id: modifier.id, name: modifier.name, icon: modifier.icon } : null,
    });
    if (this._battleLog.length > MAX_BATTLE_LOG) this._battleLog.pop();

    // Apply losses
    if (result.losses && Object.keys(result.losses).length) {
      this._um.removeUnitsFromSquad(squadId, result.losses);
    }

    if (result.victory) {
      this._victoryCounts[monsterId] = victoryCount + 1;
      this._rm.add(rewards);
      this._user.addXP(rewards.xp ?? 0);
      this._hm?.awardBattleXP(Math.floor((monster.rewards.xp ?? 100) * 0.5));
      eventBus.emit('combat:victory', { monsterId, rewards, losses: result.losses, reducedReward: isReduced });
    } else {
      eventBus.emit('combat:defeat', { monsterId, losses: result.losses });
    }

    eventBus.emit('combat:logUpdated', this._battleLog);
    return { success: true, result, rewards, reducedReward: isReduced, modifier };
  }

_simulateBattle(army, monster, modifier = null) {
    const heroBonus = this._hm?.getCombatBonuses() ?? { attackMult: 1, defenseMult: 1, lossReduction: 0 };
    const tech = this._techBonuses || {};

    let playerTotalAttack  = 0;
    let playerTotalDefense = 0;
    let playerTotalHP      = 0;

    for (const unit of army) {
      const stats = UNITS_CONFIG[unit.unitId]?.stats ?? { attack: 10, defense: 5, hp: 100 };

      let uAttack = stats.attack * (1 + (tech.attackBonus || 0));
      if (unit.unitId === 'mage' && tech.mageAttackBonus) uAttack *= (1 + tech.mageAttackBonus);

      let uDefense = stats.defense + (tech.defenseBonus || 0);
      let uHp = stats.hp * (1 + (tech.hpBonus || 0));

      playerTotalAttack  += uAttack  * unit.count;
      playerTotalDefense += uDefense * unit.count;
      playerTotalHP      += uHp      * unit.count;
    }

    playerTotalAttack  *= heroBonus.attackMult;
    playerTotalDefense *= heroBonus.defenseMult;

    // Apply modifier player-side multipliers
    if (modifier?.playerAttackMult) playerTotalAttack *= modifier.playerAttackMult;
    if (modifier?.playerHpMult)     playerTotalHP     *= modifier.playerHpMult;

    // Apply modifier to wave stats
    const waves = modifier?.waveTransform
      ? monster.waves.map(modifier.waveTransform)
      : monster.waves;

    let remainingPlayerHP = playerTotalHP;
    let wavesSurvived = 0;
    let waveIndex = 0;
    const waveDetails = [];

    for (const wave of waves) {
      if (remainingPlayerHP <= 0) break;

      let waveHP  = wave.hp    * wave.count;
      const waveAtk = wave.attack * wave.count;

      // heal: enemy regenerates a fraction of its max HP before fighting
      if (wave.specialAbility === 'heal') {
        const healAmount = waveHP * (wave.abilityValue ?? 0.2);
        waveHP = Math.round(waveHP + healAmount);
      }

      const rawDamage = Math.max(1, waveAtk - playerTotalDefense * 0.5);
      let dmgToPlayer = rawDamage;

      if (wave.specialAbility === 'aoe_blast') {
        dmgToPlayer += remainingPlayerHP * (wave.abilityValue ?? 0.3);
      }

      const isFirstWave = (wavesSurvived === 0);
      const currentAttack = isFirstWave ? playerTotalAttack * (1 + (tech.firstWaveBonus || 0)) : playerTotalAttack;

      const waveKillRounds = Math.ceil(waveHP / Math.max(1, currentAttack));
      const totalDmgTaken  = dmgToPlayer * waveKillRounds * 0.3;

      remainingPlayerHP = Math.max(0, remainingPlayerHP - totalDmgTaken);
      wavesSurvived++;

      waveDetails.push({
        waveIndex,
        wave: wave.name,
        playerHP: Math.max(0, Math.round(remainingPlayerHP)),
        dmgReceived: Math.round(totalDmgTaken),
        rounds: waveKillRounds,
        ability: wave.specialAbility ?? null,
        waveHP,
      });

      // revive: spawn a weakened second pass of this wave
      if (wave.specialAbility === 'revive' && remainingPlayerHP > 0) {
        const revivedHP    = Math.round(waveHP * (wave.abilityValue ?? 0.3));
        const revivedAtk   = waveAtk;
        const revRounds    = Math.ceil(revivedHP / Math.max(1, currentAttack));
        const revDmgTaken  = Math.max(1, revivedAtk - playerTotalDefense * 0.5) * revRounds * 0.3;
        remainingPlayerHP  = Math.max(0, remainingPlayerHP - revDmgTaken);
        waveDetails.push({
          waveIndex,
          wave: `${wave.name} (Revived)`,
          playerHP: Math.max(0, Math.round(remainingPlayerHP)),
          dmgReceived: Math.round(revDmgTaken),
          rounds: revRounds,
          ability: 'revive_spawned',
          waveHP: revivedHP,
        });
      }

      waveIndex++;
    }

    const victory     = remainingPlayerHP > 0;
    const survivalRate = Math.max(0, Math.min(1, remainingPlayerHP / playerTotalHP));
    const baseLossRate = victory
      ? Math.max(0.02, 1 - survivalRate) * (1 - heroBonus.lossReduction - (tech.lossReduction || 0))
      : 0.5 + (1 - survivalRate) * 0.5;

    const losses = {};
    for (const unit of army) {
      const lost = Math.round(unit.count * baseLossRate);
      if (lost > 0) losses[unit.unitId] = Math.min(lost, unit.count);
    }

    return { victory, losses, wavesSurvived, waveDetails, survivalRate, initialPlayerHP: playerTotalHP };
  }

  /**
   * Estimates squad survival against a monster without side effects.
   * Safe to call from UI before committing an attack.
   * @param {string} squadId
   * @param {string} monsterId
   * @returns {{ survivalPct: number, victory: boolean, likelyTooWeak: boolean }}
   */
  estimateSurvival(squadId, monsterId) {
    const monster   = MONSTERS_CONFIG[monsterId];
    const squadData = this._um.getSquad(squadId);
    const army      = squadData?.units ?? [];
    if (!monster || army.length === 0) return { survivalPct: 0, victory: false, likelyTooWeak: true };
    const result = this._simulateBattle(army, monster, null);
    const pct = Math.round(result.survivalRate * 100);
    return { survivalPct: pct, victory: result.victory, likelyTooWeak: pct < 30 };
  }

  /**
   * Roll an encounter modifier for a stage.  Called when the player clicks a
   * stage node so they can see the modifier before committing.  Cleared on
   * attack().
   * @param {string} monsterId
   * @returns {object|null}
   */
  rollModifierForStage(monsterId) {
    const roll = Math.random();
    let cumulative = 0;
    for (const mod of ENCOUNTER_MODIFIERS) {
      cumulative += mod.chance;
      if (roll < cumulative) {
        this._pendingModifiers.set(monsterId, mod);
        return mod;
      }
    }
    // ~25% no modifier
    this._pendingModifiers.set(monsterId, null);
    return null;
  }

  getPendingModifier(monsterId) {
    return this._pendingModifiers.get(monsterId) ?? null;
  }

  /**
   * Get current victory count and remaining full-reward wins for a monster.
   */
  getMonsterProgress(monsterId) {
    const monster = MONSTERS_CONFIG[monsterId];
    const count   = this._victoryCounts[monsterId] ?? 0;
    const max     = monster?.maxRewardedWins ?? 999;
    return {
      victories: count,
      rewardedWins: Math.min(count, max),
      rewardsRemaining: Math.max(0, max - count),
      maxRewardedWins: max,
    };
  }

  /**
   * Returns each campaign stage annotated with derived state flags.
   * Mirrors the pattern of BuildingManager.getAllBuildingsWithStatus().
   * @returns {Array<{ isLocked: boolean, isAvailable: boolean, isCompleted: boolean }>}
   */
  getCampaignStagesWithState() {
    const getLvl = this._bm
      ? id => this._bm.getLevelOf(id)
      : () => 0;

    return CAMPAIGNS_CONFIG.map((stage, idx) => {
      const reqs = stage.requires;
      const reqMet = !reqs || Object.entries(reqs).every(([bId, minLvl]) => getLvl(bId) >= minLvl);
      // Use _victoryCounts (persisted, authoritative) rather than the battle log.
      const isCompleted    = (this._victoryCounts[stage.monsterId] ?? 0) > 0;
      const prevCompleted  = idx === 0 || (this._victoryCounts[CAMPAIGNS_CONFIG[idx - 1].monsterId] ?? 0) > 0;
      const isLocked       = !reqMet || !prevCompleted;

      // Build a human-readable lock reason for tooltips / notifications
      let lockReason = null;
      if (isLocked) {
        if (!prevCompleted) {
          lockReason = `Complete Stage ${idx} first`;
        } else if (reqs) {
          const parts = Object.entries(reqs).map(([bId, minLvl]) => {
            const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
            return `${name} Lv.${minLvl}`;
          });
          lockReason = `Requires: ${parts.join(', ')}`;
        }
      }

      return {
        ...stage,
        isCompleted,
        isLocked,
        isAvailable: reqMet && prevCompleted && !isCompleted,
        lockReason,
      };
    });
  }

  getBattleLog() { return this._battleLog; }

  serialize() {
    return { battleLog: this._battleLog, victoryCounts: this._victoryCounts };
  }

  deserialize(data) {
    if (!data) return;
    this._battleLog     = data.battleLog     ?? [];
    this._victoryCounts = data.victoryCounts ?? {};
  }
}
