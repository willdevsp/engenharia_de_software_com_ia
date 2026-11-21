import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'Docs');
const CONTENT_DIR = path.join(ROOT, 'content');
const PUBLIC_ASSETS_ROOT = path.join(ROOT, 'public', 'course-assets');
const GENERATED_DIR = path.join(ROOT, 'src', 'generated');
const GENERATED_MODULES_DIR = path.join(GENERATED_DIR, 'modules');

for (const dir of [PUBLIC_ASSETS_ROOT, GENERATED_DIR, GENERATED_MODULES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: raw };
  }
  const metadata = YAML.parse(match[1]) || {};
  const body = match[2];
  return { metadata, body };
}

function parseSessionOrder(session) {
  const parts = String(session || '0.0')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  return [parts[0] || 0, parts[1] || 0];
}

function discoverDocsMetadata() {
  const docsByModuleId = new Map();
  if (!fs.existsSync(DOCS_DIR)) return docsByModuleId;

  const docFiles = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => /^modulo-(\d+)-.*\.md$/i.test(f))
    .sort((a, b) => {
      const aNum = Number(a.match(/^modulo-(\d+)/i)?.[1] || 0);
      const bNum = Number(b.match(/^modulo-(\d+)/i)?.[1] || 0);
      return aNum - bNum;
    });

  for (const fileName of docFiles) {
    const idMatch = fileName.match(/^modulo-(\d+)-/i);
    if (!idMatch) continue;
    const id = Number(idMatch[1]);
    const raw = fs.readFileSync(path.join(DOCS_DIR, fileName), 'utf-8');

    const titleMatch = raw.match(/^#\s*Módulo\s+\d+\s*[:\-–—]\s*(.+)$/mi);
    const trackMatch = raw.match(/^\s*>\s*\*\*Etapa do Curso:\*\*\s*(.+)$/mi);
    const hoursMatch = raw.match(/^\s*>\s*\*\*Carga Horária Sugerida:\*\*\s*(\d+)/mi);
    const focusMatch = raw.match(/^\s*>\s*\*\*Foco Técnico[^:]*:\*\*\s*(.+)$/mi);

    docsByModuleId.set(id, {
      id,
      title: titleMatch ? titleMatch[1].trim() : `Módulo ${String(id).padStart(2, '0')}`,
      track: trackMatch ? trackMatch[1].trim() : `Etapa ${id}`,
      suggestedHours: hoursMatch ? Number.parseInt(hoursMatch[1], 10) || 0 : 0,
      technicalFocus: focusMatch ? focusMatch[1].trim() : '',
      docFile: `Docs/${fileName}`
    });
  }

  return docsByModuleId;
}

function discoverContentDirectories() {
  const contentDirsByModuleId = new Map();
  if (!fs.existsSync(CONTENT_DIR)) return contentDirsByModuleId;

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^modulo-(\d+)$/i);
    if (!match) continue;
    const id = Number(match[1]);
    contentDirsByModuleId.set(id, entry.name);
  }

  return contentDirsByModuleId;
}

