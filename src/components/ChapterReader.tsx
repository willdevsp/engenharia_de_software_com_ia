import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileQuestion,
  Headphones,
  List,
  Lock,
  Sparkles,
  Video,
  X,
  ZoomIn
} from 'lucide-react';
import type { AudioPositionEntry, ChapterData, ReadingProgressEntry } from '../types/course';
import { renderChapterMarkdownWithMath, slugifyHeading } from '../utils/mathRenderer';
import { listSessionAudios, syncSessionAudios } from '../utils/audioStorage';
import { SessionAudioPanel } from './SessionAudioPanel';

const SECTION_DWELL_MS = 1500;

interface ChapterReaderProps {
  chapter: ChapterData;
  isCompleted: boolean;
  isRestudyRequired?: boolean;
  readingProgressEntry?: ReadingProgressEntry;
  legacyReadingPercentage?: number;
  targetAnchor?: string | null;
  onToggleComplete: (chapterId: string) => void;
  onUpdateReadingProgress?: (
    chapterId: string,
    percentage: number,
    visitedSections: string[]
  ) => void;
  onStartQuiz: (sessionId: string) => void;
  onSelectChapter: (session: string) => void;
  prevSession?: string | null;
  nextSession?: string | null;
  syncedAudioPositions?: Record<string, AudioPositionEntry>;
  onAudioPositionChange?: (trackId: string, seconds: number) => void;
  onOpenCloudSettings?: () => void;
}

