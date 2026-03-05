/**
 * LogManager.js
 * In-browser ring-buffer logger with a Ctrl+Shift+L overlay for debug inspection.
 *
 * Usage:
 *   import { logManager } from './core/LogManager.js';
 *   logManager.log('MySystem', 'something happened', 'info');
 *
 * Overlay:
 *   Ctrl+Shift+L  — toggle the log overlay
 *   Settings modal — "Open Log Viewer" button
 *   Escape        — close the overlay
 *
 * LocalStorage persistence is opt-in: set DEBUG_CONFIG.logPersist = true in GAME_DATA.js.
 */

import { eventBus } from './EventBus.js';

const MAX_ENTRIES = 500;

export class LogManager {
  /**
   * @param {{ logPersist?: boolean }} [config]
   */
  constructor({ logPersist = false } = {}) {
    this.name        = 'LogManager';
    this._logPersist = logPersist;
    /** @type {Array<{ts:number, level:string, tag:string, message:string}>} */
    this._buffer     = [];
    this._overlayEl  = null;

    // Ctrl+Shift+L — toggle overlay
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this._toggleOverlay();
      }
    });

    // Settings modal button → debug:toggleLog
    eventBus.on('debug:toggleLog', () => this._toggleOverlay());

    // Optional localStorage persistence on page unload
    if (this._logPersist) {
      window.addEventListener('beforeunload', () => {
        try {
          localStorage.setItem('basie_log', JSON.stringify(this._buffer));
        } catch (_) { /* storage full — ignore */ }
      });
    }
  }

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  /**
   * Record a log entry. Thread-safe (synchronous array push, no I/O).
   * @param {string} tag      - Short label for the source system (e.g. 'GameEngine')
   * @param {string} message  - Human-readable description
   * @param {'info'|'warn'|'error'} [level]
   */
  log(tag, message, level = 'info') {
    const entry = { ts: Date.now(), level, tag, message: String(message) };
    this._buffer.push(entry);
    if (this._buffer.length > MAX_ENTRIES) this._buffer.shift();
    // If overlay is open, refresh it lazily (skip DOM work if closed)
    if (this._overlayEl) this._refreshOverlayContent();
  }

  /**
   * Return the full buffer as a pretty-printed JSON string.
   * @returns {string}
   */
  dump() {
    return JSON.stringify(this._buffer, null, 2);
  }

  /** Clear the ring buffer. */
  clear() {
    this._buffer = [];
  }

  // ─────────────────────────────────────────────
  // Overlay (private)
  // ─────────────────────────────────────────────

  /** @private */
  _toggleOverlay() {
    if (this._overlayEl) {
      this._closeOverlay();
    } else {
      this._openOverlay();
    }
  }

  /** @private */
  _openOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'log-manager-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0',
      'background:rgba(0,0,0,0.88)',
      'z-index:9999',
      'display:flex;flex-direction:column',
      'padding:20px',
      'box-sizing:border-box',
      'font-family:"JetBrains Mono",monospace',
    ].join(';');

    const headerEl = document.createElement('div');
    headerEl.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-shrink:0';
    headerEl.innerHTML = `
      <span id="log-entry-count" style="font-weight:700;font-size:15px;color:#fff">
        📋 Game Log (${this._buffer.length} entries)
      </span>
      <button id="log-copy-btn"  style="${this._btnStyle('#4ade80','#000')}">Copy</button>
      <button id="log-clear-btn" style="${this._btnStyle('#f87171','#fff')}">Clear</button>
      <button id="log-close-btn" style="${this._btnStyle('#6b7280','#fff')}">Close ✕</button>
    `;

    const pre = document.createElement('pre');
    pre.id = 'log-pre';
    pre.style.cssText = [
      'flex:1;overflow:auto',
      'background:#0d1117;color:#b9d7a8',
      'padding:14px;border-radius:8px',
      'font-size:12px;line-height:1.65',
      'margin:0;white-space:pre-wrap;word-break:break-all',
    ].join(';');
    pre.textContent = this._formatBuffer();

    overlay.appendChild(headerEl);
    overlay.appendChild(pre);
    document.body.appendChild(overlay);
    this._overlayEl = overlay;

    // Copy
    headerEl.querySelector('#log-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.dump()).catch(() => {});
    });

    // Clear
    headerEl.querySelector('#log-clear-btn')?.addEventListener('click', () => {
      this.clear();
      pre.textContent = '(cleared)';
      headerEl.querySelector('#log-entry-count').textContent = '📋 Game Log (0 entries)';
    });

    // Close
    headerEl.querySelector('#log-close-btn')?.addEventListener('click', () => this._closeOverlay());

    // Escape key closes
    const escHandler = e => {
      if (e.key === 'Escape') { this._closeOverlay(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  /** @private */
  _closeOverlay() {
    this._overlayEl?.remove();
    this._overlayEl = null;
  }

  /** @private — live-refresh content while overlay is open */
  _refreshOverlayContent() {
    const pre = this._overlayEl?.querySelector('#log-pre');
    if (pre) pre.textContent = this._formatBuffer();
    const countEl = this._overlayEl?.querySelector('#log-entry-count');
    if (countEl) countEl.textContent = `📋 Game Log (${this._buffer.length} entries)`;
  }

  /** @private — format all entries as plain text lines */
  _formatBuffer() {
    if (!this._buffer.length) return '(no entries yet — play the game to populate the log)';
    return this._buffer.map(e => {
      const time = new Date(e.ts).toISOString().slice(11, 23); // HH:mm:ss.mmm
      const lvl  = e.level.toUpperCase().padEnd(5);
      return `[${time}] ${lvl} [${e.tag}] ${e.message}`;
    }).join('\n');
  }

  /** @private — simple inline button style string */
  _btnStyle(bg, color) {
    return `margin-left:${bg === '#4ade80' ? 'auto' : '0'};padding:6px 14px;border-radius:6px;border:none;background:${bg};color:${color};cursor:pointer;font-weight:600;font-family:inherit`;
  }
}
