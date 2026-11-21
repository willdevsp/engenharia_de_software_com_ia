import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { marked } from 'marked';
import YAML from 'yaml';

const ROOT = process.cwd();
const CHAPTERS_DIR = path.join(ROOT, 'content', 'modulo-01', 'chapters');
const ASSETS_DIR = path.join(ROOT, 'content', 'modulo-01', 'assets');
const QUIZZES_DIR = path.join(ROOT, 'content', 'modulo-01', 'quizzes');
const OUT_DIRS = [
  path.join(ROOT, 'public', 'downloads'),
  path.join(ROOT, 'dist-kindle')
];

for (const dir of OUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeXml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: raw };
  return { metadata: YAML.parse(match[1]) || {}, body: match[2] };
}

function isLikelyCurrencySpan(expr) {
  if (/^\d+([.,]\d+)?\s+[a-zA-ZÀ-ÿ]{2,}/.test(expr)) {
    const hasMathTokens = /[\\_^=<>+\-*/()[\]{}|]/.test(expr);
    if (!hasMathTokens) return true;
  }
  return false;
}

const LATEX_SYMBOLS = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\varepsilon': 'ε', '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
  '\\vartheta': 'ϑ', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
  '\\pi': 'π', '\\rho': 'ρ', '\\varsigma': 'ς', '\\sigma': 'σ',
  '\\tau': 'τ', '\\upsilon': 'υ', '\\varphi': 'φ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
  '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ',
  '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  '\\dots': '…', '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
  '\\longrightarrow': '→', '\\rightarrow': '→', '\\to': '→',
  '\\longleftarrow': '←', '\\leftarrow': '←', '\\leftrightarrow': '↔',
  '\\Longleftrightarrow': '⇔', '\\Leftrightarrow': '⇔', '\\iff': '⇔',
  '\\Longrightarrow': '⇒', '\\Rightarrow': '⇒', '\\implies': '⇒',
  '\\mapsto': '↦', '\\uparrow': '↑', '\\downarrow': '↓',
  '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\approx': '≈', '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅',
  '\\propto': '∝', '\\equiv': '≡', '\\neq': '≠', '\\ne': '≠',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
  '\\ll': '≪', '\\gg': '≫',
  '\\notin': '∉', '\\in': '∈', '\\ni': '∋',
  '\\subseteq': '⊆', '\\subset': '⊂', '\\supseteq': '⊇', '\\supset': '⊃',
  '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\varnothing': '∅',
  '\\sqcup': '⊔', '\\sqcap': '⊓', '\\setminus': '∖',
  '\\succ': '≻', '\\prec': '≺',
  '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄', '\\neg': '¬',
  '\\land': '∧', '\\lor': '∨', '\\oplus': '⊕', '\\otimes': '⊗', '\\odot': '⊙',
  '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\oint': '∮',
  '\\nabla': '∇', '\\partial': '∂', '\\infty': '∞',
  '\\mid': ' | ', '\\parallel': '∥', '\\perp': '⊥', '\\angle': '∠',
  '\\triangle': '△', '\\star': '★', '\\ast': '∗', '\\circ': '∘', '\\bullet': '•',
  '\\cos': 'cos', '\\sin': 'sin', '\\tan': 'tan', '\\tanh': 'tanh', '\\cot': 'cot',
  '\\exp': 'exp', '\\log': 'log', '\\ln': 'ln', '\\softmax': 'softmax',
  '\\max': 'max', '\\min': 'min', '\\sup': 'sup', '\\inf': 'inf',
  '\\lim': 'lim', '\\det': 'det', '\\dim': 'dim', '\\deg': 'deg',
  '\\arg': 'arg'
};

const TOK = {
  B_OPEN: '\uE001',
  B_CLOSE: '\uE002',
  SUB_OPEN: '\uE003',
  SUB_CLOSE: '\uE004',
  SUP_OPEN: '\uE005',
  SUP_CLOSE: '\uE006'
};

