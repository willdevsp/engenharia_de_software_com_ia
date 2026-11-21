import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { CloudAudioMetadata, SessionAudioTrack } from '../types/course';
import { downloadAudioBinaryFromArchive, uploadAudioToArchive } from './archiveUpload';
import { isArchiveConfigured, isFirebaseConfigured } from './cloudConfig';
import {
  deleteCloudAudioMetadata,
  fetchCloudAudios,
  saveCloudAudioMetadata
} from './cloudSync';

const AUDIO_META_STORAGE_KEY = 'engenharia_ia_audio_meta_v1';
const IDB_NAME = 'engenharia_ia_audios_db';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'audio_blobs';
const ANDROID_AUDIO_DIR = 'session-audios';

const ALLOWED_FALLBACK_MIMES: Record<string, { format: 'mp3' | 'm4a'; mimeType: string }> = {
  'audio/mpeg': { format: 'mp3', mimeType: 'audio/mpeg' },
  'audio/mp3': { format: 'mp3', mimeType: 'audio/mpeg' },
  'audio/mp4': { format: 'm4a', mimeType: 'audio/mp4' },
  'audio/x-m4a': { format: 'm4a', mimeType: 'audio/mp4' },
  'audio/m4a': { format: 'm4a', mimeType: 'audio/mp4' },
  'audio/aac': { format: 'm4a', mimeType: 'audio/mp4' }
};

export type AudioValidationResult =
  | { valid: true; format: 'mp3' | 'm4a'; mimeType: string }
  | { valid: false; error: string };

export function isNativeAudioStorage(): boolean {
  return Capacitor.isNativePlatform();
}

