# Données & confiance

This route describes the actual integrations used by FieldNova and the data that is still missing. NASA POWER monthly climate and soil-wetness estimates are fetched for the shared selected coordinate; NASA GIBS MODIS and SMAP products are available on the shared interactive map. The POWER detail includes a live chart, grid point, latest usable month, variables, and limitations.

Sentinel-2 and SoilGrids remain catalog references; local station records and farm parcel data require configuration or import. Those sources do not appear as connected or feed displayed metrics. The map has no farm boundary until a parcel geometry is provided.

Source references:

- [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
