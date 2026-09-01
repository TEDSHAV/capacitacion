# Project Preferences & Offline Architecture

## Git commits

- NEVER add `Co-Authored-By:` trailers to commit messages.
- NEVER add "Generated with [Devin](https://devin.ai)" or any AI/tool attribution to commit messages.
- Keep commit messages to the message itself, matching the surrounding repo style.

## PWA Navigation System

This app includes a comprehensive standalone PWA navigation system with **strict portal/dashboard isolation** for offline-first use.

### Overview

The navigation system provides:
1. **Collapsible Navigation Drawer** — Hamburger menu on mobile, toggleable sidebar on desktop
2. **Context-Aware Top Nav** — Logo, title, offline indicator, user menu
3. **Breadcrumbs** — Auto-generated from URL path
4. **Real-Time Badge Counts** — Pending items for each role
5. **Strict Context Isolation** — Portal facilitador/cliente/dashboard never mix

### Key Components

#### Navigation Config (`lib/navigation/navigation-config.ts`)
- **Strictly isolated menus** for each context (portal-facilitador, portal-cliente, dashboard)
- Each context only links to its own routes
- No cross-context navigation possible
- Context-specific branding (colors, names)

#### Navigation Components
- **PWATopNav** (`components/PWATopNav.tsx`) — Top bar with logo, title, user menu, logout
- **PWANavDrawer** (`components/PWANavDrawer.tsx`) — Collapsible drawer with context-aware menu
- **PWABreadcrumb** (`components/PWABreadcrumb.tsx`) — Auto-generated breadcrumb trail
- **PWALayout** (`components/PWALayout.tsx`) — Main layout combining all above

#### Hooks & Utilities
- **useNavigationContext** (`lib/navigation/use-navigation-context.ts`) — Detect current context from URL
- **useBadgeCounts** (`lib/navigation/use-badge-counts.ts`) — Real-time badge counts (pending items)
- **generateBreadcrumbs** (`lib/navigation/breadcrumb-utils.ts`) — Generate breadcrumb items from pathname
- **cacheNavigationConfig** (`lib/offline/cache-navigation.ts`) — Cache navigation for offline use

### Context Isolation Rules (CRITICAL)

**Portal: Facilitador** (`/portal/facilitador/*`)
- Menu only shows facilitador options
- All links go to `/portal/facilitador/*`
- No access to `/portal/cliente` or `/dashboard`

**Portal: Cliente** (`/portal/cliente/*`)
- Menu only shows cliente options
- All links go to `/portal/cliente/*`
- No access to `/portal/facilitador` or `/dashboard`

**Dashboard** (`/dashboard/*`)
- Menu only shows admin options
- All links go to `/dashboard/*`
- No access to `/portal/*`

**Logout** — Clears session completely, prevents context mixing

### Navigation Structure

#### Portal: Facilitador Menu
- Dashboard
- Mis Servicios (OSIs) — with badge for pending
- Mis Certificados
- Perfil
- Ayuda

#### Portal: Cliente Menu
- Dashboard
- Mis Servicios
- Mis Certificados
- Encuestas Pendientes — with badge for new surveys
- Perfil
- Ayuda

#### Dashboard: Admin Menu
- Home
- Planificación y Ejecución
  - Seguimiento de Servicios
  - Gestión OSIs
- Reportes
  - KPI
  - Indicadores
- Certificados
  - Generación (online-only)
  - Gestión
- Cursos
  - Gestión
  - Plantillas
- Facilitadores
  - Gestión
  - Firmas
- Configuración

### Styling & Colors

