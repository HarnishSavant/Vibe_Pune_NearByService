# Phase 1 — PostGIS Analysis Results

**Project:** VibePune WebGIS — PMC + PCMC Study Area  
**Analysis Date:** 2026-11-18  
**Script:** `analysis/phase1_analysis.py`  
**SQL Queries:** `sql/phase1_analysis.sql`  
**UTM Zone:** EPSG:32643 (Zone 43N, determined from study-area centroid longitude ~73.84°E)

---

## Q1 — Study-Area Size Calculation

Study-area centroid: **18.57079° N, 73.84160° E**

| Method | CRS / Type | Area Value | Unit |
|--------|-----------|------------|------|
| `ST_Area(geom)` | EPSG:4326 | 0.036586 | deg² |
| `ST_Area(geog)` | Geography | 427,473,003.55 | m² (427.47 km²) |
| `ST_Area(geom_utm)` | EPSG:32643 (UTM 43N) | 427,289,348.21 | m² (427.29 km²) |
| `ST_Area(ST_Transform(geom, 3857))` | EPSG:3857 | 478,281,079.08 | m² (478.28 km²) |

### Distortion Analysis

| Metric | Value |
|--------|-------|
| Ratio EPSG:3857 / UTM | 1.119338 |
| Theoretical 1/cos²(lat) | 1.112876 |
| Relative difference | 0.5807% |

**Explanation:**
- EPSG:4326 returns area in square degrees, which is meaningless for real-world area.
- Geography type gives the most accurate geodesic area (427.47 km²).
- UTM Zone 43N (EPSG:32643) gives 427.29 km² — very close to geography, confirming it's the correct UTM zone for Pune.
- EPSG:3857 (Web Mercator) overestimates area by ~12% due to Mercator's latitude-dependent scale distortion.
- The measured 3857/UTM ratio (1.1193) closely matches the theoretical prediction of 1/cos²(18.57°) = 1.1129, with only 0.58% difference. The small discrepancy comes from the polygon spanning a range of latitudes rather than being a single point.

---

## Q2 — Spatial Indexes and Query Plans

**Target Query:** Count buildings within 500m of every service using UTM geometry.

| Scenario | Method | Execution Time | Top Node | Speedup |
|----------|--------|---------------|----------|---------|
| 1. With GiST index | `ST_DWithin` | **162.05 ms** | Aggregate | 1× (baseline) |
| 2. Without GiST index | `ST_DWithin` (seq scan forced) | **4,932.50 ms** | Aggregate | 30.4× slower |
| 3. With GiST index | `ST_Distance < 500` | **5,566.80 ms** | Aggregate | 34.3× slower |

### Key Findings

1. **ST_DWithin with GiST index** is the fastest approach (162 ms) because PostGIS expands each service geometry by 500m into a search envelope and uses the GiST R-tree index to quickly find only the buildings whose bounding boxes overlap — a classic spatial index filter + refine pattern.

2. **Without the GiST index**, the same ST_DWithin query falls back to a Nested Loop with Sequential Scan over all buildings for every service, resulting in a 30× slowdown.

3. **ST_Distance < 500 with index available** performs almost identically to the no-index case because the PostgreSQL planner cannot transform an arbitrary `function(a,b) < constant` predicate into a bounding-box filter. ST_DWithin is semantically equivalent but is recognized by PostGIS as an index-aware operator that generates an internal `&&` (bounding-box overlap) filter.

---

## Q3 — Data Quality Audit

| Metric | Value |
|--------|-------|
| Total services | 5,775 |
| Services without names | 0 (0.00%) |
| Service pairs within 25 metres | 2,405 |
| Invalid geometries | 0 |
| Duplicate OSM identifiers | 0 |

### 5 Sample Services for Ground-Truth Verification

| # | Municipality | Name | Domain / Category | OSM ID | Coordinates (lat, lon) |
|---|-------------|------|-------------------|--------|----------------------|
| 1 | PMC | MJM Hospital | Healthcare / hospital | 7651453418 | (18.52451, 73.84382) |
| 2 | PMC | Unique children's clinic Dental and Implant Center | Healthcare / clinic | 11659533583 | (18.49330, 73.81440) |
| 3 | PMC | Gujarwadi Phata (Katraj) PMPML Bus Stand | Transport / bus-station | 1078895379 | (18.44052, 73.86024) |
| 4 | PCMC | preety's beauty & makeover studio | Shopping / beauty | 13956917896 | (18.66342, 73.87956) |
| 5 | PMC | lonkar | Healthcare / hospital | 11527131195 | (18.52945, 73.93642) |

### Comparison with Previous Nearby-Services Project

| Metric | Previous (pre-Stage 3) | Current | Change |
|--------|----------------------|---------|--------|
| Total POIs in DB | 8,139 | 8,231 | +92 |
| Study-area POIs | ~5,683 (estimated) | 5,775 | +92 |
| Categories | 57 | 62 | +5 |
| Service domains | — | 10 | New |
| Nameless services | Unknown | 0 (0%) | ✓ |
| Invalid geometries | Unknown | 0 | ✓ |
| Duplicate OSM IDs | Unknown | 0 | ✓ |

---

## Methodology

- All queries run against PostgreSQL 16 with PostGIS 3.x on localhost.
- Execution times from `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.
- UTM zone determined programmatically: `zone = floor((centroid_lon + 180) / 6) + 1 = 43`.
- Index disabling done via `SET enable_indexscan = off; SET enable_bitmapscan = off;` and restored immediately after.
- Full SQL queries preserved in `sql/phase1_analysis.sql`.
- Python analysis script: `analysis/phase1_analysis.py`.
