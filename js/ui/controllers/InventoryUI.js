/**
 * InventoryUI.js
 * Renders the player inventory as a right-side slide-in panel.
 * Triggered by the 🎒 button in the header (event: ui:openInventory).
 *
 * Universal — displays ALL item types:
 *   hero_card / hero_card_universal → Recruit button
 *   xp_bundle                       → Apply button (inline hero picker)
 *   resource_bundle                 → Open button
 *   buff                            → Activate button (stubbed)
 *
 * No purchasing happens here — buy from the Shop tab first.
 */
import { eventBus }        from '../../core/EventBus.js';
import { HEROES_CONFIG,
         GACHA_CONFIG }    from '../../entities/GAME_DATA.js';

const RARITY_META = {
  common:    { label: 'Common',    color: 'var(--clr-tier-common)'    },
  rare:      { label: 'Rare',      color: 'var(--clr-tier-rare)'      },
  legendary: { label: 'Legendary', color: 'var(--clr-tier-legendary)' },
};

const TYPE_GROUPS = [
  { type: 'recruitment_scroll', label: '🎲 Recruitment Scrolls' },
  { type: 'hero_card',          label: '🃏 Hero Cards' },
  { type: 'hero_card_universal', label: '🎴 Universal Hero Cards' },
  { type: 'hero_fragment',      label: '🔮 Hero Fragments' },
  { type: 'xp_bundle',          label: '📖 XP Bundles' },
  { type: 'resource_bundle',    label: '📦 Resource Bundles' },
  { type: 'buff',               label: '⚗️ Buffs' },
];

export class InventoryUI {
  /** @param {{ inventory, heroes, notifications }} systems */
  constructor(systems) {
    this._s = systems;
    this._renderDebounceTimer = null;
  }

  init() {
    eventBus.on('ui:openInventory',  () => this._open());
    eventBus.on('inventory:updated', () => {
      if (!this._isOpen()) return;
      // Debounce rapid updates (e.g. rapid shop purchases) so hero picker isn't destroyed mid-use
      clearTimeout(this._renderDebounceTimer);
      this._renderDebounceTimer = setTimeout(() => this._render(), 100);
    });
  }

  // ─────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────

  _isOpen() {
    return document.getElementById('inventory-panel')?.classList.contains('open') ?? false;
  }

  _open() {
    const overlay = document.getElementById('inventory-panel-overlay');
    const panel   = document.getElementById('inventory-panel');
    if (!overlay || !panel) return;
    overlay.classList.add('open');
    panel.classList.add('open');
    this._render();
    overlay.onclick = e => { if (e.target === overlay) this._close(); };
  }

