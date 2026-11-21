# Templates e Lições Aprendidas na Construção do Curso

Este guia de referência consolida os contratos de arquivos e as armadilhas resolvidas durante a criação do Módulo 01 (para evitar regressões nos Módulos 02 a 12).

---

## 1. Template de Frontmatter de Capítulo (`content/modulo-XX/chapters/cap-YY-slug.md`)

```yaml
---
id: "m02-s01"
title: "2.1 Título da Sessão"
module: 2
session: "2.1"
slug: "cap-01-titulo-da-sessao"
estimatedMinutes: 95
status: "reviewed"
subtopics:
  - "Subtópico 1 (deve casar com subtopicTag nas questões)"
  - "Subtópico 2"
official_docs:
  - title: "Título da Documentação Oficial"
    url: "https://documentacao.oficial/caminho"
    section: "Nome exato da seção"
media:
  audio_notebooklm: null
  video_url: "https://www.youtube.com/watch?v=VIDEO_ID_PT_1"
  videos:
    - title: "Título exato retornado pelo oEmbed"
      channel: "Nome do Canal Brasileiro/Lusófono"
      url: "https://www.youtube.com/watch?v=VIDEO_ID_PT_1"
      language: "pt-BR" # Opcional quando PT-BR; obrigatório "en" somente se for fallback em inglês
---
```

> **Atenção:** `video_url` deve sempre apontar para o vídeo principal (primeiro item de `media.videos`).

---

## 2. Template de Banco de Provas (`content/modulo-XX/quizzes/quiz-sXX.json`)

```json
{
  "sessionId": "2.1",
  "moduleId": 2,
  "title": "Prova da Sessão 2.1 — Nome do Tema",
  "questions": [
    {
      "id": "m02-s01-q01",
      "sessionId": "2.1",
      "subtopicTag": "Subtópico 1",
      "cognitiveLevel": "conceptual",
      "difficulty": "foundation",
      "question": "Pergunta técnica clara (com LaTeX $...$ válido se necessário)...",
      "codeSnippet": "// Opcional: código limpo sem tags HTML",
      "options": [
        "Alternativa A",
        "Alternativa B",
        "Alternativa C",
        "Alternativa D"
      ],
      "correctOptionIndex": 0,
      "explanation": "Explicação técnica fundamentada na documentação oficial (justificando a correta e refutando os distratores).",
      "chapterAnchor": "titulo-exato-da-secao-no-capitulo",
      "officialDocUrl": "https://documentacao.oficial/caminho",
      "officialDocLabel": "Nome da Doc Oficial — Seção X"
    }
  ]
}
```

- Níveis cognitivos aceitos em `cognitiveLevel`: `"conceptual" | "architecture" | "code-practice"`.
- Dificuldades aceitas em `difficulty`: `"foundation" | "intermediate" | "advanced"`.
- Máximo de **30 questões** por sessão (meta recomendada: **25 questões** equilibradas).

---

## 3. Armadilhas Críticas & Como Evitá-las (Módulo 01 -> Módulos 02–12)

### 3.1 LaTeX, KaTeX e Blocos de Código Markdown
- **Subscritos e Itálico acidental (`_`):** Parsers Markdown tradicionais (`marked`) corrompem `_` dentro de fórmulas LaTeX se rodarem antes da proteção de matemática. Sempre valide via `node scripts/validate-content.mjs`.
- **Escapamento de cifrão `\$`:** Valores monetários dentro ou perto de matemática devem ser escapados ou separados (`US\$ 10` ou texto fora de `$...$`) para evitar que spans monetários fechem fórmulas antecipadamente.
- **Blocos de código que contêm exemplos Markdown com ` ``` `:** Quando um capítulo de Prompt Engineering ou documentação mostra exemplos contendo cercas triplas (` ``` `), envolva o bloco externo com **quatro crases** (` ````markdown ... ```` `), evitando fechamento prematuro.

### 3.2 Kindle Colorsoft EPUB 3 (`scripts/build-epub.mjs`)
- **Zero JavaScript no EPUB:** Kindle Colorsoft não renderiza Mermaid JS. Gere sempre PNGs reais coloridos (fundo claro `#FFFFFF` / `#FAF8F5`, traços escuros, rótulos legíveis a 150/300 PPI).
- **Símbolos matemáticos Unicode vs placeholders:** Se `scripts/build-epub.mjs` for estendido com novos macros LaTeX, teste o `.epub` gerado contra vazamento de tokens internos (o gerador usa caracteres PUA `\uE001`–`\uE006` justamente para não colidir com regex de `_..._`).
- **Não alterar layout de áudios no EPUB:** Áudios `.m4a`/`.mp3` ficam exclusivamente no app Web/Android (nuvem Archive.org + Firestore), jamais embutidos no EPUB do Kindle.

### 3.3 Adaptação da Plataforma para Múltiplos Módulos (`content/modulo-02..12`)
Quando expandir o aplicativo de apenas Módulo 01 para suportar Módulos 02–12:
1. **`scripts/compile-content.mjs` & `scripts/validate-content.mjs`:** Generalizar a leitura para iterar todas as pastas `content/modulo-XX` ordenadas numericamente, copiando assets para `public/course-assets/modulo-XX/` e exportando catálogo por módulo em `src/generated/courseData.ts`.
2. **`scripts/build-epub.mjs`:** Gerar `.epub` por módulo (`dist-kindle/modulo-XX-kindle-colorsoft.epub` + cópia em `public/downloads/`) ou seleção no botão Kindle.
3. **`src/App.tsx` e IDs globais:** Garantir `chapter.id` (`m02-s01`), `sessionId` (`2.1`) e `question.id` (`m02-s01-q01`) únicos entre módulos para que `study_state/default` e `session_audios` (campo `moduleId`) no Firebase Firestore nunca colidam.
4. **Painéis de Mídia:** Manter os painéis de Áudio e Vídeo (`SessionAudioPanel` e YouTube iframe) **iniciados fechados por padrão** ao abrir ou trocar de capítulo.

### 3.4 Ambiente Windows, Nuvem Segura & Compilação Android
- **PowerShell:** Sempre use `npm.cmd` e `npx.cmd` (a política de execução bloqueia `npm.ps1`/`npx.ps1`). Use `;` em vez de `&&` em scripts PowerShell 5.1.
- **Segredos (`.env.local`):** Nunca leia, imprima em logs ou faça commit de `.env.local` (sempre formato `CHAVE=valor` sem aspas/vírgulas extras).
- **Archive.org:** Nunca envie `DELETE` para o bucket do Archive.org IAS3; exclusões ocorrem apenas no documento do Firestore e no cache local.
- **Android APK (Capacitor 7 + Gradle 9.5.1 + Java 25):**
  ```powershell
  npx.cmd tsc --noEmit
  npm.cmd run build
  npx.cmd cap sync android
  $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
  $env:ANDROID_HOME="C:\Users\Will\AppData\Local\Android\Sdk"
  Push-Location android; .\gradlew.bat assembleDebug; Pop-Location
  ```
