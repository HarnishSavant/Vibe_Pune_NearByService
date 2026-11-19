/**
 * VibePune — favorites/favorites.js
 * ====================================
 * Saved favourites management using localStorage.
 * Full implementation: Phase 3.
 */

'use strict';

const VibePuneFavorites = (() => {
  console.info('[VibePuneFavorites] Module loaded. Full implementation: Phase 3.');

  const STORAGE_KEY = 'vibepune_favorites';

  return {
    init() {},
    /**
     * @returns {string[]} Array of saved place IDs
     */
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    },
    isFavorite(id) { return this.getAll().includes(id); },
    add(id) {
      const list = this.getAll();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    },
    remove(id) {
      const list = this.getAll().filter(i => i !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    },
  };
})();

window.VibePuneFavorites = VibePuneFavorites;

// Backward-compat alias
window.GeoFindFavorites = VibePuneFavorites;
