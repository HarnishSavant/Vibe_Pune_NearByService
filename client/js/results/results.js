/**
 * VibePune — results/results.js
 * ================================
 * Renders nearby place/event cards in the sidebar list.
 */

'use strict';

const VibePuneResults = (() => {
  const elResultsList = document.getElementById('results-list');
  const elResultsEmpty = document.getElementById('results-empty');

  let _onCardClickCallback = null;

  /**
   * Initialise the results module.
   *
   * @param {function(string)} onCardClick - Callback with place ID when card is clicked
   */
  function init(onCardClick) {
    _onCardClickCallback = onCardClick;
    clear();
  }

  /**
   * Render the results array in the sidebar.
   *
   * @param {Array} items - Array of place/POI objects
   */
  function render(items) {
    if (!elResultsList) return;

    // Reset list
    elResultsList.innerHTML = '';

    if (!items || items.length === 0) {
      if (elResultsEmpty) {
        elResultsEmpty.style.display = 'block';
        elResultsEmpty.innerHTML = `
          <div class="results-empty__icon" aria-hidden="true">🔍</div>
          <p>No places found within the discovery area.</p>
          <p class="results-empty__sub">Try increasing the radius or selecting a different vibe.</p>
        `;
      }
      return;
    }

    // Hide empty placeholder
    if (elResultsEmpty) {
      elResultsEmpty.style.display = 'none';
    }

    // Append item cards
    items.forEach((item, index) => {
      const formattedDistance = item.distance_m >= 1000 
        ? `${(item.distance_m / 1000).toFixed(2)} km` 
        : `${item.distance_m} m`;

      const card = document.createElement('article');
      card.className = 'result-card animate-fade-in-up';
      card.style.animationDelay = `${index * 40}ms`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${item.name}, ${formattedDistance} away`);

      card.innerHTML = `
        <h3 class="result-card__name">${item.name}</h3>
        <div class="result-card__meta">
          <span class="result-card__distance">${formattedDistance}</span>
          <span class="result-card__category">${item.categoryName || item.category}</span>
        </div>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--color-text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${item.address}
        </p>
      `;

      card.addEventListener('click', () => {
        if (_onCardClickCallback) {
          _onCardClickCallback(item.id);
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      elResultsList.appendChild(card);
    });
  }

  /**
   * Clear the results sidebar and show default empty state.
   */
  function clear() {
    if (elResultsList) {
      elResultsList.innerHTML = '';
    }
    if (elResultsEmpty) {
      elResultsEmpty.style.display = 'block';
      elResultsEmpty.innerHTML = `
        <div class="results-empty__icon" aria-hidden="true">🎯</div>
        <p>Select a vibe or search to discover places nearby.</p>
        <p class="results-empty__sub">
          <span class="badge badge--phase">Phase 3</span>
          Showing real Pune POIs
        </p>
      `;
    }
  }

  return { init, render, clear };
})();

window.VibePuneResults = VibePuneResults;

// Backward-compat alias
window.GeoFindResults = VibePuneResults;
