/**
 * uiUtils.js
 * Shared display constants and utilities used across all UI controllers.
 */

export const RES_META = {
  gold:  { icon: '💰', label: 'Gold'  },
  wood:  { icon: '🪵', label: 'Wood'  },
  stone: { icon: '🪨', label: 'Stone' },
  food:  { icon: '🌾', label: 'Food'  },
  mana:  { icon: '💎', label: 'Mana'  },
  xp:    { icon: '✨', label: 'XP'    },
};

/**
 * Format a number with K/M abbreviations.
 * @param {number} n
 * @returns {string}
 */
export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000)    return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Populate and show the shared modal overlay.
 * Wires the backdrop-click and .modal-close button to close automatically.
 * @param {string} html
 * @param {Function} onClose - called when the modal is closed
 */
export function openModal(html, onClose = () => {}) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;
  content.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(onClose); }, { once: true });
  content.querySelector('.modal-close')?.addEventListener('click', () => closeModal(onClose));
}

/**
 * Hide the shared modal overlay and clear its contents.
 * @param {Function} onClose
 */
export function closeModal(onClose = () => {}) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (overlay) overlay.classList.add('hidden');
  if (content) content.innerHTML = '';
  onClose();
}
