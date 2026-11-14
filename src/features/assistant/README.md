# Assistant FieldNova

The Assistant route pairs a French chat with the shared interactive map. Clicking the map updates the selected coordinate across the application. The map can switch between OpenStreetMap, NASA MODIS true color and NDVI, and NASA SMAP surface and root-zone soil moisture.

## Live data and limits

- Climate questions read the selected point's NASA POWER monthly temperature, corrected precipitation, and modeled soil-wetness series. The displayed month and grid coordinate travel with the response.
- Soil-profile questions read only the locally saved user profile, including any entered depth horizons; missing depth intervals remain unknown. Rotation questions read the locally saved rotation workspace and calculate the same family/repetition/legume counts shown in Scenarios.
- Tool traces distinguish the loaded NASA series, a NASA request when required, and local browser data reads, including user-declared unavailable crops that constrain candidate rotations. A map-layer action is shown as an interface step. Errors and missing values stay visible; no example measurement is substituted.
- NASA map layers are coarse regional pixels. They do not outline or diagnose a farm parcel. POWER precipitation is a monthly mean daily rate, not a 7-day total or forecast.
- A local question router chooses among those implemented data tools and map-layer actions. For the hackathon demo, Codex CLI rewrites the grounded tool result as a French chat response and receives up to six recent messages for conversational context. It does not receive file contents; attachments are not parsed.
- The development server calls the locally installed Codex CLI using the existing CLI login. Each request is an ephemeral `codex exec` session, runs from a fresh temporary directory, and uses the read-only sandbox. The Vite middleware does not expose arbitrary commands, paths, or configuration to the browser. This demo connector is available in Vite development mode only.
- FieldNova reads its data before asking Codex to phrase the response. Codex does not execute NASA, soil, rotation, or map tools itself. Questions outside implemented topics receive only the context provided by FieldNova; they do not silently trigger a NASA lookup.
- If Codex CLI is missing, logged out, rate limited, or fails, the local rule-based response remains available and the UI reports that Codex is unavailable.
- Irrigation dose or timing, yield, and crop-health conclusions are not inferred from these regional data.

## Source references

- [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)

`src/components/ai-chat/` contains the FrontUI components used to present tool activity, source links, message actions, and the multimodal prompt.
