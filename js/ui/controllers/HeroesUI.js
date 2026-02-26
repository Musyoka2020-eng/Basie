/**
 * HeroesUI.js
 * Renders the hero roster view with tier-based filtering, card-based
 * recruitment, squad/building assignment, and XP bundle purchasing.
 */
import { eventBus }        from '../../core/EventBus.js';
import { INVENTORY_ITEMS,
         AWAKENING_CONFIG } from '../../entities/GAME_DATA.js';

const TIER_META = {
  common:    { label: 'Common',    symbol: '●', cssClass: 'hero-card--common',    filterPill: 'pill-common' },
  rare:      { label: 'Rare',      symbol: '◆', cssClass: 'hero-card--rare',      filterPill: 'pill-rare' },
  legendary: { label: 'Legendary', symbol: '★', cssClass: 'hero-card--legendary', filterPill: 'pill-legendary' },
};

const AURA_LABELS = {
  attack_boost:  'Attack Boost',
  magic_amplify: 'Magic Amplify',
  crit_chance:   'Crit Chance',
  defense_boost: 'Defense Boost',
};

export class HeroesUI {
  /** @param {{ rm, heroes, inventory, notifications }} systems */
  constructor(systems) {
    this._s           = systems;
    this._tierFilter  = 'all'; // 'all' | 'common' | 'rare' | 'legendary'
  }

  init() {
    eventBus.on('ui:viewChanged', v => { if (v === 'heroes') this.render(); });
    eventBus.on('heroes:updated',  () => this.render());
    eventBus.on('inventory:updated', () => this.render());
    eventBus.on('hero:levelUp',    d => this._s.notifications?.show('success', '⚔️ Hero Level Up!', `${d.name} reached Lv.${d.level}!`));
    eventBus.on('hero:awakened',   d => this._s.notifications?.show('success', '✨ Awakened!', `${d.name} is now ★${d.stars}!`));
  }