/**
 * Converts a LaTeX math expression into clean, semantic Kindle-compatible XHTML
 * using <sub>, <sup>, Unicode math symbols, and clear typographic structure.
 */
function latexToKindleXhtml(latex, isDisplay = false) {
  let s = String(latex).trim();

  // 1. Handle environments like bmatrix, pmatrix, matrix, cases, aligned
  s = s.replace(/\\begin\{(bmatrix|pmatrix|matrix|vmatrix)\}([\s\S]*?)\\end\{\1\}/g, (_m, type, content) => {
    const open = type === 'bmatrix' ? '[' : type === 'pmatrix' ? '(' : type === 'vmatrix' ? '|' : '[';
    const close = type === 'bmatrix' ? ']' : type === 'pmatrix' ? ')' : type === 'vmatrix' ? '|' : ']';
    const rows = content
      .trim()
      .split(/\\\\/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.split('&').map((c) => c.trim()).join(', '));
    return `${open}${rows.join(' ; ')}${close}`;
  });

  s = s.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_m, content) => {
    const rows = content
      .trim()
      .split(/\\\\/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.split('&').map((c) => c.trim()).join('   '));
    return `{ ${rows.join('  |  ')} }`;
  });

  s = s.replace(/\\begin\{(aligned|align\*?|array)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{\1\}/g, (_m, _t, content) => {
    return content
      .trim()
      .split(/\\\\/)
      .map((r) => r.replace(/&/g, ' ').trim())
      .join(isDisplay ? '\n' : ' ; ');
  });

  // 2. Strip sizing modifiers
  s = s.replace(/\\(left|right|bigl|bigr|Bigl|Bigr|biggl|biggr|Biggl|Biggr|big|Big|bigg|Bigg)\b/g, '');

  // 3. Handle escaped literals
  s = s
    .replace(/\\\|/g, '‖')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\_/g, '_');

  // 4. Handle accents: \hat{x}, \bar{x}, \vec{x}, \tilde{x}, \dot{x}
  s = s
    .replace(/\\hat\{([^{}]+)\}/g, '$1\u0302')
    .replace(/\\bar\{([^{}]+)\}/g, '$1\u0304')
    .replace(/\\overline\{([^{}]+)\}/g, '$1\u0305')
    .replace(/\\vec\{([^{}]+)\}/g, '$1\u20D7')
    .replace(/\\tilde\{([^{}]+)\}/g, '$1\u0303')
    .replace(/\\dot\{([^{}]+)\}/g, '$1\u0307');

  // 5. Handle \mathcal, \mathbb, \text, \mathrm, \mathbf, \boldsymbol, \operatorname, \texttt
  for (let pass = 0; pass < 4; pass++) {
    s = s
      .replace(/\\mathcal\{O\}/g, 'O')
      .replace(/\\mathcal\{L\}/g, 'L')
      .replace(/\\mathcal\{([^{}]*)\}/g, '$1')
      .replace(/\\mathbb\{R\}/g, 'ℝ')
      .replace(/\\mathbb\{N\}/g, 'ℕ')
      .replace(/\\mathbb\{Z\}/g, 'ℤ')
      .replace(/\\mathbb\{Q\}/g, 'ℚ')
      .replace(/\\mathbb\{E\}/g, '𝔼')
      .replace(/\\mathbb\{([^{}]*)\}/g, '$1')
      .replace(/\\(text|mathrm|operatorname|mathit|mathsf|texttt)\{([^{}]*)\}/g, '$2')
      .replace(/\\(mathbf|boldsymbol)\{([^{}]*)\}/g, `${TOK.B_OPEN}$2${TOK.B_CLOSE}`);
  }

  // 6. Handle \sqrt{...} and \frac{...}{...} iteratively for nesting
  for (let pass = 0; pass < 5; pass++) {
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, num, den) => {
      const n = num.trim();
      const d = den.trim();
      const nWrap = /[+\-\s]/.test(n) && !/^\(.*\)$/.test(n) ? `(${n})` : n;
      const dWrap = /[+\-\s]/.test(d) && !/^\(.*\)$/.test(d) ? `(${d})` : d;
      return `${nWrap} / ${dWrap}`;
    });
  }

  // 7. Replace known LaTeX symbol commands (longest first)
  const sortedKeys = Object.keys(LATEX_SYMBOLS).sort((a, b) => b.length - a.length);
  for (const cmd of sortedKeys) {
    s = s.split(cmd).join(LATEX_SYMBOLS[cmd]);
  }

  // 8. Handle spacing commands
  s = s
    .replace(/\\(quad|qquad)\b/g, '  ')
    .replace(/\\[,;:!]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, (unknownCmd) => unknownCmd.slice(1));

  // 9. Handle subscripts _{...} / _x and superscripts ^{...} / ^x using PUA tokens (no underscores/letters!)
  for (let pass = 0; pass < 4; pass++) {
    s = s
      .replace(/\_\{([^{}]*)\}/g, `${TOK.SUB_OPEN}$1${TOK.SUB_CLOSE}`)
      .replace(/\^\{([^{}]*)\}/g, `${TOK.SUP_OPEN}$1${TOK.SUP_CLOSE}`)
      .replace(/\_([a-zA-Z0-9+\-])/g, `${TOK.SUB_OPEN}$1${TOK.SUB_CLOSE}`)
      .replace(/\^([a-zA-Z0-9+\-⊤T*])/g, `${TOK.SUP_OPEN}$1${TOK.SUP_CLOSE}`);
  }

  // Clean up any leftover curly braces
  s = s.replace(/[{}]/g, '');

  // 10. Escape XML characters and restore HTML tags
  let xhtml = escapeXml(s)
    .split(TOK.B_OPEN).join('<strong>')
    .split(TOK.B_CLOSE).join('</strong>')
    .split(TOK.SUB_OPEN).join('<sub>')
    .split(TOK.SUB_CLOSE).join('</sub>')
    .split(TOK.SUP_OPEN).join('<sup>')
    .split(TOK.SUP_CLOSE).join('</sup>')
    .replace(/\n/g, '<br />');

  return isDisplay
    ? `<div class="math-block">${xhtml}</div>`
    : `<span class="math-inline">${xhtml}</span>`;
}

