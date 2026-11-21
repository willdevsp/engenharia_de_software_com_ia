## Context

A arquitetura atual da plataforma atende 2 dos 12 módulos planejados, mas empacota todo o conteúdo Markdown e bancos de questões em um único arquivo estático (`src/generated/courseData.ts` -> bundle de `2,88 MB`), embarca `.epub` duplicados em `public/downloads/` (`19,8 MB`) dentro do APK Android (`48,4 MB`), apresenta overflow horizontal em tabelas no mobile (`538px` em viewport `390px`) e permite navegação irrestrita entre módulos sem verificação de leitura ou critério formal de aproveitamento.

Para os motivadores detalhados e contratos comportamentais, veja [proposal.md](./proposal.md) e as quatro especificações em `specs/`.

## Goals / Non-Goals

**Goals:**
- Garantir leitura mobile com `0px` de overflow horizontal (`390x844`), sumário acessível no celular e cópia instantânea de blocos de código.
- Eliminar a duplicação de binários `.EPUB` no Web/APK gerando `modulo-XX-kindle-colorsoft.epub` sob demanda no cliente com paridade total em relação ao CLI `build:kindle`.
- Separar catálogo leve (`catalog.ts`) de chunks carregáveis sob demanda (`modulo-XX.ts`) para suportar crescimento linear até 12 módulos com abertura instantânea.
- Implementar o fluxo de **Mastery Gate (`>= 70%`)** com validação real de percurso por seção, Prova Completa do Módulo (`<= 40` questões), até 2 Provas Extras de consolidação (3 chances), reestudo cirúrgico de sessões `< 70%` e desbloqueio sequencial do Módulo `N+1` sincronizado no Firebase.

**Non-Goals:**
- Quebrar EPUB por capítulo individual (mantém estritamente 1 EPUB completo por módulo).
- Converter imagens de capítulos para WebP antes de ter pipeline separado para Kindle (Send to Kindle exige PNG/JPEG).
- Implementar o Tutor IA Gemini (Fase 3) ou alterar o esquema das provas individuais de treino por sessão, além da clara distinção visual em relação à Prova Oficial do Módulo.
- Alterar ou migrar dados existentes do Módulo 01 no Firestore de forma destrutiva.

## Decisions

### 1. Compilação Dividida e Lazy-Loading (`scripts/compile-content.mjs` + `src/generated/moduleLoader.ts` + `vite.config.ts`)
- **Decisão:** `compile-content.mjs` passará a gerar:
  - `src/generated/catalog.ts`: exporta `COURSE_MODULES` (enriquecido com `assetFiles: string[]`), `CHAPTER_SUMMARIES` (metadados leves sem `markdownContent`, `official_docs` ou `media`) e `QUIZ_SUMMARIES` (metadados leves com `sessionId`, `moduleId`, `title`, `questionsCount`, `subtopicTags`).
  - `src/generated/modules/modulo-XX.ts`: um arquivo por módulo disponível contendo `{ chapters: ChapterData[], quizzes: Record<string, SessionQuizBank> }`.
  - `src/generated/moduleLoader.ts`: mapa explícito de dynamic imports (`1: () => import('./modules/modulo-01')`, etc.) com cache em `Map<number, ModuleBundlePayload>` em memória.
  - Em `vite.config.ts`, adicionar `build.rollupOptions.output.manualChunks` isolando `katex`, `firebase`, `marked`, `jszip` e permitindo que o Rollup emita chunks separados para cada `./generated/modules/modulo-XX.ts`.
- **Alternativa considerada:** manter um único `courseData.ts` ou fazer fetch de arquivos `.json` crus em `public/`. *Rejeitado* porque: (a) um único JS não escala até 12 módulos; (b) dynamic `import()` de `.ts` gerado garante tipagem estrita em TypeScript, tree-shaking e empacotamento nativo dentro do APK offline sem precisar gerir paths adicionais no Capacitor.
- **Impacto na `CourseHome.tsx`:** A Home calculará métricas de leitura, maestria e status do Mastery Gate usando apenas `COURSE_MODULES`, `CHAPTER_SUMMARIES` e `studyState` (lembrando que `QuizAttemptAnswer` já grava `subtopicTag` e `cognitiveLevel`, dispensando carregar as 496+ questões na abertura). Para manter compatibilidade durante transição ou testes externos, tipos `ChapterSummary` e `ModuleBundlePayload` ficam claramente tipados em `src/types/course.ts`.

