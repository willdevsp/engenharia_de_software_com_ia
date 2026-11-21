## 1. Dependências, `.env.local` Loader e Proxy Vite

- [x] 1.1 Instalar `firebase` (`npm.cmd install firebase`), criar `.env.example` (somente nomes de variáveis, sem segredos) e atualizar `vite.config.ts` com parser compatível para `.env.local` (`KEY: value` e `KEY=value`) além dos proxies `/api/ias3` e `/api/archive-download`, verificando que `npx.cmd tsc --noEmit` passa sem erros

## 2. Plugin Nativo Android (`ArchiveS3Plugin.java`) e Upload Archive.org IAS3

- [x] 2.1 Criar `android/app/src/main/java/com/will/engenhariasoftwareia/ArchiveS3Plugin.java` (upload streaming 8KB `PUT` para `s3.us.archive.org` + download nativo seguindo redirecionamentos para `Directory.Data`) e registrá-lo em `MainActivity.java` antes de `super.onCreate` via `registerPlugin(ArchiveS3Plugin.class)`
- [x] 2.2 Criar `src/utils/cloudConfig.ts` e `src/utils/archiveUpload.ts` unificando o upload de `.m4a`/`.mp3` (proxy Vite no Desktop + `ArchiveS3Plugin` no Android) com os headers IAS3 obrigatórios (`x-amz-auto-make-bucket: 1`, `x-archive-meta-mediatype: audio`, `x-archive-queue-derive: 0`) e geração da URL pública `https://archive.org/download/<bucket>/<file>`, verificando com `npx.cmd tsc --noEmit`

## 3. Cliente Firebase Firestore, Sincronização de Progresso e Cache de Áudios

- [x] 3.1 Criar `src/utils/firebaseClient.ts` e `src/utils/cloudSync.ts` para sincronização offline-first de `study_state/default` (capítulos com timestamps em `chapterCompletionLog`, provas deduplicadas por `attemptId` e `audioPositions`) e operações CRUD na coleção `session_audios` (remoção apenas no Firestore), atualizando `src/types/course.ts` e `src/utils/storage.ts`, verificando com `npx.cmd tsc --noEmit`
- [x] 3.2 Atualizar `src/utils/audioStorage.ts` para integrar a lista sincronizada do Firestore com espelho local em `localStorage`, reprodução híbrida (cache local prioritário ou streaming direto da `audioUrl`), preservação automática do cache local após upload e ações de baixar/limpar cache offline no Desktop (`IndexedDB`) e Android (`Directory.Data`), verificando com `npx.cmd tsc --noEmit`

## 4. Interface de Configurações, Player Híbrido e Status de Sincronização

- [x] 4.1 Atualizar `src/components/SessionAudioPanel.tsx` para suportar upload para Archive.org + Firestore, exibir badge `Streaming` vs `Offline Pronto`, botões `Baixar Offline` / `Limpar Cache`, remoção exclusiva no Firestore + cache local e retomada sincronizada de `audioPositions`
- [x] 4.2 Atualizar `src/App.tsx` e `src/components/AnalyticsDashboard.tsx` com sincronização automática de progresso no Firestore, indicador de status (`Nuvem OK` / `Sincronizando` / `Offline` / `Não Configurado`), botão `Sincronizar Agora` e modal de Configurações (bucket Archive.org e override opcional de chaves), verificando com `npm.cmd run build`

## 5. Build Android `.APK` e Limpeza Final do `.gitignore`

- [x] 5.1 Sincronizar Capacitor (`npx.cmd cap sync android`) e compilar o novo `.APK` (`gradlew assembleDebug` com JBR do Android Studio e Android SDK local), verificando `dist-android/engenharia-software-ia-modulo-01.apk`
- [x] 5.2 Enxugar o `.gitignore` na raiz para manter somente o necessário do projeto (Node/Vite/TS/Capacitor/Android/`.env*`/builds) e verificar com `git status --short` (ou checagem de regras) que `.env.local` e diretórios de build estão ignorados sem vazar credenciais
