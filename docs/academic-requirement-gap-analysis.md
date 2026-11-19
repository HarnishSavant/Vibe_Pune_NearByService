# VibePune — Academic Requirement Gap Analysis & Alignment Audit

**Author:** Senior GIS Architect & PostGIS Engineer  
**Date:** November 18, 2026  
**Project:** VibePune WebGIS (Pune & Pimpri-Chinchwad Municipal Corporations)  
**Study Area:** Combined Pune Municipal Corporation (PMC) + Pimpri-Chinchwad Municipal Corporation (PCMC)  

---

## 1. Executive Summary & Current Architecture

The existing VibePune WebGIS application is a full-stack spatial web application designed for urban POI discovery, multi-modal routing, spatial density analytics, and personalized recommendation workflows ("Vibe Match"). 

### Technical Architecture Stack:
- **Frontend Presentation:** Vanilla HTML5, modern CSS3 (custom design system, responsive glassmorphism aesthetic, theme toggle), and modular vanilla JavaScript (ES6+).
- **Mapping & Spatial Visualization:** Leaflet.js (v1.9.4) rendering custom tiled base maps (OpenStreetMap HOT for light mode, Esri Dark Gray Canvas for dark mode), vector GeoJSON overlays, and custom interactive pin clusters.
- **Backend Service Layer:** Python FastAPI (v0.115+) structured asynchronously with Pydantic validation schemas, dependency injection for database sessions, CORS middleware, and modular routers.
- **Spatial Database:** PostgreSQL 16 with PostGIS extension (3.4). Spatial tables feature GiST indexes on both planar geometry (`geometry(Point, 4326)`) and spherical geography (`geography(Point, 4326)`), plus trigram GIN indexes (`pg_trgm`) for fuzzy text matching.
- **Routing Engine:** Open Source Routing Machine (OSRM) public HTTP API for walking, driving, and cycling isochrones and turn-by-turn navigation.
- **AI Recommendation Engine:** Google Gemini 2.5 Flash API for context-aware POI matching based on semantic mood profiles ("vibes").
- **Offline / Static Fallback:** GeoJSON dataset stored in `data/processed/pune/normalized_pois.geojson` and study boundary in `data/raw/pune/study_area.geojson`.

---

## 2. Verified Dataset Baseline & Spatial Audit

An empirical audit of the production database and filesystem was performed on November 18, 2026:

| Metric | Database (`vibepune`) | Static Filesystem (`data/`) | Discrepancy / Observation |
|---|---|---|---|
| **Total POIs** | 8,139 | 8,139 (`normalized_pois.geojson`) | Fully reconciled |
| **Active Categories** | 57 categories | Category field `null` in GeoJSON | Categories mapped via `place_categories` relational join in DB |
| **Total Category Associations** | 8,378 | N/A | Many-to-many relationship (`place_categories`) |
| **Unique OSM Identifiers** | 8,139 (100% unique) | 8,139 | Zero ID collisions |
| **Invalid Geometries** | 0 | 0 | 100% `ST_IsValid` |
| **Missing Geometries / Coords** | 0 | 0 | 100% non-null lon/lat |
| **Spatial Extent (WGS84)** | Lon: 73.3323° to 75.0312°<br>Lat: 18.0314° to 19.4682° | Same | Spans ~180 km EW × ~160 km NS (**Pune District**, NOT PMC+PCMC) |
| **Current Boundary Definition** | 1 polygon, "Pune Study Area"<br>Area: ~19,153 km² | OSM Relation 1986140 ("Pune District") | Convex hull buffer of district-wide POIs, **NOT official municipal boundary** |
| **POIs inside PMC Boundary** | 4,116 (50.6%) | N/A | Calculated using official PMC ward union (~251.02 km²) |
| **POIs inside PCMC Boundary** | 1,588 (19.5%) | N/A | Calculated using official PCMC ward union (~176.74 km²) |
| **POIs inside Combined PMC+PCMC** | 5,683 (69.8%) | N/A | 21 POIs lie on municipal border overlap |
| **POIs OUTSIDE Study Area** | **2,456 (30.2%)** | N/A | **Critical Gap**: Nearly a third of POIs belong to rural Pune District |

### Top 10 Existing Categories:
1. `dining`: 1,162
2. `hospital`: 933
3. `worship`: 860
4. `bus-stop`: 676
5. `quick-bites`: 499
6. `clinic`: 486
7. `park`: 449
8. `aesthetic-cafe`: 431
9. `clothes`: 374
10. `transit-station`: 271

---

## 3. Academic Requirement Gap Analysis Matrix

