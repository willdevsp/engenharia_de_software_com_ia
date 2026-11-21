import type {
  ChapterCompletionEntry,
  ChapterSummary,
  CognitiveLevel,
  ModuleExamCycle,
  ModuleExamSlot,
  ModuleMasteryState,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizQuestion,
  ReadingProgressEntry,
  SessionQuizBank,
  UserStudyState
} from '../types/course';
import { getMissedQuestionIds, parseTimestampMs, saveStudyState } from './storage';

export const MASTERY_PASS_PERCENTAGE = 70;
export const MAX_MODULE_EXAM_QUESTIONS = 40;
export const MAX_CYCLE_CHANCES = 3;

export function isModuleUnlocked(moduleId: number, studyState: UserStudyState): boolean {
  if (moduleId <= 1) return true;
  const prevState = studyState.moduleMastery?.[String(moduleId - 1)];
  return prevState?.status === 'approved';
}

export function isChapterCompletedForCurrentCycle(
  chapterId: string,
  studyState: UserStudyState,
  restudyResetAt?: string
): boolean {
  if (!studyState.completedChapters.includes(chapterId)) {
    return false;
  }
  if (!restudyResetAt) {
    return true;
  }
  const resetMs = parseTimestampMs(restudyResetAt);
  const logEntry = studyState.chapterCompletionLog?.[chapterId];
  if (!logEntry) return false;
  return logEntry.completed && parseTimestampMs(logEntry.updatedAt) >= resetMs;
}

export function getPendingChaptersForModuleExam(
  moduleId: number,
  moduleChapters: Pick<ChapterSummary, 'id' | 'session' | 'title'>[],
  studyState: UserStudyState
): {
  pendingRestudyIds: string[];
  unreadChapterIds: string[];
  isEligible: boolean;
} {
  const mastery = studyState.moduleMastery?.[String(moduleId)];
  if (mastery?.status === 're-study-required' && mastery.requiredRestudyChapterIds.length > 0) {
    const pendingRestudyIds = mastery.requiredRestudyChapterIds.filter(
      (id) => !isChapterCompletedForCurrentCycle(id, studyState, mastery.restudyResetAt)
    );
    const unreadChapterIds = moduleChapters
      .filter((ch) => !studyState.completedChapters.includes(ch.id))
      .map((ch) => ch.id);
    return {
      pendingRestudyIds,
      unreadChapterIds,
      isEligible: false
    };
  }

  const unreadChapterIds = moduleChapters
    .filter((ch) => !studyState.completedChapters.includes(ch.id))
    .map((ch) => ch.id);

  return {
    pendingRestudyIds: [],
    unreadChapterIds,
    isEligible: moduleChapters.length > 0 && unreadChapterIds.length === 0
  };
}

export function syncRestudyCompletion(
  moduleId: number,
  state: UserStudyState,
  persist = true
): UserStudyState {
  const key = String(moduleId);
  const mastery = state.moduleMastery?.[key];
  if (!mastery || mastery.status !== 're-study-required') {
    return state;
  }

  const stillPending = mastery.requiredRestudyChapterIds.some(
    (id) => !isChapterCompletedForCurrentCycle(id, state, mastery.restudyResetAt)
  );
  if (stillPending) {
    return state;
  }

  const now = new Date().toISOString();
  const nextMastery: ModuleMasteryState = {
    ...mastery,
    status: 'in-progress',
    requiredRestudyChapterIds: [],
    activeCycle: null,
    lastUpdated: now
  };

  const next: UserStudyState = {
    ...state,
    lastUpdated: now,
    moduleMastery: {
      ...(state.moduleMastery || {}),
      [key]: nextMastery
    }
  };
  if (persist) {
    saveStudyState(next, true);
  }
  return next;
}

