# Project Preferences & Offline Architecture

## Git commits

- NEVER add `Co-Authored-By:` trailers to commit messages.
- NEVER add "Generated with [Devin](https://devin.ai)" or any AI/tool attribution to commit messages.
- Keep commit messages to the message itself, matching the surrounding repo style.

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
