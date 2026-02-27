/**
 * MilitaryUI.js
 * Training interface for all military unit buildings:
 *   Infantry Hall, Archery Range, Cavalry Stable, Siege Workshop.
 *
 * Shows a building picker at the top. Selecting a building reveals
 * that building's trainable units, their stats/costs, and the shared
 * training queue.
 */
import { eventBus } from '../../core/EventBus.js';
import { UNITS_CONFIG, BUILDINGS_CONFIG, INVENTORY_ITEMS } from '../../entities/GAME_DATA.js';
import { RES_META, fmt } from '../uiUtils.js';

/** Buildings that appear in the Military tab, in display order. */
const MILITARY_BUILDINGS = [
  { id: 'infantryhall',  label: 'Infantry Hall',  icon: '🗡️' },
  { id: 'archeryrange',  label: 'Archery Range',  icon: '🏹' },
  { id: 'cavalrystable', label: 'Cavalry Stable', icon: '🐴' },
  { id: 'siegeworkshop', label: 'Siege Workshop', icon: '💥' },
];

export class MilitaryUI {
  /**
   * @param {{ rm, um, bm, inventory, notifications }} systems
   */
  constructor(systems) {
    this._s = systems;
    this._activeBuildingId = 'infantryhall';
  }

  init() {
    this._bindBuildingTabs();
    eventBus.on('ui:viewChanged',    v => { if (v === 'military') this.render(); });
    eventBus.on('unit:trained',      () => this.render());
    eventBus.on('unit:queueUpdated', q  => this._renderTrainingQueue(q));
    eventBus.on('army:updated',      () => this._renderReserveUnits(this._activeBuildingId));
    eventBus.on('building:completed',() => this.render());
    eventBus.on('tech:researched',   () => this.render());
  }

  render() {
    this._renderBuildingStatus();
    this._renderReserveUnits(this._activeBuildingId);
    this._renderTrainingQueue(this._s.um.getAllQueues());
  }