The target academic specification requires a dedicated multi-service WebGIS platform strictly bounded by the Pune Municipal Corporation (PMC) and Pimpri-Chinchwad Municipal Corporation (PCMC) boundaries.

| Academic Requirement | Existing Implementation | Status | Required Changes | Priority |
|---|---|---|---|---|
| **1. Separate PMC & PCMC Boundaries** | Single table `pune_boundary` holding Pune District convex hull (~19,153 km²). No separate PMC or PCMC polygons. | **MISSING** | Acquire and validate official PMC (~251 km²) and PCMC (~176 km²) administrative boundary polygons. Store separately with spatial indexes. | **Critical (P0)** |
| **2. Combined Study-Area Boundary** | Exists only as a district-wide buffer polygon. | **PARTIALLY IMPLEMENTED** | Compute geometric union ($PMC \cup PCMC \approx 427.29\text{ km}^2$) and persist as official study area in database and GeoJSON. | **Critical (P0)** |
| **3. Municipality Classification for POIs** | `places` table has no `municipality` column. Cannot filter or aggregate by PMC vs PCMC. | **MISSING** | Add `municipality` column (`VARCHAR(10)`) to `places`. Tag every POI as `'PMC'`, `'PCMC'`, or `'OUTSIDE'`. Filter out or archive outside POIs. | **Critical (P0)** |
| **4. Multi-Category OSM Service Dataset** | 57 categories exist (mostly lifestyle, dining, healthcare). Notable gaps in emergency services, public civic infrastructure, and finance. | **PARTIALLY IMPLEMENTED** | Expand OSM collection to systematically cover 10 core service domains across both corporations: Healthcare, Emergency, Education, Food, Transport, Finance, Shopping, Public Services, Recreation, Accommodation. | **High (P1)** |
| **5. Location Selection: GPS / Geolocation** | Browser Geolocation API integrated in `map.js` via Locate Control. | **ALREADY IMPLEMENTED** | None. Works accurately with live browser coordinates. | Completed |
| **6. Location Selection: Manual Search** | Autocomplete search bar querying `/api/search` with trigram ranking and Nominatim fallback. | **ALREADY IMPLEMENTED** | None. Search across names and addresses works properly. | Completed |
| **7. Location Selection: Map-Click** | Map click listener places draggable marker, triggers nearby search at clicked coordinates. | **ALREADY IMPLEMENTED** | None. Fully functional. | Completed |
| **8. Category & Radius-Based Nearby Search** | `/api/places/nearby` uses `ST_DWithin(geog, ST_SetSRID(ST_Point(lon, lat), 4326)::geography, radius_m)`. | **ALREADY IMPLEMENTED** | Expose municipality filter parameter (`?municipality=PMC|PCMC`). | **Medium (P2)** |
| **9. Nearest-Service Sorting** | `/api/places/nearest` uses `<->` spatial operator and `ST_Distance`. | **ALREADY IMPLEMENTED** | Expose municipality filter parameter. | **Medium (P2)** |
| **10. Multi-Category Exploration** | Category chip filters in UI, active state switching, multi-category toggling. | **ALREADY IMPLEMENTED** | Update UI chips to match the 10 standardized academic service categories. | **Medium (P2)** |
| **11. Service Details & Directions** | Sliding detail drawer with contact info, opening hours, photo, and OSRM turn-by-turn route generation. | **ALREADY IMPLEMENTED** | Add municipality badge to detail drawer (e.g., "PMC" or "PCMC"). | **Low (P3)** |
| **12. Spatial Density Analysis** | `/api/analytics/density` computes grid-based density and category heat counts. | **PARTIALLY IMPLEMENTED** | Currently runs over full district extent. Must be bounded strictly to PMC+PCMC polygon. | **High (P1)** |
| **13. Accessibility Analysis** | `/api/analytics/accessibility` computes multi-tier walking buffers (5m, 10m, 15m). | **ALREADY IMPLEMENTED** | Restrict analytics extent to study area boundary. | **Medium (P2)** |
| **14. Boundary API Endpoints** | No dedicated endpoints for municipal boundaries exist in backend routers. | **MISSING** | Create `/api/boundaries`, `/api/boundaries/pmc`, `/api/boundaries/pcmc`, and `/api/boundaries/study-area`. | **Critical (P0)** |
| **15. Leaflet Boundary Visualization** | Map only loads GeoServer WMS boundary layer (which fails silently). | **MISSING** | Load GeoJSON boundaries directly via Leaflet vector layers with distinct styling (e.g. PMC in cyan, PCMC in amber) and legend toggle. | **High (P1)** |

---

## 4. Key Gaps & Academic Non-Compliance Risks

