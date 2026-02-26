/**
 * InventoryManager.js
 * Manages the player's item inventory.
 * Items include hero recruitment cards (specific and universal) and XP bundles.
 * Items are added via quest/achievement rewards, welcome mail, or future shop purchases.
 */
import { eventBus }       from '../core/EventBus.js';
import { INVENTORY_ITEMS } from '../entities/GAME_DATA.js';

export class InventoryManager {
  constructor() {
    this.name = 'InventoryManager';
    /** @type {Map<string, number>} itemId → quantity */
    this._items = new Map();
    this._hm = null; // set via setHeroManager()
    this._rm = null; // set via setResourceManager()
  }

  setHeroManager(hm)       { this._hm = hm; }
  setResourceManager(rm)   { this._rm = rm; }

  /** Get count of fragments for a hero by heroId */
  getFragmentCount(heroId) {
    const fragId = `fragment_${heroId}`;
    return this._items.get(fragId) ?? 0;
  }

  // ─────────────────────────────────────────────
  // MUTATION
  // ─────────────────────────────────────────────

  /**
   * Add qty of an item to the inventory.
   * @param {string} itemId
   * @param {number} [qty=1]
   */
  addItem(itemId, qty = 1) {
    if (!INVENTORY_ITEMS[itemId]) {
      console.warn(`[InventoryManager] Unknown item: ${itemId}`);
      return;
    }
    this._items.set(itemId, (this._items.get(itemId) ?? 0) + qty);
    eventBus.emit('inventory:updated', this.getItems());
  }

  /**
   * Remove qty of an item. Returns false if insufficient quantity.
   * @param {string} itemId
   * @param {number} [qty=1]
   * @returns {boolean}
   */
  removeItem(itemId, qty = 1) {
    const current = this._items.get(itemId) ?? 0;
    if (current < qty) return false;
    const next = current - qty;
    if (next === 0) this._items.delete(itemId);
    else            this._items.set(itemId, next);
    eventBus.emit('inventory:updated', this.getItems());
    return true;
  }

  // ─────────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────────

  /**
   * Check whether the player has at least qty of an item.
   * @param {string} itemId
   * @param {number} [qty=1]
   */
  hasItem(itemId, qty = 1) {
    return (this._items.get(itemId) ?? 0) >= qty;
  }

  /**
   * Get quantity of a specific item.
   * @param {string} itemId
   * @returns {number}
   */
  getQuantity(itemId) {
    return this._items.get(itemId) ?? 0;
  }

  /**
   * Returns all inventory items (config merged with current quantity).
   * Items with qty 0 are included so UI can show grayed-out entries.
   * @returns {Array<object>}
   */
  getItems() {
    return Object.values(INVENTORY_ITEMS).map(cfg => ({
      ...cfg,
      quantity: this._items.get(cfg.id) ?? 0,
    }));
  }

  /**
   * Returns only items the player currently owns (qty > 0).
   * @returns {Array<object>}
   */
  getOwnedItems() {
    return this.getItems().filter(i => i.quantity > 0);
  }

  /**
   * Returns items filtered by type.
   * @param {string} type  e.g. 'hero_card', 'hero_card_universal', 'xp_bundle'
   */
  getItemsByType(type) {
    return this.getItems().filter(i => i.type === type);
  }

  /**
   * Use/consume one of an item, applying its effect.
   * @param {string} itemId
   * @param {{ heroId?: string }} [opts]
   * @returns {{ success: boolean, reason?: string }}
   */
  useItem(itemId, { heroId } = {}) {
    const cfg = INVENTORY_ITEMS[itemId];
    if (!cfg) return { success: false, reason: 'Unknown item.' };
    if (!this.hasItem(itemId)) return { success: false, reason: `You don't have ${cfg.name}.` };

    if (cfg.type === 'hero_card' || cfg.type === 'hero_card_universal') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      const r = this._hm.recruitWithCard(itemId);
      return r;

    } else if (cfg.type === 'recruitment_scroll') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      // removeItem is handled inside rollScroll so the result info is correct
      const r = this._hm.rollScroll(cfg.tier);
      // Emit inventory update (removeItem inside rollScroll already emits,
      // but addItem for the reward also emits — no extra emit needed)
      return { success: true, gachaResult: r };

    } else if (cfg.type === 'hero_fragment') {
      // Convert fragment to XP on a chosen hero
      if (!heroId) return { success: false, reason: 'Select a hero to receive the XP.' };
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      return this._hm.useFragmentAsXP(itemId, heroId);

    } else if (cfg.type === 'xp_bundle') {
      if (!heroId) return { success: false, reason: 'Select a hero to receive the XP.' };
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      const r = this._hm.awardHeroXP(heroId, cfg.xpAmount);
      if (!r?.success) return { success: false, reason: r?.reason ?? 'Could not award XP.' };
      this.removeItem(itemId, 1);
      return { success: true, xpAmount: cfg.xpAmount };

    } else if (cfg.type === 'resource_bundle') {
      if (!this._rm) return { success: false, reason: 'Resource system not available.' };
      this.removeItem(itemId, 1);
      this._rm.add(cfg.grants);
      eventBus.emit('inventory:itemUsed', { itemId, grants: cfg.grants });
      return { success: true, grants: cfg.grants };

    } else if (cfg.type === 'buff') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      this.removeItem(itemId, 1);
      this._hm.activateBuff({ value: cfg.value, durationMs: cfg.durationMs });
      eventBus.emit('inventory:itemUsed', { itemId });
      return { success: true, durationMs: cfg.durationMs, value: cfg.value };

    }
    return { success: false, reason: 'This item cannot be used.' };
  }

  // ─────────────────────────────────────────────
  // GAME ENGINE HOOK
  // ─────────────────────────────────────────────

  /** No per-tick logic needed. */
  update(_dt) {}

  // ─────────────────────────────────────────────
  // PERSISTENCE
  // ─────────────────────────────────────────────

  serialize() {
    return { items: Object.fromEntries(this._items) };
  }

  deserialize(data) {
    if (!data?.items) return;
    for (const [id, qty] of Object.entries(data.items)) {
      if (INVENTORY_ITEMS[id] && qty > 0) this._items.set(id, qty);
    }
  }
}
