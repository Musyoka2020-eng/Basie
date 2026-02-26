/**
 * SettingsUI.js
 * Handles the settings modal (preferences, danger zone / wipe data).
 */
import { eventBus } from '../../core/EventBus.js';
import { openModal, closeModal } from '../uiUtils.js';

export class SettingsUI {
  /**
   * @param {{ settings, sound }} systems
   */
  constructor(systems) {
    this._s = systems;
  }

  init() {
    eventBus.on('ui:openSettings', () => this.openModal());
  }

  openModal() {
    const s = this._s.settings.getSettings();
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
          <div class="modal-section-title" style="color:var(--clr-danger)">Danger Zone</div>
          <div id="wipe-initial">
            <button class="btn btn-danger w-full" id="btn-wipe-data">Wipe Save Data</button>
          </div>
          <div id="wipe-confirm" style="display:none;background:var(--clr-danger)22;border:1px solid var(--clr-danger);padding:var(--space-3);border-radius:var(--radius-md);margin-top:var(--space-3)">
            <p style="color:var(--clr-danger);font-weight:700;margin-bottom:var(--space-3);font-size:var(--text-sm)">Are you absolutely sure? All progress will be lost permanently.</p>
            <div style="display:flex;gap:var(--space-2)">
              <button class="btn btn-ghost" id="btn-wipe-cancel" style="flex:1">Cancel</button>
              <button class="btn btn-danger"  id="btn-wipe-yes"    style="flex:1">Yes, Delete Everything</button>
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
    document.getElementById('btn-wipe-data')?.addEventListener('click', () => {
      document.getElementById('wipe-initial').style.display = 'none';
      document.getElementById('wipe-confirm').style.display = 'block';
    });
    document.getElementById('btn-wipe-cancel')?.addEventListener('click', () => {
      document.getElementById('wipe-initial').style.display = 'block';
      document.getElementById('wipe-confirm').style.display = 'none';
    });
    document.getElementById('btn-wipe-yes')?.addEventListener('click', () => {
      this._s.settings.wipeAllData();
    });
  }
}
