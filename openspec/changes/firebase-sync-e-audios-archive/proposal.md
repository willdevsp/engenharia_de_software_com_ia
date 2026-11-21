## Why

Sincronizar automaticamente entre Desktop e Android (`.APK`) tanto os áudios `.m4a`/`.mp3` (hospedados no **Internet Archive IAS3** com metadados salvos no **Firebase Firestore** e cache offline opcional por faixa) quanto todo o progresso de estudo do aluno (capítulos concluídos, histórico de provas, métricas do Dashboard e posição de reprodução de cada áudio), mantendo a compatibilidade offline-first, sem alterar o exportador `.EPUB` do Kindle Colorsoft e enxugando o `.gitignore` ao final para conter apenas o necessário do projeto.

## What Changes

- **Upload de Áudios para o Internet Archive IAS3 + Registro no Firebase Firestore:**
  - Envio binário de arquivos `.m4a` e `.mp3` para `s3.us.archive.org` via protocolo IAS3 (`Authorization: LOW <access>:<secret>`, `x-amz-auto-make-bucket: 1`, `x-archive-meta-mediatype: audio`, `x-archive-queue-derive: 0`), contornando limitações de CORS no navegador via proxy local no Vite (`/api/ias3`) no Desktop e streaming nativo em Java (`ArchiveS3Plugin`) no Android.
  - Gravação dos metadados e da URL pública (`https://archive.org/download/<bucket>/<file>`) na coleção **`session_audios`** do Firebase Firestore para compartilhamento imediato entre Desktop e Android.
  - Ao remover um áudio da lista da sessão, o sistema exclui o registro apenas no **Firestore** (e limpa eventual cache local no dispositivo), sem enviar requisição `DELETE` ao Archive.org.
- **Reprodução Híbrida (Streaming + Cache Offline Opcional):**
  - Reprodução padrão em streaming direto pela URL do Archive.org, com espelho local dos metadados em `localStorage` para visualização offline.
  - Botão **"Baixar Offline"** e **"Limpar Cache Local"** por faixa, reutilizando `Directory.Data` (`@capacitor/filesystem`) no Android e `IndexedDB` no Desktop.
- **Sincronização Offline-First do Progresso de Estudo no Firestore:**
  - Sincronização bidirecional automática da coleção **`study_state`** (`completedChapters`, `readingProgress`, `bookmarkedQuestions`, `quizAttempts` mesclados por `attemptId` e `audioPositions`) entre Desktop e Android, preservando o backup manual `.json` e exibindo indicador de status (`Nuvem OK` / `Sincronizando` / `Offline`).
- **Configuração Segura de Credenciais (`.env.local` + Modal de Configurações) e `.gitignore` Enxuto:**
  - Leitura automática das variáveis em `.env.local` (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `ARCHIVE_CLIENT_ID`, `ARCHIVE_SECRETS`) e criação de `.env.example` (sem segredos), com modal de **Configurações** na interface para definir/ajustar o bucket do Archive.org ou sobrescrever credenciais em runtime.
  - Higienização do `.gitignore` no final da implementação para manter apenas regras necessárias ao projeto.

## Capabilities

### New Capabilities
- `cloud-audio-sync-and-cache`: Upload de áudios `.m4a`/`.mp3` para o Internet Archive IAS3, persistência/listagem/remoção exclusiva no Firebase Firestore (`session_audios`), streaming online, cache offline opcional por faixa e tela de configurações de bucket/credenciais.
- `cloud-progress-sync`: Sincronização offline-first bidirecional de capítulos concluídos, histórico de provas, diagnósticos do Dashboard e posição de reprodução dos áudios no Firebase Firestore (`study_state`) com merge determinístico sem perda entre Desktop e Android.

### Modified Capabilities
<!-- Nenhuma capability existente está sendo modificada. -->

## Impact

- **Dependências:** Adição do SDK `firebase` no `package.json`.
- **Build & Infra Local:** Atualização de `vite.config.ts` (parser compatível com `.env.local` em formato `KEY: value` / `KEY=value` + proxies `/api/ias3` e `/api/archive-download`), criação de `.env.example` e limpeza final do `.gitignore`.
- **Android Nativo:** Criação de `android/app/src/main/java/com/will/engenhariasoftwareia/ArchiveS3Plugin.java`, registro em `MainActivity.java` e recompilação de `dist-android/engenharia-software-ia-modulo-01.apk`.
- **Aplicação Web / Mobile:** Novos utilitários (`src/utils/cloudConfig.ts`, `src/utils/archiveUpload.ts`, `src/utils/firebaseClient.ts`, `src/utils/cloudSync.ts`), atualização de `src/types/course.ts`, `src/utils/storage.ts`, `src/utils/audioStorage.ts`, `src/components/SessionAudioPanel.tsx`, `src/components/AnalyticsDashboard.tsx` e `src/App.tsx`.
