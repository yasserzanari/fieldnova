# Assistant FieldNova

The Assistant route pairs a French chat with the shared interactive map. Clicking the map updates the selected coordinate across the application. The map can switch between OpenStreetMap, NASA MODIS true color and NDVI, and NASA SMAP surface and root-zone soil moisture. On narrow screens, an accessible Chat/Carte switcher gives the active panel the available viewport; Chat opens first so the composer is immediately reachable.

Each user request and its reply retain the selected coordinate used for that tool call. Later map changes update the active context for new questions without relabeling earlier answers.

## Live data and limits

- Climate questions read the selected point's NASA POWER monthly temperature, corrected precipitation, and modeled soil-wetness series. The displayed month and grid coordinate travel with the response.
- Rotation questions include per-plan family, legume and documented-root counts, raw differences from the current reference, and any user-declared crop exclusions. These counts are descriptive; they do not predict yield or soil improvement.
- Crop-calendar questions read the local crop sowing/harvest windows and the farm's declared work windows for the selected point, including optional user-entered crop-calendar source links. The Assistant reports only whether the declared month ranges overlap; missing ranges remain unknown, and no dates are converted into recommendations or feasibility checks.
- Rotation and farm-profile answers read the per-point custom crop catalog. Locally declared family and crop traits are included as such and are not presented as independently validated evidence.
- Soil-profile questions read only the locally saved user profile, including any entered depth horizons; missing depth intervals remain unknown. Rotation questions read the locally saved rotation workspace and calculate the same family/repetition/legume counts shown in Scenarios.
- Farm-profile questions read the point-specific local farm profile, declared water access and restrictions, current reference rotation, soil-profile presence, comparison priority, unavailable-crop constraints, and the user's equipment/contractor/unknown declarations for seven operation categories. Those operations are not matched against crop requirements; no rotation-feasibility claim is made.
- Tool traces distinguish the loaded NASA series, a NASA request when required, and local browser data reads, including user-declared unavailable crops that constrain candidate rotations. A map-layer action is shown as an interface step. Errors and missing values stay visible; no example measurement is substituted.
- NASA map layers are coarse regional pixels. They do not outline or diagnose a farm parcel. POWER precipitation is a monthly mean daily rate, not a 7-day total or forecast.
- A local question router chooses among those implemented data tools and map-layer actions. For the hackathon demo, Codex CLI rewrites the grounded tool result as a French chat response and receives up to six recent messages for conversational context. It does not receive file contents. A single UTF-8 soil-analysis CSV up to 1 MB can be parsed locally using the Terrain importer; the chat shows a revocable preview and only saves after explicit confirmation. Saving replaces the horizon list for the captured point, preserves existing general field values and provenance, and archives the sample only when date, method, and a known measurement are present. PDF and image attachments remain unsupported.
- Every tool-backed answer exposes the source links used for its evidence: NASA POWER/GIBS documentation for climate and map responses; FieldNova's local Terrain, Overview, or Scenarios view for user-entered farm data; and the cited DRAAF/INRAE references for rotation traits. Local profiles are identified as declarations, not independent verification.
- Suggested questions for monthly rain, temperature, and soil wetness are shown only when the corresponding value exists in the latest complete NASA POWER record. The NDVI prompt follows the currently selected map layer; local soil, farm, and rotation questions remain available independently.
- The development server calls the locally installed Codex CLI using the existing CLI login. Each request is an ephemeral `codex exec` session, runs from a fresh temporary directory, and uses the read-only sandbox. The Vite middleware does not expose arbitrary commands, paths, or configuration to the browser. This demo connector is available in Vite development mode only.
- FieldNova reads its data before asking Codex to phrase the response. Codex does not execute NASA, soil, rotation, or map tools itself. Questions outside implemented topics receive only the context provided by FieldNova; they do not silently trigger a NASA lookup.
- If Codex CLI is missing, logged out, rate limited, or fails, the local rule-based response remains available and the UI reports that Codex is unavailable.
- Irrigation dose or timing, yield, and crop-health conclusions are not inferred from these regional data.

## Source references

- [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)

`src/components/ai-chat/` contains the FrontUI components used to present tool activity, source links, message actions, and the multimodal prompt.
