import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  FileQuestion,
  GraduationCap,
  Menu,
  RefreshCw,
  Settings,
  X
} from 'lucide-react';
import { MODULE_01_CHAPTERS, MODULE_01_QUIZZES } from './generated/courseData';
import type { CloudSyncStatus, QuizAttempt, UserStudyState } from './types/course';
import {
  areStudyStatesEqual,
  loadStudyState,
  mergeImportedState,
  mergeStudyStates,
  recordQuizAttempt,
  saveStudyState,
  toggleChapterCompleted,
  updateSyncedAudioPosition
} from './utils/storage';
import { isFirebaseConfigured } from './utils/cloudConfig';
import { syncStudyStateWithCloud } from './utils/cloudSync';
import { ChapterReader } from './components/ChapterReader';
import { QuizEngine } from './components/QuizEngine';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CloudSettingsModal } from './components/CloudSettingsModal';
import { exportKindleEpub } from './utils/nativeExport';

type ActiveTab = 'reader' | 'quiz' | 'dashboard';

export const App: React.FC = () => {
  const [studyState, setStudyState] = useState<UserStudyState>(() => loadStudyState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('reader');
  const [selectedSession, setSelectedSession] = useState<string>('1.1');
  const [targetAnchor, setTargetAnchor] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<'full' | 'quick' | 'error-notebook'>('full');
  const [quizSubtopic, setQuizSubtopic] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isExportingEpub, setIsExportingEpub] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() =>
    isFirebaseConfigured()
      ? typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'syncing'
      : 'unconfigured'
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const studyStateRef = useRef<UserStudyState>(studyState);
  studyStateRef.current = studyState;
  const pushTimerRef = useRef<number | null>(null);

  const runCloudSync = useCallback(async (stateOverride?: UserStudyState) => {
    if (!isFirebaseConfigured()) {
      setSyncStatus('unconfigured');
      setSyncError(null);
      return;
    }

    setSyncStatus('syncing');
    const baseState = stateOverride || studyStateRef.current;
    const res = await syncStudyStateWithCloud(baseState);

    setStudyState((latest) => {
      const reconciled = areStudyStatesEqual(latest, res.state)
        ? latest
        : mergeStudyStates(latest, res.state);
      if (!areStudyStatesEqual(latest, reconciled)) {
        saveStudyState(reconciled, true);
        return reconciled;
      }
      return latest;
    });

    setSyncStatus(res.status);
    setSyncError(res.error || null);
    if (res.status === 'synced') {
      setLastSyncedAt(new Date().toISOString());
    }
  }, []);

  const scheduleCloudPush = useCallback(
    (nextState: UserStudyState) => {
      if (pushTimerRef.current !== null) {
        window.clearTimeout(pushTimerRef.current);
      }
      pushTimerRef.current = window.setTimeout(() => {
        pushTimerRef.current = null;
        void runCloudSync(nextState);
      }, 1200);
    },
    [runCloudSync]
  );

  useEffect(() => {
    void runCloudSync();

    const handleOnline = () => {
      void runCloudSync();
    };
    const handleOffline = () => {
      if (isFirebaseConfigured()) {
        setSyncStatus('offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pushTimerRef.current !== null) {
        window.clearTimeout(pushTimerRef.current);
      }
    };
  }, [runCloudSync]);

  const currentChapterIndex = Math.max(
    0,
    MODULE_01_CHAPTERS.findIndex((c) => c.session === selectedSession)
  );
  const currentChapter = MODULE_01_CHAPTERS[currentChapterIndex] || MODULE_01_CHAPTERS[0];
  const prevChapter =
    currentChapterIndex > 0 ? MODULE_01_CHAPTERS[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex < MODULE_01_CHAPTERS.length - 1
      ? MODULE_01_CHAPTERS[currentChapterIndex + 1]
      : null;

  const handleSelectChapter = (session: string, anchor?: string) => {
    setSelectedSession(session);
    setTargetAnchor(anchor || null);
    setActiveTab('reader');
    setSidebarOpen(false);
  };

  const handleStartQuiz = (
    session: string,
    mode: 'full' | 'quick' | 'error-notebook' = 'full',
    subtopicFilter: string | null = null
  ) => {
    setSelectedSession(session);
    setQuizMode(mode);
    setQuizSubtopic(subtopicFilter);
    setActiveTab('quiz');
    setSidebarOpen(false);
  };

  const handleToggleComplete = (chapterId: string) => {
    const next = toggleChapterCompleted(studyStateRef.current, chapterId);
    setStudyState(next);
    scheduleCloudPush(next);
  };

  const handleSaveAttempt = (attempt: QuizAttempt) => {
    const next = recordQuizAttempt(studyStateRef.current, attempt);
    setStudyState(next);
    scheduleCloudPush(next);
  };

  const handleImportState = (imported: UserStudyState) => {
    const next = mergeImportedState(studyStateRef.current, imported);
    setStudyState(next);
    scheduleCloudPush(next);
  };

  const handleAudioPositionChange = useCallback(
    (trackId: string, seconds: number) => {
      const next = updateSyncedAudioPosition(studyStateRef.current, trackId, seconds);
      if (next !== studyStateRef.current) {
        setStudyState(next);
        scheduleCloudPush(next);
      }
    },
    [scheduleCloudPush]
  );

  const handleLoadDemoAttempt = () => {
    const bank = MODULE_01_QUIZZES['1.1'] || Object.values(MODULE_01_QUIZZES)[0];
    if (!bank || bank.questions.length === 0) return;
    const answers = bank.questions.map((q, idx) => {
      // Simulate 60% accuracy with intentional errors on specific subtopics to showcase diagnostics
      const isCorrect = idx % 3 !== 0;
      const wrongIdx = (q.correctOptionIndex + 1) % 4;
      return {
        questionId: q.id,
        selectedOptionIndex: isCorrect ? q.correctOptionIndex : wrongIdx,
        isCorrect,
        subtopicTag: q.subtopicTag,
        cognitiveLevel: q.cognitiveLevel
      };
    });
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const demoAttempt: QuizAttempt = {
      attemptId: `demo-att-${Date.now()}`,
      sessionId: bank.sessionId,
      mode: 'full',
      timestamp: new Date().toISOString(),
      totalQuestions: answers.length,
      correctCount,
      scorePercentage: Math.round((correctCount / answers.length) * 100),
      answers
    };
    handleSaveAttempt(demoAttempt);
  };

  const handleExportEpub = async () => {
    if (isExportingEpub) return;
    setIsExportingEpub(true);
    try {
      await exportKindleEpub();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao exportar o arquivo EPUB.');
    } finally {
      setIsExportingEpub(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          {/* Top Row: Menu + Brand + Desktop Nav + Kindle EPUB Action */}
          <div className="h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 lg:hidden cursor-pointer shrink-0"
                aria-label="Abrir Menu de Capítulos"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div
                onClick={() => setActiveTab('reader')}
                className="flex items-center gap-2 cursor-pointer min-w-0"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm sm:text-base tracking-tight leading-none whitespace-nowrap truncate">
                    <span className="md:hidden">Engenharia IA</span>
                    <span className="hidden md:inline">Engenharia de Software em IA</span>
                  </div>
                  <div className="hidden md:block text-[11px] text-indigo-300 font-medium mt-0.5 truncate">
                    Módulo 01 • Desktop • Android APK • Kindle Colorsoft
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Desktop Primary Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('reader')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'reader'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Capítulos</span>
                </button>

                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'quiz'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileQuestion className="w-4 h-4" />
                  <span>Provas (30 Qs)</span>
                </button>

                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </nav>

              <button
                type="button"
                onClick={() => void runCloudSync()}
                disabled={syncStatus === 'syncing'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/70'
                    : syncStatus === 'syncing'
                    ? 'bg-sky-950/80 text-sky-300 border-sky-700/70'
                    : syncStatus === 'offline'
                    ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/70'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={syncError || 'Sincronizar progresso com Firebase Firestore agora'}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : syncStatus === 'offline' || syncStatus === 'unconfigured' ? (
                  <CloudOff className="w-3.5 h-3.5" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {syncStatus === 'synced'
                    ? 'Nuvem OK'
                    : syncStatus === 'syncing'
                    ? 'Sincronizando...'
                    : syncStatus === 'offline'
                    ? 'Offline'
                    : 'Nuvem Off'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Configurações de Nuvem (Archive.org & Firebase)"
                aria-label="Configurações de Nuvem"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleExportEpub}
                disabled={isExportingEpub}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-amber-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Baixar ou enviar livro EPUB 3 colorido via Send to Kindle ao Kindle Colorsoft"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="sm:hidden">{isExportingEpub ? '...' : '.EPUB'}</span>
                <span className="hidden sm:inline">{isExportingEpub ? 'Preparando...' : 'Kindle .EPUB'}</span>
              </button>
            </div>
          </div>

          {/* Mobile 3-column Navigation Tabs */}
          <nav className="grid grid-cols-3 gap-1 pb-2 md:hidden">
            <button
              onClick={() => setActiveTab('reader')}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reader'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 bg-slate-900/70 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Capítulos</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 bg-slate-900/70 hover:bg-slate-800'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Provas</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 bg-slate-900/70 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Layout with Left Chapters Drawer */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar for Chapters List */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 pt-0 flex flex-col ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                Módulo 01 (30h)
              </div>
              <div className="text-sm font-bold text-slate-900">
                11 Sessões & Provas
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {studyState.completedChapters.length}/{MODULE_01_CHAPTERS.length} lidos
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden cursor-pointer"
                aria-label="Fechar Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {MODULE_01_CHAPTERS.map((ch) => {
              const isSelected = ch.session === selectedSession;
              const isDone = studyState.completedChapters.includes(ch.id);
              const attempts = studyState.quizAttempts.filter((a) => a.sessionId === ch.session);
              const bestScore =
                attempts.length > 0
                  ? Math.max(...attempts.map((a) => a.scorePercentage))
                  : null;

              return (
                <div
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch.session)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-2xs'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-extrabold text-indigo-700">
                      Sessão {ch.session}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {bestScore !== null && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            bestScore >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : bestScore >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          Prova: {bestScore}%
                        </span>
                      )}
                      {isDone && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                    {ch.title.replace(/^\d+\.\d+\s*/, '')}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-950/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {activeTab === 'reader' && currentChapter && (
            <ChapterReader
              chapter={currentChapter}
              isCompleted={studyState.completedChapters.includes(currentChapter.id)}
              targetAnchor={targetAnchor}
              onToggleComplete={handleToggleComplete}
              onStartQuiz={(sessionId) => handleStartQuiz(sessionId, 'full', null)}
              onSelectChapter={(session) => handleSelectChapter(session)}
              prevSession={prevChapter?.session || null}
              nextSession={nextChapter?.session || null}
              syncedAudioPositions={studyState.audioPositions}
              onAudioPositionChange={handleAudioPositionChange}
              onOpenCloudSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizEngine
              chapters={MODULE_01_CHAPTERS}
              quizzes={MODULE_01_QUIZZES}
              studyState={studyState}
              initialSessionId={selectedSession}
              initialMode={quizMode}
              initialSubtopicFilter={quizSubtopic}
              onSaveAttempt={handleSaveAttempt}
              onNavigateToChapterAnchor={(sessionId, anchor) =>
                handleSelectChapter(sessionId, anchor)
              }
              onOpenDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'dashboard' && (
            <AnalyticsDashboard
              chapters={MODULE_01_CHAPTERS}
              quizzes={MODULE_01_QUIZZES}
              studyState={studyState}
              onSelectChapter={(sessionId, anchor) =>
                handleSelectChapter(sessionId, anchor)
              }
              onStartQuiz={(sessionId, mode, sub) =>
                handleStartQuiz(sessionId, mode, sub)
              }
              onImportState={handleImportState}
              onLoadDemoAttempt={handleLoadDemoAttempt}
              syncStatus={syncStatus}
              lastSyncedAt={lastSyncedAt}
              syncError={syncError}
              onSyncNow={() => void runCloudSync()}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </main>
      </div>

      <CloudSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={() => void runCloudSync()}
      />
    </div>
  );
};

export default App;
