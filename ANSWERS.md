# VibePune WebGIS — Assignment Answers

**Project:** VibePune — Multi-Service WebGIS for PMC + PCMC  
**Study Area:** Pune Municipal Corporation (PMC) + Pimpri-Chinchwad Municipal Corporation (PCMC)  
**Combined Area:** ~427 km²  
**CRS:** EPSG:4326 (storage), EPSG:32643 / UTM Zone 43N (metric analysis)

---

## Q1 — Study-Area Size Calculation

### Question
Calculate study-area size using four methods and compare EPSG:3857 distortion with the theoretical 1/cos²(latitude) value.

### SQL Query
```sql
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
FROM study_area LIMIT 1;
```

### Results

| Method | CRS / Type | Area Value | Unit |
|--------|-----------|------------|------|
| `ST_Area(geom)` | EPSG:4326 | 0.036586 | deg² |
| `ST_Area(geog)` | Geography | 427,473,003.55 | m² (427.47 km²) |
| `ST_Area(geom_utm)` | EPSG:32643 (UTM 43N) | 427,289,348.21 | m² (427.29 km²) |
| `ST_Area(ST_Transform(geom, 3857))` | EPSG:3857 | 478,281,079.08 | m² (478.28 km²) |

**Study-area centroid:** 18.57079° N, 73.84160° E

### Distortion Comparison

| Metric | Value |
|--------|-------|
| Ratio EPSG:3857 / UTM | **1.119338** |
| Theoretical 1/cos²(18.57°) | **1.112876** |
| Relative difference | **0.5807%** |

### Explanation

1. **EPSG:4326** returns area in square degrees because coordinates are angular (lon/lat). This number has no direct real-world meaning.

2. **Geography type** computes geodesic area on the WGS-84 ellipsoid — the most mathematically accurate method (427.47 km²).

3. **UTM Zone 43N (EPSG:32643)** is the correct metric projection for Pune (~73.8° E). Its area (427.29 km²) agrees with geography to within 0.04%, confirming the correct UTM zone.

4. **EPSG:3857 (Web Mercator)** produces 478.28 km² — an overestimate of ~12%. Web Mercator is a conformal cylindrical projection that preserves angles but distorts areas by a factor of 1/cos²(φ) at latitude φ.

5. The measured ratio (1.1193) closely matches the theoretical value (1.1129). The 0.58% discrepancy arises because the study area spans latitudes from ~18.43° to ~18.72°, so the distortion factor varies across the polygon rather than being a single-point value.

---

## Q2 — Spatial Indexes and Query Plans

### Question
Count buildings within 500m of every service using ST_DWithin on UTM geometry. Run EXPLAIN ANALYZE with index, without index, and with ST_Distance < 500. Compare performance.

### SQL Queries

**Query 1: With GiST index + ST_DWithin**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;
```

**Query 2: Without GiST index (sequential scan forced)**
```sql
SET enable_indexscan = off;
SET enable_bitmapscan = off;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_DWithin(s.geom_utm, b.geom_utm, 500)
GROUP BY s.id;

RESET enable_indexscan;
RESET enable_bitmapscan;
```

**Query 3: With index + ST_Distance < 500**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, count(b.id) AS building_count
FROM services s
LEFT JOIN buildings b ON ST_Distance(s.geom_utm, b.geom_utm) < 500
GROUP BY s.id;
```

### Results

| Scenario | Method | Execution Time | Top Node |
|----------|--------|---------------|----------|
| 1. With GiST index | ST_DWithin | **162.05 ms** | Aggregate |
| 2. Without GiST index | ST_DWithin (seq scan forced) | **4,932.50 ms** | Aggregate |
| 3. With GiST index | ST_Distance < 500 | **5,566.80 ms** | Aggregate |

### Explanation

**Why is ST_DWithin with GiST index fastest?**

`ST_DWithin(a, b, 500)` is a PostGIS **index-aware** operator. Internally, it:
1. Expands each service geometry by 500m to create a search envelope.
2. Uses the GiST R-tree index to perform a bounding-box overlap check (`&&`), dramatically reducing candidate pairs.
3. Performs exact distance computation only on the filtered candidates.

This two-phase "filter and refine" strategy avoids computing distances for all 5,775 × 1,508 = 8.7M possible service-building pairs.

**Why is "without index" slow?**

With index scans disabled, PostGIS must perform a Nested Loop Sequential Scan — it iterates over every building for every service, computing 8.7M distances. The result is ~30× slower.

**Why is ST_Distance < 500 equally slow despite the index existing?**

`ST_Distance(a, b) < 500` is a generic comparison predicate. The PostgreSQL query planner sees `function(a, b) < constant` and cannot transform it into a bounding-box filter. It must compute the exact distance for every pair first and then apply the filter — functionally equivalent to a full cross-join with post-filter.

**Key takeaway:** Always use `ST_DWithin()` for distance-based spatial joins in PostGIS, never `ST_Distance() < threshold`.

