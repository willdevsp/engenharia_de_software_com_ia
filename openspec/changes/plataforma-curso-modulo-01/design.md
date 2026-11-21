## Context

See `proposal.md` for motivation and scope.
O ambiente de desenvolvimento local Windows já dispõe de **Node.js v24.11.0**, **Java JDK 11+**, **Android SDK** (`$env:LOCALAPPDATA\Android\Sdk` com `build-tools` e `platforms`) e **ADB (`adb.exe`)**, enquanto o utilitário externo `pandoc` não está instalado. Portanto, toda a cadeia de compilação (Web App Desktop, pacote `.APK` Android e gerador `.EPUB` para o Kindle Colorsoft) deve operar nativamente sobre o ecossistema Node.js/TypeScript e o Android SDK local.

## Goals / Non-Goals

**Goals:**
- Unificar o conteúdo das 11 sessões do Módulo 01 em uma fonte única de verdade (`content/modulo-01/`) composta por Markdown estruturado, imagens rasterizadas de alta resolução (`.png`/`.jpg`) e bancos de questões JSON tipados (até 30 questões por sessão).
- Garantir qualidade de livro técnico através da skill `.agents/skills/course-content-reviewer/SKILL.md` que audita cada capítulo e prova contra as documentações oficiais mapeadas em `Docs/modulo-01-fundamentos-ia-e-llms.md`.
- Compilar a mesma base de código e conteúdo para 3 alvos:
  1. **Desktop Local** (aplicação web local rápida com persistência em `localStorage`/`IndexedDB`).
  2. **Android Nativo Offline (`.APK`)** via **Capacitor** (`@capacitor/core`, `@capacitor/android`) compilado com Gradle + Android SDK local.
  3. **Kindle Colorsoft (`.EPUB`)** via gerador EPUB 3 em Node.js puro compatível com **Send to Kindle**.
- Prover diagnóstico granular de aprendizado (*"O que posso melhorar"*) cruzando taxas de acerto por `subtopic_tag` e `cognitive_level`.

**Non-Goals:**
- Implementar na Fase 1 o player de áudio do Gemini Notebook, player de vídeo ou integração de chat ao vivo com a API do Gemini (apenas o contrato de dados/UI fica preparado para as Fases 2 e 3).
- Produzir o conteúdo completo dos Módulos 02 a 12 nesta mudança (o foco de conteúdo desta mudança é o **Módulo 01 completo com suas 11 sessões**, embora a arquitetura suporte todos os 12 módulos).
- Depender de backend remoto ou banco de dados em nuvem (o sistema é 100% *Local-First* e offline-capable).

## Decisions

### 1. Stack Multiplataforma Desktop + Android APK: Vite + React/TypeScript + Tailwind + Capacitor
- **Decisão:** Construir a interface da plataforma como uma Single-Page Application (SPA) estática com **Vite + React + TypeScript + Tailwind CSS**, empacotada para Android via **Capacitor (`@capacitor/android`)**.
- **Racional:**
  - Roda instantaneamente no Desktop local (`npm run dev` ou build estático local).
  - Empacota todos os capítulos compilados, imagens e bancos de 30 questões por sessão dentro do bundle estático (`dist/`), permitindo que o `.APK` gerado pelo Capacitor funcione **100% offline** no celular Android sem precisar de servidor externo.
  - Já utiliza o Android SDK presente em `$env:LOCALAPPDATA\Android\Sdk` para gerar o `.apk` via `gradlew assembleDebug`.
- **Alternativas consideradas:**
  - *React Native / Flutter:* Exigiria duplicar o motor de renderização de Markdown/código e dificultaria o reuso direto no Desktop web.
  - *PWA puro sem APK:* Descartado pois o usuário escolheu explicitamente a distribuição via arquivo `.APK` instalável.

### 2. Pipeline de Gráficos para Desktop, Android e Kindle Colorsoft (Nano Banana + Docs Oficiais)
- **Decisão:** Todos os diagramas e ilustrações técnicas serão armazenados como arquivos de imagem física (`.png` ou `.jpg`) em `content/modulo-01/assets/`, gerados via subagente `image-generator` (**Nano Banana**) ou obtidos das documentações oficiais.
- **Racional:**
  - O **Kindle Colorsoft** não executa JavaScript (portanto, diagramas Mermaid baseados em runtime JS falhariam no EPUB).
  - A tela E-Ink colorida *Kaleido 3* do Kindle Colorsoft exibe 150 PPI em cores com refletância de papel; fundos escuros reduzem drasticamente o contraste. Por isso, todos os prompts enviados ao Nano Banana seguirão o padrão visual *"Technical Book Illustration on Crisp White/Warm Paper Background (`#FFFFFF`), High-Contrast Ink Lines, Clear Color Coding, Large Legible Labels"*.

