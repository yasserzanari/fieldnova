# Application architecture

The React application source lives in `src/`.

- `src/app/App.tsx` owns route composition.
- `src/app/navigation.tsx` is the single route and sidebar navigation registry.
- `src/app/layouts/AppShell.tsx` owns the authenticated sidebar, context bar, and viewport frame.
- Each product tab owns a `src/features/<module>/` entry point and its future local UI, state, styles, and data assumptions.
- Shared tokens and global resets live in `src/styles/`; feature styling stays with its feature.

Current shared shell contracts:

- All authenticated routes render inside `AppShell` and use the same navigation registry.
- In-app pages fit the viewport; long content scrolls within the main page region or a feature-owned panel.
- The public landing and login are outside the authenticated shell.
