/**
 * VibePune — config.js
 * =====================
 * Client-side application configuration.
 * All values that might change per environment are centralised here.
 * No secrets or credentials are stored in this file.
 */

'use strict';

const VibePuneConfig = Object.freeze({

  // Application metadata
  APP: {
    name:    'VibePune',
    version: '1.0.0-alpha',
    tagline: 'Discover places, events & experiences that match your vibe.',
  },

  // Backend API
  API: {
    baseUrl:     'http://localhost:8000/api',
    timeoutMs:   10_000,
    healthPath:  '/health',
  },

  // Pune, Maharashtra — city centre (Shivajinagar area, WGS84)
  MAP: {
    defaultLat:  18.5204,
    defaultLon:  73.8567,
    defaultZoom: 13,
    minZoom:     10,
    maxZoom:     19,
    tileUrl:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
  },

  // Search defaults
  SEARCH: {
    defaultRadiusM:  2_000,   // 2 km
    maxRadiusM:      10_000,  // 10 km
    minRadiusM:      250,
    debounceMs:      350,
  },

  // Vibe categories (preview taxonomy — will be API-driven in Phase 2)
  VIBES: [
    { slug: 'date-night',      label: 'Date Night',      emoji: '❤️' },
    { slug: 'aesthetic-cafe',   label: 'Aesthetic Cafe',   emoji: '☕' },
    { slug: 'music',           label: 'Music',           emoji: '🎵' },
    { slug: 'party',           label: 'Party',           emoji: '🎉' },
    { slug: 'creative',        label: 'Creative',        emoji: '🎨' },
    { slug: 'fitness',         label: 'Fitness',         emoji: '🏃' },
    { slug: 'nature',          label: 'Nature',          emoji: '🌿' },
    { slug: 'adventure',       label: 'Adventure',       emoji: '🔥' },
    { slug: 'instagrammable',  label: 'Instagrammable',  emoji: '📸' },
    { slug: 'budget-friendly', label: 'Budget Friendly', emoji: '💰' },
  ],

  // API health-check polling interval (ms)
  HEALTH_CHECK_INTERVAL_MS: 30_000,

});

// Make available globally
window.VibePuneConfig = VibePuneConfig;

// Backward-compat alias (transitional — will be removed in Phase 2)
window.GeoFindConfig = VibePuneConfig;
