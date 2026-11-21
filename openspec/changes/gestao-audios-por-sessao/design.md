## Context

See `proposal.md` for motivation and scope.
A plataforma já possui um leitor de capítulos (`src/components/ChapterReader.tsx`) rodando localmente no Desktop (Vite + React + TypeScript) e como aplicativo nativo Android via Capacitor 7 (`android/`). Até o momento, o card "Áudio Gemini Notebook" no cabeçalho do capítulo era apenas um slot placeholder da Fase 2. Agora vamos torná-lo totalmente funcional para `.m4a` e `.mp3` locais no Desktop e no Android.

## Goals / Non-Goals

**Goals:**
- Implementar uma camada unificada `AudioStorageAdapter` (`src/utils/audioStorage.ts`) que abstrai o armazenamento físico de binários de áudio:
  - **Android Nativo (`Capacitor.isNativePlatform() === true`):** Salva os arquivos `.m4a`/`.mp3` diretamente na memória interna privada do aplicativo usando `@capacitor/filesystem` (`Directory.Data`, diretório `session-audios/`), lê via `Capacitor.convertFileSrc(uri)` para streaming direto do disco sem sobrecarregar a RAM do WebView e remove fisicamente via `Filesystem.deleteFile()`.
  - **Desktop Browser (`Capacitor.isNativePlatform() === false`):** Salva os arquivos binários (`Blob`) em um banco **IndexedDB** (`engenharia_ia_audios_db`, object store `audio_blobs`), gerando `Blob URL` sob demanda (`URL.createObjectURL`) e revogando (`URL.revokeObjectURL`) ao trocar ou excluir a faixa.
- Persistir metadados leves das faixas (lista por `sessionId`, título, tamanho em bytes, `mimeType`, `storagePath`, `lastPositionSeconds`, `createdAt`) em `localStorage` (`engenharia_ia_audio_meta_v1`) para listagem instantânea.
- Entregar o componente `SessionAudioPanel.tsx` integrado ao `ChapterReader.tsx` com cadastro de `.m4a`/`.mp3`, lista selecionável de áudios da sessão, botão de remoção e player com controles (`-15s`, `Play/Pause`, `+15s`, barra de tempo e velocidade `1.0x` a `2.0x`).

**Non-Goals:**
- Commitar arquivos de áudio no repositório Git ou embuti-los no bundle estático do `.APK`.
- Incluir ou alterar qualquer coisa no exportador `.EPUB` do Kindle Colorsoft (`scripts/build-epub.mjs`).
- Sincronizar binários de áudio pesados no arquivo `.json` de backup de progresso.

## Decisions

### 1. Armazenamento Híbrido (Opção A): IndexedDB no Desktop + `@capacitor/filesystem` no Android
- **Decisão:** Instalar `@capacitor/filesystem` (`^7.0.0`, alinhado ao `@capacitor/core` v7) e detectar o runtime via `Capacitor.isNativePlatform()`.
- **Racional:**
  - Áudios de podcasts gerados no Gemini Notebook / NotebookLM costumam ter 10 MB a 40 MB.
  - No Android, gravar em `Directory.Data` (`session-audios/<trackId>.<ext>`) via `Filesystem.writeFile` e reproduzir via `Capacitor.convertFileSrc(fileUri)` entrega streaming nativo do sistema de arquivos do Android com consumo mínimo de memória RAM e remoção física garantida via `Filesystem.deleteFile`.
  - No Desktop (browser local), IndexedDB suporta centenas de megabytes/gigabytes de `Blob` nativo sem depender de servidor backend.
- **Alternativas consideradas:**
  - *IndexedDB puro nos dois:* Descartado a favor da Opção A pois no Android o armazenamento nativo via `Filesystem` lida melhor com múltiplos arquivos grandes e garante salvamento direto na memória do Android conforme solicitado.
  - *`localStorage` com Base64:* Descartado pelo limite rígido de ~5 MB.

### 2. Escrita Segura de Arquivos Grandes no Android (`FileReader` / Base64 chunk ou DataURL)
- **Decisão:** Ao receber um `File` do `<input type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a">`, no Android convertemos para Base64 sem prefixo `data:...;base64,` e gravamos com `Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true })`.
- **Validação de Formato:** Validar extensão (`.mp3` ou `.m4a`) e/ou tipo MIME (`audio/mpeg`, `audio/mp4`, `audio/x-m4a`, `audio/aac`), rejeitando outros formatos com feedback amigável na UI.

### 3. Contrato de Metadados de Áudio (`SessionAudioTrack`)
```typescript
export interface SessionAudioTrack {
  id: string;
  sessionId: string;
  title: string;
  fileName: string;
  format: 'mp3' | 'm4a';
  mimeType: string;
  sizeBytes: number;
  storageBackend: 'capacitor-fs' | 'indexeddb';
  storageKey: string; // caminho relativo no Directory.Data ou chave no IndexedDB
  lastPositionSeconds: number;
  createdAt: string;
}
```

## Risks / Trade-offs

- **[Risk] Vazamento de memória no Desktop ao trocar várias vezes de áudio via `URL.createObjectURL`** $\rightarrow$ **Mitigação:** Revogar explicitamente o `ObjectURL` anterior no cleanup do `useEffect` e ao remover uma faixa.
- **[Risk] Arquivo `.m4a` no Android às vezes reporta `file.type === ""` ou `video/mp4` dependendo do gerenciador de arquivos do fabricante** $\rightarrow$ **Mitigação:** Validar primariamente pela extensão `.m4a` / `.mp3` (case-insensitive) e normalizar o MIME type (`audio/mp4` para `.m4a`, `audio/mpeg` para `.mp3`) ao reproduzir.
