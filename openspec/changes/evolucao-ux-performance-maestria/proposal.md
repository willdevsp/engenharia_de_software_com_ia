## Why

Com a chegada da arquitetura multi-módulo e do Módulo 02, três frentes passaram a limitar a experiência de estudo contínuo até o Módulo 12: (1) a leitura em dispositivos móveis sofre com overflow horizontal em tabelas comparativas, sumário relegado ao fim do capítulo e falta de cópia rápida de blocos de código; (2) o empacotamento monolítico de todo o conteúdo em um único bundle JavaScript (`2,88 MB` com 2 módulos) somado aos `.EPUB` pré-gerados em `public/downloads/` (`19,8 MB`) infla o APK Android (`48,4 MB`, projetado para `~150–200 MB` em 12 módulos); e (3) a progressão entre módulos ainda é irrestrita, sem validação de percurso de leitura e sem critério formal de aprovação (>= 70%) para destravar o módulo seguinte.

## What Changes

- **Correção de UX de Leitura Mobile (`mobile-reading-ux`):**
  - Envolvimento automático de tabelas Markdown em container rolável horizontalmente (`.table-scroll-wrapper`) e ajuste de `min-w-0` no `<article>` para eliminar overflow horizontal da página no celular (`390px`).
  - Sumário **"Neste Capítulo"** acessível no mobile (`< lg`) por meio de accordion recolhível no topo do capítulo e botão flutuante discreto para navegação rápida em drawer/sheet, mantendo a sidebar sticky no desktop (`>= lg`).
  - Blocos de código com cabeçalho exibindo a linguagem e botão **"Copiar"** compatível com browser e WebView Android, além de ajustes finos de espaçamento (`p-4 sm:p-10`) e quebra responsiva dos botões anterior/próximo no rodapé.
- **Geração de EPUB Kindle Colorsoft On-Demand por Módulo (`ondemand-kindle-epub`):**
  - Extração do núcleo gerador de `scripts/build-epub.mjs` para um módulo isomórfico compartilhado entre CLI e aplicação Web/Android.
  - Manutenção estrita de **um arquivo `.EPUB` por módulo** (`modulo-XX-kindle-colorsoft.epub`), preservando 100% do padrão visual e estrutural Colorsoft existente (capa, `nav.xhtml`, `toc.ncx`, `content.opf`, LaTeX em XHTML, imagens PNG/JPEG, links oficiais/YouTube, provas comentadas com âncoras cruzadas e auto-auditoria XHTML).
  - Ao clicar para baixar/enviar ao Kindle na aplicação em execução, o `.EPUB` do módulo é montado na hora no cliente com `JSZip` (usando dados em memória e imagens locais em `course-assets/modulo-XX/`), eliminando os `.EPUB` pré-empacotados de `public/downloads/` de dentro do bundle Web e do APK Android.
- **Lazy-Loading dos Módulos (`module-lazy-loading`):**
  - Refatoração de `scripts/compile-content.mjs` para separar um índice leve e imediato (`src/generated/catalog.ts` com metadados dos módulos, lista de assets e sumários leves das sessões, sem textos longos de Markdown nem questões) de chunks dinâmicos por módulo (`src/generated/modules/modulo-XX.ts`) carregados sob demanda (`loadModuleData(moduleId)`).
  - Separação de chunks de dependências pesadas no `vite.config.ts` (`katex`, `firebase`, `marked`, `jszip`) para manter abertura instantânea na Home e escalar até os 12 módulos sem degradar o APK.
