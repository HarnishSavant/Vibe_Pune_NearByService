# VibePune — Enterprise WebGIS & Urban Accessibility Platform

> **Urban Service Accessibility, Vector Tiling, and Cloud-Native Infrastructure for Pune & Pimpri-Chinchwad Municipal Corporations**

[![PostGIS](https://img.shields.io/badge/Database-PostgreSQL%2016%20%2B%20PostGIS%203.4-336791?style=flat&logo=postgresql&logoColor=white)](https://postgis.net)
[![GeoServer](https://img.shields.io/badge/OGC-GeoServer%202.24%20(WMS%2FWFS%2FWCS)-blue?style=flat)](https://geoserver.org)
[![MapLibre](https://img.shields.io/badge/Vector-MapLibre%20GL%20JS%203.6-blueviolet?style=flat&logo=maplibre&logoColor=white)](https://maplibre.org)
[![H3](https://img.shields.io/badge/DGGS-Uber%20H3%20(Res%208%20%26%209)-orange?style=flat)](https://h3geo.org)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes%20(k8s)-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io)

---

## 1. Project Title & Academic Objective

**Project Title:** VibePune — Urban Accessibility, OGC Infrastructure, and High-Performance Vector WebGIS  
**Academic Objective:** To develop, benchmark, and deploy a full-stack, enterprise-grade WebGIS platform analyzing spatial equity and 15-minute pedestrian accessibility to multi-domain public services across the contiguous twin municipal corporations of Pune (PMC) and Pimpri-Chinchwad (PCMC), Maharashtra, India.

---

## 2. Study Area & Selected Service Domain

- **Administrative Coverage:** Pune Municipal Corporation (PMC) and Pimpri-Chinchwad Municipal Corporation (PCMC).
- **Statutory Area:** $427.29\text{ km}^2$ (Calculated in UTM Zone 43N / EPSG:32643).
- **Centroid Coordinates:** $18.5204^\circ\text{ N}, 73.8567^\circ\text{ E}$.
- **Primary Service Type Analyzed:** Essential urban points of interest (5,775 verified facilities strictly within PMC + PCMC boundaries) spanning 10 functional domains:
  - **Health:** Hospitals, trauma centers, clinics, pharmacies
  - **Transport:** Metro stations, bus terminals, railway stations
  - **Education:** Schools, colleges, research institutes
  - **Recreation & Nature:** Public parks, garden reserves, Tekdis
  - **Food & Daily Needs:** Supermarkets, bakeries, cafes
  - **Civic & Public Services:** Ward offices, police stations, post offices

---

## 3. Technology Stack

| Layer | Technologies / Frameworks | Version / Specifications |
|---|---|---|
| **Spatial Database** | PostgreSQL + PostGIS | PostgreSQL 16.3 / PostGIS 3.4 (Alpine) |
| **OGC Map Server** | GeoServer | GeoServer 2.24.1 (WMS 1.1.1/1.3.0, WFS 2.0, WCS) |
| **Dynamic Vector Tiling** | `pg_tileserv` (CrunchyData) | v1.0.9+ (PostGIS `ST_AsMVT` streaming) |
| **Feature Server** | `pg_featureserv` (CrunchyData) | v1.3.1 (OGC API — Features Part 1) |
| **Frontend Mapping** | MapLibre GL JS & Leaflet | MapLibre GL JS 3.6.2 (WebGL/GPU), Leaflet 1.9.4 |
| **Grid Analytics (DGGS)** | Uber H3 Hexagonal Grid | H3-py v3.7.7 (Resolutions 8 & 9) |
| **Network Routing** | OSMnx & NetworkX / OSRM | Walking network graph traversal ($4.8\text{ km/h}$) |
| **Static Cloud Packaging**| PMTiles v3 (ProtoMap) | Single-file cloud-optimized archive with HTTP Range requests |
| **Containerization** | Docker & Docker Compose | Compose file version 3.9, Multi-stage Nginx slim build |
| **Cloud Orchestration** | Kubernetes (k8s) | StatefulSet, PersistentVolumeClaim, Headless Service |
| **CI/CD Pipeline** | GitHub Actions | Automated deployment to GitHub Pages on push to `main` |

---

## 4. System Architecture

```mermaid
graph TD
    User["Web Browser Client"] -->|HTTPS / Port 80| Client["VibePune Web Client (MapLibre GL JS / Nginx)"]
    
    subgraph Edge Distribution [Serverless Edge Hosting]
        Client -->|HTTP 206 Range Requests| PMTiles["vibepune.pmtiles (Static 481 KB Archive)"]
        Client -->|Static Fetch| GeoJSON["GeoJSON Feature Layers"]
    end
    
    subgraph Dynamic Container Stack [Docker Compose / Kubernetes Mesh]
        Client -->|Port 7800 (MVT Protobuf)| TS["pg_tileserv"]
        Client -->|Port 9000 (GeoJSON)| FS["pg_featureserv"]
        Client -->|Port 8085 (WMS PNG / DEM)| GS["GeoServer 2.24"]
        
        TS -->|Internal TCP 5432| DB[("PostgreSQL 16 + PostGIS 3.4")]
        FS -->|Internal TCP 5432| DB
        GS -->|Internal TCP 5432| DB
    end
    
    subgraph Storage Persistence
        DB --- PVC[("PersistentVolumeClaim (5Gi disk)")]
    end
```

---

## 5. Dataset Sources & Processing Methodology

1. **Administrative Boundaries:** DataMeet open municipal GIS boundaries for Maharashtra, dissolved and clipped to form the joint PMC + PCMC study area ($427.29\text{ km}^2$).
2. **Points of Interest (POIs):** OpenStreetMap (OSM) multi-category extraction augmented with civic data, filtered by bounding polygon, deduplicated, and classified into 10 primary lifestyle domains ($5,775$ points of interest in study area).
3. **Digital Elevation Model (DEM):** NASA SRTM 30m resolution raster (`N18E073`), reprojected to EPSG:4326, clipped to PMC+PCMC bounds ($1053 \times 910$ pixels, elevations ranging $526\text{m} - 787\text{m}$), and published as GeoServer coverage `study_area_dem`.
4. **Hexagonal Spatial Discretization (DGGS):** Uber H3 grid generated across study extent:
   - Resolution 8: 618 cells (average cell area $0.737\text{ km}^2$, edge length $461\text{m}$).
   - Resolution 9: 4,360 cells (average cell area $0.105\text{ km}^2$, edge length $174\text{m}$).
5. **Walking Network Routing:** Road and pedestrian footway graphs downloaded via OSMnx, topological network distance computed from every hexagon centroid to the nearest service via Dijkstra shortest-path algorithms.
6. **Population Proxy:** High-resolution building footprints ($1,508$ polygons) translated to gross residential area, applying Maharashtra urban planning standards ($30\text{ m}^2/\text{capita}$).

---

## 6. Environment Configuration

Copy the provided environment template to initialize configuration:
```bash
cp .env.example .env
```

Edit `.env` to configure ports and credentials (never commit real credentials to version control):
```env
# Application Settings
APP_NAME=VibePune
APP_ENV=production

# Database Credentials
POSTGRES_USER=vibepune_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=vibepune
POSTGRES_PORT=5432

# GeoServer Configuration
GEOSERVER_ADMIN_USER=admin
GEOSERVER_ADMIN_PASSWORD=your_geoserver_password
GEOSERVER_PORT=8085

# Vector & Feature Microservices
PG_TILESERV_PORT=7800
PG_FEATURESERV_PORT=9000
```

---

## 7. How to Run with Docker Compose

Deploy the complete multi-container stack across a shared private network (`vibepune-net`):

```bash
# 1. Start all 4 microservices in detached mode
docker-compose up -d

# 2. Monitor container status and automated healthchecks
docker-compose ps

# 3. Inspect application logs
docker-compose logs -f
```

### Published Service Ports:
- **PostgreSQL / PostGIS:** `localhost:5432`
- **GeoServer OGC Services:** `http://localhost:8085/geoserver/web/`
- **pg_tileserv Vector Tiles:** `http://localhost:7800/index.json`
- **pg_featureserv OGC API:** `http://localhost:9000/collections.json`

---

## 8. How to Access GeoServer & WebGIS Client

### 8.1 GeoServer Web Interface
- **URL:** `http://localhost:8085/geoserver/web/`
- **Default Credentials:** `admin` / `geoserver`
- **Published Layers:**
  - `vibepune:study_area` (Boundary polygon)
  - `vibepune:services` (Styled with `sld/services_named_unnamed.sld`)
  - `vibepune:buildings` (Footprint polygons)
  - `vibepune:study_area_dem` (Continuous 30m elevation coverage)

### 8.2 WebGIS Client Interfaces
- **MapLibre GL JS Vector Client:** `client/maplibre.html`
  - Dynamic H3 accessibility isochrone hexagons
  - Interactive Res 8 / Res 9 resolution switcher
  - DEM relief WMS overlay with opacity slider
  - Buildings performance test toggle (WFS GeoJSON vs MVT vs WMS)
  - Full attribute popups and interactive legend
- **Leaflet Discovery Map:** `client/discover.html`
  - Marker clustering, smart multi-domain search, multimodal OSRM routing

---

## 9. How to Deploy and Test Kubernetes (kind / minikube)

Production manifests are located in [`k8s/`](k8s/):

```bash
# 1. Apply all Kubernetes manifests in sequence
kubectl apply -f k8s/

# 2. Verify all pods transition to Running and Ready status
kubectl get pods -w
kubectl get services
kubectl get pvc

# 3. Forward the WebGIS client port to access locally
kubectl port-forward service/client-service 8080:80
```

### Executing the Pod Recovery & Persistence Test (Q11):
```bash
# Forcefully terminate the PostGIS StatefulSet pod
kubectl delete pod postgis-0 --grace-period=0 --force

# Observe automatic replacement and persistent volume reattachment
kubectl get pods -w
```
*Recovery completes within ~6.1 seconds with 100% data preservation on `postgis-pvc`.*

---

## 10. Static Deployment — GitHub Pages

The client includes an automated GitHub Actions CI/CD workflow ([`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)):
- **Pipeline:** Automatically packages `client/` along with `client/data/vibepune.pmtiles` and deploys to GitHub Pages upon push to `main`.
- **Public URL:** Configured to deploy at `https://<username>.github.io/<repository-name>/`.
- *Note:* The repository must be pushed to your personal/institutional GitHub account and GitHub Pages enabled in repository settings under **Settings -> Pages -> GitHub Actions**.

---

## 11. Submission Directory Structure

```text
WebGIS_Assignment_Submission/
├── README.md                      # Comprehensive project documentation
├── ANSWERS.md                     # Complete empirical answers for Q1 through Q12
├── docker-compose.yml             # 4-container dynamic orchestration
├── .env.example                   # Sanitized environment template
├── Dockerfile                     # Multi-stage production Nginx slim image
├── Dockerfile.single              # Single-stage Node.js image for Q10 comparison
├── study/                         # Four theoretical & technical study notes
│   ├── S1_OGC_CRS.md              # OGC protocols, CRS, axis order, area distortion
│   ├── S2_Tiles_Indexes.md        # Raster/vector tiling, GiST R-Tree, PMTiles
│   ├── S3_Accessibility.md        # 15-min city, graph routing, H3 DGGS, MAUP
│   └── S4_Docker_Kubernetes.md    # Containers, multi-stage, Compose, K8s StatefulSets
├── sql/                           # Production SQL query scripts
│   ├── phase1_analysis.sql        # PostGIS integration, Q1 area, Q2 GiST plans, Q3 QA
│   └── phase3_analysis.sql        # H3 grid, walking accessibility, Q6-Q8 metrics
├── sld/                           # Styled Layer Descriptors for GeoServer
│   ├── services_named_unnamed.sld # Separate cartographic styling for named/unnamed
│   └── study_area.sld             # Municipal boundary perimeter styling
├── analysis/                      # Python geospatial analysis scripts
│   ├── phase1_analysis.py         # Phase 1 PostGIS metric computations
│   ├── accessibility_analysis.py  # Network routing, H3 accessibility, MAUP
│   ├── phase4_benchmark.py        # Q9 3x3 DevTools performance benchmark runner
│   └── export_static_geodata.py   # PMTiles packaging and GeoJSON export script
├── client/                        # Full production WebGIS frontend client
│   ├── index.html                 # Main landing portal
│   ├── maplibre.html              # High-performance Vector WebGIS client
│   ├── discover.html              # Leaflet discovery and routing interface
│   ├── nginx.conf                 # Nginx configuration with HTTP 206 Range support
│   ├── css/                       # Unified CSS design system
│   ├── js/                        # ES6 client modules
│   └── data/                      # Bundled static PMTiles archive & GeoJSON layers
├── k8s/                           # Kubernetes cloud-native deployment manifests
│   ├── 01-secrets.yaml            # Encrypted database credentials
│   ├── 02-storage.yaml            # 5Gi PersistentVolumeClaim
│   ├── 03-postgis-statefulset.yaml# PostGIS StatefulSet with health probes
│   ├── 04-postgis-service.yaml    # Headless internal service discovery
│   ├── 05-pg-tileserv.yaml        # MVT vector tile microservice
│   ├── 06-client.yaml             # Multi-replica Nginx client on NodePort 30080
│   └── kustomization.yaml         # Kustomize manifest bundle
├── screenshots/                   # Verification evidence & benchmark plots
│   ├── dem_wms_preview.png        # GeoServer WMS DEM surface
│   ├── q6_worst_case_barrier.png  # Mutha Canal physical barrier detour map
│   ├── q7_population_accessibility_map.png # Pune H3 accessibility choropleth
│   ├── q8_elderly_accessibility_loss.png   # Elderly vulnerable population loss
│   ├── q9_performance_comparison.png       # 3x3 DevTools performance chart
│   ├── wms_1_1_1_lonlat_valid.png          # Valid WMS 1.1.1 map render
│   ├── wms_1_3_0_latlon_valid.png          # Valid WMS 1.3.0 corrected render
│   └── wms_1_3_0_lonlat_swapped.png        # Empty WMS 1.3.0 swapped render
└── docs/                          # Detailed technical phase audit reports
    ├── phase1-results.md          # PostGIS integration & Q1-Q3 results
    ├── phase2-results.md          # GeoServer, WMS, WFS & Q4-Q5 results
    ├── phase3-results.md          # Walking accessibility & Q6-Q8 results
    ├── phase4-results.md          # MapLibre, vector tiles & Q9 results
    ├── deployment-results.md      # Docker, K8s, PMTiles & Q10-Q12 results
    ├── study-area-boundary-report.md # Boundary integration audit
    └── poi-data-expansion-report.md  # Multi-domain POI taxonomy report
```

---

## 12. Reproducibility & Verification Instructions

To reproduce all numerical results, database tables, and visual artifacts from scratch:

1. **Database Re-initialization & Population:**
   ```bash
   python analysis/phase1_analysis.py
   ```
2. **Walking Network & Accessibility Isochrones:**
   ```bash
   python analysis/accessibility_analysis.py
   ```
3. **Q9 Performance Benchmark Execution:**
   ```bash
   python analysis/phase4_benchmark.py
   ```
4. **PMTiles Archive Compilation:**
   ```bash
   python analysis/export_static_geodata.py
   ```
5. **Run Backend Test Suite:**
   ```bash
   pytest backend/tests -v
   ```
   *Expected outcome: 63 passed, 0 failed.*

---

## 13. License & Academic Attribution

- **Academic Context:** Advanced WebGIS Engineering & Spatial Data Science
- **Geospatial Data:** OpenStreetMap contributors (ODbL License); DataMeet Maharashtra Boundaries (CC-BY-SA 4.0); NASA SRTM (Public Domain).
- **Software License:** MIT License
