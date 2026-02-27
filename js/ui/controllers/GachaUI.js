/**
 * GachaUI.js
 * Handles the gacha recruitment roll modal experience.
 *
 * Flow:
 *   1. Player clicks "Roll" on a recruitment_scroll item in InventoryUI.
 *   2. InventoryUI emits 'ui:openGacha' with { scrollTier }.
 *   3. GachaUI opens the modal, plays a dice-flip animation, then calls
 *      inventory.useItem(scrollId) which delegates to HeroManager.rollScroll().
 *   4. Result is revealed with a card-flip animation and rarity glow.
 *   5. "Roll Again" appears if more scrolls of the same tier are available.
 *   6. A session-only "Last 5 Rolls" history strip is shown at the bottom.
 */
import { eventBus }         from '../../core/EventBus.js';
import { INVENTORY_ITEMS,
         HEROES_CONFIG,
         GACHA_CONFIG }     from '../../entities/GAME_DATA.js';

const TIER_COLORS = {
  common:    'var(--clr-tier-common)',
  rare:      'var(--clr-tier-rare)',
  legendary: 'var(--clr-tier-legendary)',
};

const OUTCOME_META = {
  resource: { icon: '📦', label: 'Resource Bundle' },
  xp_item:  { icon: '📖', label: 'XP Tome' },
  buff:      { icon: '⚗️', label: 'Production Buff' },
  fragment:  { icon: '🔮', label: 'Hero Fragment' },
  hero:      { icon: '👑', label: 'Hero Recruited' },
};

export class GachaUI {
  /** @param {{ inventory, heroes, notifications }} systems */
  constructor(systems) {
    this._s       = systems;
    this._history = []; // session-only, last 10
    this._modal   = null;
  }

