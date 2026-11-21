## 1. Skill de Revisão e Infraestrutura de Conteúdo

- [x] 1.1 Criar a skill `.agents/skills/course-content-reviewer/SKILL.md` com o protocolo de auditoria em 4 dimensões (Fidelidade às Docs Oficiais, Profundidade de Livro Técnico, Compatibilidade Visual Kindle Colorsoft e Validação da Prova de até 30 questões) e verificar a existência e validade do arquivo `SKILL.md`
- [x] 1.2 Estruturar os diretórios de conteúdo `content/modulo-01/chapters/`, `content/modulo-01/assets/` e `content/modulo-01/quizzes/` com os schemas TypeScript de validação de capítulos e questões (`QuizQuestion`) e verificar que o script de validação de schema executa sem erros

## 2. Produção e Auditoria dos Capítulos e Provas do Módulo 01 (Unidades 1 a 3: Sessões 1.1 a 1.7)

- [x] 2.1 Escrever os Capítulos 1.1 (*História e Contexto da IA*) e 1.2 (*Introdução a LLMs: Transformers, Embeddings e Attention*), gerar seus gráficos ilustrativos de alto contraste via Nano Banana/Docs Oficiais, criar os bancos `quiz-s01.json` e `quiz-s02.json` (até 30 questões cada) e auditar ambos com a skill `course-content-reviewer`
- [x] 2.2 Escrever os Capítulos 1.3 (*Fundamentos de Web Machine Learning*), 1.4 (*Criando sua Primeira IA do Zero em JS*) e 1.5 (*Projetos Práticos com ML na Web: Vídeo e Jogos*), gerar seus gráficos via Nano Banana/Docs Oficiais, criar `quiz-s03.json`, `quiz-s04.json` e `quiz-s05.json` (até 30 questões cada) e auditar com a skill `course-content-reviewer`
- [x] 2.3 Escrever os Capítulos 1.6 (*Prompt Engineering na Prática*) e 1.7 (*Ferramentas de IA para Devs: Cursor, Windsurf, VSCode e Vibe Coding*), gerar seus gráficos via Nano Banana/Docs Oficiais, criar `quiz-s06.json` e `quiz-s07.json` (até 30 questões cada) e auditar com a skill `course-content-reviewer`

## 3. Produção e Auditoria dos Capítulos e Provas do Módulo 01 (Unidades 4 a 6: Sessões 1.8 a 1.11)

- [x] 3.1 Escrever os Capítulos 1.8 (*MCPs e Automação para Devs*) e 1.9 (*RAG, Embeddings e Busca Semântica com JS e Postgres pgvector*), gerar seus gráficos via Nano Banana/Docs Oficiais, criar `quiz-s08.json` e `quiz-s09.json` (até 30 questões cada) e auditar com a skill `course-content-reviewer`
- [x] 3.2 Escrever os Capítulos 1.10 (*Modelos Open-Source vs. Proprietários: OpenRouter e Ollama*) e 1.11 (*Introdução a Agents e Automação Avançada*), gerar seus gráficos via Nano Banana/Docs Oficiais, criar `quiz-s10.json` e `quiz-s11.json` (até 30 questões cada) e auditar com a skill `course-content-reviewer`

## 4. Aplicação Leitora Desktop, Motor de Provas e Dashboard de Desempenho

- [x] 4.1 Inicializar a aplicação Web Local-First (Vite + React + TypeScript + Tailwind CSS) com pipeline de compilação dos 11 capítulos, imagens e 11 bancos de questões, verificando que `npm run build` compila o bundle estático sem erros
- [x] 4.2 Implementar o Leitor de Capítulos (sumário lateral, renderização de Markdown rico, imagens de alta resolução, syntax highlighting de código, marcação de leitura concluída e slots extensíveis para Áudio/Vídeo/Tutor Gemini) e verificar a navegação entre os 11 capítulos e âncoras internas
- [x] 4.3 Implementar o Motor Interativo de Provas por Sessão (Modos: Prova Completa de até 30 questões, Simulado Rápido e Caderno de Erros) com correção comentada e links para a seção do capítulo e documentação oficial, verificando o cálculo de nota e persistência local da tentativa
- [x] 4.4 Implementar o Dashboard de Desempenho e Diagnóstico (*"O que posso melhorar"*) com métricas por sessão e módulo, radar por nível cognitivo, lista priorizada de subtópicos com acerto $< 75\%$ e exportação/importação de progresso em `.json`, verificando que lacunas simuladas geram links diretos para o trecho do capítulo e doc oficial

## 5. Compilador EPUB 3 (Kindle Colorsoft) e Pacote Android Nativo (`.APK`)

- [x] 5.1 Implementar o gerador Node.js de EPUB 3 colorido (`scripts/build-epub.ts` / `npm run build:kindle`) com capa, sumário navegável, CSS otimizado para Kindle Colorsoft, gráficos embutidos e caderno de questões com gabarito comentado, verificando a geração do arquivo `.epub` válido para o Send to Kindle
- [x] 5.2 Configurar o Capacitor Android (`@capacitor/core`, `@capacitor/android`), sincronizar o bundle offline com todos os capítulos, imagens e provas e compilar o arquivo instalador `.APK` usando o Android SDK local (`gradlew assembleDebug`), verificando a criação do `.apk` pronto para instalação no celular Android
