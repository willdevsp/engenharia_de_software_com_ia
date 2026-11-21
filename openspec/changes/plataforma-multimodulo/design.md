## Context

Ver `proposal.md` para a motivação e escopo de alto nível. Atualmente a plataforma está funcional para o Módulo 01 (Web local, Android `.APK` via Capacitor 7 e EPUB 3 via `scripts/build-epub.mjs`) com sincronização em nuvem via Firebase Firestore (`study_state/default` e `session_audios`) e Internet Archive IAS3.

As principais restrições encontradas na auditoria do código atual são:
- `scripts/compile-content.mjs`, `scripts/validate-content.mjs` e `scripts/build-epub.mjs` possuem caminhos hardcoded para `content/modulo-01` e `modulo-01-kindle-colorsoft.epub`.
- `src/App.tsx`, `src/components/AnalyticsDashboard.tsx`, `src/components/QuizEngine.tsx` e `src/utils/nativeExport.ts` assumem uma única lista de capítulos (`MODULE_01_CHAPTERS`) e exibem contagens/textos fixos do Módulo 01 (ex.: `studyState.completedChapters.length` global).
- `src/utils/audioStorage.ts` grava `moduleId: 1` fixo ao criar metadados de áudio, e `src/components/ChapterReader.tsx` não repassa `chapter.module` para `SessionAudioPanel`.
- O Firestore já possui dados salvos do Módulo 01 (`m01-s01`..`m01-s11` e sessões `1.1`..`1.11`), que devem continuar funcionando sem migração destrutiva.

## Goals / Non-Goals

**Goals:**
- Tornar o pipeline de compilação, validação e geração de `.EPUB` agnóstico ao número de módulos, descobrindo metadados dos 12 módulos em `Docs/modulo-XX-*.md` e conteúdos em `content/modulo-XX/`.
- Criar a Página Inicial (`CourseHome`) com resumo consolidado do curso e mini-dashboards acionáveis por módulo, combinada com um dropdown de troca rápida de módulo no cabeçalho.
- Garantir isolamento completo de métricas, listas de sessões, provas, exportação `.EPUB` e `moduleId` de áudios por módulo.
- Consolidar o build mobile em um único instalador Android (`dist-android/engenharia-software-ia.apk`) mantendo o `appId` `com.will.engenhariasoftwareia`.

**Non-Goals:**
- Escrever capítulos, gerar imagens PNG ou criar questões do Módulo 02 nesta change (escopo exclusivo da Change 2: `conteudo-modulo-02`).
- Alterar o schema do documento `study_state/default` ou migrar registros existentes no Firebase Firestore.
- Adicionar áudio ou JavaScript interativo dentro dos arquivos `.EPUB` do Kindle Colorsoft.

## Decisions

### 1. Catálogo Auto-Descoberto e Contratos em `src/types/course.ts` + `scripts/compile-content.mjs`
- **Decisão:** Estender `src/types/course.ts` com `CourseModuleInfo` (`id`, `code`, `title`, `track`, `suggestedHours`, `technicalFocus`, `docFile`, `status: 'available' | 'planned'`, `sessionsCount`, `questionsCount`, `epubFileName`, `coverImageUrl`).
- O `scripts/compile-content.mjs` lerá todos os `Docs/modulo-XX-*.md` ordenados numericamente para extrair automaticamente os metadados estruturados (que já seguem o mesmo cabeçalho padrão nos 12 arquivos) e em seguida varrerá todas as pastas `content/modulo-XX/` que contenham capítulos `.md`.
- Para cada módulo encontrado em `content/modulo-XX/`, copiará seus assets para `public/course-assets/modulo-XX/`, reescreverá links `../assets/...` para `./course-assets/modulo-XX/...` e gerará `src/generated/courseData.ts` exportando `COURSE_MODULES`, `ALL_CHAPTERS`, `ALL_QUIZZES` além de aliases retrocompatíveis (`MODULE_01_CHAPTERS`, `MODULE_01_QUIZZES`) para segurança durante a transição.
- **Alternativa considerada:** Manter um arquivo JSON manual com a lista de módulos. *Rejeitado* porque `Docs/modulo-XX-*.md` já é a fonte canônica do currículo; a descoberta automática torna a inclusão dos Módulos 02 a 12 plug-and-play.

