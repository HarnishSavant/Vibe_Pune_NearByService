# Phase 3 — Walking Accessibility Analysis Report (Stage 6)

**Project:** VibePune WebGIS — PMC + PCMC Study Area  
**Phase:** Stage 6 (Walking Accessibility, Isochrones, H3 Hexagonal Grid & Q6–Q8 Analysis)  
**Execution Date:** 2026-11-18  
**Analysis Script:** `analysis/accessibility_analysis.py`  
**SQL Queries:** `sql/phase3_analysis.sql`  

---

## 1. Accessibility Methodology & Parameter Justification

### Urban Study Area Classification
The registered study area covers **Pune Municipal Corporation (PMC)** and **Pimpri-Chinchwad Municipal Corporation (PCMC)**, representing a major contiguous metropolitan area of ~427.3 km² with high urban density.

### Parameter Matrix

| Parameter | Standard Urban Value | Elderly Scenario (Q8) | Justification |
|-----------|----------------------|-----------------------|---------------|
| **Walking Speed** | **4.8 km/h** (1.33 m/s, 80 m/min) | **3.6 km/h** (1.00 m/s, 60 m/min) | Standard healthy adult walking pace vs reduced mobility elderly pace (Bohannon, 1997). |
| **Travel Time Threshold** | **15 minutes** | **15 minutes** | Academic standard for 15-minute city urban accessibility. |
| **Distance Threshold** | **1,200 metres (1.2 km)** | **900 metres (0.9 km)** | $d = v \times t = 4.8 \times \frac{15}{60} = 1.2\text{ km}$; for elderly: $3.6 \times \frac{15}{60} = 0.9\text{ km}$. |
| **Spatial Aggregation** | Uber H3 Hexagonal Grid (Res 8 & 9) | Uber H3 Hexagonal Grid (Res 8 & 9) | Uniform spatial bins avoid irregular polygon bias and enable multi-scale MAUP comparison. |
| **Population Proxy** | Building Footprint Area ($m^2$) | Building Footprint Area ($m^2$) | Derived from PostGIS `buildings` layer ($1,508$ polygons, $11.18\text{ km}^2$ footprint) scaled at standard urban factor $30\text{ m}^2/\text{capita}$. |

---

## 2. Q6 — Straight-Line vs Walking-Network Distance Comparison

### Methodology
- **Sample:** 30 reproducible random points generated across the study area using PostGIS `ST_GeneratePoints(geom, 30, 42)`.
- **Straight-Line Evaluation:** Calculated in UTM Zone 43N (`EPSG:32643`) using PostGIS spatial KNN operator `<->`.
- **Network Evaluation:** Calculated via live OpenStreetMap pedestrian network routing using OSRM walking engine.

### Statistical Findings

| Metric | Empirical Value |
|--------|-----------------|
| **Total Points Evaluated** | 30 |
| **Points where Nearest Service Differs** | **14 / 30 (46.7%)** |
| **Median Network / Straight-Line Ratio** | **1.95×** |
| **Maximum Network / Straight-Line Ratio** | **26.35×** |

### Worst-Case Physical Detour Analysis
- **Point ID:** **#9**
- **Coordinates:** `18.50012° N, 73.84607° E` (Parvati / Sinhagad Road corridor)
- **Straight-Line Nearest:** *Anand Math* (Place of Worship) at **76.8 metres**
- **Walking-Network Distance:** **2,024.7 metres (2.02 km)**
- **Detour Ratio:** **26.35×**
- **Optimal Walking Network Service:** *Dandekar Pul (Dandekar Bridge)* at **193.3 metres**
- **Physical Barrier Identification:**
  The straight-line trajectory crosses the **Mutha Right Bank Canal** and the canal embankment wall along Sinhagad Road. Because there is no pedestrian footbridge at this coordinate, a pedestrian attempting to reach Anand Math must walk 900m northward to the nearest canal crossing at Dandekar Bridge, cross the bridge, and double back 1,000m southward along the opposite bank, turning an apparent 77m hop into a 2-kilometer trek.
