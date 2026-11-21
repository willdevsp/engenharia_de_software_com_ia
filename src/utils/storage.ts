import type {
  AudioPositionEntry,
  ChapterCompletionEntry,
  ChapterData,
  ChapterSummary,
  CognitiveLevel,
  ModuleMasteryState,
  QuizAttempt,
  ReadingProgressEntry,
  SessionQuizBank,
  SubtopicDiagnostic,
  UserStudyState
} from '../types/course';

const STORAGE_KEY = 'engenharia_ia_study_state_v1';

const DEFAULT_STATE: UserStudyState = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  completedChapters: [],
  chapterCompletionLog: {},
  readingProgress: {},
  readingProgressLog: {},
  bookmarkedQuestions: [],
  quizAttempts: [],
  audioPositions: {},
  moduleMastery: {}
};

export function parseTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function buildEffectiveCompletionLog(state: UserStudyState): Record<string, ChapterCompletionEntry> {
  const log: Record<string, ChapterCompletionEntry> = {};
  const fallbackTime = state.lastUpdated || '';

  for (const chId of state.completedChapters || []) {
    log[chId] = { completed: true, updatedAt: fallbackTime };
  }

  for (const [chId, entry] of Object.entries(state.chapterCompletionLog || {})) {
    if (entry && typeof entry.completed === 'boolean') {
      log[chId] = {
        completed: entry.completed,
        updatedAt: entry.updatedAt || fallbackTime
      };
    }
  }

  return log;
}

function normalizeModuleMasteryMap(raw: unknown): Record<string, ModuleMasteryState> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, ModuleMasteryState> = {};

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const item = val as Partial<ModuleMasteryState>;
    const parsedId = Number(item.moduleId ?? key);
    if (!Number.isInteger(parsedId) || parsedId <= 0) continue;

    out[String(parsedId)] = {
      moduleId: parsedId,
      status:
        item.status === 'locked' ||
        item.status === 'in-progress' ||
        item.status === 'approved' ||
        item.status === 're-study-required'
          ? item.status
          : 'in-progress',
      approvedScore: typeof item.approvedScore === 'number' ? item.approvedScore : undefined,
      approvedAt: typeof item.approvedAt === 'string' ? item.approvedAt : undefined,
      requiredRestudyChapterIds: Array.isArray(item.requiredRestudyChapterIds)
        ? item.requiredRestudyChapterIds.map(String)
        : [],
      restudyResetAt: typeof item.restudyResetAt === 'string' ? item.restudyResetAt : undefined,
      activeCycle: item.activeCycle && typeof item.activeCycle === 'object' ? item.activeCycle : null,
      completedCyclesCount:
        typeof item.completedCyclesCount === 'number' && Number.isFinite(item.completedCyclesCount)
          ? item.completedCyclesCount
          : 0,
      lastUpdated:
        typeof item.lastUpdated === 'string'
          ? item.lastUpdated
          : typeof item.approvedAt === 'string'
          ? item.approvedAt
          : typeof item.restudyResetAt === 'string'
          ? item.restudyResetAt
          : ''
    };
  }

  return out;
}

function normalizeReadingProgressLog(
  rawLog: unknown,
  legacyProgress: Record<string, number>
): Record<string, ReadingProgressEntry> {
  const normalized: Record<string, ReadingProgressEntry> = {};

  if (rawLog && typeof rawLog === 'object') {
    for (const [chId, entry] of Object.entries(rawLog as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Partial<ReadingProgressEntry>;
      const pct = Math.max(0, Math.min(100, Math.round(Number(item.percentage) || 0)));
      normalized[chId] = {
        percentage: pct,
        visitedSections: Array.isArray(item.visitedSections)
          ? Array.from(new Set(item.visitedSections.map(String)))
          : [],
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : ''
      };
    }
  }

  // Keep numeric readingProgress aligned when log entry exists
  for (const [chId, entry] of Object.entries(normalized)) {
    if (!(chId in legacyProgress) && entry.percentage >= 0) {
      legacyProgress[chId] = entry.percentage;
    }
  }

  return normalized;
}

export function normalizeStudyState(raw: unknown): UserStudyState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATE };
  }
  const parsed = raw as Partial<UserStudyState>;
  const readingProgress: Record<string, number> = {};
  if (parsed.readingProgress && typeof parsed.readingProgress === 'object') {
    for (const [k, v] of Object.entries(parsed.readingProgress)) {
      const n = Number(v);
      readingProgress[k] = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
    }
  }

  const readingProgressLog = normalizeReadingProgressLog(parsed.readingProgressLog, readingProgress);

  return {
    version: 1,
    lastUpdated: typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : '',
    completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : [],
    chapterCompletionLog:
      parsed.chapterCompletionLog && typeof parsed.chapterCompletionLog === 'object'
        ? parsed.chapterCompletionLog
        : {},
    readingProgress,
    readingProgressLog,
    bookmarkedQuestions: Array.isArray(parsed.bookmarkedQuestions)
      ? parsed.bookmarkedQuestions
      : [],
    quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
    audioPositions:
      parsed.audioPositions && typeof parsed.audioPositions === 'object'
        ? parsed.audioPositions
        : {},
    moduleMastery: normalizeModuleMasteryMap(parsed.moduleMastery)
  };
}

