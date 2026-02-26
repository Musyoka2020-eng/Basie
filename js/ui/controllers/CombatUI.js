/**
 * CombatUI.js
 * Renders: campaign world map, campaign detail panel, battle modal with
 * animation (using real CombatManager waveDetails), battle log.
 *
 * Key fixes vs old UIManager:
 *  - Campaign stage availability comes from CombatManager.getCampaignStagesWithState()
 *  - Battle animation now plays back the real combat result (waveDetails)
 *    instead of running fabricated damage numbers
 *  - The "empty squad" guard is still here (action validation), but squad
 *    selection validation belongs in the UI layer.
 */
import { eventBus } from '../../core/EventBus.js';
import { MONSTERS_CONFIG, UNITS_CONFIG } from '../../entities/GAME_DATA.js';
import { RES_META, fmt, openModal, closeModal } from '../uiUtils.js';

export class CombatUI {
  /**
   * @param {{ cm, um, notifications, sound }} systems
   */
  constructor(systems) {
    this._s = systems;
    this._selectedCampaignStage = null;
  }

  init() {
    eventBus.on('ui:viewChanged',    v   => { if (v === 'combat') this.render(); });
    eventBus.on('combat:logUpdated', log => this._renderBattleLog(log));
    eventBus.on('combat:victory',    ()  => this.render());
    eventBus.on('combat:defeat',     ()  => this.render());
  }

  render() {
    const panel = document.getElementById('campaign-panel');
    if (!panel) return;
    panel.innerHTML = '<h3>Campaign Map</h3>';

    // ── World map ──
    const mapWrapper = document.createElement('div');
    mapWrapper.className = 'world-map-wrapper';
    const path = document.createElement('div');
    path.className = 'campaign-path';

    // getCampaignStagesWithState() does all the availability derivation
    const stages = this._s.cm.getCampaignStagesWithState();

    stages.forEach((stage, idx) => {
      if (idx > 0) {
        const prevCompleted = stages[idx - 1].isCompleted;
        const line = document.createElement('div');
        line.className = `campaign-path-line ${prevCompleted ? 'completed' : (idx <= 1 ? 'available' : '')}`;
        path.appendChild(line);
      }

      const node = document.createElement('div');
      node.className = `campaign-node ${stage.isCompleted ? 'completed' : stage.isAvailable ? 'available' : 'locked'}`;
      if (stage.isLocked && stage.lockReason) {
        node.setAttribute('data-tooltip', stage.lockReason);
      }
      node.innerHTML = `
        <div class="campaign-node-circle">
          ${stage.isLocked ? '<span class="node-lock-icon">🔒</span>' : ''}
          ${stage.icon}
        </div>
        <div class="campaign-node-name">${stage.name}</div>
        <div class="campaign-node-diff">Stage ${stage.stage}</div>`;
      node.addEventListener('click', () => {
        if (stage.isLocked) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Locked', stage.lockReason ?? 'Requirements not met.');
          return;
        }
        this._selectedCampaignStage = stage;
        this._renderCampaignDetail(stage, stage.isAvailable);
        eventBus.emit('ui:click');
      });
      path.appendChild(node);
    });

    mapWrapper.appendChild(path);
    panel.appendChild(mapWrapper);

    // ── Detail area ──
    const detailArea = document.createElement('div');
    detailArea.id = 'campaign-detail-area';
    panel.appendChild(detailArea);

    if (this._selectedCampaignStage) {
      const stage = stages.find(s => s.monsterId === this._selectedCampaignStage.monsterId);
      if (stage) {
        this._selectedCampaignStage = stage;
        this._renderCampaignDetail(stage, stage.isAvailable);
      }
    }

