/**
 * VibePune — saved-page.js
 * ========================
 * Dedicated Controller for /saved.html
 * Manages localStorage saved places collection, rendering, removal,
 * export, and deep navigation to /discover.html?place={id}.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY_SAVED = 'vibepune_saved_places';

  const elSavedGrid = document.getElementById('saved-grid');
  const elEmptyState = document.getElementById('saved-empty-state');
  const elCountLabel = document.getElementById('saved-count-label');
  const elToolbar = document.getElementById('saved-actions-toolbar');
  const elBtnClear = document.getElementById('btn-clear-saved');
  const elBtnExport = document.getElementById('btn-export-saved');

  function getSavedPlaces() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setSavedPlaces(list) {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(list));
      if (window.VibePuneNav && typeof window.VibePuneNav.updateSavedBadge === 'function') {
        window.VibePuneNav.updateSavedBadge();
      }
    } catch (e) {}
  }

  function renderSaved() {
    const list = getSavedPlaces();

    if (elCountLabel) {
      elCountLabel.textContent = `You have ${list.length} bookmarked spot${list.length === 1 ? '' : 's'} stored in local memory.`;
    }

    if (!list.length) {
      if (elSavedGrid) elSavedGrid.innerHTML = '';
      if (elToolbar) elToolbar.classList.add('hidden');
      if (elEmptyState) elEmptyState.classList.remove('hidden');
      return;
    }

    if (elEmptyState) elEmptyState.classList.add('hidden');
    if (elToolbar) elToolbar.classList.remove('hidden');
    if (!elSavedGrid) return;
    elSavedGrid.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.padding = '24px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '14px';

      const catName = item.categoryName || item.category || 'Spot';
      const address = item.address || 'Pune, Maharashtra';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <span class="badge badge--primary" style="font-size:11px; margin-bottom:6px;">${escapeHtml(catName)}</span>
            <h3 style="font-size:1.25rem; font-weight:var(--weight-bold);">${escapeHtml(item.name || 'Unnamed Place')}</h3>
          </div>
          <button class="header-icon-btn btn-remove-saved" data-id="${item.id}" title="Remove from saved" style="width:32px; height:32px; flex-shrink:0;">
            ✕
          </button>
        </div>
        <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">📍 ${escapeHtml(address)}</p>
        <div style="display:flex; gap:10px; margin-top:auto; padding-top:12px; border-top:1px solid var(--border-subtle);">
          <a href="discover.html?place=${item.id}" class="btn btn--primary btn--sm" style="flex:1;">
            <span>View on Map</span> 🗺️
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary btn--sm" title="Directions">
            🧭
          </a>
        </div>
      `;

      // Remove handler
      card.querySelector('.btn-remove-saved').addEventListener('click', () => {
        removePlace(item.id);
      });

      elSavedGrid.appendChild(card);
    });
  }

  function removePlace(id) {
    let list = getSavedPlaces();
    list = list.filter(item => String(item.id || item) !== String(id));
    setSavedPlaces(list);
    renderSaved();
  }

  if (elBtnClear) {
    elBtnClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved places?')) {
        setSavedPlaces([]);
        renderSaved();
      }
    });
  }

  if (elBtnExport) {
    elBtnExport.addEventListener('click', () => {
      const list = getSavedPlaces();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibepune-saved-places-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initial render
  renderSaved();
});
