## Purpose

Implementa um sistema rigoroso de progressão baseada em maestria (`>= 70%`) que valida o percurso real de todas as sessões de um módulo, aplica uma Prova Completa do Módulo de até 40 questões com consolidação de ciclo em até 2 provas extras focadas nos erros e impõe reestudo cirúrgico obrigatório antes de desbloquear o módulo seguinte.

## ADDED Requirements

### Requirement: Verified section-by-section chapter traversal before module exam eligibility
Even when the learner performs primary reading on a Kindle device, the reader SHALL verify traversal across every section of each chapter in the module before marking that chapter completed for mastery gate eligibility, displaying live section coverage (`%`) and persisting timestamped progress.

#### Scenario: Tracking verified reading traversal across chapter sections
- **WHEN** the learner reads through a chapter in the Web or Android reader
- **THEN** the reader MUST track structural section checkpoints (top, each `H2`/`H3` heading, and end sentinel) requiring brief visible dwell time (`>= 1.5s` per section) so instant scroll-dragging cannot fake 100% completion, updating the visible section coverage indicator and persisted reading progress

#### Scenario: Completing a chapter upon full traversal
- **WHEN** 100% of a chapter's sections have been verified as traversed (or the learner confirms completion once all sections reach verified status)
- **THEN** the chapter MUST be recorded as completed in `UserStudyState`, and only when all chapters of the active module are completed SHALL the Official Module Comprehensive Exam unlock

#### Scenario: Keeping per-session practice quizzes freely accessible
- **WHEN** the learner accesses an individual session's quiz (`full`, `quick`, `error-notebook`, or subtopic filter) while studying or before finishing all chapters
- **THEN** session-level quizzes MUST remain available for learning and subtopic diagnostics without counting toward or consuming official Module Exam attempts

### Requirement: Official Module Comprehensive Exam capped at 40 questions
Once all sessions in an unlocked module are completed, the system SHALL enable Chance 1 of 3 of the Official Module Exam, assembling up to 40 representative questions balanced across every session of that module in strict exam mode (no instant answer reveal prior to submission).

#### Scenario: Generating Chance 1 of the Module Exam across all sessions
- **WHEN** the learner starts the Official Module Exam for a module whose total question bank exceeds 40 questions (e.g., Module 01 or Module 02)
- **THEN** the system MUST assemble an exam of exactly 40 questions (or all available questions if total `< 40`) distributed proportionally across all sessions of the module, prioritizing subtopics with lower practice mastery without revealing correctness until submission

#### Scenario: Passing on Chance 1 (>= 70%)
- **WHEN** the learner submits Chance 1 of the Module Exam and scores `>= 70%`
- **THEN** the module MUST immediately transition to `approved` status and unlock the next sequential module (`Module N + 1`)

### Requirement: Cycle consolidation with up to 2 Extra Recovery Exams (3 total chances)
If Chance 1 yields `< 70%`, the system SHALL preserve the learner's earned score in the active cycle and grant up to 2 Extra Recovery Exams (Chances 2/3 and 3/3, making 3 total chances in the cycle) composed exclusively of the missed items/subtopics, determining approval by consolidated cycle score (`>= 70%`).

#### Scenario: Generating Extra Recovery Exam 1 after failing Chance 1
- **WHEN** Chance 1 finishes with a score strictly below `70%`
- **THEN** the cycle MUST transition to Chance 2 of 3 ("1ª Prova Extra de Recuperação") containing one targeted item for each slot missed in Chance 1 (selecting an unseen sibling question from the same session and subtopic when available in the bank, or the original missed question otherwise)

#### Scenario: Passing through cycle consolidation on Chance 2 or Chance 3
- **WHEN** the learner submits Extra Exam 1 (Chance 2/3) or Extra Exam 2 (Chance 3/3) and the cumulative consolidated score across the cycle (`(Chance 1 correct + recovered slots) / total Chance 1 questions`) reaches `>= 70%`
- **THEN** the module MUST transition to `approved` status immediately and unlock `Module N + 1`

#### Scenario: Advancing from Chance 2 to Chance 3 when consolidated score remains below 70%
- **WHEN** Extra Exam 1 ends with a consolidated cycle score still `< 70%`
- **THEN** the cycle MUST advance to Chance 3 of 3 ("2ª Prova Extra de Recuperação") containing only the slots that remain unrecovered after Chance 2

### Requirement: Surgical mandatory restudy upon failing all 3 cycle chances
If the consolidated cycle score remains `< 70%` after the 3rd chance, the system SHALL block further Module Exam attempts for that module and mandate surgical restudy exclusively of the chapters whose session accuracy in that failed cycle was below `70%`.

#### Scenario: Triggering surgical restudy after Chance 3 remains below 70%
- **WHEN** Chance 3 finishes and the consolidated cycle score is still `< 70%`
- **THEN** the module MUST enter `re-study-required` state, identify every session whose consolidated accuracy in that cycle was `< 70%` (falling back to the lowest-accuracy session if rounding yields none), revoke completion and reset section reading progress exclusively for those flagged chapters using fresh timestamps, and block starting a new exam cycle until all flagged chapters are retraversed 100%

#### Scenario: Unlocking a fresh 3-chance cycle after surgical restudy completion
- **WHEN** the learner finishes retraversing 100% of all sections in every chapter flagged by `requiredRestudyChapterIds`
- **THEN** the system MUST clear the restudy lock and initialize a new 3-chance Module Exam cycle (`cycleNumber + 1`)

### Requirement: Sequential module locking and timestamp-safe Cloud Sync
Module 01 SHALL always be accessible; every subsequent Module `N` (`N >= 2`) SHALL remain locked across the Course Home cards, header module switcher, navigation handlers, and EPUB export until Module `N - 1` reaches `approved` (`>= 70%`) status, and all mastery gate and reading traversal timestamps SHALL synchronize cleanly with Firebase Firestore without losing backward compatibility or overwriting surgical restudy resets.

#### Scenario: Locking Module 02+ until the prior module is approved
- **WHEN** the learner has not yet reached `approved` (`>= 70%`) status in Module 01
- **THEN** Module 02 and subsequent modules MUST appear locked in Course Home (including disabling module entry and Kindle `.EPUB` export with a clear requirement indicator) and in the header `#module-switcher`, preventing entry until Module 01 is approved

#### Scenario: Reconciling surgical restudy resets across devices via Firebase Cloud Sync
- **WHEN** Device A fails 3 chances in a module and triggers a surgical restudy reset (clearing completion and reading progress for flagged chapters at timestamp `T2`), and subsequently merges with Device B state synced at an earlier timestamp `T1 < T2` where those chapters were previously `100%`
- **THEN** cloud state reconciliation MUST preserve the newer timestamped reset (`T2`) rather than overwriting it with older higher progress values (`T1`), while preserving compatibility with existing `study_state/default` documents lacking new fields
