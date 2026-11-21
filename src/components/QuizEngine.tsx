import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  XCircle
} from 'lucide-react';
import type {
  ChapterData,
  CourseModuleInfo,
  ModuleExamCycle,
  QuizAttempt,
  QuizQuestion,
  SessionQuizBank,
  UserStudyState
} from '../types/course';
import { getMissedQuestionIds } from '../utils/storage';
import { renderInlineTextWithMath } from '../utils/mathRenderer';
import {
  computeModuleExamTiming,
  formatCountdownSeconds,
  getEffectiveModuleMastery,
  getPendingChaptersForModuleExam,
  MASTERY_PASS_PERCENTAGE,
  prepareModuleExamSession,
  type ModuleExamSubmissionOutcome
} from '../utils/masteryGate';

interface QuizEngineProps {
  moduleInfo?: CourseModuleInfo;
  chapters: ChapterData[];
  quizzes: Record<string, SessionQuizBank>;
  studyState: UserStudyState;
  initialSessionId: string;
  initialMode?: 'full' | 'quick' | 'error-notebook';
  initialSubtopicFilter?: string | null;
  initialScope?: 'session' | 'module-exam';
  onAnswerSessionQuestion?: (question: QuizQuestion, selectedOptionIndex: number) => void;
  onClearSessionAnswers?: (sessionId: string) => void;
  onSaveAttempt: (attempt: QuizAttempt) => void;
  onStartTimedModuleExam?: (
    moduleId: number,
    cycle: ModuleExamCycle,
    timeLimitSeconds: number
  ) => void;
  onUpdateModuleExamDraft?: (
    moduleId: number,
    questionId: string,
    optionIndex: number
  ) => void;
  onSubmitModuleExam?: (
    moduleId: number,
    cycle: ModuleExamCycle,
    selectedAnswers: Record<string, number>
  ) => ModuleExamSubmissionOutcome;
  onNavigateToChapterAnchor: (sessionId: string, anchor: string) => void;
  onOpenDashboard: () => void;
  onGoToNextModule?: (nextModuleId: number) => void;
  hasNextModule?: boolean;
}

const COGNITIVE_LABELS: Record<string, { label: string; color: string }> = {
  conceptual: { label: 'Conceitual & Fundamentos', color: 'bg-blue-100 text-blue-800' },
  architecture: { label: 'Arquitetura & Funcionamento Interno', color: 'bg-purple-100 text-purple-800' },
  'code-practice': { label: 'Prática & Debug de Código', color: 'bg-teal-100 text-teal-800' }
};

const LETTERS = ['A', 'B', 'C', 'D'];

