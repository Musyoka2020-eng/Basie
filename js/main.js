/**
 * main.js  — Phase 3
 * Application bootstrap. Wires all systems including Phase 3 additions:
 * HeroManager, AchievementManager.
 */

import { GameEngine }          from './core/GameEngine.js';
import { SaveManager }         from './core/SaveManager.js';
import { eventBus }            from './core/EventBus.js';

import { ResourceManager }     from './systems/ResourceManager.js';
import { BuildingManager }     from './systems/BuildingManager.js';
import { UnitManager }         from './systems/UnitManager.js';
import { CombatManager }       from './systems/CombatManager.js';
import { NotificationManager } from './systems/NotificationManager.js';
import { MailManager }         from './systems/MailManager.js';
import { UserManager }         from './systems/UserManager.js';
import { QuestManager }        from './systems/QuestManager.js';
import { TechnologyManager }   from './systems/TechnologyManager.js';
import { SettingsManager }     from './systems/SettingsManager.js';
import { MarketManager }       from './systems/MarketManager.js';
import { SoundManager }        from './systems/SoundManager.js';
import { HeroManager }         from './systems/HeroManager.js';
import { InventoryManager }    from './systems/InventoryManager.js';
import { AchievementManager }  from './systems/AchievementManager.js';
import { StoryManager }        from './systems/StoryManager.js';
import { UIManager }           from './ui/UIManager.js';
import { TimerService }        from './ui/TimerService.js';
import { TooltipService }      from './ui/TooltipService.js';

// =============================================
// INSTANTIATE SYSTEMS
// =============================================
const engine      = new GameEngine();
const saveManager = new SaveManager();

const userManager      = new UserManager();
const resourceManager  = new ResourceManager();
const buildingManager  = new BuildingManager(resourceManager);
const inventoryManager = new InventoryManager();
const heroManager      = new HeroManager(resourceManager, buildingManager, inventoryManager);
buildingManager.setHeroManager(heroManager);
inventoryManager.setHeroManager(heroManager);
inventoryManager.setResourceManager(resourceManager);
const unitManager      = new UnitManager(resourceManager, buildingManager);
const combatManager    = new CombatManager(unitManager, userManager, resourceManager, heroManager, buildingManager);
const mailManager      = new MailManager();
const questManager     = new QuestManager(resourceManager, userManager);
const techManager      = new TechnologyManager(resourceManager, buildingManager);
const settingsManager  = new SettingsManager(saveManager);
const marketManager    = new MarketManager(resourceManager);
const achievementManager = new AchievementManager(userManager, mailManager);
const storyManager = new StoryManager();

let soundManager;
let notificationManager;

// =============================================
// REGISTER WITH ENGINE
// =============================================
engine.registerSystem(resourceManager);
engine.registerSystem(buildingManager);
engine.registerSystem(unitManager);
engine.registerSystem(combatManager);
engine.registerSystem(techManager);
engine.registerSystem(questManager);
engine.registerSystem(mailManager);

// =============================================
// SERIALIZATION
// =============================================
function getGameState() {
  return {
    user:         userManager.serialize(),
    resources:    resourceManager.serialize(),
    buildings:    buildingManager.serialize(),
    units:        unitManager.serialize(),
    combat:       combatManager.serialize(),
    mail:         mailManager.serialize(),
    quests:       questManager.serialize(),
    tech:         techManager.serialize(),
    market:       marketManager.serialize(),
    heroes:       heroManager.serialize(),
    inventory:    inventoryManager.serialize(),
    achievements: achievementManager.serialize(),
    story:        storyManager.serialize(),
    lastSavedTimestamp: Date.now(),
  };
}

function applyGameState(state) {
  if (!state) return;
  userManager.deserialize(state.user);
  resourceManager.deserialize(state.resources);
  buildingManager.deserialize(state.buildings);
  unitManager.deserialize(state.units);
  combatManager.deserialize(state.combat);
  mailManager.deserialize(state.mail);
  questManager.deserialize(state.quests);
  techManager.deserialize(state.tech);
  marketManager.deserialize(state.market);
  heroManager.deserialize(state.heroes);
  inventoryManager.deserialize(state.inventory);
  achievementManager.deserialize(state.achievements);
  storyManager.deserialize(state.story);
}