    this._renderBattleLog(this._s.cm.getBattleLog());
  }

  _renderCampaignDetail(stage, canAttack) {
    const area    = document.getElementById('campaign-detail-area');
    if (!area) return;
    const monster = MONSTERS_CONFIG[stage.monsterId];
    if (!monster) { area.innerHTML = ''; return; }

    const prog           = this._s.cm.getMonsterProgress(stage.monsterId);
    const hasRewardsLeft = prog.rewardsRemaining > 0;
    const isReduced      = prog.victories > 0 && !hasRewardsLeft;

    // Roll encounter modifier when player opens an available stage
    let modifier = null;
    if (canAttack && this._s.cm.rollModifierForStage) {
      modifier = this._s.cm.rollModifierForStage(stage.monsterId);
    }

    const rewardsHtml = Object.entries(monster.rewards).map(([r, v]) =>
      `<span class="cost-chip affordable">${RES_META[r]?.icon ?? '✨'} ${fmt(isReduced ? Math.max(1, Math.floor(v * 0.1)) : v)}</span>`
    ).join('');

    const wavesHtml = monster.waves.map((w, i) =>
      `<div class="campaign-wave-row"><div class="campaign-wave-dot"></div><span>Wave ${i + 1}: ${w.name} (×${w.count}) — ❤️${w.hp} ⚔️${w.attack}${w.specialAbility ? ` 💥${w.specialAbility}` : ''}</span></div>`
    ).join('');

    const victoryInfo = prog.victories > 0
      ? `<div style="font-size:var(--text-xs);color:${hasRewardsLeft ? 'var(--clr-success)' : 'var(--clr-warning)'};margin-bottom:var(--space-2)">
          ${hasRewardsLeft
            ? `✅ ${prog.victories} win${prog.victories > 1 ? 's' : ''} · Full rewards: ${prog.rewardsRemaining} remaining`
            : `⚠️ ${prog.victories} wins · No more full rewards (10% loot)`}
        </div>`
      : '';

    const modifierBanner = modifier
      ? `<div class="encounter-modifier-banner">⚡ Encounter modifier: <strong>${modifier.icon} ${modifier.name}</strong> — ${modifier.description}</div>`
      : '';

    const squads     = this._s.um.getSquads();
    const squadOpts  = squads.length === 0
      ? '<option value="">No squads available</option>'
      : squads.map(s => `<option value="${s.id}">${s.name} (${s.units.reduce((a, u) => a + u.count, 0)} units)</option>`).join('');

    area.innerHTML = `
      <div class="campaign-detail">
        <div class="campaign-detail-icon">${monster.icon}</div>
        <div class="campaign-detail-body">
          <div class="campaign-detail-name">${monster.name}</div>
          <div class="campaign-detail-desc">${monster.description}</div>
          <div class="campaign-detail-waves">${wavesHtml}</div>
          ${victoryInfo}
          ${modifierBanner}
          <div style="font-size:var(--text-xs);color:var(--clr-text-muted);margin-bottom:var(--space-1)">Rewards${isReduced ? ' (reduced)' : ''}:</div>
          <div class="cost-row" style="margin-bottom:var(--space-3)">${rewardsHtml}</div>
          <div style="margin-bottom:var(--space-4);background:var(--clr-bg);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--clr-border)">
            <label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-2)">Deploy Squad:</label>
            <select id="squad-select" class="w-full" style="background:var(--clr-bg-elevated);color:var(--clr-text);border:1px solid var(--clr-border);border-radius:var(--radius-md);padding:8px 12px;font-size:var(--text-sm)">${squadOpts}</select>
            <div id="readiness-badge-area" style="margin-top:var(--space-2)"></div>
          </div>
          <button class="btn btn-danger w-full" id="btn-campaign-attack" ${squads.length === 0 ? 'disabled' : ''}>
            ${prog.victories === 0 ? '⚔️ Deploy Squad' : isReduced ? '⚔️ Re-fight (10% loot)' : '⚔️ Re-fight'}
          </button>
        </div>
      </div>`;

    // Helper: update readiness badge based on selected squad
    const updateReadiness = (squadId) => {
      const badgeArea = document.getElementById('readiness-badge-area');
      if (!badgeArea || !squadId || !this._s.cm.estimateSurvival) return;
      const est = this._s.cm.estimateSurvival(squadId, stage.monsterId);
      if (!est) { badgeArea.innerHTML = ''; return; }
      const cls  = est.likelyTooWeak ? 'weak' : est.survivalPct < 60 ? 'risky' : 'ready';
      const icon = est.likelyTooWeak ? '⚠️' : est.survivalPct < 60 ? '⚡' : '✅';
      const lbl  = est.victory ? 'Victory likely' : `~${Math.round(est.survivalPct)}% survival`;
      badgeArea.innerHTML = `<span class="readiness-badge ${cls}">${icon} ${lbl}</span>`;
    };

    // Initial readiness check
    const initialSquad = document.getElementById('squad-select')?.value;
    if (canAttack && initialSquad) updateReadiness(initialSquad);

    document.getElementById('squad-select')?.addEventListener('change', e => {
      updateReadiness(e.target.value);
    });

    document.getElementById('btn-campaign-attack')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const squadId = document.getElementById('squad-select')?.value;
      if (!squadId) return;
      this._showBattleModal(monster, squadId);
    });
  }

  // ---- BATTLE MODAL ----
  _showBattleModal(monster, squadId) {
    const squadData = this._s.um.getSquad(squadId);
    const army      = squadData ? squadData.units : [];
    if (army.length === 0) {
      eventBus.emit('ui:error');
      this._s.notifications?.show('warning', 'Empty Squad!', 'This squad has no units to send.');
      return;
    }

    // Readiness check — warn player if survival estimate is very low
    if (this._s.cm.estimateSurvival) {
      const est = this._s.cm.estimateSurvival(squadId, monster.id);
      if (est?.likelyTooWeak) {
        // Show a warning confirmation before opening the arena
        this._showReadinessWarning(monster, squadId, Math.round(est.survivalPct));
        return;
      }
    }

    this._openBattleArena(monster, squadId);
  }

  _showReadinessWarning(monster, squadId, survivalPct) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;
    content.innerHTML = `
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-title-block"><div class="modal-title">⚠️ Low Readiness</div></div>
        </div>
        <div style="text-align:center;padding:var(--space-6) var(--space-4)">
          <div style="font-size:3rem;margin-bottom:var(--space-3)">☠️</div>
          <p style="color:var(--clr-warning);font-weight:700;font-size:var(--text-lg);margin-bottom:var(--space-2)">
            ~${survivalPct}% estimated survival
          </p>
          <p style="color:var(--clr-text-secondary);margin-bottom:var(--space-5)">
            Your squad may be too weak for <strong>${monster.name}</strong>. You'll almost certainly be defeated — but nothing stops you from trying.
          </p>
          <div style="display:flex;gap:var(--space-3);justify-content:center">
            <button class="btn btn-secondary" id="btn-warn-cancel">Cancel</button>
            <button class="btn btn-danger" id="btn-warn-proceed">⚔️ Fight Anyway</button>
          </div>
        </div>
      </div>`;
    overlay.classList.remove('hidden');
    document.getElementById('btn-warn-cancel')?.addEventListener('click', () => {
      overlay.classList.add('hidden');
      content.innerHTML = '';
    });
    document.getElementById('btn-warn-proceed')?.addEventListener('click', () => {
      this._openBattleArena(monster, squadId);
    });
  }

  _openBattleArena(monster, squadId) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;

    content.innerHTML = `
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-title-block"><div class="modal-title">⚔️ ${monster.name}</div></div>
        </div>
        <div class="battle-arena" id="battle-arena">
          <div class="battle-combatants">
            <div class="battle-side">
              <div class="battle-sprite player-sprite" id="player-sprite">🗡️</div>
              <div class="battle-name" style="color:var(--clr-primary)">Your Army</div>
              <div class="battle-hp-bar"><div class="progress-bar"><div class="progress-fill progress-fill-hp" id="player-hp-bar" style="width:100%"></div></div></div>
            </div>
            <div class="battle-vs">VS</div>
            <div class="battle-side">
              <div class="battle-sprite enemy-sprite" id="enemy-sprite">${monster.icon}</div>
              <div class="battle-name" style="color:var(--clr-danger)">${monster.name}</div>
              <div class="battle-hp-bar"><div class="progress-bar"><div class="progress-fill progress-fill-hp" id="enemy-hp-bar" style="width:100%"></div></div></div>
            </div>
          </div>
          <div id="battle-wave-counter" class="battle-wave-counter" style="display:none"></div>
          <div class="battle-feed" id="battle-feed"><div class="battle-line system">⚔️ Battle begins! (${monster.waves.length} waves)</div></div>
        </div>
        <div id="battle-result-area" style="display:none"></div>
        <div class="modal-actions" id="battle-actions">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <div class="spinner" style="margin:auto"></div>
            <button class="btn btn-secondary btn-sm battle-skip-btn" id="btn-battle-skip">Skip</button>
          </div>
        </div>
      </div>`;
    overlay.classList.remove('hidden');

    this._runBattleAnimation(monster, squadId);
  }

  /**
   * Calls CombatManager.attack() immediately for the real result,
   * then plays the animation back using the real waveDetails.
   * The skip button aborts the animation and jumps straight to the result.
   */
  async _runBattleAnimation(monster, squadId) {
    const feed      = document.getElementById('battle-feed');
    const phpB      = document.getElementById('player-hp-bar');
    const ehpB      = document.getElementById('enemy-hp-bar');
    const pSprite   = document.getElementById('player-sprite');
    const eSprite   = document.getElementById('enemy-sprite');
    const wvCounter = document.getElementById('battle-wave-counter');

    let skipped = false;
    document.getElementById('btn-battle-skip')?.addEventListener('click', () => { skipped = true; });

    const sleep   = ms => skipped ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
    const addLine = (text, cls = '') => {
      if (!feed) return;
      const d = document.createElement('div');
      d.className = `battle-line ${cls}`;
      d.textContent = text;
      feed.appendChild(d);
      feed.scrollTop = feed.scrollHeight;
    };

    // Run the real battle FIRST so the animation reflects actual outcomes
    const result          = this._s.cm.attack(monster.id, squadId);
    const waveDetails     = result.result?.waveDetails ?? [];
    const initialPlayerHP = result.result?.initialPlayerHP ?? 1;
    const modifier        = result.modifier ?? null;

    // Show modifier banner in feed if applicable
    if (modifier) {
      addLine(`⚡ Modifier: ${modifier.icon} ${modifier.name} — ${modifier.description}`, 'system');
      await sleep(600);
    }

    // Animate all waves using real wave data (no cap)
    for (let i = 0; i < waveDetails.length; i++) {
      if (skipped) break;
      const detail   = waveDetails[i];
      const waveIdx  = detail.waveIndex ?? (i % monster.waves.length);
      const waveCfg  = monster.waves[waveIdx];
      const waveName = detail.wave ?? waveCfg?.name ?? `Wave ${i + 1}`;

      // Wave counter
      if (wvCounter) {
        wvCounter.style.display = 'block';
        wvCounter.textContent   = `Wave ${i + 1} / ${waveDetails.length}`;
      }

      // Revive sub-entries get their own compact animation
      if (detail.ability === 'revive_spawned') {
        await sleep(600);
        addLine(`👻 ${waveName} — rises from the dead!`, 'turn');
        const revivedPct = waveCfg
          ? Math.round((detail.waveHP / (waveCfg.hp * waveCfg.count)) * 100)
          : 30;
        if (ehpB) ehpB.style.width = `${revivedPct}%`;
        await sleep(700);

        pSprite?.classList.add('sprite-attack-player');
        if (ehpB) ehpB.style.width = '0%';
        const playerPct2 = Math.max(0, Math.round((detail.playerHP / initialPlayerHP) * 100));
        if (phpB) phpB.style.width = `${playerPct2}%`;
        addLine(`Your forces put it down again! Your HP: ${playerPct2}%`, 'hit');
        setTimeout(() => {
          pSprite?.classList.remove('sprite-attack-player');
          eSprite?.classList.add('sprite-hit');
          setTimeout(() => eSprite?.classList.remove('sprite-hit'), 350);
        }, 200);
        if (detail.playerHP <= 0) break;
        continue;
      }

      await sleep(900);
      const countLabel = waveCfg ? ` (×${waveCfg.count})` : '';
      addLine(`── Wave ${i + 1}: ${waveName}${countLabel} ──`, 'turn');

      // Heal event (enemy regenerated before the round)
      if (detail.ability === 'heal') {
        await sleep(400);
        addLine(`💚 ${waveName} regenerates HP before combat!`, 'heal');
      }

      // Player strikes — enemy HP drains to 0
      await sleep(500);
      pSprite?.classList.add('sprite-attack-player');
      this._s.sound?.hit();
      if (ehpB) ehpB.style.width = '0%';
      addLine(`Your forces crush ${waveName}!`, 'hit');
      setTimeout(() => {
        pSprite?.classList.remove('sprite-attack-player');
        eSprite?.classList.add('sprite-hit');
        setTimeout(() => eSprite?.classList.remove('sprite-hit'), 350);
      }, 200);

      await sleep(700);

      // Enemy strikes — player HP drain
      eSprite?.classList.add('sprite-attack-enemy');
      this._s.sound?.hit();
      const playerPct = Math.max(0, Math.round((detail.playerHP / initialPlayerHP) * 100));
      if (phpB) phpB.style.width = `${playerPct}%`;
      addLine(`${waveName} deals ${detail.dmgReceived} damage! Your HP: ${playerPct}%`, 'hit');

      if (detail.ability === 'aoe_blast') {
        await sleep(400);
        addLine(`💥 ${waveName} unleashes AOE Blast!`, 'turn');
      }

      setTimeout(() => {
        eSprite?.classList.remove('sprite-attack-enemy');
        pSprite?.classList.add('sprite-hit');
        setTimeout(() => pSprite?.classList.remove('sprite-hit'), 350);
      }, 200);

      if (detail.playerHP <= 0) break;
    }

    await sleep(800);

    // Hide arena, show result
    if (wvCounter) wvCounter.style.display = 'none';
    const arenaEl = document.getElementById('battle-arena');
    if (arenaEl) arenaEl.style.display = 'none';
    const resultArea = document.getElementById('battle-result-area');
    if (resultArea) {
      resultArea.style.display = 'block';

      if (result.success) {
        const victory   = result.result?.victory;
        const rewards   = result.rewards;
        const isReduced = result.reducedReward;
        const rewardChips = rewards && victory
          ? Object.entries(rewards).map(([r, v], i) =>
              `<div class="battle-reward-chip" style="animation-delay:${0.2 + i * 0.1}s">${RES_META[r]?.icon ?? '✨'} +${fmt(v)} ${r}</div>`
            ).join('')
          : '';

        resultArea.innerHTML = `
          <div class="battle-result">
            <span class="battle-result-icon">${victory ? '🏆' : '💀'}</span>
            <div class="battle-result-title ${victory ? 'victory' : 'defeat'}">${victory ? 'Victory!' : 'Defeated!'}</div>
            <p style="color:var(--clr-text-secondary)">${victory
              ? (isReduced ? '⚠️ Reduced loot — no more full rewards from this encounter.' : 'Your forces triumphed!')
              : 'Your forces were overwhelmed. Regroup and try again!'}</p>
            ${rewards && victory ? `<div class="battle-rewards">${rewardChips}</div>` : ''}
          </div>`;
        if (victory) this._spawnConfetti();
      }
    }

    document.getElementById('battle-actions').innerHTML = `<button class="btn btn-primary" id="btn-battle-close">Continue</button>`;
    document.getElementById('btn-battle-close')?.addEventListener('click', () => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');
      if (overlay) overlay.classList.add('hidden');
      if (content) content.innerHTML = '';
      this.render();
    });
  }

  _spawnConfetti() {
    const content = document.getElementById('modal-content');
    if (!content) return;
    const colors = ['var(--clr-gold)', 'var(--clr-primary)', 'var(--clr-success)'];
    for (let i = 0; i < 24; i++) {
      const p   = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;animation-duration:${0.8+Math.random()}s;animation-delay:${Math.random()*0.5}s;`;
      content.appendChild(p);
      setTimeout(() => p.remove(), 2000);
    }
  }

  _renderBattleLog(log) {
    const el = document.getElementById('battle-log');
    if (!el) return;
    el.innerHTML = log.length === 0
      ? '<div class="empty-state" style="padding:var(--space-6)"><div class="empty-state-icon">⚔️</div><p class="empty-state-title">No battles yet</p></div>'
      : log.map(e => {
          const isWin = e.result === 'Victory';
          return `<div style="padding:var(--space-2) var(--space-3);background:var(--clr-bg-elevated);border-radius:var(--radius-md);border:1px solid ${isWin?'var(--clr-success)':'var(--clr-danger)'}33;display:flex;justify-content:space-between;align-items:center">
            <span>${e.icon} <strong>${e.monster}</strong></span>
            <span style="color:${isWin?'var(--clr-success)':'var(--clr-danger)'};font-weight:700">${e.result}</span>
            <span style="font-size:var(--text-xs);color:var(--clr-text-muted)">${new Date(e.timestamp).toLocaleTimeString()}</span>
          </div>`;
        }).join('');
  }
}
