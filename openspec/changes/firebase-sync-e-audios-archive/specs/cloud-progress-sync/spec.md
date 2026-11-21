## Purpose

Defines bidirectional, offline-first synchronization of learner study progress (completed chapters, reading state, bookmarked questions, exam attempt history, performance analytics, and audio resume positions) via Firebase Firestore across Desktop and Android devices without losing offline attempts.

## ADDED Requirements

### Requirement: Offline-first local persistence with automatic cloud sync
The system SHALL persist all study progress locally first (for instant offline availability) and automatically synchronize changes with Firebase Firestore (`study_state`) whenever Firebase is configured and the device has network connectivity.

#### Scenario: Completing a session exam while online
- **WHEN** the user submits a completed exam in the Desktop or Android app while online
- **THEN** the system MUST save the attempt locally immediately, merge with remote state, and persist the updated study state to Firebase Firestore

#### Scenario: Completing a session exam while offline and reconnecting later
- **WHEN** the user completes an exam or marks a chapter as read while offline on Android and later regains internet connectivity
- **THEN** the system MUST keep the offline changes locally and automatically merge and push them to Firebase Firestore once connectivity returns

### Requirement: Lossless cross-device merge for exams, chapters, and audio positions
When reconciling local and remote `study_state`, the system SHALL perform a deterministic merge that preserves all unique exam attempts by `attemptId`, resolves chapter completion status by most recent per-chapter timestamp, and retains the most recently updated playback position (`lastPositionSeconds`) for each audio track.

#### Scenario: Merging exam attempts taken independently on Desktop and Android
- **WHEN** Desktop has Attempt A (Session 1.1) and Android has Attempt B (Session 1.2) and both synchronize with Firestore
- **THEN** the merged study state on both devices MUST contain both Attempt A and Attempt B sorted chronologically without overwriting either attempt, updating both Dashboards accurately

### Requirement: Sync status visibility, manual sync trigger, and portable JSON backup
The system SHALL display the current cloud synchronization status (`Nuvem OK`, `Sincronizando`, `Offline`, or `Não Configurado`), provide a manual "Sincronizar Agora" action, and retain the portable `.json` export/import backup controls.

#### Scenario: Triggering manual synchronization
- **WHEN** the user clicks "Sincronizar Agora" in the header or Dashboard
- **THEN** the system MUST fetch the latest remote state from Firestore, merge it with local state, push the reconciled state back if needed, and update the sync status indicator
