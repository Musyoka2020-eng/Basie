/**
 * SettingsUI.js
 * Two separate modals:
 *  - Game Settings  (gear icon -> ui:openSettings): SFX, animations, wipe data
 *  - Player Profile (profile pill -> ui:openProfile): Profile . Achievements . Account
 */
import { eventBus } from '../../core/EventBus.js';
import { openModal, closeModal } from '../uiUtils.js';

const RARITY_COLORS = {
  common:    'var(--clr-text-secondary)',
  uncommon:  'var(--clr-success)',
  rare:      'var(--clr-primary)',
  legendary: 'var(--clr-gold)',
};

export class SettingsUI {
  constructor(systems) {
    this._s = systems;
    this._profileOpen = false;
    this._activeTab   = 'profile';
  }

  init() {
    eventBus.on('ui:openSettings', () => this._openSettings());
    eventBus.on('ui:openProfile',  () => this._openProfile('profile'));
    eventBus.on('user:statsUpdated',    () => this._refreshProfile());
    eventBus.on('user:levelUp',         () => this._refreshProfile());
    eventBus.on('achievements:updated', () => this._refreshProfile());
  }

  // ══════════════════════════════════════════════════════════════════
  // GAME SETTINGS MODAL (gear icon)
  // ══════════════════════════════════════════════════════════════════

