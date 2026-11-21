import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getCloudConfig, isFirebaseConfigured } from './cloudConfig';

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedFingerprint: string | null = null;

export function resetFirebaseClient(): void {
  if (cachedApp) {
    const appToDelete = cachedApp;
    cachedApp = null;
    cachedDb = null;
    cachedFingerprint = null;
    void deleteApp(appToDelete).catch(() => {
      // Ignore cleanup errors when swapping Firebase configuration at runtime
    });
  } else {
    cachedDb = null;
    cachedFingerprint = null;
  }
}

export function getFirestoreDb(): Firestore | null {
  const cfg = getCloudConfig();
  if (!isFirebaseConfigured(cfg)) {
    return null;
  }

  const fingerprint = [
    cfg.firebaseApiKey,
    cfg.firebaseAuthDomain,
    cfg.firebaseProjectId,
    cfg.firebaseStorageBucket,
    cfg.firebaseMessagingSenderId,
    cfg.firebaseAppId
  ].join('|');

  if (cachedDb && cachedFingerprint === fingerprint) {
    return cachedDb;
  }

  if (cachedApp) {
    resetFirebaseClient();
  }

  const appName = `eng-ia-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  cachedApp = initializeApp(
    {
      apiKey: cfg.firebaseApiKey,
      authDomain: cfg.firebaseAuthDomain || undefined,
      projectId: cfg.firebaseProjectId,
      storageBucket: cfg.firebaseStorageBucket || undefined,
      messagingSenderId: cfg.firebaseMessagingSenderId || undefined,
      appId: cfg.firebaseAppId || undefined
    },
    appName
  );
  cachedDb = getFirestore(cachedApp);
  cachedFingerprint = fingerprint;
  return cachedDb;
}