/**
 * Renders Markdown + LaTeX into strict XHTML for EPUB 3.
 */
function renderMarkdownWithKindleMath(markdown) {
  const codePlaceholders = [];
  const mathPlaceholders = [];

  // 1. Protect fenced code blocks (3+ backticks) and inline code `...`
  let protectedText = markdown.replace(/(^|\r?\n)(`{3,})[^\n]*\r?\n[\s\S]*?\r?\n\2(?=\r?\n|$)|`[^`\n]+`/g, (match) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(match);
    return `@@CODE_PLACEHOLDER_${idx}@@`;
  });

  // 2. Extract Display Math $$...$$
  protectedText = protectedText.replace(/\$\$([\s\S]+?)\$\$/g, (fullMatch, expr) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push({
      raw: fullMatch,
      xhtml: latexToKindleXhtml(expr, true)
    });
    return `\n\n@@MATH_PLACEHOLDER_${idx}@@\n\n`;
  });

  // 3. Extract Inline Math $...$
  protectedText = protectedText.replace(
    /(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g,
    (fullMatch, expr) => {
      const trimmed = expr.trim();
      if (!trimmed || isLikelyCurrencySpan(trimmed)) {
        return fullMatch;
      }
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({
        raw: fullMatch,
        xhtml: latexToKindleXhtml(trimmed, false)
      });
      return `@@MATH_PLACEHOLDER_${idx}@@`;
    }
  );

  // 4. Restore code blocks
  protectedText = protectedText.replace(/@@CODE_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? '';
  });

  const restoreMathXhtml = (str) =>
    str.replace(/@@MATH_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
      return mathPlaceholders[Number(idxStr)]?.xhtml ?? '';
    });

  const restoreMathRaw = (str) =>
    str.replace(/@@MATH_PLACEHOLDER_(\d+)@@/g, (_m, idxStr) => {
      return mathPlaceholders[Number(idxStr)]?.raw ?? '';
    });

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const rawWithMath = restoreMathRaw(text).replace(/<[^>]+>/g, '');
    const id = slugifyHeading(rawWithMath);
    return `<h${depth} id="${id}">${restoreMathXhtml(text)}</h${depth}>\n`;
  };
  renderer.image = function ({ href, text }) {
    const fileName = path.basename(href || '');
    const alt = escapeXml(text || 'Ilustração Técnica');
    const caption = text ? `<p class="img-caption">${escapeXml(text)}</p>` : '';
    return `<div class="figure-box"><img src="images/${fileName}" alt="${alt}" />${caption}</div>`;
  };
  renderer.hr = function () {
    return '<hr />';
  };
  renderer.br = function () {
    return '<br />';
  };

  const parsedHtml = marked.parse(protectedText, { renderer });
  return sanitizeXhtml(restoreMathXhtml(parsedHtml));
}

