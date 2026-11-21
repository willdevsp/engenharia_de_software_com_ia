import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Filter,
  RotateCcw,
  ShieldCheck,
  Target,
  XCircle
} from 'lucide-react';
import type {
  ChapterData,
  QuizAttempt,
  QuizQuestion,
  SessionQuizBank,
  UserStudyState
} from '../types/course';
import { getMissedQuestionIds } from '../utils/storage';
import { renderInlineTextWithMath } from '../utils/mathRenderer';

interface QuizEngineProps {
  chapters: ChapterData[];
  quizzes: Record<string, SessionQuizBank>;
  studyState: UserStudyState;
  initialSessionId: string;
  initialMode?: 'full' | 'quick' | 'error-notebook';
  initialSubtopicFilter?: string | null;
  onSaveAttempt: (attempt: QuizAttempt) => void;
  onNavigateToChapterAnchor: (sessionId: string, anchor: string) => void;
  onOpenDashboard: () => void;
}

const COGNITIVE_LABELS: Record<string, { label: string; color: string }> = {
  conceptual: { label: 'Conceitual & Fundamentos', color: 'bg-blue-100 text-blue-800' },
  architecture: { label: 'Arquitetura & Funcionamento Interno', color: 'bg-purple-100 text-purple-800' },
  'code-practice': { label: 'Prática & Debug de Código', color: 'bg-teal-100 text-teal-800' }
};

const LETTERS = ['A', 'B', 'C', 'D'];

export const QuizEngine: React.FC<QuizEngineProps> = ({
  chapters,
  quizzes,
  studyState,
  initialSessionId,
  initialMode = 'full',
  initialSubtopicFilter = null,
  onSaveAttempt,
  onNavigateToChapterAnchor,
  onOpenDashboard
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || '1.1');
  const [mode, setMode] = useState<'full' | 'quick' | 'error-notebook'>(initialMode);
  const [subtopicFilter, setSubtopicFilter] = useState<string | null>(initialSubtopicFilter);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const currentBank = quizzes[selectedSessionId];

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

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitExam = () => {
    if (activeQuestions.length === 0) return;
    const answers = activeQuestions.map((q) => {
      const selected = selectedAnswers[q.id] ?? -1;
      return {
        questionId: q.id,
        selectedOptionIndex: selected,
        isCorrect: selected === q.correctOptionIndex,
        subtopicTag: q.subtopicTag,
        cognitiveLevel: q.cognitiveLevel
      };
    });

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const scorePercentage = Math.round((correctCount / activeQuestions.length) * 100);

    const attempt: QuizAttempt = {
      attemptId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: selectedSessionId,
      mode,
      timestamp: new Date().toISOString(),
      totalQuestions: activeQuestions.length,
      correctCount,
      scorePercentage,
      answers
    };

    onSaveAttempt(attempt);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = (newSessionId = selectedSessionId, newMode = mode, newSubtopic: string | null = subtopicFilter) => {
    setSelectedSessionId(newSessionId);
    setMode(newMode);
    setSubtopicFilter(newSubtopic);
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  const answeredCount = Object.keys(selectedAnswers).filter((id) =>
    activeQuestions.some((q) => q.id === id)
  ).length;

  const scoreSummary = useMemo(() => {
    if (!isSubmitted || activeQuestions.length === 0) return null;
    let correct = 0;
    const bySubtopic: Record<string, { total: number; correct: number; anchor: string; docUrl: string; docLabel: string }> = {};

    for (const q of activeQuestions) {
      const isOk = selectedAnswers[q.id] === q.correctOptionIndex;
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
      total: activeQuestions.length,
      percentage: Math.round((correct / activeQuestions.length) * 100),
      bySubtopic
    };
  }, [isSubmitted, activeQuestions, selectedAnswers]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Exam Configuration Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Motor de Avaliação de Maestria • Módulo 01
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {currentBank ? currentBank.title : `Prova da Sessão ${selectedSessionId}`}
            </h1>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Sessão do Módulo 01
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => handleReset(e.target.value, mode, null)}
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
              Modo de Prova
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleReset(selectedSessionId, 'full', subtopicFilter)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'full' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Completa ({currentBank?.questions.length || 0})
              </button>
              <button
                onClick={() => handleReset(selectedSessionId, 'quick', subtopicFilter)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'quick' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Rápida (10)
              </button>
              <button
                onClick={() => handleReset(selectedSessionId, 'error-notebook', subtopicFilter)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'error-notebook' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
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
                onChange={(e) => handleReset(selectedSessionId, mode, e.target.value || null)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium bg-white"
              >
                <option value="">Todos os subtópicos ({currentBank?.questions.length || 0})</option>
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

      {/* Results Diagnostic Banner when Submitted */}
      {isSubmitted && scoreSummary && (
        <div className="bg-white rounded-2xl border-2 border-indigo-600 shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Resultado Oficial da Prova • Sessão {selectedSessionId}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Você acertou {scoreSummary.correct} de {scoreSummary.total} questões ({scoreSummary.percentage}%)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {scoreSummary.percentage >= 75
                  ? 'Excelente domínio técnico! Suas métricas foram atualizadas no Dashboard.'
                  : 'Identificamos oportunidades de melhoria em alguns subtópicos abaixo. Revise os trechos indicados.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleReset(selectedSessionId, mode, subtopicFilter)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Refazer Prova
              </button>
              <button
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer"
              >
                Ver Dashboard & O que Melhorar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtopic Breakdown in This Attempt */}
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Desempenho por Subtópico nesta Prova & Recomendações Diretas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(scoreSummary.bySubtopic).map(([sub, data]) => {
                const pct = Math.round((data.correct / data.total) * 100);
                const needsWork = pct < 75;
                return (
                  <div
                    key={sub}
                    className={`p-3.5 rounded-xl border ${
                      needsWork ? 'bg-amber-50/70 border-amber-300' : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{sub}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          needsWork ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {data.correct}/{data.total} ({pct}%)
                      </span>
                    </div>
                    {needsWork && (
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-amber-200/70 text-xs">
                        <button
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

      {/* Question Cards List */}
      <div className="space-y-5">
        {activeQuestions.map((q, idx) => {
          const userSelected = selectedAnswers[q.id];
          const hasAnswered = userSelected !== undefined;
          const showCorrection = isSubmitted || (instantFeedback && hasAnswered);
          const isCorrect = userSelected === q.correctOptionIndex;
          const cogInfo = COGNITIVE_LABELS[q.cognitiveLevel] || COGNITIVE_LABELS.conceptual;

          return (
            <div
              key={q.id}
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

                  let btnStyle = 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800';
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
                      onClick={() => handleSelectOption(q.id, oIdx)}
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
                          Diagnóstico do Erro — Gabarito Oficial: Alternativa ({LETTERS[q.correctOptionIndex]})
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
              <strong>{activeQuestions.length}</strong> questões
            </div>
          </div>
          <button
            onClick={handleSubmitExam}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all cursor-pointer"
          >
            Finalizar Prova & Gerar Diagnóstico no Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