### 2. Núcleo EPUB Compartilhado Isomórfico (`src/utils/epubCore.ts` + `scripts/build-epub.mjs` + `src/utils/nativeExport.ts`)
- **Decisão:** Extrair toda a lógica pura de conversão LaTeX->Kindle XHTML (`latexToKindleXhtml`, `renderMarkdownWithKindleMath`, `renderInlineQuizTextForKindle`, `EPUB_STYLES_CSS`, geradores de `cover.xhtml`, `nav.xhtml`, `toc.ncx`, `content.opf`, cards de prova/gabarito e auditoria XHTML) para um módulo puro compartilhado em JS/ES (`src/utils/epubCore.mjs` ou `src/utils/epubCore.ts` + CLI compatível via Node/TS).
  - Nota prática de toolchain: Como `scripts/build-epub.mjs` roda diretamente em `node scripts/build-epub.mjs` sem transpilador TypeScript, escrever o núcleo puro em `scripts/lib/epub-core.mjs` (ou `src/utils/epubCore.mjs` com `.d.ts` ao lado em `src/utils/epubCore.d.ts`, e `allowJs` ou `.ts` se ajustado) permite que **tanto o Node.js puro quanto o Vite/TypeScript importem exatamente o mesmo arquivo sem build step extra**. Optar por `src/utils/epubCore.mjs` + declaração `src/utils/epubCore.d.ts` garante fonte única de verdade com zero dependência de `tsx`/`esbuild` no CLI e zero APIs do Node (`path.basename` substituído por manipulação pura de string `href.split('/').pop()`).
- **Desempenho & Compressão:** Imagens PNG/JPEG são gravadas no `JSZip` com `compression: 'STORE'` (já são comprimidas; economiza CPU no Android WebView), enquanto `mimetype` usa `STORE` (exigência EPUB 3) e arquivos XHTML/CSS/OPF/NCX usam `DEFLATE` nível 6.
- **Exportação On-Demand (`nativeExport.ts`):**
  - Recebe `CourseModuleInfo` (com `assetFiles`), chama `await loadModuleData(mod.id)` (caso chamado direto da Home sem ter entrado no módulo), faz `fetch('./course-assets/modulo-XX/' + file)` em paralelo das imagens declaradas em `assetFiles` como `ArrayBuffer`/`Uint8Array`, invoca `buildModuleEpubZip(...)` e entrega `blob` no Desktop ou `base64` para `Filesystem.writeFile` + `Share.share` no Android Capacitor.
  - Remover geração para `public/downloads/` em `scripts/build-epub.mjs`, mantendo geração apenas em `dist-kindle/modulo-XX-kindle-colorsoft.epub`.

### 3. Ergonomia de Leitura Mobile (`mathRenderer.ts`, `ChapterReader.tsx`, `index.css`)
- **Tabelas responsivas:** Em `renderChapterMarkdownWithMath`, sobrescrever `renderer.table` no `marked` para envolver `<table>...</table>` em `<div class="table-scroll-wrapper">...</div>` (mantendo a geração de `<tbody>`/`<thead>` padrão do `marked.Renderer.prototype.table.call(this, token)`). Adicionar `min-w-0` no `<article>` em `ChapterReader.tsx` para evitar que CSS Grid expanda a coluna acima de `100%`.
- **Blocos de código com linguagem e botão Copiar:** Sobrescrever `renderer.code` para gerar `<div class="code-block-shell"><div class="code-block-header"><span>{lang}</span><button type="button" class="code-copy-btn" data-copy-code>Copiar</button></div><pre><code>...</code></pre></div>`. No `handleContentClick` do `ChapterReader.tsx` (que já faz delegação de clique para imagens), detectar `target.closest('[data-copy-code]')`, extrair `textContent` do `<code>` irmão e copiar via `navigator.clipboard.writeText` com fallback `textarea` + `document.execCommand('copy')` para WebViews Android mais antigos.
- **TOC Mobile Acessível:** Renderizar em `lg:hidden` logo acima do `<article>` um accordion compacto `"Neste Capítulo (N seções)"` (fechado por padrão), além de um botão flutuante discreto no canto inferior direito que aparece após rolar e abre um bottom-sheet/drawer com os headings H2/H3. No desktop (`hidden lg:block`), manter o `<aside class="lg:col-span-3 lg:sticky ...">` atual sem alterações visuais.

