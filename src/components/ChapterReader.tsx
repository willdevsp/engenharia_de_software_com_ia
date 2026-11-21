import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileQuestion,
  Headphones,
  Sparkles,
  Video,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import type { AudioPositionEntry, ChapterData } from '../types/course';
import { renderChapterMarkdownWithMath, slugifyHeading } from '../utils/mathRenderer';
import { listSessionAudios, syncSessionAudios } from '../utils/audioStorage';
import { SessionAudioPanel } from './SessionAudioPanel';

interface ChapterReaderProps {
  chapter: ChapterData;
  isCompleted: boolean;
  targetAnchor?: string | null;
  onToggleComplete: (chapterId: string) => void;
  onStartQuiz: (sessionId: string) => void;
  onSelectChapter: (session: string) => void;
  prevSession?: string | null;
  nextSession?: string | null;
  syncedAudioPositions?: Record<string, AudioPositionEntry>;
  onAudioPositionChange?: (trackId: string, seconds: number) => void;
  onOpenCloudSettings?: () => void;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  chapter,
  isCompleted,
  targetAnchor,
  onToggleComplete,
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

  useEffect(() => {
    let cancelled = false;
    const count = listSessionAudios(chapter.session).length;
    setAudioCount(count);
    setShowAudioPanel(false);
    setShowVideoPlayer(false);

    syncSessionAudios(chapter.session)
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
  }, [chapter.session]);

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

  useEffect(() => {
    if (targetAnchor) {
      const cleanId = targetAnchor.split('#').pop() || targetAnchor;
      const el =
        document.getElementById(cleanId) ||
        document.getElementById(slugifyHeading(cleanId));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('highlight-anchor');
        const timer = setTimeout(() => el.classList.remove('highlight-anchor'), 2600);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [chapter.id, targetAnchor]);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setZoomedImage({ src: img.src, alt: img.alt || chapter.title });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Chapter Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
              Módulo 0{chapter.module} • Sessão {chapter.session}
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleComplete(chapter.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? 'Capítulo Concluído' : 'Marcar como Lido'}
            </button>
            <button
              onClick={() => onStartQuiz(chapter.session)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <FileQuestion className="w-4 h-4" />
              Fazer Prova da Sessão
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">
          {chapter.title}
        </h1>

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
          key={chapter.session}
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
        <div className="bg-indigo-950 text-white rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-300" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
                Documentações Oficiais & Seções Específicas desta Etapa
              </h2>
            </div>
            <button
              onClick={() => setShowDocs(!showDocs)}
              className="text-xs text-indigo-300 hover:text-white cursor-pointer"
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

      {/* Main Layout: Chapter Body + Quick In-Chapter Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <article className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
          <div className="flex items-center justify-end mb-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <ZoomIn className="w-3.5 h-3.5" /> Clique em qualquer gráfico para ampliar
            </span>
          </div>

          <div
            className="book-prose"
            onClick={handleContentClick}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Bottom Chapter Exam Call-to-Action */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
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
              onClick={() => onStartQuiz(chapter.session)}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shrink-0 shadow-md transition-all cursor-pointer"
            >
              Iniciar Prova da Sessão {chapter.session} →
            </button>
          </div>

          {/* Prev / Next Chapter Navigation */}
          <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
            {prevSession ? (
              <button
                onClick={() => onSelectChapter(prevSession)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Sessão Anterior ({prevSession})
              </button>
            ) : (
              <div />
            )}
            {nextSession && (
              <button
                onClick={() => onSelectChapter(nextSession)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                Próxima Sessão ({nextSession}) <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </article>

        {/* Sticky Outline Sidebar on Desktop */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Neste Capítulo
          </div>
          <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {tocHeadings.map((h, i) => (
              <a
                key={i}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`block text-xs py-1.5 px-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
                  h.depth === 3 ? 'pl-5 text-slate-500' : 'font-semibold text-slate-700'
                }`}
                dangerouslySetInnerHTML={{ __html: h.html }}
              />
            ))}
          </nav>
        </aside>
      </div>

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
