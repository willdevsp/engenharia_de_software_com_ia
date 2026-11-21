## Context

Os requisitos detalhados estão em [proposal.md](./proposal.md) e nas especificações `continuous-session-quiz-persistence`, `timed-module-final-exam` e `progress-reset-and-sanitization`.

## Goals / Non-Goals

**Goals:**
- Persistir respostas de treino por sessão imediatamente a cada clique sem duplicar contagens ao responder repetidas vezes e sem contaminar lacunas com questões em branco (`-1`).
- Garantir que a Prova Oficial do Módulo (Chance 1/3 até 40q e Extras 2/3 e 3/3) funcione como exame único cronometrado pela soma da complexidade de cada questão.
- Permitir reset completo (Local + Firebase `study_state/default`) seguro entre múltiplos dispositivos e sanitizar o banco atual do usuário.

**Non-Goals:**
- Pausar cronômetro da Prova Final do Módulo ao sair da tela (o relógio é contínuo a partir de `currentAttemptStartedAt`).
- Remover áudios em `session_audios` ou Bucket do Archive.org ao resetar o progresso de estudo.

## Decisions

### 1. Modelo de Respostas Contínuas (`QuestionAnswerEntry`) e Reconciliação
- Em `UserStudyState`, `questionAnswers: Record<string, QuestionAnswerEntry>` armazena a resposta mais recente de cada questão respondida nos treinos de sessão, indexada por `questionId` (atualizar a mesma questão 6x sobrescreve a mesma chave com novo `updatedAt`, mantendo contagem exata `1`).
- `sessionResetLog: Record<string, string>` grava quando o usuário limpou uma sessão manualmente; em `mergeStudyStates`, qualquer `questionAnswers` ou `quizAttempts` daquela sessão com timestamp `<= sessionResetLog[sessionId]` (ou `<= max(globalResetAt)`) é descartado.
- Em `normalizeStudyState`: filtra `attempt.answers.filter(a => a.selectedOptionIndex >= 0)` para que questões não marcadas jamais entrem como erradas.
- Diagnósticos (`computeCatalogModuleMetrics`, `computeSubtopicDiagnostics`, `computeCognitiveBreakdown`, `getMissedQuestionIds`) constroem um mapa unificado por `questionId` comparando cronologicamente `quizAttempts` válidos + `questionAnswers`.

### 2. Cálculo do Timer da Prova Final e Ciclo Cronometrado
- `computeQuestionTimeSeconds(q)`: `60` (`foundation`) / `90` (`intermediate`) / `120` (`advanced`) + `0` (`conceptual`) / `15` (`architecture`) / `30` (`code-practice`) + `15` (se `q.codeSnippet?.trim()`).
- `ModuleExamCycle` recebe `currentAttemptStartedAt?: string | null`, `currentAttemptTimeLimitSeconds?: number | null` e `draftAnswers?: Record<string, number>`.
- Ao clicar **"Iniciar Prova Cronometrada Agora"**, grava `currentAttemptStartedAt = now` e `currentAttemptTimeLimitSeconds` no `activeCycle` em `moduleMastery[modKey]` (`localStorage` + Cloud Sync). Cada alternativa clicada atualiza `draftAnswers[qId]`. Ao atingir `00:00` ou clicar no envio, `submitModuleExamAttempt` avalia, limpa `currentAttemptStartedAt`/`draftAnswers` e consolida o ciclo normalmente.

### 3. Reset Total (`globalResetAt` + `resetStudyStateLocalAndCloud`)
- `createEmptyStudyState(now)` seta `globalResetAt: now`, `lastUpdated: now`, e todos os coletores vazios.
- `mergeStudyStates(local, remote)` identifica `maxGlobalResetMs = max(local.globalResetAt, remote.globalResetAt)`: caso um lado tenha `globalResetAt` mais recente que todos os registros antigos do outro dispositivo, impede que progresso pré-reset volte na sincronização.
- `resetStudyStateLocalAndCloud()` grava o estado limpo no `localStorage` e faz `setDoc(doc(db, 'study_state', 'default'), stripUndefined(emptyState))` imediatamente (sem mexer em `session_audios`).

## Risks / Trade-offs
- **Risco:** Usuário inicia Prova Final cronometrada, sai por 2 horas e volta com tempo esgotado (`remainingSeconds === 0`) -> **Mitigação:** Auto-submissão automática ao reabrir a tela com os rascunhos salvos em `draftAnswers`, garantindo a regra de prova em uma única vez sem travar a interface.
