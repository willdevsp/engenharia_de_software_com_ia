import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  FileQuestion,
  GraduationCap,
  Lock,
  Menu,
  RefreshCw,
  Settings,
  X
} from 'lucide-react';
import { CHAPTER_SUMMARIES, COURSE_MODULES } from './generated/catalog';
import { getCachedModuleData, loadModuleData } from './generated/moduleLoader';
import type {
  CloudSyncStatus,
  CourseModuleInfo,
  ModuleBundlePayload,
  ModuleExamCycle,
  QuizAttempt,
  QuizQuestion,
  SessionQuizBank,
  UserStudyState
} from './types/course';
import {
  areStudyStatesEqual,
  clearSessionQuestionAnswers,
  getSessionUniqueAnswerStats,
  loadStudyState,
  mergeImportedState,
  mergeStudyStates,
  recordQuizAttempt,
  recordSessionQuestionAnswer,
  saveStudyState,
  toggleChapterCompleted,
  updateChapterReadingProgress,
  updateSyncedAudioPosition
} from './utils/storage';
import {
  getEffectiveModuleMastery,
  isModuleUnlocked,
  startTimedModuleExamAttempt,
  submitModuleExamAttempt,
  syncRestudyCompletion,
  updateTimedModuleExamDraftAnswer,
  type ModuleExamSubmissionOutcome
} from './utils/masteryGate';
import { isFirebaseConfigured } from './utils/cloudConfig';
import { resetStudyStateLocalAndCloud, syncStudyStateWithCloud } from './utils/cloudSync';
import { CourseHome } from './components/CourseHome';
import { ChapterReader } from './components/ChapterReader';
import { QuizEngine } from './components/QuizEngine';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CloudSettingsModal } from './components/CloudSettingsModal';
import { exportKindleEpub } from './utils/nativeExport';

type ActiveView = 'home' | 'module';
type ActiveTab = 'reader' | 'quiz' | 'dashboard';

function getDefaultModuleId(state: UserStudyState): number {
  const unlockedAvailable = COURSE_MODULES.find(
    (m) => m.status === 'available' && isModuleUnlocked(m.id, state)
  );
  return unlockedAvailable?.id ?? COURSE_MODULES[0]?.id ?? 1;
}

function resolveDefaultSessionForModule(moduleId: number, state: UserStudyState): string {
  const modSummaries = CHAPTER_SUMMARIES.filter((c) => c.module === moduleId);
  if (modSummaries.length === 0) return '';
  const mastery = state.moduleMastery?.[String(moduleId)];
  if (mastery?.status === 're-study-required' && mastery.requiredRestudyChapterIds.length > 0) {
    const firstRestudy = modSummaries.find((c) =>
      mastery.requiredRestudyChapterIds.includes(c.id)
    );
    if (firstRestudy) return firstRestudy.session;
  }
  const firstUnread = modSummaries.find((c) => !state.completedChapters.includes(c.id));
  return (firstUnread || modSummaries[0]).session;
}

