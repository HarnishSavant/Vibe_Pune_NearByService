/**
 * VibePune — map/map.js
 * ======================
 * Leaflet map initialisation, markers, popups, routing, and WMS layers.
 */

'use strict';

const VibePuneMap = (() => {
  const cfg = window.VibePuneConfig.MAP;

  let _map = null;
  let _tileLayer = null;
  let _radiusCircle = null;
  let _locationMarker = null;
  let _poiLayerGroup = null;
  let _routePolyline = null;
  let _studyAreaLayer = null;
  let _poisWmsLayer = null;
  let _pmcBoundaryLayer = null;
  let _pcmcBoundaryLayer = null;
  let _studyAreaBoundaryLayer = null;
  let _eventsLayerGroup = null;
  let _densityLayerGroup = null;
  let _onMapClickCallback = null;
  let _onMarkerClickCallback = null;
  let _onDirectionsClickCallback = null;
  let _onSaveClickCallback = null;
  let _isSavedChecker = null;
  let _lastPois = [];

  const CATEGORY_EMOJIS = {
    'aesthetic-cafe': '☕', cafe: '☕',
    dining: '🍽️', restaurant: '🍽️', dessert: '🍰',
    'fast-food': '🍟', nightlife: '🌙', bar: '🍸',
    nature: '🌿', park: '🌳',
    fitness: '🏋️', sports: '⚽',
    shopping: '🛍️', hotel: '🏨', hostel: '🎒',
    gallery: '🖼️', museum: '🏛️', arts: '🎨',
    library: '📚', movies: '🎬', theatre: '🎭',
    worship: '🛕', viewpoint: '🔭',
  };

  // ----- Tile Layer URLs (100% Free, Reliable, No Watermark, No API Key Required) -----
  // Primary: OpenStreetMap Standard
  const OSM_STANDARD   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_ATTR       = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

  // Aesthetic Editorial: Humanitarian OpenStreetMap (Vibrant colors, great for places & cafes)
  const OSM_HOT        = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
  const OSM_HOT_ATTR   = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Tiles &copy; <a href="https://www.hotosm.org/" target="_blank">HOT</a>';

  // Dark Mode: CartoDB Dark Matter (High detail road and building network, supports zoom up to 20 without missing tile errors)
  const CARTO_DARK     = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const CARTO_DARK_ATTR= '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>';

  // Fallback Esri Dark (max native zoom 16)
  const ESRI_DARK      = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const ESRI_DARK_ATTR = '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';

  // Clean Light: Esri World Light Gray Canvas
  const ESRI_LIGHT     = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const ESRI_LIGHT_ATTR= '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';

  const CATEGORY_COLORS = {
    'aesthetic-cafe': '#ff2a6d', cafe: '#ff2a6d',
    dining: '#ff6b00', restaurant: '#ff6b00', fast_food: '#ff7700', bakery: '#f59e0b', dessert: '#f43f5e',
    nightlife: '#7928ca', bar: '#8b5cf6', pub: '#8b5cf6', party: '#ec4899',
    nature: '#10b981', park: '#10b981', garden: '#10b981', viewpoint: '#06b6d4',
    fitness: '#b8e600', sports: '#84cc16', swimming: '#0ea5e9',
    shopping: '#00c9db', mall: '#00c9db', clothes: '#06b6d4', supermarket: '#0284c7',
    hotel: '#6366f1', hostel: '#6366f1',
    heritage: '#f59e0b', monument: '#f59e0b', memorial: '#d97706', worship: '#eab308',
    gallery: '#ec4899', museum: '#d946ef', arts: '#a855f7',
    library: '#3b82f6', movies: '#8b5cf6', theatre: '#a855f7',
    transport: '#38bdf8', 'bus-stop': '#38bdf8', 'railway-station': '#2563eb',
    hospital: '#ef4444', clinic: '#ef4444', pharmacy: '#10b981', police: '#1e3a8a'
  };

  function getEmoji(cat) { return CATEGORY_EMOJIS[cat] || '📍'; }
  function getCategoryColor(cat) { return CATEGORY_COLORS[cat] || '#ff2a6d'; }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  function init(containerId = 'map') {
    if (_map) return _map;

    _map = L.map(containerId, {
      center: [cfg.defaultLat, cfg.defaultLon],
      zoom: cfg.defaultZoom,
      minZoom: cfg.minZoom,
      maxZoom: cfg.maxZoom,
      zoomControl: true,
      attributionControl: true,
    });

    _map.zoomControl.setPosition('bottomright');

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const initialTileUrl  = isDark ? CARTO_DARK : OSM_HOT;
    const initialAttr     = isDark ? CARTO_DARK_ATTR : OSM_HOT_ATTR;

    _tileLayer = L.tileLayer(initialTileUrl, {
      attribution: initialAttr,
      subdomains: 'abcd',
      maxZoom: cfg.maxZoom,
      crossOrigin: true,
    }).addTo(_map);

    // MarkerCluster with custom cluster styling
    if (L.markerClusterGroup) {
      _poiLayerGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          let sizeClass = 'cluster--small';
          let diameter = 44;
          if (count >= 50) {
            sizeClass = 'cluster--large';
            diameter = 56;
          } else if (count >= 15) {
            sizeClass = 'cluster--medium';
            diameter = 50;
          }

          return L.divIcon({
            html: `
              <div class="vibe-cluster ${sizeClass}" title="${count} places — click to expand">
                <div class="vibe-cluster__pulse"></div>
                <div class="vibe-cluster__core">
                  <span class="vibe-cluster__count">${count}</span>
                  <span class="vibe-cluster__label">places</span>
                </div>
              </div>
            `,
            className: 'vibe-cluster-container',
            iconSize: [diameter, diameter],
            iconAnchor: [diameter / 2, diameter / 2]
          });
        }
      }).addTo(_map);
    } else {
      _poiLayerGroup = L.layerGroup().addTo(_map);
    }

    // Events Layer & Density Layers (Phase 7 & 8)
    _eventsLayerGroup = L.layerGroup().addTo(_map);
    _densityLayerGroup = L.layerGroup().addTo(_map);

    // GeoServer WMS (optional)
    try {
      _studyAreaLayer = L.tileLayer.wms('http://localhost:8085/geoserver/vibepune/wms', {
        layers: 'vibepune:pune_boundary',
        format: 'image/png',
        transparent: true,
        opacity: 0.6,
        zIndex: 10
      });

      _poisWmsLayer = L.tileLayer.wms('http://localhost:8085/geoserver/vibepune/wms', {
        layers: 'vibepune:places',
        format: 'image/png',
        transparent: true,
        zIndex: 15
      });
    } catch (e) {
      console.warn('[VibePuneMap] GeoServer WMS layers unavailable.');
    }

    // Municipal Boundaries (PMC + PCMC + Combined Study Area)
    _pmcBoundaryLayer = L.geoJSON(null, {
      style: {
        color: '#2563EB',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#3B82F6',
        fillOpacity: 0.08
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip('<strong>Pune Municipal Corporation (PMC)</strong><br>Area: ~251 km²', { sticky: true });
      }
    }).addTo(_map);

    _pcmcBoundaryLayer = L.geoJSON(null, {
      style: {
        color: '#D97706',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#F59E0B',
        fillOpacity: 0.08
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip('<strong>Pimpri-Chinchwad Municipal Corp (PCMC)</strong><br>Area: ~177 km²', { sticky: true });
      }
    }).addTo(_map);

    _studyAreaBoundaryLayer = L.geoJSON(null, {
      style: {
        color: '#7C3AED',
        weight: 2,
        dashArray: '6, 6',
        fill: false
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip('<strong>Combined Study Area (PMC + PCMC)</strong><br>Area: ~427 km²', { sticky: true });
      }
    });

    // Fetch and populate boundary GeoJSON
    const boundaryApiUrl = (cfg && cfg.API && cfg.API.baseUrl) ? `${cfg.API.baseUrl}/boundaries` : 'http://localhost:8000/api/boundaries';
    fetch(boundaryApiUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          data.features.forEach(f => {
            if (f.properties && f.properties.short_name === 'PMC') {
              _pmcBoundaryLayer.addData(f);
            } else if (f.properties && f.properties.short_name === 'PCMC') {
              _pcmcBoundaryLayer.addData(f);
            }
          });
        }
      })
      .catch(e => console.warn('[VibePuneMap] Failed loading boundaries from API:', e));

    fetch(`${boundaryApiUrl}/study-area`)
      .then(res => res.json())
      .then(feature => {
        if (feature) _studyAreaBoundaryLayer.addData(feature);
      })
      .catch(e => console.warn('[VibePuneMap] Failed loading study area from API:', e));

    // Boundary Legend Control
    const boundaryLegend = L.control({ position: 'bottomleft' });
    boundaryLegend.onAdd = function() {
      const div = L.DomUtil.create('div', 'boundary-legend-box');
      div.style.background = 'rgba(15, 23, 42, 0.85)';
      div.style.backdropFilter = 'blur(8px)';
      div.style.padding = '8px 12px';
      div.style.borderRadius = '8px';
      div.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      div.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      div.style.pointerEvents = 'auto';
      div.style.zIndex = '1000';
      div.innerHTML = `
        <div style="font-weight:700;font-size:0.75rem;margin-bottom:6px;letter-spacing:0.04em;text-transform:uppercase;color:#f8fafc;">Study Area</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:0.75rem;margin-bottom:4px;color:#e2e8f0;">
          <span style="display:inline-block;width:14px;height:14px;border:2px solid #2563EB;background:rgba(59,130,246,0.3);border-radius:3px;"></span>
          <span>PMC (Pune) ~251 km²</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:0.75rem;color:#e2e8f0;">
          <span style="display:inline-block;width:14px;height:14px;border:2px solid #D97706;background:rgba(245,158,11,0.3);border-radius:3px;"></span>
          <span>PCMC ~177 km²</span>
        </div>
      `;
      return div;
    };
    boundaryLegend.addTo(_map);

    // Layer Control
    const baseMaps = {
      "CartoDB Dark Matter (High Detail)": _tileLayer,
      "OpenStreetMap (Vibrant HOT)": L.tileLayer(OSM_HOT, { attribution: OSM_HOT_ATTR, maxZoom: cfg.maxZoom }),
      "OpenStreetMap (Standard)": L.tileLayer(OSM_STANDARD, { attribution: OSM_ATTR, maxZoom: cfg.maxZoom }),
      "Esri Clean Light": L.tileLayer(ESRI_LIGHT, { attribution: ESRI_LIGHT_ATTR, maxZoom: 19, maxNativeZoom: 16 }),
      "Esri Dark Canvas": L.tileLayer(ESRI_DARK, { attribution: ESRI_DARK_ATTR, maxZoom: 19, maxNativeZoom: 16 })
    };
    const overlayMaps = {
      "Interactive POIs": _poiLayerGroup,
      "PMC Boundary (Pune)": _pmcBoundaryLayer,
      "PCMC Boundary (Pimpri-Chinchwad)": _pcmcBoundaryLayer,
      "Combined Study Area": _studyAreaBoundaryLayer,
      "Upcoming Events": _eventsLayerGroup,
      "Density Hotspots": _densityLayerGroup
    };
    if (_studyAreaLayer) overlayMaps["Pune Boundary (WMS)"] = _studyAreaLayer;
    if (_poisWmsLayer) overlayMaps["POI Heatmap (WMS)"] = _poisWmsLayer;
    L.control.layers(baseMaps, overlayMaps, { position: 'topright', collapsed: true }).addTo(_map);


    _map.on('click', (e) => {
      if (_onMapClickCallback) _onMapClickCallback(e.latlng.lat, e.latlng.lng);
    });

    // Handle preview popup action buttons (View Details, Directions, Save)
    _map.on('popupopen', (e) => {
      const popupEl = e.popup.getElement();
      if (!popupEl) return;

      const detailsBtn = popupEl.querySelector('.btn-popup-details');
      if (detailsBtn) {
        detailsBtn.onclick = (evt) => {
          evt.stopPropagation();
          const poiId = parseInt(detailsBtn.getAttribute('data-poi-id'), 10);
          const poi = _lastPois.find(p => p.id === poiId);
          if (poi && _onMarkerClickCallback) {
            _onMarkerClickCallback(poi);
          }
        };
      }

      const dirBtn = popupEl.querySelector('.btn-popup-directions');
      if (dirBtn) {
        dirBtn.onclick = (evt) => {
          evt.stopPropagation();
          const poiId = parseInt(dirBtn.getAttribute('data-poi-id'), 10);
          const poi = _lastPois.find(p => p.id === poiId);
          if (poi && _onDirectionsClickCallback) {
            _onDirectionsClickCallback(poi);
          }
        };
      }

      const saveBtn = popupEl.querySelector('.btn-popup-save');
      if (saveBtn) {
        saveBtn.onclick = (evt) => {
          evt.stopPropagation();
          const poiId = parseInt(saveBtn.getAttribute('data-poi-id'), 10);
          const poi = _lastPois.find(p => p.id === poiId);
          if (poi && _onSaveClickCallback) {
            const isSaved = _onSaveClickCallback(poi);
            saveBtn.textContent = isSaved ? '❤️' : '🤍';
            saveBtn.title = isSaved ? 'Saved to favorites' : 'Save place';
            saveBtn.classList.toggle('is-saved', isSaved);
          }
        };
      }
    });

    console.info('[VibePuneMap] Leaflet map initialised. Centre: Pune', cfg.defaultLat, cfg.defaultLon);
    return _map;
  }

  function getMap() {
    return _map;
  }

  function setOnMapClickListener(cb) { _onMapClickCallback = cb; }
  function setOnDirectionsClickListener(cb) { _onDirectionsClickCallback = cb; }
  function setOnSaveClickListener(cb) { _onSaveClickCallback = cb; }
  function setIsSavedChecker(cb) { _isSavedChecker = cb; }

  function resetToDefault() {
    if (!_map) return;
    _map.flyTo([cfg.defaultLat, cfg.defaultLon], cfg.defaultZoom, { animate: true, duration: 0.8 });
  }

  // ------------------------------------------------------------------
  // Location marker
  // ------------------------------------------------------------------
  function setLocationMarker(lat, lon, label = 'Your location') {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px; height:14px;
        background: var(--accent, #ff5a5f);
        border-radius:50%;
        border:3px solid white;
        box-shadow: 0 0 0 2px var(--accent, #ff5a5f), 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (_locationMarker) {
      _locationMarker.setLatLng([lat, lon]);
    } else {
      _locationMarker = L.marker([lat, lon], { icon, zIndexOffset: 1000 })
        .bindPopup(`<strong>${label}</strong>`)
        .addTo(_map);
    }
  }

  // ------------------------------------------------------------------
  // Radius circle
  // ------------------------------------------------------------------
  function setRadiusCircle(lat, lon, radiusM) {
    if (_radiusCircle) {
      _radiusCircle.setLatLng([lat, lon]).setRadius(radiusM);
    } else {
      _radiusCircle = L.circle([lat, lon], {
        radius: radiusM,
        color: '#ff5a5f',
        weight: 1.5,
        opacity: 0.5,
        fillColor: '#ff5a5f',
        fillOpacity: 0.04,
        dashArray: '6 4',
      }).addTo(_map);
    }
  }

  function clearRadiusCircle() {
    if (_radiusCircle) { _radiusCircle.remove(); _radiusCircle = null; }
  }

  // ------------------------------------------------------------------
  // POI Markers
  // ------------------------------------------------------------------
  function renderPOIs(pois, onMarkerClick) {
    clearPOIs();
    clearRoute();
    _lastPois = pois || [];
    _onMarkerClickCallback = onMarkerClick;
    if (!pois || pois.length === 0) return;

    pois.forEach(poi => {
      const emoji = getEmoji(poi.category);
      const catColor = getCategoryColor(poi.category);
      const dist = poi.distance_m >= 1000
        ? `${(poi.distance_m / 1000).toFixed(1)} km`
        : `${poi.distance_m} m`;

      const isRec = Boolean(poi.isRecommended);
      const icon = L.divIcon({
        className: `vibe-marker-container ${isRec ? 'vibe-marker-recommended' : ''}`.trim(),
        html: `<div class="vibe-marker" style="--marker-color: ${catColor};" title="${escapeHtml(poi.name)}"><span class="vibe-marker__emoji">${emoji}</span></div>`,
        iconSize: isRec ? [38, 38] : [34, 34],
        iconAnchor: isRec ? [19, 38] : [17, 34],
        popupAnchor: [0, isRec ? -38 : -34]
      });

      const isSaved = _isSavedChecker ? _isSavedChecker(poi.id) : false;

      const popupContent = `
        <div class="vibe-preview-popup" data-poi-id="${poi.id}">
          <div class="vibe-preview-popup__banner">
            <span class="vibe-preview-popup__emoji">${emoji}</span>
            <span class="vibe-preview-popup__category">${escapeHtml(poi.categoryName || poi.category)}</span>
          </div>
          <div class="vibe-preview-popup__content">
            <h4 class="vibe-preview-popup__title">${escapeHtml(poi.name)}</h4>
            <div class="vibe-preview-popup__meta">
              <span class="vibe-preview-popup__distance">📍 ${dist} away</span>
            </div>
            ${poi.address ? `<p class="vibe-preview-popup__address">${escapeHtml(poi.address)}</p>` : ''}
            <div class="vibe-preview-popup__actions">
              <button class="vibe-popup-btn vibe-popup-btn--primary btn-popup-details" data-poi-id="${poi.id}" aria-label="View place details">
                View Details →
              </button>
              <button class="vibe-popup-btn btn-popup-directions" data-poi-id="${poi.id}" title="Directions" aria-label="Directions to place">
                🧭
              </button>
              <button class="vibe-popup-btn btn-popup-save ${isSaved ? 'is-saved' : ''}" data-poi-id="${poi.id}" title="${isSaved ? 'Saved' : 'Save'}" aria-label="Save to favorites">
                ${isSaved ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([poi.latitude, poi.longitude], { icon })
        .bindPopup(popupContent, { minWidth: 240, maxWidth: 280, closeButton: true, className: 'vibe-leaflet-popup' })
        .addTo(_poiLayerGroup);

      marker.poiId = poi.id;

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(poi);
      });
    });
  }

  function clearPOIs() {
    if (_poiLayerGroup) _poiLayerGroup.clearLayers();
    _lastPois = [];
  }

  function focusPOI(poiId) {
    if (!_poiLayerGroup) return;
    let target = null;
    _poiLayerGroup.eachLayer(layer => {
      if (layer instanceof L.Marker && layer.poiId === poiId) target = layer;
    });
    if (target) {
      if (typeof _poiLayerGroup.zoomToShowLayer === 'function') {
        _poiLayerGroup.zoomToShowLayer(target, () => {
          target.openPopup();
        });
      } else {
        _map.flyTo(target.getLatLng(), 16, { animate: true, duration: 0.8 });
        setTimeout(() => target.openPopup(), 800);
      }
    }
  }

  function closePopup() {
    if (_map) _map.closePopup();
  }

  function restoreSearchView() {
    if (!_map) return;
    closePopup();
    clearRoute();
    if (_radiusCircle) {
      _map.fitBounds(_radiusCircle.getBounds(), { padding: [50, 50], maxZoom: 15, animate: true });
    } else {
      _map.flyTo([cfg.defaultLat, cfg.defaultLon], cfg.defaultZoom, { animate: true, duration: 0.8 });
    }
  }

  // ------------------------------------------------------------------
  // Route (Phase 4)
  // ------------------------------------------------------------------
  function drawRoute(coordinates, profile = 'driving') {
    clearRoute();
    if (!coordinates || coordinates.length === 0) return;
    const path = coordinates.map(c => [c[1], c[0]]);
    const isWalking = profile === 'walking';

    _routePolyline = L.polyline(path, {
      color: isWalking ? '#10b981' : '#3b82f6',
      weight: isWalking ? 5 : 5,
      opacity: 0.88,
      dashArray: isWalking ? '6, 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(_map);

    _map.fitBounds(_routePolyline.getBounds(), { padding: [60, 60] });
  }

  function clearRoute() {
    if (_routePolyline) {
      _routePolyline.remove();
      _routePolyline = null;
    }
  }

  // ------------------------------------------------------------------
  // Geolocation
  // ------------------------------------------------------------------
  function locateUser(onSuccess, onError) {
    if (!navigator.geolocation) {
      onError && onError('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        _map.flyTo([lat, lon], 15, { animate: true, duration: 1 });
        setLocationMarker(lat, lon, 'Your location');
        onSuccess && onSuccess({ lat, lon });
      },
      (err) => {
        console.warn('[VibePuneMap] Geolocation error:', err.message);
        onError && onError(err.message);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  // ------------------------------------------------------------------
  // Events & Density Hotspots (Phase 7 & 8)
  // ------------------------------------------------------------------
  function renderEventMarkers(events, onEventClick) {
    if (!_eventsLayerGroup) return;
    _eventsLayerGroup.clearLayers();
    if (!events || !events.length) return;

    events.forEach(ev => {
      const lat = parseFloat(ev.latitude);
      const lon = parseFloat(ev.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const categoryEmoji = getEmoji(ev.category) || '🎟️';
      const icon = L.divIcon({
        html: `
          <div class="vibe-marker-container event-marker-container" title="${escapeHtml(ev.name)}">
            <div class="vibe-marker event-marker">
              <span class="vibe-marker__emoji">${categoryEmoji}</span>
              <div class="event-marker__badge">EVENT</div>
            </div>
            <div class="vibe-marker__shadow"></div>
          </div>
        `,
        className: 'event-leaflet-icon',
        iconSize: [36, 44],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([lat, lon], { icon });

      const distStr = ev.distance_m ? `${ev.distance_m < 1000 ? ev.distance_m + ' m' : ev.distance_km + ' km'} away` : '';
      const dateStr = ev.timeframe_label ? `<span class="event-pill-time">${escapeHtml(ev.timeframe_label)}</span>` : '';
      const priceStr = ev.price ? `<div class="event-popup-price">💰 ${escapeHtml(ev.price)}</div>` : '';
      const officialLink = ev.source_url ? `<a href="${escapeHtml(ev.source_url)}" target="_blank" rel="noopener noreferrer" class="preview-btn preview-btn--secondary">Official Event ↗</a>` : '';

      const popupHtml = `
        <div class="vibe-preview-popup event-preview-popup" data-event-id="${escapeHtml(ev.id)}">
          <div class="preview-header">
            <div class="preview-badge-row">
              <span class="preview-category-badge preview-category-badge--event">🎟️ ${escapeHtml(ev.category)}</span>
              ${dateStr}
            </div>
            <h4 class="preview-title">${escapeHtml(ev.name)}</h4>
            <div class="preview-venue">📍 ${escapeHtml(ev.venue || 'Pune Venue')} ${distStr ? '• ' + distStr : ''}</div>
          </div>
          <div class="preview-body">
            ${priceStr}
            <p class="preview-desc">${escapeHtml(ev.description || '')}</p>
            <div class="preview-source-tag">Source: ${escapeHtml(ev.source || 'Verified Source')}</div>
          </div>
          <div class="preview-actions">
            <button class="preview-btn preview-btn--primary btn-view-event" data-event-id="${escapeHtml(ev.id)}">View Details</button>
            <button class="preview-btn btn-event-directions" data-lat="${lat}" data-lon="${lon}" data-name="${escapeHtml(ev.name)}">Directions</button>
            ${officialLink}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300, className: 'vibe-custom-popup' });

      marker.on('popupopen', () => {
        const popupEl = document.querySelector(`.event-preview-popup[data-event-id="${ev.id}"]`);
        if (!popupEl) return;

        const viewBtn = popupEl.querySelector('.btn-view-event');
        if (viewBtn) {
          viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEventClick && onEventClick(ev);
          });
        }

        const dirBtn = popupEl.querySelector('.btn-event-directions');
        if (dirBtn && _onDirectionsClickCallback) {
          dirBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _onDirectionsClickCallback({
              id: ev.id,
              name: ev.name,
              latitude: lat,
              longitude: lon,
              address: ev.venue || ''
            });
            _map.closePopup();
          });
        }
      });

      _eventsLayerGroup.addLayer(marker);
    });
  }

  function clearEvents() {
    if (_eventsLayerGroup) _eventsLayerGroup.clearLayers();
  }

  function renderDensityHotspots(neighbourhoods) {
    if (!_densityLayerGroup) return;
    _densityLayerGroup.clearLayers();
    if (!neighbourhoods || !neighbourhoods.length) return;

    neighbourhoods.forEach(nb => {
      const lat = parseFloat(nb.latitude);
      const lon = parseFloat(nb.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const score = nb.density_score || 0;
      const color = score >= 0.75 ? '#ff5e62' : (score >= 0.4 ? '#f59e0b' : '#38bdf8');
      const radius = Math.min(1400, Math.max(500, (nb.radius_m || 1500) * 0.6));

      const circle = L.circle([lat, lon], {
        radius: radius,
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: Math.min(0.5, Math.max(0.18, score * 0.45)),
      });

      circle.bindTooltip(`
        <div class="density-tooltip">
          <strong>${escapeHtml(nb.neighbourhood)}</strong>
          <div>Places: ${nb.count}</div>
          <div>Tier: ${escapeHtml(nb.hotspot_tier || '')}</div>
        </div>
      `, { sticky: true });

      _densityLayerGroup.addLayer(circle);
    });
  }

  function clearDensityHotspots() {
    if (_densityLayerGroup) _densityLayerGroup.clearLayers();
  }

  function updateThemeTiles(theme) {
    if (!_tileLayer) return;
    const url  = theme === 'dark' ? CARTO_DARK : OSM_HOT;
    const attr = theme === 'dark' ? CARTO_DARK_ATTR : OSM_HOT_ATTR;
    _tileLayer.setUrl(url);
    if (_map && _map.attributionControl) {
      _map.attributionControl.removeAttribution(CARTO_DARK_ATTR);
      _map.attributionControl.removeAttribution(ESRI_DARK_ATTR);
      _map.attributionControl.removeAttribution(ESRI_LIGHT_ATTR);
      _map.attributionControl.removeAttribution(OSM_ATTR);
      _map.attributionControl.removeAttribution(OSM_HOT_ATTR);
      _map.attributionControl.addAttribution(attr);
    }
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  return {
    init, getMap, setOnMapClickListener,
    setOnDirectionsClickListener, setOnSaveClickListener, setIsSavedChecker,
    setLocationMarker, setRadiusCircle, clearRadiusCircle,
    locateUser, resetToDefault,
    renderPOIs, clearPOIs, focusPOI,
    drawRoute, clearRoute,
    closePopup, restoreSearchView,
    renderEventMarkers, clearEvents,
    renderDensityHotspots, clearDensityHotspots,
    updateThemeTiles,
  };
})();

window.VibePuneMap = VibePuneMap;
window.GeoFindMap = VibePuneMap;
