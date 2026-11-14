# FieldNova project workflow

- Build the product as small, reviewable modules. Keep shared routing, shell, design tokens, and navigation configuration centralized; keep feature views and behavior in their own feature folders.
- After each completed module, create a focused commit, push it, and merge it into `main` as requested by the project owner. Use a pull request for each module so the segment remains reviewable. Never bundle unrelated or unfinished modules into a merge.
- Keep `docs/` local; it is intentionally ignored. Product references intended for the repository belong under `ui-concepts/` or another tracked asset folder.
- Do not imply demo fixtures are live data. Label sample values in the view where a user could rely on them.
- Keep authenticated workspaces within the viewport and make long content scroll inside its own panel.
