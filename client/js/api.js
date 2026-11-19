/**
 * VibePune — api.js
 * ==================
 * Centralised HTTP client for all backend API calls.
 * Implements a client-side mock fallback with Pune-area test data
 * to ensure the UI is functional during Phase 1 (no real data yet).
 *
 * IMPORTANT: All mock data below is clearly labelled as TEST DATA.
 * These are NOT real businesses. Real Pune data will be ingested in Phase 2.
 */

'use strict';

const VibePuneAPI = (() => {
  const cfg = () => window.VibePuneConfig.API;

  // ------------------------------------------------------------------
  // In-Memory Data Store (Phase 3)
  // ------------------------------------------------------------------
  let _placesData = null;

  /**
   * Fetch all POIs from the static GeoJSON endpoint once.
   */
  async function fetchAllPlaces() {
    if (_placesData) return _placesData;

    // ── Try 1: live backend API ──
    console.info('[VibePuneAPI] Fetching real Pune dataset from /api/places...');
    try {
      const data = await request('/places');
      if (data && data.features) {
        _placesData = mapFeatures(data.features, 'api');
        console.info(`[VibePuneAPI] Loaded ${_placesData.length} POIs from backend API.`);
        return _placesData;
      }
    } catch (err) {
      console.warn('[VibePuneAPI] Backend API unavailable, falling back to static GeoJSON:', err.message);
    }

    // ── Try 2: static GeoJSON (GitHub Pages / offline) ──
    try {
      const res = await fetch('data/services.geojson');
      if (res.ok) {
        const data = await res.json();
        if (data && data.features) {
          _placesData = mapFeatures(data.features, 'geojson');
          console.info(`[VibePuneAPI] Loaded ${_placesData.length} POIs from static GeoJSON.`);
          return _placesData;
        }
      }
    } catch (err2) {
      console.error('[VibePuneAPI] Static GeoJSON also failed:', err2);
    }

    _placesData = [];
    return _placesData;
  }

  /**
   * Normalise GeoJSON features from either the backend API or the static export.
   * @param {Array} features - GeoJSON feature array
   * @param {'api'|'geojson'} source - which format the data is in
   */
  function mapFeatures(features, source) {
    return features.map(f => {
      const props = f.properties || {};
      const coords = (f.geometry && f.geometry.coordinates) || [0, 0];

      if (source === 'api') {
        const vibes = props.vibe_categories || [];
        const mainVibe = vibes[0] || {};
        return {
          id: props.osm_id,
          name: props.name || 'Unknown',
          categoryName: mainVibe.category || 'Other',
          vibeName: mainVibe.vibe || 'Other',
          category: mainVibe.slug || 'unknown',
          address: props.address || '',
          latitude: coords[1],
          longitude: coords[0],
          phone: props.phone || null,
          website: props.website || null,
          opening_hours: props.opening_hours || null
        };
      }

      // Static GeoJSON format (service_domain / primary_category)
      return {
        id: props.osm_id || props.id,
        name: props.name || 'Unknown',
        categoryName: props.service_domain || 'Other',
        vibeName: props.service_domain || 'Other',
        category: props.primary_category || 'unknown',
        address: props.address || '',
        latitude: coords[1],
        longitude: coords[0],
        phone: props.phone || null,
        website: props.website || null,
        opening_hours: props.opening_hours || null,
        municipality: props.municipality || null
      };
    });
  }

  /**
   * Calculate geographic distance in metres using Haversine formula.
   */
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ------------------------------------------------------------------
  // Generic HTTP Fetch Wrapper
  // ------------------------------------------------------------------
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg().timeoutMs);
    const url = `${cfg().baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new VibePuneAPIError(response.status, error.detail || 'Request failed', path);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new VibePuneAPIError(408, `Request timed out after ${cfg().timeoutMs}ms`, path);
      }
      if (err instanceof VibePuneAPIError) throw err;
      throw new VibePuneAPIError(0, err.message || 'Network error', path);
    }
  }

  // ------------------------------------------------------------------
  // Public API surface
  // ------------------------------------------------------------------
  return {
    fetchAllPlaces,
    getLoadedPlaces: () => _placesData || [],

    /**
     * GET /api/health
     */
    async health() {
      try {
        return await request(window.VibePuneConfig.API.healthPath);
      } catch (err) {
        return { status: 'ok', application: 'VibePune', database: 'unavailable' };
      }
    },

    /**
     * GET /api/categories
     */
    async categories() {
      try {
        return await request('/categories');
      } catch (err) {
        // Build categories from loaded static data
        await fetchAllPlaces();
        const catMap = {};
        (_placesData || []).forEach(p => {
          const key = p.category || 'unknown';
          if (!catMap[key]) catMap[key] = { slug: key, name: p.categoryName || key, count: 0 };
          catMap[key].count++;
        });
        return { categories: Object.values(catMap) };
      }
    },

    /**
     * GET /api/vibes
     */
    async vibes() {
      try {
        return await request('/vibes');
      } catch (err) {
        // Always fallback when backend unavailable (GitHub Pages)
        return { vibes: window.VibePuneConfig.VIBES || [] };
      }
    },

    /**
     * GET /api/search — dynamic PostGIS search with in-memory fallback
     */
    async search(params) {
      try {
        // Strip undefined/null values
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v != null && v !== '')
        );
        const qs = new URLSearchParams(cleanParams).toString();
        return await request(`/search?${qs}`);
      } catch (err) {
        // Fallback to in-memory static JSON (works on GitHub Pages)
        await fetchAllPlaces();
          
          const centerLat = parseFloat(params.lat);
          const centerLon = parseFloat(params.lon);
          const radiusM = parseFloat(params.radius_m || 2000);
          const category = params.category;
          const query = params.q ? params.q.toLowerCase().trim() : '';
          const limit = parseInt(params.limit || 0, 10);

          const results = _placesData.map(place => {
            const dist = haversineDistance(centerLat, centerLon, place.latitude, place.longitude);
            return { ...place, distance_m: Math.round(dist) };
          }).filter(place => {
            if (place.distance_m > radiusM) return false;
            if (category && place.category !== category) return false;
            if (query && !place.name.toLowerCase().includes(query) && !place.address.toLowerCase().includes(query)) {
              return false;
            }
            return true;
          });

          results.sort((a, b) => a.distance_m - b.distance_m);

          const finalItems = limit > 0 ? results.slice(0, limit) : results;

          return {
            items: finalItems,
            total: results.length,
            page: 1,
            per_page: limit > 0 ? limit : results.length,
            pages: 1,
          };
      }
    },

    /**
     * GET /api/places/:id — fetch full place profile with fallback
     */
    async placeDetail(id) {
      try {
        const data = await request(`/places/${id}`);
        if (data && data.properties) {
          const props = data.properties;
          const coords = data.geometry?.coordinates || [0, 0];
          return {
            id: props.osm_id || id,
            osm_id: props.osm_id,
            name: props.name || 'Unknown',
            category: props.category || 'general',
            categoryName: props.categoryName || 'Place',
            vibe: props.vibeName || props.categoryName || 'Place',
            description: props.description || null,
            address: props.address || null,
            phone: props.phone || null,
            website: props.website || null,
            opening_hours: props.opening_hours || null,
            latitude: coords[1] || props.latitude,
            longitude: coords[0] || props.longitude,
            rating: props.rating || null,
            review_count: props.review_count || 0,
            photos: props.photos || [],
            social: props.social || {},
            source: props.source || 'OpenStreetMap',
            osm_tags: props.osm_tags || {}
          };
        }
      } catch (err) {
        console.warn(`[VibePuneAPI] Remote detail for place ${id} unavailable, using local cache:`, err.message);
      }

      await fetchAllPlaces();
      const fallback = _placesData.find(p => String(p.id) === String(id));
      if (fallback) return fallback;
      throw new VibePuneAPIError(404, 'Place not found', `/places/${id}`);
    },

    /**
     * GET /api/routing/directions — real OSRM routing with walking/driving profiles
     */
    async directions(params) {
      try {
        const queryParams = {
          from_lat: params.from_lat,
          from_lon: params.from_lon,
          to_lat: params.to_lat,
          to_lon: params.to_lon,
          profile: params.profile || 'driving'
        };
        const qs = new URLSearchParams(queryParams).toString();
        return await request(`/routing/directions?${qs}`);
      } catch (err) {
          const fromLat = parseFloat(params.from_lat);
          const fromLon = parseFloat(params.from_lon);
          const toLat = parseFloat(params.to_lat);
          const toLon = parseFloat(params.to_lon);
          const dist = Math.round(haversineDistance(fromLat, fromLon, toLat, toLon) * 1.2);
          const speed = params.profile === 'walking' ? 1.4 : 8.5;
          const dur = Math.round(dist / speed);

          return {
            status: 'fallback',
            profile: params.profile || 'driving',
            distance_m: dist,
            duration_s: dur,
            summary: {
              distance_km: parseFloat((dist / 1000).toFixed(2)),
              duration_min: parseFloat((dur / 60).toFixed(1)),
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [fromLon, fromLat],
                [fromLon + (toLon - fromLon) * 0.3, fromLat + (toLat - fromLat) * 0.2],
                [fromLon + (toLon - fromLon) * 0.6, fromLat + (toLat - fromLat) * 0.7],
                [toLon, toLat],
              ],
            },
          };
      }
    },

    /**
     * POST /api/recommendations — Phase 6 personalized recommendation engine.
     * @param {Object} payload Questionnaire and location payload
     * @returns {Promise<Object>} Recommendation response
     */
    recommendations: async (payload) => {
      try {
        return await request('/recommendations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Rethrow with status 0 so callers can detect network/API failure
        // and activate their own local fallbacks
        console.warn('[VibePuneAPI] recommendations endpoint failed:', err.message || err);
        throw new VibePuneAPIError(err.status || 0, err.message || 'Recommendations unavailable', '/recommendations');
      }
    },

    /**
     * GET /api/events — List upcoming events with category and timeframe filters.
     */
    getEvents: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.category) q.set('category', params.category);
      if (params.timeframe) q.set('timeframe', params.timeframe);
      if (params.ref_lat) q.set('ref_lat', params.ref_lat);
      if (params.ref_lon) q.set('ref_lon', params.ref_lon);
      if (params.limit) q.set('limit', params.limit);
      if (params.offset) q.set('offset', params.offset);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request(`/events${queryStr}`);
    },

    /**
     * GET /api/events/nearby — Spatial search for nearby events.
     */
    getNearbyEvents: async (lat, lon, radius_m = 5000, timeframe = null, category = null) => {
      const q = new URLSearchParams({ lat, lon, radius_m });
      if (timeframe) q.set('timeframe', timeframe);
      if (category) q.set('category', category);
      return request(`/events/nearby?${q.toString()}`);
    },

    /**
     * GET /api/events/{event_id} — Single event details.
     */
    getEventDetail: async (eventId) => {
      return request(`/events/${eventId}`);
    },

    /**
     * GET /api/events/search — Keyword search for events.
     */
    searchEvents: async (query, limit = 10) => {
      return request(`/events/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    },

    /**
     * GET /api/analytics/summary — Overall Pune spatial summary.
     */
    getAnalyticsSummary: async () => {
      return request('/analytics/summary');
    },

    /**
     * GET /api/analytics/density — Category spatial density analysis.
     */
    getCategoryDensity: async (category = 'all') => {
      return request(`/analytics/density?category=${encodeURIComponent(category)}`);
    },

    /**
     * GET /api/analytics/accessibility — Multi-radius accessibility breakdown.
     */
    getAccessibility: async (lat, lon) => {
      return request(`/analytics/accessibility?lat=${lat}&lon=${lon}`);
    },
  };
})();

/**
 * Custom API error class.
 */
class VibePuneAPIError extends Error {
  constructor(status, message, path) {
    super(message);
    this.name = 'VibePuneAPIError';
    this.status = status;
    this.path = path;
  }
}

window.VibePuneAPI = VibePuneAPI;
window.VibePuneAPIError = VibePuneAPIError;

// Backward-compat aliases (transitional)
window.GeoFindAPI = VibePuneAPI;
window.GeoFindAPIError = VibePuneAPIError;