### 2. Validação Global Multi-Módulo (`scripts/validate-content.mjs`)
- **Decisão:** Iterar todas as pastas `content/modulo-*` existentes em ordem numérica. Além das validações existentes por capítulo e questão (frontmatter, LaTeX/KaTeX, existência de imagens, campos obrigatórios, distribuição de `cognitiveLevel`), verificar:
  - Unicidade global de `chapter.id`, `session` (`sessionId`) e `question.id` entre todos os módulos (garantindo ausência de colisão no Firestore).
  - Coerência entre `chapter.module` / `quiz.moduleId` e o diretório `modulo-XX`, além de checar se `chapterAnchor` aponta para um heading existente ou `<a id="...">` declarado no capítulo correspondente (aceitando formatos `slug-da-secao` e `cap-slug#slug-da-secao`).
- **Alternativa considerada:** Validar cada módulo em scripts separados. *Rejeitado* porque apenas uma validação unificada garante unicidade global de IDs antes do deploy.

### 3. Gerador EPUB Independente por Módulo (`scripts/build-epub.mjs`)
- **Decisão:** Refatorar `scripts/build-epub.mjs` para aceitar um parâmetro opcional CLI (`--module=02` ou `2`) e, quando omitido, gerar um `.epub` independente para cada módulo disponível em `content/modulo-*`.
- Cada arquivo será salvo em `dist-kindle/modulo-XX-kindle-colorsoft.epub` e `public/downloads/modulo-XX-kindle-colorsoft.epub`, utilizando `cover-modulo-XX.png` (quando presente), título, descrição, contagem dinâmica de capítulos/provas e `dc:identifier` (`urn:uuid:engenharia-ia-modulo-XX-2026`) próprios, preservando integralmente o conversor LaTeX $\rightarrow$ XHTML, os tokens PUA (`\uE001`–`\uE006`) e a auto-auditoria XHTML.
- **Alternativa considerada:** Compilar um único `.epub` gigante com todos os módulos juntos. *Rejeitado* (e alinhado com a escolha do usuário) porque livros por módulo mantêm o arquivo enxuto, rápido no Send to Kindle e organizado como série no Kindle Colorsoft.

### 4. Navegação: Página Inicial (`CourseHome`) + Dropdown Direto no Cabeçalho (`App.tsx`)
- **Decisão:** Introduzir o estado `activeView: 'home' | 'module'` em `src/App.tsx`, iniciando em `'home'` com `selectedModuleId` inicializado no primeiro módulo disponível (ou atualizado ao abrir um módulo).
- **Página Inicial (`src/components/CourseHome.tsx`):**
  - Exibe cabeçalho com métricas globais do curso (módulos disponíveis, total de capítulos lidos, total de provas avaliadas, média global de acertos).
  - Renderiza um grid responsivo com todos os módulos do catálogo (`COURSE_MODULES`):
    - Módulos disponíveis mostram status (`Concluído`, `Em andamento`, `Não iniciado`), barra de leitura, sessões avaliadas, maestria média, subtópicos críticos/em atenção, botão principal (`Abrir Módulo` / `Continuar Sessão X.Y`), atalhos para `Provas`, `Dashboard` e download independente `.EPUB`.
    - Módulos planejados (`03`..`12` ou `02` antes da Change 2) mostram metadados da ementa (`Trilha`, `Carga Horária`, `Foco Técnico`) com badge `Em breve` e ações desabilitadas.
- **Dropdown no Topo (`App.tsx`):**
  - Select estilizado (acessível tanto no Desktop quanto no Mobile dentro da top bar) com a opção `Início (Todos os Módulos)` seguida por todos os módulos disponíveis (`Módulo 01 — ...`, `Módulo 02 — ...`), permitindo pular diretamente para outro módulo sem passar pela Home.
  - Clicar na marca/logo no topo também retorna para `'home'`.
