# Phase 2 — GeoServer, OGC Services & DEM Report

**Project:** VibePune WebGIS — PMC + PCMC Study Area  
**Phase:** Stage 5 (GeoServer Layer Publishing, DEM Coverage, Q4 WMS & Q5 WFS Analysis)  
**Execution Date:** 2026-11-18  
**GeoServer Host:** `http://localhost:8085/geoserver`  
**Workspace:** `vibepune`  
**Datastore:** `postgis_vibepune` (PostGIS `vibepune` DB on port 5432)

---

## 1. PostGIS Layer Publishing in GeoServer

All spatial layers were published to GeoServer via the REST API with native CRS declared as `EPSG:4326`:

| Layer Name | Type | Native Feature Count | Bounding Box (EPSG:4326) | Style Applied |
|------------|------|----------------------|--------------------------|---------------|
| `vibepune:study_area` | Polygon | 1 | [73.71043, 18.42883] to [73.96296, 18.72113] | `study_area_style` |
| `vibepune:services` | Point | 5,775 | [73.71443, 18.44005] to [73.95518, 18.71615] | `services_named_unnamed` |
| `vibepune:buildings` | Polygon | 1,508 | [73.71723, 18.42890] to [73.95442, 18.70594] | Default polygon |
| `vibepune:municipal_boundaries` | Polygon | 3 | [73.71042, 18.42883] to [73.96296, 18.72113] | `pune_boundary_style` |

### Styling (SLD) Implementation
An SLD style (`sld/services_named_unnamed.sld`) was created and uploaded to differentiate named vs unnamed services:
- **Named Services:** Green circles (`#22c55e`, size 8px, dark green stroke `#15803d`).
- **Unnamed Services:** Red triangles (`#ef4444`, size 8px, dark red stroke `#991b1b`).

---

## 2. 30m Digital Elevation Model (DEM) Coverage

### Data Provenance
- **Source:** NASA Shuttle Radar Topography Mission (SRTM) Global 1-arcsecond (~30m resolution), mirrored via ESA (`https://step.esa.int/auxdata/dem/SRTMGL1/N18E073.SRTMGL1.hgt.zip`).
- **Raw Tile:** `N18E073` covering 18.0°–19.0° N and 73.0°–74.0° E.
- **Raw File:** `data/raw/dem/N18E073.hgt` (3,601 × 3,601 16-bit signed integer grid).
- **Clipped GeoTIFF:** `data/processed/dem/study_area_dem.tif`.

### Clipping & Elevation Metrics
The raw DEM was masked and cropped to the exact PMC + PCMC study area boundary (`data/processed/boundaries/study_area.geojson`):
- **Raster Dimensions:** 1,053 rows × 910 columns
- **Pixel Resolution:** 30.8m × 30.8m (1 arc-second)
- **Minimum Elevation:** 526 m (along river plains)
- **Maximum Elevation:** 787 m (southern/western ridge lines)
- **Mean Elevation:** 587.8 m
- **CRS:** EPSG:4326

### GeoServer Coverage Publishing
- Published as a CoverageStore: `vibepune:study_area_dem`
- **WMS Preview Endpoint:**
  ```
  http://localhost:8085/geoserver/vibepune/wms?service=WMS&version=1.3.0&request=GetMap&layers=vibepune:study_area_dem&crs=EPSG:4326&bbox=18.428,73.710,18.722,73.963&width=512&height=512&format=image/png
  ```
  Output saved to: `screenshots/dem_wms_preview.png` (80,871 bytes).
- **WCS 2.0.1 DescribeCoverage:**
  ```
  http://localhost:8085/geoserver/vibepune/wcs?service=WCS&version=2.0.1&request=DescribeCoverage&coverageId=vibepune__study_area_dem
  ```
  Status: `200 OK` (3,655 bytes XML).

---

## 3. Q4 — WMS Axis Order Comparison

