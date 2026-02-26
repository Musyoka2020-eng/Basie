/**
 * MailManager.js
 * Manages an in-game inbox of persistent messages.
 * Handles unread state, reward attachments, and interactive reward collection.
 */
import { eventBus } from '../core/EventBus.js';

export class MailManager {
  constructor() {
    this.name = 'MailManager';
    /** @type {Array<{id, subject, body, icon, isRead, attachments, rewardsClaimed, timestamp}>} */
    this._messages = [];
    this._nextId = 1;
    this._registerEvents();
  }

  _registerEvents() {
    // Mark all messages read when the player opens the inbox
    eventBus.on('ui:mailOpened', () => this.markAllRead());

    eventBus.on('combat:victory', d => {
      this.send({
        subject: '⚔️ Combat Report: Victory',
        body: `Your forces stood firm and defeated the enemy! All spoils of war have been recorded below. Collect them to add to your reserves.`,
        icon: '📋',
        attachments: d.rewards,
      });
    });
    eventBus.on('combat:defeat', () => {
      this.send({
        subject: '💀 Combat Report: Defeat',
        body: `Your forces were overwhelmed and driven back. Take time to regroup, reinforce your barracks, and try again. The enemy will not forget this day.`,
        icon: '📋',
      });
    });
    eventBus.on('quest:completed', d => {
      this.send({
        subject: `📜 Quest Complete: "${d.name}"`,
        body: d.description ?? 'Objective complete! Your reward is waiting to be collected.',
        icon: '📜',
        attachments: d.rewards,
      });
    });
    eventBus.on('user:levelUp', d => {
      this.send({
        subject: `🎉 Level Up! You are now Level ${d.level}`,
        body: `Congratulations, Commander! Your growing experience has elevated you to Level ${d.level}. New opportunities await — new buildings, technologies, and challenges will unlock as you grow stronger.`,
        icon: '👑',
        attachments: { gold: d.level * 100 },
      });
    });
  }

  /**
   * Send a new message to the inbox.
   * @param {{ subject: string, body: string, icon?: string, attachments?: object }} opts
   */
  send(opts) {
    const msg = {
      id: this._nextId++,
      subject: opts.subject,
      body: opts.body,
      icon: opts.icon ?? '📬',
      isRead: false,
      attachments: opts.attachments ?? null,
      rewardsClaimed: false,
      timestamp: Date.now(),
    };
    this._messages.unshift(msg);
    eventBus.emit('mail:received', { unreadCount: this.getUnreadCount(), message: msg });
  }

  markRead(id) {
    const msg = this._messages.find(m => m.id === id);
    if (msg) {
      msg.isRead = true;
      eventBus.emit('mail:read', { unreadCount: this.getUnreadCount() });
    }
  }

  markAllRead() {
    this._messages.forEach(m => m.isRead = true);
    eventBus.emit('mail:read', { unreadCount: 0 });
  }

  /**
   * Claim reward attachments from a mail.
   * @param {number} id
   * @param {import('./ResourceManager.js').ResourceManager} resourceManager
   * @returns {{ success: boolean, rewards?: object, reason?: string }}
   */
  claimRewards(id, resourceManager) {
    const msg = this._messages.find(m => m.id === id);
    if (!msg) return { success: false, reason: 'Message not found.' };
    if (!msg.attachments) return { success: false, reason: 'No attachments.' };
    if (msg.rewardsClaimed) return { success: false, reason: 'Rewards already claimed.' };

    // Filter out non-resource keys like XP (handled elsewhere)
    const resourceRewards = {};
    for (const [k, v] of Object.entries(msg.attachments)) {
      if (k !== 'xp') resourceRewards[k] = v;
    }

    resourceManager.add(resourceRewards);
    msg.rewardsClaimed = true;
    eventBus.emit('mail:rewardsClaimed', { id, rewards: resourceRewards });
    return { success: true, rewards: resourceRewards };
  }

  delete(id) {
    this._messages = this._messages.filter(m => m.id !== id);
    eventBus.emit('mail:deleted', { unreadCount: this.getUnreadCount() });
  }

  getMessages() { return [...this._messages]; }
  getUnreadCount() { return this._messages.filter(m => !m.isRead).length; }

  update(dt) { /* No tick needed */ }

  serialize() { return { messages: this._messages, nextId: this._nextId }; }

  deserialize(data) {
    if (!data) return;
    this._messages = data.messages ?? [];
    this._nextId = data.nextId ?? this._messages.length + 1;
    eventBus.emit('mail:received', { unreadCount: this.getUnreadCount() });
  }
}
