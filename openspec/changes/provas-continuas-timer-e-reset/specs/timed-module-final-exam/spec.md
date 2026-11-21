## Purpose

Transforma a Prova Oficial do Módulo (Prova Completa e Provas Extras de Recuperação) em uma avaliação realizada de uma única vez com tela prévia de preparação e cronômetro regressivo dimensionado pela soma da complexidade de cada questão sorteada.

## ADDED Requirements

### Requirement: Complexity-weighted exam time calculation and preparation briefing
Before starting Chance 1/3 or an Extra Recovery Exam (Chance 2/3 or 3/3) of the Official Module Exam, the system SHALL present a preparation briefing displaying the exact calculated exam duration derived by summing per-question allowances based on difficulty (`foundation: 60s`, `intermediate: 90s`, `advanced: 120s`), cognitive level (`conceptual: +0s`, `architecture: +15s`, `code-practice: +30s`), and code snippet presence (`+15s`).

#### Scenario: Viewing calculated exam duration before starting a 40-question Module Exam
- **WHEN** the learner opens the Official Module Exam tab for an eligible module before clicking Start
- **THEN** the system MUST display the question count, calculated total time limit, complexity breakdown (basic, intermediate, advanced, with code), and single-sitting exam rules without revealing the questions until started

### Requirement: Continuous single-sitting countdown timer with draft preservation and auto-submission
Once the learner clicks to start the Official Module Exam, the system SHALL persist `currentAttemptStartedAt` and `currentAttemptTimeLimitSeconds`, run a live countdown clock visible throughout the exam while preserving in-progress selections, and automatically submit the exam when remaining time reaches `00:00`.

#### Scenario: Reloading mid-attempt while the timer is active
- **WHEN** the learner starts the Official Module Exam, answers several questions, and accidentally refreshes the page before submitting
- **THEN** the exam MUST resume with the already-selected draft answers and elapsed wall-clock countdown computed continuously from `currentAttemptStartedAt`

#### Scenario: Auto-submitting upon timer expiration
- **WHEN** the countdown timer reaches zero (`remainingSeconds <= 0`) during an active Official Module Exam
- **THEN** the system MUST automatically submit the attempt using all currently saved draft answers and apply the standard Mastery Gate consolidation logic
