import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import type { CloudAudioMetadata, CloudSyncStatus, UserStudyState } from '../types/course';
import { isFirebaseConfigured } from './cloudConfig';
import { getFirestoreDb } from './firebaseClient';
import { areStudyStatesEqual, mergeStudyStates, saveStudyState } from './storage';

const STUDY_STATE_COLLECTION = 'study_state';
const STUDY_STATE_DOC_ID = 'default';
const SESSION_AUDIOS_COLLECTION = 'session_audios';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

function formatFirestoreError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Erro ao comunicar com o Firebase Firestore.';
  }
  const code = 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  const msg = 'message' in err ? String((err as { message?: unknown }).message || '') : '';

  if (code.includes('permission-denied') || msg.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Permissão negada no Firestore. Verifique as Regras de Segurança (em Configurações > Ajuda Firestore).';
  }
  if (code.includes('unavailable') || code.includes('failed-precondition') || msg.toLowerCase().includes('offline')) {
    return 'Sem conexão estável com o Firestore; alterações salvas localmente.';
  }
  return msg || 'Erro ao sincronizar com o Firebase Firestore.';
}

export interface StudySyncResult {
  state: UserStudyState;
  status: CloudSyncStatus;
  error?: string;
}

export async function syncStudyStateWithCloud(localState: UserStudyState): Promise<StudySyncResult> {
  if (!isFirebaseConfigured()) {
    return { state: localState, status: 'unconfigured' };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { state: localState, status: 'offline', error: 'Dispositivo offline.' };
  }

  const db = getFirestoreDb();
  if (!db) {
    return { state: localState, status: 'unconfigured' };
  }

  try {
    const stateRef = doc(db, STUDY_STATE_COLLECTION, STUDY_STATE_DOC_ID);
    const snap = await getDoc(stateRef);

    let mergedState = localState;
    let shouldPush = false;

    if (snap.exists()) {
      const remoteRaw = snap.data() as Partial<UserStudyState>;
      const remoteState: UserStudyState = {
        version: 1,
        lastUpdated: remoteRaw.lastUpdated || '',
        completedChapters: Array.isArray(remoteRaw.completedChapters)
          ? remoteRaw.completedChapters
          : [],
        chapterCompletionLog:
          remoteRaw.chapterCompletionLog && typeof remoteRaw.chapterCompletionLog === 'object'
            ? remoteRaw.chapterCompletionLog
            : {},
        readingProgress: remoteRaw.readingProgress || {},
        bookmarkedQuestions: Array.isArray(remoteRaw.bookmarkedQuestions)
          ? remoteRaw.bookmarkedQuestions
          : [],
        quizAttempts: Array.isArray(remoteRaw.quizAttempts) ? remoteRaw.quizAttempts : [],
        audioPositions:
          remoteRaw.audioPositions && typeof remoteRaw.audioPositions === 'object'
            ? remoteRaw.audioPositions
            : {}
      };

      mergedState = mergeStudyStates(localState, remoteState);
      shouldPush = !areStudyStatesEqual(mergedState, remoteState);
    } else {
      shouldPush = true;
    }

    if (shouldPush) {
      await setDoc(stateRef, stripUndefined(mergedState));
    }

    saveStudyState(mergedState, true);
    return { state: mergedState, status: 'synced' };
  } catch (err) {
    return {
      state: localState,
      status: 'offline',
      error: formatFirestoreError(err)
    };
  }
}

export async function fetchCloudAudios(sessionId?: string): Promise<CloudAudioMetadata[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Dispositivo offline.');
  }

  const db = getFirestoreDb();
  if (!db) {
    return [];
  }

  try {
    const colRef = collection(db, SESSION_AUDIOS_COLLECTION);
    // Avoid orderBy in query so no composite Firestore index is required
    const q = sessionId ? query(colRef, where('sessionId', '==', sessionId)) : colRef;
    const snap = await getDocs(q);

    const list: CloudAudioMetadata[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<CloudAudioMetadata>;
      if (!data.sessionId || !data.audioUrl) return;
      list.push({
        id: data.id || docSnap.id,
        moduleId: Number(data.moduleId) || 1,
        sessionId: String(data.sessionId),
        title: String(data.title || data.fileName || 'Áudio da Sessão'),
        fileName: String(data.fileName || `${docSnap.id}.${data.format || 'm4a'}`),
        archiveFileName: String(data.archiveFileName || data.fileName || ''),
        format: data.format === 'mp3' ? 'mp3' : 'm4a',
        mimeType: String(data.mimeType || (data.format === 'mp3' ? 'audio/mpeg' : 'audio/mp4')),
        sizeBytes: Number(data.sizeBytes) || 0,
        archiveBucket: String(data.archiveBucket || ''),
        audioUrl: String(data.audioUrl),
        createdAt: String(data.createdAt || new Date().toISOString())
      });
    });

    return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch (err) {
    throw new Error(formatFirestoreError(err));
  }
}

export async function saveCloudAudioMetadata(meta: CloudAudioMetadata): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore não configurado.');
  }
  try {
    await setDoc(doc(db, SESSION_AUDIOS_COLLECTION, meta.id), stripUndefined(meta));
  } catch (err) {
    throw new Error(formatFirestoreError(err));
  }
}

export async function deleteCloudAudioMetadata(audioId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase Firestore não configurado.');
  }
  try {
    // Delete ONLY the Firestore document; Archive.org file is never deleted.
    await deleteDoc(doc(db, SESSION_AUDIOS_COLLECTION, audioId));
  } catch (err) {
    throw new Error(formatFirestoreError(err));
  }
}
