import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { marked } from 'marked';
import YAML from 'yaml';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');

const VALID_COGNITIVE = new Set(['conceptual', 'architecture', 'code-practice']);
const VALID_DIFFICULTY = new Set(['foundation', 'intermediate', 'advanced']);

function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function compactAnchorKey(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

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

function extractChapterAnchors(body) {
  const codePlaceholders = [];
  const mathPlaceholders = [];

  let protectedText = body.replace(/(^|\r?\n)(`{3,})[^\n]*\r?\n[\s\S]*?\r?\n\2(?=\r?\n|$)|`[^`\n]+`/g, (match) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(match);
    return `@@CODE_PLACEHOLDER_${idx}@@`;
  });

  protectedText = protectedText.replace(/\$\$([\s\S]+?)\$\$/g, (fullMatch) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(fullMatch);
    return `\n\n@@MATH_PLACEHOLDER_${idx}@@\n\n`;
  });

  protectedText = protectedText.replace(
    /(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g,
    (fullMatch, expr) => {
      const trimmed = expr.trim();
      if (!trimmed || isLikelyCurrencySpan(trimmed)) {
        return fullMatch;
      }
      const idx = mathPlaceholders.length;
      mathPlaceholders.push(fullMatch);
      return `@@MATH_PLACEHOLDER_${idx}@@`;
    }
  );

  protectedText = protectedText.replace(/@@CODE_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? '';
  });

  const restoreMathRaw = (str) =>
    str.replace(/@@MATH_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
      return mathPlaceholders[Number(idxStr)] ?? '';
    });

  const ids = new Set();
  const compactIds = new Set();
  const renderer = new marked.Renderer();

  renderer.heading = function ({ tokens }) {
    const parsedInline = this.parser.parseInline(tokens);
    const rawWithOriginalMath = restoreMathRaw(parsedInline).replace(/<[^>]+>/g, '');
    const slug = slugifyHeading(rawWithOriginalMath);
    if (slug) {
      ids.add(slug);
      compactIds.add(compactAnchorKey(slug));
    }
    return '';
  };

  marked.parse(protectedText, { renderer });

  for (const match of body.matchAll(/<(?:a|div|span|section|h[1-6])\b[^>]*\bid=["']([^"']+)["']/gi)) {
    const explicitId = match[1].trim();
    if (explicitId) {
      ids.add(explicitId);
      ids.add(slugifyHeading(explicitId));
      compactIds.add(compactAnchorKey(explicitId));
    }
  }

  return { ids, compactIds };
}

function discoverModuleDirs() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^modulo-(\d+)$/i.test(entry.name))
    .map((entry) => ({
      dirName: entry.name,
      moduleId: Number(entry.name.match(/^modulo-(\d+)$/i)[1])
    }))
    .sort((a, b) => a.moduleId - b.moduleId);
}