function pickCoverFile(assetFiles, code) {
  const imageFiles = assetFiles.filter((file) =>
    ['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase())
  );
  const exactCover = imageFiles.find((file) =>
    new RegExp(`^cover-modulo-${code}\\.(png|jpe?g)$`, 'i').test(file)
  );
  if (exactCover) return exactCover;
  return imageFiles.find((file) => /^cover-/i.test(file)) || null;
}

const docsByModuleId = discoverDocsMetadata();
const contentDirsByModuleId = discoverContentDirectories();
const allModuleIds = Array.from(
  new Set([...docsByModuleId.keys(), ...contentDirsByModuleId.keys()])
).sort((a, b) => a - b);

const courseModules = [];
const chapterSummaries = [];
const quizSummaries = {};
const authoredModuleIds = [];
let totalAssetsCopied = 0;

for (const id of allModuleIds) {
  const code = String(id).padStart(2, '0');
  const dirName = contentDirsByModuleId.get(id) || `modulo-${code}`;
  const docMeta = docsByModuleId.get(id);

  const moduleContentDir = path.join(CONTENT_DIR, dirName);
  const chaptersDir = path.join(moduleContentDir, 'chapters');
  const assetsDir = path.join(moduleContentDir, 'assets');
  const quizzesDir = path.join(moduleContentDir, 'quizzes');
  const publicAssetsDir = path.join(PUBLIC_ASSETS_ROOT, dirName);

  // 1. Copy module assets if present (keep PNG/JPEG intact for Kindle Colorsoft EPUB compatibility)
  let coverFile = null;
  let imageAssetFiles = [];
  if (fs.existsSync(assetsDir)) {
    if (!fs.existsSync(publicAssetsDir)) {
      fs.mkdirSync(publicAssetsDir, { recursive: true });
    }
    const assetFiles = fs
      .readdirSync(assetsDir)
      .filter((file) => fs.statSync(path.join(assetsDir, file)).isFile())
      .sort();

    for (const file of assetFiles) {
      fs.copyFileSync(path.join(assetsDir, file), path.join(publicAssetsDir, file));
      totalAssetsCopied++;
    }
    imageAssetFiles = assetFiles.filter((file) =>
      ['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase())
    );
    coverFile = pickCoverFile(assetFiles, code);
  }

  // 2. Parse module chapters if present
  const modChapters = [];
  if (fs.existsSync(chaptersDir)) {
    const chapterFiles = fs
      .readdirSync(chaptersDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    for (const file of chapterFiles) {
      const raw = fs.readFileSync(path.join(chaptersDir, file), 'utf-8');
      const { metadata, body } = parseFrontmatter(raw);
      const slug = metadata.slug || file.replace(/\.md$/, '');
      const rewrittenBody = body.replace(
        /!\[([^\]]*)\]\(\.\.\/assets\/([^)]+)\)/g,
        `![$1](./course-assets/${dirName}/$2)`
      );

      const chapterObj = {
        id: metadata.id || slug,
        title: metadata.title || slug,
        module: Number(metadata.module) || id,
        session: String(metadata.session || `${id}.1`),
        slug,
        estimatedMinutes: Number(metadata.estimatedMinutes) || 90,
        status: metadata.status || 'reviewed',
        subtopics: Array.isArray(metadata.subtopics) ? metadata.subtopics : [],
        official_docs: Array.isArray(metadata.official_docs) ? metadata.official_docs : [],
        media: metadata.media || { audio_notebooklm: null, video_url: null },
        markdownContent: rewrittenBody
      };

      modChapters.push(chapterObj);
      chapterSummaries.push({
        id: chapterObj.id,
        title: chapterObj.title,
        module: chapterObj.module,
        session: chapterObj.session,
        slug: chapterObj.slug,
        estimatedMinutes: chapterObj.estimatedMinutes,
        status: chapterObj.status,
        subtopics: chapterObj.subtopics
      });
    }
  }

  modChapters.sort((a, b) => {
    const [aMaj, aMin] = parseSessionOrder(a.session);
    const [bMaj, bMin] = parseSessionOrder(b.session);
    return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
  });

  // 3. Parse module quizzes if present
  const modQuizzes = {};
  let modQuestionsCount = 0;
  if (fs.existsSync(quizzesDir)) {
    const quizFiles = fs
      .readdirSync(quizzesDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    for (const qFile of quizFiles) {
      try {
        const raw = fs.readFileSync(path.join(quizzesDir, qFile), 'utf-8');
        const parsed = JSON.parse(raw);
        const sessionId = String(parsed.sessionId || '');
        if (sessionId) {
          const normalizedBank = {
            ...parsed,
            sessionId,
            moduleId: Number(parsed.moduleId) || id
          };
          modQuizzes[sessionId] = normalizedBank;
          const qList = Array.isArray(normalizedBank.questions) ? normalizedBank.questions : [];
          modQuestionsCount += qList.length;
          quizSummaries[sessionId] = {
            sessionId,
            moduleId: normalizedBank.moduleId,
            title: normalizedBank.title || `Prova Sessão ${sessionId}`,
            questionsCount: qList.length,
            subtopicTags: Array.from(new Set(qList.map((q) => String(q.subtopicTag || '')).filter(Boolean)))
          };
        }
      } catch (err) {
        console.warn(`Warning: Failed to parse quiz ${dirName}/${qFile}:`, err.message);
      }
    }
  }

  const isAuthored = modChapters.length > 0;
  if (isAuthored) {
    authoredModuleIds.push(id);
    const modulePayload = {
      moduleId: id,
      chapters: modChapters,
      quizzes: modQuizzes
    };
    const moduleTs = `// AUTO-GENERATED MODULE CHUNK — DO NOT EDIT MANUALLY
import type { ModuleBundlePayload } from '../../types/course';

export const MODULE_DATA: ModuleBundlePayload = ${JSON.stringify(modulePayload, null, 2)};

export default MODULE_DATA;
`;
    fs.writeFileSync(path.join(GENERATED_MODULES_DIR, `modulo-${code}.ts`), moduleTs, 'utf-8');
  }

  courseModules.push({
    id,
    code,
    title: docMeta?.title || `Módulo ${code}`,
    track: docMeta?.track || `Etapa ${id} de 12`,
    suggestedHours: docMeta?.suggestedHours || 0,
    technicalFocus: docMeta?.technicalFocus || '',
    docFile: docMeta?.docFile || '',
    status: isAuthored ? 'available' : 'planned',
    sessionsCount: modChapters.length,
    questionsCount: modQuestionsCount,
    epubFileName: `modulo-${code}-kindle-colorsoft.epub`,
    coverImageUrl: coverFile ? `./course-assets/${dirName}/${coverFile}` : null,
    assetFiles: imageAssetFiles
  });
}

// Clean stale module files if any authored module was removed
const activeModuleFileNames = new Set(
  authoredModuleIds.map((id) => `modulo-${String(id).padStart(2, '0')}.ts`)
);
for (const existingFile of fs.readdirSync(GENERATED_MODULES_DIR)) {
  if (existingFile.endsWith('.ts') && !activeModuleFileNames.has(existingFile)) {
    fs.unlinkSync(path.join(GENERATED_MODULES_DIR, existingFile));
  }
}

// Remove obsolete monolithic courseData.ts so lazy-loading cannot accidentally bundle all modules eagerly
const legacyMonolithPath = path.join(GENERATED_DIR, 'courseData.ts');
if (fs.existsSync(legacyMonolithPath)) {
  fs.unlinkSync(legacyMonolithPath);
}

chapterSummaries.sort((a, b) => {
  if (a.module !== b.module) return a.module - b.module;
  const [aMaj, aMin] = parseSessionOrder(a.session);
  const [bMaj, bMin] = parseSessionOrder(b.session);
  return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
});

const catalogTs = `// AUTO-GENERATED EAGER CATALOG — DO NOT EDIT MANUALLY
import type { ChapterSummary, CourseModuleInfo, SessionQuizSummary } from '../types/course';

export const COURSE_MODULES: CourseModuleInfo[] = ${JSON.stringify(courseModules, null, 2)};

export const CHAPTER_SUMMARIES: ChapterSummary[] = ${JSON.stringify(chapterSummaries, null, 2)};

export const QUIZ_SUMMARIES: Record<string, SessionQuizSummary> = ${JSON.stringify(quizSummaries, null, 2)};
`;

fs.writeFileSync(path.join(GENERATED_DIR, 'catalog.ts'), catalogTs, 'utf-8');

const loaderEntries = authoredModuleIds
  .map((id) => {
    const code = String(id).padStart(2, '0');
    return `  ${id}: () => import('./modules/modulo-${code}')`;
  })
  .join(',\n');

const loaderTs = `// AUTO-GENERATED LAZY MODULE LOADER — DO NOT EDIT MANUALLY
import type { ModuleBundlePayload } from '../types/course';

const MODULE_LOADERS: Record<number, () => Promise<{ MODULE_DATA: ModuleBundlePayload }>> = {
${loaderEntries}
};

const moduleCache = new Map<number, ModuleBundlePayload>();
const inFlightLoads = new Map<number, Promise<ModuleBundlePayload>>();

export function getCachedModuleData(moduleId: number): ModuleBundlePayload | undefined {
  return moduleCache.get(moduleId);
}

export async function loadModuleData(moduleId: number): Promise<ModuleBundlePayload> {
  const cached = moduleCache.get(moduleId);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightLoads.get(moduleId);
  if (inFlight) {
    return inFlight;
  }

  const loader = MODULE_LOADERS[moduleId];
  if (!loader) {
    throw new Error(\`Módulo \${String(moduleId).padStart(2, '0')} ainda não possui conteúdo autoral compilado.\`);
  }

  const loadPromise = loader()
    .then((mod) => {
      const payload = mod.MODULE_DATA;
      moduleCache.set(moduleId, payload);
      inFlightLoads.delete(moduleId);
      return payload;
    })
    .catch((err) => {
      inFlightLoads.delete(moduleId);
      throw err;
    });

  inFlightLoads.set(moduleId, loadPromise);
  return loadPromise;
}

export function preloadModuleData(moduleId: number): void {
  if (!MODULE_LOADERS[moduleId] || moduleCache.has(moduleId) || inFlightLoads.has(moduleId)) {
    return;
  }
  void loadModuleData(moduleId).catch(() => {
    // Background preload ignores transient failures
  });
}
`;

fs.writeFileSync(path.join(GENERATED_DIR, 'moduleLoader.ts'), loaderTs, 'utf-8');

const availableCount = courseModules.filter((m) => m.status === 'available').length;
const totalQuestionsAll = courseModules.reduce((acc, m) => acc + m.questionsCount, 0);
console.log(
  `Compiled lightweight catalog (${courseModules.length} modules discovered, ${availableCount} available), ${authoredModuleIds.length} lazy module chunk(s), ${chapterSummaries.length} chapter summaries, ${totalQuestionsAll} questions, and ${totalAssetsCopied} asset(s).`
);