async function copyTextWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for WebView / insecure contexts
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  chapter,
  isCompleted,
  isRestudyRequired = false,
  readingProgressEntry,
  legacyReadingPercentage = 0,
  targetAnchor,
  onToggleComplete,
  onUpdateReadingProgress,
  onStartQuiz,
  onSelectChapter,
  prevSession,
  nextSession,
  syncedAudioPositions,
  onAudioPositionChange,
  onOpenCloudSettings
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [showDocs, setShowDocs] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [audioCount, setAudioCount] = useState<number>(() => listSessionAudios(chapter.session).length);
  const [showAudioPanel, setShowAudioPanel] = useState<boolean>(false);
  const [mobileTocOpen, setMobileTocOpen] = useState<boolean>(false);
  const [mobileTocDrawerOpen, setMobileTocDrawerOpen] = useState<boolean>(false);

  const proseContainerRef = useRef<HTMLDivElement | null>(null);
  const startSentinelRef = useRef<HTMLDivElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const count = listSessionAudios(chapter.session).length;
    setAudioCount(count);
    setShowAudioPanel(false);
    setShowVideoPlayer(false);
    setMobileTocOpen(false);
    setMobileTocDrawerOpen(false);

    syncSessionAudios(chapter.session, chapter.module)
      .then((res) => {
        if (!cancelled) {
          setAudioCount(res.tracks.length);
        }
      })
      .catch(() => {
        // Fallback count already read from local mirror
      });

    return () => {
      cancelled = true;
    };
  }, [chapter.id, chapter.session, chapter.module]);

  const chapterVideos = useMemo(() => {
    const list = Array.isArray(chapter.media?.videos) ? [...chapter.media.videos] : [];
    if (list.length === 0 && chapter.media?.video_url) {
      list.push({
        title: `Vídeo Complementar — Sessão ${chapter.session}`,
        channel: 'YouTube',
        url: chapter.media.video_url
      });
    }
    return list;
  }, [chapter.media, chapter.session]);

  useEffect(() => {
    setActiveVideoIndex(0);
  }, [chapter.id]);

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const { htmlContent, tocHeadings } = useMemo(
    () => renderChapterMarkdownWithMath(chapter.markdownContent),
    [chapter.markdownContent]
  );

  // Build ordered structural checkpoints: __start__, unique headings (H2/H3), __end__
  const checkpointIds = useMemo(() => {
    const uniqueHeadingIds: string[] = [];
    const seen = new Set<string>();
    for (const h of tocHeadings) {
      if (h.id && !seen.has(h.id)) {
        seen.add(h.id);
        uniqueHeadingIds.push(h.id);
      }
    }
    return ['__start__', ...uniqueHeadingIds, '__end__'];
  }, [tocHeadings]);

  const [visitedSections, setVisitedSections] = useState<string[]>(() => {
    const saved = readingProgressEntry?.visitedSections || [];
    return saved.filter((id) => checkpointIds.includes(id));
  });

  // Reset or sync local visited sections when chapter or external progress reset changes
  useEffect(() => {
    const saved = readingProgressEntry?.visitedSections || [];
    const pct = readingProgressEntry?.percentage ?? legacyReadingPercentage;
    if (pct === 0 && saved.length === 0) {
      setVisitedSections([]);
    } else if (isCompleted && !isRestudyRequired) {
      setVisitedSections(checkpointIds);
    } else {
      setVisitedSections(saved.filter((id) => checkpointIds.includes(id)));
    }
  }, [chapter.id, readingProgressEntry?.updatedAt, isCompleted, isRestudyRequired, checkpointIds, legacyReadingPercentage, readingProgressEntry]);

  const visitedSet = useMemo(() => new Set(visitedSections), [visitedSections]);
  const visitedCount = visitedSet.size;
  const totalCheckpoints = checkpointIds.length;
  const traversalPercentage =
    isCompleted && !isRestudyRequired
      ? 100
      : totalCheckpoints > 0
      ? Math.round((visitedCount / totalCheckpoints) * 100)
      : 100;

  const isTraversalComplete =
    (isCompleted && !isRestudyRequired) || visitedCount >= totalCheckpoints;

  // Keep refs fresh inside IntersectionObserver callback
  const visitedRef = useRef<Set<string>>(visitedSet);
  visitedRef.current = visitedSet;
  const onUpdateProgressRef = useRef(onUpdateReadingProgress);
  onUpdateProgressRef.current = onUpdateReadingProgress;

  const markCheckpointVisited = useCallback(
    (cpId: string) => {
      if (!checkpointIds.includes(cpId) || visitedRef.current.has(cpId)) {
        return;
      }
      const nextSet = new Set(visitedRef.current);
      nextSet.add(cpId);
      const nextList = checkpointIds.filter((id) => nextSet.has(id));
      visitedRef.current = nextSet;
      setVisitedSections(nextList);

      const nextPct =
        checkpointIds.length > 0
          ? Math.round((nextList.length / checkpointIds.length) * 100)
          : 100;
      if (onUpdateProgressRef.current) {
        onUpdateProgressRef.current(chapter.id, nextPct, nextList);
      }
    },
    [chapter.id, checkpointIds]
  );

  // Track section traversal using IntersectionObserver + 1.5s dwell threshold
  useEffect(() => {
    if (isCompleted && !isRestudyRequired) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const dwellTimers = new Map<string, number>();
    const visibleCheckpoints = new Set<string>();

    const startDwell = (cpId: string) => {
      if (visitedRef.current.has(cpId) || dwellTimers.has(cpId)) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const timerId = window.setTimeout(() => {
        dwellTimers.delete(cpId);
        markCheckpointVisited(cpId);
      }, SECTION_DWELL_MS);
      dwellTimers.set(cpId, timerId);
    };

    const cancelDwell = (cpId: string) => {
      const timerId = dwellTimers.get(cpId);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        dwellTimers.delete(cpId);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cpId = (entry.target as HTMLElement).dataset.sectionCheckpoint;
          if (!cpId) continue;
          if (entry.isIntersecting) {
            visibleCheckpoints.add(cpId);
            startDwell(cpId);
          } else {
            visibleCheckpoints.delete(cpId);
            cancelDwell(cpId);
          }
        }
      },
      { threshold: [0.15, 0.5], rootMargin: '-48px 0px -32px 0px' }
    );

    const targets: HTMLElement[] = [];
    if (startSentinelRef.current) targets.push(startSentinelRef.current);
    if (proseContainerRef.current) {
      const headingEls = proseContainerRef.current.querySelectorAll<HTMLElement>(
        '[data-section-checkpoint]'
      );
      headingEls.forEach((el) => {
        if (el.dataset.sectionCheckpoint) {
          targets.push(el);
        }
      });
    }
    if (endSentinelRef.current) targets.push(endSentinelRef.current);

    for (const el of targets) {
      observer.observe(el);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        visibleCheckpoints.forEach((cpId) => startDwell(cpId));
      } else {
        Array.from(dwellTimers.keys()).forEach((cpId) => cancelDwell(cpId));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      dwellTimers.forEach((timerId) => window.clearTimeout(timerId));
      dwellTimers.clear();
    };
  }, [chapter.id, htmlContent, isCompleted, isRestudyRequired, markCheckpointVisited]);

  useEffect(() => {
    if (targetAnchor) {
      const cleanId = targetAnchor.split('#').pop() || targetAnchor;
      const compactTarget = cleanId.replace(/[^a-z0-9]/gi, '').toLowerCase();
      let el =
        document.getElementById(cleanId) ||
        document.getElementById(slugifyHeading(cleanId));
      if (!el && compactTarget) {
        const matchedHeading = tocHeadings.find(
          (h) => h.id.replace(/[^a-z0-9]/gi, '').toLowerCase() === compactTarget
        );
        if (matchedHeading) {
          el = document.getElementById(matchedHeading.id);
        } else {
          const candidates = document.querySelectorAll('.book-prose [id]');
          for (const candidate of candidates) {
            if (candidate.id.replace(/[^a-z0-9]/gi, '').toLowerCase() === compactTarget) {
              el = candidate as HTMLElement;
              break;
            }
          }
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('highlight-anchor');
        const timer = setTimeout(() => el.classList.remove('highlight-anchor'), 2600);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [chapter.id, targetAnchor, tocHeadings]);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 1. Copy button delegation inside .code-block-shell
    const copyBtn = target.closest<HTMLButtonElement>('[data-copy-code]');
    if (copyBtn) {
      const shell = copyBtn.closest('.code-block-shell');
      const codeEl = shell?.querySelector('pre code');
      const codeText = codeEl?.textContent || '';
      if (codeText) {
        void copyTextWithFallback(codeText).then((copied) => {
          if (copied) {
            copyBtn.dataset.copied = 'true';
            copyBtn.textContent = 'Copiado!';
            window.setTimeout(() => {
              copyBtn.dataset.copied = 'false';
              copyBtn.textContent = 'Copiar';
            }, 1800);
          }
        });
      }
      return;
    }

    // 2. Lightbox zoom for chapter diagrams
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setZoomedImage({ src: img.src, alt: img.alt || chapter.title });
    }
  };

  const handleJumpToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileTocOpen(false);
    setMobileTocDrawerOpen(false);
  };

  const handleJumpToNextUnvisited = () => {
    const nextMissingId = checkpointIds.find((id) => !visitedSet.has(id));
    if (!nextMissingId) return;
    if (nextMissingId === '__start__' && startSentinelRef.current) {
      startSentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (nextMissingId === '__end__' && endSentinelRef.current) {
      endSentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const el = document.getElementById(nextMissingId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCompleteButtonClick = () => {
    if (!isCompleted && !isTraversalComplete) {
      handleJumpToNextUnvisited();
      return;
    }
    onToggleComplete(chapter.id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Chapter Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
              Módulo {String(chapter.module).padStart(2, '0')} • Sessão {chapter.session}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Auditado (Skill Reviewer)
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              ~{chapter.estimatedMinutes} min de estudo
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCompleteButtonClick}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isCompleted && !isRestudyRequired
                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                  : isTraversalComplete
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 hover:bg-indigo-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
              title={
                isTraversalComplete
                  ? 'Alternar status de conclusão deste capítulo'
                  : 'Percorra todas as seções do capítulo (~1,5s por seção) para liberar a conclusão'
              }
            >
              {isCompleted && !isRestudyRequired ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : !isTraversalComplete ? (
                <Lock className="w-4 h-4 text-slate-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-indigo-700" />
              )}
              <span>
                {isCompleted && !isRestudyRequired
                  ? 'Capítulo Concluído'
                  : isTraversalComplete
                  ? 'Concluir Capítulo (100%)'
                  : `Percorra o Capítulo (${traversalPercentage}%)`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStartQuiz(chapter.session)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <FileQuestion className="w-4 h-4" />
              Fazer Prova da Sessão
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
          {chapter.title}
        </h1>

        {/* Mandatory Surgical Restudy Warning Banner */}
        {isRestudyRequired && !isCompleted && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Reestudo Cirúrgico Obrigatório:</strong> Esta sessão ficou abaixo de 70% na Prova Final do Módulo após 3 chances. Percorra todas as seções do capítulo ({visitedCount}/{totalCheckpoints}) para desbloquear um novo ciclo da prova.
              </div>
            </div>
            {!isTraversalComplete && (
              <button
                type="button"
                onClick={handleJumpToNextUnvisited}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shrink-0"
              >
                Ir p/ próxima seção
              </button>
            )}
          </div>
        )}

        {/* Section Traversal Progress Strip */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
            <span className="font-semibold text-slate-700">
              Cobertura verificada por seção (Kindle + Web):{' '}
              <strong className="text-indigo-700">
                {isCompleted && !isRestudyRequired ? totalCheckpoints : visitedCount}/{totalCheckpoints}
              </strong>{' '}
              seções ({traversalPercentage}%)
            </span>
            {!isTraversalComplete && (
              <button
                type="button"
                onClick={handleJumpToNextUnvisited}
                className="text-indigo-700 font-semibold hover:underline cursor-pointer"
              >
                Pular para próxima seção pendente →
              </button>
            )}
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                traversalPercentage >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'
              }`}
              style={{ width: `${traversalPercentage}%` }}
            />
          </div>
        </div>

        {/* Subtopics Pills */}
        {chapter.subtopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {chapter.subtopics.map((sub, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700"
              >
                {sub}
              </span>
            ))}
          </div>
        )}

        {/* Extensible Multi-Phase Media & Gemini Tutor Bar (Phase 2 & Phase 3 Ready) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-teal-50/70 border border-teal-200/80 text-xs">
            <Headphones className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-800">Áudios da Sessão (.m4a / .mp3)</div>
              <button
                type="button"
                onClick={() => setShowAudioPanel((prev) => !prev)}
                className="text-teal-700 font-semibold hover:underline cursor-pointer text-left truncate block w-full"
              >
                {audioCount > 0
                  ? `${showAudioPanel ? 'Ocultar' : 'Ouvir / Gerenciar'} (${audioCount} áudio${audioCount > 1 ? 's' : ''} salvo${audioCount > 1 ? 's' : ''})`
                  : `${showAudioPanel ? 'Ocultar painel' : '+ Cadastrar .m4a / .mp3'}`}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <Video className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-800">Vídeos da Sessão (YouTube)</div>
              {chapterVideos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowVideoPlayer(!showVideoPlayer)}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  {showVideoPlayer ? 'Ocultar' : 'Assistir'} ({chapterVideos.length} vídeo{chapterVideos.length > 1 ? 's' : ''} embutido{chapterVideos.length > 1 ? 's' : ''})
                </button>
              ) : (
                <div className="text-slate-500 truncate">Slot pronto p/ vídeos complementares</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-amber-900">Tutor IA Gemini</div>
              <div className="text-amber-700 truncate">Fase 3: Contexto desta sessão pronto</div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Cloud/Offline Audio Manager & Player (.m4a / .mp3) */}
      {showAudioPanel && (
        <SessionAudioPanel
          key={`${chapter.module}-${chapter.session}`}
          moduleId={chapter.module}
          sessionId={chapter.session}
          sessionTitle={chapter.title}
          onTracksCountChange={setAudioCount}
          syncedAudioPositions={syncedAudioPositions}
          onAudioPositionChange={onAudioPositionChange}
          onOpenCloudSettings={onOpenCloudSettings}
        />
      )}

      {/* Embedded YouTube Video Player for this Stage */}
      {chapterVideos.length > 0 && showVideoPlayer && (() => {
        const currentVideo = chapterVideos[activeVideoIndex] || chapterVideos[0];
        const ytId = extractYouTubeId(currentVideo.url);
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {currentVideo.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Canal: <strong>{currentVideo.channel}</strong> • Vídeo complementar oficial/curado da Sessão {chapter.session}
                  </p>
                </div>
              </div>
              <a
                href={currentVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no YouTube
              </a>
            </div>

            {chapterVideos.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {chapterVideos.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveVideoIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      idx === activeVideoIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Vídeo {idx + 1}: {v.title}
                  </button>
                ))}
              </div>
            )}

            {ytId && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
                  title={currentVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Official Documentation Links for this Stage */}
      {chapter.official_docs.length > 0 && (
        <div className="bg-indigo-950 text-white rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-5 h-5 text-indigo-300 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-200">
                Documentações Oficiais & Seções Específicas desta Etapa
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowDocs(!showDocs)}
              className="text-xs text-indigo-300 hover:text-white cursor-pointer shrink-0"
            >
              {showDocs ? 'Ocultar' : 'Mostrar'} ({chapter.official_docs.length})
            </button>
          </div>
          {showDocs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {chapter.official_docs.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-800 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white group-hover:text-indigo-200 truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-indigo-300 mt-0.5">
                      Seção: <span className="text-amber-300 font-medium">{doc.section}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-white shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Collapsible "Neste Capítulo" Accordion (< lg) */}
      {tocHeadings.length > 0 && (
        <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-xs mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setMobileTocOpen((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left text-xs font-extrabold uppercase tracking-wider text-slate-700 hover:bg-slate-50 cursor-pointer"
            aria-expanded={mobileTocOpen}
          >
            <span className="inline-flex items-center gap-2">
              <List className="w-4 h-4 text-indigo-600" />
              Neste Capítulo ({tocHeadings.length} seções)
            </span>
            {mobileTocOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {mobileTocOpen && (
            <nav className="px-3 pb-3 pt-1 border-t border-slate-100 max-h-64 overflow-y-auto space-y-1">
              {tocHeadings.map((h, i) => (
                <a
                  key={i}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleJumpToHeading(h.id);
                  }}
                  className={`block text-xs py-1.5 px-2.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 ${
                    h.depth === 3 ? 'pl-6 text-slate-500' : 'font-semibold text-slate-800'
                  }`}
                  dangerouslySetInnerHTML={{ __html: h.html }}
                />
              ))}
            </nav>
          )}
        </div>
      )}

      {/* Main Layout: Chapter Body + Quick In-Chapter Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <article className="min-w-0 lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-10">
          <div className="flex items-center justify-end mb-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <ZoomIn className="w-3.5 h-3.5" /> Clique em qualquer gráfico para ampliar
            </span>
          </div>

          <div
            ref={startSentinelRef}
            data-section-checkpoint="__start__"
            className="h-1 w-full pointer-events-none"
            aria-hidden="true"
          />

          <div
            ref={proseContainerRef}
            className="book-prose"
            onClick={handleContentClick}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div
            ref={endSentinelRef}
            data-section-checkpoint="__end__"
            className="h-2 w-full pointer-events-none"
            aria-hidden="true"
          />

          {/* Bottom Chapter Exam Call-to-Action */}
          <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Validação de Maestria • Sessão {chapter.session}
              </span>
              <h3 className="text-xl font-bold mt-1">
                Pronto para testar a qualidade do seu conhecimento?
              </h3>
              <p className="text-sm text-indigo-200 mt-1">
                Resolva a prova de até 30 questões desta sessão para alimentar o seu Dashboard de Desempenho e descobrir o que pode melhorar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartQuiz(chapter.session)}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shrink-0 shadow-md transition-all cursor-pointer"
            >
              Iniciar Prova da Sessão {chapter.session} →
            </button>
          </div>

          {/* Chapter Completion CTA at bottom */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-700">
              <strong>Cobertura de leitura:</strong> {visitedCount}/{totalCheckpoints} seções percorridas ({traversalPercentage}%).
            </div>
            <button
              type="button"
              onClick={handleCompleteButtonClick}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isCompleted && !isRestudyRequired
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : isTraversalComplete
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {isCompleted && !isRestudyRequired
                ? 'Capítulo Concluído ✓'
                : isTraversalComplete
                ? 'Confirmar Conclusão do Capítulo ✓'
                : 'Percorrer Próxima Seção Pendente'}
            </button>
          </div>

          {/* Prev / Next Chapter Navigation */}
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {prevSession ? (
              <button
                type="button"
                onClick={() => onSelectChapter(prevSession)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" /> Sessão Anterior ({prevSession})
              </button>
            ) : (
              <div />
            )}
            {nextSession && (
              <button
                type="button"
                onClick={() => onSelectChapter(nextSession)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer ml-auto"
              >
                Próxima Sessão ({nextSession}) <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </article>

        {/* Sticky Outline Sidebar on Desktop (>= lg) */}
        <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Neste Capítulo
          </div>
          <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {tocHeadings.map((h, i) => {
              const isVisited = visitedSet.has(h.id);
              return (
                <a
                  key={i}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleJumpToHeading(h.id);
                  }}
                  className={`flex items-start justify-between gap-1.5 text-xs py-1.5 px-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
                    h.depth === 3 ? 'pl-5 text-slate-500' : 'font-semibold text-slate-700'
                  }`}
                >
                  <span dangerouslySetInnerHTML={{ __html: h.html }} />
                  {isVisited && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </a>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Floating Mobile Quick-Index Button (< lg) */}
      {tocHeadings.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileTocDrawerOpen(true)}
          className="lg:hidden fixed bottom-5 right-4 z-30 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-lg border border-indigo-500/40 cursor-pointer"
          aria-label="Abrir índice do capítulo"
        >
          <List className="w-4 h-4" />
          <span>Índice ({tocHeadings.length})</span>
        </button>
      )}

      {/* Mobile Floating Index Bottom Sheet */}
      {mobileTocDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end"
          onClick={() => setMobileTocDrawerOpen(false)}
        >
          <div
            className="w-full max-h-[75vh] bg-white rounded-t-2xl p-4 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="text-sm font-extrabold text-slate-900">
                Índice — Sessão {chapter.session} ({visitedCount}/{totalCheckpoints} percorridas)
              </div>
              <button
                type="button"
                onClick={() => setMobileTocDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                aria-label="Fechar índice"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="mt-2 overflow-y-auto space-y-1 pr-1">
              {tocHeadings.map((h, i) => {
                const isVisited = visitedSet.has(h.id);
                return (
                  <a
                    key={i}
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleJumpToHeading(h.id);
                    }}
                    className={`flex items-center justify-between gap-2 text-xs py-2 px-2.5 rounded-lg hover:bg-indigo-50 ${
                      h.depth === 3 ? 'pl-6 text-slate-600' : 'font-bold text-slate-800'
                    }`}
                  >
                    <span dangerouslySetInnerHTML={{ __html: h.html }} />
                    {isVisited && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="max-w-5xl max-h-[92vh] bg-white rounded-2xl p-3 shadow-2xl overflow-auto">
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="max-w-full max-h-[82vh] mx-auto object-contain"
            />
            <div className="text-center text-xs text-slate-600 font-medium mt-2">
              {zoomedImage.alt} (Clique em qualquer lugar para fechar)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
