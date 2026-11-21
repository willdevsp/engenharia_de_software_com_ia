## Why

Permitir que o aluno cadastre, organize, reproduza e remova arquivos de áudio locais (`.m4a` e `.mp3`, como os podcasts gerados no Gemini Notebook / NotebookLM) diretamente em cada sessão do curso, tanto no **Desktop** quanto no **Android (`.APK`)**, armazenando os binários localmente na memória do dispositivo sem commitar arquivos de áudio no repositório Git e sem embuti-los no bundle do `.APK` (mantendo o exportador `.EPUB` do Kindle Colorsoft inalterado).

## What Changes

- **Camada de Armazenamento Híbrido de Áudios (`AudioStorageAdapter`):**
  - **No Android (`.APK` Capacitor):** Armazenamento nativo na memória interna privada do aplicativo utilizando `@capacitor/filesystem` (`Directory.Data`), com leitura direta em streaming via `Capacitor.convertFileSrc()` e remoção física do arquivo via `Filesystem.deleteFile()`.
  - **No Desktop (Navegador Local):** Armazenamento binário em **IndexedDB** (`Blob`), com geração sob demanda de `Object URLs` e limpeza de memória (`URL.revokeObjectURL`) ao alternar ou remover faixas.
  - Nenhum arquivo de áudio é versionado no Git ou empacotado dentro de `dist/` / `.APK`.
- **Gerenciador e Player de Áudios por Sessão (`SessionAudioPanel`):**
  - Interface integrada ao leitor de capítulo (`ChapterReader`) para cadastrar um ou mais áudios `.m4a` ou `.mp3` vinculados à sessão ativa (com título editável e exibição do tamanho do arquivo).
  - Lista de áudios cadastrados na sessão permitindo selecionar qual faixa reproduzir ou remover qualquer áudio (liberando espaço no dispositivo).
  - Player de áudio com controles de reprodução (play/pause, barra de progresso/seek, pular `±15s`, velocidade `1.0x / 1.25x / 1.5x / 1.75x / 2.0x`) e persistência automática da posição onde o aluno parou (`lastPositionSeconds`).
- **Exclusão Explícita do Kindle Colorsoft:**
  - O compilador `.EPUB` (`scripts/build-epub.mjs`) não inclui nem altera nada relacionado a áudios locais.

## Capabilities

### New Capabilities
- `session-audio-manager`: Cadastro, listagem, seleção para reprodução, controle de velocidade/posição e remoção de áudios locais (`.m4a` e `.mp3`) por sessão do curso usando armazenamento híbrido (IndexedDB no Desktop e `@capacitor/filesystem` na memória interna do Android), sem versionamento em Git e sem embutir no `.APK` ou `.EPUB`.

### Modified Capabilities
<!-- Nenhuma capability existente está sendo modificada. -->

## Impact

- **Dependências:** Adição do plugin oficial `@capacitor/filesystem` ao `package.json` e sincronização com o projeto Android (`npx cap sync android`).
- **Novos Arquivos:**
  - `src/utils/audioStorage.ts` (Adapter híbrido: IndexedDB no Desktop + `@capacitor/filesystem` no Android + persistência de metadados e posição de reprodução).
  - `src/components/SessionAudioPanel.tsx` (UI de cadastro `.m4a`/`.mp3`, lista de faixas da sessão, remoção e player com velocidade e seek `±15s`).
- **Arquivos Atualizados:**
  - `src/types/course.ts` (tipos `SessionAudioTrack` e metadados de áudio local).
  - `src/components/ChapterReader.tsx` (integração do `SessionAudioPanel` substituindo o placeholder de áudio da Fase 2).
  - Recompilação do bundle Desktop e do instalador `.APK` Android (`dist-android/engenharia-software-ia-modulo-01.apk`).
