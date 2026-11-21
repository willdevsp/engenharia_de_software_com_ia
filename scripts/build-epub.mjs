import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { buildModuleEpubPackage } from '../src/utils/epubCore.mjs';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'Docs');
const CONTENT_DIR = path.join(ROOT, 'content');
const KINDLE_OUT_DIR = path.join(ROOT, 'dist-kindle');
const PUBLIC_DOWNLOADS_DIR = path.join(ROOT, 'public', 'downloads');

if (!fs.existsSync(KINDLE_OUT_DIR)) {
  fs.mkdirSync(KINDLE_OUT_DIR, { recursive: true });
}

// Clean up any duplicated pre-built EPUB files from public/downloads so Web/APK bundles stay lean
if (fs.existsSync(PUBLIC_DOWNLOADS_DIR)) {
  for (const file of fs.readdirSync(PUBLIC_DOWNLOADS_DIR)) {
    if (file.toLowerCase().endsWith('.epub')) {
      fs.unlinkSync(path.join(PUBLIC_DOWNLOADS_DIR, file));
    }
  }
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: raw };
  return { metadata: YAML.parse(match[1]) || {}, body: match[2] };
}

function discoverDocsTitles() {
  const titles = new Map();
  if (!fs.existsSync(DOCS_DIR)) return titles;

  for (const fileName of fs.readdirSync(DOCS_DIR)) {
    const match = fileName.match(/^modulo-(\d+)-.*\.md$/i);
    if (!match) continue;
    const id = Number(match[1]);
    const raw = fs.readFileSync(path.join(DOCS_DIR, fileName), 'utf-8');
    const titleMatch = raw.match(/^#\s*Módulo\s+\d+\s*[:\-–—]\s*(.+)$/mi);
    if (titleMatch) {
      titles.set(id, titleMatch[1].trim());
    }
  }
  return titles;
}

function discoverAvailableModules() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const docTitles = discoverDocsTitles();

  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^modulo-(\d+)$/i.test(entry.name))
    .map((entry) => {
      const id = Number(entry.name.match(/^modulo-(\d+)$/i)[1]);
      const code = String(id).padStart(2, '0');
      const chaptersDir = path.join(CONTENT_DIR, entry.name, 'chapters');
      const chapterFiles = fs.existsSync(chaptersDir)
        ? fs.readdirSync(chaptersDir).filter((f) => f.endsWith('.md'))
        : [];
      return {
        id,
        code,
        dirName: entry.name,
        title: docTitles.get(id) || `Módulo ${code}`,
        hasChapters: chapterFiles.length > 0
      };
    })
    .filter((m) => m.hasChapters)
    .sort((a, b) => a.id - b.id);
}

function parseTargetModuleArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--module=')) {
      const val = arg.slice('--module='.length).trim();
      const num = Number.parseInt(val, 10);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`Valor inválido para --module: "${val}".`);
      }
      return num;
    }
    if (arg === '--module') {
      const val = (argv[i + 1] || '').trim();
      const num = Number.parseInt(val, 10);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`Valor inválido ou ausente para --module: "${val}".`);
      }
      return num;
    }
    if (/^\d+$/.test(arg)) {
      const num = Number.parseInt(arg, 10);
      if (num > 0) return num;
    }
  }
  return null;
}

async function buildModuleEpubFromDisk(moduleConfig) {
  const { id: moduleId, code, dirName, title: moduleTitle } = moduleConfig;
  const chaptersDir = path.join(CONTENT_DIR, dirName, 'chapters');
  const assetsDir = path.join(CONTENT_DIR, dirName, 'assets');
  const quizzesDir = path.join(CONTENT_DIR, dirName, 'quizzes');

  const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).sort() : [];
  const images = assetFiles
    .filter((file) => ['.png', '.jpg', '.jpeg'].includes(path.extname(file).toLowerCase()))
    .map((file) => ({
      fileName: file,
      data: fs.readFileSync(path.join(assetsDir, file))
    }));

  const quizzes = {};
  const quizFiles = fs.existsSync(quizzesDir)
    ? fs.readdirSync(quizzesDir).filter((f) => f.endsWith('.json')).sort()
    : [];
  for (const qf of quizFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(quizzesDir, qf), 'utf-8'));
      quizzes[String(parsed.sessionId)] = parsed;
    } catch {}
  }

  const chapterFiles = fs.existsSync(chaptersDir)
    ? fs.readdirSync(chaptersDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  const chapters = [];
  for (const file of chapterFiles) {
    const raw = fs.readFileSync(path.join(chaptersDir, file), 'utf-8');
    const { metadata, body } = parseFrontmatter(raw);
    chapters.push({
      file,
      session: String(metadata.session || `${moduleId}.1`),
      title: metadata.title || file.replace(/\.md$/, ''),
      estimatedMinutes: metadata.estimatedMinutes || 90,
      official_docs: Array.isArray(metadata.official_docs) ? metadata.official_docs : [],
      media: metadata.media || { audio_notebooklm: null, video_url: null },
      body
    });
  }

  const { zip, epubFileName } = buildModuleEpubPackage({
    moduleId,
    code,
    moduleTitle,
    chapters,
    quizzes,
    images
  });

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const outPath = path.join(KINDLE_OUT_DIR, epubFileName);
  fs.writeFileSync(outPath, buffer);
  console.log(
    `Generated Kindle Colorsoft EPUB 3 (Módulo ${code}, ${(buffer.length / 1024).toFixed(1)} KB): ${outPath}`
  );
}

async function main() {
  const targetModuleId = parseTargetModuleArg(process.argv.slice(2));
  const availableModules = discoverAvailableModules();

  if (availableModules.length === 0) {
    console.error('Nenhum módulo com capítulos em content/modulo-XX/chapters foi encontrado.');
    process.exit(1);
  }

  const modulesToBuild =
    targetModuleId !== null
      ? availableModules.filter((m) => m.id === targetModuleId)
      : availableModules;

  if (targetModuleId !== null && modulesToBuild.length === 0) {
    console.error(
      `Módulo ${String(targetModuleId).padStart(2, '0')} não encontrado ou sem capítulos em content/modulo-XX/chapters.`
    );
    process.exit(1);
  }

  for (const mod of modulesToBuild) {
    await buildModuleEpubFromDisk(mod);
  }
}

main().catch((err) => {
  console.error('Failed to build EPUB:', err);
  process.exit(1);
});