  _close() {
    document.getElementById('inventory-panel-overlay')?.classList.remove('open');
    document.getElementById('inventory-panel')?.classList.remove('open');
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  _render() {
    const panel = document.getElementById('inventory-panel');
    if (!panel) return;

    const allItems    = this._s.inventory.getItems();
    const ownedItems  = allItems.filter(i => i.quantity > 0);
    const ownedHeroIds = new Set(
      this._s.heroes?.getRosterWithState?.().filter(h => h.isOwned).map(h => h.id) ?? []
    );

    const groups = TYPE_GROUPS
      .map(g => ({ ...g, items: allItems.filter(i => i.type === g.type && i.quantity > 0) }))
      .filter(g => g.items.length > 0);

    let bodyHtml = '';

    if (ownedItems.length === 0) {
      bodyHtml = `
        <div class="inv-empty">
          <div class="inv-empty-icon">🎒</div>
          <div class="inv-empty-title">Your inventory is empty</div>
          <div class="inv-empty-sub">Buy items from the <strong>🛒 Shop</strong> tab.</div>
        </div>`;
    } else {
      for (const group of groups) {
        bodyHtml += `<div class="inv-group"><div class="inv-group-label">${group.label}</div>`;
        for (const item of group.items) {
          const rarityM = RARITY_META[item.rarity] ?? {};
          const rarityHtml = rarityM.label
            ? `<span class="inv-item-rarity" style="color:${rarityM.color}">${rarityM.label}</span>`
            : '';
          bodyHtml += `
            <div class="inv-item-row" data-item-id="${item.id}">
              <div class="inv-icon-wrap">${item.icon}</div>
              <div class="inv-item-details">
                <div class="inv-item-name">${item.name}</div>
                ${rarityHtml}
              </div>
              <div class="inv-qty-badge">×${item.quantity}</div>
              <div class="inv-action-cell">${this._buildActionHtml(item, ownedHeroIds)}</div>
            </div>`;
        }
        bodyHtml += `</div>`;
      }
    }

    panel.innerHTML = `
      <div class="inv-panel-header">
        <span class="inv-panel-title">🎒 Inventory</span>
        <button class="btn btn-sm btn-ghost" id="inv-panel-close">✕</button>
      </div>
      <div class="inv-panel-body">${bodyHtml}</div>`;

    this._bindListeners(panel);
  }

  _buildActionHtml(item, ownedHeroIds, ownedHerosByTier) {
    // ── Recruitment Scrolls ──────────────────────────────────────────────
    if (item.type === 'recruitment_scroll') {
      return `<button class="btn btn-xs btn-gold inv-use-scroll" data-item="${item.id}" data-tier="${item.tier}">🎲 Roll</button>`;
    }

    // ── Specific Hero Cards ───────────────────────────────────────────────
    if (item.type === 'hero_card') {
      const alreadyOwned = item.targetHeroId && ownedHeroIds.has(item.targetHeroId);
      if (alreadyOwned) return `<button class="btn btn-xs btn-ghost" disabled>Owned</button>`;
      return `<button class="btn btn-xs btn-gold inv-use-card" data-item="${item.id}">Recruit</button>`;
    }

    // ── Universal Hero Cards — fix: check if ALL heroes of tier are owned ─
    if (item.type === 'hero_card_universal') {
      const tier          = item.targetTier;
      const heroesOfTier  = Object.values(HEROES_CONFIG).filter(h => h.tier === tier);
      const allOwned      = heroesOfTier.length > 0 && heroesOfTier.every(h => ownedHeroIds.has(h.id));
      if (allOwned) return `<button class="btn btn-xs btn-ghost" disabled title="All ${tier} heroes owned">All Owned</button>`;
      return `<button class="btn btn-xs btn-gold inv-use-card" data-item="${item.id}">Recruit</button>`;
    }

    // ── Hero Fragments ────────────────────────────────────────────────────
    if (item.type === 'hero_fragment') {
      const heroId     = item.targetHeroId;
      const needed     = GACHA_CONFIG.fragmentsToSummon[HEROES_CONFIG[heroId]?.tier ?? 'common'] ?? 10;
      const canSummon  = !ownedHeroIds.has(heroId) && item.quantity >= needed;
      const canConvert = ownedHeroIds.has(heroId); // owned heroes can receive XP from fragments
      return `
        <div class="inv-frag-actions">
          ${canSummon
            ? `<button class="btn btn-xs btn-gold inv-summon-frag" data-item="${item.id}" data-hero="${heroId}">✨ Summon</button>`
            : ''}
          ${canConvert
            ? `<button class="btn btn-xs btn-primary inv-convert-frag" data-item="${item.id}" data-hero="${heroId}">→ XP</button>`
            : ''}
          ${!canSummon && !canConvert
            ? `<span class="inv-frag-hint">${item.quantity}/${needed}</span>`
            : ''}
        </div>`;
    }

    // ── XP Bundles ───────────────────────────────────────────────────────
    if (item.type === 'xp_bundle') {
      return `<button class="btn btn-xs btn-primary inv-use-xp" data-item="${item.id}">Apply</button>`;
    }

    // ── Resource Bundles ─────────────────────────────────────────────────
    if (item.type === 'resource_bundle') {
      return `<button class="btn btn-xs btn-success inv-use-res" data-item="${item.id}">Open</button>`;
    }

    // ── Buffs ─────────────────────────────────────────────────────────────
    if (item.type === 'buff') {
      return `<button class="btn btn-xs btn-primary inv-use-buff" data-item="${item.id}">Activate</button>`;
    }

    return '';
  }

  // ─────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────

  _bindListeners(panel) {
    panel.querySelector('#inv-panel-close')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      this._close();
    });

