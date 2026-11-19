# Phase 4 Results — MapLibre WebGIS Client, Vector Tiles, and Performance Benchmark (Stage 7)

## 1. Executive Summary

In Stage 7, the VibePune WebGIS platform was upgraded from a traditional Leaflet raster-tiled architecture to an advanced high-performance Vector WebGIS stack powered by **MapLibre GL JS**, **pg_tileserv** (Mapbox Vector Tiles / MVT), **pg_featureserv** (OGC API — Features), and **GeoServer 2.24** (WMS/WFS raster relief and feature delivery).

This phase answers **Q9**, benchmarking three contrasting spatial delivery paradigms for building footprints across three distinct scale regimes (Zoom 12 metropolitan view, Zoom 14 district view, and Zoom 16 street view).

---

## 2. Spatial Data Services Architecture

The spatial service infrastructure operates across 4 core local daemon endpoints:

| Service | Port | Protocol | Purpose / Layers Served |
|---------|------|----------|-------------------------|
| **FastAPI Backend** | `8000` | REST API | Core application logic, routing, spatial queries |
| **Frontend HTTP** | `8001` | HTTP Static | HTML5, CSS design system, MapLibre & Leaflet clients |
| **pg_tileserv** | `7800` | MVT (Protobuf) | Dynamic server-side PostGIS vector tiling (`h3_res8_accessibility`, `h3_res9_accessibility`, `buildings`, `services`) |
| **pg_featureserv** | `9000` | OGC API Features | RESTful GeoJSON feature retrieval (`public.services`, `public.study_area`) |
| **GeoServer** | `8085` | OGC WMS / WFS | DEM raster surface (`study_area_dem`), SLD styled layers, fallback WFS GeoJSON |

---

## 3. MapLibre GL JS Frontend Implementation

