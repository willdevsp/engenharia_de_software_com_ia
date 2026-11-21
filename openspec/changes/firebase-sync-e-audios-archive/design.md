## Context

See `proposal.md` for motivation and scope.
O projeto já possui:
- Leitor de capítulos, provas de até 30 questões e Dashboard analítico (Vite + React 19 + TypeScript + Tailwind CSS).
- App nativo Android compilado via Capacitor 7 (`android/`) já equipado com `@capacitor/filesystem@7.0.0` e `@capacitor/share@7.0.0` e ajuste nativo de Safe Area / Display Cutout em `MainActivity.java`.
- Exportador EPUB 3 (`scripts/build-epub.mjs`) para o Kindle Colorsoft (que permanece intocado).
- Um banco Cloud Firestore recém-criado pelo usuário e um arquivo `.env.local` contendo as variáveis `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `ARCHIVE_CLIENT_ID` e `ARCHIVE_SECRETS` (escritas no formato `KEY: value`, sem prefixo `VITE_`).

## Goals / Non-Goals

**Goals:**
- Integrar upload de `.m4a` e `.mp3` para o **Internet Archive IAS3** (`https://s3.us.archive.org/<bucket>/<fileName>`) no Desktop e no Android sem bloqueio de CORS e sem corromper binários nem sobrecarregar RAM.
- Persistir e listar os metadados dos áudios na coleção `session_audios` do **Firebase Firestore**, mantendo cache espelho local em `localStorage` para uso offline.
- Reproduzir os áudios por streaming direto da URL do Archive.org (`https://archive.org/download/<bucket>/<fileName>`) por padrão, com cache local opcional sob demanda (`Baixar Offline` / `Limpar Cache`) reutilizando `Directory.Data` (Android) e `IndexedDB` (Desktop).
- Garantir que o botão **Remover** exclua apenas o documento no Firestore e o cache local (sem enviar `DELETE` ao Archive.org).
- Sincronizar de forma *offline-first* e sem perda todo o progresso de estudo (`completedChapters`, `quizAttempts`, `readingProgress`, `bookmarkedQuestions` e `audioPositions`) na coleção `study_state/default` do Firestore.
- Enxugar o `.gitignore` ao final para refletir apenas os diretórios e arquivos do projeto.

**Non-Goals:**
- Alterar `scripts/build-epub.mjs` ou embutir áudios no `.EPUB` do Kindle Colorsoft.
- Enviar requisições `DELETE` ao Internet Archive IAS3 ao excluir faixas no app.
- Implementar fluxo completo de Firebase Auth (fica documentado como evolução simples nas regras caso o usuário queira restringir escrita por e-mail/senha).

## Decisions

### 1. Leitura Compatível de `.env.local` + Configurações em Runtime (`vite.config.ts` e `src/utils/cloudConfig.ts`)
- **Decisão:** O `.env.local` existente usa formato `KEY: value` (e sem prefixo `VITE_`). Em vez de exigir que o usuário reescreva seu `.env.local`, o `vite.config.ts` fará parsing de `.env.local` aceitando tanto `KEY=value` quanto `KEY: value` (removendo aspas e espaços extras, e aceitando também prefixo opcional `VITE_`), injetando em `define` como `import.meta.env.VITE_*` (apenas no build local do usuário, com `.env.local` mantido fora do Git).
- **Configurações em Runtime (`cloudConfig.ts`):** Como `.env.local` não define o nome do bucket do Archive.org (ex.: `will-engenharia-ia-mod01-audios`) — e no celular o usuário pode querer alterar o bucket ou chaves sem recompilar o `.APK` — `cloudConfig.ts` faz merge entre os defaults vindos do build (`.env.local`) e overrides salvos em `localStorage` (`engenharia_ia_cloud_config_v1`), editáveis por uma modal de **Configurações** acessível no topo do app.
- **Template Seguro:** Criar `.env.example` com os nomes de variáveis sem segredos.

### 2. Upload IAS3 e Download Offline Sem CORS (Desktop Proxy + Plugin Nativo Java no Android)
- **Decisão:**
  - **Desktop (Dev Server Vite):** Configurar dois middlewares de proxy no `vite.config.ts`:
    - `/api/ias3` $\rightarrow$ `https://s3.us.archive.org` (encaminha `PUT` com body binário do `File`, `Authorization: LOW <id>:<secret>`, `x-amz-auto-make-bucket: 1`, `x-archive-meta-mediatype: audio`, `x-archive-queue-derive: 0`).
    - `/api/archive-download` $\rightarrow$ `https://archive.org/download` (permite que o botão *"Baixar Offline"* no navegador Desktop baixe o `.m4a`/`.mp3` para o IndexedDB seguindo redirecionamentos sem erro de CORS).
  - **Android (`.APK`):** Criar um plugin nativo Capacitor `ArchiveS3Plugin.java` registrado em `MainActivity.java` (antes de `super.onCreate` via `registerPlugin(ArchiveS3Plugin.class)`). O plugin expõe dois métodos `@PluginMethod`:
    - `uploadFile`: recebe `{ filePath, bucket, fileName, accessKey, secretKey, mimeType }` (lendo o arquivo salvo temporariamente pelo app em `Directory.Data` / `Directory.Cache`), abre `HttpsURLConnection` `PUT` para `https://s3.us.archive.org/<bucket>/<fileName>` com `setFixedLengthStreamingMode(file.length())` e buffer de 8 KB (evitando carregar 40 MB na heap do Java ou converter binário para string no WebView), enviando `Authorization: LOW <accessKey>:<secretKey>`, `x-amz-auto-make-bucket: 1`, `x-archive-meta-mediatype: audio` e `x-archive-queue-derive: 0`.
    - `downloadFile`: recebe `{ url, destPath }` e faz download nativo seguindo redirecionamentos `301`/`302`/`307`/`308` do `archive.org/download/...` diretamente para `Directory.Data`, permitindo que o botão *"Baixar Offline"* funcione com 100% de confiabilidade no Android sem CORS.
