-- =============================================================================
-- STAGE 6 — WALKING ACCESSIBILITY ANALYSIS SQL SCRIPT (Q6, Q7, Q8)
-- VibePune WebGIS — PMC + PCMC Study Area
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Q6: Straight-line vs Walking Distance (30 Reproducible Points)
-- -----------------------------------------------------------------------------
-- Generate 30 points with fixed random seed 42
SELECT 
    row_number() OVER () as pt_id,
    ST_Y(pt) as lat,
    ST_X(pt) as lon
FROM (
    SELECT (ST_Dump(ST_GeneratePoints(geom, 30, 42))).geom as pt 
    FROM study_area
) pts;

-- -----------------------------------------------------------------------------
-- Q7: Population Outside Accessibility Threshold (Res 8 vs Res 9)
-- -----------------------------------------------------------------------------
-- Resolution 8 Accessibility Summary
SELECT 
    SUM(pop_building_proxy) as total_population,
    SUM(CASE WHEN covered_network THEN pop_building_proxy ELSE 0 END) as pop_covered_network,
    SUM(CASE WHEN NOT covered_network THEN pop_building_proxy ELSE 0 END) as pop_outside_network,
    ROUND((SUM(CASE WHEN NOT covered_network THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as pct_outside_network,
    SUM(CASE WHEN covered_straight THEN pop_building_proxy ELSE 0 END) as pop_covered_straight,
    SUM(CASE WHEN NOT covered_straight THEN pop_building_proxy ELSE 0 END) as pop_outside_straight,
    ROUND((SUM(CASE WHEN NOT covered_straight THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as pct_outside_straight
FROM h3_res8_accessibility
WHERE municipality IN ('PMC', 'PCMC');

-- Resolution 9 Accessibility Summary
SELECT 
    SUM(pop_building_proxy) as total_population,
    SUM(CASE WHEN covered_network THEN pop_building_proxy ELSE 0 END) as pop_covered_network,
    SUM(CASE WHEN NOT covered_network THEN pop_building_proxy ELSE 0 END) as pop_outside_network,
    ROUND((SUM(CASE WHEN NOT covered_network THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as pct_outside_network,
    SUM(CASE WHEN covered_straight THEN pop_building_proxy ELSE 0 END) as pop_covered_straight,
    SUM(CASE WHEN NOT covered_straight THEN pop_building_proxy ELSE 0 END) as pop_outside_straight,
    ROUND((SUM(CASE WHEN NOT covered_straight THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as pct_outside_straight
FROM h3_res9_accessibility
WHERE municipality IN ('PMC', 'PCMC');

-- Aggregation by Municipality (PMC vs PCMC)
SELECT 
    municipality,
    COUNT(*) as total_cells,
    SUM(pop_building_proxy) as total_pop,
    ROUND((SUM(CASE WHEN NOT covered_network THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as pct_outside_network
FROM h3_res9_accessibility
WHERE municipality IN ('PMC', 'PCMC')
GROUP BY municipality;

-- Worst-Served Populated H3 Cell (Res 9)
SELECT h3_index, municipality, straight_dist_m, network_dist_m, pop_building_proxy, building_area_m2,
       ST_Y(center_geom) as lat, ST_X(center_geom) as lon
FROM h3_res9_accessibility
WHERE municipality IN ('PMC', 'PCMC') AND pop_building_proxy > 0
ORDER BY network_dist_m DESC, pop_building_proxy DESC
LIMIT 1;

-- -----------------------------------------------------------------------------
-- Q8: Elderly Walking Scenario (3.6 km/h / 900m vs 4.8 km/h / 1200m)
-- -----------------------------------------------------------------------------
SELECT 
    SUM(pop_building_proxy) as total_population,
    ROUND((SUM(CASE WHEN covered_network THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as coverage_standard_pct,
    ROUND((SUM(CASE WHEN covered_elderly THEN pop_building_proxy ELSE 0 END) / SUM(pop_building_proxy)) * 100, 2) as coverage_elderly_pct,
    ROUND(((SUM(CASE WHEN covered_network THEN pop_building_proxy ELSE 0 END) - SUM(CASE WHEN covered_elderly THEN pop_building_proxy ELSE 0 END)) / SUM(pop_building_proxy)) * 100, 2) as coverage_lost_pct_pts
FROM h3_res9_accessibility
WHERE municipality IN ('PMC', 'PCMC');

-- Most Affected Location (Largest Populated Cell Lost to Elderly Scenario)
SELECT h3_index, municipality, straight_dist_m, network_dist_m, pop_building_proxy,
       ST_Y(center_geom) as lat, ST_X(center_geom) as lon
FROM h3_res9_accessibility
WHERE municipality IN ('PMC', 'PCMC')
  AND covered_network AND NOT covered_elderly
ORDER BY pop_building_proxy DESC
LIMIT 1;