export function loadStudyState(): UserStudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const normalized = normalizeStudyState(parsed);
    if (!normalized.lastUpdated) {
      normalized.lastUpdated = new Date().toISOString();
    }
    return normalized;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveStudyState(state: UserStudyState, preserveTimestamp = false): void {
  const updated: UserStudyState = {
    ...state,
    lastUpdated: preserveTimestamp && state.lastUpdated ? state.lastUpdated : new Date().toISOString()
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export function setChapterCompleted(
  state: UserStudyState,
  chapterId: string,
  completed: boolean,
  persist = true
): UserStudyState {
  const now = new Date().toISOString();
  const exists = state.completedChapters.includes(chapterId);
  const completedChapters = completed
    ? exists
      ? state.completedChapters
      : [...state.completedChapters, chapterId]
    : state.completedChapters.filter((id) => id !== chapterId);

  const chapterCompletionLog: Record<string, ChapterCompletionEntry> = {
    ...buildEffectiveCompletionLog(state),
    [chapterId]: { completed, updatedAt: now }
  };

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    completedChapters,
    chapterCompletionLog
  };
  if (persist) {
    saveStudyState(next, true);
  }
  return next;
}

export function toggleChapterCompleted(state: UserStudyState, chapterId: string): UserStudyState {
  const exists = state.completedChapters.includes(chapterId);
  return setChapterCompleted(state, chapterId, !exists, true);
}

export function updateChapterReadingProgress(
  state: UserStudyState,
  chapterId: string,
  percentage: number,
  visitedSections: string[] = []
): UserStudyState {
  const cleanPct = Math.max(0, Math.min(100, Math.round(percentage)));
  const cleanSections = Array.from(new Set(visitedSections)).sort();
  const prevLog = state.readingProgressLog?.[chapterId];
  const prevPct = prevLog?.percentage ?? state.readingProgress[chapterId] ?? 0;
  const prevSections = [...(prevLog?.visitedSections || [])].sort();

  if (
    prevPct === cleanPct &&
    prevSections.length === cleanSections.length &&
    prevSections.every((s, idx) => s === cleanSections[idx]) &&
    prevLog?.updatedAt
  ) {
    return state;
  }

  const now = new Date().toISOString();
  const readingProgress = {
    ...(state.readingProgress || {}),
    [chapterId]: cleanPct
  };
  const readingProgressLog: Record<string, ReadingProgressEntry> = {
    ...(state.readingProgressLog || {}),
    [chapterId]: {
      percentage: cleanPct,
      visitedSections: cleanSections,
      updatedAt: now
    }
  };

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    readingProgress,
    readingProgressLog
  };
  saveStudyState(next, true);
  return next;
}

export function recordQuizAttempt(state: UserStudyState, attempt: QuizAttempt): UserStudyState {
  const now = new Date().toISOString();
  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    quizAttempts: [attempt, ...state.quizAttempts]
  };
  saveStudyState(next, true);
  return next;
}