/**
 * Renders plain quiz text (questions, options, explanations) with inline code and LaTeX for EPUB 3.
 */
function renderInlineQuizTextForKindle(text = '') {
  const codePlaceholders = [];
  const mathPlaceholders = [];

  let processed = String(text).replace(/`([^`\n]+)`/g, (_m, codeContent) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(`<code>${escapeXml(codeContent)}</code>`);
    return `@@INLINE_CODE_${idx}@@`;
  });

  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    const idx = mathPlaceholders.length;
    mathPlaceholders.push(latexToKindleXhtml(expr, true));
    return `@@INLINE_MATH_${idx}@@`;
  });

  processed = processed.replace(
    /(?<!\\)\$((?:\\\$|[^$\n])+?)(?<!\\)\$/g,
    (fullMatch, expr) => {
      const trimmed = expr.trim();
      if (!trimmed || isLikelyCurrencySpan(trimmed)) {
        return fullMatch;
      }
      const idx = mathPlaceholders.length;
      mathPlaceholders.push(latexToKindleXhtml(trimmed, false));
      return `@@INLINE_MATH_${idx}@@`;
    }
  );

  processed = escapeXml(processed);

  processed = processed.replace(/@@INLINE_CODE_(\d+)@@/g, (_m, idxStr) => {
    return codePlaceholders[Number(idxStr)] ?? '';
  });
  processed = processed.replace(/@@INLINE_MATH_(\d+)@@/g, (_m, idxStr) => {
    return mathPlaceholders[Number(idxStr)] ?? '';
  });

  return processed;
}

function sanitizeXhtml(html) {
  return html
    .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')
    .replace(/<br\s*>/gi, '<br />')
    .replace(/<hr\s*>/gi, '<hr />')
    .replace(/&nbsp;/g, '&#160;');
}

async function buildEpub() {
  const zip = new JSZip();

  // 1. mimetype MUST be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF').file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  const imgFolder = oebps.folder('images');

  // 3. Stylesheet optimized for Kindle Colorsoft (Kaleido 3 Color E-Ink, compact technical book scale)
  oebps.file(
    'styles.css',
    `body {
  font-family: "Bookerly", Georgia, serif;
  font-size: 0.85em;
  line-height: 1.42;
  color: #111827;
  background-color: #FFFFFF;
  margin: 0;
  padding: 0.15em;
}
h1, h2, h3, h4 {
  font-family: "Amazon Ember", Helvetica, Arial, sans-serif;
  color: #1E1B4B;
  line-height: 1.25;
  margin-top: 1.0em;
  margin-bottom: 0.4em;
  page-break-after: avoid;
}
h1 { font-size: 1.32em; border-bottom: 2px solid #312E81; padding-bottom: 0.2em; }
h2 { font-size: 1.12em; margin-top: 1.1em; color: #1E3A8A; border-bottom: 1px solid #CBD5E1; padding-bottom: 0.15em; }
h3 { font-size: 1.02em; margin-top: 0.9em; color: #0F766E; }
h4 { font-size: 0.95em; color: #334155; }
p { margin: 0.45em 0; text-align: justify; }
ul, ol { margin: 0.45em 0; padding-left: 1.4em; }
li { margin: 0.2em 0; }
code {
  font-family: "Courier New", Courier, monospace;
  background-color: #F1F5F9;
  color: #0F172A;
  padding: 0.08em 0.25em;
  border-radius: 3px;
  font-size: 0.84em;
}
pre {
  font-family: "Courier New", Courier, monospace;
  background-color: #F8FAFC;
  border: 1px solid #94A3B8;
  border-left: 3px solid #312E81;
  padding: 0.55em;
  font-size: 0.74em;
  line-height: 1.32;
  white-space: pre-wrap;
  word-wrap: break-word;
  page-break-inside: avoid;
  margin: 0.7em 0;
}
pre code { background: none; padding: 0; font-size: 1em; }
.math-block {
  font-family: "Cambria Math", "STIX Two Math", "Bookerly", Georgia, serif;
  background-color: #F8FAFC;
  border: 1px solid #CBD5E1;
  border-left: 3px solid #4F46E5;
  padding: 0.45em 0.75em;
  margin: 0.7em 0;
  font-size: 0.90em;
  color: #0F172A;
  text-align: center;
  page-break-inside: avoid;
}
.math-inline {
  font-family: "Cambria Math", "STIX Two Math", "Bookerly", Georgia, serif;
  font-size: 0.94em;
  color: #1E1B4B;
  font-weight: 500;
}
blockquote {
  border-left: 3px solid #0D9488;
  background-color: #F0FDFA;
  margin: 0.7em 0;
  padding: 0.45em 0.8em;
  font-size: 0.92em;
  color: #134E4A;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  font-size: 0.80em;
  page-break-inside: avoid;
}
th {
  background-color: #EEF2FF;
  color: #1E1B4B;
  border: 1px solid #64748B;
  padding: 0.35em 0.45em;
  text-align: left;
}
td {
  border: 1px solid #94A3B8;
  padding: 0.35em 0.45em;
}
.figure-box {
  text-align: center;
  margin: 0.9em 0;
  page-break-inside: avoid;
  background-color: #FFFFFF;
  border: 1px solid #E2E8F0;
  padding: 0.4em;
}
.figure-box img {
  max-width: 100%;
  height: auto;
}
.img-caption {
  font-size: 0.78em;
  color: #475569;
  font-style: italic;
  text-align: center;
  margin-top: 0.25em;
}
.meta-banner {
  background-color: #EEF2FF;
  border: 1px solid #C7D2FE;
  padding: 0.55em 0.7em;
  margin-bottom: 0.9em;
  font-size: 0.84em;
}
.quiz-section {
  margin-top: 1.8em;
  border-top: 2px solid #1E1B4B;
  padding-top: 0.75em;
}
.quiz-card {
  border: 1px solid #CBD5E1;
  background-color: #FAFAFA;
  padding: 0.55em 0.7em;
  margin: 0.7em 0;
  font-size: 0.84em;
  page-break-inside: avoid;
}
.quiz-meta {
  font-size: 0.74em;
  color: #0F766E;
  font-weight: bold;
  text-transform: uppercase;
}
.answer-box {
  border-left: 3px solid #15803D;
  background-color: #F0FDF4;
  padding: 0.55em 0.7em;
  margin: 0.65em 0;
  font-size: 0.84em;
  page-break-inside: avoid;
}`
  );

  // 4. Copy all images from content/modulo-01/assets
  const manifestImages = [];
  const assetFiles = fs.existsSync(ASSETS_DIR) ? fs.readdirSync(ASSETS_DIR) : [];
  let hasCover = false;
  let coverFile = '';

  for (const file of assetFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
    const data = fs.readFileSync(path.join(ASSETS_DIR, file));
    imgFolder.file(file, data);
    const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const isCover = file.startsWith('cover-');
    if (isCover) {
      hasCover = true;
      coverFile = file;
    }
    manifestImages.push({
      id: `img-${file.replace(/[^a-zA-Z0-9]/g, '-')}`,
      href: `images/${file}`,
      mediaType,
      properties: isCover ? 'cover-image' : ''
    });
  }

  // 5. Load quizzes
  const quizzes = {};
  const quizFiles = fs.existsSync(QUIZZES_DIR)
    ? fs.readdirSync(QUIZZES_DIR).filter((f) => f.endsWith('.json'))
    : [];
  for (const qf of quizFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(QUIZZES_DIR, qf), 'utf-8'));
      quizzes[String(parsed.sessionId)] = parsed;
    } catch {}
  }

  // 6. Load and convert chapters
  const chapterFiles = fs.existsSync(CHAPTERS_DIR)
    ? fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.md')).sort()
    : [];
  const chapters = [];

  for (const file of chapterFiles) {
    const raw = fs.readFileSync(path.join(CHAPTERS_DIR, file), 'utf-8');
    const { metadata, body } = parseFrontmatter(raw);
    chapters.push({
      file,
      session: String(metadata.session || '1.1'),
      title: metadata.title || file.replace(/\.md$/, ''),
      estimatedMinutes: metadata.estimatedMinutes || 90,
      officialDocs: Array.isArray(metadata.official_docs) ? metadata.official_docs : [],
      videos: Array.isArray(metadata.media?.videos)
        ? metadata.media.videos
        : metadata.media?.video_url
        ? [{ title: `Vídeo da Sessão ${metadata.session || ''}`, channel: 'YouTube', url: metadata.media.video_url }]
        : [],
      body
    });
  }

  chapters.sort((a, b) => {
    const [aMaj, aMin] = a.session.split('.').map(Number);
    const [bMaj, bMin] = b.session.split('.').map(Number);
    return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
  });

  const manifestChapters = [];
  const letters = ['A', 'B', 'C', 'D'];

  chapters.forEach((ch, idx) => {
    const chNum = String(idx + 1).padStart(2, '0');
    const xhtmlFile = `chapter-${chNum}.xhtml`;
    const renderedBody = renderMarkdownWithKindleMath(ch.body);
    const quiz = quizzes[ch.session];

    let docsHtml = '';
    if (ch.officialDocs.length > 0 || (ch.videos && ch.videos.length > 0)) {
      const items = ch.officialDocs
        .map(
          (d) =>
            `<li><strong>${escapeXml(d.title)}</strong> (${escapeXml(d.section || 'Doc Oficial')}): <a href="${escapeXml(d.url)}">${escapeXml(d.url)}</a></li>`
        )
        .join('\n');
      const videoItems = (ch.videos || [])
        .map(
          (v) =>
            `<li><strong>[YouTube — ${escapeXml(v.channel)}] ${escapeXml(v.title)}</strong>: <a href="${escapeXml(v.url)}">${escapeXml(v.url)}</a></li>`
        )
        .join('\n');
      docsHtml = `<div class="meta-banner">${
        items
          ? `<strong>Documentações Oficiais da Etapa (Sessão ${escapeXml(ch.session)}):</strong><ul>${items}</ul>`
          : ''
      }${
        videoItems
          ? `<strong>Vídeos Complementares (YouTube):</strong><ul>${videoItems}</ul>`
          : ''
      }</div>`;
    }

    let quizHtml = '';
    if (quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
      const qCards = quiz.questions
        .map((q, qIdx) => {
          const opts = q.options
            .map(
              (opt, oIdx) =>
                `<li><strong>(${letters[oIdx]})</strong> ${renderInlineQuizTextForKindle(opt)}</li>`
            )
            .join('\n');
          const codeBlock = q.codeSnippet
            ? `<pre><code>${escapeXml(q.codeSnippet)}</code></pre>`
            : '';
          return `<div class="quiz-card" id="q-${escapeXml(q.id)}">
  <div class="quiz-meta">Questão ${qIdx + 1} de ${quiz.questions.length} • [${escapeXml(q.cognitiveLevel.toUpperCase())}] • Tópico: ${escapeXml(q.subtopicTag)}</div>
  <p><strong>${qIdx + 1}. ${renderInlineQuizTextForKindle(q.question)}</strong></p>
  ${codeBlock}
  <ul style="list-style-type: none; padding-left: 0.5em;">${opts}</ul>
  <p style="font-size: 0.85em;"><a href="#ans-${escapeXml(q.id)}">&#8594; Ver Resposta e Explicação Comentada</a></p>
</div>`;
        })
        .join('\n');

      const aCards = quiz.questions
        .map((q, qIdx) => {
          const correctLetter = letters[q.correctOptionIndex] || 'A';
          const correctText = q.options[q.correctOptionIndex] || '';
          return `<div class="answer-box" id="ans-${escapeXml(q.id)}">
  <p><strong>Questão ${qIdx + 1} (${escapeXml(q.subtopicTag)}) — Gabarito: Alternativa (${correctLetter})</strong></p>
  <p><em>"${renderInlineQuizTextForKindle(correctText)}"</em></p>
  <p>${renderInlineQuizTextForKindle(q.explanation)}</p>
  <p style="font-size: 0.82em;">Doc Oficial: <a href="${escapeXml(q.officialDocUrl)}">${escapeXml(q.officialDocLabel || q.officialDocUrl)}</a> | <a href="#q-${escapeXml(q.id)}">&#8593; Voltar para a questão</a></p>
</div>`;
        })
        .join('\n');

      quizHtml = `<div class="quiz-section" id="prova-sessao">
  <h2>Prova de Maestria da Sessão ${escapeXml(ch.session)} (${quiz.questions.length} Questões)</h2>
  <p>Responda às questões abaixo para medir a qualidade do seu conhecimento e consulte o gabarito comentado em seguida.</p>
  ${qCards}
  <h2 id="gabarito-sessao" style="page-break-before: always;">Gabarito Comentado — Sessão ${escapeXml(ch.session)}</h2>
  ${aCards}
</div>`;
    }

    const fullXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  ${docsHtml}
  ${renderedBody}
  ${quizHtml}
</body>
</html>`;

    oebps.file(xhtmlFile, fullXhtml);
    manifestChapters.push({
      id: `ch-${chNum}`,
      href: xhtmlFile,
      title: ch.title,
      session: ch.session,
      xhtmlContent: fullXhtml
    });
  });

  // 7. Cover XHTML
  oebps.file(
    'cover.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Engenharia de Software em IA Aplicada — Módulo 01</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <div style="text-align: center; padding: 1.5em 0.5em;">
    ${hasCover ? `<div class="figure-box"><img src="images/${coverFile}" alt="Capa do Módulo 01" /></div>` : ''}
    <h1>Engenharia de Software em IA Aplicada</h1>
    <h2>Módulo 01: Fundamentos de IA e LLMs para Programadores</h2>
    <p style="text-align: center; color: #475569;">Edição Especial Otimizada para Kindle Colorsoft • 11 Capítulos + Ilustrações Coloridas + 11 Provas Comentadas</p>
  </div>
</body>
</html>`
  );

  // 8. EPUB 3 Navigation Document (nav.xhtml)
  const navItems = manifestChapters
    .map((c) => `      <li><a href="${c.href}">${escapeXml(c.title)}</a></li>`)
    .join('\n');

  oebps.file(
    'nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Sumário — Módulo 01</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sumário — Módulo 01: Fundamentos de IA e LLMs</h1>
    <ol>
      <li><a href="cover.xhtml">Capa</a></li>
${navItems}
    </ol>
  </nav>
</body>
</html>`
  );

  // 9. EPUB 2 NCX (toc.ncx) for maximum Send-to-Kindle compatibility
  const ncxPoints = manifestChapters
    .map(
      (c, i) => `    <navPoint id="navPoint-${i + 2}" playOrder="${i + 2}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="${c.href}"/>
    </navPoint>`
    )
    .join('\n');

  oebps.file(
    'toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:engenharia-ia-modulo-01-2026"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>Engenharia de Software em IA Aplicada - Módulo 01</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Capa</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
${ncxPoints}
  </navMap>
</ncx>`
  );

  // 10. Package Document (content.opf)
  const manifestChapterXml = manifestChapters
    .map((c) => `    <item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const manifestImgXml = manifestImages
    .map(
      (img) =>
        `    <item id="${img.id}" href="${img.href}" media-type="${img.mediaType}"${img.properties ? ` properties="${img.properties}"` : ''}/>`
    )
    .join('\n');
  const spineXml = manifestChapters.map((c) => `    <itemref idref="${c.id}"/>`).join('\n');

  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="pt-BR">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:engenharia-ia-modulo-01-2026</dc:identifier>
    <dc:title>Engenharia de Software em IA Aplicada — Módulo 01: Fundamentos de IA e LLMs</dc:title>
    <dc:creator>Will — Curso Pessoal de Engenharia de IA</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:description>Curso aprofundado do Módulo 01 com 11 capítulos estilo livro técnico, gráficos de alto contraste para Kindle Colorsoft e 11 provas comentadas.</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestChapterXml}
${manifestImgXml}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover-page"/>
    <itemref idref="nav"/>
${spineXml}
  </spine>
</package>`
  );

  // Self-audit generated XHTML chapters to guarantee zero leaked placeholders or raw LaTeX
  const auditIssues = [];
  for (const ch of manifestChapters) {
    const xhtml = ch.xhtmlContent || '';
    const leakedPh = xhtml.match(/@@[A-Z0-9_]+@@|[\uE001-\uE006]/g);
    if (leakedPh) {
      auditIssues.push(`[${ch.href}] Leaked placeholder tokens (${leakedPh.length}): ${leakedPh.slice(0, 5).join(', ')}`);
    }
    const proseOnly = xhtml.replace(/<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>/g, '');
    const rawLatex = proseOnly.match(/\\(frac|sqrt|text|sum|cdot|times|rightarrow|dots|sqcup|setminus|mathcal|mathbb|mathbf|begin|end|left|right)\b/g);
    if (rawLatex) {
      auditIssues.push(`[${ch.href}] Raw LaTeX commands (${rawLatex.length}): ${rawLatex.slice(0, 5).join(', ')}`);
    }
    const strippedWords = proseOnly.match(/\b(sqcup|setminus|longrightarrow|Rightarrow|mathcal|mathbb|mathbf)\b/g);
    if (strippedWords) {
      auditIssues.push(`[${ch.href}] Stripped LaTeX command words (${strippedWords.length}): ${strippedWords.slice(0, 5).join(', ')}`);
    }
    const rawDollars = proseOnly.match(/\$\$|\$[^<$\s]{2,}\$/g);
    if (rawDollars) {
      auditIssues.push(`[${ch.href}] Unparsed dollar math (${rawDollars.length}): ${rawDollars.slice(0, 5).join(', ')}`);
    }
  }
  if (auditIssues.length > 0) {
    console.error('EPUB self-audit failed:\n' + auditIssues.join('\n'));
    process.exit(1);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  for (const dir of OUT_DIRS) {
    const outPath = path.join(dir, 'modulo-01-kindle-colorsoft.epub');
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated Kindle Colorsoft EPUB 3 (${(buffer.length / 1024).toFixed(1)} KB): ${outPath}`);
  }
}

buildEpub().catch((err) => {
  console.error('Failed to build EPUB:', err);
  process.exit(1);
});
