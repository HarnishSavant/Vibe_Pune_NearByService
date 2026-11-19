-- =============================================================================
-- STAGE 4 — PHASE 1 POSTGIS ANALYSIS SQL QUERIES (Q1, Q2, Q3)
-- VibePune WebGIS — PMC + PCMC Study Area
-- =============================================================================

-- =============================================================================
-- Q1: STUDY-AREA SIZE CALCULATION (4 methods)
-- =============================================================================

-- Calculate study-area size using four different approaches:
-- 1. ST_Area on EPSG:4326 geometry (returns square degrees — not useful for real area)
-- 2. ST_Area on geography type (accurate geodesic calculation)
-- 3. ST_Area after transformation to UTM Zone 43N (EPSG:32643) — metric projection
-- 4. ST_Area after transformation to Web Mercator (EPSG:3857) — distorted at Pune latitude

SELECT 
    ST_Area(geom) AS area_4326_deg2,
    ST_Area(geog) AS area_geog_m2,
    ST_Area(geog) / 1e6 AS area_geog_km2,
    ST_Area(geom_utm) AS area_utm_m2,
    ST_Area(geom_utm) / 1e6 AS area_utm_km2,
    ST_Area(ST_Transform(geom, 3857)) AS area_3857_m2,
    ST_Area(ST_Transform(geom, 3857)) / 1e6 AS area_3857_km2,
    ST_Y(ST_Centroid(geom)) AS center_lat,
    ST_X(ST_Centroid(geom)) AS center_lon
FROM study_area
LIMIT 1;

-- Compare EPSG:3857 distortion with theoretical: ratio should approximate 1/cos²(lat)
-- At latitude 18.57°: 1/cos²(18.57°) ≈ 1.1129


-- =============================================================================
-- Q2: SPATIAL INDEXES AND QUERY PLANS
-- =============================================================================

-- Target: Count buildings within 500 metres of every service using UTM geometry.

-- Query 1: WITH GiST index, using ST_DWithin (index-aware operator)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;

-- Query 2: WITHOUT GiST index (force sequential scan to simulate no index)
SET enable_indexscan = off;
SET enable_bitmapscan = off;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;

RESET enable_indexscan;
RESET enable_bitmapscan;

-- Query 3: WITH index but using ST_Distance(a,b) < 500 (not index-aware)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_Distance(s.geom_utm, b.geom_utm) < 500
GROUP BY s.id;

-- Key difference:
-- ST_DWithin uses a bounding-box filter that the GiST index can accelerate.
-- ST_Distance < 500 computes exact distance for every pair → Nested Loop Seq Scan.


-- =============================================================================
-- Q3: DATA QUALITY AUDIT
-- =============================================================================

-- Total service count
SELECT count(*) AS total_services FROM services;

-- Services without names
SELECT count(*) AS no_name_count
FROM services
WHERE name IS NULL OR trim(name) IN ('', 'nan', 'None');

-- Service pairs within 25 metres (potential duplicates)
SELECT count(*) AS pairs_within_25m
FROM services a
JOIN services b ON ST_DWithin(a.geom_utm, b.geom_utm, 25) AND a.id < b.id;

-- Invalid geometries
SELECT count(*) AS invalid_geom_count
FROM services WHERE NOT ST_IsValid(geom);

-- Duplicate OSM identifiers
SELECT count(*) FROM (
    SELECT osm_id, count(*)
    FROM services
    WHERE osm_id IS NOT NULL
    GROUP BY osm_id
    HAVING count(*) > 1
) dupes;

-- 5 Sample services for ground-truth verification
SELECT osm_id, name, service_domain, primary_category, municipality,
       ST_Y(geom) AS lat, ST_X(geom) AS lon
FROM services
WHERE name IS NOT NULL AND trim(name) != ''
ORDER BY id
LIMIT 5;
