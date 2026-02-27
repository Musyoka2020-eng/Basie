/**
 * UIManager.js — Orchestrator
 *
 * Thin bootstrap layer. Instantiates each domain UI controller with only
 * the systems it needs, calls init() on each, then triggers an initial
 * full render. All business logic and rendering belongs in the controllers.
 *
 * Domain controllers:
 *   NavigationUI   — nav, status bar, resource display, live timers
 *   BuildingsUI    — buildings grid
 *   BarracksUI     — reserve units, squads, training queue
 *   HeroesUI       — hero roster
 *   CombatUI       — campaign map, battle modal & animation, battle log
 *   ResearchUI     — tech tree + achievements panel
 *   QuestsUI       — quest cards + quest-completion modal
 *   MarketUI       — trade cards
 *   MailUI         — inbox modal
 *   SettingsUI     — settings modal
 */
import { NavigationUI } from './controllers/NavigationUI.js';
import { BuildingsUI }  from './controllers/BuildingsUI.js';
import { BarracksUI }   from './controllers/BarracksUI.js';
import { HeroesUI }     from './controllers/HeroesUI.js';
import { CombatUI }     from './controllers/CombatUI.js';
import { ResearchUI }   from './controllers/ResearchUI.js';
import { QuestsUI }     from './controllers/QuestsUI.js';
import { MarketUI }     from './controllers/MarketUI.js';
import { MailUI }       from './controllers/MailUI.js';
import { SettingsUI }   from './controllers/SettingsUI.js';
import { InventoryUI }  from './controllers/InventoryUI.js';
import { ShopUI }       from './controllers/ShopUI.js';
import { GachaUI }      from './controllers/GachaUI.js';
import { MilitaryUI }   from './controllers/MilitaryUI.js';
import { RES_META }     from './uiUtils.js';
import { eventBus }     from '../core/EventBus.js';

export class UIManager {
  constructor(systems) {
    this.name = 'UIManager';
    this._rm    = systems.rm;
    this._story = systems.story ?? null;

    // Instantiate each controller with only its required systems
    this._navigation = new NavigationUI({
      rm:            systems.rm,
      bm:            systems.bm,
      um:            systems.um,
      tech:          systems.tech,
      user:          systems.user,
      mail:          systems.mail,
      heroes:        systems.heroes,
      notifications: systems.notifications,
    });

    this._buildings = new BuildingsUI({
      rm:            systems.rm,
      bm:            systems.bm,
      inventory:     systems.inventory,
      notifications: systems.notifications,
      heroes:        systems.heroes,
    });

    this._barracks = new BarracksUI({
      rm:            systems.rm,
      um:            systems.um,
      inventory:     systems.inventory,
      heroes:        systems.heroes,
      notifications: systems.notifications,
    });

    this._military = new MilitaryUI({
      rm:            systems.rm,
      um:            systems.um,
      bm:            systems.bm,
      inventory:     systems.inventory,
      notifications: systems.notifications,
      tech:          systems.tech,
    });

    this._heroes = new HeroesUI({
      rm:            systems.rm,
      um:            systems.um,
      heroes:        systems.heroes,
      inventory:     systems.inventory,
      notifications: systems.notifications,
    });

    this._inventory = new InventoryUI({
      inventory:     systems.inventory,
      heroes:        systems.heroes,
      notifications: systems.notifications,
    });

    this._shop = new ShopUI({
      rm:            systems.rm,
      bm:            systems.bm,
      inventory:     systems.inventory,
      notifications: systems.notifications,
    });

    this._gacha = new GachaUI({
      inventory:     systems.inventory,
      heroes:        systems.heroes,
      notifications: systems.notifications,
    });

    this._combat = new CombatUI({
      cm:            systems.cm,
      um:            systems.um,
      notifications: systems.notifications,
      sound:         systems.sound,
    });

    this._research = new ResearchUI({
      rm:            systems.rm,
      tech:          systems.tech,
      inventory:     systems.inventory,
      achievements:  systems.achievements,
      notifications: systems.notifications,
    });

    this._quests = new QuestsUI({
      quest:         systems.quest,
      story:         systems.story,
      notifications: systems.notifications,
    });

    this._market = new MarketUI({
      rm:            systems.rm,
      market:        systems.market,
      notifications: systems.notifications,
    });

    this._mail = new MailUI({
      mail:          systems.mail,
      rm:            systems.rm,
      notifications: systems.notifications,
      sound:         systems.sound,
    });

    this._settings = new SettingsUI({
      settings: systems.settings,
      sound:    systems.sound,
    });

    this._init();
  }

