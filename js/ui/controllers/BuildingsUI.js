/**
 * BuildingsUI.js
 * Renders the Base tab: build queue strip + grouped building category sections.
 *
 * UI sections:
 *  1. Build queue strip  (#build-queue-panel) — full-width, horizontal
 *  2. Grouped buildings  (#buildings-container) — per-category sections with multi-instance cards
 */
import { eventBus }         from '../../core/EventBus.js';
import { RES_META, fmt }    from '../uiUtils.js';
import { BUILDINGS_CONFIG, HEROES_CONFIG, HQ_UNLOCK_TABLE, UNITS_CONFIG, TECH_CONFIG, INVENTORY_ITEMS } from '../../entities/GAME_DATA.js';

export class BuildingsUI {
  /** @param {{ rm, bm, notifications, heroes }} systems */
  constructor(systems) {
    this._s = systems;
    this._activeCat  = null;
    this._activeType = null;
  }

  render() {
    this._renderBuildQueue();
    this._renderBuildingCards();
  }

  init() {
    eventBus.on('ui:viewChanged',        v => { if (v === 'base') this.render(); });
    eventBus.on('building:completed',        () => this.render());
    eventBus.on('building:started',          () => this.render());
    eventBus.on('building:queueUpdated',     () => this.render());
    eventBus.on('building:automationEnabled',() => this.render());
    eventBus.on('tech:researched',           () => this.render());
    eventBus.on('heroes:updated',            () => this.render());
    // Re-render on resource tick (throttled to 2 s) so affordability badges
    // update live — critical while tutorial blockers prevent manual tab clicks.
    this._tickThrottle = 0;
    eventBus.on('resources:tick', () => {
      const now = Date.now();
      if (now - this._tickThrottle >= 2000) {
        this._tickThrottle = now;
        this.render();
        // Let UIManager re-pin the spotlight ring after innerHTML replacement
        eventBus.emit('buildings:rendered');
      }
    });
    // Tutorial: switch category + type tabs to the requested building then re-render
    eventBus.on('buildings:focusBuilding', id => {
      const bType = this._s.bm.getBuildingTypesWithInstances().find(t => t.id === id);
      if (bType) {
        this._activeCat  = bType.category;
        this._activeType = bType.id;
        this.render();
      }
    });
  }

  // ─────────────────────────────────────────────
  // Build Queue Strip
  // ─────────────────────────────────────────────