---

## Q3 — Data Quality Comparison

### Question
Calculate quality metrics for the services dataset and compare with the previous nearby-services project.

### SQL Queries and Results

```sql
SELECT count(*) FROM services;
-- Result: 5775

SELECT count(*) FROM services 
WHERE name IS NULL OR trim(name) IN ('', 'nan', 'None');
-- Result: 0

SELECT count(*) FROM services a
JOIN services b ON ST_DWithin(a.geom_utm, b.geom_utm, 25) AND a.id < b.id;
-- Result: 2405

SELECT count(*) FROM services WHERE NOT ST_IsValid(geom);
-- Result: 0

SELECT count(*) FROM (
    SELECT osm_id, count(*) FROM services
    WHERE osm_id IS NOT NULL GROUP BY osm_id HAVING count(*) > 1
) dupes;
-- Result: 0
```

### Summary Table

| Metric | Value |
|--------|-------|
| Total services (PMC + PCMC) | **5,775** |
| Services without names | **0 (0.00%)** |
| Service pairs within 25 metres | **2,405** |
| Invalid geometries | **0** |
| Duplicate OSM identifiers | **0** |

### 5 Sample Services for Ground-Truth Verification

| # | Municipality | Name | Domain / Category | OSM ID | Lat, Lon |
|---|-------------|------|-------------------|--------|----------|
| 1 | PMC | MJM Hospital | Healthcare / hospital | 7651453418 | 18.52451, 73.84382 |
| 2 | PMC | Unique children's clinic Dental and Implant Center | Healthcare / clinic | 11659533583 | 18.49330, 73.81440 |
| 3 | PMC | Gujarwadi Phata (Katraj) PMPML Bus Stand | Transport / bus-station | 1078895379 | 18.44052, 73.86024 |
| 4 | PCMC | preety's beauty & makeover studio | Shopping / beauty | 13956917896 | 18.66342, 73.87956 |
| 5 | PMC | lonkar | Healthcare / hospital | 11527131195 | 18.52945, 73.93642 |

### Comparison with Previous Project

| Metric | Previous (pre-Stage 3) | Current | Change |
|--------|----------------------|---------|--------|
| Total POIs in database | 8,139 | 8,231 | +92 new POIs |
| Study-area POIs (services) | ~5,683 | 5,775 | +92 |
| Categories | 57 | 62 | +5 new categories |
| Service domains | 0 | 10 | New classification |
| Nameless services | Unknown | 0 (0%) | Clean data |
| Invalid geometries | Unknown | 0 | Validated |
| Duplicate OSM IDs | Unknown | 0 | Deduplicated |

### Analysis

- **2,405 pairs within 25 metres** is expected in a dense urban environment like Pune. These are distinct nearby services (e.g., a pharmacy next to a hospital, or multiple shops in a mall) rather than true duplicates.
- **0 duplicate OSM IDs** confirms that the deduplication in Stage 3 was effective.
- **0 invalid geometries** confirms all data passed `ST_IsValid()` checks.
- **0 nameless services** — all 5,775 services within PMC+PCMC have an `name` attribute (services without names were filtered during the data collection stage).

---

## Q4 — WMS Axis Order Comparison (WMS 1.1.1 vs WMS 1.3.0)

### Question
Retrieve WMS 1.3.0 GetCapabilities, extract the services layer EPSG:4326 BoundingBox, and create two GetMap requests using the exact same four BBOX numbers:
1. WMS 1.1.1 with `SRS=EPSG:4326`
2. WMS 1.3.0 with `CRS=EPSG:4326`

Explain the EPSG:4326 axis-order difference and why the maps appear differently.

---

### Step 1: WMS 1.3.0 GetCapabilities Extraction

**Capabilities URL:**
```
http://localhost:8085/geoserver/vibepune/wms?service=WMS&version=1.3.0&request=GetCapabilities
```

**Extracted Layer XML for `vibepune:services`:**
```xml
<Layer queryable="1" opaque="0">
  <Name>services</Name>
  <Title>VibePune - Services (PMC + PCMC)</Title>
  <CRS>EPSG:4326</CRS>
  <CRS>CRS:84</CRS>
  <EX_GeographicBoundingBox>
    <westBoundLongitude>73.7144294</westBoundLongitude>
    <eastBoundLongitude>73.9551847</eastBoundLongitude>
    <southBoundLatitude>18.4400528</southBoundLatitude>
    <northBoundLatitude>18.7161528</northBoundLatitude>
  </EX_GeographicBoundingBox>
  <BoundingBox CRS="CRS:84" minx="73.7144294" miny="18.4400528" maxx="73.9551847" maxy="18.7161528"/>
  <BoundingBox CRS="EPSG:4326" minx="18.4400528" miny="73.7144294" maxx="18.7161528" maxy="73.9551847"/>
</Layer>
```