  _openSettings() {
    const s    = this._s.settings.getSettings();
    const diff = s.difficulty ?? 'normal';
    const DIFFS = [
      { id: 'easy',   label: '🟢 Easy'   },
      { id: 'normal', label: '🟡 Normal' },
      { id: 'hard',   label: '🔴 Hard'   },
    ];
    openModal(`
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-icon">⚙️</div>
          <div class="modal-title-block"><div class="modal-title">Settings</div></div>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Preferences</div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0">
            <span>Sound Effects</span>
            <button class="btn btn-sm btn-ghost" id="btn-toggle-sfx">${s.sfxEnabled ? 'On' : 'Off'}</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0">
            <span>Animations</span>
            <button class="btn btn-sm btn-ghost" id="btn-toggle-anim">${s.animationsEnabled ? 'On' : 'Off'}</button>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Difficulty</div>
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2)">
            ${DIFFS.map(d => `
              <button
                class="btn btn-sm ${diff === d.id ? 'btn-primary' : 'btn-ghost'} diff-setting-btn"
                data-diff="${d.id}"
                style="flex:1"
              >${d.label}</button>
            `).join('')}
          </div>
          <div style="font-size:var(--text-xs);color:var(--clr-text-muted)">
            Scales enemy HP/ATK and resource production. Takes effect on the next battle and production tick.
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title" style="color:var(--clr-danger)">Danger Zone</div>
          <div id="wipe-initial">
            <button class="btn btn-danger w-full" id="btn-wipe-data">Wipe Save Data</button>
          </div>
          <div id="wipe-confirm" style="display:none;background:var(--clr-danger)22;border:1px solid var(--clr-danger);padding:var(--space-3);border-radius:var(--radius-md);margin-top:var(--space-3)">
            <p style="color:var(--clr-danger);font-weight:700;margin-bottom:var(--space-3);font-size:var(--text-sm)">Are you absolutely sure? All progress will be lost permanently.</p>
            <div style="display:flex;gap:var(--space-2)">
              <button class="btn btn-ghost" id="btn-wipe-cancel" style="flex:1">Cancel</button>
              <button class="btn btn-danger" id="btn-wipe-yes" style="flex:1">Yes, Delete Everything</button>
            </div>
          </div>
        </div>
      </div>`);

    document.getElementById('btn-toggle-sfx')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      this._s.settings.toggle('sfxEnabled');
      e.target.textContent = this._s.settings.getSettings().sfxEnabled ? 'On' : 'Off';
    });
    document.getElementById('btn-toggle-anim')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      this._s.settings.toggle('animationsEnabled');
      e.target.textContent = this._s.settings.getSettings().animationsEnabled ? 'On' : 'Off';
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-setting-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('ui:click');
        this._s.settings.set('difficulty', btn.dataset.diff);
        document.querySelectorAll('.diff-setting-btn').forEach(b => {
          b.className = `btn btn-sm ${b.dataset.diff === btn.dataset.diff ? 'btn-primary' : 'btn-ghost'} diff-setting-btn`;
          b.style.flex = '1';
        });
      });
    });

    document.getElementById('btn-wipe-data')?.addEventListener('click', () => {
      document.getElementById('wipe-initial').style.display  = 'none';
      document.getElementById('wipe-confirm').style.display = 'block';
    });
    document.getElementById('btn-wipe-cancel')?.addEventListener('click', () => {
      document.getElementById('wipe-initial').style.display  = 'block';
      document.getElementById('wipe-confirm').style.display = 'none';
    });
    document.getElementById('btn-wipe-yes')?.addEventListener('click', () => {
      this._s.settings.wipeAllData();
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // PLAYER PROFILE MODAL (profile pill)
  // ══════════════════════════════════════════════════════════════════

  _openProfile(tab = 'profile') {
    this._activeTab   = tab;
    this._profileOpen = true;
    openModal(this._buildProfileShell(), () => { this._profileOpen = false; });
    this._bindProfileShell();
  }

  _refreshProfile() {
    if (!this._profileOpen) return;
    const body = document.getElementById('profile-modal-body');
    if (!body) return;
    body.innerHTML = this._buildProfileTabContent();
    this._bindProfileTabContent();
  }

  // ── Shell ──────────────────────────────────────────────────────────
  _buildProfileShell() {
    const tabs = [
      { id: 'profile',      label: '👤 Profile'     },
      { id: 'achievements', label: '🏆 Achievements' },
      { id: 'account',      label: '🔑 Account'      },
    ];
    const p = this._s.user?.getProfile() ?? {};
    return `
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-icon">👑</div>
          <div class="modal-title-block">
            <div class="modal-title">${p.username ?? 'Commander'}</div>
            <div class="modal-subtitle">Level ${p.level ?? 1} Commander</div>
          </div>
          <button class="modal-close">✕</button>
        </div>
        <div style="display:flex;gap:var(--space-1);margin-bottom:var(--space-3)">
          ${tabs.map(t => `
            <button
              class="btn btn-sm ${this._activeTab === t.id ? 'btn-primary' : 'btn-ghost'}"
              data-profile-tab="${t.id}"
              style="flex:1;font-size:var(--text-xs)"
            >${t.label}</button>
          `).join('')}
        </div>
        <div id="profile-modal-body">${this._buildProfileTabContent()}</div>
      </div>`;
  }

  _bindProfileShell() {
    document.querySelectorAll('[data-profile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.profileTab;
        document.querySelectorAll('[data-profile-tab]').forEach(b => {
          b.className = `btn btn-sm ${b.dataset.profileTab === this._activeTab ? 'btn-primary' : 'btn-ghost'}`;
          b.style.flex = '1';
          b.style.fontSize = 'var(--text-xs)';
        });
        this._refreshProfile();
      });
    });
    this._bindProfileTabContent();
  }

  _buildProfileTabContent() {
    if (this._activeTab === 'achievements') return this._buildAchievementsTab();
    if (this._activeTab === 'account')      return this._buildAccountTab();
    return this._buildProfileTab();
  }

  _bindProfileTabContent() {
    this._bindAccountHandlers();
  }

  // ── Profile tab ────────────────────────────────────────────────────
  _buildProfileTab() {
    const p      = this._s.user?.getProfile() ?? {};
    const xp     = p.xp ?? 0;
    const xpNext = p.xpToNext ?? 500;
    const xpPct  = Math.min(100, Math.round(xp / xpNext * 100));
    const stats  = p.stats ?? {};
    const ach    = this._s.achievements;
    const unlocked = ach ? ach.getUnlockedCount() : 0;
    const total    = ach ? ach.getAchievementsWithState().length : 0;

    const statRows = [
      ['Battles Won',      stats.battlesWon        ?? 0],
      ['Battles Lost',     stats.battlesLost        ?? 0],
      ['Units Trained',    stats.unitsTrainedTotal  ?? 0],
      ['Buildings Built',  stats.buildingsCompleted ?? 0],
      ['Quests Completed', stats.questsCompleted    ?? 0],
      ['Technologies',     stats.researchCompleted  ?? 0],
      ['Heroes Recruited', stats.heroesRecruited    ?? 0],
      ['Market Trades',    stats.marketTradesTotal  ?? 0],
      ['Login Streak',     `${p.loginStreak ?? 0} days`],
      ['Wave High Score',  stats.waveHighScore      ?? 0],
      ['Time Played',      this._fmtTime(stats.timePlayed ?? 0)],
      ['Achievements',     `${unlocked} / ${total}`],
    ];

    return `
      <div style="text-align:center;margin-bottom:var(--space-4)">
        <div style="background:var(--clr-bg-elevated);border-radius:var(--radius-full);height:8px;overflow:hidden;max-width:240px;margin:0 auto">
          <div style="background:var(--clr-primary);height:100%;width:${xpPct}%;transition:width .3s"></div>
        </div>
        <div style="color:var(--clr-text-secondary);font-size:var(--text-xs);margin-top:4px">
          ${xp.toLocaleString()} / ${xpNext.toLocaleString()} XP to Level ${(p.level ?? 1) + 1}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Statistics</div>
        ${statRows.map(([label, val]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-1) 0;border-bottom:1px solid var(--clr-border)33">
            <span style="color:var(--clr-text-secondary);font-size:var(--text-sm)">${label}</span>
            <span style="font-weight:600;font-family:var(--font-mono);font-size:var(--text-sm)">${
              typeof val === 'number' ? val.toLocaleString() : val
            }</span>
          </div>
        `).join('')}
      </div>`;
  }

  // ── Achievements tab ───────────────────────────────────────────────
  _buildAchievementsTab() {
    if (!this._s.achievements) {
      return `<p style="color:var(--clr-text-secondary);text-align:center">Achievements unavailable.</p>`;
    }
    const all      = this._s.achievements.getAchievementsWithState();
    const unlocked = all.filter(a => a.unlocked).length;

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <span style="color:var(--clr-text-secondary);font-size:var(--text-sm)">Completed</span>
        <span style="font-weight:700;color:var(--clr-gold)">${unlocked} / ${all.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-2);max-height:360px;overflow-y:auto;padding-right:4px">
        ${all.map(a => {
          const pct = Math.min(100, Math.round(((a.progress ?? 0) / a.count) * 100));
          const col = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common;
          return `
            <div style="
              background:var(--clr-bg-elevated);
              border-radius:var(--radius-md);
              padding:var(--space-2) var(--space-3);
              border-left:3px solid ${a.unlocked ? col : 'var(--clr-border)'};
              opacity:${a.unlocked ? '1' : '0.55'}
            ">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:var(--text-sm);font-weight:600">${a.icon} ${a.name}</span>
                <span style="font-size:var(--text-xs);color:${col}">${a.rarity}</span>
              </div>
              <div style="font-size:var(--text-xs);color:var(--clr-text-secondary);margin:2px 0 6px">${a.description}</div>
              <div style="background:var(--clr-bg-surface);border-radius:var(--radius-full);height:4px;overflow:hidden">
                <div style="background:${col};height:100%;width:${pct}%;transition:width .3s"></div>
              </div>
              <div style="font-size:var(--text-xs);color:var(--clr-text-secondary);text-align:right;margin-top:2px">
                ${(a.progress ?? 0).toLocaleString()} / ${a.count.toLocaleString()}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── Account tab ────────────────────────────────────────────────────
  _buildAccountTab() {
    const p          = this._s.user?.getProfile() ?? {};
    const isGuest    = p.isGuest !== false;
    const configured = this._s.isFirebaseConfigured ?? false;

    return `
      <div class="modal-section">
        <div class="modal-section-title">Display Name</div>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input
            id="acc-username-input"
            type="text"
            value="${p.username ?? 'Commander'}"
            maxlength="20"
            style="
              flex:1;
              background:var(--clr-bg-elevated);
              border:1px solid var(--clr-border);
              border-radius:var(--radius-md);
              padding:var(--space-2) var(--space-3);
              color:var(--clr-text-primary);
              font-size:var(--text-sm);
            "
          />
          <button class="btn btn-sm btn-primary" id="acc-username-save">Save</button>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Account Status</div>
        <div style="
          background:var(--clr-bg-elevated);
          border-radius:var(--radius-md);
          padding:var(--space-3);
          display:flex;
          align-items:center;
          gap:var(--space-3);
        ">
          <span style="font-size:1.5rem">${isGuest ? '👤' : '✅'}</span>
          <div>
            <div style="font-weight:600;font-size:var(--text-sm)">${isGuest ? 'Playing as Guest' : 'Registered Account'}</div>
            <div style="color:var(--clr-text-secondary);font-size:var(--text-xs);margin-top:2px">
              ${isGuest
                ? 'Your progress is saved locally. Create an account to sync across devices.'
                : 'Signed in — your progress is synced to your account.'
              }
            </div>
          </div>
        </div>
        ${isGuest ? `
          <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--clr-primary)11;border:1px solid var(--clr-primary)44;border-radius:var(--radius-md)">
            ${configured ? `
              <div style="font-size:var(--text-xs);color:var(--clr-text-secondary);margin-bottom:var(--space-3)">
                Create a free account to save your progress to the cloud and play on any device.
              </div>
              <div style="display:flex;flex-direction:column;gap:var(--space-2)">
                <input id="acc-bind-username" type="text" placeholder="Display name" maxlength="20"
                  style="background:var(--clr-bg-base);border:1px solid var(--clr-border);border-radius:var(--radius-md);
                         padding:var(--space-2) var(--space-3);color:var(--clr-text-primary);font-size:var(--text-sm);width:100%;box-sizing:border-box"/>
                <input id="acc-bind-email" type="email" placeholder="Email address"
                  style="background:var(--clr-bg-base);border:1px solid var(--clr-border);border-radius:var(--radius-md);
                         padding:var(--space-2) var(--space-3);color:var(--clr-text-primary);font-size:var(--text-sm);width:100%;box-sizing:border-box"/>
                <input id="acc-bind-password" type="password" placeholder="Password (min 6 chars)"
                  style="background:var(--clr-bg-base);border:1px solid var(--clr-border);border-radius:var(--radius-md);
                         padding:var(--space-2) var(--space-3);color:var(--clr-text-primary);font-size:var(--text-sm);width:100%;box-sizing:border-box"/>
                <div id="acc-bind-error" class="hidden" style="color:var(--clr-danger);font-size:var(--text-xs)"></div>
                <button class="btn btn-sm btn-primary w-full" id="acc-bind-submit">Create Account &amp; Save Progress</button>
              </div>
            ` : `
              <div style="font-size:var(--text-xs);color:var(--clr-text-secondary);margin-bottom:var(--space-2)">
                Account creation unavailable in this build. Your save is stored in your browser automatically.
              </div>
              <button class="btn btn-sm btn-ghost w-full" disabled style="opacity:0.5;cursor:not-allowed">
                🔒 Account Linking — Unavailable
              </button>
            `}
          </div>
        ` : ''}
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Session</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-1) 0">
          <span style="color:var(--clr-text-secondary);font-size:var(--text-sm)">Total Days Played</span>
          <span style="font-weight:600;font-family:var(--font-mono);font-size:var(--text-sm)">${p.totalDaysPlayed ?? 0}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-1) 0">
          <span style="color:var(--clr-text-secondary);font-size:var(--text-sm)">Current Login Streak</span>
          <span style="font-weight:600;font-family:var(--font-mono);font-size:var(--text-sm)">${p.loginStreak ?? 0} days</span>
        </div>
      </div>`;
  }

  _bindAccountHandlers() {
    document.getElementById('acc-username-save')?.addEventListener('click', () => {
      const input = document.getElementById('acc-username-input');
      const val   = input?.value?.trim();
      if (!val) return;
      this._s.user?.setUsername(val);
      const titleEl = document.querySelector('#modal-content .modal-title');
      if (titleEl) titleEl.textContent = val;
    });

    // Guest → account bind (only rendered when IS_CONFIGURED=true and user is guest)
    document.getElementById('acc-bind-submit')?.addEventListener('click', async () => {
      const emailEl    = document.getElementById('acc-bind-email');
      const passwordEl = document.getElementById('acc-bind-password');
      const usernameEl = document.getElementById('acc-bind-username');
      const errorEl    = document.getElementById('acc-bind-error');
      const submitBtn  = document.getElementById('acc-bind-submit');

      const email    = emailEl?.value?.trim() ?? '';
      const password = passwordEl?.value ?? '';
      const username = usernameEl?.value?.trim() ?? '';

      if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account\u2026'; }

      const result = await this._s.firebase?.signUp(email, password, username);
      if (!result?.success) {
        if (errorEl) { errorEl.textContent = result?.reason ?? 'Registration failed.'; errorEl.classList.remove('hidden'); }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account \u0026 Save Progress'; }
        return;
      }

      // Migrate the guest save to the new Firebase account
      const localSave = this._s.saveManager?.getLocalRawSave();
      if (localSave) {
        try {
          await this._s.firebase.saveGameState(localSave);
          this._s.saveManager.wipe();
        } catch (e) {
          console.warn('[SettingsUI] Guest save migration failed (non-fatal):', e);
        }
      }

      this._s.user?.setGuest(false);
      this._s.user?.setUsername(username || email);

      // Mark that an account exists so the auth screen shows Login next session
      localStorage.setItem('basie_has_account', email);

      // Re-render the account tab to show registered state
      this._openProfile('account');
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
