## 1. Contratos de Estado, Sanitização e Sync Multi-Dispositivo

- [x] 1.1 Atualizar `src/types/course.ts` adicionando `QuestionAnswerEntry`, os campos de timer/rascunho em `ModuleExamCycle` (`currentAttemptStartedAt`, `currentAttemptTimeLimitSeconds`, `draftAnswers`), e `questionAnswers`, `sessionResetLog` e `globalResetAt` em `UserStudyState`; verificar com `npx tsc --noEmit`.
- [x] 1.2 Atualizar `src/utils/storage.ts` com sanitização de respostas em branco (`selectedOptionIndex < 0`), `recordSessionQuestionAnswer`, `clearSessionQuestionAnswers`, `createEmptyStudyState`, reconciliação `globalResetAt`/`sessionResetLog`/`questionAnswers` em `mergeStudyStates` e `areStudyStatesEqual`, e diagnósticos baseados em questões únicas em `computeCatalogModuleMetrics`, `computeSubtopicDiagnostics`, `computeCognitiveBreakdown` e `getMissedQuestionIds`; verificar com testes unitários determinísticos.
- [x] 1.3 Atualizar `src/utils/cloudSync.ts` adicionando `resetStudyStateLocalAndCloud()` para zerar `localStorage` e `study_state/default` preservando `session_audios`; verificar com `npx tsc --noEmit`.

## 2. Cálculo de Timer por Complexidade e Estado Cronometrado da Prova Final

- [x] 2.1 Atualizar `src/utils/masteryGate.ts` implementando `computeQuestionTimeSeconds`, `computeModuleExamTiming`, `startTimedModuleExamAttempt`, `updateTimedModuleExamDraftAnswer` e limpeza dos campos de timer/rascunho em `submitModuleExamAttempt`; verificar via script de testes cobrindo soma de tempos e transição de rascunho.

## 3. UI Contínua, Cronômetro da Prova Final e Botão de Reset

- [x] 3.1 Atualizar `src/components/QuizEngine.tsx` para persistir respostas de sessão continuamente via `questionAnswers`, exibir contadores reais por questão única, adicionar botão de 2 cliques para limpar/recomeçar a sessão, e implementar tela de preparação + cronômetro regressivo contínuo + preservação de `draftAnswers` + auto-envio em `00:00` na Prova Oficial do Módulo e Provas Extras.
- [x] 3.2 Atualizar `src/components/CloudSettingsModal.tsx`, `src/components/AnalyticsDashboard.tsx`, `src/components/CourseHome.tsx` e `src/App.tsx` conectando os handlers de resposta contínua por questão, limpeza de sessão, timer/rascunho da prova oficial, métricas únicas na Home/Dashboard e botão em 2 cliques **"Resetar Todo o Progresso (Começar do Zero)"**.

## 4. Limpeza do Firebase, Validação Web/APK, E2E e Entrega

- [x] 4.1 Zerar o documento `study_state/default` atual no Firebase Firestore do usuário (mantendo `session_audios` intacto) e confirmar a limpeza real no Firestore.
- [x] 4.2 Executar `npm run validate:content`, `npx tsc --noEmit`, `npm run build` e `npm run android:apk` atualizando `dist-android/engenharia-software-ia.apk`.
- [x] 4.3 Executar testes Playwright E2E validando persistência contínua ao sair/voltar, contagem única sem lacunas falsas ao responder 6x a mesma pergunta, tela de preparação + timer regressivo da Prova Final e botão de Reset Total em 2 cliques (mantendo Firestore zerado após o teste); fazer commit e push na `develop`.
