import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Download,
  FileQuestion,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import type {
  ChapterSummary,
  CloudSyncStatus,
  CourseModuleInfo,
  ModuleMasteryState,
  UserStudyState
} from '../types/course';
import { computeCatalogModuleMetrics } from '../utils/storage';
import { getEffectiveModuleMastery, isModuleUnlocked } from '../utils/masteryGate';

interface CourseHomeProps {
  modules: CourseModuleInfo[];
  chapterSummaries: ChapterSummary[];
  studyState: UserStudyState;
  onOpenModule: (
    moduleId: number,
    sessionId?: string,
    tab?: 'reader' | 'quiz' | 'dashboard',
    quizScope?: 'session' | 'module-exam'
  ) => void;
  onExportModuleEpub: (moduleInfo: CourseModuleInfo) => void;
  exportingModuleId: number | null;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  onSyncNow: () => void;
  onOpenSettings: () => void;
}

interface ModuleDashboardMetrics {
  completedReads: number;
  totalSessions: number;
  readPercentage: number;
  evaluatedSessions: number;
  attemptsCount: number;
  avgMastery: number | null;
  openGapsCount: number;
  criticalGapsCount: number;
  attentionGapsCount: number;
  targetSession: string;
  progressStatus: 'completed' | 'in-progress' | 'not-started';
  unlocked: boolean;
  mastery: ModuleMasteryState;
}

