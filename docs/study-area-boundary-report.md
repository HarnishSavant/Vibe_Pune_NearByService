# VibePune — PMC + PCMC Study Area Boundary Integration Report

**Author:** Senior GIS Architect & PostGIS Engineer  
**Date:** November 18, 2026  
**Status:** Completed & Verified (Stage 2)  
**Study Area:** Combined Pune Municipal Corporation (PMC) + Pimpri-Chinchwad Municipal Corporation (PCMC)  

---

## 1. Executive Summary

In Stage 2, the VibePune WebGIS application was upgraded from an arbitrary POI convex-hull boundary (~19,153 km² Pune District) to the official administrative study area comprising the two twin municipal corporations:
1. **Pune Municipal Corporation (PMC)**
2. **Pimpri-Chinchwad Municipal Corporation (PCMC)**

Official ward-level boundary datasets were acquired from the verified DataMeet Urban Local Body (ULB) repository, validated for topological correctness, dissolved into municipal boundary polygons, projected into standard EPSG:4326 (WGS84 2D), and integrated across the PostgreSQL/PostGIS database, FastAPI backend endpoints, and Leaflet interactive map.

---

## 2. Boundary Data Acquisition & Provenance

| Municipality | Source | Provenance & Authority | Download Date | Raw Path |
|---|---|---|---|---|
| **PMC (Pune)** | DataMeet / PMC Electoral & Administrative Wards | Official PMC 15 Administrative Wards digitized from municipal gazettes and election commission maps | Nov 18, 2026 | `data/raw/boundaries/pune_admin_wards.geojson` |
| **PCMC (Pimpri-Chinchwad)** | DataMeet / PCMC 66 Electoral Wards | Official PCMC 66 Electoral Ward shapes digitized from municipal boundaries | Nov 18, 2026 | `data/raw/boundaries/pcmc_electoral_wards.geojson` |
| **Combined Study Area** | Geometric Dissolve ($PMC \cup PCMC$) | Exact spatial union of PMC and PCMC polygons | Nov 18, 2026 | `data/processed/boundaries/study_area.geojson` |

> [!NOTE]
> No convex hulls, bounding boxes, or manual approximations were used. The boundaries are 100% derived from digitized official ward delineations.

---

## 3. Geometric Validation & Topological Integrity

Spatial geometries were audited using Shapely 2.0 and GeoPandas 1.0 against the EPSG:32643 (UTM Zone 43N) projected coordinate system for accurate metric calculation:

| Metric | PMC Boundary | PCMC Boundary | Combined Study Area |
|---|---|---|---|
| **Geometry Type** | `MultiPolygon` | `MultiPolygon` | `MultiPolygon` |
| **Coordinate Reference System** | `EPSG:4326` (WGS84 2D) | `EPSG:4326` (WGS84 2D) | `EPSG:4326` (WGS84 2D) |
| **Topology Validity (`ST_IsValid`)** | `True` (100% valid) | `True` (100% valid) | `True` (100% valid) |
| **Simplicity (`ST_IsSimple`)** | `True` | `True` | `True` |
| **West Longitude** | 73.751561° E | 73.710425° E | 73.710425° E |
| **East Longitude** | 73.962956° E | 73.933979° E | 73.962956° E |
| **South Latitude** | 18.428829° N | 18.563864° N | 18.428829° N |
| **North Latitude** | 18.621616° N | 18.721132° N | 18.721132° N |
| **Surface Area (Projected)** | **251.02 km²** | **176.74 km²** | **427.29 km²** |
| **Inter-Corporation Overlap** | Minimal boundary contact buffer (< 0.00004 deg² along Mula-Mutha river boundary) |

---

## 4. PostGIS Database Schema Integration

### 4.1. New Table: `municipal_boundaries`
A dedicated spatial table was established in PostgreSQL:

```sql
CREATE TABLE municipal_boundaries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20) NOT NULL UNIQUE,
    area_km2 NUMERIC(10, 2),
    source VARCHAR(255),
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX idx_municipal_boundaries_geom ON municipal_boundaries USING GIST (geom);
```