export const QuizEngine: React.FC<QuizEngineProps> = ({
  moduleInfo,
  chapters,
  quizzes,
  studyState,
  initialSessionId,
  initialMode = 'full',
  initialSubtopicFilter = null,
  initialScope = 'session',
  onAnswerSessionQuestion,
  onClearSessionAnswers,
  onSaveAttempt,
  onStartTimedModuleExam,
  onUpdateModuleExamDraft,
  onSubmitModuleExam,
  onNavigateToChapterAnchor,
  onOpenDashboard,
  onGoToNextModule,
  hasNextModule = false
}) => {
  const moduleCode = moduleInfo?.code || String(chapters[0]?.module || 1).padStart(2, '0');
  const moduleLabel = `Módulo ${moduleCode}`;
  const moduleKey = moduleInfo?.id ?? chapters[0]?.module ?? 1;

  const [examScope, setExamScope] = useState<'session' | 'module-exam'>(initialScope);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSessionId || chapters[0]?.session || ''
  );
  const [mode, setMode] = useState<'full' | 'quick' | 'error-notebook'>(initialMode);
  const [subtopicFilter, setSubtopicFilter] = useState<string | null>(initialSubtopicFilter);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [confirmClearSession, setConfirmClearSession] = useState<boolean>(false);

  // Module Exam specific state
  const [moduleExamOutcome, setModuleExamOutcome] = useState<ModuleExamSubmissionOutcome | null>(null);
  const [moduleExamSeed, setModuleExamSeed] = useState<number>(0);
  const [localModuleDraft, setLocalModuleDraft] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoSubmittedStartRef = useRef<string | null>(null);

  useEffect(() => {
    const validSession = chapters.some((c) => c.session === initialSessionId)
      ? initialSessionId
      : chapters[0]?.session || '';
    setSelectedSessionId(validSession);
    setMode(initialMode);
    setSubtopicFilter(initialSubtopicFilter ?? null);
    setExamScope(initialScope);
    setIsSubmitted(false);
    setConfirmClearSession(false);
    setModuleExamOutcome(null);
  }, [moduleKey, chapters, initialSessionId, initialMode, initialSubtopicFilter, initialScope]);

  const currentBank = quizzes[selectedSessionId];

  // Hydrate persistent answers for the active session from studyState.questionAnswers (+ valid attempts fallback)
  const savedSessionAnswers = useMemo(() => {
    const map: Record<string, number> = {};
    if (!currentBank) return map;

    const latestAttemptByQ = new Map<string, { selected: number; ts: number }>();
    const chrono = [...(studyState.quizAttempts || [])].reverse();
    for (const att of chrono) {
      if (att.sessionId !== selectedSessionId || att.mode === 'module-exam') continue;
      const attTs = Date.parse(att.timestamp) || 0;
      for (const ans of att.answers || []) {
        if (ans.selectedOptionIndex >= 0) {
          latestAttemptByQ.set(ans.questionId, { selected: ans.selectedOptionIndex, ts: attTs });
        }
      }
    }

    for (const q of currentBank.questions) {
      const continuous = studyState.questionAnswers?.[q.id];
      const attEntry = latestAttemptByQ.get(q.id);
      if (continuous && attEntry) {
        const contTs = Date.parse(continuous.updatedAt) || 0;
        map[q.id] = contTs >= attEntry.ts ? continuous.selectedOptionIndex : attEntry.selected;
      } else if (continuous) {
        map[q.id] = continuous.selectedOptionIndex;
      } else if (attEntry) {
        map[q.id] = attEntry.selected;
      }
    }
    return map;
  }, [currentBank, selectedSessionId, studyState.questionAnswers, studyState.quizAttempts]);

  const availableSubtopics = useMemo(() => {
    if (!currentBank) return [];
    return Array.from(new Set(currentBank.questions.map((q) => q.subtopicTag)));
  }, [currentBank]);

  const activeQuestions: QuizQuestion[] = useMemo(() => {
    if (!currentBank) return [];
    let pool = [...currentBank.questions];

    if (subtopicFilter) {
      pool = pool.filter((q) => q.subtopicTag === subtopicFilter);
    }

    if (mode === 'error-notebook') {
      const missedIds = getMissedQuestionIds(studyState, selectedSessionId);
      const filtered = pool.filter((q) => missedIds.has(q.id));
      if (filtered.length > 0) {
        pool = filtered;
      }
    } else if (mode === 'quick') {
      pool = pool.slice(0, 10);
    }

    return pool;
  }, [currentBank, mode, subtopicFilter, studyState, selectedSessionId]);

  const moduleMastery = useMemo(
    () => getEffectiveModuleMastery(moduleKey, studyState, chapters),
    [moduleKey, studyState, chapters]
  );

  const eligibility = useMemo(
    () => getPendingChaptersForModuleExam(moduleKey, chapters, studyState),
    [moduleKey, chapters, studyState]
  );

  const chapterById = useMemo(() => {
    const map = new Map<string, ChapterData>();
    for (const ch of chapters) map.set(ch.id, ch);
    return map;
  }, [chapters]);

  const preparedModuleExam = useMemo(() => {
    if (!eligibility.isEligible || moduleExamOutcome) return null;
    return prepareModuleExamSession(moduleKey, studyState, chapters, quizzes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eligibility.isEligible,
    moduleExamOutcome,
    moduleKey,
    studyState.moduleMastery,
    chapters,
    quizzes,
    moduleExamSeed
  ]);

  const examTimingSummary = useMemo(
    () => (preparedModuleExam ? computeModuleExamTiming(preparedModuleExam.questions) : null),
    [preparedModuleExam]
  );

  const isTimedAttemptRunning = Boolean(
    preparedModuleExam?.cycle.currentAttemptStartedAt &&
      preparedModuleExam?.cycle.currentAttemptTimeLimitSeconds
  );

  // Sync draft answers from persisted activeCycle whenever exam resumes/loads
  useEffect(() => {
    if (preparedModuleExam?.cycle.draftAnswers) {
      setLocalModuleDraft({ ...preparedModuleExam.cycle.draftAnswers });
    } else {
      setLocalModuleDraft({});
    }
  }, [
    preparedModuleExam?.cycle.cycleNumber,
    preparedModuleExam?.cycle.attemptCount,
    preparedModuleExam?.cycle.currentAttemptStartedAt
  ]);

  // Ref-backed submit handler so countdown expiration submits cleanly once
  const submitLatestModuleExamRef = useRef<() => void>(() => {});
  submitLatestModuleExamRef.current = () => {
    if (!preparedModuleExam || !onSubmitModuleExam || moduleExamOutcome) return;
    const outcome = onSubmitModuleExam(moduleKey, preparedModuleExam.cycle, localModuleDraft);
    setModuleExamOutcome(outcome);
    setRemainingSeconds(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Continuous wall-clock countdown timer when Official Module Exam has started
  useEffect(() => {
    const startedAt = preparedModuleExam?.cycle.currentAttemptStartedAt;
    const limitSeconds = preparedModuleExam?.cycle.currentAttemptTimeLimitSeconds;
    if (!startedAt || !limitSeconds || moduleExamOutcome || examScope !== 'module-exam') {
      setRemainingSeconds(null);
      return;
    }

    const startMs = Date.parse(startedAt);
    if (!Number.isFinite(startMs)) {
      setRemainingSeconds(null);
      return;
    }
    const deadlineMs = startMs + limitSeconds * 1000;

    const tick = () => {
      const secsLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(secsLeft);
      if (secsLeft <= 0 && autoSubmittedStartRef.current !== startedAt) {
        autoSubmittedStartRef.current = startedAt;
        submitLatestModuleExamRef.current();
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [
    preparedModuleExam?.cycle.currentAttemptStartedAt,
    preparedModuleExam?.cycle.currentAttemptTimeLimitSeconds,
    moduleExamOutcome,
    examScope
  ]);

  const handleSelectOption = (question: QuizQuestion, optionIdx: number) => {
    if (isSubmitted) return;
    if (onAnswerSessionQuestion) {
      onAnswerSessionQuestion(question, optionIdx);
    }
  };

  const handleSelectModuleOption = (questionId: string, optionIdx: number) => {
    if (moduleExamOutcome || !isTimedAttemptRunning) return;
    setLocalModuleDraft((prev) => ({ ...prev, [questionId]: optionIdx }));
    if (onUpdateModuleExamDraft) {
      onUpdateModuleExamDraft(moduleKey, questionId, optionIdx);
    }
  };

  const handleSubmitSessionExam = () => {
    // Only record questions actually answered (>= 0); never save -1 blank items as wrong
    const answeredQuestions = activeQuestions.filter(
      (q) => savedSessionAnswers[q.id] !== undefined
    );
    if (answeredQuestions.length === 0) return;

    const answers = answeredQuestions.map((q) => {
      const selected = savedSessionAnswers[q.id];
      return {
        questionId: q.id,
        sessionId: q.sessionId,
        selectedOptionIndex: selected,
        isCorrect: selected === q.correctOptionIndex,
        subtopicTag: q.subtopicTag,
        cognitiveLevel: q.cognitiveLevel
      };
    });

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const scorePercentage = Math.round((correctCount / answeredQuestions.length) * 100);

    const attempt: QuizAttempt = {
      attemptId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: selectedSessionId,
      moduleId: moduleKey,
      mode,
      timestamp: new Date().toISOString(),
      totalQuestions: answeredQuestions.length,
      correctCount,
      scorePercentage,
      answers
    };

    onSaveAttempt(attempt);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTimedOfficialExam = () => {
    if (!preparedModuleExam || !examTimingSummary || !onStartTimedModuleExam) return;
    autoSubmittedStartRef.current = null;
    setLocalModuleDraft({});
    onStartTimedModuleExam(moduleKey, preparedModuleExam.cycle, examTimingSummary.totalSeconds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOfficialModuleExam = () => {
    submitLatestModuleExamRef.current();
  };

  const handleStartNextExtraOrCycle = () => {
    autoSubmittedStartRef.current = null;
    setLocalModuleDraft({});
    setModuleExamOutcome(null);
    setModuleExamSeed((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetSessionQuiz = (
    newSessionId = selectedSessionId,
    newMode = mode,
    newSubtopic: string | null = subtopicFilter
  ) => {
    setSelectedSessionId(newSessionId);
    setMode(newMode);
    setSubtopicFilter(newSubtopic);
    setIsSubmitted(false);
    setConfirmClearSession(false);
  };

  const handleClearCurrentSessionClick = () => {
    if (!confirmClearSession) {
      setConfirmClearSession(true);
      window.setTimeout(() => setConfirmClearSession(false), 4500);
      return;
    }
    setConfirmClearSession(false);
    setIsSubmitted(false);
    if (onClearSessionAnswers) {
      onClearSessionAnswers(selectedSessionId);
    }
  };

  const answeredInActiveList = useMemo(
    () => activeQuestions.filter((q) => savedSessionAnswers[q.id] !== undefined),
    [activeQuestions, savedSessionAnswers]
  );
  const answeredCount = answeredInActiveList.length;
  const correctAnsweredCount = useMemo(
    () =>
      answeredInActiveList.filter(
        (q) => savedSessionAnswers[q.id] === q.correctOptionIndex
      ).length,
    [answeredInActiveList, savedSessionAnswers]
  );
  const currentAccuracyPct =
    answeredCount > 0 ? Math.round((correctAnsweredCount / answeredCount) * 100) : null;

  const moduleAnsweredCount = preparedModuleExam
    ? Object.keys(localModuleDraft).filter((id) =>
        preparedModuleExam.questions.some((q) => q.id === id)
      ).length
    : 0;

  const scoreSummary = useMemo(() => {
    if (!isSubmitted || answeredInActiveList.length === 0) return null;
    let correct = 0;
    const bySubtopic: Record<
      string,
      { total: number; correct: number; anchor: string; docUrl: string; docLabel: string }
    > = {};

    for (const q of answeredInActiveList) {
      const isOk = savedSessionAnswers[q.id] === q.correctOptionIndex;
      if (isOk) correct++;
      if (!bySubtopic[q.subtopicTag]) {
        bySubtopic[q.subtopicTag] = {
          total: 0,
          correct: 0,
          anchor: q.chapterAnchor,
          docUrl: q.officialDocUrl,
          docLabel: q.officialDocLabel
        };
      }
      bySubtopic[q.subtopicTag].total++;
      if (isOk) bySubtopic[q.subtopicTag].correct++;
    }

    return {
      correct,
      total: answeredInActiveList.length,
      percentage: Math.round((correct / answeredInActiveList.length) * 100),
      bySubtopic
    };
  }, [isSubmitted, answeredInActiveList, savedSessionAnswers]);

  const moduleExamBadgeText =
    moduleMastery.status === 'approved'
      ? `Aprovado (${moduleMastery.approvedScore ?? 70}%)`
      : moduleMastery.status === 're-study-required'
      ? 'Reestudo Obrigatório'
      : isTimedAttemptRunning
      ? `Em Andamento (${formatCountdownSeconds(remainingSeconds ?? 0)})`
      : moduleMastery.activeCycle && moduleMastery.activeCycle.attemptCount > 0
      ? `Extra ${moduleMastery.activeCycle.attemptCount}/2 (${moduleMastery.activeCycle.consolidatedScore}%)`
      : eligibility.isEligible
      ? 'Liberada (Cronometrada)'
      : 'Requer Percurso';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Scope Switcher: Continuous Session Study vs Timed Official Module Exam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setExamScope('session')}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            examScope === 'session'
              ? 'bg-white border-indigo-600 shadow-sm'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
              Provas de Sessão (Salvo a Cada Clique)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Estudo Contínuo
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            Responda aos poucos sem perder o progresso
          </div>
        </button>

        <button
          type="button"
          onClick={() => setExamScope('module-exam')}
          data-testid="tab-module-exam"
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            examScope === 'module-exam'
              ? 'bg-slate-950 text-white border-amber-400 shadow-md'
              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${
                examScope === 'module-exam' ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              Prova Final • {moduleLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                moduleMastery.status === 'approved'
                  ? 'bg-emerald-500 text-white'
                  : moduleMastery.status === 're-study-required'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-400 text-slate-950'
              }`}
            >
              {moduleExamBadgeText}
            </span>
          </div>
          <div className="text-sm font-bold mt-1">
            Exame Único com Timer (Máx. 40q • Meta ≥ 70%)
          </div>
        </button>
      </div>

      {/* ===================== MODULE OFFICIAL TIMED EXAM VIEW ===================== */}
      {examScope === 'module-exam' ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Award className="w-4 h-4" />
                  Prova Final de Desbloqueio (Sessão Única Cronometrada) • {moduleLabel}
                </span>
                <h1 className="text-2xl font-extrabold mt-1">
                  {moduleMastery.status === 'approved'
                    ? `${moduleLabel} Aprovado (${moduleMastery.approvedScore}%)`
                    : preparedModuleExam
                    ? preparedModuleExam.chanceNumber === 1
                      ? `Chance 1/3 — Prova Completa (${preparedModuleExam.questions.length} questões)`
                      : `Chance ${preparedModuleExam.chanceNumber}/3 — ${
                          preparedModuleExam.chanceNumber === 2 ? '1ª' : '2ª'
                        } Prova Extra de Recuperação (${preparedModuleExam.questions.length} questões)`
                    : `Avaliação Oficial do ${moduleLabel}`}
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl">
                  Realizada de uma única vez com tempo somado pela complexidade das questões. Meta consolidada: <strong>≥ {MASTERY_PASS_PERCENTAGE}%</strong> em até 3 chances.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {isTimedAttemptRunning && remainingSeconds !== null && (
                  <div
                    data-testid="module-exam-countdown"
                    className={`rounded-xl px-4 py-3 border text-center min-w-[130px] ${
                      remainingSeconds <= 60
                        ? 'bg-rose-950 border-rose-400 text-rose-200 animate-pulse'
                        : remainingSeconds <= 300
                        ? 'bg-amber-950 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-indigo-400/50 text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Tempo Restante
                    </div>
                    <div className="text-2xl font-mono font-extrabold mt-0.5">
                      {formatCountdownSeconds(remainingSeconds)}
                    </div>
                  </div>
                )}

                {moduleMastery.activeCycle && (
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-right">
                    <div className="text-[11px] font-bold uppercase text-indigo-200">
                      Consolidado Ciclo #{moduleMastery.activeCycle.cycleNumber}
                    </div>
                    <div className="text-2xl font-extrabold text-amber-300">
                      {moduleMastery.activeCycle.consolidatedScore}%
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {moduleMastery.activeCycle.consolidatedCorrectCount}/
                      {moduleMastery.activeCycle.targetTotalQuestions} • Chance{' '}
                      {Math.min(3, moduleMastery.activeCycle.attemptCount + (moduleExamOutcome ? 0 : 1))}/3
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Outcome Card immediately after Module Exam Submission */}
          {moduleExamOutcome && (
            <div
              data-testid="module-exam-outcome"
              className={`rounded-2xl border-2 p-6 shadow-md bg-white ${
                moduleExamOutcome.outcome === 'approved'
                  ? 'border-emerald-500'
                  : moduleExamOutcome.outcome === 'extra-unlocked'
                  ? 'border-amber-400'
                  : 'border-rose-500'
              }`}
            >
              {moduleExamOutcome.outcome === 'approved' && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Maestria Validada • Chance {moduleExamOutcome.chanceNumber}/3
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                      Parabéns! Você atingiu {moduleExamOutcome.consolidatedScore}% consolidado ({moduleExamOutcome.consolidatedCorrectCount}/{moduleExamOutcome.targetTotalQuestions}).
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      O requisito de ≥ 70% foi cumprido com sucesso e o módulo seguinte da trilha foi desbloqueado.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasNextModule && onGoToNextModule && (
                      <button
                        type="button"
                        onClick={() => onGoToNextModule(moduleKey + 1)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm cursor-pointer"
                      >
                        Avançar para Módulo {String(moduleKey + 1).padStart(2, '0')}{' '}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold cursor-pointer"
                    >
                      Ver Dashboard
                    </button>
                  </div>
                </div>
              )}

              {moduleExamOutcome.outcome === 'extra-unlocked' && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-700">
                      <Sparkles className="w-4 h-4" />
                      Consolidado Atual: {moduleExamOutcome.consolidatedScore}% ({moduleExamOutcome.consolidatedCorrectCount}/{moduleExamOutcome.targetTotalQuestions}) — Meta: 70%
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      {moduleExamOutcome.chanceNumber === 1
                        ? '1ª Prova Extra de Recuperação Liberada (Chance 2 de 3)'
                        : '2ª Prova Extra de Recuperação Liberada (Última Chance: 3 de 3)'}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Nesta tentativa você acertou {moduleExamOutcome.attemptScore}% das questões apresentadas. A próxima Prova Extra contém exclusivamente{' '}
                      <strong>
                        {moduleExamOutcome.targetTotalQuestions -
                          moduleExamOutcome.consolidatedCorrectCount}{' '}
                        questão(ões)
                      </strong>{' '}
                      com tempo dimensionado pela complexidade delas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartNextExtraOrCycle}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold shadow-sm cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Preparar {moduleExamOutcome.chanceNumber === 1 ? '1ª' : '2ª'} Prova Extra
                  </button>
                </div>
              )}

              {moduleExamOutcome.outcome === 'restudy-required' && (
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-rose-700">
                      <AlertTriangle className="w-4 h-4" />
                      3 Chances Esgotadas • Consolidado: {moduleExamOutcome.consolidatedScore}% (&lt; 70%)
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      Reestudo Cirúrgico Obrigatório Ativado
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Para abrir um novo ciclo de 3 chances, percorra novamente 100% apenas dos capítulos cujas sessões ficaram abaixo de 70% neste ciclo:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {moduleExamOutcome.failedChapterIds.map((chId) => {
                      const ch = chapterById.get(chId);
                      if (!ch) return null;
                      return (
                        <div
                          key={chId}
                          className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-rose-800">
                              Sessão {ch.session}
                            </div>
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {ch.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateToChapterAnchor(ch.session, '')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Reler Capítulo
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Eligibility / Locked Gate Notice when chapters remain unread or under surgical restudy */}
          {!moduleExamOutcome && !eligibility.isEligible && (
            <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-4">
              {eligibility.pendingRestudyIds.length > 0 ? (
                <>
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Reestudo Cirúrgico Pendente ({eligibility.pendingRestudyIds.length} capítulo(s))
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Após falhar nas 3 chances do ciclo anterior, percorra integralmente cada seção dos capítulos abaixo (&lt; 70% no ciclo) para liberar um novo ciclo de 3 chances:
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {eligibility.pendingRestudyIds.map((chId) => {
                      const ch = chapterById.get(chId);
                      if (!ch) return null;
                      const pct = studyState.readingProgress[chId] || 0;
                      return (
                        <div
                          key={chId}
                          className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-rose-800">
                              Sessão {ch.session} • Leitura atual: {pct}%
                            </div>
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {ch.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateToChapterAnchor(ch.session, '')}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Percorrer →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Percorra Todas as Sessões para Liberar a Prova Final ({eligibility.unreadChapterIds.length} restante(s))
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Mesmo estudando no Kindle Colorsoft, percorra todas as seções de cada capítulo deste módulo para liberar a Prova Final Cronometrada (máx. 40 questões):
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {eligibility.unreadChapterIds.map((chId) => {
                      const ch = chapterById.get(chId);
                      if (!ch) return null;
                      const pct = studyState.readingProgress[chId] || 0;
                      return (
                        <div
                          key={chId}
                          className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-amber-800">
                              Sessão {ch.session} • {pct}% percorrido
                            </div>
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {ch.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateToChapterAnchor(ch.session, '')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Ir p/ Leitor
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Preparation Briefing Screen BEFORE Starting the Timer */}
          {!moduleExamOutcome &&
            eligibility.isEligible &&
            preparedModuleExam &&
            examTimingSummary &&
            !isTimedAttemptRunning && (
              <div
                data-testid="module-exam-briefing"
                className="bg-white rounded-2xl border-2 border-indigo-200 p-6 sm:p-8 shadow-sm space-y-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
                      <Clock className="w-3.5 h-3.5" />
                      Instruções da Prova Cronometrada
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                      {preparedModuleExam.chanceNumber === 1
                        ? `Prova Final do ${moduleLabel} (${preparedModuleExam.questions.length} questões)`
                        : `${preparedModuleExam.chanceNumber === 2 ? '1ª' : '2ª'} Prova Extra — Recuperação (${preparedModuleExam.questions.length} questões)`}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Diferente dos treinos por sessão, a Prova Final deve ser concluída <strong>de uma única vez</strong>. Assim que você iniciar, o cronômetro regressivo começará a correr sem pausa e enviará a prova automaticamente ao zerar.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 text-center shrink-0 min-w-[170px]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Tempo Total de Prova
                    </div>
                    <div className="text-3xl font-mono font-extrabold mt-1">
                      {examTimingSummary.formattedTotal}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Soma ponderada por complexidade
                    </div>
                  </div>
                </div>

                {/* Complexity Weight Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Básicas (1 min)
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {examTimingSummary.counts.foundation}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Intermed. (1m30s)
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {examTimingSummary.counts.intermediate}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Avançadas (2 min)
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {examTimingSummary.counts.advanced}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                    <div className="text-[11px] font-bold uppercase text-indigo-700">
                      Prática / Código
                    </div>
                    <div className="text-xl font-extrabold text-indigo-950 mt-0.5">
                      {examTimingSummary.counts.codePractice} (+{examTimingSummary.counts.withCode} snippets)
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-500">
                    Bônus incluídos no tempo: <strong>+15s</strong> Arquitetura • <strong>+30s</strong> Prática/Debug • <strong>+15s</strong> Snippet de código.
                  </div>
                  <button
                    type="button"
                    data-testid="start-timed-module-exam"
                    onClick={handleStartTimedOfficialExam}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Prova Cronometrada Agora ({examTimingSummary.formattedTotal})
                  </button>
                </div>
              </div>
            )}

          {/* Active Timed Official Exam Questions */}
          {!moduleExamOutcome &&
            eligibility.isEligible &&
            preparedModuleExam &&
            isTimedAttemptRunning && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                  <div>
                    <strong>Prova em Sessão Única Ativa:</strong> gabarito comentado bloqueado até a entrega.
                    {preparedModuleExam.isExtraExam && (
                      <span className="ml-1">
                        Acertos anteriores do ciclo (
                        <strong>
                          {preparedModuleExam.cycle.consolidatedCorrectCount}/
                          {preparedModuleExam.cycle.targetTotalQuestions}
                        </strong>
                        ) preservados; recupere questões suficientes para ≥ 70%.
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-950">
                    {preparedModuleExam.questions.length} questões nesta etapa
                  </span>
                </div>

                <div className="space-y-5">
                  {preparedModuleExam.questions.map((q, idx) => {
                    const userSelected = localModuleDraft[q.id];
                    const cogInfo = COGNITIVE_LABELS[q.cognitiveLevel] || COGNITIVE_LABELS.conceptual;

                    return (
                      <div
                        key={`${preparedModuleExam.chanceNumber}-${q.id}`}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900 text-white">
                              Questão {idx + 1} / {preparedModuleExam.questions.length}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800">
                              Sessão {q.sessionId}
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${cogInfo.color}`}
                            >
                              {cogInfo.label}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              {q.subtopicTag}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{q.id}</span>
                        </div>

                        <h3
                          className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-3"
                          dangerouslySetInnerHTML={{ __html: renderInlineTextWithMath(q.question) }}
                        />

                        {q.codeSnippet && (
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs sm:text-sm font-mono overflow-x-auto mb-4 border border-slate-800">
                            <code>{q.codeSnippet}</code>
                          </pre>
                        )}

                        <div className="space-y-2.5">
                          {q.options.map((opt, oIdx) => {
                            const isThisSelected = userSelected === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectModuleOption(q.id, oIdx)}
                                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                                  isThisSelected
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold'
                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                    isThisSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {LETTERS[oIdx]}
                                </span>
                                <span
                                  className="text-sm leading-relaxed flex-1"
                                  dangerouslySetInnerHTML={{ __html: renderInlineTextWithMath(opt) }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sticky bottom-4 mt-8 bg-slate-950 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/40">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-400" />
                      <div className="text-sm">
                        Respondidas:{' '}
                        <strong className="text-amber-300">{moduleAnsweredCount}</strong> de{' '}
                        <strong>{preparedModuleExam.questions.length}</strong> (Chance{' '}
                        {preparedModuleExam.chanceNumber}/3)
                      </div>
                    </div>
                    {remainingSeconds !== null && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        {formatCountdownSeconds(remainingSeconds)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="submit-module-exam"
                    onClick={handleSubmitOfficialModuleExam}
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm transition-all cursor-pointer"
                  >
                    Entregar Prova Oficial (Chance {preparedModuleExam.chanceNumber}/3)
                  </button>
                </div>
              </>
            )}
        </div>
      ) : (
        /* ===================== CONTINUOUS SESSION PRACTICE QUIZ VIEW ===================== */
        <>
          {/* Exam Configuration Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Estudo Contínuo por Sessão (Salvo Automaticamente) • {moduleLabel}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {currentBank ? currentBank.title : `Prova da Sessão ${selectedSessionId}`}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {answeredCount > 0 && (
                  <button
                    type="button"
                    data-testid="clear-session-answers"
                    onClick={handleClearCurrentSessionClick}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      confirmClearSession
                        ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmClearSession ? 'Confirmar Limpeza da Sessão?' : 'Recomeçar Sessão'}
                  </button>
                )}

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-2 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instantFeedback}
                    onChange={(e) => setInstantFeedback(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Ver gabarito ao marcar cada questão
                </label>
              </div>
            </div>

            {/* Live Continuous Session Summary Strip */}
            <div className="mb-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-indigo-950">
                <strong>Progresso salvo no banco:</strong>{' '}
                <span data-testid="session-answered-counter">
                  {answeredCount} de {activeQuestions.length} questões respondidas
                </span>
                {currentAccuracyPct !== null && (
                  <span className="ml-2 font-bold text-emerald-700">
                    ({correctAnsweredCount}/{answeredCount} corretas • {currentAccuracyPct}%)
                  </span>
                )}
              </div>
              <span className="text-indigo-700 font-medium">
                Você pode voltar ao capítulo ou fechar o app sem perder suas respostas.
              </span>
            </div>

            {/* Selectors Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Sessão do {moduleLabel}
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => handleResetSessionQuiz(e.target.value, mode, null)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium bg-white"
                >
                  {chapters.map((ch) => (
                    <option key={ch.session} value={ch.session}>
                      Sessão {ch.session} — {ch.title.replace(/^\d+\.\d+\s*/, '')} ({quizzes[ch.session]?.questions.length || 0} questões)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Modo de Exibição
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleResetSessionQuiz(selectedSessionId, 'full', subtopicFilter)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'full' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Completa ({currentBank?.questions.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetSessionQuiz(selectedSessionId, 'quick', subtopicFilter)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'quick' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Rápida (10)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleResetSessionQuiz(selectedSessionId, 'error-notebook', subtopicFilter)
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'error-notebook'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Caderno Erros
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Filtrar por Subtópico
                </label>
                <div className="relative">
                  <select
                    value={subtopicFilter || ''}
                    onChange={(e) =>
                      handleResetSessionQuiz(selectedSessionId, mode, e.target.value || null)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium bg-white"
                  >
                    <option value="">
                      Todos os subtópicos ({currentBank?.questions.length || 0})
                    </option>
                    {availableSubtopics.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Diagnostic Banner when Consolidated */}
          {isSubmitted && scoreSummary && (
            <div className="bg-white rounded-2xl border-2 border-indigo-600 shadow-md p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Diagnóstico Consolidado • Sessão {selectedSessionId}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                    Você acertou {scoreSummary.correct} de {scoreSummary.total} questões respondidas ({scoreSummary.percentage}%)
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {scoreSummary.percentage >= 75
                      ? 'Excelente domínio técnico nas questões respondidas! Suas métricas estão atualizadas no Dashboard.'
                      : 'Identificamos oportunidades de melhoria apenas nos subtópicos realmente respondidos abaixo.'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
                  >
                    Continuar Respondendo
                  </button>
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
                  >
                    Ver Dashboard & O que Melhorar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtopic Breakdown over actually answered items */}
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Desempenho por Subtópico (Questões Respondidas) & Recomendações Diretas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(scoreSummary.bySubtopic).map(([sub, data]) => {
                    const pct = Math.round((data.correct / data.total) * 100);
                    const needsWork = pct < 75;
                    return (
                      <div
                        key={sub}
                        className={`p-3.5 rounded-xl border ${
                          needsWork
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900">{sub}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              needsWork
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-200 text-emerald-900'
                            }`}
                          >
                            {data.correct}/{data.total} ({pct}%)
                          </span>
                        </div>
                        {needsWork && (
                          <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-amber-200/70 text-xs">
                            <button
                              type="button"
                              onClick={() => onNavigateToChapterAnchor(selectedSessionId, data.anchor)}
                              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> Reler seção no capítulo
                            </button>
                            <a
                              href={data.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Doc Oficial ({data.docLabel})
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty State when no questions match */}
          {activeQuestions.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs mb-6">
              <p className="text-sm font-bold text-slate-800">
                Nenhuma questão disponível para os filtros selecionados nesta sessão.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Volte para o modo Completo ou limpe o filtro de subtópico para exibir todas as questões da sessão.
              </p>
              <button
                type="button"
                onClick={() => handleResetSessionQuiz(selectedSessionId, 'full', null)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                Mostrar Todas as Questões
              </button>
            </div>
          )}

          {/* Question Cards List */}
          <div className="space-y-5">
            {activeQuestions.map((q, idx) => {
              const userSelected = savedSessionAnswers[q.id];
              const hasAnswered = userSelected !== undefined;
              const showCorrection = isSubmitted || (instantFeedback && hasAnswered);
              const isCorrect = userSelected === q.correctOptionIndex;
              const cogInfo = COGNITIVE_LABELS[q.cognitiveLevel] || COGNITIVE_LABELS.conceptual;

              return (
                <div
                  key={q.id}
                  data-question-id={q.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 transition-all"
                >
                  {/* Question Metadata Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-900 text-white">
                        Questão {idx + 1} / {activeQuestions.length}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${cogInfo.color}`}>
                        {cogInfo.label}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        Tópico: {q.subtopicTag}
                      </span>
                      {hasAnswered && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Salva ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{q.id}</span>
                  </div>

                  {/* Question Stem */}
                  <h3
                    className="text-base sm:text-lg font-bold text-slate-900 leading-snug mb-3"
                    dangerouslySetInnerHTML={{ __html: renderInlineTextWithMath(q.question) }}
                  />

                  {/* Optional Code Snippet */}
                  {q.codeSnippet && (
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs sm:text-sm font-mono overflow-x-auto mb-4 border border-slate-800">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  {/* 4 Options */}
                  <div className="space-y-2.5">
                    {q.options.map((opt, oIdx) => {
                      const isThisSelected = userSelected === oIdx;
                      const isThisCorrect = q.correctOptionIndex === oIdx;

                      let btnStyle =
                        'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800';
                      if (showCorrection) {
                        if (isThisCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold';
                        } else if (isThisSelected && !isThisCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-50 text-rose-950';
                        }
                      } else if (isThisSelected) {
                        btnStyle = 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(q, oIdx)}
                          disabled={isSubmitted}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              showCorrection && isThisCorrect
                                ? 'bg-emerald-600 text-white'
                                : showCorrection && isThisSelected && !isThisCorrect
                                ? 'bg-rose-600 text-white'
                                : isThisSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {LETTERS[oIdx]}
                          </span>
                          <span
                            className="text-sm leading-relaxed flex-1"
                            dangerouslySetInnerHTML={{ __html: renderInlineTextWithMath(opt) }}
                          />
                          {showCorrection && isThisCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          {showCorrection && isThisSelected && !isThisCorrect && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Technical Explanation & Remediation Links */}
                  {showCorrection && (
                    <div
                      className={`mt-4 p-4 rounded-xl border ${
                        isCorrect
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/80 border-amber-300 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1.5">
                        {isCorrect ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Resposta Correta — Gabarito Comentado</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>
                              Diagnóstico do Erro — Gabarito Oficial: Alternativa (
                              {LETTERS[q.correctOptionIndex]})
                            </span>
                          </>
                        )}
                      </div>
                      <p
                        className="text-sm leading-relaxed text-slate-800"
                        dangerouslySetInnerHTML={{ __html: renderInlineTextWithMath(q.explanation) }}
                      />

                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-slate-200/80 text-xs">
                        <button
                          type="button"
                          onClick={() => onNavigateToChapterAnchor(q.sessionId, q.chapterAnchor)}
                          className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Revisar no Capítulo (#{q.chapterAnchor})
                        </button>
                        <a
                          href={q.officialDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Doc Oficial: {q.officialDocLabel}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating / Bottom Submit Bar */}
          {!isSubmitted && activeQuestions.length > 0 && (
            <div className="sticky bottom-4 mt-8 bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-amber-400" />
                <div className="text-sm">
                  Respondidas: <strong className="text-amber-300">{answeredCount}</strong> de{' '}
                  <strong>{activeQuestions.length}</strong> questões (salvo automaticamente)
                </div>
              </div>
              <button
                type="button"
                disabled={answeredCount === 0}
                onClick={handleSubmitSessionExam}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-all cursor-pointer"
              >
                {answeredCount > 0
                  ? `Ver Diagnóstico das ${answeredCount} Respondidas`
                  : 'Marque ao menos 1 questão'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