export function updateSyncedAudioPosition(
  state: UserStudyState,
  trackId: string,
  seconds: number
): UserStudyState {
  const cleanSeconds = Math.max(0, Math.floor(seconds));
  const current = state.audioPositions?.[trackId];
  if (current && current.seconds === cleanSeconds) {
    return state;
  }

  const now = new Date().toISOString();
  const audioPositions: Record<string, AudioPositionEntry> = {
    ...(state.audioPositions || {}),
    [trackId]: { seconds: cleanSeconds, updatedAt: now }
  };

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    audioPositions
  };
  saveStudyState(next, true);
  return next;
}

function getMasteryTimestampMs(entry?: ModuleMasteryState): number {
  if (!entry) return 0;
  return Math.max(
    parseTimestampMs(entry.lastUpdated),
    parseTimestampMs(entry.approvedAt),
    parseTimestampMs(entry.restudyResetAt),
    parseTimestampMs(entry.activeCycle?.lastUpdated)
  );
}

function mergeModuleMasteryMaps(
  localMap: Record<string, ModuleMasteryState>,
  remoteMap: Record<string, ModuleMasteryState>
): Record<string, ModuleMasteryState> {
  const merged: Record<string, ModuleMasteryState> = {};
  const keys = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  for (const key of keys) {
    const l = localMap[key];
    const r = remoteMap[key];
    if (l && !r) {
      merged[key] = l;
    } else if (!l && r) {
      merged[key] = r;
    } else if (l && r) {
      const lMs = getMasteryTimestampMs(l);
      const rMs = getMasteryTimestampMs(r);
      if (lMs > rMs) {
        merged[key] = l;
      } else if (rMs > lMs) {
        merged[key] = r;
      } else {
        // Tie-breaker when timestamps match identically
        if (l.status === 'approved' && r.status !== 'approved') {
          merged[key] = l;
        } else if (r.status === 'approved' && l.status !== 'approved') {
          merged[key] = r;
        } else if (l.completedCyclesCount !== r.completedCyclesCount) {
          merged[key] = l.completedCyclesCount >= r.completedCyclesCount ? l : r;
        } else {
          const lAttempt = l.activeCycle?.attemptCount || 0;
          const rAttempt = r.activeCycle?.attemptCount || 0;
          merged[key] = lAttempt >= rAttempt ? l : r;
        }
      }
    }
  }

  return merged;
}

