import math
import time
import urllib.request
import json

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def tile_to_3857_bbox(x, y, z):
    # Web Mercator bounds for tile
    origin_shift = 20037508.342789244
    initial_resolution = 2 * origin_shift / 256.0
    res = initial_resolution / (2 ** z)
    minx = x * 256 * res - origin_shift
    maxx = (x + 1) * 256 * res - origin_shift
    maxy = origin_shift - y * 256 * res
    miny = origin_shift - (y + 1) * 256 * res
    return f"{minx:.4f},{miny:.4f},{maxx:.4f},{maxy:.4f}"

center_lat, center_lon = 18.5204, 73.8567

results = {}

print("=================================================================")
print("BENCHMARKING Q9: Buildings (WMS vs WFS vs MVT) at Zoom 12, 14, 16")
print("=================================================================")

for zoom in [12, 14, 16]:
    xc, yc = deg2num(center_lat, center_lon, zoom)
    # 4 columns x 3 rows = 12 tiles (standard 1024x768 viewport)
    tiles = [(xc + dx, yc + dy) for dx in [-1, 0, 1, 2] for dy in [-1, 0, 1]]
    
    print(f"\n--- ZOOM {zoom} (Center tile {xc}, {yc}; 12 viewport tiles) ---")
    
    # 1. WMS PNG (Tiled 256x256 requests)
    wms_bytes = 0
    wms_reqs = len(tiles)
    t0 = time.perf_counter()
    for x, y in tiles:
        bbox_3857 = tile_to_3857_bbox(x, y, zoom)
        url = f"http://localhost:8085/geoserver/vibepune/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=vibepune:buildings&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox_3857}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Benchmark/1.0'})
        with urllib.request.urlopen(req) as r:
            wms_bytes += len(r.read())
    t_wms = (time.perf_counter() - t0) * 1000 # ms
    print(f"1. Tiled WMS PNG:       {wms_reqs} requests, {wms_bytes/1024:.2f} KB, {t_wms:.1f} ms")
    
    # 2. WFS GeoJSON (1 single request for all buildings)
    t0 = time.perf_counter()
    wfs_url = "http://localhost:8085/geoserver/vibepune/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=vibepune:buildings&outputFormat=application/json"
    req = urllib.request.Request(wfs_url, headers={'User-Agent': 'Benchmark/1.0'})
    with urllib.request.urlopen(req) as r:
        wfs_data = r.read()
        wfs_bytes = len(wfs_data)
    t_wfs = (time.perf_counter() - t0) * 1000 # ms
    print(f"2. Single WFS GeoJSON:  1 request,  {wfs_bytes/1024:.2f} KB, {t_wfs:.1f} ms")
    
    # 3. MVT (pg_tileserv vector tiles)
    mvt_bytes = 0
    mvt_reqs = len(tiles)
    t0 = time.perf_counter()
    for x, y in tiles:
        url = f"http://localhost:7800/public.buildings/{zoom}/{x}/{y}.pbf"
        req = urllib.request.Request(url, headers={'User-Agent': 'Benchmark/1.0'})
        with urllib.request.urlopen(req) as r:
            mvt_bytes += len(r.read())
    t_mvt = (time.perf_counter() - t0) * 1000 # ms
    print(f"3. pg_tileserv MVT:     {mvt_reqs} requests, {mvt_bytes/1024:.2f} KB, {t_mvt:.1f} ms")

    results[zoom] = {
        'wms': {'reqs': wms_reqs, 'kb': round(wms_bytes/1024, 2), 'ms': round(t_wms, 1)},
        'wfs': {'reqs': 1, 'kb': round(wfs_bytes/1024, 2), 'ms': round(t_wfs, 1)},
        'mvt': {'reqs': mvt_reqs, 'kb': round(mvt_bytes/1024, 2), 'ms': round(t_mvt, 1)},
    }

with open(r'd:\webgis\geofind-surat\scratch\q9_benchmark_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\nBenchmark completed and saved to scratch/q9_benchmark_results.json")
