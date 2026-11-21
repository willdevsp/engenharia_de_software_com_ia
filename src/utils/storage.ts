import type {
  AudioPositionEntry,
  ChapterCompletionEntry,
  ChapterData,
  CognitiveLevel,
  QuizAttempt,
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
  bookmarkedQuestions: [],
  quizAttempts: [],
  audioPositions: {}
};

function parseTimestampMs(iso?: string): number {
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

export function loadStudyState(): UserStudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : [],
      chapterCompletionLog:
        parsed.chapterCompletionLog && typeof parsed.chapterCompletionLog === 'object'
          ? parsed.chapterCompletionLog
          : {},
      readingProgress: parsed.readingProgress || {},
      bookmarkedQuestions: Array.isArray(parsed.bookmarkedQuestions)
        ? parsed.bookmarkedQuestions
        : [],
      quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
      audioPositions:
        parsed.audioPositions && typeof parsed.audioPositions === 'object'
          ? parsed.audioPositions
          : {}
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveStudyState(state: UserStudyState, preserveTimestamp = false): void {
  const updated: UserStudyState = {
    ...state,
    lastUpdated: preserveTimestamp && state.lastUpdated ? state.lastUpdated : new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function toggleChapterCompleted(state: UserStudyState, chapterId: string): UserStudyState {
  const now = new Date().toISOString();
  const exists = state.completedChapters.includes(chapterId);
  const completed = !exists;
  const completedChapters = completed
    ? [...state.completedChapters, chapterId]
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

  const mergedReading: Record<string, number> = {};
  const localReading = local.readingProgress || {};
  const remoteReading = remote.readingProgress || {};
  for (const key of new Set([...Object.keys(localReading), ...Object.keys(remoteReading)])) {
    mergedReading[key] = Math.max(Number(localReading[key]) || 0, Number(remoteReading[key]) || 0);
  }

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
    bookmarkedQuestions,
    quizAttempts: mergedAttempts,
    audioPositions: mergedPositions
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
    bookmarkedQuestions: [...(s.bookmarkedQuestions || [])].sort(),
    attemptIds: (s.quizAttempts || []).map((att) => att.attemptId),
    audioPositions: Object.keys(s.audioPositions || {})
      .sort()
      .map((k) => [k, s.audioPositions![k]])
  });

  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

export function mergeImportedState(current: UserStudyState, imported: UserStudyState): UserStudyState {
  const merged = mergeStudyStates(current, imported);
  merged.lastUpdated = new Date().toISOString();
  saveStudyState(merged, true);
  return merged;
}

export function getMissedQuestionIds(state: UserStudyState, sessionId?: string): Set<string> {
  // Finds questions where the user's MOST RECENT answer to that question was incorrect
  const latestByQuestion = new Map<string, boolean>();
  const chronological = [...state.quizAttempts].reverse();

  for (const attempt of chronological) {
    if (sessionId && attempt.sessionId !== sessionId) continue;
    for (const ans of attempt.answers) {
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
