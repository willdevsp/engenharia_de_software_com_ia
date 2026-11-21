export type CognitiveLevel = 'conceptual' | 'architecture' | 'code-practice';
export type DifficultyLevel = 'foundation' | 'intermediate' | 'advanced';
export type CourseModuleStatus = 'available' | 'planned';

export interface CourseModuleInfo {
  id: number;
  code: string;
  title: string;
  track: string;
  suggestedHours: number;
  technicalFocus: string;
  docFile: string;
  status: CourseModuleStatus;
  sessionsCount: number;
  questionsCount: number;
  epubFileName: string;
  coverImageUrl: string | null;
  assetFiles: string[];
}

export interface VideoResource {
  title: string;
  channel: string;
  url: string;
  language?: 'pt-BR' | 'en' | string;
}

export interface ChapterMediaSlots {
  audio_notebooklm: string | null;
  video_url: string | null;
  videos?: VideoResource[];
}

export interface OfficialDocRef {
  title: string;
  url: string;
  section: string;
}

export interface ChapterMetadata {
  id: string;
  title: string;
  module: number;
  session: string;
  estimatedMinutes: number;
  status: 'draft' | 'reviewed';
  subtopics: string[];
  official_docs: OfficialDocRef[];
  media: ChapterMediaSlots;
}

export interface ChapterData extends ChapterMetadata {
  slug: string;
  markdownContent: string;
}

export interface ChapterSummary {
  id: string;
  title: string;
  module: number;
  session: string;
  slug: string;
  estimatedMinutes: number;
  status: 'draft' | 'reviewed';
  subtopics: string[];
}

export interface QuizQuestion {
  id: string;
  sessionId: string;
  subtopicTag: string;
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel;
  question: string;
  codeSnippet?: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  chapterAnchor: string;
  officialDocUrl: string;
  officialDocLabel: string;
}

export interface SessionQuizBank {
  sessionId: string;
  moduleId: number;
  title: string;
  questions: QuizQuestion[];
}

export interface SessionQuizSummary {
  sessionId: string;
  moduleId: number;
  title: string;
  questionsCount: number;
  subtopicTags: string[];
}

export interface ModuleBundlePayload {
  moduleId: number;
  chapters: ChapterData[];
  quizzes: Record<string, SessionQuizBank>;
}

export interface QuizAttemptAnswer {
  questionId: string;
  sessionId?: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  subtopicTag: string;
  cognitiveLevel: CognitiveLevel;
}

export interface QuizAttempt {
  attemptId: string;
  sessionId: string;
  moduleId?: number;
  mode: 'full' | 'quick' | 'error-notebook' | 'module-exam';
  timestamp: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  answers: QuizAttemptAnswer[];
}

export interface SubtopicDiagnostic {
  sessionId: string;
  sessionTitle: string;
  subtopicTag: string;
  totalAnswered: number;
  correctAnswered: number;
  accuracyPercentage: number;
  status: 'critical' | 'attention' | 'mastered';
  chapterAnchor: string;
  officialDocUrl: string;
  officialDocLabel: string;
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'unconfigured';

export interface ChapterCompletionEntry {
  completed: boolean;
  updatedAt: string;
}

export interface ReadingProgressEntry {
  percentage: number;
  visitedSections?: string[];
  updatedAt: string;
}

export interface AudioPositionEntry {
  seconds: number;
  updatedAt: string;
}

export interface ModuleExamSlot {
  slotIndex: number;
  sessionId: string;
  subtopicTag: string;
  cognitiveLevel: CognitiveLevel;
  originalQuestionId: string;
  currentQuestionId: string;
  status: 'pending' | 'correct' | 'wrong';
  attemptsHistory: string[];
}

export interface ModuleExamCycle {
  cycleNumber: number;
  attemptCount: 0 | 1 | 2 | 3;
  maxChances: 3;
  targetTotalQuestions: number;
  consolidatedCorrectCount: number;
  consolidatedScore: number;
  slots: ModuleExamSlot[];
  lastUpdated: string;
}

export type ModuleMasteryStatus = 'locked' | 'in-progress' | 'approved' | 're-study-required';

export interface ModuleMasteryState {
  moduleId: number;
  status: ModuleMasteryStatus;
  approvedScore?: number;
  approvedAt?: string;
  requiredRestudyChapterIds: string[];
  restudyResetAt?: string;
  activeCycle: ModuleExamCycle | null;
  completedCyclesCount: number;
  lastUpdated: string;
}

export interface UserStudyState {
  version: number;
  lastUpdated: string;
  completedChapters: string[];
  chapterCompletionLog?: Record<string, ChapterCompletionEntry>;
  readingProgress: Record<string, number>;
  readingProgressLog?: Record<string, ReadingProgressEntry>;
  bookmarkedQuestions: string[];
  quizAttempts: QuizAttempt[];
  audioPositions?: Record<string, AudioPositionEntry>;
  moduleMastery?: Record<string, ModuleMasteryState>;
}

export interface SessionAudioTrack {
  id: string;
  moduleId?: number;
  sessionId: string;
  title: string;
  fileName: string;
  archiveFileName?: string;
  format: 'mp3' | 'm4a';
  mimeType: string;
  sizeBytes: number;
  storageBackend: 'capacitor-fs' | 'indexeddb' | 'archive-cloud';
  storageKey: string;
  source?: 'cloud' | 'local';
  archiveBucket?: string;
  audioUrl?: string;
  isCachedOffline?: boolean;
  lastPositionSeconds: number;
  createdAt: string;
}

export interface CloudAudioMetadata {
  id: string;
  moduleId: number;
  sessionId: string;
  title: string;
  fileName: string;
  archiveFileName: string;
  format: 'mp3' | 'm4a';
  mimeType: string;
  sizeBytes: number;
  archiveBucket: string;
  audioUrl: string;
  createdAt: string;
}