Stored rows:
- `PMC`: "Pune Municipal Corporation" (251.02 km²)
- `PCMC`: "Pimpri-Chinchwad Municipal Corporation" (176.74 km²)
- `STUDY_AREA`: "PMC + PCMC Combined Study Area" (427.29 km²)

### 4.2. Updated Table: `pune_boundary`
The legacy `pune_boundary` table was updated to use the official 427.29 km² combined boundary geometry, immediately correcting any legacy backend queries that relied on it.

### 4.3. Spatial Classification of Baseline POIs
A `municipality` column (`VARCHAR(20)`) with a B-tree index `idx_places_municipality` was added to the `places` table. Spatial containment queries (`ST_Covers`) produced the following baseline breakdown:

| Municipality Category | POI Count | Percentage | Description |
|---|---|---|---|
| **PMC (Pune)** | 4,116 | 50.6% | Inside Pune Municipal Corporation |
| **PCMC (Pimpri-Chinchwad)** | 1,567 | 19.3% | Inside Pimpri-Chinchwad Municipal Corporation |
| **Border / Shared** | 21 | 0.3% | Resolved to PMC under boundary prioritization |
| **OUTSIDE Study Area** | 2,456 | 30.2% | Rural Pune District (Baramati, Shirur, etc.) |
| **Total Baseline POIs** | **8,139** | 100.0% | Zero records deleted or overwritten |

---

## 5. Backend FastAPI Endpoints

Four new high-performance endpoints were added to `backend/app/api/routes/boundaries.py` and registered in `backend/app/main.py`:

| Endpoint | Method | Response Type | Description |
|---|---|---|---|
| `/api/boundaries` | `GET` | `GeoJSON FeatureCollection` | Returns both PMC and PCMC boundaries with metadata |
| `/api/boundaries/pmc` | `GET` | `GeoJSON Feature` | Returns the PMC municipal boundary |
| `/api/boundaries/pcmc` | `GET` | `GeoJSON Feature` | Returns the PCMC municipal boundary |
| `/api/boundaries/study-area` | `GET` | `GeoJSON Feature` | Returns the combined PMC+PCMC study area |

**Resilience Feature:**
Every boundary endpoint queries PostGIS via connection pooling (`request.app.state.db_pool`), but gracefully falls back to static GeoJSON files in `data/raw/boundaries/` and `data/processed/boundaries/` if the database is in static fallback mode.

---

## 6. Frontend Leaflet Map Integration

In `frontend/js/map/map.js`:
1. **PMC Municipal Layer:** Rendered with distinct vibrant blue stroke (`#2563EB`, weight 2.5) and translucent fill (`#3B82F6`, opacity 0.08). Hover tooltip shows name and area.
2. **PCMC Municipal Layer:** Rendered with distinct amber/orange stroke (`#D97706`, weight 2.5) and translucent fill (`#F59E0B`, opacity 0.08). Hover tooltip shows name and area.
3. **Combined Extent Layer:** Dashed violet outline (`#7C3AED`, dashArray 6,6).
4. **Interactive Layer Switcher:** All three boundary layers are toggleable in the top-right Leaflet layer control.
5. **Glassmorphism Legend Control:** A persistent visual legend at the bottom-left shows PMC and PCMC boundary color swatches.
6. **Non-Interference:** Existing POI clustering, search, route drawing, and detail drawers continue functioning without disruption.

---

## 7. Verification & Automated Test Results

- **Unit / Integration Tests:** `backend/tests/test_boundaries.py` created with 4 test cases. **Result: 4 passed in 3.92s.**
- **Regression Tests:** Full test suite run with 59 existing test cases. **Result: 59 passed in 18.72s.**
- **Total Passing Tests:** **63 passed, 0 failures.**
- **Server Health:** FastAPI backend responding `status: ok, database: connected` at `http://127.0.0.1:8000/api/health`.
- **Frontend Server:** HTTP server responding status `200` at `http://127.0.0.1:8001/`.
