/**
 * NavigationUI.js
 * Handles: navigation view switching, status bar, resource display,
 * player profile, live progress-bar timers, save indicator, mail badge.
 *
 * Emits `ui:viewChanged` when the active view changes so domain
 * controllers can re-render themselves.
 */
import { eventBus } from '../../core/EventBus.js';
import { RES_META, fmt } from '../uiUtils.js';

export class NavigationUI {
  /**
   * @param {{ rm, bm, um, tech, user, mail, heroes, notifications }} systems
   */
  constructor(systems) {
    this._s = systems;
    this._activeView = 'base';
    this._sessionStartMs = Date.now();
  }

  init() {
    this._bindNavigation();
    this._bindHeaderButtons();
    this._subscribeToEvents();
    this._renderResources(this._s.rm.getSnapshot());
    this._renderProfile(this._s.user.getProfile());
    this._updateMailBadge(this._s.mail.getUnreadCount());
    this._refreshStatusBar();
  }

  // ---- NAVIGATION ----
  _bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._switchView(btn.dataset.view);
      });
    });
  }

  _switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${viewId}`)?.classList.remove('hidden');
    document.getElementById(`nav-${viewId}`)?.classList.add('active');
    this._activeView = viewId;
    eventBus.emit('ui:viewChanged', viewId);
  }

  _bindHeaderButtons() {
    document.getElementById('btn-mail')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      eventBus.emit('ui:openMail');
    });
    document.getElementById('btn-inventory')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      eventBus.emit('ui:openInventory');
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      eventBus.emit('ui:openSettings');
    });
  }

  // ---- EVENT SUBSCRIPTIONS ----
  _subscribeToEvents() {
    eventBus.on('resources:tick',         snap => this._renderResources(snap));
    eventBus.on('resources:ratesChanged', snap => this._renderResources(snap));
    eventBus.on('user:profileUpdated',    p    => this._renderProfile(p));
    eventBus.on('user:levelUp',           ()   => this._renderProfile(this._s.user.getProfile()));
    eventBus.on('user:xpGained',          d    => this._renderProfile(d.profile));
    eventBus.on('mail:received',          d    => this._updateMailBadge(d.unreadCount));
    eventBus.on('mail:read',              d    => this._updateMailBadge(d.unreadCount));
    eventBus.on('mail:deleted',           d    => this._updateMailBadge(d.unreadCount));
    eventBus.on('mail:updated',           d    => this._updateMailBadge(d.unreadCount));
    eventBus.on('game:saved',             ()   => this._flashSaveIndicator());
    eventBus.on('tick:ui',               ()   => this._refreshStatusBar());
    eventBus.on('building:completed',     ()   => this._refreshStatusBar());
    eventBus.on('building:started',       ()   => this._refreshStatusBar());
    eventBus.on('unit:trained',           ()   => this._refreshStatusBar());
    eventBus.on('army:updated',           ()   => this._refreshStatusBar());
    eventBus.on('tech:researched',        ()   => this._refreshStatusBar());
    eventBus.on('tech:started',           ()   => this._refreshStatusBar());
    eventBus.on('ui:navigateTo',          v    => this._switchView(v));
    eventBus.on('population:updated',     ()   => this._refreshStatusBar());
    eventBus.on('buffs:updated',          buffs => this._updateBuffBadge(buffs));
    eventBus.on('tick:ui',                ()   => this._refreshBuffBadgeTick());
    eventBus.on('building:cafeteria:shortfall', () => {
      this._s.notifications?.show('warning', '🍽️ Food Running Low', 'Cafeteria supplies are critically low — population is shrinking!');
    });
  }

  // ---- RESOURCES ----
  _renderResources(snap) {
    for (const key of Object.keys(RES_META)) {
      if (key === 'xp') continue;
      const res = snap[key];
      if (!res) continue;
      const valEl  = document.getElementById(`v-${key}`);
      const rateEl = document.getElementById(`r-${key}`);
      const capEl  = document.getElementById(`c-${key}`);
      if (valEl)  valEl.textContent  = fmt(res.amount);
      if (rateEl) rateEl.textContent = res.perSec > 0 ? `+${res.perSec.toFixed(1)}/s` : '';
      if (capEl && res.cap !== Infinity) capEl.textContent = `/ ${fmt(res.cap)}`;
    }
    // Cafeteria aggregate stock chip
    this._renderCafeteriaChip();
  }

  _renderCafeteriaChip() {
    const chip   = document.getElementById('res-cafeteria');
    if (!chip) return;
    const stocks = this._s.bm?.getCafeteriaStock?.() ?? [];
    if (stocks.length === 0) { chip.style.display = 'none'; return; }
    chip.style.display = '';
    let totalFood = 0, totalWater = 0, totalCapFood = 0, totalCapWater = 0;
    for (const s of stocks) {
      totalFood    += s.stock.food;
      totalWater   += s.stock.water;
      totalCapFood += s.stockCap.food;
      totalCapWater += s.stockCap.water;
    }
    const minStock = Math.min(totalFood, totalWater);
    const minCap   = Math.min(totalCapFood, totalCapWater);
    const valEl    = document.getElementById('v-cafeteria');
    const capEl    = document.getElementById('c-cafeteria');
    const rateEl   = document.getElementById('r-cafeteria');
    if (valEl)  valEl.textContent  = fmt(Math.floor(minStock));
    if (capEl)  capEl.textContent  = `/ ${fmt(minCap)}`;
    // Color the chip when stock is low
    const pct = minCap > 0 ? minStock / minCap : 1;
    chip.style.borderColor = pct < 0.2 ? 'var(--clr-danger)' : '';
    if (rateEl) rateEl.textContent = pct < 0.2 ? '⚠️ Low' : '';
  }

  // ---- PROFILE ----
  _renderProfile(profile) {
    const nameEl  = document.getElementById('player-name');
    const levelEl = document.getElementById('player-level');
    if (nameEl)  nameEl.textContent  = profile.username;
    if (levelEl) levelEl.textContent = `Lv. ${profile.level}`;
  }

  // ---- STATUS BAR ----
  _refreshStatusBar() {
    const el = id => document.getElementById(id);
    if (el('sb-army')) el('sb-army').textContent = this._s.um.getTotalUnitCount?.() ?? 0;
    const activeBld = this._s.bm.getAllBuildingsWithStatus().find(b => b.isBuilding);
    if (el('sb-building')) el('sb-building').textContent = activeBld
      ? `${activeBld.name} (${Math.max(0, Math.ceil((activeBld.constructionEndsAt - Date.now()) / 1000))}s)`
      : 'None';
    const activeRes = this._s.tech.getTechWithState().find(t => t.researchEndsAt);
    if (el('sb-research')) el('sb-research').textContent = activeRes
      ? `${activeRes.name} (${Math.max(0, Math.ceil((activeRes.researchEndsAt - Date.now()) / 1000))}s)`
      : 'None';
    const pop = this._s.rm.getPopulation();
    if (el('sb-population')) el('sb-population').textContent = `${Math.floor(pop.current)} / ${pop.cap}`;
    const mins = Math.floor((Date.now() - this._sessionStartMs) / 60000);
    if (el('sb-time')) el('sb-time').textContent = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  _flashSaveIndicator() {
    const el = document.getElementById('sb-save');
    if (!el) return;
    el.textContent = '💾 Saving...'; el.style.color = 'var(--clr-gold)';
    setTimeout(() => { el.textContent = '✅ Saved'; el.style.color = 'var(--clr-success)'; }, 1200);
  }

  // ---- BUFF BADGE ----
  _updateBuffBadge(buffs) {
    const badge = document.getElementById('buff-hud-badge');
    if (!badge) return;
    if (!buffs || buffs.length === 0) {
      badge.classList.add('hidden');
      return;
    }
    badge.classList.remove('hidden');
    const shortest = Math.min(...buffs.map(b => b.remaining));
    const secs = Math.ceil(shortest / 1000);
    const mins = Math.floor(secs / 60);
    const sec  = secs % 60;
    const timeStr = mins > 0 ? `${mins}m ${sec < 10 ? '0' : ''}${sec}s` : `${secs}s`;
    const countEl = badge.querySelector('#buff-badge-count');
    const timerEl = badge.querySelector('#buff-badge-timer');
    if (countEl) countEl.textContent = buffs.length;
    if (timerEl) timerEl.textContent = timeStr;
  }

  _refreshBuffBadgeTick() {
    const buffs = this._s.heroes?.getActiveBuffsWithRemaining?.() ?? [];
    this._updateBuffBadge(buffs);
  }

  // ---- MAIL BADGE ----
  _updateMailBadge(count) {
    const badge = document.getElementById('mail-badge');
    if (!badge) return;
    count > 0
      ? (badge.textContent = count > 99 ? '99+' : count, badge.classList.remove('hidden'))
      : badge.classList.add('hidden');
  }
}
