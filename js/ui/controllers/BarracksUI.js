/**
 * BarracksUI.js
 * Renders: reserve unit cards (with training controls),
 * squad management panel, and training queue.
 *
 * maxAffordable calculation now delegates to ResourceManager.maxAffordable()
 * instead of being computed inline.
 */
import { eventBus } from '../../core/EventBus.js';
import { UNITS_CONFIG, BUILDINGS_CONFIG } from '../../entities/GAME_DATA.js';
import { RES_META, fmt } from '../uiUtils.js';

export class BarracksUI {
  /**
   * @param {{ rm, um, notifications }} systems
   */
  constructor(systems) {
    this._s = systems;
  }

  init() {
    this._bindBarracksTabs();
    this._bindCreateSquadButton();

    eventBus.on('ui:viewChanged',    v => { if (v === 'barracks') this.render(); });
    eventBus.on('unit:trained',      () => this.render());
    eventBus.on('unit:queueUpdated', q  => this._renderTrainingQueue(q));
    eventBus.on('army:updated',      () => this.render());
  }

  render() {
    this._renderReserveUnits();
    this._renderSquads();
    this._renderTrainingQueue(this._s.um.getAllQueues());
  }

  // ---- TAB WIRING ----
  _bindBarracksTabs() {
    document.querySelectorAll('.barracks-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        const tabId   = btn.dataset.tab;
        const tabGroup = btn.closest('.barracks-tabs');
        if (!tabGroup) return;
        tabGroup.querySelectorAll('.barracks-tab-btn').forEach(b => b.classList.remove('active'));
        tabGroup.querySelectorAll('.barracks-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');
      });
    });
  }

  _bindCreateSquadButton() {
    document.getElementById('btn-create-squad')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const num      = this._s.um.getSquads().length + 1;
      const newSquadId = this._s.um.createSquad(`Squad ${num}`);
      this._renderSquadsList();
      setTimeout(() => {
        const newBtn = document.querySelector(`[data-squad-id="${newSquadId}"]`);
        if (newBtn) newBtn.click();
      }, 0);
    });
  }

  // ---- RESERVE UNITS ----
  _renderReserveUnits() {
    const grid = document.getElementById('units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const reserve    = this._s.um.getReserve();
    const reserveMap = {};
    reserve.forEach(u => { reserveMap[u.unitId] = u.count; });
    const snap = this._s.rm.getSnapshot();

    Object.values(UNITS_CONFIG).forEach(unit => {
      const count    = reserveMap[unit.id] ?? 0;
      const costItems = Object.entries(unit.cost).map(([res, amt]) =>
        `<span class="cost-chip ${(snap[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${amt}</span>`
      ).join('');

      // maxAffordable now a ResourceManager responsibility — no inline resource math
      const maxAffordable = this._s.rm.maxAffordable(unit.cost);

      // requirementsReason comes from BuildingManager via a unit-level check in UnitManager.
      // UnitManager._checkRequirements is private; we keep the text generation here for units
      // since UnitManager doesn't expose a withStatus() method.  A future refactor can
      // add getUnitsWithStatus() to UnitManager following the building pattern.
      const isLocked = !this._checkUnitRequirements(unit.requires);
      const reqText  = isLocked ? this._formatUnitReqs(unit.requires) : '';

      const card = document.createElement('div');
      card.className = `unit-card-reserve tier-${unit.tier ?? 1}`;
      card.innerHTML = `
        <div class="tier-badge">T${unit.tier ?? 1}</div>
        <div class="card-header">
          <div class="card-icon">${unit.icon}</div>
          <div>
            <div class="card-title">${unit.name}</div>
            <div class="card-subtitle">${unit.description}</div>
          </div>
        </div>
        ${count > 0 ? `<div class="reserve-count">×${count}</div>` : ''}
        <div class="card-body">
          <div class="stat-grid">
            <div class="stat-item"><span class="stat-label">HP</span><span class="stat-value">❤️ ${unit.stats.hp}</span></div>
            <div class="stat-item"><span class="stat-label">ATK</span><span class="stat-value">⚔️ ${unit.stats.attack}</span></div>
            <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-value">🛡️ ${unit.stats.defense}</span></div>
          </div>
          <div class="cost-row">${costItems}</div>
        </div>
        <div class="card-footer">
          <div class="control-pill">
            <button class="btn-pill-left btn-train-max" data-unit="${unit.id}" title="Set to maximum affordable" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>MAX</button>
            <input type="number" class="train-amount" value="${maxAffordable > 0 ? 1 : 0}" min="1" max="${maxAffordable}" data-max="${maxAffordable}" data-unit="${unit.id}" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>
            <button class="btn-pill-right btn-primary btn-train" data-unit="${unit.id}" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>
              ${isLocked ? 'Locked' : 'Train'}
            </button>
          </div>
        </div>`;

      card.querySelector('.btn-train-max')?.addEventListener('click', () => {
        eventBus.emit('ui:click');
        const input = card.querySelector('.train-amount');
        input.value = input.dataset.max;
      });

      card.querySelector('.btn-train')?.addEventListener('click', () => {
        eventBus.emit('ui:click');
        const amt = parseInt(card.querySelector('.train-amount').value, 10) || 1;
        if (amt === 0) return;
        const r = this._s.um.train(unit.id, amt);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Train', r.reason);
        }
      });

      grid.appendChild(card);
    });
  }

  // Simple requirement helpers for units (UnitManager._checkRequirements is private).
  _checkUnitRequirements(requires) {
    if (!requires) return true;
    for (const [bId, minLv] of Object.entries(requires)) {
      if ((this._s.um._bm?.getLevelOf(bId) ?? 0) < minLv) return false;
    }
    return true;
  }

  _formatUnitReqs(requires) {
    if (!requires) return '';
    for (const [bId, minLv] of Object.entries(requires)) {
      if ((this._s.um._bm?.getLevelOf(bId) ?? 0) < minLv) {
        return `${BUILDINGS_CONFIG[bId]?.name ?? bId} Lv.${minLv}`;
      }
    }
    return '';
  }

  // ---- SQUADS ----
  _renderSquads() {
    this._renderSquadsList();
    const squads = this._s.um.getSquads();
    this._renderSquadPanel(squads.length > 0 ? squads[0].id : null);
  }

  _renderSquadsList() {
    const squadsList = document.getElementById('squads-list');
    if (!squadsList) return;
    squadsList.innerHTML = '';

    const squads = this._s.um.getSquads();
    squads.forEach((squad, idx) => {
      const btn = document.createElement('button');
      btn.className = 'squad-tab-btn';
      btn.dataset.squadId = squad.id;
      if (idx === 0) btn.classList.add('active');
      btn.textContent = squad.name;
      btn.addEventListener('click', () => {
        squadsList.querySelectorAll('.squad-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderSquadPanel(squad.id);
      });
      squadsList.appendChild(btn);
    });
  }

  _renderSquadPanel(squadId) {
    const panel = document.getElementById('squad-management-panel');
    if (!panel) return;
    panel.innerHTML = '';

    if (!squadId) {
      panel.innerHTML = '<div class="squad-panel-placeholder">Select a squad to manage</div>';
      return;
    }

    const squad = this._s.um.getSquads().find(s => s.id === squadId);
    if (!squad) return;

    const reserve    = this._s.um.getReserve();
    const reserveMap = {};
    reserve.forEach(u => { reserveMap[u.unitId] = u.count; });

    const unitCount = squad.units.reduce((sum, u) => sum + u.count, 0);

    // Header
    const header = document.createElement('div');
    header.className = 'squad-panel-header';
    header.innerHTML = `
      <span class="squad-flag">🚩</span>
      <span class="squad-name-display">${squad.name}</span>
      <button class="btn-squad-rename" title="Rename squad">✎</button>
      <button class="btn-squad-delete" title="Delete squad">🗑</button>`;
    panel.appendChild(header);

    header.querySelector('.btn-squad-rename').addEventListener('click', () => {
      const nameSpan  = header.querySelector('.squad-name-display');
      const renameBtn = header.querySelector('.btn-squad-rename');
      const input     = document.createElement('input');
      input.type = 'text'; input.value = squad.name; input.className = 'squad-rename-input'; input.maxLength = 30;
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn-rename-confirm'; confirmBtn.title = 'Save'; confirmBtn.textContent = '✓';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-rename-cancel'; cancelBtn.title = 'Cancel'; cancelBtn.textContent = '✕';
      nameSpan.replaceWith(input);
      renameBtn.replaceWith(confirmBtn);
      header.insertBefore(cancelBtn, header.querySelector('.btn-squad-delete'));
      input.focus(); input.select();
      const save   = () => { const n = input.value.trim(); if (n && n !== squad.name) { this._s.um.renameSquad(squad.id, n); this._renderSquadsList(); } this._renderSquadPanel(squad.id); };
      const cancel = () => this._renderSquadPanel(squad.id);
      confirmBtn.addEventListener('click', save);
      cancelBtn.addEventListener('click', cancel);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { e.preventDefault(); cancel(); } });
    });

    header.querySelector('.btn-squad-delete').addEventListener('click', () => {
      eventBus.emit('ui:click');
      this._s.um.deleteSquad(squad.id);
      this.render();
    });

    // Stats
    const stats = document.createElement('div');
    stats.className = 'squad-panel-stats';
    stats.innerHTML = `
      <div class="squad-stat"><span class="squad-stat-value">${unitCount}</span><span class="squad-stat-label">Total Units</span></div>
      <div class="squad-stat-divider"></div>
      <div class="squad-stat"><span class="squad-stat-value">${squad.units.length}</span><span class="squad-stat-label">Unit Types</span></div>`;
    panel.appendChild(stats);

    // Units in squad
    if (squad.units.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'squad-empty-message';
      empty.textContent = 'No units assigned to this squad.';
      panel.appendChild(empty);
    } else {
      const unitSection = document.createElement('div');
      unitSection.className = 'squad-units-section';
      const label = document.createElement('h5');
      label.textContent = 'Units in Squad';
      unitSection.appendChild(label);
      const unitsList = document.createElement('div');
      unitsList.className = 'squad-units-list';
      squad.units.forEach(u => unitsList.appendChild(this._createSquadUnitRow(squad, u, reserveMap)));
      unitSection.appendChild(unitsList);
      panel.appendChild(unitSection);
    }

    panel.appendChild(this._createSquadAddSection(squad, reserveMap));
  }

  _createSquadUnitRow(squad, unit, reserveMap) {
    const row      = document.createElement('div');
    row.className  = 'squad-unit-row';
    const available = reserveMap[unit.unitId] ?? 0;
    const canAdd    = available > 0;

    const infoDiv  = document.createElement('div');
    infoDiv.className = 'unit-info';
    infoDiv.innerHTML = `
      <span class="unit-icon">${unit.icon}</span>
      <div class="unit-details">
        <div class="unit-name">${unit.name}</div>
        <div class="unit-meta">T${unit.tier ?? 1} · <span class="unit-count">×${unit.count}</span> In Squad · <span style="color:var(--clr-text-muted)">+${available} available</span></div>
      </div>`;

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'unit-controls squad-unit-controls';
    controlsDiv.innerHTML = `
      <div class="sq-transfer-label">Transfer:</div>
      <div class="control-pill">
        <button class="btn-pill-left btn-sq-minus" data-unit="${unit.unitId}" title="Remove from squad">−</button>
        <input type="number" class="sq-transfer-amt" data-unit="${unit.unitId}" value="1" min="1" max="${unit.count}">
        <button class="btn-pill-right btn-sq-add"   data-unit="${unit.unitId}" title="Add from reserve" ${!canAdd ? 'disabled' : ''}>+</button>
      </div>`;

    controlsDiv.querySelector('.btn-sq-minus').addEventListener('click', () => {
      eventBus.emit('ui:click');
      const amt = parseInt(controlsDiv.querySelector('.sq-transfer-amt').value, 10) || 1;
      if (this._s.um.removeFromSquad(squad.id, unit.unitId, amt).success) this.render();
    });
    controlsDiv.querySelector('.btn-sq-add').addEventListener('click', () => {
      eventBus.emit('ui:click');
      const amt = parseInt(controlsDiv.querySelector('.sq-transfer-amt').value, 10) || 1;
      if (this._s.um.assignToSquad(squad.id, unit.unitId, amt).success) this.render();
    });

    row.appendChild(infoDiv);
    row.appendChild(controlsDiv);
    return row;
  }

  _createSquadAddSection(squad, reserveMap) {
    const section = document.createElement('div');
    section.className = 'squad-add-section';
    const label = document.createElement('div');
    label.className = 'squad-add-label';
    label.textContent = 'Assign from Reserve';

    const controls = document.createElement('div');
    controls.className = 'squad-add-controls';

    const select = document.createElement('select');
    select.innerHTML = '<option value="">Select unit...</option>';
    let hasReserve = false;
    Object.entries(reserveMap).forEach(([id, amt]) => {
      if (amt > 0 && !squad.units.find(u => u.unitId === id)) {
        const opt   = document.createElement('option');
        opt.value   = id;
        opt.textContent = `${UNITS_CONFIG[id].name} (${amt} available)`;
        select.appendChild(opt);
        hasReserve = true;
      }
    });

    const amountGroup = document.createElement('div');
    amountGroup.className = 'amount-input-group';
    const input = document.createElement('input');
    input.type = 'number'; input.value = '1'; input.min = '1';
    const btn   = document.createElement('button');
    btn.className = 'btn btn-sm btn-primary btn-add';
    btn.textContent = 'Add';
    btn.disabled = !hasReserve;

    btn.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const sel = select.value;
      const amt = parseInt(input.value, 10) || 1;
      if (sel && this._s.um.assignToSquad(squad.id, sel, amt).success) this.render();
    });

    amountGroup.appendChild(input);
    amountGroup.appendChild(btn);
    controls.appendChild(select);
    controls.appendChild(amountGroup);
    section.appendChild(label);
    section.appendChild(controls);
    return section;
  }

  // ---- TRAINING QUEUE ----
  _renderTrainingQueue(queue) {
    const el = document.getElementById('training-queue-list');
    if (!el) return;
    el.innerHTML = '';

    const container = el.closest('.barracks-section');
    if (queue.length === 0) { if (container) container.style.display = 'none'; return; }
    if (container) container.style.display = '';

    queue.forEach(q => {
      const isTraining  = q.queueIndex === 0;
      const startedAt   = q.startedAt ?? 0;

      const item = document.createElement('div');
      item.className = `queue-item ${isTraining ? 'training' : 'pending'}`;
      if (isTraining) { item.dataset.timerStart = startedAt; item.dataset.timerEnd = q.endsAt; }

      const icon = document.createElement('span');
      icon.className = 'queue-item-icon';
      icon.textContent = q.icon;

      const body = document.createElement('div');
      body.className = 'queue-item-body';
      const name = document.createElement('div');
      name.className = 'queue-item-name';
      name.textContent = `${q.name} ×${q.count}`;
      body.appendChild(name);

      if (isTraining) {
        const bar  = document.createElement('div'); bar.className = 'progress-bar';
        const fill = document.createElement('div'); fill.className = 'progress-fill progress-fill-primary';
        const duration = q.endsAt - startedAt;
        fill.style.width = `${duration > 0 ? Math.max(1, Math.min(100, ((Date.now() - startedAt) / duration) * 100)) : 1}%`;
        bar.appendChild(fill);
        body.appendChild(bar);
      }

      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;align-items:center;gap:8px';

      if (isTraining) {
        const timeLabel = document.createElement('span');
        timeLabel.className = 'progress-time-label';
        timeLabel.textContent = `${Math.max(0, Math.ceil((q.endsAt - Date.now()) / 1000))}s`;
        controls.appendChild(timeLabel);
      } else {
        const status = document.createElement('span');
        status.className = 'queue-status-badge';
        status.textContent = `Queued (${q.queueIndex})`;
        controls.appendChild(status);
      }

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel-queue';
      cancelBtn.textContent = '×'; cancelBtn.title = 'Cancel Training';
      cancelBtn.dataset.unit = q.unitId; cancelBtn.dataset.index = q.queueIndex;
      cancelBtn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._s.um.cancelTrain(q.unitId, q.queueIndex);
      });
      controls.appendChild(cancelBtn);

      item.appendChild(icon); item.appendChild(body); item.appendChild(controls);
      el.appendChild(item);
    });
  }
}
