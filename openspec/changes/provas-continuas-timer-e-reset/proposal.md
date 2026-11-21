## Why

Hoje, nas provas individuais por sessão, as alternativas marcadas ficam apenas em memória temporária (`useState`) e são perdidas ao navegar para o capítulo ou recarregar o app; além disso, testar a mesma questão repetidas vezes infla a contagem de tentativas e salvar questões não respondidas como índice `-1` cria "Lacunas" falsas no Dashboard. Em contraste, a Prova Final do Módulo precisa ser realizada de uma única vez com tempo calculado dinamicamente pela quantidade e complexidade de cada questão, e o usuário precisa de um controle seguro para resetar todo o progresso local e na nuvem quando desejar começar do zero.

## What Changes

- **Persistência Contínua nas Provas de Sessão (`continuous-session-quiz-persistence`):**
  - Salvar imediatamente no `localStorage` e sincronizar com o Firebase Firestore cada alternativa marcada nas provas individuais de sessão (`questionAnswers`), mantendo o progresso ao navegar entre abas, fechar o navegador ou retomar no Android.
  - Contabilizar progresso e diagnósticos por questão única respondida (responder à mesma questão várias vezes apenas atualiza aquela resposta, sem multiplicar contagens nem gerar tentativas vazias).
  - Impedir que questões deixadas em branco (`selectedOptionIndex < 0`) sejam contabilizadas como erros ou gerem lacunas falsas, sanitizando tentativas legadas e adicionando botão de confirmação para limpar/recomeçar uma sessão (`sessionResetLog`).
- **Prova Final do Módulo Cronometrada de Uma Única Vez (`timed-module-final-exam`):**
  - Exigir início explícito na aba da Prova Oficial do Módulo (Chance 1/3 até 40q e Provas Extras 2/3 e 3/3) por meio de uma tela de preparação que exibe o **Tempo Total Calculado** questão a questão conforme dificuldade (`foundation: 60s`, `intermediate: 90s`, `advanced: 120s`), nível cognitivo (`conceptual: +0s`, `architecture: +15s`, `code-practice: +30s`) e presença de snippet de código (`+15s`).
  - Exibir cronômetro regressivo contínuo baseado no instante `currentAttemptStartedAt` persistido em banco (`moduleMastery`), preservando rascunho em tempo real durante a prova e realizando entrega automática ao atingir `00:00`.
- **Reset Total Seguro e Sanitização de Estado (`progress-reset-and-sanitization`):**
  - Adicionar ação **"Resetar Todo o Progresso (Começar do Zero)"** com confirmação em 2 cliques no `CloudSettingsModal` e no `AnalyticsDashboard`, zerando `localStorage` e `study_state/default` no Firestore sem afetar `session_audios`, protegida por `globalResetAt` para evitar ressurreição de progresso antigo em merges multi-dispositivo.

## Capabilities

### New Capabilities
- `continuous-session-quiz-persistence`: Salvamento contínuo por questão nas provas de sessão (`questionAnswers`), contagem por questões únicas, exclusão de respostas em branco do cálculo de lacunas e limpeza controlada por sessão.
- `timed-module-final-exam`: Tela de preparação e cronômetro regressivo contínuo baseado em quantidade e complexidade na Prova Final do Módulo e Provas Extras, com entrega automática ao término do tempo.
- `progress-reset-and-sanitization`: Reset total local e Firebase Firestore (`study_state/default`) com carimbo `globalResetAt` e sanitização de respostas em branco legadas.

### Modified Capabilities
<!-- Complementa as capabilities existentes preservando compatibilidade com `study_state/default` e `session_audios`. -->

## Impact

- **Tipos e Persistência:** `src/types/course.ts`, `src/utils/storage.ts`, `src/utils/cloudSync.ts`, `src/utils/masteryGate.ts`.
- **Interface React:** `src/components/QuizEngine.tsx`, `src/components/AnalyticsDashboard.tsx`, `src/components/CourseHome.tsx`, `src/components/CloudSettingsModal.tsx`, `src/App.tsx`.