- **Alternativa considerada:** Colocar todos os módulos em um grande accordion na sidebar lateral. *Rejeitado* porque a sidebar fica poluída ao crescer para 12 módulos (~100+ sessões) e não oferece visão executiva de progresso logo ao abrir o app.

### 5. Isolamento por Módulo, Correção de `moduleId` em Áudios e APK Único
- **Decisão:**
  - **Filtro rigoroso por módulo:** No `App.tsx`, derivar `moduleChapters`, `moduleQuizzes`, `moduleChapterIds` e `moduleSessionIds` do `selectedModuleId`. A contagem `lidos` na sidebar e no `AnalyticsDashboard` conta apenas capítulos pertencentes ao módulo ativo; `QuizEngine` exibe apenas sessões e questões do módulo ativo (sincronizando `selectedSessionId` via `useEffect` quando `initialSessionId` ou `chapters` mudam); `AnalyticsDashboard` remove textos hardcoded de "Módulo 01" / "11 sessões" e calcula diagnósticos sobre `chapters` e `quizzes` recebidos por prop.
  - **Badge `padStart(2, '0')`:** Em `ChapterReader.tsx` e demais componentes, formatar o número do módulo com `String(chapter.module).padStart(2, '0')` em vez de `Módulo 0{chapter.module}` (evitando `"Módulo 010"` no futuro).
  - **Áudios com `moduleId` dinâmico:** Adicionar prop `moduleId: number` em `SessionAudioPanel.tsx`, repassar `chapter.module` a partir de `ChapterReader.tsx` e atualizar `uploadAndSaveSessionAudio` (e `syncSessionAudios` / `mapCloudMetaToTrack`) em `src/utils/audioStorage.ts` para receber `moduleId` opcional (com fallback derivando o inteiro antes do ponto em `sessionId`, ex.: `"2.1"` $\rightarrow$ `2`, default `1`). Os painéis de Áudio e Vídeo permanecem fechados por padrão ao abrir ou trocar de capítulo.
  - **Exportador EPUB dinâmico (`src/utils/nativeExport.ts`):** `exportKindleEpub(moduleInfo)` resolve `./downloads/${moduleInfo.epubFileName}` e o nome de saída correspondente, suportando tanto download Web quanto `Filesystem` + `Share` nativo no Android.
  - **APK Único:** Atualizar o passo final de empacotamento Android para copiar o APK gerado para `dist-android/engenharia-software-ia.apk` mantendo `capacitor.config.json` (`appId: com.will.engenhariasoftwareia`), garantindo atualização *in-place* no celular sem perda de cache local.

## Risks / Trade-offs

- **[Risk] Crescimento do bundle `src/generated/courseData.ts` quando o curso atingir 12 módulos** $\rightarrow$ *Mitigação:* Com 1–3 módulos (~500 KB–1.5 MB de Markdown/JSON) o import direto é instantâneo e 100% offline no APK; quando houver 6+ módulos, a interface de `COURSE_MODULES` já permite converter capítulos em lazy chunks por módulo sem alterar componentes React.
- **[Risk] Botão de header no Mobile ficar apertado com o dropdown de módulos adicionado** $\rightarrow$ *Mitigação:* Usar rótulo compacto no mobile (`M01` / `Início` no `<select>` em telas `< sm`, mantendo título completo no desktop) e testar largura em viewport mobile durante a verificação visual.
- **[Risk] Diferença entre formatos de `chapterAnchor` no Módulo 01 (`cap-XX#secao`) vs âncoras simples (`#secao`)** $\rightarrow$ *Mitigação:* `ChapterReader.tsx` já usa `targetAnchor.split('#').pop()`; o validador `validate-content.mjs` deve aceitar ambos os formatos validando o slug final contra os headings/âncoras do capítulo daquela sessão.
