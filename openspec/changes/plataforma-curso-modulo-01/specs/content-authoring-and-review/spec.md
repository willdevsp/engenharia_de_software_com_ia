## Purpose

Defines the authoring standards, visual illustration requirements (official documentation diagrams and Nano Banana generated graphics), session exam structures (up to 30 questions per session), and the automated quality review skill (`course-content-reviewer`) for Module 01 chapters.

## ADDED Requirements

### Requirement: Deep technical chapter authoring grounded in official documentation
The system SHALL provide 11 complete, book-depth chapters corresponding to Sessions 1.1 through 1.11 of Module 01 (`Docs/modulo-01-fundamentos-ia-e-llms.md`). Each chapter MUST consult and cite the official documentation sections mapped for that session, explaining internal mechanisms, architectural concepts, real code examples, and step-by-step hands-on labs.

#### Scenario: Authoring a Module 01 session chapter
- **WHEN** a chapter for a session of Module 01 (e.g., Session 1.2 or 1.3) is authored
- **THEN** the chapter Markdown file MUST include frontmatter metadata (`id`, `title`, `module`, `session`, `official_docs`, and extensible `media` fields for future audio/video), comprehensive technical prose, executable JavaScript/TypeScript code examples, and direct references to the official documentation sections of that stage

### Requirement: High-contrast visual assets for Desktop, Android, and Kindle Colorsoft
Every chapter SHALL include visual graphics and diagrams illustrating its core technical concepts, either sourced from official documentation or generated via Nano Banana. All visual assets MUST be saved as local raster image files (`.png` or `.jpg`) with a light background and high-contrast color palette suitable for Color E-Ink (Kindle Colorsoft Kaleido 3) as well as Desktop and Android screens.

#### Scenario: Rendering diagrams across devices including Kindle Colorsoft
- **WHEN** a chapter contains architectural diagrams, timelines, or conceptual illustrations
- **THEN** the chapter MUST reference concrete local image assets rather than relying exclusively on client-side JavaScript diagram renderers, and each generated Nano Banana illustration MUST use a light background (`#FFFFFF` or `#FAF8F5`) with bold, legible labels

### Requirement: Session exam question bank of up to 30 questions per session
Each of the 11 sessions of Module 01 SHALL have a structured exam question bank containing up to 30 questions that assess the user's mastery of that session's content. Every question MUST include a unique ID, question stem, options, correct option index, detailed technical explanation, subtopic tag, cognitive level (`conceptual`, `architecture`, or `code-practice`), chapter section anchor, and official documentation URL.

#### Scenario: Validating a session exam question bank
- **WHEN** a session exam bank is loaded for evaluation or review
- **THEN** it MUST contain up to 30 structured questions covering all subtopics of that session, with each question linked to a specific chapter anchor and official documentation section

### Requirement: Content and exam quality auditing via the reviewer skill
The system SHALL provide a dedicated agent skill (`course-content-reviewer`) that audits generated chapters and their corresponding exam banks before they are marked as approved. The skill MUST verify technical accuracy against the linked official documentation, pedagogical depth, completeness of the question bank explanations, and compliance of all image assets with Kindle Colorsoft legibility rules.

#### Scenario: Auditing a newly generated chapter and quiz with the reviewer skill
- **WHEN** the `course-content-reviewer` skill is invoked on a generated chapter and its session quiz
- **THEN** the skill MUST check every technical claim and code snippet against the official documentation, verify that all referenced image files exist and follow high-contrast light-background rules, validate the exam answer key, and output a structured audit verdict (`APPROVED` or `REVISIONS_REQUIRED` with actionable fixes)
