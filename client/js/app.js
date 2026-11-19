/**
 * VibePune — app.js
 * ==================
 * Main application controller, state management, and UI orchestration.
 * Phase 4: Turn-by-turn OSRM routing, Walking/Driving mode switching,
 * Route summary panel, and official Google Maps Directions navigation.
 */

'use strict';

(function VibePuneApp() {

  // ------------------------------------------------------------------
  // DOM references
  // ------------------------------------------------------------------
  const elMapLoading          = document.getElementById('map-loading');
  const elBtnLocate           = document.getElementById('btn-locate');
  const elBtnZoomDefault      = document.getElementById('btn-zoom-default');
  const elSearchInput         = document.getElementById('search-input');
  const elHeaderSearchWrap    = document.getElementById('header-search-wrap');
  const elSearchDropdown      = document.getElementById('search-dropdown');
  const elBtnSearchClear      = document.getElementById('btn-search-clear');
  const elBtnSavedPlaces      = document.getElementById('btn-saved-places');
  const elSavedBadge          = document.getElementById('saved-badge');
  const elBtnClearCategory    = document.getElementById('btn-clear-category');
  const elResultFilterTag     = document.getElementById('result-filter-tag');
  const elBtnLocSelector      = document.getElementById('btn-location-selector');
  const elAdvLocControls      = document.getElementById('advanced-location-controls');
  const elCurLocText          = document.getElementById('current-location-text');
  const elRadiusSlider        = document.getElementById('radius-slider');
  const elRadiusDisplay       = document.getElementById('radius-value-display');
  const elSimulatorSelect     = document.getElementById('simulator-select');
  const elResultsList         = document.getElementById('results-list');
  const elResultsLoading      = document.getElementById('results-loading');
  const elResultCount         = document.getElementById('result-count-number');
  const elBtnThemeToggle      = document.getElementById('btn-theme-toggle');

  // Phase 6: What's Your Vibe & Recommendations DOM Elements
  const elBtnOpenVibeQuiz     = document.getElementById('btn-open-vibe-quiz');
  const elBtnHeroVibeQuiz     = document.getElementById('btn-hero-vibe-quiz');
  const elVibeQuizModal       = document.getElementById('vibe-quiz-modal');
  const elBtnCloseVibeQuiz    = document.getElementById('btn-close-vibe-quiz');
  const elQuizProgressFill    = document.getElementById('quiz-progress-fill');
  const elQuizProgressText    = document.getElementById('quiz-progress-text');
  const elBtnQuizBack         = document.getElementById('btn-quiz-back');
  const elBtnQuizSkip         = document.getElementById('btn-quiz-skip');
  const elBtnQuizNext         = document.getElementById('btn-quiz-next');
  const elBtnQuizSubmit       = document.getElementById('btn-quiz-submit');
  const elQuizFreeText        = document.getElementById('quiz-free-text');
  const elRecommendationsPanel = document.getElementById('recommendations-panel');
  const elRecommendationsLoading = document.getElementById('recommendations-loading');
  const elRecommendationsList = document.getElementById('recommendations-list');
  const elRecsSummaryText     = document.getElementById('recs-summary-text');
  const elBtnCloseRecommendations = document.getElementById('btn-close-recommendations');
  const elBtnLoadMoreRecs     = document.getElementById('btn-load-more-recs');

  // Route Info Panel DOM Elements (Phase 4)
  const elRoutePanel          = document.getElementById('route-panel');
  const elRouteDestName       = document.getElementById('route-destination-name');
  const elRouteDistVal        = document.getElementById('route-distance-val');
  const elRouteDurVal         = document.getElementById('route-duration-val');
  const elBtnRouteClear       = document.getElementById('btn-route-clear');
  const elBtnModeDriving      = document.getElementById('btn-mode-driving');
  const elBtnModeWalking      = document.getElementById('btn-mode-walking');
  const elBtnOpenGmaps        = document.getElementById('btn-open-gmaps');

  // Detail Drawer DOM Elements
  const elDetailDrawer        = document.getElementById('detail-drawer');
  const elBtnCloseDrawer      = document.getElementById('btn-close-drawer');
  const elDetailHeroPlaceholder = document.getElementById('detail-hero-placeholder');
  const elDetailHeroImage     = document.getElementById('detail-image');
  const elDetailBadge         = document.getElementById('detail-badge');
  const elDetailIcon          = document.getElementById('detail-icon');
  const elDetailLoading       = document.getElementById('detail-loading');
  const elDetailContent       = document.getElementById('detail-content');
  const elDetailName          = document.getElementById('detail-name');
  const elDetailCategory      = document.getElementById('detail-category');
  const elDetailDistance      = document.getElementById('detail-distance');
  const elDetailRatingRow     = document.getElementById('detail-rating-row');
  const elDetailStars         = document.getElementById('detail-stars');
  const elDetailRatingScore   = document.getElementById('detail-rating-score');
  const elDetailReviewCount   = document.getElementById('detail-review-count');
  const elBtnDetailDirections = document.getElementById('btn-detail-directions');
  const elBtnDetailCall       = document.getElementById('btn-detail-call');
  const elBtnDetailWebsite    = document.getElementById('btn-detail-website');
  const elBtnDetailGmaps      = document.getElementById('btn-detail-gmaps');
  const elBtnDetailSave       = document.getElementById('btn-detail-save');
  const elDetailSaveIcon      = document.getElementById('detail-save-icon');
  const elDetailSaveText      = document.getElementById('detail-save-text');
  const elBtnDetailShare      = document.getElementById('btn-detail-share');
  const elDetailDescription   = document.getElementById('detail-description');
  const elDetailAddress       = document.getElementById('detail-address');
  const elDetailCoords        = document.getElementById('detail-coords');
  const elDetailHours         = document.getElementById('detail-hours');
  const elDetailContactPhoneRow = document.getElementById('detail-contact-phone-row');
  const elDetailContactPhone  = document.getElementById('detail-contact-phone');
  const elDetailContactWebRow   = document.getElementById('detail-contact-web-row');
  const elDetailContactWeb    = document.getElementById('detail-contact-web');
  const elDetailContactSocialRow = document.getElementById('detail-contact-social-row');
  const elDetailContactSocial = document.getElementById('detail-contact-social');
  const elDetailReviewsSection = document.getElementById('detail-reviews-section');
  const elDetailReviewsList   = document.getElementById('detail-reviews-list');
  const elVibeToast           = document.getElementById('vibe-toast');

  // Pune preset locations & prominent neighborhoods for search
  const LOCATIONS = {
    default:     { lat: 18.5204, lon: 73.8567, label: 'Shivajinagar' },
    koregaon:    { lat: 18.5362, lon: 73.8936, label: 'Koregaon Park' },
    fcroad:      { lat: 18.5274, lon: 73.8412, label: 'FC Road' },
    viman_nagar: { lat: 18.5679, lon: 73.9143, label: 'Viman Nagar' },
    kothrud:     { lat: 18.5074, lon: 73.8077, label: 'Kothrud' },
    hinjewadi:   { lat: 18.5912, lon: 73.7389, label: 'Hinjewadi' },
  };

  const PUNE_AREAS = [
    { name: 'Shivajinagar',      lat: 18.5204, lon: 73.8567, desc: 'Central Pune & Transport Hub', slug: 'default' },
    { name: 'Koregaon Park',     lat: 18.5362, lon: 73.8936, desc: 'Cafes, Nightlife & Luxury',    slug: 'koregaon' },
    { name: 'FC Road',           lat: 18.5274, lon: 73.8412, desc: 'Student Hub & Street Bites',   slug: 'fcroad' },
    { name: 'Viman Nagar',       lat: 18.5679, lon: 73.9143, desc: 'Phoenix Mall & Cafes',         slug: 'viman_nagar' },
    { name: 'Kothrud',           lat: 18.5074, lon: 73.8077, desc: 'Cultural Hub & Food Spots',    slug: 'kothrud' },
    { name: 'Hinjewadi',         lat: 18.5912, lon: 73.7389, desc: 'IT Park & Townships',         slug: 'hinjewadi' },
    { name: 'Camp (MG Road)',    lat: 18.5140, lon: 73.8780, desc: 'Heritage Bakeries & Shopping', slug: null },
    { name: 'Baner',             lat: 18.5590, lon: 73.7868, desc: 'Pubs, Breweries & High Street',slug: null },
    { name: 'Aundh',             lat: 18.5580, lon: 73.8075, desc: 'Greenery, Cafes & Boutiques',  slug: null },
    { name: 'Kalyani Nagar',     lat: 18.5463, lon: 73.9033, desc: 'Riverfront, Dining & Lounges', slug: null },
    { name: 'Deccan Gymkhana',   lat: 18.5165, lon: 73.8415, desc: 'Sports, Cafes & Heritage',     slug: null },
    { name: 'Senapati Bapat Rd', lat: 18.5332, lon: 73.8305, desc: 'Pavilion Mall & Lifestyle',   slug: null },
    { name: 'Swargate',          lat: 18.5018, lon: 73.8580, desc: 'Sarasbaug & South Pune Hub',  slug: null },
  ];

  // App state
  let currentLocation = { ...LOCATIONS.default };
  let currentActivePOI = null;
  let currentRoutingPOI = null;
  let currentRoutingProfile = 'driving'; // 'driving' or 'walking'
  let isSearching = false;
  let isSavedFilterActive = false;
  let searchDropdownActiveIndex = -1;
  let currentSuggestions = [];
  let serverSearchDebounceTimer = null;

  // Phase 6 State: What's Your Vibe & Recommendations
  let currentQuizStep = 1;
  let quizAnswers = {
    companions: [],
    activities: [],
    moods: [],
    environment: 'either',
    budget: 'any',
    max_distance_km: 3.0,
    free_text: ''
  };
  let isRecommendationsActive = false;
  let currentRecommendations = [];
  let currentRecsOffset = 0;
  let currentRecsTotal = 0;

  const STORAGE_KEY_FAVORITES = 'vibepune_saved_places';
  const STORAGE_KEY_RECENT_SEARCHES = 'vibepune_recent_searches';

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  async function init() {
    console.info('[VibePuneApp] Booting VibePune Phase 5 (Premium 2026 UI/UX & Smart Search)...');

    // Theme
    initTheme();

    // Saved places counter badge
    updateSavedBadge();

    // Load initial data
    try {
      await VibePuneAPI.fetchAllPlaces();
    } catch (e) {
      console.warn('[VibePuneApp] Initial data fetch failed:', e);
    }

    // Map
    VibePuneMap.init('map');
    const initialRadius = parseInt(elRadiusSlider?.value || 2000, 10);
    VibePuneMap.setLocationMarker(currentLocation.lat, currentLocation.lon, currentLocation.label);
    VibePuneMap.setRadiusCircle(currentLocation.lat, currentLocation.lon, initialRadius);
    hideMapLoading();

    // Connect map callbacks
    VibePuneMap.setIsSavedChecker(isPlaceSaved);
    VibePuneMap.setOnSaveClickListener((poi) => {
      toggleSavePlace(poi);
      if (currentActivePOI && currentActivePOI.id === poi.id) {
        updateDrawerSaveButton(poi.id);
      }
    });
    VibePuneMap.setOnDirectionsClickListener((poi) => {
      triggerDirections(poi);
    });

    // Categories (dynamic from API)
    await VibePuneCategories.init(handleCategoryChange);

    // Radius control
    if (elRadiusSlider) {
      updateRadiusDisplay(parseInt(elRadiusSlider.value, 10));
      elRadiusSlider.addEventListener('input', () => {
        updateRadiusDisplay(parseInt(elRadiusSlider.value, 10));
      });
      elRadiusSlider.addEventListener('change', () => {
        const r = parseInt(elRadiusSlider.value, 10);
        VibePuneMap.setRadiusCircle(currentLocation.lat, currentLocation.lon, r);
        executeSearch();
      });
    }

    // Bindings
    bindToolbar();
    bindLocation();
    bindDrawer();
    bindRouteControls();
    bindSmartSearch();
    bindSavedPlacesButton();
    bindCategoryReset();
    bindVibeQuiz();
    bindRecommendations();
    bindEvents();
    bindAnalytics();

    // Prefetch events for smart search and fast discovery
    try {
      const evRes = await VibePuneAPI.getEvents({ limit: 50 });
      _cachedEvents = evRes.events || [];
    } catch (e) {
      _cachedEvents = [];
    }

    // Map click — if detail drawer is open, dismiss it and restore view; otherwise pin location
    VibePuneMap.setOnMapClickListener((lat, lon) => {
      closeSearchDropdown();
      if (elDetailDrawer && elDetailDrawer.classList.contains('is-open')) {
        closeDetailDrawer({ restoreView: true });
      } else {
        updateLocation(lat, lon, 'Pinned Location');
      }
    });

    // Initial search
    await executeSearch();

    // Deep-link check: ?place=<id>
    checkDeepLink();
  }

  // ------------------------------------------------------------------
  // Deep-linking
  // ------------------------------------------------------------------
  async function checkDeepLink() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const placeId = urlParams.get('place') || urlParams.get('id') || urlParams.get('poi');
      const cat = urlParams.get('cat') || urlParams.get('category') || urlParams.get('vibe');
      const searchQuery = urlParams.get('search') || urlParams.get('q');
      const eventId = urlParams.get('event');
      const openEventsParam = urlParams.get('events');
      const openAnalyticsParam = urlParams.get('analytics') || urlParams.get('insights');

      if (cat && window.VibePuneCategories) {
        console.info(`[VibePuneApp] Deep-link category filter: ${cat}`);
        window.VibePuneCategories.selectCategory(cat);
      }

      if (searchQuery && elSearchInput) {
        console.info(`[VibePuneApp] Deep-link search query: ${searchQuery}`);
        elSearchInput.value = searchQuery;
        if (elBtnSearchClear) elBtnSearchClear.classList.remove('hidden');
        executeSearch();
      }

      if (placeId) {
        console.info(`[VibePuneApp] Deep-link requested for place: ${placeId}`);
        const detail = await VibePuneAPI.placeDetail(placeId);
        if (detail) {
          VibePuneMap.focusPOI(detail.id);
          openDetailDrawer(detail);
        }
      }

      if (eventId) {
        console.info(`[VibePuneApp] Deep-link requested for event: ${eventId}`);
        try {
          const evData = await VibePuneAPI.getEvents({ limit: 100 });
          const targetEv = (evData.events || []).find(e => String(e.id) === String(eventId));
          if (targetEv) {
            VibePuneMap.focusPOI(targetEv.id);
            showToast(`Event: ${targetEv.title}`);
          }
        } catch (e) {}
      }

      if (openEventsParam === '1' || openEventsParam === 'true') {
        openEventsPanel();
      }

      if (openAnalyticsParam === '1' || openAnalyticsParam === 'true') {
        openAnalyticsPanel();
      }
    } catch (err) {
      console.warn('[VibePuneApp] Could not resolve deep-link:', err);
    }
  }

  // ------------------------------------------------------------------
  // Favorites / Save (Local Storage Persistence)
  // ------------------------------------------------------------------
  function getSavedPlaceIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function isPlaceSaved(id) {
    if (!id) return false;
    const list = getSavedPlaceIds();
    return list.some(item => String(item.id || item) === String(id));
  }

  function updateSavedBadge() {
    const list = getSavedPlaceIds();
    const count = list.length;
    if (elSavedBadge) {
      elSavedBadge.textContent = count;
      elSavedBadge.classList.toggle('hidden', count === 0);
    }
  }

  function toggleSavePlace(poi) {
    if (!poi || !poi.id) return false;
    try {
      const list = getSavedPlaceIds();
      const existingIdx = list.findIndex(item => String(item.id || item) === String(poi.id));
      let isSaved = false;

      if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        isSaved = false;
        showToast(`Removed "${poi.name}" from saved places`);
      } else {
        list.push({
          id: String(poi.id),
          name: poi.name,
          category: poi.category,
          categoryName: poi.categoryName,
          address: poi.address,
          latitude: poi.latitude,
          longitude: poi.longitude,
          savedAt: new Date().toISOString()
        });
        isSaved = true;
        showToast(`Saved "${poi.name}" to favorites`);
      }

      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(list));
      updateSavedBadge();
      updateDrawerSaveButton(poi.id);

      // If viewing saved places, refresh list immediately
      if (isSavedFilterActive) {
        executeSearch();
      }

      return isSaved;
    } catch (err) {
      console.error('[VibePuneApp] Failed to update favorites:', err);
      return false;
    }
  }

  function updateDrawerSaveButton(poiId) {
    if (!elBtnDetailSave) return;
    const saved = isPlaceSaved(poiId);
    if (saved) {
      elBtnDetailSave.classList.add('is-active');
      if (elDetailSaveText) elDetailSaveText.textContent = 'Saved';
      if (elDetailSaveIcon) {
        elDetailSaveIcon.setAttribute('fill', 'currentColor');
      }
    } else {
      elBtnDetailSave.classList.remove('is-active');
      if (elDetailSaveText) elDetailSaveText.textContent = 'Save';
      if (elDetailSaveIcon) {
        elDetailSaveIcon.setAttribute('fill', 'none');
      }
    }
  }

  function bindSavedPlacesButton() {
    if (!elBtnSavedPlaces) return;
    elBtnSavedPlaces.addEventListener('click', () => {
      isSavedFilterActive = !isSavedFilterActive;
      elBtnSavedPlaces.classList.toggle('is-active', isSavedFilterActive);

      if (isSavedFilterActive) {
        showToast('Viewing Saved Places');
        if (elResultFilterTag) {
          elResultFilterTag.textContent = 'Saved Places';
          elResultFilterTag.classList.remove('hidden');
        }
      } else {
        if (elResultFilterTag) {
          elResultFilterTag.classList.add('hidden');
        }
      }
      executeSearch();
    });
  }

  function bindCategoryReset() {
    if (!elBtnClearCategory) return;
    elBtnClearCategory.addEventListener('click', () => {
      VibePuneCategories.clearSelection();
      elBtnClearCategory.classList.add('hidden');
      if (elResultFilterTag && !isSavedFilterActive) {
        elResultFilterTag.classList.add('hidden');
      }
      executeSearch();
    });
  }

  // ------------------------------------------------------------------
  // Phase 6: "What's Your Vibe?" Questionnaire & Recommendations Engine
  // ------------------------------------------------------------------
  function bindVibeQuiz() {
    if (elBtnOpenVibeQuiz) {
      elBtnOpenVibeQuiz.addEventListener('click', () => openVibeQuiz());
    }
    if (elBtnHeroVibeQuiz) {
      elBtnHeroVibeQuiz.addEventListener('click', () => openVibeQuiz());
    }
    if (elBtnCloseVibeQuiz) {
      elBtnCloseVibeQuiz.addEventListener('click', () => closeVibeQuiz());
    }

    if (elVibeQuizModal) {
      elVibeQuizModal.addEventListener('click', (e) => {
        if (e.target === elVibeQuizModal) closeVibeQuiz();
      });
    }

    // Chip selection logic
    const optionChips = document.querySelectorAll('.vibe-option-chip');
    optionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const grid = chip.closest('.vibe-options-grid');
        if (!grid) return;
        const isSingle = grid.getAttribute('data-single') === 'true';
        if (isSingle) {
          grid.querySelectorAll('.vibe-option-chip').forEach(c => c.classList.remove('is-selected'));
          chip.classList.add('is-selected');
        } else {
          chip.classList.toggle('is-selected');
        }
      });
    });

    // Step navigation
    if (elBtnQuizNext) {
      elBtnQuizNext.addEventListener('click', () => {
        if (currentQuizStep < 5) {
          updateQuizStep(currentQuizStep + 1);
        }
      });
    }

    if (elBtnQuizBack) {
      elBtnQuizBack.addEventListener('click', () => {
        if (currentQuizStep > 1) {
          updateQuizStep(currentQuizStep - 1);
        }
      });
    }

    if (elBtnQuizSkip) {
      elBtnQuizSkip.addEventListener('click', () => {
        if (currentQuizStep < 5) {
          updateQuizStep(currentQuizStep + 1);
        } else {
          executeVibeRecommendations();
        }
      });
    }

    if (elBtnQuizSubmit) {
      elBtnQuizSubmit.addEventListener('click', () => {
        executeVibeRecommendations();
      });
    }
  }

  function openVibeQuiz() {
    updateQuizStep(1);
    if (elVibeQuizModal) {
      elVibeQuizModal.classList.remove('hidden');
    }
  }

  function closeVibeQuiz() {
    if (elVibeQuizModal) {
      elVibeQuizModal.classList.add('hidden');
    }
  }

  function updateQuizStep(step) {
    currentQuizStep = step;

    // Show only the current step
    const steps = document.querySelectorAll('.vibe-step');
    steps.forEach(s => {
      const sNum = parseInt(s.getAttribute('data-step'), 10);
      s.classList.toggle('hidden', sNum !== step);
    });

    // Update progress
    if (elQuizProgressFill) {
      elQuizProgressFill.style.width = `${step * 20}%`;
    }
    if (elQuizProgressText) {
      elQuizProgressText.textContent = `Step ${step} of 5`;
    }

    // Button states
    if (elBtnQuizBack) {
      elBtnQuizBack.classList.toggle('hidden', step === 1);
    }
    if (elBtnQuizNext) {
      elBtnQuizNext.classList.toggle('hidden', step === 5);
    }
    if (elBtnQuizSkip) {
      elBtnQuizSkip.classList.toggle('hidden', step === 5);
    }
    if (elBtnQuizSubmit) {
      elBtnQuizSubmit.classList.toggle('hidden', step !== 5);
    }
  }

  function collectQuizAnswers() {
    const getValues = (groupName) => {
      const grid = document.querySelector(`.vibe-options-grid[data-group="${groupName}"]`);
      if (!grid) return [];
      const selected = grid.querySelectorAll('.vibe-option-chip.is-selected');
      return Array.from(selected).map(c => c.getAttribute('data-value')).filter(Boolean);
    };

    const getSingleValue = (groupName, fallback) => {
      const vals = getValues(groupName);
      return vals[0] || fallback;
    };

    const maxDistVal = parseFloat(getSingleValue('distance', '3')) || 3.0;

    return {
      companions: getValues('companions'),
      activities: getValues('activities'),
      moods: getValues('moods'),
      environment: getSingleValue('environment', 'either'),
      budget: getSingleValue('budget', 'any'),
      max_distance_km: maxDistVal,
      free_text: elQuizFreeText ? elQuizFreeText.value.trim() : ''
    };
  }

  async function executeVibeRecommendations(isLoadMore = false) {
    if (!isLoadMore) {
      quizAnswers = collectQuizAnswers();
      currentRecsOffset = 0;
      currentRecommendations = [];
      closeVibeQuiz();

      // Switch to recommendations view
      isRecommendationsActive = true;
      if (elRecommendationsPanel) elRecommendationsPanel.classList.remove('hidden');
      if (elRecommendationsLoading) elRecommendationsLoading.classList.remove('hidden');
      if (elRecommendationsList) elRecommendationsList.innerHTML = '';
      if (elResultsList) elResultsList.classList.add('hidden');
      if (elResultCount) elResultCount.classList.add('hidden');

      // Summary text
      if (elRecsSummaryText) {
        const parts = [];
        if (quizAnswers.free_text) {
          parts.push(`"${quizAnswers.free_text}"`);
        } else {
          if (quizAnswers.companions.length > 0) parts.push(quizAnswers.companions.join(', '));
          if (quizAnswers.activities.length > 0) parts.push(quizAnswers.activities.join(', '));
          if (quizAnswers.moods.length > 0) parts.push(quizAnswers.moods.join(', '));
        }
        parts.push(`Within ${quizAnswers.max_distance_km} km`);
        elRecsSummaryText.textContent = parts.join(' • ') || 'Personalized for Pune';
      }

      showToast('Finding places that match your vibe...');
    }

    try {
      const payload = {
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        companions: quizAnswers.companions,
        activities: quizAnswers.activities,
        moods: quizAnswers.moods,
        environment: quizAnswers.environment,
        budget: quizAnswers.budget,
        max_distance_km: quizAnswers.max_distance_km,
        free_text: quizAnswers.free_text || undefined,
        limit: 10,
        offset: currentRecsOffset
      };

      const res = await VibePuneAPI.recommendations(payload);
      const newItems = res.recommendations || [];
      currentRecsTotal = res.total || newItems.length;

      if (isLoadMore) {
        currentRecommendations = currentRecommendations.concat(newItems);
      } else {
        currentRecommendations = newItems;
      }

      renderRecommendationCards(currentRecommendations);

      // Render recommendations on Leaflet map with highlight aura
      const recsPlaces = currentRecommendations.map(r => ({
        ...r.place,
        distance_m: r.distance_m,
        isRecommended: true
      }));
      VibePuneMap.renderPOIs(recsPlaces, handleMarkerClick);

      // Show more button control
      if (elBtnLoadMoreRecs) {
        const hasMore = (currentRecsOffset + newItems.length) < currentRecsTotal;
        elBtnLoadMoreRecs.classList.toggle('hidden', !hasMore);
      }

      if (res.gemini_intent_extracted) {
        showToast('Gemini customized your recommendations!');
      }

    } catch (err) {
      console.error('[VibePuneApp] Failed to fetch recommendations:', err);
      if (elRecommendationsList) {
        elRecommendationsList.innerHTML = `
          <div class="empty-state">
            <p class="empty-state__title">Could not generate recommendations.</p>
            <p class="empty-state__sub">Please try adjusting your distance or preferences.</p>
          </div>
        `;
      }
    } finally {
      if (elRecommendationsLoading) elRecommendationsLoading.classList.add('hidden');
    }
  }

  function renderRecommendationCards(recs) {
    if (!elRecommendationsList) return;
    elRecommendationsList.innerHTML = '';

    if (!recs || recs.length === 0) {
      elRecommendationsList.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__title">No matching vibe spots found nearby.</p>
          <p class="empty-state__sub">Try increasing your search distance or selecting broader activities.</p>
        </div>
      `;
      return;
    }

    recs.forEach((rec, idx) => {
      const p = rec.place;
      const rank = idx + 1;
      const matchPct = rec.match_percentage || Math.round((rec.score || 0.8) * 100);
      const dist = formatDistance(rec.distance_m);
      const isSaved = isPlaceSaved(p.id);

      const card = document.createElement('article');
      card.className = 'recommendation-card';
      card.setAttribute('data-poi-id', p.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      // Reasons HTML
      const reasonsHtml = (rec.reasons || []).map(r => 
        `<span class="recommendation-card__reason-badge">${escapeHtml(r)}</span>`
      ).join('');

      card.innerHTML = `
        <div class="recommendation-card__top">
          <div class="recommendation-card__rank-wrap">
            <span class="recommendation-card__rank">#${rank}</span>
            <h4 class="recommendation-card__name">${escapeHtml(p.name)}</h4>
          </div>
          <span class="recommendation-card__match-pill">${matchPct}% Match</span>
        </div>

        <div class="recommendation-card__meta">
          <span class="recommendation-card__category">${escapeHtml(p.categoryName || p.category)}</span>
          <span class="recommendation-card__distance">📍 ${dist} away</span>
        </div>

        <div class="recommendation-card__reasons">
          ${reasonsHtml}
        </div>

        <div class="recommendation-card__actions">
          <button type="button" class="recommendation-card__action-btn recommendation-card__action-btn--primary btn-rec-view">
            View Details →
          </button>
          <button type="button" class="recommendation-card__action-btn btn-rec-directions">
            🧭 Directions
          </button>
          <button type="button" class="recommendation-card__action-btn btn-rec-save">
            ${isSaved ? '❤️ Saved' : '🤍 Save'}
          </button>
        </div>
      `;

      // Card click
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectRecommendation(p, card);
      });

      // Action buttons
      const btnView = card.querySelector('.btn-rec-view');
      if (btnView) {
        btnView.addEventListener('click', (e) => {
          e.stopPropagation();
          selectRecommendation(p, card);
        });
      }

      const btnDir = card.querySelector('.btn-rec-directions');
      if (btnDir) {
        btnDir.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerDirections(p);
        });
      }

      const btnSave = card.querySelector('.btn-rec-save');
      if (btnSave) {
        btnSave.addEventListener('click', (e) => {
          e.stopPropagation();
          const savedNow = toggleSavePlace(p);
          btnSave.textContent = savedNow ? '❤️ Saved' : '🤍 Save';
        });
      }

      elRecommendationsList.appendChild(card);
    });
  }

  function selectRecommendation(place, cardEl) {
    if (elRecommendationsList) {
      elRecommendationsList.querySelectorAll('.recommendation-card').forEach(c => c.classList.remove('is-active'));
    }
    if (cardEl) {
      cardEl.classList.add('is-active');
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    VibePuneMap.focusPOI(place.id);
    openDetailDrawer(place);
  }

  function bindRecommendations() {
    if (elBtnCloseRecommendations) {
      elBtnCloseRecommendations.addEventListener('click', () => {
        closeRecommendations();
      });
    }

    if (elBtnLoadMoreRecs) {
      elBtnLoadMoreRecs.addEventListener('click', () => {
        currentRecsOffset += 10;
        executeVibeRecommendations(true);
      });
    }
  }

  function closeRecommendations() {
    isRecommendationsActive = false;
    if (elRecommendationsPanel) elRecommendationsPanel.classList.add('hidden');
    if (elResultsList) elResultsList.classList.remove('hidden');
    if (elResultCount) elResultCount.classList.remove('hidden');
    executeSearch();
  }

  // ------------------------------------------------------------------
  // Phase 7 & 8: Events Feature
  // ------------------------------------------------------------------
  const elBtnToggleEvents = document.getElementById('btn-toggle-events');
  const elEventsPanel = document.getElementById('events-panel');
  const elEventsList = document.getElementById('events-list');
  const elBtnCloseEvents = document.getElementById('btn-close-events');
  let _cachedEvents = [];
  let _activeTimeframe = 'all';

  function bindEvents() {
    if (elBtnToggleEvents) {
      elBtnToggleEvents.addEventListener('click', toggleEventsPanel);
    }
    if (elBtnCloseEvents) {
      elBtnCloseEvents.addEventListener('click', closeEventsPanel);
    }

    // Timeframe filter pills
    const timeChips = document.querySelectorAll('.event-time-chip');
    timeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        timeChips.forEach(c => c.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        _activeTimeframe = chip.getAttribute('data-timeframe') || 'all';
        loadEvents();
      });
    });
  }

  async function toggleEventsPanel() {
    if (!elEventsPanel) return;
    const isHidden = elEventsPanel.classList.contains('hidden');
    if (isHidden) {
      openEventsPanel();
    } else {
      closeEventsPanel();
    }
  }

  async function openEventsPanel() {
    if (!elEventsPanel) return;
    elEventsPanel.classList.remove('hidden');
    if (elBtnToggleEvents) elBtnToggleEvents.classList.add('is-active');
    if (elResultsList) elResultsList.classList.add('hidden');
    if (elRecommendationsPanel) elRecommendationsPanel.classList.add('hidden');
    if (elResultCount) elResultCount.classList.add('hidden');
    await loadEvents();
  }

  function closeEventsPanel() {
    if (!elEventsPanel) return;
    elEventsPanel.classList.add('hidden');
    if (elBtnToggleEvents) elBtnToggleEvents.classList.remove('is-active');
    if (elResultsList) elResultsList.classList.remove('hidden');
    if (elResultCount) elResultCount.classList.remove('hidden');
    VibePuneMap.clearEvents();
  }

  async function loadEvents() {
    if (!elEventsList) return;
    elEventsList.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-muted);">Finding upcoming Pune events...</div>';

    try {
      const res = await VibePuneAPI.getEvents({
        timeframe: _activeTimeframe === 'all' ? null : _activeTimeframe,
        ref_lat: currentLocation.lat,
        ref_lon: currentLocation.lon,
      });

      _cachedEvents = res.events || [];
      renderEventsList(_cachedEvents);
      VibePuneMap.renderEventMarkers(_cachedEvents, (ev) => {
        openEventDetail(ev);
      });
    } catch (err) {
      console.error('[VibePuneApp] Failed to load events:', err);
      elEventsList.innerHTML = '<p class="empty-state__title" style="padding:16px;text-align:center;">Could not load events.</p>';
    }
  }

  function renderEventsList(events) {
    if (!elEventsList) return;
    elEventsList.innerHTML = '';
    if (!events || !events.length) {
      elEventsList.innerHTML = '<p class="empty-state__title" style="padding:16px;text-align:center;">No upcoming events found for this timeframe.</p>';
      return;
    }

    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card';
      const distStr = ev.distance_m ? `${ev.distance_m < 1000 ? ev.distance_m + ' m' : ev.distance_km + ' km'} away` : '';
      const timeLabel = ev.timeframe_label || 'Upcoming';
      const priceStr = ev.price ? `<span class="event-card__price">${escapeHtml(ev.price)}</span>` : '';

      card.innerHTML = `
        <div class="event-card__top">
          <h4 class="event-card__title">${escapeHtml(ev.name)}</h4>
          <span class="event-card__pill">${escapeHtml(timeLabel)}</span>
        </div>
        <div class="event-card__meta">
          <span class="event-card__venue">📍 ${escapeHtml(ev.venue || 'Pune')}</span>
          ${distStr ? `<span>• ${distStr}</span>` : ''}
          ${priceStr}
        </div>
        <p class="event-card__desc" style="font-size:12px;color:var(--color-text-muted);margin:0;">${escapeHtml(ev.description || '')}</p>
      `;

      card.addEventListener('click', () => {
        openEventDetail(ev);
      });

      elEventsList.appendChild(card);
    });
  }

  function openEventDetail(ev) {
    const placeLike = {
      id: ev.id,
      name: ev.name,
      categoryName: `Event (${ev.category})`,
      category: ev.category,
      address: ev.venue || '',
      latitude: ev.latitude,
      longitude: ev.longitude,
      description: `${ev.description || ''}\n\nTime: ${ev.start_time}\nPrice: ${ev.price || 'Free / Unspecified'}\nSource: ${ev.source || 'Verified Source'}`,
      website: ev.source_url || null,
      phone: null,
      opening_hours: `${ev.timeframe_label || 'Upcoming'}: ${ev.start_time}`,
    };
    VibePuneMap.getMap().flyTo([ev.latitude, ev.longitude], 15, { animate: true, duration: 0.8 });
    openDetailDrawer(placeLike);
  }

  // ------------------------------------------------------------------
  // Phase 7 & 8: Spatial Analytics & GIS Insights
  // ------------------------------------------------------------------
  const elBtnToggleAnalytics = document.getElementById('btn-toggle-analytics');
  const elAnalyticsModal = document.getElementById('analytics-modal');
  const elBtnCloseAnalytics = document.getElementById('btn-close-analytics');
  const elStatTotalPois = document.getElementById('stat-total-pois');
  const elStatTotalEvents = document.getElementById('stat-total-events');
  const elAnalyticsCategoryBars = document.getElementById('analytics-category-bars');
  const elAnalyticsRadiiContainer = document.getElementById('analytics-radii-container');
  const elDensityCategorySelect = document.getElementById('density-category-select');
  const elBtnToggleDensityOverlay = document.getElementById('btn-toggle-density-overlay');
  const elDensityTableBody = document.getElementById('density-table-body');

  function bindAnalytics() {
    if (elBtnToggleAnalytics) {
      elBtnToggleAnalytics.addEventListener('click', openAnalyticsModal);
    }
    if (elBtnCloseAnalytics) {
      elBtnCloseAnalytics.addEventListener('click', closeAnalyticsModal);
    }

    if (elAnalyticsModal) {
      elAnalyticsModal.addEventListener('click', (e) => {
        if (e.target === elAnalyticsModal) closeAnalyticsModal();
      });
    }

    const tabs = document.querySelectorAll('.analytics-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        const tabKey = tab.getAttribute('data-tab');
        document.querySelectorAll('.analytics-view').forEach(v => v.classList.add('hidden'));
        const activeView = document.getElementById(`analytics-tab-${tabKey}`);
        if (activeView) activeView.classList.remove('hidden');

        if (tabKey === 'accessibility') loadAccessibilityAnalytics();
        if (tabKey === 'density') loadDensityAnalytics();
      });
    });

    if (elDensityCategorySelect) {
      elDensityCategorySelect.addEventListener('change', loadDensityAnalytics);
    }

    if (elBtnToggleDensityOverlay) {
      elBtnToggleDensityOverlay.addEventListener('click', () => {
        closeAnalyticsModal();
        showToast('Density hotspots overlaid on map 🔥');
      });
    }
  }

  async function openAnalyticsModal() {
    if (!elAnalyticsModal) return;
    elAnalyticsModal.classList.remove('hidden');
    await loadAnalyticsSummary();
  }

  function closeAnalyticsModal() {
    if (!elAnalyticsModal) return;
    elAnalyticsModal.classList.add('hidden');
  }

  async function loadAnalyticsSummary() {
    try {
      const summary = await VibePuneAPI.getAnalyticsSummary();
      if (elStatTotalPois) elStatTotalPois.textContent = (summary.total_places || 6043).toLocaleString();
      if (elStatTotalEvents) elStatTotalEvents.textContent = summary.total_upcoming_events || 10;

      if (elAnalyticsCategoryBars && summary.top_categories) {
        elAnalyticsCategoryBars.innerHTML = '';
        const maxCount = summary.top_categories[0] ? summary.top_categories[0].count : 1;

        summary.top_categories.slice(0, 7).forEach(c => {
          const pct = Math.round((c.count / maxCount) * 100);
          const row = document.createElement('div');
          row.className = 'category-bar-row';
          row.innerHTML = `
            <div class="category-bar-info">
              <span>${escapeHtml(c.category.replace(/-/g, ' ').toUpperCase())}</span>
              <span>${c.count.toLocaleString()} spots</span>
            </div>
            <div class="category-bar-track">
              <div class="category-bar-fill" style="width: ${pct}%;"></div>
            </div>
          `;
          elAnalyticsCategoryBars.appendChild(row);
        });
      }
    } catch (err) {
      console.warn('[VibePuneApp] Could not load analytics summary:', err);
    }
  }

  async function loadAccessibilityAnalytics() {
    if (!elAnalyticsRadiiContainer) return;
    elAnalyticsRadiiContainer.innerHTML = '<div style="text-align:center;padding:16px;color:var(--color-text-muted);">Computing PostGIS spatial buffers...</div>';

    try {
      const res = await VibePuneAPI.getAccessibility(currentLocation.lat, currentLocation.lon);
      elAnalyticsRadiiContainer.innerHTML = '';

      const radiiKeys = ['500m', '1000m', '3000m', '5000m'];
      radiiKeys.forEach(k => {
        const item = res.radii_metrics ? res.radii_metrics[k] : null;
        if (!item) return;

        const card = document.createElement('div');
        card.className = 'radius-card';

        const breakdownPills = Object.entries(item.category_breakdown || {})
          .slice(0, 5)
          .map(([cat, cnt]) => `<span class="radius-cat-pill">${escapeHtml(cat)}: ${cnt}</span>`)
          .join('');

        card.innerHTML = `
          <h4 class="radius-card__title">Within ${item.radius_km} km</h4>
          <div class="radius-card__meta">⏱️ ~${item.walk_time_est_min} min walk • <strong>${item.total_places.toLocaleString()} places</strong></div>
          <div class="radius-breakdown-list">${breakdownPills}</div>
        `;
        elAnalyticsRadiiContainer.appendChild(card);
      });
    } catch (err) {
      console.warn('[VibePuneApp] Could not load accessibility analytics:', err);
      elAnalyticsRadiiContainer.innerHTML = '<p class="empty-state__title">Accessibility analysis unavailable.</p>';
    }
  }

  async function loadDensityAnalytics() {
    const cat = elDensityCategorySelect ? elDensityCategorySelect.value : 'all';
    try {
      const res = await VibePuneAPI.getCategoryDensity(cat);
      if (elDensityTableBody && res.neighbourhoods) {
        elDensityTableBody.innerHTML = '';
        res.neighbourhoods.forEach(nb => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${escapeHtml(nb.neighbourhood)}</strong></td>
            <td>${nb.count}</td>
            <td><span style="font-size:11px;">${escapeHtml(nb.hotspot_tier)}</span></td>
          `;
          elDensityTableBody.appendChild(tr);
        });
      }
      VibePuneMap.renderDensityHotspots(res.neighbourhoods || []);
    } catch (err) {
      console.warn('[VibePuneApp] Could not load density analytics:', err);
    }
  }

  // ------------------------------------------------------------------
  // Smart Search Engine (Ranked Autocomplete, Recent Searches, Vibes)
  // ------------------------------------------------------------------
  function getRecentSearches() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function addToRecentSearches(item) {
    if (!item || !item.name) return;
    try {
      let list = getRecentSearches();
      list = list.filter(r => r.name.toLowerCase() !== item.name.toLowerCase());
      list.unshift({
        name: item.name,
        type: item.type || 'place',
        slug: item.slug || null,
        id: item.id || null,
        lat: item.lat || null,
        lon: item.lon || null,
        icon: item.icon || '📍'
      });
      list = list.slice(0, 5); // Max 5 recent items
      localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save recent search:', e);
    }
  }

  function clearRecentSearches() {
    localStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
    showEmptySearchState();
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    const cleanText = String(text);
    const qLower = query.toLowerCase();
    const idx = cleanText.toLowerCase().indexOf(qLower);
    if (idx === -1) return escapeHtml(cleanText);

    const before = cleanText.substring(0, idx);
    const match = cleanText.substring(idx, idx + query.length);
    const after = cleanText.substring(idx + query.length);
    return `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`;
  }

  function getRankedSuggestions(rawQuery) {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return [];

    const suggestions = [];

    // 1. Check Pune Area matches (High discovery intent)
    PUNE_AREAS.forEach(area => {
      const aName = area.name.toLowerCase();
      let score = 0;
      if (aName === q) score = 100;
      else if (aName.startsWith(q)) score = 85;
      else if (aName.includes(q)) score = 65;

      if (score > 0) {
        suggestions.push({
          type: 'area',
          name: area.name,
          subtitle: area.desc,
          icon: '📍',
          badge: 'Area',
          badgeClass: 'search-dropdown__item-badge--area',
          lat: area.lat,
          lon: area.lon,
          slug: area.slug,
          score
        });
      }
    });

    // 2. Check Lifestyle Category matches
    const knownCats = VibePuneCategories.getAllKnownCategories();
    knownCats.forEach(cat => {
      const cLabel = cat.label.toLowerCase();
      const cSlug = cat.slug.toLowerCase();
      const cVibe = (cat.vibe || '').toLowerCase();
      let score = 0;

      if (cLabel === q || cSlug === q) score = 95;
      else if (cLabel.startsWith(q) || cSlug.startsWith(q) || cVibe.startsWith(q)) score = 80;
      else if (cLabel.includes(q) || cVibe.includes(q)) score = 60;

      if (score > 0) {
        suggestions.push({
          type: 'category',
          name: cat.label,
          subtitle: `Browse all ${cat.vibe} spots`,
          icon: cat.emoji || '✨',
          badge: 'Category',
          badgeClass: 'search-dropdown__item-badge--category',
          slug: cat.slug,
          score
        });
      }
    });

    // 2.5. Check Upcoming Events
    if (_cachedEvents && _cachedEvents.length) {
      _cachedEvents.forEach(ev => {
        const eName = (ev.name || '').toLowerCase();
        const eCat = (ev.category || '').toLowerCase();
        const eVenue = (ev.venue || '').toLowerCase();
        let score = 0;
        if (eName === q) score = 96;
        else if (eName.startsWith(q) || eVenue.startsWith(q)) score = 82;
        else if (eName.includes(q) || eVenue.includes(q) || eCat.includes(q)) score = 66;

        if (score > 0) {
          suggestions.push({
            type: 'event',
            name: ev.name,
            subtitle: `🎟️ ${ev.venue || 'Pune'} · ${ev.timeframe_label || 'Upcoming'}`,
            icon: '🎟️',
            badge: 'Event',
            badgeClass: 'search-dropdown__item-badge--event',
            event: ev,
            score
          });
        }
      });
    }

    // 3. Check POIs in memory
    const places = VibePuneAPI.getLoadedPlaces();
    const matchedPlaces = [];

    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.categoryName || p.category || '').toLowerCase();
      let score = 0;

      if (pName === q) {
        score = 90;
      } else if (pName.startsWith(q)) {
        score = 75;
      } else {
        const words = pName.split(/[\s,.-]+/);
        if (words.some(w => w.startsWith(q))) {
          score = 65;
        } else if (pName.includes(q)) {
          score = 50;
        } else if (pCat.includes(q)) {
          score = 40;
        }
      }

      if (score > 0) {
        const dist = Math.round(haversineDistance(currentLocation.lat, currentLocation.lon, p.latitude, p.longitude));
        matchedPlaces.push({
          type: 'place',
          id: p.id,
          name: p.name,
          subtitle: `${p.categoryName || p.category} · ${formatDistance(dist)}`,
          icon: VibePuneCategories.getEmojiByCat(p.category) || '📍',
          badge: 'Place',
          badgeClass: '',
          lat: p.latitude,
          lon: p.longitude,
          distance_m: dist,
          rawPlace: p,
          score
        });
      }
    }

    // Sort matched places by score (desc), then distance (asc)
    matchedPlaces.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distance_m - b.distance_m;
    });

    // Combine: up to 2 categories, up to 2 areas, up to 2 events, and up to 5 places
    const catMatches = suggestions.filter(s => s.type === 'category').slice(0, 2);
    const areaMatches = suggestions.filter(s => s.type === 'area').slice(0, 2);
    const eventMatches = suggestions.filter(s => s.type === 'event').slice(0, 2);
    const placeMatches = matchedPlaces.slice(0, 5);

    const merged = [...catMatches, ...areaMatches, ...eventMatches, ...placeMatches];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, 8);
  }

  function renderSearchDropdown(items, query = '', emptyState = false) {
    if (!elSearchDropdown) return;
    elSearchDropdown.innerHTML = '';
    currentSuggestions = items;
    searchDropdownActiveIndex = -1;

    if (emptyState) {
      const recent = getRecentSearches();
      if (recent.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'search-dropdown__section';
        sec.innerHTML = `
          <div class="search-dropdown__section-head">
            <span class="search-dropdown__section-title">Recent Searches</span>
            <button type="button" class="search-dropdown__clear-history" id="btn-clear-recent">Clear</button>
          </div>
        `;
        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'search-dropdown__items';

        recent.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'search-dropdown__item';
          row.setAttribute('role', 'option');
          row.setAttribute('data-idx', idx);
          row.innerHTML = `
            <div class="search-dropdown__item-main">
              <span class="search-dropdown__item-icon">${escapeHtml(item.icon || '🕒')}</span>
              <div class="search-dropdown__item-text">
                <span class="search-dropdown__item-title">${escapeHtml(item.name)}</span>
              </div>
            </div>
            <span class="search-dropdown__item-badge">${escapeHtml(item.type)}</span>
          `;
          row.addEventListener('click', () => handleSuggestionSelect(item));
          itemsWrap.appendChild(row);
        });

        sec.appendChild(itemsWrap);
        elSearchDropdown.appendChild(sec);

        const btnClear = sec.querySelector('#btn-clear-recent');
        if (btnClear) {
          btnClear.addEventListener('click', (e) => {
            e.stopPropagation();
            clearRecentSearches();
          });
        }
      }

      // Quick curated vibes
      const vibesSec = document.createElement('div');
      vibesSec.className = 'search-dropdown__section';
      vibesSec.innerHTML = `
        <div class="search-dropdown__section-head">
          <span class="search-dropdown__section-title">Popular Vibes</span>
        </div>
        <div class="search-dropdown__chips">
          <button type="button" class="search-dropdown__chip" data-slug="aesthetic-cafe">☕ Chill & Coffee</button>
          <button type="button" class="search-dropdown__chip" data-slug="nightlife">🎵 Night Out</button>
          <button type="button" class="search-dropdown__chip" data-slug="nature">🌿 Nature & Peace</button>
          <button type="button" class="search-dropdown__chip" data-slug="dining">🍽️ Foodie</button>
          <button type="button" class="search-dropdown__chip" data-slug="viewpoint">📸 Scenic & Views</button>
          <button type="button" class="search-dropdown__chip" data-slug="shopping">🛍️ Shopping</button>
        </div>
      `;

      vibesSec.querySelectorAll('.search-dropdown__chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const slug = btn.getAttribute('data-slug');
          VibePuneCategories.selectCategory(slug);
          closeSearchDropdown();
          if (elSearchInput) elSearchInput.value = '';
          if (elBtnSearchClear) elBtnSearchClear.classList.add('hidden');
          executeSearch();
        });
      });

      elSearchDropdown.appendChild(vibesSec);
      elSearchDropdown.classList.remove('hidden');
      return;
    }

    if (!items || items.length === 0) {
      elSearchDropdown.innerHTML = `
        <div class="search-dropdown__empty">
          No matches found for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      elSearchDropdown.classList.remove('hidden');
      return;
    }

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'search-dropdown__items';

    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'search-dropdown__item';
      row.setAttribute('role', 'option');
      row.setAttribute('data-idx', idx);

      const titleHtml = highlightMatch(item.name, query);

      row.innerHTML = `
        <div class="search-dropdown__item-main">
          <span class="search-dropdown__item-icon">${escapeHtml(item.icon)}</span>
          <div class="search-dropdown__item-text">
            <span class="search-dropdown__item-title">${titleHtml}</span>
            ${item.subtitle ? `<span class="search-dropdown__item-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
          </div>
        </div>
        <span class="search-dropdown__item-badge ${item.badgeClass || ''}">${escapeHtml(item.badge || item.type)}</span>
      `;

      row.addEventListener('mouseenter', () => {
        setDropdownActiveIndex(idx);
      });

      row.addEventListener('click', () => {
        handleSuggestionSelect(item);
      });

      itemsWrap.appendChild(row);
    });

    elSearchDropdown.appendChild(itemsWrap);
    elSearchDropdown.classList.remove('hidden');
  }

  function setDropdownActiveIndex(idx) {
    searchDropdownActiveIndex = idx;
    if (!elSearchDropdown) return;
    const items = elSearchDropdown.querySelectorAll('.search-dropdown__item');
    items.forEach((el, i) => {
      const isActive = i === idx;
      el.classList.toggle('is-selected', isActive);
      if (isActive) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function closeSearchDropdown() {
    if (elSearchDropdown) {
      elSearchDropdown.classList.add('hidden');
    }
    searchDropdownActiveIndex = -1;
  }

  function showEmptySearchState() {
    renderSearchDropdown([], '', true);
  }

  function handleSuggestionSelect(item) {
    if (!item) return;
    addToRecentSearches(item);
    closeSearchDropdown();

    if (item.type === 'area') {
      if (elSearchInput) elSearchInput.value = item.name;
      if (elBtnSearchClear) elBtnSearchClear.classList.remove('hidden');
      updateLocation(item.lat, item.lon, item.name);
      if (elSimulatorSelect && item.slug) {
        elSimulatorSelect.value = item.slug;
      }
    } else if (item.type === 'category') {
      if (elSearchInput) elSearchInput.value = '';
      if (elBtnSearchClear) elBtnSearchClear.classList.add('hidden');
      VibePuneCategories.selectCategory(item.slug);
      executeSearch();
    } else if (item.type === 'place') {
      if (elSearchInput) elSearchInput.value = item.name;
      if (elBtnSearchClear) elBtnSearchClear.classList.remove('hidden');
      const place = item.rawPlace || item;
      VibePuneMap.focusPOI(place.id);
      openDetailDrawer(place);
    } else if (item.type === 'event' && item.event) {
      if (elSearchInput) elSearchInput.value = item.name;
      if (elBtnSearchClear) elBtnSearchClear.classList.remove('hidden');
      openEventDetail(item.event);
    }
  }

  function bindSmartSearch() {
    if (!elSearchInput) return;

    // Show empty state recommendations on focus
    elSearchInput.addEventListener('focus', () => {
      const val = elSearchInput.value.trim();
      if (!val) {
        showEmptySearchState();
      } else {
        const suggestions = getRankedSuggestions(val);
        renderSearchDropdown(suggestions, val);
      }
    });

    // Keystroke typing autocomplete
    elSearchInput.addEventListener('input', () => {
      const val = elSearchInput.value.trim();
      if (elBtnSearchClear) {
        elBtnSearchClear.classList.toggle('hidden', val.length === 0);
      }

      if (!val) {
        showEmptySearchState();
        clearTimeout(serverSearchDebounceTimer);
        serverSearchDebounceTimer = setTimeout(() => executeSearch(), 300);
        return;
      }

      // 1. Instant local suggestions
      const suggestions = getRankedSuggestions(val);
      renderSearchDropdown(suggestions, val);

      // 2. Debounced server search execution
      clearTimeout(serverSearchDebounceTimer);
      serverSearchDebounceTimer = setTimeout(() => {
        executeSearch();
      }, 400);
    });

    // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
    elSearchInput.addEventListener('keydown', (e) => {
      if (elSearchDropdown && !elSearchDropdown.classList.contains('hidden')) {
        const items = elSearchDropdown.querySelectorAll('.search-dropdown__item');
        if (items.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (searchDropdownActiveIndex + 1) % items.length;
            setDropdownActiveIndex(nextIdx);
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (searchDropdownActiveIndex - 1 + items.length) % items.length;
            setDropdownActiveIndex(prevIdx);
            return;
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchDropdownActiveIndex >= 0 && currentSuggestions[searchDropdownActiveIndex]) {
              handleSuggestionSelect(currentSuggestions[searchDropdownActiveIndex]);
            } else {
              closeSearchDropdown();
              executeSearch();
            }
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        closeSearchDropdown();
        elSearchInput.blur();
      } else if (e.key === 'Enter') {
        closeSearchDropdown();
        executeSearch();
      }
    });

    // Clear search button
    if (elBtnSearchClear) {
      elBtnSearchClear.addEventListener('click', () => {
        elSearchInput.value = '';
        elBtnSearchClear.classList.add('hidden');
        closeSearchDropdown();
        elSearchInput.focus();
        executeSearch();
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (elHeaderSearchWrap && !elHeaderSearchWrap.contains(e.target)) {
        closeSearchDropdown();
      }
    });
  }

  // ------------------------------------------------------------------
  // Share Action
  // ------------------------------------------------------------------
  async function sharePlace(poi) {
    if (!poi) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?place=${encodeURIComponent(poi.id)}`;
    const shareData = {
      title: `${poi.name} | VibePune`,
      text: `Discover ${poi.name} (${poi.categoryName || poi.category || 'Place'}) on VibePune!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[VibePuneApp] Web Share failed, falling back to clipboard:', err);
        } else {
          return;
        }
      }
    }

    // Fallback: clipboard copy
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!');
      } else {
        const temp = document.createElement('input');
        temp.value = shareUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast('Link copied to clipboard!');
      }
    } catch (e) {
      showToast(`Share URL: ${shareUrl}`);
    }
  }

  // ------------------------------------------------------------------
  // Official Google Maps Directions URL Generator
  // ------------------------------------------------------------------
  function getGoogleMapsDirectionsUrl(fromLat, fromLon, toLat, toLon, mode = 'driving') {
    const travelMode = mode === 'walking' ? 'walking' : 'driving';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromLat + ',' + fromLon)}&destination=${encodeURIComponent(toLat + ',' + toLon)}&travelmode=${travelMode}`;
  }

  // ------------------------------------------------------------------
  // Toast Notifications
  // ------------------------------------------------------------------
  let toastTimeout = null;
  function showToast(message, duration = 3000) {
    if (!elVibeToast) return;
    elVibeToast.textContent = message;
    elVibeToast.classList.remove('hidden');
    void elVibeToast.offsetWidth;
    elVibeToast.classList.add('is-visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      elVibeToast.classList.remove('is-visible');
      setTimeout(() => elVibeToast.classList.add('hidden'), 300);
    }, duration);
  }

  // ------------------------------------------------------------------
  // Theme
  // ------------------------------------------------------------------
  function initTheme() {
    const saved = localStorage.getItem('vibepune-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    updateThemeIcon();

    if (elBtnThemeToggle) {
      elBtnThemeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('vibepune-theme', next);
        updateThemeIcon();
      });
    }
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (lightIcon) lightIcon.classList.toggle('hidden', isDark);
    if (darkIcon) darkIcon.classList.toggle('hidden', !isDark);
  }

  // ------------------------------------------------------------------
  // Radius Display
  // ------------------------------------------------------------------
  function updateRadiusDisplay(meters) {
    if (!elRadiusDisplay) return;
    if (meters >= 1000) {
      elRadiusDisplay.textContent = `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
    } else {
      elRadiusDisplay.textContent = `${meters} m`;
    }
  }

  // ------------------------------------------------------------------
  // Location
  // ------------------------------------------------------------------
  function updateLocation(lat, lon, label) {
    currentLocation = { lat, lon, label };
    if (elCurLocText) elCurLocText.textContent = label;
    VibePuneMap.setLocationMarker(lat, lon, label);
    const r = parseInt(elRadiusSlider?.value || 2000, 10);
    VibePuneMap.setRadiusCircle(lat, lon, r);
    const m = VibePuneMap.getMap();
    if (m) m.flyTo([lat, lon], 14, { animate: true, duration: 0.8 });
    executeSearch();

    // If an active route is open, recalculate from new location
    if (currentRoutingPOI) {
      triggerDirections(currentRoutingPOI, currentRoutingProfile);
    }
  }

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------
  async function executeSearch() {
    if (isSearching) return;
    isSearching = true;

    const query = elSearchInput ? elSearchInput.value.trim() : '';
    const category = VibePuneCategories.getSelected();
    const radiusM = parseInt(elRadiusSlider?.value || 2000, 10);
    const limit = 100;

    // Reset button visibility
    if (elBtnClearCategory) {
      elBtnClearCategory.classList.toggle('hidden', !category);
    }
    if (elBtnSearchClear) {
      elBtnSearchClear.classList.toggle('hidden', query.length === 0);
    }

    showLoading();

    // Case 1: Saved Places Filter Mode
    if (isSavedFilterActive) {
      try {
        const savedRaw = getSavedPlaceIds();
        const allPlaces = VibePuneAPI.getLoadedPlaces();
        let savedItems = savedRaw.map(item => {
          const idStr = String(item.id || item);
          const found = allPlaces.find(p => String(p.id) === idStr);
          return found ? { ...found } : (typeof item === 'object' ? { ...item } : { id: item, name: 'Saved Place' });
        });

        // Compute distance from currentLocation
        savedItems = savedItems.map(p => {
          const lat = p.latitude != null ? p.latitude : currentLocation.lat;
          const lon = p.longitude != null ? p.longitude : currentLocation.lon;
          const d = Math.round(haversineDistance(currentLocation.lat, currentLocation.lon, lat, lon));
          return { ...p, distance_m: d };
        }).sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));

        if (category) {
          savedItems = savedItems.filter(p => p.category === category);
        }
        if (query) {
          const qLower = query.toLowerCase();
          savedItems = savedItems.filter(p => (p.name || '').toLowerCase().includes(qLower));
        }

        VibePuneMap.renderPOIs(savedItems, handleMarkerClick);
        renderResults(savedItems);
        updateResultCount(savedItems.length);

        if (elResultFilterTag) {
          elResultFilterTag.textContent = `Saved (${savedItems.length})`;
          elResultFilterTag.classList.remove('hidden');
        }
      } catch (err) {
        console.error('[VibePuneApp] Saved filter search failed:', err);
        renderEmptyState('Failed to load saved places.');
        updateResultCount(0);
      } finally {
        hideLoading();
        isSearching = false;
      }
      return;
    }

    // Case 2: Standard API Search
    try {
      const results = await VibePuneAPI.search({
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        radius_m: radiusM,
        category: category || undefined,
        q: query || undefined,
        limit: limit,
      });

      const items = results.items || [];
      VibePuneMap.renderPOIs(items, handleMarkerClick);
      renderResults(items);
      updateResultCount(results.total || items.length);

      if (elResultFilterTag) {
        if (category) {
          elResultFilterTag.textContent = VibePuneCategories.getCategoryLabel(category);
          elResultFilterTag.classList.remove('hidden');
        } else {
          elResultFilterTag.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('[VibePuneApp] Search failed:', err);
      renderEmptyState('Search failed. Please try again.');
      updateResultCount(0);
    } finally {
      hideLoading();
      isSearching = false;
    }
  }

  function showLoading() {
    if (elResultsList) elResultsList.classList.add('hidden');
    if (elResultsLoading) elResultsLoading.classList.remove('hidden');
  }

  function hideLoading() {
    if (elResultsLoading) elResultsLoading.classList.add('hidden');
    if (elResultsList) elResultsList.classList.remove('hidden');
  }

  function updateResultCount(count) {
    if (elResultCount) elResultCount.textContent = count;
  }

  // ------------------------------------------------------------------
  // Results Rendering
  // ------------------------------------------------------------------
  function renderResults(items) {
    if (!elResultsList) return;
    elResultsList.innerHTML = '';

    if (!items || items.length === 0) {
      renderEmptyState(isSavedFilterActive ? 'No saved places found' : 'No places found');
      return;
    }

    items.forEach((poi, i) => {
      const card = document.createElement('div');
      card.className = 'result-card animate-slide-up';
      card.setAttribute('data-poi-id', poi.id);
      card.style.animationDelay = `${Math.min(i * 30, 300)}ms`;

      const dist = formatDistance(poi.distance_m);
      const emoji = VibePuneCategories.getEmojiByCat(poi.category);
      const isSaved = isPlaceSaved(poi.id);

      card.innerHTML = `
        <div class="result-card__top">
          <h4 class="result-card__name">${escapeHtml(poi.name)}</h4>
          <div class="result-card__actions-top">
            <span class="result-card__distance">${dist}</span>
            <button class="result-card__save-btn ${isSaved ? 'is-saved' : ''}" type="button" title="${isSaved ? 'Remove from saved' : 'Save place'}" aria-label="Save place">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="result-card__meta">
          <span class="result-card__category-badge">${emoji} ${escapeHtml(poi.categoryName || poi.category)}</span>
        </div>
        ${poi.address ? `<div class="result-card__address">${escapeHtml(poi.address)}</div>` : ''}
      `;

      // Bookmark button on card
      const saveBtn = card.querySelector('.result-card__save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const nowSaved = toggleSavePlace(poi);
          saveBtn.classList.toggle('is-saved', nowSaved);
          const icon = saveBtn.querySelector('svg');
          if (icon) icon.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
          if (currentActivePOI && String(currentActivePOI.id) === String(poi.id)) {
            updateDrawerSaveButton(poi.id);
          }
        });
      }

      // Card selection click
      card.addEventListener('click', () => {
        elResultsList.querySelectorAll('.result-card').forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');

        VibePuneMap.focusPOI(poi.id);
        openDetailDrawer(poi);
      });

      elResultsList.appendChild(card);
    });
  }

  function renderEmptyState(message) {
    if (!elResultsList) return;
    elResultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <div class="empty-state__title">${message || 'No places found'}</div>
        <div class="empty-state__text">Try increasing the radius, exploring other vibes, or searching a different neighborhood.</div>
      </div>
    `;
  }


  // ------------------------------------------------------------------
  // Rich Detail Drawer
  // ------------------------------------------------------------------
  async function openDetailDrawer(poi) {
    if (!poi) return;
    currentActivePOI = poi;

    if (elDetailDrawer) elDetailDrawer.classList.add('is-open');
    currentActivePOI = poi;

    // 1. Immediate visual population from summary
    const emoji = VibePuneCategories.getEmojiByCat(poi.category);
    if (elDetailIcon) elDetailIcon.textContent = emoji;
    if (elDetailName) elDetailName.textContent = poi.name;
    if (elDetailCategory) elDetailCategory.textContent = poi.categoryName || poi.category;
    if (elDetailDistance) elDetailDistance.textContent = poi.distance_m != null ? `${formatDistance(poi.distance_m)} away` : '';
    if (elDetailBadge) elDetailBadge.textContent = poi.categoryName || poi.category || 'Place';
    updateDrawerSaveButton(poi.id);

    // Initial placeholder state for photos
    if (elDetailHeroImage) elDetailHeroImage.classList.add('hidden');
    if (elDetailHeroPlaceholder) elDetailHeroPlaceholder.style.display = 'flex';

    // Show loading skeleton inside content body
    if (elDetailLoading) elDetailLoading.classList.remove('hidden');
    if (elDetailContent) elDetailContent.classList.add('hidden');

    // 2. Fetch full verified detail from backend API (skip for events)
    let detailData = poi;
    if (poi.id && !String(poi.id).startsWith('evt-')) {
      try {
        const full = await VibePuneAPI.placeDetail(poi.id);
        if (full) {
          detailData = full;
          if (detailData.distance_m == null && poi.distance_m != null) {
            detailData.distance_m = poi.distance_m;
          }
        }
      } catch (err) {
        console.warn(`[VibePuneApp] Could not fetch enriched details for ${poi.id}:`, err);
      } finally {
        if (elDetailLoading) elDetailLoading.classList.add('hidden');
        if (elDetailContent) elDetailContent.classList.remove('hidden');
      }
    } else {
      if (elDetailLoading) elDetailLoading.classList.add('hidden');
      if (elDetailContent) elDetailContent.classList.remove('hidden');
    }

    currentActivePOI = detailData;

    // Name & Category
    if (elDetailName) elDetailName.textContent = detailData.name || 'Unnamed Place';
    if (elDetailCategory) elDetailCategory.textContent = detailData.categoryName || detailData.category || 'POI';
    if (elDetailDistance) {
      elDetailDistance.textContent = detailData.distance_m != null ? `${formatDistance(detailData.distance_m)} away` : '';
    }

    // Hero Visual: Photo architecture
    if (detailData.photos && Array.isArray(detailData.photos) && detailData.photos.length > 0) {
      const photoUrl = detailData.photos[0];
      if (elDetailHeroImage) {
        elDetailHeroImage.src = photoUrl;
        elDetailHeroImage.classList.remove('hidden');
        if (elDetailHeroPlaceholder) elDetailHeroPlaceholder.style.display = 'none';
      }
    } else {
      if (elDetailHeroImage) elDetailHeroImage.classList.add('hidden');
      if (elDetailHeroPlaceholder) elDetailHeroPlaceholder.style.display = 'flex';
    }

    // Verified Ratings (Hidden if not verified)
    if (detailData.rating != null && elDetailRatingRow) {
      elDetailRatingRow.classList.remove('hidden');
      if (elDetailRatingScore) elDetailRatingScore.textContent = detailData.rating.toFixed(1);
      if (elDetailReviewCount) {
        elDetailReviewCount.textContent = detailData.review_count != null ? `(${detailData.review_count} reviews)` : '';
      }
    } else if (elDetailRatingRow) {
      elDetailRatingRow.classList.add('hidden');
    }

    // Quick Actions Bar
    if (elBtnDetailCall) {
      if (detailData.phone && String(detailData.phone).trim()) {
        const cleanPhone = String(detailData.phone).replace(/[^\d+]/g, '');
        elBtnDetailCall.href = `tel:${cleanPhone}`;
        elBtnDetailCall.classList.remove('hidden');
      } else {
        elBtnDetailCall.classList.add('hidden');
        elBtnDetailCall.removeAttribute('href');
      }
    }

    if (elBtnDetailWebsite) {
      if (detailData.website && String(detailData.website).trim()) {
        let validUrl = String(detailData.website).trim();
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
          validUrl = 'https://' + validUrl;
        }
        elBtnDetailWebsite.href = validUrl;
        elBtnDetailWebsite.classList.remove('hidden');
      } else {
        elBtnDetailWebsite.classList.add('hidden');
        elBtnDetailWebsite.removeAttribute('href');
      }
    }

    // Google Maps External Directions Action
    if (elBtnDetailGmaps) {
      if (detailData.latitude && detailData.longitude) {
        const gmapsUrl = getGoogleMapsDirectionsUrl(
          currentLocation.lat,
          currentLocation.lon,
          detailData.latitude,
          detailData.longitude,
          currentRoutingProfile
        );
        elBtnDetailGmaps.href = gmapsUrl;
        elBtnDetailGmaps.classList.remove('hidden');
      } else {
        elBtnDetailGmaps.classList.add('hidden');
      }
    }

    if (elBtnDetailDirections) {
      if (detailData.latitude && detailData.longitude) {
        elBtnDetailDirections.removeAttribute('disabled');
      } else {
        elBtnDetailDirections.setAttribute('disabled', 'true');
      }
    }

    // About / Description
    if (elDetailDescription) {
      if (detailData.description && String(detailData.description).trim()) {
        elDetailDescription.textContent = detailData.description;
      } else {
        elDetailDescription.textContent = 'No description available for this place.';
      }
    }

    // Location & Coordinates
    if (elDetailAddress) {
      elDetailAddress.textContent = detailData.address || 'Address not available in OpenStreetMap.';
    }
    if (elDetailCoords) {
      if (detailData.latitude && detailData.longitude) {
        elDetailCoords.textContent = `${detailData.latitude.toFixed(4)}° N, ${detailData.longitude.toFixed(4)}° E`;
      } else {
        elDetailCoords.textContent = 'Coordinates not available';
      }
    }

    // Opening Hours
    if (elDetailHours) {
      if (detailData.opening_hours && String(detailData.opening_hours).trim()) {
        elDetailHours.textContent = detailData.opening_hours;
      } else {
        elDetailHours.textContent = 'Opening hours not available.';
      }
    }

    // Contact List
    if (elDetailContactPhone) {
      if (detailData.phone && String(detailData.phone).trim()) {
        elDetailContactPhone.innerHTML = `<a href="tel:${String(detailData.phone).replace(/[^\d+]/g, '')}">${escapeHtml(detailData.phone)}</a>`;
        if (elDetailContactPhoneRow) elDetailContactPhoneRow.classList.remove('hidden');
      } else {
        elDetailContactPhone.textContent = 'Not available';
      }
    }

    if (elDetailContactWeb) {
      if (detailData.website && String(detailData.website).trim()) {
        let validUrl = String(detailData.website).trim();
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
          validUrl = 'https://' + validUrl;
        }
        elDetailContactWeb.innerHTML = `<a href="${escapeHtml(validUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(detailData.website)}</a>`;
        if (elDetailContactWebRow) elDetailContactWebRow.classList.remove('hidden');
      } else {
        elDetailContactWeb.textContent = 'Not available';
      }
    }

    // Social Links
    if (elDetailContactSocialRow && elDetailContactSocial) {
      if (detailData.social && Object.keys(detailData.social).length > 0) {
        const socialLinks = Object.entries(detailData.social)
          .map(([platform, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${platform}</a>`)
          .join(' • ');
        elDetailContactSocial.innerHTML = socialLinks;
        elDetailContactSocialRow.classList.remove('hidden');
      } else {
        elDetailContactSocialRow.classList.add('hidden');
      }
    }

    // Verified Reviews Architecture
    if (elDetailReviewsSection && elDetailReviewsList) {
      if (detailData.reviews && Array.isArray(detailData.reviews) && detailData.reviews.length > 0) {
        elDetailReviewsSection.classList.remove('hidden');
        elDetailReviewsList.innerHTML = detailData.reviews.map(r => `
          <div class="review-item">
            <div class="review-item__header">
              <strong>${escapeHtml(r.author || 'Anonymous')}</strong>
              <span>${r.rating ? '★ ' + r.rating : ''}</span>
            </div>
            <p class="review-item__text">${escapeHtml(r.text || '')}</p>
          </div>
        `).join('');
      } else {
        elDetailReviewsSection.classList.add('hidden');
        elDetailReviewsList.innerHTML = '';
      }
    }
  }

  function closeDetailDrawer(options = {}) {
    if (elDetailDrawer) elDetailDrawer.classList.remove('is-open');
    currentActivePOI = null;
    if (elResultsList) {
      elResultsList.querySelectorAll('.result-card').forEach(c => c.classList.remove('is-active'));
    }

    VibePuneMap.closePopup();

    if (options.restoreView !== false) {
      VibePuneMap.restoreSearchView();
    }
  }

  // ------------------------------------------------------------------
  // Phase 4: Directions & Routing Actions
  // ------------------------------------------------------------------
  async function triggerDirections(poi, profile = null) {
    const target = poi || currentActivePOI;
    if (!target) return;

    const targetLat = target.latitude != null ? target.latitude : target.lat;
    const targetLon = target.longitude != null ? target.longitude : target.lon;

    if (targetLat == null || targetLon == null) {
      showToast('Coordinates unavailable for routing');
      return;
    }

    target.latitude = targetLat;
    target.longitude = targetLon;
    currentRoutingPOI = target;
    if (profile) currentRoutingProfile = profile;

    updateRouteModeButtons(currentRoutingProfile);

    try {
      showToast(`Routing to ${target.name} (${currentRoutingProfile})...`);

      const route = await VibePuneAPI.directions({
        from_lat: currentLocation.lat,
        from_lon: currentLocation.lon,
        to_lat: targetLat,
        to_lon: targetLon,
        profile: currentRoutingProfile,
      });

      if (route && route.geometry && route.geometry.coordinates) {
        // Draw real route on map
        VibePuneMap.drawRoute(route.geometry.coordinates, currentRoutingProfile);

        // Update floating Route Info Panel
        if (elRouteDestName) elRouteDestName.textContent = target.name;
        if (elRouteDistVal) {
          const distM = route.distance_m || 0;
          elRouteDistVal.textContent = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
        }
        if (elRouteDurVal) {
          const durS = route.duration_s || 0;
          const mins = Math.max(1, Math.round(durS / 60));
          elRouteDurVal.textContent = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
        }

        // Set Google Maps navigation URL
        const gmapsUrl = getGoogleMapsDirectionsUrl(
          currentLocation.lat,
          currentLocation.lon,
          target.latitude,
          target.longitude,
          currentRoutingProfile
        );
        if (elBtnOpenGmaps) elBtnOpenGmaps.href = gmapsUrl;
        if (elBtnDetailGmaps) {
          elBtnDetailGmaps.href = gmapsUrl;
          elBtnDetailGmaps.classList.remove('hidden');
        }

        // Display panel
        if (elRoutePanel) elRoutePanel.classList.remove('hidden');
      }

      closeDetailDrawer({ restoreView: false });
    } catch (e) {
      console.error('[VibePuneApp] Directions error:', e);
      showToast('Unable to calculate route. Please try again.');
    }
  }

  function clearActiveRoute() {
    currentRoutingPOI = null;
    VibePuneMap.clearRoute();
    if (elRoutePanel) elRoutePanel.classList.add('hidden');
    showToast('Route cleared');
  }

  function updateRouteModeButtons(profile) {
    const isDriving = profile === 'driving';
    const isWalking = profile === 'walking';

    if (elBtnModeDriving) {
      elBtnModeDriving.classList.toggle('is-active', isDriving);
      elBtnModeDriving.setAttribute('aria-selected', isDriving ? 'true' : 'false');
    }
    if (elBtnModeWalking) {
      elBtnModeWalking.classList.toggle('is-active', isWalking);
      elBtnModeWalking.setAttribute('aria-selected', isWalking ? 'true' : 'false');
    }
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  function handleCategoryChange() { executeSearch(); }

  function handleMarkerClick(poi) {
    if (elResultsList) {
      elResultsList.querySelectorAll('.result-card').forEach(c => c.classList.remove('is-active'));
      const activeCard = elResultsList.querySelector(`[data-poi-id="${poi.id}"]`);
      if (activeCard) {
        activeCard.classList.add('is-active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    openDetailDrawer(poi);
  }

  // ------------------------------------------------------------------
  // Bindings
  // ------------------------------------------------------------------
  function bindDrawer() {
    if (elBtnCloseDrawer) {
      elBtnCloseDrawer.addEventListener('click', () => {
        closeDetailDrawer({ restoreView: true });
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elDetailDrawer && elDetailDrawer.classList.contains('is-open')) {
          closeDetailDrawer({ restoreView: true });
        } else if (currentRoutingPOI) {
          clearActiveRoute();
        }
      }
    });

    if (elBtnDetailDirections) {
      elBtnDetailDirections.addEventListener('click', () => {
        triggerDirections(currentActivePOI);
      });
    }

    if (elBtnDetailSave) {
      elBtnDetailSave.addEventListener('click', () => {
        if (!currentActivePOI) return;
        toggleSavePlace(currentActivePOI);
      });
    }

    if (elBtnDetailShare) {
      elBtnDetailShare.addEventListener('click', () => {
        if (!currentActivePOI) return;
        sharePlace(currentActivePOI);
      });
    }
  }

  function bindRouteControls() {
    if (elBtnModeDriving) {
      elBtnModeDriving.addEventListener('click', () => {
        if (currentRoutingPOI) triggerDirections(currentRoutingPOI, 'driving');
      });
    }

    if (elBtnModeWalking) {
      elBtnModeWalking.addEventListener('click', () => {
        if (currentRoutingPOI) triggerDirections(currentRoutingPOI, 'walking');
      });
    }

    if (elBtnRouteClear) {
      elBtnRouteClear.addEventListener('click', () => {
        clearActiveRoute();
      });
    }
  }

  function bindLocation() {
    if (elBtnLocSelector && elAdvLocControls) {
      elBtnLocSelector.addEventListener('click', () => {
        elAdvLocControls.classList.toggle('hidden');
      });
    }

    if (elSimulatorSelect) {
      elSimulatorSelect.addEventListener('change', () => {
        const key = elSimulatorSelect.value;
        const target = LOCATIONS[key];
        if (!target) return;
        updateLocation(target.lat, target.lon, target.label);
      });
    }
  }

  function bindToolbar() {
    if (elBtnLocate) {
      elBtnLocate.addEventListener('click', () => {
        VibePuneMap.locateUser(
          ({ lat, lon }) => {
            if (elSimulatorSelect) elSimulatorSelect.value = 'default';
            updateLocation(lat, lon, 'Your Location');
          },
          () => {
            console.warn('[VibePuneApp] Geolocation denied.');
          }
        );
      });
    }

    if (elBtnZoomDefault) {
      elBtnZoomDefault.addEventListener('click', () => {
        if (elSimulatorSelect) elSimulatorSelect.value = 'default';
        updateLocation(LOCATIONS.default.lat, LOCATIONS.default.lon, LOCATIONS.default.label);
        VibePuneMap.resetToDefault();
      });
    }
  }

  // ------------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------------
  function hideMapLoading() {
    if (elMapLoading) elMapLoading.classList.add('hidden');
  }

  function formatDistance(meters) {
    if (meters == null) return '';
    return meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${meters} m`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ------------------------------------------------------------------
  // Bootstrap
  // ------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