### Capabilities Extraction
Retrieved WMS 1.3.0 GetCapabilities from `http://localhost:8085/geoserver/vibepune/wms?service=WMS&version=1.3.0&request=GetCapabilities`.
Layer `vibepune:services` reports:
```xml
<BoundingBox CRS="CRS:84" minx="73.7144294" miny="18.4400528" maxx="73.9551847" maxy="18.7161528"/>
<BoundingBox CRS="EPSG:4326" minx="18.4400528" miny="73.7144294" maxx="18.7161528" maxy="73.9551847"/>
```

### Empirical Test Matrix

| Request | Version | CRS/SRS Parameter | BBOX Used | HTTP Status | Response Size | Map Output |
|---------|---------|-------------------|-----------|-------------|---------------|------------|
| **1. WMS 1.1.1** | 1.1.1 | `SRS=EPSG:4326` | `73.71443,18.44005,73.95518,18.71615` | `200 OK` | **227,977 bytes** | Full Pune map (all 5,775 services) |
| **2. WMS 1.3.0** | 1.3.0 | `CRS=EPSG:4326` | `73.71443,18.44005,73.95518,18.71615` | `200 OK` | **9,249 bytes** | Completely empty / transparent |
| **3. WMS 1.3.0 (Fixed)** | 1.3.0 | `CRS=EPSG:4326` | `18.44005,73.71443,18.71615,73.95518` | `200 OK` | **227,977 bytes** | Full Pune map (matches Request 1) |
| **4. WMS 1.1.1 (Swapped)** | 1.1.1 | `SRS=EPSG:4326` | `18.44005,73.71443,18.71615,73.95518` | `200 OK` | **9,249 bytes** | Completely empty / transparent |

### Saved Screenshots
- `screenshots/wms_1_1_1_lonlat_valid.png`: 227.9 KB (Valid Pune services map)
- `screenshots/wms_1_3_0_lonlat_swapped.png`: 9.2 KB (Empty map due to axis swap)
- `screenshots/wms_1_3_0_latlon_valid.png`: 227.9 KB (Valid Pune services map in WMS 1.3.0)

### Technical Analysis
- WMS 1.1.1 assumes `(x, y)` coordinate order (`lon, lat`) for EPSG:4326.
- WMS 1.3.0 strictly enforces the official EPSG geodetic registry axis order for EPSG:4326, which defines Axis 1 as Latitude and Axis 2 as Longitude.
- Passing `73.71, 18.44` to WMS 1.3.0 instructs GeoServer to render latitude 73.71°N (Arctic) and longitude 18.44°E, which falls thousands of kilometers away from Pune, producing an empty image.

---

## 4. Q5 — WFS 2.0 GetFeature Analysis

### Request URLs
- **GeoJSON:**
  `http://localhost:8085/geoserver/vibepune/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=vibepune:services&CQL_FILTER=name%20IS%20NOT%20NULL%20AND%20name%20%3C%3E%20%27%27&OUTPUTFORMAT=application/json`
- **GML 3.2:**
  `http://localhost:8085/geoserver/vibepune/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=vibepune:services&CQL_FILTER=name%20IS%20NOT%20NULL%20AND%20name%20%3C%3E%20%27%27&OUTPUTFORMAT=application/gml%2Bxml;%20version=3.2`

### Results Comparison

| Metric | WFS 2.0 GeoJSON | WFS 2.0 GML 3.2 | Ratio (GML / GeoJSON) |
|--------|-----------------|-----------------|-----------------------|
| `numberMatched` | 5,775 | 5,775 | 1.00× |
| Response Size | **2,810.62 KB** (2,878,079 B) | **5,532.30 KB** (5,665,073 B) | **1.97×** |
| Coordinate Format | `[73.764716, 18.6486364]` | `18.6486364 73.764716` | Swapped |
| Axis Order | `[longitude, latitude]` | `latitude longitude` | — |
| Standard Reference | IETF RFC 7946 §3.1.1 | OGC EPSG:4326 / ISO 19136 | — |

### Key Findings
1. GML 3.2 is nearly **2× larger** than GeoJSON for identical data because XML contains repetitive closing tags, namespace definitions, and nested geometry tags (`<gml:Point>`, `<gml:pos>`).
2. GeoJSON uses `[x, y]` = `[lon, lat]` as mandated by RFC 7946, while GML 3.2 respects EPSG:4326 `[lat, lon]`.
