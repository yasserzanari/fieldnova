# Assistant FieldNova

The Assistant route pairs a French chat with the shared interactive map. Clicking the map updates the selected coordinate across the application. The map can switch between OpenStreetMap, NASA MODIS true color and NDVI, and NASA SMAP surface and root-zone soil moisture.

## Live data and limits

- Chat responses use the selected point's NASA POWER monthly temperature, corrected precipitation, and modeled soil-wetness series. The displayed month and grid coordinate travel with the response.
- Tool traces represent the NASA POWER request and the actual map layer change. Request errors and missing values stay visible; no example measurement is substituted.
- NASA map layers are coarse regional pixels. They do not outline or diagnose a farm parcel. POWER precipitation is a monthly mean daily rate, not a 7-day total or forecast.
- The local question router selects the relevant live values and layer. No LLM service is connected, and attached file contents are not parsed.
- Irrigation dose or timing, yield, and crop-health conclusions are not inferred from these regional data.

## Source references

- [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)

`src/components/ai-chat/` contains the FrontUI components used to present tool activity, source links, message actions, and the multimodal prompt.
