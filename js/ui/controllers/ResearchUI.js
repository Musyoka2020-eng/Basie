/**
 * ResearchUI.js
 * Renders the multi-level tech tree and research queue panel.
 *
 * UI sections (top to bottom):
 *  1. Research Queue panel — shows up to 4 slot boxes (locked/empty/active/queued)
 *  2. Tech tree grouped by tier with multi-level cards
 *
 * Achievements have been moved to Profile → Achievements tab (SettingsUI.js).
 */
import { eventBus }      from '../../core/EventBus.js';
import { RES_META, fmt } from '../uiUtils.js';
import { BUILDINGS_CONFIG, INVENTORY_ITEMS } from '../../entities/GAME_DATA.js';

const TIER_COLORS = { 1: 'var(--clr-success)', 2: 'var(--clr-gold)', 3: 'var(--clr-danger)', 4: 'var(--clr-primary)' };
const TIER_LABELS = { 1: 'Tier 1 — Basic', 2: 'Tier 2 — Advanced', 3: 'Tier 3 — Elite', 4: 'Tier 4 — Military Mastery' };

export class ResearchUI {
  /** @param {{ rm, tech, achievements, notifications }} systems */
  constructor(systems) {
    this._s = systems;
  }

  init() {
    eventBus.on('ui:viewChanged',   v => { if (v === 'research') this.render(); });
    eventBus.on('tech:researched',  () => this.render());
    eventBus.on('tech:started',     () => this.render());
    eventBus.on('tech:queueUpdated',() => this.render());
  }

  render() {
    const tree = document.getElementById('tech-tree');
    if (!tree) return;
    tree.innerHTML = '';

    this._renderQueuePanel(tree);
    this._renderTechTree(tree);
  }

  // ─────────────────────────────────────────────
  // Queue Panel
  // ─────────────────────────────────────────────