function validateAll() {
  const moduleDirs = discoverModuleDirs();

  let errors = [];
  let warnings = [];
  const mathStats = { displayMath: 0, inlineMath: 0 };

  const seenChapterIds = new Map();
  const seenSessionIds = new Map();
  const seenQuestionIds = new Map();
  const chaptersBySession = new Map();

  let chaptersFound = 0;
  let quizzesFound = 0;
  let questionsFound = 0;
  let anchorsValidated = 0;
  const modulesValidated = [];

  for (const { dirName, moduleId } of moduleDirs) {
    const modDir = path.join(CONTENT_DIR, dirName);
    const chaptersDir = path.join(modDir, 'chapters');
    const quizzesDir = path.join(modDir, 'quizzes');

    const chapterFiles = fs.existsSync(chaptersDir)
      ? fs.readdirSync(chaptersDir).filter((f) => f.endsWith('.md')).sort()
      : [];
    const quizFiles = fs.existsSync(quizzesDir)
      ? fs.readdirSync(quizzesDir).filter((f) => f.endsWith('.json')).sort()
      : [];

    if (chapterFiles.length === 0 && quizFiles.length === 0) {
      continue;
    }

    modulesValidated.push(dirName);

    for (const file of chapterFiles) {
      chaptersFound++;
      const fullPath = path.join(chaptersDir, file);
      const sourceLabel = `${dirName}/${file}`;
      const content = fs.readFileSync(fullPath, 'utf-8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

      if (!fmMatch) {
        errors.push(`[${sourceLabel}] Missing YAML frontmatter at top of chapter.`);
      }

      let metadata = {};
      if (fmMatch) {
        try {
          metadata = YAML.parse(fmMatch[1]) || {};
        } catch (err) {
          errors.push(`[${sourceLabel}] Invalid YAML frontmatter: ${err.message}`);
        }
      }

      const body = fmMatch ? fmMatch[2] : content;
      const chapterId = metadata.id ? String(metadata.id).trim() : '';
      const sessionId = metadata.session !== undefined && metadata.session !== null ? String(metadata.session).trim() : '';
      const metaModule = metadata.module !== undefined && metadata.module !== null ? Number(metadata.module) : NaN;
      const slug = metadata.slug ? String(metadata.slug).trim() : file.replace(/\.md$/, '');

      if (!chapterId) {
        errors.push(`[${sourceLabel}] Missing frontmatter 'id'.`);
      } else if (seenChapterIds.has(chapterId)) {
        errors.push(
          `[${sourceLabel}] Duplicate chapter.id "${chapterId}" (already defined in ${seenChapterIds.get(chapterId)}).`
        );
      } else {
        seenChapterIds.set(chapterId, sourceLabel);
      }

      if (!sessionId) {
        errors.push(`[${sourceLabel}] Missing frontmatter 'session'.`);
      } else if (seenSessionIds.has(sessionId)) {
        errors.push(
          `[${sourceLabel}] Duplicate sessionId "${sessionId}" (already defined in ${seenSessionIds.get(sessionId)}).`
        );
      } else {
        seenSessionIds.set(sessionId, sourceLabel);
      }

      if (!Number.isInteger(metaModule) || metaModule !== moduleId) {
        errors.push(
          `[${sourceLabel}] Frontmatter module (${metadata.module}) does not match directory ${dirName} (expected ${moduleId}).`
        );
      }

      if (sessionId) {
        const { ids, compactIds } = extractChapterAnchors(body);
        chaptersBySession.set(sessionId, {
          moduleId,
          dirName,
          file,
          slug,
          ids,
          compactIds
        });
      }

      validateLatexInText(body, sourceLabel, errors, mathStats);

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
            errors.push(`[${sourceLabel}] Referenced image does not exist: ${imgRel} (resolved: ${resolvedImg})`);
          } else {
            const stat = fs.statSync(resolvedImg);
            if (stat.size < 100) {
              errors.push(`[${sourceLabel}] Referenced image is empty/corrupt: ${imgRel}`);
            }
          }
        }
      }
      if (imgCount === 0) {
        errors.push(`[${sourceLabel}] Chapter must contain at least one embedded graphic/diagram image.`);
      }
      if (content.length < 3500) {
        warnings.push(`[${sourceLabel}] Chapter content seems short (${content.length} chars) for a book-depth chapter.`);
      }
    }

    for (const qFile of quizFiles) {
      quizzesFound++;
      const fullPath = path.join(quizzesDir, qFile);
      const quizSource = `${dirName}/${qFile}`;
      let bank;
      try {
        bank = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      } catch (e) {
        errors.push(`[${quizSource}] Invalid JSON: ${e.message}`);
        continue;
      }

      const bankSessionId = bank.sessionId !== undefined && bank.sessionId !== null ? String(bank.sessionId).trim() : '';
      const bankModuleId = bank.moduleId !== undefined && bank.moduleId !== null ? Number(bank.moduleId) : NaN;

      if (!Number.isInteger(bankModuleId) || bankModuleId !== moduleId) {
        errors.push(
          `[${quizSource}] Quiz bank moduleId (${bank.moduleId}) does not match directory ${dirName} (expected ${moduleId}).`
        );
      }

      const targetChapter = bankSessionId ? chaptersBySession.get(bankSessionId) : null;
      if (!bankSessionId || !targetChapter) {
        errors.push(
          `[${quizSource}] Quiz bank sessionId "${bankSessionId || 'missing'}" has no corresponding chapter in ${dirName}.`
        );
      } else if (targetChapter.moduleId !== moduleId) {
        errors.push(
          `[${quizSource}] Quiz bank sessionId "${bankSessionId}" belongs to module ${targetChapter.moduleId}, not ${moduleId}.`
        );
      }

      if (!Array.isArray(bank.questions)) {
        errors.push(`[${quizSource}] Missing questions array.`);
        continue;
      }

      if (bank.questions.length === 0 || bank.questions.length > 30) {
        errors.push(`[${quizSource}] Question count must be between 1 and 30 (found ${bank.questions.length}).`);
      }

      const cognitiveCounts = { conceptual: 0, architecture: 0, 'code-practice': 0 };

      bank.questions.forEach((q, idx) => {
        questionsFound++;
        const qId = q.id ? String(q.id).trim() : '';
        const prefix = `[${quizSource} -> Q#${idx + 1} (${qId || 'no-id'})]`;

        if (qId) {
          if (seenQuestionIds.has(qId)) {
            errors.push(
              `${prefix} Duplicate question.id "${qId}" (already defined in ${seenQuestionIds.get(qId)}).`
            );
          } else {
            seenQuestionIds.set(qId, quizSource);
          }
        }

        if (!qId || !q.sessionId || !q.subtopicTag || !q.question || !q.explanation || !q.chapterAnchor || !q.officialDocUrl) {
          errors.push(`${prefix} Missing required diagnostic or question fields.`);
        }

        if (q.sessionId && bankSessionId && String(q.sessionId).trim() !== bankSessionId) {
          errors.push(
            `${prefix} Question sessionId "${q.sessionId}" does not match quiz bank sessionId "${bankSessionId}".`
          );
        }

        if (q.chapterAnchor && targetChapter) {
          anchorsValidated++;
          const rawAnchor = String(q.chapterAnchor).trim();
          const hashIdx = rawAnchor.indexOf('#');
          if (hashIdx !== -1) {
            const chapterPrefix = rawAnchor.slice(0, hashIdx).trim();
            if (chapterPrefix && chapterPrefix !== targetChapter.slug) {
              errors.push(
                `${prefix} Invalid chapterAnchor prefix "${chapterPrefix}" (expected "${targetChapter.slug}" for ${targetChapter.dirName}/${targetChapter.file}).`
              );
            }
          }

          const anchorSlug = (hashIdx !== -1 ? rawAnchor.slice(hashIdx + 1) : rawAnchor).trim();
          const anchorMatches =
            anchorSlug.length > 0 &&
            (targetChapter.ids.has(anchorSlug) ||
              targetChapter.ids.has(slugifyHeading(anchorSlug)) ||
              targetChapter.compactIds.has(compactAnchorKey(anchorSlug)));

          if (!anchorMatches) {
            errors.push(
              `${prefix} Broken chapterAnchor "${rawAnchor}" — anchor "${anchorSlug}" not found in ${targetChapter.dirName}/${targetChapter.file}.`
            );
          }
        }

        validateLatexInText(q.question || '', `${quizSource}:${qId}:question`, errors, mathStats);
        validateLatexInText(q.explanation || '', `${quizSource}:${qId}:explanation`, errors, mathStats);
        if (Array.isArray(q.options)) {
          q.options.forEach((opt, oIdx) =>
            validateLatexInText(opt || '', `${quizSource}:${qId}:opt${oIdx}`, errors, mathStats)
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
            errors.push(`[${quizSource}] Missing questions for cognitiveLevel '${level}'.`);
          }
        }
      }
    }
  }

  console.log(JSON.stringify({
    status: errors.length === 0 ? 'VALID' : 'INVALID',
    modulesValidated,
    chaptersFound,
    quizzesFound,
    questionsFound,
    anchorsValidated,
    mathFormulasValidated: mathStats,
    errors,
    warnings
  }, null, 2));

  if (errors.length > 0) {
    process.exit(1);
  }
}

validateAll();