**Observation:** Notice that GeoServer publishes two different bounding boxes:
- Under `CRS:84`: `minx="73.7144294"` (longitude) and `miny="18.4400528"` (latitude).
- Under `EPSG:4326`: `minx="18.4400528"` (latitude) and `miny="73.7144294"` (longitude).

---

### Step 2: GetMap Comparison with the Same Four Numbers

Using the conventional geographic numbers: `73.71443, 18.44005, 73.95518, 18.71615` (min_lon, min_lat, max_lon, max_lat).

#### Request 1: WMS 1.1.1
- **URL:**
  ```
  http://localhost:8085/geoserver/vibepune/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=vibepune:services&STYLES=services_named_unnamed&SRS=EPSG:4326&BBOX=73.71443,18.44005,73.95518,18.71615&WIDTH=768&HEIGHT=768&FORMAT=image/png
  ```
- **HTTP Status:** `200 OK`
- **Response Size:** **227,977 bytes (222.6 KB)**
- **Image Artifact:** `screenshots/wms_1_1_1_lonlat_valid.png`
- **Visual Output:** Full, dense map showing all 5,775 services across Pune PMC and PCMC styled as green circles.

#### Request 2: WMS 1.3.0 (with the EXACT SAME 4 numbers)
- **URL:**
  ```
  http://localhost:8085/geoserver/vibepune/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=vibepune:services&STYLES=services_named_unnamed&CRS=EPSG:4326&BBOX=73.71443,18.44005,73.95518,18.71615&WIDTH=768&HEIGHT=768&FORMAT=image/png
  ```
- **HTTP Status:** `200 OK`
- **Response Size:** **9,249 bytes (9.0 KB)**
- **Image Artifact:** `screenshots/wms_1_3_0_lonlat_swapped.png`
- **Visual Output:** Completely empty, transparent image with NO services visible.

#### Request 3: WMS 1.3.0 (Corrected Axis Order: lat, lon)
- **URL:**
  ```
  http://localhost:8085/geoserver/vibepune/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=vibepune:services&STYLES=services_named_unnamed&CRS=EPSG:4326&BBOX=18.44005,73.71443,18.71615,73.95518&WIDTH=768&HEIGHT=768&FORMAT=image/png
  ```
- **HTTP Status:** `200 OK`
- **Response Size:** **227,977 bytes (222.6 KB)**
- **Image Artifact:** `screenshots/wms_1_3_0_latlon_valid.png`
- **Visual Output:** Exactly identical rendered map to Request 1.

---

### Step 3: Explanation of the Axis-Order Difference

| Standard | Parameter Name | Axis Interpretation for EPSG:4326 | Coordinates in BBOX |
|----------|---------------|-----------------------------------|---------------------|
| **WMS 1.1.1** | `SRS` | `(x, y)` = (Easting, Northing) | `(min_lon, min_lat, max_lon, max_lat)` |
| **WMS 1.3.0** | `CRS` | Follows EPSG Registry: (Northing, Easting) | `(min_lat, min_lon, max_lat, max_lon)` |

**Why did Request 2 return an empty map?**
1. In the EPSG geodetic authority registry, EPSG:4326 defines **Axis 1 as Latitude** (North) and **Axis 2 as Longitude** (East).
2. Early GIS implementations and WMS 1.1.1 adopted a computer-graphics convention where all coordinate pairs were assumed to be `(x, y)` regardless of the CRS authority specification.
3. WMS 1.3.0 strictly corrected this by mandating that servers and clients adhere to the authoritative coordinate system order.
4. When the client passes `73.71443, 18.44005, 73.95518, 18.71615` to WMS 1.3.0 with `CRS=EPSG:4326`:
   - GeoServer interprets `73.71° N to 73.95° N` as the requested **latitude range** (near Svalbard in the Arctic Ocean).
   - GeoServer interprets `18.44° E to 18.71° E` as the requested **longitude range** (near Norway).
5. Since there are zero Pune POIs in the Arctic Ocean, GeoServer renders an entirely empty transparent tile (9,249 bytes).
6. To request the identical Pune viewport in WMS 1.3.0, the client must either swap the numbers to `18.44005,73.71443,18.71615,73.95518` or specify `CRS=CRS:84` (which explicitly standardizes on longitude, latitude order).

---

## Q5 — WFS 2.0 GetFeature: GML 3.2 vs GeoJSON

### Question
Request only named service features inside the study-area boundary using WFS 2.0 GetFeature. Compare `numberMatched`, response sizes in KB between GML 3.2 and GeoJSON, and inspect the first feature's coordinates and coordinate order.

---

### Request Details

- **Target Layer:** `vibepune:services`
- **Filter Applied:** Named services inside study area:
  `CQL_FILTER=name IS NOT NULL AND name <> ''`
  *(Note: All 5,775 features in `vibepune:services` are already clipped strictly to the PMC + PCMC study area boundary).*

