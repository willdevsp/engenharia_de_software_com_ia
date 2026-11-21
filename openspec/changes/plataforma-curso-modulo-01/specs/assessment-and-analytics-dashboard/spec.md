## Purpose

Defines the interactive session exam engine (up to 30 questions per session), knowledge quality scoring, performance dashboard per session and module, and automated diagnostic recommendations highlighting what the learner needs to improve.

## ADDED Requirements

### Requirement: Interactive session exam execution modes
The system SHALL allow the user to take an interactive exam for any session of Module 01 (up to 30 questions per session) in three modes: Full Session Exam (all questions in the session bank), Quick Practice (a configurable subset), and Error Notebook Mode (filtering only questions or subtopics previously answered incorrectly).

#### Scenario: Completing a full session exam
- **WHEN** the user completes a session exam and submits their answers
- **THEN** the system MUST score the attempt, display the detailed technical explanation for each question along with links to the exact chapter section and official documentation, and persist the attempt history locally

#### Scenario: Running Error Notebook mode
- **WHEN** the user starts an exam in Error Notebook mode for a session or module
- **THEN** the system MUST select only questions that the user previously missed or questions belonging to subtopics where the user's accuracy is below the mastery threshold ($75\%$)

### Requirement: Performance dashboard by session and module
The system SHALL provide an analytics dashboard displaying knowledge quality metrics aggregated at both the Module 01 level and individual Session level (Sessions 1.1 through 1.11). The dashboard MUST display overall mastery percentage, completion progress across the 11 sessions, accuracy broken down by cognitive level (`conceptual`, `architecture`, `code-practice`), and historical score trends across attempts.

#### Scenario: Viewing module and session performance metrics
- **WHEN** the user opens the Performance Dashboard
- **THEN** the system MUST display the mastery score and attempt history for each of the 11 sessions, the consolidated Module 01 score, and the cognitive level breakdown

### Requirement: Actionable improvement diagnostics ("What I Can Improve")
The system SHALL analyze the user's exam responses by `subtopic_tag` and `cognitive_level` to generate a prioritized "What to Improve" diagnostic report. Any subtopic with an accuracy rate below $75\%$ MUST be flagged as an improvement gap with direct one-click actions to review the exact chapter section, open the official documentation reference, and launch a targeted retry quiz.

#### Scenario: Identifying knowledge gaps after an exam
- **WHEN** the user has below $75\%$ accuracy on one or more subtopic tags within a session (e.g., GPU memory management in Session 1.3)
- **THEN** the dashboard MUST highlight those specific subtopics under the "What to Improve" section, display the current accuracy per subtopic, and provide direct links to the corresponding chapter anchor and official documentation section
