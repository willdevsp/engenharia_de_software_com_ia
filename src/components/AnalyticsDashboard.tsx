import React, { useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Cloud,
  CloudOff,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  FileQuestion,
  Layers,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  Upload
} from 'lucide-react';
import type {
  ChapterData,
  CloudSyncStatus,
  SessionQuizBank,
  UserStudyState
} from '../types/course';
import {
  computeCognitiveBreakdown,
  computeSubtopicDiagnostics
} from '../utils/storage';
import { exportJsonFile, exportKindleEpub } from '../utils/nativeExport';

interface AnalyticsDashboardProps {
  chapters: ChapterData[];
  quizzes: Record<string, SessionQuizBank>;
  studyState: UserStudyState;
  onSelectChapter: (sessionId: string, anchor?: string) => void;
  onStartQuiz: (
    sessionId: string,
    mode?: 'full' | 'quick' | 'error-notebook',
    subtopicFilter?: string | null
  ) => void;
  onImportState: (imported: UserStudyState) => void;
  onLoadDemoAttempt?: () => void;
  syncStatus?: CloudSyncStatus;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  onSyncNow?: () => void;
  onOpenSettings?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  chapters,
  quizzes,
  studyState,
  onSelectChapter,
  onStartQuiz,
  onImportState,
  onLoadDemoAttempt,
  syncStatus = 'unconfigured',
  lastSyncedAt,
  syncError,
  onSyncNow,
  onOpenSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExportingEpub, setIsExportingEpub] = useState(false);

  const diagnostics = useMemo(
    () => computeSubtopicDiagnostics(studyState, chapters, quizzes),
    [studyState, chapters, quizzes]
  );

  const cognitive = useMemo(
    () => computeCognitiveBreakdown(studyState, quizzes),
    [studyState, quizzes]
  );

  const improvementGaps = useMemo(
    () => diagnostics.filter((d) => d.accuracyPercentage < 75),
    [diagnostics]
  );

  const masteredSubtopics = useMemo(
    () => diagnostics.filter((d) => d.accuracyPercentage >= 75),
    [diagnostics]
  );

  const sessionStats = useMemo(() => {
    return chapters.map((ch) => {
      const attempts = studyState.quizAttempts.filter((a) => a.sessionId === ch.session);
      const latest = attempts[0] || null;
      const bestScore =
        attempts.length > 0 ? Math.max(...attempts.map((a) => a.scorePercentage)) : null;
      const bankSize = quizzes[ch.session]?.questions.length || 0;
      const isRead = studyState.completedChapters.includes(ch.id);

      return {
        session: ch.session,
        chapterId: ch.id,
        title: ch.title,
        isRead,
        bankSize,
        attemptsCount: attempts.length,
        latestScore: latest ? latest.scorePercentage : null,
        bestScore
      };
    });
  }, [chapters, quizzes, studyState]);

  const moduleSummary = useMemo(() => {
    const evaluatedSessions = sessionStats.filter((s) => s.bestScore !== null);
    const avgScore =
      evaluatedSessions.length > 0
        ? Math.round(
            evaluatedSessions.reduce((acc, s) => acc + (s.bestScore || 0), 0) /
              evaluatedSessions.length
          )
        : 0;
    const totalQuestionsInModule = Object.values(quizzes).reduce(
      (acc, q) => acc + q.questions.length,
      0
    );

    return {
      avgScore,
      evaluatedCount: evaluatedSessions.length,
      totalSessions: chapters.length,
      completedReads: studyState.completedChapters.length,
      totalAttempts: studyState.quizAttempts.length,
      totalQuestionsInModule
    };
  }, [sessionStats, chapters.length, studyState, quizzes]);

  const handleDownloadEpub = async () => {
    if (isExportingEpub) return;
    setIsExportingEpub(true);
    try {
      await exportKindleEpub();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível preparar o arquivo EPUB.');
    } finally {
      setIsExportingEpub(false);
    }
  };

  const handleExportJson = async () => {
    try {
      await exportJsonFile(
        `progresso-engenharia-ia-mod01-${new Date().toISOString().slice(0, 10)}.json`,
        studyState
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível exportar o progresso.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onImportState(parsed);
      } catch {
        alert('Arquivo JSON de progresso inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Cross-Device Backup / Kindle Export */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Analytics & Qualidade do Conhecimento • Módulo 01
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
              Dashboard de Desempenho & Diagnóstico Técnico
            </h1>
            <p className="text-sm text-indigo-200 mt-1 max-w-2xl">
              Acompanhe sua maestria nas 11 sessões do Módulo 01, identifique pontos cegos por subtópico e nível cognitivo e sincronize seu progresso entre Desktop e Android.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSyncNow && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={syncStatus === 'syncing'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                    : syncStatus === 'syncing'
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                    : syncStatus === 'offline'
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
                title="Sincronizar progresso com Firebase Firestore agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>
                  {syncStatus === 'syncing'
                    ? 'Sincronizando...'
                    : syncStatus === 'synced'
                    ? 'Nuvem OK • Sincronizar Agora'
                    : syncStatus === 'offline'
                    ? 'Offline • Tentar Sincronizar'
                    : 'Não Configurado • Sincronizar'}
                </span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações Nuvem
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadEpub}
              disabled={isExportingEpub}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExportingEpub ? 'Preparando EPUB...' : 'Baixar .EPUB (Kindle Colorsoft)'}
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Progresso (.json)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar Progresso
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {(syncError || lastSyncedAt) && (
          <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center gap-2 text-xs">
            {syncError ? (
              <span className="inline-flex items-center gap-1.5 text-amber-200">
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                {syncError}
              </span>
            ) : lastSyncedAt ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-200">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                Última sincronização com Firestore:{' '}
                {new Date(lastSyncedAt).toLocaleTimeString('pt-BR')}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Maestria Média (Módulo 01)</span>
            <Award className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {moduleSummary.avgScore}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Meta de maestria recomendada: ≥ 75%
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Sessões Avaliadas (Provas)</span>
            <FileQuestion className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {moduleSummary.evaluatedCount} / {moduleSummary.totalSessions}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {moduleSummary.totalAttempts} tentativa(s) • {moduleSummary.totalQuestionsInModule} questões no banco
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Leitura dos Capítulos</span>
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {moduleSummary.completedReads} / {moduleSummary.totalSessions}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Capítulos completos marcados como lidos
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Pontos a Melhorar</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {improvementGaps.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {masteredSubtopics.length} subtópico(s) já dominado(s) (≥ 75%)
          </div>
        </div>
      </div>

      {/* Cognitive Depth Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Qualidade do Conhecimento por Dimensão Cognitiva
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Mede se você domina apenas a teoria ou também a arquitetura interna e o código
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <div className="flex items-center justify-between text-sm font-bold text-blue-950">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                1. Conceitual & Fundamentos
              </span>
              <span>{cognitive.conceptual.percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${cognitive.conceptual.percentage}%` }}
              />
            </div>
            <div className="text-xs text-blue-800 mt-2">
              Acertos: {cognitive.conceptual.correct} de {cognitive.conceptual.answered} questões respondidas
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
            <div className="flex items-center justify-between text-sm font-bold text-purple-950">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                2. Arquitetura & Funcionamento Interno
              </span>
              <span>{cognitive.architecture.percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-purple-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${cognitive.architecture.percentage}%` }}
              />
            </div>
            <div className="text-xs text-purple-800 mt-2">
              Acertos: {cognitive.architecture.correct} de {cognitive.architecture.answered} questões respondidas
            </div>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
            <div className="flex items-center justify-between text-sm font-bold text-teal-950">
              <span className="inline-flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-teal-600" />
                3. Prática, Código & Debugging
              </span>
              <span>{cognitive['code-practice'].percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-teal-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all"
                style={{ width: `${cognitive['code-practice'].percentage}%` }}
              />
            </div>
            <div className="text-xs text-teal-800 mt-2">
              Acertos: {cognitive['code-practice'].correct} de {cognitive['code-practice'].answered} questões respondidas
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONABLE DIAGNOSTICS: "O QUE VOCÊ PODE MELHORAR" */}
      <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                O Que Você Pode Melhorar (Plano de Ação Baseado nas Suas Provas)
              </h2>
              <p className="text-xs text-slate-600">
                Subtópicos com taxa de acerto abaixo de 75% são listados aqui por ordem de criticidade, com links diretos para o trecho do capítulo e documentação oficial.
              </p>
            </div>
          </div>

          {studyState.quizAttempts.length === 0 && onLoadDemoAttempt && (
            <button
              onClick={onLoadDemoAttempt}
              className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
            >
              Carregar Simulação de Exemplo
            </button>
          )}
        </div>

        {improvementGaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {improvementGaps.map((gap) => {
              const isCritical = gap.status === 'critical';
              return (
                <div
                  key={`${gap.sessionId}::${gap.subtopicTag}`}
                  className={`p-4 rounded-xl border ${
                    isCritical
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-amber-50/70 border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Sessão {gap.sessionId}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {gap.subtopicTag}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {gap.accuracyPercentage}% ({gap.correctAnswered}/{gap.totalAnswered})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mb-3">
                    {isCritical
                      ? 'Lacuna Crítica (< 50%): Recomendamos fortemente reler a seção correspondente do capítulo e consultar a documentação oficial antes de avançar.'
                      : 'Ponto de Atenção (50%–74%): Você compreende a base, mas errou detalhes técnicos ou práticos deste tópico.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/80">
                    <button
                      onClick={() => onSelectChapter(gap.sessionId, gap.chapterAnchor)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Reler Seção no Capítulo
                    </button>

                    <button
                      onClick={() => onStartQuiz(gap.sessionId, 'full', gap.subtopicTag)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Treinar Tópico
                    </button>

                    <a
                      href={gap.officialDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-teal-800 border border-slate-300 text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Doc Oficial
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : studyState.quizAttempts.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Você ainda não realizou nenhuma prova das sessões do Módulo 01.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Escolha qualquer sessão abaixo e clique em &ldquo;Fazer Prova&rdquo; para que o sistema mapeie seus pontos fortes e o que você pode melhorar.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <strong>Parabéns!</strong> Todos os subtópicos avaliados até agora estão com taxa de acerto igual ou superior a 75%. Continue avançando para as próximas sessões do módulo!
            </div>
          </div>
        )}
      </div>

      {/* Session-by-Session Performance Table (Sessions 1.1 to 1.11) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Desempenho por Sessão — Módulo 01 (11 Etapas)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Até 30 questões por sessão
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {sessionStats.map((s) => {
            const score = s.bestScore;
            let badge = (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Não Avaliado
              </span>
            );
            if (score !== null) {
              if (score >= 75) {
                badge = (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Dominado ({score}%)
                  </span>
                );
              } else if (score >= 50) {
                badge = (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Em Evolução ({score}%)
                  </span>
                );
              } else {
                badge = (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    Revisão Crítica ({score}%)
                  </span>
                );
              }
            }

            return (
              <div
                key={s.session}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Sessão {s.session}
                    </span>
                    {s.isRead && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lido
                      </span>
                    )}
                    {badge}
                    <span className="text-xs text-slate-400">
                      • {s.bankSize} questões • {s.attemptsCount} tentativa(s)
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">
                    {s.title}
                  </h3>
                  {score !== null && (
                    <div className="w-full max-w-md h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score >= 75
                            ? 'bg-emerald-600'
                            : score >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectChapter(s.session)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Ler Capítulo
                  </button>
                  <button
                    onClick={() => onStartQuiz(s.session, 'full', null)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Fazer Prova ({s.bankSize})
                  </button>
                  {s.attemptsCount > 0 && (
                    <button
                      onClick={() => onStartQuiz(s.session, 'error-notebook', null)}
                      className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold cursor-pointer"
                      title="Refazer apenas questões que você errou nesta sessão"
                    >
                      Erros
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
