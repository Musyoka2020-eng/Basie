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
import { BUILDINGS_CONFIG } from '../../entities/GAME_DATA.js';

const TIER_COLORS = { 1: 'var(--clr-success)', 2: 'var(--clr-gold)', 3: 'var(--clr-danger)', 4: 'var(--clr-primary)' };

export class ResearchUI {
  /** @param {{ rm, tech, achievements, notifications }} systems */
  constructor(systems) {
    this._s = systems;
    // Node-graph pan/zoom state — preserved across re-renders within a session
    this._graphOffset = { x: 0, y: 0 };
    this._graphScale  = 1;
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
    const COLUMN_WIDTH = 290;
    const ROW_HEIGHT   = 195;
    const NODE_WIDTH   = 250;
    const NODE_HEIGHT  = 160; // used only for edge midpoint Y calculation
    const PAD_X        = 30;
    const PAD_Y        = 20;

    const snap    = this._s.rm.getSnapshot();
    const allTech = this._s.tech.getTechWithState();

    // Group by tier (preserve insertion order within tier)
    const byTier = { 1: [], 2: [], 3: [], 4: [] };
    for (const t of allTech) { if (byTier[t.tier]) byTier[t.tier].push(t); }

    // Compute absolute node positions
    const positions = new Map(); // techId → { x, y }
    for (const tier of [1, 2, 3, 4]) {
      byTier[tier].forEach((t, row) => {
        positions.set(t.id, {
          x: PAD_X + (tier - 1) * COLUMN_WIDTH,
          y: PAD_Y + row * ROW_HEIGHT,
        });
      });
    }

    const maxRows = Math.max(0, ...Object.values(byTier).map(a => a.length));
    const stageW  = PAD_X * 2 + 4 * COLUMN_WIDTH;
    const stageH  = PAD_Y * 2 + maxRows * ROW_HEIGHT;

    // Header
    const header = document.createElement('div');
    header.className = 'research-tree-header';
    header.innerHTML = `🔭 Technology Tree <span class="tree-hint">Scroll to zoom · Drag to pan</span>`;
    container.appendChild(header);

    // Viewport (clipping container)
    const viewport = document.createElement('div');
    viewport.className = 'tech-graph-viewport';
    container.appendChild(viewport);

    // Stage (single transform target — SVG edges + HTML nodes both live inside)
    const stage = document.createElement('div');
    stage.className = 'tech-graph-stage';
    stage.style.width  = `${stageW}px`;
    stage.style.height = `${stageH}px`;
    viewport.appendChild(stage);

    // ── SVG edge layer (behind nodes, pointer-events:none) ────────────────
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('tech-graph-edges');
    svg.setAttribute('width',   stageW);
    svg.setAttribute('height',  stageH);
    svg.setAttribute('viewBox', `0 0 ${stageW} ${stageH}`);

    for (const t of allTech) {
      if (!t.prereqTechs?.length) continue;
      const tPos = positions.get(t.id);
      if (!tPos) continue;
      for (const reqId of t.prereqTechs) {
        const sPos = positions.get(reqId);
        if (!sPos) continue;
        // Source: right-center of prereq node; Target: left-center of this node
        const x1  = sPos.x + NODE_WIDTH;
        const y1  = sPos.y + NODE_HEIGHT / 2;
        const x2  = tPos.x;
        const y2  = tPos.y + NODE_HEIGHT / 2;
        const cpx = (x1 + x2) / 2;
        const met = (this._s.tech.getLevelOf(reqId) ?? 0) > 0;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d',            `M${x1},${y1} C${cpx},${y1} ${cpx},${y2} ${x2},${y2}`);
        path.setAttribute('stroke',       met ? 'var(--clr-success)' : 'var(--clr-text-muted)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill',         'none');
        path.setAttribute('opacity',      met ? '0.8' : '0.4');
        if (!met) path.setAttribute('stroke-dasharray', '6 4');
        svg.appendChild(path);
      }
    }
    stage.appendChild(svg);

    // ── Node HTML layer ────────────────────────────────────────────
    const nodesLayer = document.createElement('div');
    nodesLayer.className = 'tech-graph-nodes';
    for (const t of allTech) {
      const pos = positions.get(t.id);
      if (!pos) continue;
      nodesLayer.appendChild(this._buildGraphNode(t, snap, pos, NODE_WIDTH, NODE_HEIGHT));
    }
    stage.appendChild(nodesLayer);

    // ── Pan & Zoom ────────────────────────────────────────────────
    const applyTransform = () => {
      stage.style.transform =
        `translate(${this._graphOffset.x}px,${this._graphOffset.y}px) scale(${this._graphScale})`;
    };
    applyTransform(); // restore position from previous render in this session

    let _drag = false, _dx = 0, _dy = 0;
    viewport.addEventListener('pointerdown', e => {
      if (e.target.closest('.tech-graph-node, .tech-node-popover')) return;
      _drag = true;
      _dx   = e.clientX - this._graphOffset.x;
      _dy   = e.clientY - this._graphOffset.y;
      viewport.setPointerCapture(e.pointerId);
      viewport.style.cursor = 'grabbing';
    });
    viewport.addEventListener('pointermove', e => {
      if (!_drag) return;
      this._graphOffset.x = e.clientX - _dx;
      this._graphOffset.y = e.clientY - _dy;
      stage.style.transform =
        `translate(${this._graphOffset.x}px,${this._graphOffset.y}px) scale(${this._graphScale})`;
    });
    viewport.addEventListener('pointerup', () => {
      _drag = false;
      viewport.style.cursor = 'grab';
    });
    viewport.addEventListener('wheel', e => {
      e.preventDefault();
      const rect   = viewport.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.10 : 0.90;
      const prev   = this._graphScale;
      this._graphScale = Math.max(0.6, Math.min(2.0, prev * factor));
      // Keep the cursor point stationary in stage coords
      this._graphOffset.x = mx - (mx - this._graphOffset.x) * (this._graphScale / prev);
      this._graphOffset.y = my - (my - this._graphOffset.y) * (this._graphScale / prev);
      applyTransform();
    }, { passive: false });

    // Click on bare viewport background closes any open popover
    viewport.addEventListener('pointerdown', e => {
      if (!e.target.closest('.tech-graph-node, .tech-node-popover')) {
        document.querySelector('.tech-node-popover')?.remove();
      }
    });
  }

