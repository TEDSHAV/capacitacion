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
