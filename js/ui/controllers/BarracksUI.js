/**
 * BarracksUI.js
 * Renders: reserve unit cards (with training controls),
 * squad management panel, and training queue.
 *
 * maxAffordable calculation now delegates to ResourceManager.maxAffordable()
 * instead of being computed inline.
 */
import { eventBus } from '../../core/EventBus.js';
import { UNITS_CONFIG, BUILDINGS_CONFIG, INVENTORY_ITEMS, HEROES_CONFIG, HERO_CLASSIFICATIONS } from '../../entities/GAME_DATA.js';
import { RES_META, fmt } from '../uiUtils.js';

export class BarracksUI {
  /**
   * @param {{ rm, um, heroes, notifications }} systems
   */
  constructor(systems) {
    this._s = systems;
    this._activeSquadId = null;
  }

  init() {
    this._bindBarracksTabs();
    this._bindCreateSquadButton();

    eventBus.on('ui:viewChanged', v => { if (v === 'barracks') this.render(); });
    eventBus.on('army:updated',   () => this.render());
    eventBus.on('heroes:updated', () => {
      if (this._activeSquadId) this._renderSquadPanel(this._activeSquadId);
    });
  }

  render() {
    this._renderSquads();
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
      const num    = this._s.um.getSquads().length + 1;
      const result = this._s.um.createSquad(`Squad ${num}`);
      if (!result.success) {
        eventBus.emit('ui:error');
        this._s.notifications?.show('warning', 'Squad Limit Reached', result.reason);
        return;
      }
      this._renderSquadsList();
      setTimeout(() => {
        const newBtn = document.querySelector(`[data-squad-id="${result.squadId}"]`);
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
      const isLocked = !this._checkUnitRequirements(unit.requires, unit.id);
      const reqText  = isLocked ? this._formatUnitReqs(unit.requires, unit.id) : '';

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
          <span class="tech-time-hint">⏱ ${unit.trainTime}s per unit</span>
        </div>
        <div class="card-footer">
          <div class="control-pill">
            <button class="btn-pill-left btn-train-max" data-unit="${unit.id}" title="Set to maximum affordable" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>MAX</button>
            <input type="number" class="train-amount" value="${maxAffordable > 0 ? 1 : 0}" min="1" max="${maxAffordable}" data-max="${maxAffordable}" data-unit="${unit.id}" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>
            <button class="btn-pill-right btn-primary btn-train" data-unit="${unit.id}" ${isLocked || maxAffordable === 0 ? 'disabled' : ''}>
              ${isLocked ? `🔒 ${reqText}` : (maxAffordable === 0 ? 'Insufficient resources' : 'Train')}
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
  _checkUnitRequirements(requires, unitId) {
    // HQ unlock gate
    if (unitId && !(this._s.um._bm?.getHQUnlockedIds('units')?.has(unitId))) return false;
    if (!requires) return true;
    for (const [bId, minLv] of Object.entries(requires)) {
      if ((this._s.um._bm?.getLevelOf(bId) ?? 0) < minLv) return false;
    }
    return true;
  }

  _formatUnitReqs(requires, unitId) {
    // HQ unlock gate — show HQ requirement first
    if (unitId && !(this._s.um._bm?.getHQUnlockedIds('units')?.has(unitId))) {
      const reqLv = this._s.um._bm?.getRequiredHQLevel('units', unitId);
      return reqLv ? `HQ Lv.${reqLv}` : 'Locked';
    }
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
    // Restore previously active squad, or default to first
    const squadToShow = (this._activeSquadId && squads.find(s => s.id === this._activeSquadId))
      ? this._activeSquadId
      : (squads.length > 0 ? squads[0].id : null);
    this._renderSquadPanel(squadToShow);
  }

  _renderSquadsList() {
    const squadsList = document.getElementById('squads-list');
    if (!squadsList) return;
    squadsList.innerHTML = '';

    const squads    = this._s.um.getSquads();
    const maxSquads = this._s.um.getMaxSquads();

    // Update squad cap display in header
    const capEl = document.getElementById('squad-cap-display');
    if (capEl) capEl.textContent = `${squads.length} / ${maxSquads} Squads`;

    // Disable New button if at cap
    const newBtn = document.getElementById('btn-create-squad');
    if (newBtn) {
      const atCap = squads.length >= maxSquads;
      newBtn.disabled = atCap;
      newBtn.title = atCap ? 'Build another Barracks to unlock a new squad slot' : 'Create a new squad';
    }

    squads.forEach((squad, idx) => {
      const btn = document.createElement('button');
      btn.className = 'squad-tab-btn';
      btn.dataset.squadId = squad.id;
      if (idx === 0) btn.classList.add('active');
      btn.textContent = squad.name;
      btn.addEventListener('click', () => {
        squadsList.querySelectorAll('.squad-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeSquadId = squad.id;
        this._renderSquadPanel(squad.id);
      });
      squadsList.appendChild(btn);
    });
  }

  _renderSquadPanel(squadId) {
    const panel = document.getElementById('squad-management-panel');
    if (!panel) return;
    panel.innerHTML = '';
    this._activeSquadId = squadId;

    if (!squadId) {
      panel.innerHTML = '<div class="squad-panel-placeholder">Select a squad to manage</div>';
      return;
    }

    const squads = this._s.um.getSquads();
    const squad   = squads.find(s => s.id === squadId);
    if (!squad) return;

    const squadIdx          = squads.findIndex(s => s.id === squadId);
    const barracksInstanceId = `barracks_${squadIdx}`;

    const reserve    = this._s.um.getReserve();
    const reserveMap = {}; // tierKey → full unit object
    reserve.forEach(u => { reserveMap[u.tierKey] = u; });

    const unitCount = squad.units.reduce((sum, u) => sum + u.count, 0);

    // Compute combat stats for header chips
    const combatBonuses = this._s.heroes?.getCombatBonuses?.(squadId) ?? { attackMult: 1, defenseMult: 1, lossReduction: 0 };
    let totalAttack = 0, totalDefense = 0;
    for (const u of squad.units) {
      totalAttack  += (u.stats?.attack  ?? 0) * u.count;
      totalDefense += (u.stats?.defense ?? 0) * u.count;
    }
    const combatScore = Math.round(
      (totalAttack * combatBonuses.attackMult + totalDefense * combatBonuses.defenseMult) *
      Math.max(1, unitCount)
    );

    // Header
    const header = document.createElement('div');
    header.className = 'squad-panel-header';
    header.innerHTML = `
      <span class="squad-flag">🚩</span>
      <span class="squad-name-display">${squad.name}</span>
      <span class="squad-header-stat">${unitCount} units · ${squad.units.length} types</span>
      <span class="squad-combat-chip" title="ATK multiplier">⚔️ ×${combatBonuses.attackMult.toFixed(2)}</span>
      <span class="squad-combat-chip" title="DEF multiplier">🛡️ ×${combatBonuses.defenseMult.toFixed(2)}</span>
      ${combatBonuses.lossReduction > 0 ? `<span class="squad-combat-chip" title="Casualty reduction">🩺 -${(combatBonuses.lossReduction * 100).toFixed(0)}%</span>` : ''}
      <span class="squad-combat-chip squad-combat-chip--score" title="Combat score">💪 ${combatScore.toLocaleString()}</span>
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
      // Unassign all heroes from this barracks instance before deleting the squad
      const heroesHere = this._s.heroes?.getHeroesForBuilding(barracksInstanceId) ?? [];
      for (const h of heroesHere) {
        this._s.heroes?.unassignHeroFromBuilding(h.heroId);
      }
      this._s.um.deleteSquad(squad.id);
      this.render();
    });

    // Hero Slots Section (4 slots per squad)
    panel.appendChild(this._buildHeroSlotsSection(squad.id, barracksInstanceId));
  }

  // ---- HERO SLOTS ----
  _buildHeroSlotsSection(squadId, barracksInstanceId) {
    const MAX_SLOTS = BUILDINGS_CONFIG['barracks']?.heroCapacity ?? 4;
    const heroes = this._s.heroes;
    const section = document.createElement('div');
    section.className = 'squad-hero-section';

    const heading = document.createElement('h5');
    heading.className = 'squad-hero-heading';
    heading.textContent = '⚔️ Hero Command';
    section.appendChild(heading);

    const subtitle = document.createElement('p');
    subtitle.className = 'squad-hero-subtitle';
    subtitle.textContent = 'Pair each hero with a unit type — matched types gain a strategic bonus.';
    section.appendChild(subtitle);

    const allHeroesHere = heroes ? heroes.getHeroesForBuilding(barracksInstanceId) : [];
    const squad = this._s.um?.getSquad(squadId);
    const slotUnitLinks = squad?.slotUnitLinks ?? new Map();

    for (let i = 0; i < MAX_SLOTS; i++) {
      // Hero is looked up by slotIndex — fully independent of unit assignment
      const hero     = allHeroesHere.find(h => h.assignment?.slotIndex === i) ?? null;
      const heroCfg  = hero ? HEROES_CONFIG[hero.heroId] : null;
      const classCfg = heroCfg ? (HERO_CLASSIFICATIONS[heroCfg.classification] ?? HERO_CLASSIFICATIONS.combat) : null;

      const slotUnit      = this._s.um?.getSlotUnit(squadId, i) ?? null;
      const linkedUnitType = slotUnit?.unitId ?? (slotUnitLinks.get(i) ?? null);
      const linkedUnitCfg  = linkedUnitType ? UNITS_CONFIG[linkedUnitType] : null;
      const isEffective = !!(hero && linkedUnitType && classCfg &&
        (classCfg.preferredUnitTypes ?? []).includes(linkedUnitType));

      const card = document.createElement('div');
      card.className = 'squad-hero-slot-card';

      // Hero half
      const heroHalf = document.createElement('div');
      heroHalf.className = hero ? 'slot-hero-half slot-hero-half--filled' : 'slot-hero-half slot-hero-half--empty';
      if (hero && heroCfg) {
        const stars = hero.stars ? '★'.repeat(hero.stars) : '';
        const classHtml = classCfg
          ? `<span class="hero-class-badge class-${heroCfg.classification}">${classCfg.icon} ${classCfg.label}</span>`
          : '';
        heroHalf.innerHTML = `
          <div class="slot-portrait slot-portrait--${heroCfg.tier ?? 'common'}">${heroCfg.icon ?? '?'}</div>
          <div class="slot-info">
            <div class="slot-name">${heroCfg.name}</div>
            <div class="slot-level">Lv.${hero.level}${stars ? ' ' + stars : ''}</div>
            <div class="slot-hero-xp-row">
              <div class="slot-hero-xp-bar"><div class="slot-hero-xp-fill" style="width:${Math.min(100, Math.round((hero.xp / hero.xpToNext) * 100))}%"></div></div>
              <span class="slot-hero-xp">${hero.xp} / ${hero.xpToNext}</span>
            </div>
            ${classHtml}
          </div>
          <button class="slot-unassign" title="Remove hero">✕</button>`;
        heroHalf.querySelector('.slot-unassign').addEventListener('click', e => {
          e.stopPropagation(); eventBus.emit('ui:click');
          // Removing a hero does NOT affect units — units belong to the slot, not the hero
          heroes.unassignHeroFromBuilding(hero.heroId);
        });
        heroHalf.addEventListener('click', () => {
          eventBus.emit('ui:click');
          this._openHeroAssignPicker(squadId, barracksInstanceId, i, card);
        });
      } else {
        heroHalf.innerHTML = '<div class="slot-empty-icon">+</div><div class="slot-empty-label">Add Hero</div>';
        heroHalf.addEventListener('click', () => { eventBus.emit('ui:click'); this._openHeroAssignPicker(squadId, barracksInstanceId, i, card); });
      }
      card.appendChild(heroHalf);

      // Divider
      const divider = document.createElement('div'); divider.className = 'slot-divider'; card.appendChild(divider);

      // Unit half — independent of hero presence
      const unitHalf = document.createElement('div');
      unitHalf.className = linkedUnitType ? 'slot-unit-half slot-unit-half--filled' : 'slot-unit-half slot-unit-half--empty';
      if (linkedUnitType && linkedUnitCfg) {
        const chipHtml = isEffective
          ? '<span class="slot-effectiveness-chip slot-effectiveness-chip--effective">✦ Effective</span>'
          : hero ? '<span class="slot-effectiveness-chip slot-effectiveness-chip--neutral">↗ Neutral</span>' : '';
        const tierPill = slotUnit
          ? `<span class="slot-unit-tier-pill"><span class="slot-unit-tier-num">T${slotUnit.tier}</span> ${slotUnit.name} ×${slotUnit.count}</span>`
          : '';
        unitHalf.innerHTML = `
          <div class="slot-unit-icon">${linkedUnitCfg.icon}</div>
          <div class="slot-unit-info">
            <div class="slot-unit-name">${linkedUnitCfg.name}</div>
            <div class="slot-unit-badges">${tierPill}${chipHtml}</div>
          </div>
          <button class="slot-unlink" title="Remove units from slot">✕</button>`;
        unitHalf.querySelector('.slot-unlink').addEventListener('click', e => {
          e.stopPropagation(); eventBus.emit('ui:click');
          this._s.um?.clearSlotUnits(squadId, i);
          this._renderSquadPanel(squadId);
        });
        unitHalf.addEventListener('click', e => {
          if (e.target.closest('.slot-unlink')) return;
          eventBus.emit('ui:click');
          this._openUnitTypePicker(squadId, i, card, classCfg);
        });
      } else {
        // Any slot (with or without a hero) can have units assigned
        unitHalf.innerHTML = '<div class="slot-empty-icon">+</div><div class="slot-empty-label">Add Unit</div>';
        unitHalf.addEventListener('click', () => { eventBus.emit('ui:click'); this._openUnitTypePicker(squadId, i, card, classCfg); });
      }
      card.appendChild(unitHalf);
      section.appendChild(card);
    }

    return section;
  }

  _openHeroAssignPicker(squadId, barracksInstanceId, slotIndex, cardEl) {
    // Remove any existing floating picker
    document.querySelectorAll('.hero-assign-picker').forEach(p => p.remove());

    const heroes = this._s.heroes;
    if (!heroes) return;

    const roster = heroes.getRosterWithState();
    // Available: owned heroes NOT already in this exact slot of this barracks.
    // Heroes in other slots or buildings CAN be moved here.
    const available = roster.filter(h =>
      h.isOwned &&
      !(h.assignment.type === 'building' && h.assignment.buildingId === barracksInstanceId && h.assignment.slotIndex === slotIndex)
    );

    if (available.length === 0) {
      this._s.notifications?.show('info', 'No Heroes Available',
        'All owned heroes are already in this squad. Recruit more from the Heroes tab.');
      return;
    }

    const picker = document.createElement('div');
    picker.className = 'hero-assign-picker';

    const label = document.createElement('div');
    label.className = 'picker-label';
    label.textContent = 'Select a hero to assign:';
    picker.appendChild(label);

    const list = document.createElement('div');
    list.className = 'picker-list';

    available.forEach(h => {
      const row = document.createElement('button');
      row.className = `picker-row picker-row--${h.tier}`;
      const classCfg = HERO_CLASSIFICATIONS[h.classification] ?? HERO_CLASSIFICATIONS.combat;
      const isPreferred = h.classification === 'combat';
      row.innerHTML = `
        <span class="picker-portrait">${h.icon}</span>
        <span class="picker-name">${h.name}</span>
        <span class="picker-meta">Lv.${h.level} · ${h.tier}</span>
        <span class="hero-class-badge picker-class-badge class-${h.classification ?? 'combat'}">${classCfg.icon} ${classCfg.label}</span>
        ${isPreferred ? '<span class="picker-effectiveness-badge">⭐ Best fit</span>' : ''}`;
      row.addEventListener('click', () => {
        eventBus.emit('ui:click');
        const result = heroes.assignHeroToBuilding(h.id, barracksInstanceId, slotIndex);
        if (!result.success) {
          this._s.notifications?.show('warning', 'Cannot Assign', result.reason);
        }
        picker.remove();
      });
      list.appendChild(row);
    });
    picker.appendChild(list);

    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost btn-sm picker-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', e => { e.stopPropagation(); picker.remove(); });
    picker.appendChild(cancel);

    // Float the picker centered over the clicked card
    const _positionPicker = (p, anchor) => {
      const W = 300, MARGIN = 8;
      const r = anchor.getBoundingClientRect();
      let left = r.left + (r.width - W) / 2;
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - W - MARGIN));
      const top = Math.max(MARGIN, Math.min(r.top, window.innerHeight - 420));
      p.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${W}px;z-index:2000;max-height:${window.innerHeight - top - MARGIN * 2}px;overflow-y:auto;`;
    };
    _positionPicker(picker, cardEl);
    document.body.appendChild(picker);
    const dismissHero = e => { if (!picker.contains(e.target) && !cardEl.contains(e.target)) { picker.remove(); document.removeEventListener('click', dismissHero); } };
    setTimeout(() => document.addEventListener('click', dismissHero), 0);
  }

  // ---- UNIT TYPE PICKER ----
  _openUnitTypePicker(squadId, slotIndex, cardEl, classCfg) {
    // Remove any existing floating picker
    document.querySelectorAll('.slot-unit-type-picker').forEach(p => p.remove());

    const reserve = this._s.um?.getReserve() ?? [];

    const picker = document.createElement('div');
    picker.className = 'slot-unit-type-picker';

    const renderTypeGrid = () => {
      picker.innerHTML = '';

      const label = document.createElement('div');
      label.className = 'sut-picker-label';
      label.textContent = 'Add units to slot:';
      picker.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'sut-picker-grid';

      ['infantry', 'ranged', 'cavalry', 'siege'].forEach(unitType => {
        const cfg = UNITS_CONFIG[unitType];
        if (!cfg) return;
        const currentSlotUnit = this._s.um?.getSlotUnit(squadId, slotIndex);
        const inSlot   = currentSlotUnit?.unitId === unitType ? currentSlotUnit.count : 0;
        const inReserve = reserve.filter(u => u.unitId === unitType).reduce((s, u) => s + u.count, 0);
        const isPreferred = (classCfg?.preferredUnitTypes ?? []).includes(unitType);
        const isCurrentSlot = currentSlotUnit?.unitId === unitType;

        const btn = document.createElement('button');
        btn.className = 'sut-btn' + (isPreferred ? ' sut-btn--preferred' : '') + (isCurrentSlot ? ' sut-btn--current' : '');
        btn.innerHTML = `
          <span class="sut-icon">${cfg.icon}</span>
          <span class="sut-name">${cfg.name}</span>
          <div class="sut-counts">
            <span class="sut-in-squad" title="In this slot">⚔️ ${inSlot}</span>
            <span class="sut-in-reserve" title="In reserve">📦 ${inReserve}</span>
          </div>
          ${isPreferred ? '<span class="sut-star">⭐ Match</span>' : ''}`;
        btn.addEventListener('click', e => { e.stopPropagation(); eventBus.emit('ui:click'); renderAssignStep(unitType, cfg); });
        grid.appendChild(btn);
      });
      picker.appendChild(grid);

      const cancel = document.createElement('button');
      cancel.className = 'btn btn-ghost btn-sm picker-cancel';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', e => { e.stopPropagation(); picker.remove(); });
      picker.appendChild(cancel);
    };

    const renderAssignStep = (unitType, cfg) => {
      picker.innerHTML = '';

      // Always fetch a fresh reserve snapshot so displayed counts are accurate
      const freshReserve = this._s.um?.getReserve() ?? [];
      const tiers = freshReserve
        .filter(u => u.unitId === unitType && u.count > 0)
        .sort((a, b) => b.tier - a.tier);

      const nav = document.createElement('div');
      nav.className = 'sut-nav';
      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-ghost btn-sm sut-back-btn';
      backBtn.innerHTML = '← Back';
      backBtn.addEventListener('click', e => { e.stopPropagation(); eventBus.emit('ui:click'); renderTypeGrid(); });
      nav.appendChild(backBtn);
      const typeLabel = document.createElement('span');
      typeLabel.className = 'sut-step-label';
      typeLabel.innerHTML = `${cfg.icon} <strong>${cfg.name}</strong>`;
      nav.appendChild(typeLabel);
      picker.appendChild(nav);

      if (tiers.length === 0) {
        const none = document.createElement('div');
        none.className = 'sut-no-reserve';
        none.textContent = `No ${cfg.name} in reserve — train some first.`;
        picker.appendChild(none);
      } else {
        tiers.forEach(u => {
          const tierName = UNITS_CONFIG[unitType]?.tiers?.[u.tier - 1]?.name ?? u.name;
          const row = document.createElement('div');
          row.className = 'sut-tier-row';

          // Top line: name + available count
          const info = document.createElement('div');
          info.className = 'sut-tier-info';
          info.innerHTML = `<span class="sut-tier-name">T${u.tier} ${tierName}</span><span class="sut-tier-reserve">📦 ${u.count} available</span>`;

          // Step multiplier chips + [−] [input] [+] [Assign]
          const bottom = document.createElement('div');
          bottom.className = 'sut-tier-bottom';

          const multiplierRow = document.createElement('div');
          multiplierRow.className = 'sut-qty-presets';

          let step = 1;

          const input = document.createElement('input');
          input.type = 'number'; input.className = 'sq-transfer-amt'; input.value = '1'; input.min = '1'; input.max = String(u.count);

          const clamp = val => Math.min(u.count, Math.max(1, val));

          [1, 5, 10, 25].filter(n => n === 1 || n <= u.count).forEach(n => {
            const chip = document.createElement('button');
            chip.className = 'sut-qty-chip' + (n === 1 ? ' sut-qty-chip--active' : '');
            chip.textContent = `×${n}`;
            chip.addEventListener('click', e => {
              e.stopPropagation();
              step = n;
              multiplierRow.querySelectorAll('.sut-qty-chip').forEach(c => c.classList.remove('sut-qty-chip--active'));
              chip.classList.add('sut-qty-chip--active');
            });
            multiplierRow.appendChild(chip);
          });

          const maxChip = document.createElement('button');
          maxChip.className = 'sut-qty-chip sut-qty-chip--max';
          maxChip.textContent = 'Max';
          maxChip.addEventListener('click', e => { e.stopPropagation(); input.value = u.count; });
          multiplierRow.appendChild(maxChip);

          const controls = document.createElement('div');
          controls.className = 'sut-tier-controls';

          const minusBtn = document.createElement('button');
          minusBtn.className = 'btn-pill-left'; minusBtn.textContent = '−';
          const plusBtn = document.createElement('button');
          plusBtn.className = 'btn-pill-right'; plusBtn.textContent = '+';
          const addBtn = document.createElement('button');
          addBtn.className = 'btn btn-primary btn-sm sut-add-btn'; addBtn.textContent = 'Assign';

          minusBtn.addEventListener('click', e => { e.stopPropagation(); input.value = clamp(+input.value - step); });
          plusBtn.addEventListener('click',  e => { e.stopPropagation(); input.value = clamp(+input.value + step); });
          addBtn.addEventListener('click', e => {
            e.stopPropagation();
            const qty = clamp(parseInt(input.value) || 1);
            const result = this._s.um?.assignToSquad(squadId, unitType, qty, u.tier, slotIndex);
            if (result?.success) {
              this._s.um?.linkSlotUnit(squadId, slotIndex, unitType);
              picker.remove();
              this._renderSquadPanel(squadId);
            } else {
              this._s.notifications?.show('warning', 'Cannot Assign', result?.reason ?? 'Failed');
            }
          });

          controls.appendChild(minusBtn); controls.appendChild(input);
          controls.appendChild(plusBtn); controls.appendChild(addBtn);

          bottom.appendChild(multiplierRow);
          bottom.appendChild(controls);
          row.appendChild(info);
          row.appendChild(bottom);
          picker.appendChild(row);
        });
      }

      const cancel = document.createElement('button');
      cancel.className = 'btn btn-ghost btn-sm picker-cancel';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', e => { e.stopPropagation(); picker.remove(); });
      picker.appendChild(cancel);
    };

    renderTypeGrid();

    // Float the picker centered over the clicked card
    const W = 460, MARGIN = 8;
    const r = cardEl.getBoundingClientRect();
    let left = r.left + (r.width - W) / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - W - MARGIN));
    const top = Math.max(MARGIN, Math.min(r.top, window.innerHeight - 500));
    picker.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${W}px;z-index:2000;max-height:${window.innerHeight - top - MARGIN * 2}px;overflow-y:auto;`;
    document.body.appendChild(picker);

    const dismiss = e => { if (!picker.contains(e.target) && !cardEl.contains(e.target)) { picker.remove(); document.removeEventListener('click', dismiss); } };
    setTimeout(() => document.addEventListener('click', dismiss), 0);
  }

  // ---- UNIT ROWS ----
  _createSquadUnitRow(squad, unit, reserveMap) {
    const row      = document.createElement('div');
    row.className  = 'squad-unit-row';
    const available = reserveMap[unit.tierKey]?.count ?? 0;
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
      if (this._s.um.removeFromSquad(squad.id, unit.unitId, amt, unit.tier ?? 1).success) this.render();
    });
    controlsDiv.querySelector('.btn-sq-add').addEventListener('click', () => {
      eventBus.emit('ui:click');
      const amt = parseInt(controlsDiv.querySelector('.sq-transfer-amt').value, 10) || 1;
      if (this._s.um.assignToSquad(squad.id, unit.unitId, amt, unit.tier ?? 1).success) this.render();
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

    // Custom dropdown replacing native <select>
    const dropdownWrap = document.createElement('div');
    dropdownWrap.className = 'squad-dropdown';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'squad-dropdown-trigger';
    trigger.innerHTML = '<span class="squad-select-label">Select unit...</span><span class="chevron">▼</span>';

    const panel = document.createElement('div');
    panel.className = 'squad-dropdown-panel';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.className = 'squad-add-hidden-value';
    hiddenInput.value = '';

    let hasReserve = false;
    Object.entries(reserveMap).forEach(([tierKey, unitObj]) => {
      const count = unitObj.count ?? 0;
      if (count > 0 && !squad.units.find(u => u.tierKey === tierKey)) {
        const opt = document.createElement('div');
        opt.className = 'squad-dropdown-option';
        opt.dataset.value = tierKey;
        opt.innerHTML = `${unitObj.name} <span class="squad-opt-units">(${count} available)</span>`;
        opt.addEventListener('click', () => {
          eventBus.emit('ui:click');
          hiddenInput.value = tierKey;
          trigger.querySelector('.squad-select-label').textContent = `${unitObj.name} (${count} available)`;
          panel.querySelectorAll('.squad-dropdown-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          dropdownWrap.classList.remove('open');
        });
        panel.appendChild(opt);
        hasReserve = true;
      }
    });

    trigger.addEventListener('click', () => {
      eventBus.emit('ui:click');
      dropdownWrap.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!dropdownWrap.contains(e.target)) dropdownWrap.classList.remove('open');
    }, { capture: true });

    dropdownWrap.appendChild(trigger);
    dropdownWrap.appendChild(panel);
    dropdownWrap.appendChild(hiddenInput);

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
      const tierKey = hiddenInput.value;
      const amt     = parseInt(input.value, 10) || 1;
      if (!tierKey) return;
      const lastT  = tierKey.lastIndexOf('_t');
      const unitId = lastT === -1 ? tierKey : tierKey.substring(0, lastT);
      const tier   = lastT === -1 ? 1 : (parseInt(tierKey.substring(lastT + 2)) || 1);
      if (this._s.um.assignToSquad(squad.id, unitId, amt, tier).success) this.render();
    });

    amountGroup.appendChild(input);
    amountGroup.appendChild(btn);
    controls.appendChild(dropdownWrap);
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

        const speedBtn = document.createElement('button');
        speedBtn.className = 'btn btn-xs btn-warning bq-speed-btn';
        speedBtn.textContent = '⏩'; speedBtn.title = 'Speed Up';
        speedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          eventBus.emit('ui:click');
          const secsLeft = Math.max(0, Math.ceil((q.endsAt - Date.now()) / 1000));
          this._openSpeedupPicker(item, 'training', secsLeft);
        });
        controls.appendChild(speedBtn);
      } else {
        const status = document.createElement('span');
        status.className = 'queue-status-badge';
        status.textContent = `Queued (${q.queueIndex})`;
        controls.appendChild(status);
      }

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel-queue';
      cancelBtn.textContent = '×'; cancelBtn.title = 'Cancel Training';
      cancelBtn.dataset.unit = q.tierKey ?? q.unitId; cancelBtn.dataset.index = q.queueIndex;
      cancelBtn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._s.um.cancelTrain(q.tierKey ?? q.unitId, q.queueIndex);
      });
      controls.appendChild(cancelBtn);

      item.appendChild(icon); item.appendChild(body); item.appendChild(controls);
      el.appendChild(item);
    });
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
