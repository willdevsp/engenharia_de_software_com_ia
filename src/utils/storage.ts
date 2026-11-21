import type {
  AudioPositionEntry,
  ChapterCompletionEntry,
  ChapterData,
  ChapterSummary,
  CognitiveLevel,
  ModuleMasteryState,
  QuestionAnswerEntry,
  QuizAttempt,
  QuizQuestion,
  ReadingProgressEntry,
  SessionQuizBank,
  SubtopicDiagnostic,
  UserStudyState
} from '../types/course';

const STORAGE_KEY = 'engenharia_ia_study_state_v1';

export function createEmptyStudyState(resetTimestamp?: string): UserStudyState {
  const now = resetTimestamp || new Date().toISOString();
  return {
    version: 1,
    lastUpdated: now,
    globalResetAt: resetTimestamp,
    completedChapters: [],
    chapterCompletionLog: {},
    readingProgress: {},
    readingProgressLog: {},
    bookmarkedQuestions: [],
    questionAnswers: {},
    sessionResetLog: {},
    quizAttempts: [],
    audioPositions: {},
    moduleMastery: {}
  };
}

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

  for (const [chId, entry] of Object.entries(normalized)) {
    if (!(chId in legacyProgress) && entry.percentage >= 0) {
      legacyProgress[chId] = entry.percentage;
    }
  }

  return normalized;
}

function normalizeQuestionAnswers(raw: unknown): Record<string, QuestionAnswerEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, QuestionAnswerEntry> = {};

  for (const [qId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const item = val as Partial<QuestionAnswerEntry>;
    const selected = Number(item.selectedOptionIndex);
    if (!Number.isInteger(selected) || selected < 0 || selected > 3) continue;
    out[String(item.questionId || qId)] = {
      questionId: String(item.questionId || qId),
      sessionId: String(item.sessionId || ''),
      moduleId: Number(item.moduleId) || 1,
      selectedOptionIndex: selected,
      isCorrect: Boolean(item.isCorrect),
      subtopicTag: String(item.subtopicTag || ''),
      cognitiveLevel:
        item.cognitiveLevel === 'architecture' || item.cognitiveLevel === 'code-practice'
          ? item.cognitiveLevel
          : 'conceptual',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : ''
    };
  }
  return out;
}

function normalizeSessionResetLog(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [sid, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof ts === 'string' && ts.trim()) {
      out[sid] = ts;
    }
  }
  return out;
}

function sanitizeQuizAttempts(rawAttempts: unknown): QuizAttempt[] {
  if (!Array.isArray(rawAttempts)) return [];
  const sanitized: QuizAttempt[] = [];

  for (const rawAtt of rawAttempts) {
    if (!rawAtt || typeof rawAtt !== 'object') continue;
    const att = rawAtt as QuizAttempt;
    const rawAnswers = Array.isArray(att.answers) ? att.answers : [];
    // Never treat unselected blank items (-1) as wrong answers in session practice attempts
    const validSelectedAnswers = rawAnswers.filter(
      (a) => a && typeof a.selectedOptionIndex === 'number' && a.selectedOptionIndex >= 0
    );

    if (att.mode !== 'module-exam') {
      if (validSelectedAnswers.length === 0) {
        continue;
      }
      const correctCount = validSelectedAnswers.filter((a) => a.isCorrect).length;
      sanitized.push({
        ...att,
        totalQuestions: validSelectedAnswers.length,
        correctCount,
        scorePercentage: Math.round((correctCount / validSelectedAnswers.length) * 100),
        answers: validSelectedAnswers
      });
    } else {
      sanitized.push({
        ...att,
        answers: rawAnswers
      });
    }
  }

  return sanitized;
}

