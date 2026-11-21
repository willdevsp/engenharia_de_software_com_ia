## Purpose

Defines uploading `.m4a` and `.mp3` session audio files to the Internet Archive IAS3 storage service, persisting and syncing their metadata in Firebase Firestore across Desktop and Android devices, supporting streaming playback with optional local offline caching, and managing configuration credentials safely without committing secrets.

## ADDED Requirements

### Requirement: Upload .m4a and .mp3 audio files to Internet Archive IAS3 and register in cloud database
The system SHALL allow the user to select a `.m4a` or `.mp3` audio file inside any session, upload the binary to the Internet Archive IAS3 endpoint using the configured `LOW <access>:<secret>` authorization with automatic item creation and disabled derivative queueing, and persist the resulting track metadata and public download URL (`https://archive.org/download/<bucket>/<fileName>`) in the cloud database (`session_audios`).

#### Scenario: Uploading an audio file on Desktop
- **WHEN** the user selects a valid `.m4a` or `.mp3` file on Desktop with Archive.org and Firebase credentials configured and submits the upload
- **THEN** the system MUST upload the binary via the local CORS-safe proxy without altering bytes, persist the track metadata and public `audioUrl` in Firebase Firestore, keep a local offline cache copy immediately playable on that device, and display the track in the session audio list

#### Scenario: Uploading an audio file on Android APK
- **WHEN** the user selects a valid `.m4a` or `.mp3` file inside the Android app and submits the upload
- **THEN** the system MUST stream the binary natively to the IAS3 endpoint bypassing browser CORS restrictions and avoiding full-file memory duplication, save the metadata in Firebase Firestore, and display the track in the session list

#### Scenario: Rejecting unsupported audio formats
- **WHEN** the user attempts to upload a file that is neither `.m4a` nor `.mp3`
- **THEN** the system MUST reject the upload before any network call and display an error message stating that only `.m4a` and `.mp3` formats are supported

### Requirement: Cross-device session audio listing with offline metadata fallback
The system SHALL synchronize the list of registered audio tracks for each session from Firebase Firestore across Desktop and Android devices, while caching metadata locally so the session track list remains visible when the device is offline.

#### Scenario: Viewing tracks uploaded from another device
- **WHEN** the user uploads an audio track in Session 1.2 on Desktop and later opens Session 1.2 on Android while online
- **THEN** the Android session audio list MUST display the uploaded track with its title, format, size, and playback readiness

### Requirement: Streaming playback with optional per-track offline caching and cache clearing
The system SHALL play cloud-synced audio tracks via streaming from their Archive.org `audioUrl` by default, or from local device storage if cached offline. Each track MUST offer an action to download for offline playback ("Baixar Offline") and an action to clear the local cached binary ("Limpar Cache") without deleting the cloud metadata.

#### Scenario: Downloading a cloud track for offline playback
- **WHEN** the user clicks "Baixar Offline" on a streaming audio track
- **THEN** the system MUST download the audio binary into the device's local storage, mark the track as "Offline Pronto", and serve subsequent plays locally without requiring internet access

#### Scenario: Clearing local offline cache
- **WHEN** the user clicks "Limpar Cache" on a cached track
- **THEN** the system MUST delete only the local cached binary to free device storage, revert the track badge to "Streaming", and preserve the Firestore record

### Requirement: Removing an audio deletes only the Firebase Firestore record and local cache
When the user removes an audio track from a session, the system SHALL delete the metadata document from Firebase Firestore and remove any local cached copy on the device, and SHALL NOT send any `DELETE` request to Internet Archive IAS3.

#### Scenario: Deleting a track from a session
- **WHEN** the user clicks remove on a synced audio track and confirms deletion
- **THEN** the system MUST delete the document in Firebase Firestore and delete the local cache file if present, without deleting the file from Archive.org, and stop playback if that track was playing

### Requirement: Safe credential loading from .env.local and runtime Settings modal
The system SHALL read Firebase configuration keys and Archive.org credentials from `.env.local` without committing secrets to source control, provide a non-secret `.env.example` template, and expose a Settings UI allowing the user to configure or update the Archive.org bucket identifier and override credentials locally.

#### Scenario: Updating the Archive.org bucket in Settings
- **WHEN** the user opens the Settings modal, sets a bucket identifier (or credential override), and saves
- **THEN** subsequent IAS3 uploads MUST target the configured bucket and persist the settings locally on that device