### 4. Validação Real de Percurso por Seção (`ChapterReader.tsx` + `storage.ts`)
- **Mecanismo Kindle-friendly com qualidade:** Cada capítulo renderizado expõe alvos observáveis em `.book-prose`: além de todos os headings `h2` e `h3`, injetar um marcador lógico inicial (`__start__`) e uma sentinela de rodapé (`__end__`). Caso um capítulo não tenha `h2`/`h3`, dividir ou usar topo/meio/fim como checkpoints mínimos.
- **`IntersectionObserver` + Dwell Timer (`1.5s`):**
  - Ao entrar no viewport com `threshold >= 0.2` (ou `rootMargin` ajustado), inicia-se um timer de `1500ms` por checkpoint (e apenas enquanto a aba estiver visível via `document.visibilityState === 'visible'`). Se o leitor rolar rapidamente pelo trecho em menos de `1.5s`, o timer é cancelado e aquela seção não é validada.
  - Checkpoints visitados na sessão atual alimentam `visitedSections: string[]` e `percentage = Math.round((visitedCount / totalCount) * 100)`. Ao atingir `100%`, o botão `"Marcar como Lido"` é automaticamente liberado (ou conclui automaticamente + permite confirmar), gravando `readingProgress[chapterId] = 100` e atualizando `readingProgressLog`.
  - Se o capítulo estiver bloqueado por **reestudo obrigatório**, o botão de conclusão manual permanece travado até que a nova cobertura alcance `100%` com timestamp posterior ao `restudyResetAt` daquele capítulo.

### 5. Máquina de Estados do Mastery Gate (`course.ts`, `storage.ts`, `QuizEngine.tsx`, `App.tsx`)

#### Estrutura de Dados Adicionada em `src/types/course.ts`
- `ReadingProgressEntry`: `{ percentage: number; visitedSections?: string[]; updatedAt: string }` -> mapa `readingProgressLog?: Record<string, ReadingProgressEntry>` em `UserStudyState`.
- `ModuleExamSlot`: `{ slotIndex: number; sessionId: string; subtopicTag: string; cognitiveLevel: CognitiveLevel; originalQuestionId: string; currentQuestionId: string; status: 'pending' | 'correct' | 'wrong'; attemptsHistory: string[] }`
- `ModuleExamCycle`: `{ cycleNumber: number; attemptCount: 0 | 1 | 2 | 3; maxChances: 3; targetTotalQuestions: number; consolidatedCorrectCount: number; consolidatedScore: number; slots: ModuleExamSlot[]; lastUpdated: string }`
- `ModuleMasteryState`: `{ moduleId: number; status: 'locked' | 'in-progress' | 'approved' | 're-study-required'; approvedScore?: number; approvedAt?: string; requiredRestudyChapterIds: string[]; restudyResetAt?: string; activeCycle: ModuleExamCycle | null; completedCyclesCount: number }`
- `UserStudyState.moduleMastery?: Record<string, ModuleMasteryState>` (chave string `'1'`, `'2'`, etc.).
- Estender `QuizAttempt` com `mode: 'full' | 'quick' | 'error-notebook' | 'module-exam'` e `moduleId?: number`.

#### Algoritmo da Prova Completa (`<= 40` questões) & Provas Extras
1. **Seleção da Chance 1 (`generateModuleExamQuestions`):**
   - Calcula `target = Math.min(40, totalQuestionsInModule)`.
   - Distribui quotas proporcionalmente ao tamanho de cada sessão do módulo (garantindo mínimo proporcional e arredondamento distribuído pelas sessões, de modo que todas as sessões participem da prova).
   - Dentro de cada sessão, ordena questões candidatas priorizando: (a) subtópicos com pior histórico nos treinos/diagnósticos; (b) balanceamento entre níveis cognitivos (`conceptual`, `architecture`, `code-practice`).
   - Gera os `slots` iniciais (Chance 1/3) no momento de iniciar ou retomar a prova em modo oficial (`instantFeedback = false`, bloqueado durante a prova).
2. **Apuração da Chance 1 e Transição:**
   - Se `scorePercentage >= 70`: `status = 'approved'`, `approvedScore = scorePercentage`, desbloqueia Módulo `N+1`.
   - Se `< 70%`: abre `attemptCount = 1` (próxima será Chance 2/3 — 1ª Prova Extra).
3. **Montagem das Provas Extras (Chances 2/3 e 3/3):**
   - Filtra `slots.filter(s => s.status === 'wrong')`.
   - Para cada slot errado, escolhe preferencialmente uma questão **irmã ainda não usada no ciclo** (`sessionId === slot.sessionId && subtopicTag === slot.subtopicTag`), depois outra questão inédita da mesma `sessionId`, ou como último fallback repete `slot.currentQuestionId`.
   - Ao entregar Chance 2 ou 3: slots acertados passam para `'correct'`. Recalcula `consolidatedCorrectCount` e `consolidatedScore = Math.round((consolidatedCorrectCount / targetTotalQuestions) * 100)`.
   - Se `consolidatedScore >= 70`: `status = 'approved'` imediato!
