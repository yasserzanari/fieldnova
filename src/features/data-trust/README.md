# Données & confiance

This route describes the actual integrations used by FieldNova and the data that is still missing. NASA POWER monthly climate and soil-wetness estimates are fetched for the shared selected coordinate; NASA GIBS MODIS and SMAP products are available on the shared interactive map. The POWER detail includes a live chart, grid point, latest usable month, variables, and limitations.

Sentinel-2 and SoilGrids remain catalog references; local station records and farm parcel data require configuration or import. Those sources do not appear as connected or feed displayed metrics. The map has no farm boundary until a parcel geometry is provided.

## Références et méthode

- [NASA POWER monthly point API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) — FieldNova requests `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETTOP` and `GWETROOT` for the selected coordinate and retains closed monthly records only. Meteorological fields are derived from MERRA-2; the API can return a different nearest grid cell than the requested coordinate. The UI now surfaces the response source and retrieval time. NASA's API response does not supply a service version, so the UI states that limitation rather than inventing one.
- The NASA POWER traceability panel reports each requested closed month and counts valid observations per variable; it lists the months with no usable value rather than treating a missing value as zero.
- [NASA POWER citation guide](https://power.larc.nasa.gov/docs/referencing/) — cite the service name, service version when available, and access date.
- [NASA GIBS visualization catalog](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/) — map layers are visualizations served as tiles at their native source resolution. FieldNova uses `MODIS_Terra_CorrectedReflectance_TrueColor`, `MODIS_Terra_NDVI_8Day`, `SMAP_L4_Analyzed_Surface_Soil_Moisture` and `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`. MODIS date is shown on the map; GIBS's current SMAP product date is not read by this app and is labeled as unavailable.
- [NASA NSIDC DAAC SMAP L4 product record](https://nsidc.org/data/spl4smgp) — the referenced dataset is global 3-hourly surface and root-zone soil moisture at 9 km. This explains the product family; it does not mean FieldNova downloads or analyzes the archived granules.
- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright) — attribution is shown on the map when its street-map base is active.

The full, dated source register and its current limitations are in [`ui-concepts/references-and-data-sources.md`](../../../ui-concepts/references-and-data-sources.md).