  init() {
    eventBus.on('ui:openGacha', ({ scrollTier }) => this._open(scrollTier));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────────────

  _open(scrollTier) {
    this._close(); // Remove any existing

    const overlay = document.createElement('div');
    overlay.id        = 'gacha-modal-overlay';
    overlay.className = 'gacha-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) this._close(); });

    const modal = document.createElement('div');
    modal.id        = 'gacha-modal';
    modal.className = 'gacha-modal';
    modal.innerHTML = this._buildIdleHtml(scrollTier);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._modal = modal;

    // Trigger roll immediately after a short display delay
    requestAnimationFrame(() => {
      overlay.classList.add('gacha-overlay--open');
      modal.classList.add('gacha-modal--open');
      setTimeout(() => this._startRoll(scrollTier), 300);
    });
  }

  _close() {
    const existing = document.getElementById('gacha-modal-overlay');
    if (existing) existing.remove();
    this._modal = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROLLING
  // ─────────────────────────────────────────────────────────────────────────

  _startRoll(scrollTier) {
    if (!this._modal) return;

    // Show rolling animation phase
    this._modal.innerHTML = this._buildRollingHtml(scrollTier);

    // Wait for animation, then execute the real roll
    setTimeout(() => {
      const scrollId = `scroll_${scrollTier}`;
      const r = this._s.inventory.useItem(scrollId);

      if (!r.success || !r.gachaResult) {
        this._modal.innerHTML = this._buildErrorHtml(r.reason ?? 'Roll failed.');
        return;
      }

      const result = r.gachaResult;
      this._addToHistory(result);
      this._modal.innerHTML = this._buildResultHtml(result, scrollTier);
      this._bindResultListeners(scrollTier);

    }, 1800); // animation duration
  }

  _addToHistory(result) {
    this._history.unshift(result);
    if (this._history.length > 10) this._history.pop();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML BUILDERS
  // ─────────────────────────────────────────────────────────────────────────

  _buildIdleHtml(scrollTier) {
    const scrollCfg = INVENTORY_ITEMS[`scroll_${scrollTier}`];
    const tierGlowClass = `gacha-stage--glow-${scrollTier}`;
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <div class="gacha-header-left">
            <span class="gacha-scroll-tier-badge gacha-scroll-tier-badge--${scrollTier}">${scrollTier.charAt(0).toUpperCase() + scrollTier.slice(1)}</span>
            <h2 class="gacha-title">${scrollCfg?.name ?? 'Recruitment Scroll'}</h2>
          </div>
          <button class="gacha-close-x" id="gacha-close">✕</button>
        </div>
        <div class="gacha-stage ${tierGlowClass}">
          <div class="gacha-idle-icon">${scrollCfg?.icon ?? '📜'}</div>
          <p class="gacha-idle-label">Preparing the roll…</p>
        </div>
      </div>`;
  }

  _buildRollingHtml(scrollTier) {
    const tierGlowClass = `gacha-stage--glow-${scrollTier}`;
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <div class="gacha-header-left">
            <span class="gacha-scroll-tier-badge gacha-scroll-tier-badge--${scrollTier}">${scrollTier.charAt(0).toUpperCase() + scrollTier.slice(1)}</span>
            <h2 class="gacha-title">Rolling…</h2>
          </div>
        </div>
        <div class="gacha-stage gacha-stage--rolling ${tierGlowClass}">
          <div class="gacha-dice gacha-dice--spin">🎲</div>
          <p class="gacha-rolling-text">The dice fall…</p>
        </div>
      </div>`;
  }

  _buildResultHtml(result, scrollTier) {
    const outcomeMeta = OUTCOME_META[result.outcome] ?? { icon: '❓', label: 'Unknown' };
    let resultTitle  = outcomeMeta.label;
    let glowClass    = '';
    let resultTier   = '';
    let iconHtml     = '';
    let detailHtml   = '';
    let badgeHtml    = '';

    if (result.outcome === 'hero') {
      const heroCfg = HEROES_CONFIG[result.heroId];
      const tier    = heroCfg?.tier ?? 'common';
      glowClass     = `gacha-result--${tier}`;
      resultTier    = tier;
      resultTitle   = result.isDuplicate ? '⚠️ Duplicate Hero!' : 'Hero Recruited!';
      iconHtml      = `<div class="gacha-result-hero-icon gacha-result-hero-icon--${tier}">${heroCfg?.icon ?? '👤'}</div>`;
      badgeHtml     = `<span class="gacha-result-tier-badge gacha-result-tier-badge--${tier}">${tier.charAt(0).toUpperCase() + tier.slice(1)}</span>`;
      detailHtml    = `
        <div class="gacha-result-name">${heroCfg?.name ?? result.heroId}</div>
        <div class="gacha-result-sub">${heroCfg?.title ?? ''}</div>
        ${result.isDuplicate
          ? `<div class="gacha-notice gacha-notice--warning">Already owned — a duplicate card was added for Awakening.</div>`
          : `<div class="gacha-notice gacha-notice--info">Hero joined your roster! Visit <strong>Heroes</strong> to assign them.</div>`}`;

    } else if (result.outcome === 'fragment') {
      const heroCfg  = result.heroId ? HEROES_CONFIG[result.heroId] : null;
      const fragCfg  = result.itemId ? INVENTORY_ITEMS[result.itemId] : null;
      const tier     = heroCfg?.tier ?? 'common';
      glowClass      = `gacha-result--${tier}`;
      resultTier     = tier;
      resultTitle    = 'Hero Fragment!';
      iconHtml       = `<div class="gacha-result-generic-icon">${fragCfg?.icon ?? '🔮'}</div>`;
      badgeHtml      = `<span class="gacha-result-tier-badge gacha-result-tier-badge--${tier}">${tier.charAt(0).toUpperCase() + tier.slice(1)} Fragment</span>`;

      const ownedFrag  = result.fragmentsOwned ?? 0;
      const neededFrag = result.fragmentsNeeded ?? GACHA_CONFIG.fragmentsToSummon[tier] ?? 10;
      const pct        = Math.min(100, Math.round((ownedFrag / neededFrag) * 100));

      detailHtml = `
        <div class="gacha-result-name">${fragCfg?.name ?? 'Hero Fragment'}</div>
        <div class="gacha-result-sub">For ${heroCfg?.name ?? result.heroId}</div>
        <div class="gacha-frag-progress">
          <div class="gacha-frag-bar-header">
            <span>Fragment Progress</span>
            <span>${ownedFrag} / ${neededFrag}</span>
          </div>
          <div class="gacha-frag-bar-track">
            <div class="gacha-frag-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${result.canSummon
          ? `<div class="gacha-notice gacha-notice--success">✨ Enough fragments to summon! Visit the Heroes tab.</div>`
          : ''}`;

    } else {
      // resource, xp_item, buff
      const itemCfg = result.itemId ? INVENTORY_ITEMS[result.itemId] : null;
      const rarity  = itemCfg?.rarity ?? 'common';
      glowClass     = `gacha-result--${rarity}`;
      resultTitle   = `${outcomeMeta.label}!`;
      iconHtml      = `<div class="gacha-result-generic-icon">${itemCfg?.icon ?? outcomeMeta.icon}</div>`;
      badgeHtml     = `<span class="gacha-result-type-badge gacha-result-type-badge--${result.outcome}">${outcomeMeta.label}</span>`;
      detailHtml    = `
        <div class="gacha-result-name">${itemCfg?.name ?? outcomeMeta.label}</div>
        <div class="gacha-result-sub">${itemCfg?.description ?? ''}</div>`;
    }

    const scrollsLeft  = this._s.inventory.getQuantity(`scroll_${scrollTier}`);
    const historyHtml  = this._buildHistoryHtml();
    const tierGlowClass = `gacha-stage--glow-${resultTier || scrollTier}`;
    const scrollCfg    = INVENTORY_ITEMS[`scroll_${scrollTier}`];

    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <div class="gacha-header-left">
            <span class="gacha-scroll-tier-badge gacha-scroll-tier-badge--${scrollTier}">${scrollTier.charAt(0).toUpperCase() + scrollTier.slice(1)}</span>
            <h2 class="gacha-title">${resultTitle}</h2>
          </div>
          <button class="gacha-close-x gacha-close-btn" id="gacha-close">✕</button>
        </div>
        <div class="gacha-stage gacha-stage--result ${tierGlowClass}">
          <div class="gacha-result-card ${glowClass}">
            ${iconHtml}
            ${badgeHtml}
            ${detailHtml}
          </div>
        </div>
        <div class="gacha-footer">
          ${scrollsLeft > 0
            ? `<button class="btn btn-gold gacha-roll-again" id="gacha-roll-again">
                 🎲 Roll Again
                 <span class="gacha-roll-count">×${scrollsLeft} remaining</span>
               </button>`
            : `<div class="gacha-no-scrolls">No more ${scrollTier} scrolls — buy more from the <strong>🛒 Shop</strong>.</div>`}
          <button class="btn btn-ghost gacha-close-btn gacha-close-link" id="gacha-close-2">Close</button>
        </div>
        ${historyHtml}
      </div>`;
  }

  _buildHistoryHtml() {
    if (this._history.length === 0) return '';
    const rows = this._history.map((r, i) => {
      const meta    = OUTCOME_META[r.outcome] ?? { icon: '❓', label: r.outcome };
      const subName = r.heroId
        ? (HEROES_CONFIG[r.heroId]?.name ?? r.heroId)
        : (r.itemId ? (INVENTORY_ITEMS[r.itemId]?.name ?? r.itemId) : '');
      const tierClass = r.outcome === 'hero' || r.outcome === 'fragment'
        ? `gacha-history-row--${HEROES_CONFIG[r.heroId]?.tier ?? 'common'}`
        : `gacha-history-row--${r.outcome}`;
      return `
        <div class="gacha-history-row ${i === 0 ? 'gacha-history-row--latest' : ''} ${tierClass}">
          <span class="gacha-history-dot"></span>
          <span class="gacha-history-icon">${meta.icon}</span>
          <div class="gacha-history-text">
            <span class="gacha-history-label">${meta.label}</span>
            ${subName ? `<span class="gacha-history-sub">${subName}${r.isDuplicate ? ' (Dupe)' : ''}</span>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="gacha-history">
        <div class="gacha-history-title">📋 Session Rolls (${this._history.length})</div>
        <div class="gacha-history-list">${rows}</div>
      </div>`;
  }

  _buildErrorHtml(msg) {
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <div class="gacha-header-left">
            <h2 class="gacha-title">⚠️ Error</h2>
          </div>
          <button class="gacha-close-x gacha-close-btn" id="gacha-close">✕</button>
        </div>
        <div class="gacha-stage">
          <div class="gacha-error-msg">${msg}</div>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────────────────────────────────

  _bindResultListeners(scrollTier) {
    this._modal?.querySelectorAll('.gacha-close-btn, .gacha-close-x').forEach(btn => {
      btn.addEventListener('click', () => { eventBus.emit('ui:click'); this._close(); });
    });

    this._modal?.querySelector('#gacha-roll-again')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      this._startRoll(scrollTier);
    });
  }
}