  _renderQueuePanel(container) {
    const tech      = this._s.tech;
    const queue     = tech.getQueue();
    const maxSlots  = tech.getMaxQueueSlots();
    const slotInfo  = tech.getQueueSlotInfo();
    const now       = Date.now();

    const panel = document.createElement('div');
    panel.className = 'research-queue-panel';

    panel.innerHTML = `
      <div class="research-queue-header">
        <span>🔬 Research Queue</span>
        <span class="research-queue-capacity">${queue.length} / ${maxSlots} slot${maxSlots !== 1 ? 's' : ''} active</span>
      </div>`;

    const slotsRow = document.createElement('div');
    slotsRow.className = 'research-queue-slots';

    // Always render all 4 possible slots; each is locked/empty/active/queued
    [1, 2, 3, 4].forEach(slotNum => {
      const slotDef   = slotInfo.find(s => s.slots === slotNum) ?? { slots: slotNum, unlocked: false, requires: null, premium: false };
      const queueItem = queue[slotNum - 1] ?? null;

      const slotEl = document.createElement('div');
      let stateClass = 'research-slot-empty';
      if (!slotDef.unlocked)          stateClass = 'research-slot-locked';
      else if (queueItem?.isActive)   stateClass = 'research-slot-active';
      else if (queueItem)             stateClass = 'research-slot-queued';
      slotEl.className = `research-slot ${stateClass}`;

      if (!slotDef.unlocked) {
        const reqs  = slotDef.requires
          ? Object.entries(slotDef.requires).map(([bId, lv]) => `${BUILDINGS_CONFIG[bId]?.name ?? bId} Lv.${lv}`).join(', ')
          : '';
        const prem  = slotDef.premium ? ' + Premium' : '';
        slotEl.innerHTML = `
          <div class="slot-lock-icon">🔒</div>
          <div class="slot-label">Slot ${slotNum}</div>
          <div class="slot-req">${reqs}${prem}</div>`;

      } else if (queueItem?.isActive) {
        const startedAt = queueItem.startedAt ?? 0;
        const endsAt    = queueItem.researchEndsAt ?? 0;
        const pct       = endsAt ? Math.max(0, Math.min(100, ((now - startedAt) / (endsAt - startedAt)) * 100)) : 0;
        const secsLeft  = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
        slotEl.innerHTML = `
          <div class="slot-active-inner">
            <span class="slot-tech-icon">${queueItem.icon}</span>
            <div class="slot-tech-info">
              <div class="slot-tech-name">${queueItem.name}</div>
              <div class="slot-tech-level">→ Lv.${queueItem.targetLevel} / ${queueItem.maxLevel}</div>
            </div>
            <button class="btn btn-xs btn-ghost slot-cancel-btn" data-techid="${queueItem.techId}" title="Cancel &amp; refund">✕</button>
          </div>
          <div class="slot-speedup-row">
            <div class="progress-container" data-timer-start="${startedAt}" data-timer-end="${endsAt}">
              <div class="progress-label"><span>Researching…</span><span class="progress-time-label">${secsLeft}s</span></div>
              <div class="progress-bar"><div class="progress-fill progress-fill-xp" style="width:${pct}%"></div></div>
            </div>
            <button class="btn btn-xs btn-warning slot-speed-btn" title="Speed Up">⏩</button>
          </div>`;

      } else if (queueItem) {
        slotEl.innerHTML = `
          <div class="slot-active-inner">
            <span class="slot-tech-icon">${queueItem.icon}</span>
            <div class="slot-tech-info">
              <div class="slot-tech-name">${queueItem.name}</div>
              <div class="slot-tech-level">→ Lv.${queueItem.targetLevel} / ${queueItem.maxLevel}</div>
            </div>
            <button class="btn btn-xs btn-ghost slot-cancel-btn" data-techid="${queueItem.techId}" title="Cancel &amp; refund">✕</button>
          </div>
          <div class="slot-queued-badge">#${slotNum} in queue</div>`;

      } else {
        slotEl.innerHTML = `
          <div class="slot-empty-icon">➕</div>
          <div class="slot-label">Empty Slot ${slotNum}</div>`;
      }

      slotEl.querySelector('.slot-cancel-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        eventBus.emit('ui:click');
        const tid = e.currentTarget.dataset.techid;
        const r   = this._s.tech.cancelResearch(tid);
        if (!r.success) this._s.notifications?.show('warning', 'Cannot Cancel', r.reason);
      });

      slotEl.querySelector('.slot-speed-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        eventBus.emit('ui:click');
        const activeQ = queue.find(q => q.isActive);
        const remaining = activeQ?.researchEndsAt ? Math.max(0, Math.ceil((activeQ.researchEndsAt - Date.now()) / 1000)) : 0;
        this._openSpeedupPicker(slotEl, 'research', remaining);
      });

      slotsRow.appendChild(slotEl);
    });

    panel.appendChild(slotsRow);
    container.appendChild(panel);
  }

  // ─────────────────────────────────────────────
  // Tech Tree
  // ─────────────────────────────────────────────

  _renderTechTree(container) {
    const header = document.createElement('div');
    header.className = 'research-tree-header';
    header.textContent = '🔭 Technology Tree';
    container.appendChild(header);

    const snap    = this._s.rm.getSnapshot();
    const allTech = this._s.tech.getTechWithState();

    [1, 2, 3, 4].forEach(tier => {
      const tierTechs = allTech.filter(t => t.tier === tier);
      if (!tierTechs.length) return;

      const tierHeader = document.createElement('div');
      tierHeader.className = 'tier-header';
      tierHeader.style.borderBottomColor = TIER_COLORS[tier];
      tierHeader.innerHTML = `
        <span style="font-weight:700;font-size:var(--text-sm);color:${TIER_COLORS[tier]}">${TIER_LABELS[tier]}</span>
        <span style="font-size:var(--text-xs);color:var(--clr-text-muted)">${tierTechs.filter(t => t.isMaxed).length}/${tierTechs.length} maxed</span>`;
      container.appendChild(tierHeader);

      const tierGrid = document.createElement('div');
      tierGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:var(--space-3);margin-bottom:var(--space-2)';

      tierTechs.forEach(t => tierGrid.appendChild(this._buildTechCard(t, snap, tier)));
      container.appendChild(tierGrid);
    });
  }

  _buildTechCard(t, snap, tier) {
    const now       = Date.now();
    const startedAt = t.isActive ? (t.startedAt ?? 0)       : 0;
    const endsAt    = t.isActive ? (t.researchEndsAt ?? 0)  : 0;
    const pct       = t.isActive && endsAt ? Math.max(0, Math.min(100, ((now - startedAt) / (endsAt - startedAt)) * 100)) : 0;
    const secsLeft  = t.isActive && endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

    const snap_      = snap;
    const costHtml   = t.nextLevelCost
      ? Object.entries(t.nextLevelCost).map(([res, amt]) =>
          `<span class="cost-chip ${(snap_[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${fmt(amt)}</span>`
        ).join('')
      : '';

    // Level pip track
    const levelPips = Array.from({ length: t.maxLevel }, (_, i) => {
      let cls = 'tech-level-pip';
      if (i < t.level)                          cls += ' filled';
      else if (i === t.level && (t.isActive || t.isQueued)) cls += ' pending';
      return `<div class="${cls}"></div>`;
    }).join('');

    // Current & next effect lines
    const currentBonus = t.level > 0     ? `<div class="tech-bonus-current">✓ Current Lv.${t.level}: ${this._fmtEffects(t.effects, t.level)}</div>`              : '';
    const nextBonus    = !t.isMaxed       ? `<div class="tech-bonus-next">↑ At Lv.${t.level + 1}: ${this._fmtEffects(t.effects, t.level + 1)}</div>`              : '';
    const timeHint     = !t.isMaxed && !t.isActive && !t.isQueued && t.nextLevelTime
      ? `<span class="tech-time-hint">⏱ ${fmt(t.nextLevelTime)}s</span>` : '';

    const isLocked = !t.requirementsMet && !t.isMaxed;
    let btnLabel, btnClass, btnDisabled;
    if (t.isMaxed)        { btnLabel = '⭐ Maxed';             btnClass = 'btn-ghost'; btnDisabled = true;  }
    else if (t.isActive)  { btnLabel = '⏳ Researching…';      btnClass = 'btn-ghost'; btnDisabled = true;  }
    else if (t.isQueued)  { btnLabel = `⏳ Queued (#${t.queuePosition + 1})`; btnClass = 'btn-ghost'; btnDisabled = true; }
    else if (isLocked)    { btnLabel = `🔒 ${t.requirementsReason}`; btnClass = 'btn-ghost'; btnDisabled = true; }
    else                  { btnLabel = `🔬 Research Lv.${t.level + 1}`; btnClass = 'btn-primary'; btnDisabled = false; }

    let cardClass = 'card tech-card';
    if (t.isMaxed)        cardClass += ' card-gold tech-maxed';
    else if (t.level > 0) cardClass += ' card-primary';

    const card = document.createElement('div');
    card.className = cardClass;
    card.dataset.techId = t.id;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon" style="position:relative">
          ${t.icon}
          <span style="position:absolute;top:-6px;right:-6px;padding:1px 5px;border-radius:8px;font-size:9px;font-weight:800;background:${TIER_COLORS[tier]};color:#000">T${tier}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="card-title">${t.name}</div>
          <div class="card-subtitle">${t.description}</div>
        </div>
        <span class="level-badge tech-level-badge ${t.isMaxed ? 'tech-level-maxed' : ''}">${t.isMaxed ? '⭐ Max' : `Lv.${t.level}/${t.maxLevel}`}</span>
      </div>
      <div class="tech-level-track">${levelPips}</div>
      <div class="card-body">
        ${currentBonus}
        ${nextBonus}
        ${!t.isMaxed ? `<div class="cost-row">${costHtml}</div>` : ''}
        ${t.isActive ? `
        <div class="progress-container" data-timer-start="${startedAt}" data-timer-end="${endsAt}">
          <div class="progress-label"><span>🔬 Researching Lv.${t.level + 1}…</span><span class="progress-time-label">${secsLeft}s</span></div>
          <div class="progress-bar"><div class="progress-fill progress-fill-xp" style="width:${pct}%"></div></div>
        </div>` : ''}
      </div>
      <div class="card-footer">
        <button class="btn btn-sm ${btnClass} btn-research" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>
        ${timeHint}
      </div>`;

    card.querySelector('.btn-research')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const r = this._s.tech.research(t.id);
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Research', r.reason);
      } else {
        this.render();
      }
    });

    // ── Rich tooltip on card-title: current + next-level effect values ──
    (() => {
      const ttParts = [];
      if (t.level > 0) {
        ttParts.push(`<div class="tt-row tt-sub">✓ Lv.${t.level}: ${this._fmtEffects(t.effects, t.level)}</div>`);
      }
      if (!t.isMaxed) {
        ttParts.push(`<div class="tt-row">↑ Lv.${t.level + 1}: ${this._fmtEffects(t.effects, t.level + 1)}</div>`);
      }
      if (!t.requirementsMet && t.requirementsReason) {
        ttParts.push(`<div class="tt-sep"></div><div class="tt-row tt-muted">🔒 ${t.requirementsReason}</div>`);
      }
      if (ttParts.length) {
        const head = `<div class="tt-title">${t.name}</div>`;
        card.querySelector('.card-title').dataset.tooltipHtml = head + ttParts.join('');
      }
    })();

    return card;
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  /**
   * Format accumulated effects at a given level (baseEffect × level).
   * @param {Object} effects - base effects map
   * @param {number} level   - target level to compute totals for
   */
  _fmtEffects(effects, level) {
    return Object.entries(effects).map(([key, val]) => {
      const total = val * level;
      const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      return typeof val === 'number' && val > 0 && val < 1
        ? `+${Math.round(total * 100)}% ${label}`
        : `+${total} ${label}`;
    }).join(', ');
  }

  // ─────────────────────────────────────────────
  // Speed-Up Picker
  // ─────────────────────────────────────────────

  _openSpeedupPicker(anchorEl, queueType, secsLeft) {
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

    const closeHandler = (e) => {
      if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('pointerdown', closeHandler, true); }
    };
    setTimeout(() => document.addEventListener('pointerdown', closeHandler, true), 0);

    anchorEl.style.position = 'relative';
    anchorEl.appendChild(picker);
  }
}