export function getEffectiveModuleMastery(
  moduleId: number,
  studyState: UserStudyState,
  moduleChapters: Pick<ChapterSummary, 'id' | 'session' | 'title'>[]
): ModuleMasteryState {
  const existing = studyState.moduleMastery?.[String(moduleId)];
  const unlocked = isModuleUnlocked(moduleId, studyState);

  if (!unlocked) {
    return (
      existing || {
        moduleId,
        status: 'locked',
        requiredRestudyChapterIds: [],
        activeCycle: null,
        completedCyclesCount: 0,
        lastUpdated: ''
      }
    );
  }

  if (existing) {
    if (existing.status === 'locked') {
      return { ...existing, status: 'in-progress' };
    }
    if (existing.status === 're-study-required') {
      const { pendingRestudyIds } = getPendingChaptersForModuleExam(
        moduleId,
        moduleChapters,
        studyState
      );
      if (pendingRestudyIds.length === 0) {
        return {
          ...existing,
          status: 'in-progress',
          requiredRestudyChapterIds: [],
          activeCycle: null
        };
      }
      return { ...existing, requiredRestudyChapterIds: pendingRestudyIds };
    }
    return existing;
  }

  return {
    moduleId,
    status: 'in-progress',
    requiredRestudyChapterIds: [],
    activeCycle: null,
    completedCyclesCount: 0,
    lastUpdated: ''
  };
}

