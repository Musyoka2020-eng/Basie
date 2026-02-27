/**
 * MailManager.js
 * Manages an in-game inbox of persistent messages.
 * Handles unread state, reward attachments, interactive reward collection,
 * archiving, bulk operations, and categorised mail types.
 *
 * Message types: 'combat' | 'quest' | 'achievement' | 'system'
 */
import { eventBus } from '../core/EventBus.js';

/** @param {string} subject @returns {string} */
function _inferType(subject) {
  if (/^[⚔️💀]/.test(subject)) return 'combat';
  if (/^📜/.test(subject))      return 'quest';
  if (/^🏆/.test(subject))      return 'achievement';
  return 'system';
}

export class MailManager {
  constructor() {
    this.name = 'MailManager';
    /** @type {Array<{id, subject, body, icon, type, isRead, isArchived, attachments, rewardsClaimed, timestamp}>} */
    this._messages = [];
    this._nextId = 1;
    this._registerEvents();
  }

  _registerEvents() {
    eventBus.on('combat:victory', d => {
      this.send({
        type: 'combat',
        subject: '⚔️ Combat Report: Victory',
        body: `Your forces stood firm and defeated the enemy! All spoils of war have been recorded below. Collect them to add to your reserves.`,
        icon: '📋',
        attachments: d.rewards,
      });
    });
    eventBus.on('combat:defeat', () => {
      this.send({
        type: 'combat',
        subject: '💀 Combat Report: Defeat',
        body: `Your forces were overwhelmed and driven back. Take time to regroup, reinforce your barracks, and try again. The enemy will not forget this day.`,
        icon: '📋',
      });
    });
    eventBus.on('quest:completed', d => {
      this.send({
        type: 'quest',
        subject: `📜 Quest Complete: "${d.name}"`,
        body: d.description ?? 'Objective complete! Your reward is waiting to be collected.',
        icon: '📜',
        attachments: d.rewards,
      });
    });
    eventBus.on('user:levelUp', d => {
      this.send({
        type: 'system',
        subject: `🎉 Level Up! You are now Level ${d.level}`,
        body: `Congratulations, Commander! Your growing experience has elevated you to Level ${d.level}. New opportunities await — new buildings, technologies, and challenges will unlock as you grow stronger.`,
        icon: '👑',
        attachments: { money: d.level * 50 },
      });
    });
  }

  // ─── Core ─────────────────────────────────────────────────────────────────

  /**
   * Send a new message to the inbox.
   * @param {{ type?: string, subject: string, body: string, icon?: string, attachments?: object }} opts
   */
  send(opts) {
    const msg = {
      id:             this._nextId++,
      type:           opts.type ?? 'system',
      subject:        opts.subject,
      body:           opts.body,
      icon:           opts.icon ?? '📬',
      isRead:         false,
      isArchived:     false,
      attachments:    opts.attachments ?? null,
      rewardsClaimed: false,
      timestamp:      Date.now(),
    };
    this._messages.unshift(msg);
    eventBus.emit('mail:received', { unreadCount: this.getUnreadCount(), message: msg });
    eventBus.emit('mail:updated',  { unreadCount: this.getUnreadCount() });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  markRead(id) {
    const msg = this._messages.find(m => m.id === id);
    if (msg && !msg.isRead) {
      msg.isRead = true;
      const uc = this.getUnreadCount();
      eventBus.emit('mail:read',    { unreadCount: uc });
      eventBus.emit('mail:updated', { unreadCount: uc });
    }
  }

  markAllRead() {
    this._messages.forEach(m => m.isRead = true);
    eventBus.emit('mail:read',    { unreadCount: 0 });
    eventBus.emit('mail:updated', { unreadCount: 0 });
  }

  /** @param {number[]} ids */
  markReadMultiple(ids) {
    const set = new Set(ids);
    this._messages.forEach(m => { if (set.has(m.id)) m.isRead = true; });
    const uc = this.getUnreadCount();
    eventBus.emit('mail:read',    { unreadCount: uc });
    eventBus.emit('mail:updated', { unreadCount: uc });
  }

  // ─── Archive ───────────────────────────────────────────────────────────────

  archive(id) {
    const msg = this._messages.find(m => m.id === id);
    if (msg) { msg.isArchived = true; eventBus.emit('mail:updated', { unreadCount: this.getUnreadCount() }); }
  }

  unarchive(id) {
    const msg = this._messages.find(m => m.id === id);
    if (msg) { msg.isArchived = false; eventBus.emit('mail:updated', { unreadCount: this.getUnreadCount() }); }
  }

  /** @param {number[]} ids */
  archiveMultiple(ids) {
    const set = new Set(ids);
    this._messages.forEach(m => { if (set.has(m.id)) m.isArchived = true; });
    eventBus.emit('mail:updated', { unreadCount: this.getUnreadCount() });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  delete(id) {
    this._messages = this._messages.filter(m => m.id !== id);
    const uc = this.getUnreadCount();
    eventBus.emit('mail:deleted', { unreadCount: uc });
    eventBus.emit('mail:updated', { unreadCount: uc });
  }

  /** @param {number[]} ids */
  deleteMultiple(ids) {
    const set = new Set(ids);
    this._messages = this._messages.filter(m => !set.has(m.id));
    const uc = this.getUnreadCount();
    eventBus.emit('mail:deleted', { unreadCount: uc });
    eventBus.emit('mail:updated', { unreadCount: uc });
  }

  // ─── Rewards ───────────────────────────────────────────────────────────────

  /**
   * Claim reward attachments from a mail.
   * @param {number} id
   * @param {import('./ResourceManager.js').ResourceManager} resourceManager
   * @returns {{ success: boolean, rewards?: object, reason?: string }}
   */
  claimRewards(id, resourceManager) {
    const msg = this._messages.find(m => m.id === id);
    if (!msg)               return { success: false, reason: 'Message not found.' };
    if (!msg.attachments)   return { success: false, reason: 'No attachments.' };
    if (msg.rewardsClaimed) return { success: false, reason: 'Rewards already claimed.' };

    const resourceRewards = {};
    for (const [k, v] of Object.entries(msg.attachments)) {
      if (k !== 'xp') resourceRewards[k] = v;
    }

    resourceManager.add(resourceRewards);
    msg.rewardsClaimed = true;
    eventBus.emit('mail:rewardsClaimed', { id, rewards: resourceRewards });
    eventBus.emit('mail:updated', { unreadCount: this.getUnreadCount() });
    return { success: true, rewards: resourceRewards };
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getMessages()    { return [...this._messages]; }
  getUnreadCount() { return this._messages.filter(m => !m.isRead && !m.isArchived).length; }

  update(dt) { /* No tick needed */ }

  // ─── Persistence ───────────────────────────────────────────────────────────

  serialize() { return { messages: this._messages, nextId: this._nextId }; }

  deserialize(data) {
    if (!data) return;
    this._messages = (data.messages ?? []).map(m => ({
      isArchived: false,
      type: _inferType(m.subject),
      ...m,
    }));
    this._nextId = data.nextId ?? this._messages.length + 1;
    eventBus.emit('mail:received', { unreadCount: this.getUnreadCount() });
    eventBus.emit('mail:updated',  { unreadCount: this.getUnreadCount() });
  }
}
