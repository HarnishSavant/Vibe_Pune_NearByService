/**
 * VibePune — insights-page.js
 * ===========================
 * Dedicated Controller for /insights.html
 * Fetches real spatial statistics from /api/analytics endpoints:
 * Summary, Concentric Walking Accessibility Buffers, and Hotspot Density.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const PRESETS = {
    default:     { lat: 18.5204, lon: 73.8567, name: 'Shivajinagar' },
    koregaon:    { lat: 18.5362, lon: 73.8936, name: 'Koregaon Park' },
    fcroad:      { lat: 18.5274, lon: 73.8412, name: 'FC Road' },
    viman_nagar: { lat: 18.5679, lon: 73.9143, name: 'Viman Nagar' },
    kothrud:     { lat: 18.5074, lon: 73.8077, name: 'Kothrud' },
    hinjewadi:   { lat: 18.5912, lon: 73.7389, name: 'Hinjewadi' }
  };

  let activePreset = PRESETS.default;
  let miniMap = null;
  let circlesLayer = null;

  // DOM Elements
  const elCategoryBars = document.getElementById('category-bars-container');
  const elDensityRows = document.getElementById('density-table-rows');
  const elDensityCatSelect = document.getElementById('density-cat-select');
  const elAccessibilityGrid = document.getElementById('accessibility-cards-grid');
  const elPresetSelect = document.getElementById('accessibility-preset-select');

  // Initialize
  initMiniMap();
  loadSummary();
  loadAccessibility();
  loadDensity();

  if (elPresetSelect) {
    elPresetSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (PRESETS[key]) {
        activePreset = PRESETS[key];
        loadAccessibility();
        updateMiniMap();
      }
    });
  }

  if (elDensityCatSelect) {
    elDensityCatSelect.addEventListener('change', () => {
      loadDensity();
    });
  }

  // ------------------------------------------------------------------
  // 1. Analytics Summary (Category Composition)
  // ------------------------------------------------------------------
  async function loadSummary() {
    try {
      const summary = await VibePuneAPI.getAnalyticsSummary();
      if (!elCategoryBars || !summary.top_categories) return;

      elCategoryBars.innerHTML = '';
      const maxCount = summary.top_categories[0] ? summary.top_categories[0].count : 1;

      summary.top_categories.slice(0, 8).forEach(c => {
        const pct = Math.round((c.count / maxCount) * 100);
        const item = document.createElement('div');
        item.className = 'category-bar-item';
        item.innerHTML = `
          <div class="category-bar-header">
            <span>${escapeHtml(c.category.replace(/-/g, ' ').toUpperCase())}</span>
            <span style="font-family:var(--font-mono); color:var(--text-muted);">${c.count.toLocaleString()} spots</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${pct}%;"></div>
          </div>
        `;
        elCategoryBars.appendChild(item);
      });
    } catch (err) {
      console.warn('[InsightsPage] Summary load failed:', err);
      if (elCategoryBars) elCategoryBars.innerHTML = '<p style="color:var(--text-muted);">Analytics summary unavailable.</p>';
    }
  }

  // ------------------------------------------------------------------
  // 2. Accessibility Concentric Buffers
  // ------------------------------------------------------------------
  async function loadAccessibility() {
    if (!elAccessibilityGrid) return;
    elAccessibilityGrid.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Computing PostGIS concentric buffer decay...</div>';

    try {
      const res = await VibePuneAPI.getAccessibility(activePreset.lat, activePreset.lon);
      elAccessibilityGrid.innerHTML = '';

      const radii = ['500m', '1000m', '3000m', '5000m'];
      radii.forEach(k => {
        const metric = res.radii_metrics ? res.radii_metrics[k] : null;
        if (!metric) return;

        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '20px';

        const pills = Object.entries(metric.category_breakdown || {})
          .slice(0, 4)
          .map(([cat, cnt]) => `<span class="badge badge--dark" style="font-size:11px;">${escapeHtml(cat)}: ${cnt}</span>`)
          .join(' ');

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="font-size:1.1rem; font-weight:var(--weight-bold);">${metric.radius_km} km Buffer</h4>
            <span class="badge badge--lime">~${metric.walk_time_est_min}m Walk</span>
          </div>
          <div style="font-size:1.8rem; font-weight:var(--weight-black); color:var(--primary); margin:12px 0 4px;">
            ${metric.total_places.toLocaleString()} <span style="font-size:13px; font-weight:var(--weight-normal); color:var(--text-muted);">places reachable</span>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">${pills}</div>
        `;

        elAccessibilityGrid.appendChild(card);
      });
    } catch (err) {
      console.warn('[InsightsPage] Accessibility load failed:', err);
      elAccessibilityGrid.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Accessibility analysis unavailable.</p>';
    }
  }

  // ------------------------------------------------------------------
  // 3. Hotspot Density Table
  // ------------------------------------------------------------------
  async function loadDensity() {
    const cat = elDensityCatSelect ? elDensityCatSelect.value : 'all';
    try {
      const res = await VibePuneAPI.getCategoryDensity(cat);
      if (!elDensityRows || !res.neighbourhoods) return;

      elDensityRows.innerHTML = '';
      res.neighbourhoods.forEach(nb => {
        const tr = document.createElement('tr');
        const tierBadge = nb.count >= 200
          ? '<span class="badge badge--primary">🔥 High Density</span>'
          : (nb.count >= 80 ? '<span class="badge badge--aqua">✨ Moderate</span>' : '<span class="badge badge--dark">Suburban</span>');

        tr.innerHTML = `
          <td><strong>${escapeHtml(nb.neighbourhood)}</strong></td>
          <td style="font-family:var(--font-mono);">${nb.count.toLocaleString()}</td>
          <td>${tierBadge}</td>
        `;
        elDensityRows.appendChild(tr);
      });
    } catch (err) {
      console.warn('[InsightsPage] Density load failed:', err);
    }
  }

  // ------------------------------------------------------------------
  // 4. Interactive Mini Map
  // ------------------------------------------------------------------
  function initMiniMap() {
    const mapEl = document.getElementById('mini-map');
    if (!mapEl || typeof L === 'undefined') return;

    miniMap = L.map('mini-map', {
      center: [activePreset.lat, activePreset.lon],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    const tileAttr = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, &copy; CARTO'
      : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, HOT';

    L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd', attribution: tileAttr }).addTo(miniMap);
    circlesLayer = L.layerGroup().addTo(miniMap);

    updateMiniMap();
  }

  function updateMiniMap() {
    if (!miniMap || !circlesLayer) return;
    circlesLayer.clearLayers();

    miniMap.flyTo([activePreset.lat, activePreset.lon], 13, { duration: 0.8 });

    // Center marker
    L.circleMarker([activePreset.lat, activePreset.lon], {
      radius: 8,
      fillColor: '#ff2a6d',
      fillOpacity: 1,
      color: '#ffffff',
      weight: 3
    }).addTo(circlesLayer);

    // Concentric buffer rings: 500m, 1000m, 3000m
    const rings = [
      { r: 500, color: '#ff2a6d', opacity: 0.15 },
      { r: 1000, color: '#7928ca', opacity: 0.10 },
      { r: 3000, color: '#00c9db', opacity: 0.05 },
    ];

    rings.forEach(ring => {
      L.circle([activePreset.lat, activePreset.lon], {
        radius: ring.r,
        fillColor: ring.color,
        fillOpacity: ring.opacity,
        color: ring.color,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(circlesLayer);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
