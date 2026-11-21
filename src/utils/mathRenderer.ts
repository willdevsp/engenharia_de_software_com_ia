import katex from 'katex';
import { marked } from 'marked';

export interface TocHeadingItem {
  id: string;
  text: string;
  html: string;
  depth: number;
}

export function slugifyHeading(text: string): string {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function isLikelyCurrencySpan(expr: string): boolean {
  if (/^\d+([.,]\d+)?\s+[a-zA-ZÀ-ÿ]{2,}/.test(expr)) {
    const hasMathTokens = /[\\_^=<>+\-*/()[\]{}|]/.test(expr);
    if (!hasMathTokens) return true;
  }
  return false;
}

/**
 * Renders Markdown + LaTeX ($$...$$ display and $...$ inline) to HTML using Marked + KaTeX.
 * Protects code blocks and inline code first so marked never mangles underscores in LaTeX
 * and KaTeX never touches $1 or ${var} inside code blocks.
 */
export function renderChapterMarkdownWithMath(markdown: string): {
  htmlContent: string;
  tocHeadings: TocHeadingItem[];
} {
  const codePlaceholders: string[] = [];
  const mathPlaceholders: { raw: string; html: string }[] = [];

  // 1. Protect fenced code blocks (3+ backticks) and inline code `...`
  let protectedText = markdown.replace(/(^|\r?\n)(`{3,})[^\n]*\r?\n[\s\S]*?\r?\n\2(?=\r?\n|$)|`[^`\n]+`/g, (match) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(match);
    return `@@CODE_PLACEHOLDER_${idx}@@`;
  });

  // 2. Extract Display Math $$...$$
  protectedText = protectedText.replace(/\$\$([\s\S]+?)\$\$/g, (fullMatch, expr) => {
    const idx = mathPlaceholders.length;
    const trimmed = expr.trim();
    try {
      const html = katex.renderToString(trimmed, {
        displayMode: true,
        throwOnError: false,
        strict: false
      });
      mathPlaceholders.push({
        raw: fullMatch,
        html: `<div class="math-display-box">${html}</div>`
      });
    } catch {
      mathPlaceholders.push({
        raw: fullMatch,
        html: `<div class="math-display-box"><code>${trimmed}</code></div>`
      });
    }
    return `\n\n@@MATH_PLACEHOLDER_${idx}@@\n\n`;
  });

  // 3. Extract Inline Math $...$ (supporting escaped \$ inside math)
  protectedText = protectedText.replace(
    /(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g,
    (fullMatch, expr) => {
      const trimmed = expr.trim();
      if (!trimmed || isLikelyCurrencySpan(trimmed)) {
        return fullMatch;
      }
      const idx = mathPlaceholders.length;
      try {
        const html = katex.renderToString(trimmed, {
          displayMode: false,
          throwOnError: false,
          strict: false
        });
        mathPlaceholders.push({ raw: fullMatch, html });
      } catch {
        mathPlaceholders.push({ raw: fullMatch, html: `<code>${trimmed}</code>` });
      }
      return `@@MATH_PLACEHOLDER_${idx}@@`;
    }
  );

  // 4. Restore code blocks so marked can render them properly
  protectedText = protectedText.replace(/@@CODE_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? '';
  });

  const restoreMathHtml = (str: string) =>
    str.replace(/@@MATH_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
      return mathPlaceholders[Number(idxStr)]?.html ?? '';
    });

  const restoreMathRaw = (str: string) =>
    str.replace(/@@MATH_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
      return mathPlaceholders[Number(idxStr)]?.raw ?? '';
    });

  // 5. Parse Markdown with custom heading renderer that preserves exact anchor slugs
  const tocHeadings: TocHeadingItem[] = [];
  const renderer = new marked.Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const parsedInline = this.parser.parseInline(tokens);
    const rawWithOriginalMath = restoreMathRaw(parsedInline).replace(/<[^>]+>/g, '');
    const id = slugifyHeading(rawWithOriginalMath);
    const finalHeadingHtml = restoreMathHtml(parsedInline);
    const cleanTextForFallback = rawWithOriginalMath.replace(/\$/g, '');

    if (depth === 2 || depth === 3) {
      tocHeadings.push({
        id,
        text: cleanTextForFallback,
        html: finalHeadingHtml,
        depth
      });
    }
    return `<h${depth} id="${id}">${finalHeadingHtml}</h${depth}>`;
  };

  const rawHtml = marked.parse(protectedText, { renderer }) as string;

  // 6. Restore rendered KaTeX HTML placeholders in the full body
  const htmlContent = restoreMathHtml(rawHtml);

  return { htmlContent, tocHeadings };
}

/**
 * Renders plain text with inline LaTeX ($...$ and $$...$$) and inline code (`...`)
 * for Quiz questions, options, and explanations.
 */
export function renderInlineTextWithMath(text: string): string {
  if (!text) return '';

  const codePlaceholders: string[] = [];
  const mathPlaceholders: string[] = [];

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // 1. Protect inline code `...`
  let processed = text.replace(/`([^`\n]+)`/g, (_m, codeContent) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(
      `<code class="font-mono bg-slate-200/80 text-slate-900 px-1.5 py-0.5 rounded text-[0.88em]">${escapeHtml(
        codeContent
      )}</code>`
    );
    return `@@INLINE_CODE_${idx}@@`;
  });

  // 2. Extract Display Math $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    const idx = mathPlaceholders.length;
    try {
      mathPlaceholders.push(
        `<div class="math-display-box my-2">${katex.renderToString(expr.trim(), {
          displayMode: true,
          throwOnError: false,
          strict: false
        })}</div>`
      );
    } catch {
      mathPlaceholders.push(escapeHtml(expr));
    }
    return `@@INLINE_MATH_${idx}@@`;
  });

  // 3. Extract Inline Math $...$ (supporting escaped \$ inside math)
  processed = processed.replace(
    /(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g,
    (fullMatch, expr) => {
      const trimmed = expr.trim();
      if (!trimmed || isLikelyCurrencySpan(trimmed)) {
        return fullMatch;
      }
      const idx = mathPlaceholders.length;
      try {
        mathPlaceholders.push(
          katex.renderToString(trimmed, {
            displayMode: false,
            throwOnError: false,
            strict: false
          })
        );
      } catch {
        mathPlaceholders.push(escapeHtml(trimmed));
      }
      return `@@INLINE_MATH_${idx}@@`;
    }
  );

  // 4. Escape remaining plain text HTML
  processed = escapeHtml(processed);

  // 5. Restore inline code & math
  processed = processed.replace(/@@INLINE_CODE_(\d+)@@/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? '';
  });
  processed = processed.replace(/@@INLINE_MATH_(\d+)@@/g, (_m, idxStr) => {
    return mathPlaceholders[Number(idxStr)] ?? '';
  });

  return processed;
}
