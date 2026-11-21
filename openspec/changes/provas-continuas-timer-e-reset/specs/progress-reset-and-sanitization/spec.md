## Purpose

Fornece um reset completo e seguro do estado de estudo (localStorage e documento `study_state/default` no Firebase Firestore sem afetar áudios em `session_audios`), além de sanitizar automaticamente tentativas legadas contendo respostas em branco inválidas.

## ADDED Requirements

### Requirement: Two-step full progress reset across local storage and Firebase Firestore
The system SHALL expose a two-step confirmed "Resetar Todo o Progresso (Começar do Zero)" action that clears all completed chapters, reading progress, per-question answers, quiz attempts, and module mastery states in both `localStorage` and Firestore `study_state/default` while leaving `session_audios` intact and recording a `globalResetAt` timestamp.

#### Scenario: Confirming full progress reset from settings or dashboard
- **WHEN** the learner clicks and confirms the two-step full progress reset button
- **THEN** local study state MUST reset immediately to empty counters (`0` completed reads, `0` evaluated sessions, `0` gaps), and if Firebase is configured, `study_state/default` MUST be updated immediately with `globalResetAt` while preserving all cloud audio tracks

#### Scenario: Preserving reset state across stale-device Cloud Sync merges
- **WHEN** Device A resets all progress at timestamp `T2` (`globalResetAt = T2`) and later syncs with Device B whose `lastUpdated` and records predate `T2`
- **THEN** cloud state reconciliation MUST reject stale pre-`T2` chapters, answers, attempts, and mastery entries in favor of the clean reset state

### Requirement: Legacy blank-answer sanitization on state normalization
When loading or syncing study state from `localStorage` or Firestore, state normalization SHALL strip invalid unselected answers (`selectedOptionIndex < 0`) from legacy `quizAttempts` entries so historical partial/blank submissions never pollute gap diagnostics.

#### Scenario: Loading a legacy attempt containing unselected (-1) entries
- **WHEN** the application loads or syncs a `UserStudyState` whose `quizAttempts` contain entries with `selectedOptionIndex === -1`
- **THEN** normalization MUST strip those `-1` entries, recompute attempt counts if needed (or drop empty attempts), and compute gaps strictly from valid selections (`>= 0`)
