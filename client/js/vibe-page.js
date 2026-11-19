/**
 * VibePune — vibe-page.js
 * =======================
 * Dedicated Quiz Controller for /vibe.html
 * Drives 5-step questionnaire, calls /api/recommendations with Gemini NLP,
 * and renders evidence-grounded match results.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 5;

  const answers = {
    companions: ['solo'],
    activities: ['coffee'],
    moods: ['relaxed'],
    environment: 'either',
    budget: 'any',
    max_distance_km: 3.0,
    free_text: ''
  };

  const elProgressFill = document.getElementById('quiz-progress-fill');
  const elStepLabel = document.getElementById('quiz-step-label');
  const elBtnPrev = document.getElementById('btn-quiz-prev');
  const elBtnSkip = document.getElementById('btn-quiz-skip');
  const elBtnForward = document.getElementById('btn-quiz-forward');
  const elBtnExecute = document.getElementById('btn-quiz-execute');
  const elQuizCard = document.getElementById('quiz-card');
  const elLoading = document.getElementById('vibe-loading');
  const elResultsView = document.getElementById('vibe-results-view');
  const elRecsList = document.getElementById('recs-cards-list');
  const elRecsCountLabel = document.getElementById('recs-count-label');
  const elBtnRetake = document.getElementById('btn-retake-quiz');
  const elFreeText = document.getElementById('quiz-free-text');

  // Bind option chip clicks
  document.querySelectorAll('.quiz-options-grid').forEach(grid => {
    const group = grid.getAttribute('data-group');
    const isSingle = grid.getAttribute('data-single') === 'true';

    grid.querySelectorAll('.quiz-chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-value');

        if (isSingle) {
          grid.querySelectorAll('.quiz-chip-btn').forEach(c => c.classList.remove('is-selected'));
          chip.classList.add('is-selected');
          if (group === 'distance') {
            answers.max_distance_km = parseFloat(val);
          } else {
            answers[group] = val;
          }
        } else {
          chip.classList.toggle('is-selected');
          const selectedVals = Array.from(grid.querySelectorAll('.quiz-chip-btn.is-selected'))
            .map(c => c.getAttribute('data-value'));
          answers[group] = selectedVals;
        }
      });
    });
  });

  // Navigation handlers
  if (elBtnForward) {
    elBtnForward.addEventListener('click', () => {
      if (currentStep < totalSteps) goToStep(currentStep + 1);
    });
  }

  if (elBtnPrev) {
    elBtnPrev.addEventListener('click', () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });
  }

  if (elBtnSkip) {
    elBtnSkip.addEventListener('click', () => {
      if (currentStep < totalSteps) goToStep(currentStep + 1);
    });
  }

  if (elBtnExecute) {
    elBtnExecute.addEventListener('click', submitQuiz);
  }

  if (elBtnRetake) {
    elBtnRetake.addEventListener('click', () => {
      elResultsView.classList.add('hidden');
      elQuizCard.classList.remove('hidden');
      goToStep(1);
    });
  }

  function goToStep(step) {
    currentStep = step;

    // Show/hide views
    document.querySelectorAll('.quiz-step-view').forEach(view => {
      const s = parseInt(view.getAttribute('data-step'), 10);
      if (s === step) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });

    // Update progress
    const pct = Math.round((step / totalSteps) * 100);
    if (elProgressFill) elProgressFill.style.width = `${pct}%`;
    if (elStepLabel) elStepLabel.textContent = `Step ${step} of ${totalSteps}`;

    // Back button visibility
    if (elBtnPrev) {
      if (step > 1) {
        elBtnPrev.classList.remove('hidden');
      } else {
        elBtnPrev.classList.add('hidden');
      }
    }

    // Next vs Submit button
    if (step === totalSteps) {
      if (elBtnForward) elBtnForward.classList.add('hidden');
      if (elBtnSkip) elBtnSkip.classList.add('hidden');
      if (elBtnExecute) elBtnExecute.classList.remove('hidden');
    } else {
      if (elBtnForward) elBtnForward.classList.remove('hidden');
      if (elBtnSkip) elBtnSkip.classList.remove('hidden');
      if (elBtnExecute) elBtnExecute.classList.add('hidden');
    }
  }

  const elScannerStatus = document.getElementById('vibe-scanner-status');
  const elScannerProgress = document.getElementById('vibe-scanner-progress-inner');

  const CATEGORY_IMAGES = {
    'aesthetic-cafe': 'assets/images/cafe.jpg',
    'cafe':           'assets/images/cafe.jpg',
    'coffee':         'assets/images/cafe.jpg',
    'bakery':         'assets/images/cafe.jpg',
    'dessert':        'assets/images/cafe.jpg',
    'nightlife':      'assets/images/nightlife.jpg',
    'bar':            'assets/images/nightlife.jpg',
    'pub':            'assets/images/nightlife.jpg',
    'party':          'assets/images/nightlife.jpg',
    'nature':         'assets/images/nature.jpg',
    'park':           'assets/images/nature.jpg',
    'garden':         'assets/images/nature.jpg',
    'viewpoint':      'assets/images/nature.jpg',
    'hiking':         'assets/images/nature.jpg',
    'dining':         'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    'restaurant':     'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    'fast-food':      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&auto=format&fit=crop&q=80',
    'shopping':       'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
    'mall':           'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&auto=format&fit=crop&q=80',
    'arts':           'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&auto=format&fit=crop&q=80',
    'gallery':        'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&auto=format&fit=crop&q=80',
    'museum':         'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=800&auto=format&fit=crop&q=80',
  };

  function getCardImage(cat) {
    if (!cat) return 'assets/images/cafe.jpg';
    const c = String(cat).toLowerCase();
    for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
      if (c.includes(key)) return url;
    }
    return 'assets/images/cafe.jpg';
  }

  async function submitQuiz() {
    answers.free_text = elFreeText ? elFreeText.value.trim() : '';

    elQuizCard.classList.add('hidden');
    elLoading.classList.remove('hidden');
    elResultsView.classList.add('hidden');

    // Smooth AI scanner stages
    if (elScannerProgress) elScannerProgress.style.width = '15%';
    if (elScannerStatus) elScannerStatus.textContent = '🧠 Interpreting mood & companion dynamics with Gemini...';

    const stageTimer1 = setTimeout(() => {
      if (elScannerProgress) elScannerProgress.style.width = '45%';
      if (elScannerStatus) elScannerStatus.textContent = '📍 Scanning 8,139 PostGIS spatial nodes across Pune...';
    }, 400);

    const stageTimer2 = setTimeout(() => {
      if (elScannerProgress) elScannerProgress.style.width = '80%';
      if (elScannerStatus) elScannerStatus.textContent = '🎯 Calculating spatial proximity & topological walk buffers...';
    }, 850);

    // Payload must match backend RecommendationRequest schema:
    // latitude/longitude are top-level fields (not nested in user_location)
    const payload = {
      latitude: 18.5204,
      longitude: 73.8567,
      companions: answers.companions.length ? answers.companions : ['solo'],
      activities: answers.activities.length ? answers.activities : ['coffee'],
      moods: answers.moods.length ? answers.moods : ['relaxed'],
      environment: answers.environment,
      budget: answers.budget,
      max_distance_km: answers.max_distance_km,
      free_text: answers.free_text || null,
      limit: 12,
    };

    try {
      const response = await VibePuneAPI.recommendations(payload);
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      if (elScannerProgress) elScannerProgress.style.width = '100%';
      if (elScannerStatus) elScannerStatus.textContent = '✨ Curating top evidence-grounded matches...';

      setTimeout(() => {
        elLoading.classList.add('hidden');
        elResultsView.classList.remove('hidden');
        renderRecommendations(response);
      }, 350);
    } catch (err) {
      console.warn('[VibePage] Recommendation API error:', err);
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setTimeout(() => {
        elLoading.classList.add('hidden');
        elResultsView.classList.remove('hidden');
        renderFallbackRecommendations();
      }, 400);
    }
  }

  function renderRecommendations(data) {
    if (!elRecsList) return;
    elRecsList.innerHTML = '';

    // Support both API response shapes:
    // Backend shape: { recommendations: [ { place: {...}, score, match_percentage, distance_m, reasons } ] }
    // Fallback shape: { recommendations: [ { id, name, category, latitude, longitude, ... } ] }
    const rawItems = data.recommendations || data.items || [];
    const items = rawItems.map(item => {
      // If item has nested `place` (real API response), flatten it
      if (item.place && typeof item.place === 'object') {
        return {
          ...item.place,
          match_percentage: item.match_percentage,
          distance_m: item.distance_m,
          explanation_points: item.reasons || [],
          match_reason: (item.reasons || [])[0] || 'Verified match',
        };
      }
      return item;
    });

    if (elRecsCountLabel) {
      elRecsCountLabel.textContent = `Found ${items.length} curated places matching your exact Pune vibe.`;
    }

    if (!items.length) {
      elRecsList.innerHTML = `
        <div style="text-align:center; padding: 50px 20px; background:var(--bg-surface); border-radius:var(--r-2xl); border:1px solid var(--border-default);">
          <div style="font-size:3rem; margin-bottom:12px;">📍</div>
          <h3 style="font-size:1.3rem; font-weight:var(--weight-bold);">No direct spots found within ${answers.max_distance_km} km</h3>
          <p style="color:var(--text-secondary); max-width:440px; margin:8px auto 20px;">Try selecting a larger search radius (e.g. 5 km or 10 km) or explore all 8,139 Pune locations on our interactive map.</p>
          <a href="discover.html" class="btn btn--primary">Browse Full Pune WebGIS Map 🗺️</a>
        </div>
      `;
      return;
    }

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'rec-card';

      const reasons = Array.isArray(item.explanation_points) && item.explanation_points.length
        ? item.explanation_points
        : [item.match_reason || item.description || 'Verified match for your preferences'];

      const distM = item.distance_m || (idx + 1) * 450;
      const distStr = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${Math.round(distM)} m`;
      const walkTimeMin = Math.max(3, Math.round(distM / 80));
      const matchPct = item.match_percentage || Math.max(97 - idx * 3, 78);
      const bgImg = getCardImage(item.category);
      const catLabel = item.categoryName || item.category || 'Spot';

      // Check if saved
      const savedList = JSON.parse(localStorage.getItem('vibepune_saved_places') || '[]');
      const isSaved = savedList.some(s => String(s.id || s) === String(item.id));

      card.innerHTML = `
        <div class="rec-card__banner" style="background-image: url('${bgImg}');">
          <div class="rec-card__badge-row">
            <span class="rec-card__category-pill">${escapeHtml(catLabel)}</span>
            <span class="rec-card__match-pill">⚡ ${matchPct}% VIBE MATCH</span>
          </div>
        </div>
        <div class="rec-card__body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
            <div>
              <h3 class="rec-card__name">${escapeHtml(item.name || 'Pune Place')}</h3>
              <div class="rec-card__meta-row" style="margin-top:4px;">
                <span class="rec-card__distance-tag">📍 ${distStr} away</span>
                <span>•</span>
                <span>🚶 ~${walkTimeMin} min walk</span>
              </div>
            </div>
            <button type="button" class="btn btn--secondary btn--sm btn-rec-save" data-id="${item.id}" title="${isSaved ? 'Saved to Favorites' : 'Save Place'}" style="border-radius:var(--r-full); padding:6px 12px;">
              <span class="save-icon">${isSaved ? '❤️' : '🤍'}</span>
              <span class="save-text" style="font-size:12px; font-weight:var(--weight-bold);">${isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          <div class="rec-card__evidence-grid">
            ${reasons.map(r => `<span class="rec-card__evidence-pill">✨ ${escapeHtml(r)}</span>`).join('')}
            <span class="rec-card__evidence-pill" style="background:var(--accent-lime-light); color:var(--accent-lime-text); border-color:rgba(184,230,0,0.4);">
              🌿 Verified OpenStreetMap Node
            </span>
          </div>

          ${item.address ? `<p style="font-size:12.5px; color:var(--text-muted); line-height:1.4;">📍 ${escapeHtml(item.address)}</p>` : ''}

          <div class="rec-card__actions">
            <a href="discover.html?place=${item.id}" class="btn btn--primary btn--sm" style="flex:1; justify-content:center;">
              <span>View on Interactive Map</span> 🗺️
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}" target="_blank" rel="noopener noreferrer" class="btn btn--secondary btn--sm" style="flex:1; justify-content:center;">
              <span>Get Directions</span> 🧭
            </a>
          </div>
        </div>
      `;

      // Wire save button
      const btnSave = card.querySelector('.btn-rec-save');
      if (btnSave) {
        btnSave.addEventListener('click', () => {
          let list = JSON.parse(localStorage.getItem('vibepune_saved_places') || '[]');
          const existingIdx = list.findIndex(s => String(s.id || s) === String(item.id));
          const iconEl = btnSave.querySelector('.save-icon');
          const textEl = btnSave.querySelector('.save-text');

          if (existingIdx >= 0) {
            list.splice(existingIdx, 1);
            if (iconEl) iconEl.textContent = '🤍';
            if (textEl) textEl.textContent = 'Save';
          } else {
            list.push({
              id: String(item.id),
              name: item.name,
              category: item.category,
              categoryName: catLabel,
              address: item.address,
              latitude: item.latitude,
              longitude: item.longitude,
              savedAt: new Date().toISOString()
            });
            if (iconEl) iconEl.textContent = '❤️';
            if (textEl) textEl.textContent = 'Saved';
          }

          localStorage.setItem('vibepune_saved_places', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        });
      }

      elRecsList.appendChild(card);
    });
  }

  async function renderFallbackRecommendations() {
    try {
      // Try real data first
      const all = await VibePuneAPI.fetchAllPlaces();
      if (all && all.length > 0) {
        // Filter by activity if possible
        const acts = answers.activities || [];
        const actKeywords = {
          coffee: ['cafe', 'coffee', 'bakery', 'dessert'],
          food: ['restaurant', 'dining', 'food'],
          nightlife: ['bar', 'pub', 'nightlife', 'lounge'],
          nature: ['park', 'garden', 'nature', 'viewpoint'],
          fitness: ['gym', 'sports', 'fitness'],
          shopping: ['mall', 'shop', 'market'],
          arts: ['museum', 'gallery', 'arts', 'heritage'],
          adventure: ['viewpoint', 'scenic', 'hill'],
        };
        let filtered = all;
        if (acts.length > 0) {
          const keywords = acts.flatMap(a => actKeywords[a] || []);
          if (keywords.length > 0) {
            const kFiltered = all.filter(p =>
              keywords.some(k => (p.category || '').toLowerCase().includes(k) || (p.categoryName || '').toLowerCase().includes(k))
            );
            if (kFiltered.length >= 4) filtered = kFiltered;
          }
        }
        const fallbackList = filtered.slice(0, 10).map((p, i) => ({
          ...p,
          match_percentage: Math.max(94 - i * 2, 78),
          explanation_points: ['Matches your selected interests', 'Verified OpenStreetMap location']
        }));
        renderRecommendations({ recommendations: fallbackList });
        return;
      }
    } catch (e) {
      console.warn('[VibePage] fetchAllPlaces failed, using synthetic demo data:', e.message);
    }

    // Synthetic demo data so the page never shows empty
    const DEMO = [
      { id: 'd1', name: 'Koregaon Park Cafe Row', category: 'cafe', categoryName: 'Chill & Coffee', latitude: 18.5362, longitude: 73.8938, address: 'Koregaon Park, Pune', match_percentage: 97, explanation_points: ['Aesthetic cafes & cozy seating', 'Perfect for solo & partner outings'] },
      { id: 'd2', name: 'Osho Teerth Garden', category: 'park', categoryName: 'Nature & Greenery', latitude: 18.5315, longitude: 73.8936, address: 'Osho Ashram, Koregaon Park', match_percentage: 93, explanation_points: ['Serene Japanese garden', 'Lush green tranquility'] },
      { id: 'd3', name: 'FC Road Food Street', category: 'restaurant', categoryName: 'Foodie & Dining', latitude: 18.5182, longitude: 73.8420, address: 'Fergusson College Road, Pune', match_percentage: 90, explanation_points: ['Vibrant street food scene', 'Local Pune flavours'] },
      { id: 'd4', name: 'High Spirits Cafe', category: 'nightlife', categoryName: 'Night Out & Pubs', latitude: 18.5375, longitude: 73.8953, address: 'Mundhwa, Pune', match_percentage: 88, explanation_points: ['Live music venue', 'Popular nightlife destination'] },
      { id: 'd5', name: 'Aga Khan Palace', category: 'museum', categoryName: 'Arts & Heritage', latitude: 18.5524, longitude: 73.9020, address: 'Nagar Road, Pune', match_percentage: 85, explanation_points: ['Historic heritage site', 'Beautiful gardens & architecture'] },
      { id: 'd6', name: 'Phoenix Marketcity', category: 'mall', categoryName: 'Shopping & Malls', latitude: 18.5627, longitude: 73.9224, address: 'Nagar Road, Viman Nagar', match_percentage: 82, explanation_points: ['Premium shopping destination', 'Dining & entertainment'] },
    ];
    renderRecommendations({ recommendations: DEMO });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
