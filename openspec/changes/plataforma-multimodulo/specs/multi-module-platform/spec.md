## Purpose

Estabelece o suporte arquitetural multi-módulo da plataforma de aprendizado (Módulos 01 a 12), incluindo descoberta automática de módulos, validação global de conteúdo, Página Inicial com mini-dashboards por módulo, alternância direta via dropdown no cabeçalho, exportação `.EPUB` independente por módulo, rastreamento dinâmico de `moduleId` na nuvem e empacotamento em APK Android único.

## ADDED Requirements

### Requirement: Automatic multi-module catalog discovery and global content validation
The build and validation pipeline SHALL automatically discover module metadata from `Docs/modulo-XX-*.md` and authored module content from `content/modulo-XX/`, compiling each available module's assets, chapters, and quiz banks while rejecting duplicate global identifiers or broken diagnostic anchors.

#### Scenario: Discovering both authored and planned modules
- **WHEN** `Docs/` contains module outlines `01` through `12` and `content/` contains authored directories for a subset of modules (e.g., `modulo-01` and `modulo-02`)
- **THEN** the compiled course catalog MUST include all 12 modules ordered numerically, marking modules with compiled chapters as available and remaining modules as planned

#### Scenario: Rejecting duplicate IDs or invalid chapter anchors during validation
- **WHEN** the content validator runs across multiple modules and encounters a duplicate `chapter.id`, duplicate `sessionId`, duplicate `question.id`, or a quiz question referencing a `chapterAnchor` that does not exist in its corresponding chapter
- **THEN** validation MUST fail with an explicit error identifying the offending module, file, and identifier

### Requirement: Course Home page with per-module dashboards and direct actions
When the application opens at its initial view, it SHALL display a consolidated course summary alongside a dashboard card for each module showing module status, reading progress, evaluated sessions, average mastery, open improvement gaps, direct entry into the module, and an independent Kindle `.EPUB` export action for available modules.

#### Scenario: Opening a partially completed module from the Home dashboard
- **WHEN** the learner clicks to continue an available module on the Course Home page where some chapters are already completed and others remain unread
- **THEN** the system MUST open that module's view and position the reader on the first unread session (or the first session if all are completed or none are started)

#### Scenario: Viewing planned modules on the Home page
- **WHEN** a module defined in `Docs/` does not yet have authored chapters in `content/`
- **THEN** its card on the Course Home page MUST display its module number, title, track, suggested hours, and a clear "Em breve" status without offering broken reader, exam, or EPUB download actions

### Requirement: Header dropdown switcher for direct cross-module navigation
The application header SHALL provide a persistent module selector dropdown allowing the learner to switch directly between the Course Home overview and any available module without returning to the Home page first.

#### Scenario: Switching modules directly from the header dropdown while inside the reader or quiz
- **WHEN** the learner is viewing Module 01 (in Reader, Quiz, or Dashboard tab) and selects Module 02 from the top header dropdown
- **THEN** the system MUST immediately switch the active module context to Module 02, update the sidebar sessions, reader chapter, exam selector, and module dashboard to Module 02 data, and keep the learner in the active workflow tab (or reset cleanly to the module's reader/sessions)

#### Scenario: Returning to Course Home via header brand or dropdown
- **WHEN** the learner selects "Início (Todos os Módulos)" in the header dropdown or clicks the application brand title while inside a module
- **THEN** the system MUST return to the Course Home view showing all module dashboards

### Requirement: Independent per-module Kindle Colorsoft EPUB export
The EPUB builder and in-app exporter SHALL generate and distribute an independent Colorsoft-optimized EPUB 3 file (`modulo-XX-kindle-colorsoft.epub`) for each available module, containing only that module's cover, metadata, chapters, math formulas, high-contrast images, and commented exams with no embedded audio binaries.

#### Scenario: Generating EPUB files for all available modules
- **WHEN** the Kindle EPUB build command runs in a repository with multiple available modules
- **THEN** it MUST produce one valid, self-audited EPUB 3 file per available module (`modulo-01-kindle-colorsoft.epub`, `modulo-02-kindle-colorsoft.epub`, etc.) with module-specific title, cover, unique book identifier, and chapter count

#### Scenario: Exporting the active module's EPUB from Desktop or Android
- **WHEN** the learner triggers the Kindle `.EPUB` action while viewing Module `N` (either from Module `N`'s Home card, header, or module Dashboard)
- **THEN** the Desktop browser MUST download `modulo-0N-kindle-colorsoft.epub` (or appropriate formatted filename) and the Android app MUST invoke the native Share sheet with that specific module's `.epub` file

### Requirement: Scoped module metrics, dynamic cloud moduleId, and unified Android APK
All per-module progress counters, sidebar scores, module dashboard analytics, exam selectors, and cloud audio metadata uploads SHALL be strictly scoped to the active module and preserve backward compatibility with existing Module 01 Firestore state while building into a single course-wide Android APK.

#### Scenario: Isolating completion counts and exam analytics per module
- **WHEN** the learner has completed chapters in Module 01 and switches to Module 02 (which has 0 completed chapters)
- **THEN** the Module 02 sidebar, reader badge, and Module 02 Dashboard MUST report 0 completed chapters out of Module 02's total sessions without counting Module 01 completions

#### Scenario: Uploading session audio in Module 02+ with dynamic moduleId
- **WHEN** the learner uploads or syncs an audio track inside Session `2.1` of Module 02
- **THEN** the saved `CloudAudioMetadata` document in Firestore `session_audios` MUST record `moduleId: 2` and `sessionId: "2.1"` while keeping the Audio and Video panels collapsed by default upon opening or switching chapters

#### Scenario: Preserving existing Module 01 cloud state in a unified APK
- **WHEN** the learner installs the unified course Android APK (`dist-android/engenharia-software-ia.apk`) and synchronizes with an existing Firebase Firestore database containing Module 01 progress (`study_state/default`) and audios (`session_audios`)
- **THEN** all existing Module 01 completed chapters (`m01-s*`), quiz attempts (`1.*`), and audio tracks MUST remain intact and properly reflected under Module 01