  _renderBuildQueue() {
    const panel = document.getElementById('build-queue-panel');
    if (!panel) return;

    const bm       = this._s.bm;
    const queue    = bm.getBuildQueue();
    const maxSlots = bm.getMaxBuildSlots();
    const slotInfo = bm.getBuildSlotInfo();
    const now      = Date.now();

    panel.innerHTML = '';

    const strip = document.createElement('div');
    strip.className = 'bq-strip';

    // Left: label + capacity
    const label = document.createElement('div');
    label.className = 'bq-label';
    label.innerHTML = `
      <span class="bq-title">🏗️ Build Queue</span>
      <span class="bq-cap">${queue.length}/${maxSlots}</span>`;
    strip.appendChild(label);

    // Center: slot items
    const items = document.createElement('div');
    items.className = 'bq-items';

    for (let i = 0; i < 4; i++) {
      const slotDef   = slotInfo.find(s => s.slots === i + 1) ?? { slots: i + 1, unlocked: false, requires: null, premium: false };
      const queueItem = queue[i] ?? null;

      if (!slotDef.unlocked) {
        // Locked slot — compact lock pill
        const reqs = slotDef.requires
          ? Object.entries(slotDef.requires).map(([bId, lv]) => `${BUILDINGS_CONFIG[bId]?.name ?? bId} Lv.${lv}`).join(', ')
          : '';
        const prem = slotDef.premium ? ' + Premium' : '';
        const lockEl = document.createElement('div');
        lockEl.className = 'bq-slot bq-slot-locked';
        lockEl.title     = `Requires ${reqs}${prem}`;
        lockEl.innerHTML = `<span class="bq-slot-lock">🔒</span><span class="bq-slot-lock-label">Slot ${i + 1}</span>`;
        items.appendChild(lockEl);

      } else if (queueItem?.isActive) {
        // Active build — icon, name, progress bar
        const cfg       = queueItem.cfg ?? {};
        const startedAt = queueItem.startedAt ?? 0;
        const endsAt    = queueItem.endsAt    ?? 0;
        const pct       = endsAt ? Math.max(0, Math.min(100, ((now - startedAt) / (endsAt - startedAt)) * 100)) : 0;
        const secsLeft  = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

        const el = document.createElement('div');
        el.className = 'bq-slot bq-slot-active';
        el.innerHTML = `
          <div class="bq-slot-row">
            <span class="bq-slot-icon">${cfg.icon ?? '🏗️'}</span>
            <div class="bq-slot-info">
              <div class="bq-slot-name">${cfg.name ?? queueItem.buildingId}</div>
              <div class="bq-slot-sub">→ Lv.${queueItem.pendingLevel}</div>
            </div>
            <button class="bq-cancel" data-queueindex="0" title="Cancel &amp; refund">✕</button>
          </div>
          <div class="bq-speedup-row">
            <div class="progress-container bq-progress" data-timer-start="${startedAt}" data-timer-end="${endsAt}">
              <div class="progress-label bq-progress-label">
                <span>Building…</span>
                <span class="progress-time-label">${secsLeft}s</span>
              </div>
              <div class="progress-bar bq-bar">
                <div class="progress-fill progress-fill-primary" style="width:${pct}%"></div>
              </div>
            </div>
            <button class="btn btn-xs btn-warning bq-speed-btn" title="Speed Up">⏩</button>
          </div>`;
        el.querySelector('.bq-cancel')?.addEventListener('click', e => {
          e.stopPropagation();
          eventBus.emit('ui:click');
          const r = bm.cancelBuild(0);
          if (!r.success) this._s.notifications?.show('warning', 'Cannot Cancel', r.reason);
        });
        el.querySelector('.bq-speed-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          eventBus.emit('ui:click');
          this._openSpeedupPicker(el, 'building', secsLeft);
        });
        items.appendChild(el);

      } else if (queueItem) {
        // Queued (not active) — compact pill
        const cfg = queueItem.cfg ?? {};
        const el  = document.createElement('div');
        el.className = 'bq-slot bq-slot-queued';
        el.innerHTML = `
          <div class="bq-slot-row">
            <span class="bq-slot-icon">${cfg.icon ?? '🏗️'}</span>
            <div class="bq-slot-info">
              <div class="bq-slot-name">${cfg.name ?? queueItem.buildingId}</div>
              <div class="bq-slot-sub">→ Lv.${queueItem.pendingLevel}</div>
            </div>
            <button class="bq-cancel" data-queueindex="${queueItem.queuePosition}" title="Cancel &amp; refund">✕</button>
          </div>
          <div class="bq-queued-tag">#${i + 1} in queue</div>`;
        el.querySelector('.bq-cancel')?.addEventListener('click', e => {
          e.stopPropagation();
          eventBus.emit('ui:click');
          const idx = parseInt(e.currentTarget.dataset.queueindex, 10);
          const r   = bm.cancelBuild(idx);
          if (!r.success) this._s.notifications?.show('warning', 'Cannot Cancel', r.reason);
        });
        items.appendChild(el);

      } else {
        // Empty, unlocked slot
        const el = document.createElement('div');
        el.className = 'bq-slot bq-slot-empty';
        el.innerHTML = `<span class="bq-slot-empty-icon">＋</span><span class="bq-slot-empty-label">Empty</span>`;
        items.appendChild(el);
      }
    }