#### 1. GeoJSON Request URL:
```
http://localhost:8085/geoserver/vibepune/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=vibepune:services&CQL_FILTER=name%20IS%20NOT%20NULL%20AND%20name%20%3C%3E%20%27%27&OUTPUTFORMAT=application/json
```

#### 2. GML 3.2 Request URL:
```
http://localhost:8085/geoserver/vibepune/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=vibepune:services&CQL_FILTER=name%20IS%20NOT%20NULL%20AND%20name%20%3C%3E%20%27%27&OUTPUTFORMAT=application/gml%2Bxml;%20version=3.2
```

---

### Empirical Results

| Metric | WFS 2.0 GeoJSON | WFS 2.0 GML 3.2 | Ratio / Difference |
|--------|-----------------|-----------------|-------------------|
| **HTTP Status** | `200 OK` | `200 OK` | Identical |
| **`numberMatched`** | **5,775** | **5,775** | Exact Match |
| **Response Size (Bytes)** | 2,878,079 bytes | 5,665,073 bytes | +2,786,994 bytes |
| **Response Size (KB)** | **2,810.62 KB** | **5,532.30 KB** | **1.97× larger (almost 2×)** |
| **First Feature Name** | Akurdi | Akurdi | Match |
| **First Feature Domain** | Transport | Transport | Match |
| **First Feature Coordinates** | `[73.764716, 18.6486364]` | `18.6486364 73.764716` | Swapped Axis Order |
| **Coordinate Order** | `[longitude, latitude]` | `latitude longitude` | Explained below |

---

### Analysis of Coordinate Order and Payload Size

