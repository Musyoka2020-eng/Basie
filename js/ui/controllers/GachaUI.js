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
    this._history = []; // session-only, last 5
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
    if (this._history.length > 5) this._history.pop();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML BUILDERS
  // ─────────────────────────────────────────────────────────────────────────

  _buildIdleHtml(scrollTier) {
    const scrollCfg = INVENTORY_ITEMS[`scroll_${scrollTier}`];
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <h2 class="gacha-title">${scrollCfg?.icon ?? '🎲'} Recruitment Roll</h2>
          <button class="btn btn-sm btn-ghost gacha-close-btn" id="gacha-close">✕</button>
        </div>
        <div class="gacha-stage gacha-stage--idle">
          <div class="gacha-scroll-icon">${scrollCfg?.icon ?? '📜'}</div>
          <div class="gacha-scroll-name">${scrollCfg?.name ?? 'Recruitment Scroll'}</div>
        </div>
      </div>`;
  }

  _buildRollingHtml(scrollTier) {
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <h2 class="gacha-title">🎲 Rolling…</h2>
        </div>
        <div class="gacha-stage gacha-stage--rolling">
          <div class="gacha-dice-container">
            <div class="gacha-dice gacha-dice--spin">🎲</div>
          </div>
          <div class="gacha-rolling-label">The dice fall…</div>
        </div>
      </div>`;
  }

  _buildResultHtml(result, scrollTier) {
    const outcomeMeta = OUTCOME_META[result.outcome] ?? { icon: '❓', label: 'Unknown' };
    let resultCard = '';
    let resultTitle = outcomeMeta.label;
    let glowClass   = '';
    let detailHtml  = '';

    if (result.outcome === 'hero') {
      const heroCfg = HEROES_CONFIG[result.heroId];
      const tier    = heroCfg?.tier ?? 'common';
      glowClass     = `gacha-result--${tier}`;
      resultTitle   = result.isDuplicate ? '⚠️ Duplicate Hero!' : `${outcomeMeta.label}!`;

      detailHtml = `
        <div class="gacha-hero-portrait">
          <span class="gacha-hero-icon">${heroCfg?.icon ?? '👤'}</span>
          <span class="gacha-tier-badge gacha-tier-badge--${tier}">${tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
        </div>
        <div class="gacha-result-name">${heroCfg?.name ?? result.heroId}</div>
        <div class="gacha-result-sub">${heroCfg?.title ?? ''}</div>
        ${result.isDuplicate
          ? `<div class="gacha-duplicate-notice">Already owned — a duplicate card has been added to your inventory for Awakening.</div>`
          : `<div class="gacha-recruit-notice">Hero has joined your roster! Visit <strong>Heroes</strong> to assign them.</div>`}`;

    } else if (result.outcome === 'fragment') {
      const fragCfg  = result.itemId ? INVENTORY_ITEMS[result.itemId] : null;
      const heroCfg  = result.heroId ? HEROES_CONFIG[result.heroId] : null;
      const tier     = heroCfg?.tier ?? 'common';
      glowClass      = `gacha-result--${tier}`;
      resultTitle    = `${outcomeMeta.label}!`;

      const ownedFrag  = result.fragmentsOwned ?? 0;
      const neededFrag = result.fragmentsNeeded ?? GACHA_CONFIG.fragmentsToSummon[tier] ?? 10;
      const pct        = Math.min(100, Math.round((ownedFrag / neededFrag) * 100));

      detailHtml = `
        <div class="gacha-fragment-icon">${fragCfg?.icon ?? '🔮'}</div>
        <div class="gacha-result-name">${fragCfg?.name ?? 'Hero Fragment'}</div>
        <div class="gacha-result-sub">For ${heroCfg?.name ?? result.heroId}</div>
        <div class="gacha-frag-progress">
          <div class="gacha-frag-bar-wrap">
            <div class="gacha-frag-bar" style="width:${pct}%"></div>
          </div>
          <span class="gacha-frag-count">${ownedFrag} / ${neededFrag} fragments</span>
        </div>
        ${result.canSummon
          ? `<div class="gacha-summon-ready">✨ Enough fragments to summon! Use the Heroes tab.</div>`
          : ''}`;

    } else {
      // resource, xp_item, buff
      const itemCfg = result.itemId ? INVENTORY_ITEMS[result.itemId] : null;
      const rarity  = itemCfg?.rarity ?? 'common';
      glowClass     = `gacha-result--${rarity}`;
      resultTitle   = `${outcomeMeta.label}!`;
      detailHtml    = `
        <div class="gacha-item-icon">${itemCfg?.icon ?? outcomeMeta.icon}</div>
        <div class="gacha-result-name">${itemCfg?.name ?? outcomeMeta.label}</div>
        <div class="gacha-result-sub">${itemCfg?.description ?? ''}</div>`;
    }

    resultCard = `
      <div class="gacha-result-card ${glowClass}">
        <div class="gacha-result-card-inner">
          ${detailHtml}
        </div>
      </div>`;

    const scrollsLeft = this._s.inventory.getQuantity(`scroll_${scrollTier}`);
    const historyHtml = this._buildHistoryHtml();

    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <h2 class="gacha-title">🎲 ${resultTitle}</h2>
          <button class="btn btn-sm btn-ghost gacha-close-btn" id="gacha-close">✕</button>
        </div>
        <div class="gacha-stage gacha-stage--result">
          ${resultCard}
        </div>
        <div class="gacha-footer">
          ${scrollsLeft > 0
            ? `<button class="btn btn-gold gacha-roll-again" id="gacha-roll-again">
                 🎲 Roll Again (×${scrollsLeft} left)
               </button>`
            : `<div class="gacha-no-scrolls">No more ${scrollTier} scrolls.<br>Buy from the <strong>🛒 Shop</strong>.</div>`}
          <button class="btn btn-ghost gacha-close-btn" id="gacha-close-2">Close</button>
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
      return `
        <div class="gacha-history-row ${i === 0 ? 'gacha-history-row--latest' : ''}">
          <span class="gacha-history-icon">${meta.icon}</span>
          <span class="gacha-history-label">${meta.label}</span>
          ${subName ? `<span class="gacha-history-sub">${subName}${r.isDuplicate ? ' (Dupe)' : ''}</span>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="gacha-history">
        <div class="gacha-history-title">📋 Recent Rolls</div>
        ${rows}
      </div>`;
  }

  _buildErrorHtml(msg) {
    return `
      <div class="gacha-panel">
        <div class="gacha-header">
          <h2 class="gacha-title">⚠️ Error</h2>
          <button class="btn btn-sm btn-ghost gacha-close-btn" id="gacha-close">✕</button>
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
    this._modal?.querySelectorAll('.gacha-close-btn').forEach(btn => {
      btn.addEventListener('click', () => { eventBus.emit('ui:click'); this._close(); });
    });

    this._modal?.querySelector('#gacha-roll-again')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      this._startRoll(scrollTier);
    });
  }
}
