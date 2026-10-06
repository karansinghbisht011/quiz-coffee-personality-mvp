"""Pull Overture Maps places (food and drink) within 100 km of Bengaluru centre into data/raw/overture_raw.csv."""
import duckdb

LAT, LON, R_KM = 12.9716, 77.5946, 100
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
rows = con.execute(f"""
COPY (
  SELECT id, names.primary AS name, taxonomy.primary AS category, basic_category, confidence,
         websites[1] AS website, socials[1] AS social, phones[1] AS phone,
         brand.names.primary AS brand,
         addresses[1].freeform AS address, addresses[1].locality AS locality,
         bbox.xmin AS lon, bbox.ymin AS lat
  FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN {LON-1.0} AND {LON+1.0}
    AND bbox.ymin BETWEEN {LAT-0.95} AND {LAT+0.95}
    AND (list_contains(taxonomy.hierarchy, 'food_and_drink')
         OR basic_category IN ('cafe', 'restaurant', 'bar', 'bakery', 'fast_food_restaurant', 'coffee_shop', 'pub', 'brewery'))
) TO 'data/raw/overture_raw.csv' (HEADER, DELIMITER ',')
""").fetchall()
print(rows)
