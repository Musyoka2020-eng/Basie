/**
 * MailUI.js
 * Two-pane inbox modal with categories, search, multi-select,
 * archive, delete, and per-message read tracking.
 */
import { eventBus } from '../../core/EventBus.js';
import { RES_META, fmt, openModal, closeModal } from '../uiUtils.js';

const FILTER_LABELS = {
  all:         { label: 'All',          icon: '📬' },
  combat:      { label: 'Combat',       icon: '⚔️' },
  quest:       { label: 'Quests',       icon: '📜' },
  achievement: { label: 'Achievements', icon: '🏆' },
  system:      { label: 'System',       icon: '📢' },
  archived:    { label: 'Archived',     icon: '🗂️' },
};

export class MailUI {
  /** @param {{ mail, rm, notifications, sound }} systems */
  constructor(systems) {
    this._s = systems;

    // Local state
    this._view        = 'inbox';   // 'inbox' | 'archived'
    this._filter      = 'all';
    this._search      = '';
    this._selectedIds = new Set();
    this._openId      = null;      // currently open message id
  }

  init() {
    eventBus.on('ui:openMail', () => this.openModal());
    // Re-render if external changes arrive while modal is open
    eventBus.on('mail:updated', () => this._isOpen() && this._render());
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  openModal() {
    this._view        = 'inbox';
    this._filter      = 'all';
    this._search      = '';
    this._selectedIds = new Set();
    // Don't reset _openId so returning to the modal keeps context

    // Add sizing class to the shared modal-content box
    document.getElementById('modal-content')?.classList.add('mail-modal');

    const onClose = () => {
      document.getElementById('modal-content')?.classList.remove('mail-modal');
      this._openId = null;
    };
    this._closeCallback = onClose;

    openModal('<div class="mail-modal-wrapper" id="mail-root"></div>', onClose);

    this._render();
  }

  // ─── State helpers ────────────────────────────────────────────────────────

  _isOpen() {
    return !!document.getElementById('mail-root');
  }

  /** Returns the filtered+searched list for the current view */
  _visibleMessages() {
    const all = this._s.mail.getMessages();
    const isArchived = this._view === 'archived';
    let msgs = all.filter(m => m.isArchived === isArchived);

    if (this._filter !== 'all') {
      msgs = msgs.filter(m => m.type === this._filter);
    }

    if (this._search.trim()) {
      const q = this._search.toLowerCase();
      msgs = msgs.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    }
    return msgs;
  }

  _getOpenMessage() {
    if (this._openId == null) return null;
    return this._s.mail.getMessages().find(m => m.id === this._openId) ?? null;
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  _render() {
    const root = document.getElementById('mail-root');
    if (!root) return;

    const visible    = this._visibleMessages();
    const openMsg    = this._getOpenMessage();
    const allIds     = visible.map(m => m.id);
    const allChecked = allIds.length > 0 && allIds.every(id => this._selectedIds.has(id));
    const selCount   = this._selectedIds.size;

    // Counts for filter pills
    const allMsgs    = this._s.mail.getMessages();
    const inboxMsgs  = allMsgs.filter(m => !m.isArchived);

    const countFor = (type) => type === 'all'
      ? inboxMsgs.length
      : type === 'archived'
      ? allMsgs.filter(m => m.isArchived).length
      : inboxMsgs.filter(m => m.type === type).length;

    root.innerHTML = `
      <!-- ── SIDEBAR ─────────────────────────────── -->
      <aside class="mail-sidebar">

        <div class="mail-sidebar-header">
          <span class="mail-sidebar-title">📬 Inbox</span>
          <button class="modal-close" id="mail-close-btn">✕</button>
        </div>

        <div class="mail-search-wrap">
          <span class="mail-search-icon">🔍</span>
          <input
            class="mail-search-input"
            id="mail-search"
            type="text"
            placeholder="Search messages…"
            value="${this._search.replace(/"/g, '&quot;')}"
          />
          ${this._search ? '<button class="mail-search-clear" id="mail-search-clear">✕</button>' : ''}
        </div>

        <div class="mail-filter-pills">
          ${Object.entries(FILTER_LABELS).map(([key, meta]) => {
            const isActive = key === 'archived'
              ? this._view === 'archived'
              : this._view === 'inbox' && this._filter === key;
            const cnt = countFor(key);
            return `
              <button class="mail-filter-pill ${isActive ? 'active' : ''}" data-filter="${key}">
                ${meta.icon} ${meta.label}
                ${cnt > 0 ? `<span class="mail-pill-count">${cnt}</span>` : ''}
              </button>`;
          }).join('')}
        </div>

        ${selCount > 0 ? `
        <div class="mail-bulk-bar">
          <label class="mail-bulk-label">
            <input type="checkbox" id="mail-select-all" ${allChecked ? 'checked' : ''}> ${selCount} selected
          </label>
          <div class="mail-bulk-actions">
            <button class="btn btn-xs btn-ghost" id="bulk-read-btn" title="Mark Read">✔ Read</button>
            <button class="btn btn-xs btn-ghost" id="bulk-archive-btn" title="Archive">🗂 Archive</button>
            <button class="btn btn-xs btn-danger" id="bulk-delete-btn" title="Delete">🗑 Delete</button>
          </div>
        </div>` : `
        <div class="mail-bulk-bar mail-bulk-bar--select">
          <label class="mail-bulk-label mail-bulk-label--faint">
            <input type="checkbox" id="mail-select-all" ${allChecked && allIds.length > 0 ? 'checked' : ''}> Select all
          </label>
        </div>`}

        <div class="mail-list" id="mail-list">
          ${visible.length === 0
            ? `<div class="mail-empty-list">
                <div class="mail-empty-icon">📭</div>
                <p>${this._search ? 'No results found.' : this._view === 'archived' ? 'No archived messages.' : 'Inbox empty.'}</p>
               </div>`
            : visible.map(m => {
                const isSelected = this._selectedIds.has(m.id);
                const isOpen     = m.id === this._openId;
                const hasReward  = m.attachments && !m.rewardsClaimed;
                return `
                <div class="mail-item ${m.isRead ? '' : 'unread'} ${isOpen ? 'active' : ''} ${isSelected ? 'selected' : ''}"
                     data-id="${m.id}">
                  <input type="checkbox" class="mail-item-check" data-id="${m.id}" ${isSelected ? 'checked' : ''}>
                  <div class="mail-item-icon">${m.icon}</div>
                  <div class="mail-item-body">
                    <div class="mail-item-subject">${m.subject}</div>
                    <div class="mail-item-preview">${m.body.slice(0, 55)}…</div>
                  </div>
                  <div class="mail-item-meta">
                    <div class="mail-item-time">${_relativeDate(m.timestamp)}</div>
                    ${hasReward ? '<span class="mail-reward-dot" title="Unclaimed rewards">💰</span>' : ''}
                  </div>
                  <div class="mail-item-actions">
                    <button class="mail-action-btn" data-action="${this._view === 'archived' ? 'unarchive' : 'archive'}" data-id="${m.id}" title="${this._view === 'archived' ? 'Unarchive' : 'Archive'}">🗂</button>
                    <button class="mail-action-btn mail-action-btn--danger" data-action="delete" data-id="${m.id}" title="Delete">🗑</button>
                  </div>
                </div>`;
              }).join('')
          }
        </div>
      </aside>

      <!-- ── READER ─────────────────────────────── -->
      <section class="mail-reader" id="mail-reader">
        ${openMsg ? this._renderReader(openMsg) : `
          <div class="mail-reader-empty">
            <div class="mail-reader-empty-icon">📬</div>
            <p>Select a message to read it</p>
          </div>`}
      </section>`;

    this._bindEvents();
  }

  _renderReader(msg) {
    const rewardHtml = msg.attachments
      ? Object.entries(msg.attachments)
          .filter(([k]) => k !== 'xp')
          .map(([r, v]) => `<div class="battle-reward-chip">${RES_META[r]?.icon ?? '✨'} +${fmt(v)} ${RES_META[r]?.label ?? r}</div>`)
          .join('')
      : '';

    return `
      <div class="mail-reader-header">
        <div class="mail-reader-icon">${msg.icon}</div>
        <div class="mail-reader-title-block">
          <div class="mail-reader-subject">${msg.subject}</div>
          <div class="mail-reader-date">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div class="mail-reader-body">
        <p>${msg.body}</p>
      </div>

      ${rewardHtml ? `
      <div class="mail-reader-rewards">
        <div class="modal-section-title">Attached Rewards</div>
        <div class="battle-rewards" style="justify-content:flex-start">${rewardHtml}</div>
        ${msg.rewardsClaimed ? `<p class="mail-claimed-note">✅ Already collected.</p>` : ''}
      </div>` : ''}

      <div class="mail-reader-actions">
        ${this._view === 'archived'
          ? `<button class="btn btn-ghost" id="reader-unarchive" data-id="${msg.id}">📤 Unarchive</button>`
          : `<button class="btn btn-ghost" id="reader-archive"   data-id="${msg.id}">🗂 Archive</button>`}
        <button class="btn btn-danger-outline" id="reader-delete" data-id="${msg.id}">🗑 Delete</button>
        ${msg.attachments && !msg.rewardsClaimed
          ? `<button class="btn btn-gold" id="reader-claim" data-id="${msg.id}">💰 Collect Rewards</button>`
          : ''}
      </div>`;
  }

  // ─── Event binding ────────────────────────────────────────────────────────

  _bindEvents() {
    // Close button
    document.getElementById('mail-close-btn')
      ?.addEventListener('click', () => closeModal(this._closeCallback));

    // Search input
    document.getElementById('mail-search')
      ?.addEventListener('input', e => {
        this._search = e.target.value;
        this._render();
      });

    document.getElementById('mail-search-clear')
      ?.addEventListener('click', () => {
        this._search = '';
        this._render();
      });

    // Filter pills
    document.querySelectorAll('.mail-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        if (f === 'archived') {
          this._view = 'archived';
          this._filter = 'all';
        } else {
          this._view = 'inbox';
          this._filter = f;
        }
        this._selectedIds.clear();
        this._render();
      });
    });

    // Select-all checkbox
    document.getElementById('mail-select-all')?.addEventListener('change', e => {
      const visible = this._visibleMessages();
      if (e.target.checked) visible.forEach(m => this._selectedIds.add(m.id));
      else                  this._selectedIds.clear();
      this._render();
    });

    // Individual checkboxes
    document.querySelectorAll('.mail-item-check').forEach(cb => {
      cb.addEventListener('change', e => {
        e.stopPropagation();
        const id = parseInt(cb.dataset.id);
        if (e.target.checked) this._selectedIds.add(id);
        else                  this._selectedIds.delete(id);
        this._render();
      });
    });

    // Mail-item row click (open message)
    document.querySelectorAll('.mail-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.mail-item-check,.mail-action-btn')) return;
        const id = parseInt(item.dataset.id);
        this._openId = id;
        this._s.mail.markRead(id);
        this._render();
      });
    });

    // Quick action buttons on list items
    document.querySelectorAll('.mail-action-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id     = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        this._doAction(action, [id]);
      });
    });

    // Bulk action buttons
    document.getElementById('bulk-read-btn')?.addEventListener('click', () => {
      this._s.mail.markReadMultiple([...this._selectedIds]);
      this._selectedIds.clear();
      this._render();
    });
    document.getElementById('bulk-archive-btn')?.addEventListener('click', () => {
      this._s.mail.archiveMultiple([...this._selectedIds]);
      if (this._openId && this._selectedIds.has(this._openId)) this._openId = null;
      this._selectedIds.clear();
      this._render();
    });
    document.getElementById('bulk-delete-btn')?.addEventListener('click', () => {
      this._s.mail.deleteMultiple([...this._selectedIds]);
      if (this._openId && this._selectedIds.has(this._openId)) this._openId = null;
      this._selectedIds.clear();
      this._render();
    });

    // Reader action buttons
    document.getElementById('reader-archive')?.addEventListener('click', e => {
      this._doAction('archive', [parseInt(e.currentTarget.dataset.id)]);
    });
    document.getElementById('reader-unarchive')?.addEventListener('click', e => {
      this._doAction('unarchive', [parseInt(e.currentTarget.dataset.id)]);
    });
    document.getElementById('reader-delete')?.addEventListener('click', e => {
      this._doAction('delete', [parseInt(e.currentTarget.dataset.id)]);
    });
    document.getElementById('reader-claim')?.addEventListener('click', e => {
      eventBus.emit('ui:click');
      const id = parseInt(e.currentTarget.dataset.id);
      const r  = this._s.mail.claimRewards(id, this._s.rm);
      if (r.success) {
        this._s.notifications?.show('success', '💰 Rewards Collected!', 'Resources added to your reserves.');
        this._s.sound?.coin?.();
        this._render();
      } else {
        this._s.notifications?.show('warning', 'Cannot Collect', r.reason);
      }
    });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  _doAction(action, ids) {
    switch (action) {
      case 'archive':
        this._s.mail.archiveMultiple(ids);
        ids.forEach(id => { if (id === this._openId) this._openId = this._nextVisibleId(id); });
        break;
      case 'unarchive':
        this._s.mail.unarchive(ids[0]);
        if (ids[0] === this._openId) this._openId = null;
        break;
      case 'delete':
        ids.forEach(id => { if (id === this._openId) this._openId = this._nextVisibleId(id); });
        this._s.mail.deleteMultiple(ids);
        break;
    }
    ids.forEach(id => this._selectedIds.delete(id));
    this._render();
  }

  /** Returns the id of the message after @param currentId in the visible list, or null */
  _nextVisibleId(currentId) {
    const list = this._visibleMessages();
    const idx  = list.findIndex(m => m.id === currentId);
    if (idx === -1) return null;
    const next = list[idx + 1] ?? list[idx - 1] ?? null;
    return next?.id ?? null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _relativeDate(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  const hr   = Math.floor(diff / 3_600_000);
  const day  = Math.floor(diff / 86_400_000);
  if (min < 1)   return 'Just now';
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 7)   return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
