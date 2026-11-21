import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';

const ROOT = process.cwd();
const CHAPTERS_DIR = path.join(ROOT, 'content', 'modulo-01', 'chapters');
const ASSETS_DIR = path.join(ROOT, 'content', 'modulo-01', 'assets');
const QUIZZES_DIR = path.join(ROOT, 'content', 'modulo-01', 'quizzes');

for (const dir of [CHAPTERS_DIR, ASSETS_DIR, QUIZZES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const VALID_COGNITIVE = new Set(['conceptual', 'architecture', 'code-practice']);
const VALID_DIFFICULTY = new Set(['foundation', 'intermediate', 'advanced']);

function isLikelyCurrencySpan(expr) {
  if (/^\d+([.,]\d+)?\s+[a-zA-ZÀ-ÿ]{2,}/.test(expr)) {
    const hasMathTokens = /[\\_^=<>+\-*/()[\]{}|]/.test(expr);
    if (!hasMathTokens) return true;
  }
  return false;
}

function validateLatexInText(text, sourceLabel, errors, stats) {
  const noCode = text.replace(/(^|\r?\n)(`{3,})[^\n]*\r?\n[\s\S]*?\r?\n\2(?=\r?\n|$)|`[^`\n]+`/g, '');
  const afterDisplay = noCode.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    stats.displayMath++;
    try {
      katex.renderToString(expr.trim(), {
        displayMode: true,
        throwOnError: true,
        strict: false
      });
    } catch (err) {
      errors.push(`[${sourceLabel}] Invalid display LaTeX: "${expr.trim().slice(0, 80)}" -> ${err.message}`);
    }
    return '';
  });

  afterDisplay.replace(/(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g, (full, expr) => {
    const trimmed = expr.trim();
    if (!trimmed || isLikelyCurrencySpan(trimmed)) return full;
    stats.inlineMath++;
    try {
      katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: true,
        strict: false
      });
    } catch (err) {
      errors.push(`[${sourceLabel}] Invalid inline LaTeX: "${trimmed.slice(0, 80)}" -> ${err.message}`);
    }
    return '';
  });
}

function validateAll() {
  const chapterFiles = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.md')).sort();
  const quizFiles = fs.readdirSync(QUIZZES_DIR).filter((f) => f.endsWith('.json')).sort();

  let errors = [];
  let warnings = [];
  const mathStats = { displayMath: 0, inlineMath: 0 };

  for (const file of chapterFiles) {
    const fullPath = path.join(CHAPTERS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.startsWith('---')) {
      errors.push(`[${file}] Missing YAML frontmatter at top of chapter.`);
    }
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    validateLatexInText(body, file, errors, mathStats);

    // Check image references
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    let imgCount = 0;
    while ((match = imgRegex.exec(content)) !== null) {
      imgCount++;
      const imgRel = match[2];
      if (!imgRel.startsWith('http')) {
        const resolvedImg = path.resolve(path.dirname(fullPath), imgRel);
        if (!fs.existsSync(resolvedImg)) {
          errors.push(`[${file}] Referenced image does not exist: ${imgRel} (resolved: ${resolvedImg})`);
        } else {
          const stat = fs.statSync(resolvedImg);
          if (stat.size < 100) {
            errors.push(`[${file}] Referenced image is empty/corrupt: ${imgRel}`);
          }
        }
      }
    }
    if (imgCount === 0) {
      errors.push(`[${file}] Chapter must contain at least one embedded graphic/diagram image.`);
    }
    if (content.length < 3500) {
      warnings.push(`[${file}] Chapter content seems short (${content.length} chars) for a book-depth chapter.`);
    }
  }

  for (const qFile of quizFiles) {
    const fullPath = path.join(QUIZZES_DIR, qFile);
    let bank;
    try {
      bank = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (e) {
      errors.push(`[${qFile}] Invalid JSON: ${e.message}`);
      continue;
    }

    if (!Array.isArray(bank.questions)) {
      errors.push(`[${qFile}] Missing questions array.`);
      continue;
    }

    if (bank.questions.length === 0 || bank.questions.length > 30) {
      errors.push(`[${qFile}] Question count must be between 1 and 30 (found ${bank.questions.length}).`);
    }

    const cognitiveCounts = { conceptual: 0, architecture: 0, 'code-practice': 0 };

    bank.questions.forEach((q, idx) => {
      const prefix = `[${qFile} -> Q#${idx + 1} (${q.id || 'no-id'})]`;
      if (!q.id || !q.sessionId || !q.subtopicTag || !q.question || !q.explanation || !q.chapterAnchor || !q.officialDocUrl) {
        errors.push(`${prefix} Missing required diagnostic or question fields.`);
      }
      validateLatexInText(q.question || '', `${qFile}:${q.id}:question`, errors, mathStats);
      validateLatexInText(q.explanation || '', `${qFile}:${q.id}:explanation`, errors, mathStats);
      if (Array.isArray(q.options)) {
        q.options.forEach((opt, oIdx) =>
          validateLatexInText(opt || '', `${qFile}:${q.id}:opt${oIdx}`, errors, mathStats)
        );
      }

      if (!VALID_COGNITIVE.has(q.cognitiveLevel)) {
        errors.push(`${prefix} Invalid cognitiveLevel: ${q.cognitiveLevel}`);
      } else {
        cognitiveCounts[q.cognitiveLevel]++;
      }
      if (!VALID_DIFFICULTY.has(q.difficulty)) {
        errors.push(`${prefix} Invalid difficulty: ${q.difficulty}`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${prefix} Must have exactly 4 options.`);
      }
      if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        errors.push(`${prefix} Invalid correctOptionIndex: ${q.correctOptionIndex}`);
      }
    });

    if (bank.questions.length >= 15) {
      for (const [level, count] of Object.entries(cognitiveCounts)) {
        if (count === 0) {
          errors.push(`[${qFile}] Missing questions for cognitiveLevel '${level}'.`);
        }
      }
    }
  }

  console.log(JSON.stringify({
    status: errors.length === 0 ? 'VALID' : 'INVALID',
    chaptersFound: chapterFiles.length,
    quizzesFound: quizFiles.length,
    mathFormulasValidated: mathStats,
    errors,
    warnings
  }, null, 2));

  if (errors.length > 0) {
    process.exit(1);
  }
}

validateAll();