export const CourseHome: React.FC<CourseHomeProps> = ({
  modules,
  chapterSummaries,
  studyState,
  onOpenModule,
  onExportModuleEpub,
  exportingModuleId,
  syncStatus,
  lastSyncedAt,
  syncError,
  onSyncNow,
  onOpenSettings
}) => {
  const { perModuleMetrics, courseSummary } = useMemo(() => {
    const chaptersByModule = new Map<number, ChapterSummary[]>();
    for (const ch of chapterSummaries) {
      const list = chaptersByModule.get(ch.module) || [];
      list.push(ch);
      chaptersByModule.set(ch.module, list);
    }

    const completedSet = new Set(studyState.completedChapters);
    const metricsMap = new Map<number, ModuleDashboardMetrics>();

    let availableCount = 0;
    let approvedModulesCount = 0;
    let totalAvailableChapters = 0;
    let totalCompletedReads = 0;
    let totalEvaluatedSessions = 0;
    let totalAttempts = 0;
    let totalAvailableQuestions = 0;
    let totalOpenGaps = 0;
    const evaluatedSessionScores: number[] = [];

    for (const mod of modules) {
      const modChapters = chaptersByModule.get(mod.id) || [];
      const totalSessions = modChapters.length;
      const completedReads = modChapters.filter((ch) => completedSet.has(ch.id)).length;
      const readPercentage =
        totalSessions > 0 ? Math.round((completedReads / totalSessions) * 100) : 0;

      const catStats =
        mod.status === 'available'
          ? computeCatalogModuleMetrics(studyState, modChapters)
          : {
              evaluatedSessions: 0,
              attemptsCount: 0,
              avgMastery: null,
              openGapsCount: 0,
              criticalGapsCount: 0,
              attentionGapsCount: 0
            };

      for (const ch of modChapters) {
        const sessionAttempts = studyState.quizAttempts.filter(
          (a) => a.sessionId === ch.session && a.mode !== 'module-exam'
        );
        if (sessionAttempts.length > 0) {
          evaluatedSessionScores.push(
            Math.max(...sessionAttempts.map((a) => a.scorePercentage))
          );
        }
      }

      const unlocked = isModuleUnlocked(mod.id, studyState);
      const mastery = getEffectiveModuleMastery(mod.id, studyState, modChapters);

      const firstUnread = modChapters.find((ch) => !completedSet.has(ch.id));
      const targetSession = (firstUnread || modChapters[0])?.session || `${mod.id}.1`;

      let progressStatus: ModuleDashboardMetrics['progressStatus'] = 'not-started';
      if (totalSessions > 0 && completedReads === totalSessions) {
        progressStatus = 'completed';
      } else if (
        completedReads > 0 ||
        catStats.attemptsCount > 0 ||
        modChapters.some((ch) => (studyState.readingProgress[ch.id] || 0) > 0)
      ) {
        progressStatus = 'in-progress';
      }

      metricsMap.set(mod.id, {
        completedReads,
        totalSessions,
        readPercentage,
        evaluatedSessions: catStats.evaluatedSessions,
        attemptsCount: catStats.attemptsCount,
        avgMastery: catStats.avgMastery,
        openGapsCount: catStats.openGapsCount,
        criticalGapsCount: catStats.criticalGapsCount,
        attentionGapsCount: catStats.attentionGapsCount,
        targetSession,
        progressStatus,
        unlocked,
        mastery
      });

      if (mod.status === 'available') {
        availableCount++;
        if (mastery.status === 'approved') {
          approvedModulesCount++;
        }
        totalAvailableChapters += totalSessions;
        totalCompletedReads += completedReads;
        totalEvaluatedSessions += catStats.evaluatedSessions;
        totalAttempts += catStats.attemptsCount;
        totalAvailableQuestions += mod.questionsCount;
        totalOpenGaps += catStats.openGapsCount;
      }
    }

    const globalReadPct =
      totalAvailableChapters > 0
        ? Math.round((totalCompletedReads / totalAvailableChapters) * 100)
        : 0;
    const globalAvgMastery =
      evaluatedSessionScores.length > 0
        ? Math.round(
            evaluatedSessionScores.reduce((acc, s) => acc + s, 0) /
              evaluatedSessionScores.length
          )
        : null;

    return {
      perModuleMetrics: metricsMap,
      courseSummary: {
        totalModules: modules.length,
        availableCount,
        approvedModulesCount,
        totalAvailableChapters,
        totalCompletedReads,
        globalReadPct,
        totalEvaluatedSessions,
        totalAttempts,
        totalAvailableQuestions,
        globalAvgMastery,
        totalOpenGaps
      }
    };
  }, [modules, chapterSummaries, studyState]);

  return (
    <div className="space-y-6">
      {/* Consolidated Hero & Cloud Controls */}
      <section className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              Trilha Completa • 12 Módulos de Engenharia de IA
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Engenharia de Software em IA Aplicada
            </h1>
            <p className="text-sm text-indigo-200 mt-1.5 leading-relaxed">
              Navegue pelos módulos do curso, valide a leitura de cada sessão, alcance <strong className="text-white">≥ 70% na Prova Final do Módulo</strong> para desbloquear a próxima etapa e gere livros <strong className="text-white">.EPUB</strong> sob demanda para o Kindle Colorsoft.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncStatus === 'syncing'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
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
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
              />
              <span>
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : syncStatus === 'synced'
                  ? 'Nuvem OK'
                  : syncStatus === 'offline'
                  ? 'Offline'
                  : 'Nuvem Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações Nuvem
            </button>
          </div>
        </div>

        {(syncError || lastSyncedAt) && (
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-2 text-xs">
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
      </section>

      {/* 4 Consolidated Global KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Módulos Disponíveis</span>
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {courseSummary.availableCount} / {courseSummary.totalModules}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {courseSummary.approvedModulesCount} módulo(s) aprovado(s) (≥ 70%)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Leitura Consolidada</span>
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {courseSummary.totalCompletedReads} / {courseSummary.totalAvailableChapters}
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${courseSummary.globalReadPct}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {courseSummary.globalReadPct}% dos capítulos disponíveis percorridos
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Sessões Avaliadas</span>
            <FileQuestion className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {courseSummary.totalEvaluatedSessions} / {courseSummary.totalAvailableChapters}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {courseSummary.totalAttempts} tentativa(s) de treino • {courseSummary.totalAvailableQuestions} questões
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Maestria Global Média</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {courseSummary.globalAvgMastery !== null
              ? `${courseSummary.globalAvgMastery}%`
              : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {courseSummary.totalOpenGaps} lacuna(s) aberta(s) (&lt; 75%)
          </div>
        </div>
      </section>

      {/* 12-Module Grid */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Mini-Dashboards por Módulo
            </h2>
            <p className="text-xs text-slate-500">
              Cada módulo é carregado sob demanda e desbloqueado ao conquistar ≥ 70% na Prova Oficial do módulo anterior.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const metrics = perModuleMetrics.get(mod.id);
            const isAvailable = mod.status === 'available';

            if (!isAvailable || !metrics) {
              return (
                <article
                  key={mod.id}
                  data-module-id={mod.id}
                  data-module-status="planned"
                  className="bg-slate-50/90 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 opacity-90"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-slate-200 text-slate-700">
                        Módulo {mod.code}
                      </span>
                      <div className="flex items-center gap-2">
                        {mod.suggestedHours > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {mod.suggestedHours}h
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Lock className="w-3 h-3" />
                          Em breve
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                      {mod.title}
                    </h3>
                    <div className="text-xs font-semibold text-indigo-700/80 mt-1">
                      {mod.track}
                    </div>
                    {mod.technicalFocus && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed">
                        {mod.technicalFocus}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 text-xs font-medium text-slate-500 flex items-center justify-between">
                    <span>Conteúdo autoral em preparação</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Etapa {mod.code}/12
                    </span>
                  </div>
                </article>
              );
            }

            const prevCode = String(mod.id - 1).padStart(2, '0');
            const isLocked = !metrics.unlocked;
            const masteryStatus = metrics.mastery.status;
            const isExportingThis = exportingModuleId === mod.id;

            const statusBadge = isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                <Lock className="w-3 h-3" />
                Requer Mód. {prevCode} (≥ 70%)
              </span>
            ) : masteryStatus === 'approved' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Aprovado ({metrics.mastery.approvedScore ?? 70}%)
              </span>
            ) : masteryStatus === 're-study-required' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Reestudo Cirúrgico
              </span>
            ) : metrics.progressStatus === 'completed' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Award className="w-3.5 h-3.5" />
                Pronto p/ Prova Final
              </span>
            ) : metrics.progressStatus === 'in-progress' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Play className="w-3 h-3" />
                Em andamento
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Não iniciado
              </span>
            );

            const primaryButtonLabel = isLocked
              ? `Bloqueado (Aprove no Mód. ${prevCode})`
              : masteryStatus === 'approved'
              ? `Revisar Módulo ${mod.code}`
              : masteryStatus === 're-study-required'
              ? `Reestudar Capítulos Pendentes`
              : metrics.progressStatus === 'completed'
              ? `Fazer Prova Oficial do Módulo ${mod.code}`
              : metrics.progressStatus === 'in-progress'
              ? `Continuar Sessão ${metrics.targetSession}`
              : `Abrir Módulo ${mod.code}`;

            return (
              <article
                key={mod.id}
                data-module-id={mod.id}
                data-module-status={isLocked ? 'locked' : 'available'}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
                  isLocked
                    ? 'bg-slate-100/90 border-slate-300 opacity-90'
                    : 'bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300'
                }`}
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                          isLocked ? 'bg-slate-500 text-white' : 'bg-indigo-600 text-white'
                        }`}
                      >
                        Módulo {mod.code}
                      </span>
                      {mod.suggestedHours > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {mod.suggestedHours}h
                        </span>
                      )}
                    </div>
                    {statusBadge}
                  </div>

                  {/* Title + Cover Thumbnail */}
                  <div className="flex items-start gap-3">
                    {mod.coverImageUrl && (
                      <img
                        src={mod.coverImageUrl}
                        alt={`Capa do Módulo ${mod.code}`}
                        className={`w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100 ${
                          isLocked ? 'grayscale opacity-75' : ''
                        }`}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {mod.title}
                      </h3>
                      <div className="text-xs font-semibold text-indigo-700 mt-1">
                        {mod.track}
                      </div>
                    </div>
                  </div>

                  {mod.technicalFocus && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                      {mod.technicalFocus}
                    </p>
                  )}

                  {/* Lock Callout or Mastery Progress */}
                  {isLocked ? (
                    <div className="mt-4 p-3 rounded-xl bg-slate-200/70 border border-slate-300 text-xs text-slate-700 flex items-start gap-2">
                      <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <span>
                        Conclua as sessões e conquiste <strong>≥ 70%</strong> na Prova Final do{' '}
                        <strong>Módulo {prevCode}</strong> para desbloquear leitura, provas e EPUB deste módulo.
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Reading Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Leitura Verificada dos Capítulos</span>
                          <span>
                            {metrics.completedReads} / {metrics.totalSessions} ({metrics.readPercentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              metrics.progressStatus === 'completed'
                                ? 'bg-emerald-600'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${metrics.readPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Mastery Gate Cycle Strip if in progress */}
                      {metrics.mastery.activeCycle && metrics.mastery.status !== 'approved' && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center justify-between">
                          <span>
                            {metrics.mastery.status === 're-study-required'
                              ? `Reestudo pendente: ${metrics.mastery.requiredRestudyChapterIds.length} cap.`
                              : `Prova Oficial: Chance ${metrics.mastery.activeCycle.attemptCount + 1}/3`}
                          </span>
                          <span>
                            Consolidado: {metrics.mastery.activeCycle.consolidatedScore}%
                          </span>
                        </div>
                      )}

                      {/* Scoped Mini-Metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Avaliadas
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {metrics.evaluatedSessions}/{metrics.totalSessions}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Maestria
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {metrics.mastery.status === 'approved'
                              ? `${metrics.mastery.approvedScore}%`
                              : metrics.avgMastery !== null
                              ? `${metrics.avgMastery}%`
                              : '—'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Lacunas
                          </div>
                          <div
                            className={`text-sm font-extrabold mt-0.5 inline-flex items-center gap-1 ${
                              metrics.openGapsCount > 0 ? 'text-amber-700' : 'text-slate-900'
                            }`}
                          >
                            {metrics.openGapsCount > 0 && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {metrics.openGapsCount}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Footer */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() =>
                      onOpenModule(
                        mod.id,
                        metrics.targetSession,
                        metrics.progressStatus === 'completed' && masteryStatus !== 'approved'
                          ? 'quiz'
                          : 'reader',
                        metrics.progressStatus === 'completed' && masteryStatus !== 'approved'
                          ? 'module-exam'
                          : 'session'
                      )
                    }
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-colors ${
                      isLocked
                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                        : metrics.progressStatus === 'completed' && masteryStatus !== 'approved'
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : metrics.progressStatus === 'completed' && masteryStatus !== 'approved' ? (
                      <Award className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                    <span>{primaryButtonLabel}</span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onOpenModule(mod.id, metrics.targetSession, 'quiz', 'session')}
                      className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Provas</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onOpenModule(mod.id, metrics.targetSession, 'dashboard')}
                      className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLocked || isExportingThis}
                      onClick={() => onExportModuleEpub(mod)}
                      className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                      title={
                        isLocked
                          ? `Desbloqueie o Módulo ${mod.code} aprovando o Módulo ${prevCode} (≥ 70%) para gerar este EPUB.`
                          : `Gerar e baixar ${mod.epubFileName} para Kindle Colorsoft`
                      }
                    >
                      <Download className="w-3.5 h-3.5 text-amber-700" />
                      <span>{isExportingThis ? 'Gerando...' : '.EPUB'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