  _init() {
    // Register event subscriptions and one-time DOM bindings
    this._navigation.init();
    this._buildings.init();
    this._barracks.init();
    this._military.init();
    this._heroes.init();
    this._inventory.init();
    this._combat.init();
    this._research.init();
    this._quests.init();
    this._market.init();
    this._mail.init();
    this._settings.init();
    this._shop.init();
    this._gacha.init();

    // Story chapter modal
    eventBus.on('story:chapter_triggered', chapter => this._showStoryModal(chapter));

    // Perform the full initial render
    this._buildings.render();
    this._barracks.render();
    this._heroes.render();
    this._combat.render();
    this._research.render();
    this._quests.render();
    this._market.render();
  }

  /** No-op — UIManager is event-driven. Kept for GameEngine compatibility. */
  update(dt) {}

  // ─────────────────────────────────────────────
  // Story Chapter Modal
  // ─────────────────────────────────────────────

  /**
   * Shows the story dialogue modal for a triggered chapter.
   * Steps through dialogue lines one at a time, then shows rewards.
   * @param {object} chapter
   */
  _showStoryModal(chapter) {
    const overlay = document.getElementById('story-modal-overlay');
    const panel   = document.getElementById('story-modal-panel');
    if (!overlay || !panel) return;

    let lineIndex = 0;
    const lines   = chapter.dialogue ?? [];

    const renderLine = () => {
      const line   = lines[lineIndex];
      const isLast = lineIndex === lines.length - 1;

      // Dialogue bubble
      const bubble = document.createElement('div');
      bubble.className = 'story-bubble story-bubble-new';
      bubble.innerHTML = `
        <span class="story-speaker">${line.speaker}</span>
        <p class="story-text">${line.text}</p>`;
      const dialogueEl = panel.querySelector('.story-dialogue');
      dialogueEl.innerHTML = '';
      dialogueEl.appendChild(bubble);

      // Update counter
      const counter = panel.querySelector('.story-line-counter');
      if (counter) counter.textContent = `${lineIndex + 1} / ${lines.length}`;

      // Update button
      const btn = panel.querySelector('#story-btn-next');
      if (btn) btn.textContent = isLast ? 'Collect Rewards ✨' : 'Next ▶';
    };

    // Build the modal content
    const rewardHtml = Object.entries(chapter.rewards ?? {}).map(([k, v]) =>
      `<span class="story-reward-chip">${RES_META[k]?.icon ?? '✨'} +${v} ${k}</span>`
    ).join('');

    panel.innerHTML = `
      <div class="story-header">
        <span class="story-chapter-arc" style="background:${chapter.arcColor ?? '#6c5ce7'}">${chapter.arc ?? 'Chapter'}</span>
        <span class="story-chapter-icon">${chapter.icon}</span>
        <div class="story-chapter-title">${chapter.title}</div>
        <button class="story-skip-btn" id="story-btn-skip">Skip ×</button>
      </div>
      <div class="story-dialogue"></div>
      <div class="story-footer">
        <span class="story-line-counter">1 / ${lines.length}</span>
        <button class="btn btn-primary" id="story-btn-next">Next ▶</button>
      </div>`;

    overlay.classList.remove('hidden');
    renderLine();

    // Advance / finish
    const advanceOrFinish = () => {
      if (lineIndex < lines.length - 1) {
        lineIndex++;
        renderLine();
      } else {
        // Grant rewards and close
        if (this._rm && chapter.rewards) this._rm.add(chapter.rewards);
        overlay.classList.add('hidden');
        if (rewardHtml) {
          eventBus.emit('ui:notification', {
            type: 'success', title: `📜 Chapter Complete: ${chapter.title}`, body: rewardHtml
          });
        }
      }
    };

    panel.querySelector('#story-btn-next')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      advanceOrFinish();
    });
    panel.querySelector('#story-btn-skip')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      if (this._rm && chapter.rewards) this._rm.add(chapter.rewards);
      overlay.classList.add('hidden');
    });
  }
}
