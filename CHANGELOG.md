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
