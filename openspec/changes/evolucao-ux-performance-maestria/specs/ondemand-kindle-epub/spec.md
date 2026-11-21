## Purpose

Permite gerar sob demanda, diretamente na aplicação Web ou Android em execução, um livro EPUB 3 completo por módulo otimizado para Kindle Colorsoft com paridade integral em relação ao gerador de linha de comando, eliminando a duplicação de arquivos `.epub` pré-empacotados dentro do bundle distribuído.

## ADDED Requirements

### Requirement: Shared single-source per-module Kindle Colorsoft EPUB generation
The system SHALL build an independent EPUB 3 file per course module (`modulo-XX-kindle-colorsoft.epub`) using a single shared generation engine across CLI and in-app runtime, preserving the established Kindle Colorsoft layout, typography, Unicode/XHTML math conversion, official documentation and YouTube metadata banners, commented session exams with bidirectional links, valid EPUB 3 + NCX navigation, XHTML self-audit, and zero embedded audio binaries.

#### Scenario: Parity between CLI and in-app generated module EPUBs
- **WHEN** a module EPUB is generated either from the CLI build script or from the running application
- **THEN** both outputs MUST conform to strict EPUB 3 / Send-to-Kindle structure (`mimetype` uncompressed first, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/nav.xhtml`, `OEBPS/toc.ncx`, `OEBPS/cover.xhtml`, Colorsoft `styles.css`, chapters, PNG/JPEG assets, and commented quizzes passing XHTML self-audit) with strictly one `.epub` book per module

#### Scenario: Preserving Send-to-Kindle compatible image formats
- **WHEN** module diagrams and covers are packaged into the module assets directory used for runtime EPUB generation
- **THEN** those illustrations MUST remain in Kindle-compatible raster formats (`.png` or `.jpg`/`.jpeg`) so the client-generated EPUB opens and renders properly via Send to Kindle

### Requirement: On-demand offline in-app EPUB generation and export
When the learner clicks the Kindle `.EPUB` export action for an unlocked module in either the Web application or the Android APK, the application SHALL generate that module's `.EPUB` package in memory on demand (100% offline using local compiled module data and local assets) with clear progress feedback and immediately trigger the platform download or share flow.

#### Scenario: Exporting a module EPUB on demand in the Desktop browser
- **WHEN** the learner clicks to download a module's Kindle `.EPUB` from the Course Home card, header, or module Dashboard in a desktop browser
- **THEN** the button MUST display a generation state (e.g., `Gerando EPUB...`), assemble `modulo-XX-kindle-colorsoft.epub` on demand using the module's chapters, quizzes, and fetched local images, and initiate the browser file download

#### Scenario: Exporting a module EPUB on demand in the Android APK
- **WHEN** the learner taps to export an unlocked module's Kindle `.EPUB` inside the Android APK
- **THEN** the system MUST assemble the EPUB in memory offline, write `modulo-XX-kindle-colorsoft.epub` to the app cache directory, and open the native Android Share sheet targeting Kindle / file storage

#### Scenario: Handling generation errors safely
- **WHEN** a required asset fails to load or the XHTML self-audit detects an error during in-app generation
- **THEN** the exporter MUST abort without producing a corrupted file, reset the button loading state, and display an explicit error notification

### Requirement: Elimination of duplicated pre-built EPUB binaries from Web and APK bundles
The Web and Android production builds SHALL NOT copy or bundle pre-built `.epub` files inside `public/downloads/`, while keeping the standalone `npm run build:kindle` CLI available for generating `.epub` files directly into `dist-kindle/`.

#### Scenario: Building Web and Android distribution without embedded EPUB binaries
- **WHEN** the production build and Android sync pipeline execute
- **THEN** `dist/downloads/` MUST NOT carry duplicate pre-built `.epub` binaries while every unlocked module retains working on-demand `.EPUB` export inside the running app and CLI builds continue writing `dist-kindle/modulo-XX-kindle-colorsoft.epub`
