# 99 - Wiki Publishing

## Goal

Keep `/.wiki` as the source of truth and automatically publish it to the GitHub Wiki repository.

## Suggested Process

1. Treat `/.wiki` markdown as canonical.
2. Keep `Home.md`, `_Sidebar.md`, and stable page names.
3. Use CI workflow (`.github/workflows/wiki-sync.yml`) to push pages to `<repo>.wiki.git`.

## Sync Expectations

- preserve internal links
- preserve navigation order
- validate no orphan pages after sync
- keep changelog/legal pages available from wiki navigation

## Quality Gate Before Publish

- all links resolve
- TOC references valid files
- Home and Sidebar updated for new pages
- app README links still valid
- root structure guard passes (`.github/workflows/repo-structure-guard.yml`)