export function normalizeStudyState(raw: unknown): UserStudyState {
  if (!raw || typeof raw !== 'object') {
    return createEmptyStudyState();
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
    globalResetAt: typeof parsed.globalResetAt === 'string' ? parsed.globalResetAt : undefined,
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
    questionAnswers: normalizeQuestionAnswers(parsed.questionAnswers),
    sessionResetLog: normalizeSessionResetLog(parsed.sessionResetLog),
    quizAttempts: sanitizeQuizAttempts(parsed.quizAttempts),
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
    if (!raw) return createEmptyStudyState();
    const parsed = JSON.parse(raw);
    const normalized = normalizeStudyState(parsed);
    if (!normalized.lastUpdated) {
      normalized.lastUpdated = new Date().toISOString();
    }
    return normalized;
  } catch {
    return createEmptyStudyState();
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

export function recordSessionQuestionAnswer(
  state: UserStudyState,
  question: QuizQuestion,
  moduleId: number,
  selectedOptionIndex: number,
  persist = true
): UserStudyState {
  const now = new Date().toISOString();
  const entry: QuestionAnswerEntry = {
    questionId: question.id,
    sessionId: question.sessionId,
    moduleId,
    selectedOptionIndex,
    isCorrect: selectedOptionIndex === question.correctOptionIndex,
    subtopicTag: question.subtopicTag,
    cognitiveLevel: question.cognitiveLevel,
    updatedAt: now
  };

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    questionAnswers: {
      ...(state.questionAnswers || {}),
      [question.id]: entry
    }
  };
  if (persist) {
    saveStudyState(next, true);
  }
  return next;
}

export function clearSessionQuestionAnswers(
  state: UserStudyState,
  sessionId: string,
  persist = true
): UserStudyState {
  const now = new Date().toISOString();
  const nextAnswers: Record<string, QuestionAnswerEntry> = {};
  for (const [qId, entry] of Object.entries(state.questionAnswers || {})) {
    if (entry.sessionId !== sessionId) {
      nextAnswers[qId] = entry;
    }
  }

  const nextAttempts = (state.quizAttempts || []).filter(
    (att) => !(att.sessionId === sessionId && att.mode !== 'module-exam')
  );

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    questionAnswers: nextAnswers,
    quizAttempts: nextAttempts,
    sessionResetLog: {
      ...(state.sessionResetLog || {}),
      [sessionId]: now
    }
  };
  if (persist) {
    saveStudyState(next, true);
  }
  return next;
}

