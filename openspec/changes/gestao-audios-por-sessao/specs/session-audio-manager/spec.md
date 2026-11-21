## Purpose

Defines local audio management per course session, enabling the learner to add, list, select, play (with playback controls and resume position), and remove `.m4a` and `.mp3` audio files locally on Desktop and Android without committing binaries to Git, bundling them in the APK, or altering the Kindle EPUB export.

## ADDED Requirements

### Requirement: Register and persist local audio files (.m4a and .mp3) per session
The system SHALL allow the user to upload/register one or more local audio files in `.m4a` or `.mp3` format directly inside any course session, optionally specifying a custom display title. Registered audio files MUST persist across app restarts locally on the device (IndexedDB on Desktop; internal app storage on Android) without committing audio binaries to Git or embedding them into the APK bundle.

#### Scenario: Adding an .m4a or .mp3 audio to a session
- **WHEN** the user selects a valid `.m4a` or `.mp3` file in Session 1.2 and confirms registration
- **THEN** the system MUST store the audio locally on the device, persist its metadata linked to Session 1.2 (including title, file name, MIME type, and file size), and immediately display it in that session's audio list

#### Scenario: Rejecting unsupported audio formats
- **WHEN** the user attempts to register a file that is neither `.m4a` nor `.mp3`
- **THEN** the system MUST reject the file and display a clear error message stating that only `.m4a` and `.mp3` formats are supported

### Requirement: List, select, and play session audio with playback controls
When a session has one or more registered audio files, the system SHALL display them in a selectable list showing each track's title and file size. Selecting a track from the list MUST load it into an integrated audio player supporting play/pause, timeline scrubbing, skip `-15s` / `+15s`, playback speed selection (`1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`), and automatic persistence of the last playback position.

#### Scenario: Selecting and playing an audio track from the session list
- **WHEN** the user clicks on a track in the session's audio list
- **THEN** the integrated player MUST load and play that track offline from local device storage, restoring the previously saved playback position if available

### Requirement: Remove registered audio files and reclaim device storage
The system SHALL allow the user to remove any registered audio file from a session. Removing an audio track MUST delete both its metadata and its underlying binary file from local device storage (IndexedDB record on Desktop or internal filesystem file on Android) and stop playback if the removed track was currently active.

#### Scenario: Deleting an audio track from a session
- **WHEN** the user clicks the remove action on a registered audio track and confirms deletion
- **THEN** the system MUST remove the track from the session list, delete the binary file from local storage to free device space, and reset the player if that track was playing

### Requirement: Kindle EPUB export remains unaffected
The Kindle Colorsoft `.EPUB` generator SHALL NOT embed or depend on locally registered `.m4a` or `.mp3` audio files.

#### Scenario: Building the Kindle EPUB after registering local session audio
- **WHEN** the user runs the Kindle EPUB build after adding audio files on Desktop
- **THEN** the generated `.EPUB` MUST remain free of audio binaries and compile normally
