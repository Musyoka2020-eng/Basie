/**
 * NotificationManager.js
 * Listens to the EventBus and spawns "toast" pop-up notifications.
 * Handles queuing, auto-dismiss timing, and CSS animation.
 */
import { eventBus } from '../core/EventBus.js';

const TOAST_DURATION_MS = 4000;
const ICONS = {
  success: '✅',
  warning: '⚠️',
  error:   '❌',
  info:    'ℹ️',
  combat:  '⚔️',
};

export class NotificationManager {
  constructor() {
    this.name = 'NotificationManager';
    this._container = document.getElementById('notification-container');
    this._registerEvents();
  }

  _registerEvents() {
    // Building events
    eventBus.on('building:completed',  d => this.show('success', 'Construction Complete!', `${d.building.name ?? d.id} is ready.`));
    eventBus.on('building:started',    d => this.show('info',    'Building Started',       `Upgrading to Level ${d.level}.`));
    // Unit events
    eventBus.on('unit:trained',        d => this.show('success', 'Training Complete!',     `${d.count}x unit(s) ready.`));
    // Combat events
    eventBus.on('combat:victory',      d => this.show('combat',  '⚔️ Victory!',            `You defeated the enemy. Loot collected!`));
    eventBus.on('combat:defeat',       d => this.show('error',   '💀 Defeated',            `Your forces were overpowered.`));
    // Resource events
    eventBus.on('resources:spent',     d => {/* silent */});
    // Tech events
    eventBus.on('tech:researched',     d => this.show('success', 'Research Complete!',     `${d.name} — Lv.${d.level ?? 1} complete!`));
    // Quest events
    eventBus.on('quest:completed',     d => this.show('success', '📜 Quest Complete!',     `"${d.name}" — Rewards collected!`));
    // Game events
    eventBus.on('game:saved',          ( ) => {/* silent */});
  }

  /**
   * Display a toast notification.
   * @param {'success'|'warning'|'error'|'info'|'combat'} type
   * @param {string} title
   * @param {string} message
   */
  show(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] ?? 'ℹ️'}</span>
      <div class="toast-body">
        <p class="toast-title">${title}</p>
        <p class="toast-message">${message}</p>
      </div>
    `;

    this._container.appendChild(toast);

    setTimeout(() => this._dismiss(toast), TOAST_DURATION_MS);
  }

  _dismiss(toast) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  update(dt) { /* No tick needed */ }
}
