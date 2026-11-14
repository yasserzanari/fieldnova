# FrontUI sources used by FieldNova

These working copies are adapted from the exact local component snapshots supplied by the FrontUI skill. The archived files under `/home/yasser/.codex/skills/frontui/components/` remain unchanged.

## Landing page

- `dorpdown-navigation.tsx` uses the saved 21st.dev bookmark `Dorpdown Navigation` (bookmark id 618, list `navbar`). The integration fixes the archived `Props` shape and placeholder `href="#"` links, and turns its full-screen preview wrapper into a semantic navigation region. It retains the Framer Motion hover/dropdown treatment. Landing destinations point to real page anchors.
- `responsive-hero-banner.tsx` uses the supplied `Responsive Hero Banner` source. A `hideNavigation` option allows the required saved dropdown navigation to own the header. Empty partner data hides the partner strip; hero hierarchy, layout and motion remain from the source.
- `liquid-glass-logo-reveal.tsx` uses the supplied glass WebGL reveal. Its only source adapters replace the hardcoded 21st.dev brand and the missing local `cn` import with FieldNova's leaf mark and project utility. The text wordmark remains a real link beside the reveal.
- `../landing/features-8.tsx` is the supplied facts-card composition adapted to FieldNova's six registered routes and product concepts. Sample claims, portrait URLs and lorem copy were removed. Decorative graph paths remain illustrative.
- `../landing/beam-wordmark-footer.tsx` is the supplied footer with FieldNova copy, working section/access links, and no invented social accounts or credits.

## Landing image

`/public/images/landing-fields.png` was generated specifically for FieldNova and is used as the responsive hero background. The six selected UI references in `/ui-concepts/` supply the screenshots and product detail for the scroll story. Their example metrics are disclosed beside those visuals.

## Sign-in page

The sign-in module will use the exact archived `sign-in-page` composition and the Mesh Drift WebGL1 shader supplied in the FrontUI references. The current screen is a route placeholder until that module is delivered.