export function mergeStudyStates(local: UserStudyState, remote: UserStudyState): UserStudyState {
  const localLog = buildEffectiveCompletionLog(local);
  const remoteLog = buildEffectiveCompletionLog(remote);
  const mergedLog: Record<string, ChapterCompletionEntry> = {};

  const allChapterIds = new Set([...Object.keys(localLog), ...Object.keys(remoteLog)]);
  for (const chId of allChapterIds) {
    const l = localLog[chId];
    const r = remoteLog[chId];
    if (l && !r) {
      mergedLog[chId] = l;
    } else if (!l && r) {
      mergedLog[chId] = r;
    } else if (l && r) {
      const lMs = parseTimestampMs(l.updatedAt);
      const rMs = parseTimestampMs(r.updatedAt);
      if (lMs > rMs) {
        mergedLog[chId] = l;
      } else if (rMs > lMs) {
        mergedLog[chId] = r;
      } else {
        mergedLog[chId] = l.completed ? l : r;
      }
    }
  }

  const completedChapters = Object.entries(mergedLog)
    .filter(([, entry]) => entry.completed)
    .map(([chId]) => chId)
    .sort();

  const attemptMap = new Map<string, QuizAttempt>();
  for (const att of [...(remote.quizAttempts || []), ...(local.quizAttempts || [])]) {
    if (att && att.attemptId) {
      attemptMap.set(att.attemptId, att);
    }
  }
  const mergedAttempts = Array.from(attemptMap.values()).sort(
    (a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp)
  );

  const localPositions = local.audioPositions || {};
  const remotePositions = remote.audioPositions || {};
  const mergedPositions: Record<string, AudioPositionEntry> = {};
  for (const trackId of new Set([...Object.keys(localPositions), ...Object.keys(remotePositions)])) {
    const l = localPositions[trackId];
    const r = remotePositions[trackId];
    if (l && !r) {
      mergedPositions[trackId] = l;
    } else if (!l && r) {
      mergedPositions[trackId] = r;
    } else if (l && r) {
      const lMs = parseTimestampMs(l.updatedAt);
      const rMs = parseTimestampMs(r.updatedAt);
      if (lMs > rMs) {
        mergedPositions[trackId] = l;
      } else if (rMs > lMs) {
        mergedPositions[trackId] = r;
      } else {
        mergedPositions[trackId] = l.seconds >= r.seconds ? l : r;
      }
    }
  }

  // Timestamp-safe readingProgress reconciliation (preserves surgical restudy resets)
  const mergedReading: Record<string, number> = {};
  const mergedReadingLog: Record<string, ReadingProgressEntry> = {};
  const localReading = local.readingProgress || {};
  const remoteReading = remote.readingProgress || {};
  const localReadingLog = local.readingProgressLog || {};
  const remoteReadingLog = remote.readingProgressLog || {};

  const readingKeys = new Set([
    ...Object.keys(localReading),
    ...Object.keys(remoteReading),
    ...Object.keys(localReadingLog),
    ...Object.keys(remoteReadingLog)
  ]);

  for (const key of readingKeys) {
    const lLog = localReadingLog[key];
    const rLog = remoteReadingLog[key];
    const lNum = Number(localReading[key]) || 0;
    const rNum = Number(remoteReading[key]) || 0;

    if (lLog && rLog) {
      const lMs = parseTimestampMs(lLog.updatedAt);
      const rMs = parseTimestampMs(rLog.updatedAt);
      if (lMs > rMs) {
        mergedReadingLog[key] = lLog;
        mergedReading[key] = lLog.percentage;
      } else if (rMs > lMs) {
        mergedReadingLog[key] = rLog;
        mergedReading[key] = rLog.percentage;
      } else {
        const chosen = lLog.percentage >= rLog.percentage ? lLog : rLog;
        mergedReadingLog[key] = chosen;
        mergedReading[key] = chosen.percentage;
      }
    } else if (lLog && !rLog) {
      const lMs = parseTimestampMs(lLog.updatedAt);
      const rMs = parseTimestampMs(remote.lastUpdated);
      if (rNum > lLog.percentage && rMs > lMs) {
        mergedReading[key] = rNum;
        mergedReadingLog[key] = {
          percentage: rNum,
          visitedSections: lLog.visitedSections || [],
          updatedAt: remote.lastUpdated || lLog.updatedAt
        };
      } else {
        mergedReadingLog[key] = lLog;
        mergedReading[key] = lLog.percentage;
      }
    } else if (!lLog && rLog) {
      const rMs = parseTimestampMs(rLog.updatedAt);
      const lMs = parseTimestampMs(local.lastUpdated);
      if (lNum > rLog.percentage && lMs > rMs) {
        mergedReading[key] = lNum;
        mergedReadingLog[key] = {
          percentage: lNum,
          visitedSections: rLog.visitedSections || [],
          updatedAt: local.lastUpdated || rLog.updatedAt
        };
      } else {
        mergedReadingLog[key] = rLog;
        mergedReading[key] = rLog.percentage;
      }
    } else {
      mergedReading[key] = Math.max(lNum, rNum);
    }
  }

  const mergedMastery = mergeModuleMasteryMaps(
    local.moduleMastery || {},
    remote.moduleMastery || {}
  );

  const bookmarkedQuestions = Array.from(
    new Set([...(local.bookmarkedQuestions || []), ...(remote.bookmarkedQuestions || [])])
  ).sort();

  const newestUpdatedMs = Math.max(
    parseTimestampMs(local.lastUpdated),
    parseTimestampMs(remote.lastUpdated)
  );
  const lastUpdated =
    newestUpdatedMs > 0 ? new Date(newestUpdatedMs).toISOString() : new Date().toISOString();

  return {
    version: 1,
    lastUpdated,
    completedChapters,
    chapterCompletionLog: mergedLog,
    readingProgress: mergedReading,
    readingProgressLog: mergedReadingLog,
    bookmarkedQuestions,
    quizAttempts: mergedAttempts,
    audioPositions: mergedPositions,
    moduleMastery: mergedMastery
  };
}

