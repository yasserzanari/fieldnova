# Assistant FieldNova

The Assistant route pairs a French chat with the shared interactive map. Clicking the map updates the selected coordinate across the application. The map can switch between OpenStreetMap, NASA MODIS true color and NDVI, and NASA SMAP surface and root-zone soil moisture.

## Live data and limits

- Climate questions read the selected point's NASA POWER monthly temperature, corrected precipitation, and modeled soil-wetness series. The displayed month and grid coordinate travel with the response.
- Soil-profile questions read only the locally saved user profile. Rotation questions read the locally saved rotation workspace and calculate the same family/repetition/legume counts shown in Scenarios.
- Tool traces distinguish the loaded NASA series, a NASA request when required, and local browser data reads. A map-layer action is shown as an interface step. Errors and missing values stay visible; no example measurement is substituted.
- NASA map layers are coarse regional pixels. They do not outline or diagnose a farm parcel. POWER precipitation is a monthly mean daily rate, not a 7-day total or forecast.
- A local question router chooses among those implemented data tools and map-layer actions. No LLM service is connected, and attached file contents are not parsed; the UI says this before upload.
- Irrigation dose or timing, yield, and crop-health conclusions are not inferred from these regional data.

## Source references

- [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)

`src/components/ai-chat/` contains the FrontUI components used to present tool activity, source links, message actions, and the multimodal prompt.
