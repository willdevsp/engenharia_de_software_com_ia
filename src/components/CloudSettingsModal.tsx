import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  Database,
  HelpCircle,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  clearCloudConfigOverrides,
  DEFAULT_ARCHIVE_BUCKET,
  getCloudConfig,
  getCloudConfigOverrides,
  getEnvPresenceFlags,
  sanitizeBucketName,
  saveCloudConfigOverrides
} from '../utils/cloudConfig';
import { resetFirebaseClient } from '../utils/firebaseClient';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /session_audios/{audioId} {
      allow read, write: if true;
    }
    match /study_state/{profileId} {
      allow read, write: if true;
    }
  }
}`;

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [archiveBucket, setArchiveBucket] = useState<string>(DEFAULT_ARCHIVE_BUCKET);
  const [showCredentialOverrides, setShowCredentialOverrides] = useState<boolean>(false);
  const [showFirestoreHelp, setShowFirestoreHelp] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Override fields (never pre-populated with raw .env.local secrets)
  const [archiveAccessKey, setArchiveAccessKey] = useState<string>('');
  const [archiveSecretKey, setArchiveSecretKey] = useState<string>('');
  const [firebaseApiKey, setFirebaseApiKey] = useState<string>('');
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState<string>('');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState<string>('');
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState<string>('');
  const [firebaseAppId, setFirebaseAppId] = useState<string>('');

  const envFlags = getEnvPresenceFlags();

  useEffect(() => {
    if (!isOpen) return;
    const cfg = getCloudConfig();
    const overrides = getCloudConfigOverrides();
    setArchiveBucket(overrides.archiveBucket || cfg.archiveBucket || DEFAULT_ARCHIVE_BUCKET);
    setArchiveAccessKey(overrides.archiveAccessKey || '');
    setArchiveSecretKey(overrides.archiveSecretKey || '');
    setFirebaseApiKey(overrides.firebaseApiKey || '');
    setFirebaseProjectId(overrides.firebaseProjectId || '');
    setFirebaseAuthDomain(overrides.firebaseAuthDomain || '');
    setFirebaseStorageBucket(overrides.firebaseStorageBucket || '');
    setFirebaseMessagingSenderId(overrides.firebaseMessagingSenderId || '');
    setFirebaseAppId(overrides.firebaseAppId || '');
    setCopiedRules(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const sanitizedPreview = sanitizeBucketName(archiveBucket) || DEFAULT_ARCHIVE_BUCKET;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCloudConfigOverrides({
      archiveBucket: sanitizedPreview,
      archiveAccessKey,
      archiveSecretKey,
      firebaseApiKey,
      firebaseProjectId,
      firebaseAuthDomain,
      firebaseStorageBucket,
      firebaseMessagingSenderId,
      firebaseAppId
    });
    resetFirebaseClient();
    onConfigSaved();
    onClose();
  };

  const handleRestoreDefaults = () => {
    clearCloudConfigOverrides();
    resetFirebaseClient();
    const cfg = getCloudConfig();
    setArchiveBucket(cfg.archiveBucket || DEFAULT_ARCHIVE_BUCKET);
    setArchiveAccessKey('');
    setArchiveSecretKey('');
    setFirebaseApiKey('');
    setFirebaseProjectId('');
    setFirebaseAuthDomain('');
    setFirebaseStorageBucket('');
    setFirebaseMessagingSenderId('');
    setFirebaseAppId('');
    onConfigSaved();
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2000);
    } catch {
      // Clipboard may be blocked; snippet remains visible for manual copy
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Configurações de Nuvem & Áudio</h2>
              <p className="text-xs text-slate-400">
                Archive.org IAS3 + Firebase Firestore (Desktop & Android)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
            aria-label="Fechar Configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Environment Status Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Firebase Firestore (.env.local)</span>
              </div>
              {envFlags.hasEnvFirebase ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Chaves carregadas do build local
                </div>
              ) : (
                <div className="text-xs text-amber-700 font-medium">
                  Não detectado no build — informe abaixo se necessário
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                <Cloud className="w-4 h-4 text-indigo-600" />
                <span>Archive.org IAS3 (.env.local)</span>
              </div>
              {envFlags.hasEnvArchive ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Chaves S3 carregadas do build local
                </div>
              ) : (
                <div className="text-xs text-amber-700 font-medium">
                  Não detectado no build — informe abaixo se necessário
                </div>
              )}
            </div>
          </div>

          {/* Archive.org Bucket */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-indigo-950">
              Bucket / Item Identifier no Archive.org
            </label>
            <input
              type="text"
              value={archiveBucket}
              onChange={(e) => setArchiveBucket(e.target.value)}
              placeholder={DEFAULT_ARCHIVE_BUCKET}
              className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-600">
              Identificador sanitizado:{' '}
              <code className="px-1.5 py-0.5 rounded bg-white border border-indigo-200 text-indigo-900 font-mono">
                {sanitizedPreview}
              </code>
            </p>
            <p className="text-[11px] text-slate-500">
              URL pública gerada: https://archive.org/download/{sanitizedPreview}/arquivo.m4a
            </p>
          </div>

          {/* Optional Runtime Credential Overrides */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCredentialOverrides((v) => !v)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Sobrescrever Credenciais neste Dispositivo (opcional)
              </span>
              {showCredentialOverrides ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showCredentialOverrides && (
              <div className="p-4 space-y-3 bg-white border-t border-slate-200">
                <p className="text-[11px] text-slate-500">
                  Deixe em branco para usar automaticamente os valores embutidos a partir do{' '}
                  <code>.env.local</code>. Útil caso queira trocar chaves direto no celular Android.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ARCHIVE_CLIENT_ID (Access Key)
                    </label>
                    <input
                      type="text"
                      value={archiveAccessKey}
                      onChange={(e) => setArchiveAccessKey(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ARCHIVE_SECRETS (Secret Key)
                    </label>
                    <input
                      type="password"
                      value={archiveSecretKey}
                      onChange={(e) => setArchiveSecretKey(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_PROJECT_ID
                    </label>
                    <input
                      type="text"
                      value={firebaseProjectId}
                      onChange={(e) => setFirebaseProjectId(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_API_KEY
                    </label>
                    <input
                      type="password"
                      value={firebaseApiKey}
                      onChange={(e) => setFirebaseApiKey(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_AUTH_DOMAIN
                    </label>
                    <input
                      type="text"
                      value={firebaseAuthDomain}
                      onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_APP_ID
                    </label>
                    <input
                      type="text"
                      value={firebaseAppId}
                      onChange={(e) => setFirebaseAppId(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_STORAGE_BUCKET
                    </label>
                    <input
                      type="text"
                      value={firebaseStorageBucket}
                      onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      FIREBASE_MESSAGING_SENDER_ID
                    </label>
                    <input
                      type="text"
                      value={firebaseMessagingSenderId}
                      onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                      placeholder="Manter padrão do build"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Firestore Security Rules Setup Help */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFirestoreHelp((v) => !v)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Ajuda: Regras do Firebase Firestore (Banco Recém-Criado)
              </span>
              {showFirestoreHelp ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showFirestoreHelp && (
              <div className="p-4 space-y-2.5 bg-white border-t border-slate-200 text-xs text-slate-700">
                <p>
                  No Firebase Console: <strong>Firestore Database &rarr; Regras (Rules)</strong>,
                  cole e publique as regras abaixo para habilitar as coleções{' '}
                  <code>session_audios</code> e <code>study_state</code> (não é necessário criar
                  índices compostos nem documentos manuais):
                </p>
                <div className="relative">
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {FIRESTORE_RULES_SNIPPET}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedRules ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrões (.env.local)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar e Sincronizar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