- **Alternativas consideradas:**
  - *`CapacitorHttp` JS com string Base64:* Rejeitado porque `CapacitorHttp` frequentemente falha ou consome muita memória ao transmitir binários de 20–40 MB entre a ponte JS e Java. Streaming nativo com `FileInputStream` em chunks de 8 KB é determinístico e leve.

### 3. Esquema Firestore e Merge Offline-First (`firebaseClient.ts` + `cloudSync.ts`)
- **Coleção `session_audios/{audioId}`:**
  ```typescript
  interface CloudAudioMetadata {
    id: string;
    moduleId: number;       // 1
    sessionId: string;      // "1.1" .. "1.11"
    title: string;
    fileName: string;       // sanitizado com timestamp p/ evitar colisão no bucket
    format: 'mp3' | 'm4a';
    mimeType: string;
    sizeBytes: number;
    archiveBucket: string;
    audioUrl: string;       // https://archive.org/download/<bucket>/<fileName>
    createdAt: string;
  }
  ```
- **Documento `study_state/default`:**
  ```typescript
  interface UserStudyState {
    version: number;
    lastUpdated: string;
    completedChapters: string[];
    chapterCompletionLog?: Record<string, { completed: boolean; updatedAt: string }>;
    readingProgress: Record<string, number>;
    bookmarkedQuestions: string[];
    quizAttempts: QuizAttempt[];
    audioPositions?: Record<string, { seconds: number; updatedAt: string }>;
  }
  ```
- **Algoritmo de Merge (`mergeStudyStates`):**
  1. `quizAttempts`: união deduplicada por `attemptId`, ordenada por `timestamp` decrescente.
  2. `chapterCompletionLog`: para cada `chapterId`, vence o registro com `updatedAt` mais recente (e `completedChapters` é recalculado a partir dos registros com `completed === true`; se um dispositivo antigo tiver `completedChapters` sem log, é tratado como `completed: true` na data `lastUpdated`). Isso garante que tanto marcar quanto desmarcar um capítulo como lido sincronize corretamente entre Desktop e Android.
  3. `audioPositions`: para cada `audioId`, vence a posição com `updatedAt` mais recente.
  4. `bookmarkedQuestions`: união de IDs.

### 4. Reprodução Híbrida e Cache Offline (`audioStorage.ts` + `SessionAudioPanel.tsx`)
- Ao abrir uma sessão, a lista de áudios combina os documentos do Firestore (`session_audios` filtrados por `sessionId`) com espelho local em `localStorage` (atualizado a cada leitura do Firestore) e verifica quais IDs possuem binário salvo localmente (`Directory.Data/session-audios/<id>.<ext>` no Android ou chave `id` no IndexedDB no Desktop).
- Ao clicar para ouvir uma faixa:
  - Se estiver em cache local (`Offline Pronto`), reproduz instantaneamente do dispositivo local sem gastar rede.
  - Caso contrário, reproduz em streaming direto da `audioUrl` (`https://archive.org/download/<bucket>/<fileName>`).
- Ao fazer upload de um novo áudio, salvamos automaticamente uma cópia no cache offline local durante o envio para que o áudio já possa ser ouvido imediatamente naquele dispositivo mesmo durante os 15–60s iniciais de propagação no Archive.org.

### 5. Limpeza do `.gitignore`
- Substituir o template genérico atual de `.gitignore` (que contém entradas irrelevantes de Next.js, Nuxt, Gatsby, SvelteKit, Docusaurus, Bower, Grunt etc.) por um `.gitignore` enxuto focado apenas em Node/Vite/TypeScript, arquivos `.env*` (preservando `!.env.example`), saídas geradas (`dist/`, `dist-kindle/`, `dist-android/`, `public/downloads/`, `public/course-assets/`, `src/generated/`), artefatos de build Android/Gradle (`android/.gradle/`, `android/build/`, `android/app/build/`, `android/local.properties`, `android/capacitor-cordova-android-plugins/`), logs e arquivos do SO. *(Nota: os arquivos de mídia/fotos de debug como `Screenshot_*.png` e `10007698*.jpg` na raiz não fazem parte do build.)*

## Risks / Trade-offs

- **[Risk] Delay de propagação de 15–60s do Archive.org após `PUT` até o link `/download/...` responder `200 OK` para outros dispositivos** $\rightarrow$ **Mitigação:** Manter cache offline local no dispositivo que subiu o áudio para reprodução imediata e exibir mensagem clara se o streaming de outro dispositivo retornar 404 nos primeiros segundos.
- **[Risk] `npm run build` no Desktop estático (`vite preview` / arquivo local) não tem proxy Vite para upload IAS3** $\rightarrow$ **Mitigação:** No Desktop em desenvolvimento usa-se `npm run dev` (que ativa os proxies `/api/ias3` e `/api/archive-download`); se usado sem dev server (ex.: produção estática sem proxy), tentar chamada direta e exibir aviso explicando uso via `npm run dev` ou no `.APK` Android.
- **[Risk] Regras do Firestore abertas no modo pessoal** $\rightarrow$ **Mitigação:** Documentar regras com validação de campos obrigatórios no Firestore e manter o app pronto para adicionar Firebase Auth se necessário.
