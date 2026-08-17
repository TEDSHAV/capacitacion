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
