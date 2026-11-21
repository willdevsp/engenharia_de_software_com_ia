/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_ARCHIVE_CLIENT_ID?: string;
  readonly VITE_ARCHIVE_SECRETS?: string;
  readonly VITE_ARCHIVE_BUCKET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