export function recordQuizAttempt(state: UserStudyState, attempt: QuizAttempt): UserStudyState {
  const now = new Date().toISOString();
  const validAnswers = (attempt.answers || []).filter((a) => a.selectedOptionIndex >= 0);

  // Sync valid selections into continuous questionAnswers as well
  const nextQuestionAnswers = { ...(state.questionAnswers || {}) };
  if (attempt.mode !== 'module-exam') {
    for (const ans of validAnswers) {
      nextQuestionAnswers[ans.questionId] = {
        questionId: ans.questionId,
        sessionId: ans.sessionId || attempt.sessionId,
        moduleId: attempt.moduleId || 1,
        selectedOptionIndex: ans.selectedOptionIndex,
        isCorrect: ans.isCorrect,
        subtopicTag: ans.subtopicTag,
        cognitiveLevel: ans.cognitiveLevel,
        updatedAt: attempt.timestamp || now
      };
    }
  }

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    questionAnswers: nextQuestionAnswers,
    quizAttempts:
      attempt.mode === 'module-exam' || validAnswers.length > 0
        ? [
            attempt.mode === 'module-exam'
              ? attempt
              : {
                  ...attempt,
                  totalQuestions: validAnswers.length,
                  correctCount: validAnswers.filter((a) => a.isCorrect).length,
                  scorePercentage: Math.round(
                    (validAnswers.filter((a) => a.isCorrect).length / validAnswers.length) * 100
                  ),
                  answers: validAnswers
                },
            ...state.quizAttempts
          ]
        : state.quizAttempts
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

function pruneStateBeforeGlobalReset(state: UserStudyState, resetMs: number): UserStudyState {
  if (resetMs <= 0) return state;

  const fallbackMs = parseTimestampMs(state.lastUpdated);
  const log = buildEffectiveCompletionLog(state);
  const filteredLog: Record<string, ChapterCompletionEntry> = {};
  const filteredCompleted: string[] = [];

  for (const [chId, entry] of Object.entries(log)) {
    const entryMs = parseTimestampMs(entry.updatedAt) || fallbackMs;
    if (entryMs > resetMs) {
      filteredLog[chId] = entry;
      if (entry.completed) filteredCompleted.push(chId);
    }
  }

  const filteredReading: Record<string, number> = {};
  const filteredReadingLog: Record<string, ReadingProgressEntry> = {};
  for (const [chId, entry] of Object.entries(state.readingProgressLog || {})) {
    const entryMs = parseTimestampMs(entry.updatedAt) || fallbackMs;
    if (entryMs > resetMs) {
      filteredReadingLog[chId] = entry;
      filteredReading[chId] = entry.percentage;
    }
  }
  if (Object.keys(state.readingProgressLog || {}).length === 0 && fallbackMs > resetMs) {
    Object.assign(filteredReading, state.readingProgress || {});
  }

  const filteredQuestions: Record<string, QuestionAnswerEntry> = {};
  for (const [qId, entry] of Object.entries(state.questionAnswers || {})) {
    const entryMs = parseTimestampMs(entry.updatedAt) || fallbackMs;
    if (entryMs > resetMs) {
      filteredQuestions[qId] = entry;
    }
  }

  const filteredAttempts = (state.quizAttempts || []).filter(
    (att) => parseTimestampMs(att.timestamp) > resetMs
  );

  const filteredMastery: Record<string, ModuleMasteryState> = {};
  for (const [modKey, entry] of Object.entries(state.moduleMastery || {})) {
    if (getMasteryTimestampMs(entry) > resetMs) {
      filteredMastery[modKey] = entry;
    }
  }

  return {
    ...state,
    completedChapters: filteredCompleted,
    chapterCompletionLog: filteredLog,
    readingProgress: filteredReading,
    readingProgressLog: filteredReadingLog,
    questionAnswers: filteredQuestions,
    quizAttempts: filteredAttempts,
    moduleMastery: filteredMastery,
    bookmarkedQuestions: fallbackMs > resetMs ? state.bookmarkedQuestions : []
  };
}

export function mergeStudyStates(rawLocal: UserStudyState, rawRemote: UserStudyState): UserStudyState {
  const maxResetMs = Math.max(
    parseTimestampMs(rawLocal.globalResetAt),
    parseTimestampMs(rawRemote.globalResetAt)
  );
  const globalResetAt = maxResetMs > 0 ? new Date(maxResetMs).toISOString() : undefined;

  const local = pruneStateBeforeGlobalReset(rawLocal, maxResetMs);
  const remote = pruneStateBeforeGlobalReset(rawRemote, maxResetMs);

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

  // Reconcile per-session reset timestamps
  const mergedSessionResetLog: Record<string, string> = {};
  const allResetSessions = new Set([
    ...Object.keys(local.sessionResetLog || {}),
    ...Object.keys(remote.sessionResetLog || {})
  ]);
  for (const sid of allResetSessions) {
    const lMs = parseTimestampMs(local.sessionResetLog?.[sid]);
    const rMs = parseTimestampMs(remote.sessionResetLog?.[sid]);
    if (lMs > rMs && local.sessionResetLog?.[sid]) {
      mergedSessionResetLog[sid] = local.sessionResetLog[sid];
    } else if (remote.sessionResetLog?.[sid]) {
      mergedSessionResetLog[sid] = remote.sessionResetLog[sid];
    }
  }

  // Reconcile quizAttempts ignoring attempts invalidated by sessionResetLog
  const attemptMap = new Map<string, QuizAttempt>();
  for (const att of [...(remote.quizAttempts || []), ...(local.quizAttempts || [])]) {
    if (!att || !att.attemptId) continue;
    if (att.mode !== 'module-exam') {
      const resetMs = parseTimestampMs(mergedSessionResetLog[att.sessionId]);
      if (resetMs > 0 && parseTimestampMs(att.timestamp) <= resetMs) {
        continue;
      }
    }
    attemptMap.set(att.attemptId, att);
  }
  const mergedAttempts = Array.from(attemptMap.values()).sort(
    (a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp)
  );

  // Reconcile continuous questionAnswers (Last-Write-Wins, respecting session resets)
  const mergedQuestionAnswers: Record<string, QuestionAnswerEntry> = {};
  const lQ = local.questionAnswers || {};
  const rQ = remote.questionAnswers || {};
  for (const qId of new Set([...Object.keys(lQ), ...Object.keys(rQ)])) {
    const l = lQ[qId];
    const r = rQ[qId];
    const chosen =
      l && !r
        ? l
        : !l && r
        ? r
        : parseTimestampMs(l!.updatedAt) >= parseTimestampMs(r!.updatedAt)
        ? l!
        : r!;
    const resetMs = parseTimestampMs(mergedSessionResetLog[chosen.sessionId]);
    if (resetMs > 0 && parseTimestampMs(chosen.updatedAt) <= resetMs) {
      continue;
    }
    mergedQuestionAnswers[qId] = chosen;
  }

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
    maxResetMs,
    parseTimestampMs(local.lastUpdated),
    parseTimestampMs(remote.lastUpdated)
  );
  const lastUpdated =
    newestUpdatedMs > 0 ? new Date(newestUpdatedMs).toISOString() : new Date().toISOString();

  return {
    version: 1,
    lastUpdated,
    globalResetAt,
    completedChapters,
    chapterCompletionLog: mergedLog,
    readingProgress: mergedReading,
    readingProgressLog: mergedReadingLog,
    bookmarkedQuestions,
    questionAnswers: mergedQuestionAnswers,
    sessionResetLog: mergedSessionResetLog,
    quizAttempts: mergedAttempts,
    audioPositions: mergedPositions,
    moduleMastery: mergedMastery
  };
}

