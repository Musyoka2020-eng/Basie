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
    const money   = snap.money?.amount ?? 0;
    const diamond = snap.diamond?.amount ?? 0;

    grid.innerHTML = '';

    for (const shopEntry of cat.items) {
      const card = this._buildItemCard(shopEntry, money, diamond);
      grid.appendChild(card);
    }
  }

  _buildItemCard(entry, money, diamond) {
    const comingSoon = entry.comingSoon === true;

    // Resolve item config (may be null for premium stubs)
    const cfg    = entry.itemId ? (INVENTORY_ITEMS[entry.itemId] ?? null) : null;
    const icon   = cfg?.icon   ?? entry.icon   ?? '?';
    const name   = cfg?.name   ?? entry.label  ?? 'Unknown';
    const desc   = cfg?.description ?? entry.description ?? '';
    const rarity = cfg?.rarity ?? null;
    
    // Determine which currency and cost
    let cost, currency, currencyIcon;
    if (typeof entry.moneyCost === 'number') {
      cost = entry.moneyCost;
      currency = 'money';
      currencyIcon = '🪙';
    } else if (typeof entry.diamondCost === 'number') {
      cost = entry.diamondCost;
      currency = 'diamond';
      currencyIcon = '💎';
    } else {
      cost = null;
    }
    
    const cfg2      = entry.itemId ? INVENTORY_ITEMS[entry.itemId] : null;
    const automations = this._s.bm?.getAutomations() ?? {};
    const isAutomationActive = cfg2?.type === 'automation' && automations[cfg2.automation] === true;
    const qty       = entry.itemId ? this._s.inventory.getQuantity(entry.itemId) : 0;
    const canAfford = !isAutomationActive && cost !== null && (currency === 'money' ? money >= cost : diamond >= cost);

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

    const costHtml = cost !== null
      ? `<span class="shop-cost-chip ${canAfford ? 'affordable' : 'unaffordable'}" data-item-cost="${entry.itemId ?? ''}" data-currency="${currency}">${currencyIcon} ${fmt(cost)}</span>`
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
          : isAutomationActive
            ? `<button class="btn btn-sm btn-ghost" disabled>✅ Active</button>`
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
    // Determine which currency the item uses
    const moneyCost = entry.moneyCost;
    const diamondCost = entry.diamondCost;
    
    let costObj, currency, currencyIcon, costAmount;
    
    if (typeof moneyCost === 'number') {
      costAmount = moneyCost;
      costObj = { money: moneyCost };
      currency = 'money';
      currencyIcon = '🪙';
    } else if (typeof diamondCost === 'number') {
      costAmount = diamondCost;
      costObj = { diamond: diamondCost };
      currency = 'diamond';
      currencyIcon = '💎';
    } else {
      eventBus.emit('ui:error');
      this._s.notifications?.show('warning', 'Cannot Buy', 'Invalid item cost configuration.');
      return;
    }

    // Check affordability using ResourceManager's atomic check
    if (!this._s.rm.canAfford(costObj)) {
      eventBus.emit('ui:error');
      this._s.notifications?.show('warning', 'Cannot Buy', `Not enough ${currency}. Need ${fmt(costAmount)} ${currencyIcon}.`);
      return;
    }

    // Deduct cost atomically
    this._s.rm.spend(costObj);

    // Handle special automation items
    const cfg = INVENTORY_ITEMS[entry.itemId];
    if (cfg?.type === 'automation') {
      eventBus.emit('automation:purchased', { automation: cfg.automation });
      this._s.notifications?.show('success', '🤖 Automation Enabled!', `${cfg?.name ?? entry.itemId} is now active.`);
    } else {
      // Normal items go to inventory
      this._s.inventory.addItem(entry.itemId, 1);
      this._s.notifications?.show('success', '🛒 Purchased!', `${cfg?.name ?? entry.itemId} added to your inventory.`);
    }

    // Emit event for save trigger
    eventBus.emit('game:purchaseComplete', { itemId: entry.itemId, cost: costObj });
    
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

  // Refresh buy button disabled state and cost chip class on resource change
  _refreshAffordability() {
    const snap = this._s.rm.getSnapshot();
    const money   = snap.money?.amount ?? 0;
    const diamond = snap.diamond?.amount ?? 0;

    const cat = SHOP_CONFIG.find(c => c.id === this._activeCategory);
    if (!cat) return;

    // Build currency maps
    const costsByItemId = Object.fromEntries(
      cat.items.map(e => {
        if (typeof e.moneyCost === 'number') return [e.itemId, { amount: e.moneyCost, currency: 'money' }];
        if (typeof e.diamondCost === 'number') return [e.itemId, { amount: e.diamondCost, currency: 'diamond' }];
        return [e.itemId, null];
      })
    );

    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
      const itemId = btn.dataset.item;
      if (!itemId) return;
      const costInfo = costsByItemId[itemId];
      if (!costInfo) return;
      
      const canAfford = costInfo.currency === 'money' 
        ? money >= costInfo.amount 
        : diamond >= costInfo.amount;
      
      btn.disabled = !canAfford;
      btn.className = `btn btn-sm ${canAfford ? 'btn-gold' : 'btn-ghost'} shop-buy-btn`;
    });

    document.querySelectorAll('.shop-cost-chip').forEach(chip => {
      const itemId = chip.dataset.itemCost;
      const currency = chip.dataset.currency;
      if (!itemId || !currency) return;
      
      const costInfo = costsByItemId[itemId];
      if (!costInfo) return;
      
      const canAfford = currency === 'money' 
        ? money >= costInfo.amount 
        : diamond >= costInfo.amount;
        
      chip.className = `shop-cost-chip ${canAfford ? 'affordable' : 'unaffordable'}`;
    });
  }
}
