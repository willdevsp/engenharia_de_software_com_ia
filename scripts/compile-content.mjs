import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const CHAPTERS_DIR = path.join(ROOT, 'content', 'modulo-01', 'chapters');
const ASSETS_DIR = path.join(ROOT, 'content', 'modulo-01', 'assets');
const QUIZZES_DIR = path.join(ROOT, 'content', 'modulo-01', 'quizzes');
const PUBLIC_ASSETS_DIR = path.join(ROOT, 'public', 'course-assets', 'modulo-01');
const GENERATED_DIR = path.join(ROOT, 'src', 'generated');

for (const dir of [CHAPTERS_DIR, ASSETS_DIR, QUIZZES_DIR, PUBLIC_ASSETS_DIR, GENERATED_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Copy assets to public/course-assets/modulo-01
const assetFiles = fs.existsSync(ASSETS_DIR) ? fs.readdirSync(ASSETS_DIR) : [];
for (const file of assetFiles) {
  const srcPath = path.join(ASSETS_DIR, file);
  const destPath = path.join(PUBLIC_ASSETS_DIR, file);
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, destPath);
  }
}

// 2. Parse chapters
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: raw };
  }
  const metadata = YAML.parse(match[1]) || {};
  const body = match[2];
  return { metadata, body };
}

const chapterFiles = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.md')).sort();
const chapters = [];

for (const file of chapterFiles) {
  const raw = fs.readFileSync(path.join(CHAPTERS_DIR, file), 'utf-8');
  const { metadata, body } = parseFrontmatter(raw);
  const slug = metadata.slug || file.replace(/\.md$/, '');
  const rewrittenBody = body.replace(
    /!\[([^\]]*)\]\(\.\.\/assets\/([^)]+)\)/g,
    '![$1](./course-assets/modulo-01/$2)'
  );

  chapters.push({
    id: metadata.id || slug,
    title: metadata.title || slug,
    module: metadata.module || 1,
    session: String(metadata.session || '1.1'),
    slug,
    estimatedMinutes: metadata.estimatedMinutes || 90,
    status: metadata.status || 'reviewed',
    subtopics: Array.isArray(metadata.subtopics) ? metadata.subtopics : [],
    official_docs: Array.isArray(metadata.official_docs) ? metadata.official_docs : [],
    media: metadata.media || { audio_notebooklm: null, video_url: null },
    markdownContent: rewrittenBody
  });
}

// Sort chapters numerically by session (1.1, 1.2, ..., 1.11)
chapters.sort((a, b) => {
  const [aMaj, aMin] = a.session.split('.').map(Number);
  const [bMaj, bMin] = b.session.split('.').map(Number);
  return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
});

// 3. Parse quizzes
const quizFiles = fs.readdirSync(QUIZZES_DIR).filter((f) => f.endsWith('.json')).sort();
const quizzes = {};

for (const qFile of quizFiles) {
  try {
    const raw = fs.readFileSync(path.join(QUIZZES_DIR, qFile), 'utf-8');
    const parsed = JSON.parse(raw);
    const sessionId = String(parsed.sessionId || '');
    if (sessionId) {
      quizzes[sessionId] = parsed;
    }
  } catch (err) {
    console.warn(`Warning: Failed to parse quiz ${qFile}:`, err.message);
  }
}

const outputTs = `// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY
import type { ChapterData, SessionQuizBank } from '../types/course';

export const MODULE_01_CHAPTERS: ChapterData[] = ${JSON.stringify(chapters, null, 2)};

export const MODULE_01_QUIZZES: Record<string, SessionQuizBank> = ${JSON.stringify(quizzes, null, 2)};
`;

fs.writeFileSync(path.join(GENERATED_DIR, 'courseData.ts'), outputTs, 'utf-8');
console.log(`Compiled ${chapters.length} chapters, ${Object.keys(quizzes).length} quizzes, and ${assetFiles.length} assets.`);