    // ── Recruitment Scrolls → open GachaUI ─────────────────────────────
    panel.querySelectorAll('.inv-use-scroll').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const tier = e.currentTarget.dataset.tier;
        this._close();
        eventBus.emit('ui:openGacha', { scrollTier: tier });
      });
    });

    // ── Hero cards → recruit ──────────────────────────────────────────────
    panel.querySelectorAll('.inv-use-card').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const itemId = e.currentTarget.dataset.item;
        const r = this._s.inventory.useItem(itemId);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Recruit', r.reason);
        } else {
          const roster = this._s.heroes?.getRosterWithState?.() ?? [];
          const hero   = roster.find(h => h.id === r.heroId);
          this._s.notifications?.show('success', '👑 Hero Recruited!', `${hero?.name ?? r.heroId} has joined your roster!`);
        }
      });
    });

    // ── Hero Fragments → summon via fragments ─────────────────────────────
    panel.querySelectorAll('.inv-summon-frag').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.heroes?.summonFromFragments(heroId);
        if (!r?.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Summon', r?.reason ?? 'Failed.');
        } else {
          const roster = this._s.heroes?.getRosterWithState?.() ?? [];
          const hero   = roster.find(h => h.id === r.heroId);
          this._s.notifications?.show('success', '✨ Hero Summoned!', `${hero?.name ?? heroId} has materialised!`);
        }
      });
    });

    // ── Hero Fragments → convert to XP ───────────────────────────────────
    panel.querySelectorAll('.inv-convert-frag').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const itemId = e.currentTarget.dataset.item;
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.inventory.useItem(itemId, { heroId });
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Convert', r.reason);
        } else {
          this._s.notifications?.show('success', '🔮 Fragment Converted!', `+${r.xpAmount ?? 50} XP granted.`);
        }
      });
    });

    // ── XP Bundles → hero picker ──────────────────────────────────────────
    panel.querySelectorAll('.inv-use-xp').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const itemId = e.currentTarget.dataset.item;
        const row    = e.currentTarget.closest('.inv-item-row');
        this._showHeroPicker(itemId, row);
      });
    });

    // ── Resource Bundles → open ───────────────────────────────────────────
    panel.querySelectorAll('.inv-use-res').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const itemId = e.currentTarget.dataset.item;
        const r = this._s.inventory.useItem(itemId);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Open', r.reason);
        } else {
          const grants = Object.entries(r.grants ?? {})
            .map(([k, v]) => `+${v.toLocaleString()} ${k}`).join(', ');
          this._s.notifications?.show('success', '📦 Bundle Opened!', grants);
        }
      });
    });

    // ── Buffs → activate ─────────────────────────────────────────────────
    panel.querySelectorAll('.inv-use-buff').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const itemId = e.currentTarget.dataset.item;
        const r = this._s.inventory.useItem(itemId);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Activate', r.reason);
        } else {
          const mins = Math.round((r.durationMs ?? 0) / 60000);
          this._s.notifications?.show('success', '⚗️ Buff Activated!', `+${((r.value ?? 0) * 100).toFixed(0)}% production for ${mins} min.`);
        }
      });
    });
  }

  // ─────────────────────────────────────────────
  // HERO PICKER (inline, for XP bundles)
  // ─────────────────────────────────────────────

  _showHeroPicker(bundleId, rowEl) {
    document.getElementById('inv-hero-picker')?.remove();

    const ownedHeroes = this._s.heroes?.getRosterWithState?.().filter(h => h.isOwned) ?? [];
    if (ownedHeroes.length === 0) {
      this._s.notifications?.show('warning', 'No Heroes', 'Recruit a hero first.');
      return;
    }

    const picker = document.createElement('div');
    picker.id = 'inv-hero-picker';
    picker.className = 'inv-hero-picker';
    picker.innerHTML = `
      <div class="inv-picker-label">Choose hero to receive XP:</div>
      ${ownedHeroes.map(h => `
        <button class="btn btn-xs inv-pick-hero" data-hero="${h.id}">
          ${h.icon} ${h.name} <span class="inv-pick-lv">Lv.${h.level}</span>
        </button>`).join('')}
      <button class="btn btn-xs btn-ghost" id="inv-picker-cancel">Cancel</button>`;

    rowEl?.after(picker);

    picker.querySelector('#inv-picker-cancel')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      picker.remove();
    });

    picker.querySelectorAll('.inv-pick-hero').forEach(btn => {
      btn.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.inventory.useItem(bundleId, { heroId });
        picker.remove();
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Apply', r.reason);
        } else {
          const hero = ownedHeroes.find(h => h.id === heroId);
          this._s.notifications?.show('success', '📖 XP Applied!', `+${r.xpAmount?.toLocaleString() ?? '?'} XP → ${hero?.name ?? heroId}`);
        }
      });
    });
  }
}