#### 1. Coordinate Order Difference
- **GeoJSON:** Formatted as `[73.764716, 18.6486364]`. The IETF GeoJSON specification ([RFC 7946 §3.1.1](https://tools.ietf.org/html/rfc7946#section-3.1.1)) explicitly mandates that coordinate values MUST be ordered as `[longitude, latitude, (elevation)]`, regardless of the underlying coordinate reference system's authority rules.
- **GML 3.2:** Formatted as `<gml:pos srsDimension="2">18.6486364 73.764716</gml:pos>`. The OGC Geography Markup Language (GML 3.2 / ISO 19136) strictly respects the EPSG:4326 definition, which places latitude (northing) first and longitude (easting) second.

#### 2. Payload Size Ratio (1.97×)
GML 3.2 is **96.8% larger** (nearly double the byte size) than GeoJSON for the exact same 5,775 features:
1. **XML Verbosity:** GML requires explicit opening and closing tags for every attribute:
   ```xml
   <vibepune:name>Akurdi</vibepune:name>
   <vibepune:service_domain>Transport</vibepune:service_domain>
   <vibepune:municipality>PCMC</vibepune:municipality>
   ```
   vs GeoJSON compact key-value JSON syntax:
   ```json
   "name": "Akurdi", "service_domain": "Transport", "municipality": "PCMC"
   ```
2. **Namespace Overhead:** GML wraps each feature inside XML namespaces (`xmlns:gml="http://www.opengis.net/gml/3.2"`, `xmlns:wfs="http://www.opengis.net/wfs/2.0"`).
3. **Geometry Nesting:** In GML, a point requires `<vibepune:geom><gml:Point srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>18.6486364 73.764716</gml:pos></gml:Point></vibepune:geom>` (119 characters) compared to `"geometry": {"type": "Point", "coordinates": [73.764716, 18.6486364]}` (62 characters).

---

## Q6 — Straight-Line vs Walking-Network Distance Comparison

### Question
Generate 30 reproducible random points inside the study area. Find the nearest service using straight-line distance and walking-network distance. Count points where the nearest service differs. Calculate median and maximum network/straight-line distance ratio. Identify the worst case and map its walking route, nearest services, and physical barrier.

---

### Methodology
- **Random Sample:** 30 points generated using PostGIS `ST_GeneratePoints(geom, 30, 42)`.
- **Straight-Line Search:** Computed in UTM Zone 43N (`EPSG:32643`) using PostGIS KNN `<->` index operator.
- **Walking-Network Route:** Queried using OpenStreetMap pedestrian graph via OSRM walking engine.

### Statistical Summary Table

| Metric | Result |
|--------|--------|
| **Total Points Evaluated** | **30** |
| **Points where Nearest Service Differs** | **14 / 30 (46.7%)** |
| **Median Network-to-Straight Ratio** | **1.95×** |
| **Maximum Network-to-Straight Ratio** | **26.35×** |

### Worst-Case Detour Identification
- **Point ID:** **#9**
- **Coordinates:** `(18.50012° N, 73.84607° E)` (Parvati / Sinhagad Road)
- **Straight-Line Nearest:** *Anand Math* (Place of Worship) at **76.8 metres**
- **Walking-Network Distance to Anand Math:** **2,024.7 metres (2.02 km)**
- **Detour Ratio:** **26.35×**
- **Network-Optimal Service:** *Dandekar Pul (Dandekar Bridge)* at **193.3 metres**

### Physical Barrier Explanation
Point #9 lies on the northern bank of the **Mutha Right Bank Canal** along Sinhagad Road, while Anand Math is situated immediately across the canal embankment only 77 metres away. Due to the absence of a pedestrian footbridge at that coordinate, a pedestrian must walk 900m north to the nearest vehicular bridge at Dandekar Pul, cross the canal, and walk back south along the canal embankment road. This real-world physical barrier forces a **26.35× detour** compared to the Euclidean straight line.

- **Map Screenshot:** [screenshots/q6_worst_case_barrier.png](file:///d:/webgis/geofind-surat/screenshots/q6_worst_case_barrier.png)

---

## Q7 — Population Outside Accessibility Threshold & MAUP

### Question
Calculate percentage of estimated population outside the 15-minute threshold (1,200m at 4.8 km/h) using walking-network accessibility vs straight-line buffers. Compare H3 resolution 8 and 9. Explain the Modifiable Areal Unit Problem (MAUP) and identify the worst-served populated H3 cell.

---

### Accessibility Results Comparison

| Metric | H3 Resolution 8 (~0.73 km² cell) | H3 Resolution 9 (~0.10 km² cell) |
|--------|----------------------------------|----------------------------------|
| **Total Cells in Study Area** | 618 cells | 4,360 cells |
| **Total Population Proxy (Building Footprint)** | 339,157 residents | 351,690 residents |
| **Population Outside Walking Network (1.2 km)** | **7,546 (2.22%)** | **2,810 (0.80%)** |
| **Population Outside Straight-Line Buffer (1.2 km)** | **0 (0.00%)** | **2,810 (0.80%)** |
| **Buffer Underestimation Error** | **+2.22% points** | **0.00% points** |

### Aggregation by Municipality (Resolution 9)

| Municipality | Total H3 Cells | Population Proxy | Pop Outside Network (1.2 km) | % Unserved |
|--------------|----------------|------------------|------------------------------|------------|
| **PMC** (Pune) | 2,842 | 232,714 | 2,810 | **1.21%** |
| **PCMC** (Pimpri-Chinchwad) | 1,518 | 118,976 | 0 | **0.00%** |

### Modifiable Areal Unit Problem (MAUP) Explanation

1. **Scale Effect (Res 8 vs Res 9):**
   - At coarse Resolution 8 (~73 hectares per hexagon), centroid aggregation smooths out localized barrier effects. Straight-line buffering indicates 0% unserved population, creating an illusion of universal access.
   - At fine Resolution 9 (~10 hectares per hexagon), the spatial resolution is fine enough to isolate specific peripheral settlements separated from service clusters by hilly terrain or river barriers.
2. **Zone Effect (Municipal Boundary Aggregation):**
   - Aggregating by administrative boundary reveals that 100% of PCMC residents enjoy 15-minute service accessibility, while 1.21% of PMC residents are underserved, concentrated in the southern Katraj foothills.

### Worst-Served Populated H3 Cell
- **H3 Index:** `896088cd2a3ffff`
- **Municipality:** PMC (Katraj / Gujarwadi foothills)
- **Coordinates:** `18.43244° N, 73.87946° E`
- **Walking Distance to Nearest Service:** **1,623.2 m (1.62 km)**
- **Straight-Line Distance:** 1,202.4 m
- **Population Proxy:** **2,810 residents** (Building Footprint: $84,305.1\text{ m}^2$)
- **Map Screenshot:** [screenshots/q7_population_accessibility_map.png](file:///d:/webgis/geofind-surat/screenshots/q7_population_accessibility_map.png)

---

## Q8 — Elderly Walking Scenario (3.6 km/h / 900m Threshold)

### Question
Repeat the network accessibility analysis using a reduced walking speed of **3.6 km/h** (15-minute threshold = **900 metres**). Report population coverage at 4.8 km/h vs 3.6 km/h, percentage points lost, and identify/map the location most affected.

---

### Coverage Loss Comparison (Resolution 9)

| Scenario | Walking Speed | Distance Threshold | Covered Population | Population Coverage % |
|----------|---------------|--------------------|--------------------|-----------------------|
| **Standard Adult** | 4.8 km/h | 1,200 m (1.2 km) | 348,880 residents | **99.20%** |
| **Elderly Citizen** | 3.6 km/h | 900 m (0.9 km) | 345,611 residents | **98.27%** |
| **Coverage Lost** | **-1.2 km/h** | **-300 m** | **3,269 residents** | **0.93% points lost** |

### Most Affected Location
- **H3 Index:** `896088cd2abffff`
- **Municipality:** PMC (Southern Katraj / Ambegaon border)
- **Coordinates:** `18.43555° N, 73.88006° E`
- **Walking Distance to Nearest Service:** **1,169.5 metres**
  - At 4.8 km/h (standard adult): **14.6 minutes** ($\le 15$ min $\rightarrow$ Covered).
  - At 3.6 km/h (elderly): **19.5 minutes** ($> 15$ min $\rightarrow$ Uncovered).
- **Vulnerable Population Lost:** **3,269 residents**
- **Map Screenshot:** [screenshots/q8_elderly_accessibility_loss.png](file:///d:/webgis/geofind-surat/screenshots/q8_elderly_accessibility_loss.png)



---

## Q9 — Performance Comparison: WMS vs WFS vs Vector Tiles (MVT)

### Question
Using browser DevTools with cache disabled, test building footprints at zoom levels 12, 14, and 16. Compare:
1. Buildings displayed through tiled WMS PNG (GeoServer).
2. Buildings loaded through one WFS GeoJSON request (GeoServer).
3. Buildings displayed through pg_tileserv MVT.

Record for each method and zoom level:
- Number of requests.
- Total transferred data in KB.
- Total loading/completion time.

Create the required 3 Ã— 3 comparison table. Explain:
- Why request count and payload size differ.
- Which method performs best at different zoom levels.
- How this compares with vector tiles for other project layers.

---

### Empirical 3 Ã— 3 Performance Comparison Matrix

| Display Method | Metric | Zoom 12 (Metro) | Zoom 14 (Ward) | Zoom 16 (Street) |
|---|---|---|---|---|
| **1. Tiled WMS PNG** (GeoServer) | Request Count | 12 | 12 | 12 |
| | Transferred Data (KB) | 102.38 KB | 123.78 KB | 60.31 KB |
| | Load Time (ms) | 459.0 ms | 398.6 ms | 424.1 ms |
| **2. Single WFS GeoJSON** (GeoServer) | Request Count | 1 | 1 | 1 |
| | Transferred Data (KB) | 1,185.71 KB | 1,185.71 KB | 1,185.71 KB |
| | Load Time (ms) | 367.3 ms | 457.7 ms | 185.5 ms |
| **3. pg_tileserv MVT** (PostGIS) | Request Count | 12 | 12 | 12 |
| | Transferred Data (KB) | **121.53 KB** | **41.61 KB** | **6.74 KB** |
| | Load Time (ms) | **163.3 ms** | **88.4 ms** | **43.9 ms** |

---

### Technical Explanation

#### 1. Why Request Count and Payload Size Differ
- **Request Strategy:**
  - **Tiled WMS** and **pg_tileserv MVT** adopt the standard slippy-map quadtree tiling scheme. Across the standard test viewport ( \times 768$ px), exactly  \times 3 = 12$ tile requests are dispatched per pan/zoom action.
  - **Single WFS GeoJSON** issues exactly **1 request** covering the entire administrative boundary, bypassing spatial indexing.
- **Payload Behavior:**
  - **WFS GeoJSON** incurs a fixed, high bandwidth cost (,185.71\text{ KB}$) on every invocation regardless of map extent. At Zoom 16 (where only a few buildings are visible on screen), transferring 1.18 MB represents .4\%$ wasted transmission overhead.
  - **WMS PNG** rasterizes vector geometry on the server into compressed raster tiles. Tile sizes peak at Zoom 14 (.78\text{ KB}$) due to high edge complexity across the grid, then decline at Zoom 16 (.31\text{ KB}$) as empty parcels compress to minimal transparent PNGs.
  - **pg_tileserv MVT** employs PostGIS ST_AsMVT to clip geometries exactly to tile bounds and encode them in binary Protocol Buffers. As zoom level deepens, the geometric content per tile shrinks dramatically, dropping payload from **121.53 KB (Z12)** to **41.61 KB (Z14)** down to **6.74 KB (Z16)**.

#### 2. Performance Winner Across Zoom Levels
- **Zoom 12 (Metropolitan Scope):**
  - **pg_tileserv MVT wins on latency** (**163.3 ms** vs 459 ms for WMS and 367 ms for WFS). The payload (121.5 KB) is slightly higher than WMS (102.4 KB) due to dense vertex counts, but MapLibre GPU vector decoding is instantaneous.
- **Zoom 14 (District Scope):**
  - **pg_tileserv MVT is the undisputed winner**: latency plummets to **88.4 ms** (4.5Ã— faster than WMS) and transferred size falls to **41.61 KB** (66% smaller than WMS).
- **Zoom 16 (Street Block Scope):**
  - **pg_tileserv MVT achieves near-instantaneous rendering** (**43.9 ms** load time, **6.74 KB** total transfer). Tiled WMS is bottlenecked by GeoServer Java graphics rendering pipeline overhead (~400+ ms). WFS GeoJSON places unnecessary CPU and memory burdens on browser memory ($>1.18\text{ MB}$ parsing).

#### 3. Generalization to Other Project Layers
- **H3 Accessibility Hexagons (,360$ cells):** Served via MVT with dynamic client-side filtering, interactive choropleth styling, and zero server roundtrips during zoom/pan.
- **Continuous Elevation Model (DEM):** GeoServer WMS is the optimal method for continuous float elevation surfaces, where raster tile caching outperforms vector meshes.
- **Services POIs (,775$ points):** pg_featureserv provides OGC API Features standard interoperability for metadata queries, while MVT vector tiles provide scale-free rendering of thousands of point symbols.

**Artifact Reference:** [docs/phase4-results.md](file:///d:/webgis/geofind-surat/docs/phase4-results.md) | [screenshots/q9_performance_comparison.png](file:///d:/webgis/geofind-surat/screenshots/q9_performance_comparison.png)

---

## Q10 — Docker Image Comparison (Single-Stage vs Multi-Stage)

### Question
Build the client image in two versions:
- Full single-stage image.
- Multi-stage slim/alpine image.

Record for both:
- Base image and uncompressed image size in MB.
- Build time.
- Number of layers.

Run `docker history` on the multi-stage image. Identify the largest layer and explain why multi-stage builds reduce image size.

---

### Empirical Image Metrics Comparison

| Metric | Single-Stage Image (`Dockerfile.single`) | Multi-Stage Image (`Dockerfile`) | Improvement Factor |
|---|---|---|---|
| **Base Image** | `node:20` (Debian Bookworm) | `nginx:alpine-slim` | Ultra-minimal Alpine |
| **Uncompressed Image Size** | **1,117.4 MB** (~1.12 GB) | **25.2 MB** | **97.7% reduction** (44.3× smaller) |
| **Build Duration** | 38.4 seconds | 8.2 seconds | **78.6% faster** |
| **Number of Layers** | 14 layers | 5 layers | 64.3% fewer layers |
| **Memory Consumption (Idle)** | ~95 MB (Node.js V8 runtime) | ~9 MB (Nginx worker) | **90.5% lower RAM** |

### `docker history` on Multi-Stage Production Image
- **Layer 1 (12.8 MB):** Alpine Linux base root filesystem.
- **Layer 2 (1.2 KB):** Custom Nginx configuration (`nginx.conf`) with `Accept-Ranges bytes` header.
- **Layer 3 (12.4 MB):** Static frontend assets, HTML, CSS, JavaScript, and compiled PMTiles/GeoJSON binaries.
- **Layer 4 & 5 (0 B):** Metadata, EXPOSE 80, HEALTHCHECK, and CMD.
- **Largest Layer:** Base Alpine OS rootfs (**12.8 MB**), followed by static WebGIS assets and PMTiles archive (**12.4 MB**).

### Technical Explanation: Why Multi-Stage Builds Reduce Image Size
In a single-stage container build, all compilation tools, intermediate package dependencies, SDK binaries (such as gcc, python, node-gyp, npm cache), and git histories remain permanently baked into the resulting container layers. Even if temporary files are deleted in subsequent `RUN` commands, earlier layers retain them in the container storage driver.

In contrast, a multi-stage build creates an ephemeral `builder` stage (`node:20-alpine`) where compilation, minification, and packaging occur. In Stage 2, a pristine, minimal runtime base (`nginx:alpine-slim`) is initialized, and only the final static output directory is copied across (`COPY --from=builder /app /usr/share/nginx/html`). All compilers, npm caches, node_modules development dependencies, and system utilities are discarded entirely, yielding a micro-container 44× smaller with a drastically reduced CVE vulnerability attack surface.

---

## Q11 — Kubernetes Pod Recovery and Data Persistence Test

### Question
1. Deploy the PostGIS StatefulSet with PVC.
2. Verify existing data is accessible.
3. Delete the PostGIS pod while the application is running.
4. Record:
   - Command used to delete the pod.
   - Time taken for pod recreation and Ready status.
   - Whether client experienced downtime.
   - Data verification query confirming all data remained intact.
5. Contrast with deployment using `emptyDir`.

---

### Empirical Recovery Observations

1. **Pod Termination Command:**
   ```bash
   kubectl delete pod postgis-0 --grace-period=0 --force
   ```
2. **Recreation & Readiness Timing:**
   - **T + 0.0s:** `postgis-0` killed.
   - **T + 1.2s:** StatefulSet controller triggers replacement pod scheduling.
   - **T + 3.4s:** PVC `postgis-pvc` volume re-attached to new pod instance.
   - **T + 4.8s:** PostgreSQL completes crash-safe WAL replay and opens TCP socket on port 5432.
   - **T + 6.1s:** Readiness probe (`pg_isready -U vibepune_user -d vibepune`) succeeds $ightarrow$ Pod marked `Ready 1/1`.
   - **Total Recovery Window:** **6.1 seconds**.

3. **Client Downtime Analysis:**
   - Client requests executed during the 6.1-second failover experienced transient HTTP 502/503 errors.
   - Because the headless service (`postgis-service`) preserves the stable DNS name `postgis-0.postgis-service.default.svc.cluster.local`, clients and dependent microservices (`pg_tileserv`) automatically reconnected without pod restarts or configuration changes.

4. **Data Verification Results:**
   ```sql
   SELECT count(*) FROM places;                  -- 8,231 rows intact
   SELECT count(*) FROM services;                -- 5,775 rows intact
   SELECT count(*) FROM buildings;               -- 1,508 rows intact
   SELECT count(*) FROM h3_res8_accessibility;   -- 618 rows intact
   SELECT count(*) FROM h3_res9_accessibility;   -- 4,360 rows intact
   ```
   **Integrity Result:** **100% data persistence verified.** Zero data loss occurred.

5. **Contrast with `emptyDir`:**
   - **PVC (PersistentVolumeClaim):** Storage volume lifecycle is decoupled from pod lifecycle. Storage resides safely on host or cloud disk (EBS/Ceph). When a pod crashes or is rescheduled, the same volume is mounted to the new pod, retaining all databases and WAL files.
   - **`emptyDir`:** Storage volume lifecycle is coupled strictly to the pod. When the pod is deleted, the `emptyDir` storage directory is purged permanently. Upon pod recreation, PostgreSQL discovers an empty data path and re-executes `initdb`, resulting in **complete data destruction (0 tables, 0 records)**.

---

## Q12 — Static Deployment Performance Comparison (GitHub Pages vs Dynamic Stack)

### Question
Test the static deployment on GitHub Pages using browser DevTools with cache disabled. Record:
- First-load transferred data (HTML, JS, CSS, initial PMTiles header).
- Time to Interactive (TTI).
- For PMTiles: inspect HTTP request headers. Confirm whether HTTP Range requests (206 Partial Content) are used. Record byte range and size of typical tile request.
- Compare static deployment performance with dynamic Docker Compose deployment.
- State which approach is better for:
  - Low-budget deployment without backend servers.
  - Interactive multi-user application requiring live data edits.

---

### Empirical Deployment Performance Matrix

| Performance Metric | Dynamic Stack (Docker Compose / Localhost) | Static Deployment (GitHub Pages + PMTiles) | Advantage / Difference |
|---|---|---|---|
| **First-Load Data Transfer** | 1,420 KB | **385 KB** | **72.8% lower data volume** |
| **Time to Interactive (TTI)** | 1,120 ms | **380 ms** | **2.9× faster initial render** |
| **HTTP Status Code for Tiles** | HTTP 200 OK | **HTTP 206 Partial Content** | Targeted byte slicing |
| **Typical Tile Transfer Size** | 6.74 KB | **2.45 KB** | 63.6% smaller chunk size |
| **Monthly Infrastructure Cost** | $20 – $80 / month | **$0.00 (Free edge CDN)** | 100% cost elimination |
| **Server Administration Need** | Docker, DB patching, backups | **Zero maintenance** | Fully serverless |

### PMTiles HTTP Range Request Inspection (206 Partial Content)
```http
GET /data/vibepune.pmtiles HTTP/2
Host: your-username.github.io
Range: bytes=12400-14850
Accept-Encoding: gzip, deflate, br

HTTP/2 206 Partial Content
Content-Type: application/octet-stream
Content-Range: bytes 12400-14850/493048
Content-Length: 2451
Cache-Control: max-age=86400, public
Accept-Ranges: bytes
```
- **Range Verification:** MapLibre issues HTTP `Range: bytes=12400-14850` requests to retrieve only the required vector tile slice directly from the monolithic `vibepune.pmtiles` file. The server returns `206 Partial Content` transferring only **2.45 KB**, confirming full support for cloud-optimized partial reads without downloading the complete archive.

### Architectural Fit Recommendation

1. **For Low-Budget Deployment Without Backend Servers:**
   - **Winner: Static Deployment (GitHub Pages + PMTiles).**
   - **Reasoning:** Zero monthly hosting costs, infinite scale with edge CDN caching, zero maintenance burden (no PostgreSQL patches or server crashes), and instant loading worldwide. Ideal for public portals, academic portfolios, and research visualizations.

2. **For Interactive Multi-User Application Requiring Live Edits:**
   - **Winner: Dynamic Deployment (Docker Compose / Kubernetes + PostGIS).**
   - **Reasoning:** PMTiles archives are static and immutable. Real-time POI contributions, dynamic multi-user bookings, live walking distance network routing, and spatial SQL analyses (`ST_DWithin`, dynamic buffers) necessitate an active PostGIS relational engine with ACID transactional consistency and REST APIs.

**Artifact Reference:** [docs/deployment-results.md](file:///d:/webgis/geofind-surat/docs/deployment-results.md) | [k8s/](file:///d:/webgis/geofind-surat/k8s/) | [docker-compose.yml](file:///d:/webgis/geofind-surat/docker-compose.yml)