export const App: React.FC = () => {
  const [studyState, setStudyState] = useState<UserStudyState>(() => loadStudyState());
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedModuleId, setSelectedModuleId] = useState<number>(() =>
    getDefaultModuleId(loadStudyState())
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('reader');
  const [quizScope, setQuizScope] = useState<'session' | 'module-exam'>('session');
  const [selectedSession, setSelectedSession] = useState<string>(() => {
    const initialState = loadStudyState();
    return resolveDefaultSessionForModule(getDefaultModuleId(initialState), initialState);
  });
  const [targetAnchor, setTargetAnchor] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<'full' | 'quick' | 'error-notebook'>('full');
  const [quizSubtopic, setQuizSubtopic] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [exportingModuleId, setExportingModuleId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Lazy-loaded module payloads keyed by moduleId (empty at startup for lightweight Home)
  const [loadedModules, setLoadedModules] = useState<Record<number, ModuleBundlePayload>>({});
  const [isLoadingModule, setIsLoadingModule] = useState<boolean>(false);
  const [moduleLoadError, setModuleLoadError] = useState<string | null>(null);

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

  // Lazy-load the selected module chunk ONLY when entering 'module' view
  useEffect(() => {
    if (activeView !== 'module') return;
    if (!isModuleUnlocked(selectedModuleId, studyStateRef.current)) {
      setActiveView('home');
      return;
    }

    const existing = loadedModules[selectedModuleId] || getCachedModuleData(selectedModuleId);
    if (existing) {
      if (!loadedModules[selectedModuleId]) {
        setLoadedModules((prev) => ({ ...prev, [selectedModuleId]: existing }));
      }
      setModuleLoadError(null);
      setIsLoadingModule(false);
      return;
    }

    let cancelled = false;
    setIsLoadingModule(true);
    setModuleLoadError(null);

    loadModuleData(selectedModuleId)
      .then((payload) => {
        if (cancelled) return;
        setLoadedModules((prev) => ({ ...prev, [selectedModuleId]: payload }));
        setIsLoadingModule(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setModuleLoadError(
          err instanceof Error ? err.message : 'Erro ao carregar módulo sob demanda.'
        );
        setIsLoadingModule(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, selectedModuleId, loadedModules]);

  const availableModules = useMemo(
    () => COURSE_MODULES.filter((m) => m.status === 'available'),
    []
  );

  const activeModule = useMemo(
    () =>
      COURSE_MODULES.find((m) => m.id === selectedModuleId) ||
      availableModules[0] ||
      COURSE_MODULES[0],
    [selectedModuleId, availableModules]
  );

  const activeBundle = activeModule ? loadedModules[activeModule.id] : undefined;
  const moduleChapters = useMemo(() => activeBundle?.chapters || [], [activeBundle]);
  const moduleQuizzes = useMemo(
    () => (activeBundle?.quizzes || {}) as Record<string, SessionQuizBank>,
    [activeBundle]
  );

  const moduleChapterSummaries = useMemo(
    () =>
      activeModule
        ? CHAPTER_SUMMARIES.filter((c) => c.module === activeModule.id)
        : [],
    [activeModule]
  );

  const activeMastery = useMemo(
    () =>
      activeModule
        ? getEffectiveModuleMastery(activeModule.id, studyState, moduleChapterSummaries)
        : null,
    [activeModule, studyState, moduleChapterSummaries]
  );

  const restudyChapterSet = useMemo(
    () => new Set(activeMastery?.requiredRestudyChapterIds || []),
    [activeMastery]
  );

  const moduleChapterIds = useMemo(
    () => new Set(moduleChapterSummaries.map((c) => c.id)),
    [moduleChapterSummaries]
  );

  const moduleCompletedCount = useMemo(
    () => studyState.completedChapters.filter((id) => moduleChapterIds.has(id)).length,
    [studyState.completedChapters, moduleChapterIds]
  );

  const moduleQuestionsCount = activeModule?.questionsCount || 0;

  const currentChapterIndex = Math.max(
    0,
    moduleChapters.findIndex((c) => c.session === selectedSession)
  );
  const currentChapter = moduleChapters[currentChapterIndex] || moduleChapters[0];
  const prevChapter =
    currentChapterIndex > 0 ? moduleChapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex < moduleChapters.length - 1
      ? moduleChapters[currentChapterIndex + 1]
      : null;

  const handleGoHome = () => {
    setActiveView('home');
    setSidebarOpen(false);
  };

  const handleOpenModule = (
    moduleId: number,
    sessionId?: string,
    tab: ActiveTab = 'reader',
    scope: 'session' | 'module-exam' = 'session'
  ) => {
    const modInfo = COURSE_MODULES.find((m) => m.id === moduleId);
    if (!modInfo || modInfo.status !== 'available') return;
    if (!isModuleUnlocked(moduleId, studyStateRef.current)) {
      return;
    }

    const resolvedSession =
      sessionId || resolveDefaultSessionForModule(moduleId, studyStateRef.current);
    setSelectedModuleId(moduleId);
    setSelectedSession(resolvedSession);
    setTargetAnchor(null);
    setQuizMode('full');
    setQuizSubtopic(null);
    setQuizScope(scope);
    setActiveTab(tab);
    setActiveView('module');
    setSidebarOpen(false);
  };

  const handleHeaderModuleChange = (value: string) => {
    if (value === 'home') {
      handleGoHome();
      return;
    }
    const nextModuleId = Number.parseInt(value, 10);
    if (!Number.isInteger(nextModuleId)) return;
    if (!isModuleUnlocked(nextModuleId, studyStateRef.current)) return;

    const resolvedSession = resolveDefaultSessionForModule(
      nextModuleId,
      studyStateRef.current
    );
    setSelectedModuleId(nextModuleId);
    setSelectedSession(resolvedSession);
    setTargetAnchor(null);
    setQuizMode('full');
    setQuizSubtopic(null);
    setQuizScope('session');
    if (activeView === 'home') {
      setActiveTab('reader');
    }
    setActiveView('module');
    setSidebarOpen(false);
  };

  const handleSelectChapter = (session: string, anchor?: string) => {
    setSelectedSession(session);
    setTargetAnchor(anchor || null);
    setActiveTab('reader');
    setSidebarOpen(false);
  };

  const handleStartQuiz = (
    session: string,
    mode: 'full' | 'quick' | 'error-notebook' = 'full',
    subtopicFilter: string | null = null,
    scope: 'session' | 'module-exam' = 'session'
  ) => {
    setSelectedSession(session);
    setQuizMode(mode);
    setQuizSubtopic(subtopicFilter);
    setQuizScope(scope);
    setActiveTab('quiz');
    setSidebarOpen(false);
  };

  const handleToggleComplete = (chapterId: string) => {
    let next = toggleChapterCompleted(studyStateRef.current, chapterId);
    if (activeModule) {
      next = syncRestudyCompletion(activeModule.id, next);
    }
    setStudyState(next);
    scheduleCloudPush(next);
  };

  const handleUpdateReadingProgress = useCallback(
    (chapterId: string, percentage: number, visitedSections: string[]) => {
      const next = updateChapterReadingProgress(
        studyStateRef.current,
        chapterId,
        percentage,
        visitedSections
      );
      if (next !== studyStateRef.current) {
        setStudyState(next);
        scheduleCloudPush(next);
      }
    },
    [scheduleCloudPush]
  );

  const handleAnswerSessionQuestion = useCallback(
    (question: QuizQuestion, selectedOptionIndex: number) => {
      const modId = activeModule?.id || 1;
      const next = recordSessionQuestionAnswer(
        studyStateRef.current,
        question,
        modId,
        selectedOptionIndex,
        true
      );
      setStudyState(next);
      scheduleCloudPush(next);
    },
    [activeModule, scheduleCloudPush]
  );

  const handleClearSessionAnswers = useCallback(
    (sessionId: string) => {
      const next = clearSessionQuestionAnswers(studyStateRef.current, sessionId, true);
      setStudyState(next);
      scheduleCloudPush(next);
    },
    [scheduleCloudPush]
  );

  const handleSaveAttempt = (attempt: QuizAttempt) => {
    const next = recordQuizAttempt(studyStateRef.current, attempt);
    setStudyState(next);
    scheduleCloudPush(next);
  };

  const handleStartTimedModuleExam = useCallback(
    (moduleId: number, cycle: ModuleExamCycle, timeLimitSeconds: number) => {
      const next = startTimedModuleExamAttempt(
        moduleId,
        studyStateRef.current,
        cycle,
        timeLimitSeconds,
        true
      );
      setStudyState(next);
      scheduleCloudPush(next);
    },
    [scheduleCloudPush]
  );

  const handleUpdateModuleExamDraft = useCallback(
    (moduleId: number, questionId: string, optionIndex: number) => {
      const next = updateTimedModuleExamDraftAnswer(
        moduleId,
        studyStateRef.current,
        questionId,
        optionIndex,
        true
      );
      if (next !== studyStateRef.current) {
        setStudyState(next);
        scheduleCloudPush(next);
      }
    },
    [scheduleCloudPush]
  );

  const handleResetAllProgress = useCallback(async () => {
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    const res = await resetStudyStateLocalAndCloud();
    setStudyState(res.state);
    setSyncStatus(res.status);
    setSyncError(res.error || null);
    if (res.status === 'synced') {
      setLastSyncedAt(new Date().toISOString());
    }
    setSelectedModuleId(1);
    setSelectedSession(resolveDefaultSessionForModule(1, res.state));
    setActiveView('home');
    setActiveTab('reader');
    setSidebarOpen(false);
  }, []);

  const handleSubmitModuleExam = (
    moduleId: number,
    cycle: ModuleExamCycle,
    selectedAnswers: Record<string, number>
  ): ModuleExamSubmissionOutcome => {
    const bundle = loadedModules[moduleId] || getCachedModuleData(moduleId);
    const chList = bundle?.chapters || CHAPTER_SUMMARIES.filter((c) => c.module === moduleId);
    const qMap = (bundle?.quizzes || {}) as Record<string, SessionQuizBank>;

    const outcome = submitModuleExamAttempt(
      moduleId,
      studyStateRef.current,
      cycle,
      selectedAnswers,
      chList,
      qMap,
      true
    );
    setStudyState(outcome.nextState);
    scheduleCloudPush(outcome.nextState);
    return outcome;
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
    const bank = moduleQuizzes[selectedSession] || Object.values(moduleQuizzes)[0];
    if (!bank || bank.questions.length === 0) return;
    const answers = bank.questions.map((q, idx) => {
      const isCorrect = idx % 3 !== 0;
      const wrongIdx = (q.correctOptionIndex + 1) % 4;
      return {
        questionId: q.id,
        sessionId: q.sessionId,
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
      moduleId: activeModule?.id,
      mode: 'full',
      timestamp: new Date().toISOString(),
      totalQuestions: answers.length,
      correctCount,
      scorePercentage: Math.round((correctCount / answers.length) * 100),
      answers
    };
    handleSaveAttempt(demoAttempt);
  };

  const handleExportEpub = async (targetModule?: CourseModuleInfo) => {
    const mod = targetModule || activeModule;
    if (!mod || exportingModuleId !== null) return;
    if (!isModuleUnlocked(mod.id, studyStateRef.current)) {
      alert(
        `O EPUB do Módulo ${mod.code} está bloqueado até você atingir ≥ 70% na Prova Oficial do Módulo ${String(
          mod.id - 1
        ).padStart(2, '0')}.`
      );
      return;
    }
    setExportingModuleId(mod.id);
    try {
      await exportKindleEpub(mod);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar o arquivo EPUB.');
    } finally {
      setExportingModuleId(null);
    }
  };

  const isExportingActiveEpub = Boolean(activeModule && exportingModuleId === activeModule.id);
  const nextAvailableModule = activeModule
    ? COURSE_MODULES.find((m) => m.id === activeModule.id + 1 && m.status === 'available')
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          {/* Top Row + Responsive Module Dropdown */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 py-2 lg:py-0 lg:h-14">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 order-1">
              {activeView === 'module' && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 lg:hidden cursor-pointer shrink-0"
                  aria-label="Abrir Menu de Capítulos"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center gap-2 cursor-pointer min-w-0 text-left"
                title="Ir para a Página Inicial (Todos os Módulos)"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm sm:text-base tracking-tight leading-none whitespace-nowrap truncate">
                    <span className="xl:hidden">Engenharia IA</span>
                    <span className="hidden xl:inline">Engenharia de Software em IA</span>
                  </div>
                  <div className="hidden xl:block text-[11px] text-indigo-300 font-medium mt-0.5 truncate">
                    {activeView === 'module' && activeModule
                      ? `Módulo ${activeModule.code} • Desktop • Android APK • Kindle Colorsoft`
                      : '12 Módulos • Desktop • Android APK • Kindle Colorsoft'}
                  </div>
                </div>
              </button>
            </div>

            {/* Persistent Cross-Module Dropdown (Desktop & Mobile) */}
            <div className="order-3 lg:order-2 w-full lg:w-60 xl:w-64 shrink-0">
              <select
                id="module-switcher"
                aria-label="Selecionar módulo do curso"
                value={
                  activeView === 'home'
                    ? 'home'
                    : String(activeModule?.id ?? selectedModuleId)
                }
                onChange={(e) => handleHeaderModuleChange(e.target.value)}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 px-3 py-1.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer truncate"
              >
                <option value="home">Início (Todos os Módulos)</option>
                {availableModules.map((mod) => {
                  const unlocked = isModuleUnlocked(mod.id, studyState);
                  return (
                    <option key={mod.id} value={String(mod.id)} disabled={!unlocked}>
                      {unlocked
                        ? `Módulo ${mod.code} — ${mod.title}`
                        : `🔒 Módulo ${mod.code} — ${mod.title} (Requer Mód. ${String(
                            mod.id - 1
                          ).padStart(2, '0')} ≥ 70%)`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Right Controls: Module Tabs + Cloud + Settings + EPUB */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 lg:order-3">
              {activeView === 'module' && (
                <nav className="hidden md:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('reader')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'reader'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Capítulos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('quiz')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'quiz'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <FileQuestion className="w-4 h-4" />
                    <span>
                      Provas{moduleQuestionsCount > 0 ? ` (${moduleQuestionsCount})` : ''}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                </nav>
              )}

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

              {activeView === 'module' && activeModule && (
                <button
                  type="button"
                  onClick={() => void handleExportEpub(activeModule)}
                  disabled={exportingModuleId !== null}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-amber-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
                  title={`Gerar e enviar ${activeModule.epubFileName} via Send to Kindle ao Kindle Colorsoft`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="sm:hidden">
                    {isExportingActiveEpub ? '...' : '.EPUB'}
                  </span>
                  <span className="hidden sm:inline">
                    {isExportingActiveEpub ? 'Gerando EPUB...' : 'Kindle .EPUB'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile 3-column Navigation Tabs (module view only) */}
          {activeView === 'module' && (
            <nav className="grid grid-cols-3 gap-1 pb-2 md:hidden">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
          )}
        </div>
      </header>

      {/* Main Content Layout */}
      {activeView === 'home' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <CourseHome
            modules={COURSE_MODULES}
            chapterSummaries={CHAPTER_SUMMARIES}
            studyState={studyState}
            onOpenModule={handleOpenModule}
            onExportModuleEpub={(mod) => void handleExportEpub(mod)}
            exportingModuleId={exportingModuleId}
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            syncError={syncError}
            onSyncNow={() => void runCloudSync()}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto flex">
          {/* Sidebar for Active Module Chapters */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 pt-0 flex flex-col ${
              sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`}
          >
            <div className="p-4 border-b border-slate-200 space-y-2.5">
              <button
                type="button"
                onClick={handleGoHome}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Todos os Módulos</span>
              </button>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                    Módulo {activeModule?.code || '01'}
                    {activeModule?.suggestedHours ? ` (${activeModule.suggestedHours}h)` : ''}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {moduleChapterSummaries.length}{' '}
                    {moduleChapterSummaries.length === 1 ? 'Sessão & Prova' : 'Sessões & Provas'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {moduleCompletedCount}/{moduleChapterSummaries.length} lidos
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

              {/* Quick Trigger for Official Module Mastery Exam */}
              {activeModule && (
                <button
                  type="button"
                  onClick={() =>
                    handleStartQuiz(
                      selectedSession || moduleChapterSummaries[0]?.session || '',
                      'full',
                      null,
                      'module-exam'
                    )
                  }
                  className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    Prova Final (Máx. 40q)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white shrink-0">
                    {activeMastery?.status === 'approved'
                      ? `${activeMastery.approvedScore ?? 70}% ✓`
                      : activeMastery?.status === 're-study-required'
                      ? 'Reestudo'
                      : '≥ 70%'}
                  </span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {moduleChapterSummaries.map((ch) => {
                const isSelected = ch.session === selectedSession;
                const isDone = studyState.completedChapters.includes(ch.id);
                const needsRestudy = restudyChapterSet.has(ch.id) && !isDone;
                const readingPct = isDone ? 100 : studyState.readingProgress[ch.id] || 0;
                const uniqueStats = getSessionUniqueAnswerStats(studyState, ch.session);
                const bestScore = uniqueStats.accuracyPercentage;

                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChapter(ch.session)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 shadow-2xs'
                        : needsRestudy
                        ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-50'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-extrabold text-indigo-700">
                        Sessão {ch.session}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {needsRestudy && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                            <AlertTriangle className="w-2.5 h-2.5" /> Reestudo
                          </span>
                        )}
                        {!isDone && readingPct > 0 && !needsRestudy && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {readingPct}%
                          </span>
                        )}
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
          <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8">
            {isLoadingModule && !activeBundle ? (
              <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <div className="text-base font-extrabold text-slate-900">
                  Carregando Módulo {activeModule?.code || ''}...
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Carregamento sob demanda de capítulos, fórmulas e provas do módulo.
                </div>
              </div>
            ) : moduleLoadError && !activeBundle ? (
              <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-rose-300 p-8 text-center shadow-xs space-y-3">
                <Lock className="w-8 h-8 text-rose-600 mx-auto" />
                <div className="text-base font-extrabold text-slate-900">
                  Não foi possível carregar o Módulo {activeModule?.code || ''}
                </div>
                <p className="text-xs text-rose-700">{moduleLoadError}</p>
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Voltar para Início
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'reader' && currentChapter && (
                  <ChapterReader
                    chapter={currentChapter}
                    isCompleted={studyState.completedChapters.includes(currentChapter.id)}
                    isRestudyRequired={restudyChapterSet.has(currentChapter.id)}
                    readingProgressEntry={studyState.readingProgressLog?.[currentChapter.id]}
                    legacyReadingPercentage={studyState.readingProgress[currentChapter.id] || 0}
                    targetAnchor={targetAnchor}
                    onToggleComplete={handleToggleComplete}
                    onUpdateReadingProgress={handleUpdateReadingProgress}
                    onStartQuiz={(sessionId) =>
                      handleStartQuiz(sessionId, 'full', null, 'session')
                    }
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
                    moduleInfo={activeModule}
                    chapters={moduleChapters}
                    quizzes={moduleQuizzes}
                    studyState={studyState}
                    initialSessionId={selectedSession}
                    initialMode={quizMode}
                    initialSubtopicFilter={quizSubtopic}
                    initialScope={quizScope}
                    onAnswerSessionQuestion={handleAnswerSessionQuestion}
                    onClearSessionAnswers={handleClearSessionAnswers}
                    onSaveAttempt={handleSaveAttempt}
                    onStartTimedModuleExam={handleStartTimedModuleExam}
                    onUpdateModuleExamDraft={handleUpdateModuleExamDraft}
                    onSubmitModuleExam={handleSubmitModuleExam}
                    onNavigateToChapterAnchor={(sessionId, anchor) =>
                      handleSelectChapter(sessionId, anchor)
                    }
                    onOpenDashboard={() => setActiveTab('dashboard')}
                    hasNextModule={Boolean(nextAvailableModule)}
                    onGoToNextModule={(nextId) => handleOpenModule(nextId, undefined, 'reader')}
                  />
                )}

                {activeTab === 'dashboard' && (
                  <AnalyticsDashboard
                    moduleInfo={activeModule}
                    chapters={moduleChapters}
                    quizzes={moduleQuizzes}
                    studyState={studyState}
                    onSelectChapter={(sessionId, anchor) =>
                      handleSelectChapter(sessionId, anchor)
                    }
                    onStartQuiz={(sessionId, mode, sub, scope) =>
                      handleStartQuiz(sessionId, mode, sub, scope)
                    }
                    onImportState={handleImportState}
                    onLoadDemoAttempt={handleLoadDemoAttempt}
                    syncStatus={syncStatus}
                    lastSyncedAt={lastSyncedAt}
                    syncError={syncError}
                    onSyncNow={() => void runCloudSync()}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onResetAllProgress={handleResetAllProgress}
                  />
                )}
              </>
            )}
          </main>
        </div>
      )}

      <CloudSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={() => void runCloudSync()}
        onResetAllProgress={handleResetAllProgress}
      />
    </div>
  );
};

export default App;
