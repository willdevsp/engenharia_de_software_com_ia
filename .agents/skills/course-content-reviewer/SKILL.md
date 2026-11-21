---
name: course-content-reviewer
description: Audita e revisa capítulos de estudo e bancos de questões (até 30 questões por sessão) do curso de Engenharia de Software em IA Aplicada, garantindo fidelidade às documentações oficiais, profundidade didática estilo livro técnico, compatibilidade visual para Kindle Colorsoft (E-Ink colorido) e rigor técnico dos gabaritos.
---

# Course Content Reviewer (`course-content-reviewer`)

Use esta skill sempre que um capítulo (`content/modulo-XX/chapters/cap-YY.md`) ou banco de prova (`content/modulo-XX/quizzes/quiz-sYY.json`) for gerado ou atualizado. Nenhum capítulo deve ser considerado concluído sem passar pelas 4 dimensões de auditoria abaixo.

---

## Protocolo de Auditoria em 4 Dimensões

### Dimensão 1: Fidelidade Técnica & Documentações Oficiais
1. **Conferência com o Mapa Oficial do Módulo:**
   - Leia o arquivo de estrutura do módulo correspondente (ex.: `Docs/modulo-01-fundamentos-ia-e-llms.md`) e identifique as documentações oficiais e seções específicas exigidas para a sessão.
   - Verifique se o frontmatter do capítulo lista as URLs oficiais em `official_docs`.
2. **Validação de APIs, Assinaturas e Conceitos:**
   - Verifique se os trechos de código JavaScript/TypeScript, comandos CLI, nomes de parâmetros e arquiteturas descritas refletem fielmente a documentação oficial atual (ex.: `tf.tidy()` e `model.fit()` no TensorFlow.js; operador `<=>` de distância de cosseno e índice `HNSW` no `pgvector`; ciclo de vida JSON-RPC 2.0 no MCP; `.cursor/rules` no Cursor).
   - Reprove imediatamente qualquer API inventada, depreciada sem aviso ou explicação superficial que contradiga a documentação oficial.

### Dimensão 2: Profundidade Didática ("Livro Técnico Pessoal")
1. **Completude Conceitual e Arquitetural:**
   - O capítulo explica o **"por quê"** (motivação e problema resolvido), o **"como funciona por dentro"** (arquitetura interna, matemática intuitiva, fluxo de dados) e o **"como aplicar na prática"** (exemplos de código completos e comentados + laboratório passo a passo)?
   - Reprove capítulos que pareçam apenas resumos de slides ou listas de tópicos rasos.
2. **Estrutura e Âncoras de Diagnóstico:**
   - Verifique se as seções do capítulo possuem títulos claros cujas âncoras (`#slug-da-secao`) correspondem exatamente aos campos `chapterAnchor` referenciados pelas questões da prova (`quiz-sYY.json`), permitindo que o botão *"Revisar no Capítulo"* do Dashboard leve o aluno ao parágrafo exato.
3. **Extensibilidade Multi-Fase e Vídeos do YouTube em Português:**
   - Verifique se o frontmatter preserva os campos `media.audio_notebooklm`, `media.video_url` e `media.videos`.
   - **Política de Idioma dos Vídeos:** Todos os vídeos em `media.videos` devem ser em **português (`pt-BR`)**, utilizando vídeos em inglês **exclusivamente** quando não existir conteúdo técnico equivalente em português (caso em que `language: "en"` deve estar explícito). Valide com `node .agents/skills/course-module-builder/scripts/verify-youtube-videos.mjs`.

### Dimensão 3: Qualidade Visual & Compatibilidade Kindle Colorsoft (Kaleido 3 E-Ink)
1. **Imagens Rasterizadas Reais (Zero Dependência de JS para Diagramas no EPUB):**
   - O Kindle Colorsoft não executa bibliotecas JavaScript como `mermaid.js`. Portanto, todo conceito visual central do capítulo DEVE ser ilustrado por uma imagem real (`.png` ou `.jpg`) salva em `content/modulo-XX/assets/` e referenciada via sintaxe Markdown padrão `![Descrição detalhada](../assets/nome-da-imagem.png)`.
2. **Validação Física, Matemática (LaTeX/KaTeX) e Perfil de Contraste E-Ink Colorido:**
   - Confirme que todas as fórmulas matemáticas inline (`$...$`) e em bloco (`$$...$$`) no capítulo e nas questões de prova são 100% válidas no compilador KaTeX (verificado por `node scripts/validate-content.mjs`) e nunca ficam com delimitadores `$` desbalanceados ou underscores corrompidos pelo parser Markdown.
   - Confirme que todos os arquivos de imagem referenciados no capítulo existem fisicamente no disco e não estão vazios.
   - Confirme que as ilustrações geradas via Nano Banana ou diagramas técnicos seguem o perfil **Colorsoft-Friendly**:
     - Fundo claro/papel (`#FFFFFF` ou `#FAF8F5`) — nunca dark mode pesado que perde contraste no E-Ink.
     - Linhas nítidas, cores de alto contraste e rótulos tipográficos grandes e legíveis em telas de 150 PPI (cor) / 300 PPI (P&B).

### Dimensão 4: Auditoria da Prova da Sessão (Até 30 Questões)
1. **Quantidade e Cobertura:**
   - O arquivo `quiz-sYY.json` contém entre 15 e 30 questões (padrão recomendado: 20 a 30 questões por sessão) cobrindo todos os subtópicos ensinados no capítulo?
2. **Qualidade do Diagnóstico ("O que posso melhorar"):**
   - Todas as questões possuem `id`, `sessionId`, `subtopicTag`, `cognitiveLevel` (`"conceptual" | "architecture" | "code-practice"`), `difficulty` (`"foundation" | "intermediate" | "advanced"`), `question`, `options` (4 alternativas claras), `correctOptionIndex` ($0\text{–}3$), `explanation`, `chapterAnchor`, `officialDocUrl` e `officialDocLabel`?
   - Há equilíbrio entre os 3 níveis cognitivos (`conceptual`, `architecture`, `code-practice`)?
3. **Rigor do Gabarito e Explicações:**
   - O índice `correctOptionIndex` aponta inequivocamente para a única alternativa correta segundo a documentação oficial?
   - O campo `explanation` explica tecnicamente por que a resposta correta é verdadeira e por que as alternativas incorretas (distratores) estão erradas?

---

## Execução da Auditoria Automatizada + Qualitativa

1. Execute o validador técnico de estrutura, links, âncoras e imagens:
   ```powershell
   node scripts/validate-content.mjs
   ```
2. Realize a leitura crítica do capítulo e das questões aplicando as 4 dimensões acima.
3. Emita o parecer estruturado:
   - **`STATUS: APPROVED`** — quando todas as 4 dimensões e o script de validação passarem com 100% de conformidade.
   - **`STATUS: REVISIONS_REQUIRED`** — listando exatamente o arquivo, seção/questão e correção obrigatória, aplicando a correção imediatamente antes de prosseguir.
