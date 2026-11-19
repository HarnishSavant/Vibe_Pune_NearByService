# VibePune — Multi-Service POI Dataset Expansion Report (Stage 3)

**Author:** Senior GIS Data Engineer & PostGIS Architect  
**Date:** November 18, 2026  
**Status:** Completed & Verified (Stage 3)  
**Study Area:** Combined Pune Municipal Corporation (PMC) + Pimpri-Chinchwad Municipal Corporation (PCMC)  

---

## 1. Executive Summary

In Stage 3, the VibePune POI dataset was upgraded from a lifestyle-centric, district-wide collection into a rigorous, multi-service urban dataset bounded strictly within the validated municipal limits of PMC and PCMC. 

Key milestones achieved:
1. **Audit & Isolation:** Baseline audit segregated 8,139 existing records into 5,683 in-study-area POIs and 2,456 out-of-boundary rural district records (safely archived).
2. **Category Standardization:** Standardized the 57 micro-categories into the **10 core academic service domains**: Healthcare, Emergency, Education, Food, Transport, Finance, Shopping, Public Services, Recreation, and Accommodation.
3. **Targeted OSM Expansion:** Collected and validated genuine OpenStreetMap infrastructure across under-represented services (banking, ATMs, universities, colleges, schools, police stations, and fire services).
4. **Municipality Classification:** Every POI is tagged with `municipality = 'PMC'` or `'PCMC'`.
5. **Database & File Synchronization:** Reconciled PostgreSQL/PostGIS (8,231 records; 5,775 in study area) with static GeoJSON files.

---

## 2. POI Counts & Reconciliation Summary

| Metric | Baseline (Pre-Stage 3) | Stage 3 Final Dataset | Net Change |
|---|---|---|---|
| **Total Database POIs (`places`)** | 8,139 | **8,231** | +92 new POIs (+14 updated) |
| **In-Study-Area POIs (PMC + PCMC)** | 5,683 (69.8%) | **5,775 (70.2%)** | +92 verified urban POIs |
| — **Pune Municipal Corporation (PMC)** | 4,116 | **4,190** | +74 urban POIs |
| — **Pimpri-Chinchwad Municipal Corp (PCMC)** | 1,567 | **1,585** | +18 urban POIs |
| **Archived Outside POIs (Rural Pune District)** | 2,456 | **2,456** | Safely preserved in `places_district_archive` and GeoJSON |
| **Active Categories** | 57 | **62 categories** (in 10 macro domains) | +5 categories (`bank`, `atm`, `school`, `college`, `post-office`) |
| **Study Area GeoJSON Features** | 8,139 (district-wide) | **5,775 (PMC + PCMC only)** | Filtered to exact study bounds |
| **Duplicate OSM IDs** | 0 | **0** | 100% unique |
| **Invalid Geometries** | 0 | **0** | 100% `ST_IsValid` |

---

## 3. Ten Core Service Domains Distribution

Every place is indexed by its specific micro-category and categorized into one of the 10 academic service domains:

| Service Domain | Description / Inclusions | Total in DB | PMC | PCMC | Archived Outside |
|---|---|---|---|---|---|
| **1. Food** | Dining, Quick Bites, Aesthetic Cafes, Bakeries, Desserts, Pubs, Food Courts | **2,320** | 1,219 | 512 | 589 |
| **2. Healthcare** | Hospitals, Clinics, Pharmacies, Diagnostic Centers | **1,639** | 871 | 309 | 459 |
| **3. Transport** | Bus Stops, Transit Hubs, Railway Stations, Metro Stations | **1,054** | 570 | 167 | 317 |
| **4. Public Services** | Places of Worship, Civic Offices, Post Offices, Cultural Monuments | **976** | 396 | 127 | 453 |
| **5. Recreation** | Parks, Gardens, Gyms, Swimming Pools, Sports Arenas, Theatres | **835** | 406 | 205 | 224 |
| **6. Shopping** | Supermarkets, Malls, Fashion, Electronics, Department Stores | **706** | 380 | 184 | 142 |
| **7. Accommodation** | Hotels, Hostels, Guest Houses | **396** | 130 | 43 | 223 |
| **8. Education** | Universities, Colleges, Higher Ed Institutions, Schools, Libraries | **132** | 110 | 7 | 15 |
| **9. Emergency** | Police Stations, Fire Stations, Emergency Response Units | **107** | 58 | 15 | 34 |
| **10. Finance** | Commercial Banks, Public Sector Banks, Regional Banks, ATMs | **66** | 50 | 16 | 0 |
| **Total** | — | **8,231** | **4,190** | **1,585** | **2,456** |

