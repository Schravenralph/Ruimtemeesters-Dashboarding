# Ruimtemeesters Dashboard

**Prebuilt theme dashboards for Dutch governments — per municipality, in context.**

A new project is created by picking a theme (Wonen, Duurzaamheid, Economie, Mobiliteit, Veiligheid). The platform auto-subscribes the org to the theme's CBS data sources, clones the theme's prebuilt dashboards into the project, and lands the user on the per-municipality drilldown view — with a referential cohort (similar municipalities) plus provincial and national reference series visible by default. Customisation remains available as a backstop for power users; it is no longer the front door.

See [`docs/PRODUCT-VISION.md`](docs/PRODUCT-VISION.md) and ADRs [002](docs/adr/ADR-002-prebuilt-themes-as-front-door.md), [003](docs/adr/ADR-003-municipality-drilldown-with-referential-cohort.md), [004](docs/adr/ADR-004-theme-as-template-on-project-bootstrap.md) for the strategic direction.

## Features

### Prebuilt theme dashboards
- **Per-supercategory navigation** — Wonen (Overzicht, Bevolking, Huishoudens, Woningen, Woningtekort) and Duurzaamheid (Energie, Emissies, Hernieuwbaar, Afval); Economie / Mobiliteit / Veiligheid follow.
- **Per-municipality drilldown as the canonical view** — every theme has a focal-gemeente landing dashboard.
- **Referential cohort + provincial + national reference series** rendered by default on every applicable chart (cohort definitions: CBS stedelijkheidsklasse, population-size bin, ABF Woningmarktregio / Krimp- en anticipeerregio).
- **7 chart types** — Bar, Stacked Bar, Line, Pie, Radar/Spider, Table, Choropleth Map.
- **Geographic filtering** — Land, Provincie, Gemeente with hierarchy browser and search.
- **Period selection** — Year selection with comparison mode (year-over-year).
- **Dimension drilldown** — Explore data by age group, gender, household type, etc.
- **Comparison view** — Side-by-side year comparison with change indicators.
- **Statistics summary** — Overview cards with key metrics.
- **Saved filter presets** — Bookmark and reuse filter configurations.
- **Export** — CSV, PDF, Excel, PNG per tile or bulk PDF.

### Projects (theme-as-template)
- Each org runs one or more projects (e.g. *"Woonzorgvisie 2030"*, *"Klimaatadaptatie"*).
- Creating a project = picking a theme; the org is auto-subscribed to the theme's data sources, dashboards are cloned from the theme template, and the user lands on the focal-gemeente drilldown.
- Existing system theme improvements are pulled into a project explicitly via "Update from theme" — projects do not silently mutate.

### Customisation (backstop)
- **Mijn Dashboards** — up to 5 personal dashboards per user, tile picker, drag-and-drop layout, per-user persistence, share via URL (30-day expiry). Maintained, not headlined.

### Access Control
- **RBAC** — Admin, Editor, Viewer, Guest roles
- **ABAC** — Attribute-based policies with configurable conditions
- Policy engine evaluates user attributes, roles, and resource patterns
- Full policy management UI in admin panel

### Admin Panel
- **Access Policies** — Create, edit, delete ABAC policies with condition builder
- **User Management** — Role editing, password reset, user deletion
- **Theme Manager** — View and manage dashboard themes and tiles
- **Data Sources** — View table statistics, row counts, periods
- **Data Import** — CSV upload with validation and upsert
- **Audit Log** — Track all user actions with pagination

### Additional Features
- In-app notification system
- Keyboard shortcuts (Alt+1-5 for themes)
- Print-friendly styles
- Multi-language foundation (NL/EN)
- API documentation at `/api/docs`
- Rate limiting and request logging

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Lucide Icons
- **Backend**: Express 5, TypeScript, PostgreSQL, Zod validation
- **Auth**: JWT with bcrypt password hashing
- **Testing**: Vitest, Testing Library

## Quick Start

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Run migrations
pnpm run migrate

# Seed demo data
pnpm run seed

# Start development servers
pnpm run dev
```

Client runs on http://localhost:3000, API on http://localhost:5002.

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@ruimtemeesters.nl | admin12345 | Admin |
| editor@ruimtemeesters.nl | admin12345 | Editor |
| viewer@amsterdam.nl | viewer12345 | Viewer |
| guest@example.com | viewer12345 | Guest |

## API Endpoints

See `/api/docs` for the full API documentation. Key endpoints:

- `POST /api/auth/login` — Authenticate
- `GET /api/themes` — List dashboard themes
- `GET /api/data/query` — Query data with filters
- `GET /api/geo` — List geographic areas
- `GET /api/export?format=csv&source=bevolking` — Export data
- `POST /api/import` — Import data (admin/editor)

## Project Structure

```
src/
  client/               # React frontend
    components/
      charts/           # Bar, Line, Pie, Radar, Table, Choropleth, StackedArea
      dashboard/        # Tiles, Grid, Drilldown, Comparison, Stats, Config
      filters/          # FilterBar, GeoHierarchy, SavedFilters
      admin/            # UserManagement, PolicyEditor, DataSourceManager, AuditLog
      ui/               # Button, Card, Modal, Toast, Sidebar, Header, etc.
    contexts/           # AuthContext, FilterContext, ThemeContext
    hooks/              # useDataQuery, useDebounce, useLocalStorage, useUrlState
    pages/              # Dashboard, Login, Admin, CustomDashboards, Shared
    services/api/       # API client, auth, themes, data, geo, dashboards
    utils/              # export, format, i18n
  server/               # Express backend
    auth/               # JWT token management
    config/             # CORS, security configuration
    controllers/        # Auth, Dashboard, Data, Geo, Export, Import, etc.
    db/                 # Pool, migrations, seeds
    middleware/          # Auth, ABAC, rate-limit, logging, validation
    routes/             # All API route definitions
    services/           # Audit logging
  shared/               # Shared types
    api/contracts.ts    # Zod schemas for all API types
```

## License

UNLICENSED — Ruimtemeesters proprietary software.
