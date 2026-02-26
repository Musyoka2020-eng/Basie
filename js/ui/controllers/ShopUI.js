/**
 * ShopUI.js
 * Renders the Shop view — categorised item listings purchasable with gold.
 * Purchased items go to the player's Inventory, not applied directly.
 *
 * Categories: Hero Cards | XP Bundles | Resources | Buffs | Premium
 */
import { eventBus }                         from '../../core/EventBus.js';
import { SHOP_CONFIG, INVENTORY_ITEMS }     from '../../entities/GAME_DATA.js';
import { fmt }                              from '../uiUtils.js';

const RARITY_META = {
  common:    { label: 'Common',    color: 'var(--clr-tier-common)' },
  rare:      { label: 'Rare',      color: 'var(--clr-tier-rare)' },
  legendary: { label: 'Legendary', color: 'var(--clr-tier-legendary)' },
};

export class ShopUI {
  /** @param {{ rm, inventory, notifications }} systems */
  constructor(systems) {
    this._s       = systems;
    this._activeCategory = SHOP_CONFIG[0]?.id ?? 'heroes';
  }

  init() {
    eventBus.on('ui:viewChanged',    v  => { if (v === 'shop') this.render(); });
    eventBus.on('inventory:updated', () => { if (this._isActive()) this._refreshQtyBadges(); });
    // Refresh button affordability whenever gold changes
    eventBus.on('resources:updated', () => { if (this._isActive()) this._refreshAffordability(); });
  }

  _isActive() {
    return !document.getElementById('view-shop')?.classList.contains('hidden');
  }

