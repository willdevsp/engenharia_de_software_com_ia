import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Cloud,
  Download,
  HardDrive,
  Headphones,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import type { AudioPositionEntry, SessionAudioTrack } from '../types/course';
import {
  cacheCloudAudioOffline,
  clearLocalAudioCache,
  deleteSessionAudio,
  formatFileSize,
  isNativeAudioStorage,
  listSessionAudios,
  resolveAudioPlaybackUrl,
  syncSessionAudios,
  updateAudioPosition,
  uploadAndSaveSessionAudio,
  validateAudioFile
} from '../utils/audioStorage';
import { getCloudConfig, isArchiveConfigured, isFirebaseConfigured } from '../utils/cloudConfig';

interface SessionAudioPanelProps {
  moduleId?: number;
  sessionId: string;
  sessionTitle: string;
  onTracksCountChange?: (count: number) => void;
  syncedAudioPositions?: Record<string, AudioPositionEntry>;
  onAudioPositionChange?: (trackId: string, seconds: number) => void;
  onOpenCloudSettings?: () => void;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0];

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const SessionAudioPanel: React.FC<SessionAudioPanelProps> = ({
  moduleId,
  sessionId,
  sessionTitle,
  onTracksCountChange,
  syncedAudioPositions,
  onAudioPositionChange,
  onOpenCloudSettings
}) => {
  const [tracks, setTracks] = useState<SessionAudioTrack[]>(() => listSessionAudios(sessionId));
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => {
    const initial = listSessionAudios(sessionId);
    return initial.length > 0 ? initial[0].id : null;
  });

  // Cloud sync & cache operation state
  const [isSyncingList, setIsSyncingList] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [cachingTrackId, setCachingTrackId] = useState<string | null>(null);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);

  // Upload form state
  const [showAddForm, setShowAddForm] = useState<boolean>(() => listSessionAudios(sessionId).length === 0);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Playback state
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<'offline' | 'streaming' | null>(null);
  const [resolveVersion, setResolveVersion] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedSecRef = useRef<number>(0);
  const lastCloudSyncedSecRef = useRef<number>(0);
  const autoPlayOnLoadRef = useRef<boolean>(false);
  const resumePositionOverrideRef = useRef<number | null>(null);
  const isNative = isNativeAudioStorage();

  const cloudCfg = getCloudConfig();
  const firebaseReady = isFirebaseConfigured(cloudCfg);
  const archiveReady = isArchiveConfigured(cloudCfg);

  const getEffectivePosition = (track: SessionAudioTrack): number => {
    if (
      syncedAudioPositions &&
      Object.prototype.hasOwnProperty.call(syncedAudioPositions, track.id)
    ) {
      return syncedAudioPositions[track.id].seconds;
    }
    return track.lastPositionSeconds || 0;
  };

  const runSessionSync = async (preferredTrackId?: string | null) => {
    setIsSyncingList(true);
    setSyncNotice(null);
    try {
      const res = await syncSessionAudios(sessionId, moduleId);
      setTracks(res.tracks);
      onTracksCountChange?.(res.tracks.length);

      if (res.error) {
        setSyncNotice(res.error);
      }

      setSelectedTrackId((prevId) => {
        if (preferredTrackId !== undefined) return preferredTrackId;
        if (prevId && res.tracks.some((t) => t.id === prevId)) return prevId;
        return res.tracks.length > 0 ? res.tracks[0].id : null;
      });

      if (res.tracks.length > 0 && !selectedFile) {
        setShowAddForm(false);
      } else if (res.tracks.length === 0) {
        setShowAddForm(true);
      }
    } finally {
      setIsSyncingList(false);
    }
  };

  // Reload and sync tracks whenever sessionId changes
  useEffect(() => {
    let cancelled = false;
    const initialLocal = listSessionAudios(sessionId);
    setTracks(initialLocal);
    setSelectedTrackId(initialLocal.length > 0 ? initialLocal[0].id : null);
    setShowAddForm(initialLocal.length === 0);
    setConfirmDeleteId(null);
    setErrorMessage(null);
    setSyncNotice(null);
    setPlaybackError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    autoPlayOnLoadRef.current = false;
    resumePositionOverrideRef.current = null;
    onTracksCountChange?.(initialLocal.length);

    setIsSyncingList(true);
    syncSessionAudios(sessionId, moduleId)
      .then((res) => {
        if (cancelled) return;
        setTracks(res.tracks);
        onTracksCountChange?.(res.tracks.length);
        if (res.error) setSyncNotice(res.error);
        setSelectedTrackId((prevId) => {
          if (prevId && res.tracks.some((t) => t.id === prevId)) return prevId;
          return res.tracks.length > 0 ? res.tracks[0].id : null;
        });
        setShowAddForm(res.tracks.length === 0);
      })
      .finally(() => {
        if (!cancelled) setIsSyncingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, moduleId]);

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === selectedTrackId) || null,
    [tracks, selectedTrackId]
  );

  const cachedCount = useMemo(
    () => tracks.filter((t) => t.isCachedOffline).length,
    [tracks]
  );

  const totalSizeBytes = useMemo(
    () => tracks.reduce((sum, t) => sum + (t.sizeBytes || 0), 0),
    [tracks]
  );

  // Resolve playback URL whenever activeTrack changes or cache state explicitly updates
  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    setPlaybackUrl(null);
    setPlaybackMode(null);
    setPlaybackError(null);
    setIsPlaying(false);

    if (!activeTrack) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const startSec =
      resumePositionOverrideRef.current !== null
        ? resumePositionOverrideRef.current
        : getEffectivePosition(activeTrack);

    setCurrentTime(startSec);
    setDuration(0);
    lastSavedSecRef.current = startSec;
    lastCloudSyncedSecRef.current = startSec;

    setIsLoadingAudio(true);
    resolveAudioPlaybackUrl(activeTrack)
      .then(({ url, isObjectUrl, mode }) => {
        if (cancelled) {
          if (isObjectUrl) URL.revokeObjectURL(url);
          return;
        }
        if (isObjectUrl) {
          createdObjectUrl = url;
        }
        setPlaybackUrl(url);
        setPlaybackMode(mode);
        setIsLoadingAudio(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlaybackError(err instanceof Error ? err.message : 'Erro ao carregar áudio.');
        setIsLoadingAudio(false);
      });

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [activeTrack?.id, resolveVersion]);

  // Keep playbackRate synced on the <audio> element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, playbackUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    setSelectedFile(file);
  };

  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage('Selecione um arquivo de áudio .m4a ou .mp3.');
      return;
    }

    const validation = validateAudioFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      return;
    }

    setIsSaving(true);
    setUploadStage('Validando configurações...');
    try {
      const saved = await uploadAndSaveSessionAudio(
        sessionId,
        selectedFile,
        customTitle,
        (stage) => setUploadStage(stage),
        moduleId
      );
      setCustomTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowAddForm(false);
      autoPlayOnLoadRef.current = false;
      resumePositionOverrideRef.current = null;
      const updated = listSessionAudios(sessionId);
      setTracks(updated);
      onTracksCountChange?.(updated.length);
      setSelectedTrackId(saved.id);
      setResolveVersion((v) => v + 1);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível enviar o áudio para a nuvem.'
      );
    } finally {
      setIsSaving(false);
      setUploadStage(null);
    }
  };

  const handleSelectTrack = (track: SessionAudioTrack) => {
    if (activeTrack?.id === track.id) {
      handleTogglePlay();
      return;
    }
    if (activeTrack && audioRef.current) {
      persistCurrentPosition(audioRef.current.currentTime, true, true);
    }
    resumePositionOverrideRef.current = null;
    autoPlayOnLoadRef.current = true;
    setSelectedTrackId(track.id);
  };

  const handleDownloadOffline = async (track: SessionAudioTrack) => {
    if (cachingTrackId) return;
    setErrorMessage(null);
    setCachingTrackId(track.id);
    try {
      const updatedTrack = await cacheCloudAudioOffline(track);
      setTracks((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));

      if (activeTrack?.id === updatedTrack.id) {
        if (audioRef.current) {
          resumePositionOverrideRef.current = Math.floor(audioRef.current.currentTime || 0);
          audioRef.current.pause();
        }
        autoPlayOnLoadRef.current = false;
        setResolveVersion((v) => v + 1);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao baixar áudio para uso offline.'
      );
    } finally {
      setCachingTrackId(null);
    }
  };

  const handleClearCache = async (track: SessionAudioTrack) => {
    if (cachingTrackId) return;
    setErrorMessage(null);
    setCachingTrackId(track.id);
    try {
      const updatedTrack = await clearLocalAudioCache(track);
      setTracks((prev) => prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)));

      if (activeTrack?.id === updatedTrack.id) {
        if (audioRef.current) {
          resumePositionOverrideRef.current = Math.floor(audioRef.current.currentTime || 0);
          audioRef.current.pause();
        }
        autoPlayOnLoadRef.current = false;
        setResolveVersion((v) => v + 1);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao limpar cache local.');
    } finally {
      setCachingTrackId(null);
    }
  };

  const handleConfirmDelete = async (track: SessionAudioTrack) => {
    setErrorMessage(null);
    setDeletingTrackId(track.id);
    const wasActive = activeTrack?.id === track.id;

    try {
      if (wasActive && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      await deleteSessionAudio(track);
      setConfirmDeleteId(null);

      const remaining = listSessionAudios(sessionId);
      setTracks(remaining);
      onTracksCountChange?.(remaining.length);

      if (wasActive) {
        autoPlayOnLoadRef.current = false;
        resumePositionOverrideRef.current = null;
        setPlaybackUrl(null);
        setPlaybackMode(null);
        setCurrentTime(0);
        setDuration(0);
        setSelectedTrackId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (remaining.length === 0) {
        setShowAddForm(true);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível remover o registro do Firebase Firestore.'
      );
    } finally {
      setDeletingTrackId(null);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    const totalDur = Number.isFinite(audio.duration) ? audio.duration : 0;
    setDuration(totalDur);
    audio.playbackRate = playbackRate;

    const targetPos =
      resumePositionOverrideRef.current !== null
        ? resumePositionOverrideRef.current
        : getEffectivePosition(activeTrack);
    resumePositionOverrideRef.current = null;

    if (targetPos > 0 && (totalDur === 0 || targetPos < totalDur - 2)) {
      audio.currentTime = targetPos;
      setCurrentTime(targetPos);
    } else {
      setCurrentTime(0);
    }

    if (autoPlayOnLoadRef.current) {
      autoPlayOnLoadRef.current = false;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const persistCurrentPosition = (
    seconds: number,
    syncListState = false,
    syncToCloud = false
  ) => {
    if (!activeTrack) return;
    const clean = Math.max(0, Math.floor(seconds));
    updateAudioPosition(activeTrack.id, clean);
    lastSavedSecRef.current = clean;
    if (syncToCloud || Math.abs(clean - lastCloudSyncedSecRef.current) >= 5) {
      lastCloudSyncedSecRef.current = clean;
      onAudioPositionChange?.(activeTrack.id, clean);
    }
    if (syncListState) {
      setTracks(listSessionAudios(sessionId));
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = audio.currentTime;
    setCurrentTime(now);
    const floorNow = Math.floor(now);
    if (Math.abs(floorNow - lastSavedSecRef.current) >= 3) {
      const shouldPushCloud = Math.abs(floorNow - lastCloudSyncedSecRef.current) >= 5;
      persistCurrentPosition(now, false, shouldPushCloud);
    }
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !playbackUrl) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          setPlaybackError(err instanceof Error ? err.message : 'Falha ao reproduzir áudio.');
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxTime = duration > 0 ? duration : audio.duration || 0;
    const nextTime = Math.max(0, Math.min(maxTime || Infinity, audio.currentTime + deltaSeconds));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    persistCurrentPosition(nextTime, true, true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (audio) {
      audio.currentTime = nextTime;
      persistCurrentPosition(nextTime, true, true);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-5 mb-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Áudios da Sessão {sessionId} (.m4a / .mp3)
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <Cloud className="w-3 h-3 text-indigo-600" />
                Archive.org + Firebase
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <HardDrive className="w-3 h-3 text-teal-700" />
                {isNative ? 'Cache Android' : 'Cache Desktop'} ({cachedCount}/{tracks.length})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {tracks.length > 0
                ? `${tracks.length} áudio${tracks.length > 1 ? 's' : ''} sincronizado${tracks.length > 1 ? 's' : ''} (${formatFileSize(totalSizeBytes)}) • ${sessionTitle}`
                : 'Envie áudios do Gemini Notebook em .m4a / .mp3 para o Archive.org com sincronização automática no Desktop e Android.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runSessionSync()}
            disabled={isSyncingList}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 cursor-pointer"
            title="Recarregar lista de áudios do Firebase Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingList ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              setErrorMessage(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Fechar Cadastro' : 'Enviar Áudio (.m4a / .mp3)'}
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
          <span className="flex-1">{syncNotice} (Exibindo cache local espelho)</span>
        </div>
      )}

      {/* Add Audio Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveAudio}
          className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 mb-4 space-y-3"
        >
          {(!archiveReady || !firebaseReady) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  {!firebaseReady && !archiveReady
                    ? 'Firebase e Archive.org (IAS3) ainda não estão configurados neste aparelho.'
                    : !firebaseReady
                    ? 'Firebase Firestore não está configurado.'
                    : 'Credenciais ou bucket do Archive.org (IAS3) não configurados.'}
                </span>
              </div>
              {onOpenCloudSettings && (
                <button
                  type="button"
                  onClick={onOpenCloudSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurar Agora
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Arquivo de Áudio (.m4a ou .mp3) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-700 file:text-white hover:file:bg-teal-800 bg-white border border-slate-300 rounded-xl p-1.5 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título da Faixa (opcional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex.: Podcast Gemini Notebook — Resumo da Sessão"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="text-xs text-teal-900 font-medium">
              Arquivo selecionado: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)}) • Bucket destino: <code className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-950 font-mono text-[11px]">{cloudCfg.archiveBucket}</code>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500">
              Envia binário ao Archive.org (IAS3), registra metadados no Firebase e mantém cópia offline imediata neste aparelho.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {isSaving ? uploadStage || 'Enviando para Archive.org...' : 'Enviar p/ Archive.org + Firebase'}
            </button>
          </div>
        </form>
      )}

      {!showAddForm && errorMessage && (
        <div className="mb-4 flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Integrated Player */}
      {activeTrack && (
        <div className="p-4 rounded-xl bg-slate-950 text-white mb-4 border border-slate-800 shadow-inner">
          <audio
            ref={audioRef}
            src={playbackUrl || undefined}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (audioRef.current) {
                persistCurrentPosition(audioRef.current.currentTime, true, true);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              persistCurrentPosition(0, true, true);
            }}
            onError={() => {
              setIsPlaying(false);
              setPlaybackError(
                playbackMode === 'streaming'
                  ? 'Não foi possível reproduzir o streaming agora. Se acabou de subir no outro dispositivo, aguarde 15–60s de propagação do Archive.org ou tente "Baixar Offline".'
                  : 'Não foi possível decodificar este áudio no player.'
              );
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {activeTrack.format.toUpperCase()}
                </span>
                {playbackMode === 'offline' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <HardDrive className="w-3 h-3" />
                    Offline Pronto
                  </span>
                ) : playbackMode === 'streaming' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Cloud className="w-3 h-3" />
                    Streaming (Archive.org)
                  </span>
                ) : null}
                <span className="text-xs text-slate-400">{formatFileSize(activeTrack.sizeBytes)}</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1">
                {activeTrack.title}
              </h3>
            </div>

            {/* Playback Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {SPEED_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {playbackError ? (
            <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{playbackError}</span>
            </div>
          ) : (
            <>
              {/* Timeline Seek Bar */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono text-slate-300 w-12 text-right">
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={1}
                  value={Math.min(currentTime, duration || currentTime)}
                  disabled={!playbackUrl || duration === 0}
                  onChange={handleSeek}
                  className="flex-1 accent-teal-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 w-12">
                  {formatSeconds(duration)}
                </span>
              </div>

              {/* Transport Controls (-15s, Play/Pause, +15s) */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleSkip(-15)}
                  disabled={!playbackUrl}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-200 cursor-pointer"
                  title="Voltar 15 segundos"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  disabled={isLoadingAudio || !playbackUrl}
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-400 hover:bg-teal-300 disabled:opacity-50 text-slate-950 shadow-md transition-transform active:scale-95 cursor-pointer"
                  aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(15)}
                  disabled={!playbackUrl}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-200 cursor-pointer"
                  title="Avançar 15 segundos"
                >
                  <span>15s</span>
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Track List for Current Session */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Lista de Áudios desta Sessão ({tracks.length})
          </div>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            {tracks.map((track) => {
              const isSelected = activeTrack?.id === track.id;
              const isConfirmingDelete = confirmDeleteId === track.id;
              const isCaching = cachingTrackId === track.id;
              const isDeleting = deletingTrackId === track.id;
              const effectivePos = getEffectivePosition(track);

              return (
                <div
                  key={track.id}
                  className={`p-3 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-teal-50/90' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTrack(track)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSelected && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : isSelected ? (
                        <Play className="w-4 h-4 ml-0.5" />
                      ) : (
                        <Music className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {track.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-800 font-bold uppercase">
                          {track.format}
                        </span>
                        {track.isCachedOffline ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            <HardDrive className="w-3 h-3" />
                            Offline Pronto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">
                            <Cloud className="w-3 h-3" />
                            Streaming
                          </span>
                        )}
                        <span>{formatFileSize(track.sizeBytes)}</span>
                        {effectivePos > 5 && (
                          <span className="inline-flex items-center gap-1 text-teal-700 font-semibold">
                            <Clock className="w-3 h-3" />
                            Parou em {formatSeconds(effectivePos)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Per-track Cache & Delete Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {!isConfirmingDelete && track.audioUrl && (
                      track.isCachedOffline ? (
                        <button
                          type="button"
                          onClick={() => handleClearCache(track)}
                          disabled={Boolean(cachingTrackId) || Boolean(deletingTrackId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-colors cursor-pointer"
                          title="Apagar apenas o arquivo baixado neste aparelho (mantém no Firebase e Archive.org)"
                        >
                          {isCaching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <HardDrive className="w-3.5 h-3.5" />
                          )}
                          <span>Limpar Cache</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownloadOffline(track)}
                          disabled={Boolean(cachingTrackId) || Boolean(deletingTrackId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-60 transition-colors cursor-pointer"
                          title="Baixar este áudio para ouvir offline neste aparelho"
                        >
                          {isCaching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isCaching ? 'Baixando...' : 'Baixar Offline'}</span>
                        </button>
                      )
                    )}

                    {isConfirmingDelete ? (
                      <>
                        <span className="text-[11px] font-bold text-rose-700 mr-1">
                          Remover do Firebase e cache? (Archive.org intacto)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(track)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Não
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(track.id)}
                        disabled={Boolean(deletingTrackId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="Remover do Firebase Firestore e cache local (mantém arquivo no Archive.org)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
