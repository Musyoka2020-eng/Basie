/**
 * StoryManager.js
 * Manages the game's linear story chapter system.
 *
 * Chapters are triggered by in-game events:
 *   - 'start'            — first game load
 *   - 'quest_completed'  — a specific quest finishes
 *   - 'building_level'   — a building reaches a specific level
 *   - 'player_level'     — commander reaches a specific level
 *
 * When a chapter triggers, emits 'story:chapter_triggered' with the full
 * chapter object. UIManager subscribes and shows the dialogue modal.
 */
import { eventBus }        from '../core/EventBus.js';
import { STORY_CHAPTERS }  from '../entities/GAME_DATA.js';

export class StoryManager {
  constructor() {
    this.name = 'StoryManager';

    /** @type {Set<string>} IDs of chapters already triggered */
    this._completedChapters = new Set();

    /** @type {Array<{ chapter: object, completedAt: number }>} ordered log */
    this._chapterLog = [];

    this._registerEvents();
  }

  _registerEvents() {
    // 'story:start' is emitted by main.js after load
    eventBus.on('story:start',       ()  => this._checkTriggers({ type: 'start' }));
    eventBus.on('quest:completed',   d   => this._checkTriggers({ type: 'quest_completed',  questId:    d.id }));
    eventBus.on('building:completed', d  => this._checkTriggers({ type: 'building_level',   buildingId: d.id,    level: d.building?.level ?? 0 }));
    eventBus.on('user:levelUp',      d   => this._checkTriggers({ type: 'player_level',     level:      d?.level ?? 0 }));
  }

  /**
   * Check all pending chapters to see if any trigger condition matches the event.
   * @param {{ type: string, [key: string]: any }} event
   */
  _checkTriggers(event) {
    for (const chapter of STORY_CHAPTERS) {
      if (this._completedChapters.has(chapter.id)) continue;
      if (this._matchesTrigger(chapter.triggerCondition, event)) {
        this._triggerChapter(chapter);
      }
    }
  }

  /**
   * Test whether a chapter's triggerCondition matches the current event.
   * @private
   */
  _matchesTrigger(condition, event) {
    if (!condition || condition.type !== event.type) return false;
    switch (condition.type) {
      case 'start':
        return true;
      case 'quest_completed':
        return condition.questId === event.questId;
      case 'building_level':
        return condition.buildingId === event.buildingId && event.level >= condition.level;
      case 'player_level':
        return event.level >= condition.level;
      default:
        return false;
    }
  }

  /**
   * Mark chapter as triggered, log it, and notify the UI.
   * @private
   */
  _triggerChapter(chapter) {
    this._completedChapters.add(chapter.id);
    const entry = { chapter, completedAt: Date.now() };
    this._chapterLog.push(entry);
    eventBus.emit('story:chapter_triggered', chapter);
  }

  /** Returns the full ordered chapter log for the Story Log UI. */
  getChapterLog() {
    return [...this._chapterLog];
  }

  /** Returns chapters not yet triggered (for "upcoming" display). */
  getPendingChapters() {
    return STORY_CHAPTERS.filter(c => !this._completedChapters.has(c.id));
  }

  /** No per-tick logic needed — fully event-driven. */
  update(_dt) {}

  // ─────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────

  serialize() {
    return {
      completedChapters: [...this._completedChapters],
      chapterLog:        this._chapterLog,
    };
  }

  deserialize(data) {
    if (!data) return;
    this._completedChapters = new Set(data.completedChapters ?? []);
    this._chapterLog        = data.chapterLog ?? [];
  }
}
