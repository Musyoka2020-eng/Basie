/**
 * MailUI.js
 * Handles the mail inbox modal and mail detail view.
 *
 * Fix: emits `ui:mailOpened` so MailManager can markAllRead() reactively,
 * rather than calling markAllRead() directly as a side-effect of rendering.
 */
import { eventBus } from '../../core/EventBus.js';
import { RES_META, fmt, openModal, closeModal } from '../uiUtils.js';

export class MailUI {
  /**
   * @param {{ mail, rm, notifications, sound }} systems
   */
  constructor(systems) {
    this._s = systems;
  }

  init() {
    eventBus.on('ui:openMail', () => this.openModal());
  }

  openModal() {
    const messages = this._s.mail.getMessages();

    // Emit event — MailManager.markAllRead() is called in response, not here
    eventBus.emit('ui:mailOpened');

    // Badge reset is handled by the mail:read event MailManager emits
    openModal(`
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-icon">📬</div>
          <div class="modal-title-block">
            <div class="modal-title">Inbox</div>
            <div class="modal-subtitle">${messages.length} messages</div>
          </div>
          <button class="modal-close">✕</button>
        </div>
        <div id="mail-area">
          ${messages.length === 0
            ? '<div class="empty-state"><div class="empty-state-icon">📬</div><p class="empty-state-title">Inbox empty</p></div>'
            : `<div class="mail-list" id="mail-list">${messages.map(m => `
              <div class="mail-item" data-mail-id="${m.id}" style="cursor:pointer">
                <div class="mail-item-icon">${m.icon}</div>
                <div class="mail-item-body">
                  <div class="mail-item-subject">${m.subject}</div>
                  <div class="mail-item-preview">${m.body.slice(0, 60)}...</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                  <div class="mail-item-time">${new Date(m.timestamp).toLocaleDateString()}</div>
                  ${m.attachments && !m.rewardsClaimed ? '<span class="badge" style="position:static;background:var(--clr-gold)">!</span>' : ''}
                </div>
              </div>`).join('')}</div>`}
        </div>
      </div>`);

    document.getElementById('mail-list')?.querySelectorAll('.mail-item').forEach(item => {
      item.addEventListener('click', () => {
        const msg = messages.find(m => m.id === parseInt(item.dataset.mailId));
        if (msg) this._openMailDetail(msg, messages);
      });
    });
  }

  _openMailDetail(msg, messages) {
    const rewardHtml = msg.attachments
      ? Object.entries(msg.attachments)
          .filter(([k]) => k !== 'xp')
          .map(([r, v]) => `<div class="battle-reward-chip">${RES_META[r]?.icon ?? '✨'} +${fmt(v)} ${r}</div>`)
          .join('')
      : '';

    openModal(`
      <div class="modal-inner">
        <div class="modal-top">
          <div class="modal-icon">${msg.icon}</div>
          <div class="modal-title-block">
            <div class="modal-title" style="font-size:var(--text-md)">${msg.subject}</div>
            <div class="modal-subtitle">${new Date(msg.timestamp).toLocaleString()}</div>
          </div>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-section">
          <p style="line-height:1.7;color:var(--clr-text-secondary)">${msg.body}</p>
        </div>
        ${rewardHtml ? `
        <div class="modal-section">
          <div class="modal-section-title">Rewards</div>
          <div class="battle-rewards" style="justify-content:flex-start">${rewardHtml}</div>
          ${msg.rewardsClaimed ? `<p style="font-size:var(--text-xs);color:var(--clr-text-muted)">✅ Already collected.</p>` : ''}
        </div>` : ''}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="btn-mail-back">← Back</button>
          ${msg.attachments && !msg.rewardsClaimed ? `<button class="btn btn-gold" id="btn-claim-rewards">💰 Collect Rewards</button>` : ''}
        </div>
      </div>`);

    document.getElementById('btn-mail-back')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-claim-rewards')?.addEventListener('click', () => {
      eventBus.emit('ui:click');
      const r = this._s.mail.claimRewards(msg.id, this._s.rm);
      if (r.success) {
        this._s.notifications?.show('success', '💰 Rewards Collected!', 'Resources added.');
        this._s.sound?.coin();
        const updated = this._s.mail.getMessages().find(m => m.id === msg.id);
        if (updated) this._openMailDetail(updated, messages);
      } else {
        this._s.notifications?.show('warning', 'Cannot Collect', r.reason);
      }
    });
  }
}