    strip.appendChild(items);
    panel.appendChild(strip);
  }

  // ─────────────────────────────────────────────
  // Grouped Building Sections — two-level tabs
  // ─────────────────────────────────────────────

  _renderBuildingCards() {
    const container = document.getElementById('buildings-grid');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'buildings-container';

    const snap = this._s.rm.getSnapshot();

    const CATEGORIES = [
      { id: 'core',       label: 'Core',       icon: '🏛️' },
      { id: 'production', label: 'Production', icon: '⚒️' },
      { id: 'population', label: 'Population', icon: '👥' },
      { id: 'military',   label: 'Military',   icon: '⚔️' },
    ];

    const allTypes   = this._s.bm.getBuildingTypesWithInstances();
    const activeCats = CATEGORIES.filter(c => allTypes.some(t => t.category === c.id));
    if (activeCats.length === 0) return;

    // Default to first available category / type
    if (!this._activeCat || !activeCats.find(c => c.id === this._activeCat)) {
      this._activeCat = activeCats[0].id;
    }

    // ── Level 1: Category tab strip ──────────────
    const catStrip = document.createElement('div');
    catStrip.className = 'bc-cat-tabs';

    for (const cat of activeCats) {
      const typesInCat  = allTypes.filter(t => t.category === cat.id);
      const built       = typesInCat.reduce((s, t) => s + t.instances.filter(i => i.level > 0).length, 0);
      const total       = typesInCat.reduce((s, t) => s + t.totalSlots, 0);
      const isBuilding  = typesInCat.some(t => t.instances.some(i => i.isActivelyBuilding));

      const btn = document.createElement('button');
      btn.className = `bc-cat-tab${this._activeCat === cat.id ? ' active' : ''}`;
      btn.innerHTML = `
        <span>${cat.icon} ${cat.label}</span>
        ${isBuilding ? '<span class="bc-pip bc-pip-building"></span>' : ''}
        <span class="bc-cat-stat">${built}/${total}</span>`;
      btn.addEventListener('click', () => {
        this._activeCat  = cat.id;
        this._activeType = null;
        this._renderBuildingCards();
      });
      catStrip.appendChild(btn);
    }
    container.appendChild(catStrip);

    // ── Level 2: Building-type tab strip ─────────
    const typesInCat = allTypes.filter(t => t.category === this._activeCat);

    if (!this._activeType || !typesInCat.find(t => t.id === this._activeType)) {
      this._activeType = typesInCat[0]?.id ?? null;
    }

    if (typesInCat.length > 1) {
      const typeStrip = document.createElement('div');
      typeStrip.className = 'bc-type-tabs';

      for (const bType of typesInCat) {
        const hasBuilt   = bType.instances.some(i => i.level > 0);
        const isBuilding = bType.instances.some(i => i.isActivelyBuilding);
        const builtCount = bType.instances.filter(i => i.level > 0).length;

        const btn = document.createElement('button');
        btn.className = `bc-type-tab${this._activeType === bType.id ? ' active' : ''}${bType.isHQLocked ? ' bc-type-tab-locked' : ''}`;
        btn.innerHTML = `
          <span class="bc-type-icon">${bType.icon}</span>
          <span>${bType.name}</span>
          ${bType.isHQLocked ? `<span class="bc-type-lock">🔒</span>`
            : isBuilding ? '<span class="bc-pip bc-pip-building"></span>'
            : hasBuilt ? `<span class="bc-type-count">${builtCount}</span>` : ''}`;
        btn.addEventListener('click', () => {
          this._activeType = bType.id;
          this._renderBuildingCards();
        });
        typeStrip.appendChild(btn);
      }
      container.appendChild(typeStrip);
    }

    // ── Card grid for the selected building type ──
    const bType = typesInCat.find(t => t.id === this._activeType);
    if (!bType) return;

    const grid = document.createElement('div');
    grid.className = 'buildings-grid';

    // HQ-locked building type — show a single locked card
    if (bType.isHQLocked) {
      grid.appendChild(this._buildHQLockedCard(bType));
    } else {
      const multiInst = bType.totalSlots > 1;
      for (const inst of bType.instances) {
        grid.appendChild(this._buildCard(inst, snap, multiInst));
      }
      for (const slot of bType.lockedSlots) {
        grid.appendChild(this._buildLockedSlotCard(bType, slot));
      }
    }

    container.appendChild(grid);
  }

  /** Build a live building instance card. */
  _buildCard(b, snap, showInstanceLabel) {
    const costHtml = Object.entries(b.cost).map(([res, amt]) =>
      `<span class="cost-chip ${(snap[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${fmt(amt)}</span>`
    ).join('');

    // ── Hero station section ──
    let heroStationHtml = '';
    const hm = this._s.heroes;
    if (hm) {
      const compatCfg = Object.values(HEROES_CONFIG).find(h => h.buildingBonus?.buildingType === b.id);
      if (compatCfg) {
        const stationed = hm.getBuildingHero(b.instanceId);
        if (stationed) {
          const hName   = HEROES_CONFIG[stationed.heroId]?.name ?? stationed.heroId;
          const hTier   = HEROES_CONFIG[stationed.heroId]?.tier ?? 'common';
          const bonusPct = stationed.level * 5;
          heroStationHtml = `
            <div class="hero-station-section">
              <div class="hero-stationed-badge">
                <span class="stationed-tier-dot stationed-tier-dot--${hTier}"></span>
                <span class="stationed-name">${hName}</span>
                <span class="stationed-bonus">+${bonusPct}%</span>
                <button class="btn-unstation" data-hero="${stationed.heroId}">✕</button>
              </div>
            </div>`;
        } else {
          const roster    = hm.getRosterWithState?.() ?? [];
          const heroState = roster.find(h => h.id === compatCfg.id);
          if (heroState?.isOwned && !heroState.isInSquad && !heroState.isInBuilding) {
            heroStationHtml = `
              <div class="hero-station-section">
                <button class="btn btn-xs btn-station-hero" data-hero="${compatCfg.id}" data-instance="${b.instanceId}">
                  ${compatCfg.icon} Station ${compatCfg.name}
                </button>
              </div>`;
          } else if (heroState?.isOwned && heroState.isInSquad) {
            heroStationHtml = `
              <div class="hero-station-section hero-station-busy">
                <span class="stationed-busy-label">${compatCfg.icon} ${compatCfg.name} is on squad duty</span>
              </div>`;
          }
        }
      }
    }

    const now       = Date.now();
    const startedAt = b.startedAt ?? 0;
    const pct       = b.isActivelyBuilding && b.constructionEndsAt
      ? Math.max(0, Math.min(100, ((now - startedAt) / (b.constructionEndsAt - startedAt)) * 100)) : 0;
    const secsLeft  = b.isActivelyBuilding && b.constructionEndsAt
      ? Math.max(0, Math.ceil((b.constructionEndsAt - now) / 1000)) : 0;

    const progressHtml = b.isActivelyBuilding && b.constructionEndsAt ? `
      <div class="progress-container" data-timer-start="${startedAt}" data-timer-end="${b.constructionEndsAt}">
        <div class="progress-label"><span>🏗️ Building…</span><span class="progress-time-label">${secsLeft}s</span></div>
        <div class="progress-bar"><div class="progress-fill progress-fill-primary" style="width:${pct}%"></div></div>
      </div>` : '';

    const effectLabelHtml = (() => {
      const isMaxed_ = b.isMaxLevel;
      // Production buildings: show current → next rate delta
      const numericEffects = Object.entries(b.effects ?? {}).filter(([, v]) => typeof v === 'number');
      if (numericEffects.length > 0 && b.level > 0) {
        const parts = numericEffects.map(([res, rate]) => {
          const icon = RES_META[res]?.icon ?? res;
          const cur  = +(rate * b.level).toFixed(1);
          if (isMaxed_) return `${icon} ${cur}/s`;
          const nxt  = +(rate * (b.level + 1)).toFixed(1);
          return `${icon} ${cur}/s → ${nxt}/s`;
        });
        return `<div class="building-effect-label">${parts.join(' · ')}</div>`;
      }
      // Storage buildings: show current → next cap contribution
      if (b.storageCap && b.level > 0) {
        // If storageCap uses level-indexed arrays, the effectLabel is more descriptive;
        // show a compact "current level cap" line for just the top two resources instead.
        const entries = Object.entries(b.storageCap);
        const isArrayBased = entries.some(([, v]) => Array.isArray(v));
        if (isArrayBased) {
          // Show the effectLabel (already descriptive) — tooltips carry the full numbers
          return b.effectLabel ? `<div class="building-effect-label">${b.effectLabel}</div>` : '';
        }
        const parts = entries.map(([res, capPerLv]) => {
          const icon = RES_META[res]?.icon ?? res;
          const cur  = fmt(capPerLv * b.level);
          if (isMaxed_) return `${icon} +${cur}`;
          const nxt  = fmt(capPerLv * (b.level + 1));
          return `${icon} +${cur} → +${nxt}`;
        });
        return `<div class="building-effect-label">📦 ${parts.join(' · ')}</div>`;
      }
      // Fallback: static label from config
      return b.effectLabel ? `<div class="building-effect-label">${b.effectLabel}</div>` : '';
    })();

    const autoRestockActive = b.id === 'cafeteria' && (this._s.bm?.getAutomations()?.cafeteriaRestock === true);
    const automationBadge   = autoRestockActive
      ? `<div class="cafeteria-auto-badge">🤖 Auto-restock active</div>` : '';

    const cafeteriaStockHtml = (b.id === 'cafeteria' && b.level > 0) ? (() => {
      const _cfp = BUILDINGS_CONFIG['cafeteria']?.foodCapacityPerLevel  ?? 200;
      const _cwp = BUILDINGS_CONFIG['cafeteria']?.waterCapacityPerLevel ?? 200;
      const stockCap = Array.isArray(_cfp) ? (_cfp[b.level] ?? 0) : _cfp * b.level;
      const wtrCap   = Array.isArray(_cwp) ? (_cwp[b.level] ?? 0) : _cwp * b.level;
      const food  = Math.floor(b.stock?.food  ?? 0);
      const water = Math.floor(b.stock?.water ?? 0);
      const depletionStr = (() => {
        if (!b.drainRatePerSec) return '♾️ No consumption';
        if (!isFinite(b.depletionSec)) return '♾️ Stocked';
        const s = Math.max(0, Math.floor(b.depletionSec));
        if (s < 60) return `⏱️ ~${s}s until empty`;
        const m = Math.floor(s / 60), r = s % 60;
        return `⏱️ ~${m}m ${r}s until empty`;
      })();
      return `<div class="cafeteria-stock">
        <div class="cafeteria-stock-row"><span>🌾 Food stock</span><span>${food} / ${stockCap}</span></div>
        <div class="cafeteria-stock-row"><span>💧 Water stock</span><span>${water} / ${wtrCap}</span></div>
        <div class="cafeteria-stock-row cafeteria-depletion"><span>${depletionStr}</span></div>
      </div>`;
    })() : '';

    // Pre-compute restock cap for cafeteria data-cap attribute (array-safe)
    const _rcfp = BUILDINGS_CONFIG['cafeteria']?.foodCapacityPerLevel ?? 200;
    const cafRestockCap = b.id === 'cafeteria'
      ? (Array.isArray(_rcfp) ? (_rcfp[b.level] ?? 0) : _rcfp * b.level)
      : 0;

    const queueBadgeHtml = b.queuedCount > 0 && !b.isActivelyBuilding
      ? `<span class="build-queue-badge">🏗️ ×${b.queuedCount} queued</span>` : '';

    // HQ preview: show what the next level unlocks on the townhall card
    const hqPreviewHtml = b.id === 'townhall' ? this._buildHQPreview() : '';

    // HQ current benefits on townhall card
    const hqBenefitsHtml = (b.id === 'townhall' && b.level > 0) ? (() => {
      const ben = this._s.bm.getHQBenefits();
      const parts = [];
      if (ben.productionBonus > 0) parts.push(`⚒️ +${Math.round(ben.productionBonus * 100)}% Production`);
      if (ben.attackBonus > 0)     parts.push(`⚔️ +${Math.round(ben.attackBonus * 100)}% ATK`);
      if (ben.defenseBonus > 0)    parts.push(`🛡️ +${Math.round(ben.defenseBonus * 100)}% DEF`);
      if (ben.storageBonus > 0)    parts.push(`📦 +${Math.round(ben.storageBonus * 100)}% Storage`);
      if (parts.length === 0) return '';
      return `<div class="hq-benefits"><span class="hq-benefits-title">Active HQ Bonuses:</span> ${parts.join(' · ')}</div>`;
    })() : '';

    const instLabel = (showInstanceLabel && b.instanceIndex >= 0)
      ? ` <span class="instance-label">#${b.instanceIndex + 1}</span>` : '';

    const displayLevel = b.effectiveLevel > b.level
      ? `Lv.${b.level}<span style="color:var(--clr-gold);font-size:10px;margin-left:2px">+${b.effectiveLevel - b.level}</span>`
      : `Lv.${b.level}`;

    const isMaxed  = b.isMaxLevel;
    const reqText  = b.requirementsReason ?? '';
    const nextLv   = b.effectiveLevel + 1;

    // Full requirements list (all unmet, not just first)
    const requirementsListHtml = (() => {
      const missing = b.missingRequirements ?? [];
      if (missing.length <= 1) return ''; // single entry already shown in button label
      return `<ul class="requirements-list">${missing.map(r => `<li>${r}</li>`).join('')}</ul>`;
    })();

    // House: show cafeteria capacity and population headroom
    const houseInfoHtml = (b.id === 'house' && b.level > 0) ? (() => {
      const rm      = this._s.rm;
      const foodCap = rm?.getFoodCapacity?.() ?? 0;
      const pop     = rm?.getPopulation?.() ?? { current: 0, cap: 0 };
      const popPerLv = BUILDINGS_CONFIG['house']?.populationCapacityPerLevel ?? 10;
      return `<div class="building-info-row">🍽️ Cafeteria stock cap: ${foodCap} &nbsp;·&nbsp; 👥 Pop: ${Math.floor(pop.current)}/${pop.cap} (+${popPerLv} on upgrade)</div>`;
    })() : '';

    // Bank: show population requirement for next upgrade level
    const bankInfoHtml = (b.id === 'bank' && !b.isMaxLevel) ? (() => {
      const lvlReqs = BUILDINGS_CONFIG['bank']?.levelRequirements ?? {};
      const nextPopReq = lvlReqs[nextLv]?.population;
      if (!nextPopReq) return '';
      const rm  = this._s.rm;
      const pop = rm?.getPopulation?.() ?? { current: 0, cap: 0 };
      const met = pop.current >= nextPopReq;
      return `<div class="building-info-row${met ? '' : ' building-info-row--warn'}">👥 Pop for Lv.${nextLv}: ${Math.floor(pop.current)}/${nextPopReq}${met ? ' ✓' : ' ✗'}</div>`;
    })() : '';

    const timeHint = !isMaxed && !b.isActivelyBuilding && b.nextLevelBuildTime
      ? `<span class="tech-time-hint">⏱ ${fmt(b.nextLevelBuildTime)}s</span>` : '';

    let btnText, btnCls, btnDisabled;
    if (!b.requirementsMet)  { btnText = `🔒 ${reqText}`;                             btnCls = 'btn-ghost'; btnDisabled = true;  }
    else if (isMaxed)        { btnText = '⭐ Max Level';                               btnCls = 'btn-ghost'; btnDisabled = true;  }
    else if (!b.canAfford)   { btnText = b.level === 0 ? 'Build' : `→ Lv.${nextLv}`; btnCls = 'btn-ghost'; btnDisabled = true;  }
    else                     { btnText = b.level === 0 ? 'Build' : `→ Lv.${nextLv}`; btnCls = b.level === 0 ? 'btn-primary' : 'btn-ghost'; btnDisabled = false; }

    const card = document.createElement('div');
    card.className = `card building-card${isMaxed ? ' card-gold' : ''}${b.level > 0 ? ' card-primary' : ''}`;
    card.dataset.bid = b.id;
    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon">${b.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="card-title">${b.name}${instLabel}</div>
          <div class="card-subtitle">${b.description}</div>
        </div>
        ${b.level > 0 ? `<span class="level-badge">${displayLevel}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="cost-row">${costHtml}</div>
        ${effectLabelHtml}
        ${cafeteriaStockHtml}
        ${automationBadge}
        ${requirementsListHtml}
        ${houseInfoHtml}
        ${bankInfoHtml}
        ${queueBadgeHtml}
        ${hqBenefitsHtml}
        ${hqPreviewHtml}
      </div>
      ${heroStationHtml}
      ${progressHtml}
      <div class="card-footer">
        <button class="btn btn-sm ${btnCls} btn-build" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
        ${timeHint}
        ${b.id === 'cafeteria' && b.level > 0 ? `<button class="btn btn-sm btn-primary btn-restock-cafeteria" data-instance="${b.instanceId}" data-cap="${cafRestockCap}">🔄 Restock</button>` : ''}
        ${b.level > 0 && !b.isActivelyBuilding ? `<span style="font-size:var(--text-xs);color:var(--clr-text-muted)">Lv.${b.level}/${b.maxLevel}</span>` : ''}
      </div>`;

    card.querySelector('.btn-build')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const r = this._s.bm.build(b.id, b.instanceIndex);
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Build', r.reason);
      }
      this.render();
    });

    card.querySelector('.btn-restock-cafeteria')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      const instanceId = e.currentTarget.dataset.instance;
      const cap = Number(e.currentTarget.dataset.cap);
      const r = this._s.bm.restockCafeteria(instanceId, cap, cap);
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Restock', r.reason);
      } else {
        this._s.notifications?.show('success', '🍽️ Restocked', 'Cafeteria refilled from global supply.');
      }
      this.render();
    });

    card.querySelector('.btn-station-hero')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      const heroId     = e.currentTarget.dataset.hero;
      const instanceId = e.currentTarget.dataset.instance;
      const r = this._s.heroes.assignHeroToBuilding(heroId, instanceId);
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Station', r.reason);
      }
      this.render();
    });

    card.querySelector('.btn-unstation')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      const heroId = e.currentTarget.dataset.hero;
      const r = this._s.heroes.unassignHeroFromBuilding(heroId);
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Unstation', r.reason);
      }
      this.render();
    });

    // ── Rich tooltip on card header showing next-level stat delta + build time ──
    (() => {
      const ttParts = [];
      if (!b.isMaxLevel) {
        const numericEffects = Object.entries(b.effects ?? {}).filter(([, v]) => typeof v === 'number');
        if (numericEffects.length && b.level > 0) {
          numericEffects.forEach(([res, rate]) => {
            const icon = RES_META[res]?.icon ?? res;
            const cur  = +(rate * b.level).toFixed(1);
            const nxt  = +(rate * (b.level + 1)).toFixed(1);
            ttParts.push(`<div class="tt-row"><span class="tt-label">${icon} Rate</span><span>${cur}/s → <strong>${nxt}/s</strong></span></div>`);
          });
        }
        if (b.storageCap) {
          Object.entries(b.storageCap).forEach(([res, capPerLv]) => {
            const icon = RES_META[res]?.icon ?? res;
            const lv  = b.level;
            const cur = Array.isArray(capPerLv) ? fmt(capPerLv[lv] ?? 0) : fmt(capPerLv * lv);
            const nxt = Array.isArray(capPerLv) ? fmt(capPerLv[lv + 1] ?? 0) : fmt(capPerLv * (lv + 1));
            ttParts.push(`<div class="tt-row"><span class="tt-label">${icon} Cap</span><span>+${cur} → <strong>+${nxt}</strong></span></div>`);
          });
        }
        if (b.nextLevelBuildTime) {
          ttParts.push(`<div class="tt-row"><span class="tt-label">⏱ Build time</span><span>${fmt(b.nextLevelBuildTime)}s</span></div>`);
        }
      } else {
        ttParts.push(`<div class="tt-row tt-muted">⭐ Maximum level reached</div>`);
      }
      if (ttParts.length) {
        const head = `<div class="tt-title">${b.name}${!b.isMaxLevel ? ` → Lv.${nextLv}` : ''}</div>`;
        card.querySelector('.card-header').dataset.tooltipHtml = head + ttParts.join('');
      }
    })();

    return card;
  }

  /** Build a locked future slot indicator card. */
  _buildLockedSlotCard(bType, slot) {
    // Only show conditions that are not yet satisfied
    const unmetConditions = slot.condition
      ? Object.entries(slot.condition).filter(([bId, lv]) => (this._s.bm?.getLevelOf(bId) ?? 0) < lv)
      : [];
    const condText = unmetConditions
      .map(([bId, lv]) => `${BUILDINGS_CONFIG[bId]?.name ?? bId} Lv.${lv}`)
      .join(' + ');

    const card = document.createElement('div');
    card.className = 'card building-card building-card-locked';
    card.innerHTML = `
      <div class="card-header" style="opacity:0.45">
        <div class="card-icon">${bType.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="card-title">${bType.name} <span class="instance-label">#${slot.instanceIndex + 1}</span></div>
          <div class="card-subtitle">Additional slot</div>
        </div>
      </div>
      <div class="card-body locked-slot-body">
        <div class="locked-slot-icon">🔒</div>
        ${condText ? `<div class="locked-slot-req">Requires: ${condText}</div>` : ''}
      </div>`;
    return card;
  }

  /** Build a card for a building type that is locked behind an HQ level. */
  _buildHQLockedCard(bType) {
    const card = document.createElement('div');
    card.className = 'card building-card building-card-locked';
    card.innerHTML = `
      <div class="card-header" style="opacity:0.45">
        <div class="card-icon">${bType.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="card-title">${bType.name}</div>
          <div class="card-subtitle">${bType.description}</div>
        </div>
      </div>
      <div class="card-body locked-slot-body">
        <div class="locked-slot-icon">🔒</div>
        <div class="locked-slot-req">Requires HQ Lv.${bType.hqRequiredLevel}</div>
        ${bType.effectLabel ? `<div class="building-effect-label" style="opacity:0.5;margin-top:6px">${bType.effectLabel}</div>` : ''}
      </div>`;
    return card;
  }

  /**
   * Build an HTML string previewing what the next HQ level unlocks.
   * Shown inside the townhall building card.
   */
  _buildHQPreview() {
    const hqLv = this._s.bm.getHQLevel();
    const nextLv = hqLv + 1;
    const entry  = HQ_UNLOCK_TABLE[nextLv];
    if (!entry) return '';

    const parts = [];

    if (entry.buildings.length > 0) {
      const names = entry.buildings.map(id => BUILDINGS_CONFIG[id]?.name ?? id).join(', ');
      parts.push(`<div class="hq-preview-row">🏗️ <strong>Buildings:</strong> ${names}</div>`);
    }
    if (entry.units.length > 0) {
      const names = entry.units.map(id => UNITS_CONFIG[id]?.name ?? id).join(', ');
      parts.push(`<div class="hq-preview-row">⚔️ <strong>Units:</strong> ${names}</div>`);
    }
    if (entry.techs.length > 0) {
      const names = entry.techs.map(id => TECH_CONFIG[id]?.name ?? id).join(', ');
      parts.push(`<div class="hq-preview-row">🔬 <strong>Techs:</strong> ${names}</div>`);
    }

    const b = entry.benefits;
    const bonusParts = [];
    if (b.productionBonus > 0) bonusParts.push(`+${Math.round(b.productionBonus * 100)}% Production`);
    if (b.attackBonus > 0)     bonusParts.push(`+${Math.round(b.attackBonus * 100)}% ATK`);
    if (b.defenseBonus > 0)    bonusParts.push(`+${Math.round(b.defenseBonus * 100)}% DEF`);
    if (b.storageBonus > 0)    bonusParts.push(`+${Math.round(b.storageBonus * 100)}% Storage`);
    if (bonusParts.length > 0) {
      parts.push(`<div class="hq-preview-row">📈 <strong>Bonuses:</strong> ${bonusParts.join(', ')}</div>`);
    }

    if (parts.length === 0) return '';
    return `<div class="hq-preview"><div class="hq-preview-title">🔓 HQ Lv.${nextLv} Unlocks:</div>${parts.join('')}</div>`;
  }

  // ─────────────────────────────────────────────
  // Speed-Up Picker (shared pattern)
  // ─────────────────────────────────────────────

  _openSpeedupPicker(anchorEl, queueType, secsLeft) {
    // Remove any existing picker
    document.querySelector('.speedup-picker')?.remove();

    const inventory = this._s.inventory;
    if (!inventory) return;

    const owned = inventory.getOwnedItems().filter(i =>
      i.type === 'speed_boost' && (i.target === queueType || i.target === 'any')
    );

    const picker = document.createElement('div');
    picker.className = 'speedup-picker';

    if (owned.length === 0) {
      picker.innerHTML = `
        <div class="speedup-picker-empty">
          <span>No speedups available.</span>
          <button class="btn btn-xs btn-primary speedup-goto-shop">🛒 Buy from Shop</button>
        </div>`;
      picker.querySelector('.speedup-goto-shop')?.addEventListener('click', () => {
        picker.remove();
        eventBus.emit('ui:navigateTo', 'shop');
      });
    } else {
      // Find recommended: smallest skipSeconds that covers remaining time, or largest available
      const sorted = [...owned].sort((a, b) => a.skipSeconds - b.skipSeconds);
      const recommended = sorted.find(i => i.skipSeconds >= secsLeft) ?? sorted[sorted.length - 1];

      picker.innerHTML = `
        <div class="speedup-picker-title">⏩ Speed Up</div>
        ${sorted.map(item => {
          const isRec = item.id === recommended.id;
          const label = item.skipSeconds >= 999999 ? 'Instant'
            : item.skipSeconds >= 3600 ? `${Math.round(item.skipSeconds / 3600)}h`
            : `${Math.round(item.skipSeconds / 60)}m`;
          const typeTag = item.target === 'any' ? ' (Universal)' : '';
          return `
            <button class="speedup-option${isRec ? ' speedup-recommended' : ''}" data-item="${item.id}">
              <span class="speedup-option-icon">${item.icon}</span>
              <span class="speedup-option-label">${label}${typeTag}</span>
              <span class="speedup-option-qty">×${item.quantity}</span>
              ${isRec ? '<span class="speedup-rec-badge">⭐ Best</span>' : ''}
            </button>`;
        }).join('')}`;

      picker.querySelectorAll('.speedup-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.item;
          const r = inventory.useItem(itemId, { queueType });
          picker.remove();
          if (!r.success) {
            this._s.notifications?.show('warning', 'Cannot Speed Up', r.reason);
          } else {
            const remaining = r.completed ? 'Done!' : `${Math.ceil((r.remaining ?? 0) / 1000)}s left`;
            this._s.notifications?.show('success', '⏩ Sped Up!', remaining);
          }
        });
      });
    }

    // Close on outside click
    const closeHandler = (e) => {
      if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('pointerdown', closeHandler, true); }
    };
    setTimeout(() => document.addEventListener('pointerdown', closeHandler, true), 0);

    anchorEl.style.position = 'relative';
    anchorEl.appendChild(picker);
  }
}

