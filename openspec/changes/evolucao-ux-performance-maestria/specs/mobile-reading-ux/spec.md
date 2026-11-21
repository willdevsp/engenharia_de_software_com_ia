## Purpose

Garante uma experiência de leitura técnica fluida e ergonômica em dispositivos móveis e desktops, eliminando vazamentos horizontais em tabelas, tornando o sumário acessível durante toda a leitura no celular e adicionando cabeçalho de linguagem com cópia rápida aos blocos de código.

## ADDED Requirements

### Requirement: Isolated horizontal scrolling for markdown tables
The chapter reader SHALL wrap every rendered Markdown table in an independently scrollable horizontal container and constrain the chapter article container width so wide tables never cause horizontal overflow on mobile viewports.

#### Scenario: Viewing a chapter with wide comparison tables on a 390px mobile viewport
- **WHEN** the learner opens a chapter containing multi-column Markdown tables on a mobile screen (`390x844`)
- **THEN** the page document width MUST NOT exceed the viewport width (`scrollWidth <= innerWidth`), while each table remains horizontally scrollable inside its own container

### Requirement: Accessible in-chapter Table of Contents on mobile viewports
The chapter reader SHALL keep the "Neste Capítulo" outline easily accessible on mobile and tablet viewports without forcing the user to scroll to the end of long chapters, while preserving the sticky right-hand sidebar on desktop viewports.

#### Scenario: Opening and jumping to a section from the top collapsible outline on mobile
- **WHEN** the learner views a chapter on a viewport narrower than the desktop breakpoint and opens the collapsible "Neste Capítulo" header bar
- **THEN** the system MUST display the chapter's section links (`H2` and `H3`), smoothly scroll to the selected heading upon tap, and collapse the mobile panel cleanly

#### Scenario: Using the floating index trigger midway through a long mobile chapter
- **WHEN** the learner has scrolled down a chapter on a mobile viewport and taps the floating index button
- **THEN** the system MUST open a compact navigation drawer/sheet listing the chapter headings and scroll directly to the chosen heading upon selection

#### Scenario: Desktop layout preservation
- **WHEN** the learner views a chapter on a desktop viewport (`>= 1024px`)
- **THEN** the system MUST continue displaying the sticky "Neste Capítulo" sidebar alongside the chapter article without duplicating active mobile controls on screen

### Requirement: Code block language badge, one-tap copy, and mobile spacing ergonomics
The chapter reader SHALL render each fenced code block with a compact header showing its declared language and a one-tap copy button, alongside responsive chapter padding and wrapping footer navigation buttons for narrow screens.

#### Scenario: Copying a multi-line code snippet from the reader
- **WHEN** the learner taps the "Copiar" button in the header of a fenced code block inside a chapter
- **THEN** the system MUST copy the exact raw code content to the device clipboard (using Clipboard API with a compatible WebView fallback) and show temporary visual feedback (`Copiado!`) for approximately 1.5 to 2 seconds

#### Scenario: Rendering footer chapter navigation on narrow mobile screens
- **WHEN** the learner reaches the bottom Previous/Next session buttons on a narrow mobile viewport
- **THEN** the buttons MUST wrap cleanly without overlapping text or causing horizontal clipping
