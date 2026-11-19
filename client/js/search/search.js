/**
 * VibePune — search/search.js
 * =============================
 * Search input handling, clear button, and debouncing.
 */

'use strict';

const VibePuneSearch = (() => {
  const cfg = window.VibePuneConfig.SEARCH;

  const elSearchInput = document.getElementById('search-input');
  const elClearBtn = document.getElementById('search-clear-btn');
  
  let _onSearchCallback = null;
  let _debounceTimeout = null;

  /**
   * Initialise search input and clear button listeners.
   *
   * @param {function(string)} onSearchQueryChange - Callback with search query
   */
  function init(onSearchQueryChange) {
    _onSearchCallback = onSearchQueryChange;

    if (elSearchInput) {
      elSearchInput.addEventListener('input', () => {
        const query = elSearchInput.value.trim();
        
        // Show/hide clear button
        if (query.length > 0) {
          elClearBtn?.classList.remove('visually-hidden');
        } else {
          elClearBtn?.classList.add('visually-hidden');
        }

        // Debounce search execution
        clearTimeout(_debounceTimeout);
        _debounceTimeout = setTimeout(() => {
          if (_onSearchCallback) {
            _onSearchCallback(query);
          }
        }, cfg.debounceMs);
      });
    }

    if (elClearBtn) {
      elClearBtn.addEventListener('click', () => {
        if (elSearchInput) {
          elSearchInput.value = '';
        }
        elClearBtn.classList.add('visually-hidden');
        
        clearTimeout(_debounceTimeout);
        if (_onSearchCallback) {
          _onSearchCallback('');
        }
      });
    }

    console.info('[VibePuneSearch] Search input initialised with debouncing.');
  }

  function getValue() {
    return elSearchInput ? elSearchInput.value.trim() : '';
  }

  function clear() {
    if (elSearchInput) {
      elSearchInput.value = '';
    }
    if (elClearBtn) {
      elClearBtn.classList.add('visually-hidden');
    }
  }

  return { init, getValue, clear };
})();

window.VibePuneSearch = VibePuneSearch;

// Backward-compat alias
window.GeoFindSearch = VibePuneSearch;