### 3. Gerador de EPUB 3 Nativo em Node.js para o Send to Kindle
- **Decisão:** Implementar um compilador próprio em Node.js (`scripts/build-epub.ts`) que converte os 11 capítulos Markdown (`marked` + `highlight.js` inline styles), embute as imagens RGB e empacota a estrutura padrão **EPUB 3** (container XML, `content.opf`, `nav.xhtml`, `toc.ncx`, folhas de estilo CSS otimizadas para Kindle KFX) usando `jszip`.
- **Racional:**
  - Não depende da instalação do Pandoc no Windows.
  - Controle total sobre o HTML/CSS interno para evitar que blocos de código JavaScript ou tabelas quebrem de forma ilegível no Kindle Colorsoft, além de gerar hiperlinks internos clicáveis entre o **Caderno de Questões** ao final de cada capítulo e o **Gabarito Comentado**.

### 4. Arquitetura do Motor de Provas e Algoritmo "O que Melhorar"
- **Decisão:** Cada sessão $S \in \{1.1 \dots 1.11\}$ terá um arquivo `content/modulo-01/quizzes/quiz-sXX.json` com até 30 questões seguindo o contrato:
  ```typescript
  interface QuizQuestion {
    id: string;                 // ex: "m01-s03-q14"
    sessionId: string;          // ex: "1.3"
    subtopicTag: string;        // ex: "Gerenciamento de Memória GPU (tf.tidy)"
    cognitiveLevel: "conceptual" | "architecture" | "code-practice";
    difficulty: "foundation" | "intermediate" | "advanced";
    question: string;
    codeSnippet?: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;        // Explicação técnica detalhada do gabarito
    chapterAnchor: string;      // ex: "cap-03-web-ml#memoria-gpu"
    officialDocUrl: string;     // Link direto para a seção da doc oficial
    officialDocLabel: string;
  }
  ```
- **Algoritmo de Diagnóstico ("O que posso melhorar"):**
  - O motor agrega todas as respostas da última tentativa (ou histórico ponderado) agrupadas por `subtopicTag` e por `cognitiveLevel`.
  - Qualquer `subtopicTag` com taxa de acerto $< 75\%$ é classificado como **Lacuna Prioritária** (Crítica se $< 50\%$, Atenção se $50\%\text{–}74\%$).
  - Para cada lacuna, o dashboard gera um card acionável com:
    1. Taxa de acerto atual no subtópico.
    2. Botão **"Revisar no Capítulo"** (abre o leitor exatamente no `chapterAnchor`).
    3. Botão **"Consultar Doc Oficial"** (abre o `officialDocUrl`).
    4. Botão **"Treinar Lacuna"** (inicia um mini-simulado no modo *Caderno de Erros* filtrando apenas as questões daquele `subtopicTag` ou erradas anteriormente).

### 5. Arquitetura da Skill `course-content-reviewer`
- **Decisão:** Criar `.agents/skills/course-content-reviewer/SKILL.md` com um checklist determinístico e rubrica de auditoria em 4 dimensões:
  1. **Verificação de Documentação Oficial:** Confere se todos os links da sessão em `Docs/modulo-01-fundamentos-ia-e-llms.md` foram contemplados e se o código/conceito reflete a API real.
  2. **Profundidade de Livro Técnico:** Verifica se o capítulo explica a teoria, a arquitetura interna, exemplos de código comentados e laboratório prático sem resumos superficiais.
  3. **Auditoria Visual Colorsoft:** Verifica a existência física dos arquivos de imagem, ausência de dependência de JS para diagramas no EPUB e legibilidade/contraste em fundo claro.
  4. **Auditoria da Prova (até 30 questões):** Verifica a cobertura de todos os subtópicos da sessão, distribuição entre os 3 níveis cognitivos, precisão do gabarito e presença das explicações e âncoras de diagnóstico.

## Risks / Trade-offs

- **[Risk] Volume e densidade de conteúdo (11 capítulos completos + até 330 questões comentadas + ilustrações Nano Banana)** $\rightarrow$ **Mitigação:** Estruturar um pipeline de compilação de dados (`scripts/compile-content.ts`) e produzir/auditar os capítulos e bancos de questões em lotes modulares verificados pela skill `course-content-reviewer`.
- **[Risk] Divergência de histórico de provas entre o Desktop e o `.APK` no celular Android** $\rightarrow$ **Mitigação:** Implementar na barra superior do Dashboard a função de **Exportar / Importar Progresso (`.json`)** com merge inteligente de tentativas por `attemptId` e timestamp.
- **[Risk] Imagens muito pesadas inflando o tamanho do `.APK` e do `.EPUB`** $\rightarrow$ **Mitigação:** Otimizar as imagens geradas/incorporadas para resolução ideal de leitura ($\sim 1200\text{px}$ de largura em PNG/JPEG otimizado), mantendo o `.EPUB` e o `.APK` leves e rápidos.