  _buildGraphNode(t, snap, pos, nodeW, nodeH) {
    const isLocked  = !t.requirementsMet && !t.isMaxed;
    const tierColor = TIER_COLORS[t.tier] ?? 'var(--clr-border-light)';

    let statusBadge = '';
    if (t.isMaxed)       statusBadge = `<span class="tech-node-badge tgnb-maxed">⭐ Max</span>`;
    else if (t.isActive) statusBadge = `<span class="tech-node-badge tgnb-active">🔬 Active</span>`;
    else if (t.isQueued) statusBadge = `<span class="tech-node-badge tgnb-queued">⏳ Queued</span>`;

    const costHtml = !isLocked && !t.isMaxed && t.nextLevelCost
      ? Object.entries(t.nextLevelCost).map(([res, amt]) =>
          `<span class="cost-chip ${(snap[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${fmt(amt)}</span>`
        ).join('')
      : '';

    const effectLine = this._fmtEffects(t.effects, Math.max(1, t.level + 1));

    const node = document.createElement('div');
    node.className  = `tech-graph-node${isLocked ? ' tech-node-locked' : t.isMaxed ? ' tech-node-maxed' : t.level > 0 ? ' tech-node-active' : ''}`;
    node.dataset.techId = t.id;
    node.style.cssText  = `left:${pos.x}px;top:${pos.y}px;width:${nodeW}px`;

    node.innerHTML = `
      <div class="tech-node-inner" style="border-color:${isLocked ? 'var(--clr-border-light)' : tierColor}">
        <div class="tech-node-header">
          <span class="tech-node-icon">${t.icon}</span>
          <div class="tech-node-titles">
            <div class="tech-node-name">${t.name}</div>
            <div class="tech-node-lvl">Lv.${t.level}/${t.maxLevel}</div>
          </div>
          ${statusBadge}
          <span class="tech-tier-pip" style="background:${tierColor}">T${t.tier}</span>
        </div>
        <div class="tech-node-effect">${effectLine}</div>
        ${isLocked ? `<div class="tech-node-locked-msg">🔒 ${this._s.tech.canResearch(t.id).missingRequirements.join(', ') || 'Requirements not met'}</div>` : ''}
        ${costHtml ? `<div class="tech-node-costs">${costHtml}</div>` : ''}
      </div>
    `;

    node.addEventListener('click', e => {
      e.stopPropagation();
      this._openNodePopover(node, t, snap);
    });

    return node;
  }