- **Portal Facilitador**: Blue (#0c3f69)
- **Portal Cliente**: Green (#059669)
- **Dashboard**: Purple (#7c3aed)
- **Mobile**: Hamburger menu → full-screen drawer overlay
- **Desktop**: Collapsible sidebar (200-250px when open, 60px when closed)

### PWA Enhancements

#### Global Search (`lib/navigation/use-global-search.ts`, `components/PWAGlobalSearch.tsx`)
- Search across all navigation items
- Breadcrumb-aware results
- Keyboard shortcut: Ctrl+K
- Modal interface with ESC to close
- Real-time filtering

#### Favorites/Bookmarks (`lib/navigation/use-favorites.ts`)
- Star/pin frequently used pages
- Persisted to localStorage
- Quick access from drawer
- Add/remove with single click

#### Recent Pages (`lib/navigation/use-recent-pages.ts`)
- Automatically tracks last 5 visited pages
- Persisted to localStorage
- Quick access from drawer
- Relative timestamps

#### Keyboard Shortcuts (`lib/navigation/use-keyboard-shortcuts.ts`)
- **Ctrl+K**: Global search
- **Alt+N**: Toggle navigation menu
- **ESC**: Close search/modals
- Extensible for future shortcuts

#### Toast Notifications (`lib/ui/toast-context.tsx`, `components/PWAToastContainer.tsx`)
- Success, error, warning, info types
- Auto-dismiss after 3 seconds
- Manual dismiss button
- Integrated with sync events
- Bottom-right corner positioning

#### Real-Time Badge Counts
- Infrastructure ready for pending items
- Polling every 30 seconds
- Extensible for server action integration
- Shows pending OSIs, certificates, surveys

## Offline-First Architecture

This app uses a comprehensive offline-first approach to ensure users can continue working during temporary internet outages.

### Overview

The offline architecture is built on three layers:

1. **Service Worker (Serwist)** — Caches page HTML and assets for offline navigation
2. **IndexedDB (Dexie)** — Stores read-only data and queues write operations
3. **Sync Queue** — Automatically replays queued operations when connectivity returns

### Key Components

#### Service Worker (`app/sw.ts`)
- **Portal pages**: NetworkFirst caching for `/portal/facilitador/*` and `/portal/cliente/*`
- **Dashboard pages**: NetworkFirst caching for `/dashboard/*`
- **Public pages**: NetworkFirst caching for `/survey/*` and `/verify-certificate/*`
- **Documents**: NetworkFirst caching for PDFs and ZIPs (explicitly cached via offline-documents utility)
- **Fallbacks**: Routes to `/dashboard/capacitacion`, `/portal/*/dashboard`, or `/~offline` when pages aren't cached

All responses are validated: only `status 200` and `!response.redirected` are cached to prevent caching auth redirects.

#### Dexie Database (`lib/offline/db.ts`)
- **syncOps**: Queue of pending write operations (participants, attachments, surveys, toggles, scores)
- **blobs**: Binary data for attachments
- **portalData**: Cached read-only data (batches, certificates, OSIs, facilitadores, dashboard data)
- **clientSession**: User session info for offline login hints

#### Sync Queue (`lib/offline/sync-queue.ts`)
- `enqueueOp(type, groupKey, payload, blob?)` — Enqueue an operation with last-write-wins deduplication
- `flushQueue()` — Replay all pending operations to their API routes
- `initSyncQueue()` — Wire up automatic flushing on `online` event and tab visibility change
- Exponential backoff retry (max 5 attempts, 2s base backoff)

#### Offline Helpers (`lib/offline/`)
- **use-offline-data.ts**: `fetchWithOfflineFallback(key, type, fetcher)` — Wraps a fetch call with automatic caching and fallback
- **use-online-status.ts**: `useOnlineStatus()` — Hook to track navigator.onLine state
- **use-cached-data.ts**: `useCachedData(key, type, fetcher, deps)` — Higher-level hook for data loading with offline support
- **portal-data-cache.ts**: `cachePortalData()`, `getCachedPortalData()` — Dexie read/write helpers
- **offline-documents.ts**: Cache API for PDFs/ZIPs with localStorage metadata index

#### UI Components
- **CachedDataBanner** (`components/CachedDataBanner.tsx`) — Shows "Sin conexión — mostrando datos guardados" with relative age
- **OfflineIndicator** (`components/OfflineIndicator.tsx`) — Online/offline status badge + cached documents list (mounted in portal layouts)
- **SyncBadge** (`components/SyncBadge.tsx`) — Sync status indicator + pending operations count (mounted in portal and dashboard layouts)

### What's Cached

#### Read-Only Data (Automatic)
- Portal pages (cliente dashboard, facilitador dashboard, OSI form)
- Dashboard pages (gestion-osi, gestion-certificados, gestion-cursos, etc.)
- Public pages (survey forms, certificate verification)
- Filter options (companies, courses, facilitators, states)
- Certificate/OSI/batch lists with pagination

#### Write Operations (Queued)
- **Survey submissions** (`submitSurvey`) — Queued with unique groupKey per submission (includes timestamp)
- **Seguimiento step toggles** (`toggleUnifiedStep`) — Queued as desired-state payloads (deduped by stable groupKey)
- **Attachment received toggles** (`toggleAttachmentReceived`) — Queued as desired-state payloads
- **Certificate score edits** (`updateCertificateScore`) — Queued as set operations (idempotent)
- **Participant saves** (existing) — Already queued in facilitador portal
- **Attachment uploads** (existing) — Already queued in facilitador portal

#### Not Cached (Online-Only)
- Certificate generation (control numbers, PDF generation require server-side logic)
- Course/facilitator/signature CRUD (admin-only, low offline value)
- Batch edits (complex, risky)
- OSI facilitator assignment (sequence-dependent)

### Testing Offline Behavior

#### Prod Build (Required)
Service workers only work in production builds. Use:
```bash
npm run build
npm run start
```

#### Testing Steps
1. **Visit a page online** (e.g., `/dashboard/capacitacion/gestion-certificados`)
2. **Open DevTools** → Network tab
3. **Check "Offline"** checkbox
4. **Reload the page** — should render with cached data + amber banner
5. **Interact with filters/pagination** — cached data or graceful empty state
6. **Go back online** → banner disappears, fresh data loads
7. **For surveys**: fill form offline → submit → "Encuesta guardada — se enviará automáticamente..."
8. **Go online** → survey syncs automatically (check IndexedDB → syncOps table)

#### Regression Checklist
- [ ] Portal offline: cliente dashboard, facilitador dashboard, OSI form all render with cached data
- [ ] Dashboard offline: gestion-osi, gestion-certificados, gestion-cursos render with cached data
- [ ] Survey offline: submit → queued, goes online → syncs automatically
- [ ] Online behavior: no banners, no extra spinners, identical to pre-offline version
- [ ] Auth: logged-out user online → redirects to shell login (proves we're not serving cached pages to unauthenticated users)

### Cache Keys Naming Convention

All cache keys follow the pattern: `{module}_{entity}_{filters/page}` for easy debugging.

Examples:
- `dash_osis_{"filters":{...}}_p1_n20_tabautomatic` — OSI list, page 1, 20 items per page, automatic tab
- `dash_certs_{"filters":{...}}_p1_n10` — Certificate list, page 1, 10 items per page
- `dash_cursos` — Courses list
- `dash_osi_filters` — OSI filter options
- `survey_osi_data` — Survey OSI metadata

### Offline Limitations

- **No real-time sync**: Changes made offline are queued and synced when online; no conflict resolution beyond last-write-wins
- **No offline generation**: Certificate PDFs, control numbers, and batch ZIPs require server-side processing
- **No offline login**: Dashboard requires an active session cookie; offline access only works if the user logged in before
- **Stale data**: Cached data is served as-is; no automatic refresh on page load (user can manually refresh to get fresh data if online)

### Future Enhancements

- Pre-cache surveys never visited (currently only visited surveys are cached)
- Implement PowerSync for true local-first with bi-directional sync (if multi-device offline editing becomes critical)
- Add conflict resolution UI for last-write-wins scenarios
- Implement cache expiration policies (currently 30-day max age for old entries)

---

## Indicadores de Capacitación

The `/dashboard/capacitacion/indicadores` page has three views organized as
tabs (Gestión Mensual | Certificados 72h | Horas por Facilitador). The active
tab persists in the URL (`?tab=gestion|72h|facilitadores`). All three data
sources are fetched in parallel regardless of active tab, so switching is
instant. The shared `FilterBar.tsx` drives all views; the month selector and
"Solo incumplimientos" toggle are hidden on the facilitadores tab (that view
is year-scoped only).

### View 1 — Gestión Mensual OSIs (managerial monthly flow)

Server action: `getIndicadoresGestionMensual` in `app/actions/indicadores-gestion.ts`.

For each month of the selected year, computes:
- **OSIs recibidas** — count of OSIs whose earliest `osi_sesion.fecha` falls in that month
- **Ejecutadas en su mes** — OSIs whose every session has `fecha_ejecutada` (planned month = month of earliest session)
- **Pendientes del mes** — received but not yet fully executed
- **Participantes planificados** — SUM(`participantes_ejecucion ?? participantes_max_solped`) over OSIs **executed** in this month (attributed to execution month, not planned month, so it aligns with asistidos)
- **Participantes asistidos** — raw count of certificates issued for OSIs **executed** in this month (NOT distinct participants — just total certificates). Attributed to the OSI's execution month so it can be compared directly against planificados. Sourced from `certificados` by `nro_osi`. Pending OSIs (no execution date) don't contribute to either participant row.
- **Certificados emitidos** — raw count of certificates by their `fecha_emision` month (issuance month). Differs from "Participantes asistidos" because the latter follows the OSI's execution month while this follows the certificate's own issuance date.
- **PVC (carnets) emitidos** — count of active carnets by `fecha_emision` month
- **OSIs en riesgo** — received > 30 days ago with at least one pending session

Per-OSI "planned month" = month of the earliest `osi_sesion.fecha`. An OSI is
"ejecutada" when all its sessions have `fecha_ejecutada`. Note: `fecha_ejecutada`
is written from the *planned* date by the seguimiento sync, so UI-toggled items
may appear executed-on-time even when the real execution slipped.

Components: `GestionMensualTable.tsx` (12-row monthly matrix with
per-month breakdown) + `CarryPanel.tsx` (collapsible panel below the
matrix listing the three carry-over populations for the selected month:
arrastradas, pasaran, rezagadas). KPI cards were removed — the matrix
table already shows all the same data per month.

### Carry-over panel

The action also returns `osisList: OsiCarryRow[]` — one entry per OSI planned
in the selected year, with its planned month, execution month, pending/vencida
flags, and days overdue. The client-side `CarryPanel.tsx` groups these into
three populations for the selected month without a second server fetch:
- **Arrastradas de meses anteriores** — planned before the selected month, still pending
- **Pasarán al próximo mes** — planned for the selected month, still pending
- **Rezagadas ejecutadas este mes** — planned earlier, executed during this month

Each row links to `/dashboard/capacitacion/gestion-osi?id={osiId}`.

### View 2 — Certificados 72 horas (issuance latency)

Server action: `getIndicadoresCertificados72h` in `app/actions/indicadores-certificados.ts`.

Measures whether certificate issuance (`certificados.created_at`, with
`fecha_emision` fallback) happens within 3 business days (inclusive) of the last
session execution date. Business days exclude weekends and Venezuelan holidays
(`cat_feriados_venezuela` table, via `lib/business-days.ts`).

Trimmed from the previous SLA dashboard to only show:
- Compliance percentage gauge (`ComplianceGauge.tsx`) with compact stats
- Detail table (`IndicadoresTable.tsx`) of every certificate issued in the
  selected month (scoped via `fechaFrom`/`fechaTo` derived from `selectedMes`)

The `PLAZO_BUSINESS_DAYS` constant (= 3) lives in `indicadores-certificados.ts`.
The `slaDeadline` helper in `lib/business-days.ts` is still named as-is (callers
unchanged) but doc comments refer to "plazo" rather than "SLA".

### View 3 — Horas y honorarios por facilitador (instructor hours & pay)

Server action: `getIndicadoresFacilitadores` in
`app/actions/indicadores-facilitadores.ts`.

Builds a per-facilitador monthly matrix of instructor hours for the selected
year. One row per facilitador, 12 month columns (Ene–Dic), and three year-total
columns: NRO TOTAL DE CURSOS (count of OSIs taught), NRO TOTAL DE HORAS
(sum of instructor hours), and MONTO TOTAL EN $ (sum of honorarios).

**Two-tier hours source:**
1. **Requisición (primary):** `requisiciones.osi_fixed_items[].honorarios_horas`
   on rows with `deleted_at IS NULL`, a non-null `cod_facilitador`, and no
   rejected status (`estatus_admin`, `coordinador_estatus`, `lider_estatus`
   all ≠ "rechazada"). Pendiente requisiciones count.
2. **OSI fallback:** when no requisición covers a facilitador+OSI pair, the
   OSI's `horas_honorarios_instructor` is split evenly across its sessions
   (`osi_sesion`), and each session's share is credited to the facilitadores
   assigned to that session (session-specific assignments win; general
   assignments split evenly among assignees). A facilitador with a
   requisición for an OSI is skipped in the fallback for that OSI — the
   requisición wins by design.

**Monto = rate × hours first:**
- Requisición: `honorarios_costo_hora × honorarios_horas`, falling back to
  `honorarios_total` when the rate is missing/zero.
- OSI fallback: `tarifa_hora_honorarios × hoursShare`, falling back to
  `costo_honorarios_instructor / sessionCount / assigneeCount`.

**Month attribution:** the `osi_sesion.fecha` of `requisiciones.id_sesion`
when it matches the item's OSI; otherwise the session's `fecha`, else the
OSI's `fecha_inicio_real`.

**Cursos (totalCursos):** count of distinct OSIs taught in the year —
requisición-covered + fallback-covered. Each OSI counts once per facilitador.
`cursosEstimados` is the subset credited via the OSI fallback (data-quality
signal shown as an amber "{n} según OSI" badge).

**Roster:** facilitadores with credited hours, UNIONED with facilitadores
assigned (via `facilitador_osi_assignments`) to in-scope OSIs. The latter
appear with zero hours.

**Scope:** capacitacion OSIs (excluding provisional `PEN-` numbers), same as
the gestion view. Empresa/estado filters apply to the OSI scope.

> **Divergence from the reportes tab:** the reportes facilitadores tab
> (`getFacilitadoresReport`) uses requisición-only hours (procesada, no
> fallback) — a stricter rule. The indicadores tab intentionally widens to
> pendiente + OSI fallback so the matrix reflects all assigned activity,
> not just what Administración has processed.

Data sources:
- `v_osi_formato_completo` (id_osi, fecha_inicio_real, horas_honorarios_instructor,
  tarifa_hora_honorarios, costo_honorarios_instructor — scope + fallback + attribution)
- `requisiciones` (id, cod_facilitador, id_osi, id_sesion, estatus_admin,
  coordinador_estatus, lider_estatus, osi_fixed_items — filtered:
  deleted_at IS NULL, cod_facilitador NOT NULL, estatus_admin != 'rechazada')
- `osi_sesion` (id, id_osi, nro_sesion, fecha — attribution + fallback sessions)
- `facilitador_osi_assignments` (osi_id, facilitador_id, nro_sesion — attribution + roster)
- `facilitadores` (id, nombre_apellido — row labels)

Component: `FacilitadorHorasTable.tsx` (tabular-nums hours, `$`-prefixed
monto, totals footer row, CSV export button, "según OSI" badge for
fallback-credited cursos). The footer documents the two-tier source and
monto formula.

### Offline fallback

`IndicadoresClient.tsx` wraps all three fetches in `fetchWithOfflineFallback`
and shows `CachedDataBanner` when serving stale data from Dexie. Cache keys:
`dash_indicadores_gestion_{year}_{filterKey}`,
`dash_indicadores_72h_{selectedMes}_{filterKey}`, and
`dash_indicadores_facilitadores_{year}_{filterKey}`.

### CSV exports

All three views export CSV via client-side `Blob` download (no server roundtrip):
- Gestión: `indicadores-gestion-mensual-{year}.csv` (one row per month)
- 72 horas: `indicadores-72-horas-{YYYY-MM}.csv` (one row per certificate)
- Facilitadores: `indicadores-facilitadores-{year}.csv` (one row per facilitador)

---

## Reportes de Capacitación

The `/dashboard/capacitacion/reportes` page has multiple tabs (overview, cursos,
facilitadores, empresas, tendencias, carnets). Each tab is a client component
that calls a server action from `app/actions/reportes.ts`.

### Tab: Facilitadores (`?tab=facilitadores`)

Server action: `getFacilitadoresReport` in `app/actions/reportes.ts`.

Per-facilitador report with certificates, hours, courses, and survey ratings.
Includes facilitadores with certificates, requisiciones, or assignments.

**Critical join rule (canonical):** `certificados.nro_osi` (integer) stores
`ejecucion_osi.nro_osi_secuencial`, NOT the formatted `nro_osi` string from
`v_osi_lista`. To join certificates to OSI data:
1. Fetch `ejecucion_osi (id, nro_osi_secuencial)` → build `numericOsi → id_osi`
2. Look up OSI data by `id_osi`

Joining `certificados.nro_osi` directly to `v_osi_lista.nro_osi` (string) is a
guaranteed miss — the types differ and the formatted string can contain
non-digits. See also `indicadores-certificados.ts:232-235`.

**Hours source of truth (canonical rule):** facilitador hours come
**exclusively** from `requisiciones.osi_fixed_items[].honorarios_horas` on
rows with `estatus_admin = 'procesada'`, `deleted_at IS NULL`, and a
non-null `cod_facilitador`. No OSI/course fallback is used. The requisición
is the authoritative record for what was paid. The same rule applies to the
indicadores facilitadores view.

**Cursos dictados (totalOsis):** distinct OSI ids with at least one
qualifying requisición item. **Temas (uniqueCourses):** distinct
`catalogo_servicios` ids from certificates.

Facilitadores with certificates or assignments but no processed requisición
appear with `sinRequisicion: true` and zero hours.

**Rating** = survey q1-q5 average per facilitador, mapped via
`facilitador_osi_assignments` (OSI → facilitador). Not participant grades.

**Paging:** all queries use `fetchAllPages` (1000 rows/page, max 50 pages) —
no `.limit(5000)` truncation. Warnings (if any) go in the `warning` field of
the response, rendered as a non-blocking amber banner.

Component: `FacilitadoresReport.tsx` — KPI cards, ranking bar chart, state
distribution, full table with search/status filter, Excel export. Columns
include "Cursos dict." (OSI deliveries) and "Temas" (distinct catalog
titles).

---

## Build & Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
- `NEXT_PUBLIC_SHELL_URL` — URL of the PRISMA shell (for auth redirects)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

### Docker
The app is configured for Docker deployment with `output: "standalone"` in `next.config.ts`.

---

## Code Style & Conventions

- **Indentation**: 2 spaces
- **Quotes**: Double quotes
- **Offline modules**: Always start with `"use client"` and live in `lib/offline/`
- **Spanish UI text**: All user-facing strings in Spanish (matching existing tone)
- **Comments**: Preserve existing comments; only add when necessary

---

## Useful Commands

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Start prod server
npm run start

# Dev with HTTPS (for SW testing on mobile)
npm run dev:https-mobile
```
