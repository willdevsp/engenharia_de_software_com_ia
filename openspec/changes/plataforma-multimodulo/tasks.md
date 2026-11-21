## 1. Contratos de Dados e Pipeline de Conteúdo Multi-Módulo

- [x] 1.1 Atualizar `src/types/course.ts` adicionando a interface `CourseModuleInfo` (com status `available | planned`, metadados curriculares, `sessionsCount`, `questionsCount`, `epubFileName` e `coverImageUrl`) e verificar que `npx.cmd tsc --noEmit` passa após atualização dos consumidores
- [x] 1.2 Generalizar `scripts/compile-content.mjs` para descobrir automaticamente metadados de `Docs/modulo-XX-*.md` e compilar todas as pastas `content/modulo-XX/` para `public/course-assets/modulo-XX/` e `src/generated/courseData.ts` (`COURSE_MODULES`, `ALL_CHAPTERS`, `ALL_QUIZZES` e aliases retrocompatíveis); verificar executando `node scripts/compile-content.mjs` e inspecionando os 12 módulos gerados
- [x] 1.3 Generalizar `scripts/validate-content.mjs` para validar todos os módulos disponíveis, checar unicidade global de `chapter.id`, `sessionId` e `question.id` e validar a existência de `chapterAnchor` nos capítulos correspondentes; verificar executando `node scripts/validate-content.mjs` com saída `VALID`
- [x] 1.4 Generalizar `scripts/build-epub.mjs` para gerar `dist-kindle/modulo-XX-kindle-colorsoft.epub` e `public/downloads/modulo-XX-kindle-colorsoft.epub` para cada módulo disponível (com suporte opcional a `--module=XX`, capa/título/UUID próprios e auto-auditoria XHTML); verificar executando `node scripts/build-epub.mjs` sem falhas de auditoria

## 2. Exportação EPUB Independente e `moduleId` Dinâmico para Áudios

- [x] 2.1 Atualizar `src/utils/nativeExport.ts` para aceitar o módulo alvo (arquivo `epubFileName` e título) ao baixar no navegador Desktop ou compartilhar via Capacitor `Share` no Android, mantendo compatibilidade padrão com o Módulo 01 e verificando com `npx.cmd tsc --noEmit`
- [x] 2.2 Atualizar `src/utils/audioStorage.ts`, `src/components/SessionAudioPanel.tsx` e `src/components/ChapterReader.tsx` para propagar o `moduleId` dinâmico do capítulo (com fallback derivado de `sessionId`), corrigir a formatação `padStart(2, '0')` no badge do módulo e manter os painéis de Áudio e Vídeo fechados por padrão ao trocar de capítulo; verificar com `npx.cmd tsc --noEmit`

## 3. Página Inicial (`CourseHome`) e Seletor Dropdown no Cabeçalho

- [x] 3.1 Criar `src/components/CourseHome.tsx` exibindo o resumo consolidado do curso e o grid de mini-dashboards para todos os 12 módulos (status Concluído / Em andamento / Não iniciado / Em breve, progresso de leitura, sessões avaliadas, maestria média, lacunas abertas, ação para continuar na próxima sessão pendente, atalhos para Provas/Dashboard e botão independente de exportação `.EPUB`); verificar renderização e tipagem via `npx.cmd tsc --noEmit`
- [x] 3.2 Refatorar `src/App.tsx` para iniciar na Página Inicial (`activeView: 'home' | 'module'`), adicionar o seletor dropdown persistente no cabeçalho (Desktop e Mobile) permitindo saltar entre `Início (Todos os Módulos)` e qualquer módulo disponível, e filtrar `moduleChapters`, `moduleQuizzes` e contagem de capítulos lidos na sidebar pelo módulo ativo; verificar navegação e responsividade no build Web

## 4. Adaptação Multi-Módulo do Motor de Provas e Dashboard do Módulo

- [x] 4.1 Atualizar `src/components/QuizEngine.tsx` para exibir o rótulo dinâmico do módulo ativo e sincronizar `selectedSessionId`, `mode` e `subtopicFilter` sempre que o usuário trocar de módulo pelo dropdown ou abrir uma prova direto da Página Inicial; verificar via `npx.cmd tsc --noEmit`
- [x] 4.2 Atualizar `src/components/AnalyticsDashboard.tsx` para receber `moduleInfo` (ou dados do módulo ativo), remover textos e contagens hardcoded do Módulo 01, filtrar capítulos concluídos e tentativas de prova pelo módulo ativo e conectar o botão `.EPUB` e exportação `.json` com identificação dinâmica do módulo; verificar via `npm.cmd run build`

## 5. Verificação End-to-End, Web, EPUB e APK Único Android

- [x] 5.1 Executar a bateria completa de validação e builds (`node scripts/validate-content.mjs`, `npx.cmd tsc --noEmit`, `npm.cmd run build` e `npm.cmd run build:kindle`) confirmando zero erros TypeScript e geração válida de `public/downloads/modulo-01-kindle-colorsoft.epub`
- [x] 5.2 Sincronizar Capacitor e compilar o instalador Android único do curso (`npx.cmd cap sync android` + `.\gradlew.bat assembleDebug` com JBR e Android SDK local), copiando o artefato gerado para `dist-android/engenharia-software-ia.apk` e validando que os testes de interface na web compilada (Home, dropdown, troca de módulo e painel de áudio fechado por padrão) funcionam sem erros no console