- **Visual Artifact:** [screenshots/q6_worst_case_barrier.png](file:///d:/webgis/geofind-surat/screenshots/q6_worst_case_barrier.png)

---

## 3. Q7 — Population Outside Accessibility Threshold & MAUP

### H3 Hexagonal Grid Configuration
- **Resolution 8:** 618 cells (average cell area ~0.73 km², edge ~461m)
- **Resolution 9:** 4,360 cells (average cell area ~0.10 km², edge ~174m)
- **PostGIS Tables Populated:** `h3_res8_accessibility` and `h3_res9_accessibility` with GiST spatial indexes.

### Empirical Accessibility Comparison

| Metric | Resolution 8 (Coarse, ~0.73 km²) | Resolution 9 (Fine, ~0.10 km²) | Difference / Impact |
|--------|----------------------------------|--------------------------------|---------------------|
| **Total Estimated Population** | 339,157 residents | 351,690 residents | +3.7% resolved in fine cells |
| **Population Outside Walking Network (1.2 km)** | **7,546 (2.22%)** | **2,810 (0.80%)** | Finer resolution isolates exact unserved pockets |
| **Population Outside Straight-Line Buffer (1.2 km)** | **0 (0.00%)** | **2,810 (0.80%)** | Straight-line buffer in coarse cells completely misses unserved residents |
| **Buffer Underestimation Error** | **+2.22% points** | **0.00% points** | Coarse straight-line buffer masks network barriers |

### Aggregation by Municipality (Resolution 9)

| Municipality | Total H3 Cells | Population Proxy | Pop Outside Network (1.2 km) | % Unserved |
|--------------|----------------|------------------|------------------------------|------------|
| **PMC** (Pune) | 2,842 | 232,714 | 2,810 | **1.21%** |
| **PCMC** (Pimpri-Chinchwad) | 1,518 | 118,976 | 0 | **0.00%** |

### Modifiable Areal Unit Problem (MAUP) Explanation
1. **Scale Effect:**
   At Resolution 8 (~73 hectares per cell), broad spatial aggregation averages building footprints over large hexagons. The straight-line distance from the cell centroid to the nearest service is artificially shortened, leading to a false 100% coverage conclusion (0% unserved). When disaggregated to Resolution 9 (~10 hectares), discrete peripheral neighborhoods that lack immediate pedestrian access are correctly detected.
2. **Zone Effect:**
   Aggregating accessibility indicators to municipal boundaries demonstrates that unserved populations are concentrated exclusively along the southern fringe of PMC (foothills of Katraj and Sinhagad), while PCMC's flatter industrial and planned residential layout provides 100% 15-minute coverage.

### Worst-Served Populated Cell
- **H3 Index:** `896088cd2a3ffff`
- **Municipality:** PMC (Southern border, Katraj/Gujarwadi foothills)
- **Coordinates:** `18.43244° N, 73.87946° E`
- **Walking Distance to Nearest Service:** **1,623.2 m (1.62 km)**
- **Straight-Line Distance:** 1,202.4 m
- **Population Proxy:** **2,810 residents** (Building Footprint: $84,305.1\text{ m}^2$)

---

## 4. Q8 — Elderly Walking Scenario (3.6 km/h / 900m Threshold)

### Comparative Coverage Analysis (Resolution 9)

| Demographic Scenario | Walking Speed | 15-min Distance Threshold | Covered Population | Population Coverage % |
|----------------------|---------------|---------------------------|--------------------|-----------------------|
| **Standard Adult** | 4.8 km/h | 1,200 m (1.2 km) | 348,880 residents | **99.20%** |
| **Elderly Citizen** | 3.6 km/h | 900 m (0.9 km) | 345,611 residents | **98.27%** |
| **Coverage Loss** | **-1.2 km/h** | **-300 m** | **3,269 residents** | **0.93% points lost** |

### Most Affected Location
- **H3 Index:** `896088cd2abffff`
- **Municipality:** PMC (Katraj / Ambegaon southern periphery)
- **Coordinates:** `18.43555° N, 73.88006° E`
- **Walking Distance:** **1,169.5 metres**
  - For a healthy adult walking at 4.8 km/h, this takes **14.6 minutes** ($\le 15\text{ min}$, counted as covered).
  - For an elderly resident walking at 3.6 km/h, this takes **19.5 minutes** ($> 15\text{ min}$, excluded from 15-minute access).
- **Vulnerable Population Affected:** **3,269 residents**
- **Visual Artifact:** [screenshots/q8_elderly_accessibility_loss.png](file:///d:/webgis/geofind-surat/screenshots/q8_elderly_accessibility_loss.png)