export function areStudyStatesEqual(a: UserStudyState, b: UserStudyState): boolean {
  const norm = (s: UserStudyState) => ({
    globalResetAt: s.globalResetAt || '',
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
    questionAnswers: Object.keys(s.questionAnswers || {})
      .sort()
      .map((k) => [k, s.questionAnswers![k]]),
    sessionResetLog: Object.keys(s.sessionResetLog || {})
      .sort()
      .map((k) => [k, s.sessionResetLog![k]]),
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

export interface UnifiedQuestionAnswer {
  questionId: string;
  sessionId: string;
  subtopicTag: string;
  cognitiveLevel: CognitiveLevel;
  isCorrect: boolean;
  timestampMs: number;
}

/**
 * Resolves the latest valid (>= 0) answer per unique questionId across both submitted attempts
 * and continuous questionAnswers drafts. Blank selections (-1) never count as answered/errors.
 */
export function getLatestQuestionAnswerMap(
  state: UserStudyState,
  sessionFilter?: string
): Map<string, UnifiedQuestionAnswer> {
  const latestMap = new Map<string, UnifiedQuestionAnswer>();
  const chronological = [...(state.quizAttempts || [])].reverse();

  for (const attempt of chronological) {
    const attemptMs = parseTimestampMs(attempt.timestamp);
    for (const ans of attempt.answers || []) {
      if (ans.selectedOptionIndex < 0) continue;
      const targetSession = ans.sessionId || attempt.sessionId;
      if (sessionFilter && targetSession !== sessionFilter) continue;

      const existing = latestMap.get(ans.questionId);
      if (!existing || attemptMs >= existing.timestampMs) {
        latestMap.set(ans.questionId, {
          questionId: ans.questionId,
          sessionId: targetSession,
          subtopicTag: ans.subtopicTag,
          cognitiveLevel: ans.cognitiveLevel,
          isCorrect: ans.isCorrect,
          timestampMs: attemptMs
        });
      }
    }
  }

  for (const entry of Object.values(state.questionAnswers || {})) {
    if (entry.selectedOptionIndex < 0) continue;
    if (sessionFilter && entry.sessionId !== sessionFilter) continue;
    const entryMs = parseTimestampMs(entry.updatedAt);
    const existing = latestMap.get(entry.questionId);
    if (!existing || entryMs >= existing.timestampMs) {
      latestMap.set(entry.questionId, {
        questionId: entry.questionId,
        sessionId: entry.sessionId,
        subtopicTag: entry.subtopicTag,
        cognitiveLevel: entry.cognitiveLevel,
        isCorrect: entry.isCorrect,
        timestampMs: entryMs
      });
    }
  }

  return latestMap;
}

export function getSessionUniqueAnswerStats(
  state: UserStudyState,
  sessionId: string
): { answeredCount: number; correctCount: number; accuracyPercentage: number | null } {
  const map = getLatestQuestionAnswerMap(state, sessionId);
  if (map.size === 0) {
    return { answeredCount: 0, correctCount: 0, accuracyPercentage: null };
  }
  let correctCount = 0;
  for (const item of map.values()) {
    if (item.isCorrect) correctCount++;
  }
  return {
    answeredCount: map.size,
    correctCount,
    accuracyPercentage: Math.round((correctCount / map.size) * 100)
  };
}

export function getMissedQuestionIds(state: UserStudyState, sessionId?: string): Set<string> {
  const latestByQuestion = getLatestQuestionAnswerMap(state, sessionId);
  const missed = new Set<string>();
  for (const [qId, item] of latestByQuestion.entries()) {
    if (!item.isCorrect) {
      missed.add(qId);
    }
  }
  return missed;
}

export interface CatalogDiagnosticCounts {
  evaluatedSessions: number;
  answeredQuestionsCount: number;
  attemptsCount: number;
  avgMastery: number | null;
  openGapsCount: number;
  criticalGapsCount: number;
  attentionGapsCount: number;
}

/**
 * Computes per-module metrics cleanly from lightweight ChapterSummary[] using unique answered questions.
 */
export function computeCatalogModuleMetrics(
  state: UserStudyState,
  moduleChapters: ChapterSummary[]
): CatalogDiagnosticCounts {
  const sessionSet = new Set(moduleChapters.map((c) => c.session));
  const latestMap = getLatestQuestionAnswerMap(state);

  const bySession = new Map<string, { total: number; correct: number }>();
  const subtopicGroups = new Map<string, { total: number; correct: number }>();
  let answeredQuestionsCount = 0;

  for (const item of latestMap.values()) {
    if (!sessionSet.has(item.sessionId)) continue;
    answeredQuestionsCount++;

    const sStats = bySession.get(item.sessionId) || { total: 0, correct: 0 };
    sStats.total += 1;
    if (item.isCorrect) sStats.correct += 1;
    bySession.set(item.sessionId, sStats);

    const key = `${item.sessionId}::${item.subtopicTag}`;
    const g = subtopicGroups.get(key) || { total: 0, correct: 0 };
    g.total += 1;
    if (item.isCorrect) g.correct += 1;
    subtopicGroups.set(key, g);
  }

  let evaluatedSessions = 0;
  const sessionScores: number[] = [];
  for (const ch of moduleChapters) {
    const sStats = bySession.get(ch.session);
    if (sStats && sStats.total > 0) {
      evaluatedSessions++;
      sessionScores.push(Math.round((sStats.correct / sStats.total) * 100));
    }
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
    sessionScores.length > 0
      ? Math.round(sessionScores.reduce((acc, s) => acc + s, 0) / sessionScores.length)
      : null;

  return {
    evaluatedSessions,
    answeredQuestionsCount,
    attemptsCount: answeredQuestionsCount,
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
  const latestMap = getLatestQuestionAnswerMap(state);
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
      const latest = latestMap.get(q.id);
      if (!latest) continue;
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
      if (latest.isCorrect) g.correctAnswered += 1;
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
  const latestMap = getLatestQuestionAnswerMap(state);

  const result: Record<CognitiveLevel, { answered: number; correct: number; percentage: number }> = {
    conceptual: { answered: 0, correct: 0, percentage: 0 },
    architecture: { answered: 0, correct: 0, percentage: 0 },
    'code-practice': { answered: 0, correct: 0, percentage: 0 }
  };

  for (const bank of Object.values(quizzes)) {
    for (const q of bank.questions) {
      const latest = latestMap.get(q.id);
      if (!latest) continue;
      const bucket = result[q.cognitiveLevel] || result.conceptual;
      bucket.answered += 1;
      if (latest.isCorrect) bucket.correct += 1;
    }
  }

  for (const level of ['conceptual', 'architecture', 'code-practice'] as CognitiveLevel[]) {
    const b = result[level];
    b.percentage = b.answered > 0 ? Math.round((b.correct / b.answered) * 100) : 0;
  }

  return result;
}