export function validateAudioFile(file: File): AudioValidationResult {
  const lowerName = (file.name || '').trim().toLowerCase();
  const extMatch = lowerName.match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  if (ext === 'mp3') {
    return { valid: true, format: 'mp3', mimeType: 'audio/mpeg' };
  }
  if (ext === 'm4a') {
    return { valid: true, format: 'm4a', mimeType: 'audio/mp4' };
  }

  // Fallback for content URIs without file extension on Android file pickers
  const normalizedMime = (file.type || '').trim().toLowerCase();
  if (!ext && normalizedMime && ALLOWED_FALLBACK_MIMES[normalizedMime]) {
    const mapped = ALLOWED_FALLBACK_MIMES[normalizedMime];
    return { valid: true, format: mapped.format, mimeType: mapped.mimeType };
  }

  return {
    valid: false,
    error: 'Formato não suportado. Apenas arquivos .m4a e .mp3 são aceitos.'
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function listAllAudios(): SessionAudioTrack[] {
  try {
    const raw = localStorage.getItem(AUDIO_META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllAudioMetadata(tracks: SessionAudioTrack[]): void {
  localStorage.setItem(AUDIO_META_STORAGE_KEY, JSON.stringify(tracks));
}

export function listSessionAudios(sessionId: string): SessionAudioTrack[] {
  return listAllAudios()
    .filter((t) => t.sessionId === sessionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateAudioPosition(trackId: string, seconds: number): void {
  const cleanSeconds = Math.max(0, Math.floor(seconds));
  const all = listAllAudios();
  const idx = all.findIndex((t) => t.id === trackId);
  if (idx === -1) return;
  if (all[idx].lastPositionSeconds === cleanSeconds) return;
  all[idx] = { ...all[idx], lastPositionSeconds: cleanSeconds };
  saveAllAudioMetadata(all);
}

function getNativeCachePath(trackId: string, format: 'mp3' | 'm4a'): string {
  return `${ANDROID_AUDIO_DIR}/${trackId}.${format}`;
}

function getTrackNativePath(track: SessionAudioTrack): string {
  if (track.storageBackend === 'capacitor-fs' && track.storageKey) {
    return track.storageKey;
  }
  return getNativeCachePath(track.id, track.format);
}

function getTrackIndexedDbKey(track: SessionAudioTrack): string {
  if (track.source === 'local' && track.storageKey) {
    return track.storageKey;
  }
  return track.id;
}

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB de áudios.'));
  });
}

async function putBlobInIndexedDb(key: string, blob: Blob): Promise<void> {
  const db = await openAudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Erro ao gravar áudio no IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

async function getBlobFromIndexedDb(key: string): Promise<Blob | null> {
  const db = await openAudioDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error || new Error('Erro ao ler áudio do IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

async function hasBlobInIndexedDb(key: string): Promise<boolean> {
  const db = await openAudioDatabase();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getKey(key);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => reject(req.error || new Error('Erro ao verificar cache IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

async function deleteBlobFromIndexedDb(key: string): Promise<void> {
  const db = await openAudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Erro ao remover áudio do IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

function readFileAsBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const stripped = result.replace(/^data:[^;]+;base64,/, '');
      resolve(stripped);
    };
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo de áudio.'));
    reader.readAsDataURL(file);
  });
}

function deriveDefaultTitle(fileName: string): string {
  const trimmed = (fileName || 'Áudio da Sessão').trim();
  const withoutExt = trimmed.replace(/\.(mp3|m4a)$/i, '');
  return withoutExt || trimmed;
}

export async function hasLocalAudioCache(track: SessionAudioTrack): Promise<boolean> {
  if (isNativeAudioStorage()) {
    try {
      const nativePath = getTrackNativePath(track);
      await Filesystem.stat({
        path: nativePath,
        directory: Directory.Data
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    return await hasBlobInIndexedDb(getTrackIndexedDbKey(track));
  } catch {
    return false;
  }
}

async function saveLocalAudioBinary(
  trackId: string,
  format: 'mp3' | 'm4a',
  mimeType: string,
  fileOrBlob: File | Blob
): Promise<{ storageBackend: 'capacitor-fs' | 'indexeddb'; storageKey: string }> {
  if (isNativeAudioStorage()) {
    const storageKey = getNativeCachePath(trackId, format);
    const base64Data = await readFileAsBase64(fileOrBlob);
    await Filesystem.writeFile({
      path: storageKey,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    });
    return { storageBackend: 'capacitor-fs', storageKey };
  }

  const blob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob], { type: mimeType });
  await putBlobInIndexedDb(trackId, blob);
  return { storageBackend: 'indexeddb', storageKey: trackId };
}

async function deleteLocalAudioBinary(track: SessionAudioTrack): Promise<void> {
  if (isNativeAudioStorage()) {
    try {
      await Filesystem.deleteFile({
        path: getTrackNativePath(track),
        directory: Directory.Data
      });
    } catch {
      // Missing file on disk is safe to ignore
    }
    return;
  }

  try {
    await deleteBlobFromIndexedDb(getTrackIndexedDbKey(track));
  } catch {
    // Missing IndexedDB key is safe to ignore
  }
}

function upsertTrackInMirror(track: SessionAudioTrack): void {
  const all = listAllAudios();
  const filtered = all.filter((t) => t.id !== track.id);
  saveAllAudioMetadata([track, ...filtered]);
}

function mapCloudMetaToTrack(
  meta: CloudAudioMetadata,
  existing?: SessionAudioTrack
): SessionAudioTrack {
  const native = isNativeAudioStorage();
  return {
    id: meta.id,
    moduleId: meta.moduleId || 1,
    sessionId: meta.sessionId,
    title: meta.title,
    fileName: meta.fileName,
    archiveFileName: meta.archiveFileName,
    format: meta.format,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    source: 'cloud',
    archiveBucket: meta.archiveBucket,
    audioUrl: meta.audioUrl,
    storageBackend: existing?.isCachedOffline
      ? native
        ? 'capacitor-fs'
        : 'indexeddb'
      : 'archive-cloud',
    storageKey: native ? getNativeCachePath(meta.id, meta.format) : meta.id,
    isCachedOffline: existing?.isCachedOffline ?? false,
    lastPositionSeconds: existing?.lastPositionSeconds ?? 0,
    createdAt: meta.createdAt
  };
}

export interface SyncSessionAudiosResult {
  tracks: SessionAudioTrack[];
  fromCloud: boolean;
  error?: string;
}

export async function syncSessionAudios(
  sessionId: string
): Promise<SyncSessionAudiosResult> {
  const allLocal = listAllAudios();
  const existingInSession = allLocal.filter((t) => t.sessionId === sessionId);
  const existingById = new Map(existingInSession.map((t) => [t.id, t]));

  let sessionTracks: SessionAudioTrack[] = existingInSession;
  let fromCloud = false;
  let syncError: string | undefined;

  if (isFirebaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      const remoteDocs = await fetchCloudAudios(sessionId);
      const legacyLocalTracks = existingInSession.filter(
        (t) => t.source === 'local' || (!t.source && !t.audioUrl)
      );
      const mappedCloudTracks = remoteDocs.map((doc) =>
        mapCloudMetaToTrack(doc, existingById.get(doc.id))
      );

      sessionTracks = [...mappedCloudTracks, ...legacyLocalTracks];
      fromCloud = true;
    } catch (err) {
      syncError = err instanceof Error ? err.message : 'Erro ao sincronizar lista de áudios.';
    }
  }

  // Evaluate actual local binary cache availability on this device
  const verifiedTracks = await Promise.all(
    sessionTracks.map(async (track) => {
      const cached = await hasLocalAudioCache(track);
      const native = isNativeAudioStorage();
      return {
        ...track,
        isCachedOffline: cached,
        storageBackend: cached
          ? ((native ? 'capacitor-fs' : 'indexeddb') as SessionAudioTrack['storageBackend'])
          : track.source === 'cloud'
          ? ('archive-cloud' as const)
          : track.storageBackend,
        storageKey: cached && native ? getTrackNativePath(track) : track.storageKey || track.id
      };
    })
  );

  verifiedTracks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const otherSessionTracks = allLocal.filter((t) => t.sessionId !== sessionId);
  saveAllAudioMetadata([...verifiedTracks, ...otherSessionTracks]);

  return {
    tracks: verifiedTracks,
    fromCloud,
    error: syncError
  };
}

export async function uploadAndSaveSessionAudio(
  sessionId: string,
  file: File,
  customTitle?: string,
  onStageChange?: (stage: string) => void
): Promise<SessionAudioTrack> {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!isArchiveConfigured()) {
    throw new Error(
      'Credenciais do Archive.org (IAS3) não configuradas. Preencha o .env.local ou abra o botão Configurações (ícone de engrenagem).'
    );
  }
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase Firestore não configurado. Preencha o .env.local ou abra o botão Configurações.'
    );
  }

  const trackId = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = (customTitle || '').trim() || deriveDefaultTitle(file.name);
  const createdAt = new Date().toISOString();

  onStageChange?.('Salvando cópia offline local...');
  const { storageBackend, storageKey } = await saveLocalAudioBinary(
    trackId,
    validation.format,
    validation.mimeType,
    file
  );

  const draftTrack: SessionAudioTrack = {
    id: trackId,
    moduleId: 1,
    sessionId,
    title,
    fileName: file.name || `${trackId}.${validation.format}`,
    format: validation.format,
    mimeType: validation.mimeType,
    sizeBytes: file.size,
    storageBackend,
    storageKey,
    source: 'cloud',
    isCachedOffline: true,
    lastPositionSeconds: 0,
    createdAt
  };

  try {
    onStageChange?.('Enviando áudio para Archive.org (IAS3)...');
    const uploaded = await uploadAudioToArchive({
      file,
      sessionId,
      format: validation.format,
      mimeType: validation.mimeType,
      localRelativePath: isNativeAudioStorage() ? storageKey : undefined
    });

    onStageChange?.('Registrando metadados no Firebase Firestore...');
    const cloudMeta: CloudAudioMetadata = {
      id: trackId,
      moduleId: 1,
      sessionId,
      title,
      fileName: draftTrack.fileName,
      archiveFileName: uploaded.archiveFileName,
      format: validation.format,
      mimeType: validation.mimeType,
      sizeBytes: file.size,
      archiveBucket: uploaded.archiveBucket,
      audioUrl: uploaded.audioUrl,
      createdAt
    };

    await saveCloudAudioMetadata(cloudMeta);

    const finalTrack: SessionAudioTrack = {
      ...draftTrack,
      archiveBucket: uploaded.archiveBucket,
      archiveFileName: uploaded.archiveFileName,
      audioUrl: uploaded.audioUrl
    };

    upsertTrackInMirror(finalTrack);
    return finalTrack;
  } catch (err) {
    // Cleanup temporary local cache copy so failed upload leaves no orphan binary
    await deleteLocalAudioBinary(draftTrack);
    throw err;
  }
}

export async function saveSessionAudio(
  sessionId: string,
  file: File,
  customTitle?: string
): Promise<SessionAudioTrack> {
  return uploadAndSaveSessionAudio(sessionId, file, customTitle);
}

export async function resolveAudioPlaybackUrl(
  track: SessionAudioTrack
): Promise<{ url: string; isObjectUrl: boolean; mode: 'offline' | 'streaming' }> {
  const cached = await hasLocalAudioCache(track);

  if (cached) {
    if (isNativeAudioStorage()) {
      const { uri } = await Filesystem.getUri({
        path: getTrackNativePath(track),
        directory: Directory.Data
      });
      return {
        url: Capacitor.convertFileSrc(uri),
        isObjectUrl: false,
        mode: 'offline'
      };
    }

    const blob = await getBlobFromIndexedDb(getTrackIndexedDbKey(track));
    if (blob) {
      return {
        url: URL.createObjectURL(blob),
        isObjectUrl: true,
        mode: 'offline'
      };
    }
  }

  if (track.audioUrl) {
    return {
      url: track.audioUrl,
      isObjectUrl: false,
      mode: 'streaming'
    };
  }

  throw new Error('Arquivo de áudio não encontrado no cache local nem na URL da nuvem.');
}

export async function cacheCloudAudioOffline(
  track: SessionAudioTrack
): Promise<SessionAudioTrack> {
  if (!track.audioUrl) {
    throw new Error('Esta faixa não possui URL pública do Archive.org para download.');
  }

  const native = isNativeAudioStorage();
  const nativePath = getNativeCachePath(track.id, track.format);

  const result = await downloadAudioBinaryFromArchive({
    audioUrl: track.audioUrl,
    archiveBucket: track.archiveBucket,
    archiveFileName: track.archiveFileName,
    destRelativePath: native ? nativePath : undefined
  });

  if (!native && result.blob) {
    await putBlobInIndexedDb(track.id, result.blob);
  }

  const updated: SessionAudioTrack = {
    ...track,
    isCachedOffline: true,
    storageBackend: native ? 'capacitor-fs' : 'indexeddb',
    storageKey: native ? nativePath : track.id
  };
  upsertTrackInMirror(updated);
  return updated;
}

export async function clearLocalAudioCache(
  track: SessionAudioTrack
): Promise<SessionAudioTrack> {
  await deleteLocalAudioBinary(track);

  const updated: SessionAudioTrack = {
    ...track,
    isCachedOffline: false,
    storageBackend: track.source === 'cloud' || track.audioUrl ? 'archive-cloud' : track.storageBackend
  };
  upsertTrackInMirror(updated);
  return updated;
}

export async function deleteSessionAudio(
  trackOrId: SessionAudioTrack | string
): Promise<void> {
  const all = listAllAudios();
  const target =
    typeof trackOrId === 'string' ? all.find((t) => t.id === trackOrId) : trackOrId;

  if (!target) return;

  if (target.source === 'cloud' || target.audioUrl) {
    // Delete ONLY from Firebase Firestore; NEVER call Archive.org DELETE.
    await deleteCloudAudioMetadata(target.id);
  }

  await deleteLocalAudioBinary(target);

  const remaining = listAllAudios().filter((t) => t.id !== target.id);
  saveAllAudioMetadata(remaining);
}