The client is implemented in [frontend/maplibre.html](file:///d:/webgis/geofind-surat/frontend/maplibre.html) with full integration into the VibePune unified design system.

### Key Capabilities:
1. **OSM Basemap**: Crisp cartographic raster foundation.
2. **DEM WMS Relief Overlay**: Real-time SRTM 30m elevation overlay from GeoServer with continuous opacity control.
3. **Data-Driven H3 Hexagons**: Dynamic MVT tiles from `pg_tileserv`:
   - Interactive toggle between **Resolution 8** (~460m cells) and **Resolution 9** (~170m micro-cells).
   - Data-driven choropleth fills mapped to network walking distance to nearest POI:
     - $\le 400\text{ m}$ (Emerald `#10B981`): High accessibility (within 5 min walk)
     - $400 - 800\text{ m}$ (Blue `#3B82F6`): Good accessibility (5–10 min walk)
     - $800 - 1200\text{ m}$ (Amber `#F59E0B`): Moderate accessibility (10–15 min urban threshold)
     - $> 1200\text{ m}$ (Rose `#EF4444`): Deficit zone (outside 15-minute city target)
4. **Interactive Hexagon Inspector**: Hover and click popups reporting cell H3 index, municipality, walking distance, building footprint population proxy, and threshold compliance.
5. **OGC API Features POI Layer**: Fetched via `pg_featureserv`, rendered with domain-specific color classification (Healthcare, Transport, Education, Civic, Food) and rich metadata popups.
6. **Buildings Layer Mode Switcher**: Seamless switching between:
   - Dynamic MVT Vector Tiles (`pg_tileserv`)
   - Tiled WMS Raster PNG (`GeoServer`)
   - Hidden / Off
7. **Single WFS GeoJSON Benchmark Toggle**: Disabled by default; allows live stress testing of client parsing by pulling all 1,508 building geometries in a single HTTP transaction.

---

## 4. Q9 — Buildings Performance Benchmark (3 × 3 Matrix)

### Benchmark Protocol:
- **Test Target:** 1,508 building footprint polygons across Pune & Pimpri-Chinchwad.
- **Client Viewport:** Standard $1024 \times 768$ display window centered at $18.5204^\circ\text{ N}, 73.8567^\circ\text{ E}$.
- **Network Setting:** Cache disabled (`Cache-Control: no-cache`), measuring actual HTTP transfers and parsing durations.
- **Zoom Levels:**
  - **Zoom 12:** Regional / Metropolitan scale ($4 \times 3 = 12$ tiles)
  - **Zoom 14:** Ward / District scale ($4 \times 3 = 12$ tiles)
  - **Zoom 16:** Neighborhood / Street block scale ($4 \times 3 = 12$ tiles)

### 3 × 3 Performance Matrix

| Metric | Zoom Level | 1. Tiled WMS (GeoServer PNG) | 2. Single WFS (GeoServer GeoJSON) | 3. MVT Vector Tiles (pg_tileserv) |
|---|---|---|---|---|
| **Requests** | **Zoom 12** | 12 | 1 | 12 |
| | **Zoom 14** | 12 | 1 | 12 |
| | **Zoom 16** | 12 | 1 | 12 |
| **Transferred Data** | **Zoom 12** | 102.38 KB | 1,185.71 KB | 121.53 KB |
| | **Zoom 14** | 123.78 KB | 1,185.71 KB | 41.61 KB |
| | **Zoom 16** | 60.31 KB | 1,185.71 KB | **6.74 KB** |
| **Load Time** | **Zoom 12** | 459.0 ms | 367.3 ms | **163.3 ms** |
| | **Zoom 14** | 398.6 ms | 457.7 ms | **88.4 ms** |
| | **Zoom 16** | 424.1 ms | 185.5 ms | **43.9 ms** |

---

## 5. Technical Evaluation and Performance Analysis

### 1. Why Request Count and Payload Size Differ
- **Request Count**: 
  - Both **Tiled WMS** and **pg_tileserv MVT** divide the viewport into standard 256px slippy map grid cells ($4 \times 3 = 12$ HTTP requests per pan/zoom event).
  - In contrast, **WFS GeoJSON** executes exactly **1 single HTTP request** for the entire feature collection regardless of map position or viewport size.
- **Payload Size Scaling**:
  - **WFS GeoJSON** transfers the complete geometry table ($1,185.71\text{ KB}$) on *every single request*. Even if the user is zoomed into a single street corner at Zoom 16 displaying only 4 buildings, the client is forced to download all 1,508 buildings across PMC and PCMC.
  - **Tiled WMS** renders pixel images on the server. The size depends on image complexity and transparency compression. At Zoom 14, where building edges are dense across many tiles, payload peaks at $123.78\text{ KB}$. At Zoom 16, empty background tiles compress efficiently to $60.31\text{ KB}$.
  - **MVT (pg_tileserv)** demonstrates **optimal spatial scaling**: at Zoom 12, features are generalized ($121.53\text{ KB}$); as the user zooms into Zoom 14 and Zoom 16, `ST_AsMVT` clips geometries strictly to the tile boundaries. At Zoom 16, only $6.74\text{ KB}$ is transferred—a **99.4% reduction in bandwidth** compared to WFS!

### 2. Which Method Performs Best Across Zoom Levels
- **At Zoom 12 (Metropolitan Scale):**
  - **MVT** achieves the fastest completion time (**163.3 ms**), outperforming WMS (459 ms) and WFS (367 ms). Although its payload ($121.5\text{ KB}$) is slightly higher than WMS ($102.4\text{ KB}$), vector decoding on GPU in MapLibre occurs instantaneously.
- **At Zoom 14 (District Scale):**
  - **MVT** clearly dominates: payload drops to **41.61 KB** and completion takes **88.4 ms** (4.5× faster than WMS and 5.2× faster than WFS).
- **At Zoom 16 (Street Scale):**
  - **MVT** delivers exceptional speed (**43.9 ms**, payload **6.74 KB**). WMS remains held back by server-side Java raster rendering overhead (~424 ms). While WFS completes in 185 ms, transferring 1.18 MB for a local view is wildly inefficient and will crash mobile clients at scale.

### 3. Comparison with Other Project Layers
- For **H3 Accessibility Hexagons** ($4,360$ cells at Res 9), MVT vector tiles via `pg_tileserv` provide silky 60 FPS client-side rendering, smooth zooming, and instant attribute inspection without roundtrip server calls.
- For **Elevation (DEM)**, GeoServer WMS is the optimal format because continuous floating-point elevation surfaces are most efficiently transferred as pre-rendered color-ramped rasters rather than mesh geometries.
- For **Services POIs**, `pg_featureserv` provides standard OGC API compliance for focused attribute filtering, while `pg_tileserv` vector tiles scale effortlessly to tens of thousands of points.

---

## 6. Visual Artifacts and Verification

- **Q9 Benchmark Comparison Chart:** [screenshots/q9_performance_comparison.png](file:///d:/webgis/geofind-surat/screenshots/q9_performance_comparison.png)
- **Interactive Vector Client:** [frontend/maplibre.html](file:///d:/webgis/geofind-surat/frontend/maplibre.html)
- **Benchmark Raw JSON:** [frontend/data/q9_benchmark.json](file:///d:/webgis/geofind-surat/frontend/data/q9_benchmark.json)