  render() {
    const container = document.getElementById('shop-container');
    if (!container) return;

    // ── Category tabs ──────────────────────────────────────────────────────
    const tabsHtml = SHOP_CONFIG.map(cat => `
      <button class="shop-cat-tab${this._activeCategory === cat.id ? ' active' : ''}" data-cat="${cat.id}">
        ${cat.icon} ${cat.label}
      </button>`).join('');

    container.innerHTML = `
      <div class="shop-cat-tabs" id="shop-cat-tabs">${tabsHtml}</div>
      <div class="shop-items-grid" id="shop-items-grid"></div>`;

    container.querySelector('#shop-cat-tabs')?.querySelectorAll('.shop-cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._activeCategory = btn.dataset.cat;
        this.render();
      });
    });

    this._renderItems();
  }

  _renderItems() {
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;

    const cat = SHOP_CONFIG.find(c => c.id === this._activeCategory);
    if (!cat) return;

    const snap = this._s.rm.getSnapshot();
    const gold  = snap.gold?.amount ?? 0;

    grid.innerHTML = '';

    for (const shopEntry of cat.items) {
      const card = this._buildItemCard(shopEntry, gold);
      grid.appendChild(card);
    }
  }

  _buildItemCard(entry, gold) {
    const comingSoon = entry.comingSoon === true;

    // Resolve item config (may be null for premium stubs)
    const cfg    = entry.itemId ? (INVENTORY_ITEMS[entry.itemId] ?? null) : null;
    const icon   = cfg?.icon   ?? entry.icon   ?? '?';
    const name   = cfg?.name   ?? entry.label  ?? 'Unknown';
    const desc   = cfg?.description ?? entry.description ?? '';
    const rarity = cfg?.rarity ?? null;
    const cost   = entry.goldCost;
    const qty    = entry.itemId ? this._s.inventory.getQuantity(entry.itemId) : 0;
    const canAfford = typeof cost === 'number' && gold >= cost;

    const rarityBadge = rarity
      ? `<span class="shop-rarity-badge" style="color:${RARITY_META[rarity]?.color ?? 'inherit'}">${RARITY_META[rarity]?.label ?? rarity}</span>`
      : '';

    const featuredBadge = entry.featured
      ? `<span class="shop-featured-badge">★ Featured</span>`
      : '';

    const ownedBadge = qty > 0 && !comingSoon
      ? `<span class="shop-owned-badge" data-item-qty="${entry.itemId}">×${qty} owned</span>`
      : (qty === 0 && entry.itemId
          ? `<span class="shop-owned-badge" data-item-qty="${entry.itemId}" style="display:none"></span>`
          : '');

    const costHtml = typeof cost === 'number'
      ? `<span class="shop-cost-chip ${canAfford ? 'affordable' : 'unaffordable'}" data-item-cost="${entry.itemId ?? ''}">💰 ${fmt(cost)}</span>`
      : '';

    const card = document.createElement('div');
    card.className = `shop-item-card${comingSoon ? ' shop-item-locked' : ''}${entry.featured ? ' shop-item-featured' : ''}`;
    card.innerHTML = `
      ${featuredBadge}
      <div class="shop-item-icon">${icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${name}</div>
        ${rarityBadge}
        <div class="shop-item-desc">${desc}</div>
      </div>
      <div class="shop-item-footer">
        ${ownedBadge}
        ${costHtml}
        ${comingSoon
          ? `<button class="btn btn-sm btn-ghost" disabled>🔒 Coming Soon</button>`
          : `<button class="btn btn-sm ${canAfford ? 'btn-gold' : 'btn-ghost'} shop-buy-btn"
               data-item="${entry.itemId}" data-cost="${cost}"
               ${canAfford ? '' : 'disabled'}>
               Buy
             </button>`}
      </div>`;

    if (!comingSoon) {
      card.querySelector('.shop-buy-btn')?.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._buy(entry);
      });
    }

    return card;
  }

  _buy(entry) {
    const cost = entry.goldCost;
    const snap = this._s.rm.getSnapshot();
    const currentGold = snap.gold?.amount ?? 0;

    if (typeof cost !== 'number' || currentGold < cost) {
      eventBus.emit('ui:error');
      this._s.notifications?.show('warning', 'Cannot Buy', `Not enough gold. Need ${fmt(cost)} 💰.`);
      return;
    }

    this._s.rm.add({ gold: -cost });
    this._s.inventory.addItem(entry.itemId, 1);

    const cfg = INVENTORY_ITEMS[entry.itemId];
    this._s.notifications?.show('success', '🛒 Purchased!', `${cfg?.name ?? entry.itemId} added to your inventory.`);
    this.render();
  }

  // Lightweight qty-only refresh without full re-render
  _refreshQtyBadges() {
    document.querySelectorAll('[data-item-qty]').forEach(el => {
      const itemId = el.dataset.itemQty;
      if (!itemId) return;
      const qty = this._s.inventory.getQuantity(itemId);
      el.textContent = qty > 0 ? `×${qty} owned` : '';
      el.style.display = qty > 0 ? '' : 'none';
    });
  }

  // Refresh buy button disabled state and cost chip class on gold change
  _refreshAffordability() {
    const snap = this._s.rm.getSnapshot();
    const gold = snap.gold?.amount ?? 0;

    const cat = SHOP_CONFIG.find(c => c.id === this._activeCategory);
    if (!cat) return;

    const goldByItemId = Object.fromEntries(cat.items.map(e => [e.itemId, e.goldCost]));

    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
      const itemId = btn.dataset.item;
      const cost   = Number(btn.dataset.cost);
      if (!itemId || isNaN(cost)) return;
      const canAfford = gold >= cost;
      btn.disabled = !canAfford;
      btn.className = `btn btn-sm ${canAfford ? 'btn-gold' : 'btn-ghost'} shop-buy-btn`;
    });

    document.querySelectorAll('.shop-cost-chip').forEach(chip => {
      const itemId = chip.dataset.itemCost;
      if (!itemId) return;
      const cost = goldByItemId[itemId];
      if (typeof cost !== 'number') return;
      chip.className = `shop-cost-chip ${gold >= cost ? 'affordable' : 'unaffordable'}`;
    });
  }
}