- **Mastery Gate Sequencial (>= 70%), Validação por Seção e Ciclo de 3 Chances (`module-mastery-gate`):**
  - **Validação de percurso por sessão:** mesmo quando o estudo inicial ocorre no Kindle, cada sessão do módulo exige percurso real no leitor (rastreamento por seções `H2`/`H3` + topo/fim via `IntersectionObserver` com permanência mínima de ~1,5s por seção e confirmação ao atingir 100%), alimentando `readingProgress` + log com timestamp.
  - **Prova Completa do Módulo (Chance 1/3, máx. 40 questões):** liberada após percorrer 100% das sessões do módulo, selecionando até 40 questões equilibradas entre todas as sessões em modo exame oficial. Nota consolidada `>= 70%` aprova o módulo e desbloqueia o próximo (`Módulo N+1`).
  - **Consolidação do ciclo com até 2 Provas Extras (Chances 2/3 e 3/3):** caso a Prova Completa fique `< 70%`, o aluno recebe até **2 provas extras** contendo apenas as questões/tópicos em que errou (preferindo questões irmãs do mesmo subtópico/sessão quando disponíveis), atualizando a **nota consolidada do ciclo** (`acertos consolidados / total de questões do ciclo`). Atingir `>= 70%` no consolidado aprova o módulo.
  - **Reestudo cirúrgico obrigatório após 3 falhas:** se o consolidado permanecer `< 70%` ao final da 3ª chance, o módulo entra em bloqueio de reestudo, desmarcando e zerando o progresso de leitura **apenas dos capítulos/sessões com aproveitamento `< 70%`** no ciclo (premissa de desbloqueio também aplicável ao download do EPUB do módulo seguinte até que seja desbloqueado), exigindo percurso completo dessas sessões antes de abrir um novo ciclo de 3 chances.
  - Provas individuais por sessão permanecem livres como treino/diagnóstico e todo o estado de maestria + logs com timestamp sincronizam com o Firebase mantendo retrocompatibilidade com `study_state/default`.

## Capabilities

### New Capabilities
- `mobile-reading-ux`: Ergonomia de leitura mobile em capítulos técnicos (tabelas roláveis sem overflow da página, TOC acessível no mobile via accordion superior/drawer flutuante e cabeçalho com linguagem + cópia rápida em blocos de código).
- `ondemand-kindle-epub`: Núcleo compartilhado e isomórfico para geração sob demanda no cliente (Web e Android) de um `.EPUB` 3 Colorsoft por módulo ao clicar, mantendo paridade integral com o padrão existente e removendo `.EPUB` duplicados de `public/downloads/`.
- `module-lazy-loading`: Compilação dividida entre catálogo leve imediato (`catalog.ts`) e bundles carregáveis sob demanda por módulo (`modulo-XX.ts`) + code-splitting de vendors no Vite para escalar até 12 módulos.
- `module-mastery-gate`: Validação de percurso por seção nas sessões do módulo, Prova Completa do Módulo (até 40 questões) com até 2 Provas Extras por consolidação de ciclo (3 chances), reestudo cirúrgico apenas das sessões `< 70%`, desbloqueio sequencial do Módulo `N+1` e persistência sincronizada na nuvem.

### Modified Capabilities
<!-- Nenhuma capability arquivada em openspec/specs/ é alterada neste momento; preserva compatibilidade integral com `study_state/default` e `session_audios` existentes no Firebase Firestore e com o CLI `npm run build:kindle`. -->

## Impact

- **Pipeline de Build & Scripts:** `scripts/compile-content.mjs`, `scripts/build-epub.mjs`, `vite.config.ts`, remoção dos artefatos duplicados em `public/downloads/*.epub` do bundle Web/APK.
- **Núcleo & Utilitários (`src/utils/`):** novo módulo isomórfico compartilhado de geração EPUB (`src/utils/epubCore.ts`), novo loader dinâmico em `src/generated/moduleLoader.ts`, atualizações em `src/utils/nativeExport.ts`, `src/utils/mathRenderer.ts`, `src/utils/storage.ts`, `src/types/course.ts`.
- **Componentes & Estilos (`src/`):** `src/App.tsx`, `src/components/CourseHome.tsx`, `src/components/ChapterReader.tsx`, `src/components/QuizEngine.tsx`, `src/components/AnalyticsDashboard.tsx`, `src/index.css`.
- **Dados Persistidos & Nuvem:** extensão retrocompatível de `UserStudyState` (`moduleMastery` e `readingProgressLog` com `updatedAt`) em `localStorage` e Firestore (`study_state/default`).
