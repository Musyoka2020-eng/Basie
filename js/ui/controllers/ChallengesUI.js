/**
 * ChallengesUI.js
 * Renders a Daily Pass strip + daily challenges, then a Weekly Pass strip + weekly challenges.
 * Follows the same controller pattern as QuestsUI.
 */
import { eventBus } from '../../core/EventBus.js';

export class ChallengesUI {
  constructor(systems) {
    this._s = systems;
  }

  init() {
    eventBus.on('ui:viewChanged',     v => { if (v === 'challenges') this.render(); });
    eventBus.on('challenges:updated', () => this.render());
  }

  render() {
    const container = document.getElementById('challenges-list');
    if (!container) return;

    const all        = this._s.challenges.getActiveChallenges();
    const dailyPass  = this._s.challenges.getDailyPassState();
    const weeklyPass = this._s.challenges.getPassState();
    const daily      = all.filter(c => c.type === 'daily');
    const weekly     = all.filter(c => c.type === 'weekly');

    container.innerHTML = `
      ${this._renderPassStrip('📅 Daily Pass', 'Resets at midnight', dailyPass)}
      ${this._renderSection('📅 Daily Challenges', daily)}
      ${this._renderPassStrip('📆 Weekly Pass', 'Resets each Monday', weeklyPass)}
      ${this._renderSection('📆 Weekly Challenges', weekly)}
    `;

    container.querySelectorAll('.btn-claim-challenge').forEach(btn => {
      btn.addEventListener('click', () => this._s.challenges.claimReward(btn.dataset.id));
    });
  }

  /* ── Pass strip ────────────────────────────────────────────── */

  _renderPassStrip(title, subtitle, pass) {
    const { xp, maxXp, milestones } = pass;
    const pct = maxXp > 0 ? Math.min(100, Math.round((xp / maxXp) * 100)) : 0;

    const chestsHtml = milestones.map(m => {
      const chestPct = Math.round((m.xp / maxXp) * 100);
      const classes  = [
        'pass-chest',
        m.unlocked ? 'pass-chest-unlocked' : '',
        m.claimed  ? 'pass-chest-claimed'  : '',
      ].filter(Boolean).join(' ');

      return `
        <div class="${classes}" style="left:${chestPct}%" title="${m.label}">
          <span class="pass-chest-icon">${m.icon ?? '📦'}</span>
          ${m.claimed ? '<span class="pass-chest-check">✓</span>' : ''}
        </div>
      `;
    }).join('');

    const labelsHtml = milestones.map(m => {
      const chestPct = Math.round((m.xp / maxXp) * 100);
      return `<span class="pass-milestone-label" style="left:${chestPct}%">${m.xp}</span>`;
    }).join('');

    return `
      <div class="card challenge-pass-card">
        <div class="challenge-pass-header">
          <div>
            <span class="challenge-pass-title">${title}</span>
            <span class="challenge-pass-subtitle">${subtitle}</span>
          </div>
          <span class="challenge-pass-xp">${xp} / ${maxXp} XP</span>
        </div>
        <div class="pass-track">
          <div class="pass-track-bar" style="width:${pct}%"></div>
          <div class="pass-track-milestones">${chestsHtml}</div>
        </div>
        <div class="pass-milestone-labels">${labelsHtml}</div>
      </div>
    `;
  }

  /* ── Section & cards ───────────────────────────────────────── */

  _renderSection(title, challenges) {
    return `
      <div class="challenges-section">
        <h3 class="challenges-section-title">${title}</h3>
        <div class="challenges-grid">
          ${challenges.map(c => this._renderCard(c)).join('')}
        </div>
      </div>
    `;
  }

  _renderCard(c) {
    const pct      = Math.min(100, Math.round((c.progress / c.objective.count) * 100));
    const isDone   = c.completed;
    const isClaimed = c.claimed;

    const rewardText = Object.entries(c.reward)
      .filter(([k]) => k !== 'items')
      .map(([k, v]) => `+${v} ${k}`)
      .join(' · ');

    const xpBadge = c.xpReward
      ? `<span class="challenge-xp-badge">+${c.xpReward} XP</span>`
      : '';

    const btnHtml = isClaimed
      ? `<button class="btn btn-sm" disabled>✅ Claimed</button>`
      : isDone
        ? `<button class="btn btn-sm btn-gold btn-claim-challenge" data-id="${c.id}">Claim</button>`
        : `<button class="btn btn-sm" disabled>Locked</button>`;

    return `
      <div class="card challenge-card ${isDone && !isClaimed ? 'challenge-claimable' : ''} ${isClaimed ? 'challenge-done' : ''}">
        <div class="challenge-card-header">
          <span class="challenge-name">${c.name}</span>
          ${xpBadge}
        </div>
        <p class="challenge-desc">${c.description}</p>
        <div class="progress-bar" style="margin:0.5rem 0">
          <div class="progress-fill progress-fill-primary" style="width:${pct}%"></div>
        </div>
        <div class="challenge-footer">
          <span class="challenge-progress">${c.progress} / ${c.objective.count}</span>
          <span class="challenge-reward">🎁 ${rewardText}</span>
          ${btnHtml}
        </div>
      </div>
    `;
  }
}

