## Purpose

Garante salvamento imediato e persistente de cada questão respondida nas provas de sessão (local e Firebase Firestore), evitando perda de progresso ao navegar, evitando contagem inflada de repetições na mesma pergunta e impedindo que questões em branco gerem lacunas falsas.

## ADDED Requirements

### Requirement: Immediate per-question persistence during session practice quizzes
When the learner selects an option for a question in a session practice quiz (`full`, `quick`, or `error-notebook`), the system SHALL immediately persist that answer to `localStorage` and schedule cloud synchronization so the selection survives tab changes, reloads, and cross-device restarts.

#### Scenario: Navigating back to a chapter and returning to the session quiz
- **WHEN** the learner selects an answer for Question 1 of Session 1.1, switches to the chapter reader or reloads the browser, and returns to Session 1.1's quiz
- **THEN** Question 1 MUST remain marked with the previously saved option and feedback state

### Requirement: Unique-question counting and blank-answer exclusion
The system SHALL compute answered question counts, mastery percentages, and subtopic diagnostics strictly over unique questions actually answered (`selectedOptionIndex >= 0`), ignoring unanswered blank items and never inflating counters when the learner updates the same question multiple times.

#### Scenario: Updating the same question multiple times without inflating counts
- **WHEN** the learner changes their answer on a single question 6 times in Session 1.1
- **THEN** the session progress indicator MUST report exactly `1` answered question (out of the session total) and diagnostics MUST evaluate only that single question rather than counting 6 separate errors or 6 evaluated items

#### Scenario: Submitting or saving partial session answers with blanks remaining
- **WHEN** only a subset of questions in a session has been answered and remaining questions are left unselected
- **THEN** unselected blank questions (`selectedOptionIndex < 0`) MUST NOT be persisted as incorrect answers and MUST NOT generate false gaps ("Lacunas") in Course Home or Dashboard diagnostics

### Requirement: Explicit two-step session reset
Each session quiz SHALL offer an explicit confirmation control to clear only that session's recorded answers so the learner can restart the session from zero on demand, reconciling cleanly across cloud sync via session reset timestamps.

#### Scenario: Clearing a session's saved practice answers
- **WHEN** the learner triggers and confirms clearing Session 1.1's answers
- **THEN** saved answers for Session 1.1 MUST be removed locally and synchronized with a fresh `sessionResetLog["1.1"]` timestamp so stale cloud answers from older timestamps do not overwrite the reset