export function areStudyStatesEqual(a: UserStudyState, b: UserStudyState): boolean {
  const norm = (s: UserStudyState) => ({
    completedChapters: [...(s.completedChapters || [])].sort(),
    chapterCompletionLog: Object.keys(s.chapterCompletionLog || {})
      .sort()
      .map((k) => [k, s.chapterCompletionLog![k]]),
    readingProgress: Object.keys(s.readingProgress || {})
      .sort()
      .map((k) => [k, s.readingProgress[k]]),
    readingProgressLog: Object.keys(s.readingProgressLog || {})
      .sort()
      .map((k) => [k, s.readingProgressLog![k]]),
    bookmarkedQuestions: [...(s.bookmarkedQuestions || [])].sort(),
    attemptIds: (s.quizAttempts || []).map((att) => att.attemptId),
    audioPositions: Object.keys(s.audioPositions || {})
      .sort()
      .map((k) => [k, s.audioPositions![k]]),
    moduleMastery: Object.keys(s.moduleMastery || {})
      .sort()
      .map((k) => [k, s.moduleMastery![k]])
  });

  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

export function mergeImportedState(current: UserStudyState, imported: UserStudyState): UserStudyState {
  const normalizedImported = normalizeStudyState(imported);
  const merged = mergeStudyStates(current, normalizedImported);
  merged.lastUpdated = new Date().toISOString();
  saveStudyState(merged, true);
  return merged;
}

export function getMissedQuestionIds(state: UserStudyState, sessionId?: string): Set<string> {
  // Finds questions where the user's MOST RECENT answer to that question was incorrect
  const latestByQuestion = new Map<string, boolean>();
  const chronological = [...state.quizAttempts].reverse();

  for (const attempt of chronological) {
    if (sessionId && attempt.sessionId !== sessionId && attempt.mode !== 'module-exam') continue;
    for (const ans of attempt.answers) {
      if (sessionId && ans.sessionId && ans.sessionId !== sessionId) continue;
      latestByQuestion.set(ans.questionId, ans.isCorrect);
    }
  }

  const missed = new Set<string>();
  for (const [qId, isCorrect] of latestByQuestion.entries()) {
    if (!isCorrect) {
      missed.add(qId);
    }
  }
  return missed;
}

export interface CatalogDiagnosticCounts {
  evaluatedSessions: number;
  attemptsCount: number;
  avgMastery: number | null;
  openGapsCount: number;
  criticalGapsCount: number;
  attentionGapsCount: number;
}

/**
 * Computes per-module exam metrics cleanly from lightweight ChapterSummary[] without loading full module bundles.
 */
export function computeCatalogModuleMetrics(
  state: UserStudyState,
  moduleChapters: ChapterSummary[]
): CatalogDiagnosticCounts {
  const sessionSet = new Set(moduleChapters.map((c) => c.session));
  let evaluatedSessions = 0;
  let attemptsCount = 0;
  const bestScores: number[] = [];

  for (const ch of moduleChapters) {
    const sessionAttempts = state.quizAttempts.filter(
      (a) => a.sessionId === ch.session && a.mode !== 'module-exam'
    );
    if (sessionAttempts.length > 0) {
      evaluatedSessions++;
      attemptsCount += sessionAttempts.length;
      bestScores.push(Math.max(...sessionAttempts.map((a) => a.scorePercentage)));
    }
  }

  const latestBySubtopicQuestion = new Map<
    string,
    { sessionId: string; subtopicTag: string; isCorrect: boolean }
  >();
  const chronological = [...state.quizAttempts].reverse();
  for (const attempt of chronological) {
    for (const ans of attempt.answers) {
      const targetSession = ans.sessionId || attempt.sessionId;
      if (!sessionSet.has(targetSession)) continue;
      latestBySubtopicQuestion.set(ans.questionId, {
        sessionId: targetSession,
        subtopicTag: ans.subtopicTag,
        isCorrect: ans.isCorrect
      });
    }
  }

  const subtopicGroups = new Map<string, { total: number; correct: number }>();
  for (const item of latestBySubtopicQuestion.values()) {
    const key = `${item.sessionId}::${item.subtopicTag}`;
    const g = subtopicGroups.get(key) || { total: 0, correct: 0 };
    g.total += 1;
    if (item.isCorrect) g.correct += 1;
    subtopicGroups.set(key, g);
  }

  let openGapsCount = 0;
  let criticalGapsCount = 0;
  let attentionGapsCount = 0;
  for (const g of subtopicGroups.values()) {
    const pct = Math.round((g.correct / g.total) * 100);
    if (pct < 75) {
      openGapsCount++;
      if (pct < 50) criticalGapsCount++;
      else attentionGapsCount++;
    }
  }

  const avgMastery =
    bestScores.length > 0
      ? Math.round(bestScores.reduce((acc, s) => acc + s, 0) / bestScores.length)
      : null;

  return {
    evaluatedSessions,
    attemptsCount,
    avgMastery,
    openGapsCount,
    criticalGapsCount,
    attentionGapsCount
  };
}

export function computeSubtopicDiagnostics(
  state: UserStudyState,
  chapters: ChapterData[],
  quizzes: Record<string, SessionQuizBank>
): SubtopicDiagnostic[] {
  // Map latest answer for each question ID so repeated practice updates mastery accurately
  const latestAnswerByQuestion = new Map<string, boolean>();
  const chronological = [...state.quizAttempts].reverse();
  for (const attempt of chronological) {
    for (const ans of attempt.answers) {
      latestAnswerByQuestion.set(ans.questionId, ans.isCorrect);
    }
  }

  const chapterBySession = new Map<string, ChapterData>();
  for (const ch of chapters) {
    chapterBySession.set(ch.session, ch);
  }

  const groups = new Map<
    string,
    {
      sessionId: string;
      sessionTitle: string;
      subtopicTag: string;
      totalAnswered: number;
      correctAnswered: number;
      chapterAnchor: string;
      officialDocUrl: string;
      officialDocLabel: string;
    }
  >();

  for (const [sessionId, bank] of Object.entries(quizzes)) {
    const ch = chapterBySession.get(sessionId);
    const sessionTitle = ch ? ch.title : bank.title;
    for (const q of bank.questions) {
      if (!latestAnswerByQuestion.has(q.id)) continue;
      const isCorrect = latestAnswerByQuestion.get(q.id)!;
      const key = `${sessionId}::${q.subtopicTag}`;
      if (!groups.has(key)) {
        groups.set(key, {
          sessionId,
          sessionTitle,
          subtopicTag: q.subtopicTag,
          totalAnswered: 0,
          correctAnswered: 0,
          chapterAnchor: q.chapterAnchor,
          officialDocUrl: q.officialDocUrl,
          officialDocLabel: q.officialDocLabel
        });
      }
      const g = groups.get(key)!;
      g.totalAnswered += 1;
      if (isCorrect) g.correctAnswered += 1;
    }
  }

  const diagnostics: SubtopicDiagnostic[] = [];
  for (const g of groups.values()) {
    const accuracyPercentage = Math.round((g.correctAnswered / g.totalAnswered) * 100);
    const status: SubtopicDiagnostic['status'] =
      accuracyPercentage < 50 ? 'critical' : accuracyPercentage < 75 ? 'attention' : 'mastered';
    diagnostics.push({
      ...g,
      accuracyPercentage,
      status
    });
  }

  return diagnostics.sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
}

export function computeCognitiveBreakdown(
  state: UserStudyState,
  quizzes: Record<string, SessionQuizBank>
): Record<CognitiveLevel, { answered: number; correct: number; percentage: number }> {
  const latestAnswerByQuestion = new Map<string, boolean>();
  const chronological = [...state.quizAttempts].reverse();
  for (const attempt of chronological) {
    for (const ans of attempt.answers) {
      latestAnswerByQuestion.set(ans.questionId, ans.isCorrect);
    }
  }

  const result: Record<CognitiveLevel, { answered: number; correct: number; percentage: number }> = {
    conceptual: { answered: 0, correct: 0, percentage: 0 },
    architecture: { answered: 0, correct: 0, percentage: 0 },
    'code-practice': { answered: 0, correct: 0, percentage: 0 }
  };

  for (const bank of Object.values(quizzes)) {
    for (const q of bank.questions) {
      if (!latestAnswerByQuestion.has(q.id)) continue;
      const isCorrect = latestAnswerByQuestion.get(q.id)!;
      const bucket = result[q.cognitiveLevel] || result.conceptual;
      bucket.answered += 1;
      if (isCorrect) bucket.correct += 1;
    }
  }

  for (const level of ['conceptual', 'architecture', 'code-practice'] as CognitiveLevel[]) {
    const b = result[level];
    b.percentage = b.answered > 0 ? Math.round((b.correct / b.answered) * 100) : 0;
  }

  return result;
}