4. **Falha após Chance 3 (`consolidatedScore < 70`):**
   - Agrupa `slots` por `sessionId`: calcula `sessionAccuracy = (slotsCorrectInSession / slotsTotalInSession) * 100`.
   - Seleciona **apenas as sessões com `sessionAccuracy < 70`** -> mapeia para os respectivos `chapter.id` (`requiredRestudyChapterIds`). Se por efeito raro de distribuição nenhuma sessão isolada ficar `< 70%` enquanto a média total ficou `< 70%` (matematicamente impossível com média < 70, mas protegido por segurança), cai para a sessão de menor acurácia.
   - Em `triggerSurgicalRestudy`:
     - Marca `status = 're-study-required'`, `restudyResetAt = now`.
     - Remove `requiredRestudyChapterIds` de `completedChapters` e registra `{ completed: false, updatedAt: now }` em `chapterCompletionLog`.
     - Reseta `readingProgress[chId] = 0` e `readingProgressLog[chId] = { percentage: 0, visitedSections: [], updatedAt: now }`.
   - Assim que todas as sessões em `requiredRestudyChapterIds` voltarem a `completedChapters` (ou seja, forem percorridas 100% novamente), `syncRestudyCompletion` zera `requiredRestudyChapterIds`, limpa `activeCycle` (`status = 'in-progress'`) e libera um novo ciclo (`cycleNumber + 1`).

#### Reconciliação Multi-Dispositivo no Firebase (`storage.ts`)
- **Armadilha identificada:** Hoje `mergeStudyStates` aplica `Math.max` em `readingProgress[key]`. Se o usuário falhar 3 chances no PC (resetando `readingProgress[chId] = 0`) e sincronizar com o Android que ainda tinha `100`, o `Math.max` restauraria `100` indevidamente!
- **Solução no `mergeStudyStates`:**
  - Introduzir `readingProgressLog` com `updatedAt` (Last-Write-Wins por timestamp, exatamente como já foi feito para `chapterCompletionLog`!). Se ambos tiverem o mesmo timestamp ou ausência de log legado, faz fallback para `Math.max`.
  - Para `moduleMastery[modKey]`: comparar `lastUpdated` do ciclo ativo / `restudyResetAt` / `approvedAt` (Last-Write-Wins com preferência por `'approved'` caso empates idênticos ocorram, ou maior `cycleNumber` + `attemptCount` dentro do mesmo ciclo). Assim o estado de aprovação e eventuais resets cirúrgicos sincronizam deterministicamente entre Desktop e Android.
- **Retrocompatibilidade:** Se o documento remoto `study_state/default` do Módulo 01 já tiver progresso legado sem `moduleMastery` ou `readingProgressLog`, a normalização trata como `{}` sem quebrar nada; para usuários que já tinham todas as sessões do Módulo 01 marcadas como concluídas antes do Mastery Gate, a Prova do Módulo 01 fica imediatamente liberada para conquistar a aprovação >= 70% sem perder suas leituras prévias (a menos que falhe nas 3 chances).

## Risks / Trade-offs

- **Risco:** Usuário antigo no Módulo 01 fica temporariamente impedido de abrir o Módulo 02 até passar na Prova Completa do Módulo 01 -> **Mitigação:** Deixar o fluxo da Prova do Módulo 01 visível já no topo da Home/Dashboard ("Falta 1 etapa para desbloquear o Módulo 02: Prova Final do Módulo 01 (40 questões)"), preservando 100% dos capítulos concluídos e diagnósticos anteriores no Módulo 01.
- **Risco:** `IntersectionObserver` com dwell time de `1.5s` pode irritar usuário em revisão rápida após leitura no Kindle -> **Mitigação:** Calibrar em `1.5s` (suficiente para bloquear drag instantâneo de 0.3s, mas fluido durante revisão página por página) com barra visual de feedback em tempo real por seção e fallback caso o usuário já tenha lido integralmente no mesmo ciclo.
- **Risco:** Caminho de `./course-assets/modulo-XX/*.png` dentro do Android Capacitor WebView ao chamar `fetch()` durante geração do EPUB -> **Mitigação:** Mesmo mecanismo de URL relativa `./` já validado para `<img src>` e `./downloads/*.epub` no WebView Capacitor (`base: './'` no `vite.config.ts`). Validar diretamente no APK Android durante o `/opsx:apply`.
- **Risco:** `scripts/build-epub.mjs` precisa rodar em Node puro sem build TS -> **Mitigação:** Núcleo compartilhado em `src/utils/epubCore.mjs` + arquivo de declaração `src/utils/epubCore.d.ts` garantindo zero duplicação de código e tipagem forte no app React/TypeScript.