  // ---- BUILDING TABS ----
  _bindBuildingTabs() {
    document.querySelectorAll('.military-building-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._activeBuildingId = btn.dataset.building;
        document.querySelectorAll('.military-building-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderBuildingStatus();
        this._renderReserveUnits(this._activeBuildingId);
      });
    });
  }

  _renderBuildingStatus() {
    const cfg = BUILDINGS_CONFIG[this._activeBuildingId];
    if (!cfg) return;
    const level = this._s.bm.getLevelOf(this._activeBuildingId);
    const statusEl = document.getElementById('military-building-status');
    if (!statusEl) return;
    if (level === 0) {
      statusEl.innerHTML = `<div class="military-building-unbuilt">
        <span class="building-icon">${cfg.icon}</span>
        <span>${cfg.name} has not been built yet.</span>
        <span class="hint-text">Build it in the Base tab to unlock training.</span>
      </div>`;
    } else {
      statusEl.innerHTML = `<div class="military-building-active">
        <span class="building-icon">${cfg.icon}</span>
        <span class="building-name-label">${cfg.name}</span>
        <span class="building-level-badge">Lv.${level}</span>
      </div>`;
    }
  }

  // ---- UNIT TRAINING CARDS ----
  _renderReserveUnits(buildingId) {
    const grid = document.getElementById('military-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const relevantUnitTypes = Object.entries(UNITS_CONFIG)
      .filter(([, u]) => u.buildingId === buildingId)
      .map(([id, u]) => ({ id, ...u }));
    if (relevantUnitTypes.length === 0) {
      grid.innerHTML = '<div class="military-empty">No units configured for this building.</div>';
      return;
    }

    const buildingLevel = this._s.bm.getLevelOf(buildingId);
    if (buildingLevel === 0) {
      grid.innerHTML = `<div class="military-empty">Build ${BUILDINGS_CONFIG[buildingId]?.name ?? buildingId} first.</div>`;
      return;
    }

    const reserve    = this._s.um.getReserve();
    const reserveMap = {};
    reserve.forEach(u => { reserveMap[u.tierKey] = u.count; });
    const snap = this._s.rm.getSnapshot();

    const TIER_GROUPS = [
      { label: 'Basic',        tiers: [1, 2, 3], open: true,  icon: '🗡️' },
      { label: 'Intermediate', tiers: [4, 5, 6], open: false, icon: '⚔️' },
      { label: 'Advanced',     tiers: [7, 8, 9], open: false, icon: '🔱' },
      { label: 'Special',      tiers: [10],       open: false, icon: '✨' },
    ];

    relevantUnitTypes.forEach(unitType => {
      const typeCard = document.createElement('div');
      typeCard.className = 'military-unit-type-card';

      const header = document.createElement('div');
      header.className = 'military-unit-type-header';
      header.innerHTML = `
        <span class="military-unit-icon">${unitType.icon}</span>
        <div class="military-unit-type-info">
          <div class="military-unit-type-name">${unitType.name}</div>
          <div class="military-unit-type-desc">${unitType.description ?? ''}</div>
        </div>`;
      typeCard.appendChild(header);

      TIER_GROUPS.forEach(group => {
        const groupTiers = (unitType.tiers ?? [])
          .map((cfg, i) => ({ cfg, tier: i + 1 }))
          .filter(({ tier }) => group.tiers.includes(tier));
        if (groupTiers.length === 0) return;

        const section = document.createElement('div');
        section.className = 'tier-group';

        const groupReserveTotal = groupTiers.reduce((sum, { tier }) =>
          sum + (reserveMap[`${unitType.id}_t${tier}`] ?? 0), 0);

        const groupHdr = document.createElement('button');
        groupHdr.type = 'button';
        groupHdr.className = `tier-group-hdr${group.open ? '' : ' collapsed'}`;
        groupHdr.setAttribute('aria-expanded', group.open ? 'true' : 'false');
        groupHdr.innerHTML = `
          <span class="tier-group-icon">${group.icon}</span>
          <span class="tier-group-label">${group.label}</span>
          <span class="tier-group-range">T${Math.min(...group.tiers)}${group.tiers.length > 1 ? '–T' + Math.max(...group.tiers) : ''}</span>
          ${groupReserveTotal > 0 ? `<span class="tier-group-reserve">×${groupReserveTotal} in reserve</span>` : ''}
          <span class="tier-group-chevron">▾</span>`;
        section.appendChild(groupHdr);

        const cardsWrap = document.createElement('div');
        cardsWrap.className = `tier-cards-wrap${group.open ? '' : ' hidden'}`;

        groupTiers.forEach(({ cfg: tierCfg, tier }) => {
          const tierKey = `${unitType.id}_t${tier}`;
          const count   = reserveMap[tierKey] ?? 0;

          const techId  = tierCfg.techRequired ?? null;
          const techMet = !techId || (this._s.tech?.getLevelOf(techId) ?? 0) >= 1;
          const isHQUnlocked = this._s.um._bm?.getHQUnlockedIds('units')?.has(unitType.id) ?? true;
          const isLocked     = !isHQUnlocked || !techMet;
          const lockReason   = !isHQUnlocked
            ? (() => { const lv = this._s.um._bm?.getRequiredHQLevel('units', unitType.id); return lv ? `HQ Lv.${lv} required` : 'Locked'; })()
            : (techId ? `Research: ${techId.replace(/_/g, ' ')}` : 'Locked');

          const maxAffordable = isLocked ? 0 : this._s.rm.maxAffordable(tierCfg.cost ?? {});

          const prevKey     = `${unitType.id}_t${tier - 1}`;
          const prevCount   = tier > 1 ? (reserveMap[prevKey] ?? 0) : 0;
          const canUpgrade  = !isLocked && tier > 1 && prevCount > 0;
          const upgradeCost = tierCfg.upgradeCost ?? null;
          const maxUpgradable = canUpgrade && upgradeCost ? this._s.rm.maxAffordable(upgradeCost) : 0;

          const costHtml = Object.entries(tierCfg.cost ?? {}).map(([res, amt]) =>
            `<span class="cost-chip ${(snap[res]?.amount ?? 0) >= amt ? 'affordable' : 'unaffordable'}">${RES_META[res]?.icon ?? '?'} ${fmt(amt)}</span>`
          ).join('');

          const card = document.createElement('div');
          card.className = `tier-unit-card${isLocked ? ' locked' : ''}`;
          card.dataset.tier = tier;
          card.innerHTML = `
            <div class="tuc-top">
              <span class="tuc-badge" title="Tier ${tier}">T${tier}</span>
              <div class="tuc-name-row">
                <span class="tuc-name">${tierCfg.name}</span>
                ${count > 0 ? `<span class="tuc-reserve">×${count}</span>` : ''}
              </div>
              <span class="tuc-time">⏱ ${tierCfg.trainTime ?? '?'}s</span>
            </div>
            <div class="tuc-stats">
              <span title="HP">❤️ ${tierCfg.stats?.hp ?? '?'}</span>
              <span title="ATK">⚔️ ${tierCfg.stats?.attack ?? '?'}</span>
              <span title="DEF">🛡️ ${tierCfg.stats?.defense ?? '?'}</span>
            </div>
            <div class="tuc-cost">${costHtml}</div>
            <div class="tuc-actions">
              ${isLocked
                ? `<div class="tuc-locked">🔒 ${lockReason}</div>`
                : `<div class="tuc-train-row">
                     <button class="btn-tier-max" ${maxAffordable === 0 ? 'disabled' : ''}>MAX</button>
                     <input type="number" class="train-amount" value="1" min="1" max="${Math.max(1, maxAffordable)}" ${maxAffordable === 0 ? 'disabled' : ''}>
                     <button class="btn-tier-train" ${maxAffordable === 0 ? 'disabled' : ''}>Train</button>
                   </div>
                   ${canUpgrade ? `<button class="btn-tier-upgrade" ${maxUpgradable === 0 ? 'disabled' : ''}>⬆ Upgrade from T${tier - 1}</button>` : ''}`
              }
            </div>`;

          if (!isLocked) {
            card.querySelector('.btn-tier-max')?.addEventListener('click', () => {
              eventBus.emit('ui:click');
              const inp = card.querySelector('.train-amount');
              if (inp) inp.value = maxAffordable;
            });
            card.querySelector('.btn-tier-train')?.addEventListener('click', () => {
              eventBus.emit('ui:click');
              const amt = parseInt(card.querySelector('.train-amount')?.value, 10) || 1;
              const r   = this._s.um.train(unitType.id, amt, tier);
              if (!r.success) {
                eventBus.emit('ui:error');
                this._s.notifications?.show('warning', 'Cannot Train', r.reason);
              }
            });
            if (canUpgrade) {
              card.querySelector('.btn-tier-upgrade')?.addEventListener('click', () => {
                eventBus.emit('ui:click');
                const r = this._s.um.upgradeTier(unitType.id, tier - 1, 1);
                if (!r.success) {
                  eventBus.emit('ui:error');
                  this._s.notifications?.show('warning', 'Cannot Upgrade', r.reason);
                }
              });
            }
          }

          cardsWrap.appendChild(card);
        });

        section.appendChild(cardsWrap);

        groupHdr.addEventListener('click', () => {
          const isOpen = groupHdr.getAttribute('aria-expanded') === 'true';
          groupHdr.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          groupHdr.classList.toggle('collapsed', isOpen);
          cardsWrap.classList.toggle('hidden', isOpen);
        });

        typeCard.appendChild(section);
      });

      grid.appendChild(typeCard);
    });
  }

  // ---- REQUIREMENT HELPERS ----
  _checkUnitRequirements(unit) {
    const { requires } = unit;
    if (!requires) return { met: true };
    for (const [key, minLevel] of Object.entries(requires)) {
      if (BUILDINGS_CONFIG[key] !== undefined) {
        const lvl = this._s.bm.getLevelOf(key);
        if (lvl < minLevel) {
          return { met: false, reason: `${BUILDINGS_CONFIG[key].name} Lv.${minLevel}` };
        }
      } else {
        // Tech requirement
        const researched = this._s.tech?.getLevelOf(key) ?? 0;
        if (researched < minLevel) {
          const techName = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return { met: false, reason: `Requires ${techName}` };
        }
      }
    }
    return { met: true };
  }

  // ---- TRAINING QUEUE ----
  _renderTrainingQueue(queue) {
    const section = document.getElementById('military-queue-section');
    const grid    = document.getElementById('military-queue-grid');
    if (!section || !grid) return;

    // Group flat queue by buildingId
    const byBuilding = {};
    MILITARY_BUILDINGS.forEach(b => { byBuilding[b.id] = []; });
    (queue || []).forEach(q => {
      const bId = q.buildingId ?? UNITS_CONFIG[q.unitId]?.buildingId;
      if (bId && byBuilding[bId]) byBuilding[bId].push(q);
    });

    // Only show section if at least one building has items
    const hasAny = MILITARY_BUILDINGS.some(b => byBuilding[b.id].length > 0);
    section.style.display = hasAny ? '' : 'none';
    if (!hasAny) return;

    grid.innerHTML = '';

    MILITARY_BUILDINGS.forEach(bld => {
      const items   = byBuilding[bld.id];
      const level   = this._s.bm.getLevelOf(bld.id);
      // Sort: active (queueIndex 0) first across all units in this building
      const active  = items.find(q => q.queueIndex === 0);
      const pending = items.filter(q => q.queueIndex > 0)
                           .sort((a, b) => a.queueIndex - b.queueIndex);

      const slot = document.createElement('div');
      slot.className = `mq-slot${items.length === 0 ? ' mq-slot--idle' : ''}`;

      // ---- Slot header ----
      const hdr = document.createElement('div');
      hdr.className = 'mq-slot-hdr';
      hdr.innerHTML = `<span class="mq-slot-icon">${bld.icon}</span>
        <span class="mq-slot-name">${bld.label}</span>
        ${level > 0 ? `<span class="mq-slot-lv">Lv.${level}</span>` : '<span class="mq-slot-unbuilt">Not built</span>'}`;
      slot.appendChild(hdr);

      if (!active) {
        const idle = document.createElement('div');
        idle.className = 'mq-slot-idle';
        idle.textContent = 'Idle';
        slot.appendChild(idle);
      } else {
        // ---- Active item ----
        const duration = active.endsAt - (active.startedAt ?? 0);
        const pct      = duration > 0
          ? Math.max(1, Math.min(100, ((Date.now() - (active.startedAt ?? 0)) / duration) * 100))
          : 1;
        const secsLeft = Math.max(0, Math.ceil((active.endsAt - Date.now()) / 1000));

        const activeEl = document.createElement('div');
        activeEl.className = 'mq-active';
        activeEl.dataset.timerStart = active.startedAt ?? Date.now();
        activeEl.dataset.timerEnd   = active.endsAt;
        activeEl.innerHTML = `
          <div class="mq-active-top">
            <span class="mq-active-icon">${active.icon ?? '⚔️'}</span>
            <div class="mq-active-info">
              <div class="mq-active-name">${active.name} <span class="mq-count">×${active.count}</span></div>
              <div class="mq-active-bar progress-bar"><div class="mq-active-fill progress-fill" style="width:${pct}%"></div></div>
            </div>
            <span class="mq-time progress-time-label">${secsLeft}s</span>
          </div>
          <div class="mq-active-actions">
            <button class="mq-btn-speed" title="Speed Up">⏩ Speed</button>
            <button class="mq-btn-cancel" title="Cancel">×</button>
          </div>`;

        activeEl.querySelector('.mq-btn-speed').addEventListener('click', e => {
          e.stopPropagation(); eventBus.emit('ui:click');
          this._openSpeedupPicker(activeEl, 'training', secsLeft);
        });
        activeEl.querySelector('.mq-btn-cancel').addEventListener('click', () => {
          eventBus.emit('ui:click');
          this._s.um.cancelTrain(active.tierKey ?? active.unitId, 0);
        });
        slot.appendChild(activeEl);
      }

      // ---- Pending list ----
      if (pending.length > 0) {
        const pendList = document.createElement('div');
        pendList.className = 'mq-pending-list';
        pending.forEach(q => {
          const row = document.createElement('div');
          row.className = 'mq-pending-item';
          row.innerHTML = `
            <span class="mq-pend-icon">${q.icon}</span>
            <span class="mq-pend-name">${q.name} ×${q.count}</span>
            <button class="mq-pend-cancel" title="Cancel">×</button>`;
          row.querySelector('.mq-pend-cancel').addEventListener('click', () => {
            eventBus.emit('ui:click');
            this._s.um.cancelTrain(q.tierKey ?? q.unitId, q.queueIndex);
          });
          pendList.appendChild(row);
        });
        slot.appendChild(pendList);
      }

      grid.appendChild(slot);
    });
  }

  // ---- SPEED-UP PICKER ----
  _openSpeedupPicker(anchorEl, queueType, secsLeft) {
    document.querySelector('.speedup-picker')?.remove();
    const inventory = this._s.inventory;
    if (!inventory) return;

    // getOwnedItems() spreads cfg onto each item — i.type/i.target/i.id/i.skipSeconds
    // are all available directly. i.itemId does NOT exist (old bug).
    const owned = inventory.getOwnedItems()
      .filter(i => i.type === 'speed_boost' && (i.target === queueType || i.target === 'any'))
      .sort((a, b) => a.skipSeconds - b.skipSeconds);

    // Pick the smallest item that still completes the timer as the recommendation
    const bestFit = owned.find(i => i.skipSeconds >= secsLeft) ?? owned[owned.length - 1];

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
        eventBus.emit('ui:navigate', { tab: 'shop' });
      });
    } else {
      const title = document.createElement('div');
      title.className = 'speedup-picker-title';
      title.textContent = '⏩ Speed Up';
      picker.appendChild(title);

      owned.forEach(i => {
        const willComplete = i.skipSeconds >= secsLeft;
        const isRec        = i === bestFit;
        const label        = i.skipSeconds >= 999999 ? 'Instant'
                           : i.skipSeconds >= 3600   ? `${Math.round(i.skipSeconds / 3600)}h`
                           :                           `${Math.round(i.skipSeconds / 60)}m`;
        const btn = document.createElement('button');
        btn.className = `speedup-option${isRec ? ' speedup-recommended' : ''}`;
        btn.dataset.item = i.id;
        btn.innerHTML = `
          <span class="speedup-option-icon">${i.icon}</span>
          <span class="speedup-option-label">${label}${i.target === 'any' ? ' <em style="opacity:.55;font-style:normal">(Universal)</em>' : ''}</span>
          <span class="speedup-option-qty">×${i.quantity}</span>
          ${willComplete ? '<span class="speedup-rec-badge">⭐ Best</span>' : ''}`;
        btn.addEventListener('click', () => {
          eventBus.emit('ui:click');
          const r = inventory.useItem(i.id, { queueType });
          if (!r.success) this._s.notifications?.show('warning', 'Speed Up Failed', r.reason);
          picker.remove();
        });
        picker.appendChild(btn);
      });
    }

    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost btn-sm speedup-picker-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => picker.remove());
    picker.appendChild(cancel);

    anchorEl.appendChild(picker);
    document.addEventListener('click', function handler(e) {
      if (!picker.contains(e.target) && e.target !== anchorEl) {
        picker.remove();
        document.removeEventListener('click', handler, true);
      }
    }, true);
  }
}
