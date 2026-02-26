/**
 * Entity.js
 * Base class for all game domain objects.
 * Provides a unique ID and common serialization support.
 */
let _idCounter = 0;

export class Entity {
  /**
   * @param {string} type - e.g. 'building', 'unit', 'hero'
   */
  constructor(type) {
    this.id = `${type}_${++_idCounter}_${Date.now()}`;
    this.type = type;
    this.createdAt = Date.now();
  }

  /**
   * Serialize to a plain object for saving.
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      createdAt: this.createdAt,
    };
  }
}