---

## 4. Missing Attribute Audit (Data Quality & Honesty)

In strict accordance with scientific integrity guidelines, no attributes or phone numbers were fabricated:

| Attribute | Populated Count | Missing Count | Completeness | Notes |
|---|---|---|---|---|
| **Name (`name`)** | 8,231 | 0 | **100.0%** | Unnamed features strictly filtered out |
| **Geometry (`geom`, `geog`)** | 8,231 | 0 | **100.0%** | Centroid points, EPSG:4326 |
| **Municipality Classification** | 8,231 | 0 | **100.0%** | Classified as PMC, PCMC, or OUTSIDE |
| **Service Domain** | 8,231 | 0 | **100.0%** | Mapped to the 10 academic domains |
| **Address / Street** | 1,845 | 6,386 | **22.4%** | Retained from OSM `addr:*` tags |
| **Marathi Name (`name_mr`)** | 2,012 | 6,219 | **24.4%** | Local language script when present |
| **Phone Number** | 612 | 7,619 | **7.4%** | Retained honestly from OSM tags |
| **Website URL** | 534 | 7,697 | **6.5%** | Official web links when present |
| **Opening Hours** | 829 | 7,402 | **10.1%** | Standard OSM opening_hours syntax |

---

## 5. Output Datasets & File Structure

| File Path | Format | Features | Description |
|---|---|---|---|
| `data/raw/pune/raw_pois.geojson` | GeoJSON | 9,265 | Primary raw OSM dump (district-wide) |
| `data/raw/pune/supplemental_pois.geojson` | GeoJSON | 298 | Supplemental raw OSM categories |
| `data/raw/pune/expanded_services_raw.json` | JSON | 121 | Raw response payload from Nominatim service queries |
| `data/processed/pune/expanded_services_validated.json` | JSON | 106 | Filtered & validated new service records |
| `data/processed/pune/study_area_pois.geojson` | GeoJSON | **5,775** | **Final combined PMC + PCMC study dataset** |
| `data/processed/pune/normalized_pois.geojson` | GeoJSON | **5,775** | Synchronized client-side static dataset |
| `data/processed/pune/excluded_district_pois.geojson` | GeoJSON | **2,456** | Archived rural Pune district records |

---

## 6. OpenStreetMap Attribution

Data extracted from OpenStreetMap under the Open Database License (ODbL).  
© OpenStreetMap contributors (http://www.openstreetmap.org/copyright).  
Queries executed via OpenStreetMap Nominatim and Overpass API with compliance headers (`User-Agent: VibePuneUrbanGIS/1.0`).

---

## 7. Quality Assurance & System Verification

- **Spatial Verification:** 100% of the 5,775 study-area POIs fall strictly inside the `ST_Covers` boundary of PMC or PCMC.
- **Database Safety:** Backups created in `places_backup_pre_stage3`, `place_categories_backup_pre_stage3`, and `categories_backup_pre_stage3`.
- **Backend Test Suite:** All 63 automated pytest unit/integration tests pass (`test_boundaries.py` + 59 regression tests).
- **Frontend Compatibility:** The interactive Leaflet map, search autocomplete, category chips, detail drawer, and routing continue to operate seamlessly with zero regressions.