function allocateSessionQuotas(
  sessions: { sessionId: string; totalCount: number }[],
  targetTotal: number
): Map<string, number> {
  const quotas = new Map<string, number>();
  const totalAvailable = sessions.reduce((acc, s) => acc + s.totalCount, 0);
  if (totalAvailable <= 0 || targetTotal <= 0) return quotas;

  if (totalAvailable <= targetTotal) {
    for (const s of sessions) {
      quotas.set(s.sessionId, s.totalCount);
    }
    return quotas;
  }

  let assigned = 0;
  const remainders: { sessionId: string; rem: number; cap: number }[] = [];

  for (const s of sessions) {
    const exact = (s.totalCount / totalAvailable) * targetTotal;
    // Ensure every session contributes at least 1 question when possible
    const base = Math.min(s.totalCount, Math.max(sessions.length <= targetTotal ? 1 : 0, Math.floor(exact)));
    quotas.set(s.sessionId, base);
    assigned += base;
    remainders.push({
      sessionId: s.sessionId,
      rem: exact - base,
      cap: s.totalCount
    });
  }

  // Trim if minimum floor of 1 exceeded targetTotal (only happens if sessions.length > targetTotal)
  while (assigned > targetTotal) {
    let bestDropId: string | null = null;
    let lowestRem = Infinity;
    for (const item of remainders) {
      const cur = quotas.get(item.sessionId) || 0;
      if (cur > 0 && item.rem < lowestRem) {
        lowestRem = item.rem;
        bestDropId = item.sessionId;
      }
    }
    if (!bestDropId) break;
    quotas.set(bestDropId, (quotas.get(bestDropId) || 1) - 1);
    assigned--;
  }

  // Distribute remaining slots by largest fractional remainder
  remainders.sort((a, b) => b.rem - a.rem);
  while (assigned < targetTotal) {
    let progressed = false;
    for (const item of remainders) {
      if (assigned >= targetTotal) break;
      const cur = quotas.get(item.sessionId) || 0;
      if (cur < item.cap) {
        quotas.set(item.sessionId, cur + 1);
        assigned++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return quotas;
}

function buildPracticeSubtopicAccuracy(studyState: UserStudyState): Map<string, number> {
  const latestByQ = new Map<string, { sessionId: string; subtopicTag: string; isCorrect: boolean }>();
  const chronological = [...studyState.quizAttempts].reverse();
  for (const attempt of chronological) {
    for (const ans of attempt.answers) {
      latestByQ.set(ans.questionId, {
        sessionId: ans.sessionId || attempt.sessionId,
        subtopicTag: ans.subtopicTag,
        isCorrect: ans.isCorrect
      });
    }
  }

  const acc = new Map<string, { total: number; correct: number }>();
  for (const item of latestByQ.values()) {
    const key = `${item.sessionId}::${item.subtopicTag}`;
    const entry = acc.get(key) || { total: 0, correct: 0 };
    entry.total += 1;
    if (item.isCorrect) entry.correct += 1;
    acc.set(key, entry);
  }

  const result = new Map<string, number>();
  for (const [key, entry] of acc.entries()) {
    result.set(key, entry.correct / entry.total);
  }
  return result;
}

function pickSessionQuestionsBalanced(
  bank: SessionQuizBank,
  quota: number,
  missedIds: Set<string>,
  subtopicAccuracy: Map<string, number>,
  cycleNumber: number
): QuizQuestion[] {
  if (quota <= 0 || bank.questions.length === 0) return [];
  if (quota >= bank.questions.length) return [...bank.questions];

  // Rotate base order slightly per cycle so repeated cycles introduce fresh variety
  const n = bank.questions.length;
  const shift = ((cycleNumber - 1) * 3) % n;
  const rotated = [...bank.questions.slice(shift), ...bank.questions.slice(0, shift)];

  const scoreCandidate = (q: QuizQuestion): number => {
    let priority = 0;
    if (missedIds.has(q.id)) priority += 2;
    const subAcc = subtopicAccuracy.get(`${bank.sessionId}::${q.subtopicTag}`);
    if (subAcc !== undefined && subAcc < 0.75) priority += 1;
    return priority;
  };

  // Group into cognitive buckets while honoring priority order inside each bucket
  const levels: CognitiveLevel[] = ['conceptual', 'architecture', 'code-practice'];
  const buckets = new Map<CognitiveLevel, QuizQuestion[]>();
  for (const lvl of levels) buckets.set(lvl, []);

  for (const q of rotated) {
    const lvl = levels.includes(q.cognitiveLevel) ? q.cognitiveLevel : 'conceptual';
    buckets.get(lvl)!.push(q);
  }
  for (const lvl of levels) {
    buckets.get(lvl)!.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  }

  const chosen: QuizQuestion[] = [];
  const chosenIds = new Set<string>();

  // Round-robin across cognitive levels
  while (chosen.length < quota) {
    let addedInRound = false;
    for (const lvl of levels) {
      if (chosen.length >= quota) break;
      const pool = buckets.get(lvl)!;
      while (pool.length > 0) {
        const nextQ = pool.shift()!;
        if (!chosenIds.has(nextQ.id)) {
          chosenIds.add(nextQ.id);
          chosen.push(nextQ);
          addedInRound = true;
          break;
        }
      }
    }
    if (!addedInRound) break;
  }

  return chosen;
}

export function buildModuleExamChance1Slots(
  studyState: UserStudyState,
  moduleChapters: Pick<ChapterSummary, 'id' | 'session'>[],
  moduleQuizzes: Record<string, SessionQuizBank>,
  cycleNumber = 1
): ModuleExamSlot[] {
  const sessionList = moduleChapters
    .map((ch) => ({
      sessionId: ch.session,
      bank: moduleQuizzes[ch.session],
      totalCount: moduleQuizzes[ch.session]?.questions.length || 0
    }))
    .filter((item) => item.totalCount > 0);

  const totalQuestions = sessionList.reduce((acc, s) => acc + s.totalCount, 0);
  if (totalQuestions === 0) return [];

  const targetTotal = Math.min(MAX_MODULE_EXAM_QUESTIONS, totalQuestions);
  const quotas = allocateSessionQuotas(sessionList, targetTotal);
  const missedIds = getMissedQuestionIds(studyState);
  const subtopicAcc = buildPracticeSubtopicAccuracy(studyState);

  const slots: ModuleExamSlot[] = [];
  for (const item of sessionList) {
    const qCount = quotas.get(item.sessionId) || 0;
    const selected = pickSessionQuestionsBalanced(
      item.bank,
      qCount,
      missedIds,
      subtopicAcc,
      cycleNumber
    );
    for (const q of selected) {
      slots.push({
        slotIndex: slots.length,
        sessionId: item.sessionId,
        subtopicTag: q.subtopicTag,
        cognitiveLevel: q.cognitiveLevel,
        originalQuestionId: q.id,
        currentQuestionId: q.id,
        status: 'pending',
        attemptsHistory: [q.id]
      });
    }
  }

  return slots;
}

function selectRecoveryQuestionForSlot(
  slot: ModuleExamSlot,
  usedQuestionIdsInCycle: Set<string>,
  moduleQuizzes: Record<string, SessionQuizBank>
): QuizQuestion | null {
  const bank = moduleQuizzes[slot.sessionId];
  if (!bank || bank.questions.length === 0) return null;

  // 1. Prefer an unseen sibling question from the exact same session & subtopic
  const unseenSiblingSameSubtopic = bank.questions.find(
    (q) => q.subtopicTag === slot.subtopicTag && !usedQuestionIdsInCycle.has(q.id)
  );
  if (unseenSiblingSameSubtopic) return unseenSiblingSameSubtopic;

  // 2. Fallback: unseen question from the same session
  const unseenSameSession = bank.questions.find((q) => !usedQuestionIdsInCycle.has(q.id));
  if (unseenSameSession) return unseenSameSession;

  // 3. Fallback: different question than the one just missed in this slot
  const otherInSession = bank.questions.find((q) => q.id !== slot.currentQuestionId);
  if (otherInSession) return otherInSession;

  // 4. Final fallback: repeat current question
  return bank.questions.find((q) => q.id === slot.currentQuestionId) || bank.questions[0];
}

export interface ActiveModuleExamSession {
  cycle: ModuleExamCycle;
  chanceNumber: 1 | 2 | 3;
  isExtraExam: boolean;
  questions: QuizQuestion[];
}

export function buildQuestionMap(moduleQuizzes: Record<string, SessionQuizBank>): Map<string, QuizQuestion> {
  const map = new Map<string, QuizQuestion>();
  for (const bank of Object.values(moduleQuizzes)) {
    for (const q of bank.questions) {
      map.set(q.id, q);
    }
  }
  return map;
}

export function prepareModuleExamSession(
  moduleId: number,
  studyState: UserStudyState,
  moduleChapters: Pick<ChapterSummary, 'id' | 'session'>[],
  moduleQuizzes: Record<string, SessionQuizBank>,
  overrideCycle?: ModuleExamCycle | null
): ActiveModuleExamSession | null {
  const mastery = studyState.moduleMastery?.[String(moduleId)];
  const questionMap = buildQuestionMap(moduleQuizzes);
  const existingCycle = overrideCycle !== undefined ? overrideCycle : mastery?.activeCycle;

  if (existingCycle && existingCycle.slots.length > 0 && existingCycle.attemptCount < MAX_CYCLE_CHANCES) {
    if (existingCycle.attemptCount === 0) {
      const questions = existingCycle.slots
        .map((s) => questionMap.get(s.currentQuestionId))
        .filter((q): q is QuizQuestion => Boolean(q));
      return {
        cycle: existingCycle,
        chanceNumber: 1,
        isExtraExam: false,
        questions
      };
    }

    const wrongSlots = existingCycle.slots.filter((s) => s.status === 'wrong');
    const questions = wrongSlots
      .map((s) => questionMap.get(s.currentQuestionId))
      .filter((q): q is QuizQuestion => Boolean(q));

    return {
      cycle: existingCycle,
      chanceNumber: (existingCycle.attemptCount + 1) as 2 | 3,
      isExtraExam: true,
      questions
    };
  }

  const nextCycleNum = (mastery?.completedCyclesCount || 0) + 1;
  const slots = buildModuleExamChance1Slots(studyState, moduleChapters, moduleQuizzes, nextCycleNum);
  if (slots.length === 0) return null;

  const freshCycle: ModuleExamCycle = {
    cycleNumber: nextCycleNum,
    attemptCount: 0,
    maxChances: MAX_CYCLE_CHANCES,
    targetTotalQuestions: slots.length,
    consolidatedCorrectCount: 0,
    consolidatedScore: 0,
    slots,
    lastUpdated: new Date().toISOString()
  };

  const questions = slots
    .map((s) => questionMap.get(s.currentQuestionId))
    .filter((q): q is QuizQuestion => Boolean(q));

  return {
    cycle: freshCycle,
    chanceNumber: 1,
    isExtraExam: false,
    questions
  };
}

export function computeCycleSessionAccuracyMap(
  slots: ModuleExamSlot[]
): Map<string, { total: number; correct: number; percentage: number }> {
  const map = new Map<string, { total: number; correct: number; percentage: number }>();
  for (const s of slots) {
    const entry = map.get(s.sessionId) || { total: 0, correct: 0, percentage: 0 };
    entry.total += 1;
    if (s.status === 'correct') entry.correct += 1;
    map.set(s.sessionId, entry);
  }
  for (const entry of map.values()) {
    entry.percentage = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
  }
  return map;
}

export interface ModuleExamSubmissionOutcome {
  nextState: UserStudyState;
  updatedMastery: ModuleMasteryState;
  attempt: QuizAttempt;
  chanceNumber: 1 | 2 | 3;
  attemptScore: number;
  consolidatedScore: number;
  consolidatedCorrectCount: number;
  targetTotalQuestions: number;
  outcome: 'approved' | 'extra-unlocked' | 'restudy-required';
  failedSessionIds: string[];
  failedChapterIds: string[];
}

export function submitModuleExamAttempt(
  moduleId: number,
  state: UserStudyState,
  cycleSnapshot: ModuleExamCycle,
  selectedAnswers: Record<string, number>,
  moduleChapters: Pick<ChapterSummary, 'id' | 'session'>[],
  moduleQuizzes: Record<string, SessionQuizBank>,
  persist = true
): ModuleExamSubmissionOutcome {
  const now = new Date().toISOString();
  const key = String(moduleId);
  const existingMastery = state.moduleMastery?.[key];
  const questionMap = buildQuestionMap(moduleQuizzes);
  const chanceNumber = Math.min(MAX_CYCLE_CHANCES, cycleSnapshot.attemptCount + 1) as 1 | 2 | 3;

  const slotsToGrade =
    chanceNumber === 1
      ? cycleSnapshot.slots
      : cycleSnapshot.slots.filter((s) => s.status === 'wrong');

  const answers: QuizAttemptAnswer[] = [];
  const gradedBySlotIndex = new Map<number, boolean>();

  for (const slot of slotsToGrade) {
    const q = questionMap.get(slot.currentQuestionId);
    if (!q) continue;
    const selected = selectedAnswers[q.id] ?? -1;
    const isCorrect = selected === q.correctOptionIndex;
    gradedBySlotIndex.set(slot.slotIndex, isCorrect);
    answers.push({
      questionId: q.id,
      sessionId: q.sessionId,
      selectedOptionIndex: selected,
      isCorrect,
      subtopicTag: q.subtopicTag,
      cognitiveLevel: q.cognitiveLevel
    });
  }

  const attemptCorrect = answers.filter((a) => a.isCorrect).length;
  const attemptScore =
    answers.length > 0 ? Math.round((attemptCorrect / answers.length) * 100) : 0;

  const attempt: QuizAttempt = {
    attemptId: `mod-exam-${moduleId}-c${cycleSnapshot.cycleNumber}-t${chanceNumber}-${Date.now()}`,
    sessionId: `modulo-${String(moduleId).padStart(2, '0')}`,
    moduleId,
    mode: 'module-exam',
    timestamp: now,
    totalQuestions: answers.length,
    correctCount: attemptCorrect,
    scorePercentage: attemptScore,
    answers
  };

  // Update slot statuses after this attempt
  const nextSlots: ModuleExamSlot[] = cycleSnapshot.slots.map((slot) => {
    if (!gradedBySlotIndex.has(slot.slotIndex)) {
      return { ...slot };
    }
    const passedSlot = gradedBySlotIndex.get(slot.slotIndex)!;
    return {
      ...slot,
      status: passedSlot ? 'correct' : 'wrong'
    };
  });

  const consolidatedCorrectCount = nextSlots.filter((s) => s.status === 'correct').length;
  const targetTotalQuestions = cycleSnapshot.targetTotalQuestions || nextSlots.length;
  const consolidatedScore =
    targetTotalQuestions > 0
      ? Math.round((consolidatedCorrectCount / targetTotalQuestions) * 100)
      : 0;

  let nextMastery: ModuleMasteryState;
  let outcome: ModuleExamSubmissionOutcome['outcome'];
  let failedSessionIds: string[] = [];
  let failedChapterIds: string[] = [];
  let nextCompletedChapters = [...state.completedChapters];
  const nextCompletionLog: Record<string, ChapterCompletionEntry> = {
    ...(state.chapterCompletionLog || {})
  };
  const nextReadingProgress = { ...(state.readingProgress || {}) };
  const nextReadingLog: Record<string, ReadingProgressEntry> = {
    ...(state.readingProgressLog || {})
  };

  if (existingMastery?.status === 'approved') {
    outcome = consolidatedScore >= MASTERY_PASS_PERCENTAGE ? 'approved' : 'approved';
    const updatedCycle: ModuleExamCycle = {
      ...cycleSnapshot,
      attemptCount: chanceNumber,
      consolidatedCorrectCount,
      consolidatedScore,
      slots: nextSlots,
      lastUpdated: now
    };
    nextMastery = {
      moduleId,
      status: 'approved',
      approvedScore: Math.max(existingMastery.approvedScore || 0, consolidatedScore),
      approvedAt: existingMastery.approvedAt || now,
      requiredRestudyChapterIds: [],
      restudyResetAt: existingMastery.restudyResetAt,
      activeCycle: updatedCycle,
      completedCyclesCount: (existingMastery.completedCyclesCount || 0) + 1,
      lastUpdated: now
    };
  } else if (consolidatedScore >= MASTERY_PASS_PERCENTAGE) {
    outcome = 'approved';
    const updatedCycle: ModuleExamCycle = {
      ...cycleSnapshot,
      attemptCount: chanceNumber,
      consolidatedCorrectCount,
      consolidatedScore,
      slots: nextSlots,
      lastUpdated: now
    };
    nextMastery = {
      moduleId,
      status: 'approved',
      approvedScore: Math.max(existingMastery?.approvedScore || 0, consolidatedScore),
      approvedAt: existingMastery?.approvedAt || now,
      requiredRestudyChapterIds: [],
      restudyResetAt: existingMastery?.restudyResetAt,
      activeCycle: updatedCycle,
      completedCyclesCount: (existingMastery?.completedCyclesCount || 0) + 1,
      lastUpdated: now
    };
  } else if (chanceNumber < MAX_CYCLE_CHANCES) {
    outcome = 'extra-unlocked';
    const usedIdsInCycle = new Set<string>();
    for (const s of nextSlots) {
      for (const hId of s.attemptsHistory) usedIdsInCycle.add(hId);
    }

    const preparedSlots: ModuleExamSlot[] = nextSlots.map((slot) => {
      if (slot.status !== 'wrong') return slot;
      const nextQ = selectRecoveryQuestionForSlot(slot, usedIdsInCycle, moduleQuizzes);
      if (!nextQ) return slot;
      usedIdsInCycle.add(nextQ.id);
      return {
        ...slot,
        currentQuestionId: nextQ.id,
        attemptsHistory: [...slot.attemptsHistory, nextQ.id]
      };
    });

    const updatedCycle: ModuleExamCycle = {
      ...cycleSnapshot,
      attemptCount: chanceNumber,
      consolidatedCorrectCount,
      consolidatedScore,
      slots: preparedSlots,
      lastUpdated: now
    };

    nextMastery = {
      moduleId,
      status: 'in-progress',
      approvedScore: existingMastery?.approvedScore,
      approvedAt: existingMastery?.approvedAt,
      requiredRestudyChapterIds: [],
      restudyResetAt: existingMastery?.restudyResetAt,
      activeCycle: updatedCycle,
      completedCyclesCount: existingMastery?.completedCyclesCount || 0,
      lastUpdated: now
    };
  } else {
    // Failed all 3 chances -> surgical restudy ONLY of chapters with session accuracy < 70%
    outcome = 'restudy-required';
    const sessionAcc = computeCycleSessionAccuracyMap(nextSlots);

    failedSessionIds = [];
    for (const [sessionId, stats] of sessionAcc.entries()) {
      if (stats.percentage < MASTERY_PASS_PERCENTAGE) {
        failedSessionIds.push(sessionId);
      }
    }

    if (failedSessionIds.length === 0 && sessionAcc.size > 0) {
      let lowestId = '';
      let lowestPct = Infinity;
      for (const [sessionId, stats] of sessionAcc.entries()) {
        if (stats.percentage < lowestPct) {
          lowestPct = stats.percentage;
          lowestId = sessionId;
        }
      }
      if (lowestId) failedSessionIds.push(lowestId);
    }

    const failedSessionSet = new Set(failedSessionIds);
    failedChapterIds = moduleChapters
      .filter((ch) => failedSessionSet.has(ch.session))
      .map((ch) => ch.id);

    const failedChapterSet = new Set(failedChapterIds);
    nextCompletedChapters = nextCompletedChapters.filter((id) => !failedChapterSet.has(id));
    for (const chId of failedChapterIds) {
      nextCompletionLog[chId] = { completed: false, updatedAt: now };
      nextReadingProgress[chId] = 0;
      nextReadingLog[chId] = { percentage: 0, visitedSections: [], updatedAt: now };
    }

    const updatedCycle: ModuleExamCycle = {
      ...cycleSnapshot,
      attemptCount: 3,
      consolidatedCorrectCount,
      consolidatedScore,
      slots: nextSlots,
      lastUpdated: now
    };

    nextMastery = {
      moduleId,
      status: 're-study-required',
      approvedScore: existingMastery?.approvedScore,
      approvedAt: existingMastery?.approvedAt,
      requiredRestudyChapterIds: failedChapterIds,
      restudyResetAt: now,
      activeCycle: updatedCycle,
      completedCyclesCount: (existingMastery?.completedCyclesCount || 0) + 1,
      lastUpdated: now
    };
  }

  const nextState: UserStudyState = {
    ...state,
    lastUpdated: now,
    completedChapters: nextCompletedChapters,
    chapterCompletionLog: nextCompletionLog,
    readingProgress: nextReadingProgress,
    readingProgressLog: nextReadingLog,
    quizAttempts: [attempt, ...state.quizAttempts],
    moduleMastery: {
      ...(state.moduleMastery || {}),
      [key]: nextMastery
    }
  };

  if (persist) {
    saveStudyState(nextState, true);
  }

  return {
    nextState,
    updatedMastery: nextMastery,
    attempt,
    chanceNumber,
    attemptScore,
    consolidatedScore,
    consolidatedCorrectCount,
    targetTotalQuestions,
    outcome,
    failedSessionIds,
    failedChapterIds
  };
}
