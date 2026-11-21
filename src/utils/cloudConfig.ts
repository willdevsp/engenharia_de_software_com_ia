export const DEFAULT_ARCHIVE_BUCKET = 'engenharia-ia-mod01-audios';
const CLOUD_CONFIG_STORAGE_KEY = 'engenharia_ia_cloud_config_v1';

export interface CloudConfig {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  archiveAccessKey: string;
  archiveSecretKey: string;
  archiveBucket: string;
}

export interface EnvPresenceFlags {
  hasEnvFirebase: boolean;
  hasEnvArchive: boolean;
  hasEnvBucket: boolean;
}

export function cleanConfigValue(raw?: string): string {
  let cleaned = (raw || '').trim().replace(/[,;]+\s*$/, '').trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function sanitizeBucketName(raw: string): string {
  const cleaned = cleanConfigValue(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return cleaned;
}

export function getBuildEnvDefaults(): CloudConfig {
  return {
    firebaseApiKey: cleanConfigValue(import.meta.env.VITE_FIREBASE_API_KEY),
    firebaseAuthDomain: cleanConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    firebaseProjectId: cleanConfigValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    firebaseStorageBucket: cleanConfigValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    firebaseMessagingSenderId: cleanConfigValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    firebaseAppId: cleanConfigValue(import.meta.env.VITE_FIREBASE_APP_ID),
    archiveAccessKey: cleanConfigValue(import.meta.env.VITE_ARCHIVE_CLIENT_ID),
    archiveSecretKey: cleanConfigValue(import.meta.env.VITE_ARCHIVE_SECRETS),
    archiveBucket:
      sanitizeBucketName(import.meta.env.VITE_ARCHIVE_BUCKET || '') || DEFAULT_ARCHIVE_BUCKET
  };
}

export function getCloudConfigOverrides(): Partial<CloudConfig> {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Partial<CloudConfig>;
  } catch {
    return {};
  }
}

export function getCloudConfig(): CloudConfig {
  const defaults = getBuildEnvDefaults();
  const overrides = getCloudConfigOverrides();

  const pick = (overrideVal: string | undefined, defaultVal: string): string => {
    const trimmed = cleanConfigValue(overrideVal);
    return trimmed ? trimmed : defaultVal;
  };

  const rawBucket = pick(overrides.archiveBucket, defaults.archiveBucket);
  return {
    firebaseApiKey: pick(overrides.firebaseApiKey, defaults.firebaseApiKey),
    firebaseAuthDomain: pick(overrides.firebaseAuthDomain, defaults.firebaseAuthDomain),
    firebaseProjectId: pick(overrides.firebaseProjectId, defaults.firebaseProjectId),
    firebaseStorageBucket: pick(overrides.firebaseStorageBucket, defaults.firebaseStorageBucket),
    firebaseMessagingSenderId: pick(
      overrides.firebaseMessagingSenderId,
      defaults.firebaseMessagingSenderId
    ),
    firebaseAppId: pick(overrides.firebaseAppId, defaults.firebaseAppId),
    archiveAccessKey: pick(overrides.archiveAccessKey, defaults.archiveAccessKey),
    archiveSecretKey: pick(overrides.archiveSecretKey, defaults.archiveSecretKey),
    archiveBucket: sanitizeBucketName(rawBucket) || DEFAULT_ARCHIVE_BUCKET
  };
}

export function getEnvPresenceFlags(): EnvPresenceFlags {
  const defaults = getBuildEnvDefaults();
  return {
    hasEnvFirebase: Boolean(defaults.firebaseApiKey && defaults.firebaseProjectId),
    hasEnvArchive: Boolean(defaults.archiveAccessKey && defaults.archiveSecretKey),
    hasEnvBucket: Boolean((import.meta.env.VITE_ARCHIVE_BUCKET || '').trim())
  };
}

export function saveCloudConfigOverrides(overrides: Partial<CloudConfig>): void {
  const cleaned: Partial<CloudConfig> = {};
  for (const [k, v] of Object.entries(overrides) as [keyof CloudConfig, string | undefined][]) {
    const val = cleanConfigValue(v);
    if (!val) continue;
    cleaned[k] = k === 'archiveBucket' ? sanitizeBucketName(val) || DEFAULT_ARCHIVE_BUCKET : val;
  }
  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
  } else {
    localStorage.setItem(CLOUD_CONFIG_STORAGE_KEY, JSON.stringify(cleaned));
  }
}

export function clearCloudConfigOverrides(): void {
  localStorage.removeItem(CLOUD_CONFIG_STORAGE_KEY);
}

export function isFirebaseConfigured(cfg: CloudConfig = getCloudConfig()): boolean {
  return Boolean(cfg.firebaseApiKey && cfg.firebaseProjectId);
}

export function isArchiveConfigured(cfg: CloudConfig = getCloudConfig()): boolean {
  return Boolean(cfg.archiveAccessKey && cfg.archiveSecretKey && cfg.archiveBucket);
}