  render() {
    const grid = document.getElementById('heroes-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const roster  = this._s.heroes.getRosterWithState();
    const bonuses = this._s.heroes.getCombatBonuses();
    const squadCount = this._s.heroes.getSquadHeroIds().length;

    // ── Control Bar ─────────────────────────────────────────────────────────
    const controlBar = document.createElement('div');
    controlBar.className = 'hero-control-bar';
    controlBar.innerHTML = `
      <div class="tier-filter-bar">
        <button class="tier-pill ${this._tierFilter === 'all' ? 'tier-pill--active' : ''}" data-tier="all">All Heroes</button>
        <button class="tier-pill pill-common ${this._tierFilter === 'common' ? 'tier-pill--active' : ''}" data-tier="common">● Common</button>
        <button class="tier-pill pill-rare ${this._tierFilter === 'rare' ? 'tier-pill--active' : ''}" data-tier="rare">◆ Rare</button>
        <button class="tier-pill pill-legendary ${this._tierFilter === 'legendary' ? 'tier-pill--active' : ''}" data-tier="legendary">★ Legendary</button>
      </div>
      <div class="hero-control-right">
        <div class="hero-bonus-strip">
          <span class="hero-bonus-chip" title="Attack multiplier from squad heroes">⚔️ ×${bonuses.attackMult.toFixed(2)}</span>
          <span class="hero-bonus-chip" title="Defense multiplier from squad heroes">🛡️ ×${bonuses.defenseMult.toFixed(2)}</span>
          ${bonuses.lossReduction > 0 ? `<span class="hero-bonus-chip hero-bonus-chip--green" title="Loss reduction">🩺 -${(bonuses.lossReduction * 100).toFixed(0)}%</span>` : ''}
          <span class="hero-squad-badge" title="Heroes in active squad">${squadCount}/3 Squad</span>
        </div>
      </div>`;

    controlBar.querySelectorAll('.tier-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tierFilter = btn.dataset.tier;
        eventBus.emit('ui:click');
        this.render();
      });
    });
    grid.appendChild(controlBar);

    // ── Hero Cards Grid ──────────────────────────────────────────────────────
    const cardsWrapper = document.createElement('div');
    cardsWrapper.className = 'heroes-cards-grid';
    grid.appendChild(cardsWrapper);

    const filtered = this._tierFilter === 'all'
      ? roster
      : roster.filter(h => h.tier === this._tierFilter);

    if (filtered.length === 0) {
      cardsWrapper.innerHTML = `<div class="heroes-empty">No heroes in this tier yet.</div>`;
      return;
    }

    filtered.forEach(hero => {
      const tierMeta = TIER_META[hero.tier] ?? TIER_META.common;
      const xpPct    = hero.isOwned ? Math.min(100, (hero.xp / hero.xpToNext) * 100) : 0;

      // Determine card state class
      let stateClass = '';
      if (hero.isOwned && hero.isInSquad)    stateClass = ' hero-card--squad';
      else if (hero.isOwned && hero.isInBuilding) stateClass = ' hero-card--building';

      // Assignment chip
      let assignmentChip = '';
      if (hero.isOwned) {
        if (hero.isInSquad) {
          assignmentChip = `<span class="hero-assignment-chip chip-squad">⚔️ Active Squad</span>`;
        } else if (hero.isInBuilding) {
          assignmentChip = `<span class="hero-assignment-chip chip-building">🏠 ${hero.assignedBuilding ?? 'Building'}</span>`;
        } else {
          assignmentChip = `<span class="hero-assignment-chip chip-idle">○ Unassigned</span>`;
        }
      }

      // Recruitment section (not owned)
      let recruitSection = '';
      if (!hero.isOwned) {
        const hasSpecific  = hero.specificCardQty > 0;
        const hasUniversal = hero.universalCardQty > 0;
        const canRecruit   = hasSpecific || hasUniversal;
        const cardUsed     = hasSpecific ? hero.recruitCard : hero.universalCardId;
        const cardName     = hasSpecific
          ? (INVENTORY_ITEMS[hero.recruitCard]?.name ?? 'Specific Card')
          : (INVENTORY_ITEMS[hero.universalCardId]?.name ?? 'Universal Card');

        const fragPct = (hero.fragmentsNeeded ?? 0) > 0
          ? Math.min(100, Math.round(((hero.fragmentQty ?? 0) / hero.fragmentsNeeded) * 100))
          : 0;

        recruitSection = `
          <div class="hero-recruit-section">
            <div class="hero-card-req ${canRecruit ? 'req-available' : 'req-missing'}">
              <span class="req-icon">${hasSpecific ? '🃏' : hasUniversal ? '🎴' : '🔒'}</span>
              <span class="req-label">${canRecruit
                ? `${cardName} ×${hasSpecific ? hero.specificCardQty : hero.universalCardQty}`
                : `Requires: ${TIER_META[hero.tier]?.label ?? hero.tier} Hero Card`}</span>
            </div>
            <button class="btn btn-sm btn-gold btn-recruit w-full"
              data-hero="${hero.id}" data-card="${cardUsed ?? ''}"
              ${!canRecruit ? 'disabled' : ''}>
              ${canRecruit ? '👑 Recruit' : '🔒 Card Required'}
            </button>
            <div class="hero-fragment-row">
              <div class="hero-frag-progress-bar-wrap">
                <div class="hero-frag-progress-bar" style="width:${fragPct}%"></div>
              </div>
              <span class="hero-frag-count">🔮 ${hero.fragmentQty ?? 0} / ${hero.fragmentsNeeded ?? '?'} fragments</span>
            </div>
            ${hero.canSummonByFrags
              ? `<button class="btn btn-sm btn-primary btn-summon-frags w-full" data-hero="${hero.id}">
                   ✨ Summon from Fragments
                 </button>`
              : ''}
          </div>`;
      }

      // XP + assignment section (owned)
      let ownedSection = '';
      if (hero.isOwned) {
        // ── Star row ──────────────────────────────────────────────────────
        const maxStars = AWAKENING_CONFIG.maxStars;
        const starHtml = Array.from({ length: maxStars }, (_, i) =>
          `<span class="hero-star ${i < hero.stars ? 'hero-star--filled' : 'hero-star--empty'}">${i < hero.stars ? '★' : '☆'}</span>`
        ).join('');

        // XP bundle buttons
        const XP_BUNDLES = [
          { id: 'xp_bundle_small',  label: '+250 XP' },
          { id: 'xp_bundle_medium', label: '+1K XP'  },
          { id: 'xp_bundle_large',  label: '+5K XP'  },
        ];
        const bundlesOwned = XP_BUNDLES.filter(b => (this._s.inventory?.getQuantity(b.id) ?? 0) > 0);
        const bundleHtml = bundlesOwned.length > 0
          ? bundlesOwned.map(b => `
              <button class="btn btn-xs btn-xp-bundle btn-primary"
                data-hero="${hero.id}" data-bundle="${b.id}">
                ${b.label} <span class="xp-qty-badge">×${this._s.inventory.getQuantity(b.id)}</span>
              </button>`).join('')
          : `<span class="hero-xp-hint">Buy Tomes from <strong>🛒 Shop</strong></span>`;

        // Assignment buttons
        const squadFull        = squadCount >= 3;
        const squadBtnDisabled = squadFull && !hero.isInSquad;

        // ── Skills section ────────────────────────────────────────────────
        const skillsHtml = (hero.skills ?? []).map(skill => {
          const typeIcon  = skill.type === 'active' ? '⚡' : '✨';
          const typeLabel = skill.type === 'active' ? 'Active' : 'Passive';
          const locked    = !skill.unlocked;
          return `
            <div class="hero-skill-slot ${locked ? 'hero-skill-slot--locked' : `hero-skill-slot--${skill.type}`}"
                 title="${locked ? `Unlocks at Lv.${skill.unlockLevel}` : skill.description}">
              <span class="hero-skill-icon">${locked ? '🔒' : (skill.icon ?? typeIcon)}</span>
              <div class="hero-skill-info">
                <span class="hero-skill-name">${skill.name}</span>
                <span class="hero-skill-type hero-skill-type--${skill.type}">${typeLabel}</span>
              </div>
              ${locked
                ? `<span class="hero-skill-unlock">Lv.${skill.unlockLevel}</span>`
                : `<span class="hero-skill-active-badge">✓</span>`}
            </div>`;
        }).join('');

        // ── Awakening section ─────────────────────────────────────────────
        const atMaxStars  = hero.stars >= maxStars;
        const fragNeeded  = hero.nextStarCost?.fragments[hero.tier] ?? 0;
        const awakenHtml  = atMaxStars
          ? `<div class="hero-awaken-maxed">✨ Fully Awakened!</div>`
          : `<div class="hero-awaken-costs">
              <button class="btn btn-xs btn-awaken-card ${hero.canAwakenByCard ? 'btn-gold' : 'btn-ghost'}"
                data-hero="${hero.id}" ${!hero.canAwakenByCard ? 'disabled' : ''}>
                🃏 Card (${hero.nextStarCost?.cards ?? 1} dup${(hero.nextStarCost?.cards ?? 1) > 1 ? 's' : ''})
              </button>
              <button class="btn btn-xs btn-awaken-frag ${hero.canAwakenByFrag ? 'btn-primary' : 'btn-ghost'}"
                data-hero="${hero.id}" ${!hero.canAwakenByFrag ? 'disabled' : ''}>
                🔮 Frags (${hero.fragmentQty ?? 0}/${fragNeeded})
              </button>
            </div>`;

        ownedSection = `
          <div class="hero-stars-row">${starHtml}</div>
          <div class="hero-xp-section">
            <div class="hero-xp-label">
              <span>XP ${hero.xp} / ${hero.xpToNext}</span>
              <span>Lv.${hero.level}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill progress-fill-xp" style="width:${xpPct}%"></div></div>
            <div class="hero-xp-actions">${bundleHtml}</div>
          </div>
          <div class="hero-skills-section">
            <div class="hero-skills-header">⚡ Skills</div>
            ${skillsHtml || '<span class="hero-skills-empty">No skills defined.</span>'}
          </div>
          <div class="hero-awaken-section">
            <div class="hero-awaken-header">✨ Awakening — Star ${hero.stars}/${maxStars}</div>
            ${awakenHtml}
          </div>
          <div class="hero-assign-section">
            ${hero.isInSquad
              ? `<button class="btn btn-sm btn-danger btn-unassign-squad w-full" data-hero="${hero.id}">Remove from Squad</button>`
              : hero.isInBuilding
                ? `<button class="btn btn-sm btn-danger btn-unassign-building w-full" data-hero="${hero.id}">Unstation from Building</button>`
                : `<div class="hero-assign-buttons">
                    <button class="btn btn-sm btn-primary btn-assign-squad ${squadBtnDisabled ? 'btn-disabled' : ''}" data-hero="${hero.id}" ${squadBtnDisabled ? 'disabled' : ''}>
                      ⚔️ ${squadFull ? 'Squad Full' : 'Add to Squad'}
                    </button>
                    <button class="btn btn-sm btn-secondary btn-assign-building" data-hero="${hero.id}" data-hero-name="${hero.name}">🏠 Station at Building</button>
                  </div>`
            }
          </div>`;

      }

      const card = document.createElement('div');
      card.className = `card hero-card ${tierMeta.cssClass}${stateClass}`;
      card.innerHTML = `
        <div class="hero-card-tier-stripe"></div>
        <div class="hero-card-header">
          <div class="hero-portrait ${tierMeta.cssClass}-portrait">
            <span class="hero-portrait-icon">${hero.icon}</span>
          </div>
          <div class="hero-card-title-block">
            <div class="hero-tier-badge tier-badge-${hero.tier}">${tierMeta.symbol} ${tierMeta.label}</div>
            <div class="card-title">${hero.name}</div>
            <div class="card-subtitle">${hero.title}</div>
          </div>
          ${hero.isOwned ? `<span class="hero-level-badge">Lv.${hero.level}</span>` : ''}
        </div>
        <div class="card-body">
          <p class="hero-description">${hero.description}</p>
          <div class="hero-stat-grid">
            <div class="hero-stat"><span class="hero-stat-icon">❤️</span><span class="hero-stat-label">HP</span><span class="hero-stat-value">${(hero.effectiveStats?.hp ?? hero.stats.hp).toLocaleString()}</span></div>
            <div class="hero-stat"><span class="hero-stat-icon">⚔️</span><span class="hero-stat-label">ATK</span><span class="hero-stat-value">${hero.effectiveStats?.attack ?? hero.stats.attack}</span></div>
            <div class="hero-stat"><span class="hero-stat-icon">🛡️</span><span class="hero-stat-label">DEF</span><span class="hero-stat-value">${hero.effectiveStats?.defense ?? hero.stats.defense}</span></div>
          </div>
          <div class="hero-aura-chip">
            <span class="aura-icon">✨</span>
            <span>${AURA_LABELS[hero.aura.type] ?? hero.aura.type} +${(hero.aura.value * 100).toFixed(0)}%</span>
          </div>
          ${assignmentChip}
          ${recruitSection}
          ${ownedSection}
        </div>`;

      // ── Event Listeners ────────────────────────────────────────────────────
      card.querySelector('.btn-recruit')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const cardId = e.currentTarget.dataset.card;
        const r = this._s.heroes.recruitWithCard(cardId);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Recruit', r.reason);
        } else {
          const cfg = this._s.heroes.getRosterWithState().find(h => h.id === r.heroId);
          this._s.notifications?.show('success', '👑 Hero Recruited!', `${cfg?.name ?? r.heroId} has joined your roster!`);
        }
      });

      card.querySelector('.btn-summon-frags')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.heroes.summonFromFragments(heroId);
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Summon', r.reason);
        } else {
          const cfg = this._s.heroes.getRosterWithState().find(h => h.id === r.heroId);
          this._s.notifications?.show('success', '✨ Hero Summoned!', `${cfg?.name ?? r.heroId} has materialised from fragments!`);
        }
      });

      card.querySelector('.btn-assign-squad')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const r = this._s.heroes.assignHeroToSquad(e.currentTarget.dataset.hero);
        if (!r.success) { eventBus.emit('ui:error'); this._s.notifications?.show('warning', 'Cannot Assign', r.reason); }
      });

      card.querySelector('.btn-unassign-squad')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        this._s.heroes.unassignHeroFromSquad(e.currentTarget.dataset.hero);
      });

      card.querySelector('.btn-unassign-building')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        this._s.heroes.unassignHeroFromBuilding(e.currentTarget.dataset.hero);
      });

      card.querySelector('.btn-assign-building')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        eventBus.emit('ui:navigateTo', 'base');
        this._s.notifications?.show('info', 'Go to Buildings', `Open the Base tab and station ${e.currentTarget.dataset.heroName ?? 'your hero'} from their compatible building card.`);
      });

      card.querySelectorAll('.btn-xp-bundle').forEach(btn => {
        btn.addEventListener('click', e => {
          eventBus.emit('ui:click');
          const heroId   = e.currentTarget.dataset.hero;
          const bundleId = e.currentTarget.dataset.bundle;
          const r = this._s.inventory.useItem(bundleId, { heroId });
          if (!r.success) {
            eventBus.emit('ui:error');
            this._s.notifications?.show('warning', 'Cannot Apply', r.reason);
          } else {
            this._s.notifications?.show('success', '📖 XP Applied!', `+${r.xpAmount?.toLocaleString() ?? '?'} XP applied!`);
          }
        });
      });

      card.querySelector('.btn-awaken-card')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.heroes.awakenHero(heroId, 'card');
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Awaken', r.reason);
        }
        // success notification handled by hero:awakened event listener in init()
      });

      card.querySelector('.btn-awaken-frag')?.addEventListener('click', e => {
        eventBus.emit('ui:click');
        const heroId = e.currentTarget.dataset.hero;
        const r = this._s.heroes.awakenHero(heroId, 'fragment');
        if (!r.success) {
          eventBus.emit('ui:error');
          this._s.notifications?.show('warning', 'Cannot Awaken', r.reason);
        }
        // success notification handled by hero:awakened event listener in init()
      });

      cardsWrapper.appendChild(card);
    });
  }
}
