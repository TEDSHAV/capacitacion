# Changelog

All notable changes to this project are documented in this file.
This project follows [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/).

> **About the history before v1.5.0**
>
> This application has been running in production since approximately May 2026.
> Formal versioning begins at **v1.5.0**, which reflects that accumulated work.
> Commit dates on or before 2026-07-14 were compressed by a git history rewrite
> (an author-email change) and do not reflect when that work was actually done.
> Only commits following the Conventional Commits format appear in the entries below.

## [1.13.0](https://github.com/TEDSHAV/capacitacion/compare/v1.12.0...v1.13.0) (2026-09-09)

### Features

* add charts, standard header/footer, and text wrapping to evaluacion de facilitadores PDF ([0f59950](https://github.com/TEDSHAV/capacitacion/commit/0f59950978ca3da8d470465808d19fe4eddf05c5))
* add per-facilitador course history modal in gestion-de-facilitadores ([7d5cd78](https://github.com/TEDSHAV/capacitacion/commit/7d5cd7853ec6e641fcaeafff3d627657342c752b))
* anular certificados individuales con motivo de anulación ([0d5748c](https://github.com/TEDSHAV/capacitacion/commit/0d5748c5606c218b1b7c9698c3c16014a26d11ba))
* Evaluación de Facilitadores (RG-CAP-004) — form, registry, PDF generation ([f90305c](https://github.com/TEDSHAV/capacitacion/commit/f90305cb841ac1423ab2a1d9b83d156cbf677335))
* merge en_proceso + ejecutado into single auto-step, fire-and-forget sync ([6b5f340](https://github.com/TEDSHAV/capacitacion/commit/6b5f3401e93968f1841540788bd1fc12ffc1448c))
* move survey mode to dedicated settings table ([0f1d8ab](https://github.com/TEDSHAV/capacitacion/commit/0f1d8ab886a912c58fb03607c0848739ea35ccd0))
* multi-select session picker for requisicion externa + auto-mark requisicion_enviada_admin step ([bd3dc21](https://github.com/TEDSHAV/capacitacion/commit/bd3dc2106caefce386673185ad7003917e984b29))
* rebuild indicadores page around gestión mensual + carry-over panel, fix CarryPanel blue background ([db40ed2](https://github.com/TEDSHAV/capacitacion/commit/db40ed25fd250fbf623116fec64a37582fe3c149))
* Resultado de la Actividad download, searchable company filter, lighter gestion-osi query ([bf5c396](https://github.com/TEDSHAV/capacitacion/commit/bf5c39601f02ec4d8cfc9fd937014da5032b0f3e))
* show success toast on certificate anulación ([e1c0f3b](https://github.com/TEDSHAV/capacitacion/commit/e1c0f3bd42d3217a48bdb077a0e28dd1bc2b3c94))
* two-tier horas por facilitador (requisición → OSI fallback), reportes requisición-as-truth, indicadores page rebuild ([2dcaa58](https://github.com/TEDSHAV/capacitacion/commit/2dcaa5844dd21011d6b890f247b94514e085e46f))
* union processed requisiciones into facilitador history with source badge ([c107a1f](https://github.com/TEDSHAV/capacitacion/commit/c107a1f4fb2d9bd588729747ce5533341cfe811b))

### Bug Fixes

* correct contrast on survey mode selector buttons ([69f560f](https://github.com/TEDSHAV/capacitacion/commit/69f560feed2caa692ea6ab6f2904e5de5ea0317e))
* correct date offset in OSI date columns parsed as UTC midnight ([7be1577](https://github.com/TEDSHAV/capacitacion/commit/7be15770c6b36b3e7bc6ac9e4e99fe489bbced68))
## [1.12.0](https://github.com/TEDSHAV/capacitacion/compare/v1.11.2...v1.12.0) (2026-08-27)

### Features

* match PDF layout to Excel sample — stacked label/value format, side-by-side ST+CAP checklists in Bloque IV 7dbb592

### Bug Fixes

* move Bloque III description to its own column, force page break before Bloque III e2207bd
* prevent header/footer overlap in PDF, stack Aplica/No Aplica vertically in Bloque IV cd19191
## [1.11.2](https://github.com/TEDSHAV/capacitacion/compare/v1.11.1...v1.11.2) (2026-08-26)

### Bug Fixes

* PDF header meta box shows código/fecha/revisión/página, fix footer width cutoff, reduce header padding, fix Bloque III row overlap 686a1eb
## [1.11.1](https://github.com/TEDSHAV/capacitacion/compare/v1.11.0...v1.11.1) (2026-08-26)

### Bug Fixes

* stop auto-advance from re-marking ejecutado after manual unmark 07bae70
## [1.11.0](https://github.com/TEDSHAV/capacitacion/compare/v1.10.0...v1.11.0) (2026-08-26)

### Features

* add Asignaciones y Credenciales management module 8fd38ce
* add Nuevos Servicios (RG-NEG-003) module with PDF generation, fix null-safety in PDF document, refine PDF layout to match Excel sample 94bdd6b
* launch PWA at the page where the user installed it afe0a8b
* move Assign OSI and Create Credentials actions to Asignaciones y Credenciales module 4596844
* notify capacitacion users when facilitadores upload to portal d56a0ef
* reduce seguimiento-servicios pagination to 5, make en_proceso unmarkable with shell sync af97161
* replicate requisiciones module in-app for snappy navigation 128e182
* sync capacitacion ejecutado step to shell OSI status 988bb47

### Bug Fixes

* duplicate React key in breadcrumbs when on home page c9b1f93
* make PWA sidebar sticky on desktop so nav stays visible while scrolling a529ff4
* navbar logo proportions and favicon/PWA icon references 6614616
* number inputs in requisiciones eat decimals and can't be cleared 2450954
* remove misleading Configuración sidebar link (feriados reachable from Indicadores) 0c10850
* stop global button rule from painting unchecked checkboxes/radios blue, soften cached-data banner when online 5d2ff25
* stop offline banner from overlapping downloads button and toasts, add Consulta de OSIs external sidebar link e563e40

### Performance

* add loading skeletons, router cache, SWR data hook, and Suspense streaming for snappy navigation 8d2a95f
* parallelize shell sync, drop redundant re-fetch, stream seguimiento-servicios behind Suspense 340f1f0
* trim certificados SELECT and reduce pagination, add Nuevos Servicios actions/types/nav, add badge/checkbox UI primitives 60a82e4
## [1.8.0](https://github.com/TEDSHAV/capacitacion/compare/v1.7.3...v1.8.0) (2026-08-19)

### Features

* save and restore certificate form drafts per OSI via localStorage 0ef0943

### Bug Fixes

* count distinct participants in cliente portal metrics 0dfbc8f
## [1.7.3](https://github.com/TEDSHAV/capacitacion/compare/v1.7.2...v1.7.3) (2026-08-18)

### Bug Fixes

* pass server action directly to LogoutButton ea5d5c4
## [1.7.2](https://github.com/TEDSHAV/capacitacion/compare/v1.7.1...v1.7.2) (2026-08-18)

### Bug Fixes

* remove sliding cookie refresh from session getters 4e5d5f9
## [1.7.1](https://github.com/TEDSHAV/capacitacion/compare/v1.7.0...v1.7.1) (2026-08-18)

### Bug Fixes

* session persistence — cookie secure flag, auto-redirect, sliding refresh, offline access 74d8541
## [1.7.0](https://github.com/TEDSHAV/capacitacion/compare/v1.6.0...v1.7.0) (2026-08-18)

### Features

* cache participant lists offline for better UX 26ec964
* cliente portal offline document downloads (Phase 2) 29c951d
* custom PWA install prompt for mobile and desktop 758f6ce
* facilitador portal offline writes with sync queue (Phase 4) 92bdbe3
* indicadores drill-down, programada state, sede resolution, cert search fix 4a7ec14
* prefetch participant lists + fix button heights and offline pill contrast ef49588
* PWA installable shell with offline support (Phase 1) 757a750
* store certificate/carnet templates in Supabase storage instead of ephemeral disk b5a6cd1

### Bug Fixes

* cliente dashboard mobile responsive layout 61aeec7
* historical facilitador-de-sesion attribution in indicadores d95e176
* persist sessions across navigation and improve offline downloads UI adf378c
* PWA install prompt works over HTTPS for mobile testing 00fb799
* replace purple with SHA brand blue ([#0c3f69](///issues/0c3f69)) 38e13d2, references #C30DFF
* robust offline navigation and persistent sessions 30af049
## [1.6.0](https://github.com/TEDSHAV/capacitacion/compare/v1.5.0...v1.6.0) (2026-08-17)

### Features

* add automated survey tabulation PDF report (Resultado de la Actividad) 07028ef
* add Ficha Tecnica de Facilitador with PDF generation and photo upload 42fe72a
* add ficha tecnica generation for courses 615328c
* add indicadores cards for 72h kpi 9a8c17e
* improve layout for resultado de la actividad pdf f37d635
* redesign capacitacion dashboard to 2-row layout with horizontal bar 9f1103a
* redesign facilitator form with card-based sections and compact spacing f9a6445
* rewrite indicadores SLA to business days with feriados support 7efaef1
* surface app version in embedded dashboard and portals 02b8d69

### Bug Fixes

* ficha tecnica pdf layout tweaks - black fonts, compact spacing, header/footer alignment, remove title underline b4f1087
* improve encuesta modal UX and make gestion-osi mobile friendly dc1cc6c
* increase VersionBadge visibility for iframe context f7a77a0
* ocr facilitador portal 7835416
* preserve leading spaces on first list item in stripHtml a5b913f
* preserve list indentation in ficha tecnica PDF, add spacing to rich text editor labels 4bf59fa
* preserve space after list marker in PDF, increase section spacing 1988b63
* remove build date from UI, keep it in tooltip only 59ca7e2
* show clean tag in UI instead of full git-describe string 93ef946
* simplify certificacion text in ficha tecnica to match original FT format 9d745d8

### Refactors

* replace facilitador details modal with direct navigation to edit page 28bfcb0
* replace puppeteer with jsPDF for ficha tecnica PDF generation e17be88
## 1.5.0 (2026-08-11)

### Features

* add build-time version tracking and release tooling e6a7924
* add subtitle (subtitulo) field to course creation and auto-populate in certificate generation be6af35
* make scores editable in gestion de certificados view fe5f4e0

### Bug Fixes

* add @floating-ui/dom to lock file 0df32a6
* install @img/sharp-linux-x64 in Docker for cross-platform build f163aea
* make certificate PDF endpoint public for QR verification 1e6f35c
* use npm install instead of npm ci for cross-platform sharp binary 6238fcf
