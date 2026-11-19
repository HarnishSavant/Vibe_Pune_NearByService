/**
 * VibePune — categories/categories.js
 * ======================================
 * Dynamic category chip rendering from /api/categories.
 * Falls back to hardcoded chips if the API is unavailable.
 */

'use strict';

const VibePuneCategories = (() => {
  let _selectedCategory = null;
  let _onChangeCallback = null;

  // Category → emoji & lifestyle label mapping
  const CATEGORY_MAP = {
    'aesthetic-cafe': { emoji: '☕', label: 'Chill & Coffee', vibe: 'Chill & Coffee' },
    'cafe':           { emoji: '☕', label: 'Chill & Coffee', vibe: 'Chill & Coffee' },
    'dining':         { emoji: '🍽️', label: 'Foodie & Dining', vibe: 'Foodie' },
    'restaurant':     { emoji: '🍽️', label: 'Foodie & Dining', vibe: 'Foodie' },
    'dessert':        { emoji: '🍰', label: 'Sweet Treats', vibe: 'Desserts' },
    'fast-food':      { emoji: '🍟', label: 'Street Bites', vibe: 'Quick Eats' },
    'street-food':    { emoji: '🍟', label: 'Street Food', vibe: 'Local Eats' },
    'nightlife':      { emoji: '🎵', label: 'Night Out', vibe: 'Nightlife' },
    'bar':            { emoji: '🍸', label: 'Bars & Pubs', vibe: 'Drinks' },
    'pub':            { emoji: '🍺', label: 'Breweries & Pubs', vibe: 'Nightlife' },
    'nature':         { emoji: '🌿', label: 'Nature & Peace', vibe: 'Outdoors' },
    'park':           { emoji: '🌳', label: 'Parks & Greenery', vibe: 'Relax' },
    'garden':         { emoji: '🌺', label: 'Gardens & Walks', vibe: 'Peace' },
    'fitness':        { emoji: '🏃', label: 'Active & Fitness', vibe: 'Fitness' },
    'sports':         { emoji: '⚽', label: 'Sports & Turf', vibe: 'Sports' },
    'gym':            { emoji: '🏋️', label: 'Gyms & Training', vibe: 'Fitness' },
    'shopping':       { emoji: '🛍️', label: 'Shopping & Malls', vibe: 'Retail' },
    'mall':           { emoji: '🏬', label: 'Malls & Stores', vibe: 'Shopping' },
    'market':         { emoji: '🛒', label: 'Local Bazaars', vibe: 'Shopping' },
    'hotel':          { emoji: '🏨', label: 'Stay & Relax', vibe: 'Stays' },
    'hostel':         { emoji: '🎒', label: 'Backpacker Hostels', vibe: 'Travel' },
    'gallery':        { emoji: '🎨', label: 'Arts & Culture', vibe: 'Culture' },
    'museum':         { emoji: '🏛️', label: 'Heritage & Museums', vibe: 'History' },
    'arts':           { emoji: '🎭', label: 'Arts & Theatres', vibe: 'Creativity' },
    'library':        { emoji: '📚', label: 'Read & Study', vibe: 'Quiet' },
    'movies':         { emoji: '🎬', label: 'Entertainment & Cinema', vibe: 'Movies' },
    'theatre':        { emoji: '🎭', label: 'Performing Arts', vibe: 'Culture' },
    'cinema':         { emoji: '🎬', label: 'Cinema & Multiplex', vibe: 'Movies' },
    'worship':        { emoji: '🛕', label: 'Spiritual & Calm', vibe: 'Spiritual' },
    'temple':         { emoji: '🛕', label: 'Temples & Heritage', vibe: 'Spiritual' },
    'education':      { emoji: '🎓', label: 'Campus & Learning', vibe: 'Study' },
    'healthcare':     { emoji: '🏥', label: 'Health & Wellness', vibe: 'Care' },
    'viewpoint':      { emoji: '📸', label: 'Scenic & Views', vibe: 'Photography' },
    'attraction':     { emoji: '⭐', label: 'Iconic Spots', vibe: 'Must Visit' },
  };

  // Fallback categories if API fails
  const FALLBACK_CATEGORIES = [
    { slug: 'aesthetic-cafe', name: 'Chill & Coffee', description: 'Aesthetic Cafes' },
    { slug: 'dining',         name: 'Foodie & Dining', description: 'Dining' },
    { slug: 'nature',         name: 'Nature & Peace',  description: 'Parks & Nature' },
    { slug: 'nightlife',      name: 'Night Out',       description: 'Nightlife' },
    { slug: 'shopping',       name: 'Shopping',        description: 'Malls & Retail' },
    { slug: 'fitness',        name: 'Active & Sports', description: 'Fitness' },
    { slug: 'gallery',        name: 'Arts & Culture',  description: 'Art & Heritage' },
    { slug: 'viewpoint',      name: 'Scenic & Views',  description: 'Lookouts & Views' },
  ];

  // Friendly display names for category slugs
  function getDisplayName(cat) {
    const item = CATEGORY_MAP[cat.slug];
    if (item && item.label) return item.label;
    return cat.description || cat.name || cat.slug;
  }

  function getEmoji(slug) {
    const item = CATEGORY_MAP[slug];
    return (item && item.emoji) || '📍';
  }

  /**
   * Initialise: fetch categories from API and render lifestyle discovery chips.
   */
  async function init(onCategoryChange) {
    _onChangeCallback = onCategoryChange;

    const container = document.getElementById('categories-grid');
    if (!container) return;

    let categories = FALLBACK_CATEGORIES;

    try {
      const response = await VibePuneAPI.categories();
      if (response && response.categories && response.categories.length > 0) {
        categories = response.categories;
      }
    } catch (err) {
      console.warn('[VibePuneCategories] API unavailable, using fallback categories.');
    }

    // Deduplicate by slug
    const seen = new Set();
    const unique = [];
    for (const cat of categories) {
      if (!seen.has(cat.slug)) {
        seen.add(cat.slug);
        unique.push(cat);
      }
    }

    // Priority lifestyle categories ordered for Gen-Z exploration
    const prioritySlugs = [
      'aesthetic-cafe', 'dining', 'nature',
      'nightlife', 'shopping', 'fitness',
      'viewpoint', 'gallery', 'dessert',
      'fast-food', 'movies', 'museum',
      'hotel', 'worship', 'sports', 'attraction'
    ];

    // Sort: priority slugs first, then alphabetical
    unique.sort((a, b) => {
      const ai = prioritySlugs.indexOf(a.slug);
      const bi = prioritySlugs.indexOf(b.slug);
      const aPri = ai === -1 ? 999 : ai;
      const bPri = bi === -1 ? 999 : bi;
      if (aPri !== bPri) return aPri - bPri;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Render top 14 lifestyle chips
    const toRender = unique.slice(0, 14);
    container.innerHTML = '';

    toRender.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'vibe-chip';
      chip.setAttribute('data-category', cat.slug);
      chip.setAttribute('type', 'button');
      chip.setAttribute('aria-pressed', 'false');
      chip.innerHTML = `<span class="vibe-chip__icon" aria-hidden="true">${getEmoji(cat.slug)}</span><span class="vibe-chip__label">${getDisplayName(cat)}</span>`;

      chip.addEventListener('click', () => {
        if (chip.classList.contains('active')) {
          chip.classList.remove('active');
          chip.setAttribute('aria-pressed', 'false');
          _selectedCategory = null;
        } else {
          container.querySelectorAll('.vibe-chip').forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-pressed', 'false');
          });
          chip.classList.add('active');
          chip.setAttribute('aria-pressed', 'true');
          _selectedCategory = cat.slug;
        }
        if (_onChangeCallback) _onChangeCallback(_selectedCategory);
      });

      container.appendChild(chip);
    });

    console.info(`[VibePuneCategories] Rendered ${toRender.length} lifestyle chips from ${unique.length} categories.`);
  }

  function selectCategory(slug) {
    const container = document.getElementById('categories-grid');
    if (!container) return;
    container.querySelectorAll('.vibe-chip').forEach(c => {
      const isMatch = c.getAttribute('data-category') === slug;
      c.classList.toggle('active', isMatch);
      c.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      if (isMatch) c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    _selectedCategory = slug;
    if (_onChangeCallback) _onChangeCallback(_selectedCategory);
  }

  function clearSelection() {
    const chips = document.querySelectorAll('.vibe-chip');
    chips.forEach(chip => {
      chip.classList.remove('active');
      chip.setAttribute('aria-pressed', 'false');
    });
    _selectedCategory = null;
  }

  function getSelected() {
    return _selectedCategory;
  }

  function getEmojiByCat(slug) {
    const item = CATEGORY_MAP[slug];
    return (item && item.emoji) || '📍';
  }

  function getCategoryLabel(slug) {
    const item = CATEGORY_MAP[slug];
    return (item && item.label) || slug;
  }

  function getAllKnownCategories() {
    return Object.entries(CATEGORY_MAP).map(([slug, data]) => ({
      slug,
      label: data.label,
      emoji: data.emoji,
      vibe: data.vibe
    }));
  }

  return {
    init,
    selectCategory,
    getSelected,
    clearSelection,
    getEmojiByCat,
    getCategoryLabel,
    getAllKnownCategories
  };
})();

window.VibePuneCategories = VibePuneCategories;
window.GeoFindCategories = VibePuneCategories;

