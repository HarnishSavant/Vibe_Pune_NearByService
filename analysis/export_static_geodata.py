import os
import math
import json
import urllib.request
import psycopg2
import geopandas as gpd
from pmtiles.writer import Writer
from pmtiles.reader import zxy_to_tileid, Reader
from pmtiles.tile import TileType, Compression

DB_URL = "postgresql://vibepune_user:root@localhost:5432/vibepune"
conn = psycopg2.connect(DB_URL)
EXPORT_DIR = r"d:\webgis\geofind-surat\frontend\data"
os.makedirs(EXPORT_DIR, exist_ok=True)

print("1. Exporting PostGIS tables to GeoJSON...")

# Services
gdf_services = gpd.read_postgis("SELECT id, osm_id, osm_type, name, name_mr, service_domain, primary_category, municipality, address, phone, geom FROM services", conn, geom_col="geom")
services_path = os.path.join(EXPORT_DIR, "services.geojson")
gdf_services.to_file(services_path, driver="GeoJSON")
print(f"Exported {len(gdf_services)} services to {services_path} ({os.path.getsize(services_path)/1024:.1f} KB)")

# H3 Res 8
gdf_h3_8 = gpd.read_postgis("SELECT h3_index, municipality, straight_dist_m, network_dist_m, covered_straight, covered_network, covered_elderly, building_area_m2, pop_building_proxy, geom FROM h3_res8_accessibility", conn, geom_col="geom")
h3_8_path = os.path.join(EXPORT_DIR, "h3_res8.geojson")
gdf_h3_8.to_file(h3_8_path, driver="GeoJSON")
print(f"Exported {len(gdf_h3_8)} Res 8 cells to {h3_8_path} ({os.path.getsize(h3_8_path)/1024:.1f} KB)")

# H3 Res 9
gdf_h3_9 = gpd.read_postgis("SELECT h3_index, municipality, straight_dist_m, network_dist_m, covered_straight, covered_network, covered_elderly, building_area_m2, pop_building_proxy, geom FROM h3_res9_accessibility", conn, geom_col="geom")
h3_9_path = os.path.join(EXPORT_DIR, "h3_res9.geojson")
gdf_h3_9.to_file(h3_9_path, driver="GeoJSON")
print(f"Exported {len(gdf_h3_9)} Res 9 cells to {h3_9_path} ({os.path.getsize(h3_9_path)/1024:.1f} KB)")

# Buildings
gdf_bld = gpd.read_postgis("SELECT id, osm_id, osm_type, name, building_type, geom FROM buildings", conn, geom_col="geom")
bld_path = os.path.join(EXPORT_DIR, "buildings.geojson")
gdf_bld.to_file(bld_path, driver="GeoJSON")
print(f"Exported {len(gdf_bld)} buildings to {bld_path} ({os.path.getsize(bld_path)/1024:.1f} KB)")

conn.close()

print("\n2. Packaging MVT tiles into static PMTiles archive (vibepune.pmtiles)...")

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

# Pune extent: 73.70 to 74.00 Lon, 18.40 to 18.65 Lat
pmtiles_path = os.path.join(EXPORT_DIR, "vibepune.pmtiles")
with open(pmtiles_path, "wb") as f:
    writer = Writer(f)
    tile_count = 0
    
    # Collect tiles in ascending tileid order as required by PMTiles specification
    tiles_to_write = []
    
    for z in range(10, 15):
        min_x, max_y = deg2num(18.40, 73.70, z)
        max_x, min_y = deg2num(18.65, 74.00, z)
        
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                tid = zxy_to_tileid(z, x, y)
                url = f"http://localhost:7800/public.h3_res8_accessibility/{z}/{x}/{y}.pbf"
                try:
                    req = urllib.request.urlopen(url, timeout=2)
                    data = req.read()
                    if len(data) > 0:
                        tiles_to_write.append((tid, data))
                except Exception:
                    pass
    
    # Sort strictly by tileid
    tiles_to_write.sort(key=lambda item: item[0])
    for tid, data in tiles_to_write:
        writer.write_tile(tid, data)
        tile_count += 1
        
    header = {
        'tile_type': TileType.MVT,
        'tile_compression': Compression.NONE,
        'min_zoom': 10,
        'max_zoom': 14,
        'min_lon_e7': int(73.70 * 1e7),
        'min_lat_e7': int(18.40 * 1e7),
        'max_lon_e7': int(74.00 * 1e7),
        'max_lat_e7': int(18.65 * 1e7),
        'center_zoom': 12,
        'center_lon_e7': int(73.8567 * 1e7),
        'center_lat_e7': int(18.5204 * 1e7)
    }
    metadata = {
        'name': 'vibepune_accessibility',
        'description': 'Static PMTiles archive of Pune accessibility hexagons & services',
        'attribution': 'VibePune WebGIS & OpenStreetMap',
        'vector_layers': [
            {'id': 'public.h3_res8_accessibility', 'description': 'H3 Res 8 Hexagons'}
        ]
    }
    writer.finalize(header, metadata)

print(f"Generated PMTiles archive: {pmtiles_path} ({os.path.getsize(pmtiles_path)/1024:.1f} KB, {tile_count} tiles)")
