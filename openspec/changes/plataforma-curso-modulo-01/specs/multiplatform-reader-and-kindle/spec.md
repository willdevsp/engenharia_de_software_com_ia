## Purpose

Defines the multiplatform reading and study experience running locally on Desktop and offline as a native Android `.APK`, including progress synchronization, future media/AI tutor extensibility, and `.EPUB` generation for Kindle Colorsoft via Send to Kindle.

## ADDED Requirements

### Requirement: Local Desktop reader and offline Android APK parity
The system SHALL run locally on the user's Desktop computer and build into a standalone Android `.APK` package that operates 100% offline. Both platforms MUST render the 11 chapters of Module 01 with embedded high-resolution graphics, formatted code blocks, chapter reading progress tracking, the interactive exam engine, and the performance dashboard.

#### Scenario: Studying and taking exams offline on Android
- **WHEN** the user installs and opens the generated `.APK` on an Android device without internet connectivity
- **THEN** all 11 chapters of Module 01, all embedded graphics, all 11 session exam banks (up to 30 questions each), and the performance dashboard MUST load and function offline

### Requirement: Cross-device progress export and import
The system SHALL allow the user to export their complete study state (reading progress, completed chapters, exam attempt histories, and subtopic mastery analytics) to a portable `.json` backup file and import it on another device (Desktop $\leftrightarrow$ Android).

#### Scenario: Transferring exam history from Android to Desktop
- **WHEN** the user exports their progress `.json` file on Android and imports it into the Desktop application
- **THEN** the Desktop dashboard MUST merge and reflect all completed exams, scores, and "What to Improve" diagnostics without data loss

### Requirement: Color EPUB 3 export for Kindle Colorsoft (Send to Kindle)
The system SHALL generate a standards-compliant `.epub` (EPUB 3) book file containing the 11 chapters of Module 01, a color cover, a multi-level navigable Table of Contents (`nav.xhtml` and `toc.ncx`), all high-contrast color illustrations embedded inline, Kindle-optimized typography/code CSS, and an end-of-chapter question & commented answer key section compatible with Amazon's **Send to Kindle** service for the **Kindle Colorsoft**.

#### Scenario: Generating the Module 01 EPUB for Send to Kindle
- **WHEN** the user triggers the Kindle EPUB build command or export button
- **THEN** the system MUST produce a valid `.epub` file with all Module 01 chapters, embedded RGB images, and clickable internal anchor links for the self-assessment answer keys, ready to upload to Send to Kindle

### Requirement: Forward-compatible schema for Phase 2 (Audio/Video) and Phase 3 (Gemini AI Tutor)
The application data model and chapter rendering layout SHALL include extensible slots for session audio attachments (generated via Gemini Notebook / NotebookLM), video lessons, and a contextual Gemini AI Tutor drawer without requiring breaking changes to the Module 01 chapter or quiz files.

#### Scenario: Rendering a chapter in Phase 1 with future media slots unpopulated
- **WHEN** a chapter's `media.audio_notebooklm` and `media.video_url` metadata fields are null in Phase 1
- **THEN** the reader interface MUST render the text, graphics, and exam cleanly while preserving the schema contract for Phase 2 media players and Phase 3 contextual AI tutoring
