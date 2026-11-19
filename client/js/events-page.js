/**
 * VibePune — events-page.js
 * =========================
 * Dedicated Events View Controller for /events.html
 * Handles timeframe filter switching, API requests to /api/events,
 * card rendering, and map deep links.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  let activeTimeframe = 'all';
  const refLocation = { lat: 18.5204, lon: 73.8567 };

  const elEventsGrid = document.getElementById('events-grid');
  const elLoading = document.getElementById('events-loading');
  const pills = document.querySelectorAll('.event-filter-pill');

  // Bind filter pills
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => {
        p.classList.remove('is-selected', 'btn--primary');
        p.classList.add('btn--secondary');
      });
      pill.classList.add('is-selected', 'btn--primary');
      pill.classList.remove('btn--secondary');

      activeTimeframe = pill.getAttribute('data-timeframe') || 'all';
      loadEvents();
    });
  });

  async function loadEvents() {
    if (elLoading) elLoading.classList.remove('hidden');
    if (elEventsGrid) elEventsGrid.innerHTML = '';

    try {
      const res = await VibePuneAPI.getEvents({
        timeframe: activeTimeframe === 'all' ? null : activeTimeframe,
        ref_lat: refLocation.lat,
        ref_lon: refLocation.lon,
      });

      if (elLoading) elLoading.classList.add('hidden');
      renderEvents(res.events || []);
    } catch (err) {
      console.warn('[EventsPage] Failed to fetch events:', err);
      if (elLoading) elLoading.classList.add('hidden');
      if (elEventsGrid) {
        elEventsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding: 40px 20px;">
            <p style="color:var(--text-secondary); font-size:1.1rem;">Could not load live events. Please ensure backend server is running.</p>
          </div>
        `;
      }
    }
  }

  function renderEvents(events) {
    if (!elEventsGrid) return;
    elEventsGrid.innerHTML = '';

    if (!events.length) {
      elEventsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 60px 20px;">
          <span style="font-size:3rem; display:block; margin-bottom:12px;">🎟️</span>
          <h3 style="font-size:1.3rem; font-weight:var(--weight-bold);">No events scheduled for this timeframe</h3>
          <p style="color:var(--text-secondary); font-size:14px; margin-top:6px;">Try switching to "All Upcoming" to explore the full cultural schedule.</p>
        </div>
      `;
      return;
    }

    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-item-card';

      const distStr = ev.distance_m
        ? (ev.distance_m >= 1000 ? `${(ev.distance_m / 1000).toFixed(1)} km away` : `${Math.round(ev.distance_m)} m away`)
        : '';

      const timeLabel = ev.timeframe_label || 'Upcoming';
      const sourceTag = ev.source === 'academic_curation'
        ? 'Curated Academic Demo Record'
        : 'Verified Cultural Event';

      card.innerHTML = `
        <span class="event-item-card__date-pill">${escapeHtml(timeLabel)}</span>
        <h3 class="event-item-card__title">${escapeHtml(ev.name)}</h3>
        <div class="event-item-card__meta">
          <span>📍 <strong>${escapeHtml(ev.venue || 'Pune Venue')}</strong> ${distStr ? `• ${distStr}` : ''}</span>
          <span>⏰ <strong>Time:</strong> ${escapeHtml(ev.start_time || 'Schedule announced on booking')}</span>
          ${ev.price ? `<span>🎟️ <strong>Pricing:</strong> ${escapeHtml(ev.price)}</span>` : ''}
        </div>
        <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(ev.description || '')}</p>
        <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding-top:14px; border-top:1px solid var(--border-subtle);">
          <span class="event-source-badge">🏷️ ${escapeHtml(sourceTag)}</span>
          <div style="display:flex; gap:8px;">
            <a href="discover.html?event=${ev.id}" class="btn btn--primary btn--sm">
              <span>Map View</span> 🗺️
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${ev.latitude},${ev.longitude}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary btn--sm">
              🧭
            </a>
          </div>
        </div>
      `;

      elEventsGrid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initial load
  loadEvents();
});
