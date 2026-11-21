---
name: course-module-builder
description: >-
  Workflow completo e padronizado para desenvolver os próximos módulos (Módulos 02 a 12) do curso de Engenharia de Software em IA Aplicada. Use sempre que iniciar, planejar, escrever ou atualizar um módulo do curso, garantindo capítulos em estilo livro técnico, imagens compatíveis com Kindle Colorsoft, curadoria de vídeos do YouTube em português (fallback em inglês apenas quando inexistente em PT-BR), bancos de 25-30 questões, auditoria via course-content-reviewer e builds Web, EPUB e Android APK.
---

# Course Module Builder (`course-module-builder`)

Use esta skill sempre que desenvolver ou expandir módulos do curso (Módulos 02 a 12) definidos em `Docs/modulo-XX-*.md`.

Para templates exatos de frontmatter YAML, schema JSON de questões e lições técnicas detalhadas aprendidas no Módulo 01, consulte [references/templates-and-pitfalls.md](./references/templates-and-pitfalls.md).

---

## Fluxo Padrão em 7 Etapas para Novos Módulos

### 1. Mapeamento Oficial e Estrutura de Pastas
1. Leia `readme.md` e o mapa curricular correspondente (`Docs/modulo-XX-*.md`) para extrair sessões, subtópicos e **documentações oficiais com seções exatas**.
2. Crie a árvore de diretórios do módulo:
   - `content/modulo-XX/chapters/` (1 arquivo `.md` por sessão: `cap-01-*.md`, `cap-02-*.md`, ...)
   - `content/modulo-XX/assets/` (ilustrações PNG Colorsoft + capa `cover-modulo-XX.png`)
   - `content/modulo-XX/quizzes/` (`quiz-s01.json`, ... com identificador global de sessão `2.1`, `3.1`, etc.)

### 2. Escrita dos Capítulos ("Livro Técnico Pessoal")
Para cada sessão:
- Explique **por quê** (problema real de engenharia), **como funciona por dentro** (arquitetura, matemática em LaTeX válido, fluxos de dados) e **como aplicar na prática** (código completo, tipado e comentável + laboratório passo a passo).
- Garanta títulos de seção cujos slugs (`#slug-da-secao`) correspondam exatamente a `chapterAnchor` das questões.
- Use cercas de **4 crases** (`` ````markdown ``) sempre que um bloco de código contiver exemplos com `` ``` `` internos.
- Mantenha `audio_notebooklm: null` no frontmatter; áudios serão gerenciados em nuvem pelo aluno via Archive.org + Firestore (`moduleId: X`).

### 3. Ilustrações Rasterizadas para Kindle Colorsoft (Kaleido 3)
- Gere diagramas técnicos e capa em PNG real dentro de `content/modulo-XX/assets/` usando `image-generator` (nunca dependa de `mermaid.js` para o capítulo final).
- Regra **Colorsoft-Friendly**: fundo claro/papel (`#FFFFFF` ou `#FAF8F5`), zero dark mode pesado, linhas nítidas, paleta de alto contraste e rótulos grandes legíveis em 150/300 PPI.

### 4. Curadoria Obrigatória de Vídeos do YouTube (**Português Primeiro**)
Ao preencher `media.video_url` e `media.videos` no frontmatter de cada capítulo:
1. **Prioridade Absoluta — Idioma Português (`pt-BR`):**
   - Busque primeiro aulas, explicações arquiteturais e tutoriais técnicos falados em **português** (canais de engenharia de software, IA e documentação oficial traduzida/dublada).
   - Prefira vídeos diretos ao tema da sessão (ex.: canais como Rocketseat, Código Fonte TV, Full Cycle, Programação Dinâmica, TensorFlow em português, Hashtag Programação, Erick Wendel, Attekita Dev, etc., sempre buscando o melhor match técnico).
2. **Exceção Controlada — Fallback para Inglês:**
   - **Somente** inclua um vídeo em inglês quando, após pesquisa direcionada em português, **não houver nenhum vídeo técnico adequado em português** sobre o assunto específico da sessão.
   - Sempre que usar fallback em inglês, marque explicitamente `language: "en"` no objeto daquele vídeo em `media.videos` e registre a justificativa no resumo do módulo.
3. **Validação Programática Obrigatória:**
   - Nunca chute IDs de vídeo. Todo link adicionado deve passar pelo validador:
     ```powershell
     node .agents/skills/course-module-builder/scripts/verify-youtube-videos.mjs content/modulo-XX/chapters
     ```
   - O script valida HTTP 200 no `oembed`, `playabilityStatus === "OK"`, `playableInEmbed === true` e sinais de idioma português.

### 5. Bancos de Questões (25–30 por Sessão)
- Crie `content/modulo-XX/quizzes/quiz-sYY.json` seguindo o schema em [references/templates-and-pitfalls.md](./references/templates-and-pitfalls.md).
- Distribua as questões entre `conceptual`, `architecture` e `code-practice`, cobrindo 100% dos `subtopics` do capítulo com `chapterAnchor`, `officialDocUrl` e explicação técnica dos distratores.

### 6. Auditoria Dupla Obrigatória
Antes de integrar na interface:
1. Ative a skill `course-content-reviewer` e aplique as 4 dimensões de auditoria em cada capítulo e prova.
2. Execute os validadores técnicos e garanta zero erros:
   ```powershell
   node scripts/validate-content.mjs
   node .agents/skills/course-module-builder/scripts/verify-youtube-videos.mjs content/modulo-XX/chapters
   ```

### 7. Integração Multi-Módulo, Web, Kindle EPUB e Android APK
- Preserve os painéis de Áudio e Vídeo iniciados **fechados por padrão** no `ChapterReader.tsx`.
- Ao expandir de Módulo 01 para Módulos 02+, generalize `compile-content.mjs`, `validate-content.mjs`, `build-epub.mjs` e o seletor de módulo em `App.tsx` conforme descrito em [references/templates-and-pitfalls.md](./references/templates-and-pitfalls.md), mantendo compatibilidade com `study_state/default` e `session_audios` (`moduleId`) no Firestore.
- Por fim, valide TypeScript (`npx.cmd tsc --noEmit`), build Web (`npm.cmd run build`), build EPUB e compilação Android APK (`npx.cmd cap sync android` + `.\gradlew.bat assembleDebug` usando JBR e Android SDK local — nunca imprima nem exponha `.env.local`).
