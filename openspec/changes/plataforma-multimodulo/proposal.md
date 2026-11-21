## Why

A plataforma atual do curso está acoplada ao **Módulo 01** tanto nos scripts de build/validação/EPUB quanto na interface Web/Android e no registro de `moduleId` dos áudios na nuvem. Evoluir a arquitetura agora para suporte **multi-módulo** (Módulos 01 a 12) com Página Inicial em mini-dashboards, alternância direta via dropdown no topo e exportação `.EPUB` independente por módulo destrava a entrada limpa do Módulo 02 (`conteudo-modulo-02`) e dos demais módulos sem refatorações repetidas.

## What Changes

- **Catálogo e Pipeline de Conteúdo Multi-Módulo:**
  - Generalização de `scripts/compile-content.mjs` para descobrir automaticamente os metadados dos 12 módulos em `Docs/modulo-XX-*.md` (título, trilha, carga horária, foco técnico) e compilar todos os diretórios `content/modulo-XX/` disponíveis para `public/course-assets/modulo-XX/` e `src/generated/courseData.ts`.
  - Generalização de `scripts/validate-content.mjs` para validar todos os módulos disponíveis, garantindo unicidade global de `chapter.id`, `sessionId` e `question.id`, além de verificar se cada `chapterAnchor` aponta para um capítulo/âncora válido.
  - Generalização de `scripts/build-epub.mjs` para gerar um arquivo `.EPUB` 3 independente por módulo disponível (`dist-kindle/modulo-XX-kindle-colorsoft.epub` e `public/downloads/modulo-XX-kindle-colorsoft.epub`), com capa, metadados, UUID e contagens próprios, mantendo compatibilidade total com o Kindle Colorsoft e zero áudios embutidos.
- **Página Inicial de Módulos (`CourseHome`) e Dropdown Direto no Topo:**
  - Criação da Página Inicial exibindo um resumo consolidado do curso e um card/mini-dashboard por módulo (status Concluído / Em andamento / Não iniciado / Em breve, progresso de leitura, sessões avaliadas, maestria média, lacunas abertas, ação rápida para abrir/continuar o módulo e botão individual de download/envio do `.EPUB`).
  - Adição de seletor dropdown persistente no cabeçalho (`App.tsx`) permitindo alternar diretamente entre `Início (Todos os Módulos)` e qualquer módulo disponível sem precisar retornar à Página Inicial.
- **Isolamento por Módulo, `moduleId` Dinâmico na Nuvem e APK Único:**
  - Filtro de progresso, capítulos concluídos, sessões da sidebar, motor de provas (`QuizEngine`) e `AnalyticsDashboard` pelo módulo ativo (com toggle ou visão isolada coerente sem contaminar contagens entre módulos).
  - Atualização de `src/utils/nativeExport.ts` para baixar/compartilhar o `.EPUB` correspondente ao módulo selecionado.
  - Correção de `src/utils/audioStorage.ts`, `src/components/SessionAudioPanel.tsx` e `src/components/ChapterReader.tsx` para propagar o `moduleId` dinâmico (removendo `moduleId: 1` hardcoded) para Firebase Firestore (`session_audios`) e Archive.org, mantendo os painéis de Áudio e Vídeo fechados por padrão.
  - Preservação total de retrocompatibilidade com os documentos já existentes em `study_state/default` e `session_audios` no Firestore e padronização do instalador Android único do curso (`dist-android/engenharia-software-ia.apk`).

## Capabilities

### New Capabilities
- `multi-module-platform`: Descoberta automática e validação de múltiplos módulos (`Docs/` + `content/modulo-XX/`), Página Inicial com mini-dashboards por módulo, seletor dropdown de módulos no cabeçalho, isolamento de métricas/provas/áudios (`moduleId` dinâmico), exportação `.EPUB` independente por módulo e APK único do curso.

### Modified Capabilities
<!-- Nenhuma capability existente é alterada em nível de requisito; mantém compatibilidade integral com `cloud-audio-sync-and-cache` e `cloud-progress-sync`. -->

## Impact

- **Scripts de Conteúdo e EPUB:** `scripts/compile-content.mjs`, `scripts/validate-content.mjs`, `scripts/build-epub.mjs`.
- **Tipos e Utilitários:** `src/types/course.ts`, `src/utils/audioStorage.ts`, `src/utils/nativeExport.ts`.
- **Interface React:** Novo componente `src/components/CourseHome.tsx`; atualização de `src/App.tsx`, `src/components/ChapterReader.tsx`, `src/components/QuizEngine.tsx`, `src/components/AnalyticsDashboard.tsx`, `src/components/SessionAudioPanel.tsx`.
- **Artefatos Gerados e Builds:** `src/generated/courseData.ts`, `public/course-assets/modulo-XX/`, `public/downloads/modulo-XX-kindle-colorsoft.epub`, `dist-kindle/modulo-XX-kindle-colorsoft.epub`, `dist-android/engenharia-software-ia.apk`.