  _openNodePopover(anchorNode, t, snap) {
    // Only one popover open at a time
    document.querySelector('.tech-node-popover')?.remove();

    const isLocked = !t.requirementsMet && !t.isMaxed;

    const costHtml = t.nextLevelCost
      ? Object.entries(t.nextLevelCost).map(([res, amt]) =>
          `<span class="cost-chip ${(snap[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${fmt(amt)}</span>`
        ).join('')
      : '';
    const timeHtml = t.nextLevelTime
      ? `<span class="tech-time-hint">⏱ ${fmt(t.nextLevelTime)}s</span>` : '';

    let btnHtml = '';
    if (t.isMaxed) {
      btnHtml = `<button class="btn btn-sm btn-ghost" disabled>⭐ Maxed</button>`;
    } else if (t.isActive) {
      btnHtml = `<button class="btn btn-sm btn-ghost" disabled>⏳ Researching…</button>`;
    } else if (t.isQueued) {
      btnHtml = `<button class="btn btn-sm btn-ghost" disabled>⏳ Queued (#${t.queuePosition + 1})</button>`;
    } else if (!isLocked) {
      btnHtml = `<button class="btn btn-sm btn-primary popover-research-btn" data-techid="${t.id}">🔬 Research Lv.${t.level + 1}</button>`;
    }

    const popover = document.createElement('div');
    popover.className = 'tech-node-popover';
    popover.innerHTML = `
      <div class="popover-head">
        <span>${t.icon}</span>
        <strong>${t.name}</strong>
        <span class="popover-lvl">Lv.${t.level}/${t.maxLevel}</span>
        <button class="btn btn-xs btn-ghost popover-close">✕</button>
      </div>
      <div class="popover-desc">${t.description}</div>
      ${t.level > 0 ? `<div class="popover-bonus">✓ Current: ${this._fmtEffects(t.effects, t.level)}</div>` : ''}
      ${!t.isMaxed ? `<div class="popover-bonus popover-next">↑ Lv.${t.level + 1}: ${this._fmtEffects(t.effects, t.level + 1)}</div>` : ''}
      ${isLocked ? `<div class="popover-missing">🔒 ${this._s.tech.canResearch(t.id).missingRequirements.join(', ') || 'Requirements not met'}</div>` : ''}
      ${!isLocked && !t.isMaxed ? `<div class="popover-cost">${costHtml} ${timeHtml}</div>` : ''}
      <div class="popover-actions">${btnHtml}</div>
    `;

    popover.querySelector('.popover-close')?.addEventListener('click', e => {
      e.stopPropagation();
      popover.remove();
    });

    popover.querySelector('.popover-research-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      eventBus.emit('ui:click');
      const tid = e.currentTarget.dataset.techid;
      const r   = this._s.tech.research(tid);
      popover.remove();
      if (!r.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Cannot Research', r.reason);
      }
    });

    anchorNode.appendChild(popover);

    // P13: if the popover overflows the viewport bottom, flip it to open upward
    const vbottom = document.documentElement.clientHeight;
    const pbottom = popover.getBoundingClientRect().bottom;
    if (pbottom > vbottom) {
      popover.style.top    = 'auto';
      popover.style.bottom = 'calc(100% + 8px)';
    }
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
