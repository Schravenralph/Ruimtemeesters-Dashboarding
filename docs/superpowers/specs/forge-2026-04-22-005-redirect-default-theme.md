---
Cycle: 5
Date: 2026-04-22
Size: small
---

# Forge Spec: Post-login redirect respects user's default theme

## What
When the user navigates to `/dashboard` (the post-login landing route), `DashboardRedirect` currently always lands them on the Overview theme. Cycle 4 made `config.defaultTheme` a persisted user preference; this cycle connects it: if the user has set a default theme, route them there; otherwise fall back to the existing logic.

## Why
Advisors usually spend their day in one or two themes. Without honoring their default, the "set default theme" preference does nothing visible — a classic orphan setting.

## Success criteria
1. `DashboardRedirect` reads `config.defaultTheme` from `AppConfigContext`.
2. If the slug exists in the loaded theme list, redirect there.
3. Otherwise fall back to the overview theme (or first theme) as before.
4. The redirect waits for both `themes` and the config to finish loading (no premature redirect to the wrong slug).

## Approach
- Add `useAppConfig()` to `DashboardRedirect`.
- Gate the redirect on `!themesLoading && !configLoading`.
- When `config.defaultTheme` is a non-empty string and present in `themes.map(t => t.slug)`, use it; otherwise fall back.

## Not doing
- Not wiring `config.defaultYear` into new presentation creation (separate cycle — more complex timing).
- Not wiring `config.compactNumbers` / `config.chartAnimations` across chart components.