// =============================================
// AUTH SCREEN
// =============================================
function initAuthScreen() {
  const authScreen  = document.getElementById('auth-screen');
  const gameShell   = document.getElementById('game-shell');
  const loginTab    = document.getElementById('auth-login-tab');
  const registerTab = document.getElementById('auth-register-tab');
  const regFields   = document.getElementById('auth-register-fields');
  const submitBtn   = document.getElementById('auth-submit');
  const guestBtn    = document.getElementById('auth-guest');
  const authError   = document.getElementById('auth-error');
  let isLoginMode   = true;

  loginTab.addEventListener('click', () => {
    isLoginMode = true;
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    regFields.classList.add('hidden');
    submitBtn.textContent = 'Login';
  });

  registerTab.addEventListener('click', () => {
    isLoginMode = false;
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    regFields.classList.remove('hidden');
    submitBtn.textContent = 'Create Account';
  });

  guestBtn.addEventListener('click', () => {
    userManager.setGuest(true);
    userManager.setUsername('Guest Commander');
    launchGame(authScreen, gameShell);
  });

  document.getElementById('auth-form')?.addEventListener('submit', e => {
    e.preventDefault();
    authError.classList.add('hidden');
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username')?.value.trim();
    if (!email || !password) { authError.textContent = 'Please fill in all fields.'; authError.classList.remove('hidden'); return; }
    if (password.length < 6) { authError.textContent = 'Password must be at least 6 characters.'; authError.classList.remove('hidden'); return; }
    if (!isLoginMode && !username) { authError.textContent = 'Please enter a commander name.'; authError.classList.remove('hidden'); return; }
    if (!isLoginMode) userManager.setUsername(username);
    launchGame(authScreen, gameShell);
  });
}

// =============================================
// LAUNCH
// =============================================
function launchGame(authScreen, gameShell) {
  const savedState    = saveManager.load();
  const lastTimestamp = savedState?.lastSavedTimestamp ?? null;

  applyGameState(savedState);

  authScreen.classList.add('hidden');
  gameShell.classList.remove('hidden');

  soundManager = new SoundManager(settingsManager);
  notificationManager = new NotificationManager();

  const ui = new UIManager({
    rm:           resourceManager,
    bm:           buildingManager,
    um:           unitManager,
    cm:           combatManager,
    mail:         mailManager,
    user:         userManager,
    quest:        questManager,
    tech:         techManager,
    settings:     settingsManager,
    market:       marketManager,
    heroes:       heroManager,
    inventory:    inventoryManager,
    achievements: achievementManager,
    notifications: notificationManager,
    sound:        soundManager,
    story:        storyManager,
  });

  // Subscribe notification manager to achievement unlocks
  eventBus.on('achievement:unlocked', d => {
    notificationManager.show('success', `🏆 Achievement: ${d.name}`, d.description);
  });

  // Offline progress
  const offlineMs = engine.calculateOfflineProgress(lastTimestamp);
  if (offlineMs > 5000) {
    const mins = Math.floor(offlineMs / 60000);
    const snap  = resourceManager.getSnapshot();
    const gainSummary = Object.entries(snap)
      .filter(([, r]) => r.perSec > 0)
      .map(([k, r]) => {
        const gained = Math.floor(r.perSec * offlineMs / 1000);
        return `<div class="offline-reward-row"><span>${k}</span><span style="color:var(--clr-success);font-family:var(--font-mono)">+${gained.toLocaleString()}</span></div>`;
      }).join('');

    if (gainSummary) {
      setTimeout(() => {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        content.innerHTML = `
          <div class="modal-inner">
            <div class="modal-top">
              <div class="modal-icon">🌙</div>
              <div class="modal-title-block">
                <div class="modal-title">Welcome Back!</div>
                <div class="modal-subtitle">Away for ${mins} minute${mins !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="modal-section">
              <div class="modal-section-title">Resources Collected While Away</div>
              <div class="offline-rewards">${gainSummary}</div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" id="btn-offline-close">Collect & Continue</button>
            </div>
          </div>`;
        overlay.classList.remove('hidden');
        document.getElementById('btn-offline-close')?.addEventListener('click', () => overlay.classList.add('hidden'));
      }, 800);
    }
  }

  // Welcome mail on first play
  if (!savedState) {
    setTimeout(() => {
      mailManager.send({
        subject: '⚔️ Welcome to Basie, Commander!',
        body: 'Your realm awaits! Build structures to generate resources, train soldiers in the Barracks, and recruit legendary Heroes. Study the Research tree for long-term advantages. Good luck, Commander!',
        icon: '👑',
        attachments: { gold: 500, wood: 200, stone: 100 },
      });
      // Starter hero cards — one Common hero card + one Rare hero card
      inventoryManager.addItem('scroll_common', 2);
      inventoryManager.addItem('scroll_rare', 1);
      inventoryManager.addItem('xp_bundle_small', 2);
    }, 1000);
  }

  saveManager.startAutosave(getGameState);
  window.addEventListener('beforeunload', () => saveManager.save(getGameState()));

  new TimerService().init();
  new TooltipService().init();

  engine.start();

  // Dev console helpers — accessible as window.game.*
  window.game = {
    engine, resources: resourceManager, buildings: buildingManager,
    heroes: heroManager, inventory: inventoryManager, units: unitManager,
    combat: combatManager, tech: techManager, mail: mailManager,
    market: marketManager, quests: questManager, user: userManager,
    save: () => saveManager.save(getGameState()),
    load: () => applyGameState(saveManager.load()),
    clearSave: () => saveManager.clear?.(),
  };

  // Fire the story start trigger after the engine is running
  setTimeout(() => eventBus.emit('story:start'), 500);

  console.log('[Basie] 🏰 Phase 4 launched!');
}

// =============================================
// ENTRY
// =============================================
window.addEventListener('DOMContentLoaded', initAuthScreen);
