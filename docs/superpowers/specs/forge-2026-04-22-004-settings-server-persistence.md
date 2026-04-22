---
Cycle: 4
Date: 2026-04-22
Size: small
---

# Forge Spec: Settings page — server-backed preferences

## What
Wire `SettingsPage` to the existing `/api/preferences` endpoint through the already-defined (but unmounted) `AppConfigContext`. Preferences currently save to `localStorage` only; meanwhile the full server endpoint (`GET /api/preferences`, `PUT /api/preferences`) is wired to the DB with `user_preferences` table, schema validation, and the `AppConfigProvider` context is built — but the provider is never mounted and no page or component uses `useAppConfig()`.

## Why
Three broken chains converging on one dead-end:
1. Preferences set on one device never follow the user to another.
2. The server endpoint is live but receives zero traffic.
3. `AppConfigProvider` has been maintained as dead code.

Wiring them together is the smallest change that unlocks cross-device preference sync, the obvious user expectation.

## Success criteria
1. `<AppConfigProvider>` is mounted inside `AuthenticatedApp` (between `AuthProvider` and the rest).
2. `SettingsPage` reads from and writes through `useAppConfig().updateConfig`; localStorage usage on this page is removed.
3. Naming is reconciled: use `chartAnimations` (plural) consistently; `defaultYear` is a number.
4. Saving a preference triggers `PUT /api/preferences`; reload restores the saved values.
5. Existing tests pass; the build succeeds.

## Approach
- `App.tsx`: wrap `<FilterProvider>` subtree with `<AppConfigProvider>` (must sit inside `AuthProvider` since it reads `useAuth().isAuthenticated`).
- `SettingsPage.tsx`: swap `useLocalStorage('defaultTheme', …)` etc. for `const { config, updateConfig, isLoading } = useAppConfig();`.
- Show a subtle "Bezig met opslaan…" indicator while `updateConfig` is in-flight.

## Not doing
- No changes to the preferences DB schema or server code.
- No UI for `locale`, `sidebarCollapsed`, `colorScheme` (keep defaults).
- No optimistic-update complexity beyond what `AppConfigProvider` already does (local + PUT, revert on error).
- No cross-component wiring — `defaultTheme`/`defaultYear` reading at login is a follow-up cycle.
