import os
import math
import psycopg2
from dotenv import load_dotenv

# Load env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(env_path):
    load_dotenv(env_path)

DB_USER = os.getenv("POSTGRES_USER", "vibepune_user")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "root")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "vibepune")

conn = psycopg2.connect(
    dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT
)
cur = conn.cursor()

print("=" * 80)
print("STAGE 4 — PHASE 1 POSTGIS ANALYSIS (Q1, Q2, Q3)")
print("=" * 80)

# ==============================================================================
# Q1: AREA CALCULATION
# ==============================================================================
print("\n--- Q1: STUDY-AREA SIZE CALCULATION ---")

q1_sql = """
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
"""
cur.execute(q1_sql)
row = cur.fetchone()

area_4326_deg2 = float(row[0])
area_geog_m2   = float(row[1])
area_geog_km2  = float(row[2])
area_utm_m2    = float(row[3])
area_utm_km2   = float(row[4])
area_3857_m2   = float(row[5])
area_3857_km2  = float(row[6])
center_lat     = float(row[7])
center_lon     = float(row[8])

ratio_3857_utm = area_3857_m2 / area_utm_m2
lat_rad = math.radians(center_lat)
cos_lat = math.cos(lat_rad)
sec2_lat = 1.0 / (cos_lat ** 2)
distortion_diff_pct = abs(ratio_3857_utm - sec2_lat) / sec2_lat * 100.0

print(f"Center Coordinates: ({center_lat:.5f}° N, {center_lon:.5f}° E)")
print(f"1. ST_Area (EPSG:4326):       {area_4326_deg2:.6f} deg²")
print(f"2. ST_Area (geography):       {area_geog_m2:,.2f} m²  ({area_geog_km2:.2f} km²)")
print(f"3. ST_Area (UTM 43N - 32643): {area_utm_m2:,.2f} m²  ({area_utm_km2:.2f} km²)")
print(f"4. ST_Area (EPSG:3857):       {area_3857_m2:,.2f} m²  ({area_3857_km2:.2f} km²)")
print(f"\nRatio EPSG:3857 / UTM:        {ratio_3857_utm:.6f}")
print(f"Theoretical 1/cos²(lat):      {sec2_lat:.6f}")
print(f"Relative Difference:          {distortion_diff_pct:.4f}%")


# ==============================================================================
# Q2: SPATIAL INDEXES AND QUERY PLANS
# ==============================================================================
print("\n--- Q2: SPATIAL INDEXES AND QUERY PLANS (EXPLAIN ANALYZE) ---")
print("Target Query: Count buildings within 500m of every service using UTM geometry.")

# Query plan 1: With GiST index using ST_DWithin
sql_with_index = """
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;
"""
cur.execute(sql_with_index)
plan_with_index = cur.fetchone()[0]

exec_time_with_index = plan_with_index[0]["Execution Time"]
planning_time_with_index = plan_with_index[0]["Planning Time"]
node_with_index = plan_with_index[0]["Plan"]["Node Type"]
print(f"\n1. WITH GiST Index (ST_DWithin):")
print(f"   Execution Time: {exec_time_with_index:.2f} ms")
print(f"   Top Node:       {node_with_index}")

# Query plan 2: Without GiST index (disable indexscan / bitmapscan)
cur.execute("SET enable_indexscan = off; SET enable_bitmapscan = off;")
sql_no_index = """
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;
"""
cur.execute(sql_no_index)
plan_no_index = cur.fetchone()[0]
exec_time_no_index = plan_no_index[0]["Execution Time"]
node_no_index = plan_no_index[0]["Plan"]["Node Type"]
print(f"\n2. WITHOUT GiST Index (Seq Scan forced):")
print(f"   Execution Time: {exec_time_no_index:.2f} ms")
print(f"   Top Node:       {node_no_index}")
cur.execute("RESET enable_indexscan; RESET enable_bitmapscan;")

# Query plan 3: With index but using ST_Distance(a, b) < 500
sql_st_distance = """
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_Distance(s.geom_utm, b.geom_utm) < 500
GROUP BY s.id;
"""
cur.execute(sql_st_distance)
plan_st_distance = cur.fetchone()[0]
exec_time_st_distance = plan_st_distance[0]["Execution Time"]
node_st_distance = plan_st_distance[0]["Plan"]["Node Type"]
print(f"\n3. WITH Index using ST_Distance(a, b) < 500:")
print(f"   Execution Time: {exec_time_st_distance:.2f} ms")
print(f"   Top Node:       {node_st_distance}")


# ==============================================================================
# Q3: DATA QUALITY COMPARISON
# ==============================================================================
print("\n--- Q3: DATA QUALITY AUDIT & COMPARISON ---")

cur.execute("SELECT count(*) FROM services;")
total_services = cur.fetchone()[0]

cur.execute("""
SELECT count(*) 
FROM services 
WHERE name IS NULL OR trim(name) IN ('', 'nan', 'None');
""")
no_name_count = cur.fetchone()[0]
no_name_pct = (no_name_count / total_services) * 100.0

cur.execute("""
SELECT count(*) 
FROM services a
JOIN services b ON ST_DWithin(a.geom_utm, b.geom_utm, 25) AND a.id < b.id;
""")
pairs_within_25m = cur.fetchone()[0]

cur.execute("SELECT count(*) FROM services WHERE NOT ST_IsValid(geom);")
invalid_geom_count = cur.fetchone()[0]

cur.execute("""
SELECT count(*) 
FROM (
    SELECT osm_id, count(*) 
    FROM services 
    WHERE osm_id IS NOT NULL 
    GROUP BY osm_id 
    HAVING count(*) > 1
) dupes;
""")
duplicate_osm_count = cur.fetchone()[0]

print(f"Total Services:                    {total_services}")
print(f"Services Without Names:            {no_name_count} ({no_name_pct:.2f}%)")
print(f"Service Pairs within 25 metres:    {pairs_within_25m}")
print(f"Invalid Geometries (ST_IsValid):   {invalid_geom_count}")
print(f"Duplicate OSM Identifiers:         {duplicate_osm_count}")

# 5 Sample Services Verification Template
print("\n--- 5 Sample Services for Ground-Truth Verification ---")
cur.execute("""
SELECT osm_id, name, service_domain, primary_category, municipality, ST_Y(geom) as lat, ST_X(geom) as lon
FROM services
WHERE name IS NOT NULL AND trim(name) != ''
ORDER BY id
LIMIT 5;
""")
samples = cur.fetchall()
for idx, s in enumerate(samples, 1):
    print(f"{idx}. [{s[4]}] {s[1]} ({s[2]} - {s[3]}) | OSM ID: {s[0]} | Coords: ({s[5]:.5f}, {s[6]:.5f})")

cur.close()
conn.close()
print("\nPhase 1 Analysis Execution Completed.")