1. **Spatial Inaccuracy (Scale Mismatch):**
   - The current dataset contains 2,456 POIs (30.2%) outside the municipal boundaries, extending into Shirur, Daund, Baramati, Junnar, etc.
   - For an academic study strictly examining urban service distribution in PMC and PCMC, including rural district points corrupts density calculations, nearest-neighbor metrics, and municipal comparisons.
2. **Missing Municipality Attribute:**
   - Without a `municipality` field, comparative urban analytics (e.g., healthcare capacity per sq km in PMC vs PCMC) are impossible without costly on-the-fly spatial joins.
3. **Data Provenance of Boundaries:**
   - The existing `pune_boundary` table was created via `load_pune_boundary.py` using `ST_Buffer(ST_ConvexHull(ST_Collect(geom)), 0.05)`. A convex hull of POIs is methodologically invalid for urban municipal analysis. Official administrative boundaries must be used.
4. **Service Domain Coverage:**
   - While food and dining (1,661 POIs) and hospitals (933 POIs) are well-represented, emergency infrastructure (police, fire, emergency services) and municipal civic offices are under-represented relative to city size.

---

## 5. Recommended Implementation Sequence

To preserve system stability and test-driven integrity, the upgrades should proceed in four sequential phases:

```
[Phase 1: Boundary Integration]
  ├── Download official PMC & PCMC ward boundaries (DataMeet / Official ULB)
  ├── Validate topology & convert to EPSG:4326 2D
  ├── Dissolve into PMC, PCMC, and Combined Study Area polygons
  ├── Insert into PostGIS `municipal_boundaries` table with spatial GiST index
  ├── Expose FastAPI `/api/boundaries` endpoints
  └── Render styled boundary overlays & legend in Leaflet map

[Phase 2: POI Spatial Classification & Filtering]
  ├── Alter table `places` ADD COLUMN `municipality VARCHAR(10)`
  ├── Perform spatial containment update (ST_Within / ST_Covers)
  ├── Isolate & archive 2,456 out-of-boundary POIs into `places_district_archive`
  └── Update spatial indexes and database statistics (ANALYZE places)

[Phase 3: Multi-Service POI Expansion]
  ├── Query OSM Overpass / Geofabrik for 10 missing/under-represented service categories
  ├── Restrict bounding box strictly to PMC + PCMC extent
  ├── Clean, deduplicate against existing OSM IDs, normalize tags
  ├── Classify newly imported POIs into PMC vs PCMC
  └── Merge into `places` table without overwriting verified custom metadata

[Phase 4: Analytics & Frontend Alignment]
  ├── Update `/api/analytics/*` queries to respect study area boundary
  ├── Add municipality breakdown to Insights / Analytics dashboard
  └── Verify full test suite (59+ tests) and frontend responsiveness
```

---

## 6. Impacted Files & Database Components

| Component | Target File / Table | Nature of Modification |
|---|---|---|
| **Database** | Table `municipal_boundaries` | New table storing PMC, PCMC, Combined geometries with GiST index |
| **Database** | Table `places` | Add column `municipality VARCHAR(10)`, add index `idx_places_municipality` |
| **Backend API** | `backend/app/api/routes/boundaries.py` | New router for boundary endpoints |
| **Backend Main** | `backend/app/main.py` | Include boundary router |
| **Backend Places** | `backend/app/api/routes/places.py` | Support `municipality` filter parameter in nearby/nearest |
| **Backend Analytics** | `backend/app/api/routes/analytics.py` | Scope summary and density to study area |
| **Frontend Map** | `frontend/js/map/map.js` | Load boundary GeoJSONs, apply distinct styles, add layer toggle/legend |
| **Frontend Config** | `frontend/js/config.js` | Add boundary API endpoints |
| **Data Directory** | `data/raw/boundaries/` & `data/processed/boundaries/` | Store validated GeoJSON polygons |
| **Test Suite** | `backend/tests/test_boundaries.py` | Unit and integration tests for boundary APIs |

---

## 7. Quality Assurance & Testing Strategy

1. **Geometric Topology Integrity:** Verify with `ST_IsValid` and `ST_IsSimple` that all boundary polygons have zero self-intersections or unclosed rings.
2. **Coordinate Reference System:** Confirm all datasets strictly enforce `EPSG:4326` (WGS84 2D).
3. **Database Uniqueness & Idempotency:** Confirm `osm_id` uniqueness prevents double-counting.
4. **Endpoint Performance:** Benchmark boundary GeoJSON response times (< 50ms) with lightweight dissolved geometries.
5. **Regression Verification:** Run pytest across all existing 59 tests to ensure zero breaking changes across routing, vibe recommendations, search, and health endpoints.
